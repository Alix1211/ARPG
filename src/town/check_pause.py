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
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(850)
        await ev("""() => {
          GAME.P.hp=GAME.P.maxHp;
          __FD.debugTarget(10,0);
          document.getElementById('bagBtn').click();
        }""")
        assert await ev("() => GAME.isPaused()")
        hp0=await ev("() => GAME.P.hp")
        await pg.wait_for_timeout(1300)
        hp1=await ev("() => GAME.P.hp")
        assert hp1==hp0,(hp0,hp1)

        await pg.click('#charClose')
        assert not await ev("() => GAME.isPaused()")
        await pg.wait_for_timeout(1400)
        hp2=await ev("() => GAME.P.hp")
        assert hp2<hp1,(hp1,hp2)
        assert not errs,errs
        print('character window pause ok',hp0,hp1,hp2)
        await b.close()

asyncio.run(main())
