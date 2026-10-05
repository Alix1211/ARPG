import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
THEMES=['spring','summer','autumn','winter','ice','volcano','swamp']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1000)

        # HUD 기본 진입: 초상화는 능력치, 가방 버튼은 장비.
        await pg.click('#me .ring'); await pg.wait_for_timeout(100)
        assert await pg.evaluate("() => document.getElementById('char').classList.contains('on')")
        assert await pg.evaluate("() => document.getElementById('tabSt').classList.contains('on')")
        await pg.click('#charClose'); await pg.wait_for_timeout(80)

        await pg.click('#bagBtn'); await pg.wait_for_timeout(100)
        assert await pg.evaluate("() => document.getElementById('tabEq').classList.contains('on')")
        await pg.click('#tabTr'); await pg.wait_for_timeout(100)
        assert await pg.evaluate("() => document.getElementById('tabTr').classList.contains('on')")
        assert await pg.evaluate("() => document.querySelectorAll('#bagPane .tc:not(.lock)').length") == 7
        await pg.click('#charClose'); await pg.wait_for_timeout(80)

        assert await pg.evaluate("() => !!document.getElementById('tabTr')")
        assert await pg.evaluate("() => TRADE.goods.length") == 25
        assert await pg.evaluate("() => Object.keys(TRADE.regions).length") == 8
        assert await pg.evaluate("() => A.npcs.some(n=>n.shop==='trade' && n.title==='교역소 직원')")

        # 대표 장거리 차익: 봄의 밀 -> 화산
        q=await pg.evaluate("""() => ({
          spring: (TRADE.debugRegion('spring'), TRADE.quote('spring','wheat')),
          volcano: TRADE.quote('volcano','wheat')
        })""")
        assert q['spring']['buy'] < q['volcano']['sell'], q

        await pg.evaluate("() => { GAME.setGold(1000); TRADE.debugRegion('spring'); TRADE.buy('wheat',10); UI.save(); }")
        c=await pg.evaluate("() => TRADE.cargo().wheat")
        assert c and c['qty']==10, c
        g_after_buy=await pg.evaluate("() => GAME.P.gold")
        assert g_after_buy < 1000

        # 저장/복원
        await pg.reload(); await pg.wait_for_timeout(1000)
        c2=await pg.evaluate("() => TRADE.cargo().wheat")
        assert c2 and c2['qty']==10, c2
        await pg.evaluate("() => { TRADE.debugRegion('volcano'); TRADE.sell('wheat',10); UI.save(); }")
        g_after_sell=await pg.evaluate("() => GAME.P.gold")
        assert g_after_sell > 1000, (g_after_buy,g_after_sell)

        # 모든 필드 마지막 칸에는 작은 마을 입구가 있고, 내부 마을이 같은 구조로 열린다.
        for ti,th in enumerate(THEMES,1):
            await pg.evaluate("([th,leg]) => __FD.enter(th,leg)", [th,ti+1])
            await pg.wait_for_timeout(650)
            st=await pg.evaluate("() => __FD.state()")
            assert st['map']=='field' and st['theme']==th, st
            assert len(st['village'])==2, (th,st['village'])
            ent=[x for x in st['village'] if x['kind']=='field_village']
            assert len(ent)==1 and ent[0]['market']==th, (th,st['village'])

        # 실제 필드 마을 입구로 들어가 교역상에게 말을 걸면 새 상점형 교역창이 열린다.
        v=await pg.evaluate("() => __FD.state().village.find(x=>x.kind==='field_village')")
        await pg.evaluate("(v) => { GAME.P.x=v.x; GAME.P.y=v.y; }", v)
        await pg.wait_for_timeout(120)
        near=await pg.evaluate("() => GAME.near() && ({kind:GAME.near().kind,market:GAME.near().market})")
        assert near and near['kind']=='field_village' and near['market']=='swamp', near
        await pg.evaluate("() => GAME.act()"); await pg.wait_for_timeout(900)
        assert await pg.evaluate("() => __FD.state().map")=='fieldvillage'
        await pg.evaluate("() => { GAME.P.x=22.8*48; GAME.P.y=11*48+6; }"); await pg.wait_for_timeout(150)
        near=await pg.evaluate("() => GAME.near() && ({kind:GAME.near().kind,shop:GAME.near().npc&&GAME.near().npc.shop})")
        assert near and near['kind']=='npc' and near['shop']=='trade', near
        await pg.evaluate("() => GAME.act()"); await pg.wait_for_timeout(80)
        await pg.click('#dlgTrade'); await pg.wait_for_timeout(120)
        assert await pg.evaluate("() => document.getElementById('trade').classList.contains('on')")
        assert await pg.evaluate("() => !!document.getElementById('tradeCargoList') && !!document.getElementById('tradeBuyTab') && !!document.getElementById('tradeSellTab')")

        assert not errs, errs
        print('trade ok', q, g_after_buy, g_after_sell)
        await b.close()

asyncio.run(main())
