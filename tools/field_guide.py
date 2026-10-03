# 필드 소품 시트용 설명서 그림 만들기: python3 tools/field_guide.py
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets') + '/'
F = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(s): return ImageFont.truetype(F, s, index=1)  # KR
THEMES = {
 'spring':  ('봄 초원', ['큰 활엽수', '중간 나무', '어린 나무', '그루터기', '초록 덤불', '꽃 덤불', '큰 바위', '작은 바위 무더기',
                         '쓰러진 통나무', '키 큰 풀숲', '들꽃 무더기', '버섯 무리', '무너진 돌벽 조각', '야영지 모닥불', '나무 이정표', '동굴(던전) 입구']),
 'summer':  ('여름 숲', ['짙은 큰 나무', '덩굴 감긴 나무', '어린 나무', '이끼 그루터기', '고사리 덤불', '산딸기 덤불', '이끼 바위', '작은 바위 무더기',
                         '덩굴 덮인 통나무', '키 큰 풀숲', '여름 꽃 무더기', '큰 버섯', '덩굴 덮인 석상 조각', '사냥꾼 천막', '부러진 나무다리 난간', '동굴(던전) 입구']),
 'autumn':  ('가을 들판', ['붉은 단풍나무', '노란 은행나무', '앙상한 어린 나무', '그루터기', '주황 덤불', '마른 덤불', '큰 바위', '작은 바위 무더기',
                          '낙엽 덮인 통나무', '마른 풀숲', '낙엽 더미', '호박 무리', '허수아비', '건초 더미', '버려진 수레', '동굴(던전) 입구']),
 'winter':  ('겨울 설원', ['눈 덮인 큰 전나무', '눈 덮인 작은 전나무', '앙상한 겨울 나무', '눈 쌓인 그루터기', '눈 덮인 덤불', '얼어붙은 덤불', '눈 덮인 바위', '작은 바위 무더기',
                          '눈 덮인 통나무', '눈 위 마른 풀', '눈 더미', '눈사람', '얼어붙은 표지판', '꺼진 모닥불 자리', '썰매', '동굴(던전) 입구']),
 'ice':     ('얼음 동굴 지대', ['얼음에 갇힌 나무', '수정 같은 얼음 나무', '얼음 가시 덤불', '얼음 그루터기', '서리 덤불', '얼음 수정 무리', '큰 얼음 바위', '작은 얼음 조각 무더기',
                             '얼어붙은 통나무', '서리 풀', '푸른 얼음 기둥', '갈라진 얼음판 조각', '얼어붙은 해골 갑옷', '얼음 고드름 바위', '얼음 제단', '얼음 동굴(던전) 입구']),
 'volcano': ('화산 지대', ['불탄 큰 나무', '불탄 작은 나무', '숯이 된 그루터기', '재 덮인 덤불', '불꽃 꽃(빛나는 식물)', '흑요석 수정 무리', '큰 용암 바위', '작은 화산석 무더기',
                          '타다 남은 통나무', '마른 가시풀', '연기 나는 분화구 구멍', '김 나는 틈', '녹아내린 철 갑옷', '용암 웅덩이 가장자리 바위', '불의 제단', '화산 동굴(던전) 입구']),
 'swamp':   ('늪지대', ['늘어진 버드나무', '맹그로브 나무', '죽은 고목', '썩은 그루터기', '늪 덤불', '갈대 무리', '이끼 바위', '작은 바위 무더기',
                        '버섯 핀 썩은 통나무', '늪 풀숲', '연잎과 연꽃', '독버섯 무리', '가라앉은 돌기둥', '나무 판자 길 조각', '마녀의 솥', '늪 동굴(던전) 입구']),
}
STYLE = ['town_props/tree_big', 'town_props/bush_red', 'town_props/rock_1', 'town_props/fence_h']
def thumb(p, box):
    im = Image.open(A + p + '.png').convert('RGBA'); im.thumbnail(box, Image.LANCZOS); return im
for key, (title, items) in THEMES.items():
    W, H = 1536, 1024
    S = Image.new('RGB', (W, H), (246, 240, 228)); d = ImageDraw.Draw(S)
    d.text((24, 16), f'필드 소품 시트 설명서 — {title}', font=font(36), fill=(70, 40, 20))
    d.text((24, 64), '투명 배경 · 그림자 없음 · 위에서 비스듬히 내려다본 3/4 시점 · 빛은 왼쪽 위 · 칸마다 1개, 칸 밖으로 넘치지 않게 · 글자 쓰지 말 것',
           font=font(18), fill=(120, 60, 30))
    # 왼쪽: 그림체 기준 + 바닥
    d.rounded_rectangle((20, 100, 420, 1004), 16, outline=(160, 110, 60), width=3)
    d.text((36, 110), '① 그림체 기준 (이 느낌 그대로)', font=font(20), fill=(70, 40, 20))
    x, y = 36, 146
    for p in STYLE:
        t = thumb(p, (175, 160)); S.paste(t, (x, y + 160 - t.height), t); x += 190
        if x > 300: x, y = 36, y + 175
    t = thumb('characters/elf/front_0', (120, 130)); S.paste(t, (290, 480 - t.height), t)
    d.text((36, 500), '② 크기 기준: 엘프 키 = 소품 칸 1/2 정도', font=font(17), fill=(70, 40, 20))
    d.text((36, 540), '③ 이 바닥 위에 놓입니다 (색을 맞출 것)', font=font(20), fill=(70, 40, 20))
    x, y = 36, 576
    for tn, lab in [('grass', '풀'), ('grass_flower', '풀2'), ('dirt', '흙'), ('path', '길'), ('sand', '모래'), ('water', '물')]:
        t = Image.open(A + f'tiles/{key}/{tn}.png').convert('RGB').resize((112, 112))
        S.paste(t, (x, y)); d.text((x + 4, y + 114), lab, font=font(16), fill=(70, 40, 20))
        x += 124
        if x > 330: x, y = 36, y + 144
    # 오른쪽: 4×4 칸
    gx, gy, cw, ch = 440, 100, 268, 226
    for i, it in enumerate(items):
        cx, cy = gx + (i % 4) * cw, gy + (i // 4) * ch
        d.rounded_rectangle((cx + 6, cy + 6, cx + cw - 6, cy + ch - 6), 14, outline=(180, 140, 90), width=2)
        d.text((cx + 18, cy + 14), f'{i + 1}. {it}', font=font(19), fill=(70, 40, 20))
    S.save(os.path.join(ROOT, 'docs', 'guides', f'field_{key}.png'))
print('ok')
