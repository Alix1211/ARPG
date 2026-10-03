// ======================= 필드 · 몬스터 =======================
const FIELD_THEMES = [
  ['spring','봄 초원','견습 · T1'], ['summer','여름 숲','견습 · T1'], ['autumn','가을 들판','동 · T2'],
  ['winter','겨울 설원','동 · T2'], ['ice','얼음 지대','은 · T3'], ['volcano','화산 지대','금 · T4'], ['swamp','늪지대','백금 · T5']
];
const FIELD_INFO = Object.fromEntries(FIELD_THEMES.map(x => [x[0], x]));
const fieldTiles = {};
for (const th of FIELD_THEMES.map(x => x[0])){
  fieldTiles[th] = {};
  for (const k in (A.field.tiles[th] || {})) fieldTiles[th][k] = load(A.field.tiles[th][k]);
}
const mon3 = {}, mon1 = {};
for (const n in A.monsters3){ mon3[n] = {}; for (const d in A.monsters3[n]) mon3[n][d] = load(A.monsters3[n][d]); }
for (const n in A.monsters1) mon1[n] = load(A.monsters1[n]);
const monsters = [], dropsLoot = [], enemyShots = [], enemyHazards = [];
const dropImgs = {};
const FIELD_TIER={spring:1,summer:1,autumn:2,winter:2,ice:3,volcano:4,swamp:5};
const PLAYER_STATUS={slow:0,stone:0,bleed:0,burn:0,bleedTick:0,burnTick:0};
let fieldTheme = 'spring', fieldSerial = 0, playerInv = 0, fieldBuildMs = 0;

function combatTargets(){ return dummies.concat(monsters.filter(m => !m.dead && !m.removed && !(m.vanishT>0))); }
function waitImages(list){ return Promise.all(list.map(im => im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; }))); }
function fieldPattern(g, im){ try { return g.createPattern(im, 'repeat'); } catch(e){ return '#607d45'; } }
function fieldPropMeta(theme, prefix){
  return (A.field.props[theme] || []).find(x => x.name.startsWith(prefix)) || null;
}
function fieldPropSize(name){
  if (name.includes('tree_big')) return 3.8; if (name.includes('tree_mid')) return 3.0; if (name.includes('tree_young')) return 2.3;
  if (name.includes('cave')) return 3.6; if (name.includes('ruin')) return 2.6; if (name.includes('campfire')) return 1.5;
  if (name.includes('log')) return 1.9; if (name.includes('rock_big')) return 1.8; if (name.includes('rocks')) return 1.5;
  if (name.includes('bush')) return 1.4; return 1.15;
}
function isTreeName(n){ return n.includes('tree_'); }
function isSoftName(n){ return n.includes('grass') || n.includes('flowers') || n.includes('mushroom'); }
function pathPointY(x){ const t = Math.max(0, Math.min(1, (x - 3) / 53)); return 20 - 12 * t + Math.sin(t * Math.PI * 2) * 3.1; }
function nearMainPath(x,y, pad){ return Math.abs(y - pathPointY(x)) < (pad || 2.2); }
function inTownReserve(x,y){ return x > 8 && x < 17 && y > 4 && y < 12; }

async function makeFieldGround(theme){
  const w = 60 * TS, h = 40 * TS, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), t = fieldTiles[theme], ims = Object.values(t);
  await waitImages(ims);
  const base = t.grass || ims[0], flower = t.grass_flower || base;
  for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++){
    const im = Math.random() < 0.13 ? flower : base;
    g.drawImage(im, x * TS, y * TS, TS + 1, TS + 1);
  }
  const dirt = t.dirt || t.path || base, path = t.path || dirt;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(2.5 * TS, 20 * TS); g.bezierCurveTo(18 * TS, 17 * TS, 34 * TS, 27 * TS, 56.5 * TS, 8 * TS);
  g.strokeStyle = fieldPattern(g, dirt); g.globalAlpha = 0.36; g.lineWidth = 150; g.stroke();
  g.strokeStyle = fieldPattern(g, path); g.globalAlpha = 0.93; g.lineWidth = 86; g.stroke();
  g.restore();

  // 작은 마을 예약 구역으로 들어가는 샛길 + 마을 앞 작은 흙광장
  g.save(); g.lineCap='round'; g.lineJoin='round';
  g.beginPath(); g.moveTo(13.2*TS,19.7*TS); g.bezierCurveTo(13.0*TS,16.5*TS,12.7*TS,14.0*TS,12.4*TS,11.3*TS);
  g.strokeStyle=fieldPattern(g,dirt); g.globalAlpha=.42; g.lineWidth=92; g.stroke();
  g.strokeStyle=fieldPattern(g,path); g.globalAlpha=.92; g.lineWidth=54; g.stroke();
  g.globalAlpha=.78; g.fillStyle=fieldPattern(g,dirt);
  g.beginPath(); g.ellipse(12.7*TS,8.9*TS,4.2*TS,2.7*TS,0,0,7); g.fill();
  g.restore();
  if (t.water && t.sand){
    const spots = [[29,8,2.8,1.5],[48,29,2.4,1.3]];
    for (const q of spots){
      g.save(); g.beginPath(); g.ellipse(q[0]*TS,q[1]*TS,q[2]*TS,q[3]*TS,0,0,7); g.clip();
      g.globalAlpha=.72; g.fillStyle=fieldPattern(g,t.sand); g.fillRect((q[0]-q[2])*TS,(q[1]-q[3])*TS,q[2]*2*TS,q[3]*2*TS);
      g.globalAlpha=.86; g.beginPath(); g.ellipse(q[0]*TS,q[1]*TS,q[2]*.76*TS,q[3]*.72*TS,0,0,7); g.clip();
      g.fillStyle=fieldPattern(g,t.water); g.fillRect((q[0]-q[2])*TS,(q[1]-q[3])*TS,q[2]*2*TS,q[3]*2*TS); g.restore();
    }
  }
  const mini = document.createElement('canvas'); mini.width = 360; mini.height = 240; mini.getContext('2d').drawImage(c,0,0,360,240);
  return { ground:c, mini };
}
function mkFieldProp(meta, x, y, kind, name){
  if (!meta) return null; const wt = fieldPropSize(meta.name), w = wt * TS, im = BI[meta.key], ar = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
  const h = Math.max(TS*.8, w * ar);
  const soft = isSoftName(meta.name), tree = isTreeName(meta.name);
  return { k:meta.key, name:name || null, x:x*TS, y:y*TS, w, h, cw:soft?0:(tree?.16:.72), cd:soft?0:(tree?.35*TS:.45*TS), tree, shadow:!soft, kind:kind || '', r:kind==='dungeon'?64:46 };
}
function fieldPropClear(x, y, meta, out){
  const soft = isSoftName(meta.name), rr = soft ? 0.7 : Math.max(1.0, fieldPropSize(meta.name) * 0.48);
  for (const p of out){
    if (!p || !p.k) continue;
    const pm = (A.field.props[fieldTheme] || []).find(q => q.key === p.k);
    const pr = pm && isSoftName(pm.name) ? 0.55 : Math.max(0.9, (p.w / TS) * 0.42);
    if (Math.hypot(x - p.x / TS, y - p.y / TS) < rr + pr + (soft ? 0.15 : 0.45)) return false;
  }
  return true;
}
function randomFieldProps(theme){
  const all = A.field.props[theme] || [], out = [];
  const cave = fieldPropMeta(theme,'16_'), camp = fieldPropMeta(theme,'14_'), ruin = fieldPropMeta(theme,'13_'), sign = fieldPropMeta(theme,'15_'), special = fieldPropMeta(theme,'12_');
  for (const p of [
    mkFieldProp(sign,4.5,19.4,'','지역 이정표'),
    mkFieldProp(camp,20,31,'fire','야영지'),
    mkFieldProp(ruin,38,23,'','무너진 폐허'),
    mkFieldProp(special,46,31,'','이상한 흔적'),
    mkFieldProp(cave,56,8,'dungeon','필드 동굴 입구')
  ]) if (p) out.push(p);
  const pool = all.filter(x => !/^1[3-6]_/.test(x.name));
  let tries = 0;
  while (out.length < 52 && tries++ < 500){
    const x = 2 + Math.random()*56, y = 2 + Math.random()*36;
    if (nearMainPath(x,y,2.4) || inTownReserve(x,y) || Math.hypot(x-56,y-8)<4 || Math.hypot(x-3,y-20)<4) continue;
    const meta = pool[Math.floor(Math.random()*pool.length)]; if (!meta) break;
    if (!fieldPropClear(x,y,meta,out)) continue;
    const p = mkFieldProp(meta,x,y,'',null); if (p) out.push(p);
  }
  return out;
}
function fieldBuilding(k,name,x,y,wt,kind,market){
  const im=BI[k], ar=im&&im.naturalWidth?im.naturalHeight/im.naturalWidth:.82;
  const w=wt*TS, h=w*ar;
  return {k,name,x:x*TS,y:y*TS,w,h,door:0,kind:kind||'bld',market:market||null};
}
function makeFieldVillage(theme){
  // 예약 구역 x 8~17, y 4~12. 기존 정제 건물 에셋을 작게 재사용한다.
  return [
    fieldBuilding('shop_tools','상인협회',10.9,8.9,3.7,'trade',theme),
    fieldBuilding('house_blue','여관',14.7,11.2,3.5,'bld',theme),
  ];
}

async function prepareField(theme){
  const t0 = performance.now();
  fieldTheme = theme in FIELD_INFO ? theme : 'spring'; fieldSerial++;
  const bg = await makeFieldGround(fieldTheme), props = randomFieldProps(fieldTheme);
  const map = {
    name:FIELD_INFO[fieldTheme][1], market:fieldTheme, map:{w:60,h:40,ts:TS,px:TS}, ground:bg.ground, mini:bg.mini,
    blds:makeFieldVillage(fieldTheme), props, npcs:[],
    spawn:[3.2*TS,20*TS], exits:[{x0:0,x1:1.15*TS,y0:17.5*TS,y1:22.5*TS,to:'out',pos:[2.2*TS,11.4*TS],dir:'side'}]
  };
  map.G = bg.ground; map.MINI = bg.mini;
  MAPS.field = map; fieldBuildMs = performance.now() - t0; return map;
}
function ensureRegionUI(){
  if ($('regionPick')) return;
  const st = document.createElement('style');
  st.textContent = '#regionPick{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:#0d1220aa}#regionPick.on{display:flex}#regionPick .rp{width:min(760px,92vw);padding:34px;border:4px solid #8a6b3e;border-radius:20px;background:#201a15f2;color:#fff3d6;box-shadow:0 18px 60px #000a;font-family:sans-serif}#regionPick h2{margin:0 0 8px;text-align:center;font-size:30px}#regionPick p{text-align:center;color:#d8c7a5}#regionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}#regionGrid button{padding:16px 18px;border:2px solid #80643a;border-radius:14px;background:#352b20;color:#fff3d6;text-align:left;font-weight:800;font-size:18px}#regionGrid button small{display:block;margin-top:4px;color:#c9b891;font-weight:600}#regionGrid button:hover{background:#4a3927}';
  document.head.append(st);
  const o = document.createElement('div'); o.id='regionPick'; o.innerHTML='<div class="rp"><h2>어디로 가시겠습니까?</h2><p>시험판에서는 7개 지역을 모두 열어 두었습니다.</p><div id="regionGrid"></div></div>';
  document.body.append(o);
  const gr = $('regionGrid');
  for (const r of FIELD_THEMES){ const b=document.createElement('button'); b.type='button'; b.dataset.theme=r[0]; b.innerHTML=r[1]+'<small>'+r[2]+'</small>'; b.onclick=()=>selectRegion(r[0],b); gr.append(b); }
  o.addEventListener('click',e=>{ if(e.target===o) closeRegionSelect(); });
}
function openRegionSelect(){ closeAll(); ensureRegionUI(); panel='region'; $('regionPick').classList.add('on'); }
function closeRegionSelect(silent){ const o=$('regionPick'); if(o) o.classList.remove('on'); if(panel==='region') panel=null; }
async function selectRegion(theme, btn){
  ensureRegionUI(); const bs=[...$('regionGrid').querySelectorAll('button')]; bs.forEach(x=>x.disabled=true); if(btn) btn.textContent='길을 확인하는 중…';
  try { const m=await prepareField(theme); closeRegionSelect(); travel('field',m.spawn,'side'); }
  finally { bs.forEach((x,i)=>{x.disabled=false; x.innerHTML=FIELD_THEMES[i][1]+'<small>'+FIELD_THEMES[i][2]+'</small>';}); }
}
function returnFromField(){ travel('out',[2.2*TS,11.4*TS],'side'); }

const MOBDEF = {
  wolf:{hp:38,sp:92,dmg:5}, rabbit:{hp:18,sp:108,dmg:3}, bear:{hp:76,sp:58,dmg:9,skill:'charge'}, orc:{hp:58,sp:64,dmg:7},
  harpy:{hp:44,sp:78,dmg:6,ranged:1,range:185,skill:'radial'}, rogue:{hp:42,sp:82,dmg:6,ranged:1,range:170,skill:'blink',shotStatus:'bleed'},
  darkmage:{hp:48,sp:54,dmg:8,ranged:1,range:230,skill:'lightning'},
  gargoyle:{hp:68,sp:48,dmg:8,ranged:1,range:195,skill:'petrify'},
  demon:{hp:80,sp:62,dmg:10,skill:'berserk'}, slime:{hp:24,sp:45,dmg:4,touchStatus:'slow'}, goblin:{hp:32,sp:70,dmg:5}, skeleton:{hp:36,sp:62,dmg:5,skill:'revive'},
  spider:{hp:26,sp:90,dmg:4,skill:'web'}, mushroom:{hp:30,sp:40,dmg:5}, elem_fire:{hp:46,sp:58,dmg:7,ranged:1,range:175,shotStatus:'burn'},
  elem_ice:{hp:46,sp:58,dmg:7,ranged:1,range:175,shotStatus:'slow'}
};
const THEME_MOBS = {
  spring:['wolf','rabbit','goblin','slime'], summer:['wolf','bear','spider','goblin'], autumn:['rogue','orc','mushroom','goblin'],
  winter:['wolf','bear','skeleton','elem_ice'], ice:['elem_ice','darkmage','gargoyle','skeleton'], volcano:['demon','orc','elem_fire'], swamp:['harpy','spider','slime','mushroom']
};
function mobImageSet(n){ return mon3[n] || (mon1[n] ? {front:mon1[n],left:mon1[n],right:mon1[n]} : null); }
function pointInSolid(px, py, pad=0){
  for (const s of solids) if (px > s.x0 - pad && px < s.x1 + pad && py > s.y0 - pad && py < s.y1 + pad) return true;
  return false;
}
function spawnFieldMonsters(theme){
  monsters.length=0; dropsLoot.length=0; enemyShots.length=0; enemyHazards.length=0;
  const pool=THEME_MOBS[theme] || THEME_MOBS.spring, count=16, tier=FIELD_TIER[theme]||1;
  const hpMul=1+(tier-1)*.55, dmgMul=1+(tier-1)*.34, spMul=1+(tier-1)*.035;
  for(let i=0;i<count;i++){
    let x=0,y=0,t=0;
    do{ x=7+Math.random()*48; y=3+Math.random()*34; t++; }
    while(t<140&&(nearMainPath(x,y,1.6)||inTownReserve(x,y)||Math.hypot(x-3,y-20)<7||Math.hypot(x-56,y-8)<5||pointInSolid(x*TS,y*TS,24)));
    const type=pool[i%pool.length], d=MOBDEF[type], imgs=mobImageSet(type); if(!imgs) continue;
    const sc=type==='bear'||type==='demon'||type==='gargoyle'?1.15:type==='rabbit'?.72:1, h=82*sc, w=82*sc;
    const hp=Math.round(d.hp*hpMul), dmg=Math.max(1,Math.round(d.dmg*dmgMul));
    monsters.push({monster:1,type,tier,x:x*TS,y:y*TS,w,h,hp,maxHp:hp,sp:d.sp*spMul,dmg,ranged:d.ranged||0,range:d.range||42,
      skill:d.skill||'',shotStatus:d.shotStatus||'',touchStatus:d.touchStatus||'',skillCd:1.0+Math.random()*2.2,
      imgs,face:'front',flip:false,state:'wander',tx:x*TS,ty:y*TS,wait:Math.random()*2,cd:Math.random(),hurt:0,stun:0,dead:false,death:0});
  }
}
function afterDynamicBuild(id){
  if(id==='field') spawnFieldMonsters(fieldTheme); else if(id==='dungeon') spawnDungeonMonsters(); else { dunGrid=null; monsters.length=0; dropsLoot.length=0; enemyShots.length=0; }
}
function monsterBlocked(x,y){ return blocked(x,y); }
function moveMonster(m,dx,dy){
  if(!monsterBlocked(m.x+dx,m.y)) m.x+=dx;
  if(!monsterBlocked(m.x,m.y+dy)) m.y+=dy;
}
function faceMonster(m,dx,dy){
  if(Math.abs(dx)>Math.abs(dy)*.8){ m.face=dx<0?'left':'right'; } else m.face='front';
}
function defeatPlayer(){
  const lost=Math.floor(P.gold*.15); setGold(Math.max(0,P.gold-lost)); P.hp=P.maxHp; P.mp=P.maxMp; syncBars();
  for(const k in PLAYER_STATUS) PLAYER_STATUS[k]=0;
  say(lost?('쓰러졌습니다. 금화 '+lost+'닢을 잃었습니다.'):'쓰러졌습니다.');
  travel('town',[23*TS,22.2*TS],'front');
}
function rawPlayerDamage(v,label){
  v=Math.max(1,Math.round(v)); P.hp=Math.max(0,P.hp-v); syncBars();
  pops.push({x:P.x,y:P.y-95,t:0,txt:(label?label+' ':'')+'-'+v,enemy:true});
  if(P.hp<=0) defeatPlayer();
}
function applyPlayerStatus(kind,dur){
  if(!kind)return; PLAYER_STATUS[kind]=Math.max(PLAYER_STATUS[kind]||0,dur||2);
  if(kind==='slow') pops.push({x:P.x,y:P.y-110,t:0,txt:'둔화!',enemy:true});
  else if(kind==='stone') pops.push({x:P.x,y:P.y-110,t:0,txt:'석화!',enemy:true});
  else if(kind==='bleed') pops.push({x:P.x,y:P.y-110,t:0,txt:'출혈!',enemy:true});
  else if(kind==='burn') pops.push({x:P.x,y:P.y-110,t:0,txt:'화상!',enemy:true});
}
function hurtPlayer(v,dx,dy,status,statusDur){
  if(playerInv>0||traveling) return false;
  playerInv=.55; rawPlayerDamage(v);
  const d=Math.hypot(dx,dy)||1; move(-dx/d*14,-dy/d*14);
  if(status) applyPlayerStatus(status,statusDur);
  return true;
}
function updatePlayerStatus(dt){
  for(const k of ['slow','stone','bleed','burn']) PLAYER_STATUS[k]=Math.max(0,(PLAYER_STATUS[k]||0)-dt);
  if(PLAYER_STATUS.bleed>0){ PLAYER_STATUS.bleedTick-=dt; if(PLAYER_STATUS.bleedTick<=0){PLAYER_STATUS.bleedTick=.8;rawPlayerDamage(Math.max(1,P.maxHp*.025),'출혈');} }
  else PLAYER_STATUS.bleedTick=0;
  if(PLAYER_STATUS.burn>0){ PLAYER_STATUS.burnTick-=dt; if(PLAYER_STATUS.burnTick<=0){PLAYER_STATUS.burnTick=.7;rawPlayerDamage(Math.max(1,P.maxHp*.02),'화상');} }
  else PLAYER_STATUS.burnTick=0;
}
function playerMoveFactor(){ return PLAYER_STATUS.stone>0?0:(PLAYER_STATUS.slow>0?.48:1); }
function playerControlLocked(){ return PLAYER_STATUS.stone>0; }
function enemyShot(m,dx,dy,speed,status,kind,dmgMul=1){
  const q=Math.hypot(dx,dy)||1;
  enemyShots.push({x:m.x,y:m.y-m.h*.55,vx:dx/q*speed,vy:dy/q*speed,t:0,life:1.6,dmg:Math.max(1,Math.round(m.dmg*dmgMul)),status:status||'',statusDur:status==='stone'?1.15:status==='slow'?2.2:3.2,kind:kind||'bolt',done:false});
}
function specialMonsterAI(m,dx,dy,d,dt){
  if(m.enraged){ /* marker only */ }
  if(m.skill==='berserk'&&!m.enraged&&m.hp<m.maxHp*.48){m.enraged=true;m.sp*=1.55;m.dmg=Math.round(m.dmg*1.35);pops.push({x:m.x,y:m.y-m.h,t:0,txt:'광폭!',crit:true});}
  if(m.chargeWind>0){m.chargeWind-=dt;if(m.chargeWind<=0){m.chargeT=.42;m.chargeHit=false;}return true;}
  if(m.chargeT>0){
    m.chargeT-=dt; moveMonster(m,m.chargeDx*m.sp*3.6*dt,m.chargeDy*m.sp*3.6*dt);
    if(!m.chargeHit&&Math.hypot(P.x-m.x,P.y-m.y)<38){m.chargeHit=true;hurtPlayer(Math.round(m.dmg*1.35),P.x-m.x,P.y-m.y);}
    return true;
  }
  if(m.vanishT>0){
    m.vanishT-=dt;
    if(m.vanishT<=0){
      const q=d||1,tx=P.x-dx/q*58,ty=P.y-dy/q*58;
      if(!monsterBlocked(tx,ty)){m.x=tx;m.y=ty;}
    }
    return true;
  }
  if(m.skillCd>0)return false;
  if(m.skill==='charge'&&d<225){const q=d||1;m.chargeDx=dx/q;m.chargeDy=dy/q;m.chargeWind=.42;m.skillCd=3.5;return true;}
  if(m.skill==='lightning'&&d<270){enemyHazards.push({kind:'lightning',x:P.x,y:P.y-25,t:0,delay:.65,life:1.0,r:38,dmg:Math.round(m.dmg*1.25),done:false});m.skillCd=2.8+Math.random()*.7;return true;}
  if(m.skill==='petrify'&&d<230){enemyShot(m,dx,dy,185,'stone','stone',.75);m.skillCd=3.0;return true;}
  if(m.skill==='radial'&&d<235){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;enemyShots.push({x:m.x,y:m.y-m.h*.5,vx:Math.cos(a)*220,vy:Math.sin(a)*220,t:0,life:1.55,dmg:Math.max(1,Math.round(m.dmg*.8)),kind:'feather',done:false});}
    m.skillCd=2.7+Math.random()*.5;return true;
  }
  if(m.skill==='blink'&&d<230){m.vanishT=.55;m.skillCd=3.8+Math.random()*.8;return true;}
  if(m.skill==='web'&&d<165){enemyShot(m,dx,dy,205,'slow','web',.65);m.skillCd=2.8;return true;}
  return false;
}
function updEncounters(dt){
  playerInv=Math.max(0,playerInv-dt); updatePlayerStatus(dt);
  if(!combatMap()) return;

  for(const h of enemyHazards){
    h.t+=dt;
    if(!h.done&&h.t>=h.delay){h.done=true;if(Math.hypot(P.x-h.x,(P.y-30)-h.y)<h.r)hurtPlayer(h.dmg,P.x-h.x,P.y-h.y);}
  }
  for(let i=enemyHazards.length-1;i>=0;i--) if(enemyHazards[i].t>enemyHazards[i].life)enemyHazards.splice(i,1);

  for(const s of enemyShots){
    s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(!s.done&&blocked(s.x,s.y)){s.done=true;continue;}
    if(!s.done&&Math.hypot(s.x-P.x,s.y-(P.y-35))<18){
      s.done=true; hurtPlayer(s.dmg,s.vx,s.vy,s.status,s.statusDur);
    }
    if(s.t>s.life) s.done=true;
  }
  for(let i=enemyShots.length-1;i>=0;i--) if(enemyShots[i].done) enemyShots.splice(i,1);

  for(const m of monsters){
    if(m.removed) continue;
    if(m.dead){
      if(m.reviveT>0){
        m.reviveT-=dt;
        if(m.reviveT<=0){m.dead=false;m.hp=Math.max(1,Math.round(m.maxHp*.38));m.death=0;m.stun=.45;pops.push({x:m.x,y:m.y-m.h,t:0,txt:'다시 일어남!',enemy:true});}
      } else {m.death+=dt;if(m.death>1)m.removed=true;}
      continue;
    }
    m.hurt=Math.max(0,m.hurt-dt); m.stun=Math.max(0,m.stun-dt); m.cd=Math.max(0,(m.cd||0)-dt); m.skillCd=Math.max(0,(m.skillCd||0)-dt);
    if(m.stun>0) continue;
    const dx=P.x-m.x,dy=P.y-m.y,d=Math.hypot(dx,dy);
    if(d<280){
      m.state='chase'; faceMonster(m,dx,dy);
      if(specialMonsterAI(m,dx,dy,d,dt)) continue;
      if(m.ranged&&d<m.range){
        if(m.cd<=0){enemyShot(m,dx,dy,270,m.shotStatus,m.shotStatus||'bolt',1);m.cd=1.45+Math.random()*.65;}
      } else if(!m.ranged&&d<42){
        if(m.cd<=0){hurtPlayer(m.dmg,dx,dy,m.touchStatus,m.touchStatus==='slow'?2.4:0);m.cd=.9+Math.random()*.35;}
      } else if(d>30){
        moveMonster(m,dx/d*m.sp*dt,dy/d*m.sp*dt);
      }
    } else {
      m.state='wander'; m.wait-=dt;
      const wx=m.tx-m.x,wy=m.ty-m.y,wd=Math.hypot(wx,wy);
      if(m.wait<=0||wd<8){m.tx=m.x+(Math.random()*2-1)*180;m.ty=m.y+(Math.random()*2-1)*140;m.tx=Math.max(40,Math.min(MWp-40,m.tx));m.ty=Math.max(55,Math.min(MHp-20,m.ty));m.wait=1.5+Math.random()*3;}
      else{faceMonster(m,wx,wy);moveMonster(m,wx/wd*m.sp*.28*dt,wy/wd*m.sp*.28*dt);}
    }
  }

  for(const d of dropsLoot){
    if(d.picked) continue;
    if(Math.hypot(d.x-P.x,d.y-P.y)<28){
      if(d.kind==='gold'){setGold(P.gold+d.amount);d.picked=true;}
      else if(window.UI&&UI.add(d.item)){d.picked=true;say(d.item.name+' 획득');}
    }
  }
}
function hitMonster(m,d,stagger,dmOver){
  if(!m||m.dead) return;
  const dm=dmOver|| (WPN?WPN.dmg:1), crit=Math.random()<.1, v=Math.max(1,Math.round(crit?dm*2:dm));
  m.hp-=v; m.hurt=.18; m.stun=stagger?.32:.12;
  const q=Math.hypot(d[0],d[1])||1, k=stagger?20:12; const nx=m.x+d[0]/q*k, ny=m.y+d[1]/q*k;
  if(!monsterBlocked(nx,ny)){m.x=nx;m.y=ny;}
  pops.push({x:m.x+(Math.random()*14-7),y:m.y-m.h*.72,t:0,txt:String(v),crit});
  if(m.hp<=0) killMonster(m);
}
function monsterTier(m){
  if(m&&m.tier)return m.tier;
  if(MAP==='field')return FIELD_TIER[fieldTheme]||1;
  return 1;
}
function randomDropItem(m){
  if(!window.UI)return null;
  const tier=monsterTier(m),r=Math.random();
  if(r<.58){
    const wt=['sword','spear','gauntlet','bow','staff'][Math.floor(Math.random()*5)];
    return UI.make({kind:'weapon',wt,tier,roll:true});
  }
  if(r<.90){
    const kinds=['head','body','hands','feet'];
    return UI.make({kind:kinds[Math.floor(Math.random()*kinds.length)],tier,roll:true});
  }
  return UI.make({kind:Math.random()<.55?'ring':'neck',tier,roll:true});
}
function monsterExp(m){
  const tier=monsterTier(m), min=[0,1,8,18,30,45][tier]||1, cap=[0,8,18,30,45,99][tier]||8;
  const lv=P.lv||1, need=window.GAME&&GAME.expNeed?GAME.expNeed(lv):100;
  // 레벨당 적정 티어 몬스터 처치 목표: 초반 약 40마리 -> 중후반 50~80마리.
  // 전투 시간이 길어지는 고티어에서는 실제 시간 기준 레벨업이 더 느려진다.
  const targetKills=Math.min(85,38+Math.floor(lv*.9));
  let mult=1;
  if(lv>cap) mult=Math.max(.08,1-(lv-cap)*.11);   // 저티어 학살 경험치 급감
  else if(lv<min) mult=1.05;                      // 상위 티어 도전 보너스는 아주 작게
  return Math.max(1,Math.round(need/targetKills*mult*(.92+Math.random()*.16)));
}
function killMonster(m){
  if(m.type==='skeleton'&&!m.revived&&Math.random()<.48){
    m.revived=true;m.dead=true;m.death=0;m.hp=0;m.reviveT=1.5;return;
  }
  m.dead=true;m.death=0;m.hp=0;
  const tier=monsterTier(m),coin=Math.round((2+Math.floor(Math.random()*8))*(1+(tier-1)*.55));
  dropsLoot.push({kind:'gold',x:m.x-8,y:m.y,amount:coin,ph:Math.random()*7});
  const find=(window.UI&&UI.findBonus)?UI.findBonus():0;
  if(Math.random()<Math.min(.62,.30+find/250)){
    const it=randomDropItem(m); if(it)dropsLoot.push({kind:'item',x:m.x+12,y:m.y,item:it,ph:Math.random()*7});
  }
  if(window.GAME&&GAME.gainExp)GAME.gainExp(monsterExp(m));
}
function appendEncounterSprites(list){ if(!combatMap())return; for(const m of monsters)if(!m.removed)list.push({mon:m,key:m.y}); }
function drawMonster(m){
  const baseA=m.dead?Math.max(0,1-m.death):1, a=m.vanishT>0?.10:baseA, img=m.imgs[m.face]||m.imgs.front; if(!img)return;
  ctx.save();ctx.globalAlpha=a;
  if(m.chargeWind>0){ctx.strokeStyle='#ff6b42';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,34+Math.sin(T*18)*4,12,0,0,7);ctx.stroke();}
  if(m.enraged){ctx.strokeStyle='rgba(255,60,35,.55)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(m.x,m.y-m.h*.42,m.w*.45,m.h*.52,0,0,7);ctx.stroke();}
  ctx.fillStyle='rgba(0,0,0,.27)';ctx.beginPath();ctx.ellipse(m.x,m.y,m.w*.3,5,0,0,7);ctx.fill();
  const wob=m.hurt>0?Math.sin(T*55)*4:0; ctx.translate(wob,0);ctx.drawImage(img,m.x-m.w/2,m.y-m.h,m.w,m.h);ctx.translate(-wob,0);
  if(!m.dead&&(m.hurt>0||m.state==='chase')){const bw=48,bx=m.x-bw/2,by=m.y-m.h-10;ctx.fillStyle='#24140f';ctx.fillRect(bx,by,bw,6);ctx.fillStyle='#c63e32';ctx.fillRect(bx+1,by+1,(bw-2)*Math.max(0,m.hp/m.maxHp),4);}
  ctx.restore();
}
function dropImage(icon){
  if (!A.icons[icon]) return null;
  if (!dropImgs[icon]) dropImgs[icon] = load(A.icons[icon]);
  return dropImgs[icon];
}
function drawEncounterGround(){
  if(!combatMap())return;
  for(const d of dropsLoot){if(d.picked)continue;const bob=Math.sin(T*4+d.ph)*2;
    if(d.kind==='gold'){ctx.fillStyle='#ffe06a';ctx.strokeStyle='#8d5d18';ctx.lineWidth=2;ctx.beginPath();ctx.arc(d.x,d.y-8+bob,7,0,7);ctx.fill();ctx.stroke();}
    else{const im=dropImage(d.item.icon);if(im&&im.complete)ctx.drawImage(im,d.x-14,d.y-30+bob,28,28);}
  }
}
function drawEncounterFx(){
  if(!combatMap())return;
  for(const h of enemyHazards){
    if(h.kind==='lightning'){
      if(h.t<h.delay){
        const k=h.t/h.delay;ctx.save();ctx.globalAlpha=.35+.45*k;ctx.strokeStyle='#ffe45c';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(h.x,h.y,h.r*(1-.35*k),0,7);ctx.stroke();ctx.restore();
      }else{
        const k=Math.min(1,(h.t-h.delay)/.22);ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle='#dff4ff';ctx.lineWidth=8*(1-k)+2;
        ctx.beginPath();ctx.moveTo(h.x-5,h.y-150);ctx.lineTo(h.x+7,h.y-100);ctx.lineTo(h.x-4,h.y-58);ctx.lineTo(h.x,h.y);ctx.stroke();ctx.restore();
      }
    }
  }
  for(const s of enemyShots){
    const col=s.kind==='stone'?'#b7b7a6':s.kind==='web'?'#e8f7ff':s.kind==='burn'?'#ff8a33':s.kind==='slow'?'#8edcff':s.kind==='feather'?'#ffd8ef':'#d9a4ff';
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,10);g.addColorStop(0,'#fff');g.addColorStop(.35,col);g.addColorStop(1,'rgba(80,50,130,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.kind==='stone'?13:11,0,7);ctx.fill();
  }
}
function drawEncounterMini(mx,sx,sy){
  if(!combatMap())return;mx.fillStyle='#e3483c';for(const m of monsters)if(!m.dead&&!m.removed&&!(m.vanishT>0)){mx.beginPath();mx.arc(m.x*sx,m.y*sy,2.2,0,7);mx.fill();}
}
function autoAimMonster(){
  if(!combatMap()||!monsters.length)return;
  const lim=WPN&&(WPN.wt==='bow'||WPN.wt==='staff')?620:190; let best=null,bd=lim;
  for(const m of monsters){if(m.dead||m.removed)continue;const d=Math.hypot(m.x-P.x,m.y-P.y);if(d<bd){bd=d;best=m;}}
  if(!best)return;const dx=best.x-P.x,dy=best.y-P.y;
  // 가장 가까운 적의 주축 방향. 아래/위 적이 조금 옆에 있어도 세로 방향을 유지한다.
  if(Math.abs(dx)>Math.abs(dy)){P.dir='side';P.flip=dx<0;}else{P.dir=dy<0?'back':'front';P.flip=false;}
}

window.__FD_READY=true;
window.__FD={
  async enter(theme){const m=await prepareField(theme||'spring');travel('field',m.spawn,'side');return true;},
  state(){return {map:MAP,theme:fieldTheme,serial:fieldSerial,buildMs:Math.round(fieldBuildMs),monsters:monsters.filter(m=>!m.removed).length,props:MAPS.field?MAPS.field.props.length:0,drops:dropsLoot.filter(d=>!d.picked).length,hp:P.hp,gold:P.gold,stuckSpawns:monsters.filter(m=>!m.dead&&pointInSolid(m.x,m.y,10)).length,layout:MAPS.field?MAPS.field.props.slice(5,11).map(p=>[Math.round(p.x),Math.round(p.y),p.k]):[],village:MAPS.field?MAPS.field.blds.map(b=>({name:b.name,kind:b.kind,market:b.market,x:Math.round(b.x),y:Math.round(b.y)})):[]};},
  hitFirst(){const m=monsters.find(x=>!x.dead);if(!m)return false;hitMonster(m,[1,0],true,m.hp+5);return true;},
  debugTarget(dx,dy){
    const m=monsters.find(x=>!x.dead&&!x.removed); if(!m)return false;
    for(const x of monsters) if(x!==m) x.removed=true;
    m.x=P.x+dx; m.y=P.y+dy; m.vx=m.vy=0; return {x:m.x,y:m.y};
  },
  prepareField, openRegionSelect
};
