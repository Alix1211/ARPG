import asyncio, os
from playwright.async_api import async_playwright

MAIN_FROM=int(os.environ.get('QUEST_MAIN_FROM','1'))
MAIN_TO=int(os.environ.get('QUEST_MAIN_TO','70'))
SIDE_FROM=int(os.environ.get('QUEST_SIDE_FROM','1'))
SIDE_TO=int(os.environ.get('QUEST_SIDE_TO','45'))
RUN_MAIN=MAIN_FROM>0 and MAIN_TO>=MAIN_FROM
RUN_SIDE=SIDE_FROM>0 and SIDE_TO>=SIDE_FROM

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        pg.set_default_timeout(3000)
        await pg.goto(URL); await pg.wait_for_timeout(1400)

        async def town():
            if await ev("() => document.getElementById('place').dataset.map")!='마을':
                await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})')
                await pg.wait_for_timeout(60)

        async def close_quest_dialog():
            for _ in range(90):
                if not await ev("() => document.getElementById('dlg').classList.contains('on')"):
                    return
                if await ev("() => document.getElementById('dlgQuest').hidden"):
                    await ev("() => GAME.closeAll()"); return
                await ev("() => document.getElementById('dlgQuest').click()")
                await pg.wait_for_timeout(2)
            raise AssertionError('dialogue did not close')

        async def talk(no, expect_id=None):
            await town()
            ok=await ev('''no=>{const n=A.npcs.find(n=>n.no===no);if(!n)return false;GAME.P.x=n.x;GAME.P.y=n.y+16;return true;}''',no)
            assert ok,('missing npc',no,expect_id)
            await pg.wait_for_timeout(100)
            await ev('() => GAME.act()')
            await pg.wait_for_timeout(25)
            assert await ev("() => document.getElementById('dlg').classList.contains('on')"),('dialog not open',no,expect_id)
            assert not await ev("() => document.getElementById('dlgQuest').hidden"),('quest button hidden',no,expect_id)
            await ev("() => document.getElementById('dlgQuest').click()")
            await close_quest_dialog()

        async def go_field(theme,leg=1):
            cur=await ev("() => window.__FD?__FD.state():null")
            moved=not cur or cur.get('map')!='field' or cur.get('theme')!=theme or cur.get('leg')!=leg
            if moved:
                assert await ev("([t,l])=>__FD.enter(t,l)",[theme,leg])
                await pg.wait_for_timeout(480)
            await ev("() => QUEST.tick()")
            st=await ev("() => __FD.state()")
            assert st['map']=='field' and st['theme']==theme and st['leg']==leg,(theme,leg,st)

        async def go_dungeon(floor):
            cur=await ev("() => window.__DUN?__DUN.state():null")
            moved=not cur or cur.get('map')!='dungeon' or cur.get('floor')!=floor
            if moved:
                assert await ev("f=>__DUN.go(f)",floor)
                await pg.wait_for_timeout(480)
            await ev("() => QUEST.tick()")
            st=await ev("() => __DUN.state()")
            assert st['map']=='dungeon' and st['floor']==floor,(floor,st)

        async def ensure_map(step):
            pdef=step.get('point') or {}
            m=pdef.get('map') or step.get('map')
            if m=='field':
                theme=pdef.get('market') or step.get('market')
                leg=int(pdef.get('leg') or step.get('leg') or 1)
                await go_field(theme,leg)
            elif m=='dungeon':
                floor=int(pdef.get('floor') or step.get('floor') or 1)
                await go_dungeon(floor)
            elif m=='town':
                await town(); await ev("() => QUEST.tick()")

        async def point_action(qid,step):
            need=int(step.get('need') or 1) if step['type']=='collect' else 1
            await ensure_map(step)
            for _ in range(need):
                pts=await ev("id=>QUEST.points().filter(p=>p.id===id)",qid)
                assert pts,('no quest point',qid,step['type'],step.get('point'))
                pt=pts[0]
                assert await ev("p=>GAME.walkableAt(p.x,p.y)",pt),('quest point not walkable',qid,step['type'],pt,step.get('point'))
                await ev("p=>{GAME.P.x=p.x;GAME.P.y=p.y;}",pt)
                assert await ev("id=>QUEST.collect(id)",qid),('point action failed',qid,step)
                if step['type'] in ('inspect','scene'):
                    await close_quest_dialog()

        async def current_step(qid):
            return await ev("""id=>{
              const q=[...A.mainQuests.quests,...A.mainQuests.sideQuests].find(q=>q.id===id);
              const a=QUEST.state().active[id];
              if(!q||!a)return null;
              return JSON.parse(JSON.stringify(q.steps[a.step]));
            }""",qid)

        async def advance(qid):
            step=await current_step(qid)
            assert step,('missing active step',qid)
            typ=step['type']
            if typ in ('talk','deliver'):
                await talk(step['npc'],qid)
            elif typ=='visit':
                await ensure_map(step)
                await ev("() => QUEST.tick()")
            elif typ in ('collect','inspect') or (typ=='scene' and step.get('point')):
                await point_action(qid,step)
            elif typ=='scene':
                await ensure_map(step)
                await ev("() => QUEST.tick()")
                await close_quest_dialog()
            elif typ=='kill':
                await ensure_map(step)
                target=step.get('target') or 'slime'
                for _ in range(int(step.get('need') or 1)):
                    await ev("(t)=>QUEST.onKill({dead:true,type:t,family:t,boss:false})",target)
            elif typ=='boss':
                await ensure_map(step)
                await ev("() => QUEST.onKill({dead:true,type:'test_boss',family:'test',boss:true})")
            elif typ=='event':
                data=dict(step.get('filter') or {})
                if data.pop('profitPositive',False): data['profit']=1
                data['count']=int(step.get('need') or 1)
                assert await ev("(x)=>QUEST.onEvent(x.name,x.data)",{'name':step['event'],'data':data}),('event not accepted',qid,step)
            else:
                raise AssertionError(('unhandled',qid,step))

        async def run_quest(qid,start_npc,max_steps=20):
            print('RUN',qid,flush=True)
            await ev("() => {GAME.P.hp=GAME.P.maxHp=999999999;GAME.P.mp=GAME.P.maxMp=999999999;}")
            await talk(start_npc,qid)
            assert await ev("id=>!!QUEST.state().active[id]",qid),('not accepted',qid)
            for _ in range(max_steps):
                if await ev("id=>QUEST.state().completed.includes(id)",qid): break
                before=await ev("id=>QUEST.state().active[id]",qid)
                await advance(qid)
                after=await ev("id=>QUEST.state().active[id]||null",qid)
                done=await ev("id=>QUEST.state().completed.includes(id)",qid)
                assert done or after is None or after['step']!=before['step'] or after['progress']!=before['progress'],('no progress',qid,before,after)
            assert await ev("id=>QUEST.state().completed.includes(id)",qid),('not completed',qid)
            assert not await ev("id=>!!QUEST.state().active[id]",qid),('still active after completion',qid)
            print('OK ',qid,flush=True)

        # 지정한 메인 구간: 앞번호는 완료 상태로 두고, 해당 구간은 실제 수락→현장→완료를 순차 통과한다.
        if RUN_MAIN:
            prev=[f'MAIN_{i:03d}' for i in range(1,MAIN_FROM)]
            await ev("""x=>{localStorage.removeItem('arpg_save_v3');QUEST.loadData({schema:3,active:{},completed:x,items:{},visited:[],flags:{}});GAME.P.lv=70;GAME.P.exp=0;GAME.setGold(999999);}""",prev)
            await town()
            for n in range(MAIN_FROM,MAIN_TO+1):
                qid=f'MAIN_{n:03d}'
                npc=await ev("id=>A.mainQuests.quests.find(q=>q.id===id).start.npc",qid)
                await run_quest(qid,npc,24)
            got=await ev("() => QUEST.state().completed.filter(x=>x.startsWith('MAIN_'))")
            for n in range(MAIN_FROM,MAIN_TO+1):
                assert f'MAIN_{n:03d}' in got,('main chunk missing',n,got[-5:])
            snap=await ev("() => QUEST.saveData()")
            await ev("() => QUEST.loadData(null)")
            await ev("d=>QUEST.loadData(d)",snap)
            got2=await ev("() => QUEST.state().completed.filter(x=>x.startsWith('MAIN_'))")
            assert len(got2)>=MAIN_TO,('main save restore',MAIN_FROM,MAIN_TO,len(got2))

        # 지정한 서브 구간: 대상 하나만 미완료로 격리하되 실제 레벨/선행메인/NPC 수락과 모든 단계를 사용한다.
        if RUN_SIDE:
            all_main=[f'MAIN_{i:03d}' for i in range(1,71)]
            all_side=[f'SIDE_{i:03d}' for i in range(1,46)]
            for n in range(SIDE_FROM,SIDE_TO+1):
                qid=f'SIDE_{n:03d}'
                q=await ev("id=>A.mainQuests.sideQuests.find(q=>q.id===id)",qid)
                completed=all_main + [x for x in all_side if x!=qid]
                await ev("""x=>{QUEST.loadData({schema:3,active:{},completed:x.completed,items:{},visited:[],flags:{}});GAME.P.lv=x.lv;GAME.P.exp=0;GAME.setGold(999999);}""",
                         {'completed':completed,'lv':int(q['start'].get('level') or 70)})
                await town()
                assert not await ev("id=>QUEST.state().completed.includes(id)",qid)
                await run_quest(qid,q['start']['npc'],16)

        assert not errs,errs
        print('quest chunk ok',{'main':[MAIN_FROM,MAIN_TO] if RUN_MAIN else None,'side':[SIDE_FROM,SIDE_TO] if RUN_SIDE else None},flush=True)

        await b.close()

asyncio.run(main())
