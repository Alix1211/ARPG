#!/usr/bin/env python3
"""GPT 이미지 요청 시트 생성기 (지침서 07 방식).
현재 화면 캡처(2배 해상도)에 번호 상자를 그리고, 코드로 그린 설계도를 붙인다.
사용: python3 tools/gaia_request_sheets.py <hud_main2x.png> <skill_tab2x.png>
출력: source_sheets/gaia_ui/request/*.png
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'source_sheets/gaia_ui/request')
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
REG = '/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc'

def F(n, bold=True):
    return ImageFont.truetype(FONT if bold else REG, n, index=1)

COL = {1: (0, 220, 255), 2: (255, 80, 200), 3: (120, 255, 60), 4: (255, 170, 0),
       5: (170, 120, 255), 6: (255, 70, 70), 7: (255, 255, 80), 8: (80, 255, 190)}
NUM = '①②③④⑤⑥⑦⑧⑨'

def badge(d, x, y, n, r=22):
    c = COL[n]
    d.ellipse((x - r, y - r, x + r, y + r), fill=c, outline=(0, 0, 0), width=3)
    d.text((x, y), str(n), font=F(int(r * 1.3)), fill=(0, 0, 0), anchor='mm')

def box(d, b, n, width=5, bx=None, by=None):
    d.rectangle(b, outline=COL[n], width=width)
    badge(d, b[0] if bx is None else bx, b[1] if by is None else by, n)

def wrap_text(d, x, y, text, font, fill, maxw, lh):
    for para in text.split('\n'):
        line = ''
        for ch in para:
            if d.textlength(line + ch, font=font) > maxw:
                d.text((x, y), line, font=font, fill=fill); y += lh; line = ch
            else:
                line += ch
        d.text((x, y), line, font=font, fill=fill); y += lh
    return y

def checker(im, size=16):
    """투명 영역 표시용 체크무늬 배경."""
    w, h = im.size
    bg = Image.new('RGBA', (w, h), (200, 200, 200, 255))
    d = ImageDraw.Draw(bg)
    for yy in range(0, h, size):
        for xx in range(0, w, size):
            if (xx // size + yy // size) % 2:
                d.rectangle((xx, yy, xx + size - 1, yy + size - 1), fill=(150, 150, 150, 255))
    bg.alpha_composite(im)
    return bg

# ---------------------------------------------------------------- 시트 1: HUD 전체
def sheet_hud(src):
    im = Image.open(src).convert('RGBA')          # 2560x1440
    d = ImageDraw.Draw(im)
    box(d, (20, 192, 320, 348), 1)
    box(d, (336, 192, 488, 258), 2)
    box(d, (2190, 970, 2512, 1292), 3)
    for (x, y) in [(2186, 878), (2356, 848), (2074, 988), (2084, 1148), (2190, 1266)]:
        box(d, (x, y, x + 112, y + 112), 4)
    s = 0.75
    im = im.resize((int(2560 * s), int(1440 * s)), Image.LANCZOS)
    legend_h = 370
    items = [
        (1, '동료 체력/M 카드 (아가사·실비아)', '지금: 150×78(CSS) 패널 한 장. 요청: 한 명당 카드 1장(300×72px) + 게이지 채움띠. 글자는 코드가 씀.'),
        (2, '"동료 집합" 버튼', '지금 76×33(CSS). 요청: 보통 / 눌림 / 비활성(회색) 3상태, 152×66px.'),
        (3, '기본 공격 다이얼', '지금: 무기 4개짜리 X자 다이얼(161×161 CSS). 요청: 방망이(왼쪽)·채찍(오른쪽) 두 칸짜리로 교체.'),
        (4, '스킬 버튼 5개', '지금 56×56(CSS) 갈색 원. 요청: 빈 칸 / 사용 가능 2상태 틀, 112×112px, 새 UI 키트 재질로.'),
    ]
    sheet2 = Image.new('RGBA', (im.width, im.height + legend_h), (24, 22, 28, 255))
    sheet2.paste(im, (0, 0))
    d2 = ImageDraw.Draw(sheet2)
    yy = im.height + 14
    for n, t, desc in items:
        badge(d2, 40, yy + 24, n)
        d2.text((78, yy + 2), t, font=F(26), fill=(255, 255, 255))
        d2.text((78, yy + 36), desc, font=F(20, False), fill=(205, 205, 215))
        yy += 76
    d2.text((20, sheet2.height - 30), '※ 화면 캡처는 1280×720(CSS)을 2배(2560×1440)로 찍은 것입니다. 모든 요청 크기는 이 2배 기준 px입니다.',
            font=F(18, False), fill=(255, 220, 120))
    sheet2.convert('RGB').save(os.path.join(OUT, '01_HUD_전체_번호.png'))

# ---------------------------------------------------------------- 시트 2: HUD 확대 + 치수
def sheet_zoom(src):
    base = Image.open(src).convert('RGBA')
    z = 2
    a_box = (0, 140, 560, 400)       # 왼쪽 위
    b_box = (2040, 820, 2560, 1340)  # 오른쪽 아래
    a = base.crop(a_box).resize(((a_box[2] - a_box[0]) * z, (a_box[3] - a_box[1]) * z), Image.LANCZOS)
    b = base.crop(b_box).resize(((b_box[2] - b_box[0]) * z, (b_box[3] - b_box[1]) * z), Image.LANCZOS)
    da = ImageDraw.Draw(a); db = ImageDraw.Draw(b)

    def rel(box_, o):
        return tuple((v - o[i % 2]) * z for i, v in enumerate(box_))
    def dim(d, r, text, above=True):
        x0, y0, x1, y1 = r
        ty = y0 - 34 if above else y1 + 8
        d.text((x0, ty), text, font=F(24), fill=(255, 255, 80), stroke_width=3, stroke_fill=(0, 0, 0))

    r1 = rel((20, 192, 320, 348), (0, 140)); da.rectangle(r1, outline=COL[1], width=6); badge(da, r1[0], r1[1], 1)
    dim(da, r1, '300×156 px (두 명분, 카드 1장 = 300×72)', above=False)
    r2 = rel((336, 192, 488, 258), (0, 140)); da.rectangle(r2, outline=COL[2], width=6); badge(da, r2[0], r2[1], 2)
    dim(da, r2, '152×66 px', above=False)
    r3 = rel((2190, 970, 2512, 1292), (2040, 820)); db.rectangle(r3, outline=COL[3], width=6); badge(db, r3[0], r3[1], 3)
    dim(db, r3, '322×322 px (이미지는 320×320 정사각)', above=False)
    for (x, y) in [(2186, 878), (2356, 848), (2074, 988), (2084, 1148), (2190, 1266)]:
        r = rel((x, y, x + 112, y + 112), (2040, 820)); db.rectangle(r, outline=COL[4], width=6); badge(db, r[0], r[1], 4, r=20)
    db.text((20, 10), '④ 각 112×112 px', font=F(24), fill=(255, 255, 80), stroke_width=3, stroke_fill=(0, 0, 0))
    W = a.width + b.width + 30
    H = max(a.height, b.height) + 10
    sheet = Image.new('RGB', (W, H), (24, 22, 28))
    sheet.paste(a.convert('RGB'), (0, 0)); sheet.paste(b.convert('RGB'), (a.width + 30, 0))
    sheet.save(os.path.join(OUT, '02_HUD_확대_치수.png'))

# ---------------------------------------------------------------- 시트 3: 캐릭터 탭 / 잠금
def sheet_tabs(src):
    im = Image.open(src).convert('RGBA')          # 2560x1440
    d = ImageDraw.Draw(im)
    # ⑤ 캐릭터 탭 자리 (기존 4개 탭 오른쪽 빈 자리)
    r5 = (860, 30, 1240, 170)
    d.rectangle(r5, outline=COL[5], width=6); badge(d, r5[0], r5[1], 5)
    for i in range(3):
        cx = 860 + 63 + i * 127
        d.ellipse((cx - 55, 100 - 55 + 10, cx + 55, 100 + 55 - 10 + 20), outline=COL[5], width=3)
    d.text((r5[0] + 4, r5[3] + 6), '원형 탭 3개 (카일·아가사·실비아), 각 128×128 px 이내',
           font=F(26), fill=(255, 255, 80), stroke_width=3, stroke_fill=(0, 0, 0))
    # ⑥ 잠금 덮개 - 얼음 줄 첫 아이콘
    r6 = (348, 468, 440, 561)
    d.rectangle(r6, outline=COL[6], width=6); badge(d, r6[0], r6[1], 6)
    s = 0.75
    im = im.resize((int(2560 * s), int(1440 * s)), Image.LANCZOS)
    items = [
        (5, '캐릭터 탭 (장비창·스킬창 공통)', '지금 있는 탭(장비/능력치/스킬/무역품) 오른쪽 빈 자리에 놓습니다. 선택됨 / 선택 안 됨 / 비활성(회색) 3상태.'),
        (6, '레벨 잠금 덮개', '스킬은 레벨로 열립니다. 아직 못 배우는 스킬 아이콘 위에 덮는 반투명 잠금. 투명 배경 PNG, 아이콘이 비쳐 보이게.'),
    ]
    sheet = Image.new('RGB', (im.width, im.height + 190), (24, 22, 28))
    sheet.paste(im.convert('RGB'), (0, 0))
    d = ImageDraw.Draw(sheet)
    y = im.height + 14
    for n, t, desc in items:
        badge(d, 40, y + 24, n)
        d.text((78, y + 2), t, font=F(26), fill=(255, 255, 255))
        d.text((78, y + 36), desc, font=F(20, False), fill=(205, 205, 215))
        y += 76
    sheet.save(os.path.join(OUT, '03_캐릭터탭_잠금.png'))

# ---------------------------------------------------------------- 시트 4: 카일 스킬 아이콘 8종
KYLE = [
    ('긴급매질', '방망이 + 불꽃 튀는 하트'),
    ('몰아치기', '방망이 잔상 3개가 겹침'),
    ('정신 차려', '손바닥 + 별(짝!)'),
    ('긴급 허세', '근육 팔 + 불꽃'),
    ('긴급 S파워', '채찍이 감긴 하트'),
    ('긴급 독무', '초록 독안개 구름'),
    ('긴급 도망', '발자국 + 먼지 + 문'),
    ('긴급 M파워 충전', '하트 둘 + 자석 + M'),
]

def sheet_kyle_icons(skill_src):
    base = Image.open(skill_src).convert('RGBA')
    # 참고 아이콘: 불 / 암흑 / 백마법 / 검 (원본 좌표, 약 92px)
    pts = [(348, 353), (348, 704), (348, 822), (348, 938)]
    cell = 330
    W = cell * 4 + 60
    H = 190 + cell * 2 + 60 + 260
    sheet = Image.new('RGB', (W, H), (24, 22, 28))
    d = ImageDraw.Draw(sheet)
    d.text((30, 20), '카일 스킬 아이콘 8종 — 한 장에 4×2 배치', font=F(34), fill=(255, 255, 255))
    d.text((30, 70), '배경 투명, 글자 없음, 칸마다 정사각 256×256 px, 칸 사이 간격 균등.', font=F(22, False), fill=(205, 205, 215))
    d.text((30, 104), '스타일: 아래 참고 아이콘처럼 "어두운 원형 메달 + 중앙 모티프". 밝은 모티프(주황·초록·분홍)로 눈에 띄게.', font=F(22, False), fill=(205, 205, 215))
    y0 = 190
    for i, (nm, motif) in enumerate(KYLE):
        cx = 30 + (i % 4) * cell
        cy = y0 + (i // 4) * (cell + 30)
        d.rectangle((cx, cy, cx + cell - 20, cy + cell - 20), outline=(90, 90, 110), width=2)
        d.ellipse((cx + 60, cy + 24, cx + 250, cy + 214), outline=(110, 110, 130), width=3)
        d.text((cx + 12, cy + 8), f'{i + 1}', font=F(30), fill=(255, 220, 80))
        d.text((cx + (cell - 20) // 2, cy + 250), nm, font=F(26), fill=(255, 255, 255), anchor='mm')
        d.text((cx + (cell - 20) // 2, cy + 284), motif, font=F(18, False), fill=(190, 190, 205), anchor='mm')
    ry = y0 + 2 * (cell + 30) + 10
    d.text((30, ry), '스타일 참고 (원형 메달만 참고, 베이지 배경은 무시)', font=F(26), fill=(255, 255, 255))
    for i, p in enumerate(pts):
        crop = base.crop((p[0], p[1], p[0] + 96, p[1] + 96)).resize((192, 192), Image.LANCZOS)
        sheet.paste(crop.convert('RGB'), (30 + i * 230, ry + 44))
    sheet.save(os.path.join(OUT, '04_카일스킬_아이콘_8종.png'))

# ---------------------------------------------------------------- 시트 5: 설계도
def sheet_blueprint(dial_dir):
    W, H = 2200, 1950
    sh = Image.new('RGB', (W, H), (20, 24, 34))
    d = ImageDraw.Draw(sh)
    d.text((30, 20), '코드로 그린 설계도 (치수는 모두 px, 화면의 2배 기준)', font=F(34), fill=(255, 255, 255))
    d.text((30, 66), '파란 선 = 칸 경계, 노란 글씨 = 치수/뜻. 설계도의 글자는 안내용입니다. 완성 그림에는 글자를 넣지 마세요.', font=F(22, False), fill=(205, 205, 215))
    BL = (90, 150, 255)
    YE = (255, 235, 90)

    # ① 동료 카드 300×72 (3배 확대)
    k = 2
    ox, oy = 40, 130
    d.text((ox, oy - 40), '① 동료 카드 1장: 300×72 px (두 명 공용 틀)', font=F(24), fill=YE)
    d.rectangle((ox, oy, ox + 300 * k, oy + 72 * k), outline=BL, width=3)
    d.ellipse((ox + 8 * k, oy + 8 * k, ox + 64 * k, oy + 64 * k), outline=BL, width=3)
    d.text((ox + 36 * k, oy + 36 * k), '초상\n56×56', font=F(20), fill=YE, anchor='mm', align='center')
    d.rectangle((ox + 76 * k, oy + 14 * k, ox + 276 * k, oy + 30 * k), outline=BL, width=3)
    d.text((ox + 176 * k, oy + 22 * k), 'HP 틀 200×16 (비어 있음)', font=F(18), fill=YE, anchor='mm')
    d.rectangle((ox + 76 * k, oy + 40 * k, ox + 276 * k, oy + 52 * k), outline=BL, width=3)
    d.text((ox + 176 * k, oy + 46 * k), 'M 틀 200×12 (비어 있음)', font=F(18), fill=YE, anchor='mm')
    d.text((ox + 76 * k, oy + 2 * k), '이름: 코드 글자 자리', font=F(16, False), fill=(200, 200, 200))
    d.text((ox, oy + 72 * k + 12), '· 초상 자리는 비워 둡니다(우리 전신 그림에서 코드가 잘라 넣음).\n· 카드 틀은 카일의 둥근 HUD 틀과 같은 재질(강철+가죽+파랑)로.', font=F(20, False), fill=(205, 205, 215))

    # 채움띠
    fx = 760; fy = 130
    d.text((fx, fy - 40), '①-b 게이지 채움띠 (코드가 길이를 조절)', font=F(24), fill=YE)
    d.rectangle((fx, fy, fx + 400, fy + 32), outline=(255, 90, 90), width=3)
    d.text((fx + 200, fy + 16), 'HP 채움 200×16 · 빨강', font=F(18), fill=(255, 150, 150), anchor='mm')
    d.rectangle((fx, fy + 60, fx + 400, fy + 84), outline=(255, 200, 70), width=3)
    d.text((fx + 200, fy + 72), 'M 채움 200×12 · 금색(임시, 색 미정)', font=F(18), fill=(255, 220, 130), anchor='mm')
    d.rectangle((fx, fy + 112, fx + 400, fy + 144), outline=(150, 150, 150), width=3)
    d.text((fx + 200, fy + 128), '쓰러짐용 회색 채움 200×16', font=F(18), fill=(190, 190, 190), anchor='mm')
    d.text((fx, fy + 160), '· 이미 있는 카일 HP/M 막대 채움 그림과 같은 광택 느낌.\n· 가로로 길게 늘려도 깨지지 않게 양끝만 둥글게.', font=F(20, False), fill=(205, 205, 215))

    # ② 동료 집합 버튼 3상태
    bx, by = 1320, 130
    d.text((bx, by - 40), '② 동료 집합 버튼 3상태: 각 152×66 px (글자 없음, 코드가 씀)', font=F(24), fill=YE)
    for i, nm in enumerate(['보통', '눌림', '비활성(회색)']):
        x = bx + i * 300
        d.rounded_rectangle((x, by, x + 152 * 1.5 // 1, by + 66 * 1.5 // 1), radius=14, outline=BL, width=3)
        d.text((x + 76 * 1.5 // 1, by + 33 * 1.5 // 1), nm, font=F(22), fill=YE, anchor='mm')

    # ③ 다이얼 두 칸
    cx, cy, R = 330, 930, 250
    d.text((40, 560), '③ 기본 공격 다이얼: 320×320 원형', font=F(24), fill=YE)
    d.text((40, 596), '왼쪽 반 = 방망이, 오른쪽 반 = 채찍', font=F(22, False), fill=(205, 205, 215))
    d.ellipse((cx - R, cy - R, cx + R, cy + R), outline=BL, width=4)
    d.line((cx, cy - R, cx, cy + R), fill=BL, width=4)
    d.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), outline=BL, width=4)
    d.text((cx - 130, cy), '방망이\n칸', font=F(30), fill=YE, anchor='mm', align='center')
    d.text((cx + 130, cy), '채찍\n칸', font=F(30), fill=YE, anchor='mm', align='center')
    d.text((cx, cy), '중앙\n버튼', font=F(22), fill=YE, anchor='mm', align='center')
    d.text((40, cy + R + 14), '요청 이미지 4장 (모두 같은 320×320 캔버스, 같은 위치):\n  a) 전체 다이얼(두 칸, 아이콘 포함)   b) 방망이 칸 켜짐(밝게)\n  c) 채찍 칸 켜짐(밝게)   d) 중앙 버튼 (눌림 상태 포함 2장)\n칸 안 무기 그림: 방망이(몽둥이), 채찍. 지금 X자 다이얼과 같은 크기·재질.',
           font=F(20, False), fill=(205, 205, 215))
    # 참고: 현재 다이얼
    ref = os.path.join(dial_dir, 'attack_all.png')
    if os.path.exists(ref):
        r = Image.open(ref).convert('RGBA').resize((320, 320), Image.LANCZOS)
        sh.paste(checker(r).convert('RGB'), (800, 640))
        d.text((800, 600), '참고: 지금 다이얼(무기 4칸, 바꿀 것)', font=F(22), fill=YE)

    # ④ 스킬 버튼 틀
    sx, sy = 1320, 640
    d.text((sx, sy - 40), '④ 스킬 버튼 틀: 112×112 px 원형, 2상태 (가운데는 비움)', font=F(24), fill=YE)
    for i, nm in enumerate(['빈 칸', '사용 가능']):
        x = sx + i * 300
        d.ellipse((x, sy, x + 168, sy + 168), outline=BL, width=4)
        d.ellipse((x + 24, sy + 24, x + 144, sy + 144), outline=BL, width=2)
        d.text((x + 84, sy + 84), nm, font=F(22), fill=YE, anchor='mm')
    d.text((sx, sy + 184), '· 가운데 지름 약 80px는 스킬 아이콘이 들어갈 자리(투명).\n· 쿨다운 어둡게는 코드가 처리합니다.', font=F(20, False), fill=(205, 205, 215))

    # ⑤ 캐릭터 탭 / ⑥ 잠금
    ty = 1560
    d.text((40, ty - 44), '⑤ 캐릭터 탭 3개: 지름 약 110 px 원형 · 상태 3종', font=F(24), fill=YE)
    for i, nm in enumerate(['선택', '비선택', '비활성']):
        x = 60 + i * 200
        d.ellipse((x, ty, x + 150, ty + 150), outline=BL, width=4)
        d.ellipse((x + 18, ty + 18, x + 132, ty + 132), outline=BL, width=2)
        d.text((x + 75, ty + 75), nm, font=F(24), fill=YE, anchor='mm')
    d.text((1320, ty - 44), '⑥ 잠금 덮개: 128×128 px 투명 PNG', font=F(24), fill=YE)
    d.ellipse((1320, ty, 1470, ty + 150), outline=BL, width=4)
    d.rectangle((1365, ty + 70, 1425, ty + 120), outline=YE, width=3)
    d.arc((1373, ty + 35, 1417, ty + 85), 180, 360, fill=YE, width=3)
    d.text((1490, ty + 20), '· 반투명 어두운 원 + 작은 자물쇠\n· 아래 아이콘이 희미하게 비쳐야 함\n· 가장자리는 아이콘 원형 테두리와 일치', font=F(20, False), fill=(205, 205, 215))
    sh.save(os.path.join(OUT, '05_설계도.png'))


if __name__ == '__main__':
    hud, skl = sys.argv[1], sys.argv[2]
    sheet_hud(hud)
    sheet_zoom(hud)
    sheet_tabs(skl)
    sheet_kyle_icons(skl)
    sheet_blueprint(os.path.join(ROOT, 'source_sheets/ui/attack_selector'))
    print('ok', os.listdir(OUT))
