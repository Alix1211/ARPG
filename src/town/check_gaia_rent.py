"""여관 2층 월세 방(외상·월세·미납 시 2층 7일 금지) 시험. 먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다."""
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
TS = 48
BTN = "() => { const b=document.getElementById('dlgRest'); return [b.textContent,b.disabled]; }"


async def to_inn(pg, ev):
    assert await ev("() => __INN.enter()")
    await pg.wait_for_timeout(900)
    assert await ev("() => __INN.state().map") == 'inn'


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_RENT!=='undefined' && typeof __INN!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', flush=True)

        # 1) 처음: 외상 1,000G, 30일 안에
        await ev("() => GUILD.loadData({})")
        s = await ev("() => GAIA_RENT.state()")
        assert s['day'] == 0 and s['end'] == 30 and not s['paid'] and s['banLeft'] == 0, s

        await to_inn(pg, ev)
        await ev("() => __INN.open()")
        assert await ev(BTN) == ['방값 갚기 (1,000G)', False], await ev(BTN)
        # 금화 부족 → 거절
        await ev("() => GAME.setGold(300)")
        assert not await ev("() => __INN.rest()")
        assert await ev("() => GAME.P.gold") == 300
        # 갚기
        await ev("() => GAME.setGold(1500)")
        assert await ev("() => __INN.rest()")
        assert await ev("() => GAME.P.gold") == 500
        assert await ev(BTN) == ['방값 납부 완료', True]
        assert not await ev("() => __INN.rest()"), '두 번 낼 수 없음'

        # 2) 2층에 들어가면 체력·마나가 찬다
        await ev("() => { GAME.P.hp=1; GAME.P.mp=1; document.getElementById('dlg').classList.remove('on'); GAME.P.x=5.9*48; GAME.P.y=2.95*48+20; }")
        await pg.wait_for_timeout(300)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(1200)
        assert await ev("() => __INN.state().map") == 'inn2', '2층에 못 올라감'
        hp = await ev("() => [GAME.P.hp===GAME.P.maxHp, GAME.P.mp===GAME.P.maxMp]")
        assert hp == [True, True], hp

        # 3) 30일이 지나면 새 달: 안 냈으면 벌 없이 다시 납부 대기(낸 달), 그다음 달도 안 내면 2층 금지 7일
        s = await ev("() => GAIA_RENT.debugDays(30)")
        assert s['paid'] is False and s['end'] == 60 and s['banLeft'] == 0, s
        assert await ev("() => __INN.state().map") == 'inn2'
        s = await ev("() => GAIA_RENT.debugDays(30)")
        assert s['banLeft'] == 7, s
        await pg.wait_for_timeout(1200)
        assert await ev("() => __INN.state().map") == 'inn', '2층에 있다가 금지되면 아래층으로 내려와야 함'

        # 4) 금지 동안: 토비 거절, 계단 막힘, 감정 버튼은 계속
        await ev("() => __INN.open()")
        bt = await ev(BTN)
        assert bt[1] is True and '상대 안 해줌' in bt[0], bt
        assert not await ev("() => __INN.rest()")
        assert await ev("() => !document.getElementById('dlgIdentify').disabled"), '감정은 계속 쓸 수 있어야 함'
        await ev("() => { document.getElementById('dlg').classList.remove('on'); GAME.P.x=5.9*48; GAME.P.y=2.95*48+20; }")
        await pg.wait_for_timeout(300)
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(1000)
        assert await ev("() => __INN.state().map") == 'inn', '금지인데 2층에 올라감'

        # 5) 7일이 지나면 풀리고, 외상은 그대로 남아 새 30일
        s = await ev("() => GAIA_RENT.debugDays(7)")
        assert s['banLeft'] == 0 and s['paid'] is False and s['end'] == s['day'] + 30, s
        await ev("() => __INN.open()")
        bt = await ev(BTN)
        assert bt[1] is False and '(1,000G)' in bt[0], bt

        # 6) 저장·불러오기
        d = await ev("() => GUILD.saveData()")
        assert d['gday'] == 67 and d['rent']['end'] == 97, (d['gday'], d['rent'])
        await ev("(d) => GUILD.loadData(d)", d)
        s = await ev("() => GAIA_RENT.state()")
        assert s['day'] == 67 and s['end'] == 97, s
        assert not errs, errs
        await b.close()
        print('월세 방 시험 통과')

asyncio.run(main())
