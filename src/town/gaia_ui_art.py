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


KIT_KEYS = ["card", "hp_fill", "m_fill", "down_fill", "gather_n", "gather_p", "gather_d",
            "dial", "dial_club", "dial_whip", "dial_c_n", "dial_c_p", "ring_ok", "ring_empty",
            "tab_sel", "tab_un", "tab_dis", "lock", "port_kyle", "port_agatha", "port_sylvia",
            "ky_slap", "ky_rush", "ky_wake", "ky_bluff", "ky_run", "ky_charge", "ky_spower", "ky_fog"]
# 아가사 검 이름(임시, 그림 순서대로 단계 이름). 케인이 정하면 바꾼다.
AGATHA_SWORD_NAMES = ["수련용 검", "철검", "강철 검", "쇠장식 검", "기사의 검", "은장식 검", "룬 검", "보석 검", "명검", "빛나는 명검"]


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
    for n in ['kyle', 'agatha', 'sylvia']:
        out[f"gaiaFull/{n}"] = _enc(_open(f"gaia_full/{n}_full.png"))
    # GPT가 만든 가이아 HUD 묶음(2026-11-03): assets/ui/gaia_kit
    for k in KIT_KEYS:
        out[f"gk/{k}"] = _enc(_open(f"ui/gaia_kit/{k}.png"), 92)
    # 아가사는 검을 쓰므로 '창' 무기 칸(w4)을 검으로 쓴다: 그림은 원래 검 그림, 이름은 검 이름
    for g in range(1, 11):
        im = _open(f"weapons/sword_{g:02d}.png")
        im = im.crop(im.getbbox())
        im.thumbnail((96, 96), Image.LANCZOS)
        out[f"icons/spear_{g:02d}"] = _enc(im, 88)
    return out


def prelude():
    return "Object.assign(window.ART=window.ART||{}," + json.dumps(art()) + ");"


def suffix():
    kit = ",".join(f"'{k}':window.ART['gk/{k}']" for k in KIT_KEYS)
    names = json.dumps({f"spear_{i+1:02d}": n for i, n in enumerate(AGATHA_SWORD_NAMES)}, ensure_ascii=False)
    return ("A.gaiaFull={kyle:window.ART['gaiaFull/kyle'],agatha:window.ART['gaiaFull/agatha'],sylvia:window.ART['gaiaFull/sylvia']};"
            "A.gaiaKit={" + kit + "};"
            "(A.tierCatalog.gear||[]).forEach(g=>{const n=" + names + "[g.id];if(n)g.name=n;});")
