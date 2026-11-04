"""길드 접수원 SD 그림을 게임 안 인물들과 같은 톤으로 맞춘다(케인 2026-11-04: 혼자 튄다).

사용: python3 src/town/make_guild_sprite.py <투명 배경 SD 그림.png> [높이=208]
결과: assets_private/gaia_guild/receptionist_sd.png  (수위가 있는 그림이라 공개 저장소에는 올리지 않는다)

기존 SD 용병 그림과 비교해 본 차이(밝기 V, 채도 S, 가장 어두운 5%, 가장 밝은 5%):
  접수원 원본  V .53  S .18  어두움 .10  밝음 1.00   (순검정·순백, 몸 뒤 머리카락이 회색)
  게임 용병    V .49~.71  S .29~.57  어두움 .20~.29  밝음 .95~.98
그래서 ① 검정을 들어 올리고(순검정 없음) 흰 하이라이트를 눌러 주고 ② 채도를 올리며 회색 머리카락을 갈색으로 되돌리고
③ 약간 따뜻한 색으로 기울인 뒤 ④ 가장자리에 어두운 갈색 윤곽선을 둘러 기존 인물과 같은 느낌으로 만든다.
"""
import colorsys
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets_private" / "gaia_guild" / "receptionist_sd.png"

SAT_GAIN = 1.5
BLACK_LIFT = np.array([.19, .15, .16])      # 순검정 대신 살짝 따뜻한 짙은 색
WHITE_CAP = .955
WARM = np.array([1.035, 1.0, .945])
HAIR_HUE, HAIR_SAT = .06, .42               # 회색으로 뜬 머리카락을 되돌릴 갈색
OUTLINE = (50, 32, 27)


def rgb_to_hsv(a):
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx)
    m = d > 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(m & (mx == r), ((g - b) / np.maximum(d, 1e-6)) % 6, h)
    h = np.where(m & (mx == g), (b - r) / np.maximum(d, 1e-6) + 2, h)
    h = np.where(m & (mx == b), (r - g) / np.maximum(d, 1e-6) + 4, h)
    return h / 6, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    out = np.zeros(h.shape + (3,))
    for k, (r, g, b) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([r[m], g[m], b[m]], -1)
    return out


def main(src, height=208):
    im = Image.open(src).convert("RGBA")
    a = np.array(im)
    al = a[:, :, 3]
    keep = al > 24
    lab, n = ndi.label(keep)
    if n > 1:
        sizes = ndi.sum(keep, lab, range(1, n + 1))
        keep = lab == (1 + int(np.argmax(sizes)))
    a[:, :, 3] = np.where(keep, al, 0)
    im = Image.fromarray(a, "RGBA")
    im = im.crop(im.getbbox())
    w = round(im.width * height / im.height)
    # 먼저 줄인 뒤(가장자리 번짐을 줄이려고 알파를 곱한 채로) 색을 만진다
    pre = np.array(im).astype(float) / 255
    pre[..., :3] *= pre[..., 3:4]
    small = Image.fromarray((pre * 255).astype("uint8"), "RGBA").resize((w, height), Image.LANCZOS)
    s = np.array(small).astype(float) / 255
    alpha = s[..., 3]
    rgb = np.where(alpha[..., None] > 1e-3, s[..., :3] / np.maximum(alpha[..., None], 1e-3), 0)
    rgb = np.clip(rgb, 0, 1)

    _, sat, v = rgb_to_hsv(rgb)
    lum = (rgb * np.array([.299, .587, .114])).sum(-1, keepdims=True)
    # 회색으로 뜬 머리카락(채도 낮고 중간 밝기)은 같은 밝기의 갈색으로(색상 값을 섞지 않고 RGB로 섞어 얼룩을 피한다)
    haze = np.clip((.22 - sat) / .08, 0, 1) * np.clip((v - .30) / .08, 0, 1) * np.clip((.80 - v) / .10, 0, 1)
    brown = colorsys.hsv_to_rgb(HAIR_HUE, HAIR_SAT, 1.0)
    rgb = rgb * (1 - haze[..., None]) + (v[..., None] * np.array(brown)) * haze[..., None]
    lum = (rgb * np.array([.299, .587, .114])).sum(-1, keepdims=True)
    rgb = np.clip(lum + (rgb - lum) * SAT_GAIN, 0, 1)                       # 채도: 밝기는 두고 색만 키운다
    skin = np.clip((v - .72) / .10, 0, 1) * ((rgb[..., 0] > rgb[..., 1]) & (rgb[..., 1] > rgb[..., 2]) & (sat < .45))   # 피부는 조금 더 따뜻하게
    lum = (rgb * np.array([.299, .587, .114])).sum(-1, keepdims=True)
    rgb = np.clip(lum + (rgb - lum) * (1 + .35 * skin[..., None]), 0, 1)
    rgb = BLACK_LIFT + (WHITE_CAP - BLACK_LIFT) * rgb      # 순검정·순백 없애기
    rgb = np.clip(rgb * WARM, 0, 1)

    # 윤곽선: 알파를 2px 부풀려 인물 뒤에 어두운 갈색으로 깐다
    solid = alpha > .5
    grown = ndi.binary_dilation(solid, structure=ndi.generate_binary_structure(2, 2), iterations=2)
    edge = grown & ~solid
    out = np.zeros((height, w, 4))
    out[..., :3] = rgb
    out[..., 3] = alpha
    soft = ndi.gaussian_filter(grown.astype(float), .6)
    base = np.zeros_like(out)
    base[..., :3] = np.array(OUTLINE) / 255
    base[..., 3] = np.clip(soft, 0, 1)
    comp = np.zeros_like(out)
    a_f, a_b = out[..., 3:4], base[..., 3:4]
    ao = a_f + a_b * (1 - a_f)
    comp[..., :3] = np.where(ao > 1e-4, (out[..., :3] * a_f + base[..., :3] * a_b * (1 - a_f)) / np.maximum(ao, 1e-4), 0)
    comp[..., 3:4] = ao
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((np.clip(comp, 0, 1) * 255).astype("uint8"), "RGBA").save(OUT)
    print("저장:", OUT, (w, height))


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 208)
