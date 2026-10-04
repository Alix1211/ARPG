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
        count=await ev('() => A.mainQuests.quests.length')
        assert count in [1,5], 'data count'
        async def talk(no):
            assert await ev('''no=>{const n=A.npcs.find(n=>n.no===no);if(!n)return false;GAME.P.x=n.x;GAME.P.y=n.y+16;return true;}''',no),'NPC exists'
            await pg.wait_for_timeout(100)
            await ev('() => GAME.act()')
            assert await ev("() => !document.getElementById('dlgQuest').hidden"),'quest button'
            await pg.click('#dlgQuest')
            for _ in range(8):
                if not await ev("() => document.getElementById('dlg').classList.contains('on')"):break
                await pg.click('#dlgQuest')
            assert not await ev("() => document.getElementById('dlg').classList.contains('on')"),'dialogue completion'
        # 시작 조건과 느낌표. 내용은 출력하지 않는다.
        no=await ev('() => A.mainQuests.quests[0].start.npc')
        assert await ev('no=>QUEST.marker(A.npcs.find(n=>n.no===no))',no)=='!'
        assert not await ev("() => QUEST.accept('M02')"),'prerequisite'
        await talk(no)
        assert await ev("() => !!QUEST.state().active.M01"),'accept'
        assert await ev('no=>QUEST.marker(A.npcs.find(n=>n.no===no))',no)=='?', 'active marker'
        # 본편 수락 후에도 길드5줄을 유지한다.
        await ev('''() => {GUILD.open();for(const q of GUILD.state().board.slice(0,5))GUILD.accept(q.id);GAME.closeAll();}''')
        assert await pg.locator('#questTrack .qtrack').count()==5
        assert await pg.locator('#mainQuestTrack .mainQtrack').count()==1
        bounds=await ev("() => ['questTrack','mainQuestTrack'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [r.top,r.bottom]})")
        assert bounds[0][1]<=bounds[1][0], 'separate HUD rows'
        await ev('() => UI.save()')
        await pg.reload();await pg.wait_for_timeout(1200)
        assert await ev("() => QUEST.state().active.M01.step")==0,'saved progress'
        # 번호순으로 실제 대화·방문·수집·전달을 조작한다.
        for number in range(1,count+1):
            qid=f'M{number:02d}'
            if number>1:
                if await ev("() => document.getElementById('place').dataset.map")!='마을':
                    await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})');await pg.wait_for_timeout(700)
                no=await ev('id=>A.mainQuests.quests.find(q=>q.id===id).start.npc',qid)
                await talk(no)
            reward=await ev('id=>QUEST.saveData().active[id].reward',qid)
            gold=await ev('() => GAME.P.gold')
            for _ in range(12):
                if await ev('id=>QUEST.state().completed.includes(id)',qid):break
                step=await ev('''id=>{const q=A.mainQuests.quests.find(q=>q.id===id),a=QUEST.state().active[id],s=q.steps[a.step];return {type:s.type,npc:s.npc,map:s.map||s.point?.map,floor:s.floor||s.point?.floor};}''',qid)
                if step['type']=='visit':
                    assert await ev('f=>__DUN.go(f)',step.get('floor',1)),'visit travel'
                    await pg.wait_for_timeout(850)
                elif step['type']=='collect':
                    points=await ev('id=>QUEST.points().filter(p=>p.id===id)',qid)
                    assert points,'collect point'
                    await ev('p=>{GAME.P.x=p.x;GAME.P.y=p.y;}',points[0]);await pg.wait_for_timeout(100)
                    await ev('() => GAME.act()')
                else:
                    if await ev("() => document.getElementById('place').dataset.map")!='마을':
                        await ev('() => GAME.resumeLocation({map:"town",x:1104,y:1065})');await pg.wait_for_timeout(700)
                    await talk(step['npc'])
            assert await ev('id=>QUEST.state().completed.includes(id)',qid),'completion '+qid
            assert await ev('() => GAME.P.gold')==gold+reward['gold'],'gold reward '+qid
            assert not await ev('id=>QUEST.accept(id)',qid),'no replay'
        await ev('() => UI.save()')
        await pg.reload();await pg.wait_for_timeout(1200)
        assert await ev('() => QUEST.state().completed.length')==count,'completed restore'
        # 본편 수락 후에도 길드5줄을 유지한다.
        await pg.add_init_script("const d=JSON.parse(localStorage.getItem('arpg_save_v3')||'null');if(d){delete d.quests;localStorage.setItem('arpg_save_v3',JSON.stringify(d));}")
        await pg.reload();await pg.wait_for_timeout(1200)
        assert await ev('() => QUEST.state().completed.length')==0,'old save'
        # 독립 검사 데이터로 처치·방문·납품 조건을 확인한다.
        await ev('''() => {A.mainQuests.quests.push({id:'T99',title:'검사용',start:{npc:45,level:2,map:'town',visit:'out'},intro:['검사용'],steps:[{type:'kill',target:'slime',need:2},{type:'deliver',npc:45,item:'test',need:1,lines:['검사용']}],reward:{gold:1,expRatio:.01}});QUEST.loadData(null);GAME.P.lv=1;}''')
        assert not await ev("() => QUEST.accept('T99')"),'level/visit condition'
        await ev('''() => {QUEST.loadData({schema:1,visited:['out']});GAME.P.lv=2;const n=A.npcs.find(n=>n.no===45);GAME.P.x=n.x;GAME.P.y=n.y;}''')
        assert await ev("() => QUEST.accept('T99')"),'conditions'
        await ev("() => {QUEST.onKill({dead:true,type:'wolf'});QUEST.onKill({dead:false,type:'slime'});QUEST.onKill({dead:true,type:'slime'});}")
        assert await ev("() => QUEST.state().active.T99.progress")==1,'kill filter'
        await ev("() => QUEST.onKill({dead:true,type:'slime'})")
        assert await ev("() => QUEST.state().active.T99.step")==1,'kill advance'
        await pg.wait_for_timeout(100);await ev('() => GAME.act()');await pg.click('#dlgQuest')
        assert await ev("() => QUEST.state().active.T99.step")==1,'delivery missing'
        assert not errs, 'browser errors'
        print('quest ok: numbered chains',count,'guild HUD 5; save/conditions/rewards ok')
        await b.close()
asyncio.run(main())
