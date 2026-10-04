import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        pg=await browser.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(900)

        await pg.evaluate("""() => {
          UI.add(UI.make({baseId:'sword_01',rar:0}));UI.add(UI.make({baseId:'sword_01',rar:0}));const k=Object.keys(A.port)[0];
          __SHOP.open({shop:'arms', title:'테스트 상점 주인', k});
        }""")
        await pg.click('#tabSell')
        await pg.wait_for_timeout(100)

        before=await pg.evaluate("() => ({gold:GAME.P.gold, count:UI.bagItems().length, p:__SHOP.price(UI.bagItems()[0].it)})")
        assert before['count'] > 1, before
        await pg.locator('#bagPane .slot.has').first.click()
        await pg.click('#buy')
        await pg.wait_for_timeout(100)

        after=await pg.evaluate("() => ({gold:GAME.P.gold, count:UI.bagItems().length, p:__SHOP.price(UI.bagItems()[0].it)})")
        assert after['gold'] > before['gold'], (before,after)
        assert after['count'] == before['count'] - 1, (before,after)
        assert after['p'] == before['p'], (before,after)

        await pg.reload(); await pg.wait_for_timeout(900)
        saved=await pg.evaluate("() => ({gold:GAME.P.gold, count:UI.bagItems().length})")
        assert saved['gold'] == after['gold'], (after,saved)
        assert saved['count'] == after['count'], (after,saved)
        assert not errs, errs
        print('shop sell ok', before, after, saved)
        await browser.close()

asyncio.run(main())
