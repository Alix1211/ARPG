#!/usr/bin/env python3
"""VFX 시트(source_sheets/vfx/*.png)를 이름 붙은 개별 그림으로 자른다.
칸(대략의 영역)을 정해 두고, 그 칸의 중심에 있는 덩어리만 남겨 이웃 이펙트의 번짐을 지운다.
결과: assets/vfx/<이름>.png (투명 배경, 가장자리 여백 최소), 목록 assets/vfx/manifest.json
다시 돌려도 같은 결과가 나온다.  사용: python3 tools/vfx_slice.py
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source_sheets', 'vfx')
OUT = os.path.join(ROOT, 'assets', 'vfx')
THR = 60      # 이 알파보다 진한 곳을 "이펙트 몸통"으로 본다
LINK = 3      # 몸통 조각을 한 덩어리로 보는 거리(px)
KEEP = 10     # 남긴 덩어리 주변으로 번지는 빛을 살리는 거리(px)


def runs(proj, gap):
    idx = np.where(proj > 0)[0]
    if len(idx) == 0:
        return []
    out = [[idx[0], idx[0]]]
    for i in idx[1:]:
        if i - out[-1][1] - 1 < gap:
            out[-1][1] = i
        else:
            out.append([i, i])
    return [(int(a), int(b) + 1) for a, b in out]


class Sheet:
    """시트 전체를 한 번에 덩어리로 나눠 둔다. 칸마다 중심이 그 칸 안에 있는 덩어리만 가져간다."""
    def __init__(self, path, thr=THR, link=LINK):
        self.im = Image.open(path).convert('RGBA')
        self.arr = np.array(self.im)
        a = self.arr[..., 3]
        self.mask = a > thr
        self.lab, self.n = ndi.label(ndi.binary_dilation(self.mask, iterations=link))
        ids = np.arange(1, self.n + 1)
        cy = ndi.center_of_mass(self.mask, self.lab, ids)
        self.center = {int(i): (c[1], c[0]) for i, c in zip(ids, cy) if self.mask[self.lab == i].any()}
        dist, (iy, ix) = ndi.distance_transform_edt(self.lab == 0, return_indices=True)
        self.dist, self.nearest = dist, self.lab[iy, ix]
        self.width, self.height = self.im.size

    def extract(self, rect, clip=False, largest=False):
        """clip=True: 이웃과 붙어 한 덩어리가 된 이펙트용. 칸 안에 걸친 덩어리를 모두 가져와 칸 경계로 자른다."""
        x0, y0, x1, y1 = rect
        if clip:
            keep = [int(i) for i in np.unique(self.lab[y0:y1, x0:x1][self.mask[y0:y1, x0:x1]]) if i]
        else:
            keep = [i for i, (cx, cy) in self.center.items() if x0 <= cx < x1 and y0 <= cy < y1]
        if not keep:
            return None
        if largest:   # 한 칸에 크고 작은 것이 같이 있으면 가장 큰 덩어리만 쓴다
            keep = [max(keep, key=lambda i: int(((self.lab == i) & self.mask).sum()))]
        halo = np.isin(self.nearest, keep) & (self.dist <= KEEP)
        if clip:
            box = np.zeros_like(halo); box[y0:y1, x0 + 9:x1 - 9] = True; halo &= box
        out = self.arr.copy()
        out[..., 3] = np.where(halo, out[..., 3], 0)
        if clip:   # 칸 경계로 자른 좌우 가장자리가 칼날처럼 보이지 않게 서서히 투명하게
            fade = 36
            xs = np.arange(self.width)
            ramp = np.clip(np.minimum(xs - (x0 + 9), (x1 - 9) - 1 - xs) / fade, 0, 1)
            out[..., 3] = (out[..., 3] * ramp[None, :]).astype(np.uint8)
        ys, xs = np.where(out[..., 3] > 20)
        return Image.fromarray(out).crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def grid_rects(w, h, rows, cols):
    return [[(round(c * w / cols), round(r * h / rows), round((c + 1) * w / cols), round((r + 1) * h / rows)) for c in range(cols)] for r in range(rows)]


def status_rects(im):
    """상태이상 아이콘 시트: 줄은 빈 틈으로, 칸은 7등분."""
    a = np.array(im)[..., 3]
    bands = runs((a > 120).sum(1), 4)
    cols = 7
    return [[(round(c * im.width / cols), y0 - 2, round((c + 1) * im.width / cols), y1 + 2) for c in range(cols)] for y0, y1 in bands]


def strip_rects():
    """strip_all.png 아래 두 줄(마법진·투사체)만 쓴다. 칸은 눈으로 본 위치(원본 1536x1024 기준)."""
    s = 1.5
    def R(xs, y0, y1):
        return [(round(a * s), round(y0 * s), round(b * s), round(y1 * s)) for a, b in xs]
    circles = R([(5, 75), (75, 148), (148, 292), (300, 400), (405, 515), (518, 618), (622, 725), (728, 838), (838, 910), (912, 1010)], 475, 575)
    shots = R([(5, 135), (135, 292), (292, 445), (445, 588), (588, 722), (722, 852), (850, 1020)], 572, 668)
    return circles, shots


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.png'):
            os.remove(os.path.join(OUT, f))
    manifest = {}

    def save(name, im):
        if im is None:
            print('  비어 있음:', name)
            return
        im.save(os.path.join(OUT, name + '.png'), optimize=True)
        manifest[name] = [im.width, im.height]

    # 1) 타격 시트 5x5: 1줄 번쩍임, 2줄 베기, 3~5줄 돌 파편 충격
    sh = Sheet(os.path.join(SRC, 'vfx_hit_a.png'))
    g = grid_rects(sh.width, sh.height, 5, 5)
    for c in range(5):
        save('hit_spark_%d' % c, sh.extract(g[0][c]))
        save('hit_slash_%d' % c, sh.extract(g[1][c]))
    for r in (2, 3, 4):
        for c in range(5):
            save('hit_rock_%d' % ((r - 2) * 5 + c), sh.extract(g[r][c]))

    # 2) 속성 폭발 시트 5x5: 불·얼음·번개·독(+연기)·암흑
    sh = Sheet(os.path.join(SRC, 'vfx_element_burst.png'))
    g = grid_rects(sh.width, sh.height, 5, 5)
    for r, nm in enumerate(['fire', 'ice', 'volt', 'poison', 'dark']):
        for c in range(5):
            save('burst_%s_%d' % (nm, c), sh.extract(g[r][c]))

    # 3) 상태이상 아이콘 시트: 줄 순서 = 큰 아이콘, 틀 있는 작은 아이콘, 바닥 효과, 보조 효과, 약화 화살표, 숫자 배지
    sh = Sheet(os.path.join(SRC, 'vfx_status_icons.png'))
    rows = status_rects(sh.im)
    kinds = ['fire', 'ice', 'volt', 'blood', 'slow', 'stone', 'poison']
    names = {0: 'big', 1: 'icon', 2: 'ground', 4: 'down'}
    for r, row in enumerate(rows):
        if r not in names:
            continue
        for c, rect in enumerate(row):
            save('status_%s_%s' % (names[r], kinds[c]), sh.extract(rect))

    # 4) 마법진·투사체 (strip_all 아래 두 줄)
    sh = Sheet(os.path.join(SRC, 'vfx_strip_all.png'), thr=150, link=2)
    circles, shots = strip_rects()
    glued = {'ring_blue', 'ring_red'}
    for nm, rect in zip(['ring_gold', 'ring_blue', 'ring_red', 'vortex', 'heal_gold', 'heal_green', 'heal_arrow', 'heal_pink', 'star_gold', 'ring_green'], circles):
        save(nm, sh.extract(rect, clip=nm in glued))
    for nm, rect in zip(['shot_fire', 'shot_ice', 'shot_rock', 'shot_poison', 'shot_dark', 'shot_blade', 'shot_holy'], shots):
        save(nm, sh.extract(rect, largest=True))

    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('이펙트 그림', len(manifest), '개 → assets/vfx/')
    print('상태이상 시트 줄 수:', len(rows), [len(r) for r in rows])


if __name__ == '__main__':
    sys.exit(main())
