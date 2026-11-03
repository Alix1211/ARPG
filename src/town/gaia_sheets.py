"""가이아 시험판용: source_sheets/gaia 의 걷기 시트(5열×3행)를 게임 프레임으로 바꾼다.

build.py 의 _sheet_frames()와 같은 규칙(시트당 배율 하나, 170x172 칸, 발 바닥 166)이다.
전체 빌드 없이 시험판(build_gaia_preview.py)에 새 그림을 끼워 넣을 때 쓴다.
"""
import base64
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import label

SHEETS = Path(__file__).resolve().parents[2] / "source_sheets" / "gaia"
DIRS = ["front", "back", "side"]


def _enc(img, q=88):
    b = io.BytesIO()
    img.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def _body(cell):
    alpha = np.asarray(cell.getchannel("A"))
    labels, count = label(alpha > 40)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    keep = sizes >= max(12, sizes.max() * .01)
    mask = keep[labels]
    cleaned = alpha.copy()
    cleaned[~mask] = 0
    cell.putalpha(Image.fromarray(cleaned))
    return cell.crop(Image.fromarray(mask.astype("uint8") * 255).getbbox())


BODY_H, BODY_CAP = 162, 164  # build.py 의 GAIA_BODY_H/GAIA_BODY_CAP 와 같게 유지


def frames(path):
    sheet = Image.open(path).convert("RGBA")
    cells = []
    for row in range(3):
        for col in range(5):
            box = (round(sheet.width * col / 5), round(sheet.height * row / 3),
                   round(sheet.width * (col + 1) / 5), round(sheet.height * (row + 1) / 3))
            cells.append(_body(sheet.crop(box)))
    heights = sorted(im.height for im in cells)
    scale = min(BODY_H / heights[len(heights) // 2], BODY_CAP / max(im.width for im in cells),
                BODY_CAP / max(im.height for im in cells))
    out = {}
    for row, d in enumerate(DIRS):
        arr = []
        for im in cells[row * 5:(row + 1) * 5]:
            body = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            canvas = Image.new("RGBA", (170, 172))
            canvas.alpha_composite(body, ((170 - body.width) // 2, 166 - body.height))
            arr.append(_enc(canvas))
        out[d] = arr
    return out, cells


def prelude_and_suffix():
    """(그림 덮어쓰기 JS, 카일 정보 JS). 시트가 하나도 없으면 ('','')."""
    art = {}
    for sid, name in (("merc_f_sword", "agatha.png"), ("merc_f_mage", "sylvia.png")):
        p = SHEETS / name
        if p.exists():
            fr, _ = frames(p)
            for d in DIRS:
                for i, uri in enumerate(fr[d]):
                    art[f"companions/{sid}/fr/{d}/{i}"] = uri
    suffix = ""
    kp = SHEETS / "kyle.png"
    if kp.exists():
        fr, cells = frames(kp)
        c = cells[0]
        head = c.crop((0, 0, c.width, min(c.height, c.width)))
        sq = Image.new("RGBA", (max(head.width, head.height),) * 2)
        sq.alpha_composite(head, ((sq.width - head.width) // 2, 0))
        art["gaiakyle/port"] = _enc(sq.resize((128, 128), Image.LANCZOS), 90)
        keys = {}
        for d in DIRS:
            keys[d] = []
            for i, uri in enumerate(fr[d]):
                k = f"gaiakyle/fr/{d}/{i}"
                art[k] = uri
                keys[d].append(k)
        suffix = ("A.gaiaKyle={fr:" + json.dumps({d: [f"window.ART['{k}']" for k in v] for d, v in keys.items()}).replace('"window', 'window').replace(']"', ']')
                  + ",port:window.ART['gaiakyle/port']};")
    wimgs = weapon_images()
    for icon, im in wimgs.items():
        art["gaiawpn/" + icon] = _enc(im)
        small = im.copy()
        small.thumbnail((96, 96), Image.LANCZOS)
        art["icons/" + icon] = _enc(small)
    if wimgs:
        suffix += "A.gaiaWpn={" + ",".join(f"'{k}':window.ART['gaiawpn/{k}']" for k in wimgs) + "};"
        suffix += ("(A.tierCatalog.gear||[]).forEach(g=>{const n=" + json.dumps(weapon_names(), ensure_ascii=False)
                   + "[g.id];if(n)g.name=n;});")
    if not art:
        return "", ""
    return "Object.assign(window.ART=window.ART||{}," + json.dumps(art) + ");", suffix


# ---- 방망이·채찍 무기 그림 (케인 제공 시트 source_sheets/gaia/weapons.png: 5열×2행, 윗줄 방망이·아랫줄 채찍) ----
# 지금 무기 칸이 4종이라 임시로 검 칸=방망이, 활 칸=채찍으로 연결한다. 10단계는 그림 5장을 두 단계씩 나눠 쓴다.
# 단계 순서는 요구 레벨 순서(sword_07이 sword_06보다 먼저, bow_04가 bow_02보다 먼저).
WEAPON_ORDER = {
    "sword": ["sword_01", "sword_02", "sword_03", "sword_04", "sword_05", "sword_07", "sword_06", "sword_08", "sword_09", "sword_10"],
    "bow": ["bow_01", "bow_04", "bow_02", "bow_03", "bow_05", "bow_06", "bow_07", "bow_08", "bow_09", "bow_10"],
}
WEAPON_ROW = {"sword": 0, "bow": 1}
# 이름은 그림에서 보이는 모양을 그대로 적은 임시 이름이다(케인이 정하면 바꾼다).
WEAPON_NAMES = {
    "sword": ["나무 방망이", "단단한 나무 방망이", "쇠띠 방망이", "강화 쇠띠 방망이", "징박이 방망이",
              "강화 징박이 방망이", "강철 방망이", "중갑 강철 방망이", "보석 방망이", "빛나는 보석 방망이"],
    "bow": ["가죽 채찍", "질긴 가죽 채찍", "땋은 채찍", "쇠고리 땋은 채찍", "징박이 채찍",
            "강화 징박이 채찍", "마디 채찍", "강철 마디 채찍", "보석 채찍", "빛나는 보석 채찍"],
}


def _cut_weapon(cell):
    """흰 배경 위의 무기 한 자루 → 투명 배경(은은한 빛은 반투명으로 살림)."""
    from scipy import ndimage as ndi
    a = np.asarray(cell.convert("RGB")).astype(float)
    m = a.min(2)
    dark = m < 228
    lab, k = ndi.label(dark)
    sizes = ndi.sum(dark, lab, range(1, k + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= max(200, sizes.max() * .02)])
    filled = ndi.binary_fill_holes(keep)
    core = ndi.binary_erosion(filled, iterations=1)
    near = ndi.binary_dilation(filled, iterations=16)
    alpha = np.where(core, 1.0, np.clip((248 - m) / 40.0, 0, 1))
    alpha = np.where(near, alpha, 0.0)
    safe = np.maximum(alpha, 0.05)[..., None]
    rgb = np.clip((a - 255 * (1 - alpha[..., None])) / safe, 0, 255)
    rgb = np.where(alpha[..., None] >= 1, a, rgb)
    out = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), "RGBA")
    return out.crop(out.getbbox())


def weapon_images():
    """{'sword_01': PIL, ...}. 시트가 없으면 {}."""
    p = SHEETS / "weapons.png"
    if not p.exists():
        return {}
    sheet = Image.open(p).convert("RGB")
    out = {}
    for t, row in WEAPON_ROW.items():
        cuts = []
        for col in range(5):
            box = (round(sheet.width * col / 5), round(sheet.height * row / 2),
                   round(sheet.width * (col + 1) / 5), round(sheet.height * (row + 1) / 2))
            im = _cut_weapon(sheet.crop(box))
            im.thumbnail((200, 200), Image.LANCZOS)
            cuts.append(im)
        for i, icon in enumerate(WEAPON_ORDER[t]):
            out[icon] = cuts[i // 2]
    return out


def weapon_names():
    """{'sword_01': '나무 방망이', ...}"""
    return {icon: WEAPON_NAMES[t][i] for t in WEAPON_ORDER for i, icon in enumerate(WEAPON_ORDER[t])}


def rename_catalog(catalog):
    names = weapon_names()
    for g in catalog.get("gear", []):
        if g.get("id") in names:
            g["name"] = names[g["id"]]
