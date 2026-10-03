# HUD 아이콘 시트 설명서: python3 tools/hud_guide.py
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets') + '/'
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(s): return ImageFont.truetype(F, s, index=1)
ITEMS = [
 '불 1: 불덩이 한 발', '불 2: 불 폭발(중간 범위)', '불 3: 불비(넓은 범위)', '얼음 1: 얼음 화살', '얼음 2: 얼음 폭발', '얼음 3: 눈보라',
 '뇌전 1: 번개 화살', '뇌전 2: 연쇄 번개', '뇌전 3: 낙뢰 폭풍', '암흑 1: 어둠 구체', '암흑 2: 저주의 늪', '암흑 3: 어둠 폭발',
 '백마법 1: 치유', '백마법 2: 방어막', '백마법 3: 부활', '검 1: 강하게 베기', '검 2: 회전 베기', '검 3: 검기 폭풍',
 '창 1: 꿰뚫기 찌르기', '창 2: 휩쓸기', '창 3: 창 비', '활 1: 강한 화살', '활 2: 부채꼴 화살', '활 3: 화살비',
 '무투 1: 연타', '무투 2: 땅 내려치기', '무투 3: 회오리 주먹', '버튼: 가방', '버튼: 무기 교체(순환 화살표)', '버튼: 스킬창(책)',
 '버튼: 체력 물약', '버튼: 마나 물약', '버튼: 지도', '버튼: 설정(톱니)', '빈 스킬 칸(잠김 자물쇠)', '버튼: 닫기 X'
]
STYLE = ['ui/kit_c/kit_c_21', 'ui/kit_c/kit_c_22', 'ui/kit_c/kit_c_23', 'ui/kit_c/kit_c_14', 'ui/kit_c/kit_c_18', 'weapons/sword_03']
W, H = 1536, 1024
S = Image.new('RGB', (W, H), (246, 240, 228)); d = ImageDraw.Draw(S)
d.text((24, 14), 'HUD 아이콘 시트 설명서 — 스킬 27 + 버튼 9', font=font(34), fill=(70, 40, 20))
d.text((24, 60), '투명 배경 · 모두 같은 크기의 둥근 버튼 · 테두리는 ①의 청동 고리 · 가운데 그림만 다르게 · 글자 쓰지 말 것 · 칸 밖으로 넘치지 않게',
       font=font(18), fill=(120, 60, 30))
d.rounded_rectangle((20, 96, 300, 1004), 16, outline=(160, 110, 60), width=3)
d.text((34, 106), '① 그림체 기준', font=font(20), fill=(70, 40, 20))
y = 140
for p in STYLE:
    im = Image.open(A + p + '.png').convert('RGBA'); im.thumbnail((120, 120), Image.LANCZOS)
    x = 40 + (0 if STYLE.index(p) % 2 == 0 else 130)
    S.paste(im, (x, y + 120 - im.height), im)
    if STYLE.index(p) % 2 == 1: y += 140
d.text((34, 580), '② 아이콘 그림은\n무기 아이콘처럼\n선명하고 귀엽게.\n계열 색:\n불=주황 · 얼음=하늘\n뇌전=노랑 · 암흑=보라\n백마법=흰 금색\n무기 스킬=청동·은색', font=font(18), fill=(70, 40, 20), spacing=8)
gx, gy, cw, ch = 320, 96, 202, 151
for i, it in enumerate(ITEMS):
    cx, cy = gx + (i % 6) * cw, gy + (i // 6) * ch
    d.rounded_rectangle((cx + 5, cy + 5, cx + cw - 5, cy + ch - 5), 12, outline=(180, 140, 90), width=2)
    d.text((cx + 14, cy + 12), f'{i + 1}.', font=font(18), fill=(70, 40, 20))
    d.text((cx + 14, cy + ch - 40), it, font=font(15), fill=(70, 40, 20))
S.save(os.path.join(ROOT, 'docs', 'guides', 'hud_icons.png')); print('ok')
