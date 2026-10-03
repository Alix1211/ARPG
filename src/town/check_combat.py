import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)

        # 같은 T1 안에서도 플레이어 레벨을 따라 몬스터가 완만하게 강화.
        await ev("() => { GAME.P.lv=1; }")
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(750)
        m1=await ev("() => __FD.debugMonster()")
        await ev("() => { GAME.P.lv=4; }")
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(750)
        m4=await ev("() => __FD.debugMonster()")
        assert m1['tier']==1 and m4['tier']==1,(m1,m4)
        assert m1['mobLv']==1 and m4['mobLv']==4,(m1,m4)
        assert m4['maxHp']>m1['maxHp'] and m4['dmg']>=m1['dmg'],(m1,m4)

        # T1 봄 지역부터 눈에 띄는 고유행동 4종.
        ms=await ev("() => __FD.debugMonsters()")
        skills={x['type']:x['skill'] for x in ms}
        assert 'wolf' not in skills,skills
        assert skills.get('rabbit')=='dart',skills
        assert skills.get('goblin_scout')=='rock',skills
        assert skills.get('slime')=='splash',skills

        # 강화된 마법: 큰 계수/범위 + 상태이상.
        await ev("""() => {
          GAME.P.skillLv.fire1=1;GAME.P.skillLv.ice1=1;GAME.P.mp=99999;
          GAME.P.passives.magicGuide=0;
          GAME.cast('fire1');
        }""")
        fire=await ev("() => __CTRL.shots().filter(x=>x.kind==='fire').at(-1)")
        assert fire and fire['blast']>=100 and fire['status']=='burn' and fire['dmg']>=20,fire

        await ev("() => { GAME.clearCd(); GAME.cast('ice1'); }")
        ice=await ev("() => __CTRL.shots().filter(x=>x.kind==='ice').at(-1)")
        npel=await ev("() => __CTRL.shots().filter(x=>x.kind==='ice'&&!x.done).length")
        assert ice and npel>=3 and ice['status']=='slow' and ice['dmg']>=1,(ice,npel)

        assert not errs,errs
        print('combat overhaul ok',{'lv1':m1,'lv4':m4,'fire':fire,'ice':ice})
        await b.close()

asyncio.run(main())
