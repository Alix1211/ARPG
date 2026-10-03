// ======================= 던전 (Claude, 2026-10-03) =======================
// 동굴 입구 → 지하 N층. 층마다 방+복도 랜덤 생성, 어둠·횃불, 상자, 몬스터, 계단.
// 필드 코드(field_dungeon.js)의 몬스터·드랍·판정을 그대로 함께 쓴다.
const combatMap = () => MAP === 'field' || MAP === 'dungeon';
const DT = {}; for (const k in A.dtiles) DT[k] = load(A.dtiles[k]);
const DP = {}; for (const k in A.dprops) DP[k] = load(A.dprops[k].src);
Object.assign(MOBDEF, {
  gargoyle: { hp:68, sp:48, dmg:8, ranged:1, range:195, skill:'petrify' },
  mimic: { hp:82, sp:76, dmg:11, skill:'charge' },
  lich: { hp:320, sp:50, dmg:14, ranged:1, range:250, skill:'lightning' },
});
const DUN_MOBS = [
  ['slime','spider','skeleton','goblin'],
  ['wolf','spider','skeleton','rogue'],
  ['skeleton','gargoyle','darkmage','orc'],
  ['bear','gargoyle','elem_ice','darkmage'],
  ['gargoyle','elem_ice','darkmage','harpy'],
  ['demon','elem_fire','orc','darkmage'],
  ['demon','harpy','gargoyle','darkmage']
];
const dungeonTier = floor => Math.max(1,Math.min(7,Math.ceil(Math.max(1,floor)/3)));
let dunFloor=0,dunGrid=null,dunW=44,dunH=32,dunMaxFloor=0,dunBusy=false;

// ---- 지도 만들기: 방 + 복도 ----
function genDungeon(){
  const W = dunW, H = dunH, g = Array.from({ length: H }, () => new Uint8Array(W)); // 0 벽, 1 바닥
  const rooms = []; let tries = 0;
  while (rooms.length < 9 && tries++ < 400){
    const w = 6 + Math.floor(Math.random() * 6), h = 5 + Math.floor(Math.random() * 4);
    const x = 2 + Math.floor(Math.random() * (W - w - 4)), y = 3 + Math.floor(Math.random() * (H - h - 5));
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  rooms.sort((a, b) => a.cx - b.cx);
  const carve = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (y > 1 && y < H - 1 && x > 0 && x < W - 1) g[y][x] = 1; };
  for (const r of rooms) carve(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1);
  for (let i = 1; i < rooms.length; i++){ // 복도 폭 3칸 (엘프가 넉넉히 지나가게)
    const a = rooms[i - 1], b = rooms[i];
    if (Math.random() < 0.5){ carve(a.cx, a.cy - 1, b.cx, a.cy + 1); carve(b.cx - 1, a.cy, b.cx + 1, b.cy); }
    else { carve(a.cx - 1, a.cy, a.cx + 1, b.cy); carve(a.cx, b.cy - 1, b.cx, b.cy + 1); }
  }
  // 가장 먼 방을 출구로
  const start = rooms[0]; let far = rooms[1], fd = 0;
  for (const r of rooms){ const d = Math.hypot(r.cx - start.cx, r.cy - start.cy); if (d > fd){ fd = d; far = r; } }
  return { g, rooms, start, far };
}
const isFloor = (x, y) => dunGrid && y >= 0 && y < dunH && x >= 0 && x < dunW && dunGrid[y][x] === 1;
function gridBlocked(px, py, r){
  if (!dunGrid) return false;
  for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r * 0.6], [0, 2], [-r * 0.7, -r * 0.4], [r * 0.7, -r * 0.4]]){
    if (!isFloor(Math.floor((px + ox) / TS), Math.floor((py + oy) / TS))) return true;
  }
  return false;
}
// ---- 그리기: 바닥·벽 ----
async function paintDungeon(D){
  const W = dunW * TS, H = dunH * TS, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); await waitImages(Object.values(DT));
  g.fillStyle = '#0b0a0d'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < dunH; y++) for (let x = 0; x < dunW; x++){
    if (D.g[y][x]){
      const r = Math.random(), im = r < 0.08 ? DT.floor_crack : r < 0.15 ? DT.floor_moss : DT.floor;
      g.drawImage(im, x * TS, y * TS, TS + 1, TS + 1);
    } else if (y + 1 < dunH && D.g[y + 1][x]){ // 바닥 바로 위 = 벽 앞면
      g.drawImage(Math.random() < 0.18 ? DT.wall_front_moss : DT.wall_front, x * TS, y * TS, TS + 1, TS + 1);
      if (y - 1 >= 0 && !D.g[y - 1][x]) g.drawImage(DT.wall_top, x * TS, (y - 1) * TS, TS + 1, TS + 1);
    } else {
      let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (D.g[y + dy] && D.g[y + dy][x + dx]) near = true;
      if (near) g.drawImage(DT.wall_top, x * TS, y * TS, TS + 1, TS + 1);
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
  const d = A.dprops[k]; return Object.assign({ k: 'd_' + k, x: x * TS, y: y * TS, w: d.w, h: d.h, cw: d.cw || 0, cd: (d.cd || 0) * TS }, extra || {});
}
async function prepareDungeon(floor){
  dunFloor = floor; dunMaxFloor = Math.max(dunMaxFloor, floor);
  const D = genDungeon(); dunGrid = D.g;
  const paint = await paintDungeon(D);
  const props = [], dspots = [], torches = [];
  // 위층 계단(시작 방)과 아래층 계단(가장 먼 방)
  props.push(dprop('stairs_up', D.start.cx, D.start.cy - 1, { name: floor === 1 ? '위로 (성 밖으로)' : '위로 (' + (floor - 1) + '층)', kind: 'stairs_up', flat: 1 }));
  props.push(dprop('stairs_down', D.far.cx, D.far.cy, { name: '아래로 (' + (floor + 1) + '층)', kind: 'stairs_down', flat: 1 }));
  // 횃불: 벽 앞면에 띄엄띄엄
  for (let y = 1; y < dunH - 1; y++) for (let x = 1; x < dunW - 1; x++){
    if (!D.g[y][x] && D.g[y + 1][x] && (x * 7 + y * 13) % 9 === 0 && Math.random() < 0.6){
      props.push(dprop('torch', x + 0.5, y + 0.95, { flame: 1 })); torches.push({ x: (x + 0.5) * TS, y: (y + 0.4) * TS });
    }
  }
  // 방 꾸미기: 기둥·통·항아리·해골·거미줄, 상자
  const deco = ['barrel', 'jar', 'bones', 'cobweb', 'bones', 'jar'];
  D.rooms.forEach((r, i) => {
    if (r === D.start) return;
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
  const M=MAPS.dungeon,tier=dungeonTier(dunFloor),pool=DUN_MOBS[tier-1];
  const tmin=(tier-1)*10+1,within=Math.max(0,Math.min(9,(P.lv||tmin)-tmin));
  const hpK=(1+(tier-1)*.58+((dunFloor-1)%3)*.12)*(1+within*.05);
  const dmK=(1+(tier-1)*.36+((dunFloor-1)%3)*.08)*(1+within*.035);
  const add=(type,x,y,boss)=>{
    const d=MOBDEF[type],imgs=mobImageSet(type);if(!d||!imgs)return;
    const sc=boss?1.7:type==='gargoyle'||type==='orc'?1.1:type==='slime'||type==='spider'?.8:1,w=82*sc;
    const hp=Math.round(d.hp*hpK*(boss?2.3:1)),dmg=Math.round(d.dmg*dmK*(boss?1.25:1));
    monsters.push({monster:1,type,boss:!!boss,tier,mobLv:tmin+within,x,y,w,h:w,hp,maxHp:hp,sp:d.sp*(1+(tier-1)*.025)*(1+within*.003),dmg,
      ranged:d.ranged||0,range:d.range||42,skill:d.skill||'',shotStatus:d.shotStatus||'',touchStatus:d.touchStatus||'',
      skillCd:1+Math.random()*2,imgs,face:'front',flip:false,state:'wander',tx:x,ty:y,wait:Math.random()*2,cd:Math.random(),hurt:0,stun:0,dead:false,death:0});
  };
  for(const r of M.rooms){
    if(r===M.startRoom)continue;
    const n=2+Math.floor(Math.random()*3)+Math.min(3,tier-1);
    for(let i=0;i<n;i++) add(pool[Math.floor(Math.random()*pool.length)],(r.x+1+Math.random()*(r.w-2))*TS,(r.y+1.5+Math.random()*(r.h-2))*TS,false);
  }
  if(dunFloor%3===0) add('lich',M.farRoom.cx*TS,(M.farRoom.cy-1)*TS,true);
  if(Math.random()<.35){const c=M.props.find(p=>p.kind==='chest');if(c)c.mimic=1;}
}

// ---- 들어가기·층 이동 ----
async function goDungeon(floor,fromAbove){
  if(dunBusy||traveling)return false;
  dunBusy=true;
  try{
    say(floor===1?'어둡고 축축하다… 돈 냄새가 난다.':'지하 '+floor+'층');
    const m=await prepareDungeon(floor);
    // 계단 바로 위/타일 경계 대신 방 중심의 안전 바닥에서 시작.
    const pos=fromAbove===false?[(m.farRoom.cx+.5)*TS,(m.farRoom.cy+.5)*TS]:m.spawn;
    if(!travel('dungeon',pos,'front'))return false;
    await new Promise(r=>setTimeout(r,560));
    const safe=nearestSafePosition(P.x,P.y);P.x=safe[0];P.y=safe[1];
    if(window.GUILD)GUILD.onDungeonFloor(floor);
    return true;
  }finally{dunBusy=false;}
}
function enterDungeonFromOut(){closeAll();goDungeon(1);}
function enterDungeonFromHere(){goDungeon(1);}
function nextDungeonFloor(){if(!dunBusy)goDungeon(dunFloor+1);}
function previousDungeonFloor(){
  if(dunBusy)return;
  if(dunFloor<=1){dunGrid=null;travel('out',[27.3*TS,11.6*TS],'front');return;}
  goDungeon(dunFloor-1,false);
}
function openDungeonChest(spot){
  const p = spot.prop, src = spot.data || {}; if (!p || p.opened) return;
  if (src.mimic){ // 미믹!
    p.opened = 1; p.hide = 1; spots.splice(spots.indexOf(spot), 1);
    const d = MOBDEF.mimic, imgs = mobImageSet('mimic');
    if (imgs){ const tier=dungeonTier(dunFloor),hp=Math.round(d.hp*(1+(tier-1)*.58)); monsters.push({monster:1,type:'mimic',tier,x:p.x,y:p.y,w:80,h:80,hp,maxHp:hp,sp:d.sp,dmg:Math.round(d.dmg*(1+(tier-1)*.36)),ranged:0,range:42,skill:d.skill||'charge',skillCd:1,imgs,face:'front',flip:false,state:'chase',tx:p.x,ty:p.y,wait:0,cd:.6,hurt:0,stun:0,dead:false,death:0}); }
    say('상자가… 이빨이 있다?!'); return;
  }
  p.opened = 1; p.img = BI.d_chest_open || p.img; spots.splice(spots.indexOf(spot), 1);
  const gold = 15 + Math.floor(Math.random() * 20) * dunFloor;
  dropsLoot.push({ kind: 'gold', x: p.x - 12, y: p.y + 14, amount: gold, ph: 0 });
  if (Math.random() < 0.7){ const it = randomDropItem({tier:dungeonTier(dunFloor)}); if (it) dropsLoot.push({ kind:'item', x:p.x+14, y:p.y+14, item:it, ph:1 }); }
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
  go:goDungeon,tier:()=>dungeonTier(dunFloor),floorTier:dungeonTier,
  snapshotPortal:()=>({floor:dunFloor,grid:dunGrid,map:MAPS.dungeon,maxFloor:dunMaxFloor}),
  preparePortalRestore:s=>{if(!s)return false;dunFloor=s.floor||1;dunGrid=s.grid||null;MAPS.dungeon=s.map||MAPS.dungeon;dunMaxFloor=s.maxFloor||dunMaxFloor;return true;},
  state:()=>({map:MAP,floor:dunFloor,tier:dungeonTier(dunFloor),busy:dunBusy,monsters:monsters.filter(m=>!m.dead).length,chests:spots.filter(s=>s.kind==='chest').length,name:CUR.name,
    blocked:blocked(P.x,P.y),moves:[[16,0],[-16,0],[0,16],[0,-16]].filter(([dx,dy])=>!blocked(P.x+dx,P.y+dy)).length}),
  spots:()=>spots.map(s=>[s.kind,Math.round(s.x),Math.round(s.y)])
};
