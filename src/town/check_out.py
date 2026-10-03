import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_timeout(1000);ev=pg.evaluate
        g=await ev("A.blds.find(b=>b.k==='gate_twin_tower')")
        await ev(f"__P.x={g['x']};__P.y={g['y']-g['h']*0.42-12}");await pg.wait_for_timeout(900)
        print('place',await ev("place.textContent"),'pos',await ev("[Math.round(__P.x),Math.round(__P.y)]"))
        # 허수아비 때리기: 첫 허수아비 왼쪽에 서서 오른쪽 보고 공격
        d=await ev("A.out.props.find(p=>p.kind==='dummy')")
        await ev(f"__P.x={d['x']-50};__P.y={d['y']};__P.dir='side';__P.flip=false")
        await pg.keyboard.press('j');await pg.wait_for_timeout(600)
        # 활이라 화살로 맞음
        print('guards',await ev("A.out.npcs.map(n=>n.title).join(',')"))
        k=await ev("A.out.npcs[0]");await ev(f"__P.x={k['x']};__P.y={k['y']+30}");await pg.wait_for_timeout(200)
        await pg.keyboard.press('e');await pg.wait_for_timeout(200);print('dlg',await ev("dlgTitle.textContent"),await ev("dlgTrade.textContent"))
        await pg.click('#dlgTrade');await pg.wait_for_timeout(100);print('msg',await ev("msgT.textContent"))
        await pg.keyboard.press('Escape')
        gw=await ev("A.out.props.find(p=>p.kind==='gatewall')");await ev(f"__P.x={gw['x']};__P.y={gw['y']+10}");await pg.wait_for_timeout(200)
        print('tag',await ev("tag.textContent"));await pg.keyboard.press('e');await pg.wait_for_timeout(700)
        print('back place',await ev("place.textContent"),'errors',errs);await b.close()
asyncio.run(main())
