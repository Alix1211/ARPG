# 성 밖 갈림길 들판 (작은 고정 맵) — build.py에서 불러 씀
import os, random, numpy as np
from PIL import Image
from scipy import ndimage as nd

def gen_ground(R, mw, mh, px, dirt, seed, cache):
    if os.path.exists(cache): return Image.open(cache).convert('RGB')
    rng = np.random.RandomState(seed); random.seed(seed)
    W, H = mw * px, mh * px
    def tex(n):
        t = np.asarray(Image.open(R + f'tiles/spring/{n}.png').convert('RGB').resize((px, px), Image.LANCZOS))
        return np.tile(t, (mh, mw, 1)).astype(np.float32)
    grass, flower, dirt_t = tex('grass'), tex('grass_flower'), tex('dirt')
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / px
    def noise(scale, amp):
        n = rng.rand(H // 8 + 2, W // 8 + 2).astype(np.float32); n = nd.gaussian_filter(n, scale / 8)
        n = (n - n.mean()) / (n.std() + 1e-6)
        return np.asarray(Image.fromarray(n).resize((W, H), Image.BILINEAR)) * amp
    N1, N2 = noise(24, 0.18), noise(60, 0.5)
    img = grass.copy()
    fm = np.zeros((H, W), np.float32)
    for _ in range(9):
        cx, cy, r = random.uniform(1, mw - 1), random.uniform(5, mh - 1), random.uniform(1.0, 2.0)
        fm = np.maximum(fm, np.clip(1.4 - np.hypot(xx - cx, yy - cy) / r + N2 * 0.6, 0, 1))
    img = img * (1 - fm[..., None]) + flower * fm[..., None]
    sd = np.full((H, W), 1e9, np.float32)
    for x0, y0, x1, y1 in dirt:
        dx = np.maximum(x0 - xx, xx - x1); dy = np.maximum(y0 - yy, yy - y1)
        sd = np.minimum(sd, np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(np.maximum(dx, dy), 0))
    md = np.clip(0.5 - (sd + N1) / 0.25, 0, 1)[..., None]
    shade = np.clip(0.5 - (sd + N1 - 0.12) / 0.25, 0, 1)[..., None] - md
    img = img * (1 - 0.25 * np.clip(shade, 0, 1)); img = img * (1 - md) + dirt_t * md
    v = np.clip(np.minimum(np.minimum(xx, mw - xx), mh - yy) / 2.5, 0, 1)[..., None]
    img = img * (0.72 + 0.28 * v)
    g = Image.fromarray(img.clip(0, 255).astype(np.uint8)); g.save(cache); return g

OUT_W, OUT_H = 30, 20
OUT_DIRT = [(14.0, 3.8, 16.0, 11.0), (0.5, 10.0, 29.5, 12.2)]
FP = 'field_props/spring/'
# key, 이름, x, 바닥y, 폭(칸), 충돌(폭 비율, 깊이 칸), 종류
OUT_PROPS = [
 ('buildings/gate_wall', '성문 (마을로)', 15.0, 4.6, 7.6, None, 'gatewall'),
 ('buildings/watchtower', None, 9.6, 4.4, 2.3, (0.5, 0.9), ''), ('buildings/watchtower', None, 20.4, 4.4, 2.3, (0.5, 0.9), ''),
 ('buildings/watchtower', None, 2.6, 9.7, 2.3, (0.5, 0.9), ''),
 (FP + '16_cave', '던전 입구', 27.3, 10.4, 3.4, (0.9, 1.2), 'dungeon'),
 (FP + '15_signpost', '이정표', 17.3, 9.9, 1.2, (0.4, 0.3), 'sign'),
 ('field_props/autumn/13_scarecrow', '연습용 허수아비', 11.0, 15.6, 1.4, (0.35, 0.3), 'dummy'),
 ('field_props/autumn/13_scarecrow', '연습용 허수아비', 13.6, 16.3, 1.4, (0.35, 0.3), 'dummy'),
 (FP + '14_campfire', None, 21.2, 15.8, 1.4, (0.8, 0.5), 'fire'),
 (FP + '13_ruin_wall', None, 6.6, 16.9, 2.4, (0.9, 0.6), ''),
 (FP + '09_log', None, 19.4, 16.6, 1.9, (0.9, 0.4), ''), (FP + '04_stump', None, 23.4, 17.0, 1.3, (0.7, 0.4), ''),
 (FP + '07_rock_big', None, 25.6, 14.6, 1.8, (0.85, 0.6), ''), (FP + '08_rocks', None, 4.6, 13.9, 1.6, (0.85, 0.4), ''),
 (FP + '05_bush', None, 12.6, 8.4, 1.4, (0.8, 0.4), ''), (FP + '06_bush_flower', None, 18.6, 7.8, 1.4, (0.8, 0.4), ''),
 (FP + '11_flowers', None, 8.6, 13.6, 1.4, (0, 0), ''), (FP + '12_mushrooms', None, 24.0, 8.0, 1.1, (0, 0), ''),
 (FP + '10_grass_tall', None, 16.6, 14.4, 1.2, (0, 0), ''), (FP + '10_grass_tall', None, 9.0, 18.2, 1.2, (0, 0), ''),
 (FP + '05_bush', None, 28.6, 14.8, 1.4, (0.8, 0.4), ''), (FP + '06_bush_flower', None, 1.4, 14.6, 1.4, (0.8, 0.4), ''),
 (FP + '01_tree_big', None, 2.2, 4.0, 4.0, (0.16, 0.3), 'tree'), (FP + '02_tree_mid', None, 5.6, 4.6, 3.2, (0.16, 0.3), 'tree'),
 (FP + '01_tree_big', None, 25.0, 4.0, 4.0, (0.16, 0.3), 'tree'), (FP + '02_tree_mid', None, 28.4, 4.8, 3.2, (0.16, 0.3), 'tree'),
 (FP + '03_tree_young', None, 12.0, 4.8, 2.2, (0.16, 0.3), 'tree'), (FP + '03_tree_young', None, 18.2, 4.8, 2.2, (0.16, 0.3), 'tree'),
 (FP + '01_tree_big', None, 2.0, 20.4, 4.0, (0.16, 0.3), 'tree'), (FP + '02_tree_mid', None, 15.6, 20.6, 3.2, (0.16, 0.3), 'tree'),
 (FP + '01_tree_big', None, 27.6, 20.4, 4.0, (0.16, 0.3), 'tree'), (FP + '03_tree_young', None, 11.4, 20.2, 2.2, (0.16, 0.3), 'tree'),
 (FP + '02_tree_mid', None, 21.4, 20.5, 3.2, (0.16, 0.3), 'tree'), (FP + '03_tree_young', None, 6.4, 20.4, 2.2, (0.16, 0.3), 'tree'),
]

# 성 밖 경비병: 그림, 이름, 직함, x, 바닥y, 키(게임 단위), 첫마디, 하는 일
OUT_NPCS = [
 ('guard_kettle', '경비병', '필드 길 경비병', 4.0, 11.7, 122, '어디로 가나, 모험가? 갈 곳을 말하면 길을 알려 주지.', 'field'),
 ('guard_halberd', '경비병', '던전 길 경비병', 25.0, 11.9, 122, '던전이라… 살아서 나오면 한잔 사게.', 'dungeon'),
 ('guard_archer', '경비병', '망루 경비병', 12.4, 5.9, 118, '망루 위가 내 자리인데, 오늘은 다리가 아파서 말이야.', None),
 ('guard_cap', '경비병', '성문 경비병', 17.6, 5.9, 118, '성문은 늘 열려 있어. 닫는 법을 아무도 몰라서.', None),
]
