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

        st=await ev("() => TRADE.state()");assert st['max']==7 and st['mount']==0,st
        # 큰 마을(0티어)에서는 탈것을 못 산다. 1티어 마을도 못 산다.
        await ev("() => { GAME.setGold(5000); TRADE.open('town'); }")
        assert not await ev("() => TRADE.buyMount()")
        await ev("() => { TRADE.close(); TRADE.open('spring'); }")
        assert not await ev("() => TRADE.buyMount()")
        # 2티어 마을: 돈 모자라면 실패, 충분하면 당나귀 수레(10칸).
        await ev("() => { TRADE.close(); GAME.setGold(100); TRADE.open('summer'); }")
        assert not await ev("() => TRADE.buyMount()")
        await ev("() => { GAME.setGold(5000); }")
        assert await ev("() => TRADE.buyMount()")
        st=await ev("() => TRADE.state()");assert st['max']==10 and st['mount']==1,st
        assert await ev("() => GAME.P.gold")==1000
        # 다음 탈것(멧돼지)은 3티어 마을부터.
        assert not await ev("() => TRADE.buyMount()")
        # 시세 수첩: 다녀온 마을이 기록되고 저장/불러오기가 된다.
        assert set(st['seen'])>={'town','spring','summer'},st
        d=await ev("() => JSON.stringify(TRADE.saveData())")
        await ev("(d) => TRADE.loadData(JSON.parse(d))", d)
        st2=await ev("() => TRADE.state()");assert st2['mount']==1 and 'spring' in st2['seen'],st2
        # 옛 저장(탈것·수첩 없음)도 불러와진다.
        await ev("() => TRADE.loadData({cargo:{},pressure:{},resetAt:0})")
        st3=await ev("() => TRADE.state()");assert st3['mount']==0 and st3['max']==7,st3
        await pg.screenshot(path=os.environ.get('SHOT','/tmp/claude-0/trade.png'))
        assert not errs,errs
        print('mount ok')
        await b.close()
asyncio.run(main())
