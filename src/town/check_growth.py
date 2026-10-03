import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL); await pg.wait_for_timeout(1100)

        # 70레벨 / 7티어 기본 곡선
        assert await ev("() => GAME.levelTier(1)") == 1
        assert await ev("() => GAME.levelTier(11)") == 2
        assert await ev("() => GAME.levelTier(61)") == 7
        assert await ev("() => GAME.expNeed(60) > GAME.expNeed(20)") is True
        assert await ev("() => GAME.targetKillsForLevel(60) > GAME.targetKillsForLevel(5)") is True
        assert await ev("() => __DUN.floorTier(1)") == 1
        assert await ev("() => __DUN.floorTier(4)") == 2
        assert await ev("() => __DUN.floorTier(19)") == 7

        # 스탯 투자가 실제 전투 수치에 반영
        before=await ev("() => UI.combatMods().phys")
        await ev("() => { GAME.P.statPts=1; GAME.investStat('str'); }")
        after=await ev("() => UI.combatMods().phys")
        assert after > before, (before,after)

        # 패시브 실제 효과
        c0=await ev("() => UI.combatMods().crit")
        await ev("() => { GAME.P.skillPts=3; GAME.investPassive('precision'); }")
        c1=await ev("() => UI.combatMods().crit")
        assert c1 >= c0+1.9, (c0,c1)

        # 액티브 스킬 랭크 투자
        r0=await ev("() => UI.skillRank('fire1')")
        await ev("() => { if(GAME.P.skillPts<1) GAME.P.skillPts=1; GAME.investSkill('fire1'); }")
        r1=await ev("() => UI.skillRank('fire1')")
        assert r1==r0+1, (r0,r1)

        # 생활스킬 자동 해금 + 투자 효과
        await ev("() => { GAME.P.lv=40; GAME.P.lifePts=10; GAME.syncLifeUnlocks(true); }")
        q0=await ev("() => TRADE.quote('town','obsidian').buy")
        find0=await ev("() => UI.findBonus()")
        await ev("() => { GAME.investLife('discount'); GAME.investLife('moneyScent'); }")
        q1=await ev("() => TRADE.quote('town','wheat').buy")
        find1=await ev("() => UI.findBonus()")
        assert q1 < q0, (q0,q1)
        assert find1 > find0, (find0,find1)

        # 무기 숙련은 개별 성장, 현재 활 성능에도 반영
        m0=await ev("() => GAME.P.mastery.bow.lv")
        dmg0=await ev("() => UI.combatMods().phys")
        await ev("() => GAME.gainMastery('bow', GAME.masteryNeed(GAME.P.mastery.bow.lv))")
        m1=await ev("() => GAME.P.mastery.bow.lv")
        dmg1=await ev("() => UI.combatMods().phys")
        assert m1==m0+1, (m0,m1)
        assert dmg1 >= dmg0, (dmg0,dmg1)

        # T7 드랍은 9~10단계 장비 + 접두/접미 옵션
        gear=await ev("""() => {
          const it=UI.make({kind:'weapon',wt:'staff',tier:7,roll:true,rar:2});
          return {tier:it.tier,g:it.g,rar:it.rar,aff:it.aff.length,name:it.name,st:it.st};
        }""")
        assert gear['tier']==7 and gear['g']>=9, gear
        assert gear['rar']==2 and gear['aff']>=2, gear
        assert gear['name'] and 'undefined' not in gear['name'], gear

        # v3 세이브 구조
        await ev("() => UI.save()")
        assert await ev("() => !!localStorage.getItem('arpg_save_v3')")
        assert not errs, errs
        print('growth ok', {'phys':(before,after),'crit':(c0,c1),'trade':(q0,q1),'find':(find0,find1),'mastery':(m0,m1),'gear':gear})
        await b.close()

asyncio.run(main())
