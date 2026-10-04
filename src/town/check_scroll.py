import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)

        await ev("() => __SHOP.open({shop:'general',title:'테스트',k:Object.keys(A.port)[0]})")
        # 구매: 100G, 20장 한도, 금화 차감, 가방 칸 안 씀
        r=await ev("""() => {GAME.setGold(5000);const n0=UI.bagItems().length;
          const it=__SHOP.goods('general').find(x=>x.scroll==='portal');const a=[];for(let i=0;i<22;i++)a.push(__SHOP.buyAt(it));
          return {ok:a.filter(Boolean).length,sc:UI.scrolls(),gold:GAME.P.gold,bag:UI.bagItems().length-n0};}""")
        assert r['ok']==20 and r['sc']['portal']==20 and r['gold']==3000 and r['bag']==0,r

        # 감정 스크롤: 미확인 장비를 어디서나 감정
        r=await ev("""() => {const it=__SHOP.goods('general').find(x=>x.scroll==='ident');__SHOP.buyAt(it);__SHOP.buyAt(it);
          const w=UI.make({baseId:'sword_01',rar:2});w.unid=true;UI.add(w);
          const ok=UI.identify(w,'scroll');return {ok,unid:w.unid,sc:UI.scrolls().ident};}""")
        assert r['ok'] and not r['unid'] and r['sc']==1,r

        # 포탈 스크롤: 대기 중이면 두 번 눌러야 사용, 대기시간은 그대로
        await ev("() => { GAME.closeAll(); }")
        assert await ev("() => __DUN.go(1)")
        await pg.wait_for_timeout(900)
        await ev("() => { GAME.P.lifeSkills.townPortal=1; GAME.P.portalReadyAt=Date.now()+600000; }")
        assert await ev("() => GAME.useTownPortal()")==False   # 첫 번째: 확인 안내만
        assert await ev("() => UI.scrolls().portal")==20
        t0=await ev("() => GAME.P.portalReadyAt")
        assert await ev("() => GAME.useTownPortal()")==True
        assert await ev("() => UI.scrolls().portal")==19
        assert await ev("() => GAME.P.portalReadyAt")==t0
        await pg.wait_for_timeout(1500)
        assert await ev("() => GAME.portalState().open")
        print('scroll ok', errs)
        assert not errs,errs
        await b.close()
asyncio.run(main())
