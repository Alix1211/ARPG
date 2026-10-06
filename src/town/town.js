(function(){
'use strict';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const TS = A.map.ts; let MWp = 0, MHp = 0;
function load(s){ const i = new Image(); i.src = s; return i; }
const MAPS = {
  town: { name: '마을', map: A.map, ground: A.ground, mini: A.mini, blds: A.blds, props: A.props, npcs: A.npcs },
  out: { ...A.out },
  inn: { ...A.inn },
};
let G = null, MINI = null, MAP = 'town', CUR = MAPS.town;
for (const id in MAPS){ MAPS[id].G = load(MAPS[id].ground); MAPS[id].MINI = load(MAPS[id].mini); }
const BI = {}; for (const k in A.b) BI[k] = load(A.b[k]);
const EL = {}; for (const d in A.elf) EL[d] = A.elf[d].map(load);
$('face').src = A.face; $('ringImg').src = A.kit.pring;
$('tag').style.backgroundImage = `url(${A.ui['06']})`;
document.documentElement.style.setProperty('--panel', `url(${A.ui['04']})`);
document.documentElement.style.setProperty('--slot', `url(${A.ui['14']})`);
document.documentElement.style.setProperty('--slotOn', `url(${A.ui['15']})`);
document.documentElement.style.setProperty('--banner', `url(${A.ui['06']})`);
for (const [v, k] of [['--oct', '18'], ['--x', 'h_close'], ['--tab0', 'h_bag'], ['--swapI', 'h_swap'], ['--hpbar', 'hpbar'], ['--mpbar', 'mpbar'], ['--ring', 'ring']]) document.documentElement.style.setProperty(v, `url(${A.kit[k]})`);
$('tabEq').style.backgroundImage = `url(${A.kit.tab1})`; $('tabSt').style.backgroundImage = `url(${A.kit.tab4})`; $('tabSk').style.backgroundImage = `url(${A.kit.tab3})`; $('tabTr').style.backgroundImage = `url(${A.kit.tab2})`;
const rand = (a, b) => a + Math.random() * (b - a);

// ======================= 배치 =======================
const solids = [], spots = [], sprites = [], trees = [], npcs = [], dummies = [], exits = [];
let lamps = [];
let townPortalReturn=null,portalArrivalUntil=0;
let lastVisitedTown={map:'town'};
const TOWN_PORTAL_X=26.15*TS,TOWN_PORTAL_Y=19.15*TS;
const VILLAGE_PORTAL_X=16*TS,VILLAGE_PORTAL_Y=17.5*TS;
function portalAnchor(id=MAP){return id==='fieldvillage'?[VILLAGE_PORTAL_X,VILLAGE_PORTAL_Y]:[TOWN_PORTAL_X,TOWN_PORTAL_Y];}
function normalizeTownHome(h){
  if(h&&h.map==='fieldvillage'&&h.theme)return {map:'fieldvillage',theme:h.theme,villageReturn:h.villageReturn?JSON.parse(JSON.stringify(h.villageReturn)):null};
  return {map:'town'};
}
function lastVisitedTownState(){return JSON.parse(JSON.stringify(lastVisitedTown));}
function loadLastVisitedTown(h){lastVisitedTown=normalizeTownHome(h);return lastVisitedTownState();}
function markTownArrival(id){
  if(id==='town')lastVisitedTown={map:'town'};
  else if(id==='fieldvillage'&&window.__FD){
    const st=__FD.state();lastVisitedTown=normalizeTownHome({map:'fieldvillage',theme:st.theme||'spring',villageReturn:st.villageReturn||null});
  }else return false;
  if(window.UI&&UI.save)UI.save();
  return true;
}
function buildWorld(id){
  MAP = id; CUR = MAPS[id]; G = CUR.G; MINI = CUR.MINI; MWp = CUR.map.w * TS; MHp = CUR.map.h * TS;
  for (const L of [solids, spots, sprites, trees, npcs, dummies, exits]) L.length = 0;
const hasNpc = new Set(CUR.npcs.map(n => n.at).filter(Boolean));
for (const b of CUR.blds){
  const gate = b.k === 'gate_twin_tower';
  const fw = b.w * (b.k === 'watchtower' ? 0.5 : 0.8);
  if (gate){ // 성문은 양쪽 탑만 막고 가운데는 문 앞까지 걸어갈 수 있게
    solids.push({ x0: b.x - b.w * 0.48, x1: b.x - b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x + b.w * 0.17, x1: b.x + b.w * 0.48, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x - b.w * 0.17, x1: b.x + b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.2 });
    exits.push({ x0: b.x - b.w * 0.15, x1: b.x + b.w * 0.15, y0: b.y - b.h * 0.42 - 22, y1: b.y - b.h * 0.42 + 2, to: 'out' });
  } else solids.push({ x0: b.x - fw / 2, x1: b.x + fw / 2, y0: b.y - b.h * 0.36, y1: b.y - b.h * 0.1 });
  sprites.push({ img: BI[b.k], x: b.x, y: b.y, w: b.w, h: b.h, key: b.y - b.h * 0.1 });
  if(id==='town'&&b.k==='house_blue')spots.push({name:'여관 입구',x:b.x+b.door*b.w,y:b.y-b.h*.06,r:48,kind:'inn_door'});
  if (b.noSpot || b.k === 'watchtower' || hasNpc.has(b.k)) continue;
  spots.push({ name: b.name, x: b.x + b.door * b.w, y: gate ? b.y - b.h * 0.42 - 14 : b.y - b.h * 0.06, r: gate ? 60 : 46, kind: b.kind || (gate ? 'gate' : 'bld'), market: b.market || CUR.market || null });
}
for (const p of CUR.props){
  if (p.kind === 'gatewall'){ // 성벽: 가운데 문만 비우고 막음
    solids.push({ x0: p.x - p.w * 0.5, x1: p.x - p.w * 0.1, y0: p.y - p.h * 0.45, y1: p.y - 4 }, { x0: p.x + p.w * 0.1, x1: p.x + p.w * 0.5, y0: p.y - p.h * 0.45, y1: p.y - 4 }, { x0: p.x - p.w * 0.1, x1: p.x + p.w * 0.1, y0: p.y - p.h * 0.45, y1: p.y - p.h * 0.12 });
    sprites.push({ img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.y - 6 });
    spots.push({ name: p.name, x: p.x, y: p.y - p.h * 0.08, r: 56, kind: 'exit' });
    exits.push({ x0: p.x - p.w * 0.1, x1: p.x + p.w * 0.1, y0: p.y - p.h * 0.12 - 2, y1: p.y - p.h * 0.12 + 20, to: 'town' });
    continue;
  }
  if (p.cw > 0) solids.push({ x0: p.x - p.w * p.cw / 2, x1: p.x + p.w * p.cw / 2, y0: p.y - p.cd, y1: p.y - 2 });
  const s = { img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.flat ? -1e9 : p.y - 4, tree: p.tree, shadow: p.shadow, ph: Math.random() * 7, pink: p.k === 'tree_blossom', mimic:p.mimic,flame:p.flame,stash:p.kind==='stash' };
  sprites.push(s); if (p.tree) trees.push(s);
  if (p.kind === 'dummy'){ s.dummy = { hp: 0, wob: 0, ph: 0 }; dummies.push(s); }
  if (p.name) spots.push({ name: p.name, x: p.x, y: p.flat ? p.y - p.h / 2 : p.y + 16, r: p.r || (p.flat ? 40 : 46), kind: p.kind || 'prop', data: p, prop: s });
}
for (const n of CUR.npcs){
  if(n.companionTest&&window.COMPANION&&!COMPANION.townTestsEnabled())continue;
  if(n.companion&&window.COMPANION&&COMPANION.isActive(n.companion))continue;
  npcs.push({ ...n, img: BI[n.k], ph: Math.random() * 7, key: n.y });
}
for (const n of npcs){
  solids.push({ x0: n.x - 13, x1: n.x + 13, y0: n.y - 12, y1: n.y - 1 });
  sprites.push(n);
  spots.push({ name: n.name, x: n.x, y: n.y + 6, r: 50, kind: 'npc', npc: n });
}
  if((id==='town'||id==='fieldvillage')&&townPortalReturn){
    const [px,py]=portalAnchor(id);
    sprites.push({portal:true,x:px,y:py,w:112,h:98,key:py-2});
    spots.push({name:'귀환 포탈',x:px,y:py,r:58,kind:'town_portal'});
  }
  if (CUR.exits) exits.push(...CUR.exits);
  if (CUR.solids) solids.push(...CUR.solids);
  if(id==='inn')spots.push({name:'출입문',x:7*TS,y:9.0*TS,r:58,kind:'inn_exit'});
  if(id==='fieldvillage'&&typeof resetFieldVils==='function')resetFieldVils();
  lamps = CUR.props.filter(p => p.k.startsWith('lamp') || p.kind === 'fire').map(p => p.kind === 'fire' ? { x: p.x, y: p.y - p.h * 0.45, r: 150 } : { x: p.x + (p.k === 'lamp_iron' ? p.w * 0.28 : p.w * 0.3), y: p.y - p.h * 0.8, r: 120 });
  $('place').dataset.map = CUR.name || '마을';
  if (window.__FD_READY && typeof afterDynamicBuild === 'function') afterDynamicBuild(id);
  if(window.QUEST)QUEST.onWorld();
}
buildWorld('town');

// ======================= 플레이어 =======================
// 수치 규모: 체력·마나·공격·방어·경험치 같은 정수 수치는 '기준 단위 × NUM'으로 다룬다(세분화된 수치 변화용). 스킬표(SK)·몬스터 기준값 등은 기준 단위로 적고 쓰는 곳에서 곱한다.
const NUM = 100;
const P = { name:'루크레아', x:23*TS, y:22.2*TS, r:11, dir:'back', flip:false, moving:false, t:0, gold:300,
  hp:40*NUM, mp:28*NUM, maxHp:40*NUM, maxMp:28*NUM, lv:1, exp:0, statPts:0, skillPts:0, lifePts:0,
  stats:{str:5,vit:5,int:5,mag:6,dex:8,luck:3},
  mastery:{sword:{lv:0,xp:0},spear:{lv:0,xp:0},gauntlet:{lv:0,xp:0},bow:{lv:0,xp:0},staff:{lv:0,xp:0}},
  skillLv:{holy2_shield:0,holy3_revive:0,ice3:0,bolt3:0,dark2:0,fire1:1,ice1:0,holy1_heal:0,sword1:0,sword2:0,fire2:0,fire3:0,ice2:0,bolt1:0,bolt2:0,dark1:0,dark3:0,sword3:0,spear1:0,spear2:0,spear3:0,bow1:0,bow2:0,bow3:0,fist1:0,fist2:0,fist3:0},
  passives:{magicGuide:0,precision:0,rapid:0,manaFlow:0,survival:0,greed:0},
  lifeSkills:{}, portalReadyAt:0 };
function blocked(x, y){
  if (x < P.r || y < P.r + 20 || x > MWp - P.r || y > MHp - 6) return true;
  if (CUR.grid && gridBlocked(x, y, P.r)) return true;   // 던전 벽
  for (const s of solids){
    const cx = Math.max(s.x0, Math.min(x, s.x1)), cy = Math.max(s.y0, Math.min(y, s.y1));
    if ((x - cx) ** 2 + (y - cy) ** 2 < P.r * P.r) return true;
  }
  return false;
}
function move(dx, dy){
  if (!blocked(P.x + dx, P.y)) P.x += dx;
  if (!blocked(P.x, P.y + dy)) P.y += dy;
}
function walkableAt(x,y){
  if(blocked(x,y))return false;
  let n=0;
  for(const [dx,dy] of [[16,0],[-16,0],[0,16],[0,-16]]) if(!blocked(x+dx,y+dy)) n++;
  return n>=2;
}
function nearestSafePosition(x,y){
  if(walkableAt(x,y))return [x,y];
  const radii=[12,24,36,48,64,80,96,120,144];
  for(const r of radii){
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,cx=x+Math.cos(a)*r,cy=y+Math.sin(a)*r;
      if(walkableAt(cx,cy))return [cx,cy];
    }
  }
  return [x,y];
}
function setGold(v){ const old=P.gold;P.gold = v; $('gold').textContent = '금화 ' + v; $('shopGold').textContent = v;if(window.TELEMETRY)TELEMETRY.gold(v-old); }
setGold(P.gold);

const LEVEL_CAP=70;
const TIER_LEVELS=[[1,10],[11,20],[21,30],[31,40],[41,50],[51,60],[61,70]];
const PASSIVE_DEF={
  magicGuide:{name:'마력 유도',max:3,desc:'마법 투사체 유도 거리·회전력 증가'},
  precision:{name:'정밀 타격',max:5,desc:'치명타 확률 +2%/Lv'},
  rapid:{name:'연속 동작',max:5,desc:'공격 속도 +3%/Lv'},
  manaFlow:{name:'마력 순환',max:5,desc:'스킬 마나 소모 -4%/Lv'},
  survival:{name:'생존 본능',max:5,desc:'받는 피해 -3%/Lv'},
  greed:{name:'탐욕의 눈',max:5,desc:'아이템 발견 +5%, 골드 +3%/Lv'}
};
const LIFE_DEF={
  townPortal:{name:'타운 포탈',unlock:3,max:3,desc:['15분 재사용','8분 재사용','3분 재사용']},
  identify:{name:'감정',unlock:7,max:3,desc:['마법 장비 감정','희귀 장비 감정','전설 장비 감정']},
  discount:{name:'디스카운트',unlock:12,max:5,desc:['구매가 -2%','구매가 -4%','구매가 -6%','구매가 -8%','구매가 -10%']},
  overcount:{name:'오버카운트',unlock:18,max:5,desc:['판매가 +2%','판매가 +4%','판매가 +6%','판매가 +8%','판매가 +10%']},
  enchant:{name:'마법부여',unlock:25,max:5,desc:['기본 마법부여','비용 -8%','비용 -16%','비용 -24%','비용 -32%']},
  moneyScent:{name:'돈 냄새',unlock:35,max:5,desc:['희귀품 탐지 +5%','+10%','+15%','+20%','+25%']}
};
const LIFE_UNLOCK=Object.entries(LIFE_DEF).map(([k,v])=>[v.unlock,k,v.name]);
function levelTier(lv=P.lv){return Math.max(1,Math.min(7,Math.floor((Math.max(1,lv)-1)/10)+1));}
function tierMinLevel(t){return Math.max(1,(Math.max(1,t)-1)*10+1);}
function tierMaxLevel(t){return Math.min(LEVEL_CAP,Math.max(1,t)*10);}
function syncLifeUnlocks(silent=false){
  P.lifeSkills=P.lifeSkills||{};const got=[];
  for(const [lv,key,name] of LIFE_UNLOCK){
    if(P.lv>=lv && !P.lifeSkills[key]){P.lifeSkills[key]=1;got.push(name);}
  }
  if(!silent&&got.length)say('생활스킬 해금: '+got.join(', '));
  return got;
}
function lifeRank(k){return (P.lifeSkills&&P.lifeSkills[k])||0;}
function expNeed(lv){
  lv=Math.max(1,Math.min(LEVEL_CAP,lv||1));
  return Math.round((120+18*(lv-1)+2.2*Math.pow(lv-1,1.55))*NUM);
}
function targetKillsForLevel(lv){
  return Math.min(240,90+Math.floor(Math.max(1,lv)*2.2));
}
function questExp(kind,lv=P.lv){
  const frac={guild:.08,side:.18,main:.32,boss:.12,explore:.05}[kind]||0;
  return Math.max(1,Math.round(expNeed(lv)*frac));
}
function gainQuestExp(kind){return gainExp(questExp(kind));}
function masteryNeed(lv){
  lv=Math.max(0,Math.min(49,lv||0));
  return Math.round(25+12*lv+1.2*lv*lv);
}
function masteryBonus(wt){
  const lv=(P.mastery&&P.mastery[wt]?P.mastery[wt].lv:0)||0;
  return {lv,dmg:lv*.5,as:lv*.15};
}
function gainMastery(wt,amount=1){
  const m=P.mastery&&P.mastery[wt];if(!m)return false;
  m.xp=(m.xp||0)+Math.max(0,amount);let up=0;
  while(m.lv<50&&m.xp>=masteryNeed(m.lv)){m.xp-=masteryNeed(m.lv);m.lv++;up++;}
  if(up){say((typeof WN!=='undefined'&&WN[wt]?WN[wt]:wt)+' 숙련 '+m.lv+'!');if(window.UI&&UI.refresh)UI.refresh();}
  if(window.UI&&UI.save)UI.save();
  return true;
}
function investStat(key){
  if(!['str','vit','int','mag','dex'].includes(key)||P.statPts<1)return false;
  P.stats[key]=(P.stats[key]||0)+1;P.statPts--;if(window.UI&&UI.refresh)UI.refresh();if(window.UI&&UI.save)UI.save();return true;
}
const SKILL_PREV={fire2:'fire1',fire3:'fire2',ice2:'ice1',ice3:'ice2',bolt2:'bolt1',bolt3:'bolt2',dark2:'dark1',dark3:'dark2',
  holy2_shield:'holy1_heal',holy3_revive:'holy2_shield',sword2:'sword1',sword3:'sword2',spear2:'spear1',spear3:'spear2',
  bow2:'bow1',bow3:'bow2',fist2:'fist1',fist3:'fist2'};
function skillPrereq(id){const prev=SKILL_PREV[id]||null;return {id:prev,ok:!prev||((P.skillLv&&P.skillLv[prev])||0)>=3};}
function investSkill(id){
  if(!P.skillLv||!(id in P.skillLv)||P.skillPts<1)return false;
  const cur=P.skillLv[id]||0;if(cur>=5)return false;
  const pre=skillPrereq(id);if(cur<1&&!pre.ok){say('선행 스킬을 3단계까지 올려야 합니다.');return false;}
  P.skillLv[id]=cur+1;P.skillPts--;if(window.UI&&UI.refresh)UI.refresh();if(window.UI&&UI.save)UI.save();return true;
}
function investPassive(key){
  const d=PASSIVE_DEF[key];if(!d||P.skillPts<1)return false;
  const cur=(P.passives&&P.passives[key])||0;if(cur>=d.max)return false;
  P.passives[key]=cur+1;P.skillPts--;
  if(key==='magicGuide')P.passives.magicGuide=P.passives[key];
  if(window.UI&&UI.refresh)UI.refresh();if(window.UI&&UI.save)UI.save();return true;
}
function investLife(key){
  const d=LIFE_DEF[key],cur=lifeRank(key);if(!d||P.lv<d.unlock||cur<1||cur>=d.max||P.lifePts<1)return false;
  P.lifeSkills[key]=cur+1;P.lifePts--;if(window.UI&&UI.refresh)UI.refresh();if(window.UI&&UI.save)UI.save();return true;
}
function portalTransition(id,pos,dir,onArrive,prepare){
  if(traveling)return false;traveling=true;closeAll();
  const f=$('fade');f.classList.add('slow');requestAnimationFrame(()=>f.classList.add('on'));
  setTimeout(async()=>{
    let dest=id,p=pos;
    try{if(prepare)await prepare();}
    catch(e){dest='town';p=[23*TS,22.2*TS];lastVisitedTown={map:'town'};}
    buildWorld(dest);p=typeof p==='function'?p():p;P.x=p[0];P.y=p[1];P.dir=dir||'front';P.atk=null;
    const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
    if(dest==='town'||dest==='fieldvillage')markTownArrival(dest);
    if(window.TELEMETRY)TELEMETRY.enter(locationState());
    if(onArrive)onArrive();
    setTimeout(()=>{
      f.classList.remove('on');
      setTimeout(()=>{f.classList.remove('slow');traveling=false;},560);
    },180);
  },560);
  return true;
}
let portalScrollConfirm=0;
function useTownPortal(){
  const r=lifeRank('townPortal'),sc=window.UI&&UI.scrolls?UI.scrolls().portal:0;
  if(MAP==='town'||MAP==='inn'||MAP==='fieldvillage'){say('이미 마을에 있습니다.');return false;}
  const now=Date.now(),cd=[0,15,8,3][r||0]*60000;
  let byScroll=false;
  if(!r||(P.portalReadyAt||0)>now){
    if(sc<=0){say(!r?'타운 포탈을 아직 배우지 못했습니다.':'타운 포탈 재사용까지 '+Math.ceil((P.portalReadyAt-now)/60000)+'분');return false;}
    if(now>portalScrollConfirm){portalScrollConfirm=now+3000;say((!r?'타운 포탈을 아직 못 배웠습니다. ':'재사용 대기 중입니다. ')+'한 번 더 누르면 포탈 스크롤을 씁니다. (보유 '+sc+'장)');return false;}
    byScroll=true;
  }
  townPortalReturn={
    map:MAP,pos:[P.x,P.y],dir:P.dir||'front',
    runtime:typeof snapshotDynamicWorld==='function'?snapshotDynamicWorld():null,
    dungeon:MAP==='dungeon'&&window.__DUN&&__DUN.snapshotPortal?__DUN.snapshotPortal():null
  };
  if(byScroll){UI.useScroll('portal');portalScrollConfirm=0;say(['아까워라… 100골드가 연기가 됐네!','포탈 스크롤이라니… 내 100골드…!','급하니까 어쩔 수 없지… 아깝다!'][Math.floor(Math.random()*3)]);}
  else P.portalReadyAt=now+cd;
  const home=normalizeTownHome(lastVisitedTown);
  const prep=home.map==='fieldvillage'&&window.__FD&&__FD.prepareVillage?()=>__FD.prepareVillage(home.theme,home.villageReturn||null):null;
  const pos=home.map==='fieldvillage'?()=>MAPS.fieldvillage.spawn:[23*TS,22.2*TS];
  const dest=home.map==='fieldvillage'&&prep?'fieldvillage':'town';
  const ok=portalTransition(dest,pos,'front',()=>{portalArrivalUntil=performance.now()+1700;},prep);
  if(ok&&window.TELEMETRY)TELEMETRY.portal(home);
  if(window.UI&&UI.save)UI.save();return ok;
}
function returnTownPortal(){
  if((MAP!=='town'&&MAP!=='fieldvillage')||!townPortalReturn)return false;
  const q=townPortalReturn;
  if(q.map==='dungeon'&&q.dungeon&&window.__DUN&&__DUN.preparePortalRestore)__DUN.preparePortalRestore(q.dungeon);
  window.__PORTAL_RUNTIME_RESTORE=true;
  townPortalReturn=null;
  const ok=portalTransition(q.map,q.pos,q.dir,()=>{
    if(q.runtime&&typeof restoreDynamicWorld==='function')restoreDynamicWorld(q.runtime);
    window.__PORTAL_RUNTIME_RESTORE=false;
    portalArrivalUntil=performance.now()+1200;
  });
  if(!ok){window.__PORTAL_RUNTIME_RESTORE=false;townPortalReturn=q;}
  return ok;
}
function portalState(){const [x,y]=portalAnchor(MAP);return {open:!!townPortalReturn,map:MAP,returnTo:townPortalReturn?townPortalReturn.map:null,returnFloor:townPortalReturn&&townPortalReturn.dungeon?townPortalReturn.dungeon.floor:null,x,y,aura:portalArrivalUntil>performance.now(),home:lastVisitedTownState()};}
let levelNoticeTimer=0;
function showLevelNotice(txt){
  const n=$('levelNotice');if(!n)return;
  n.textContent=txt;n.classList.remove('on');void n.offsetWidth;n.classList.add('on');
  clearTimeout(levelNoticeTimer);levelNoticeTimer=setTimeout(()=>n.classList.remove('on'),3200);
}
function gainExp(amount){
  amount=Math.max(0,Math.round(amount||0));if(!amount||P.lv>=LEVEL_CAP)return false;
  const oldLv=P.lv;P.exp=(P.exp||0)+amount;let ups=0,addStat=0,addSkill=0,addLife=0;
  while(P.lv<LEVEL_CAP&&P.exp>=expNeed(P.lv)){
    P.exp-=expNeed(P.lv);P.lv++;ups++;
    const sp=P.lv%10===0?10:5;P.statPts+=sp;addStat+=sp;
    P.skillPts++;addSkill++;
    if(P.lv%5===0){P.lifePts++;addLife++;}
    if(P.lv%5===0)P.stats.luck=(P.stats.luck||0)+1;
  }
  if(P.lv>=LEVEL_CAP)P.exp=0;
  const lv=$('lvTxt');if(lv)lv.textContent=P.lv;
  if(ups){
    if(window.TELEMETRY)TELEMETRY.levelUp(oldLv,P.lv);
    syncLifeUnlocks(false);
    showLevelNotice('LEVEL UP!  Lv'+P.lv+' · 능력 +'+addStat+'P · 스킬 +'+addSkill+'P'+(addLife?' · 생활 +'+addLife+'P':''));
    say(['좋아, 더 강해졌네!','좋았어! 포인트부터 잘 써야지.','한 단계 올랐네. 어디에 투자할까?'][P.lv%3]);
  }
  if(window.UI&&UI.refresh)UI.refresh();if(window.UI&&UI.save)UI.save();return true;
}

// ======================= 입력 =======================
const keys = {};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ' || k === 'e' || k === 'enter') act();
  if (k === 'escape') closeAll();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }, stick = $('stick'), knob = $('knob');
// 떠다니는 조이스틱: 왼쪽 아무 데나 누르면 그 자리에 생기고, 손가락이 멀리 가면 따라온다. 떼면 제자리로.
function placeStick(x, y){ stick.style.left = (x - 64) + 'px'; stick.style.top = (y - 64) + 'px'; stick.style.bottom = 'auto'; }
function homeStick(){ stick.style.left = stick.style.top = stick.style.bottom = ''; stick.classList.remove('act'); }
$('joy').addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') return; // Android touch는 아래 touch 전용 경로에서 처리
  if (panel) return;
  e.preventDefault();
  if (joy.id != null && joy.id !== e.pointerId) return;
  joy.id = e.pointerId; joy.dx = joy.dy = 0;
  joy.ox = Math.max(70, Math.min(innerWidth - 70, e.clientX)); joy.oy = Math.max(70, Math.min(innerHeight - 70, e.clientY));
  placeStick(joy.ox, joy.oy); stick.classList.add('act');
  try { $('joy').setPointerCapture(e.pointerId); } catch (er) {}
  knob.style.transform = '';
  joyMove(e);
});
addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  if (e.cancelable) e.preventDefault();
  if (e.pointerType === 'mouse' && e.buttons === 0){ endJoy(e); return; } // 마우스 버튼을 이미 뗐는데 놓친 경우
  joyMove(e);
}, { passive:false });
function joyMove(e){
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 44;
  if (d > m * 1.6){ const k = (d - m * 1.6) / d; joy.ox += dx * k; joy.oy += dy * k; dx -= dx * k; dy -= dy * k; placeStick(joy.ox, joy.oy); }   // 받침이 손가락을 따라옴
  const d2 = Math.hypot(dx, dy); if (d2 > m){ dx *= m / d2; dy *= m / d2; }
  joy.dx = dx / m; joy.dy = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
function endJoy(e){ if (e.pointerId === joy.id){ joy.id = null; joy.dx = joy.dy = 0; knob.style.transform = ''; homeStick(); } }
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
$('joy').addEventListener('lostpointercapture', endJoy);

// 모바일은 PointerEvent 취소에 흔들리지 않도록 Touch 식별자를 직접 추적한다.
let joyTouch = null;
function touchPoint(list, id){ for (const t of list) if (t.identifier === id) return t; return null; }
$('joy').addEventListener('touchstart', e => {
  if (panel || joyTouch != null) return;
  const t = e.changedTouches[0]; if (!t) return;
  e.preventDefault(); joyTouch = t.identifier; joy.id = null; joy.dx = joy.dy = 0;
  joy.ox = Math.max(70, Math.min(innerWidth - 70, t.clientX)); joy.oy = Math.max(70, Math.min(innerHeight - 70, t.clientY));
  placeStick(joy.ox, joy.oy); stick.classList.add('act'); knob.style.transform = '';
  joyMove(t);
}, { passive:false });
document.addEventListener('touchmove', e => {
  if (joyTouch == null) return;
  const t = touchPoint(e.touches, joyTouch); if (!t) return;
  e.preventDefault(); joyMove(t);
}, { passive:false });
function endJoyTouch(e){
  if (joyTouch == null) return;
  const t = touchPoint(e.changedTouches, joyTouch); if (!t) return;
  e.preventDefault(); joyTouch = null; joy.dx = joy.dy = 0; knob.style.transform = ''; homeStick();
}
document.addEventListener('touchend', endJoyTouch, { passive:false });
document.addEventListener('touchcancel', endJoyTouch, { passive:false });
// 창 밖으로 나가거나 다른 창을 보면 조이스틱·키 입력을 모두 풀어 줌
function releaseAll(){ joy.id = null; joyTouch = null; joy.dx = joy.dy = 0; knob.style.transform = ''; homeStick(); for (const k in keys) keys[k] = false; }
addEventListener('blur', releaseAll); document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
$('fs').addEventListener('click', () => {
  const d = document.documentElement;
  if (!document.fullscreenElement){ (d.requestFullscreen || d.webkitRequestFullscreen || (() => {})).call(d); try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }
  else document.exitFullscreen && document.exitFullscreen();
});

// ======================= 창 =======================
let near = null, panel = null, talking = null;
const PROP_TXT = {
  '의뢰 게시판': '길드 의뢰가 붙는 곳입니다. 의뢰는 다음 단계에서 붙입니다.',
  '우물': '시원한 물이 찰랑입니다. 동전을 던지는 사람은… 이 마을에 없습니다.',
  '이정표': '↓ 성문(던전)   ← 여관   → 대장간',
  '과일 노점': '주인이 자리를 비웠습니다.',
  '물약 노점': '주인이 자리를 비웠습니다.',
};
function show(id){ closeAll(); panel = id; $(id).classList.add('on'); joy.id = null; joy.dx = joy.dy = 0; knob.style.transform = ''; homeStick(); }
function closeAll(){ for (const id of ['msg','dlg','shop','guild','settings']) $(id).classList.remove('on'); if(typeof closeRegionSelect==='function')closeRegionSelect(true); if(window.TRADE)TRADE.close(true); if(window.GUILD)GUILD.close(true); if(window.UI&&UI.isOpen())UI.close(); panel=null; }
function act(){
  if (panel === 'msg' || panel === 'dlg'){ closeAll(); return; }
  if (panel) return;
  if (!near) return;
  if(near.kind==='stash'&&window.UI)return UI.openStash();
  if(near.kind==='inn_door'&&typeof enterInn==='function')return enterInn();
  if(near.kind==='inn_exit'&&typeof leaveInn==='function')return leaveInn();
  if(near.kind==='questclue'&&window.QUEST)return QUEST.collect(near.questId);
  if(near.kind==='npc')return near.npc.shop==='inn'&&MAP==='inn'&&typeof openInnDlg==='function'?openInnDlg(near.npc):openDlg(near.npc);
  if (near.name === '의뢰 게시판' && window.GUILD) return GUILD.open();
  if (near.kind === 'gate') return travel('out', MAPS.out.spawn, 'front');
  if (near.kind === 'exit') return travel('town', MAPS.out.back, 'back');
  if (near.kind === 'field_exit') return returnFromField();
  if (near.kind === 'field_village' && window.__FD) return __FD.enterVillage(near.market || (CUR && CUR.market) || 'spring');
  if (near.kind === 'trade' && window.TRADE) return TRADE.open(near.market || (CUR && CUR.market) || 'town');
  if(near.kind==='town_portal')return returnTownPortal();
  if(MAP==='field'&&near.name==='야영지'&&typeof restAtCamp==='function')return restAtCamp();
  if(near.kind==='dungeon')return MAP==='out'?enterDungeonFromOut():enterDungeonFromHere();
  if (near.kind === 'stairs_down') return nextDungeonFloor();
  if (near.kind === 'stairs_up') return previousDungeonFloor();
  if (near.kind === 'chest') return openDungeonChest(near);
  const body = near.kind === 'dungeon' ? '던전은 다음 단계에서 연결합니다.'
    : near.kind === 'prop' ? ((MAP === 'out' && OUT_TXT[near.name]) || PROP_TXT[near.name] || '')
    : '실내는 다음 단계에서 만듭니다.';
  $('msgT').textContent = near.name; $('msgB').textContent = body; show('msg');
}
const OUT_TXT = { '이정표': '↑ 마을   ← 필드   → 던전', '연습용 허수아비': '마음껏 때려 보세요. 허수아비는 불평하지 않습니다.' };
// 장소 이동(어두워졌다 밝아짐)
let traveling = false;
function travel(id,pos,dir){
  if(traveling)return false;traveling=true;closeAll();
  const f=$('fade');f.classList.add('on');
  setTimeout(()=>{
    buildWorld(id);P.x=pos[0];P.y=pos[1];P.dir=dir||'front';P.atk=null;
    const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
    if(id==='town'||id==='fieldvillage')markTownArrival(id);
    if(window.TELEMETRY)TELEMETRY.enter(locationState());
    setTimeout(()=>{f.classList.remove('on');traveling=false;},120);
  },320);
  return true;
}
function locationState(){
  if(MAP==='inn'&&MAPS.inn&&MAPS.inn.back)return {map:'town',x:MAPS.inn.back[0],y:MAPS.inn.back[1],dir:'front'};
  const st={map:MAP,x:P.x,y:P.y,dir:P.dir||'front'};
  if(MAP==='field'&&window.__FD){const f=__FD.state();st.theme=f.theme||'spring';st.leg=f.leg;st.legs=f.legs;}
  if(MAP==='fieldvillage'&&window.__FD){const f=__FD.state();st.theme=f.theme||'spring';st.leg=f.leg;st.legs=f.legs;st.villageReturn=f.villageReturn||null;}
  if(MAP==='dungeon'&&window.__DUN){const d=__DUN.state();st.floor=d.floor||1;st.dungeonTheme=d.theme||'ruins';st.caveReturn=d.caveReturn||null;}
  return st;
}
async function resumeLocation(st){
  if(!st||!st.map)return false;
  const map=st.map,dir=st.dir||'front';
  try{
    if(map==='field'&&typeof prepareField==='function'){
      await prepareField(st.theme||'spring',st.leg,st.legs);buildWorld('field');
    }else if(map==='fieldvillage'&&window.__FD&&__FD.prepareVillage){
      await __FD.prepareVillage(st.theme||'spring',st.villageReturn||null);buildWorld('fieldvillage');
    }else if(map==='dungeon'&&typeof prepareDungeon==='function'){
      if(window.__DUN&&__DUN.restoreEntry)__DUN.restoreEntry(st.dungeonTheme||'ruins',st.caveReturn||null);
      await prepareDungeon(Math.max(1,st.floor||1));buildWorld('dungeon');
    }else if(map==='out'){
      buildWorld('out');
    }else{
      buildWorld('town');
    }
    P.x=Number.isFinite(st.x)?st.x:P.x;P.y=Number.isFinite(st.y)?st.y:P.y;P.dir=dir;P.atk=null;
    const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
    if(map==='town'||map==='fieldvillage')markTownArrival(map);
    if(map==='dungeon'&&window.GUILD&&window.__DUN)GUILD.onDungeonFloor(__DUN.state().floor||1);
    if(window.TELEMETRY)TELEMETRY.enter(locationState());
    return true;
  }catch(e){
    buildWorld('town');P.x=23*TS;P.y=22.2*TS;P.dir='front';return false;
  }
}

function emergencyEscape(){
  // 테스트용: 전투/상태/층이동 꼬임을 무시하고 강제로 큰 마을 복귀.
  traveling=false;closeAll();
  if(typeof PLAYER_STATUS!=='undefined')for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
  P.atk=null;P.moving=false;zones.length=0;P.castRoot=0;
  buildWorld('town');P.x=23*TS;P.y=22.2*TS;P.dir='front';
  const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
  const fade=$('fade');if(fade)fade.classList.remove('on');
  say('끼임 탈출: 큰 마을로 복귀했습니다.');
  if(window.UI&&UI.save)UI.save();
  return true;
}
function openDlg(n){
  talking = n;
  $('dlgMainRow').hidden=false;$('dlgInnRow').hidden=true;
  $('dlgImg').src = A.port[n.k]; $('dlgName').textContent = n.name; $('dlgTitle').textContent = n.title;
  $('dlgLine').textContent = n.line;
  $('dlgTrade').hidden = !n.shop && !n.go && !n.companion;
  $('dlgTrade').disabled = false;
  $('dlgTrade').textContent = n.companion&&window.COMPANION?COMPANION.buttonText(n):n.go==='field'?'지역 고르기':n.go==='dungeon'?'던전으로':n.shop==='inn'?'여관 들어가기':n.shop==='trade'?'교역하기':n.shop==='guild'?'의뢰 보기':'거래';
  if(n.companion&&window.COMPANION&&COMPANION.isActive(n.companion))$('dlgTrade').disabled=true;
  const gx=$('dlgGuildExam');if(gx)gx.hidden=n.shop!=='guild';
  show('dlg');
  $('dlgTalk').hidden=false;if(window.QUEST)QUEST.decorateDialog(n);
}
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeAll);
const guildExamBtn=$('dlgGuildExam');if(guildExamBtn)guildExamBtn.addEventListener('click',()=>{if(talking&&talking.shop==='guild'&&window.GUILD)GUILD.openExam();});
$('dlgTrade').addEventListener('click', () => {
  if(talking&&talking.companion&&window.COMPANION){COMPANION.hireFromDialog(talking);return;}
  if (talking.shop==='inn'){ closeAll(); if(typeof enterInn==='function')enterInn(); return; }
  if (talking.go === 'field'){ openRegionSelect(); return; }
  if (talking.go === 'dungeon'){ enterDungeonFromOut(); return; }
  if(talking.shop==='trade'&&window.TRADE){TRADE.open(talking.market||'town');return;}
  if(talking.shop==='guild'&&window.GUILD){GUILD.open();return;}
  openShop(talking);
});

// 가게 물건 (가안 가격)
const WN = { sword: '검', spear: '창', gauntlet: '건틀릿', bow: '활', staff: '지팡이' };
function shopGear(base,price){
  const b=typeof base==='string'?GEAR_BASE[base]:base;return {ic:b.icon,name:b.name,slot:`T${b.tier} · 착용 Lv${b.requiredLevel}`,price,requiredLevel:b.requiredLevel,spec:{baseId:b.id,kind:b.kind}};
}
const GOODS = {
  general:[{ic:'php',name:'체력 물약',slot:'물약',price:20,potion:'hp'},{ic:'pmp',name:'마나 물약',slot:'물약',price:20,potion:'mp'},
    {ic:'scr_portal',name:'타운 포탈 스크롤',slot:'스크롤',desc:'대기시간 무시 · 최대 20장',price:100,scroll:'portal'},
    {ic:'scr_ident',name:'감정 스크롤',slot:'스크롤',desc:'어디서나 감정 · 최대 20장',price:100,scroll:'ident'},
    {ic:'bag',name:'튼튼한 배낭',slot:'가방 확장',desc:'구매할 때마다 가방 1페이지 추가',price:10000,backpack:1}]
};
let shopStockTier=0,shopStock={arms:[],pawn:[]};
function shopBase(tier,kind,wt){
  let pool=TIER_MATCH.gear.filter(b=>b.tier===tier&&b.kind===kind&&(!wt||b.wt===wt));
  const primary=pool.filter(b=>b.primary);if(primary.length)pool=primary;
  return pool.sort((a,b)=>(a.requiredLevel||1)-(b.requiredLevel||1)||(a.powerGrade||1)-(b.powerGrade||1))[0]||null;
}
function shopGearPrice(b){
  const g=Math.max(1,b.powerGrade||1),mul=b.kind==='weapon'?30:['body','ring','neck'].includes(b.kind)?35:20;
  return Math.max(20,Math.round(mul*g*g));
}
function refreshShopStock(){
  const tier=levelTier(P.lv);if(shopStockTier===tier)return;
  shopStockTier=tier;
  shopStock.arms=[
    ...['sword','spear','gauntlet','bow','staff'].map(w=>shopBase(tier,'weapon',w)),
    ...['head','body','hands','feet'].map(k=>shopBase(tier,k))
  ].filter(Boolean).map(b=>shopGear(b,shopGearPrice(b)));
  shopStock.pawn=['ring','neck'].map(k=>shopBase(tier,k)).filter(Boolean).map(b=>shopGear(b,shopGearPrice(b)));
}
function shopGoods(kind){if(kind==='general')return GOODS.general;refreshShopStock();return shopStock[kind]||[];}
let sel = null, shopNpc = null, shopMode = 'buy';
const SELL_BASE = {
  weapon: {1:30, 2:75},
  head: {1:20, 2:40}, body: {1:35, 2:70}, hands: {1:15, 2:30}, feet: {1:15, 2:30},
  ring: 120, neck: 150
};
const SHOP_BUY_RATE = {
  arms:    { weapon:1.00, armor:1.00, accessory:0.60, material:0.60, potion:0.50, junk:0.50 },
  pawn:    { weapon:0.85, armor:0.85, accessory:1.20, material:1.00, potion:0.70, junk:1.00 },
  general: { weapon:0.60, armor:0.60, accessory:0.60, material:0.90, potion:1.00, junk:0.90 },
};
// 작은 마을이 붙으면 CUR.market 또는 NPC.market에 아래 키만 넣으면 같은 판매식이 바로 적용된다.
// 일부 품목은 ±20~35% 차이. 먼 마을까지 오가며 시세차익을 노리는 루크레아의 생활 동기.
const REGION_MARKET = {
  town:    { weapon:1.00, armor:1.00, accessory:1.00, material:1.00, potion:1.00, junk:1.00 },
  spring:  { weapon:0.90, armor:0.95, accessory:1.20, material:1.10, potion:0.90, junk:1.05 },
  summer:  { weapon:1.10, armor:0.90, accessory:1.00, material:1.25, potion:0.85, junk:1.00 },
  autumn:  { weapon:0.90, armor:1.15, accessory:1.25, material:0.85, potion:1.00, junk:1.10 },
  winter:  { weapon:1.20, armor:1.25, accessory:0.85, material:1.30, potion:1.10, junk:0.90 },
  ice:     { weapon:1.15, armor:1.30, accessory:0.80, material:1.35, potion:1.20, junk:0.85 },
  volcano: { weapon:1.30, armor:1.15, accessory:1.05, material:1.35, potion:1.20, junk:0.85 },
  swamp:   { weapon:0.85, armor:0.80, accessory:1.30, material:1.30, potion:1.25, junk:1.15 },
};
const MARKET_NAME = { town:'큰 마을', spring:'봄 마을', summer:'여름 마을', autumn:'가을 마을', winter:'겨울 마을', ice:'얼음 마을', volcano:'화산 마을', swamp:'늪 마을' };
const MARKET_RESET_MS = 480000; // 게임 하루 8분
const sellFlow = { sold:{}, resetAt:Date.now()+MARKET_RESET_MS };
function sellCat(it){
  if (!it) return 'junk';
  if (it.kind === 'weapon') return 'weapon';
  if (['head','body','hands','feet'].includes(it.kind)) return 'armor';
  if (it.kind === 'ring' || it.kind === 'neck') return 'accessory';
  if (it.kind === 'material') return 'material';
  if (it.kind === 'potion') return 'potion';
  return 'junk';
}
function goodsCat(it){
  if (!it) return 'junk';
  if (it.potion || it.scroll) return 'potion';
  return sellCat(it.spec || {kind:'junk'});
}
function buyPrice(it){if(it&&it.backpack&&window.UI)return UI.bagUpgradePrice()||0;const d=1-.02*((P.lifeSkills&&P.lifeSkills.discount)||0);return Math.max(1,Math.round((it.price||1)*Math.max(.90,d)));}
function goodsOwned(it){if(it.potion){const p=UI.potions();return p[it.potion]||0;}if(it.scroll)return UI.scrolls()[it.scroll]||0;if(it.backpack)return UI.bagPages();return 0;}
function buyManyCount(it,want){if(it.scroll)return Math.max(0,Math.min(want,UI.scrollMax-goodsOwned(it)));return it.potion?want:1;}
function baseSellValue(it){
  if (!it) return 1;
  let v = 10;
  if (it.kind === 'weapon') v = (SELL_BASE.weapon[it.g] || Math.round(75 * Math.max(1, it.g - 1)));
  else if (['head','body','hands','feet'].includes(it.kind)) v = (SELL_BASE[it.kind][it.g] || SELL_BASE[it.kind][2]);
  else if (it.kind === 'ring' || it.kind === 'neck') v = SELL_BASE[it.kind];
  else v = Math.max(1, it.price || 10);
  return v * (1 + (it.rar || 0));
}
function marketRegion(){
  const k = (shopNpc && shopNpc.market) || (CUR && CUR.market) || 'town';
  return REGION_MARKET[k] ? k : 'town';
}
function resetSellFlow(){
  if (Date.now() < sellFlow.resetAt) return;
  sellFlow.sold = {}; sellFlow.resetAt = Date.now() + MARKET_RESET_MS;
}
function sellPressure(shop, cat){
  resetSellFlow();
  const key = marketRegion() + ':' + shop + ':' + cat, n = sellFlow.sold[key] || 0;
  return Math.max(0.80, 1 - n * 0.02); // 케인: 너무 심한 폭락 금지
}
function sellRate(it){
  const cat = sellCat(it), shop = shopNpc ? shopNpc.shop : 'general';
  return SHOP_BUY_RATE[shop]?.[cat] || 0.60;
}
function sellPrice(it){const o=1+.02*((P.lifeSkills&&P.lifeSkills.overcount)||0),u=it&&it.unid?.50:1;return Math.max(1,Math.round(baseSellValue(it)*.40*sellRate(it)*Math.min(1.10,o)*u));}
function rateMark(rate){ return rate > 1.001 ? ' ▲' : rate < 0.999 ? ' ▼' : ''; }
function shopMarketText(){ return '장비는 지역 시세와 무관 · 사는 값은 비싸고 되파는 값은 헐값입니다.'; }
function openShop(n){
  shopNpc = n; shopMode = 'buy'; sel = null;
  $('shopName').textContent = n.title.replace(' 주인', '');
  $('shopImg').src = A.port[n.k];
  UI.merchant();renderShop();
}
function setShopMode(mode){
  shopMode=mode==='sell'?'sell':'buy';sel=null;renderShop();if(mode==='sell'){const row=UI.bagItems()[0];if(row)pickSell(row.i,row.it,null);else clearShopInfo('팔 물건이 없습니다.');}
}
function renderShop(){
  $('tabBuy').classList.toggle('on', shopMode === 'buy');
  $('tabSell').classList.toggle('on', shopMode === 'sell');
  $('shopMarket').textContent = shopMarketText();
  $('shopSay').textContent = '';
  const g = $('grid'); g.innerHTML = '';
  {
    const list = shopGoods(shopNpc.shop);
    list.forEach((it, i) => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'cell';
      const im = document.createElement('img'); im.src = A.icons[it.ic] || A.kit['h_' + it.ic]; im.alt = it.name; c.append(im);
      if (it.requiredLevel && it.requiredLevel > P.lv){ c.classList.add('lvlock'); const lt = document.createElement('span'); lt.className = 'lvtag'; lt.textContent = 'Lv' + it.requiredLevel; c.append(lt); }
      const price = buyPrice(it);
      const pr = document.createElement('span'); pr.textContent = price; c.append(pr);
      UI.bindItemSlot(c,{from:'goods',it});c.addEventListener('click', () => {shopMode='buy';pickBuy(it,c,price);});g.append(c);
      if(i===0&&!sel){shopMode='buy';pickBuy(it,c);}
    });
    if (!list.length) clearShopInfo('살 물건이 없습니다.');
  }
}
function clearShopInfo(msg){
  sel = null; $('infoIc').src = ''; $('infoName').textContent = msg || ''; $('infoSlot').textContent = '';
  $('infoPrice').textContent = ''; $('buy').textContent = shopMode === 'sell' ? '팔기' : '사기'; $('buy').disabled = true;if($('buy10'))$('buy10').hidden=true;if($('sellAll'))$('sellAll').hidden=shopMode!=='sell';
}
function pickBuy(it, c, price){
  if (shopMode !== 'buy') return;
  saleConfirm=null;price = price || buyPrice(it); sel = { mode:'buy', it, price };
  for (const x of document.querySelectorAll('.cell')) x.classList.toggle('sel', x === c);
  $('infoIc').src = A.icons[it.ic] || A.kit['h_' + it.ic]; $('infoName').textContent = it.name;
  const owned=(it.potion||it.scroll)?` · 보유 ${goodsOwned(it)}개`:it.backpack?` · ${goodsOwned(it)}/5페이지`:'';
  $('infoSlot').textContent = it.slot + ' · ' + (it.desc || '일반') + owned;
  $('infoPrice').textContent = it.backpack&&price<=0?'최대 확장 완료':'금화 ' + price;
  $('buy').textContent = it.backpack?'배낭 사기':'1개 사기'; $('buy').disabled = price<=0||P.gold < price; $('shopSay').textContent = '';
  const b10=$('buy10');if(b10){const n=buyManyCount(it,10);b10.hidden=!(it.potion||it.scroll);b10.textContent=n===10?'10개 사기':`${n}개 사기`;b10.disabled=n<1||P.gold<price*n;}
  const sa=$('sellAll');if(sa)sa.hidden=true;
}
function pickSell(idx, it, c){
  shopMode='sell';
  const price = sellPrice(it), rate = sellRate(it);
  sel = { mode:'sell', idx, it, price, rate };
  for (const x of document.querySelectorAll('.cell')) x.classList.toggle('sel', x === c);
  $('infoIc').src = A.icons[it.icon] || ''; $('infoName').textContent = it.name;
  const names = {weapon:'무기',armor:'방어구',accessory:'장신구',material:'재료',potion:'물약',junk:'잡템'};
  $('infoSlot').textContent = (names[sellCat(it)] || '물건') + ' · ' + ['일반','마법','희귀','전설'][it.rar || 0];
  $('infoPrice').textContent = '금화 ' + price + rateMark(rate);
  $('buy').textContent = '팔기'; $('buy').disabled = !!it.locked; $('shopSay').textContent = it.locked?'잠긴 아이템입니다.':'';
  const b10=$('buy10');if(b10)b10.hidden=true;const sa=$('sellAll');if(sa)sa.hidden=false;
}
$('tabBuy').addEventListener('click', () => setShopMode('buy'));
$('tabSell').addEventListener('click', () => setShopMode('sell'));

let saleConfirm=null;
function sellAt(idx){
  const row=UI.bagItems().find(x=>x.i===idx);if(!row)return false;if(row.it.locked){$('shopSay').textContent='잠긴 아이템입니다.';return false;}
  const price=sellPrice(row.it),rate=sellRate(row.it);saleConfirm=null;
  UI.removeBagAt(idx);setGold(P.gold+price);sel=null;UI.refresh();renderShop();UI.save();
  if(window.QUEST)QUEST.onEvent('shop_sell',{shop:shopNpc.shop,kind:row.it.kind,price,count:1});
  $('shopSay').textContent='금화 '+price+'닢을 받았습니다.';return true;
}
function buyAt(it,idx,want=1){
  if(!shopGoods(shopNpc.shop).includes(it))return false;
  const price=buyPrice(it);
  if(it.backpack){if(price<=0){$('shopSay').textContent='가방을 이미 최대로 확장했습니다.';return false;}if(P.gold<price){$('shopSay').textContent='금화가 부족합니다.';return false;}if(!UI.expandBag())return false;setGold(P.gold-price);UI.refresh();UI.save();$('shopSay').textContent='가방 한 페이지가 늘었습니다.';renderShop();return true;}
  const n=buyManyCount(it,Math.max(1,want|0));if(n<1){$('shopSay').textContent=it.scroll?'스크롤은 '+UI.scrollMax+'장까지만 들 수 있습니다.':'더 살 수 없습니다.';return false;}
  const total=price*n;if(P.gold<total){$('shopSay').textContent='금화가 부족합니다.';return false;}
  if(!it.potion&&!it.scroll&&(UI.bagFull()||idx!=null&&UI.bagItems().some(x=>x.i===idx))){$('shopSay').textContent='가방에 빈 칸이 필요합니다.';return false;}
  if(it.scroll)UI.addScroll(it.scroll,n);else if(it.potion)UI.addPotion(it.potion,n);else{const gear=UI.make({...it.spec,price});if(!(idx==null?UI.add(gear):UI.addAt(gear,idx)))return false;}
  setGold(P.gold-total);UI.refresh();UI.save();if(window.QUEST)QUEST.onEvent('shop_buy',{shop:shopNpc.shop,item:it.potion?'potion:'+it.potion:it.scroll?'scroll:'+it.scroll:(it.spec&&it.spec.kind?it.spec.kind:(it.slot||'item')),name:it.name,count:n});$('shopSay').textContent=it.name+' '+n+'개를 샀습니다.';pickBuy(it,null,buyPrice(it));return true;
}
$('buy').addEventListener('click',()=>{if(!sel)return;if(sel.mode==='sell'){const row=UI.bagItems().find(r=>r.i===sel.idx);if(!row||row.it.id!==sel.it.id){clearShopInfo('물건을 다시 선택해 주세요.');return;}sellAt(sel.idx);}else buyAt(sel.it);});
$('buy10').addEventListener('click',()=>{if(sel&&sel.mode==='buy')buyAt(sel.it,null,10);});
let bulkSaleConfirm=false;
$('sellAll').addEventListener('click',()=>{const rows=UI.bagItems().filter(r=>!r.it.locked);if(!rows.length){$('shopSay').textContent='일괄판매할 잠금 해제 아이템이 없습니다.';bulkSaleConfirm=false;return;}const total=rows.reduce((s,r)=>s+sellPrice(r.it),0);if(!bulkSaleConfirm){bulkSaleConfirm=true;$('sellAll').textContent='확인 후 일괄판매';$('shopSay').textContent=rows.length+'개 / '+total+'G 판매합니다. 한 번 더 눌러 주세요.';return;}bulkSaleConfirm=false;$('sellAll').textContent='일괄판매';for(const r of rows.slice().sort((a,b)=>b.i-a.i))UI.removeBagAt(r.i);setGold(P.gold+total);sel=null;UI.refresh();renderShop();UI.save();if(window.QUEST)QUEST.onEvent('shop_sell',{shop:shopNpc.shop,kind:'bulk',price:total,count:rows.length});$('shopSay').textContent=rows.length+'개를 팔아 '+total+'G를 받았습니다.';});
window.__SHOP={goods:k=>shopGoods(k),tier:()=>levelTier(P.lv),open:openShop,mode:setShopMode,price:sellPrice,buyPrice,baseValue:baseSellValue,rate:sellRate,sellAt,buyAt,clearSelection(){saleConfirm=null;clearShopInfo('물건을 선택해 주세요.');},selectBag(i){const row=UI.bagItems().find(x=>x.i===i);if(row){saleConfirm=null;pickSell(i,row.it,null);}},state:()=>({mode:shopMode,gold:P.gold})};

// ======================= 행인 =======================
const WP = [[14.5,14],[18,13.6],[28,13.6],[31.5,14],[14.5,19.9],[20,20.7],[26,20.7],[31.5,19.9],[23,13.9],[19.6,16.4],[26.4,16.4],
  [23,23],[23,27],[22.6,30.2],[10,16.5],[5,16.5],[8,12.2],[36,16.5],[41,16.5],[38,12.4],[11,27.1],[16,27.1],[30.5,27.1],[36,26.9],[41.5,26.4],[15.3,11.3],[31.4,11.3]]
  .map(([x, y]) => ({ x: x * TS, y: y * TS }));
const VI = {};
const vils = A.vils.map((v, i) => {
  VI[v.name] = {}; for (const d in v.fr) VI[v.name][d] = v.fr[d].map(load);
  const hb = MAPS.town.blds.find(b => b.k === v.home);
  const home = { x: hb.x + hb.door * hb.w + (i % 2 ? 22 : -22), y: hb.y + 10 };
  const st = WP[(i * 5) % WP.length];
  return { ...v, x: st.x, y: st.y, home, tx: st.x, ty: st.y, wait: rand(0, 3), dir: 'front', flip: false, t: 0, moving: false,
    sp: v.name === 'kid' ? 95 : v.name === 'grandpa' ? 42 : rand(55, 70), stuck: 0, hidden: false, ph: rand(0, 7) };
});
const FVP=[[7,14],[10,17],[16,16],[22,17],[25,14],[12,9],[20,9],[16,19]].map(([x,y])=>({x:x*TS,y:y*TS}));
const fvils=vils.slice(0,4).map((v,i)=>({...v,x:FVP[i].x,y:FVP[i].y,tx:FVP[i].x,ty:FVP[i].y,wait:rand(.5,2.5),hidden:false,goingHome:false,stuck:0}));
function resetFieldVils(){
  for(let i=0;i<fvils.length;i++){const p=FVP[i%FVP.length],v=fvils[i];v.x=p.x;v.y=p.y;v.tx=p.x;v.ty=p.y;v.wait=rand(.4,2.2);v.hidden=false;v.goingHome=false;v.stuck=0;}
}
function updFieldVils(dt){
  for(const v of fvils){
    if(v.wait>0){v.wait-=dt;v.moving=false;v.t=0;continue;}
    const dx=v.tx-v.x,dy=v.ty-v.y,d=Math.hypot(dx,dy);
    if(d<6){v.wait=rand(1,3.5);const n=FVP[Math.floor(rand(0,FVP.length))];v.tx=n.x+rand(-16,16);v.ty=n.y+rand(-12,12);continue;}
    const sp=v.sp*.9,mx=dx/d*sp*dt,my=dy/d*sp*dt,ox=v.x,oy=v.y;
    if(!vBlocked(v.x+mx,v.y))v.x+=mx;if(!vBlocked(v.x,v.y+my))v.y+=my;
    const moved=Math.hypot(v.x-ox,v.y-oy);v.moving=moved>.2;v.t+=dt*(sp/60);
    if(moved<sp*dt*.25){v.stuck+=dt;if(v.stuck>1){const n=FVP[Math.floor(rand(0,FVP.length))];v.tx=n.x;v.ty=n.y;v.stuck=0;}}else v.stuck=0;
    if(Math.abs(dx)>Math.abs(dy)*1.2){v.dir='side';v.flip=dx>0;}else v.dir=dy<0?'back':'front';
  }
}
function vBlocked(x, y){
  const r = 9;
  if (x < r || y < 30 || x > MWp - r || y > MHp - 6) return true;
  for (const s of solids){
    const cx = Math.max(s.x0, Math.min(x, s.x1)), cy = Math.max(s.y0, Math.min(y, s.y1));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return Math.hypot(x - P.x, y - P.y) < 22;
}
function updVils(dt, night){
  for (const v of vils){
    if (v.hidden){ // 아침이 되면 집에서 나옴
      if (!night && Math.random() < dt * 0.3){ v.hidden = false; v.x = v.home.x; v.y = v.home.y; v.wait = 0.5; }
      continue;
    }
    if (night && !v.goingHome){ v.goingHome = true; v.tx = v.home.x; v.ty = v.home.y; v.wait = 0; }
    if (!night) v.goingHome = false;
    if (v.wait > 0){ v.wait -= dt; v.moving = false; v.t = 0; continue; }
    const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy);
    if (d < 6){
      if (v.goingHome){ v.hidden = true; continue; }
      v.wait = rand(1.2, 4.5); const n = WP[Math.floor(rand(0, WP.length))]; v.tx = n.x + rand(-20, 20); v.ty = n.y + rand(-14, 14);
      v.dir = 'front'; continue;
    }
    const sp = (v.goingHome ? v.sp * 1.3 : v.sp) * (v.name === 'kid' && Math.sin(T * 0.7 + v.ph) > 0.6 ? 1.8 : 1);
    const mx = dx / d * sp * dt, my = dy / d * sp * dt, ox = v.x, oy = v.y;
    if (!vBlocked(v.x + mx, v.y)) v.x += mx;
    if (!vBlocked(v.x, v.y + my)) v.y += my;
    const moved = Math.hypot(v.x - ox, v.y - oy);
    v.moving = moved > 0.2; v.t += dt * (sp / 60);
    if (moved < sp * dt * 0.3){ v.stuck += dt; if (v.stuck > 1.2){ v.stuck = 0;
      if (v.goingHome){ v.hidden = true; continue; }
      const n = WP[Math.floor(rand(0, WP.length))]; v.tx = n.x; v.ty = n.y; } }
    else v.stuck = 0;
    if (Math.abs(dx) > Math.abs(dy) * 1.2){ v.dir = 'side'; v.flip = dx > 0; } else v.dir = dy < 0 ? 'back' : 'front';
  }
}
function drawVil(v){
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(v.x, v.y, 15 * v.sc, 5.5 * v.sc, 0, 0, 7); ctx.fill();
  const fr = VI[v.name][v.dir][v.moving ? 1 + (Math.floor(v.t * 8) % 4) : 0];
  ctx.save();
  if (v.flip && v.dir === 'side'){ ctx.translate(v.x, 0); ctx.scale(-1, 1); ctx.translate(-v.x, 0); }
  ctx.drawImage(fr, v.x - v.w / 2, v.y - v.h + 4, v.w, v.h);
  ctx.restore();
}


// ======================= 휘두르기 · 말풍선 · 인터페이스 연결 =======================
let bubble = null;
function say(txt){ bubble = { txt, t: 0 }; }
function drawFx(dt){ drawShots(dt); drawSkillFx(dt); if (typeof vfxZonesTop === 'function') vfxZonesTop(); if (typeof vfxPlayerStatus === 'function') vfxPlayerStatus(); }
function drawBubble(dt, camX, camY){
  const b = $('bubble');
  if (!bubble){ b.style.display = 'none'; return; }
  bubble.t += dt; if (bubble.t > (bubble.dur || 1.8)){ bubble = null; b.style.display = 'none'; return; }
  b.style.display = 'block'; b.textContent = bubble.txt; b.classList.toggle('mono', !!bubble.mono);
  b.style.left = ((P.x - camX) * Z) + 'px'; b.style.top = ((P.y - 112 - camY) * Z) + 'px';
}
function setMax(h, m){ P.maxHp = h; P.maxMp = m; P.hp = Math.min(P.hp, h); P.mp = Math.min(P.mp, m); if (P.hp < 1) P.hp = h; syncBars(); }
function syncBars(){
  document.querySelector('.bar.hp i').style.width = (P.hp / P.maxHp * 100) + '%';
  document.querySelector('.bar.mp i').style.width = (P.mp / P.maxMp * 100) + '%';
  $('hpTxt').textContent = `${P.hp} / ${P.maxHp}` + (P.shield > 0 ? `  (+${Math.ceil(P.shield)})` : ''); $('mpTxt').textContent = `${P.mp} / ${P.maxMp}`;
}
window.GAME = { NUM, P, drink, cast, gainExp, expNeed, targetKillsForLevel, questExp, gainQuestExp, levelTier, tierMinLevel, tierMaxLevel,
  gainMastery, masteryNeed, masteryBonus, investStat, investSkill, skillPrereq, investPassive, investLife, useTownPortal, returnTownPortal, portalState,
  PASSIVE_DEF, LIFE_DEF, syncLifeUnlocks, lifeRank, cdLeft:id=>Math.max(CD[id]||0,id==='holy3_revive'?Math.max(0,((P.reviveReadyAt||0)-Date.now())/1000):0)/(SK[id]?SK[id].cd:1), clearCd:()=>{for(const k in CD)CD[k]=0;P.castRoot=0;},
  setHold:v=>{P.hold=v;}, setWeapon, setGold, near:()=>panel?null:near, act, closeAll, emergencyEscape, locationState, resumeLocation, walkableAt, nearestSafePosition,
  lastVisitedTown:lastVisitedTownState,loadLastVisitedTown,markTownArrival,
  isOpen:()=>!!panel, isPaused:()=>panel==='char'||panel==='settings', setOpen:v=>{panel=v;}, swing, say, setMax };

// ======================= 날씨와 생기 =======================
const W = { state: 'clear', t: rand(55, 90), rain: 0, wind: 1 };
const drops = [], splash = [], leaves = [], birds = [];
const clouds = Array.from({ length: 5 }, () => ({ x: rand(-400, MWp), y: rand(0, MHp), r: rand(260, 460), s: rand(0.6, 1.1) }));
let birdT = rand(6, 14);
function weather(dt, camX, camY, vw, vh){
  W.t -= dt;
  if (W.t <= 0){ W.state = W.state === 'clear' ? 'rain' : 'clear'; W.t = W.state === 'rain' ? rand(25, 45) : rand(70, 140); }
  W.rain += ((W.state === 'rain' ? 1 : 0) - W.rain) * Math.min(1, dt * 0.35);
  W.wind = 1 + Math.sin(performance.now() / 4000) * 0.4 + W.rain * 0.8;
  // 구름 그림자
  for (const c of clouds){
    c.x += 9 * c.s * W.wind * dt; c.y += 2.5 * c.s * dt;
    if (c.x - c.r > MWp){ c.x = -c.r * 1.5; c.y = rand(0, MHp); }
  }
  // 비
  const want = Math.floor(W.rain * 220);
  while (drops.length < want) drops.push({ x: rand(0, vw), y: rand(-vh, 0), v: rand(620, 820), l: rand(10, 18) });
  if (drops.length > want) drops.length = want;
  for (const d of drops){
    d.y += d.v * dt; d.x += d.v * 0.22 * dt;
    if (d.y > vh){
      if (Math.random() < 0.35) splash.push({ x: camX + d.x, y: camY + rand(0, vh), t: 0 });
      d.y = rand(-40, 0); d.x = rand(-80, vw);
    }
  }
  for (const s of splash) s.t += dt;
  while (splash.length && splash[0].t > 0.4) splash.shift();
  // 꽃잎·나뭇잎
  for (const tr of trees){
    if (tr.x < camX - 200 || tr.x > camX + vw + 200 || tr.y < camY - 100 || tr.y - tr.h > camY + vh + 100) continue;
    if (Math.random() < dt * (tr.pink ? 0.9 : 0.35) * (1 + W.rain)){
      leaves.push({ x: tr.x + rand(-tr.w * 0.35, tr.w * 0.35), y: tr.y - tr.h * rand(0.45, 0.85), fy: tr.y + rand(-10, 40),
        vx: rand(8, 22), vy: rand(14, 26), ph: rand(0, 7), t: 0, pink: tr.pink, rot: rand(0, 6) });
    }
  }
  for (const l of leaves){
    l.t += dt;
    if (l.y < l.fy){ l.x += (l.vx * W.wind + Math.sin(l.t * 2 + l.ph) * 18) * dt; l.y += l.vy * dt; l.rot += dt * 2.5; }
    else l.land = (l.land || 0) + dt;
  }
  for (let i = leaves.length - 1; i >= 0; i--) if ((leaves[i].land || 0) > 3) leaves.splice(i, 1);
  // 새 (그림자만)
  birdT -= dt;
  if (birdT <= 0 && W.rain < 0.3){
    birdT = rand(12, 26);
    const n = 2 + Math.floor(rand(0, 4)), fromL = Math.random() < 0.5;
    const y0 = camY + rand(0.1, 0.9) * vh, vx = (fromL ? 1 : -1) * rand(140, 190), vy = rand(-40, 40);
    for (let i = 0; i < n; i++) birds.push({ x: (fromL ? camX - 80 : camX + vw + 80) - Math.sign(vx) * i * rand(28, 50), y: y0 + rand(-40, 40), vx, vy, ph: rand(0, 7) });
  }
  for (const b of birds){ b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * 11; }
  for (let i = birds.length - 1; i >= 0; i--) if (birds[i].x < -300 || birds[i].x > MWp + 300) birds.splice(i, 1);
}
function drawGroundFx(){
  // 구름 그림자
  for (const c of clouds){
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
    const a = 0.10 + W.rain * 0.06;
    g.addColorStop(0, `rgba(20,30,60,${a})`); g.addColorStop(0.6, `rgba(20,30,60,${a * 0.6})`); g.addColorStop(1, 'rgba(20,30,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 1.4, c.r * 0.8, 0, 0, 7); ctx.fill();
  }
  // 빗방울 튀김
  ctx.strokeStyle = 'rgba(220,235,255,.55)'; ctx.lineWidth = 1;
  for (const s of splash){ const r = 2 + s.t * 16; ctx.globalAlpha = 1 - s.t / 0.4; ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.4, 0, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 새 그림자
  for (const b of birds){
    const f = Math.abs(Math.sin(b.ph));
    ctx.fillStyle = 'rgba(20,25,40,.22)';
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 4, 3, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x - 6, b.y - 2 * f, 7, 2 + f * 2, -0.3 - f * 0.5, 0, 7); ctx.ellipse(b.x + 6, b.y - 2 * f, 7, 2 + f * 2, 0.3 + f * 0.5, 0, 7); ctx.fill();
  }
}
function drawLeaves(){
  for (const l of leaves){
    const a = l.land ? Math.max(0, 1 - l.land / 3) : 1;
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(l.t * 3 + l.ph)));
    ctx.fillStyle = l.pink ? '#ffc0d6' : '#7dbb3c'; ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = l.pink ? '#ff8fb5' : '#4f8f25'; ctx.beginPath(); ctx.ellipse(0.8, 0, 2, 1.2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawRain(vw, vh){
  if (W.rain < 0.02) return;
  ctx.fillStyle = `rgba(30,45,80,${0.22 * W.rain})`; ctx.fillRect(0, 0, vw, vh);
  ctx.strokeStyle = `rgba(210,225,255,${0.45 * W.rain})`; ctx.lineWidth = 1.2; ctx.beginPath();
  for (const d of drops){ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.22, d.y - d.l); }
  ctx.stroke();
}


// ======================= 하루 (아침·낮·오후·저녁·밤) =======================
const DAYLEN = 480;  // 하루 8분
const DAY = { t: 0.18 };
const KEYS = [ // 시각, 곱하기 색, 등불 세기
  [0.00, [255, 226, 205], 0.35], [0.08, [255, 246, 236], 0], [0.30, [255, 255, 255], 0], [0.52, [255, 240, 212], 0],
  [0.63, [248, 196, 150], 0.25], [0.71, [150, 130, 190], 0.75], [0.78, [92, 104, 168], 1], [0.92, [86, 96, 160], 1], [1.00, [255, 226, 205], 0.35]];
function dayLook(t){
  for (let i = 0; i < KEYS.length - 1; i++){
    const a = KEYS[i], b = KEYS[i + 1];
    if (t >= a[0] && t <= b[0]){
      const k = (t - a[0]) / (b[0] - a[0]), s = k * k * (3 - 2 * k);
      return { c: a[1].map((v, j) => Math.round(v + (b[1][j] - v) * s)), lamp: a[2] + (b[2] - a[2]) * s };
    }
  }
  return { c: [255, 255, 255], lamp: 0 };
}
const dayName = t => t < 0.08 ? '아침' : t < 0.45 ? '낮' : t < 0.63 ? '오후' : t < 0.74 ? '저녁' : t < 0.95 ? '밤' : '새벽';
const PH = [0.03, 0.25, 0.55, 0.68, 0.82];
$('place').addEventListener('click', () => { const i = PH.findIndex(p => p > DAY.t + 0.005); DAY.t = PH[i < 0 ? 0 : i]; });
function drawDay(camX, camY){
  const L = dayLook(DAY.t);
  const [r, g, b] = L.c;
  if (r < 255 || g < 255 || b < 255){
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, VW, VH);
  }
  if (L.lamp > 0.01){
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.92 + Math.sin(T * 9) * 0.04 + Math.sin(T * 23) * 0.03;
    for (const l of lamps){
      const x = (l.x - camX) * Z, y = (l.y - camY) * Z, rr = l.r * Z * fl;
      if (x < -rr || x > VW + rr || y < -rr || y > VH + rr * 2) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(255,190,90,${0.55 * L.lamp})`); gr.addColorStop(0.35, `rgba(255,150,60,${0.22 * L.lamp})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      // 땅에 떨어지는 빛
      const gy = y + l.r * 0.75 * Z, gr2 = ctx.createRadialGradient(x, gy, 0, x, gy, rr * 0.9);
      gr2.addColorStop(0, `rgba(255,170,80,${0.28 * L.lamp})`); gr2.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = gr2; ctx.beginPath(); ctx.ellipse(x, gy, rr * 0.9, rr * 0.45, 0, 0, 7); ctx.fill();
    }
    // 엘프 둘레의 은은한 빛 (밤에 길을 잃지 않게)
    const px = (P.x - camX) * Z, py = (P.y - 40 - camY) * Z, pr = 150 * Z;
    const gp = ctx.createRadialGradient(px, py, 0, px, py, pr);
    gp.addColorStop(0, `rgba(120,130,170,${0.22 * L.lamp})`); gp.addColorStop(1, 'rgba(120,130,170,0)');
    ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const nm = ($('place').dataset.map || '마을') + ' · ' + dayName(DAY.t);
  if ($('place').textContent !== nm) $('place').textContent = nm;
}

// ======================= 화면 =======================
let VW = 0, VH = 0, Z = 1, dpr = 1;
function resize(){
  dpr = Math.min(devicePixelRatio || 1, 2); VW = innerWidth; VH = innerHeight;
  cv.width = VW * dpr; cv.height = VH * dpr;
  Z = Math.max(0.7, Math.min(1.8, VH / (10.5 * TS)));
  if (location.hash === '#all') Z = Math.min(VW / MWp, VH / MHp);
}
addEventListener('resize', resize); resize();

const mmc = $('mmc'), mx = mmc.getContext('2d');
function drawMini(camX, camY){
  const sx = mmc.width / MWp, sy = mmc.height / MHp;
  mx.drawImage(MINI, 0, 0, mmc.width, mmc.height);
  mx.fillStyle = '#5a3418';
  for (const b of CUR.blds){ const fw = b.w * 0.8; mx.fillRect((b.x - fw / 2) * sx, (b.y - b.h * 0.42) * sy, fw * sx, b.h * 0.34 * sy); }
  mx.fillStyle = '#ffe08a';
  for (const n of npcs){ mx.beginPath(); mx.arc(n.x * sx, n.y * sy, 2.5, 0, 7); mx.fill(); }
  mx.fillStyle = '#e8f2ff'; if (MAP === 'town') for (const v of vils) if (!v.hidden){ mx.beginPath(); mx.arc(v.x * sx, v.y * sy, 2, 0, 7); mx.fill(); }
  else if(MAP==='fieldvillage')for(const v of fvils){mx.beginPath();mx.arc(v.x*sx,v.y*sy,2,0,7);mx.fill();}
  if(window.QUEST&&QUEST.minimapTargets){
    const pulse=.5+.5*Math.sin(T*6.2),r=3.8+pulse*2.8;
    for(const q of QUEST.minimapTargets()){
      const x=q.x*sx,y=q.y*sy;
      mx.save();mx.globalAlpha=.35+.65*pulse;
      mx.fillStyle='#ff2419';mx.beginPath();mx.arc(x,y,r+4,0,7);mx.fill();
      mx.globalAlpha=1;mx.fillStyle='#ff3328';mx.strokeStyle='#fff2df';mx.lineWidth=1.4;
      mx.beginPath();mx.arc(x,y,r,0,7);mx.fill();mx.stroke();mx.restore();
    }
  }
  if (typeof drawEncounterMini === 'function') drawEncounterMini(mx, sx, sy);
  mx.strokeStyle = '#fff8'; mx.lineWidth = 2;
  mx.strokeRect(camX * sx, camY * sy, VW / Z * sx, VH / Z * sy);
  mx.fillStyle = '#ff3b2f'; mx.strokeStyle = '#fff'; mx.beginPath(); mx.arc(P.x * sx, P.y * sy, 5, 0, 7); mx.fill(); mx.stroke();
}

let last = performance.now(), T = 0;
function drawTownPortal(p){
  const pulse=.5+.5*Math.sin(T*4.6),spin=T*1.9;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='rgba(4,5,20,.82)';ctx.beginPath();ctx.ellipse(0,0,48,18,0,0,7);ctx.fill();
  for(let i=0;i<3;i++){
    ctx.strokeStyle=i===0?'rgba(93,225,255,.90)':i===1?'rgba(128,104,255,.78)':'rgba(225,120,255,.60)';
    ctx.lineWidth=4-i;ctx.beginPath();ctx.ellipse(0,0,46-i*7,17-i*3,spin*(i%2?-.18:.22),0,Math.PI*1.55);ctx.stroke();
  }
  ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,-13,4,0,-13,58);g.addColorStop(0,'rgba(170,245,255,.55)');g.addColorStop(.45,'rgba(92,130,255,.20)');g.addColorStop(1,'rgba(120,70,255,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-18,58,50,0,0,7);ctx.fill();
  for(let i=0;i<7;i++){const a=spin+i*2.1,x=Math.cos(a)*32,y=-8-Math.abs(Math.sin(a*1.7+i))*38-pulse*6;ctx.fillStyle='rgba(180,235,255,.65)';ctx.beginPath();ctx.arc(x,y,2+(i%3),0,7);ctx.fill();}
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function drawPortalArrivalAura(){
  const left=portalArrivalUntil-performance.now();if(left<=0)return;
  const a=Math.min(1,left/450),r=28+(1-left/1700)*28;
  ctx.save();ctx.translate(P.x,P.y-34);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,5,0,0,62);g.addColorStop(0,'rgba(210,250,255,.42)');g.addColorStop(.45,'rgba(95,150,255,.24)');g.addColorStop(1,'rgba(120,80,255,0)');
  ctx.globalAlpha=a;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,62,0,7);ctx.fill();
  ctx.strokeStyle='rgba(155,225,255,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,32,r,10,0,T*2,T*2+Math.PI*1.65);ctx.stroke();
  ctx.strokeStyle='rgba(188,120,255,.72)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,18,r*.72,26,0,-T*1.7,-T*1.7+Math.PI*1.45);ctx.stroke();
  ctx.restore();ctx.globalCompositeOperation='source-over';
}
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;T+=dt;
  const simPaused=panel==='char'||panel==='settings'||!!window.ARPG_SYNC_CHECKING||!!window.ARPG_BACKUP_RESTORING,sdt=simPaused?0:dt;
  let dx=joy.dx,dy=joy.dy;
  if (keys.a || keys.arrowleft) dx = -1; if (keys.d || keys.arrowright) dx = 1;
  if (keys.w || keys.arrowup) dy = -1; if (keys.s || keys.arrowdown) dy = 1;
  const mag = Math.hypot(dx, dy);
  const locked=typeof playerControlLocked==='function'&&playerControlLocked();
  P.moving = !simPaused && !panel && !locked && mag > 0.15;
  if (P.hold && !simPaused && !panel && !traveling) attack();   // 공격 버튼을 누르고 있으면 계속 공격
  if (P.moving){
    // 조이스틱을 끝까지 밀면 뛰기, 키보드는 기본 뛰기(Shift 누르면 걷기)
    const kb = !joy.dx && !joy.dy;
    P.run = kb ? !keys.shift : mag > 0.82;
    const statusMul=typeof playerMoveFactor==='function'?playerMoveFactor():1,moveMul=1+Math.max(0,combatNow().move||0)/100;
    const sp=(P.run?320:165*Math.min(1,mag/.82))*(atkBusy()&&!WB[P.atk.wt].noSlow?.7:1)*statusMul*moveMul;   // 공격하면서 움직이면 조금 느려짐
    move(dx / mag * sp * sdt, dy / mag * sp * sdt);
    if (Math.abs(dx) > Math.abs(dy)){ P.dir = 'side'; P.flip = dx < 0; } else P.dir = dy < 0 ? 'back' : 'front';
    P.t += sdt;
  } else P.t = 0;
  if (!panel && !traveling) for (const e of exits) if (P.x > e.x0 && P.x < e.x1 && P.y > e.y0 && P.y < e.y1){ if (e.fn){ e.fn(); break; } const tm = MAPS[e.to]; const pos = e.pos || (tm && tm.spawn) || (e.to === 'town' ? MAPS.out.back : [2 * TS, 2 * TS]); travel(e.to, pos, e.dir || (e.to === 'out' ? 'front' : 'back')); break; }
  if(window.QUEST)QUEST.tick();
  near = null; let bd = 1e9;
  for (const s of spots){ const d = Math.hypot(P.x - s.x, P.y - s.y); if (d < s.r && d < bd){ bd = d; near = s; } }

  if (!isFinite(P.x) || !isFinite(P.y)){ P.x = (CUR.spawn ? CUR.spawn[0] : 23 * TS); P.y = (CUR.spawn ? CUR.spawn[1] : 22.2 * TS); P.atk = null; }
  const vw = VW / Z, vh = VH / Z;
  let camX = P.x - vw / 2, camY = P.y - 30 - vh / 2;
  camX = MWp < vw ? (MWp - vw) / 2 : Math.max(0, Math.min(MWp - vw, camX)); camY = MHp < vh ? (MHp - vh) / 2 : Math.max(0, Math.min(MHp - vh, camY));
  const DUN=MAP==='dungeon', INDOOR=MAP==='inn';
  if(!simPaused){
    if(!DUN&&!INDOOR)weather(dt,camX,camY,vw,vh);
    updAtk(dt);updSkills(dt);if(typeof updEncounters==='function')updEncounters(dt);
    if(typeof updateCompanion==='function')updateCompanion(sdt);
    if(window.COMPANION&&COMPANION.ensureTownTests)COMPANION.ensureTownTests();
    if(MAP==='town')updVils(dt,dayLook(DAY.t).lamp>0.6);
    else if(MAP==='fieldvillage')updFieldVils(dt);
  }

  if (INDOOR){ ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#120a05'; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.setTransform(dpr * Z, 0, 0, dpr * Z, -camX * dpr * Z, -camY * dpr * Z);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(G, 0, 0, MWp, MHp);
  if(!DUN&&!INDOOR)drawGroundFx();
  if (typeof drawEncounterGround === 'function') drawEncounterGround(sdt);
  vfxGroundPass();

  const list = sprites.filter(s => s.x + s.w / 2 > camX && s.x - s.w / 2 < camX + vw && s.y > camY && s.y - s.h < camY + vh);
  list.push({ me: true, key: P.y });
  if (MAP === 'town') for (const v of vils) if (!v.hidden) list.push({ vil: v, key: v.y });
  else if (MAP === 'fieldvillage') for (const v of fvils) list.push({vil:v,key:v.y});
  if (typeof appendEncounterSprites === 'function') appendEncounterSprites(list);
  if (typeof appendCompanionSprite === 'function') appendCompanionSprite(list);
  list.sort((a, b) => a.key - b.key);
  for (const s of list){
    if (s.hide) continue;
    if (s.me){ drawPortalArrivalAura();drawMe();drawShield(); continue; }
    if (s.companion){ if(typeof drawCompanion==='function')drawCompanion(s.companion,sdt); continue; }
    if (s.portal){drawTownPortal(s);continue;}
    if (s.vil){ drawVil(s.vil); continue; }
    if (s.mon){ drawMonster(s.mon, sdt); continue; }
    if (s.dummy){ // 맞으면 흔들림
      const d = s.dummy; d.wob = Math.max(0, d.wob - dt * 2.2); d.ph += dt * 22;
      const sk = Math.sin(d.ph) * 0.09 * d.wob * (d.dir || 1);
      ctx.save(); ctx.translate(s.x, s.y); ctx.transform(1, 0, sk, 1, 0, 0); ctx.drawImage(s.img, -s.w / 2, -s.h, s.w, s.h); ctx.restore(); continue;
    }
    if (s.tree){ // 바람에 우듬지가 살짝 흔들림
      const sk = Math.sin(T * 1.3 + s.ph) * 0.012 * W.wind;
      ctx.save(); ctx.translate(s.x, s.y); ctx.transform(1, 0, sk, 1, 0, 0);
      ctx.drawImage(s.img, -s.w / 2, -s.h, s.w, s.h); ctx.restore(); continue;
    }
    if (s.title){ // 사람: 그림자 + 숨쉬기
      ctx.fillStyle = 'rgba(0,0,0,.26)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w * 0.28, 6, 0, 0, 7); ctx.fill();
      const br = 1 + Math.sin(T * 2.2 + s.ph) * 0.014;
      ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h * br, s.w, s.h * br);
      if(s.companion){
        ctx.save();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(20,14,8,.9)';ctx.fillStyle='#ffe58a';
        const tt='TEST · '+s.name;ctx.strokeText(tt,s.x,s.y-s.h-10);ctx.fillText(tt,s.x,s.y-s.h-10);ctx.restore();
      }
      continue;
    }
    if (s.shadow){ ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(s.x + s.w * 0.10, s.y + 4, Math.max(8, s.w * 0.28), Math.max(3, s.w * 0.08), 0.22, 0, 7); ctx.fill(); }
    if(s.stash&&window.UI&&UI.stashOpen()){const im=BI.personal_stash_open,h=s.w*im.naturalHeight/im.naturalWidth;if(im.complete&&im.naturalWidth)ctx.drawImage(im,s.x-s.w/2,s.y-h,s.w,h);else ctx.drawImage(s.img,s.x-s.w/2,s.y-s.h,s.w,s.h);}
    else ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h, s.w, s.h);
  }
  if(typeof drawTownTestCompanionsForced==='function')drawTownTestCompanionsForced();
  if(window.QUEST)QUEST.draw();
  if(!DUN&&!INDOOR)drawLeaves();
  drawFx(sdt); if (typeof drawEncounterFx === 'function') drawEncounterFx(sdt);
  if(typeof drawCompanionFx==='function')drawCompanionFx(sdt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  DAY.t = (DAY.t + sdt / DAYLEN) % 1;
  if(!DUN&&!INDOOR)drawDay(camX,camY);else if($('place').textContent!==CUR.name)$('place').textContent=CUR.name;
  if (typeof drawDungeonShade === 'function') drawDungeonShade(camX, camY);
  if(!DUN&&!INDOOR)drawRain(VW,VH);

  const tag = $('tag');
  if (near && !panel){
    tag.style.display = 'block'; tag.textContent = near.name;
    const ty = near.kind === 'npc' ? near.npc.y - near.npc.h - 8 : P.y - 104;
    const tx = near.kind === 'npc' ? near.npc.x : P.x;
    tag.style.left = ((tx - camX) * Z) + 'px'; tag.style.top = ((ty - camY) * Z) + 'px';
  } else tag.style.display = 'none';
  drawMini(camX, camY);
  drawBubble(dt, camX, camY);
  requestAnimationFrame(frame);
}
// ======================= 무기 들기와 공격 모션 =======================
// 몸 그림(무기 없음) 위·아래에 무기 아이콘(5종×10등급)을 따로 그려 얹는다.
// 무기 아이콘은 모두 "끝이 위, 손잡이가 아래"로 서 있다. 각도 0 = 끝이 위, 시계 방향이 +.
const WIMG = {}; for (const k in A.wpn) WIMG[k] = load(A.wpn[k]);
let WPN=null;
function combatNow(){return window.UI&&UI.combatMods?UI.combatMods():{phys:WPN?WPN.dmg:1,magic:WPN?WPN.dmg:1,as:0,crit:5,critDmg:150,fire:0,ice:0,skill:0,manaReduce:0,move:0};}
function setWeapon(it){
  const st=it?(window.UI&&UI.itemStats?UI.itemStats(it):it.st||{}):{};
  WPN=it?{wt:it.wt,img:WIMG[it.icon],dmg:st.atk||st.matk||1,item:it}:null;
  const cm=combatNow();
  for(const k in WB)DUR[k]=WB[k].dur/(1+Math.max(0,cm.as||0)/100);
}
function basicDamage(){const cm=combatNow(),wm=(WPN&&WB[WPN.wt]&&WB[WPN.wt].dmg)||1;return Math.max(1,Math.round((WPN&&WPN.wt==='staff'?cm.magic:cm.phys)*wm));}
function rollPlayerDamage(base){
  const cm=combatNow(),crit=Math.random()<Math.max(0,cm.crit||0)/100;
  return {v:Math.max(1,Math.round(base*(crit?(cm.critDmg||150)/100:1))),crit};
}
const WL = { sword: 60, spear: 94, bow: 62, staff: 80, gauntlet: 24 };      // 화면에서의 길이
const GRIP = { sword: 0.84, spear: 0.7, bow: 0.5, staff: 0.72, gauntlet: 0.5 }; // 손잡이 위치(위에서부터 비율)
// 무기별 기준(같은 단계·같은 옵션일 때). 아이템 옵션이 이 값을 올리거나 내린다. docs/weapons.md
const WB = {   // dmg: 기본 공격 한 방 배율, kb: 넉백(칸), stagger: 경직(주먹). 케인 확정 2026-10-04: 근접 우대·원거리 감쇠
  sword:    { dur: 0.62, reach: 92, cone: 90, dmg: 1.75, kb: 28 },                             // 묵직하지만 너무 느리지 않은 넓은 부채꼴, 약한 넉백(케인 2026-10-04 보정)
  spear:    { dur: 0.50, reach: 120, width: 20, pierce: 2, kb: 70 },                          // 길고 좁은 일직선, 두 마리 관통, 큰 넉백
  gauntlet: { dur: 0.22, reach: 56, width: 34, pierce: 1, stagger: 1, kb: 8 },                // 아주 짧고 빠름, 경직 + 아주 작은 넉백
  bow:      { dur: 0.35, speed: 820, life: 0.75, noSlow: 1, dmg: 0.85 },                      // 빠르고 아주 멀리, 걸어도 안 느려짐
  staff:    { dur: 0.75, speed: 300, life: 1.2, blast: 52, dmg: 0.8 },                        // 느린 구슬, 맞은 자리 폭발
};
const DUR = {}; for (const k in WB) DUR[k] = WB[k].dur;
const PI = Math.PI;
function wDraw(x, y, ang, sc = 1, mir = false){
  const im = WPN && WPN.img; if (!im || !im.complete || !im.naturalWidth) return;
  const L = WL[WPN.wt] * sc, w = L * im.naturalWidth / im.naturalHeight;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (mir) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -L * GRIP[WPN.wt], w, L); ctx.restore();
}
const shots = [];
function attack(){
  if (typeof playerControlLocked === 'function' && playerControlLocked()) return;
  if (!WPN){ say('맨손입니다'); return; }
  if(P.atk&&P.atk.t<(P.atk.dur||DUR[P.atk.wt])*.75)return;
  if(typeof autoAimMonster==='function')autoAimMonster();
  P.atk={t:0,wt:WPN.wt,dir:P.dir,flip:P.flip,n:P.atk?P.atk.n+1:0,shot:false,dur:DUR[WPN.wt]};
}
function swing(){ attack(); }
const atkBusy=()=>!!P.atk&&P.atk.t<(P.atk.dur||DUR[P.atk.wt]);
function updAtk(dt){
  if (!P.atk) return;
  const a=P.atk;a.t+=dt;
  const k=a.t/(a.dur||DUR[a.wt]);
  if (!a.hit && k > 0.45 && a.wt !== 'bow' && a.wt !== 'staff'){
    a.hit = true;
    const d = a.dir === 'front' ? [0, 1] : a.dir === 'back' ? [0, -1] : [a.flip ? -1 : 1, 0];
    const w = WB[a.wt], hits = [];
    for (const t of combatTargets()){
      const dx = t.x - P.x, dy = t.y - P.y, along = dx * d[0] + dy * d[1], side = Math.abs(dx * d[1] - dy * d[0]), dist = Math.hypot(dx, dy);
      if (w.cone){ if (dist < w.reach && (dist < 20 || along / dist > Math.cos(w.cone * PI / 180))) hits.push([along, t]); }
      else if (along > -10 && along < w.reach && side < w.width) hits.push([along, t]);
    }
    hits.sort((p, q) => p[0] - q[0]);
    hits.slice(0, w.pierce || 99).forEach(([, t]) => hitTarget(t, d, w.stagger, undefined, w.kb));
  }
  if (!a.shot && k > 0.45 && (a.wt === 'bow' || a.wt === 'staff')){
    a.shot = true;
    const d = a.dir === 'front' ? [0, 1] : a.dir === 'back' ? [0, -1] : [a.flip ? -1 : 1, 0];
    const w=WB[a.wt],home=a.wt==='staff'?((P.passives&&P.passives.magicGuide)||0):0,homeRange=home?260+home*90:0;
    const aim=a.wt==='staff'&&home>0?magicAim(w.speed,homeRange):{vx:d[0]*w.speed,vy:d[1]*w.speed,target:null};
    const ux=aim.vx/w.speed, uy=aim.vy/w.speed;
    const sx=a.wt==='staff'?P.x+ux*24:P.x+(a.dir==='side'?d[0]*30:0);
    const sy=a.wt==='staff'?P.y-44+uy*24:P.y+(a.dir==='front'?-34:a.dir==='back'?-80:-44);
    shots.push({x:sx,y:sy,vx:aim.vx,vy:aim.vy,speed:w.speed,t:0,life:w.life,kind:a.wt,blast:w.blast||0,home,homeRange,target:aim.target});
  }
  if (k > 1.2) P.atk = null;
}
function hitTarget(t, d, stagger, dmOver, kbOver){
  if (t.monster) return hitMonster(t, d, stagger, dmOver, kbOver);
  const rr=rollPlayerDamage(dmOver||basicDamage()),v=rr.v,crit=rr.crit;
  t.dummy.wob = stagger ? 1.4 : 1; t.dummy.dir = d[0] || (Math.random() < 0.5 ? -1 : 1);
  pops.push({ x: t.x + (Math.random() * 16 - 8), y: t.y - t.h * 0.75, t: 0, txt: String(v), crit });
}
const pops = [];
function drawPops(dt){
  for (const p of pops){
    p.t += dt; const k = p.t / 0.9;
    ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.font = `900 ${p.crit ? 26 : 20}px sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a140a'; ctx.fillStyle = p.heal ? '#8dffb0' : p.mana ? '#8fd0ff' : p.enemy ? '#ff8f82' : p.crit ? '#ffcf3a' : '#fff4dc';
    const y = p.y - k * 34; ctx.strokeText(p.txt, p.x, y); ctx.fillText(p.txt, p.x, y);
  }
  ctx.globalAlpha = 1;
  while (pops.length && pops[0].t > 0.9) pops.shift();
}
function nearestShotTarget(x, y, lim = 720){
  let best = null, bd = lim;
  for (const t of combatTargets()){
    if (!t || t.dead || t.removed) continue;
    const ty = t.y - (t.h || 60) * 0.45, d = Math.hypot(t.x - x, ty - y);
    if (d < bd){ bd = d; best = t; }
  }
  return best;
}
function magicAim(speed, lim = 720){
  const t = nearestShotTarget(P.x, P.y - 44, lim);
  if (!t){
    const d = P.dir === 'front' ? [0,1] : P.dir === 'back' ? [0,-1] : [P.flip ? -1 : 1,0];
    return { vx:d[0]*speed, vy:d[1]*speed, target:null };
  }
  const tx=t.x, ty=t.y-(t.h||60)*0.45, dx=tx-P.x, dy=ty-(P.y-44), d=Math.hypot(dx,dy)||1;
  // 캐릭터 모션 방향도 타깃의 주축 방향에 맞춘다. 투사체 자체는 실제 좌표로 발사.
  if (Math.abs(dx) > Math.abs(dy)){ P.dir='side'; P.flip=dx<0; } else { P.dir=dy<0?'back':'front'; P.flip=false; }
  return { vx:dx/d*speed, vy:dy/d*speed, target:t };
}
function guideShot(s, dt){
  if (!s.home || s.done) return;
  const lim=s.homeRange||420;
  if (!s.target || s.target.dead || s.target.removed) s.target = nearestShotTarget(s.x, s.y, lim);
  const t = s.target; if (!t) return;
  const tx = t.x, ty = t.y - (t.h || 60) * 0.45, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1;
  const speed = s.speed || Math.hypot(s.vx, s.vy) || 300;
  const blend = Math.min(1, dt * (2.5 + s.home * 2.2));
  s.vx += (dx / d * speed - s.vx) * blend;
  s.vy += (dy / d * speed - s.vy) * blend;
}
function drawShots(dt){
  drawPops(dt);
  for (const s of shots){
    if (s.wait > 0){ s.wait -= dt; continue; }   // 알갱이는 조금씩 시간차로 나간다
    if (!s.done) guideShot(s, dt);
    s.t += dt;
    const nx=s.x+s.vx*dt, ny=s.y+s.vy*dt;
    if(!s.done && blocked(nx,ny)){s.x=nx;s.y=ny;boom(s,null);}
    else{s.x=nx;s.y=ny;}
    if (!s.done){
      if (s.pierce){   // 관통: 대상마다 한 번씩 맞히고 계속 날아간다(검기·파편·파동권)
        const hw = s.hw || 22;
        for (const t of combatTargets()){
          const again = s.rehit ? (!s.hit.has(t) || s.t - s.hit.get(t) > s.rehit) : !s.hit.has(t);   // rehit: 닿아 있는 동안 계속 감전
          if (again && Math.abs(s.x - t.x) < hw && s.y > t.y - t.h * 0.85 - hw * .6 && s.y < t.y + hw * .6){ if (s.rehit) s.hit.set(t, s.t); else s.hit.add(t); pierceHit(s, t); }
        }
      } else {
        for (const t of combatTargets()){ if (Math.abs(s.x - t.x) < 22 && s.y > t.y - t.h * 0.85 && s.y < t.y){ boom(s, t); break; } }
      }
      if (!s.done && s.t > s.life) boom(s, null);
    }
    if (s.done){ // 지팡이 폭발 고리
      if (s.blast && !vfxReady('burst_fire_0')){ s.bt = (s.bt || 0) + dt; const k = Math.min(1, s.bt / 0.3);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = s.kind === 'fire' ? '#ffb070' : '#bfe4ff'; ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, s.blast * (0.4 + 0.6 * k), s.blast * (0.25 + 0.4 * k), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      continue;
    }
    const al = Math.min(1, (s.life - s.t) / 0.15); ctx.globalAlpha = Math.max(0, al);
    const a = Math.atan2(s.vy, s.vx);
    if (vfxShot(s, a)) continue;
    if (s.kind === 'bow'){
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#d8d8e0'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
      ctx.fillStyle = '#f3e6c8'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-27, -4); ctx.lineTo(-19, 0); ctx.lineTo(-27, 4); ctx.fill();
      ctx.restore();
    } else if (s.kind === 'ice'){
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.fillStyle = '#d9f3ff'; ctx.strokeStyle = '#5ab4ff'; ctx.lineWidth = 2;
      if (s.pellet) ctx.scale(.45, .45);
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-6, -6); ctx.lineTo(-14, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    } else {
      const fire = s.kind === 'fire', R0 = fire ? 17 : 14;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, fire ? '#ffb347' : '#9fd8ff'); g.addColorStop(1, fire ? 'rgba(255,90,20,0)' : 'rgba(90,160,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R0, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  while (shots.length && shots[0].done && (!shots[0].blast || shots[0].bt > 0.3)) shots.shift();
}
function boom(s,t){
  const vx=s.vx,vy=s.vy;s.done=true;s.vx=s.vy=0;
  const hit=(u)=>{
    hitTarget(u,[Math.sign(u.x-s.x)||Math.sign(vx)||1,Math.sign((u.y-30)-s.y)||Math.sign(vy)||0],!!s.stagger,s.dmg);
    if(s.status&&typeof applyMonsterStatus==='function')applyMonsterStatus(u,s.status,s.statusDur||2.5);
    if(s.chill){const now=performance.now()/1000;if(now-(u.chillAt||-9)>1.6)u.chillN=0;u.chillAt=now;u.chillN=(u.chillN||0)+1;if(s.chillFreeze&&u.chillN>=3){u.chillN=0;applyMonsterStatus(u,'freeze',s.chillFreeze);}}
  };
  if(s.blast){
    for(const u of combatTargets())if(Math.hypot(u.x-s.x,(u.y-30)-s.y)<s.blast+16)hit(u);
    sfx.push({type:s.fx||(s.kind==='fire'?'fireburst':s.kind==='ice'?'iceburst':'impact'),t:0,x:s.x,y:s.y,r:s.blast});
  }else if(t){
    hit(t);sfx.push({type:s.fx||(s.kind==='ice'?'icehit':'impact'),t:0,x:s.x,y:s.y,r:s.pellet?22:34});
  }
}

// ======================= 1차 전투 스킬 =======================
const SK={
  fire1:{mp:5,cd:1.35},      // 화염구: 강한 광역 + 화상
  ice1:{mp:8,cd:12},         // 빙결 보호막: 피해 흡수막 + 깨질 때 주변 빙결
  holy1_heal:{mp:7,cd:4.5},  // 치유: 큰 즉시 회복
  sword1:{mp:3,cd:.95},      // 강베기: 강한 전방 부채꼴 + 경직
  sword2:{mp:6,cd:2.2},      // 회전베기: 넓은 전방위 + 밀치기
};
const CD = {}; const sfx = [];
function faceVec(){ return P.dir === 'front' ? [0, 1] : P.dir === 'back' ? [0, -1] : [P.flip ? -1 : 1, 0]; }
function cast(id,mod){
  if(typeof playerControlLocked==='function'&&playerControlLocked())return false;
  const k=SK[id],rank=(P.skillLv&&P.skillLv[id])||0;if(!k||rank<1)return false;mod=mod||{dmg:1,mp:1};
  if((CD[id]||0)>0)return false;
  const cm=combatNow(),cost=Math.max(k.mp===0?0:1,Math.round(k.mp*NUM*mod.mp*(1-(cm.manaReduce||0)/100)));
  if(P.mp<cost){say('마나가 부족합니다');return false;}
  P.mp-=cost;CD[id]=k.cd;syncBars();
  const d=faceVec(),home=(P.passives&&P.passives.magicGuide)||0;
  const skillMul=(1+(rank-1)*.18)*(1+(cm.skill||0)/100);
  if(id==='fire1'){
    const base=Math.max(8,cm.magic)*mod.dmg*skillMul*(1+(cm.fire||0)/100);
    const range=home?330+home*90:0,aim=home>0?magicAim(280,range):{vx:d[0]*280,vy:d[1]*280,target:null},ux=aim.vx/280,uy=aim.vy/280;
    const blast=100+(rank>=3?14:0)+(rank>=5?18:0);
    shots.push({x:P.x+ux*28,y:P.y-44+uy*28,vx:aim.vx,vy:aim.vy,speed:280,t:0,life:2.1,kind:'fire',blast,dmg:Math.round(base*(2.45+rank*.08)),status:'burn',statusDur:3.2+rank*.25,stagger:rank>=3,home,homeRange:range,target:aim.target});
    sfx.push({type:'castfire',t:0,x:P.x,y:P.y-36,r:40});
  }else if(id==='ice1'){
    // 빙결 보호막: 얼음막이 피해를 대신 받는다. 막이 깨지면 주변이 얼어붙고, 막이 있는 동안 둔화·석화 같은 상태이상도 막는다.
    const v=Math.round(P.maxHp*.45*skillMul);
    P.shieldKind='ice';P.shield=v;P.shieldMax=v;P.shieldT=10+rank*.5;P.shieldRank=rank;syncBars();
    sfx.push({type:'iceburst',t:0,x:P.x,y:P.y-30,r:70});
  }else if(id==='holy1_heal'){
    const v=Math.round(P.maxHp*(.34+rank*.07));P.hp=Math.min(P.maxHp,P.hp+v);syncBars();
    pops.push({x:P.x,y:P.y-100,t:0,txt:'+'+v,heal:true});sfx.push({type:'heal',t:0,x:P.x,y:P.y-20,r:72});
  }else if(id==='sword1'||id==='sword2'){
    const spin=id==='sword2',reach=spin?128:132,base=Math.max(1,cm.phys)*mod.dmg*skillMul,dm=Math.round(base*(spin?1.72:2.15));
    let hitN=0;
    for(const t of combatTargets()){
      const dx=t.x-P.x,dy=t.y-P.y,dist=Math.hypot(dx,dy);
      if(dist<reach&&(spin||dist<20||(dx*d[0]+dy*d[1])/dist>Math.cos(95*PI/180))){
        hitTarget(t,d,true,dm);hitN++;
      }
    }
    sfx.push({type:spin?'spinpower':'slashpower',t:0,a:Math.atan2(d[1],d[0]),x:P.x,y:P.y-30,r:reach});
    if(hitN)pops.push({x:P.x,y:P.y-115,t:0,txt:spin?'회전 베기!':'강베기!',crit:true});
  }else if(SK2[id]){
    if(castExtra(id,d,rank,cm,mod,skillMul)===false){P.mp+=cost;CD[id]=0;syncBars();return false;}
  }
  // 공통 규칙: 스킬을 쓰면 다른 슬롯도 잠깐 잠기고, 큰 스킬은 시전 중 제자리에 선다
  for(const o in SK)if(o!==id)CD[o]=Math.max(CD[o]||0,Math.min(GCD,SK[o].cd));
  if(k.root)P.castRoot=k.root;
  return true;
}
// 빙결 보호막: 들어온 피해를 먼저 막이 받는다. 남은 피해만 돌려준다.
function absorbShield(v){
  if(!(P.shield>0))return v;
  const ab=Math.min(P.shield,v);P.shield-=ab;
  pops.push({x:P.x,y:P.y-100,t:0,txt:'막 -'+Math.round(ab),mana:true});
  if(P.shield<=0){P.shield=0;breakShield();}
  syncBars();return v-ab;
}
function breakShield(){
  if(P.shieldKind==='holy'){sfx.push({type:'holyshield',t:0,x:P.x,y:P.y-30,r:80});return;}
  const rank=P.shieldRank||1;let n=0;
  for(const t of (typeof combatTargets==='function'?combatTargets():[])){
    if(Math.hypot(t.x-P.x,t.y-P.y)<150&&typeof applyMonsterStatus==='function'){applyMonsterStatus(t,'freeze',.9+rank*.1);applyMonsterStatus(t,'slow',3);n++;}
  }
  sfx.push({type:'iceburst',t:0,x:P.x,y:P.y-30,r:150});
}
function drawShield(){
  if(!(P.shield>0))return;
  const holy=P.shieldKind==='holy',k=Math.max(0,Math.min(1,P.shield/(P.shieldMax||1)));
  let al=.6+.4*k;if(P.shieldT<2)al*=.55+.45*Math.sin(T*16);
  const c1=holy?'255,215,95':'120,205,255',c2=holy?'255,240,170':'225,250,255';
  ctx.save();ctx.translate(P.x,P.y-40);ctx.globalAlpha=al;
  // 발밑 서리 고리
  ctx.save();ctx.translate(0,44);ctx.scale(1,.32);
  ctx.strokeStyle='rgba('+c1+',.5)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,40,0,7);ctx.stroke();
  ctx.strokeStyle='rgba('+c2+',.8)';ctx.lineWidth=1.5;ctx.setLineDash([6,9]);ctx.lineDashOffset=-T*14;ctx.beginPath();ctx.arc(0,0,48,0,7);ctx.stroke();
  ctx.restore();
  // 막 본체
  const g=ctx.createRadialGradient(-10,-18,6,0,0,60);g.addColorStop(0,'rgba('+c2+',.16)');g.addColorStop(.7,'rgba('+c1+',.14)');g.addColorStop(1,'rgba('+c1+',.46)');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,44,58,0,0,7);ctx.fill();
  // 결정 면 무늬 + 훑고 지나가는 빛
  ctx.save();ctx.beginPath();ctx.ellipse(0,0,44,58,0,0,7);ctx.clip();
  ctx.strokeStyle='rgba('+c2+',.26)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=-3;i<=3;i++){ctx.moveTo(i*18,-60);ctx.lineTo(i*18+30,60);ctx.moveTo(i*18,-60);ctx.lineTo(i*18-30,60);}
  ctx.stroke();
  const sx=((T*60)%220)-110,gl=ctx.createLinearGradient(sx-14,0,sx+14,0);
  gl.addColorStop(0,'rgba(255,255,255,0)');gl.addColorStop(.5,'rgba(255,255,255,.35)');gl.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gl;ctx.fillRect(sx-14,-60,28,120);
  ctx.restore();
  // 테두리
  ctx.strokeStyle='rgba('+c2+',.95)';ctx.lineWidth=2.2;ctx.beginPath();ctx.ellipse(0,0,44,58,0,0,7);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,41,55,0,Math.PI*1.1,Math.PI*1.42);ctx.stroke();
  if(k<.4){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-14,-38);ctx.lineTo(-4,-14);ctx.lineTo(-18,4);ctx.moveTo(10,-30);ctx.lineTo(18,-6);ctx.stroke();}
  // 도는 얼음 조각
  ctx.fillStyle='rgba('+c2+',.95)';
  for(let i=0;i<4;i++){const a=T*1.3+i*1.571;ctx.save();ctx.translate(Math.cos(a)*46,Math.sin(a)*60);ctx.rotate(a+1.57);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(3,0);ctx.lineTo(0,6);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();ctx.restore();}
  ctx.restore();
}
let potCd = 0;
function drink(k){
  if (potCd > 0) return false;
  if (k === 'hp' ? P.hp >= P.maxHp : P.mp >= P.maxMp){ say(k === 'hp' ? '체력이 가득합니다… 아까워요' : '마나가 가득합니다… 아까워요'); return false; }
  const v = Math.round((k === 'hp' ? P.maxHp : P.maxMp) * 0.4);
  if (k === 'hp') P.hp = Math.min(P.maxHp, P.hp + v); else P.mp = Math.min(P.maxMp, P.mp + v);
  if(window.TELEMETRY)TELEMETRY.potion(k);
  potCd = 1; syncBars(); pops.push({ x: P.x, y: P.y - 100, t: 0, txt: '+' + v, heal: k === 'hp', mana: k === 'mp' });
  return true;
}
function updSkills(dt){
  P.reviveGrace=Math.max(0,(P.reviveGrace||0)-dt);
  potCd = Math.max(0, potCd - dt);
  P.castRoot = Math.max(0, (P.castRoot || 0) - dt);
  updZones(dt);
  for (const id in CD) CD[id] = Math.max(0, CD[id] - dt);
  if (P.shield > 0){ P.shieldT -= dt; if (P.shieldT <= 0){ P.shield = 0; syncBars(); } }
  if (P.mp < P.maxMp){ P.mpAcc = (P.mpAcc || 0) + dt * 2 * NUM; if (P.mpAcc >= 1){ const n = Math.floor(P.mpAcc); P.mpAcc -= n; P.mp = Math.min(P.maxMp, P.mp + n); syncBars(); } }
}
function drawSkillFx(dt){
  for(const f of sfx){
    f.t+=dt;const dur=VFX_DUR[f.type]||.38,k=f.t/dur;if(k>1)continue;
    const x=f.x??P.x,y=f.y??P.y-30,r=f.r||72;
    if(vfxSkill(f,k,x,y,r))continue;
    ctx.save();ctx.globalAlpha=Math.max(0,1-k);ctx.lineCap='round';
    if(f.type==='heal'){
      ctx.strokeStyle='#8dffb0';ctx.lineWidth=5*(1-k)+2;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+14,r*(.35+k*.65)-i*8,12+k*20-i*2,0,0,7);ctx.stroke();}
      ctx.strokeStyle='#fffbd0';ctx.beginPath();ctx.moveTo(x,y-r*.65);ctx.lineTo(x,y+r*.15);ctx.stroke();
    }else if(f.type==='fireburst'){
      const R=r*(.25+k*.8);ctx.strokeStyle='#ff9d35';ctx.lineWidth=10*(1-k)+2;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.stroke();
      ctx.strokeStyle='#fff0a0';ctx.lineWidth=4;for(let i=0;i<10;i++){const a=i*PI/5+.25;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*R*.35,y+Math.sin(a)*R*.35);ctx.lineTo(x+Math.cos(a)*R*1.15,y+Math.sin(a)*R*1.15);ctx.stroke();}
    }else if(f.type==='iceburst'||f.type==='icehit'){
      const R=r*(.3+k*.8);ctx.strokeStyle='#8de4ff';ctx.lineWidth=6*(1-k)+2;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.stroke();
      ctx.fillStyle='#dff8ff';for(let i=0;i<8;i++){const a=i*PI/4+.2,rr=R*(.55+.35*(i%2));ctx.save();ctx.translate(x+Math.cos(a)*rr,y+Math.sin(a)*rr);ctx.rotate(a);ctx.fillRect(-2,-10*(1-k),4,20*(1-k));ctx.restore();}
    }else if(f.type==='spinpower'){
      ctx.strokeStyle='#fff1a8';ctx.lineWidth=16*(1-k)+3;ctx.beginPath();ctx.ellipse(x,y,r*(.6+k*.35),r*(.38+k*.18),0,k*5.5,k*5.5+5.8);ctx.stroke();
      ctx.strokeStyle='#ff8e35';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,y,r*(.48+k*.28),r*(.3+k*.12),0,k*5.5+1,k*5.5+5.2);ctx.stroke();
    }else if(f.type==='slashpower'){
      ctx.strokeStyle='#fff1a8';ctx.lineWidth=18*(1-k)+3;ctx.beginPath();ctx.arc(x,y,r*(.55+k*.22),f.a-1.55,f.a+1.55);ctx.stroke();
      ctx.strokeStyle='#ff9d35';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,r*(.42+k*.18),f.a-1.35,f.a+1.35);ctx.stroke();
    }else if(f.type==='castfire'||f.type==='castice'){
      ctx.strokeStyle=f.type==='castfire'?'#ff8a2a':'#7ddcff';ctx.lineWidth=4*(1-k)+1;ctx.beginPath();ctx.arc(x,y,r*(.7+k*.55),0,7);ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,r*(.45+k*.35),k*4,k*4+4.8);ctx.stroke();
    }else{
      ctx.strokeStyle='#ffe9b0';ctx.lineWidth=10*(1-k)+2;ctx.beginPath();ctx.arc(x,y,r*(.4+k*.6),0,7);ctx.stroke();
    }
    ctx.restore();
  }
  while(sfx.length&&sfx[0].t>.8)sfx.shift();
}

// 무기 속성(화염의·서리의 옵션)에 따라 휘두름·찌르기·타격 효과의 색이 바뀐다. 속성이 없으면 흰색·금색.
const FXPAL = { neutral:{ glow:[255,196,96], body:[255,238,176], core:[255,255,255] }, fire:{ glow:[255,100,24], body:[255,164,66], core:[255,238,196] }, ice:{ glow:[70,160,255], body:[168,224,255], core:[244,252,255] } };
let FXC = FXPAL.neutral;
const fxA = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
function atkPalette(){ const it=WPN&&WPN.item,st=it?(window.UI&&UI.itemStats?UI.itemStats(it):it.st||{}):{}, f = st.fire || 0, c = st.ice || 0; return f > 0 && f >= c ? FXPAL.fire : c > 0 ? FXPAL.ice : FXPAL.neutral; }
// 휘두름 궤적(초승달)
function arcFx(cx, cy, r, a0, a1, k){
  if (k <= 0 || k >= 1) return;
  const st = Math.min(a0, a1) - PI / 2, en = Math.max(a0, a1) - PI / 2; if (en - st < 0.05) return;
  const fade = 1 - k, n = 18;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = fxA(FXC.glow, .24 * fade); ctx.lineWidth = 18 * (1 - k * .5);   // 바깥 빛번짐
  ctx.beginPath(); ctx.arc(cx, cy, r, st, en); ctx.stroke();
  ctx.beginPath();   // 꼬리는 가늘고 머리(칼끝 쪽)는 굵은 초승달
  for (let i = 0; i <= n; i++){ const t = i / n, an = st + (en - st) * t, w = (1.5 + 15 * Math.pow(t, 1.6)) * (1 - .35 * k), rr = r + w * .55; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
  for (let i = n; i >= 0; i--){ const t = i / n, an = st + (en - st) * t, w = (1.5 + 15 * Math.pow(t, 1.6)) * (1 - .35 * k), rr = r - w * .45; ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
  ctx.closePath(); ctx.fillStyle = fxA(FXC.body, .62 * fade); ctx.fill();
  ctx.strokeStyle = fxA(FXC.core, .95 * fade); ctx.lineWidth = 3.4 * (1 - k) + 1;   // 흰 심지
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, st + (en - st) * .3, en); ctx.stroke();
  const hx = cx + Math.cos(en) * r, hy = cy + Math.sin(en) * r, g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 15);   // 칼끝 섬광
  g.addColorStop(0, fxA(FXC.core, fade)); g.addColorStop(1, fxA(FXC.glow, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 15, 0, 7); ctx.fill();
  ctx.restore();
}
const lerp = (a, b, t) => a + (b - a) * t;
// 찌르기 궤적(창): 잎사귀꼴 본체 + 속도선 + 끝 섬광 + 퍼지는 물결. ang = 찌르는 방향(캔버스 각도)
function thrustFx(x, y, ang, t, r, len){
  if (t <= 0 || r >= 1) return;
  const L = (len || 74) * Math.min(1, t * 1.15), fade = 1 - r, ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, tx = x + ca * L, ty = y + sa * L;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ca * L * .62 + nx * 7, y + sa * L * .62 + ny * 7); ctx.lineTo(tx, ty); ctx.lineTo(x + ca * L * .62 - nx * 7, y + sa * L * .62 - ny * 7); ctx.closePath();
  ctx.fillStyle = fxA(FXC.body, .55 * fade); ctx.fill();
  ctx.strokeStyle = fxA(FXC.core, .95 * fade); ctx.lineWidth = 2.6 * fade + .8;
  ctx.beginPath(); ctx.moveTo(x + ca * L * .18, y + sa * L * .18); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = fxA(FXC.body, .5 * fade); ctx.lineWidth = 1.6;
  for (const o of [-11, 11]){ ctx.beginPath(); ctx.moveTo(x + ca * L * .18 + nx * o, y + sa * L * .18 + ny * o); ctx.lineTo(x + ca * L * .66 + nx * o, y + sa * L * .66 + ny * o); ctx.stroke(); }
  const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14); g.addColorStop(0, fxA(FXC.core, fade)); g.addColorStop(1, fxA(FXC.glow, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 14, 0, 7); ctx.fill();
  ctx.strokeStyle = fxA(FXC.body, .6 * fade); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(tx, ty, 9 + 16 * r, ang - 1.0, ang + 1.0); ctx.stroke();
  ctx.restore();
}
// 주먹 충격(건틀릿 아래 공격)
function burst(x, y, r){
  if (r >= 1) return;
  const fade = 1 - r, R0 = 13 + r * 36;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 32); g.addColorStop(0, fxA(FXC.core, fade)); g.addColorStop(.5, fxA(FXC.body, .55 * fade)); g.addColorStop(1, fxA(FXC.glow, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 32, 0, 7); ctx.fill();
  ctx.strokeStyle = fxA(FXC.body, .8 * fade); ctx.lineWidth = 4.2 * fade + 1; ctx.beginPath(); ctx.arc(x, y, R0, 0, 7); ctx.stroke();
  ctx.strokeStyle = fxA(FXC.core, fade); ctx.lineWidth = 2.4 * fade + .6;
  for (let i = 0; i < 8; i++){ const a = i * PI / 4 + .2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R0 * .55, y + Math.sin(a) * R0 * .55); ctx.lineTo(x + Math.cos(a) * (R0 * .55 + 14 + 12 * fade), y + Math.sin(a) * (R0 * .55 + 14 + 12 * fade)); ctx.stroke(); }
  ctx.restore();
}
// 공격 단계: 준비(0~0.3) → 타격(0.3~0.6) → 회수
function phase(k){ return k < 0.3 ? { w: k / 0.3, s: 0, r: 0 } : k < 0.6 ? { w: 1, s: (k - 0.3) / 0.3, r: 0 } : { w: 1, s: 1, r: Math.min(1, (k - 0.6) / 0.4) }; }
function weaponLayers(){
  // 반환: { back: fn, front: fn, lunge:[dx,dy] } — 좌표는 "오른쪽을 보는" 기준(옆모습은 나중에 뒤집음)
  const x = P.x, y = P.y, out = { back: null, front: null, lunge: [0, 0] };
  if (!WPN) return out;
  const wt = WPN.wt;
  if (!atkBusy()) return out; // 걷기·서 있기에는 무기를 그리지 않음
  FXC = atkPalette();
  const a = P.atk, k = Math.min(1, a.t / DUR[wt]), ph = phase(k), d = a.dir;
  const thrust = ph.s * (1 - ph.r), alt = a.n % 2 ? 1 : -1;
  out.lunge = d === 'side' ? [3 * thrust, 0] : d === 'front' ? [0, 3 * thrust] : [0, -3 * thrust];
  if (d === 'side'){ // 무기는 모두 몸 뒤
    if (wt === 'sword'){ const an = ph.s === 0 ? lerp(-0.6, -2.0, ph.w) : lerp(-2.0, 1.9, ph.s) - ph.r * 0.6;
      out.back = () => wDraw(x + 22, y - 32, an);
      out.front = () => arcFx(x + 22, y - 32, 52, -1.6, lerp(-1.6, 1.9, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1)); }
    else if (wt === 'spear') out.back = () => { wDraw(x - 6 - 10 * (1 - ph.w) + 34 * thrust, y - 40, PI / 2); thrustFx(x + 30, y - 40, 0, thrust, ph.r, 76); };
    else if (wt === 'bow') out.back = () => wDraw(x + 20, y - 44, 0, 1, true);
    else if (wt === 'staff') out.back = () => wDraw(x + 26 + 8 * thrust, y - 42, lerp(0.35, 1.2, thrust) - 0.25 * ph.w * (1 - ph.s));
    else out.back = () => { wDraw(x + 18 + 20 * thrust, y - 44 + (alt > 0 ? 8 : -2), -PI / 2, 1.1, true); burst(x + 46, y - 42 + (alt > 0 ? 8 : -2), ph.s > 0 ? ph.r : 1); };  // 주먹(그림 아래쪽)이 앞을 향하게
  } else if (d === 'back'){
    if (wt === 'sword'){ const an = ph.s === 0 ? lerp(0, -1.5, ph.w) : lerp(-1.5, 1.5, ph.s);
      out.back = () => { wDraw(x + 4, y - 58, an); arcFx(x + 4, y - 58, 48, -1.5, lerp(-1.5, 1.5, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1)); }; }
    else if (wt === 'spear') out.back = () => { wDraw(x + 7, y - 58 - 32 * thrust, 0); thrustFx(x + 7, y - 78, -PI / 2, thrust, ph.r, 76); };
    else if (wt === 'bow') out.back = () => wDraw(x, y - 80, PI / 2);
    else if (wt === 'staff') out.back = () => wDraw(x + 9, y - 60 - 8 * thrust, lerp(0.25, -0.1, thrust));
    else out.back = () => { wDraw(x + 10 * alt, y - 70 - 16 * thrust, PI, 1.1); burst(x + 10 * alt, y - 100 - 18 * thrust, ph.s > 0 ? ph.r : 1); };
  } else { // 정면(아래로 공격): 무기는 그리지 않고 이펙트만
    if (wt === 'sword') out.front = () => arcFx(x, y - 30, 46, PI - 1.4, lerp(PI - 1.4, PI + 1.4, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1));
    else if (wt === 'spear') out.front = () => thrustFx(x + 4, y - 30, PI / 2, thrust, ph.r, 70);
    else if (wt === 'gauntlet') out.front = () => burst(x + 10 * alt, y - 18 + 14 * thrust, ph.s > 0 ? ph.r : 1);
  }
  return out;
}
function drawMe(){
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 17, 6, 0, 0, 7); ctx.fill();
  const busy = atkBusy(), dir = busy ? P.atk.dir : P.dir, flip = busy ? P.atk.flip : P.flip;
  const fr = EL[dir][P.moving ? 1 + (Math.floor(P.t * (P.run ? 14 : 9)) % 4) : 0];
  const h = 98, w = h * 170 / 172, by = P.y + h * (11 / 344);
  const L = weaponLayers();
  ctx.save();
  if (flip && dir === 'side'){ ctx.translate(P.x, 0); ctx.scale(-1, 1); ctx.translate(-P.x, 0); }
  if (L.back) L.back();
  ctx.drawImage(fr, P.x - w / 2 + L.lunge[0], by - h + L.lunge[1], w, h);
  if (L.front) L.front();
  ctx.restore();
}

/*FIELD_DUNGEON*/

P.hp = P.maxHp; P.mp = P.maxMp;
window.__P=P;window.__T=dummies;window.__W=W;window.__D=DAY;window.__V=vils;window.__CTRL={
  joy:()=>({dx:joy.dx,dy:joy.dy,touch:joyTouch,id:joy.id}),
  shots:()=>shots.map(s=>({x:s.x,y:s.y,vx:s.vx,vy:s.vy,kind:s.kind,done:!!s.done,dmg:s.dmg||0,blast:s.blast||0,status:s.status||'',statusDur:s.statusDur||0,stagger:!!s.stagger}))
};
requestAnimationFrame(frame);
})();
