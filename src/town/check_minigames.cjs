const {chromium}=require('playwright');const assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const base=path.resolve(__dirname,'../..');const server=http.createServer((req,res)=>{const p=path.join(base,decodeURIComponent(req.url.split('?')[0]));const ext=path.extname(p);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[ext]||'application/octet-stream');fs.createReadStream(p).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.TAVERN_CHROMIUM||(fs.existsSync('/tmp/tavern-chromium')?'/tmp/tavern-chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url())});
 await page.goto(process.env.ARPG_TEST_URL||`http://127.0.0.1:${server.address().port}/game/town.html`);await page.waitForFunction(()=>window.MINIGAMES&&window.UI?.save);
 await page.evaluate(()=>{GAME.setGold(5000);UI.save();});
 const supplyBefore=await page.evaluate(()=>MINIGAMES.supplyState().orange);
 const breadBefore=await page.evaluate(()=>MINIGAMES.supplyState().bread),goldBeforeLoot=await page.evaluate(()=>GAME.P.gold);
 assert.equal(await page.evaluate(()=>MINIGAMES.addSupplyLoot('bread',2)),true);
 assert.equal(await page.evaluate(()=>MINIGAMES.supplyState().bread),breadBefore+2);
 assert.equal(await page.evaluate(()=>GAME.P.gold),goldBeforeLoot);
 assert.equal(await page.evaluate(()=>MINIGAMES.buySupply('orange',5)),true);
 assert.equal(await page.evaluate(()=>GAME.P.gold),4920);
 assert.equal(await page.evaluate(()=>MINIGAMES.supplyState().orange),supplyBefore+5);
 assert.equal(await page.evaluate(()=>MINIGAMES.openSupplyShop()),true);
 await page.waitForSelector('#tavernSupplyShop:not([hidden])');
 const supplyLayout=await page.evaluate(()=>{
   const row=document.querySelector('.supply-row'),info=row?.querySelector('div:not(.supply-buy)'),buttons=[...document.querySelectorAll('.supply-buy button')],ret=document.querySelector('#minigameReturn');
   const rr=row?.getBoundingClientRect(),ir=info?.getBoundingClientRect();
   return {rowWidth:rr?.width||0,infoWidth:ir?.width||0,buttons:buttons.slice(0,3).map(b=>({w:b.getBoundingClientRect().width,scroll:b.scrollWidth,client:b.clientWidth})),retZ:Number(getComputedStyle(ret).zIndex)||0,retPointer:getComputedStyle(ret).pointerEvents};
 });
 assert.ok(supplyLayout.rowWidth>300);assert.ok(supplyLayout.infoWidth>120);
 assert.ok(supplyLayout.buttons.every(b=>b.w<120&&b.scroll<=b.client+2));
 assert.ok(supplyLayout.retZ>=50);assert.equal(supplyLayout.retPointer,'auto');
 await page.click('#minigameReturn');
 assert.equal(await page.evaluate(()=>document.querySelector('#minigameHost').hidden),true);
 assert.equal(await page.evaluate(()=>GAME.isPaused()),false);
 const before=await page.evaluate(()=>({pos:GAME.locationState(),hp:GAME.P.hp,day:window.__D.t}));
 await page.click('#settingsBtn');await page.click('#minigamesBtn');await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>GAME.isPaused()),true);const pausedDay=await page.evaluate(()=>__D.t);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__D.t),pausedDay);
 await page.click('[data-mini="tavern"]');
 let f=await (await page.$('#minigameFrame')).contentFrame();await f.waitForFunction(()=>window.tavern&&window.MiniHost?.flush);
 assert.equal(await f.evaluate(()=>tavern.cash),4920);
 assert.deepEqual(await f.evaluate(()=>tavern.team),[0,1,2]);
 assert.equal(await f.evaluate(()=>tavern.inventory.orange),supplyBefore+5);
 assert.equal((await f.evaluate(()=>tavern.purchase('orange',1))).ok,false);
 await f.evaluate(()=>{tavern.start();tavern.step(3);MiniHost.flush();});
 let count=await f.evaluate(()=>tavern.generated);assert.ok(count>0);
 await page.click('#minigameReturn');assert.equal(await page.evaluate(()=>GAME.isPaused()),false);
 const after=await page.evaluate(()=>({pos:GAME.locationState(),hp:GAME.P.hp}));assert.deepEqual(after.pos,before.pos);assert.equal(after.hp,before.hp);
 await page.evaluate(()=>MINIGAMES.open());await page.click('[data-mini="tavern"]');f=await (await page.$('#minigameFrame')).contentFrame();await f.waitForFunction(()=>window.tavern&&window.MiniHost?.flush);
 assert.equal(await f.evaluate(()=>tavern.generated),count);assert.equal(await f.evaluate(()=>tavern.state),'open');
 const round=await f.evaluate(()=>{
  const g=tavern,D=TavernData;let iterations=0;
  for(;iterations<3000&&g.state!=='result';iterations++){
   if(g.waitingId!==null){const t=g.tables.find(t=>t.guestId===null);if(t){g.chooseGuest();g.seat(t.id);}}
   for(const t of g.tables){
    const guest=g.guest(t.guestId);if(!guest)continue;
    if(t.staffId===null&&guest.state==='seated'){const staff=g.team.map(i=>g.staff[i]).filter(s=>s.tableId===null).sort((a,b)=>g.compatibility(guest,b)-g.compatibility(guest,a))[0];if(staff){g.selectStaff(staff.id);g.assign(t.id);}}
    if(guest.request&&t.staffId!==null){
     g.openRequest(t.id);const type=guest.request.type;
     if(['drink','food','alcohol'].includes(type)){const menu=D.MENUS.find(m=>m.category===type&&m.tag===guest.preferences[type])||D.MENUS.find(m=>m.category===type);if(!g.inventory[menu.id])g.purchase(menu.id,5);if(!g.chooseMenu(menu.id).ok)g.declineMenu();}
     else if(type==='checkout')g.chooseCheckout(false);
     else if(type==='extension')g.chooseExtension(false);
     else if(type==='service')g.chooseService(D.SERVICES.find(s=>s.need===guest.need)?.id||D.SERVICES[0].id);
     g.panel=null;g.selection=null;
    }
   }
   g.step(.2);g.drainEvents();
  }
  MiniHost.flush();return {state:g.state,cash:g.cash,generated:g.generated,completed:g.completed,sales:g.result?.sales,wages:g.result?.wages};
 });assert.equal(round.state,'result');assert.ok(round.completed>0);assert.ok(round.sales>0);assert.ok(round.wages>0);assert.equal(await page.evaluate(()=>GAME.P.gold),round.cash);count=round.generated;
 await f.evaluate(()=>MiniHost.flush());await page.waitForTimeout(80);
 const runs=await page.evaluate(()=>MINIGAMES.runs());assert.ok(runs.length>=1);assert.equal(runs.at(-1).teamCount,3);assert.ok(runs.at(-1).realSeconds>=0);

 await page.click('#minigameReturn');
 await page.evaluate(()=>GAME.setGold(20000));
 assert.deepEqual(await page.evaluate(()=>MINIGAMES.bubbleEconomy(1)),{tier:1,reference:1000,fee:100});
 await page.evaluate(()=>MINIGAMES.open());await page.click('[data-mini="bubble-pang"]');f=await (await page.$('#minigameFrame')).contentFrame();await f.waitForFunction(()=>window.MiniHost?.flush&&window.BUBBLE_ARPG_STATS);await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>GAME.P.gold),19900);
 assert.equal(await f.evaluate(()=>document.querySelectorAll('img').length),0);
 assert.equal(await f.evaluate(()=>!!document.getElementById('rightPanel')),false);
 assert.equal(await f.evaluate(()=>!!document.getElementById('portraitSlot')),true);
 await f.evaluate(()=>{BUBBLE_ARPG_STATS.popped=50;});
 const bubbleClear=await f.evaluate(()=>MiniHost.finishBubbleRound('clear'));
 assert.equal(bubbleClear.outcome,'clear');assert.ok(bubbleClear.reward>=800&&bubbleClear.reward<=1900);
 assert.equal(bubbleClear.lootRolls,10);assert.equal(bubbleClear.loot.rolls,10);assert.ok(bubbleClear.loot.found>=0&&bubbleClear.loot.found<=10);
 assert.equal(await page.evaluate(()=>GAME.P.gold),19900+bubbleClear.reward);
 await page.click('#minigameReturn');
 await page.evaluate(()=>MINIGAMES.open());await page.click('[data-mini="bubble-pang"]');f=await (await page.$('#minigameFrame')).contentFrame();await f.waitForFunction(()=>window.MiniHost?.flush&&window.BUBBLE_ARPG_STATS);
 await f.evaluate(()=>{BUBBLE_ARPG_STATS.popped=17;});
 const bubbleFail=await f.evaluate(()=>MiniHost.finishBubbleRound('fail'));assert.equal(bubbleFail.reward,0);assert.equal(bubbleFail.lootRolls,3);
 await page.click('#minigameReturn');

 await page.evaluate(()=>GAME.setGold(20000));await page.evaluate(()=>MINIGAMES.open('arena'));await page.waitForSelector('#arenaWager:not([hidden])');
 assert.equal(await page.$eval('#arenaStake',e=>Number(e.min)),1000);assert.equal(await page.$eval('#arenaStake',e=>Number(e.step)),1000);
 await page.fill('#arenaStake','1000');await page.selectOption('#arenaSide','left');await page.click('#arenaEnter');f=await (await page.$('#minigameFrame')).contentFrame();await f.waitForFunction(()=>window.ArenaPreview&&window.MiniHost);
 assert.equal((await f.evaluate(()=>MiniHost.beginArena())).stake,1000);assert.equal(await page.evaluate(()=>GAME.P.gold),19000);
 let ar=await f.evaluate(()=>MiniHost.finishArena('left'));assert.deepEqual({status:ar.status,bank:ar.bank,streak:ar.streak},{status:'won',bank:2000,streak:1});assert.equal(await page.evaluate(()=>GAME.P.gold),19000);
 assert.equal((await f.evaluate(()=>MiniHost.arenaDecision('continue'))).status,'continue');
 ar=await f.evaluate(()=>MiniHost.finishArena('left'));assert.deepEqual({status:ar.status,bank:ar.bank,streak:ar.streak},{status:'won',bank:4000,streak:2});
 assert.equal((await f.evaluate(()=>MiniHost.arenaDecision('continue'))).status,'continue');
 ar=await f.evaluate(()=>MiniHost.finishArena('left'));assert.deepEqual({status:ar.status,payout:ar.payout,streak:ar.streak},{status:'jackpot',payout:8000,streak:3});assert.equal(await page.evaluate(()=>GAME.P.gold),27000);
 assert.equal(await f.evaluate(()=>MiniHost.finishArena('left')),false);
 assert.equal(await f.evaluate(()=>MiniHost.repeatArena()),true);assert.equal((await f.evaluate(()=>MiniHost.beginArena())).stake,1000);assert.equal(await page.evaluate(()=>GAME.P.gold),26000);
 ar=await f.evaluate(()=>MiniHost.finishArena('right'));assert.equal(ar.status,'lost');assert.equal(await page.evaluate(()=>GAME.P.gold),26000);
 assert.equal(await f.evaluate(()=>MiniHost.repeatArena()),true);assert.equal((await f.evaluate(()=>MiniHost.beginArena())).stake,1000);assert.equal(await page.evaluate(()=>GAME.P.gold),25000);
 ar=await f.evaluate(()=>MiniHost.finishArena('left'));assert.equal(ar.bank,2000);ar=await f.evaluate(()=>MiniHost.arenaDecision('cashout'));assert.deepEqual({status:ar.status,payout:ar.payout,streak:ar.streak},{status:'cashed',payout:2000,streak:1});assert.equal(await page.evaluate(()=>GAME.P.gold),27000);
 const settled=await page.evaluate(()=>GAME.P.gold);
 await page.click('#minigameReturn');await page.reload();await page.waitForFunction(()=>window.MINIGAMES&&window.UI?.save);
 const saved=await page.evaluate(()=>MINIGAMES.saveData());assert.equal(saved.tavern.generated,count);assert.equal(saved.arena.played,3);assert.equal(saved.arena.wins,4);assert.equal(saved.arena.losses,1);assert.equal(await page.evaluate(()=>GAME.P.gold),settled);
 // Existing saves without minigames still load with empty minigame progress.
 await page.addInitScript(()=>{if(localStorage.arpg_save_v3){const d=JSON.parse(localStorage.arpg_save_v3);delete d.minigames;localStorage.arpg_save_v3=JSON.stringify(d);}});await page.reload();await page.waitForFunction(()=>window.MINIGAMES&&window.UI?.save);assert.equal(await page.evaluate(()=>MINIGAMES.saveData().tavern),null);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 await page.click('#settingsBtn');await page.click('#minigamesBtn');await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'/tmp/arpg-minigame-lobby.png'});
 console.log('PASS: tavern economy, image-free ARPG bubble shooter with monster-equivalent loot, arena stake/outcome/idempotence, reload and legacy save; no JS or asset errors.');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
