import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
THEMES=['spring','summer','autumn','winter','ice','volcano','swamp']
async def enter(pg, theme):
    await pg.evaluate("(t) => __FD.enter(t)", theme)
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
        for theme in THEMES:
            st=await enter(pg,theme); timings.append(st['buildMs'])
        a=await enter(pg,'spring'); layout_a=a['layout']; serial_a=a['serial']
        b=await enter(pg,'spring')
        assert b['serial']>serial_a, (a,b)
        assert b['layout']!=layout_a, (layout_a,b['layout'])
        before=await pg.evaluate("() => ({lv:GAME.P.lv, exp:GAME.P.exp, stat:GAME.P.statPts||0, skill:GAME.P.skillPts||0})")
        await pg.evaluate("() => { GAME.P.exp = 99; }")
        assert await pg.evaluate("() => __FD.hitFirst()")
        await pg.wait_for_timeout(100)
        after=await pg.evaluate("() => ({lv:GAME.P.lv, exp:GAME.P.exp, stat:GAME.P.statPts||0, skill:GAME.P.skillPts||0})")
        assert after['lv']==before['lv']+1, (before,after)
        assert after['stat']>=before['stat']+5, (before,after)
        assert after['skill']>=before['skill']+1, (before,after)
        assert (await pg.evaluate("() => __FD.state()"))['drops']>=1
        await pg.evaluate("() => { __P.x=3.0*48; __P.y=20*48; }")
        await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(650); await pg.keyboard.up('ArrowLeft')
        await pg.wait_for_timeout(800)
        out=await pg.evaluate("() => __FD.state()")
        assert out['map']=='out', out
        assert not errs, errs
        print('field 7 themes ok; build ms=',timings)
        await browser.close()
asyncio.run(main())
