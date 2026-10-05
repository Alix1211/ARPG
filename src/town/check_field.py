import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
THEMES=['spring','summer','autumn','winter','ice','volcano','swamp']
async def enter(pg, theme):
    await pg.evaluate("(t) => __FD.enter(t,1)", theme)
    await pg.wait_for_timeout(650)
    st=await pg.evaluate("() => __FD.state()")
    assert st['map']=='field', (theme,st)
    assert st['theme']==theme, (theme,st)
    assert st['props']>=40, (theme,st)
    assert st['monsters']>=12, (theme,st)
    assert st['stuckSpawns']==0, (theme,st)
    return st
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(); pg=await browser.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        timings=[]
        for ti,theme in enumerate(THEMES,1):
            st=await enter(pg,theme); timings.append(st['buildMs']); assert st['tier']==ti,(theme,st)
            if ti>1:
                assert len(st['village'])==0 and st['dungeons']==0,(theme,'intermediate',st)
                assert st['fieldSize']=={'w':48,'h':48},(theme,'outdoor-size',st)
                assert st['routePoints']>=7 and st['branches']==2,(theme,'outdoor-route',st)
                assert st['routeLength']>st['routeDirect']*1.25,(theme,'route-too-straight',st)
                await pg.evaluate("([t,l]) => __FD.enter(t,l)",[theme,ti]);await pg.wait_for_timeout(700)
                last=await pg.evaluate("() => __FD.state()")
            else:
                last=st
            assert last['leg']==ti and len(last['village'])==2 and last['dungeons']==1,(theme,'last',last)
            assert last['fieldSize']=={'w':60,'h':40},(theme,'fixed-last-size',last)
            assert all(v['x']>44*48 for v in last['village']),(theme,last['village'])
        a=await enter(pg,'spring'); layout_a=a['layout']; serial_a=a['serial']
        b=await enter(pg,'spring')
        assert b['serial']>serial_a, (a,b)
        assert b['layout']!=layout_a, (layout_a,b['layout'])
        before=await pg.evaluate("() => ({lv:GAME.P.lv, exp:GAME.P.exp, stat:GAME.P.statPts||0, skill:GAME.P.skillPts||0})")
        await pg.evaluate("() => { GAME.P.exp = GAME.expNeed(GAME.P.lv) - 1; }")
        assert await pg.evaluate("() => __FD.hitFirst()")
        await pg.wait_for_timeout(100)
        after=await pg.evaluate("() => ({lv:GAME.P.lv, exp:GAME.P.exp, stat:GAME.P.statPts||0, skill:GAME.P.skillPts||0})")
        assert after['lv']==before['lv']+1, (before,after)
        assert after['stat']>=before['stat']+5, (before,after)
        assert after['skill']>=before['skill']+1, (before,after)
        assert (await pg.evaluate("() => __FD.state()"))['drops']>=1
        # 다구간 지역은 실제 길 끝(오른쪽 위)에서 다음 칸으로 넘어가고, 마지막 칸 끝에서 목적지를 고른다.
        await pg.evaluate("() => __FD.enter('summer',1)");await pg.wait_for_timeout(700)
        mid=await pg.evaluate("() => __FD.state()")
        await pg.evaluate("(p) => __FD.warp(p.x+.7,p.y)",mid['end']);await pg.wait_for_timeout(1300)
        leg2=await pg.evaluate("() => __FD.state()")
        assert leg2['theme']=='summer' and leg2['leg']==2,(leg2)
        assert len(leg2['village'])==2 and leg2['dungeons']==1,leg2
        await pg.evaluate("() => __FD.warp(59,8)");await pg.wait_for_timeout(300)
        assert await pg.evaluate("() => document.getElementById('regionPick').classList.contains('on')")
        await pg.click("#regionGrid button[data-theme=town]"); await pg.wait_for_timeout(900)
        out=await pg.evaluate("() => __FD.state()")
        assert out['map']=='out', out
        assert not errs, errs
        print('field 7 themes + final village/cave + leg exits ok; build ms=',timings)
        await browser.close()
asyncio.run(main())
