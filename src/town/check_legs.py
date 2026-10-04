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

        # 1티어는 길 1칸(= 마을 필드), 3티어는 길 3칸.
        await ev("() => __FD.enter('spring',1)");await pg.wait_for_timeout(900)
        s=await ev("() => __FD.state()");assert s['leg']==1 and s['legs']==1,s
        assert await ev("() => __FD.mapInfo().blds")==2
        await ev("() => __FD.enter('autumn',1)");await pg.wait_for_timeout(900)
        s=await ev("() => __FD.state()");assert s['leg']==1 and s['legs']==3 and s['tier']==3,s
        assert await ev("() => __FD.mapInfo().blds")==0,'길 구간엔 마을이 없어야 함'
        assert await ev("() => __FD.mapInfo().exits")==2

        # 오른쪽 끝 출구로 다음 칸으로.
        await ev("() => __FD.warp(59.3,20)");await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['leg']==2 and s['legs']==3,s
        await ev("() => __FD.warp(59.3,20)");await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['leg']==3,s
        assert await ev("() => __FD.mapInfo().blds")==2,'마지막 칸에 마을'
        assert await ev("() => __FD.mapInfo().exits")==1
        # 마을 칸의 왼쪽 출구 = 목적지 선택창.
        await ev("() => __FD.warp(0.5,20)");await pg.wait_for_timeout(500)
        assert await ev("() => document.getElementById('regionPick').classList.contains('on')")
        btns=await ev("() => [...document.querySelectorAll('#regionGrid button')].map(b=>[b.dataset.theme,b.disabled,b.textContent])")
        assert btns[0][0]=='town' and any(x[0]=='autumn' and x[1] for x in btns),btns
        assert any('길 7칸' in x[2] for x in btns),btns
        # 목적지 고르기: 7티어 → 첫 칸에서 시작.
        await pg.click("#regionGrid button[data-theme=swamp]");await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['theme']=='swamp' and s['leg']==1 and s['legs']==7,s
        # 첫 칸 왼쪽 끝 = 큰 마을 바깥으로.
        await ev("() => __FD.warp(0.5,20)");await pg.wait_for_timeout(1200)
        assert await ev("() => __FD.mapInfo().map")=='out',await ev("() => __FD.mapInfo().map")
        # 두 번째 칸에서 왼쪽 끝 = 첫 칸으로 되돌아감.
        await ev("() => __FD.enter('autumn',2)");await pg.wait_for_timeout(900)
        await ev("() => __FD.warp(0.5,20)");await pg.wait_for_timeout(1500)
        s=await ev("() => __FD.state()");assert s['leg']==1,s

        assert not errs,errs
        print('legs ok')
        await b.close()
asyncio.run(main())
