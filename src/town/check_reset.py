import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        # 정식판에서는 테스트 초기화 버튼을 노출하지 않는다. 내부 reset 기능만 회귀 검사한다.
        assert await ev("() => document.getElementById('resetBtn').hidden")
        await ev("() => { GAME.setGold(9999);UI.add(UI.make({baseId:'sword_01',rar:0}));UI.openStash();UI.inventoryDrop({from:'bag',i:UI.bagItems()[0].i},{from:'stash',i:0});GAME.closeAll(); UI.save(); }")
        assert await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3')).gold")==9999
        # 숨겨진 개발용 초기화 API는 저장을 완전히 지우고 새 게임으로 돌아와야 한다.
        assert await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3')).gold")==9999
        await ev("() => UI.reset()");await pg.wait_for_timeout(1800)
        g=await ev("() => GAME.P.gold");assert g==300,g
        assert await ev("UI.stashItems().length")==0
        d=await ev("() => localStorage.getItem('arpg_save_v3')")
        assert d is None or __import__('json').loads(d)['gold']==300,d
        assert not errs,errs
        print('reset ok')
        await b.close()
asyncio.run(main())
