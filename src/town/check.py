import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../../game/town.html'))+'');await pg.wait_for_timeout(1500)
        s=await pg.evaluate('[__P.x,__P.y]')
        await pg.keyboard.down('ArrowUp');await pg.wait_for_timeout(2500);await pg.keyboard.up('ArrowUp')
        e=await pg.evaluate('[__P.x,__P.y]')
        tag=await pg.evaluate("document.getElementById('tag').textContent")
        print('errors',errs,'start',s,'after',e,'tag',tag)
        await b.close()
asyncio.run(main())
