import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        print('lv',await ev("lvTxt.textContent"),'slots',await ev("[...document.querySelectorAll('.sk')].filter(b=>!b.hidden).length"),'empty',await ev("document.querySelectorAll('.sk.empty').length"))
        await pg.click('#bagBtn');await pg.wait_for_timeout(200);await pg.click('[data-tab=skill]');await pg.wait_for_timeout(200)
        print('skill cells',await ev("document.querySelectorAll('.skc').length"),'learned',await ev("document.querySelectorAll('.skc:not(.lock)').length"))
        c=await pg.query_selector('.skc:not(.lock)');bb=await c.bounding_box()
        s=await pg.query_selector('.sk[data-i=\"2\"]');sb=await s.bounding_box()
        await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2);await pg.mouse.down()
        await pg.mouse.move(sb['x']+sb['width']/2,sb['y']+sb['height']/2,steps=8);await pg.mouse.up();await pg.wait_for_timeout(100)
        print('after drop empty',await ev("document.querySelectorAll('.sk.empty').length"))
        await pg.click('#charClose');await pg.wait_for_timeout(100)
        mp=await ev("__P.mp");await pg.click('.sk[data-i=\"2\"]');await pg.wait_for_timeout(200)
        print('mp',mp,'->',await ev("__P.mp"),'errors',errs);await b.close()
asyncio.run(main())
