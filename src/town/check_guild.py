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
        assert await pg.locator('#guildClose').count()==1
        await pg.click('#guildClose');await pg.wait_for_timeout(80)
        assert not await ev("() => document.getElementById('guild').classList.contains('on')")
        st=await ev("() => GUILD.state()")
        assert len(st['board'])==6,st

        # 동시 진행/HUD/버튼/저장 모두5개, 6번째는 거절한다.
        initial=await ev("() => GUILD.saveData()")
        ids=[q['id'] for q in initial['board']]
        for qid in ids[:5]:assert await ev("id=>GUILD.accept(id)",qid)
        assert not await ev("id=>GUILD.accept(id)",ids[5])
        assert await pg.locator('#questTrack .qtrack').count()==5
        assert await pg.locator('#gBoard button:disabled').count()>=1
        last=await pg.locator('#questTrack .qtrack').nth(4).bounding_box()
        await pg.mouse.click(last['x']+20,last['y']+last['height']/2)
        assert await ev("() => document.getElementById('guild').classList.contains('on')"),'fifth HUD click'
        await pg.click('#guildClose')
        await ev("() => UI.save()")
        await pg.reload();await pg.wait_for_timeout(1000)
        assert await ev("() => GUILD.state().active.length")==5
        assert await pg.locator('#questTrack .qtrack').count()==5
        await ev("d=>GUILD.loadData(d)",initial)
        # 일반 처치 의뢰 수락 -> 진행 -> 보상.
        q=await ev("() => GUILD.state().board.find(q=>q.type==='kill_any')")
        assert q
        assert await ev("(id)=>GUILD.accept(id)",q['id'])
        assert await ev("() => document.getElementById('questTrack').classList.contains('on')")
        assert await ev("() => document.querySelectorAll('#questTrack .qtrack').length===1")
        assert await ev("(t)=>document.getElementById('questTrack').innerText.includes(t)",q['title'])
        assert await ev("(n)=>document.getElementById('questTrack').innerText.includes('0 / '+n)",q['need'])
        bg=await ev("() => getComputedStyle(document.querySelector('#questTrack .qtrack')).backgroundColor")
        assert bg in ('rgba(0, 0, 0, 0)','transparent'),bg
        await pg.click('#questTrack');await pg.wait_for_timeout(80)
        assert await ev("() => document.getElementById('guild').classList.contains('on')")
        await pg.click('#guildClose');await pg.wait_for_timeout(80)
        g0=await ev("() => GAME.P.gold"); e0=await ev("() => GAME.P.exp")
        await ev("() => GUILD.onKill({dead:true,type:'wolf'})")
        assert await ev("(n)=>document.getElementById('questTrack').innerText.includes('1 / '+n)",q['need'])
        for _ in range(q['need']-1):
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

        # Lv3 타운포탈: 생활스킬 아이콘을 실제 드래그해서 퀵슬롯에 등록.
        await ev("""() => {
          GAME.P.lv=3;GAME.P.portalReadyAt=0;GAME.syncLifeUnlocks(true);
        }""")
        await pg.click('#bagBtn');await pg.wait_for_timeout(120)
        await pg.click('#tabSk');await pg.wait_for_timeout(120)
        portal=pg.locator('.lifegrid .skc.drag')
        assert await portal.count()==1
        await portal.scroll_into_view_if_needed();await pg.wait_for_timeout(80)
        qslot=pg.locator('.sk[data-i="0"]')
        pbox=await portal.bounding_box(); qbox=await qslot.bounding_box()
        assert pbox and qbox
        px=pbox['x']+pbox['width']/2;py=pbox['y']+pbox['height']/2
        qx=qbox['x']+qbox['width']/2;qy=qbox['y']+qbox['height']/2
        await pg.mouse.move(px,py);await pg.mouse.down();await pg.wait_for_timeout(50)
        dbg=await ev("() => UI.dragDebug()")
        assert dbg and dbg['id']=='townPortal',dbg
        assert await ev("([x,y])=>UI.quickDropIndex(x,y)",[qx,qy])==0
        await pg.mouse.move(qx,qy,steps=12);await pg.wait_for_timeout(50)
        await pg.mouse.up();await pg.wait_for_timeout(160)
        assert await ev("() => UI.quickSlots()[0]==='townPortal'")
        await pg.click('#charClose');await pg.wait_for_timeout(80)

        # 필드 -> 느린 페이드 -> 마을. 도착 오라와 분수 옆 귀환 포탈이 열린다.
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
        assert await ev("() => document.getElementById('place').dataset.map!=='마을'")
        await pg.click('.sk[data-i="0"]');await pg.wait_for_function("() => !document.getElementById('fade').classList.contains('slow')")
        assert await ev("() => document.getElementById('place').dataset.map")=='마을'
        ps=await ev("() => GAME.portalState()")
        assert ps['open'] and ps['returnTo']=='field',ps
        assert await ev("() => GAME.portalState().aura")

        # 분수 옆 귀환 포탈로 들어가면 원래 필드 위치로 돌아간다.
        await ev("""() => {
          const s=GAME.portalState();GAME.P.x=s.x;GAME.P.y=s.y;
        }""")
        await pg.wait_for_timeout(100)
        await ev("() => GAME.act()");await pg.wait_for_function("() => !document.getElementById('fade').classList.contains('slow')")
        assert await ev("() => document.getElementById('place').dataset.map")!='마을'
        assert not await ev("() => GAME.portalState().open")

        # 던전 포탈도 같은 층/같은 자리/같은 몬스터 상태로 왕복.
        await ev("() => { GAME.P.portalReadyAt=0; }")
        assert await ev("() => __DUN.go(3)")
        await pg.wait_for_timeout(900)
        dbefore=await ev("() => ({s:__DUN.state(),x:GAME.P.x,y:GAME.P.y})")
        assert dbefore['s']['floor']==3
        assert await ev("() => GAME.useTownPortal()")
        await pg.wait_for_function("() => !document.getElementById('fade').classList.contains('slow')")
        ps=await ev("() => GAME.portalState()")
        assert ps['open'] and ps['returnTo']=='dungeon' and ps['returnFloor']==3,ps
        await ev("() => { const s=GAME.portalState();GAME.P.x=s.x;GAME.P.y=s.y; }")
        await pg.wait_for_timeout(80);await ev("() => GAME.act()");await pg.wait_for_function("() => !document.getElementById('fade').classList.contains('slow')")
        dafter=await ev("() => ({s:__DUN.state(),x:GAME.P.x,y:GAME.P.y})")
        assert dafter['s']['floor']==3,(dbefore,dafter)
        assert dafter['s']['monsters']==dbefore['s']['monsters'],(dbefore,dafter)
        assert abs(dafter['x']-dbefore['x'])<40 and abs(dafter['y']-dbefore['y'])<40,(dbefore,dafter)

        assert not errs,errs
        print('guild + portal quick ok',{'gold':(g0,g1),'delivery':(c0,c1),'saved':active_id})
        await b.close()

asyncio.run(main())
