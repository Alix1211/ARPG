"""새 지도·구매 잠금·16개 기술·저장·버프·장면 정리 회귀검사."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720});errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  await pg.goto((ROOT/'game/town.html').as_uri());await pg.wait_for_function('window.GAME&&window.SAGE&&window.UI&&__VFX.loaded()===__VFX.names().length')
  await pg.evaluate('()=>GAME.resumeLocation({map:"out",x:15*48,y:18.3*48,dir:"front"})');await pg.wait_for_timeout(200)
  await pg.evaluate('()=>GAME.act()');await pg.wait_for_timeout(750)
  assert (await pg.evaluate('()=>GAME.locationState()'))['map']=='sage'
  assert not await pg.evaluate('()=>GAME.walkableAt(350,330)')
  assert await pg.evaluate('()=>GAME.walkableAt(1100,750)')
  await pg.screenshot(path='/tmp/sage-map.png')
  await pg.evaluate('()=>{GAME.P.x=880;GAME.P.y=675;}');await pg.wait_for_timeout(200)
  await pg.evaluate('()=>GAME.act()');await pg.locator('#dlgTrade').click()
  assert await pg.locator('#sageShop button[data-skill]').count()==16
  assert await pg.locator('#sageShop button[data-skill]:disabled').count()==16
  assert not await pg.evaluate('()=>SAGE.learn("sword4_whirl")')
  # 구매 함수: 가격 확정 후 차감·재구매 차단·스킬포인트 우회 금지.
  purchase=await pg.evaluate('''()=>{const s=SAGE.skills.sword4_whirl;s.price=100;GAME.P.gold=101;GAME.P.skillLv.sword4_whirl=0;
   const ok=SAGE.learn('sword4_whirl');const again=SAGE.learn('sword4_whirl');GAME.P.skillPts=100;
   const invest=GAME.investSkill('sword4_whirl');s.price=null;return [ok,again,invest,GAME.P.gold,GAME.P.skillLv.sword4_whirl];}''')
  assert purchase==[True,False,False,1,1],purchase
  assert await pg.evaluate('()=>{const before=GAME.P.skillLv.bow5_charge||0;const ok=SAGE.trial("bow5_charge");return ok&&GAME.P.skillLv.bow5_charge===before;}')
  await pg.evaluate('()=>GAME.closeAll()')
  ids=await pg.evaluate('()=>Object.keys(SAGE.skills)')
  for sid in ids:
   await pg.evaluate('()=>__FD.enter("spring")');await pg.wait_for_timeout(500)
   state=await pg.evaluate('''id=>{GAME.closeAll();GAME.clearCd();GAME.P.mp=999999;GAME.P.skillLv[id]=3;
    if(!__FD.debugSkillTarget(100))throw Error('test corridor');const m=__FD.debugMonster();
    const before=m.hp;const mods=UI.combatMods();const ok=GAME.cast(id);return {ok,before,mods};}''',sid)
   assert state['ok'],sid
   if sid in ['sword5_fury','bow6_agility','spear5_vigor','fist6_guard']:
    key={'sword5_fury':'phys','bow6_agility':'move','spear5_vigor':'maxHp','fist6_guard':'damageReduce'}[sid]
    assert (await pg.evaluate('()=>UI.combatMods()'))[key]>state['mods'][key],sid
   await pg.wait_for_timeout(2400)
   after=await pg.evaluate('()=>({hp:(__FD.debugMonster()||{hp:0}).hp,mods:UI.combatMods(),state:SAGE.state()})')
   if SAGE_BUFF(sid):
    assert after['state']['buffs'],sid
   else:assert after['hp']<state['before'],(sid,state['before'],after['hp'])
   if sid in ['sword4_whirl','bow5_charge','fist4_clones','spear7_heaven']:
    # 별도의 실제 시전 화면은 다음 프레임 루프에서 캡처.
    await pg.evaluate('id=>{GAME.clearCd();GAME.P.mp=999999;GAME.cast(id)}',sid);await pg.wait_for_timeout(300)
    await pg.screenshot(path='/tmp/sage-'+sid+'.png')
   assert not errors,(sid,errors)
  await pg.evaluate('()=>GAME.resumeLocation({map:"sage",x:1190,y:910})');await pg.wait_for_timeout(200)
  assert await pg.evaluate('()=>SAGE.state().acts===0')
  await pg.evaluate('()=>{GAME.P.x=1190;GAME.P.y=1000;}');await pg.wait_for_timeout(750)
  assert (await pg.evaluate('()=>GAME.locationState()'))['map']=='out'
  # 저장한 배움은 재실행 뒤에도 유지한다.
  await pg.evaluate('()=>{GAME.P.skillLv.bow5_charge=2;UI.save()}');await pg.reload();await pg.wait_for_function('window.GAME&&window.SAGE&&window.UI')
  assert await pg.evaluate('()=>GAME.P.skillLv.bow5_charge===2')
  assert not errors,errors
  print('ok sage: map, collision, 16 skills, purchase lock/charge/save, scene cleanup')
  await b.close()
def SAGE_BUFF(sid):return sid in ['sword5_fury','bow6_agility','spear5_vigor','fist6_guard']
asyncio.run(main())
