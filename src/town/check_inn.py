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

        assert await ev("() => A.inn.npcs.find(n=>n.no===5).y > 4*48"), '토비가 카운터 앞쪽에 있어야 함'
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(700)
        assert await ev("() => __INN.state().map==='inn'")
        assert await ev("() => __INN.open()")
        assert await ev("() => !document.getElementById('dlgInnRow').hidden && !document.getElementById('dlgChat').disabled && document.getElementById('dlgMerc').disabled")

        # 돈 충분: 레벨×8 차감, HP/MP 완전회복.
        r=await ev("""() => { GAME.P.lv=5;GAME.setGold(500);GAME.P.hp=1;GAME.P.mp=1;const c=__INN.cost(),ok=__INN.rest();return [ok,c,GAME.P.gold]; }""")
        assert r==[True,40,460],r
        await pg.wait_for_timeout(750)
        assert await ev("() => GAME.P.hp===GAME.P.maxHp && GAME.P.mp===GAME.P.maxMp")

        # 가득 찼으면 무료 거절.
        r=await ev("() => {const g=GAME.P.gold;const ok=__INN.rest();return [ok,GAME.P.gold===g,document.getElementById('dlgLine').textContent];}")
        assert r[0] is False and r[1] and ('멀쩡' in r[2] or '쉴 필요' in r[2]),r

        # 돈 부족 거절.
        r=await ev("() => {GAME.P.hp=1;GAME.setGold(0);const ok=__INN.rest();return [ok,GAME.P.gold,document.getElementById('dlgLine').textContent];}")
        assert r[0] is False and r[1]==0 and ('장부' in r[2] or '부족' in r[2]),r

        # 나가기와 실내 저장: 재접속은 단순 규칙으로 여관 문 앞(마을)에서 시작.
        assert await ev("() => __INN.leave()")
        await pg.wait_for_timeout(700)
        assert await ev("() => __INN.state().map==='town'")
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(700)
        await ev("() => UI.save()")
        await pg.reload();await pg.wait_for_timeout(1400)
        st=await ev("() => GAME.locationState()")
        assert st['map']=='town',st

        # 출입문: 아래로 걸어 나가기, 대화창 나가기 버튼, 벽 충돌(왼쪽 벽 밖으로 못 나감)
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(900)
        await pg.keyboard.down('ArrowLeft');await pg.wait_for_timeout(2500);await pg.keyboard.up('ArrowLeft')
        assert await ev("() => __INN.state().map==='inn' && __INN.state().x>=48")
        await ev("() => { GAME.P.x=7*48;GAME.P.y=8.45*48; }")
        await pg.keyboard.down('ArrowDown');await pg.wait_for_timeout(2500);await pg.keyboard.up('ArrowDown')
        assert await ev("() => __INN.state().map==='town'")
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(900)
        await ev("() => __INN.open()");await pg.click('#dlgLeave');await pg.wait_for_timeout(1100)
        assert await ev("() => __INN.state().map==='town'")

        assert not errs,errs
        print('inn ok')
        await b.close()
asyncio.run(main())
