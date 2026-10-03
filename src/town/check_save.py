import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':1280,'height':720});pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)

        # 새 성장판은 시작 가방이 비어 있으므로 시험 장비를 만들어 넣고 저장/복원.
        await ev("""() => {
          const it=UI.make({kind:'weapon',wt:'staff',tier:2,roll:true,rar:2});
          UI.add(it); GAME.setGold(123);
          GAME.P.statPts=7; GAME.P.skillPts=3; GAME.P.lifePts=2;
          GAME.P.stats.str+=2; GAME.P.mastery.staff.lv=4; GAME.P.passives.precision=2;
          UI.save();
        }""")
        assert await ev("() => !!localStorage.getItem('arpg_save_v3')")
        assert not await ev("() => !!localStorage.getItem('arpg_save_v1')")
        assert not await ev("() => !!localStorage.getItem('arpg_save_v2')")

        await pg.reload();await pg.wait_for_timeout(1200)
        got=await ev("""() => ({
          gold:GAME.P.gold,str:GAME.P.stats.str,mastery:GAME.P.mastery.staff.lv,
          precision:GAME.P.passives.precision,statPts:GAME.P.statPts,skillPts:GAME.P.skillPts,
          lifePts:GAME.P.lifePts,bag:UI.bagItems().length
        })""")
        assert got['gold']==123,got
        assert got['str']>=7 and got['mastery']==4 and got['precision']==2,got
        assert got['statPts']==7 and got['skillPts']==3 and got['lifePts']==2,got
        assert got['bag']>=1,got
        assert not errs,errs
        print('save v3 ok',got)
        await b.close()

asyncio.run(main())
