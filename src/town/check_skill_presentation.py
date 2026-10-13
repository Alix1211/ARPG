import asyncio,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
SHOTS=Path(os.environ['SKILL_PRESENTATION_SHOT']) if os.environ.get('SKILL_PRESENTATION_SHOT') else None
if SHOTS:SHOTS.mkdir(parents=True,exist_ok=True)
CASES=[('sword2',240),('sword3',250),('spear2',180),('spear3',220),('bow2',180),('bow3',600),('fist2',220),('fist3',290),('fire2',230),('fire3',980),('ice2',240),('ice3',550),('bolt2',140),('bolt3',550),('dark2',600),('dark3',260),('holy2_shield',260),('holy3_revive',240)]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch();page=await browser.new_page(viewport={'width':1280,'height':720});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto((ROOT/'game/town.html').as_uri());await page.wait_for_function('window.GAME && window.__FD && window.__SKILL_SHOW && __VFX.loaded()===__VFX.names().length')
  await page.evaluate('()=>__FD.enter("spring")');await page.wait_for_timeout(800)
  for sid,delay in CASES:
   await page.evaluate('()=>__FD.enter("spring")');await page.wait_for_timeout(600)
   ok=await page.evaluate('''id=>{
    __SKILL_SHOW.clear();GAME.clearCd();__VFX.status('stone',0);GAME.P.hp=GAME.P.maxHp;GAME.P.mp=999999;GAME.P.shield=0;GAME.P.skillLv[id]=3;GAME.P.reviveArmed=false;GAME.P.reviveReadyAt=0;
    if(!__FD.debugSkillTarget(100))throw Error('no clear test lane');
    return GAME.cast(id);
   }''',sid)
   assert ok,sid
   state=await page.evaluate('()=>__SKILL_SHOW.state()');assert state['pose']==sid and state['effects']>0,(sid,state)
   await page.wait_for_timeout(delay)
   if SHOTS:await page.screenshot(path=str(SHOTS/(sid+'.png')))
   await page.wait_for_timeout(150)
   assert not errors,(sid,errors)
  # 필드 재생성 시 이전 시전 연출과 장판도 남지 않아야 한다.
  await page.evaluate('()=>__FD.enter("spring")');await page.wait_for_timeout(800)
  assert await page.evaluate('()=>__SKILL_SHOW.state().effects===0 && __SKILL_SHOW.state().pose===null')
  # 메뉴를 열면 도약과 연출 시계도 멈춰야 한다.
  await page.evaluate('()=>{__SKILL_SHOW.clear();GAME.clearCd();GAME.P.mp=999999;GAME.P.skillLv.spear3=3;GAME.cast("spear3");}')
  await page.click('#bagBtn');await page.wait_for_timeout(850)
  assert await page.evaluate('()=>__SKILL_SHOW.state().pose==="spear3"')
  await page.click('#charClose');await page.wait_for_timeout(2000)
  st=await page.evaluate('()=>__SKILL_SHOW.state()');assert st['pose'] is None and st['stop']==0,st
  assert not errors,errors
  print('PASS: 18 upgraded skills render; cast poses active; menu freezes presentation; hit stop expires; no page errors')
  await browser.close()
asyncio.run(main())
