"""가이아: 여관 2층 '이들 숙소' + 스쿼트 미니게임 자료(그림·소리) 묶음.

미리보기 빌더(build_gaia_preview.py)는 예전 그림 묶음(game/town.html)을 재사용하므로,
새 지도와 스쿼트 자료는 여기서 만들어 A(그림 목록)에 끼워 넣는다.
정식 빌드(build.py)도 같은 함수(apply)를 불러 같은 내용을 넣는다.

- A.inn2        : 여관 2층 지도(임시 그림: 기존 실내 소품을 재사용)
- A.b[inn2_*]   : 2층 소품 그림
- A.inn.props   : 1층에 2층 계단 그림을 덧붙임(이미 있으면 건너뜀)
- A.gaiaSq      : 스쿼트 게임 문서 + 그림 + 소리(data:)
스쿼트 원본은 Wellness-RPG 벨트스크롤의 큐티너클 단련(minigame_squat.js)이고,
게임 문서는 gaia_squat_doc.html 로 따로 둔다(규칙 수치는 그 안의 RULE).
"""
from __future__ import annotations

import base64
import io
import json

import numpy as np
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
R = ROOT / "assets"
SQ = ROOT / "assets_private" / "gaia_squat"   # 속옷 차림 그림이라 공개 저장소에 올리지 않는다(.gitignore, 지침서 3)
TS = 48
PX = 64
SCALE = 1.5


def _enc(img, q=88):
    b = io.BytesIO()
    img.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def _file_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()


def _prop_img(src, wt):
    im = Image.open(R / f"interior/{src}.png").convert("RGBA")
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w = wt * TS
    h = w * im.height / im.width
    return im, w, h


# ---------- 계단(임시 그림) ----------
def _stairs_img():
    W, H = 170, 200
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    wood_dk, wood_md, wood_lt = (92, 58, 32), (140, 94, 52), (190, 142, 84)
    # 어두운 입구
    d.rectangle((14, 6, W - 14, H - 6), fill=(34, 22, 16, 255))
    # 계단: 위로 갈수록 좁고 높다
    steps = 6
    for i in range(steps):
        t = i / (steps - 1)
        y1 = H - 8 - i * 26
        y0 = y1 - 26
        inset = 10 + int(t * 30)
        d.rectangle((14 + inset, y0 + 9, W - 14 - inset, y1), fill=wood_dk + (255,))      # 챌판
        d.rectangle((14 + inset, y0, W - 14 - inset, y0 + 9), fill=wood_lt + (255,))       # 디딤판
        d.line((14 + inset, y0 + 9, W - 14 - inset, y0 + 9), fill=wood_md + (255,), width=2)
    # 기둥과 상인방
    d.rectangle((2, 0, 16, H), fill=wood_md + (255,), outline=wood_dk + (255,))
    d.rectangle((W - 16, 0, W - 2, H), fill=wood_md + (255,), outline=wood_dk + (255,))
    d.rectangle((2, 0, W - 2, 12), fill=wood_md + (255,), outline=wood_dk + (255,))
    # 손잡이 난간
    d.line((24, H - 20, 60, 70), fill=wood_lt + (255,), width=5)
    return im


def _stairs_prop(key, cx, by, wt):
    im = _stairs_img()
    w = wt * TS
    h = w * im.height / im.width
    return key, _enc(im.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS), 88), dict(
        k=key, name=None, x=cx * TS, y=by * TS, w=w, h=h, cw=0, cd=0, tree=False, kind="stairs_prop")


# ---------- 2층 지도 ----------
def _inn2():
    W, H = 12, 9
    floor = Image.open(R / "interior/int_01.png").convert("RGB").resize((TS, TS), Image.LANCZOS)
    wall = Image.open(R / "interior/int_12.png").convert("RGB").resize((TS, TS), Image.LANCZOS)
    stone = Image.open(R / "interior/int_19.png").convert("RGB").resize((TS, TS), Image.LANCZOS)
    ground = Image.new("RGB", (W * TS, H * TS), (70, 47, 30))
    for yy in range(H):
        for xx in range(W):
            ground.paste(floor, (xx * TS, yy * TS))
    for xx in range(W):
        ground.paste(wall, (xx * TS, 0))
    for yy in range(1, H):
        ground.paste(stone, (0, yy * TS))
        ground.paste(stone, ((W - 1) * TS, yy * TS))
    for xx in range(W):
        ground.paste(stone, (xx * TS, (H - 1) * TS))
    solids = [dict(x0=0, x1=W * TS, y0=0, y1=.9 * TS),
              dict(x0=0, x1=TS * .95, y0=0, y1=H * TS), dict(x0=(W - .95) * TS, x1=W * TS, y0=0, y1=H * TS),
              dict(x0=0, x1=W * TS, y0=(H - .9) * TS, y1=H * TS)]
    assets, props = {}, []

    def add(key, src, cx, by, wt, cw=.8, cd=.45, flat=False, kind=None):
        im, w, h = _prop_img(src, wt)
        k = "inn2_" + key
        assets[k] = _enc(im.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS), 88)
        p = dict(k=k, name=None, x=cx * TS, y=by * TS, w=w, h=h, cw=0 if flat else cw, cd=cd * TS, tree=False, kind=kind)
        if flat:
            p["flat"] = True
        props.append(p)

    add("mat", "int_09", 6.0, 7.55, 3.7, flat=True)            # 단련용 매트(파란 양탄자)
    add("bed_a", "int_32", 2.5, 3.35, 1.75, .85, .5)            # 아가사 침대
    add("bed_s", "int_34", 9.5, 3.35, 1.85, .85, .5)            # 실비아 침대(파란 천개)
    add("stand_a", "int_35", 3.95, 2.85, .85, .8, .4)
    add("stand_s", "int_35", 8.05, 2.85, .85, .8, .4)
    add("wardrobe", "int_38", 10.95, 6.6, 1.15, .8, .45)
    add("crates", "int_39", 1.75, 7.55, 1.5, .8, .5)
    add("plant", "int_52", 10.9, 8.05, .9, .7, .35)
    add("lamp", "int_46", 1.55, 5.2, .75, .5, .3)
    # 아래층으로 내려가는 계단(위쪽 벽 가운데, 1층 계단과 같은 자리)
    k, uri, p = _stairs_prop("inn2_stairs", 6.0, 2.62, 1.5)
    assets[k] = uri
    props.append(p)
    return dict(
        map=dict(w=W, h=H, ts=TS, px=PX), ground=_enc(ground, 86),
        mini=_enc(ground.resize((W * 6, H * 6), Image.LANCZOS), 86),
        blds=[], props=props, npcs=[], name="이들 숙소", spawn=[6.0 * TS, 4.3 * TS], back=[6.0 * TS, 4.3 * TS],
        solids=solids, exits=[],
    ), assets


# ---------- 대화 초상: 전신 그림을 허벅지 높이까지 자르고 아래를 페더(케인 2026-11-04) ----------
DLG_CROP = .60      # 키의 몇 %까지 남길지(허벅지 높이)
DLG_FEATHER = .24   # 남긴 부분의 아래 몇 %를 서서히 지울지


def _dlg_portrait(name):
    im = Image.open(R / f"gaia_full/{name}_full.png").convert("RGBA")
    h = int(im.height * DLG_CROP)
    a = np.array(im.crop((0, 0, im.width, h))).astype(float)
    f0 = int(h * (1 - DLG_FEATHER))
    t = (np.arange(h)[f0:] - f0) / (h - f0)
    k = np.ones(h)
    k[f0:] = 1 - t * t * (3 - 2 * t)
    a[:, :, 3] *= k[:, None]
    return _enc(Image.fromarray(a.astype("uint8"), "RGBA"), 90)


def _sq():
    if not (SQ / "squat_front_sheet_1650x912.webp").is_file():
        print("[경고] assets_private/gaia_squat 이 없어 스쿼트 단련을 빼고 빌드합니다(자료는 케인 컴퓨터/비공개 보관본).")
        return None
    def img(rel, mime="image/webp"):
        return _file_uri(SQ / rel, mime)

    snd_names = ["hit_punch", "reaction_happy", "reaction_surprise", "reaction_whine", "reaction_displeased",
                 "squat90_bed", "squat120_bed", "squat150_bed", "squat90_bgm", "squat120_bgm", "squat150_bgm"] + \
                [f"perfect_{i:02d}" for i in range(1, 8)]
    stand = Image.open(SQ / "stand.png").convert("RGBA")
    return dict(
        doc=(HERE / "gaia_squat_doc.html").read_text(encoding="utf-8"),
        bgPort=img("place/villa_port.webp"), bgLand=img("place/villa_land.webp"),
        front=img("squat_front_sheet_1650x912.webp"), back=img("squat_back_sheet_1650x912.webp"),
        room=img("place/inn_room.webp") if (SQ / "place/inn_room.webp").is_file() else None,   # 여관방 그림(스쿼트 배경·여관방 대화 배경)
        ball=img("ball.webp"), stand=_enc(stand, 92),
        fx={k: img(f"fx/{k}.webp") for k in ("ph", "pp", "fs", "fo")},
        snd={n: _file_uri(SQ / "snd" / f"{n}.ogg", "audio/ogg") for n in snd_names},
    )


_CACHE = {}


def data():
    if not _CACHE:
        inn2, b = _inn2()
        k, uri, p = _stairs_prop("inn_stairs", 5.9, 2.62, 1.5)
        b[k] = uri
        _CACHE.update(inn2=inn2, b=b, stairs1=p, sq=_sq(), dlg={n: _dlg_portrait(n) for n in ("kyle", "agatha", "sylvia")})
    return _CACHE


def _js_safe(obj):
    """<script> 안에 넣어도 닫히지 않도록 '</' 와 '<!--' 를 풀어 쓴다."""
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")


def apply(A):
    """정식 빌드(build.py)용: 파이썬 dict A 에 바로 끼워 넣는다."""
    d = data()
    A["b"].update(d["b"])
    A["inn2"] = d["inn2"]
    if not any(p.get("k") == "inn_stairs" for p in A["inn"]["props"]):
        A["inn"]["props"].append(d["stairs1"])
    A["gaiaSq"] = d["sq"]
    A["gaiaDlg"] = d["dlg"]


def suffix():
    """미리보기용: 그림 목록 뒤에 붙는 JS."""
    d = data()
    return ("(function(){const D=" + _js_safe(dict(inn2=d["inn2"], b=d["b"], stairs1=d["stairs1"], sq=d["sq"], dlg=d["dlg"])) + ";"
            "Object.assign(A.b,D.b);A.inn2=D.inn2;"
            "if(!A.inn.props.some(p=>p.k==='inn_stairs'))A.inn.props.push(D.stairs1);"
            "A.gaiaSq=D.sq;A.gaiaDlg=D.dlg;})();")
