import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
SHOT=os.environ.get('SKILL_SHOT','')   # 값이 있으면 이 폴더에 스킬별 확인 화면 저장

# 2차 묶음 스킬 10개: 배울 수 있고, 쓰면 맞은 적이 피해를 받고, 오류 없이 그려지는지
SKILLS=['ice3','bolt3','dark2','fire2','fire3','ice2','bolt1','bolt2','dark1','dark3','sword3','spear1','spear2','spear3','bow1','bow2','bow3','fist1','fist2','fist3']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1500)
        # 선행 스킬이 없는 것은 바로, 2·3번째는 직전 스킬 Lv3 이후에 배울 수 있어야 한다.
        for sid in SKILLS+['holy2_shield','holy3_revive']:
            pre=await ev("id => GAME.skillPrereq(id)",sid)
            if pre['id']:
                locked=await ev("(x) => { GAME.P.skillLv[x.id]=0; GAME.P.skillLv[x.pre]=2; GAME.P.skillPts=3; return GAME.investSkill(x.id); }",{'id':sid,'pre':pre['id']})
                assert locked is False,(sid,pre,locked)
                ok=await ev("(x) => { GAME.P.skillLv[x.id]=0; GAME.P.skillLv[x.pre]=3; GAME.P.skillPts=3; const r=GAME.investSkill(x.id); return [r, UI.skillRank(x.id)]; }",{'id':sid,'pre':pre['id']})
            else:
                ok=await ev("(id) => { GAME.P.skillLv[id]=0; GAME.P.skillPts=3; const r=GAME.investSkill(id); return [r, UI.skillRank(id)]; }",sid)
            assert ok==[True,1],(sid,pre,ok)
            assert await ev("id => UI.assignQuick(0,id) && UI.quickSlots()[0]===id",sid),sid
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
              const st=__FD.state(); __P.dir='side'; __P.flip=false; __P.x=(st.start.x+1.1)*48; __P.y=st.start.y*48; __FD.debugTarget(id==='bolt1'?58:110,0,true); }""",sid)
            before=await ev("() => __FD.debugMonster()")
            assert before,sid
            kind={'bolt1':'bolt','sword3':'blade','spear2':'spear','bow1':'bow','fist2':'wave','bow2':'bow'}.get(sid,'')
            res=await ev("([id,k]) => { const mp=GAME.P.mp; const ok=GAME.cast(id,{dmg:1,mp:1}); return [ok, __CTRL.shots().filter(x=>x.kind===k&&!x.done).length,GAME.P.mp<mp,GAME.cdLeft(id)>0]; }",[sid,kind])
            assert res[0] and res[2] and res[3],(sid,res)
            if sid=='fire3':
                assert await ev("() => GAME.P.castRoot>0"),'cast root'
            if kind:
                assert res[1]==(5 if sid=='bow2' else 3 if sid=='bolt1' else 1),(sid,res)
            await pg.wait_for_timeout(500)
            if SHOT:
                os.makedirs(SHOT,exist_ok=True);await pg.screenshot(path=os.path.join(SHOT,sid+'.png'))
            await pg.wait_for_timeout(1100)
            after=await ev("() => __FD.debugMonster()")
            assert after is None or after['hp']<before['hp'],(sid,before,after)
        # 성역 방패는 피해를 흡수하고 얼음 폭발을 빌려 쓰지 않는다.
        r=await ev("""() => { GAME.clearCd();GAME.P.mp=99999;GAME.P.skillLv.holy2_shield=4;
          const mp=GAME.P.mp,ok=GAME.cast('holy2_shield'),hp=GAME.P.hp,shield=GAME.P.shield;
          __FD.hurtTest(100);return [ok,GAME.P.mp<mp,GAME.cdLeft('holy2_shield')>0,GAME.P.shield<shield,GAME.P.hp===hp,GAME.P.shieldKind,GAME.P.shieldT]; }""")
        assert r[:6]==[True,True,True,True,True,'holy'] and r[6]==8,r
        # 소생은 MP 0인 준비형 스킬: 발동 후 180초, 제자리/금화 유지, 1회만 발동.
        await ev("() => {GAME.P.shield=0;GAME.P.reviveArmed=false;GAME.P.reviveReadyAt=0;GAME.P.skillLv.holy3_revive=1;GAME.clearCd();}")
        r=await ev("""() => {const p=GAME.P,mp=p.mp,gold=p.gold,x=p.x,y=p.y,ok=GAME.cast('holy3_revive');
          const cd=GAME.cdLeft('holy3_revive')>0;__FD.hurtTest(p.maxHp*100);
          return [ok,p.mp===mp,cd,Math.abs(p.hp/p.maxHp-.3)<.001,p.x===x&&p.y===y,p.gold===gold,!p.reviveArmed,p.reviveReadyAt>Date.now()+179000];}""")
        assert all(r),r
        await ev("() => UI.save()")
        await pg.reload();await pg.wait_for_timeout(1200)
        r=await ev("() => {GAME.clearCd();return [GAME.cdLeft('holy3_revive')>0,GAME.cast('holy3_revive'),GAME.P.reviveArmed];}")
        assert r==[True,False,False],r
        await ev("() => {GAME.P.reviveReadyAt=0;GAME.P.reviveGrace=0;GAME.P.skillLv.holy3_revive=5;GAME.clearCd();GAME.cast('holy3_revive');__FD.hurtTest(GAME.P.maxHp*100);}")
        assert await ev("() => GAME.P.hp===GAME.P.maxHp"),'rank5 revive'
        # 마나가 모자라면 못 쓰고, 대상 없는 연쇄 벼락은 마나를 쓰지 않는다
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
        r=await ev("""() => { GAME.clearCd(); __FD.debugTarget(900,900); GAME.P.mp=50; GAME.P.skillLv.bolt2=1; const a=GAME.cast('bolt2'); return [a, GAME.P.mp]; }""")
        assert r==[False,50],r
        assert not errs,errs
        print('skills2 ok',SKILLS)
        await b.close()

asyncio.run(main())
