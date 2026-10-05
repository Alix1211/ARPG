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
        final_ends={}
        final_layouts={}
        for ti,theme in enumerate(THEMES,1):
            st=await enter(pg,theme); timings.append(st['buildMs']); assert st['tier']==ti,(theme,st)
            assert len(st['village'])==0 and st['dungeons']==0,(theme,'intermediate',st)
            assert st['fieldSize']=={'w':48,'h':48},(theme,'outdoor-size',st)
            assert st['outdoorDungeon'] is True,(theme,'outdoor-dungeon',st)
            assert st['rooms']>=8,(theme,'room-count',st)
            assert st['walkableCells']>=300,(theme,'walkable-area',st)
            assert st['legs']==ti+1,(theme,'random-plus-final-count',st)
            assert st['props']>=80,(theme,'themed-boundary-props',st)
            await pg.evaluate("([t,l]) => __FD.enter(t,l)",[theme,ti+1]);await pg.wait_for_timeout(700)
            last=await pg.evaluate("() => __FD.state()")
            assert last['leg']==ti+1 and len(last['village'])==2 and last['dungeons']==1,(theme,'last',last)
            assert last['fieldSize']=={'w':48,'h':32},(theme,'fixed-last-size',last)
            assert last['outdoorDungeon'] is False,(theme,'last-must-be-fixed',last)
            assert all(v['x']>35*48 for v in last['village']),(theme,last['village'])
            final_ends[theme]=(round(last['end']['x'],1),round(last['end']['y'],1))
            final_layouts[theme]=tuple((p[0],p[1],p[2]) for p in last['layout'])
        assert len(set(final_ends.values()))>=5,final_ends
        assert len(set(final_layouts.values()))>=5,final_layouts
        a=await enter(pg,'summer'); layout_a=a['layout']; serial_a=a['serial']
        b=await enter(pg,'summer')
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
        assert leg2['theme']=='summer' and leg2['leg']==2 and leg2['outdoorDungeon'] is True,(leg2)
        await pg.evaluate("(p) => __FD.warp(p.x+.7,p.y)",leg2['end']);await pg.wait_for_timeout(1300)
        leg3=await pg.evaluate("() => __FD.state()")
        assert leg3['leg']==3 and len(leg3['village'])==2 and leg3['dungeons']==1,leg3
        await pg.evaluate("(p) => __FD.warp(p.x+.8,p.y)",leg3['end']);await pg.wait_for_timeout(300)
        assert await pg.evaluate("() => document.getElementById('regionPick').classList.contains('on')")
        await pg.click("#regionGrid button[data-theme=town]"); await pg.wait_for_timeout(900)
        out=await pg.evaluate("() => __FD.state()")
        assert out['map']=='out', out
        assert not errs, errs
        print('7 themed outdoor fields + unique final hubs + leg exits ok; build ms=',timings)
        await browser.close()
asyncio.run(main())
