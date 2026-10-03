"""파밍 시험판(game/farm.html)을 만든다.

  python3 tools/build_farm.py

- 기본 그림 묶음(A)은 이미 만들어 둔 game/arpg.html 에서 꺼내 쓴다.
- 장비 아이콘(방어구·반지·목걸이), 건물 3채, 드래곤을 assets/ 에서 더 묶어 넣는다.
- src/farm_shell.html(화면) + src/farm.js(게임 코드)를 합쳐 한 파일로 만든다.
"""
import base64, io, json, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = 96  # 2x 해상도 (게임 칸 48px)


def p(*a):
    return os.path.join(ROOT, *a)


def enc(img, q=86):
    b = io.BytesIO()
    img.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def icon(path, side=72):
    im = Image.open(path).convert('RGBA')
    s = side / max(im.size)
    return enc(im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS), 88)


def spr(path, h, **kw):
    im = Image.open(path).convert('RGBA')
    H = round(h * T)
    W = max(1, round(im.width * H / im.height))
    d = {'src': enc(im.resize((W, H), Image.LANCZOS)), 'w': W / 2, 'h': H / 2}
    d.update(kw)
    return d


base = open(p('game', 'arpg.html'), encoding='utf-8').read()
m = re.search(r'const A=(\{.*?\});\n\n\(function', base, re.S)
A = json.loads(m.group(1))

# 장비 아이콘: 방어구 10등급(기사·마법사) + 반지·목걸이 5단계
ic = {}
for style in ['knight', 'mage']:
    for part in ['head', 'body', 'hands', 'feet']:
        for g in range(1, 11):
            ic['%s_%s_%d' % (style, part, g)] = icon(p('assets', 'armor', '%s_%s_%02d.png' % (style, part, g)))
for t in range(1, 6):
    ic['ring_%d' % t] = icon(p('assets', 'accessories', 'acc_0_%02d.png' % t))
    ic['neck_%d' % t] = icon(p('assets', 'accessories', 'acc_1_%02d.png' % t))
ic['bag'] = icon(p('assets', 'ui', 'icon_bag.png'), 96)
A['icons'] = ic

# 마을 건물
for key, f, h in [('b_guild', 'guild_hall', 3.4), ('b_smithy', 'smithy', 3.4), ('b_shop', 'shop_general', 3.0)]:
    A['objs'][key] = spr(p('assets', 'buildings', f + '.png'), h, cw=.75, ch=.3)

# 마지막 보스 드래곤
for d in ['left', 'front', 'right']:
    A['mons']['dragon_' + d] = spr(p('assets', 'monsters_3dir', 'dragon_%s.png' % d), 2.8)

shell = open(p('src', 'farm_shell.html'), encoding='utf-8').read()
game = open(p('src', 'farm.js'), encoding='utf-8').read()
out = shell.replace('/*__A__*/', 'const A=' + json.dumps(A, ensure_ascii=False) + ';').replace('/*__GAME__*/', game)
open(p('game', 'farm.html'), 'w', encoding='utf-8').write(out)
print('game/farm.html', len(out) // 1024, 'KB')
