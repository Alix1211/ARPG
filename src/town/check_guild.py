import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1000)

        assert await ev("() => A.npcs.some(n=>n.shop==='guild')")
        # 실제 마을 의뢰 게시판 앞에서 상호작용하면 길드 UI가 열린다.
        ok=await ev("""() => {
          const p=A.props.find(x=>x.name==='의뢰 게시판'); if(!p)return false;
          GAME.P.x=p.x;GAME.P.y=p.y+16;return true;
        }""")
        assert ok
        await pg.wait_for_timeout(120)
        await ev("() => GAME.act()");await pg.wait_for_timeout(80)
        assert await ev("() => document.getElementById('guild').classList.contains('on')")
        st=await ev("() => GUILD.state()")
        assert len(st['board'])==6,st

        # 일반 처치 의뢰 수락 -> 진행 -> 보상.
        q=await ev("() => GUILD.state().board.find(q=>q.type==='kill_any')")
        assert q
        assert await ev("(id)=>GUILD.accept(id)",q['id'])
        g0=await ev("() => GAME.P.gold"); e0=await ev("() => GAME.P.exp")
        for _ in range(q['need']):
            await ev("() => GUILD.onKill({dead:true,type:'wolf'})")
        assert await ev("(id)=>GUILD.claim(id)",q['id'])
        g1=await ev("() => GAME.P.gold")
        assert g1>g0,(g0,g1)

        # 던전 층 도달 의뢰.
        fq=await ev("() => GUILD.state().board.find(q=>q.type==='floor')")
        assert fq and await ev("(id)=>GUILD.accept(id)",fq['id'])
        await ev("(n)=>GUILD.onDungeonFloor(n)",fq['need'])
        assert await ev("(id)=>GUILD.claim(id)",fq['id'])

        # 무역품 납품 의뢰: 실제 화물에서 수량이 빠져야 한다.
        dq=await ev("() => GUILD.state().board.find(q=>q.type==='delivery')")
        assert dq and await ev("(id)=>GUILD.accept(id)",dq['id'])
        await ev("() => { GAME.setGold(99999); TRADE.debugRegion('town'); }")
        bought=await ev("(q)=>TRADE.buy(q.goodId,q.need)",dq)
        assert bought
        c0=await ev("(id)=>TRADE.cargo()[id].qty",dq['goodId'])
        assert c0>=dq['need'],(c0,dq)
        assert await ev("(id)=>GUILD.claim(id)",dq['id'])
        c1=await ev("(id)=>TRADE.cargo()[id] ? TRADE.cargo()[id].qty : 0",dq['goodId'])
        assert c1==c0-dq['need'],(c0,c1,dq)

        # 저장/복원: 진행 중 의뢰가 유지된다.
        rq=await ev("() => GUILD.state().board[0]")
        assert rq and await ev("(id)=>GUILD.accept(id)",rq['id'])
        await ev("() => UI.save()")
        active_id=rq['id']
        await pg.reload();await pg.wait_for_timeout(1000)
        assert await ev("(id)=>GUILD.state().active.some(q=>q.id===id)",active_id)

        # Lv3 타운포탈: 퀵슬롯 등록 후 필드에서 눌러 즉시 마을 복귀.
        await ev("""() => {
          GAME.P.lv=3;GAME.P.portalReadyAt=0;GAME.syncLifeUnlocks(true);
          UI.assignQuick(0,'townPortal');
        }""")
        assert await ev("() => UI.quickSlots()[0]==='townPortal'")
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(850)
        assert await ev("() => document.getElementById('place').dataset.map!=='마을'")
        await pg.click('.sk[data-i="0"]');await pg.wait_for_timeout(850)
        assert await ev("() => document.getElementById('place').dataset.map")=='마을'

        assert not errs,errs
        print('guild + portal quick ok',{'gold':(g0,g1),'delivery':(c0,c1),'saved':active_id})
        await b.close()

asyncio.run(main())
