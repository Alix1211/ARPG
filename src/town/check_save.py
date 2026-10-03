import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':720});pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        # 무기 하나 장착 바꾸고 금화 줄이기 → 저장 → 새로고침
        await pg.click('#bagBtn');await pg.wait_for_timeout(150);await pg.click('#bagPane .slot.has');await pg.wait_for_timeout(100)
        btns=await pg.query_selector_all('#iinfo .btn');await btns[1].click();await pg.wait_for_timeout(100);await pg.click('#charClose')
        await ev("GAME.setGold(123)");await ev("UI.save()")
        await pg.reload();await pg.wait_for_timeout(1200)
        print('gold',await ev("gold.textContent"),'w2 filled',await ev("document.querySelector('#swapNo')!=null"),'bubble',await ev("bubble.textContent"))
        await pg.click('#bagBtn');await pg.wait_for_timeout(150);print('equip filled',await ev("document.querySelectorAll('#leftPane .slot.has').length"))
        print('errors',errs);await b.close()
asyncio.run(main())
