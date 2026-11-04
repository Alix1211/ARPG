"""Bundle the eight user-supplied Gaia ultimate cut-in images, if available.

The public source directory stays empty until the owner uploads A01..A04 and
S01..S04. Missing art does not stop a build or disable the combat skill.
"""
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
CUTINS = ROOT / 'assets' / 'gaia_cutins'
NAMES = [f'{side}{index:02d}' for side in ('A', 'S') for index in range(1, 5)]


def art():
    result = {}
    for name in NAMES:
        path = CUTINS / (name + '.jpg')
        if not path.is_file():
            continue
        with Image.open(path) as source:
            im = ImageOps.exif_transpose(source).convert('RGB')
            im.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
            payload = io.BytesIO()
            im.save(payload, 'WEBP', quality=87, method=6)
            result[name] = 'data:image/webp;base64,' + base64.b64encode(payload.getvalue()).decode('ascii')
    return result


def preview_suffix():
    return 'A.gaiaCutins=' + json.dumps(art()) + ';'
