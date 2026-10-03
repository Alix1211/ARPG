import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':1280,'height':720})
        pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)

        # 필드 위치 저장/복원.
        await ev("() => __FD.enter('summer')");await pg.wait_for_timeout(850)
        pos=await ev("() => { GAME.P.x=980;GAME.P.y=1120;GAME.P.dir='side';UI.save();return [GAME.P.x,GAME.P.y]; }")
        await pg.reload();await pg.wait_for_timeout(1300)
        fs=await ev("() => ({map:__FD.state().map,theme:__FD.state().theme,x:GAME.P.x,y:GAME.P.y})")
        assert fs['map']=='field' and fs['theme']=='summer',fs
        assert abs(fs['x']-pos[0])<180 and abs(fs['y']-pos[1])<180,(pos,fs)

        # 던전은 최소 같은 층에서 재개. 랜덤 지형이면 저장 좌표를 nearestSafePosition으로 안전 보정한다.
        assert await ev("() => __DUN.go(3)")
        await pg.wait_for_timeout(900)
        await ev("() => { UI.save(); }")
        await pg.reload();await pg.wait_for_timeout(1500)
        ds=await ev("() => ({map:__DUN.state().map,floor:__DUN.state().floor,name:document.getElementById('place').dataset.map})")
        assert ds['map']=='dungeon' and ds['floor']==3,ds

        assert not errs,errs
        print('resume location ok',fs,ds)
        await b.close()

asyncio.run(main())
