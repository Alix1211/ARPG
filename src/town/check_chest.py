import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        await ev("__DUN.go(1)");await pg.wait_for_timeout(2500)
        c=await ev("__DUN.spots().find(s=>s[0]==='chest')")
        if c:
            await ev(f"__P.x={c[1]};__P.y={c[2]}");await pg.wait_for_timeout(200);await pg.keyboard.press('e');await pg.wait_for_timeout(300)
            print('chest opened; bubble',await ev("bubble.textContent"),'chests left',await ev("__DUN.state().chests"))
        n0=await ev("__DUN.state().monsters")
        for i in range(5): await ev("__FD.hitFirst()")
        await pg.wait_for_timeout(300);print('monsters',n0,'->',await ev("__DUN.state().monsters"),'errors',errs);await b.close()
asyncio.run(main())
