"""가이아 길드 실내 시험: 문 출입, 접수대 대화(초상), 하르트, 게시판, 용병 배회, 저장 위치.
먼저 python3 src/town/build_gaia_preview.py 로 gaia_preview/GAIA-3PARTY-TEST.html 을 만들어 둔다.
스크린샷은 인자로 준 폴더(없으면 건너뜀)에 저장한다.
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
SHOT = sys.argv[1] if len(sys.argv) > 1 else None
TS = 48


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAME!=='undefined' && typeof GAIA_GUILD!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        assert await ev("() => !!A.guild && A.guild.props.length>5"), '길드 지도 자료가 없음'
        assert await ev("() => !!(A.gaiaGuild&&A.gaiaGuild.recep&&A.gaiaGuild.recep.has)"), '접수원 자료가 없음'
        assert await ev("() => (A.gaiaDlg.receptionist||'').startsWith('data:image')"), '접수원 대화 초상이 없음'

        # 문 앞에서 들어가기
        await ev("() => {GAME.P.x=1104;GAME.P.y=603;}")
        await pg.wait_for_timeout(400)
        near = await ev("() => GAME.near()&&GAME.near().kind")
        assert near == 'guild_door', near
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(900)
        assert await ev("() => GAIA_GUILD.state().map==='guild'"), '길드에 들어가지 못함'
        st = await ev("() => GAME.locationState()")
        assert st['map'] == 'town', st   # 저장 위치는 마을

        await pg.wait_for_timeout(600)
        if SHOT:
            await pg.screenshot(path=SHOT + '/guild_in.png')

        # 접수대: 대화창에 접수원 초상
        await ev(f"() => {{GAME.P.x=7*{TS};GAME.P.y=4.5*{TS};}}")
        await pg.wait_for_timeout(400)
        nm = await ev("() => GAME.near()&&GAME.near().name")
        assert nm == '접수대', nm
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(400)
        r = await ev("() => [dlgName.textContent, dlgTitle.textContent, dlgLine.textContent, dlgImg.src.slice(0,22), dlgTrade.textContent, dlgTrade.hidden]")
        assert r[0] == '접수원' and r[3].startswith('data:image') and r[4] == '의뢰 보기' and not r[5], r
        print('접수원 대화:', r[2])
        if SHOT:
            await pg.screenshot(path=SHOT + '/guild_recep_dialog.png')
        await ev("() => document.getElementById('dlgTrade').click()")
        await pg.wait_for_timeout(300)
        assert await ev("() => document.getElementById('guild').classList.contains('on')"), '접수원에게서 의뢰창이 열려야 함'
        await ev("() => GAME.closeAll()")

        # 하르트
        await ev(f"() => {{GAME.P.x=9.2*{TS};GAME.P.y=4.2*{TS}+20;}}")
        await pg.wait_for_timeout(400)
        nm = await ev("() => GAME.near()&&GAME.near().name")
        assert nm == '하르트', nm
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        assert await ev("() => dlgName.textContent==='하르트' && dlgTrade.textContent==='의뢰 보기'")
        await ev("() => GAME.closeAll()")

        # 게시판
        await ev(f"() => {{GAME.P.x=4.0*{TS};GAME.P.y=2.25*{TS}+40;}}")
        await pg.wait_for_timeout(400)
        nm = await ev("() => GAME.near()&&GAME.near().name")
        assert nm == '의뢰 게시판', nm
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(300)
        assert await ev("() => document.getElementById('guild').classList.contains('on')")
        await ev("() => GAME.closeAll()")

        # 용병이 홀을 오간다(가이아 용병 시장)
        await pg.wait_for_timeout(3000)
        if SHOT:
            await ev(f"() => {{GAME.P.x=7*{TS};GAME.P.y=7.4*{TS};}}")
            await pg.wait_for_timeout(500)
            await pg.screenshot(path=SHOT + '/guild_hall.png')

        # 나가기 → 마을
        await ev(f"() => {{GAME.P.x=7*{TS};GAME.P.y=8.5*{TS};}}")
        await pg.wait_for_timeout(400)
        nm = await ev("() => GAME.near()&&GAME.near().name")
        assert nm == '출입문', nm
        await ev("() => GAME.act()")
        await pg.wait_for_timeout(900)
        assert await ev("() => GAIA_GUILD.state().map==='town'"), '길드에서 나오지 못함'
        # 마을에 하르트가 남아 있지 않아야 한다
        assert not await ev("() => GAME.npcs ? GAME.npcs().some(n=>n.name==='하르트') : false")

        assert not errs, errs
        print('가이아 길드 실내: 출입·접수대 초상 대화·하르트·게시판·나가기 통과')
        await b.close()

asyncio.run(main())
