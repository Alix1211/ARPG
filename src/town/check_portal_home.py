import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def wait_travel(pg):
    await pg.wait_for_function("() => !document.getElementById('fade').classList.contains('slow') && !document.getElementById('fade').classList.contains('on')")
    await pg.wait_for_timeout(80)

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)
        await ev("() => {GAME.P.lv=15;GAME.P.portalReadyAt=0;GAME.syncLifeUnlocks(true)}")
        assert await ev("() => GAME.lastVisitedTown().map")=='town'

        # 작은 마을에 아직 들어가기 전에는 큰 마을이 귀환점.
        assert await ev("() => __FD.enter('spring',2)")
        await pg.wait_for_timeout(800)
        assert await ev("() => GAME.lastVisitedTown().map")=='town'
        assert await ev("() => GAME.useTownPortal()")
        await wait_travel(pg)
        assert await ev("() => GAME.locationState().map")=='town'
        ps=await ev("() => GAME.portalState()")
        assert ps['open'] and ps['home']['map']=='town',ps

        # 원래 필드로 돌아가 작은 마을에 실제 진입.
        await ev("() => {const s=GAME.portalState();GAME.P.x=s.x;GAME.P.y=s.y}")
        await pg.wait_for_timeout(100);await ev("() => GAME.act()");await wait_travel(pg)
        v=await ev("() => __FD.state().village.find(x=>x.kind==='field_village')")
        assert v,v
        await ev("(v)=>{GAME.P.x=v.x;GAME.P.y=v.y}",v);await pg.wait_for_timeout(120)
        await ev("() => GAME.act()");await pg.wait_for_timeout(900)
        assert await ev("() => GAME.locationState().map")=='fieldvillage'
        home=await ev("() => GAME.lastVisitedTown()")
        assert home['map']=='fieldvillage' and home['theme']=='spring' and home['villageReturn'],home

        # 마을을 나가는 것은 귀환점을 바꾸지 않는다.
        assert await ev("() => __FD.leaveVillage()")
        await pg.wait_for_timeout(900)
        home2=await ev("() => GAME.lastVisitedTown()")
        assert home2['map']=='fieldvillage' and home2['theme']=='spring',home2

        # 필드에서 포탈 -> 최근 실제 방문 작은 마을.
        await ev("() => {GAME.P.portalReadyAt=0}")
        assert await ev("() => GAME.useTownPortal()")
        await wait_travel(pg)
        assert await ev("() => GAME.locationState().map")=='fieldvillage'
        ps=await ev("() => GAME.portalState()")
        assert ps['open'] and ps['returnTo']=='field' and ps['home']['map']=='fieldvillage',ps

        # 저장/재접속에도 최근 방문 작은 마을이 유지.
        await ev("() => UI.save()")
        await pg.reload();await pg.wait_for_timeout(1300)
        home3=await ev("() => GAME.lastVisitedTown()")
        assert home3['map']=='fieldvillage' and home3['theme']=='spring',home3

        assert not errs,errs
        print('last visited town portal ok',home3)
        await b.close()

asyncio.run(main())
