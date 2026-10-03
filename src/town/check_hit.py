import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        g=await ev("A.blds.find(b=>b.k==='gate_twin_tower')");await ev(f"__P.x={g['x']};__P.y={g['y']-g['h']*0.42-12}");await pg.wait_for_timeout(900)
        for wt in ['bow','sword','spear','gauntlet','staff']:
            await ev(f"GAME.setWeapon({{wt:'{wt}',icon:'{wt}_01',st:{{atk:5}}}})")
            dist={'bow':200,'sword':45,'spear':90,'gauntlet':36,'staff':160}[wt]; wait={'bow':420,'sword':300,'spear':360,'gauntlet':200,'staff':1100}[wt]
            await ev(f"const t=__T[0]; t.dummy.wob=0; __P.x=t.x-{dist}; __P.y=t.y; __P.dir='side'; __P.flip=false; __P.atk=null")
            await pg.keyboard.press('j');await pg.wait_for_timeout(wait)
            print(wt,'wob',round(await ev('__T[0].dummy.wob'),2),'wob2',round(await ev('__T[1].dummy.wob'),2)); await pg.wait_for_timeout(500)
            await ev("__T[0].dummy.ph=0")
        print('errors',errs);await b.close()
asyncio.run(main())
