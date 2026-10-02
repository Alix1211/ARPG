import os, json
import numpy as np
from PIL import Image

OUT = "/home/claude/field_assets"
TILE_PX = 96  # 게임 기준 48px의 2배

THEMES = ["spring", "summer", "autumn", "winter", "volcano", "ice", "swamp"]
OBJ_NAMES = ["tree_big", "tree_small", "bush", "rock_big", "rock_small", "fence_h", "fence_v",
             "stump", "flowers", "sign", "crate"]
TILE_NAMES = ["grass", "grass_flower", "dirt", "path", "water", "sand"]
EDGE_SETS = ["grass_dirt", "water_sand", "snow_dirt", "lava_rock", "ice_snow", "swampgrass_mud"]
EDGE_NAMES = ["edge_top", "edge_bottom", "edge_left", "edge_right",
              "corner_tl", "corner_tr", "corner_bl", "corner_br"]


def runs(profile, th=0.05):
    r, s = [], None
    for i, v in enumerate(profile):
        if v > th and s is None:
            s = i
        if v <= th and s is not None:
            r.append((s, i - 1)); s = None
    if s is not None:
        r.append((s, len(profile) - 1))
    return r


def bands(r, size):
    """연속 구간들 사이의 중간점으로 칸 경계를 만든다"""
    cuts = [0] + [(r[i][1] + r[i + 1][0]) // 2 for i in range(len(r) - 1)] + [size]
    return list(zip(cuts[:-1], cuts[1:]))


def grid(im):
    a = np.array(im)[:, :, 3] > 128
    return bands(runs(a.mean(1)), im.height), bands(runs(a.mean(0)), im.width)


def bbox_alpha(im, th=128):
    a = np.array(im)[:, :, 3] > th
    ys, xs = np.where(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def clean_object(im):
    """반투명 테두리 번짐(헤일로) 제거"""
    arr = np.array(im).astype(np.int32)
    a = arr[:, :, 3]
    a = np.where(a >= 170, 255, 0)
    # 옆 칸에서 딸려 온 작은 조각 제거: 큰 덩어리만 남김
    from scipy import ndimage
    lab, n = ndimage.label(a > 0)
    if n > 1:
        sizes = ndimage.sum(a > 0, lab, range(1, n + 1))
        keep = [i + 1 for i, sz in enumerate(sizes) if sz >= sizes.max() * 0.05]
        a = np.where(np.isin(lab, keep), a, 0)
    arr[:, :, 3] = a
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    return out.crop(bbox_alpha(out))


def tile_crop(im, inset_ratio=0.07):
    x0, y0, x1, y1 = bbox_alpha(im, 200)
    w, h = x1 - x0, y1 - y0
    s = min(w, h)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = s / 2 * (1 - inset_ratio * 2)
    box = (round(cx - half), round(cy - half), round(cx + half), round(cy + half))
    return im.crop(box).convert("RGB").resize((TILE_PX, TILE_PX), Image.LANCZOS)


manifest = {"tile_size_game_px": 48, "tile_size_file_px": TILE_PX, "objects": {}, "tiles": {}, "edges": {}}

# 오브젝트
im = Image.open("/home/claude/gpt/objects.png").convert("RGBA")
rows, cols = grid(im)
assert len(rows) == 7 and len(cols) == 11, (len(rows), len(cols))
for ri, (ya, yb) in enumerate(rows):
    th = THEMES[ri]
    os.makedirs(f"{OUT}/objects/{th}", exist_ok=True)
    for ci, (xa, xb) in enumerate(cols):
        cell = clean_object(im.crop((xa, ya, xb, yb)))
        p = f"objects/{th}/{OBJ_NAMES[ci]}.png"
        cell.save(f"{OUT}/{p}")
        manifest["objects"].setdefault(th, {})[OBJ_NAMES[ci]] = {"file": p, "w": cell.width, "h": cell.height}

# 바닥 타일
im = Image.open("/home/claude/gpt/tiles.png").convert("RGBA")
rows, cols = grid(im)
assert len(rows) == 7 and len(cols) == 6, (len(rows), len(cols))
for ri, (ya, yb) in enumerate(rows):
    th = THEMES[ri]
    os.makedirs(f"{OUT}/tiles/{th}", exist_ok=True)
    for ci, (xa, xb) in enumerate(cols):
        t = tile_crop(im.crop((xa, ya, xb, yb)))
        p = f"tiles/{th}/{TILE_NAMES[ci]}.png"
        t.save(f"{OUT}/{p}")
        manifest["tiles"].setdefault(th, {})[TILE_NAMES[ci]] = p

# 경계 타일
im = Image.open("/home/claude/gpt/edges.png").convert("RGBA")
rows, cols = grid(im)
assert len(rows) == 6 and len(cols) == 8, (len(rows), len(cols))
for ri, (ya, yb) in enumerate(rows):
    st = EDGE_SETS[ri]
    os.makedirs(f"{OUT}/edges/{st}", exist_ok=True)
    for ci, (xa, xb) in enumerate(cols):
        t = tile_crop(im.crop((xa, ya, xb, yb)), 0.05)
        p = f"edges/{st}/{EDGE_NAMES[ci]}.png"
        t.save(f"{OUT}/{p}")
        manifest["edges"].setdefault(st, {})[EDGE_NAMES[ci]] = p

json.dump(manifest, open(f"{OUT}/manifest.json", "w"), ensure_ascii=False, indent=1)
print("done")
