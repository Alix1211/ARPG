"""시험판 전용: 새 UI 키트(강철·가죽·청색) 그림을 기존 그림 목록 위에 덮어쓴다.

미리보기 빌더는 예전에 만들어 둔 그림 묶음(game/town.html)을 재사용하기 때문에,
assets/ui 아래의 새 그림은 여기서 다시 인코딩해 window.ART 에 끼워 넣는다.
정식 빌드(build.py)는 assets/ui 를 직접 읽으므로 이 파일이 필요 없다.
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
R = ROOT / "assets"


def _enc(img, q=90):
    b = io.BytesIO()
    img.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def _open(rel):
    return Image.open(R / rel).convert("RGBA")


def art():
    out = {}
    for k in ["03", "04", "05", "06", "14", "15"]:
        out[f"ui/{k}"] = _enc(_open(f"ui/kit_c/kit_c_{k}.png"))
    for k in ["01", "02", "02b", "18", "21", "14"]:
        out[f"kit/{k}"] = _enc(_open(f"ui/kit_c/kit_c_{k}.png"))
    tabs = _open("ui/kit_c/kit_c_11.png")
    boxes = [(1, 1, 83, 75), (86, 1, 83, 75), (171, 1, 82, 75), (255, 1, 82, 75), (339, 1, 85, 75)]
    for i, (x, y, w, h) in enumerate(boxes):
        out[f"kit/tab{i}"] = _enc(tabs.crop((max(0, x - 5), 0, min(tabs.width, x + w + 5), tabs.height)))
    im = _open("ui/hud_icons/36_btn_close.png")
    im.thumbnail((128, 128), Image.LANCZOS)
    out["kit/h_close"] = _enc(im)
    out["kit/hpbar"] = _enc(_open("ui/hud_clean/bar_hp.png"), 92)
    out["kit/mpbar"] = _enc(_open("ui/hud_clean/bar_mp.png"), 92)
    out["kit/pring"] = _enc(_open("ui/hud_clean/portrait_ring.png"), 92)
    return out


def prelude():
    return "Object.assign(window.ART=window.ART||{}," + json.dumps(art()) + ");"
