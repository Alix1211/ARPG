"""채찍·몽둥이로 동료에게 M을 줄 때 'M +22' 글씨 대신 핑크 하트가 뜨는지 시험.
먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다. 스크린샷 폴더는 인자로(없으면 건너뜀).
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else None


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 915, 'height': 412}, device_scale_factor=2)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_PARTY!=='undefined' && GAIA_PARTY.members().length"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', flush=True)
        await ev("() => { const m=GAIA_PARTY.members()[1]; m.x=GAME.P.x+90; m.y=GAME.P.y+10; m.m=0; }")
        await pg.wait_for_timeout(200)
        before = await ev("() => GAIA_PARTY.members()[1].m")
        ok = await ev("() => GAIA_PARTY.whip()")
        assert ok, '채찍이 안 나감'
        after = await ev("() => GAIA_PARTY.members()[1].m")
        assert after > before, ('M이 안 오름', before, after)
        for i, ms in enumerate((120, 200, 250)):
            await pg.wait_for_timeout(ms)
            if SHOT:
                await pg.screenshot(path=f'{SHOT}/hearts_{i}.png')
        assert not errs, errs
        await b.close()
        print('하트 효과 통과')

asyncio.run(main())
