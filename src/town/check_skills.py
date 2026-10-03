import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
SHOT=os.environ.get('SKILL_SHOT','')   # 값이 있으면 이 폴더에 스킬별 확인 화면 저장

# 2차 묶음 스킬 10개: 배울 수 있고, 쓰면 맞은 적이 피해를 받고, 오류 없이 그려지는지
SKILLS=['fire2','fire3','ice2','bolt1','bolt2','dark1','dark3','sword3','bow2','fist2']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1500)
        # 스킬 포인트로 배울 수 있어야 한다
        for sid in SKILLS:
            ok=await ev("(id) => { GAME.P.skillPts=3; const r=GAME.investSkill(id); return [r, UI.skillRank(id)]; }",sid)
            assert ok==[True,1],(sid,ok)
        for sid in SKILLS:
            await ev("(id) => { GAME.P.skillLv[id]=1; }",sid)
        # 경직 면역: 우두머리는 첫 경직 뒤 잠시 면역
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
        fl=await ev("() => __FD.flinchTest()")
        assert fl[0]>.3 and fl[1]==0,fl
        # 공통 쿨타임: 한 스킬을 쓰면 다른 슬롯도 잠깐 잠긴다
        r=await ev("() => { GAME.clearCd(); GAME.P.mp=99999; GAME.P.skillLv.fire1=1; GAME.P.skillLv.ice1=1; const a=GAME.cast('fire1'); const c=GAME.cdLeft('ice1'); const b2=GAME.cast('ice1'); return [a,c>0,b2]; }")
        assert r==[True,True,False],r
        for sid in SKILLS:
            await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
            await ev("""(id) => { GAME.clearCd(); GAME.P.hp=GAME.P.maxHp; GAME.P.mp=99999; GAME.P.skillLv[id]=1;
              __P.dir='side'; __P.flip=false; __P.x+=500; __FD.debugTarget(110,0,true); }""",sid)
            before=await ev("() => __FD.debugMonster()")
            assert before,sid
            kind={'bolt1':'bolt','dark1':'dark','sword3':'blade','fist2':'wave','bow2':'bow'}.get(sid,'')
            res=await ev("([id,k]) => { const ok=GAME.cast(id,{dmg:1,mp:1}); return [ok, __CTRL.shots().filter(x=>x.kind===k&&!x.done).length]; }",[sid,kind])
            assert res[0],sid
            if sid=='fire3':
                assert await ev("() => GAME.P.castRoot>0"),'cast root'
            if kind:
                assert res[1]==(5 if sid=='bow2' else 1),(sid,res)
            await pg.wait_for_timeout(500)
            if SHOT:
                os.makedirs(SHOT,exist_ok=True);await pg.screenshot(path=os.path.join(SHOT,sid+'.png'))
            await pg.wait_for_timeout(1100)
            after=await ev("() => __FD.debugMonster()")
            assert after is None or after['hp']<before['hp'],(sid,before,after)
        # 마나가 모자라면 못 쓰고, 대상 없는 연쇄 벼락은 마나를 쓰지 않는다
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
        r=await ev("""() => { GAME.clearCd(); __FD.debugTarget(900,900); GAME.P.mp=50; GAME.P.skillLv.bolt2=1; const a=GAME.cast('bolt2'); return [a, GAME.P.mp]; }""")
        assert r==[False,50],r
        assert not errs,errs
        print('skills2 ok',SKILLS)
        await b.close()

asyncio.run(main())
