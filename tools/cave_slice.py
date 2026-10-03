"""동굴 시트(source_sheets/dungeon_cave.png)를 낱장으로 잘라 assets/dungeon_cave/{tiles,props}에 저장한다(필드 동굴 던전용).
사용: python3 tools/cave_slice.py   (성 밖 입구의 석조 던전은 assets/dungeon)"""
import os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from seamless2 import make_seamless_cut
SRC = os.path.join(ROOT, 'source_sheets/dungeon_cave.png'); OUT = os.path.join(ROOT, 'assets/dungeon_cave')
# 시트에서 각 그림의 위치 (x, y, 폭, 높이) — 위에서 아래, 왼쪽에서 오른쪽
TILES = {
 'floor':(42,31,193,177),'floor_crack':(244,30,209,178),'floor_moss':(462,30,228,178),'wall_front':(697,30,216,178),'wall_front_moss':(917,27,237,181),'wall_top':(1160,26,244,182),
 'corner_1':(33,214,159,171),'corner_2':(212,214,143,171),'corner_3':(366,215,150,168),'corner_4':(526,214,165,171),'corner_5':(703,214,162,167),'corner_6':(873,214,187,167),'corner_7':(1073,214,160,167),'corner_8':(1245,214,168,167),
 'door_closed':(28,392,208,187),'door_open':(242,392,201,188),'stairs_down':(450,391,183,189),'stairs_up':(642,391,176,189),'pit':(827,391,188,189),'lava':(1023,391,198,189),'water':(1229,391,197,189),
}
PROPS = {
 'torch':(45,579,95,190),'pillar':(155,582,141,203),'chest_closed':(311,618,162,157),'chest_open':(493,586,165,187),'barrel':(682,605,131,161),'jar':(850,604,135,162),'bones':(1006,607,241,170),'cobweb':(1241,591,178,218),
 'spike_down':(31,789,159,136),'spike_up':(198,785,164,143),'switch_up':(369,789,165,138),'switch_down':(547,795,150,127),'gate':(708,766,191,166),'stalagmites':(906,772,202,183),'stalactite':(1092,781,189,158),'mushroom':(1263,797,158,142),
 'crystal':(36,926,181,146),'rocks':(228,937,223,136),'minecart':(467,930,193,135),
}
SEAM = {'floor','floor_crack','floor_moss'}   # 이어 붙였을 때 이음매가 덜 보이게 다듬는 타일

def cut(src, box, pad=4):
    x, y, w, h = box
    return src.crop((max(0, x - pad), max(0, y - pad), x + w + pad, y + h + pad))

def main_only(im):
    """잘라 낸 조각에서 가장 큰 덩어리만 남기고(옆 그림 조각 제거) 투명 여백을 자른다"""
    from scipy import ndimage as ndi
    a = np.array(im); m = a[:, :, 3] > 40
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=5))
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1)); keep = lab == (int(np.argmax(sizes)) + 1)
        a[:, :, 3] = np.where(keep, a[:, :, 3], 0); im = Image.fromarray(a)
    return im.crop(Image.fromarray(((np.array(im)[:, :, 3] > 40) * 255).astype('uint8')).getbbox())

def main():
    src = Image.open(SRC).convert('RGBA')
    for d in ('tiles', 'props'): os.makedirs(os.path.join(OUT, d), exist_ok=True)
    for name, box in TILES.items():
        im = cut(src, box)
        if name.startswith(('floor', 'wall_front', 'wall_top')):   # 정사각 바닥·벽 타일: 둘레의 테두리·그림자를 잘라내고 정사각으로
            a = np.array(im)[:, :, 3]; ys, xs = np.where(a > 200); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
            m = int((x1 - x0) * .08); im = im.crop((x0 + m, y0 + m, x1 - m, y1 - m)).convert('RGB').resize((192, 192), Image.LANCZOS)
            if name in SEAM: im = make_seamless_cut(im)
        else:
            im = main_only(im)
        im.save(os.path.join(OUT, 'tiles', name + '.png'))
    for name, box in PROPS.items():
        im = main_only(cut(src, box))
        im.save(os.path.join(OUT, 'props', name + '.png'))
    print('tiles', len(TILES), 'props', len(PROPS))

if __name__ == '__main__': main()
