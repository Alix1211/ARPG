# HUD 테두리 정리: 초상화 고리 안쪽을 뚫고, 체력·마나 막대를 배경 양피지 없이 잘라 낸다.
# 결과: assets/ui/hud_clean/portrait_ring.png, bar_hp.png, bar_mp.png (+ 구멍 위치 json)
import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
R = 'assets/ui/'
OUT = R + 'hud_clean/'
import os; os.makedirs(OUT, exist_ok=True)

def flood(mask, seeds):
    lab, _ = nd.label(mask)
    ids = {lab[y, x] for y, x in seeds if lab[y, x]}
    return np.isin(lab, list(ids))

# 1) 초상화 고리: 가운데 양피지색을 구멍으로
im = Image.open(R + 'kit_c/kit_c_05.png').convert('RGBA'); S = 4
im = im.resize((im.width * S, im.height * S), Image.LANCZOS); a = np.array(im).astype(float)
ref = a[78 * S, 73 * S, :3]
d = np.sqrt(((a[..., :3] - ref) ** 2).sum(-1))
hole = flood((d < 60) & (a[..., 3] > 128), [(78 * S, 73 * S)])
hole = nd.binary_fill_holes(hole)
hole = nd.binary_dilation(hole, iterations=2 * S)          # 금테 안쪽 그늘선까지 살짝 먹어 들어가 깔끔하게
soft = nd.gaussian_filter(hole.astype(float), S * 0.8)
a[..., 3] = a[..., 3] * (1 - np.clip(soft * 1.6, 0, 1))
out = Image.fromarray(a.clip(0, 255).astype('uint8')).resize((im.width // S, im.height // S), Image.LANCZOS)
out.save(OUT + 'portrait_ring.png')
ys, xs = np.where(hole); W, H = im.size
info = dict(ring=dict(l=xs.min() / W, t=ys.min() / H, r=1 - xs.max() / W, b=1 - ys.max() / H))

# 2) 막대: 아이콘+막대 테두리만 남기고 바깥 양피지는 투명, 안쪽 채움칸은 빈 홈(어두운 바탕)으로
s = Image.open(R + 'kit_c/kit_c_02b.png').convert('RGBA')
for name, box in [('hp', (148, 97, 344, 129)), ('mp', (148, 132, 344, 164))]:
    c = s.crop((box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4))
    c = c.resize((c.width * S, c.height * S), Image.LANCZOS); a = np.array(c).astype(float)
    h, w = a.shape[:2]
    bg = np.median(np.concatenate([a[:3 * S, :, :3].reshape(-1, 3), a[-3 * S:, :, :3].reshape(-1, 3)]), 0)
    d = np.sqrt(((a[..., :3] - bg) ** 2).sum(-1))
    seeds = [(0, x) for x in range(0, w, 4)] + [(h - 1, x) for x in range(0, w, 4)] + [(y, 0) for y in range(0, h, 4)] + [(y, w - 1) for y in range(0, h, 4)]
    outside = flood(d < 55, seeds)
    keep = ~outside
    keep = nd.binary_opening(keep, iterations=S // 2)
    lab, n = nd.label(keep); sizes = nd.sum(keep, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v == sizes.max()])
    keep = nd.binary_fill_holes(keep)
    al = nd.gaussian_filter(keep.astype(float), S * 0.5)
    a[..., 3] = np.minimum(a[..., 3], al * 255)
    # 채움칸(빨강/파랑) 찾기 → 어두운 홈으로 칠함
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    fill = (r > 150) & (g < 110) & (b < 110) if name == 'hp' else (b > 150) & (r < 110)
    fill[:, : int(w * 0.175)] = False                       # 왼쪽 아이콘(하트·물방울)은 그대로
    lab, n = nd.label(fill); sizes = nd.sum(fill, lab, range(1, n + 1)); fill = lab == (np.argmax(sizes) + 1)
    fill = nd.binary_fill_holes(nd.binary_closing(fill, iterations=2 * S))
    ys, xs = np.where(fill)
    fill = nd.binary_dilation(fill, iterations=2 * S)
    groove = np.array([46, 28, 18], float)
    fy, fx = np.where(fill); sh = np.clip((fy - fy.min()) / max(1, fy.max() - fy.min()), 0, 1)
    k = nd.gaussian_filter(fill.astype(float), S * 0.6)[..., None]
    tone = np.zeros_like(a[..., :3]); tone[...] = groove
    tone[fill] = groove * (0.7 + 0.5 * sh)[:, None]          # 위는 어둡고 아래는 조금 밝은 홈
    a[..., :3] = a[..., :3] * (1 - k) + tone * k
    o = Image.fromarray(a.clip(0, 255).astype('uint8'))
    bb = o.getbbox(); o = o.crop(bb)
    x0, y0 = bb[0], bb[1]; W2, H2 = o.size
    info[name] = dict(l=(xs.min() - x0) / W2, t=(ys.min() - y0) / H2, w=(xs.max() - xs.min()) / W2, h=(ys.max() - ys.min()) / H2, ar=W2 / H2)
    o.resize((W2 // S, H2 // S), Image.LANCZOS).save(OUT + f'bar_{name}.png')
json.dump(info, open(OUT + 'layout.json', 'w'), indent=1)
print(json.dumps(info, indent=1))
