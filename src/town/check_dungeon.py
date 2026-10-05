import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(900)

        # 1~7층을 실제 생성/이동: 도착 직후 막힘/고립이 없어야 한다.
        states=[]
        for floor in range(1,8):
            ok=await ev("(f)=>__DUN.go(f)",floor)
            assert ok is True,(floor,ok)
            await pg.wait_for_timeout(120)
            st=await ev("() => __DUN.state()")
            states.append(st)
            assert st['map']=='dungeon' and st['floor']==floor,(floor,st)
            assert st['blocked'] is False,(floor,st)
            assert st['moves']>=2,(floor,st)

        # 특히 3층 랜덤 생성 반복 — 보스층에서도 스폰이 갇히지 않아야 한다.
        for i in range(6):
            ok=await ev("() => __DUN.go(3)")
            assert ok is True,(i,ok)
            st=await ev("() => __DUN.state()")
            assert st['blocked'] is False and st['moves']>=2,(i,st)

        # 계단 상호작용으로도 한 층 내려가기.
        sd=await ev("() => __DUN.spots().find(s=>s[0]==='stairs_down')")
        assert sd,sd
        await ev("(s)=>{__P.x=s[1];__P.y=s[2];}",sd)
        await pg.wait_for_timeout(120)
        await pg.keyboard.press('e'); await pg.wait_for_timeout(900)
        st=await ev("() => __DUN.state()")
        assert st['floor']==4 and st['blocked'] is False and st['moves']>=2,st

        # 필드 동굴 1층에서 위로 나오면 성 밖 던전 입구가 아니라 들어왔던 필드로 돌아간다.
        await ev("() => __FD.enter('summer',2)"); await pg.wait_for_timeout(900)
        await ev("() => __DUN.restoreEntry('cave',{theme:'summer',leg:2,legs:2,x:50*48,y:10*48,dir:'front'})")
        ok=await ev("() => __DUN.go(1)"); assert ok is True,ok
        await pg.wait_for_timeout(900)
        st=await ev("() => __DUN.state()")
        assert st['map']=='dungeon' and st['theme']=='cave' and st['floor']==1,st
        su=await ev("() => __DUN.spots().find(s=>s[0]==='stairs_up')")
        assert su,su
        await ev("(s)=>{__P.x=s[1];__P.y=s[2];}",su)
        await pg.wait_for_timeout(120)
        await pg.keyboard.press('e'); await pg.wait_for_timeout(1000)
        fs=await ev("() => __FD.state()")
        assert fs['map']=='field' and fs['theme']=='summer' and fs['leg']==2,fs

        # 테스트 비상탈출은 전투/층과 무관하게 즉시 큰 마을로 복귀.
        await pg.click('#settingsBtn')
        assert await ev("() => GAME.isPaused()")
        await pg.click('#escapeStuck'); await pg.wait_for_timeout(120)
        assert await ev("() => document.getElementById('place').dataset.map")=='마을'
        assert not await ev("() => GAME.isPaused()")
        assert not errs,errs
        print('dungeon safe spawn ok',[(x['floor'],x['tier'],x['moves']) for x in states])
        await b.close()

asyncio.run(main())
