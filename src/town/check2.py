import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../../game/town.html'))+'');await pg.wait_for_timeout(1200)
        npcs=await pg.evaluate("A.npcs.map(n=>[n.name,Math.round(n.x),Math.round(n.y)])");print(npcs)
        luna=[n for n in npcs if n[0]=='루나'][0]
        await pg.evaluate(f"__P.x={luna[1]};__P.y={luna[2]+30}");await pg.wait_for_timeout(300)
        print('tag',await pg.evaluate("document.getElementById('tag').textContent"))
        await pg.keyboard.press('e');await pg.wait_for_timeout(200)
        print('dlg',await pg.evaluate("document.getElementById('dlg').className"),await pg.evaluate("document.getElementById('dlgLine').textContent"))
        await pg.click('#dlgTrade');await pg.wait_for_timeout(200)
        print('cells',await pg.evaluate("document.querySelectorAll('.cell').length"))
        await pg.click('#buy');print('gold',await pg.evaluate("document.getElementById('gold').textContent"),await pg.evaluate("document.getElementById('shopSay').textContent"))
        await pg.keyboard.press('Escape')
        await pg.evaluate("__W.t=0");await pg.wait_for_timeout(4000);print('weather',await pg.evaluate("[__W.state,__W.rain.toFixed(2)]"))
        # 사람·소품이 건물 충돌상자와 겹치는지
        print('errors',errs)
        await b.close()
asyncio.run(main())
