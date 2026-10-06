import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        checks=[(1,1),(10,1),(11,2),(20,2),(21,3),(31,4),(41,5),(51,6),(61,7),(70,7)]
        for lv,tier in checks:
            got=await ev("""lv=>{GAME.P.lv=lv;const a=__SHOP.goods('arms'),p=__SHOP.goods('pawn');
              return {tier:__SHOP.tier(),arms:a.map(x=>GEAR_BASE[x.spec.baseId].tier),pawn:p.map(x=>GEAR_BASE[x.spec.baseId].tier),
                req:a.map(x=>x.requiredLevel)};}""",lv)
            assert got['tier']==tier,(lv,tier,got)
            assert got['arms'] and all(x==tier for x in got['arms']),(lv,got)
            assert got['pawn'] and all(x==tier for x in got['pawn']),(lv,got)
            assert all(x<=lv for x in got['req']),(lv,got)

        # 지역은 판매 장비 티어/목록에 영향 없음.
        await ev("() => {GAME.P.lv=35}")
        ids1=await ev("() => __SHOP.goods('arms').map(x=>x.spec.baseId)")
        await ev("() => __FD.enter('volcano',1)");await pg.wait_for_timeout(700)
        ids2=await ev("() => __SHOP.goods('arms').map(x=>x.spec.baseId)")
        assert ids1==ids2,(ids1,ids2)
        assert len(ids1)>=9,ids1
        assert not errs,errs
        print('shop level tier ok',checks,ids1)
        await b.close()

asyncio.run(main())
