import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        a=await ev("[__P.x,__P.y]")
        await pg.keyboard.down('ArrowLeft');await pg.keyboard.down('j');await pg.wait_for_timeout(1500)
        busy=await ev("!!__P.atk");n=await ev("__P.atk?__P.atk.n:-1")
        await pg.keyboard.up('j');await pg.keyboard.up('ArrowLeft')
        c=await ev("[__P.x,__P.y]");print('moved while attacking',round(a[0]-c[0]),'attacks',n,'busy',busy)
        await pg.wait_for_timeout(600);print('hold off',await ev("!!__P.hold"),'errors',errs);await b.close()
asyncio.run(main())
