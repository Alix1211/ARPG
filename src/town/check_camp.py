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
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(800)
        full=await ev("() => __FD.state().monsters")
        assert full>=12,full

        await ev("() => { GAME.P.hp=1;GAME.P.mp=0; }")
        assert await ev("() => __FD.hitFirst()")
        await pg.wait_for_timeout(1200)
        before=await ev("() => ({hp:GAME.P.hp,mp:GAME.P.mp,n:__FD.state().monsters})")
        assert before['n']<full,(before,full)

        assert await ev("() => __FD.rest()")
        await pg.wait_for_timeout(1450)
        after=await ev("() => ({hp:GAME.P.hp,maxHp:GAME.P.maxHp,mp:GAME.P.mp,maxMp:GAME.P.maxMp,n:__FD.state().monsters})")
        assert after['hp']==after['maxHp'],after
        assert after['mp']==after['maxMp'],after
        assert after['n']==full,(before,after,full)
        assert not errs,errs
        print('camp rest ok',before,after)
        await b.close()

asyncio.run(main())
