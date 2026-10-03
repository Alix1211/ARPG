import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        await pg.keyboard.down('ArrowDown');await pg.wait_for_timeout(5000);await pg.keyboard.up('ArrowDown');await pg.wait_for_timeout(600)
        print('after walking down:',await ev("place.textContent"),await ev("[Math.round(__P.x),Math.round(__P.y)]"))
        await pg.wait_for_timeout(300)
        await pg.keyboard.down('ArrowUp');await pg.wait_for_timeout(2500);await pg.keyboard.up('ArrowUp');await pg.wait_for_timeout(700)
        print('after walking up:',await ev("place.textContent"),await ev("[Math.round(__P.x),Math.round(__P.y)]"),'errors',errs)
        await b.close()
asyncio.run(main())
