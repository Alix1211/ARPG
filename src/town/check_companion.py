import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1100)

        assert await ev("() => !!window.COMPANION")
        assert await ev("() => ['hero','knight'].every(id=>A.companions[id]&&['front','back','side'].every(d=>A.companions[id].fr[d].length===5))")
        assert not await ev("() => COMPANION.townTestsEnabled()")
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==0 and d['s']==0 and d['p']==0,d
        assert not await ev("() => {GAME.setGold(1000);return COMPANION.hire('hero');}")
        assert not await ev("() => {GAME.setGold(1000);return COMPANION.hire('knight');}")

        r=await ev("""() => {COMPANION.syncStory({active:{MAIN_015:{step:1}}},'field');return COMPANION.state();}""")
        assert r['active']=='hero' and r['mode']=='story' and r['storyQuest']=='MAIN_015',r
        r=await ev("""() => {COMPANION.syncStory({active:{}},'field');return COMPANION.state();}""")
        assert r['active'] is None,r

        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(700)
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==0,d
        assert await ev("() => __INN.leave()")
        await pg.wait_for_timeout(700)
        await ev("""() => QUEST.loadData({schema:3,active:{},completed:['MAIN_023'],items:{},visited:[],flags:{rusty_hireable:true}})""")
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(700)
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==1 and d['p']==1,d

        r=await ev("""() => {GAME.setGold(1000);const before=GAME.P.gold,fee=COMPANION.fee('knight'),base=COMPANION.previewDamage();
          const ok=COMPANION.hire('knight'),st=COMPANION.state();return {ok,before,after:GAME.P.gold,fee,base,st};}""")
        assert r['ok'] and r['st']['active']=='knight' and r['st']['mode']=='hire' and r['after']==r['before']-r['fee'],r
        assert r['st']['damage']==r['base'],r

        remain=await ev("() => COMPANION.state().remaining")
        r=await ev("""() => {COMPANION.syncStory({active:{MAIN_015:{step:1}}},'field');const a=COMPANION.state();
          COMPANION.syncStory({active:{}},'inn');return {during:a,after:COMPANION.state()};}""")
        assert r['during']['active']=='hero' and r['during']['mode']=='story',r
        assert r['after']['active']=='knight' and r['after']['mode']=='hire' and abs(r['after']['remaining']-remain)<.01,r

        await ev("() => UI.save()")
        raw=await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3')).companion")
        assert raw and raw['v']==2 and raw['active']=='knight' and raw['mode']=='hire',raw

        g=await ev("() => GAME.P.gold")
        await ev("() => COMPANION.onDefeat()")
        r=await ev("() => ({active:COMPANION.state().active,gold:GAME.P.gold})")
        assert r['active'] is None and r['gold']==g,r

        assert await ev("() => __INN.leave()")
        await pg.wait_for_timeout(700)
        await ev("() => COMPANION.setTownTestsEnabled(true)")
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==2 and d['p']==2,d
        await ev("() => COMPANION.setTownTestsEnabled(false)")
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==0 and d['p']==0,d

        assert not errs,errs
        print('companion final ok: hidden tests, story join/leave, inn unlock, paid Rusty')
        await b.close()

asyncio.run(main())
