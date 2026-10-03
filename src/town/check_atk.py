import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        for d in ['front','back','side']:
            await pg.evaluate(f"__P.dir='{d}'")
            await pg.click('#atk');await pg.wait_for_timeout(120)
            print(d,'busy',await pg.evaluate("!!__P.atk"));await pg.wait_for_timeout(500)
        print('errors',errs);await b.close()
asyncio.run(main())
