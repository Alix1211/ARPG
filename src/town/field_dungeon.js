// ======================= 필드 · 몬스터 =======================
const FIELD_THEMES = [
  ['spring','봄 초원','T1 · 권장 Lv1~10'], ['summer','여름 숲','T2 · 권장 Lv11~20'], ['autumn','가을 들판','T3 · 권장 Lv21~30'],
  ['winter','겨울 설원','T4 · 권장 Lv31~40'], ['ice','얼음 지대','T5 · 권장 Lv41~50'], ['volcano','화산 지대','T6 · 권장 Lv51~60'], ['swamp','늪지대','T7 · 권장 Lv61~70']
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
const FIELD_TIER={spring:1,summer:2,autumn:3,winter:4,ice:5,volcano:6,swamp:7};
const PLAYER_STATUS={slow:0,stone:0,bleed:0,burn:0,bleedTick:0,burnTick:0};
let fieldTheme = 'spring', fieldSerial = 0, playerInv = 0, fieldBuildMs = 0, fieldLeg = 1, fieldLegs = 1, legBusy = false;

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
    if (nearMainPath(x,y,2.4) || inTownReserve(x,y) || Math.hypot(x-56,y-8)<4 || Math.hypot(x-3,y-20)<4 || Math.hypot(x-57.5,y-20)<4) continue;
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

// 길 구간(leg): 목적지 티어와 같은 수의 필드를 이어서 지난다. 마지막 구간(leg===legs)에만 작은 마을이 있다.
async function prepareField(theme, leg, legs){
  const t0 = performance.now();
  fieldTheme = theme in FIELD_INFO ? theme : 'spring'; fieldSerial++;
  fieldLegs = Math.max(1, legs || FIELD_TIER[fieldTheme] || 1); fieldLeg = Math.max(1, Math.min(leg || fieldLegs, fieldLegs));
  const lg = fieldLeg, ls = fieldLegs, th = fieldTheme;
  const bg = await makeFieldGround(th), props = randomFieldProps(th);
  const ex = [];
  if (lg === ls) ex.push({x0:0,x1:1.15*TS,y0:17.5*TS,y1:22.5*TS,fn:()=>askDestination()});
  else if (lg > 1) ex.push({x0:0,x1:1.15*TS,y0:17.5*TS,y1:22.5*TS,fn:()=>goLeg(th,lg-1,ls,'right')});
  else ex.push({x0:0,x1:1.15*TS,y0:17.5*TS,y1:22.5*TS,to:'out',pos:[2.2*TS,11.4*TS],dir:'side'});
  if (lg < ls) ex.push({x0:58.85*TS,x1:60*TS,y0:17.5*TS,y1:22.5*TS,fn:()=>goLeg(th,lg+1,ls,'left')});
  const map = {
    name:FIELD_INFO[th][1] + (ls > 1 ? ' ' + lg + '/' + ls : ''), market:th, map:{w:60,h:40,ts:TS,px:TS}, ground:bg.ground, mini:bg.mini,
    blds:lg === ls ? makeFieldVillage(th) : [], props, npcs:[],
    spawn:[3.2*TS,20*TS], exits:ex
  };
  map.G = bg.ground; map.MINI = bg.mini;
  MAPS.field = map; fieldBuildMs = performance.now() - t0; return map;
}
async function goLeg(theme, leg, legs, side){
  if (legBusy || traveling) return false; legBusy = true;
  try { const m = await prepareField(theme, leg, legs); travel('field', side === 'right' ? [56.8*TS,20*TS] : m.spawn, 'side'); return true; }
  finally { legBusy = false; }
}
function askDestination(){
  if (panel || traveling) return; P.x += 70; openRegionSelect('village');
}
function ensureRegionUI(){
  if ($('regionPick')) return;
  const st = document.createElement('style');
  st.textContent = '#regionPick{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:#0d1220aa}#regionPick.on{display:flex}#regionPick .rp{width:min(760px,92vw);padding:34px;border:4px solid #8a6b3e;border-radius:20px;background:#201a15f2;color:#fff3d6;box-shadow:0 18px 60px #000a;font-family:sans-serif}#regionPick h2{margin:0 0 8px;text-align:center;font-size:30px}#regionPick p{text-align:center;color:#d8c7a5}#regionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}#regionGrid button{padding:16px 18px;border:2px solid #80643a;border-radius:14px;background:#352b20;color:#fff3d6;text-align:left;font-weight:800;font-size:18px}#regionGrid button small{display:block;margin-top:4px;color:#c9b891;font-weight:600}#regionGrid button:hover{background:#4a3927}#regionGrid button:disabled{opacity:.45}';
  document.head.append(st);
  const o = document.createElement('div'); o.id='regionPick'; o.innerHTML='<div class="rp"><h2>어디로 가시겠습니까?</h2><p id="regionNote"></p><div id="regionGrid"></div></div>';
  document.body.append(o);
  o.addEventListener('click',e=>{ if(e.target===o) closeRegionSelect(); });
}
function regionBtnHtml(r){ const n=FIELD_TIER[r[0]]||1; return r[1]+'<small>'+r[2]+' · 길 '+n+'칸</small>'; }
function fillRegionGrid(mode){
  const gr=$('regionGrid'); gr.innerHTML='';
  $('regionNote').textContent = mode==='village' ? '목적지 티어와 같은 수의 길(필드)을 지나갑니다. 지나는 길의 몬스터도 목적지 티어입니다.' : '시험판에서는 7개 지역을 모두 열어 두었습니다. 목적지 티어만큼 길(필드)을 지나갑니다.';
  if (mode==='village'){ const b=document.createElement('button'); b.type='button'; b.dataset.theme='town'; b.innerHTML='큰 마을<small>바로 돌아갑니다</small>'; b.onclick=()=>{ closeRegionSelect(); returnFromField(); }; gr.append(b); }
  for (const r of FIELD_THEMES){ const b=document.createElement('button'); b.type='button'; b.dataset.theme=r[0]; b.innerHTML=regionBtnHtml(r); if(mode==='village'&&r[0]===fieldTheme) b.disabled=true; b.onclick=()=>selectRegion(r[0],b); gr.append(b); }
}
function openRegionSelect(mode){ closeAll(); ensureRegionUI(); fillRegionGrid(mode); panel='region'; $('regionPick').classList.add('on'); }
function closeRegionSelect(silent){ const o=$('regionPick'); if(o) o.classList.remove('on'); if(panel==='region') panel=null; }
async function selectRegion(theme, btn){
  ensureRegionUI(); const bs=[...$('regionGrid').querySelectorAll('button')]; bs.forEach(x=>x.disabled=true); const keep=btn&&btn.innerHTML; if(btn) btn.textContent='길을 확인하는 중…';
  try { const m=await prepareField(theme,1); closeRegionSelect(); travel('field',m.spawn,'side'); }
  finally { bs.forEach(x=>{x.disabled=false;}); if(btn&&keep) btn.innerHTML=keep; }
}
function returnFromField(){ travel('out',[2.2*TS,11.4*TS],'side'); }

const MOBDEF=TIER_MATCH.monsters;
const THEME_MOBS=Object.fromEntries(FIELD_THEMES.map((x,i)=>[x[0],TIER_MATCH.fieldPools[i]]));
function mobImageSet(id){
  const imgs=mon3[id];if(!imgs||!imgs.front)throw Error('몬스터 이미지 누락: '+id);
  return imgs;
}
let packSerial=0;
function createMonster(id,x,y,opts={}){
  const d=MOBDEF[id],st=matchedMonsterStats(id,P.lv,opts.floor||0,opts.bossRole||'');
  st.hp*=NUM;st.dmg*=NUM;st.exp*=NUM;
  const baseW=82*d.bodySize,w=baseW*(d.rank==='boss'?1.2:1);
  return {...st,monster:1,type:id,family:d.family,name:d.name,elite:d.rank==='elite',boss:d.rank==='boss',baseW,w,h:w,x,y,maxHp:st.hp,
    sp:d.sp*(1+(d.tier-1)*.025),ranged:d.ranged||0,range:d.range||42,skill:d.skill||'',
    shotStatus:d.shotStatus||'',touchStatus:d.touchStatus||'',skillCd:.7+Math.random()*1.5,
    imgs:mobImageSet(id),face:'front',flip:false,state:'wander',tx:x,ty:y,wait:Math.random()*2,cd:Math.random(),
    hurt:0,stun:0,dead:false,death:0,homeX:x,homeY:y,...opts};
}
function spawnClear(m,placed=monsters,field=false){
  if(field){
    const x=m.x/TS,y=m.y/TS;
    if(nearMainPath(x,y,1.6)||inTownReserve(x,y)||Math.hypot(x-3,y-20)<7||Math.hypot(x-57.5,y-20)<7||Math.hypot(x-56,y-8)<5||Math.hypot(x-20,y-31)<5)return false;
  }
  if(pointInSolid(m.x,m.y,m.w*.5))return false;
  if(!field&&typeof gridBlocked==='function'&&gridBlocked(m.x,m.y,m.w*.5))return false;
  return placed.every(other=>other.removed||Math.hypot(m.x-other.x,m.y-other.y)>=Math.max(m.w,other.w)*1.1);
}
function spawnPack(config,cx,cy,opts={}){
  const packId=++packSerial,leader=createMonster(config.leader,cx,cy,{...opts,packId,packLeader:true});
  const members=[];
  for(const member of config.members){
    const n=member.min+Math.floor(Math.random()*(member.max-member.min+1));
    for(let i=0;i<n;i++)members.push(member.id);
  }
  const radius=Math.max(leader.w,...members.map(id=>82*MOBDEF[id].bodySize))*1.5,local=[leader];
  const phase=Math.random()*Math.PI*2;
  const magicFormation=config.leader==='skeleton_mage'||config.leader==='lich';
  const frontline=members.filter(id=>!MOBDEF[id].ranged),rear=members.filter(id=>MOBDEF[id].ranged);
  for(let i=0;i<members.length;i++){
    const id=members[i],ranged=!!MOBDEF[id].ranged,formation=ranged?rear:frontline,j=formation.indexOf(id)+members.slice(0,i).filter(x=>x===id).length;
    let x=cx+Math.cos(phase+i*Math.PI*2/members.length)*radius,y=cy+Math.sin(phase+i*Math.PI*2/members.length)*radius;
    if(magicFormation){
      // 마법 리더는 후열, 해골은 왼쪽 진입 방향 전열, 궁병은 측면 후열.
      const row=Math.floor(j/3),column=j%3,count=Math.min(3,formation.length-row*3),gap=82*MOBDEF[id].bodySize*1.15;
      x=cx+(ranged?1:-1)*(radius+row*gap);y=cy+(column-(count-1)/2)*gap;
    }
    local.push(createMonster(id,x,y,{floor:opts.floor||0,packId,packLeader:false,packX:cx,packY:cy,packRadius:radius+240,skillCd:1.4+i*.36}));
  }
  const field=opts.field||false;
  for(let i=0;i<local.length;i++)if(!spawnClear(local[i],monsters.concat(local.slice(0,i)),field))return false;
  leader.packX=cx;leader.packY=cy;leader.packRadius=radius+240;
  monsters.push(...local);return true;
}
function pointInSolid(px, py, pad=0){
  for (const s of solids) if (px > s.x0 - pad && px < s.x1 + pad && py > s.y0 - pad && py < s.y1 + pad) return true;
  return false;
}
function spawnFieldMonsters(theme){
  monsters.length=0;dropsLoot.length=0;enemyShots.length=0;enemyHazards.length=0;
  const tier=FIELD_TIER[theme]||1,pool=THEME_MOBS[theme],elites=TIER_MATCH.fieldElites[tier-1];
  // 16마리 예산 안에서 군집을 교체 배치(부하를 일반 스폰에 중복 추가하지 않는다).
  const first=createMonster(pool[0],0,0);
  for(let tries=0;tries<400;tries++){
    first.x=(7+Math.random()*48)*TS;first.y=(3+Math.random()*34)*TS;
    if(spawnClear(first,monsters,true)){first.tx=first.homeX=first.x;first.ty=first.homeY=first.y;monsters.push(first);break;}
  }
  const pack=TIER_MATCH.groups.find(g=>g.tier===tier&&!g.dungeonOnly);
  if(pack)for(let tries=0;tries<700;tries++)if(spawnPack(pack,(10+Math.random()*41)*TS,(7+Math.random()*26)*TS,{field:true}))break;
  for(let i=monsters.length;i<16;i++){
    const id=elites.length&&i===14?elites[fieldSerial%elites.length]:pool[i%pool.length];
    for(let tries=0;tries<400;tries++){
      const m=createMonster(id,(7+Math.random()*48)*TS,(3+Math.random()*34)*TS);
      if(spawnClear(m,monsters,true)){monsters.push(m);break;}
    }
  }
}
function restAtCamp(){
  if(MAP!=='field'||traveling)return false;
  traveling=true;closeAll();
  const f=$('fade'),art=$('campArt');f.classList.add('slow');requestAnimationFrame(()=>f.classList.add('on'));
  setTimeout(()=>{
    P.hp=P.maxHp;P.mp=P.maxMp;P.mpAcc=0;
    for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
    spawnFieldMonsters(fieldTheme);syncBars();
    if(typeof SFX!=='undefined')SFX.play('heal');
    const pic=A.camp&&A.camp[dayLook(DAY.t).lamp>.5?'night':'day'];
    if(art&&pic){art.style.backgroundImage='url('+pic+')';requestAnimationFrame(()=>art.classList.add('on'));}
    setTimeout(()=>{
      if(art)art.classList.remove('on');
      setTimeout(()=>{
        f.classList.remove('on');
        setTimeout(()=>{f.classList.remove('slow');traveling=false;say('푹 쉬었습니다. 주변의 기척이 다시 느껴집니다.');},560);
      },pic?720:0);
    },pic?2600:220);
  },560);
  return true;
}
function snapshotDynamicWorld(){
  return {
    monsters:monsters.slice(),dropsLoot:dropsLoot.slice(),enemyShots:enemyShots.slice(),enemyHazards:enemyHazards.slice(),
    solids:solids.slice(),spots:spots.slice(),sprites:sprites.slice(),trees:trees.slice(),npcs:npcs.slice(),dummies:dummies.slice(),exits:exits.slice(),
    lamps:lamps.slice()
  };
}
function restoreDynamicWorld(s){
  if(!s)return;
  const put=(dst,src)=>{dst.splice(0,dst.length,...(src||[]));};
  put(monsters,s.monsters);put(dropsLoot,s.dropsLoot);put(enemyShots,s.enemyShots);put(enemyHazards,s.enemyHazards);
  put(solids,s.solids);put(spots,s.spots);put(sprites,s.sprites);put(trees,s.trees);put(npcs,s.npcs);put(dummies,s.dummies);put(exits,s.exits);
  lamps=(s.lamps||[]).slice();
}
function afterDynamicBuild(id){
  if(window.__PORTAL_RUNTIME_RESTORE)return;
  if(id==='field'){dunGrid=null;spawnFieldMonsters(fieldTheme);}
  else if(id==='dungeon')spawnDungeonMonsters();
  else {dunGrid=null;monsters.length=0;dropsLoot.length=0;enemyShots.length=0;enemyHazards.length=0;}
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
  const cm=window.UI&&UI.combatMods?UI.combatMods():{damageReduce:0};
  v=Math.max(1,Math.round(v*(1-Math.min(75,cm.damageReduce||0)/100)));P.hp=Math.max(0,P.hp-v);syncBars();
  pops.push({x:P.x,y:P.y-95,t:0,txt:(label?label+' ':'')+'-'+v,enemy:true});
  if(P.hp<=0)defeatPlayer();
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
  playerInv=.55; rawPlayerDamage(v); sfx.push({type:'hurt',t:0,x:P.x,y:P.y-42,r:36});
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
function playerControlLocked(){ return PLAYER_STATUS.stone>0||P.castRoot>0; }
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
  if(m.skill==='rock'&&d<225){
    enemyShot(m,dx,dy,250,'','rock',1.05);if(typeof SFX!=='undefined')SFX.play('rock');m.skillCd=1.7+Math.random()*.5;
    pops.push({x:m.x,y:m.y-m.h,t:0,txt:'돌 던지기!',enemy:true});return true;
  }
  if(m.skill==='pounce'&&d>70&&d<205){
    const q=d||1;m.chargeDx=dx/q;m.chargeDy=dy/q;m.chargeWind=.24;if(typeof SFX!=='undefined')SFX.play('charge');m.skillCd=2.0+Math.random()*.4;return true;
  }
  if(m.skill==='dart'&&d<145){
    const q=d||1,mx=-dy/q,my=dx/q,side=Math.random()<.5?-1:1;
    moveMonster(m,mx*side*44,my*side*44);m.skillCd=1.5+Math.random()*.4;return true;
  }
  if(m.skill==='splash'&&d<78){
    enemyHazards.push({kind:'slime',x:P.x,y:P.y-18,t:0,delay:.24,life:.8,r:48,dmg:Math.max(1,Math.round(m.dmg*.65)),status:'slow',done:false});if(typeof SFX!=='undefined')SFX.play('slime');
    m.skillCd=2.2;return true;
  }
  if(m.skill==='cleave'&&d<72){
    enemyHazards.push({kind:'cleave',x:P.x,y:P.y-20,t:0,delay:.32,life:.7,r:58,dmg:Math.max(1,Math.round(m.dmg*1.25)),done:false});
    m.skillCd=2.1;return true;
  }
  if(m.skill==='charge'&&d<225){const q=d||1;m.chargeDx=dx/q;m.chargeDy=dy/q;m.chargeWind=.42;m.skillCd=3.5;return true;}
  if(m.skill==='lightning'&&d<270){enemyHazards.push({kind:'lightning',x:P.x,y:P.y-25,t:0,delay:.65,life:1.0,r:38,dmg:Math.round(m.dmg*1.25),done:false});if(typeof SFX!=='undefined')SFX.play('lightning');m.skillCd=2.8+Math.random()*.7;return true;}
  if(m.skill==='petrify'&&d<230){enemyShot(m,dx,dy,185,'stone','stone',.75);m.skillCd=3.0;return true;}
  if(m.skill==='radial'&&d<235){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;enemyShots.push({x:m.x,y:m.y-m.h*.5,vx:Math.cos(a)*220,vy:Math.sin(a)*220,t:0,life:1.55,dmg:Math.max(1,Math.round(m.dmg*.8)),kind:'feather',done:false});}
    m.skillCd=2.7+Math.random()*.5;return true;
  }
  if(m.skill==='blink'&&d<230){m.vanishT=.55;m.skillCd=3.8+Math.random()*.8;return true;}
  if(m.skill==='web'&&d<165){enemyShot(m,dx,dy,205,'slow','web',.65);m.skillCd=2.8;return true;}
  return false;
}
function applyMonsterStatus(m,kind,dur){
  if(!m||m.dead||!kind)return;
  if(kind==='burn'){m.burnT=Math.max(m.burnT||0,dur||3);m.burnTick=Math.min(m.burnTick||.55,.55);}
  else if(kind==='slow'){m.slowT=Math.max(m.slowT||0,dur||2.5);}
  else if(kind==='confuse'){if(m.boss||m.elite)dur=(dur||2.5)*.4;m.confuseT=Math.max(m.confuseT||0,dur||2.5);}
  else if(kind==='freeze'){if(m.boss||m.elite)dur=(dur||.75)*.4;m.freezeT=Math.max(m.freezeT||0,dur||.75);m.stun=Math.max(m.stun||0,dur||.75);}
}
function updEncounters(dt){
  playerInv=Math.max(0,playerInv-dt); updatePlayerStatus(dt);
  if(!combatMap()) return;

  for(const h of enemyHazards){
    h.t+=dt;
    if(!h.done&&h.t>=h.delay){h.done=true;if(Math.hypot(P.x-h.x,(P.y-30)-h.y)<h.r)hurtPlayer(h.dmg,P.x-h.x,P.y-h.y,h.status||'',h.status==='slow'?2.5:0);}
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
    m.hurt=Math.max(0,m.hurt-dt);m.stun=Math.max(0,m.stun-dt);m.stunImm=Math.max(0,(m.stunImm||0)-dt);m.cd=Math.max(0,(m.cd||0)-dt);m.skillCd=Math.max(0,(m.skillCd||0)-dt);
    m.slowT=Math.max(0,(m.slowT||0)-dt);m.freezeT=Math.max(0,(m.freezeT||0)-dt);
    if(m.burnT>0){
      m.burnT=Math.max(0,m.burnT-dt);m.burnTick=(m.burnTick||0)-dt;
      if(m.burnTick<=0){m.burnTick=.55;const bv=Math.max(1,Math.round(m.maxHp*.022));m.hp-=bv;pops.push({x:m.x,y:m.y-m.h*.8,t:0,txt:'화상 '+bv,crit:true});if(m.hp<=0){killMonster(m);continue;}}
    }
    if(m.stun>0)continue;
    if(m.confuseT>0){   // 혼돈: 공격 못 하고 제멋대로 헤맨다
      m.confuseT=Math.max(0,m.confuseT-dt);m.cfT=(m.cfT||0)-dt;
      if(m.cfT<=0){m.cfT=.35+Math.random()*.4;const ca=Math.random()*6.283;m.cfx=Math.cos(ca);m.cfy=Math.sin(ca);}
      m.chargeWind=0;m.chargeT=0;faceMonster(m,m.cfx,m.cfy);moveMonster(m,m.cfx*m.sp*.7*dt,m.cfy*m.sp*.7*dt);continue;
    }
    const dx=P.x-m.x,dy=P.y-m.y,d=Math.hypot(dx,dy),moveMul=m.slowT>0?.58:1;
    const groupDistance=m.packId?Math.hypot(P.x-m.packX,P.y-m.packY):0;
    if(d<280&&(!m.packId||groupDistance<m.packRadius)){
      m.state='chase'; faceMonster(m,dx,dy);
      if(specialMonsterAI(m,dx,dy,d,dt)) continue;
      if(m.ranged&&d<m.range){
        if(m.cd<=0){enemyShot(m,dx,dy,270,m.shotStatus,m.shotStatus||'bolt',1);m.cd=1.45+Math.random()*.65;}
      } else if(!m.ranged&&d<42){
        if(m.cd<=0){hurtPlayer(m.dmg,dx,dy,m.touchStatus,m.touchStatus==='slow'?2.4:0);m.cd=.9+Math.random()*.35;}
      } else if(d>30){
        moveMonster(m,dx/d*m.sp*moveMul*dt,dy/d*m.sp*moveMul*dt);
      }
    } else {
      m.state='wander'; m.wait-=dt;
      const wx=m.tx-m.x,wy=m.ty-m.y,wd=Math.hypot(wx,wy);
      if(m.wait<=0||wd<8){m.tx=m.homeX+(Math.random()*2-1)*90;m.ty=m.homeY+(Math.random()*2-1)*70;m.tx=Math.max(40,Math.min(MWp-40,m.tx));m.ty=Math.max(55,Math.min(MHp-20,m.ty));m.wait=1.5+Math.random()*3;}
      else{faceMonster(m,wx,wy);moveMonster(m,wx/wd*m.sp*moveMul*.28*dt,wy/wd*m.sp*moveMul*.28*dt);}
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
function hitMonster(m,d,stagger,dmOver,kbOver){
  if(!m||m.dead)return;
  const rr=rollPlayerDamage(dmOver||basicDamage()),v=rr.v,crit=rr.crit;
  // 정예·우두머리는 경직을 한 번 받으면 잠시 면역(무한 경직 방지)
  let st=stagger?.32:.12,kb=kbOver!=null?kbOver:(stagger?20:12);
  if(m.boss||m.elite){kb*=.4;if(m.stunImm>0){st=0;kb*=.3;}else if(stagger)m.stunImm=4;}
  m.hp-=v;m.hurt=.18;m.stun=st;
  if(!dmOver&&WPN&&window.GAME&&GAME.gainMastery)GAME.gainMastery(WPN.wt,1);
  const q=Math.hypot(d[0],d[1])||1;
  for(const f of [1,.6,.3]){const nx=m.x+d[0]/q*kb*f,ny=m.y+d[1]/q*kb*f;if(!monsterBlocked(nx,ny)){m.x=nx;m.y=ny;break;}}   // 벽에 닿으면 갈 수 있는 만큼만
  pops.push({x:m.x+(Math.random()*14-7),y:m.y-m.h*.72,t:0,txt:String(v),crit});
  sfx.push({type:'hit',t:0,x:m.x,y:m.y-m.h*.55,r:crit?58:40,crit});
  if(m.hp<=0)killMonster(m);
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
    return UI.make({kind:'weapon',wt,tier,rank:m&&m.rank,roll:true});
  }
  if(r<.90){
    const kinds=['head','body','hands','feet'];
    return UI.make({kind:kinds[Math.floor(Math.random()*kinds.length)],tier,rank:m&&m.rank,roll:true});
  }
  return UI.make({kind:Math.random()<.55?'ring':'neck',tier,rank:m&&m.rank,roll:true});
}
function monsterExp(m){
  const tier=monsterTier(m),cap=tier*10,lv=P.lv||1;
  const decay=lv>cap?Math.max(.035,1-(lv-cap)*.13):1;
  return Math.max(1,Math.round((m.exp||2)*decay*(.92+Math.random()*.16)));
}
function killMonster(m){
  if(m.family==='skeleton'&&!m.revived&&Math.random()<.48){
    m.revived=true;m.dead=true;m.death=0;m.hp=0;m.reviveT=1.5;return;
  }
  m.dead=true;m.death=0;m.hp=0;
  sfx.push({type:'kill',t:0,x:m.x,y:m.y,r:44});
  const tier=monsterTier(m),coinBonus=(window.UI&&UI.coinBonus)?UI.coinBonus():0,rewardMul=m.coinMul||TIER_MATCH.scales.coin[tier-1];
  const coin=Math.round((2+Math.floor(Math.random()*8))*(1+coinBonus/100)*rewardMul);
  dropsLoot.push({kind:'gold',x:m.x-8,y:m.y,amount:coin,ph:Math.random()*7});
  const find=(window.UI&&UI.findBonus)?UI.findBonus():0,dropChance=m.boss?1:Math.min(.68,(m.dropChance||.30)+find/250);
  if(Math.random()<dropChance){
    const it=randomDropItem(m);if(it)dropsLoot.push({kind:'item',x:m.x+12,y:m.y,item:it,ph:Math.random()*7});
    if(m.bossRole==='floor'&&Math.random()<.65){const it2=randomDropItem(m);if(it2)dropsLoot.push({kind:'item',x:m.x+28,y:m.y+5,item:it2,ph:2+Math.random()*5});}
  }
  if(window.GAME&&GAME.gainExp)GAME.gainExp(monsterExp(m));
  if(window.GUILD)GUILD.onKill(m);
}
function appendEncounterSprites(list){if(!combatMap())return;drawEnemySkillFx();for(const m of monsters)if(!m.removed)list.push({mon:m,key:m.y});}
function drawEnemySkillFx(){
  ctx.save();
  for(const s of enemyShots){
    if(s.kind==='rock'&&!vfxReady('shot_rock')){
      ctx.fillStyle='#7b6248';ctx.strokeStyle='#c1a27d';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();ctx.stroke();
    }
  }
  for(const h of enemyHazards){
    if(vfxHazard(h))continue;
    const p=Math.max(0,Math.min(1,h.t/Math.max(.01,h.delay))),r=(h.r||40)*(0.35+p*.65);
    ctx.globalAlpha=.25+.5*(1-p);
    ctx.strokeStyle=h.kind==='slime'?'#8cff38':'#ff9b42';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(h.x,h.y,r,r*.45,0,0,7);ctx.stroke();
  }
  ctx.restore();
}
function drawMonster(m,sdt){
  const baseA=m.dead?Math.max(0,1-m.death):1, a=m.vanishT>0?.10:baseA, img=m.imgs[m.face]||m.imgs.front; if(!img)return;
  ctx.save();ctx.globalAlpha=a;
  if(m.chargeWind>0){ctx.strokeStyle='#ff6b42';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,34+Math.sin(T*18)*4,12,0,0,7);ctx.stroke();}
  if(m.enraged){ctx.strokeStyle='rgba(255,60,35,.55)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(m.x,m.y-m.h*.42,m.w*.45,m.h*.52,0,0,7);ctx.stroke();}
  if(!vfxMonsterGround(m)){
    if(m.burnT>0){ctx.strokeStyle='rgba(255,105,30,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y-m.h*.35,m.w*.38,m.h*.38,0,0,7);ctx.stroke();}
    if(m.slowT>0||m.freezeT>0){ctx.strokeStyle='rgba(90,190,255,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,m.w*.38,8,0,0,7);ctx.stroke();}
  }
  ctx.fillStyle='rgba(0,0,0,.27)';ctx.beginPath();ctx.ellipse(m.x,m.y,m.w*.3,5,0,0,7);ctx.fill();
  const wob=m.hurt>0?Math.sin(T*55)*4:0; ctx.translate(wob,0);const mirror=m.face==='left'&&(!MOBDEF[m.type].images.left||m.type==='swamp_mage');
  // 그림 비율 유지(좌우로 늘어나지 않게), 너무 넓은 그림만 상자 폭 1.45배까지로 제한
  const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,ar=iw/ih;
  let dh=m.h,dw=dh*ar;if(dw>m.w*1.45){dw=m.w*1.45;dh=dw/ar;}
  // 움직임: 걸을 때 통통 튀고 눌렸다 펴지며, 서 있을 땐 숨쉬듯 부푼다(슬라임류는 더 젤리처럼)
  const dist=Math.hypot(m.x-(m.lx==null?m.x:m.lx),m.y-(m.ly==null?m.y:m.ly));m.lx=m.x;m.ly=m.y;
  const moving=!m.dead&&dist>.15;m.walkA=Math.max(0,Math.min(1,(m.walkA||0)+(moving?1:-1)*(sdt||.016)*7));
  m.walkPh=(m.walkPh||0)+(sdt||.016)*(moving?Math.min(16,6+m.sp/12):2.4);
  const jelly=m.family==='slime'||m.type==='slime'||m.type==='slime_king'||m.family==='mushroom';
  const ph=m.walkPh+(m.x*.013),hop=Math.abs(Math.sin(ph)),amp=jelly?.17:.07;
  const yOff=-hop*dh*amp*m.walkA,idle=Math.sin(T*(jelly?3.4:2.1)+m.x*.02)*(jelly?.055:.022)*(1-m.walkA);
  const sy=1+idle+(jelly?(.5-hop)*.16:(.5-hop)*.05)*m.walkA,sx=1/Math.sqrt(Math.max(.6,sy));
  ctx.save();ctx.translate(m.x,m.y+yOff);if(mirror)ctx.scale(-1,1);ctx.scale(sx,sy);ctx.drawImage(img,-dw/2,-dh,dw,dh);ctx.restore();ctx.translate(-wob,0);
  if(!m.dead){
    ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#21160e';ctx.fillStyle=m.boss?'#ffda6b':m.rank==='elite'?'#bfa6ff':'#f7f1df';
    const label=`${m.boss&&m.type!=='slime_king'?'♛ ':''}${m.name}${m.boss?' 우두머리':m.rank==='elite'?' 정예':''}`;
    ctx.strokeText(label,m.x,m.y-m.h-20);ctx.fillText(label,m.x,m.y-m.h-20);
    const bw=48,bx=m.x-bw/2,by=m.y-m.h-10;ctx.fillStyle='#24140f';ctx.fillRect(bx,by,bw,6);ctx.fillStyle='#c63e32';ctx.fillRect(bx+1,by+1,(bw-2)*Math.max(0,m.hp/m.maxHp),4);}
  if(!m.dead)vfxMonsterIcons(m,m.y-m.h-10);
  if(m.confuseT>0&&!m.dead){ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#2a1038';ctx.fillStyle='#d9a8ff';const qx=m.x+m.w*.42+Math.sin(T*9)*3,qy=m.y-m.h-2;ctx.strokeText('?',qx,qy);ctx.fillText('?',qx,qy);}
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
    if(h.kind==='lightning'&&!vfxReady('ring_gold')){
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
    if(vfxEnemyShot(s))continue;
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
  async enter(theme,leg){const m=await prepareField(theme||'spring',leg);travel('field',m.spawn,'side');return true;},
  goLeg,askDestination,
  mapInfo(){return {blds:MAPS.field.blds.length,exits:MAPS.field.exits.length,name:MAPS.field.name,map:MAP};},
  warp(tx,ty){P.x=tx*TS;P.y=ty*TS;return true;},
  state(){return {map:MAP,theme:fieldTheme,leg:fieldLeg,legs:fieldLegs,tier:FIELD_TIER[fieldTheme]||1,serial:fieldSerial,buildMs:Math.round(fieldBuildMs),monsters:monsters.filter(m=>!m.removed).length,props:MAPS.field?MAPS.field.props.length:0,drops:dropsLoot.filter(d=>!d.picked).length,hp:P.hp,gold:P.gold,stuckSpawns:monsters.filter(m=>!m.dead&&pointInSolid(m.x,m.y,10)).length,layout:MAPS.field?MAPS.field.props.slice(5,11).map(p=>[Math.round(p.x),Math.round(p.y),p.k]):[],village:MAPS.field?MAPS.field.blds.map(b=>({name:b.name,kind:b.kind,market:b.market,x:Math.round(b.x),y:Math.round(b.y)})):[]};},
  hitFirst(){const m=monsters.find(x=>!x.dead);if(!m)return false;hitMonster(m,[1,0],true,m.hp+5);return true;},
  debugTarget(dx,dy,freeze){
    const m=monsters.find(x=>!x.dead&&!x.removed);if(!m)return false;
    for(const x of monsters)if(x!==m)x.removed=true;
    m.x=P.x+dx;m.y=P.y+dy;m.vx=m.vy=0;if(freeze)m.stun=99;return {x:m.x,y:m.y};
  },
  flinchTest(){const m={monster:1,boss:1,hp:9999,maxHp:9999,x:P.x+500,y:P.y+500,h:60,w:60,hurt:0,stun:0,type:'test'};hitMonster(m,[1,0],true,1);const a=m.stun;m.stun=0;hitMonster(m,[1,0],true,1);return [a,m.stun];},
  debugMonster(){const m=monsters.find(x=>!x.dead&&!x.removed);return m?{type:m.type,family:m.family,name:m.name,rank:m.rank,bossRole:m.bossRole,packId:m.packId||0,packLeader:!!m.packLeader,w:m.w,baseW:m.baseW,x:m.x,y:m.y,exp:m.exp,dropChance:m.dropChance,blocked:pointInSolid(m.x,m.y,m.w*.5)||gridBlocked(m.x,m.y,m.w*.5),tier:m.tier,mobLv:m.mobLv||0,hp:m.hp,maxHp:m.maxHp,dmg:m.dmg,skill:m.skill,sp:m.sp}:null;},
  debugMonsters(){return monsters.filter(x=>!x.dead&&!x.removed).map(m=>({type:m.type,family:m.family,name:m.name,rank:m.rank,bossRole:m.bossRole,packId:m.packId||0,packLeader:!!m.packLeader,w:m.w,baseW:m.baseW,x:m.x,y:m.y,exp:m.exp,dropChance:m.dropChance,blocked:pointInSolid(m.x,m.y,m.w*.5)||gridBlocked(m.x,m.y,m.w*.5),tier:m.tier,mobLv:m.mobLv||0,hp:m.hp,maxHp:m.maxHp,dmg:m.dmg,skill:m.skill,sp:m.sp}));},
  respawn:()=>spawnFieldMonsters(fieldTheme),rest:restAtCamp,prepareField,openRegionSelect
};
