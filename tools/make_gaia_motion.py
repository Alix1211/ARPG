"""가이아 새 모션(카일·아가사·실비아 걷기와 공격)을 게임 크기로 맞춰 source_sheets/gaia_motion 에 만든다.

케인이 지피티로 받은 그림(걷기 3방향, 공격 5칸×3방향)을 한 번 정리해 두는 도구다.
- 걷기: 한 칸 170x172(낡은 걷기 파이프라인과 같은 규칙: 중앙값 키 162, 폭·키 상한 164, 발 바닥 166, 발 중심 가로 85).
- 공격: 방망이·칼·지팡이가 칸 밖으로 나가므로 캐릭터마다 칸 크기를 따로 잡는다. meta.json 의 atk_foot 이 발 위치.
- 프레임마다 발 중심(몸 아래 12%의 무게중심)을 맞춘다. 투명도 10 미만의 잔여는 지운다.
- 공격 배율은 '머리 폭 기준'과 '키 기준'의 기하평균이다(머리가 작아지는 것과 키가 줄어드는 것을 반반 나눈다).
입력은 케인이 준 압축 파일에서 푼 프레임 폴더라 저장소에는 없다. 아래 main()의 경로는 작업 폴더 기준이다.
게임은 걷기를 1~4번 칸으로만 돌리고 0번 칸은 서 있는 자세로 쓴다.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src" / "town"))
import gaia_sheets  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "source_sheets" / "gaia_motion"
CW, CH, CX, BASE = 340, 344, 170, 332          # 2배 크기 기준 칸(게임은 절반)
TARGET_H, CAP = 324, 328
BIG, BX, BY = (1600, 1600), 800, 1100
DIRS = ("front", "back", "side")


def L(p):
    return Image.open(p).convert("RGBA")


def alpha_bbox(im, th=40):
    a = np.array(im)[:, :, 3] > th
    ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max(), ys.max()


def foot_x(im):
    a = np.array(im)[:, :, 3] > 40
    ys, _ = np.where(a)
    b = ys.max()
    h = b - ys.min() + 1
    return np.where(a[int(b - 0.12 * h):b + 1])[1].mean(), b


def clean(im):
    a = np.array(im)
    a[a[:, :, 3] < 10] = 0
    return Image.fromarray(a)


def scaled(im, s):
    im = clean(im)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def put(im, canvas, cx, base):
    fx, b = foot_x(im)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    out.alpha_composite(im, (int(round(cx - fx)), int(base - b)))
    return out


def med(v):
    return float(np.median(v))


def head_w(im):
    a = np.array(im)[:, :, 3] > 40
    ys, _ = np.where(a)
    t = ys.min()
    h = ys.max() - t + 1
    return max((np.ptp(np.where(r)[0]) + 1) if r.any() else 0 for r in a[t:t + int(0.3 * h)])


def box(im):
    b = alpha_bbox(im)
    return b[2] - b[0] + 1, b[3] - b[1] + 1


def run(name, walk, atk_sets, back_override=False, note="", whip_hand=None):
    """walk: {dir:[5 RGBA]}, atk_sets: {set:{dir:[5 RGBA]}}, whip_hand: {dir:(x,y)} 채찍 손잡이 위치(공격 그림 원본 좌표, 3번 칸)."""
    wd = OUT / name
    wd.mkdir(parents=True, exist_ok=True)
    sizes = {v: [box(f) for f in walk[v]] for v in DIRS}
    ref = [v for v in DIRS if not (back_override and v == "back")]
    H_med = med([s[1] for v in ref for s in sizes[v]])
    s_w = min(TARGET_H / H_med, CAP / max(s[0] for v in ref for s in sizes[v]),
              CAP / max(s[1] for v in ref for s in sizes[v]))
    s_by = {v: s_w for v in DIRS}
    if back_override:
        s_by["back"] = s_w * H_med / med([s[1] for s in sizes["back"]])
    w_hw = med([head_w(f) * s_by[v] for v in ("front", "side") for f in walk[v]])
    pool = [atk_sets[k][v][i] for k in atk_sets for v in DIRS for i in (0, 1)]
    a_hw, a_h = med([head_w(f) for f in pool]), med([box(f)[1] for f in pool])
    s_head, s_height = w_hw / a_hw, TARGET_H / a_h
    s_a = float(np.sqrt(s_head * s_height))
    for v in DIRS:
        for i, f in enumerate(walk[v]):
            c = put(scaled(f, s_by[v]), (CW, CH), CX, BASE)
            c.resize((CW // 2, CH // 2), Image.LANCZOS).save(wd / f"walk_{v}_{i}.png")
    big, ext = {}, [1e9, 1e9, -1e9, -1e9]
    for k in atk_sets:
        for v in DIRS:
            for i, f in enumerate(atk_sets[k][v]):
                c = put(scaled(f, s_a), BIG, BX, BY)
                big[(k, v, i)] = c
                x0, y0, x1, y1 = alpha_bbox(c, 10)
                ext = [min(ext[0], x0), min(ext[1], y0), max(ext[2], x1), max(ext[3], y1)]
    half = int(np.ceil(max(BX - ext[0], ext[2] - BX))) + 8
    half += (-half) % 4
    top = int(BY - ext[1] + 8)
    top += (-top) % 4
    bot = 12
    Wa, Ha = 2 * half, top + bot
    for (k, v, i), c in big.items():
        c.crop((BX - half, BY - top, BX + half, BY + bot)).resize((Wa // 2, Ha // 2), Image.LANCZOS).save(wd / f"atk_{k}_{v}_{i}.png")
    meta = {"name": name, "walk_cell": [170, 172], "walk_foot": [CX // 2, BASE // 2],
            "atk_cell": [Wa // 2, Ha // 2], "atk_foot": [half // 2, top // 2], "atk_sets": list(atk_sets),
            "walk_scale_2x": round(s_w, 4), "back_walk_scale_2x": round(s_by["back"], 4), "atk_scale_2x": round(s_a, 4),
            "atk_scale_head_only": round(s_head, 4), "atk_scale_height_only": round(s_height, 4), "note": note}
    if whip_hand:
        # 채찍 손잡이 위치: 발 중심 기준 오프셋(1배 그림 픽셀, 위쪽이 음수). 공격 그림 3번 칸 기준.
        wh = {}
        for v, (hx, hy) in whip_hand.items():
            src = atk_sets["whip"][v][3]
            fx, b = foot_x(clean(src))
            wh[v] = [round((hx - fx) * s_a / 2, 1), round((hy - b) * s_a / 2, 1)]
        meta["whip_hand"] = wh
    (wd / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(name, {k: meta[k] for k in ("walk_scale_2x", "back_walk_scale_2x", "atk_scale_2x", "atk_scale_head_only", "atk_scale_height_only", "atk_cell", "atk_foot")})
    if "whip_hand" in meta:
        print("  whip_hand", meta["whip_hand"])


def main(work, attach_agatha_back):
    work = Path(work)
    # ---- 아가사
    aw = {"front": [L(work / f"agatha_walk2/frames/front/front_{i}.png") for i in range(5)],
          "side": [L(work / f"agatha_walk2/frames/side/side_{i}.png") for i in range(5)]}
    src = L(attach_agatha_back)
    segs = [(24, 387), (464, 818), (893, 1260), (1332, 1688), (1767, 2130)]
    aw["back"] = [src.crop((max(0, x0 - 8), 0, min(src.width, x1 + 9), src.height)) for (x0, x1) in segs]
    aa = {"main": {"front": [L(work / f"agatha_sword/frames/front_{i}.png") for i in range(5)],
                   "back": [L(work / f"agatha_sword/frames/back_{i}.png") for i in range(5)],
                   "side": [L(work / f"agatha_sword/frames/right_{i}.png") for i in range(5)]}}
    run("agatha", aw, aa, back_override=True, note="걷기=새 3방향(뒤는 2차). 공격=칼")
    # ---- 실비아
    sh = L(ROOT / "source_sheets/gaia/sylvia.png")
    sw = {v: [gaia_sheets._body(sh.crop((round(sh.width * c / 5), round(sh.height * r / 3),
                                         round(sh.width * (c + 1) / 5), round(sh.height * (r + 1) / 3)))) for c in range(5)]
          for r, v in enumerate(DIRS)}
    sa = {"main": {"front": [L(work / f"sylvia_atk/frames/front_{i}.png") for i in range(5)],
                   "back": [L(work / f"sylvia_atk/frames/back_{i}.png") for i in range(5)],
                   "side": [L(work / f"sylvia_atk/frames/right_{i}.png") for i in range(5)]}}
    run("sylvia", sw, sa, note="걷기=기존 게임 시트(발 위치만 정렬). 공격=지팡이")
    # ---- 카일
    kw = {v: [L(work / f"kyle_asm/frames/walk_{v}_{i}.png") for i in range(5)] for v in DIRS}
    def kat(d):
        return {"front": [L(work / f"{d}/frames/front_{i}.png") for i in range(5)],
                "back": [L(work / f"{d}/frames/back_{i}.png") for i in range(5)],
                "side": [L(work / f"{d}/frames/right_{i}.png") for i in range(5)]}
    run("kyle", kw, {"club": kat("kyle_club"), "whip": kat("kyle_whip")},
        note="걷기=새 앞·뒤2차·옆4칸(0번은 옆 2번 복사). 공격=방망이(club)·채찍 손잡이(whip), 채찍 줄은 코드",
        whip_hand={"front": (156, 188), "side": (256, 139), "back": (266, 121)})


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
