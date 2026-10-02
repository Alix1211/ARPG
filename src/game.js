(function(){
'use strict';
const TS = 48;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
const $ = id => document.getElementById(id);
function load(src){ const i = new Image(); i.src = src; return i; }
const IMG = { tiles: {}, objs: {}, mons: {}, weapons: {}, ui: {}, chars: {} };
for (const k in A.tiles) IMG.tiles[k] = load(A.tiles[k]);
for (const k in A.objs) IMG.objs[k] = load(A.objs[k].src);
for (const k in A.mons) IMG.mons[k] = load(A.mons[k].src);
for (const k in A.weapons) IMG.weapons[k] = load(A.weapons[k]);
for (const k in A.ui) IMG.ui[k] = load(A.ui[k]);
for (const c in A.chars){ IMG.chars[c] = {}; for (const d in A.chars[c].frames) IMG.chars[c][d] = A.chars[c].frames[d].map(load); }
[['hpBase','orb_empty'],['hpFill','orb_red'],['mpBase','orb_empty'],['mpFill','orb_blue'],['iSkill','skill_fire'],['iDash','btn_boot'],['iAtk','btn_sword'],['coinIco','icon_coin']]
  .forEach(([id, k]) => $(id).src = A.ui[k]);
const FONT = getComputedStyle(document.documentElement).getPropertyValue('--font-ui') || 'sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ======================= 데이터 =======================
const CHARS = {
  elf:    { name: '엘프', hp: 10, mp: 12, spd: 3.9, start: 'bow',   note: '빠름 · 활로 시작' },
  hero:   { name: '검사', hp: 12, mp: 10, spd: 3.6, start: 'sword', note: '균형형 · 검으로 시작' },
  knight: { name: '기사', hp: 15, mp: 8,  spd: 3.3, start: 'spear', note: '튼튼함 · 창으로 시작' },
  dragon: { name: '용족', hp: 10, mp: 15, spd: 3.5, start: 'staff', note: '마나 많음 · 지팡이로 시작' },
};
const WT = {
  sword:    { name: '검',     base: 2.0, cd: 0.34, kind: 'arc' },
  spear:    { name: '창',     base: 2.2, cd: 0.46, kind: 'thrust' },
  gauntlet: { name: '건틀릿', base: 1.2, cd: 0.17, kind: 'punch' },
  bow:      { name: '활',     base: 1.7, cd: 0.42, kind: 'arrow' },
  staff:    { name: '지팡이', base: 2.6, cd: 0.68, kind: 'orb' },
};
const WORDER = ['sword', 'spear', 'gauntlet', 'bow', 'staff'];
const TIERN = ['나무', '낡은', '철', '강철', '기사의', '서리', '왕실', '암흑', '번개', '태양의'];
const PRICE = [0, 30, 80, 160, 280];
const wName = (t, lv) => TIERN[lv - 1] + ' ' + WT[t].name;
const wDmg = (t, lv) => Math.max(1, Math.round(WT[t].base * (1 + 0.55 * (lv - 1))));
const ORBCOL = ['#c9a36a', '#7bd36a', '#5aa8ff', '#7bd36a', '#ff7a3c', '#9fe0ff', '#c27bff', '#ffe08a', '#c27bff', '#8fc8ff'];

const MDEF = {
  slime_g:   { hp: 3,  spd: 1.3, sight: 4,   kind: 'slime', dmg: 1, r: 14, coin: 1 },
  slime_b:   { hp: 4,  spd: 1.5, sight: 4.5, kind: 'slime', dmg: 1, r: 14, coin: 1 },
  slime_r:   { hp: 9,  spd: 1.9, sight: 5,   kind: 'slime', dmg: 2, r: 14, coin: 2 },
  mush_b:    { hp: 5,  spd: 1.1, sight: 3.5, kind: 'walk',  dmg: 1, r: 14, coin: 1 },
  mush_r:    { hp: 7,  spd: 1.4, sight: 4,   kind: 'walk',  dmg: 2, r: 14, coin: 2 },
  skel:      { hp: 8,  spd: 1.5, sight: 5,   kind: 'walk',  dmg: 2, r: 13, coin: 2 },
  goblin:    { hp: 11, spd: 2.1, sight: 5.5, kind: 'walk',  dmg: 2, r: 13, coin: 3 },
  spider:    { hp: 9,  spd: 2.6, sight: 5,   kind: 'skitter', dmg: 2, r: 15, coin: 2 },
  rogue:     { hp: 13, spd: 2.4, sight: 5.5, kind: 'walk',  dmg: 3, r: 13, coin: 4, three: true },
  darkmage:  { hp: 12, spd: 1.1, sight: 6.5, kind: 'walk',  dmg: 2, r: 14, coin: 4, three: true, shoot: { cd: 2.4, n: 1, col: '#c27bff', spd: 4.2, dmg: 3 } },
  wolf:      { hp: 15, spd: 2.8, sight: 6,   kind: 'walk',  dmg: 3, r: 16, coin: 3, three: true },
  skel_sw:   { hp: 24, spd: 1.7, sight: 5,   kind: 'walk',  dmg: 4, r: 14, coin: 5 },
  skel_bow:  { hp: 18, spd: 1.2, sight: 7,   kind: 'walk',  dmg: 3, r: 13, coin: 5, shoot: { cd: 2.0, n: 1, col: '#f3e3c0', spd: 6.5, dmg: 4, arrow: true } },
  gargoyle:  { hp: 26, spd: 1.7, sight: 5.5, kind: 'fly',   dmg: 4, r: 16, coin: 6 },
  fire:      { hp: 22, spd: 1.9, sight: 5.5, kind: 'fly',   dmg: 4, r: 14, coin: 6, glow: '#ff9a3c' },
  demon:     { hp: 36, spd: 1.8, sight: 6,   kind: 'walk',  dmg: 5, r: 18, coin: 8, three: true },
  mimic:     { hp: 22, spd: 2.4, sight: 2.2, kind: 'walk',  dmg: 4, r: 16, coin: 10, mimic: true },
  slime_king:{ hp: 55,  spd: 1.0, sight: 7, kind: 'slime', dmg: 3, r: 26, coin: 30, boss: '슬라임 킹', split: true },
  orc:       { hp: 150, spd: 1.3, sight: 8, kind: 'walk',  dmg: 5, r: 24, coin: 60, boss: '오크 족장', three: true, charge: true },
  lich:      { hp: 260, spd: 0.8, sight: 9, kind: 'walk',  dmg: 5, r: 24, coin: 120, boss: '리치', three: true, shoot: { cd: 1.6, n: 5, col: '#7dffb0', spd: 3.6, dmg: 5 } },
};
const FLOORS = [
  null,
  { name: '지하 1층', pool: ['slime_g', 'slime_g', 'slime_b', 'mush_b', 'mush_r', 'skel'], boss: 'slime_king', hazard: null, rooms: 6 },
  { name: '지하 2층', pool: ['goblin', 'goblin', 'spider', 'rogue', 'darkmage', 'wolf', 'slime_r'], boss: 'orc', hazard: 'W', rooms: 7 },
  { name: '지하 3층', pool: ['skel_sw', 'skel_bow', 'gargoyle', 'fire', 'demon', 'darkmage'], boss: 'lich', hazard: 'L', rooms: 8 },
];

// ======================= 저장 =======================
const SKEY = 'arpg_test_v1';
let S = null;   // 저장 데이터
function newSave(c){
  const w = {}; w[CHARS[c].start] = 1;
  return { char: c, coins: 20, w, cur: CHARS[c].start, best: 1, bonusHp: 0, bonusMp: 0, cleared: false };
}
function readSave(){ try { const s = JSON.parse(localStorage.getItem(SKEY)); return s && s.char && CHARS[s.char] ? s : null; } catch (e) { return null; } }
function writeSave(){ try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) {} }

// ======================= 세계 =======================
let W = null;   // 현재 장소
const wallish = c => '#<>A'.includes(c);
function at(x, y){ return (!W || x < 0 || y < 0 || x >= W.w || y >= W.h) ? '#' : W.g[y][x]; }
function tileSolid(tx, ty, fly){
  const c = at(tx, ty);
  if (c === '>') return true;
  if (fly) return '#<>A'.includes(c);
  return '#<>AWOL'.includes(c);
}
function buildLook(){
  W.look = [];
  W.torches = [];
  for (let y = 0; y < W.h; y++){ const row = []; for (let x = 0; x < W.w; x++){
    const c = W.g[y][x]; let k = null;
    if (c === '#'){
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!wallish(at(x + dx, y + dy))) near = true;
      if (near){
        if (!wallish(at(x, y + 1))){ k = Math.random() < 0.25 ? 'wall_front_moss' : 'wall_front'; if (W.dungeon && (x * 7 + y * 3) % 5 === 0) W.torches.push({ x: (x + 0.5) * TS, y: (y + 0.55) * TS }); }
        else k = 'wall_top';
      }
    } else if (c === '.' || c === 'T'){ const r = Math.random(); k = r < 0.12 ? 'floor_crack' : r < 0.22 ? 'floor_moss' : 'floor'; }
    else if (c === 'g') k = (x * 13 + y * 7) % 9 === 0 ? 'grass2' : 'grass';
    else k = { p: 'path', '<': 'stairs_up', '>': 'stairs_down', A: 'door_open', O: 'pit', L: 'lava', W: 'water' }[c];
    row.push(k);
  } W.look.push(row); }
}
function addObj(name, tx, ty, opt = {}){
  const o = A.objs[name];
  const ob = Object.assign({ name, x: (tx + 0.5) * TS, y: (ty + 0.86) * TS, o }, opt);
  W.objs.push(ob); return ob;
}
function objBox(p){
  if (p.gone || p.flat || !p.o.cw) return null;
  const w = p.o.w * p.o.cw; return { l: p.x - w / 2, r: p.x + w / 2, t: p.y - p.o.ch * TS, b: p.y };
}

function buildTown(){
  const w = 26, h = 20, g = [];
  for (let y = 0; y < h; y++){ const r = []; for (let x = 0; x < w; x++) r.push('g'); g.push(r); }
  for (let y = 0; y <= 2; y++) for (let x = 9; x <= 16; x++) g[y][x] = '#';
  g[2][12] = 'A'; g[2][13] = 'A';
  for (let y = 3; y < 17; y++){ g[y][12] = 'p'; g[y][13] = 'p'; }
  for (let x = 3; x < 23; x++){ g[10][x] = 'p'; g[11][x] = 'p'; }
  W = { kind: 'town', dungeon: false, w, h, g, objs: [], mons: [], traps: [], name: '마을', start: { x: 13 * TS, y: 14.6 * TS } };
  buildLook();
  W.torches = [{ x: 10.5 * TS, y: 2.55 * TS }, { x: 15.5 * TS, y: 2.55 * TS }];
  // 가장자리 나무
  for (let x = 0; x < w; x++){
    if (x < 8 || x > 17) addObj((x % 3 ? 'spring' : 'summer') + (x % 2 ? '_tree_big' : '_tree_small'), x, 1);
    addObj((x % 3 ? 'summer' : 'spring') + (x % 2 ? '_tree_small' : '_tree_big'), x, h - 1);
  }
  for (let y = 2; y < h - 1; y++){ if (y === 10 || y === 11) continue; addObj((y % 2 ? 'spring' : 'summer') + '_tree_big', 0, y); addObj((y % 2 ? 'summer' : 'spring') + '_tree_big', w - 1, y); }
  // 상점
  W.shop = addObj('market_stall', 6, 8);
  addObj('hanging_sign', 8, 8);
  addObj('g_barrel_flower', 3, 8); addObj('g_pot_tulip', 4, 12);
  // 분수 (회복)
  W.fountain = addObj('g_fountain', 12, 10, { x: 13 * TS, y: 11.4 * TS });
  // 꽃집과 정원
  addObj('flower_shop', 19, 8);
  addObj('g_windmill', 21, 14); addObj('g_birdhouse', 17, 13); addObj('g_bench', 16, 6); addObj('g_bench', 9, 6);
  addObj('g_lantern', 11, 4); addObj('g_lantern', 14, 4); addObj('g_lantern', 11, 15); addObj('g_lantern', 14, 15);
  for (let x = 3; x <= 9; x++) addObj('g_picket', x, 16);
  for (let x = 16; x <= 22; x++) addObj('g_picket', x, 16);
  addObj('flowers', 4, 14); addObj('flowers', 8, 13); addObj('flowers', 18, 4); addObj('flowers', 21, 5); addObj('flowers', 6, 4);
  addObj('spring_bush', 3, 5); addObj('summer_bush', 22, 9); addObj('rock', 20, 17); addObj('sign', 15, 3);
  // 토끼 (구경용)
  W.critters = [{ x: 18.5 * TS, y: 13.5 * TS, wx: 0, wy: 0, t: 0, face: 1, anim: 0 }, { x: 5.5 * TS, y: 14.5 * TS, wx: 0, wy: 0, t: 1, face: -1, anim: 1 }];
  W.inter = [
    { x: W.shop.x, y: W.shop.y + 0.4 * TS, r: 2.1 * TS, label: '무기 상점 열기', act: openShop },
    { x: W.fountain.x, y: W.fountain.y + 0.2 * TS, r: 1.6 * TS, label: '분수에서 쉬기', act: rest },
  ];
}

function buildFloor(n){
  const F = FLOORS[n];
  const CW = 11, CH = 10, GX = 4, GY = 3, w = CW * GX + 1, h = CH * GY + 3;
  let path = null;
  for (let tries = 0; tries < 200 && !path; tries++){
    let cx = ri(0, GX - 1), cy = ri(0, GY - 1); const p = [[cx, cy]], seen = new Set([cx + ',' + cy]);
    while (p.length < F.rooms){
      const opts = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < GX && y < GY && !seen.has(x + ',' + y));
      if (!opts.length) break;
      [cx, cy] = pick(opts); p.push([cx, cy]); seen.add(cx + ',' + cy);
    }
    if (p.length === F.rooms) path = p;
  }
  const g = []; for (let y = 0; y < h; y++){ const r = []; for (let x = 0; x < w; x++) r.push('#'); g.push(r); }
  const inRoom = []; for (let y = 0; y < h; y++) inRoom.push(new Array(w).fill(-1));
  const rooms = path.map(([cx, cy], i) => {
    const boss = i === path.length - 1;
    const rw = boss ? 9 : ri(6, 8), rh = boss ? 7 : ri(5, 6);
    const x0 = cx * CW + 1, y0 = cy * CH + 3;
    const rx = x0 + ri(0, CW - 1 - rw), ry = y0 + ri(0, CH - 1 - rh);
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++){ g[y][x] = '.'; inRoom[y][x] = i; }
    return { x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2), boss, i };
  });
  const carve = (x, y) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++){ const xx = x + dx, yy = y + dy; if (xx > 0 && yy > 2 && xx < w - 1 && yy < h - 1 && g[yy][xx] === '#') g[yy][xx] = '.'; } };
  const link = (a, b) => {
    let x = a.cx, y = a.cy;
    while (x !== b.cx){ carve(x, y); x += Math.sign(b.cx - x); }
    while (y !== b.cy){ carve(x, y); y += Math.sign(b.cy - y); }
    carve(x, y);
  };
  for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i]);
  for (let i = 0; i < rooms.length; i++) for (let j = i + 2; j < rooms.length - 1; j++){
    const [ax, ay] = path[i], [bx, by] = path[j];
    if (Math.abs(ax - bx) + Math.abs(ay - by) === 1 && Math.random() < 0.35) link(rooms[i], rooms[j]);
  }
  // 계단: 방 윗벽에
  const putStair = (room, ch) => {
    const xs = []; for (let x = room.x + 1; x < room.x + room.w - 1; x++) xs.push(x);
    xs.sort((a, b) => Math.abs(a - room.cx) - Math.abs(b - room.cx));
    for (const x of xs){ const y = room.y - 1; if (g[y][x] === '#' && g[y - 1][x] === '#' && g[y][x - 1] === '#' && g[y][x + 1] === '#'){ g[y][x] = ch; return { x, y }; } }
    const y = room.y - 1; g[y][room.cx] = ch; return { x: room.cx, y };
  };
  const up = putStair(rooms[0], '<'), down = putStair(rooms[rooms.length - 1], '>');
  // 위험 지형
  if (F.hazard){
    rooms.slice(1, -1).forEach(r => {
      if (r.w >= 7 && r.h >= 6 && Math.random() < 0.6){
        const hx = r.cx - 1, hy = r.cy - (F.hazard === 'L' ? 0 : 1);
        for (let y = hy; y < hy + (F.hazard === 'L' ? 1 : 2); y++) for (let x = hx; x < hx + 3; x++) if (g[y][x] === '.' && inRoom[y][x] >= 0) g[y][x] = F.hazard;
      }
    });
  }
  // 함정 (복도)
  if (n >= 2) for (let y = 3; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (g[y][x] === '.' && inRoom[y][x] < 0 && Math.random() < 0.06) g[y][x] = 'T';

  W = { kind: 'dungeon', dungeon: true, floor: n, w, h, g, objs: [], mons: [], traps: [], name: F.name, rooms,
        start: { x: (up.x + 0.5) * TS, y: (up.y + 2.1) * TS }, up, down, bossDead: false, critters: [] };
  buildLook();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === 'T') W.traps.push({ tx: x, ty: y, off: (x + y) * 0.6 });
  const free = (x, y) => g[y][x] === '.' && !W.objs.some(o => Math.floor(o.x / TS) === x && Math.floor(o.y / TS) === y);
  // 소품
  rooms.forEach((r, i) => {
    const corners = [[r.x, r.y], [r.x + r.w - 1, r.y], [r.x, r.y + r.h - 1], [r.x + r.w - 1, r.y + r.h - 1]];
    corners.forEach(([x, y]) => {
      if (!free(x, y) || Math.random() < 0.35) return;
      const k = Math.random(); addObj(k < 0.55 ? 'd_jar' : 'd_barrel', x, y, k < 0.55 ? { breakable: 'jar' } : {});
    });
    if (Math.random() < 0.5){ const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1); if (free(x, y)) addObj('d_bones', x, y, { flat: true }); }
    if (r.boss) [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]].forEach(([x, y]) => { if (free(x, y)) addObj('d_pillar', x, y); });
  });
  // 상자
  const mids = rooms.slice(1, -1);
  const nChest = n === 1 ? 2 : 3;
  for (let k = 0; k < nChest && mids.length; k++){
    const r = mids.splice(Math.floor(Math.random() * mids.length), 1)[0];
    const x = r.cx + (Math.random() < 0.5 ? -2 : 2), y = r.y + 1;
    if (!free(x, y)) continue;
    if (n >= 2 && k === nChest - 1) spawn('mimic', x, y);
    else addObj('d_chest_closed', x, y, { breakable: 'chest' });
  }
  // 몬스터
  const scale = 1;
  rooms.forEach((r, i) => {
    if (i === 0) return;
    if (r.boss){
      spawn(F.boss, r.cx, r.cy);
      for (let k = 0; k < 2; k++) spawnIn(r, pick(F.pool));
      return;
    }
    const cnt = ri(2, 3) + (n >= 2 ? 1 : 0);
    for (let k = 0; k < cnt; k++) spawnIn(r, pick(F.pool));
  });
  W.inter = [];
}
function spawnIn(r, type){
  for (let t = 0; t < 30; t++){
    const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2);
    if (W.g[y][x] !== '.') continue;
    if (W.mons.some(m => Math.hypot(m.x - (x + 0.5) * TS, m.y - (y + 0.7) * TS) < TS)) continue;
    spawn(type, x, y); return;
  }
}
function spawn(type, tx, ty){
  const d = MDEF[type], x = (tx + 0.5) * TS, y = (ty + 0.7) * TS;
  const m = { type, d, x, y, hx: x, hy: y, hp: d.hp, maxHp: d.hp, state: d.mimic ? 'sleep' : 'wander', t: 0, wx: 0, wy: 0, face: 1, hitT: 0, cool: 0,
    kx: 0, ky: 0, dead: false, anim: Math.random() * 3, moving: false, mx: 0, my: 0, shootT: 1 + Math.random(), chargeT: 3, charging: 0, splits: 0 };
  W.mons.push(m); return m;
}
function sprKey(m){
  if (m.d.mimic) return m.state === 'sleep' ? 'mimic' : 'mimic_open';
  if (!m.d.three) return m.type;
  let side = 'front';
  if (m.moving && Math.abs(m.mx) > Math.abs(m.my) * 0.8) side = m.mx < 0 ? 'left' : 'right';
  return m.type + '_' + side;
}

// ======================= 충돌 =======================
function hitsR(x, y, r, fly){
  const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - 6) / TS), y1 = Math.floor((y + 4) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileSolid(tx, ty, fly)) return true;
  if (x < TS * 0.5 || y < TS * 0.5 || x > (W.w - 0.5) * TS || y > (W.h - 0.3) * TS) return true;
  if (fly) return false;
  for (const p of W.objs){ const c = objBox(p); if (c && x + r > c.l && x - r < c.r && y + 4 > c.t && y - 4 < c.b) return true; }
  return false;
}
function tryMove(e, dx, dy, r, fly){
  if (!hitsR(e.x + dx, e.y, r, fly)) e.x += dx;
  if (!hitsR(e.x, e.y + dy, r, fly)) e.y += dy;
}

// ======================= 플레이어 =======================
const P = { x: 0, y: 0, face: 1, dir: 'front', moving: false, anim: 0, hp: 10, mp: 10, inv: 0, kx: 0, ky: 0,
  atkT: -1, atkHit: false, atkCd: 0, atkAng: 0, dashT: -1, dashCd: 0, dx: 0, dy: 1, trail: [], dead: 0, skillCd: 0 };
const R = 11;
const maxHp = () => CHARS[S.char].hp + S.bonusHp;
const maxMp = () => CHARS[S.char].mp + S.bonusMp;
function dirVec(){ return P.dir === 'front' ? [0, 1] : P.dir === 'back' ? [0, -1] : [P.face, 0]; }
function faceTo(vx, vy){
  if (Math.abs(vy) > Math.abs(vx) * 1.1) P.dir = vy > 0 ? 'front' : 'back';
  else { P.dir = 'side'; P.face = vx < 0 ? -1 : 1; }
}
function nearestMon(range){
  let best = null, bd = range;
  for (const m of W.mons){ if (m.dead || (m.d.mimic && m.state === 'sleep')) continue; const d = Math.hypot(m.x - P.x, m.y - P.y); if (d < bd){ bd = d; best = m; } }
  return best;
}

// ======================= 효과 =======================
let shots = [], pshots = [], fx = [], texts = [], pickups = [];
let shake = 0, gameT = 0, paused = true;
function popText(x, y, txt, col, big){ texts.push({ x, y, txt, col, life: 1.0, big }); }
function poof(x, y, col, n = 14){
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, s = (0.6 + Math.random()) * 2.2 * TS;
    fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - TS, life: 0.5 + Math.random() * 0.3, max: 0.8, r: 3 + Math.random() * 4, col });
  }
}
let toastT = 0;
function toast(title, sub, icon){
  const el = $('toast'); el.innerHTML = '';
  if (icon){ const im = document.createElement('img'); im.src = icon; im.alt = ''; el.append(im); }
  el.append(title);
  if (sub){ const s = document.createElement('small'); s.textContent = sub; el.append(s); }
  el.hidden = false; toastT = 2.4;
}

function hurtPlayer(dmg, nx, ny){
  if (P.dead > 0 || paused) return;
  P.hp = Math.max(0, P.hp - dmg); P.inv = 1.0; P.kx = nx * 7 * TS; P.ky = ny * 7 * TS; shake = 0.25;
  popText(P.x, P.y - TS * 1.8, '-' + dmg, '#ff5a6a');
  if (P.hp <= 0){
    P.dead = 2.4; P.atkT = -1; P.dashT = -1; poof(P.x, P.y - TS * 0.8, '#ffd0d6', 18);
    const lost = Math.floor(S.coins * 0.3); S.coins -= lost; writeSave();
    toast('쓰러졌어요', lost ? '금화 ' + lost + '개를 잃고 마을로 돌아가요' : '마을로 돌아가요');
  }
}
function giveWeapon(t, lv){
  const had = S.w[t] || 0;
  if (lv <= had){ const c = 15 * lv; S.coins += c; popText(P.x, P.y - TS * 2, '금화 +' + c, '#ffd34d', true); return false; }
  S.w[t] = lv; S.cur = t; writeSave(); syncWeapon();
  toast('새 무기! ' + wName(t, lv), '공격력 ' + wDmg(t, lv), A.weapons[t + '_' + lv]);
  return true;
}
function dropCoins(x, y, n){ for (let i = 0; i < Math.min(n, 6); i++) pickups.push({ kind: 'coin', x: x + rand(-14, 14), y: y + rand(-8, 8), t: rand(0, 1), v: Math.ceil(n / Math.min(n, 6)) }); }
function hurtMon(m, dmg, crit){
  if (m.dead) return;
  if (m.d.mimic && m.state === 'sleep') m.state = 'chase';
  m.hp -= dmg; m.hitT = 0.25; if (m.state !== 'chase') m.state = 'chase';
  const dx = m.x - P.x, dy = m.y - P.y, l = Math.hypot(dx, dy) || 1, kb = m.d.boss ? 1.2 : 6;
  m.kx = dx / l * kb * TS; m.ky = dy / l * kb * TS;
  const h = A.mons[sprKey(m)].h;
  popText(m.x, m.y - h - 6, (crit ? '치명! ' : '') + dmg, crit ? '#ffd34d' : '#ffffff', crit);
  if (m.d.split && m.splits < 3 && m.hp < m.maxHp * (0.75 - m.splits * 0.25)){
    m.splits++;
    for (let k = 0; k < 2; k++){ const s = spawn(pick(['slime_g', 'slime_b']), Math.floor(m.x / TS), Math.floor(m.y / TS)); s.x += rand(-30, 30); s.state = 'chase'; tryMove(s, 0, 0, 12); }
  }
  if (m.hp <= 0){
    m.dead = true;
    poof(m.x, m.y - h * 0.45, m.d.boss ? '#ffe28a' : '#e8d6b0', m.d.boss ? 40 : 16);
    dropCoins(m.x, m.y, m.d.coin + ri(0, 2));
    if (Math.random() < 0.18) pickups.push({ kind: 'heart', x: m.x + 10, y: m.y, t: 0 });
    if (m.d.boss) bossDown(m);
    if (m.d.mimic){ const fl = W.floor; setTimeout(() => giveWeapon(pick(WORDER), Math.min(10, fl * 2 + 1)), 400); }
  }
}
function bossDown(m){
  W.bossDead = true;
  S.bonusHp += 3; S.bonusMp += 2; P.hp = maxHp(); P.mp = maxMp();
  if (W.floor < 3) S.best = Math.max(S.best, W.floor + 1); else S.cleared = true;
  writeSave();
  popText(m.x, m.y - TS * 2.4, m.d.boss + ' 처치!', '#ffe28a', true);
  const fl = W.floor;
  setTimeout(() => {
    toast(m.d.boss + ' 처치!', '최대 체력 +3 · 최대 마나 +2 · 내려가는 계단이 열렸어요');
    setTimeout(() => giveWeapon(pick(WORDER), Math.min(10, fl * 2 + 2)), 2600);
  }, 300);
}
function hitObj(p){
  if (p.gone) return;
  if (p.breakable === 'jar'){
    p.gone = true; poof(p.x, p.y - TS * 0.4, '#d08a5a', 12);
    if (Math.random() < 0.6) dropCoins(p.x, p.y, ri(1, 3) * W.floor);
    else if (Math.random() < 0.5) pickups.push({ kind: 'heart', x: p.x, y: p.y, t: 0 });
  } else if (p.breakable === 'chest'){
    p.name = 'd_chest_open'; p.o = A.objs.d_chest_open; p.breakable = null; poof(p.x, p.y - TS * 0.6, '#ffe28a', 16);
    giveWeapon(pick(WORDER), Math.min(10, W.floor * 2 + ri(0, 1)));
  }
}

// ======================= 공격 =======================
function attack(){
  if (paused || P.dead > 0 || P.atkCd > 0 || P.dashT >= 0) return;
  const t = S.cur, lv = S.w[t], T = WT[t];
  P.atkCd = T.cd; P.atkT = 0; P.atkHit = false;
  const ranged = T.kind === 'arrow' || T.kind === 'orb';
  const tgt = nearestMon(ranged ? 7 * TS : 1.8 * TS);
  let vx, vy;
  if (tgt){ vx = tgt.x - P.x; vy = (tgt.y - A.mons[sprKey(tgt)].h * 0.4) - (P.y - TS * 0.45); faceTo(vx, vy); }
  else [vx, vy] = dirVec();
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l; P.atkAng = Math.atan2(vy, vx);
  if (ranged){
    const sp = (T.kind === 'arrow' ? 9.5 : 6.2) * TS;
    pshots.push({ kind: T.kind, x: P.x + vx * 18, y: P.y - TS * 0.45 + vy * 18, vx: vx * sp, vy: vy * sp, life: 1.3, dmg: wDmg(t, lv), lv });
  }
}
function meleeHit(){
  const t = S.cur, lv = S.w[t], kind = WT[t].kind, dmg = wDmg(t, lv);
  const vx = Math.cos(P.atkAng), vy = Math.sin(P.atkAng), cy = P.y - TS * 0.45;
  const hitAt = (hx, hy, rr) => {
    for (const m of W.mons){ if (m.dead) continue; const my = m.y - A.mons[sprKey(m)].h * 0.45;
      if (Math.hypot(m.x - hx, my - hy) < rr + m.d.r * 0.7 && !m._hitNow){ m._hitNow = true; const crit = Math.random() < 0.18; hurtMon(m, crit ? dmg * 2 : dmg, crit); } }
    for (const p of W.objs){ if (!p.breakable || p.gone || p._hitNow) continue; if (Math.hypot(p.x - hx, p.y - TS * 0.35 - hy) < rr + 12){ p._hitNow = true; hitObj(p); } }
  };
  if (kind === 'arc') hitAt(P.x + vx * TS * 0.8, cy + vy * TS * 0.8, TS * 0.85);
  else if (kind === 'punch') hitAt(P.x + vx * TS * 0.6, cy + vy * TS * 0.6, TS * 0.55);
  else if (kind === 'thrust') for (let s = 0.5; s <= 1.7; s += 0.3) hitAt(P.x + vx * TS * s, cy + vy * TS * s, TS * 0.32);
  W.mons.forEach(m => m._hitNow = false); W.objs.forEach(p => p._hitNow = false);
}
function dash(){
  if (paused || P.dead > 0 || P.dashCd > 0) return;
  let vx = P.dx, vy = P.dy; if (!vx && !vy) [vx, vy] = dirVec();
  const l = Math.hypot(vx, vy) || 1; P.dashX = vx / l; P.dashY = vy / l; P.dashT = 0; P.dashCd = 0.8; P.trail = []; P.atkT = -1;
}
function skill(){
  if (paused || P.dead > 0 || P.skillCd > 0) return;
  if (P.mp < 3){ popText(P.x, P.y - TS * 1.8, '마나 부족', '#8fb8ff'); return; }
  P.mp -= 3; P.skillCd = 0.6;
  const tgt = nearestMon(7 * TS); let vx, vy;
  if (tgt){ vx = tgt.x - P.x; vy = (tgt.y - A.mons[sprKey(tgt)].h * 0.4) - (P.y - TS * 0.45); faceTo(vx, vy); } else [vx, vy] = dirVec();
  const l = Math.hypot(vx, vy) || 1;
  pshots.push({ kind: 'fire', x: P.x + vx / l * 20, y: P.y - TS * 0.45 + vy / l * 20, vx: vx / l * 7.5 * TS, vy: vy / l * 7.5 * TS, life: 1.4, dmg: 4 + (W.floor || 0) * 2 + S.bonusMp });
}
function swapWeapon(){
  if (paused) return;
  const own = WORDER.filter(t => S.w[t]);
  if (own.length < 2){ popText(P.x, P.y - TS * 1.8, '다른 무기가 없어요', '#fbefdc'); return; }
  S.cur = own[(own.indexOf(S.cur) + 1) % own.length]; writeSave(); syncWeapon();
  popText(P.x, P.y - TS * 1.8, wName(S.cur, S.w[S.cur]), '#ffe28a');
}
function syncWeapon(){
  const t = S.cur, lv = S.w[t];
  $('iWpn').src = A.weapons[t + '_' + lv]; $('wLv').textContent = lv; $('wName').textContent = WT[t].name;
}
function explode(s, rad, dmg, col){
  s.life = 0; poof(s.x, s.y, col, 14); shake = Math.max(shake, 0.1);
  for (const m of W.mons){ if (m.dead) continue; const my = m.y - A.mons[sprKey(m)].h * 0.45;
    if (Math.hypot(m.x - s.x, my - s.y) < TS * rad + m.d.r * 0.5) hurtMon(m, dmg, false); }
  for (const p of W.objs) if (p.breakable && !p.gone && Math.hypot(p.x - s.x, p.y - TS * 0.35 - s.y) < TS * rad) hitObj(p);
}

// ======================= 입력 =======================
const keys = {};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!$('veil').hidden){ if (k === 'escape') closePanel(); return; }
  if (e.repeat && ' jekqf'.includes(k)) return;
  keys[k] = true; hideHint();
  if (k === ' ' || k === 'j'){ attack(); e.preventDefault(); }
  if (k === 'shift' || k === 'k') dash();
  if (k === 'e' || k === 'l') skill();
  if (k === 'q' || k === 'tab'){ swapWeapon(); e.preventDefault(); }
  if (k === 'f' || k === 'enter') doAct();
  if (k.startsWith('arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
cv.addEventListener('pointerdown', e => { if (joy.id !== null || paused) return; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0; cv.setPointerCapture(e.pointerId); hideHint(); });
cv.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 56;
  if (d > m){ dx *= m / d; dy *= m / d; } joy.dx = dx / m; joy.dy = dy / m;
});
const endJoy = e => { if (e.pointerId === joy.id){ joy.id = null; joy.dx = joy.dy = 0; } };
cv.addEventListener('pointerup', endJoy); cv.addEventListener('pointercancel', endJoy);
function bindBtn(id, fn){
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); fn(); hideHint(); });
  const off = () => b.classList.remove('on'); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fn(); } });
}
bindBtn('bAtk', attack); bindBtn('bDash', dash); bindBtn('bSkill', skill); bindBtn('bWpn', swapWeapon);
$('act').addEventListener('click', () => doAct());
const ZOOMS = [['멀리', 0.8], ['보통', 1], ['가까이', 1.3]]; let zi = 1;
$('zoom').addEventListener('click', () => { zi = (zi + 1) % ZOOMS.length; $('zoom').textContent = '시야: ' + ZOOMS[zi][0]; });
// 전체화면 버튼
(function () {
  const b = $('fs'), el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const on = () => document.fullscreenElement || document.webkitFullscreenElement;
  if (!req) { b.hidden = true; return; }
  const sync = () => { b.textContent = on() ? '전체화면 끄기' : '전체화면'; };
  b.addEventListener('click', () => {
    try {
      if (on()) { exit.call(document); return; }
      const p = req.call(el);
      const ok = () => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
      const fail = () => { b.textContent = '이 화면에선 안 됨'; setTimeout(sync, 2000); };
      if (p && p.then) p.then(ok).catch(fail); else ok();
    } catch (e) { b.textContent = '이 화면에선 안 됨'; setTimeout(sync, 2000); }
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
})();

let hintShown = false;
function showHint(html){ const h = $('hint'); h.innerHTML = html; h.hidden = false; h.style.opacity = 1; hintShown = true; }
function hideHint(){ if (!hintShown) return; hintShown = false; setTimeout(() => { $('hint').style.opacity = 0; setTimeout(() => $('hint').hidden = true, 700); }, 3500); }

// ======================= 창 =======================
function openPanel(build){ paused = true; joy.id = null; joy.dx = joy.dy = 0; const p = $('panel'); p.innerHTML = ''; build(p); $('veil').hidden = false; const f = p.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
function closePanel(){ if (!S) return; $('veil').hidden = true; paused = false; }
function el(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function coinLine(){ const d = el('div', 'coinline'); const i = el('img'); i.src = A.ui.icon_coin; i.alt = ''; d.append(i, '금화 ' + S.coins); return d; }

function titleScreen(){
  const saved = readSave();
  openPanel(p => {
    p.append(el('h2', null, 'ARPG 테스트판'));
    p.append(el('p', null, saved ? '이어서 하거나 새 캐릭터를 고르세요.' : '함께 던전에 들어갈 캐릭터를 고르세요.'));
    if (saved){
      const r = el('div', 'pfoot'); const b = el('button', 'pbtn go', '이어하기 · ' + CHARS[saved.char].name + ' · ' + (saved.cleared ? '정복 완료' : '지하 ' + saved.best + '층까지'));
      b.type = 'button'; b.addEventListener('click', () => { S = saved; startGame(); }); r.append(b); p.append(r);
      p.append(el('p', null, '새로 시작하면 이전 기록은 지워져요.'));
    }
    const cards = el('div', 'cards');
    for (const c in CHARS){
      const b = el('button', 'card'); b.type = 'button';
      const im = el('img'); im.src = A.chars[c].frames.front[0]; im.alt = '';
      b.append(im, el('b', null, CHARS[c].name), el('span', null, '체력 ' + CHARS[c].hp + ' · 마나 ' + CHARS[c].mp), el('span', null, CHARS[c].note));
      b.addEventListener('click', () => { S = newSave(c); writeSave(); startGame(true); });
      cards.append(b);
    }
    p.append(cards);
  });
}
function openShop(){
  openPanel(p => {
    p.append(el('h2', null, '무기 상점'));
    p.append(el('p', null, '1~4등급까지 팔아요. 더 좋은 무기는 던전 보물상자와 보스에게서 얻을 수 있어요.'));
    p.append(coinLine());
    const rows = el('div', 'rows');
    WORDER.forEach(t => {
      const own = S.w[t] || 0, next = own + 1;
      const r = el('div', 'row'); const im = el('img'); im.alt = '';
      const info = el('div');
      let btn;
      if (next <= 4){
        im.src = A.weapons[t + '_' + next];
        info.append(el('b', null, wName(t, next)), el('span', null, '공격력 ' + wDmg(t, next) + (own ? ' (지금 ' + wDmg(t, own) + ')' : ' · 처음 사는 무기')));
        btn = el('button', 'pbtn', PRICE[next] + ' 금화'); btn.type = 'button'; btn.disabled = S.coins < PRICE[next];
        btn.addEventListener('click', () => { if (S.coins < PRICE[next]) return; S.coins -= PRICE[next]; S.w[t] = next; S.cur = t; writeSave(); syncWeapon(); openShop(); });
      } else {
        im.src = A.weapons[t + '_' + own];
        info.append(el('b', null, wName(t, own)), el('span', null, '상점 최고 등급을 넘었어요 · 공격력 ' + wDmg(t, own)));
        btn = el('span');
      }
      r.append(im, info, btn); rows.append(r);
    });
    p.append(rows);
    const f = el('div', 'pfoot'); const c = el('button', 'pbtn go', '닫기'); c.type = 'button'; c.addEventListener('click', closePanel); f.append(c); p.append(f);
  });
}
function openGate(){
  openPanel(p => {
    p.append(el('h2', null, '던전 입구'));
    p.append(el('p', null, S.cleared ? '모든 층을 정복했어요. 원하는 층으로 다시 들어갈 수 있어요.' : '보스를 쓰러뜨린 층의 다음 층까지 바로 내려갈 수 있어요.'));
    const rows = el('div', 'rows');
    for (let n = 1; n <= 3; n++){
      const r = el('div', 'row'); const ic = el('img'); ic.src = A.mons[[null, 'slime_king', 'orc_front', 'lich_front'][n]].src; ic.alt = '';
      const info = el('div'); info.append(el('b', null, FLOORS[n].name), el('span', null, '보스: ' + MDEF[FLOORS[n].boss].boss));
      const b = el('button', 'pbtn go', '들어가기'); b.type = 'button'; b.disabled = n > S.best;
      if (n > S.best){ b.textContent = '잠김'; b.className = 'pbtn'; }
      b.addEventListener('click', () => { closePanel(); enterFloor(n); });
      r.append(ic, info, b); rows.append(r);
    }
    p.append(rows);
    const f = el('div', 'pfoot'); const c = el('button', 'pbtn', '닫기'); c.type = 'button'; c.addEventListener('click', closePanel); f.append(c); p.append(f);
  });
}
function ending(){
  openPanel(p => {
    p.append(el('h2', null, '던전 정복!'));
    p.append(el('p', null, '지하 3층의 리치까지 쓰러뜨렸어요. 테스트판은 여기까지예요. 마을로 돌아가서 더 강한 무기를 모으거나 다시 도전할 수 있어요.'));
    p.append(coinLine());
    const f = el('div', 'pfoot'); const c = el('button', 'pbtn go', '마을로 돌아가기'); c.type = 'button'; c.addEventListener('click', () => { closePanel(); enterTown(); }); f.append(c); p.append(f);
  });
}
function rest(){ P.hp = maxHp(); P.mp = maxMp(); poof(W.fountain.x, W.fountain.y - TS, '#9fe0ff', 18); toast('체력과 마나가 모두 찼어요', null, A.ui.icon_heart); }

// ======================= 장소 이동 =======================
let fade = 0;
function resetFx(){ shots = []; pshots = []; fx = []; texts = []; pickups = []; }
function placePlayer(){ P.x = W.start.x; P.y = W.start.y; P.dir = W.dungeon ? 'front' : 'back'; P.kx = P.ky = 0; P.trail = []; P.dashT = -1; P.atkT = -1; P.lock = 0.9; }
function enterTown(){ buildTown(); resetFx(); placePlayer(); $('place').textContent = '마을'; fade = 1; writeSave(); }
function enterFloor(n){
  buildFloor(n); resetFx(); placePlayer(); $('place').textContent = FLOORS[n].name; fade = 1;
  setTimeout(() => toast(FLOORS[n].name, '보스 ' + MDEF[FLOORS[n].boss].boss + '를 쓰러뜨리면 다음 층 계단이 열려요'), 300);
}
function startGame(first){
  P.hp = maxHp(); P.mp = maxMp(); syncWeapon(); $('veil').hidden = true; paused = false; enterTown();
  if (first) showHint('왼쪽 화면을 누르고 끌면 걸어요<br>상점에서 무기를 사고, 위쪽 아치로 던전에 들어가요<br>PC: WASD 이동 · 스페이스 공격 · Shift 대시 · E 불덩이 · Q 무기 교체 · F 대화');
}

// ======================= 상호작용 =======================
let curAct = null, lastActLabel = '';
function doAct(){ if (!paused && curAct) curAct.act(); }
function checkAct(){
  curAct = null;
  if (P.dead <= 0 && W.inter) for (const it of W.inter) if (Math.hypot(P.x - it.x, P.y - it.y) < it.r){ curAct = it; break; }
  const b = $('act');
  if (curAct){ if (lastActLabel !== curAct.label){ b.textContent = curAct.label; lastActLabel = curAct.label; } b.hidden = false; }
  else { b.hidden = true; lastActLabel = ''; }
}

// ======================= 갱신 =======================
let vw = 0, vh = 0, dpr = 1;
function resize(){ dpr = Math.min(2, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight;
  cv.width = dark.width = Math.round(vw * dpr); cv.height = dark.height = Math.round(vh * dpr); }
addEventListener('resize', resize); resize();
function decay(e, dt){ if (!e.kx && !e.ky) return; const f = Math.pow(0.002, dt); e.kx *= f; e.ky *= f; if (Math.hypot(e.kx, e.ky) < 8) e.kx = e.ky = 0; }
const trapUp = (tr, t) => ((t + tr.off) % 2.4) < 1.0;
function fireAt(m, sh){
  const h = A.mons[sprKey(m)].h, sx = m.x, sy = m.y - h * 0.55;
  const base = Math.atan2(P.y - TS * 0.45 - sy, P.x - sx), spread = sh.n > 1 ? 0.28 : 0;
  for (let i = 0; i < sh.n; i++){
    const a = base + (i - (sh.n - 1) / 2) * spread;
    shots.push({ x: sx, y: sy, vx: Math.cos(a) * sh.spd * TS, vy: Math.sin(a) * sh.spd * TS, life: 3.5, col: sh.col, dmg: sh.dmg, arrow: sh.arrow });
  }
}

function update(dt){
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) $('toast').hidden = true; }
  fade = Math.max(0, fade - dt * 2.2);
  if (paused || !W) return;
  gameT += dt;
  if (P.dead > 0){ P.dead -= dt; if (P.dead <= 0){ P.hp = maxHp(); P.mp = maxMp(); P.inv = 1.5; enterTown(); } }
  const alive = P.dead <= 0;
  P.inv = Math.max(0, P.inv - dt); P.atkCd = Math.max(0, P.atkCd - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.skillCd = Math.max(0, P.skillCd - dt);
  P.mp = Math.min(maxMp(), P.mp + dt * (W.dungeon ? 0.6 : 2));
  if (!W.dungeon) P.hp = Math.min(maxHp(), P.hp + dt * 0.5);
  let ix = 0, iy = 0;
  if (keys['arrowleft'] || keys['a']) ix -= 1; if (keys['arrowright'] || keys['d']) ix += 1;
  if (keys['arrowup'] || keys['w']) iy -= 1;   if (keys['arrowdown'] || keys['s']) iy += 1;
  if (ix || iy){ const l = Math.hypot(ix, iy); ix /= l; iy /= l; } else { ix = joy.dx; iy = joy.dy; if (Math.hypot(ix, iy) < 0.18) ix = iy = 0; }
  if (!alive) ix = iy = 0;
  const mag = Math.min(1, Math.hypot(ix, iy)); P.dx = ix; P.dy = iy;
  const SPD = CHARS[S.char].spd * TS;
  if (P.dashT >= 0){
    P.dashT += dt; P.trail.push({ x: P.x, y: P.y, dir: P.dir, face: P.face }); if (P.trail.length > 6) P.trail.shift();
    tryMove(P, P.dashX * 11 * TS * dt, P.dashY * 11 * TS * dt, R);
    if (P.dashT > 0.17){ P.dashT = -1; P.inv = Math.max(P.inv, 0.15); }
    P.moving = true;
  } else {
    P.moving = mag > 0;
    if (P.moving){
      tryMove(P, ix * SPD * (P.atkT >= 0 ? 0.4 : 1) * dt, iy * SPD * (P.atkT >= 0 ? 0.4 : 1) * dt, R);
      if (P.atkT < 0) faceTo(ix, iy);
      P.anim += dt * (6 + 5 * mag);
    } else P.anim = 0;
  }
  if (P.kx || P.ky){ tryMove(P, P.kx * dt, P.ky * dt, R); decay(P, dt); }
  if (P.dashT < 0 && P.trail.length) P.trail.shift();
  if (P.atkT >= 0){
    P.atkT += dt;
    const k = WT[S.cur].kind;
    if (!P.atkHit && P.atkT > (k === 'punch' ? 0.03 : 0.06)){ P.atkHit = true; if (k === 'arc' || k === 'punch' || k === 'thrust') meleeHit(); }
    if (P.atkT > Math.min(0.26, WT[S.cur].cd)) P.atkT = -1;
  }

  // 발밑 칸
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y - 4) / TS), ahead = Math.floor((P.y - TS * 0.62) / TS);
  if (alive){
    for (const tr of W.traps) if (tr.tx === ptx && tr.ty === pty && trapUp(tr, gameT) && P.inv <= 0 && P.dashT < 0) hurtPlayer(W.floor, 0, 0.5);
    const c = at(ptx, ahead);
    P.lock = Math.max(0, (P.lock || 0) - dt);
    if (P.dy < -0.3 && P.lock <= 0){
      if (c === 'A'){ joy.id = null; joy.dx = joy.dy = 0; keys['w'] = keys['arrowup'] = false; P.y += TS * 0.3; openGate(); }
      else if (c === '<'){ enterTown(); toast('마을로 돌아왔어요'); }
      else if (c === '>'){
        if (W.bossDead){ if (W.floor < 3) enterFloor(W.floor + 1); else ending(); }
        else if (toastT <= 0) toast('계단이 막혀 있어요', MDEF[FLOORS[W.floor].boss].boss + '를 쓰러뜨리면 열려요');
      }
    }
  }
  if (!W) return;
  checkAct();
  // 줍기
  for (const pk of pickups){
    pk.t += dt;
    if (pk.got || !alive) continue;
    const d = Math.hypot(pk.x - P.x, pk.y - P.y);
    if (pk.kind === 'coin' && d < TS * 2.2){ pk.x += (P.x - pk.x) * Math.min(1, dt * 6); pk.y += (P.y - pk.y) * Math.min(1, dt * 6); }
    if (d < TS * 0.55){
      pk.got = true;
      if (pk.kind === 'coin'){ S.coins += pk.v; }
      else { const v = 2 + W.floor; P.hp = Math.min(maxHp(), P.hp + v); popText(P.x, P.y - TS * 1.8, '+' + v, '#ff8fa0'); }
    }
  }
  pickups = pickups.filter(p => !p.got);
  // 내 투사체
  for (const s of pshots){
    if (s.life <= 0) continue;
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind === 'fire' || s.kind === 'orb') fx.push({ x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.25, max: 0.25, r: rand(2, 5), col: s.kind === 'fire' ? (Math.random() < .5 ? '#ffcf5a' : '#ff6a2a') : ORBCOL[s.lv - 1] });
    const wallHit = tileSolid(Math.floor(s.x / TS), Math.floor(s.y / TS), true);
    let hit = null;
    for (const m of W.mons){ if (m.dead || (m.d.mimic && m.state === 'sleep' && s.kind === 'arrow')) continue; const my = m.y - A.mons[sprKey(m)].h * 0.45; if (Math.hypot(m.x - s.x, my - s.y) < m.d.r + 10){ hit = m; break; } }
    if (!hit && s.kind !== 'fire') for (const p of W.objs) if (p.breakable && !p.gone && Math.hypot(p.x - s.x, p.y - TS * 0.35 - s.y) < 20){ hitObj(p); s.life = 0; break; }
    if (s.life <= 0 && !hit && !wallHit){ if (s.kind === 'fire') explode(s, 1.0, s.dmg, '#ff9a3c'); continue; }
    if (hit || wallHit){
      if (s.kind === 'fire') explode(s, 1.0, s.dmg, '#ff9a3c');
      else if (s.kind === 'orb') explode(s, 0.85, s.dmg, ORBCOL[s.lv - 1]);
      else { s.life = 0; if (hit){ const crit = Math.random() < 0.18; hurtMon(hit, crit ? s.dmg * 2 : s.dmg, crit); } else poof(s.x, s.y, '#d8c8a0', 4); }
    }
  }
  pshots = pshots.filter(s => s.life > 0);

  // 몬스터
  for (const m of W.mons){
    if (m.dead) continue;
    m.anim += dt; if (m.hitT > 0) m.hitT -= dt;
    const fly = m.d.kind === 'fly';
    if (m.kx || m.ky){ tryMove(m, m.kx * dt, m.ky * dt, Math.min(m.d.r, 15), fly); decay(m, dt); }
    const dx = P.x - m.x, dy = P.y - m.y, dist = Math.hypot(dx, dy) || 1;
    if (m.state === 'sleep'){ if (alive && dist < m.d.sight * TS){ m.state = 'chase'; popText(m.x, m.y - TS * 1.3, '!', '#ff5a6a', true); } m.moving = false; continue; }
    if (m.state === 'chase'){ if (!alive || dist > (m.d.sight + 4) * TS) m.state = 'return'; }
    else if (alive && dist < m.d.sight * TS) m.state = 'chase';
    let mx = 0, my = 0, sp = m.d.spd * TS;
    if (m.state === 'chase'){
      mx = dx / dist; my = dy / dist;
      if (m.d.shoot && dist < 3 * TS && !m.d.boss){ mx = -mx; my = -my; }
      if (m.d.shoot){ m.shootT -= dt; if (m.shootT <= 0 && dist < m.d.sight * TS){ fireAt(m, m.d.shoot); m.shootT = m.d.shoot.cd; } }
      if (m.d.charge){
        m.chargeT -= dt;
        if (m.charging > 0){ m.charging -= dt; sp *= 3.2; mx = m.cx; my = m.cy; }
        else if (m.chargeT <= 0 && dist < 6 * TS){ m.charging = 0.55; m.chargeT = 3.2; m.cx = mx; m.cy = my; popText(m.x, m.y - TS * 2.4, '돌진!', '#ff8a5a', true); }
      }
    } else if (m.state === 'return'){
      const hx = m.hx - m.x, hy = m.hy - m.y, h = Math.hypot(hx, hy);
      if (h < TS * 0.5) m.state = 'wander'; else { mx = hx / h; my = hy / h; }
    } else {
      m.t -= dt;
      if (m.t <= 0){ if (Math.random() < 0.45){ m.wx = m.wy = 0; } else { const a = Math.random() * Math.PI * 2; m.wx = Math.cos(a); m.wy = Math.sin(a); } m.t = rand(0.8, 2.4); }
      mx = m.wx; my = m.wy; sp *= 0.45;
    }
    if (m.hitT > 0 || m.cool > 0) sp = 0;
    if (m.cool > 0) m.cool -= dt;
    if (m.d.kind === 'slime'){ const ph = (m.anim * 1.6) % 1; sp = ph < 0.55 ? sp * 1.6 : 0; }
    m.mx = mx; m.my = my;
    if ((mx || my) && sp > 0){ tryMove(m, mx * sp * dt, my * sp * dt, Math.min(m.d.r, 15), fly); if (Math.abs(mx) > 0.15) m.face = mx < 0 ? -1 : 1; m.moving = true; }
    else m.moving = false;
    if (alive && P.inv <= 0 && P.dashT < 0 && dist < m.d.r + R + 6){ hurtPlayer(m.d.dmg, dx / dist, dy / dist); m.cool = 0.9; m.charging = 0; }
  }
  for (let i = 0; i < W.mons.length; i++) for (let j = i + 1; j < W.mons.length; j++){
    const a = W.mons[i], b = W.mons[j]; if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.d.r + b.d.r;
    if (d > 0 && d < min){ const p = (min - d) / 2 / d; tryMove(a, -dx * p, -dy * p, 12, a.d.kind === 'fly'); tryMove(b, dx * p, dy * p, 12, b.d.kind === 'fly'); }
  }
  // 적 투사체
  for (const s of shots){
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (tileSolid(Math.floor(s.x / TS), Math.floor(s.y / TS), true)){ s.life = 0; poof(s.x, s.y, s.col, 5); continue; }
    if (alive && P.inv <= 0 && P.dashT < 0 && Math.hypot(s.x - P.x, s.y - (P.y - TS * 0.45)) < 16){
      const l = Math.hypot(s.vx, s.vy) || 1; hurtPlayer(s.dmg, s.vx / l, s.vy / l); s.life = 0; poof(s.x, s.y, s.col, 8);
    }
  }
  shots = shots.filter(s => s.life > 0);
  // 마을 토끼
  for (const c of (W.critters || [])){
    c.t -= dt; c.anim += dt;
    if (c.t <= 0){ if (Math.random() < 0.5){ c.wx = c.wy = 0; } else { const a = Math.random() * Math.PI * 2; c.wx = Math.cos(a); c.wy = Math.sin(a); } c.t = rand(1, 3); }
    if (c.wx || c.wy){ tryMove(c, c.wx * TS * 1.2 * dt, c.wy * TS * 1.2 * dt, 12); if (Math.abs(c.wx) > 0.2) c.face = c.wx < 0 ? -1 : 1; }
  }
  for (const f of fx){ f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 6 * TS * dt; }
  fx = fx.filter(f => f.life > 0);
  for (const t of texts){ t.life -= dt; t.y -= TS * 1.0 * dt; }
  texts = texts.filter(t => t.life > 0);
  shake = Math.max(0, shake - dt);
}

// ======================= 그리기 =======================
function drawChar(x, y, dir, face, frameNo, alpha){
  const C = A.chars[S.char], im = IMG.chars[S.char][dir][frameNo];
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  if (dir === 'side') ctx.scale(face, 1);
  if (im.complete) ctx.drawImage(im, -C.w / 2, -C.h + 5, C.w, C.h);
  ctx.restore();
}
function drawWeaponIcon(key, x, y, ang, size, alpha = 1){
  const im = IMG.weapons[key]; if (!im || !im.complete || !im.naturalWidth) return;
  const s = size / Math.max(im.naturalWidth, im.naturalHeight);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2);
  ctx.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s * 0.85, im.naturalWidth * s, im.naturalHeight * s);
  ctx.restore();
}
function drawAttack(){
  if (P.atkT < 0) return;
  const t = S.cur, lv = S.w[t], kind = WT[t].kind, key = t + '_' + lv;
  const cx = P.x, cy = P.y - TS * 0.45, base = P.atkAng;
  if (kind === 'arc'){
    const p = Math.min(1, P.atkT / 0.14), a = base - 1.2 + 2.4 * p;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = 1 - Math.max(0, (P.atkT - 0.14) / 0.1);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, TS * 0.95, base - 1.2, a); ctx.stroke(); ctx.restore();
    drawWeaponIcon(key, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, a, TS * 1.05);
  } else if (kind === 'thrust'){
    const p = Math.sin(Math.min(1, P.atkT / 0.22) * Math.PI);
    drawWeaponIcon(key, cx + Math.cos(base) * (10 + p * TS * 0.9), cy + Math.sin(base) * (10 + p * TS * 0.9), base, TS * 1.4);
    if (p > 0.6){ ctx.save(); ctx.globalAlpha = p - 0.4; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(base) * TS * 0.6, cy + Math.sin(base) * TS * 0.6); ctx.lineTo(cx + Math.cos(base) * TS * 1.8, cy + Math.sin(base) * TS * 1.8); ctx.stroke(); ctx.restore(); }
  } else if (kind === 'punch'){
    const p = Math.sin(Math.min(1, P.atkT / 0.14) * Math.PI);
    drawWeaponIcon(key, cx + Math.cos(base) * (8 + p * TS * 0.55), cy + Math.sin(base) * (8 + p * TS * 0.55) + 8, base, TS * 0.7);
    if (p > 0.7){ ctx.save(); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; const hx = cx + Math.cos(base) * TS * 0.95, hy = cy + Math.sin(base) * TS * 0.95;
      for (let i = 0; i < 5; i++){ const a = i * 1.25 + gameT * 9; ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6); ctx.lineTo(hx + Math.cos(a) * 13, hy + Math.sin(a) * 13); ctx.stroke(); } ctx.restore(); }
  } else {
    const p = Math.min(1, P.atkT / 0.2);
    drawWeaponIcon(key, cx + Math.cos(base) * 14, cy + Math.sin(base) * 14, kind === 'arrow' ? base - Math.PI / 2 : base, TS * 1.0, 1 - p * 0.3);
  }
}
function drawMon(m){
  const d = m.d, key = sprKey(m), S2 = A.mons[key], im = IMG.mons[key];
  let sx = 1, sy = 1, lift = 0, rot = 0;
  if (d.kind === 'slime'){
    const ph = (m.anim * 1.6) % 1;
    if (ph < 0.55){ const k = Math.sin(ph / 0.55 * Math.PI); lift = k * (d.boss ? 16 : 9); sy = 1 + 0.08 * k; sx = 1 - 0.06 * k; }
    else { const k = Math.sin((ph - 0.55) / 0.45 * Math.PI); sy = 1 - 0.12 * k; sx = 1 + 0.12 * k; }
  } else if (d.kind === 'fly'){ lift = 10 + Math.sin(m.anim * 3) * 5; }
  else if (m.moving){ const sp = d.kind === 'skitter' ? 22 : 11; lift = Math.abs(Math.sin(m.anim * sp)) * 3; rot = Math.sin(m.anim * sp) * 0.05; }
  else sy = 1 + Math.sin(m.anim * 2.4) * 0.02;
  if (m.charging > 0) rot = Math.sin(m.anim * 40) * 0.08;
  ctx.fillStyle = 'rgba(0,0,0,.33)';
  ctx.beginPath(); ctx.ellipse(m.x, m.y, S2.w * 0.34, S2.w * 0.11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  if (m.hitT > 0 && Math.floor(m.hitT * 30) % 2) ctx.globalAlpha = 0.35;
  ctx.translate(m.x, m.y - lift); ctx.rotate(rot);
  ctx.scale(sx * (d.three ? 1 : (m.face < 0 ? -1 : 1)), sy);
  if (im.complete) ctx.drawImage(im, -S2.w / 2, -S2.h, S2.w, S2.h);
  ctx.restore();
  if (d.boss){
    const w = 96, y = m.y - S2.h - lift - 14;
    ctx.fillStyle = 'rgba(20,16,14,.8)'; ctx.fillRect(m.x - w / 2 - 2, y - 2, w + 4, 9);
    ctx.fillStyle = '#ffb340'; ctx.fillRect(m.x - w / 2, y, w * Math.max(0, m.hp) / m.maxHp, 5);
    ctx.font = '13px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,14,10,.9)';
    ctx.strokeText(d.boss, m.x, y - 5); ctx.fillStyle = '#ffe28a'; ctx.fillText(d.boss, m.x, y - 5);
  } else if (m.hp < m.maxHp){
    const w = 36, y = m.y - S2.h - lift - 8;
    ctx.fillStyle = 'rgba(20,16,14,.75)'; ctx.fillRect(m.x - w / 2 - 1, y - 1, w + 2, 7);
    ctx.fillStyle = '#ff6b7a'; ctx.fillRect(m.x - w / 2, y, w * Math.max(0, m.hp) / m.maxHp, 5);
  }
}
function drawObj(ob){
  const o = ob.o, im = IMG.objs[ob.name]; if (!im.complete) return;
  let a = 1;
  if (ob.y > P.y && o.h > TS * 1.2){
    const C = A.chars[S.char];
    const l = ob.x - o.w / 2, r = ob.x + o.w / 2, tp = ob.y - o.h;
    if (P.x + C.w * 0.3 > l + 6 && P.x - C.w * 0.3 < r - 6 && P.y - C.h < ob.y - TS * 0.4 && P.y > tp) a = 0.5;
  }
  ctx.globalAlpha = a; ctx.drawImage(im, ob.x - o.w / 2, ob.y - o.h + 4, o.w, o.h); ctx.globalAlpha = 1;
}
function draw(t){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = W && !W.dungeon ? '#3f6e2c' : '#120f0d'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!W || !S) return;
  const z = Math.max(0.9, Math.min(1.7, Math.min(vw, vh) / (8.5 * TS))) * ZOOMS[zi][1];
  ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0); ctx.imageSmoothingQuality = 'high';
  const sw = vw / z, sh = vh / z;
  let cx = P.x - sw / 2, cy = P.y - TS * 0.8 - sh / 2;
  cx = Math.max(0, Math.min(W.w * TS - sw, cx)); cy = Math.max(0, Math.min(W.h * TS - sh, cy));
  if (sw > W.w * TS) cx = (W.w * TS - sw) / 2; if (sh > W.h * TS) cy = (W.h * TS - sh) / 2;
  if (shake > 0){ cx += (Math.random() - 0.5) * 10 * shake / 0.25; cy += (Math.random() - 0.5) * 10 * shake / 0.25; }
  const ox = Math.round(cx * z) / z, oy = Math.round(cy * z) / z;
  ctx.translate(-ox, -oy);
  const x0 = Math.max(0, Math.floor(cx / TS)), x1 = Math.min(W.w - 1, Math.floor((cx + sw) / TS));
  const y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(W.h - 1, Math.floor((cy + sh) / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    const k = W.look[y][x]; if (!k) continue;
    const im = IMG.tiles[k]; if (im.complete) ctx.drawImage(im, x * TS, y * TS, TS + 0.6, TS + 0.6);
  }
  // 바닥 것들
  for (const ob of W.objs) if (ob.flat && !ob.gone){ const o = ob.o, im = IMG.objs[ob.name]; if (im.complete) ctx.drawImage(im, ob.x - o.w / 2, ob.y - o.h * 0.8, o.w, o.h); }
  for (const tr of W.traps){ const k = trapUp(tr, gameT) ? 'd_spike_up' : 'd_spike_down', o = A.objs[k], im = IMG.objs[k]; if (im.complete) ctx.drawImage(im, tr.tx * TS + (TS - o.w) / 2, tr.ty * TS + (TS - o.h) / 2, o.w, o.h); }
  for (const tc of W.torches){ const o = A.objs.d_torch, im = IMG.objs.d_torch; if (im.complete) ctx.drawImage(im, tc.x - o.w / 2, tc.y - o.h * 0.75, o.w, o.h); }
  if (W.dungeon && !W.bossDead){ const x = (W.down.x + 0.5) * TS, y = (W.down.y + 0.5) * TS; ctx.fillStyle = 'rgba(10,6,8,.55)'; ctx.fillRect(x - TS / 2 + 6, y - TS / 2 + 10, TS - 12, TS - 12); }
  for (const pk of pickups){
    const by = pk.y - 8 - Math.abs(Math.sin(pk.t * 5)) * 4;
    const im = IMG.ui[pk.kind === 'coin' ? 'icon_coin' : 'icon_heart'], s = pk.kind === 'coin' ? 16 : 20;
    if (im.complete) ctx.drawImage(im, pk.x - s / 2, by - s / 2, s, s);
  }
  // 세워진 것들 (발 위치 순서)
  const list = [];
  const inView = (x, y, w, h) => !(x + w < cx || x - w > cx + sw || y - h > cy + sh || y > cy + sh + h);
  for (const ob of W.objs) if (!ob.flat && !ob.gone && inView(ob.x, ob.y, ob.o.w, ob.o.h)) list.push({ y: ob.y, ob });
  for (const m of W.mons) if (!m.dead && inView(m.x, m.y, 80, 140)) list.push({ y: m.y, m });
  for (const c of (W.critters || [])) list.push({ y: c.y, c });
  list.push({ y: P.y, me: true });
  list.sort((a, b) => a.y - b.y);
  const frameNo = P.moving && P.dashT < 0 ? 1 + (Math.floor(P.anim) % 4) : (P.dashT >= 0 ? 2 : 0);
  const bob = P.moving ? 0 : Math.sin(t * 2.2) * 1.2;
  for (const it of list){
    if (it.me){
      if (P.dead > 0){ drawChar(P.x, P.y, 'front', 1, 0, Math.max(0, P.dead - 1.4)); continue; }
      ctx.fillStyle = 'rgba(0,0,0,.33)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
      P.trail.forEach((g, i) => drawChar(g.x, g.y, g.dir, g.face, 2, 0.12 + i * 0.04));
      const behind = P.atkT >= 0 && Math.sin(P.atkAng) < -0.3;
      if (behind) drawAttack();
      drawChar(P.x, P.y - bob, P.dir, P.face, frameNo, P.inv > 0 && Math.floor(P.inv * 16) % 2 ? 0.35 : 1);
      if (!behind) drawAttack();
    } else if (it.m) drawMon(it.m);
    else if (it.c){
      const c = it.c, o = A.objs.g_rabbit, im = IMG.objs.g_rabbit, hop = (c.wx || c.wy) ? Math.abs(Math.sin(c.anim * 9)) * 6 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(c.x, c.y - hop); ctx.scale(c.face, 1); if (im.complete) ctx.drawImage(im, -o.w / 2, -o.h, o.w, o.h); ctx.restore();
    } else drawObj(it.ob);
  }
  // 투사체
  for (const s of pshots){
    if (s.kind === 'arrow'){
      const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = '#e6e6ee'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.fill();
      ctx.fillStyle = '#f3e3c0'; ctx.fillRect(-20, -3, 5, 6); ctx.restore();
    } else {
      const col = s.kind === 'fire' ? '#ff7a2a' : ORBCOL[s.lv - 1];
      ctx.fillStyle = col; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(s.x, s.y, s.kind === 'fire' ? 14 : 11, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(s.x, s.y, s.kind === 'fire' ? 6.5 : 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const s of shots){
    if (s.arrow){
      const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.strokeStyle = '#d8c8a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(8, 0); ctx.stroke(); ctx.restore();
    } else {
      ctx.fillStyle = s.col; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const f of fx){ ctx.globalAlpha = Math.max(0, f.life / f.max); ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 던전 어둠
  if (W.dungeon){
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.globalCompositeOperation = 'source-over'; dctx.fillStyle = 'rgba(8,5,12,0.8)'; dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    const k = dpr * z;
    const light = (wx, wy, r, a) => {
      const sx = (wx - ox) * k, sy = (wy - oy) * k, rr = r * TS * k;
      if (sx < -rr || sy < -rr || sx > dark.width + rr || sy > dark.height + rr) return;
      const g = dctx.createRadialGradient(sx, sy, 0, sx, sy, rr);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.6 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g; dctx.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    };
    light(P.x, P.y - TS * 0.5, 4.8, 1);
    for (const tc of W.torches) light(tc.x, tc.y - 10, 2.3 + Math.sin(t * 9 + tc.x) * 0.08, 0.85);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (W.g[y][x] === 'L') light((x + 0.5) * TS, (y + 0.5) * TS, 1.4, 0.6);
    for (const s of shots) light(s.x, s.y, 1.0, 0.7);
    for (const s of pshots) light(s.x, s.y, s.kind === 'arrow' ? 0.8 : 1.6, 0.85);
    for (const m of W.mons) if (!m.dead && (m.d.shoot || m.d.glow || m.d.boss)) light(m.x, m.y - TS * 0.7, m.d.boss ? 2.2 : 1.3, 0.55);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dark, 0, 0);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0); ctx.translate(-ox, -oy);
  }
  ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,14,10,.9)';
  for (const tx of texts){
    ctx.globalAlpha = Math.min(1, tx.life / 0.4); ctx.font = (tx.big ? '19px ' : '16px ') + FONT;
    ctx.strokeText(tx.txt, tx.x, tx.y); ctx.fillStyle = tx.col; ctx.fillText(tx.txt, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (joy.id !== null){
    const ring = IMG.ui.joystick_ring, knob = IMG.ui.joystick_knob, R0 = 66;
    ctx.globalAlpha = 0.75; if (ring.complete) ctx.drawImage(ring, joy.ox - R0, joy.oy - R0 * 0.97, R0 * 2, R0 * 1.94);
    ctx.globalAlpha = 0.95; if (knob.complete) ctx.drawImage(knob, joy.ox + joy.dx * 44 - 30, joy.oy + joy.dy * 44 - 30, 60, 60);
    ctx.globalAlpha = 1;
  }
  if (fade > 0){ ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, vw, vh); }
}

// ======================= HUD =======================
const orbClip = f => 'inset(' + (16 + (1 - f) * 70).toFixed(1) + '% 0 0 0)';
let lastCoins = -1;
function hud(){
  if (!S) return;
  const hf = P.hp / maxHp(), mf = P.mp / maxMp();
  $('hpFill').style.clipPath = hf >= 1 ? 'none' : orbClip(hf); $('mpFill').style.clipPath = mf >= 0.999 ? 'none' : orbClip(mf);
  $('hpTxt').textContent = P.hp; $('mpTxt').textContent = Math.floor(P.mp);
  $('cdSkill').style.setProperty('--cd', (P.skillCd / 0.6).toFixed(3)); $('cdDash').style.setProperty('--cd', (P.dashCd / 0.8).toFixed(3));
  $('cdAtk').style.setProperty('--cd', (P.atkCd / WT[S.cur].cd).toFixed(3));
  $('bSkill').classList.toggle('nomp', P.mp < 3);
  if (S.coins !== lastCoins){ $('coins').textContent = S.coins; lastCoins = S.coins; }
}
let last = performance.now();
function loop(now){ const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(now / 1000); hud(); requestAnimationFrame(loop); }
window.__G = { get P(){ return P; }, get W(){ return W; }, get S(){ return S; }, enterFloor, enterTown, giveWeapon };
titleScreen();
requestAnimationFrame(loop);
})();
