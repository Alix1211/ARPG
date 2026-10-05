import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)

        # 실제 플레이 UI는 봄만 기본 개방. 여름 이후는 레벨/메인 진행으로 잠긴다.
        await ev("() => {GAME.P.lv=1; __FD.openRegionSelect('field');}")
        await pg.wait_for_timeout(150)
        btns=await ev("() => [...document.querySelectorAll('#regionGrid button')].map(b=>[b.dataset.theme,b.disabled,b.textContent])")
        assert next(x for x in btns if x[0]=='spring')[1] is False,btns
        assert all(next(x for x in btns if x[0]==t)[1] for t in ['summer','autumn','winter','ice','volcano','swamp']),btns
        await ev("() => GAME.closeAll()")
        assert not await ev("() => __FD.regionUnlocked('summer').open")
        await ev("() => {GAME.P.lv=10;}")
        assert await ev("() => __FD.regionUnlocked('summer').open")
        assert not await ev("() => __FD.regionUnlocked('autumn').open")
        # 이하 이동 구조 검사는 디버그 직접진입과 고레벨 UI를 사용한다.
        await ev("() => {GAME.P.lv=70;}")

        # 각 티어는 랜덤 야외 필드 N개 + 마지막 고정맵 1개.
        await ev("() => __FD.enter('spring',1)");await pg.wait_for_timeout(900)
        s=await ev("() => __FD.state()");assert s['leg']==1 and s['legs']==2 and s['outdoorDungeon'],s
        assert await ev("() => __FD.mapInfo().blds")==0
        await ev("() => __FD.enter('autumn',1)");await pg.wait_for_timeout(900)
        s=await ev("() => __FD.state()");assert s['leg']==1 and s['legs']==4 and s['tier']==3,s
        assert await ev("() => __FD.mapInfo().blds")==0,'길 구간엔 마을이 없어야 함'
        assert await ev("() => __FD.mapInfo().exits")==2

        # 실제 랜덤 필드 출구를 따라 다음 칸으로.
        for expected in [2,3,4]:
            cur=await ev("() => __FD.state()")
            await ev("(p) => __FD.warp(p.x+.7,p.y)",cur['end']);await pg.wait_for_timeout(1500)
            s=await ev("() => __FD.state()");assert s['leg']==expected and s['legs']==4,s
        assert await ev("() => __FD.mapInfo().blds")==2,'마지막 칸에 마을'
        assert await ev("() => __FD.mapInfo().exits")==2
        # 마지막 칸의 오른쪽 위 길 끝 = 목적지 선택창.
        s=await ev("() => __FD.state()")
        await ev("(p) => __FD.warp(p.x+.8,p.y)",s['end']);await pg.wait_for_timeout(500)
        assert await ev("() => document.getElementById('regionPick').classList.contains('on')")
        btns=await ev("() => [...document.querySelectorAll('#regionGrid button')].map(b=>[b.dataset.theme,b.disabled,b.textContent])")
        assert btns[0][0]=='town' and any(x[0]=='autumn' and x[1] for x in btns),btns
        assert any('7개 야외길 + 마지막 거점' in x[2] for x in btns),btns
        # 목적지 고르기: 7티어 → 첫 칸에서 시작.
        await pg.click("#regionGrid button[data-theme=swamp]");await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['theme']=='swamp' and s['leg']==1 and s['legs']==8,s
        # 첫 칸 왼쪽 끝 = 큰 마을 바깥으로.
        s=await ev("() => __FD.state()")
        await ev("(p) => __FD.warp(p.x-.7,p.y)",s['start']);await pg.wait_for_timeout(1200)
        assert await ev("() => __FD.mapInfo().map")=='out',await ev("() => __FD.mapInfo().map")
        # 두 번째 칸에서 왼쪽 끝 = 첫 칸으로 되돌아감.
        await ev("() => __FD.enter('autumn',2)");await pg.wait_for_timeout(900)
        s=await ev("() => __FD.state()")
        await ev("(p) => __FD.warp(p.x-.7,p.y)",s['start']);await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['leg']==1,s

        assert not errs,errs
        print('legs ok')
        await b.close()
asyncio.run(main())
