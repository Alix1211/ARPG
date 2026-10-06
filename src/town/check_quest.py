import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
REGION_TIER={'spring':1,'summer':2,'autumn':3,'winter':4,'ice':5,'volcano':6,'swamp':7}
ALLOWED={'talk','deliver','visit','collect','kill','event','inspect','scene','boss'}

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL)
        await pg.wait_for_timeout(1400)

        assert await ev('() => A.mainQuests.schema')==3, 'quest schema'
        assert await ev('() => A.mainQuests.quests.length')==70, 'main count'
        assert await ev('() => A.mainQuests.sideQuests.length')==45, 'side count'
        lists=await ev('() => QUEST.lists()')
        assert len(lists['main'])==70 and len(lists['side'])==45

        # 전체 115개 데이터 구조를 빌드된 게임 안에서 검사한다.
        data=await ev("""() => ({
          main:A.mainQuests.quests,
          side:A.mainQuests.sideQuests,
          chars:Object.keys(A.storyChars||{}),
          ports:Object.keys(A.port||{})
        })""")
        for i,q in enumerate(data['main'],1):
            qid=f'MAIN_{i:03d}'
            assert q['id']==qid,(i,q['id'])
            assert q['kind']=='main'
            prev=None if i==1 else f'MAIN_{i-1:03d}'
            assert q['start'].get('previous')==prev,(qid,q['start'])
            assert q.get('steps'),qid
        for i,q in enumerate(data['side'],1):
            assert q['id']==f'SIDE_{i:03d}',q['id']
            assert q['kind']=='side'
            assert q.get('steps'),q['id']

        chars=set(data['chars']); ports=set(data['ports'])
        for q in data['main']+data['side']:
            for s in q['steps']:
                assert s['type'] in ALLOWED,(q['id'],s['type'])
                if s['type']=='collect':
                    assert s.get('point'),(q['id'],'collect without point')
                    assert s.get('item'),(q['id'],'collect without item')
                if s['type'] in ('inspect','scene') and s.get('point'):
                    assert s['point'].get('map'),(q['id'],'point without map')
                if s.get('char'):
                    assert s['char'] in chars,(q['id'],'missing story char',s['char'])
                if s.get('portraitNpc') is not None:
                    key=f"npc_{int(s['portraitNpc']):02d}"
                    assert key in ports,(q['id'],'missing portrait',key)
                for loc in [s,s.get('point') or {}]:
                    if loc.get('map')=='field':
                        market=loc.get('market')
                        assert market in REGION_TIER,(q['id'],'bad market',market)
                        leg=loc.get('leg')
                        if leg is not None:
                            assert 1<=int(leg)<=REGION_TIER[market],(q['id'],'bad leg',market,leg)
                    if loc.get('map')=='dungeon' and loc.get('floor') is not None:
                        assert int(loc['floor'])>=1,(q['id'],'bad floor',loc['floor'])

        # 사용자가 지적했던 초반 '발밑 회수' 회귀: 첫 실제 회수물은 필드 먼 지점에 있다.
        q3=next(q for q in data['main'] if q['id']=='MAIN_003')
        collect=next(s for s in q3['steps'] if s['type']=='collect')
        tx,ty=collect['point']['tile']
        assert ((tx-3.2)**2+(ty-20)**2)**0.5>15,'MAIN_003 collect regressed near field spawn'

        async def town():
            if await ev("() => document.getElementById('place').dataset.map")!='마을':
                await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})')
                await pg.wait_for_timeout(700)

        async def close_dialog():
            for _ in range(24):
                on=await ev("() => document.getElementById('dlg').classList.contains('on')")
                if not on:
                    return
                hidden=await ev("() => document.getElementById('dlgQuest').hidden")
                if hidden:
                    await ev('() => GAME.closeAll()')
                    return
                await ev("() => document.getElementById('dlgQuest').click()")
                await pg.wait_for_timeout(15)
            raise AssertionError('dialogue did not close')

        async def talk(no):
            await town()
            ok=await ev('''no=>{const n=A.npcs.find(n=>n.no===no);if(!n)return false;GAME.P.x=n.x;GAME.P.y=n.y+16;return true;}''',no)
            assert ok,'NPC exists '+str(no)
            await pg.wait_for_timeout(100)
            await ev('() => GAME.act()')
            assert await ev("() => document.getElementById('dlg').classList.contains('on')"),'dialog opened'
            assert not await ev("() => document.getElementById('dlgQuest').hidden"),'quest button'
            await pg.click('#dlgQuest')
            await close_dialog()

        async def go_field(theme,leg=1):
            await ev('(x)=>__FD.enter(x.theme,x.leg)',{'theme':theme,'leg':leg})
            await pg.wait_for_timeout(800)
            st=await ev('() => __FD.state()')
            assert st['map']=='field' and st['theme']==theme and st['leg']==leg,(theme,leg,st)

        async def go_dungeon(floor):
            assert await ev('f=>__DUN.go(f)',floor)
            await pg.wait_for_timeout(900)
            assert await ev('() => __DUN.state().floor')==floor

        async def go_point(qid,step):
            pdef=step.get('point') or {}
            if pdef.get('map')=='field':
                await go_field(pdef['market'],int(pdef.get('leg',1)))
            elif pdef.get('map')=='dungeon':
                await go_dungeon(int(pdef.get('floor',1)))
            elif pdef.get('map')=='town':
                await town()
            pts=await ev('id=>QUEST.points().filter(p=>p.id===id)',qid)
            assert pts,'no quest point '+qid+' '+step['type']
            pt=pts[0]
            await ev('p=>{GAME.P.x=p.x;GAME.P.y=p.y;}',pt)
            await pg.wait_for_timeout(100)
            assert await ev('id=>QUEST.collect(id)',qid),('point action failed',qid,step)
            if step['type'] in ('inspect','scene'):
                await close_dialog()

        async def advance(qid):
            step=await ev('''id=>{const q=A.mainQuests.quests.find(q=>q.id===id),a=QUEST.state().active[id];if(!q||!a)return null;return JSON.parse(JSON.stringify(q.steps[a.step]));}''',qid)
            assert step,qid
            typ=step['type']
            if typ in ('talk','deliver'):
                await talk(step['npc'])
            elif typ=='visit':
                if step.get('map')=='field':
                    await go_field(step['market'],int(step.get('leg',1)))
                elif step.get('map')=='dungeon':
                    await go_dungeon(int(step.get('floor',1)))
                else:
                    await town()
                await pg.wait_for_timeout(100)
            elif typ in ('collect','inspect','scene') and step.get('point'):
                await go_point(qid,step)
            elif typ=='scene':
                # point 없는 자동 장면
                if step.get('map')=='field':
                    await go_field(step['market'],int(step.get('leg',1)))
                elif step.get('map')=='dungeon':
                    await go_dungeon(int(step.get('floor',1)))
                else:
                    await town()
                await pg.wait_for_timeout(150)
                await close_dialog()
            elif typ=='kill':
                for _ in range(int(step.get('need',1))):
                    await ev("() => QUEST.onKill({dead:true,type:'slime',family:'slime',boss:false})")
            elif typ=='boss':
                await ev("() => QUEST.onKill({dead:true,type:'test_boss',family:'test',boss:true})")
            elif typ=='event':
                filt=step.get('filter',{}).copy()
                if filt.pop('profitPositive',False):
                    filt['profit']=1
                filt['count']=int(step.get('need',1))
                await ev('(x)=>QUEST.onEvent(x.name,x.data)',{'name':step['event'],'data':filt})
            else:
                raise AssertionError('unknown/unhandled step '+repr(step))

        # 깨끗한 V2 저장에서 시작.
        await ev('() => {localStorage.removeItem("arpg_save_v3");QUEST.loadData(null);GAME.P.lv=70;GAME.P.exp=0;}')
        await town()

        # 길드 5줄과 본편 추적은 계속 공존해야 한다.
        no=await ev("() => A.mainQuests.quests[0].start.npc")
        await talk(no)
        assert await ev("() => !!QUEST.state().active.MAIN_001"),'MAIN_001 accept'
        await ev('''() => {GUILD.open();for(const q of GUILD.state().board.slice(0,5))GUILD.accept(q.id);GAME.closeAll();}''')
        assert await pg.locator('#questTrack .qtrack').count()==5
        assert await pg.locator('#mainQuestTrack .mainQtrack').count()==1
        # 현재 진행 단계의 NPC만 미니맵 목표로 노출된다.
        mini=await ev('() => QUEST.minimapTargets()')
        assert len(mini)==1 and mini[0]['kind']=='npc',mini
        target_no=await ev("() => A.mainQuests.quests[0].steps[0].npc")
        target_pos=await ev("no => {const n=A.npcs.find(n=>n.no===no);return [n.x,n.y]}",target_no)
        assert abs(mini[0]['x']-target_pos[0])<1 and abs(mini[0]['y']-target_pos[1])<1,(mini,target_pos)

        # 초반 001~010은 실제 맵/현장 포인트/던전/대화 흐름으로 전부 플레이한다.
        for n in range(1,11):
            qid=f'MAIN_{n:03d}'
            if n>1:
                await town()
                await ev('() => {GAME.P.lv=70;GAME.P.exp=0;}')
                no=await ev('id=>A.mainQuests.quests.find(q=>q.id===id).start.npc',qid)
                await talk(no)
                assert await ev('id=>!!QUEST.state().active[id]',qid),'accept '+qid
            for _ in range(20):
                if await ev('id=>QUEST.state().completed.includes(id)',qid):
                    break
                await advance(qid)
                await pg.wait_for_timeout(60)
            assert await ev('id=>QUEST.state().completed.includes(id)',qid),'completion '+qid

        assert await ev("() => QUEST.state().completed.filter(x=>x.startsWith('MAIN_')).length")==10

        # 메인 레벨은 권장치일 뿐 하드게이트가 아니다. Lv1에서도 MAIN_002 완료 뒤 MAIN_003 시작 NPC가 미니맵에 잡혀야 한다.
        await ev("""() => {QUEST.loadData({schema:3,active:{},completed:['MAIN_001','MAIN_002'],items:{},visited:[],flags:{}});GAME.P.lv=1;}""")
        await town()
        mini=await ev('() => QUEST.minimapTargets()')
        assert any(x['id']=='MAIN_003' and x['kind']=='start' for x in mini),mini

        # 새 장면/보스 타입 단독 회귀 확인: 임의 상태를 주입하고 실제 엔진으로 진행.
        await ev("""() => QUEST.loadData({schema:3,active:{MAIN_015:{step:0,progress:0,reward:{gold:1,exp:1}}},completed:Array.from({length:14},(_,i)=>'MAIN_'+String(i+1).padStart(3,'0')),items:{},visited:[],flags:{}})""")
        await ev('() => {GAME.P.lv=70;}')
        s15=await ev("""() => {const q=A.mainQuests.quests.find(q=>q.id==='MAIN_015'),a=QUEST.state().active.MAIN_015;return q.steps[a.step]}""")
        await go_point('MAIN_015',s15)
        assert await ev("() => QUEST.state().active.MAIN_015.step")==1,'scene step advance'

        await ev("""() => QUEST.loadData({schema:3,active:{MAIN_004:{step:1,progress:0,reward:{gold:1,exp:1}}},completed:['MAIN_001','MAIN_002','MAIN_003'],items:{},visited:[],flags:{}})""")
        await go_dungeon(3)
        await ev("() => QUEST.onKill({dead:true,boss:true,type:'test',family:'test'})")
        assert await ev("() => QUEST.state().active.MAIN_004.step")==2,'boss step advance'

        # schema 1/2도 안전하게 읽되 V2가 모르는 옛 side ID는 버린다.
        await ev("""() => QUEST.loadData({schema:2,active:{OLD_X:{step:0,progress:0}},completed:['OLD_Y'],items:{},visited:[]})""")
        st=await ev('() => QUEST.state()')
        assert not st['active'] and not st['completed']

        assert not errs,errs
        print('quest ok: schema3 main70 side45; MAIN001-010 playthrough; spatial/scene/boss/portraits ok')
        await b.close()

asyncio.run(main())
