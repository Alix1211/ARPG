import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        ev=pg.evaluate
        print('atk icon set',await ev("!!document.getElementById('atkIc').src"),'swapNo',await ev("swapNo.textContent"))
        # 무기점에서 낡은 창 사기
        luna=await ev("A.npcs.find(n=>n.name==='루나')");await ev(f"__P.x={luna['x']};__P.y={luna['y']+30}");await pg.wait_for_timeout(200)
        await pg.click('#atk');await pg.wait_for_timeout(150);await pg.click('#dlgTrade');await pg.wait_for_timeout(150)
        cells=await pg.query_selector_all('.cell');await cells[3].click();await pg.click('#buy');print('say',await ev("shopSay.textContent"))
        await pg.keyboard.press('Escape');await pg.wait_for_timeout(100)
        await pg.click('#bagBtn');await pg.wait_for_timeout(200)
        print('char open',await ev("char.className"),'slots',await ev("document.querySelectorAll('#bagPane .slot').length"),'filled',await ev("document.querySelectorAll('#bagPane .slot.has').length"))
        await pg.click('#bagPane .slot.has');await pg.wait_for_timeout(450)
        print('info',await ev("iinfo.innerText.replace(/\\n/g,' | ')"))
        await ev('__P.lv=6;UI.refresh()');await pg.wait_for_timeout(450);await pg.click('#bagPane .slot.has');btns=await pg.query_selector_all('#iinfo .btn');await btns[1].click();await pg.wait_for_timeout(100)
        print('after equip w2 filled',await ev("document.querySelectorAll('#leftPane .slot.has').length"))
        await pg.click('[data-tab=stat]');await pg.wait_for_timeout(100);print('stat rows',await ev("document.querySelectorAll('.srow').length"))
        await pg.click('#charClose');await pg.wait_for_timeout(100)
        await pg.click('#swap');await pg.wait_for_timeout(100);print('swapNo',await ev("swapNo.textContent"),'bubble',await ev("bubble.textContent"))
        await ev("__P.x=23*48;__P.y=22*48");await pg.wait_for_timeout(200);await pg.click('#atk');print('errors',errs)
        await b.close()
asyncio.run(main())
