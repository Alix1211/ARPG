"""살아있는 세계(gaia_life.js) 시험: 100일·마을 진입 조우·실비아의 보물·사냥 잡담. 먼저 build_gaia_preview.py 로 시험 판을 만들어 둔다.
스크린샷은 환경변수 LIFE_SHOT_DIR 아래에 저장한다."""
import asyncio, os
from playwright.async_api import async_playwright
URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../gaia_preview/GAIA-3PARTY-TEST.html'))
SHOT = os.environ.get('LIFE_SHOT_DIR', '/tmp')
ST = "() => GAIA_LIFE.state()"
LINE = "() => ({name:document.getElementById('dlgName').textContent, line:document.getElementById('dlgLine').textContent, img:document.getElementById('dlgImg').style.visibility, btn:document.getElementById('dlgQuest').textContent, on:document.getElementById('dlg').classList.contains('on'), paused:!!window.GAIA_EVENT_PAUSE})"


async def play_through(pg, ev, tag, shots=()):
    """대화창이 끝날 때까지 '다음'을 누르며 줄을 모은다."""
    seen = []
    for i in range(30):
        s = await ev(LINE)
        seen.append(s)
        if i in shots:
            await pg.screenshot(path=f'{SHOT}/life_{tag}_{i}.png')
        await ev("() => document.getElementById('dlgQuest').click()")
        await pg.wait_for_timeout(120)
        if not (await ev(ST))['busy']:
            break
    return seen


async def wait_busy(pg, ev, secs=6):
    for _ in range(secs * 5):
        if (await ev(ST))['busy']:
            return True
        await pg.wait_for_timeout(200)
    return False


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto(URL)
        for _ in range(120):
            if await ev("() => typeof GAIA_LIFE!=='undefined' && typeof GUILD!=='undefined' && typeof __FD!=='undefined' && typeof __DUN!=='undefined'"):
                break
            await pg.wait_for_timeout(1000)
        await pg.wait_for_timeout(1500)
        print('로드 완료', await ev("() => GAIA_LIFE.counts()"), flush=True)

        # 1) 100일: 99일에는 안 뜨고, 100일이 되면 어디서든 뜬다
        await ev("() => GUILD.loadData({gday:99})")
        await pg.wait_for_timeout(1500)
        assert not (await ev(ST))['busy'], '99일에 뜨면 안 됨'
        await ev("() => GUILD.loadData({gday:100})")
        assert await wait_busy(pg, ev), '100일에 대화가 안 뜸'
        first = await ev(LINE)
        assert first['on'] and first['paused'], first
        assert first['name'] == '아가사', first
        seen = await play_through(pg, ev, 'd100', shots=(0, 5))
        names = [s['name'] for s in seen]
        assert len(seen) == 9 and set(names) <= {'아가사', '실비아', '카일'}, names
        assert seen[-1]['btn'] == '확인', seen[-1]
        st = await ev(ST)
        assert st['life']['d100'] and not st['busy']
        assert not (await ev(LINE))['paused'] and not (await ev(LINE))['on']
        await pg.wait_for_timeout(1500)
        assert not (await ev(ST))['busy'], '100일이 두 번 뜸'
        print('100일 OK', flush=True)

        # 2) 마을 진입 조우: 마을사람은 초상 없이 이름표만
        await ev("() => GUILD.loadData({gday:1})")
        await ev("() => __FD.enter('spring')"); await pg.wait_for_timeout(1200)
        await ev("() => __FD.enterVillage('spring')")
        assert await wait_busy(pg, ev, 12), '마을 진입 조우가 안 뜸'
        s0 = await ev(LINE)
        assert s0['name'] == '마을사람1' and s0['img'] == 'hidden', s0
        seen = await play_through(pg, ev, 'town_spring', shots=(0, 4))
        assert any(s['img'] == 'visible' for s in seen[1:]), '파티 대사에서 초상이 다시 보여야 함'
        assert (await ev(ST))['life']['towns'].get('spring') == 1
        # 두 번째 방문엔 안 뜬다
        await ev("() => __FD.leaveVillage()"); await pg.wait_for_timeout(1500)
        await ev("() => __FD.enterVillage('spring')"); await pg.wait_for_timeout(4000)
        assert not (await ev(ST))['busy'], '같은 마을에 또 뜸'
        print('마을 조우 OK', flush=True)

        # 3) 사냥 잡담: 전투 중엔 기다리고, 안전해지면 뜬다
        await ev("() => __FD.leaveVillage()"); await pg.wait_for_timeout(1500)
        await ev("() => __FD.enter('spring')"); await pg.wait_for_timeout(1500)
        await ev("() => GAIA_LIFE.setPending(true)")
        await ev("() => { for (let i=0;i<60;i++) __FD.testOp(i,'clear'); }")
        assert await wait_busy(pg, ev, 5), '안전한데 잡담이 안 뜸'
        seen = await play_through(pg, ev, 'chat', shots=(0,))
        assert 1 <= len(seen) <= 8
        n = (await ev(ST))['life']['chat']
        assert n >= 1
        # 쿨타임: 방금 뜬 직후에는 pending 을 켜도 안 뜬다
        await ev("() => { GAIA_LIFE.setPending(true); }")
        await ev("() => GAIA_LIFE.fire('chat')")  # 시험용 강제
        await play_through(pg, ev, 'chat2')
        print('사냥 잡담 OK', flush=True)

        # 4) 실비아의 보물: 던전 2층에서 한 번, 가방에 0골드로 들어온다
        await ev("() => GUILD.loadData({gday:1})")
        assert await ev("() => __DUN.go(2)")
        await pg.wait_for_timeout(2500)
        await ev("() => { for (let i=0;i<80;i++) __FD.testOp(i,'clear'); }")
        got = await wait_busy(pg, ev, 8)
        assert got, '던전 2층에서 보물 장면이 안 뜸'
        seen = await play_through(pg, ev, 'treasure', shots=(2,))
        assert (await ev(ST))['life']['treasure']
        dump = await ev("() => JSON.stringify(UI.saveData ? UI.saveData() : {})")
        assert '실비아의 보물' in dump, '보물이 가방에 없음'
        print('보물 OK', flush=True)

        assert not errs, errs
        await b.close()
        print('전부 통과')

asyncio.run(main())
