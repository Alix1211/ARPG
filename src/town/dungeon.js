// ======================= 던전 (Claude, 2026-10-03) =======================
// 동굴 입구 → 지하 N층. 층마다 방+복도 랜덤 생성, 어둠·횃불, 상자, 몬스터, 계단.
// 필드 코드(field_dungeon.js)의 몬스터·드랍·판정을 그대로 함께 쓴다.
const combatMap = () => MAP === 'field' || MAP === 'dungeon';
// 던전은 두 가지 모습: ruins(성 밖 입구, 석조) · cave(필드 동굴 입구, 자연 동굴). 들어온 입구에 따라 정해지고 층을 내려가도 유지된다.
const DT = {}, DP = {}; let dunTheme = 'ruins', caveReturn = null;
for (const th in A.dtiles){ DT[th] = {}; for (const k in A.dtiles[th]) DT[th][k] = load(A.dtiles[th][k]); }
for (const th in A.dprops){ DP[th] = {}; for (const k in A.dprops[th]) DP[th][k] = load(A.dprops[th][k].src); }
const DUN_MOBS=TIER_MATCH.dungeonPools;
const dungeonTier = floor => Math.max(1,Math.min(7,Math.ceil(Math.max(1,floor)/3)));
let dunFloor=0,dunGrid=null,dunW=44,dunH=32,dunMaxFloor=0,dunBusy=false;

// ---- 지도 만들기: 방 + 복도 ----
// 던전과 야외형 필드가 같은 생성 규칙을 공유한다. 표현(타일/빛/날씨)만 각 맵이 따로 맡는다.
function genRoomLayout(W,H,roomTarget=9,arenaDef=null){
  const g=Array.from({length:H},()=>new Uint8Array(W)); // 0 막힘, 1 이동 가능
  const a0=arenaDef||{x:Math.max(2,W-18),y:Math.max(3,Math.floor(H/2)-4),w:13,h:9};
  const arena={...a0,cx:a0.x+(a0.w>>1),cy:a0.y+(a0.h>>1),arena:true};
  const rooms=[arena];let tries=0;
  while(rooms.length<roomTarget&&tries++<700){
    const w=6+Math.floor(Math.random()*7),h=5+Math.floor(Math.random()*6);
    const x=2+Math.floor(Math.random()*Math.max(1,W-w-4)),y=3+Math.floor(Math.random()*Math.max(1,H-h-5));
    if(rooms.some(r=>x<r.x+r.w+2&&x+w+2>r.x&&y<r.y+r.h+3&&y+h+3>r.y))continue;
    rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
  }
  rooms.sort((a,b)=>a.cx-b.cx);
  const carve=(x0,y0,x1,y1)=>{for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)if(y>1&&y<H-1&&x>0&&x<W-1)g[y][x]=1;};
  for(const r of rooms)carve(r.x,r.y,r.x+r.w-1,r.y+r.h-1);
  for(let i=1;i<rooms.length;i++){
    const a=rooms[i-1],b=rooms[i];
    if(Math.random()<.5){carve(a.cx,a.cy-1,b.cx,a.cy+1);carve(b.cx-1,a.cy,b.cx+1,b.cy);}
    else{carve(a.cx-1,a.cy,a.cx+1,b.cy);carve(a.cx,b.cy-1,b.cx,b.cy+1);}
  }
  const start=rooms[0],far=rooms.find(r=>r.arena)||rooms[rooms.length-1];
  return {g,rooms,start,far,carve};
}
function genDungeon(){
  return genRoomLayout(dunW,dunH,9,{x:26,y:19,w:13,h:9});
}
function activeGrid(){return (typeof CUR!=='undefined'&&CUR&&CUR.grid)||dunGrid||null;}
function isFloor(x,y){
  const gr=activeGrid();if(!gr)return false;
  const H=gr.length,W=H&&gr[0]?gr[0].length:0;
  return y>=0&&y<H&&x>=0&&x<W&&gr[y][x]===1;
}
function gridBlocked(px,py,r){
  const gr=activeGrid();if(!gr)return false;
  for(const [ox,oy] of [[-r,0],[r,0],[0,-r*.6],[0,2],[-r*.7,-r*.4],[r*.7,-r*.4]]){
    if(!isFloor(Math.floor((px+ox)/TS),Math.floor((py+oy)/TS)))return true;
  }
  return false;
}
// ---- 그리기: 바닥·벽 ----
async function paintDungeon(D){
  const W = dunW * TS, H = dunH * TS, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const T = DT[dunTheme]; await waitImages(Object.values(T));
  g.fillStyle = '#0b0a0d'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < dunH; y++) for (let x = 0; x < dunW; x++){
    if (D.g[y][x]){
      const r = Math.random(), im = r < 0.08 ? T.floor_crack : r < 0.15 ? T.floor_moss : T.floor;
      g.drawImage(im, x * TS, y * TS, TS + 1, TS + 1);
    } else if (y + 1 < dunH && D.g[y + 1][x]){ // 바닥 바로 위 = 벽 앞면
      g.drawImage(Math.random() < 0.18 ? T.wall_front_moss : T.wall_front, x * TS, y * TS, TS + 1, TS + 1);
      if (y - 1 >= 0 && !D.g[y - 1][x]) g.drawImage(T.wall_top, x * TS, (y - 1) * TS, TS + 1, TS + 1);
    } else {
      let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (D.g[y + dy] && D.g[y + dy][x + dx]) near = true;
      if (near) g.drawImage(T.wall_top, x * TS, y * TS, TS + 1, TS + 1);
    }
  }
  // 벽 아래 그늘
  g.fillStyle = 'rgba(0,0,0,.28)';
  for (let y = 1; y < dunH; y++) for (let x = 0; x < dunW; x++) if (D.g[y][x] && !D.g[y - 1][x]) g.fillRect(x * TS, y * TS, TS, 10);
  const mini = document.createElement('canvas'); mini.width = dunW * 6; mini.height = dunH * 6;
  const mg = mini.getContext('2d'); mg.fillStyle = '#100c0a'; mg.fillRect(0, 0, mini.width, mini.height);
  mg.fillStyle = '#8a7a66'; for (let y = 0; y < dunH; y++) for (let x = 0; x < dunW; x++) if (D.g[y][x]) mg.fillRect(x * 6, y * 6, 6, 6);
  return { ground: c.toDataURL('image/webp', 0.8), mini: mini.toDataURL('image/webp', 0.8) };
}
function dprop(k, x, y, extra){
  const d = A.dprops[dunTheme][k]; return Object.assign({ k: d.key, x: x * TS, y: y * TS, w: d.w, h: d.h, cw: d.cw || 0, cd: (d.cd || 0) * TS }, extra || {});
}
async function prepareDungeon(floor){
  dunFloor = floor; dunMaxFloor = Math.max(dunMaxFloor, floor);
  const D = genDungeon(); dunGrid = D.g;
  const paint = await paintDungeon(D);
  const props = [], dspots = [], torches = [];
  // 위층 계단(시작 방)과 아래층 계단(가장 먼 방)
  props.push(dprop('stairs_up', D.start.cx, D.start.cy - 1, { name: floor === 1 ? (dunTheme==='cave' ? '위로 (필드로)' : '위로 (성 밖으로)') : '위로 (' + (floor - 1) + '층)', kind: 'stairs_up', flat: 1 }));
  props.push(dprop('stairs_down', D.far.x+D.far.w-2, D.far.y+D.far.h-2, { name: '아래로 (' + (floor + 1) + '층)', kind: 'stairs_down', flat: 1 }));
  // 횃불: 벽 앞면에 띄엄띄엄
  for (let y = 1; y < dunH - 1; y++) for (let x = 1; x < dunW - 1; x++){
    if (!D.g[y][x] && D.g[y + 1][x] && (x * 7 + y * 13) % 9 === 0 && Math.random() < 0.6){
      props.push(dprop('torch', x + 0.5, y + 0.95, { flame: 1 })); torches.push({ x: (x + 0.5) * TS, y: (y + 0.4) * TS });
    }
  }
  // 방 꾸미기: 동굴 기둥(석순)·통·항아리·해골·거미줄·버섯·수정·바위·광산 수레, 상자
  const deco = dunTheme === 'cave' ? ['barrel', 'jar', 'bones', 'cobweb', 'mushroom', 'crystal', 'rocks', 'rocks', 'stalagmites', 'minecart', 'bones'] : ['barrel', 'jar', 'bones', 'cobweb', 'bones', 'jar'];
  D.rooms.forEach((r, i) => {
    if (r === D.start || r === D.far) return;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++){
      const x = r.x + 0.8 + Math.random() * (r.w - 1.6), y = r.y + 1 + Math.random() * (r.h - 1.6);
      if (Math.hypot(x - D.far.cx, y - D.far.cy) < 2) continue;
      props.push(dprop(deco[Math.floor(Math.random() * deco.length)], x, y));
    }
    if (r.w >= 9 && r.h >= 7){ props.push(dprop('pillar', r.x + 2, r.y + 2.6)); props.push(dprop('pillar', r.x + r.w - 2, r.y + 2.6)); }
    if (Math.random() < 0.45 && r !== D.far) props.push(dprop('chest_closed', r.cx + 1.5, r.y + 1.6, { name: '보물상자', kind: 'chest' }));
  });
  const map = {
    name: '던전 지하 ' + floor + '층', map: { w: dunW, h: dunH, ts: TS, px: TS }, ground: paint.ground, mini: paint.mini,
    blds: [], props, npcs: [], grid: D.g, torches, rooms: D.rooms, startRoom: D.start, farRoom: D.far,
    spawn: [(D.start.cx + .5) * TS, (D.start.cy + .5) * TS], exits: [],
  };
  map.G = load(map.ground); map.MINI = load(map.mini); await waitImages([map.G, map.MINI]);
  MAPS.dungeon = map; return map;
}
function spawnDungeonMonsters(){
  monsters.length=0;dropsLoot.length=0;enemyShots.length=0;enemyHazards.length=0;
  const M=MAPS.dungeon,tier=dungeonTier(dunFloor),pool=DUN_MOBS[tier-1],elites=TIER_MATCH.dungeonElites[tier-1];
  const arena=M.farRoom,cx=(arena.x+arena.w/2)*TS,cy=(arena.y+arena.h/2)*TS;
  const floorBoss=dunFloor%3===0?TIER_MATCH.floorBosses[tier-1]:null;
  const group=TIER_MATCH.groups.find(g=>g.tier===tier&&g.leader===floorBoss)||TIER_MATCH.groups.find(g=>g.tier===tier);
  const caveChallenge=dunTheme==='cave';
  if(floorBoss){
    if(group&&group.leader===floorBoss){
      if(!spawnPack(group,cx,cy,{floor:dunFloor,bossRole:'floor',caveChallenge}))throw Error('층 우두머리 군집 배치 실패');
    }else monsters.push(createMonster(floorBoss,cx,cy,{floor:dunFloor,bossRole:'floor',caveChallenge}));
  }else if(group){
    if(!spawnPack(group,cx,cy,{floor:dunFloor,caveChallenge}))throw Error('던전 군집 배치 실패');
  }
  for(const room of M.rooms){
    if(room===M.startRoom||room===arena)continue;
    const n=Math.round((2+Math.floor(Math.random()*3)+Math.min(3,tier-1))*1.3);   // 방당 출현 +30%(케인 2026-10-04)
    for(let i=0;i<n;i++){
      const id=elites.length&&i===n-1?elites[Math.floor(Math.random()*elites.length)]:pool[Math.floor(Math.random()*pool.length)];
      for(let tries=0;tries<150;tries++){
        const m=createMonster(id,(room.x+1+Math.random()*(room.w-2))*TS,(room.y+1.5+Math.random()*(room.h-2))*TS,{floor:dunFloor,caveChallenge});
        if(spawnClear(m)){monsters.push(m);break;}
      }
    }
  }
  const mimicId=TIER_MATCH.mimics[tier-1];
  if(mimicId&&Math.random()<.35){
    const chest=M.props.find(p=>p.kind==='chest');
    if(chest){
      chest.mimic=1;chest.mimicId=mimicId;
      const spot=spots.find(s=>s.data===chest);
      if(spot){spot.prop.img=mobImageSet(mimicId).closed;spot.prop.mimic=1;}
    }
  }
}

// ---- 들어가기·층 이동 ----
async function goDungeon(floor,fromAbove){
  if(dunBusy||traveling)return false;
  dunBusy=true;
  try{
    say(floor===1?(dunTheme==='cave'?'공기가 다르네… 여기 몬스터는 훨씬 세겠어.':'어둡고 축축하다… 돈 냄새가 난다.'):'지하 '+floor+'층');
    if(window.CHATTER)CHATTER.floor(floor);
    const m=await prepareDungeon(floor);
    // 계단 바로 위/타일 경계 대신 방 중심의 안전 바닥에서 시작.
    const pos=fromAbove===false?[(m.farRoom.x+m.farRoom.w-2)*TS,(m.farRoom.y+m.farRoom.h-2)*TS]:m.spawn;
    if(!travel('dungeon',pos,'front'))return false;
    await new Promise(r=>setTimeout(r,560));
    const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
    if(window.GUILD)GUILD.onDungeonFloor(floor);
    return true;
  }finally{dunBusy=false;}
}
function enterDungeonFromOut(){closeAll();dunTheme='ruins';caveReturn=null;goDungeon(1);}
function enterDungeonFromHere(){
  const fs=window.__FD&&__FD.state?__FD.state():null;
  caveReturn={theme:fs&&fs.theme?fs.theme:(typeof fieldTheme!=='undefined'?fieldTheme:'spring'),leg:fs&&fs.leg?fs.leg:1,legs:fs&&fs.legs?fs.legs:1,x:P.x,y:P.y,dir:P.dir||'front'};
  dunTheme='cave';goDungeon(1);
}
function nextDungeonFloor(){if(!dunBusy)goDungeon(dunFloor+1);}
async function previousDungeonFloor(){
  if(dunBusy)return;
  if(dunFloor<=1){
    dunGrid=null;
    if(dunTheme==='cave'&&caveReturn&&typeof prepareField==='function'){
      const q=caveReturn;dunBusy=true;
      try{await prepareField(q.theme,q.leg,q.legs);travel('field',[q.x,q.y+TS*.9],q.dir||'front');}
      finally{dunBusy=false;}
      return;
    }
    travel('out',[27.3*TS,11.6*TS],'front');return;
  }
  goDungeon(dunFloor-1,false);
}
function openDungeonChest(spot){
  const p = spot.prop, src = spot.data || {}; if (!p || p.opened) return;
  if (src.mimic){ // 미믹!
    p.opened = 1; p.hide = 1; spots.splice(spots.indexOf(spot), 1);
    // 위장 상자가 사라지면 그 상자만의 충돌도 해제한다. 주변 벽/소품은 유지한다.
    const solidIndex=solids.findIndex(s=>s.x0===src.x-src.w*src.cw/2&&s.x1===src.x+src.w*src.cw/2&&s.y0===src.y-src.cd&&s.y1===src.y-2);
    const chestSolid=solidIndex>=0?solids.splice(solidIndex,1)[0]:null;
    const id=src.mimicId||TIER_MATCH.mimics[dungeonTier(dunFloor)-1];
    if(!id)throw Error('미믹 티어 누락');
    const m=createMonster(id,p.x,p.y,{floor:dunFloor,caveChallenge:dunTheme==='cave'});
    let placed=spawnClear(m);
    for(let ring=1;ring<=5&&!placed;ring++)for(let step=0;step<16;step++){
      const a=step*Math.PI/8;m.x=p.x+Math.cos(a)*TS*ring;m.y=p.y+Math.sin(a)*TS*ring;
      if(spawnClear(m)){placed=true;break;}
    }
    if(!placed){
      if(chestSolid)solids.splice(solidIndex,0,chestSolid);
      p.opened=0;p.hide=0;spots.push(spot);say('상자가 몸을 숨기고 있습니다. 주변을 비워 주세요.');return;
    }
    m.tx=m.homeX=m.x;m.ty=m.homeY=m.y;m.state='chase';monsters.push(m);
    say('상자가… 이빨이 있다?!'); return;
  }
  p.opened = 1; p.img = BI.d_chest_open || p.img; spots.splice(spots.indexOf(spot), 1);
  const gold = 15 + Math.floor(Math.random() * 20) * dunFloor;
  dropsLoot.push({ kind: 'gold', x: p.x - 12, y: p.y + 14, amount: gold, ph: 0 });
  if (Math.random() < 0.7){ const it = randomDropItem({tier:dungeonTier(dunFloor),caveChallenge:dunTheme==='cave'}); if (it) dropsLoot.push({ kind:'item', x:p.x+14, y:p.y+14, item:it, ph:1 }); }
  say('금화 냄새!');
}
// ---- 어둠과 불빛 (화면 좌표) ----
const shadeC = document.createElement('canvas'), shadeG = shadeC.getContext('2d');
function drawDungeonShade(camX, camY){
  if (MAP !== 'dungeon') return;
  if (shadeC.width !== cv.width || shadeC.height !== cv.height){ shadeC.width = cv.width; shadeC.height = cv.height; }
  const g = shadeG, k = dpr * Z; g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(6,5,10,0.9)'; g.fillRect(0, 0, shadeC.width, shadeC.height);
  g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => { const sx = (x - camX) * k, sy = (y - camY) * k, R = r * k;
    const gr = g.createRadialGradient(sx, sy, 0, sx, sy, R); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, R, 0, 7); g.fill(); };
  const fl = 0.94 + Math.sin(T * 11) * 0.03 + Math.sin(T * 27) * 0.02;
  hole(P.x, P.y - 40, 250, 1);
  for (const t of CUR.torches || []) if (Math.abs(t.x - P.x) < 900 && Math.abs(t.y - P.y) < 700) hole(t.x, t.y + 30, 170 * fl, 0.95);
  for (const s of shots) if (s.kind === 'fire' || s.kind === 'staff') hole(s.x, s.y, 90, 0.8);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(shadeC, 0, 0);
  // 횃불 주위 따뜻한 빛
  ctx.globalCompositeOperation = 'lighter';
  for (const t of CUR.torches || []){
    const sx = (t.x - camX) * k, sy = (t.y - camY) * k, R = 120 * k * fl; if (sx < -R || sy < -R || sx > cv.width + R || sy > cv.height + R) continue;
    const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R); gr.addColorStop(0, 'rgba(255,170,80,.30)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.__DUN={
  setTheme:t=>{dunTheme=t;},theme:()=>dunTheme,rooms:()=>(MAPS.dungeon.rooms||[]).map(r=>[r.cx,r.cy]),
  respawn:()=>spawnDungeonMonsters(),
  debugMimic(){
    const id=TIER_MATCH.mimics[dungeonTier(dunFloor)-1],spot=spots.find(s=>s.kind==='chest');
    if(!id||!spot)return null;
    spot.data.mimic=1;spot.data.mimicId=id;spot.prop.img=mobImageSet(id).closed;
    const closed=spot.prop.img===mobImageSet(id).closed;
    openDungeonChest(spot);
    const m=monsters.find(m=>m.type===id);
    return {id,closed,opened:!!m&&m.imgs.front===mobImageSet(id).front,blocked:!!m&&(pointInSolid(m.x,m.y,m.w*.5)||gridBlocked(m.x,m.y,m.w*.5)),mobLv:m&&m.mobLv};
  },
  go:goDungeon,tier:()=>dungeonTier(dunFloor),floorTier:dungeonTier,
  snapshotPortal:()=>({floor:dunFloor,grid:dunGrid,map:MAPS.dungeon,maxFloor:dunMaxFloor,theme:dunTheme,caveReturn:caveReturn?{...caveReturn}:null}),
  preparePortalRestore:s=>{if(!s)return false;dunFloor=s.floor||1;dunTheme=s.theme||'ruins';caveReturn=s.caveReturn||null;dunGrid=s.grid||null;MAPS.dungeon=s.map||MAPS.dungeon;dunMaxFloor=s.maxFloor||dunMaxFloor;return true;},
  restoreEntry:(theme,ret)=>{dunTheme=theme==='cave'?'cave':'ruins';caveReturn=ret||null;return true;},
  state:()=>({map:MAP,floor:dunFloor,tier:dungeonTier(dunFloor),theme:dunTheme,caveReturn:caveReturn?{...caveReturn}:null,busy:dunBusy,monsters:monsters.filter(m=>!m.dead).length,chests:spots.filter(s=>s.kind==='chest').length,name:CUR.name,
    blocked:blocked(P.x,P.y),moves:[[16,0],[-16,0],[0,16],[0,-16]].filter(([dx,dy])=>!blocked(P.x+dx,P.y+dy)).length}),
  spots:()=>spots.map(s=>[s.kind,Math.round(s.x),Math.round(s.y)])
};
