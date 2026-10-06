import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
OUT=Path('field_feather_preview')

async def shot(pg, feather, name):
    await pg.reload()
    await pg.wait_for_function("window.__FD_READY===true")
    await pg.wait_for_timeout(500)
    await pg.evaluate("(v)=>{window.__FIELD_FEATHER_TEST=v;window.__FIELD_LAYOUT_SEED=246813579}", feather)
    await pg.evaluate("() => __FD.enter('summer',1)")
    await pg.wait_for_timeout(1050)
    await pg.screenshot(path=str(OUT/name))

async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        await pg.goto(URL)
        await shot(pg,False,'before.png')
        await shot(pg,True,'after_15px.png')
        await b.close()

asyncio.run(main())
