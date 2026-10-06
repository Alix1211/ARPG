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
        assert await ev("() => A.npcs.filter(n=>n.companion).length===2")

        r=await ev("""() => { GAME.setGold(1000); const before=GAME.P.gold; const base=COMPANION.previewDamage(); const fee=COMPANION.fee('knight'); const ok=COMPANION.hire('knight'); const s=COMPANION.state(); return {ok,before,after:GAME.P.gold,fee,active:s.active,damage:s.damage,base}; }""")
        assert r['ok'] and r['active']=='knight' and r['after']==r['before']-r['fee'],r
        assert r['damage']==r['base'],r

        r=await ev("""() => { const before=GAME.P.gold,fee=COMPANION.fee('hero'); const ok=COMPANION.hire('hero'); return {ok,before,after:GAME.P.gold,fee,state:COMPANION.state()}; }""")
        assert r['ok'] and r['state']['active']=='hero' and r['after']==r['before']-r['fee'],r

        await ev("() => UI.save()")
        raw=await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3')).companion")
        assert raw and raw['active']=='hero' and raw['damage']>0,raw
        await pg.reload();await pg.wait_for_timeout(1300)
        assert await ev("() => COMPANION.state().active==='hero'")

        r=await ev("() => {COMPANION.debugExpire();return COMPANION.debugTick(.016);}")
        assert r['active'] is None,r

        await ev("() => {GAME.setGold(1000);COMPANION.hire('knight');}")
        g=await ev("() => GAME.P.gold")
        await ev("() => COMPANION.onDefeat()")
        r=await ev("() => ({active:COMPANION.state().active,gold:GAME.P.gold})")
        assert r['active'] is None and r['gold']==g,r

        # 시험용 광장 NPC는 그림뿐 아니라 상호작용/충돌까지 제거, 재생성으로 부활하지 않음.
        await ev("() => COMPANION.setTownTestsEnabled(false)")
        await pg.wait_for_timeout(100)
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==0 and d['s']==0 and d['p']==0,d
        await ev("() => {COMPANION.ensureTownTests();COMPANION.onDefeat();}")
        assert await ev("() => COMPANION.diagnostics().n===0")
        await ev("() => COMPANION.setTownTestsEnabled(true)")
        d=await ev("() => COMPANION.diagnostics()")
        assert d['n']==2 and d['p']==2,d

        assert not errs,errs
        print('companion ok')
        await b.close()

asyncio.run(main())
