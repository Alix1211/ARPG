import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def min_path(cost):
    """cost[h, w]에서 위→아래로 내려가는 최소 비용 경로 (한 줄에 한 칸, 좌우 1칸 이동)"""
    h, w = cost.shape
    acc = cost.copy(); back = np.zeros((h, w), int)
    for y in range(1, h):
        prev = acc[y - 1]
        cand = np.stack([np.r_[np.inf, prev[:-1]], prev, np.r_[prev[1:], np.inf]])
        k = cand.argmin(0); back[y] = k - 1
        acc[y] += cand.min(0)
    path = np.zeros(h, int); path[-1] = acc[-1].argmin()
    for y in range(h - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    return path

def make_seamless_cut(img, lo=0.06, hi=0.40, feather=2.5):
    A = np.asarray(img).astype(np.float32)
    n = A.shape[0]
    B = np.roll(np.roll(A, n // 2, 0), n // 2, 1)       # 가장자리가 이미 이어지는 반 칸 이동본
    diff = ((A - B) ** 2).sum(2)
    diff = ndimage.uniform_filter(diff, 3) + 1.0
    a, b = int(n * lo), int(n * hi)
    # 왼쪽/오른쪽 세로 경로, 위/아래 가로 경로
    pl = min_path(diff[:, a:b]) + a
    pr = min_path(diff[:, n - b:n - a]) + (n - b)
    pt = min_path(diff[a:b, :].T) + a
    pb = min_path(diff[n - b:n - a, :].T) + (n - b)
    yy, xx = np.mgrid[0:n, 0:n]
    M = (xx > pl[:, None]) & (xx < pr[:, None]) & (yy > pt[None, :]) & (yy < pb[None, :])
    m = ndimage.gaussian_filter(M.astype(np.float32), feather)[..., None]
    out = A * m + B * (1 - m)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    import glob, os
    THEMES = ["spring", "summer", "autumn", "winter", "volcano", "ice", "swamp"]
    NAMES = ["grass", "grass_flower", "dirt", "path", "water", "sand"]
    for th in THEMES:
        for nm in NAMES:
            raw = Image.open(f"tiles_v2/{th}_{nm}_raw.png")
            make_seamless_cut(raw).save(f"tiles_v2/{th}_{nm}.png")
    cell = 96; rep = 3; g = 10
    W = 6 * (cell * rep + g) + g; H = 7 * (cell * rep + g) + g
    pv = Image.new("RGB", (W, H), (28, 28, 30))
    for ri, th in enumerate(THEMES):
        for ci, nm in enumerate(NAMES):
            t = Image.open(f"tiles_v2/{th}_{nm}.png").resize((cell, cell), Image.LANCZOS)
            ox, oy = g + ci * (cell * rep + g), g + ri * (cell * rep + g)
            for y in range(rep):
                for x in range(rep):
                    pv.paste(t, (ox + x * cell, oy + y * cell))
    pv.save("preview_seam_fixed.png"); print(pv.size)
