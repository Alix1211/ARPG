"""여관 2층 실비아 저녁 치유(밤 1회·평균 치유) + 아가사 스쿼트 하루 기준(게임 속 하루) 시험. 먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다."""
import asyncio, os
from playwright.async_api import async_playwright
URL = os.environ.get('HEART_URL') or 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
DLG = "() => { const b=document.getElementById('dlgTrade'); return [document.getElementById('dlgName').textContent,b.textContent,b.disabled]; }"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL, timeout=120000)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_HEART!=='undefined' && typeof __INN!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        await ev("() => GUILD.loadData({})")
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(900)
        await ev("() => { GAME.P.x=5.9*48; GAME.P.y=2.95*48+20; }")
        await pg.wait_for_timeout(300)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(1200)
        assert await ev("() => __INN.state().map") == 'inn2', '2층에 못 올라감'

        # 1) 숙련도 폐지
        assert await ev("() => GAME.gainMastery('sword',5)") is False
        assert await ev("() => GAME.masteryBonus('sword').dmg") == 0

        # 2) 낮: 실비아 치유는 닫혀 있다
        await ev("() => { GAME.P.hp=1; GAME.P.mp=1; {const q=GAIA_HEART.npcPos(); GAME.P.x=q.x; GAME.P.y=q.y+20;} }")
        await pg.wait_for_timeout(200)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        d = await ev(DLG)
        assert d == ['실비아', '밤에 열려요', True], d
        await ev("() => GAME.closeAll()")

        # 3) 밤으로 넘기면 열린다
        for _ in range(3):
            await ev("() => document.getElementById('place').click()")
        await ev("() => { {const q=GAIA_HEART.npcPos(); GAME.P.x=q.x; GAME.P.y=q.y+20;} }")
        await pg.wait_for_timeout(200)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        st = await ev("() => GAIA_HEART.state()")
        assert st['night'] and not st['done'], st
        d = await ev(DLG)
        assert d == ['실비아', '치유 시작', False], d

        # 4) 시작 → 결과(평균 50%) → 체력·마나 50% 회복, 오늘 끝
        await ev("() => document.getElementById('dlgTrade').click()")
        await pg.wait_for_timeout(600)
        assert (await ev("() => GAIA_HEART.state()"))['open'], '미니게임이 안 열림'
        mx = await ev("() => [GAME.P.maxHp, GAME.P.maxMp]")
        r = await ev("() => GAIA_HEART.debugResult(.5)")
        assert abs(r['heal'] - .5) < 1e-6, r
        hp = await ev("() => [GAME.P.hp, GAME.P.mp]")
        assert hp[0] == min(mx[0], 1 + round(mx[0] * .5)) and hp[1] >= min(mx[1], 1 + round(mx[1] * .5)), (hp, mx)   # 마나는 기다리는 동안 자연회복이 더해진다
        await ev("() => document.getElementById('gaiaHeartX').click()")
        await pg.wait_for_timeout(300)
        d = await ev(DLG)
        assert d == ['실비아', '오늘 치유는 끝', True], d
        assert not await ev("() => GAIA_HEART.start()"), '한 밤에 두 번 됨'
        await ev("() => GAME.closeAll()")
        # 못 터뜨려도 최소 20%
        await ev("() => GAIA_RENT.debugDays(1)")
        assert not (await ev("() => GAIA_HEART.state()"))['done'], '다음 날 밤에도 못 함'
        await ev("() => { GAME.P.hp=1; {const q=GAIA_HEART.npcPos(); GAME.P.x=q.x; GAME.P.y=q.y+20;} }")
        await pg.wait_for_timeout(200)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        await ev("() => document.getElementById('dlgTrade').click()")
        await pg.wait_for_timeout(600)
        r = await ev("() => GAIA_HEART.debugResult(0)")
        assert abs(r['heal'] - .2) < 1e-6, r
        await ev("() => document.getElementById('gaiaHeartX').click()")
        await ev("() => GAME.closeAll()")

        # 5) 아가사 스쿼트: 게임 속 하루에 1회
        await ev("() => GAIA_RENT.debugDays(1)")
        await ev("() => { {const q=GAIA_SQUAT.npcPos(); GAME.P.x=q.x; GAME.P.y=q.y+20;} }")
        await pg.wait_for_timeout(200)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        d = await ev(DLG)
        assert d == ['아가사', '단련 시작', False], d
        await ev("() => document.getElementById('dlgTrade').click()")
        await pg.wait_for_timeout(600)
        r = await ev("() => GAIA_SQUAT.debugResult(1)")
        assert r and r['n'] >= 3, r
        await ev("() => document.getElementById('gaiaSquatX').click()")
        await pg.wait_for_timeout(300)
        d = await ev(DLG)
        assert d == ['아가사', '오늘 단련은 끝', True], d
        await ev("() => GAME.closeAll()")
        await ev("() => GAIA_RENT.debugDays(1)")
        assert not await ev("() => GAIA_SQUAT.doneToday()"), '게임 하루가 지났는데 또 못 함'
        # 승급 조건 10건
        need = await ev("() => document.getElementById('guildMeta') ? document.getElementById('guildMeta').textContent : ''")
        print('길드 메타:', need)

        assert not errs, errs
        print('heart/squat ok', flush=True)
        await b.close()

asyncio.run(main())
