"""가이아: 모험가 길드 실내 + 접수원 자료.

여관 2층(gaia_squat_assets.py)과 같은 방식으로, 기존 실내 소품을 재사용해 길드 홀 지도를 만든다.
- A.guild         : 길드 실내 지도(접수대·의뢰 게시판·탁자·무기 걸이 등)
- A.b[guild_*]    : 실내 소품 그림, 접수원 걷는 그림(guild_recep)
- A.gaiaDlg.receptionist : 접수원 대화 초상(허벅지까지 자르고 아래 페더)
- A.gaiaGuild     : 길드 접수대 배경 그림(없으면 None — 케인이 주면 assets_private/gaia_guild/place/guild_counter.webp)

접수원 그림은 수위가 있는 그림이라 공개 저장소가 아니라 assets_private/gaia_guild/ 에만 둔다(.gitignore).
없으면 접수원 없이(하르트와 게시판만) 빌드한다.
"""
from __future__ import annotations

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
R = ROOT / "assets"
GP = ROOT / "assets_private" / "gaia_guild"
TS = 48
PX = 64
SCALE = 1.5

W, H = 14, 10
DLG_CROP, DLG_FEATHER = .60, .24   # 대화 초상: 아가사·실비아와 같은 값


def _enc(img, q=88):
    b = io.BytesIO()
    img.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def _prop_img(src, wt):
    im = Image.open(R / f"interior/{src}.png").convert("RGBA")
    box = im.getbbox()
    if box:
        im = im.crop(box)
    w = wt * TS
    h = w * im.height / im.width
    return im, w, h


def _tile(name):
    return Image.open(R / f"interior/{name}.png").convert("RGB").resize((TS, TS), Image.LANCZOS)


def _guild_map():
    floor, wall, carpet = _tile("int_06"), _tile("int_19"), _tile("int_08")
    ground = Image.new("RGB", (W * TS, H * TS), (60, 52, 56))
    for yy in range(H):
        for xx in range(W):
            ground.paste(floor, (xx * TS, yy * TS))
    for xx in range(W):
        ground.paste(wall, (xx * TS, 0))
    for yy in range(1, H):
        ground.paste(wall, (0, yy * TS))
        ground.paste(wall, ((W - 1) * TS, yy * TS))
    for xx in range(W):
        ground.paste(wall, (xx * TS, (H - 1) * TS))
    # 문에서 접수대까지 붉은 양탄자 길
    for yy in range(3, H - 1):
        for xx in (6, 7):
            ground.paste(carpet, (xx * TS, yy * TS))
    door = Image.open(R / "interior/int_20.png").convert("RGB").resize((round(1.6 * TS), TS), Image.LANCZOS)
    ground.paste(door, (round(6.2 * TS), (H - 1) * TS))

    solids = [dict(x0=0, x1=W * TS, y0=0, y1=.9 * TS),
              dict(x0=0, x1=TS * .95, y0=0, y1=H * TS), dict(x0=(W - .95) * TS, x1=W * TS, y0=0, y1=H * TS),
              dict(x0=0, x1=W * TS, y0=(H - .9) * TS, y1=H * TS)]
    assets, props = {}, []

    def add(key, src, cx, by, wt, cw=.8, cd=.45, flat=False, kind=None, name=None):
        im, w, h = _prop_img(src, wt)
        k = "guild_" + key
        assets[k] = _enc(im.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS), 88)
        p = dict(k=k, name=name, x=cx * TS, y=by * TS, w=w, h=h, cw=0 if flat else cw, cd=cd * TS, tree=False, kind=kind)
        if flat:
            p["flat"] = True
        props.append(p)

    # 윗벽 쪽: 무기 걸이 · 의뢰 게시판 · 서가 · 벽난로
    add("rack", "int_42", 1.9, 2.25, 1.5, .8, .35)
    add("board", "int_51", 4.0, 2.25, 1.7, .85, .4, name="의뢰 게시판")
    add("shelf", "int_44_bookshelf", 10.1, 2.25, 1.3, .8, .35)
    add("fire", "int_49", 12.1, 2.3, 1.9, .8, .4)
    # 접수대(가운데): 접수원이 이 뒤에 선다
    add("counter", "int_25", 7.0, 3.6, 3.4, .9, .55)
    # 길드장 책상(오른쪽 위)
    add("desk", "int_21", 10.6, 4.65, 2.0, .8, .45)
    # 홀: 긴 탁자와 둥근 탁자, 걸상
    add("longtable", "int_24", 3.3, 6.7, 3.6, .85, .5)
    add("round", "int_23", 10.9, 7.0, 2.1, .8, .45)
    add("stool_a", "int_30", 9.2, 8.1, .7, .6, .3)
    add("armor", "int_43", 12.4, 5.15, 1.1, .7, .35)
    add("crates", "int_39", 1.75, 8.35, 1.5, .8, .5)
    add("barrels", "int_40", 12.2, 8.6, 1.8, .8, .5)
    add("lamp", "int_46", 5.0, 4.3, .75, .5, .3)
    add("plant", "int_52", 1.5, 4.65, .8, .7, .35)
    return dict(
        map=dict(w=W, h=H, ts=TS, px=PX), ground=_enc(ground, 86),
        mini=_enc(ground.resize((W * 6, H * 6), Image.LANCZOS), 86),
        blds=[], props=props, npcs=[], name="모험가 길드", spawn=[7.0 * TS, 8.3 * TS], back=[7.0 * TS, 8.3 * TS],
        solids=solids, exits=[],
    ), assets


def _recep_portrait(full):
    h = int(full.height * DLG_CROP)
    a = np.array(full.crop((0, 0, full.width, h))).astype(float)
    f0 = int(h * (1 - DLG_FEATHER))
    t = (np.arange(h)[f0:] - f0) / (h - f0)
    k = np.ones(h)
    k[f0:] = 1 - t * t * (3 - 2 * t)
    a[:, :, 3] *= k[:, None]
    return _enc(Image.fromarray(a.astype("uint8"), "RGBA"), 90)


def build():
    """(A.guild 지도, A.b 에 합칠 그림, 접수원 정보 또는 None, 길드 접수대 배경 또는 None)"""
    gmap, assets = _guild_map()
    recep = None
    full_p, hires_p = GP / "receptionist_full.png", GP / "receptionist_hires.png"
    if full_p.is_file():
        # 접수원은 게임 세계(전부 SD 비율)에 세우지 않고, 접수대에서 말을 걸 때 대화창 초상으로만 나온다(케인 2026-11-04).
        recep = dict(has=True, port=_recep_portrait(Image.open(full_p).convert("RGBA")))
    else:
        print("[경고] assets_private/gaia_guild 에 접수원 그림이 없어 접수원 없이 길드를 빌드합니다.")
    room = None
    rp = GP / "place" / "guild_counter.webp"
    if rp.is_file():
        room = "data:image/webp;base64," + base64.b64encode(rp.read_bytes()).decode()
    return gmap, assets, recep, room
