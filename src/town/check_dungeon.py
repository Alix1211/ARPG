import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        # 성 밖 → 던전 경비병에게 말 걸어 들어가기
        g=await ev("A.blds.find(b=>b.k==='gate_twin_tower')");await ev(f"__P.x={g['x']};__P.y={g['y']-g['h']*0.42-12}");await pg.wait_for_timeout(900)
        k=await ev("A.out.npcs[1]");await ev(f"__P.x={k['x']};__P.y={k['y']+30}");await pg.wait_for_timeout(200)
        await pg.keyboard.press('e');await pg.wait_for_timeout(200);await pg.click('#dlgTrade');await pg.wait_for_timeout(2500)
        print('state',await ev("__DUN.state()"),'place',await ev("place.textContent"))
        # 걷기: 시작 방에서 움직여 보기 (벽 충돌)
        a=await ev("[__P.x,__P.y]")
        for key in ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']:
            await pg.keyboard.down(key);await pg.wait_for_timeout(700);await pg.keyboard.up(key)
        print('walk',a,'->',await ev("[Math.round(__P.x),Math.round(__P.y)]"),'inside',await ev("(()=>{const x=Math.floor(__P.x/48),y=Math.floor(__P.y/48);return MAPS_OK=1})()") if False else '')
        # 아래층 계단으로 순간이동해 내려가기
        sd=await ev("__DUN.spots().find(s=>s[0]==='stairs_down')");await ev(f"__P.x={sd[1]};__P.y={sd[2]}");await pg.wait_for_timeout(200)
        print('near',await ev("tag.textContent"));await pg.keyboard.press('e');await pg.wait_for_timeout(2200)
        print('floor2',await ev("__DUN.state()"))
        su=await ev("__DUN.spots().find(s=>s[0]==='stairs_up')");await ev(f"__P.x={su[1]};__P.y={su[2]}");await pg.wait_for_timeout(200)
        await pg.keyboard.press('e');await pg.wait_for_timeout(2200);print('back up',await ev("__DUN.state()"))
        print('errors',errs);await b.close()
asyncio.run(main())
