"""가이아 코믹 장식 인물(길드·마을) + 대화 초상 출렁임 시험.
먼저 python3 src/town/build_gaia_preview.py 로 gaia_preview/GAIA-3PARTY-TEST.html 을 만들어 둔다.
스크린샷은 인자로 준 폴더에 저장한다(없으면 건너뜀).
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else None
TS = 48


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_COMIC!=='undefined' && typeof GAIA_JIGGLE!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', flush=True)
        n = await ev("() => [A.gaiaComic.guild.length, A.gaiaComic.town.length]")
        assert n == [6, 4], n
        # 마을: 처음 세워질 때부터 장식 인물이 있어야 한다
        assert await ev("() => GAIA_COMIC.count()") == 3, '마을 장식 인물 수'
        if SHOT:
            await ev(f"() => {{GAME.P.x=26*{TS};GAME.P.y=19.6*{TS};}}")
            await pg.wait_for_timeout(700)
            await pg.screenshot(path=SHOT + '/town_comic_plaza.png')
            await ev(f"() => {{GAME.P.x=26*{TS};GAME.P.y=14.8*{TS};}}")
            await pg.wait_for_timeout(700)
            await pg.screenshot(path=SHOT + '/town_comic_left.png')
        # 길드
        await ev("() => {GAME.P.x=1104;GAME.P.y=603;}")
        await pg.wait_for_timeout(400)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(1000)
        assert await ev("() => GAIA_GUILD.state().map==='guild'")
        assert await ev("() => GAIA_COMIC.count()") == 6, '길드 장식 인물 수'
        await ev(f"() => {{GAME.P.x=7*{TS};GAME.P.y=7.2*{TS};}}")
        await pg.wait_for_timeout(900)
        if SHOT:
            await pg.screenshot(path=SHOT + '/guild_comic.png')
        # 장식 인물 몸 안으로 걸어 들어갈 수 없다(충돌)
        ok = await ev(f"() => !GAME.walkableAt(10.3*{TS},3.25*{TS}-4)")
        assert ok, '장식 인물이 통과 가능'
        # 접수원 대화 → 출렁임 캔버스
        await ev(f"() => {{GAME.P.x=7.85*{TS};GAME.P.y=4.05*{TS}+34;}}")
        await pg.wait_for_timeout(400)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(900)
        assert await ev("() => document.getElementById('dlg').classList.contains('jg')"), '출렁임 캔버스가 안 켜짐'
        st = await ev("() => GAIA_JIGGLE.state()")
        assert st and st['key'] == 'receptionist' and st['ready'], st
        await ev("() => GAIA_JIGGLE.debug(true)")
        await pg.wait_for_timeout(300)
        if SHOT:
            await pg.screenshot(path=SHOT + '/dlg_receptionist_regions.png')
        await ev("() => GAIA_JIGGLE.debug(false)")
        # 가슴 부위를 눌러 보면 그림이 실제로 휜다(눌러 두지 않은 장면과 눌렀을 때 장면의 화소 차이)
        import io
        from PIL import Image, ImageChops
        box = await ev("() => { const r=document.getElementById('dlgFx').getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; }")
        clip = {'x': box[0], 'y': box[1], 'width': box[2], 'height': box[3]}
        await pg.wait_for_timeout(2600)   # 처음 안내 원이 사라질 때까지
        base = Image.open(io.BytesIO(await pg.screenshot(clip=clip))).convert('RGB')
        x, y = box[0] + box[2] * .34, box[1] + box[3] * .405
        await pg.mouse.move(x, y)
        await pg.mouse.down()
        await pg.wait_for_timeout(40)
        st = await ev("() => GAIA_JIGGLE.state()")   # 파동은 약 0.8초 안에 사라지므로 화면을 찍기 전에 먼저 읽는다
        assert st['regs'][0]['hits'] >= 1 and st['regs'][1]['hits'] >= 1, st   # 반대쪽도 따라 움직임
        shot = Image.open(io.BytesIO(await pg.screenshot(clip=clip))).convert('RGB')
        if SHOT:
            await pg.screenshot(path=SHOT + '/dlg_receptionist_jiggle.png')
        await pg.mouse.up()
        diff = ImageChops.difference(base, shot).convert('L')
        changed = sum(1 for v in diff.getdata() if v > 24)
        assert changed > 300, ('가슴을 눌러도 그림이 휘지 않음', changed)
        await pg.wait_for_timeout(1500)
        # 다른 초상(아가사·실비아)
        for k in ('agatha', 'sylvia'):
            await ev(f"() => {{document.getElementById('dlg').classList.add('on');document.getElementById('dlgImg').src=A.gaiaDlg.{k};}}")
            await pg.wait_for_timeout(700)
            st = await ev("() => GAIA_JIGGLE.state()")
            assert st and st['key'] == k and st['ready'], (k, st)
            await ev("() => GAIA_JIGGLE.debug(true)")
            await pg.wait_for_timeout(300)
            if SHOT:
                await pg.screenshot(path=SHOT + f'/dlg_{k}_regions.png')
            await ev("() => GAIA_JIGGLE.debug(false)")
        # 닫으면 원래 그림으로
        await ev("() => GAME.closeAll()")
        await pg.wait_for_timeout(400)
        assert not await ev("() => document.getElementById('dlg').classList.contains('jg')")
        assert not errs, errs
        print('코믹 장식 인물(마을3·길드6)·충돌·출렁임 초상 3종 통과')
        await b.close()

asyncio.run(main())
