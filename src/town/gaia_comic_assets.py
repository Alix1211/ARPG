"""가이아: GPT 선물 코믹 인물(길드 홀·마을에 세우는 장식 인물) 자료.

make_comic_sprites.py 가 만든 assets_private/gaia_comic/{guild,town}_N.png 를 읽어
- A.b['comic_guild_N'] / A.b['comic_town_N'] : 그림(WebP, 알파)
- A.gaiaComic = {guild:[{k,w,h}...], town:[{k,w,h}...]} : 게임에서 그리는 크기(그림 크기의 절반 = 2배 해상도 저장)
를 만든다. 수위가 있는 그림이라 공개 저장소가 아니라 assets_private 에만 둔다.
그림이 없으면 아무것도 만들지 않는다(길드·마을은 이 인물 없이 열린다).
"""
from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SP = HERE.parents[1] / "assets_private" / "gaia_comic"


def _enc(img, q=92):
    b = io.BytesIO()
    img.save(b, "WEBP", quality=q, method=6)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()


def build():
    """(A.b 에 합칠 그림 dict, A.gaiaComic)"""
    assets, meta = {}, {"guild": [], "town": []}
    for kind in ("guild", "town"):
        i = 0
        while (SP / f"{kind}_{i}.png").is_file():
            im = Image.open(SP / f"{kind}_{i}.png").convert("RGBA")
            k = f"comic_{kind}_{i}"
            assets[k] = _enc(im)
            meta[kind].append(dict(k=k, w=im.width / 2, h=im.height / 2))
            i += 1
    if not assets:
        print("[경고] assets_private/gaia_comic 에 코믹 인물 그림이 없어 장식 인물 없이 빌드합니다.")
    return assets, meta
