"""월드맵 시트 2장을 낱장으로 자른다.

  python3 tools/slice_worldmap.py

- source_sheets/worldmap_tiles.png     : 지형 타일 6테마 x 10종  -> assets/worldmap/tiles/테마/
- source_sheets/worldmap_mountains.png : 산·절벽 5테마 x 12종    -> assets/worldmap/mountains/테마/
가장자리에 번진 색 테두리를 지우고, 칸마다 내용물 크기에 맞춰 잘라 투명 PNG로 저장한다.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'worldmap')

TILE_THEMES = ['grass', 'dry', 'forest', 'desert', 'volcano', 'snow']
TILE_NAMES = ['plain_a', 'plain_b', 'road_straight', 'road_curve', 'road_t', 'road_cross',
              'river_straight', 'river_curve', 'river_cross', 'lake']
MTN_THEMES = ['grass', 'desert', 'volcano', 'snow', 'forest']
MTN_NAMES = ['top_%02d' % i for i in range(1, 7)] + ['cliff_%02d' % i for i in range(1, 7)]


def clean(im, mask):
    """mask 영역만 남기고, 반투명 번짐을 지운 뒤 내용물 크기로 자른다"""
    arr = np.array(im.convert('RGBA'))
    a = arr[:, :, 3]
    solid = (a >= 200) & mask
    solid = ndimage.binary_erosion(solid, iterations=1)
    lab, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        solid = lab == (1 + int(np.argmax(sizes)))
    solid = ndimage.binary_dilation(solid, iterations=1) & (a >= 128)
    arr[:, :, 3] = np.where(solid, 255, 0)
    out = Image.fromarray(arr, 'RGBA')
    ys, xs = np.where(solid)
    return out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def runs(profile, th=0.02):
    r, s = [], None
    for i, v in enumerate(profile):
        if v > th and s is None:
            s = i
        if v <= th and s is not None:
            r.append((s, i)); s = None
    if s is not None:
        r.append((s, len(profile)))
    return r


def slice_tiles():
    im = Image.open(os.path.join(ROOT, 'source_sheets', 'worldmap_tiles.png')).convert('RGBA')
    al = np.array(im)[:, :, 3] > 40
    rows = runs(al.mean(1))
    cols = runs(al.mean(0))
    assert len(rows) == 6 and len(cols) == 10, (len(rows), len(cols))
    for ri, (y0, y1) in enumerate(rows):
        d = os.path.join(OUT, 'tiles', TILE_THEMES[ri])
        os.makedirs(d, exist_ok=True)
        for ci, (x0, x1) in enumerate(cols):
            box = im.crop((x0 - 4, y0 - 4, x1 + 4, y1 + 4))
            m = np.ones((box.height, box.width), bool)
            clean(box, m).save(os.path.join(d, TILE_NAMES[ci] + '.png'))


def slice_mountains():
    im = Image.open(os.path.join(ROOT, 'source_sheets', 'worldmap_mountains.png')).convert('RGBA')
    a = np.array(im)[:, :, 3] > 128
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    # 줄 경계(위아래 칸이 겹치는 곳은 중간선), 칸 너비 187
    bounds = [0, 167, 309, 465, 598, 755, 886, 1040, 1160, 1277, im.height]
    cells = {}
    for i, s in enumerate(ndimage.find_objects(lab)):
        comp = lab == (i + 1)
        if comp[s].sum() < 3000:
            continue
        ys = np.where(comp.any(1))[0]
        xs = np.where(comp.any(0))[0]
        col = min(5, int((xs.min() + xs.max()) / 2 // 187))
        # 위아래가 붙은 덩어리는 줄 경계에서 나눈다
        for r in range(10):
            part = comp.copy()
            part[:bounds[r]] = False
            part[bounds[r + 1]:] = False
            if part.sum() >= 3000:
                cells.setdefault((r, col), np.zeros_like(a)).__ior__(part)
    assert len(cells) == 60, len(cells)
    for (r, c), m in sorted(cells.items()):
        d = os.path.join(OUT, 'mountains', MTN_THEMES[r // 2])
        os.makedirs(d, exist_ok=True)
        name = MTN_NAMES[(r % 2) * 6 + c]
        clean(im, ndimage.binary_dilation(m, iterations=3)).save(os.path.join(d, name + '.png'))


slice_tiles()
slice_mountains()
print('done')
