import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        await ev("__P.hp=10");await pg.click('#potHp');await pg.wait_for_timeout(100)
        print('hp',await ev("__P.hp"),'left',await ev("potHp.textContent"))
        m=await ev("A.npcs.find(n=>n.name==='마르코')");await ev(f"__P.x={m['x']};__P.y={m['y']+30}");await pg.wait_for_timeout(200)
        await pg.click('#atk');await pg.wait_for_timeout(150);await pg.click('#dlgTrade');await pg.wait_for_timeout(150)
        print('goods',await ev("document.querySelectorAll('.cell').length"));await pg.click('#buy');await pg.wait_for_timeout(100)
        print('after buy hp potions',await ev("potHp.textContent"),'gold',await ev("gold.textContent"),'errors',errs);await b.close()
asyncio.run(main())
