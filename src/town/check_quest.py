import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1200)

        assert await ev('() => A.mainQuests.quests.length')==70, 'main count'
        assert await ev('() => A.mainQuests.sideQuests.length')==5, 'side count'
        lists=await ev('() => QUEST.lists()')
        assert len(lists['main'])==70 and len(lists['side'])==5
        # 11~70은 같은 공통 엔진을 쓰므로 빌드 전 구조를 전수 검사하고, 실제 진행 검사는 1~10 + 특수 단계 표본으로 한다.
        structural=await ev("""() => A.mainQuests.quests.map((q,i)=>({
          id:q.id,idx:i+1,start:q.start,steps:q.steps.map(s=>({type:s.type,map:s.map||null,floor:s.floor||null,char:s.char||null,boss:s.boss||null,point:s.point||null}))
        }))""")
        allowed={'talk','deliver','visit','collect','kill','event','scene','boss'}
        for i,q in enumerate(structural,1):
            assert q['id']==f'MAIN_{i:03d}',(i,q['id'])
            assert q['start']['previous']==(None if i==1 else f'MAIN_{i-1:03d}'),(q['id'],q['start'])
            assert q['steps'],q['id']
            for s in q['steps']:
                assert s['type'] in allowed,(q['id'],s)
                if s['type']=='scene' and s['char']!='void':
                    assert await ev("id=>!!(A.storyChars&&A.storyChars[id]&&A.storyChars[id].port)",s['char']),(q['id'],s)
        assert await ev("() => !!(A.storyChars&&A.storyChars.hero&&A.storyChars.knight&&A.storyChars.dragon&&A.storyChars.void)")

        async def town():
            if await ev("() => document.getElementById('place').dataset.map")!='마을':
                await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})')
                await pg.wait_for_timeout(750)

        async def talk(no):
            await town()
            assert await ev('''no=>{const n=A.npcs.find(n=>n.no===no);if(!n)return false;GAME.P.x=n.x;GAME.P.y=n.y+16;return true;}''',no),'NPC exists'
            await pg.wait_for_timeout(80)
            await ev('() => GAME.act()')
            assert await ev("() => !document.getElementById('dlgQuest').hidden"),'quest button'
            await pg.click('#dlgQuest')
            for _ in range(12):
                if not await ev("() => document.getElementById('dlg').classList.contains('on')"): break
                await pg.click('#dlgQuest')
            assert not await ev("() => document.getElementById('dlg').classList.contains('on')"),'dialogue completion'

        # 구 저장의 M01~M05는 삭제하지 않고 연쇄·서브로 이어진다.
        await ev("""() => QUEST.loadData({schema:1,active:{M01:{step:0,progress:0,reward:{gold:120,exp:1}}},completed:[],items:{},visited:[]})""")
        st=await ev('() => QUEST.state()')
        assert 'M01' in st['active'], 'old side save migration'
        await ev('() => QUEST.loadData(null)')

        # 첫 메인은 실제 대화로 수락하고, 길드 의뢰 5개와 HUD가 공존한다.
        await ev('() => {GAME.P.lv=70;GAME.P.exp=0;}')
        no=await ev("() => A.mainQuests.quests[0].start.npc")
        await town()
        await ev('no=>{const n=A.npcs.find(n=>n.no===no);GAME.P.x=n.x;GAME.P.y=n.y+16;}',no)
        assert await ev('no=>QUEST.marker(A.npcs.find(n=>n.no===no))',no)=='!'
        await talk(no)
        assert await ev("() => !!QUEST.state().active.MAIN_001"),'first accept'
        await ev('''() => {GUILD.open();for(const q of GUILD.state().board.slice(0,5))GUILD.accept(q.id);GAME.closeAll();}''')
        assert await pg.locator('#questTrack .qtrack').count()==5
        assert await pg.locator('#mainQuestTrack .mainQtrack').count()==1
        await pg.click('#mainQuestTrack')
        assert await ev("() => document.getElementById('guild').classList.contains('on')")
        assert await ev("() => !!document.getElementById('sideQuestActive')")
        await pg.click('#guildClose')

        # 저장/복원.
        await ev('() => UI.save()')
        await pg.reload(); await pg.wait_for_timeout(1200)
        assert await ev("() => QUEST.state().active.MAIN_001.step")==0,'saved progress'
        await ev('() => {GAME.P.lv=70;GAME.P.exp=0;}')

        # 현재 단계 하나를 실제 플레이 경로 또는 동일 엔진 이벤트로 진행.
        async def advance(qid):
            step=await ev('''id=>{const q=A.mainQuests.quests.find(q=>q.id===id),a=QUEST.state().active[id],s=q.steps[a.step];return JSON.parse(JSON.stringify(s));}''',qid)
            typ=step['type']
            if typ in ('talk','deliver'):
                await talk(step['npc'])
            elif typ=='visit':
                if step.get('map')=='dungeon':
                    assert await ev('f=>__DUN.go(f)',step.get('floor',1))
                    await pg.wait_for_timeout(850)
                elif step.get('map')=='field':
                    await ev('(th)=>__FD.enter(th)',step.get('market','spring'))
                    await pg.wait_for_timeout(850)
                else:
                    await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})')
                    await pg.wait_for_timeout(700)
            elif typ=='collect':
                target=step.get('point',{}).get('market')
                if target:
                    await ev('(th)=>__FD.enter(th)',target); await pg.wait_for_timeout(850)
                elif step.get('point',{}).get('map')=='dungeon':
                    assert await ev('f=>__DUN.go(f)',step.get('point',{}).get('floor',1)); await pg.wait_for_timeout(850)
                pts=await ev('id=>QUEST.points().filter(p=>p.id===id)',qid)
                assert pts,'collect point '+qid
                await ev('p=>{GAME.P.x=p.x;GAME.P.y=p.y;}',pts[0]); await pg.wait_for_timeout(80)
                await ev('() => GAME.act()')
            elif typ=='kill':
                for _ in range(step.get('need',1)):
                    await ev("() => QUEST.onKill({dead:true,type:'slime',family:'slime'})")
            elif typ=='event':
                name=step['event']
                # 핵심 시스템 이벤트는 실제 기능 경로로 확인한다.
                if name=='shop_buy':
                    await town()
                    await ev('''() => {const n=A.npcs.find(n=>n.no===21);GAME.P.x=n.x;GAME.P.y=n.y+16;GAME.act();}''')
                    await pg.wait_for_timeout(80); await pg.click('#dlgTrade'); await pg.wait_for_timeout(80)
                    await ev("""() => {GAME.setGold(10000);const it=__SHOP.goods('general').find(x=>x.potion==='hp');if(!it||!__SHOP.buyAt(it))throw Error('shop buy failed');}""")
                    await ev('() => GAME.closeAll()')
                elif name=='guild_claim':
                    await town()
                    await ev('''() => {const s=GUILD.state();if(!s.active.length){GUILD.open();GUILD.accept(GUILD.state().board[0].id);}const q=GUILD.state().active[0];if(!GUILD.debugComplete(q.id))throw Error('guild debug');if(!GUILD.claim(q.id))throw Error('guild claim');GAME.closeAll();}''')
                elif name=='trade_buy':
                    await ev("""() => {GAME.setGold(10000);TRADE.debugRegion('summer');if(!TRADE.buy('timber',1))throw Error('trade buy');}""")
                elif name=='trade_sell':
                    await ev("""() => {TRADE.debugRegion('town');if(!TRADE.sell('timber',1))throw Error('trade sell');}""")
                else:
                    filt=step.get('filter',{})
                    data={**filt,'count':step.get('need',1)}
                    if data.get('profitPositive'): data['profit']=1
                    await ev('(x)=>QUEST.onEvent(x.name,x.data)',{'name':name,'data':data})
            else:
                raise AssertionError('unknown step '+typ)

        # 001은 이미 수락. 001~010 전부 번호순으로 끝까지 진행.
        for n in range(1,11):
            qid=f'MAIN_{n:03d}'
            if n>1:
                await town()
                await ev('() => {GAME.P.lv=70;GAME.P.exp=0;}')
                no=await ev('id=>A.mainQuests.quests.find(q=>q.id===id).start.npc',qid)
                await talk(no)
                assert await ev('id=>!!QUEST.state().active[id]',qid),'accept '+qid
            for _ in range(12):
                if await ev('id=>QUEST.state().completed.includes(id)',qid): break
                await advance(qid)
                await pg.wait_for_timeout(80)
            assert await ev('id=>QUEST.state().completed.includes(id)',qid),'completion '+qid

        assert await ev("() => QUEST.state().completed.filter(x=>x.startsWith('MAIN_')).length")==10
        await ev('() => UI.save()')
        await pg.reload(); await pg.wait_for_timeout(1200)
        assert await ev("() => QUEST.state().completed.filter(x=>x.startsWith('MAIN_')).length")==10,'completed restore'

        # 퀘스트 필드가 없는 이전 저장도 빈 상태로 시작.
        await pg.add_init_script("const d=JSON.parse(localStorage.getItem('arpg_save_v3')||'null');if(d){delete d.quests;localStorage.setItem('arpg_save_v3',JSON.stringify(d));}")
        await pg.reload(); await pg.wait_for_timeout(1200)
        assert await ev('() => QUEST.state().completed.length')==0,'old save without quest state'
        assert not errs, errs
        print('quest ok: main70 side5; main001-010 playthrough + 011-070 structural ok')
        await b.close()

asyncio.run(main())
