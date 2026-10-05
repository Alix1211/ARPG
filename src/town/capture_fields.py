import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
OUT=Path('field_shots')
THEMES=[('summer',2,'여름숲'),('autumn',3,'가을들판'),('winter',4,'겨울설원'),('ice',5,'얼음지대'),('volcano',6,'화산지대'),('swamp',7,'늪지대')]

async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        await pg.goto(URL)
        await pg.wait_for_function("window.__FD_READY===true")
        await pg.wait_for_timeout(800)
        for theme,tier,label in THEMES:
            await pg.evaluate("([t,l]) => __FD.enter(t,l)",[theme,1])
            await pg.wait_for_timeout(1100)
            await pg.screenshot(path=str(OUT/f'{tier}_{theme}_random.png'))
            await pg.evaluate("([t,l]) => __FD.enter(t,l)",[theme,tier+1])
            await pg.wait_for_timeout(1100)
            await pg.screenshot(path=str(OUT/f'{tier}_{theme}_final.png'))
        await b.close()

asyncio.run(main())
