import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
NAMES=['토비','마르코','루나','그레타','핀','브란','하르트','에드먼','페닉스','고르던','오토','라이너','에다','미나','필드 길 경비병','던전 길 경비병','망루 경비병','성문 경비병']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)

        # 대사 개수
        c=await ev("() => ({mono:Object.fromEntries(Object.entries(__CHAT.data.mono).map(([k,v])=>[k,v.length])),npc:Object.fromEntries(Object.entries(__CHAT.data.npc).map(([k,v])=>[k,v.length]))})")
        assert all(n>=8 for n in c['mono'].values()) and sum(c['mono'].values())>=60,c['mono']
        assert all(n in c['npc'] for n in NAMES),[n for n in NAMES if n not in c['npc']]
        assert all(n>=8 for n in c['npc'].values()),c['npc']

        # 잡담: 한 바퀴 안에서는 반복 없음, 바퀴가 넘어가도 연속 반복 없음
        for n in NAMES:
            r=await ev("(n) => { const a=[];for(let i=0;i<30;i++)a.push(__CHAT.talk(n));return a; }",n)
            k=c['npc'][n]
            assert len(set(r[:k]))==k,(n,'한 바퀴 반복')
            assert all(r[i]!=r[i+1] for i in range(len(r)-1)),(n,'연속 반복')
            assert not any('{이름}' in x for x in r),n

        # 혼잣말: 즉시 출력, 말풍선 모양
        r=await ev("() => { const s=__CHAT.mono('rare');const b=__CHAT.bubble();return [s,b&&b.mono,b&&b.dur]; }")
        assert r[0] and r[1] and r[2]>2,r

        # 간격: 방금 나왔으면 조건 맞아도 새 예약이 안 생긴다(던전 안이 아니면 예약 자체 차단 확인은 상태로)
        await ev("() => GAME.closeAll()")
        assert await ev("() => __DUN.go(5)")
        await pg.wait_for_timeout(1200)
        await ev("() => { for(const m of document.querySelectorAll('x')){} }")
        r=await ev("() => { const a=__CHAT.event('deep');const b=__CHAT.event('deep');return [a,b]; }")
        assert r[1] is False,r   # 같은 순간 두 번째는 막힌다(예약 중이거나 간격)

        # 마을 NPC 대화창: 잡담 버튼이 보이고 누르면 대사가 바뀐다(상점 있는 NPC)
        pg=await b.new_page(viewport={'width':1280,'height':720});pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(900)
        await ev("() => __INN.open()")
        before=await ev("() => document.getElementById('dlgLine').textContent")
        await pg.click('#dlgChat');await pg.wait_for_timeout(100)
        after=await ev("() => document.getElementById('dlgLine').textContent")
        assert after!=before and after,(before,after)
        await ev("() => GAME.closeAll()")
        await ev("() => __INN.leave()");await pg.wait_for_timeout(900)
        ok=await ev("""() => { const n=A.npcs.find(x=>x.name==='마르코');if(!n)return false;GAME.P.x=n.x;GAME.P.y=n.y+8;return true; }""")
        assert ok
        await pg.wait_for_timeout(150)
        await ev("() => GAME.act()");await pg.wait_for_timeout(100)
        vis=await ev("() => { const b=document.getElementById('dlgTalk');return b&&b.offsetParent!==null; }")
        assert vis
        await pg.click('#dlgTalk');await pg.wait_for_timeout(100)
        line=await ev("() => document.getElementById('dlgLine').textContent")
        assert line in await ev("() => __CHAT.data.npc['마르코']"),line
        print('chat ok',sum(c['mono'].values()),sum(c['npc'].values()),errs)
        assert not errs,errs
        await b.close()
asyncio.run(main())
