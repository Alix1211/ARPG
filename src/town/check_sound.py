import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']);pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        await pg.mouse.click(640,300);await pg.keyboard.press('j');await pg.wait_for_timeout(300)
        await ev("__P.hp=10");await pg.click('#potHp');await pg.wait_for_timeout(200)
        await pg.click('#snd');print('snd',await ev("snd.textContent"))
        await ev("__DUN.go(1)");await pg.wait_for_timeout(2500);await ev("__FD.hitFirst()");await pg.wait_for_timeout(300)
        print('errors',errs);await b.close()
asyncio.run(main())
