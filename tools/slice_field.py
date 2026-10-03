# 필드 소품 시트(4×4) 자르기: python3 tools/slice_field.py <시트.png> <테마>
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = {
 'spring': 'tree_big tree_mid tree_young stump bush bush_flower rock_big rocks log grass_tall flowers mushrooms ruin_wall campfire signpost cave',
 'summer': 'tree_big tree_vine tree_young stump_moss fern berry_bush rock_moss rocks log_vine grass_tall flowers mushroom_big ruin_wall tent fence_broken cave',
 'autumn': 'tree_maple tree_ginkgo tree_bare stump bush_orange bush_dry rock_big rocks log grass_dry leaf_pile pumpkins scarecrow hay cart cave',
 'winter': 'tree_pine_big tree_pine tree_bare stump_snow bush_snow bush_frost rock_snow rocks log_snow grass_dry snow_pile snowman signpost campfire_out sled cave',
 'ice': 'tree_frozen tree_crystal bush_icethorn stump_ice bush_frost crystals rock_ice ice_shards log_frozen grass_frost ice_pillar ice_floe armor_frozen icicle_rock altar_ice cave',
 'volcano': 'tree_burnt_big tree_burnt stump_char bush_ash flame_flower obsidian rock_lava lava_stones log_ember grass_thorn crater gravestone armor_molten lava_edge altar_fire cave',
 'swamp': 'tree_willow tree_mangrove tree_dead stump_rot bush_swamp reeds rock_moss rocks log_mushroom grass_swamp lilypads toadstools pillar_sunk boardwalk witch_pot cave',
}
def cut(s, b, band):
    lo, hi = int(b - band), int(b + band); return lo + int(np.argmin(s[lo:hi]))
src, theme = sys.argv[1], sys.argv[2]
A = np.array(Image.open(src).convert('RGBA')); a = A[..., 3] > 100
H, W = a.shape; cw, ch = W / 4, H / 4
od = os.path.join(ROOT, 'assets', 'field_props', theme); os.makedirs(od, exist_ok=True)
names = NAMES[theme].split()
for r in range(4):
    for c in range(4):
        cs = a[:, int(c * cw):int((c + 1) * cw)].sum(1)
        y0 = 0 if r == 0 else cut(cs, r * ch, 70); y1 = H if r == 3 else cut(cs, (r + 1) * ch, 70)
        rs = a[y0:y1].sum(0)
        x0 = 0 if c == 0 else cut(rs, c * cw, 90); x1 = W if c == 3 else cut(rs, (c + 1) * cw, 90)
        sub = A[y0:y1, x0:x1].copy(); s = sub[..., 3]
        l, n = nd.label(nd.binary_dilation(s > 60, iterations=4)); sz = nd.sum(s > 60, l, range(1, n + 1))
        sub[~np.isin(l, [i + 1 for i in range(n) if sz[i] >= 0.03 * sz.max()]), 3] = 0
        im = Image.fromarray(sub); im = im.crop(im.getbbox())
        i = r * 4 + c
        im.save(os.path.join(od, f'{i + 1:02d}_{names[i]}.png'))
        if (c and rs[x0]) or (c < 3 and rs[min(x1, W - 1)]): print('  겹침 주의', i + 1, names[i])
print(theme, 'ok')
