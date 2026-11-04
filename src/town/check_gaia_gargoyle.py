"""가고일 1회성 이벤트 시험(첫 조우 대화·첫 처치 대화+희귀 검). 먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다."""
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
DLG = "() => { const d=document.getElementById('dlg'); return [d.classList.contains('on'), document.getElementById('dlgName').textContent, document.getElementById('dlgLine').textContent]; }"


async def click_through(pg, ev, n):
    for _ in range(n):
        await ev("() => document.getElementById('dlgQuest').click()")
        await pg.wait_for_timeout(120)


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 915, 'height': 412})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_GARGOYLE!=='undefined' && typeof __FD!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', flush=True)
        GAIA = "() => GAIA_GARGOYLE.state()"
        await ev("() => GAIA_GARGOYLE.debugReset()")
        await ev("() => __FD.enter('spring',1)")
        await pg.wait_for_timeout(900)
        assert (await ev(GAIA)) == {'see': False, 'kill': False, 'paused': False, 'swords': 0}, await ev(GAIA)

        # ① 가고일이 멀리 있으면 아무 일도 없다 / 가까이 오면 대화가 뜨고 전투가 멈춘다
        await ev("() => GAIA_GARGOYLE.debugSpawn(900)")
        await pg.wait_for_timeout(500)
        assert not (await ev(GAIA))['see'], '멀리 있는데 이벤트가 뜸'
        await ev("() => GAIA_PARTY.debugMonsters().forEach(m=>{ if(m.family==='gargoyle'){ m.x=GAME.P.x+250; m.y=GAME.P.y; m.removed=false; } })")
        await pg.wait_for_timeout(500)
        st = await ev(GAIA)
        assert st['see'] and st['paused'], st
        dlg = await ev(DLG)
        assert dlg[0] and dlg[1] == '실비아', dlg
        x0 = await ev("() => GAIA_PARTY.debugMonsters().find(m=>m.family==='gargoyle').x")
        await pg.wait_for_timeout(700)
        x1 = await ev("() => GAIA_PARTY.debugMonsters().find(m=>m.family==='gargoyle').x")
        assert abs(x1 - x0) < 1, ('대화 중 가고일이 움직임', x0, x1)
        await click_through(pg, ev, 3)
        await pg.wait_for_timeout(300)
        dlg = await ev(DLG)
        assert not dlg[0], '대화가 안 닫힘'
        assert not (await ev(GAIA))['paused'], '멈춤이 안 풀림'
        # 두 번째로 가까이 와도 다시 안 뜬다
        await ev("() => { const m=GAIA_PARTY.debugMonsters().find(m=>m.family==='gargoyle'); m.x=GAME.P.x+900; }")
        await pg.wait_for_timeout(200)
        await ev("() => { const m=GAIA_PARTY.debugMonsters().find(m=>m.family==='gargoyle'); m.x=GAME.P.x+200; }")
        await pg.wait_for_timeout(500)
        assert not (await ev(DLG))[0], '첫 조우 대화가 두 번 뜸'

        # ② 처음 쓰러뜨리면 대화 + 희귀 검이 떨어진다
        idx = await ev("() => GAIA_PARTY.debugMonsters().findIndex(m=>m.family==='gargoyle')")
        assert await ev("(i) => __FD.testOp(i,'kill')", idx)
        await pg.wait_for_timeout(1200)
        st = await ev(GAIA)
        assert st['kill'] and st['swords'] == 1, st
        dlg = await ev(DLG)
        assert dlg[0] and dlg[1] == '아가사', dlg
        await click_through(pg, ev, 6)
        await pg.wait_for_timeout(300)
        assert not (await ev(DLG))[0] and not (await ev(GAIA))['paused']
        # 두 번째 가고일을 쓰러뜨려도 대화·검이 또 나오지 않는다
        await ev("() => GAIA_GARGOYLE.debugSpawn(200)")
        await pg.wait_for_timeout(300)
        idx = await ev("() => GAIA_PARTY.debugMonsters().findIndex(m=>m.family==='gargoyle' && !m.dead)")
        await ev("(i) => __FD.testOp(i,'kill')", idx)
        await pg.wait_for_timeout(1200)
        assert not (await ev(DLG))[0], '두 번째 처치에서 대화가 뜸'
        # 저장
        sv = await ev("() => QUEST.saveData().flags")
        assert sv.get('gargSee') == 1 and sv.get('gargKill') == 1, sv
        assert not errs, errs
        await b.close()
        print('가고일 1회성 이벤트 통과')

asyncio.run(main())
