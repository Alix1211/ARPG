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
    if not art:
        return "", ""
    return "Object.assign(window.ART=window.ART||{}," + json.dumps(art) + ");", suffix
