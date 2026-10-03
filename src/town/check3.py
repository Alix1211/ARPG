import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_timeout(800)
        a=await pg.evaluate("__V.map(v=>[Math.round(v.x),Math.round(v.y)])");await pg.wait_for_timeout(6000)
        c=await pg.evaluate("__V.map(v=>[Math.round(v.x),Math.round(v.y)])")
        print('moved',[round(((x2-x1)**2+(y2-y1)**2)**.5) for (x1,y1),(x2,y2) in zip(a,c)])
        for i in range(5):
            await pg.click('#place');await pg.wait_for_timeout(200);print(await pg.evaluate("document.getElementById('place').textContent"),end=' | ')
        await pg.evaluate("__D.t=0.8");await pg.wait_for_timeout(25000)
        print('\nnight hidden',await pg.evaluate("__V.filter(v=>v.hidden).length"),'/5')
        await pg.evaluate("__D.t=0.2");await pg.wait_for_timeout(15000)
        print('day hidden',await pg.evaluate("__V.filter(v=>v.hidden).length"),'/5','errors',errs)
        await b.close()
asyncio.run(main())
