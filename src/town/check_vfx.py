import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
SHOT=os.environ.get('VFX_SHOT','')   # 값이 있으면 이 폴더에 확인용 화면을 저장

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1500)
        names=await ev("() => __VFX.names()")
        assert len(names)>=80,len(names)
        for _ in range(40):
            n=await ev("() => __VFX.loaded()")
            if n==len(names):break
            await pg.wait_for_timeout(250)
        assert n==len(names),(n,len(names))
        for need in ['burst_fire_0','burst_ice_2','hit_spark_0','hit_slash_0','shot_fire','shot_ice','shot_rock','ring_red','heal_green','status_icon_fire','status_ground_slow']:
            assert need in names,need
        await ev("() => __FD.enter('spring')");await pg.wait_for_timeout(900)
        await ev("() => { GAME.P.hp=GAME.P.maxHp; __FD.debugTarget(400,0); }")
        # 모든 종류의 스킬·타격 이펙트와 몬스터 공격 그림이 오류 없이 그려지는지
        types=['holyshield','resurrection','thunderstrike','fireburst','iceburst','icehit','heal','castfire','castice','slashpower','spinpower','spearthrust','spearburst','fistdash','quake','hit','hurt','kill','impact']
        for i,t in enumerate(types):
            await ev("([t,i]) => __VFX.spawn(t,-260+i*50,-60,60,{a:i*.5,crit:i%2==0})",[t,i])
        for i,k in enumerate(['rock','burn','slow','web','feather','bolt']):
            await ev("([k,i]) => __VFX.shot(k,-200+i*70,60,i*.5)",[k,i])
        for i,k in enumerate(['slime','lightning','cleave']):
            await ev("([k,i]) => __VFX.hazard(k,-120+i*120,120,48)",[k,i])
        await pg.wait_for_timeout(220)
        if SHOT:
            os.makedirs(SHOT,exist_ok=True);await pg.screenshot(path=os.path.join(SHOT,'vfx_a.png'))
        await pg.wait_for_timeout(450)
        if SHOT: await pg.screenshot(path=os.path.join(SHOT,'vfx_b.png'))
        # 몬스터·플레이어 상태이상 표시도 오류 없이 그려지는지
        await ev("() => { __FD.debugTarget(120,0); __VFX.monStatus(4,4,4); for (const k of ['burn','slow','stone','bleed']) __VFX.status(k,3); }")
        await pg.wait_for_timeout(250)
        if SHOT: await pg.screenshot(path=os.path.join(SHOT,'vfx_c.png'))
        await pg.wait_for_timeout(900)
        assert not errs,errs
        print('vfx ok',len(names),'images')
        await b.close()

asyncio.run(main())
