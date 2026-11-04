"""가이아 동료 한 줄 HUD 시험(폰 가로 크기). 먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다.
확인: 동료 줄이 #me(가방) 오른쪽에 붙고, 집합 버튼이 전체화면·미니맵과 안 겹치며, 대화창이 열리면 숨고 닫으면 돌아온다.
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else None
TS = 48
RECT = "(id) => { const e=document.getElementById(id); if(!e) return null; const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height,op:+s.opacity,vis:s.visibility,dis:s.display}; }"


def hit(a, b):
    return not (a['r'] <= b['l'] or b['r'] <= a['l'] or a['b'] <= b['t'] or b['b'] <= a['t'])


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 915, 'height': 412}, device_scale_factor=2)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_HUD!=='undefined' && GAIA_HUD.ready"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', flush=True)
        me, hud, btn = [await ev(f"() => ({RECT})('{i}')") for i in ('me', 'gaiaPartyHud', 'gaiaRecallBtn')]
        mm, fs, st = [await ev(f"() => ({RECT})('{i}')") for i in ('mm', 'fs', 'settingsBtn')]
        print('me', me, '\nhud', hud, '\nbtn', btn, flush=True)
        assert hud['l'] >= me['r'] - 1, ('동료 줄이 가방 오른쪽에 안 붙음', hud, me)
        assert hud['h'] < 60 and hud['w'] < 100, ('동료 줄이 작지 않음', hud)
        assert btn['l'] >= hud['r'] - 1, ('집합 버튼이 동료 줄과 겹침', btn, hud)
        for o, nm in ((mm, '미니맵'), (fs, '전체화면'), (st, '설정')):
            if o and o['dis'] != 'none':
                assert not hit(btn, o), (nm + '와 집합 버튼이 겹침', btn, o)
                assert not hit(hud, o), (nm + '와 동료 줄이 겹침', hud, o)
        assert hud['op'] == 1 and btn['op'] == 1, '평소에는 보여야 함'
        if SHOT:
            await pg.screenshot(path=SHOT + '/hud_town.png')
        # 대화창이 열리면 숨고, 닫으면 돌아온다
        await ev("() => { document.getElementById('dlg').classList.add('on'); }")
        await pg.wait_for_timeout(500)
        hud2 = await ev(f"() => ({RECT})('gaiaPartyHud')")
        btn2 = await ev(f"() => ({RECT})('gaiaRecallBtn')")
        assert hud2['op'] == 0 and btn2['op'] == 0, ('대화 중에 안 숨음', hud2, btn2)
        if SHOT:
            await pg.screenshot(path=SHOT + '/hud_dialog.png')
        await ev("() => { document.getElementById('dlg').classList.remove('on'); }")
        await pg.wait_for_timeout(500)
        hud3 = await ev(f"() => ({RECT})('gaiaPartyHud')")
        assert hud3['op'] == 1, ('대화가 끝났는데 안 돌아옴', hud3)
        assert not errs, errs
        await b.close()
        print('동료 한 줄 HUD 통과')

asyncio.run(main())
