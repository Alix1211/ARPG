(function(){
'use strict';
const TS = 48;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const dark = document.createElement('canvas'), dctx = dark.getContext('2d');
const $ = id => document.getElementById(id);
function load(src){ const i = new Image(); i.src = src; return i; }
const IMG = { tiles: {}, objs: {}, mons: {}, weapons: {}, ui: {}, chars: {}, ic: {} };
for (const k in A.tiles) IMG.tiles[k] = load(A.tiles[k]);
for (const k in A.objs) IMG.objs[k] = load(A.objs[k].src);
for (const k in A.mons) IMG.mons[k] = load(A.mons[k].src);
for (const k in A.weapons) IMG.weapons[k] = load(A.weapons[k]);
for (const k in A.weapons) IMG.ic[k] = IMG.weapons[k];
for (const k in A.icons) IMG.ic[k] = load(A.icons[k]);
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

// ---- 진행도 · 티어 · 길드 등급 (docs/progression.md, docs/guild_system.md) ----
const NF = 15, FPT = 3;                                       // 시험판은 지하 15층, 티어당 3층
const progOf = n => (n - 0.5) * 100 / NF;                     // 층 → 진행도(%)
const tierOf = n => Math.min(5, Math.floor(progOf(n) / 20) + 1);
const BMUL = [1.6, 3.4, 5.8, 9.0, 13.5, 19];                  // 티어 구간의 시작·끝 기본 배율
const bmulAt = p => { const t = Math.max(0, Math.min(4, Math.floor(p / 20))), s = Math.max(0, Math.min(1, (p - t * 20) / 20)); return BMUL[t] + (BMUL[t + 1] - BMUL[t]) * s; };
const bm = n => bmulAt(progOf(n));
const RANKN = ['견습', '동', '은', '금', '백금'];
const RANKFEE = [0, 300, 1200, 5000, 20000];                  // 승급 응시료 (가안)
const RARN = ['일반', '마법', '희귀', '전설'];
const RARCOL = ['#e8e4dc', '#5aa8ff', '#ffd34d', '#ff8a2a'];   // 어두운 칸 테두리용
const RARTXT = ['#6b5b45', '#2f6fb8', '#a8780a', '#c4580a'];   // 양피지 위 글자용
const SLOTS = ['weapon', 'head', 'body', 'hands', 'feet', 'ring', 'neck'];
const SLOTN = { weapon: '무기', head: '투구', body: '갑옷', hands: '장갑', feet: '신발', ring: '반지', neck: '목걸이' };
const SLOTW = [22, 12, 12, 12, 12, 15, 15];
const SBASE = { head: { def: 1.0, hp: 1.2, mp: 0.8 }, body: { def: 2.0, hp: 2.0 }, hands: { def: 0.6, hp: 0.4 }, feet: { def: 0.6, hp: 0.8 },
                ring: { flat: 0.3 }, neck: { hp: 1.2, mp: 1.0 } };
const GRADEN = ['나무', '낡은', '철', '강철', '기사의', '서리', '왕실', '암흑', '번개', '태양의'];
const ACCN = ['구리', '은', '금', '보석', '별빛'];
const BAGCAP = 40;
let itemSeq = 1;

// 임시 가안: 속성·저항·스킬 체계가 정해지기 전이라 속성 없는 옵션만 둔다.
// 접두어(P)는 공격 쪽, 접미어(S)는 방어·유틸 쪽. pct는 [티어1 하한, 티어1 상한, 티어5 하한, 티어5 상한], flat은 [하한, 상한]×기본 배율
const AFX = [
  { id: 'sharp',  k: 'P', nm: '날카로운', st: 'crit',    t: 'pct',  r: [3, 6, 9, 15],    sl: ['weapon', 'hands', 'ring', 'neck', 'head'] },
  { id: 'mighty', k: 'P', nm: '강력한',   st: 'atkPct',  t: 'pct',  r: [6, 12, 20, 32],  sl: ['weapon', 'hands', 'ring'] },
  { id: 'heavy',  k: 'P', nm: '묵직한',   st: 'extra',   t: 'flat', r: [0.35, 0.8],      sl: ['weapon', 'ring', 'neck'] },
  { id: 'swift',  k: 'P', nm: '재빠른',   st: 'as',      t: 'pct',  r: [5, 9, 14, 22],   sl: ['weapon', 'hands', 'ring'] },
  { id: 'fierce', k: 'P', nm: '흉포한',   st: 'critDmg', t: 'pct',  r: [10, 20, 32, 52], sl: ['weapon', 'neck', 'ring'] },
  { id: 'arcane', k: 'P', nm: '마력의',   st: 'skill',   t: 'pct',  r: [8, 15, 26, 46],  sl: ['weapon', 'neck', 'head'] },
  { id: 'sturdy', k: 'P', nm: '견고한',   st: 'def',     t: 'flat', r: [0.5, 1.1],       sl: ['head', 'body', 'hands', 'feet'] },
  { id: 'bear',   k: 'S', nm: '곰의',     st: 'hp',      t: 'flat', r: [0.9, 1.8],       sl: ['head', 'body', 'hands', 'feet', 'neck', 'ring'] },
  { id: 'turtle', k: 'S', nm: '거북의',   st: 'def',     t: 'flat', r: [0.5, 1.0],       sl: ['head', 'body', 'hands', 'feet', 'neck', 'ring'] },
  { id: 'fox',    k: 'S', nm: '여우의',   st: 'ms',      t: 'pct',  r: [4, 7, 10, 16],   sl: ['feet', 'body', 'neck', 'ring'] },
  { id: 'sage',   k: 'S', nm: '현자의',   st: 'mp',      t: 'flat', r: [0.5, 1.0],       sl: ['head', 'neck', 'ring'] },
  { id: 'spring', k: 'S', nm: '샘의',     st: 'mpRegen', t: 'pct',  r: [10, 20, 40, 70], sl: ['head', 'neck', 'ring'] },
  { id: 'gold',   k: 'S', nm: '황금의',   st: 'coin',    t: 'pct',  r: [8, 15, 25, 40],  sl: SLOTS },
  { id: 'seek',   k: 'S', nm: '보물꾼의', st: 'find',    t: 'pct',  r: [5, 10, 18, 30],  sl: SLOTS },
  // 흥정 계열은 이름만 정해진 상태라 효과는 하나('흥정')로 묶었다. 승급 응시료에만 반만 적용된다.
  { id: 'haggle', k: 'S', nm: '협상가의', alt: ['협상가의', '배짱의', '철면피의', '선불꾼의'], st: 'haggle', t: 'pct', r: [4, 8, 15, 25], sl: ['ring', 'neck'] },
];
const AFX_BY = {}; AFX.forEach(a => AFX_BY[a.id] = a);
const STATN = { crit: '치명타 확률', atkPct: '공격력', extra: '추가 피해', as: '공격 속도', critDmg: '치명타 피해', skill: '불덩이 피해', def: '방어', hp: '최대 체력',
                ms: '이동 속도', mp: '최대 마나', mpRegen: '마나 회복', coin: '금화 획득', find: '아이템 발견', haggle: '흥정' };
const UNIQ = {
  thunder: { nm: '뇌명의',     d: '공격할 때 25% 확률로 번개가 가까운 적 둘에게 튄다' },
  gold:    { nm: '황금손의',   d: '몬스터를 쓰러뜨리면 금화가 두 배로 떨어진다' },
  miser:   { nm: '자린고비의', d: '떨어진 하트를 주우면 회복량이 세 배' },
  phoenix: { nm: '불사조의',   d: '쓰러질 때 체력 절반으로 부활한다 (층마다 한 번)' },
};
const lerp = (a, b, t) => a + (b - a) * t;
const r1 = v => Math.round(v * 10) / 10;
const fnum = v => (Math.abs(v) >= 10 ? Math.round(v) : r1(v)).toString();
const affText = a => STATN[a.st] + ' +' + fnum(a.v) + (AFX_BY[a.id].t === 'pct' ? '%' : '');

function pickWeighted(w){ let t = 0; for (const x of w) t += x; let r = Math.random() * t; for (let i = 0; i < w.length; i++){ r -= w[i]; if (r < 0) return i; } return w.length - 1; }
function rarWeights(p, find, min){
  const f = 1 + find / 100, lg = p >= 60 ? 1 + (p - 60) / 40 * 3 : 0;       // 전설은 진행도 60% 이후부터
  const w = [60, 28 * f, 10 * f, lg * f];
  for (let i = 0; i < min; i++) w[i] = 0;
  return w;
}
const quality = rar => Math.min(1, Math.random() * 0.8 + [0, 0.04, 0.1, 0.22][rar]);
function rollAff(d, p, q){
  let lo, hi;
  if (d.t === 'pct'){ lo = lerp(d.r[0], d.r[2], p / 100); hi = lerp(d.r[1], d.r[3], p / 100); }
  else { const b = bmulAt(p); lo = d.r[0] * b; hi = d.r[1] * b; }
  const v = lo + (hi - lo) * q;
  return { id: d.id, k: d.k, st: d.st, nm: d.alt ? pick(d.alt) : d.nm, v: d.t === 'pct' ? Math.round(v) : r1(v) };
}
function pickAff(slot, kind, used){
  const pool = AFX.filter(a => (!kind || a.k === kind) && a.sl.includes(slot) && !used.includes(a.id));
  return pool.length ? pick(pool) : null;
}
// 아이템 한 개 만들기. n = 떨어진 층. 맛보기(다음 티어)는 진행도 15~20% 구간처럼 각 티어의 마지막 5%에서 낮은 확률로 나온다.
function makeItem(n, o = {}){
  const pCur = progOf(n), tCur = tierOf(n);
  let tier = o.tier || tCur;
  if (!o.tier && pCur % 20 >= 15 && tCur < 5 && Math.random() < (o.boss ? 0.3 : 0.12)) tier = tCur + 1;
  const p = o.p != null ? o.p : (tier === tCur ? pCur : (tier - 1) * 20);   // 같은 티어 안에서는 낮은 쪽 수치부터
  const find = S && S.eq ? stats().find : 0;
  const rar = o.rar != null ? o.rar : pickWeighted(rarWeights(pCur, find, o.minRar || 0));
  const slot = o.slot || SLOTS[pickWeighted(SLOTW)];
  const it = { id: itemSeq++, slot, tier, p: Math.round(p * 10) / 10, rar, floor: n, aff: [], uq: null, rr: 0, style: Math.random() < 0.5 ? 'knight' : 'mage' };
  it.grade = Math.min(10, 2 * tier - 1 + (rar >= 2 ? 1 : 0));
  const b = bmulAt(p);
  if (slot === 'weapon'){ it.wt = o.wt || pick(WORDER); it.base = { dmg: r1(WT[it.wt].base * b) }; }
  else { const sb = SBASE[slot], base = {}; for (const k in sb) base[k] = r1(sb[k] * b); it.base = base; }
  const used = [];
  const add = kind => { const d = pickAff(slot, kind, used); if (!d) return; used.push(d.id); it.aff.push(rollAff(d, p, quality(rar))); };
  if (rar === 1) add(Math.random() < 0.5 ? 'P' : 'S');
  else if (rar >= 2){
    const want = rar === 3 ? 3 : 2 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
    add('P'); add('S');
    for (let g = 0; g < 8 && it.aff.length < want; g++) add(null);
  }
  if (rar === 3) it.uq = pick(Object.keys(UNIQ));
  it.price = Math.max(1, Math.round(10 * b * [1, 2.2, 5, 22][rar] * (1 + 0.12 * it.aff.length)));
  return it;
}
function baseName(it){
  if (it.slot === 'weapon') return GRADEN[it.grade - 1] + ' ' + WT[it.wt].name;
  if (it.slot === 'ring' || it.slot === 'neck') return ACCN[it.tier - 1] + ' ' + SLOTN[it.slot];
  return GRADEN[it.grade - 1] + ' ' + SLOTN[it.slot];
}
function itemName(it){
  const b = baseName(it);
  if (it.uq) return UNIQ[it.uq].nm + ' ' + b;
  const pf = it.aff.find(a => a.k === 'P'), sf = it.aff.find(a => a.k === 'S');
  // 한국어는 '~의'가 앞에 와야 자연스러워서 접미 옵션 이름도 장비 이름 앞에 붙인다 (곰의 날카로운 장검)
  return (sf ? sf.nm + ' ' : '') + (pf ? pf.nm + ' ' : '') + b;
}
function iconKey(it){
  if (it.slot === 'weapon') return it.wt + '_' + it.grade;
  if (it.slot === 'ring') return 'ring_' + it.tier;
  if (it.slot === 'neck') return 'neck_' + it.tier;
  return it.style + '_' + it.slot + '_' + it.grade;
}
const iconSrc = k => A.weapons[k] || A.icons[k];

// ---- 능력치 ----
function calcStats(eq){
  const c = CHARS[S.char];
  const s = { atkBase: 1.0, atkPct: 0, extra: 0, flat: 0, crit: 8, critDmg: 100, as: 0, ms: 0, hp: c.hp, mp: c.mp, def: 0, coin: 0, find: 0, skill: 0, mpRegen: 0, haggle: 0, cd: 0.4, kind: 'punch', uq: {} };
  for (const slot of SLOTS){
    const it = eq[slot]; if (!it) continue;
    if (slot === 'weapon'){ s.atkBase = it.base.dmg; s.kind = WT[it.wt].kind; s.cd = WT[it.wt].cd; }
    if (it.base.def) s.def += it.base.def;
    if (it.base.hp) s.hp += it.base.hp;
    if (it.base.mp) s.mp += it.base.mp;
    if (it.base.flat) s.flat += it.base.flat;
    for (const a of it.aff) s[a.st] = (s[a.st] || 0) + a.v;
    if (it.uq) s.uq[it.uq] = 1;
  }
  s.atk = (s.atkBase + s.flat) * (1 + s.atkPct / 100) + s.extra;
  s.cdEff = s.cd / (1 + s.as / 100);
  s.dps = s.atk * (1 + Math.min(100, s.crit) / 100 * s.critDmg / 100) / s.cdEff;
  s.hp = Math.round(s.hp); s.mp = Math.round(s.mp);
  return s;
}
let _st = null;
const stats = () => _st || (_st = calcStats(S.eq));
const dirty = () => { _st = null; };
const isLocked = it => it.tier > S.rank + 1;                              // 길드 등급이 모자라면 잠김(맛보기)
const sellPrice = it => Math.round(it.price * (isLocked(it) ? 1.6 : 1));  // 잠긴 아이템은 비싸게 팔린다
const rerollCost = it => Math.max(20, Math.round(it.price * (1.2 + 0.8 * it.rr)));
const autoSells = it => S.auto > 0 && it.rar < S.auto && !isLocked(it);
const wpnKey = () => S.eq.weapon ? S.eq.weapon.wt + '_' + S.eq.weapon.grade : 'gauntlet_1';
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
  demon_boss:{ hp: 300, spd: 1.5, sight: 8, kind: 'walk', dmg: 6, r: 22, coin: 200, boss: '악마 군주', spr: 'demon', three: true, charge: true },
  dragon_boss:{ hp: 400, spd: 1.2, sight: 9, kind: 'walk', dmg: 7, r: 30, coin: 400, boss: '드래곤', spr: 'dragon', three: true, shoot: { cd: 1.5, n: 7, col: '#ff9a3c', spd: 4, dmg: 6 } },
};
const POOLS = [
  ['slime_g', 'slime_g', 'slime_b', 'mush_b', 'mush_r', 'skel'],
  ['goblin', 'goblin', 'spider', 'rogue', 'darkmage', 'wolf', 'slime_r'],
  ['skel_sw', 'skel_bow', 'gargoyle', 'fire', 'demon', 'darkmage'],
];
const BOSSES = { 3: 'slime_king', 6: 'orc', 9: 'lich', 12: 'demon_boss', 15: 'dragon_boss' };
function floorDef(n){
  return { name: '지하 ' + n + '층', pool: POOLS[(n - 1) % 3].concat(n > 3 ? POOLS[n % 3] : []), boss: BOSSES[n] || null,
           hazard: n % 3 === 2 ? 'W' : n % 3 === 0 ? 'L' : null, rooms: Math.min(10, 5 + Math.ceil(n / 2)) };
}

// ======================= 저장 =======================
const SKEY = 'arpg_farm_v2';
let S = null;   // 저장 데이터
function newSave(c){
  const s = { v: 2, char: c, coins: 0, bag: [], eq: {}, rank: 0, best: 1, boss: {}, auto: 0, stat: { kills: 0, items: 0 }, cleared: false };
  itemSeq = 1; s.eq.weapon = makeItem(1, { slot: 'weapon', wt: CHARS[c].start, rar: 0, tier: 1, p: 0 });
  return s;
}
function readSave(){
  try {
    const s = JSON.parse(localStorage.getItem(SKEY));
    if (!s || s.v !== 2 || !CHARS[s.char]) return null;
    let m = 0; for (const it of s.bag) m = Math.max(m, it.id);
    for (const k in s.eq) if (s.eq[k]) m = Math.max(m, s.eq[k].id);
    itemSeq = m + 1; return s;
  } catch (e) { return null; }
}
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
  for (let x = 0; x < w; x++){
    if (x < 8 || x > 17) addObj((x % 3 ? 'spring' : 'summer') + (x % 2 ? '_tree_big' : '_tree_small'), x, 1);
    addObj((x % 3 ? 'summer' : 'spring') + (x % 2 ? '_tree_small' : '_tree_big'), x, h - 1);
  }
  for (let y = 2; y < h - 1; y++){ if (y === 10 || y === 11) continue; addObj((y % 2 ? 'spring' : 'summer') + '_tree_big', 0, y); addObj((y % 2 ? 'summer' : 'spring') + '_tree_big', w - 1, y); }
  // 건물: 길드(승급) · 대장간(옵션 다시 굴리기) · 상인(사고팔기)
  W.guild = addObj('b_guild', 8, 8);
  W.smithy = addObj('b_smithy', 17, 8);
  W.shop = addObj('b_shop', 8, 15);
  W.fountain = addObj('g_fountain', 12, 10, { x: 13 * TS, y: 11.4 * TS });
  addObj('g_lantern', 11, 4); addObj('g_lantern', 14, 4); addObj('g_lantern', 11, 15); addObj('g_lantern', 14, 15);
  addObj('g_bench', 16, 13); addObj('g_barrel_flower', 5, 9); addObj('g_pot_tulip', 12, 6); addObj('g_birdhouse', 20, 14);
  addObj('flowers', 4, 5); addObj('flowers', 21, 5); addObj('flowers', 4, 13); addObj('flowers', 21, 12); addObj('flowers', 14, 15);
  addObj('spring_bush', 3, 7); addObj('summer_bush', 22, 7); addObj('rock', 19, 17); addObj('sign', 15, 3);
  W.critters = [{ x: 18.5 * TS, y: 14.5 * TS, wx: 0, wy: 0, t: 0, face: 1, anim: 0 }, { x: 5.5 * TS, y: 11.5 * TS, wx: 0, wy: 0, t: 1, face: -1, anim: 1 }];
  W.inter = [
    { x: W.guild.x, y: W.guild.y + 0.55 * TS, r: 2.1 * TS, label: '길드 · 승급', act: openGuild },
    { x: W.smithy.x, y: W.smithy.y + 0.55 * TS, r: 2.1 * TS, label: '대장간 · 옵션 다시 굴리기', act: () => openBag('smith') },
    { x: W.shop.x, y: W.shop.y + 0.55 * TS, r: 2.1 * TS, label: '상인 · 사고팔기', act: () => openBag('shop') },
    { x: W.fountain.x, y: W.fountain.y + 0.2 * TS, r: 1.6 * TS, label: '분수에서 쉬기', act: rest },
  ];
}

function buildFloor(n){
  const F = floorDef(n);
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
        start: { x: (up.x + 0.5) * TS, y: (up.y + 2.1) * TS }, up, down, bossDead: !F.boss, critters: [], phoenixUsed: false };
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
      if (F.boss) spawn(F.boss, r.cx, r.cy);
      for (let k = 0; k < (F.boss ? 2 : 4); k++) spawnIn(r, pick(F.pool));
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
  const d = MDEF[type], x = (tx + 0.5) * TS, y = (ty + 0.7) * TS, nF = W.floor || 1, cmS = bm(nF) / bm(1), hpS = Math.max(1, Math.round(d.hp * cmS)), dmS = 1 + 0.25 * (nF - 1);
  const m = { type, d, x, y, hx: x, hy: y, hp: hpS, maxHp: hpS, dm: dmS, cm: cmS, state: d.mimic ? 'sleep' : 'wander', t: 0, wx: 0, wy: 0, face: 1, hitT: 0, cool: 0,
    kx: 0, ky: 0, dead: false, anim: Math.random() * 3, moving: false, mx: 0, my: 0, shootT: 1 + Math.random(), chargeT: 3, charging: 0, splits: 0 };
  W.mons.push(m); return m;
}
function sprKey(m){
  if (m.d.mimic) return m.state === 'sleep' ? 'mimic' : 'mimic_open';
  const bk = m.d.spr || m.type;
  if (!m.d.three) return bk;
  let side = 'front';
  if (m.moving && Math.abs(m.mx) > Math.abs(m.my) * 0.8) side = m.mx < 0 ? 'left' : 'right';
  return bk + '_' + side;
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
const maxHp = () => stats().hp;
const maxMp = () => stats().mp;
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
  const s = stats(), K = 5 * bm(W.floor || 1), red = s.def / (s.def + K);
  dmg = Math.max(1, Math.round(dmg * (1 - red)));
  P.hp = Math.max(0, P.hp - dmg); P.inv = 1.0; P.kx = nx * 7 * TS; P.ky = ny * 7 * TS; shake = 0.25;
  popText(P.x, P.y - TS * 1.8, '-' + dmg, '#ff5a6a');
  if (P.hp <= 0 && s.uq.phoenix && !W.phoenixUsed){
    W.phoenixUsed = true; P.hp = Math.ceil(maxHp() / 2); P.inv = 2;
    popText(P.x, P.y - TS * 2.2, '불사조!', '#ff8a2a', true); poof(P.x, P.y - TS * 0.8, '#ffb36a', 24); return;
  }
  if (P.hp <= 0){
    P.dead = 2.4; P.atkT = -1; P.dashT = -1; poof(P.x, P.y - TS * 0.8, '#ffd0d6', 18);
    const lost = Math.floor(S.coins * 0.3); S.coins -= lost; writeSave();
    toast('쓰러졌어요', lost ? '금화 ' + lost + '개를 잃고 마을로 돌아가요' : '마을로 돌아가요');
  }
}
let fullT = 0, saveT = 0;
function dropItem(x, y, it){
  S.stat.items++;
  if (autoSells(it)){ const c = sellPrice(it); S.coins += c; popText(x, y - TS * 0.6, '+' + c, '#ffd34d'); return; }
  pickups.push({ kind: 'item', it, x: x + rand(-16, 16), y: y + rand(-6, 10), t: 0 });
  if (it.rar >= 2) popText(x, y - TS * 1.3, itemName(it), RARCOL[it.rar], true);
}
function takeItem(pk){
  if (S.bag.length >= BAGCAP){ if (fullT <= 0){ toast('가방이 가득 찼어요', '가방을 열어 팔거나 정리해 주세요'); fullT = 3; } return false; }
  S.bag.push(pk.it); writeSave();
  popText(P.x, P.y - TS * 1.9, itemName(pk.it), RARCOL[pk.it.rar]);
  return true;
}
function thunder(src){
  const near = W.mons.filter(m => !m.dead && m !== src && !(m.d.mimic && m.state === 'sleep') && Math.hypot(m.x - src.x, m.y - src.y) < TS * 4)
    .sort((a, b) => Math.hypot(a.x - src.x, a.y - src.y) - Math.hypot(b.x - src.x, b.y - src.y)).slice(0, 2);
  for (const m of near){ poof(m.x, m.y - TS * 0.8, '#bfe3ff', 10); hurtMon(m, Math.max(1, Math.round(stats().atk * 1.5)), false, true); }
}
function dropCoins(x, y, n){
  const s = stats(); n = Math.max(1, Math.round(n * (1 + s.coin / 100) * (s.uq.gold ? 2 : 1)));
  const c = Math.min(n, 6);
  for (let i = 0; i < c; i++) pickups.push({ kind: 'coin', x: x + rand(-14, 14), y: y + rand(-8, 8), t: rand(0, 1), v: Math.ceil(n / c) });
}
function hurtMon(m, dmg, crit, noProc){
  if (m.dead) return;
  if (m.d.mimic && m.state === 'sleep') m.state = 'chase';
  m.hp -= dmg; m.hitT = 0.25; if (m.state !== 'chase') m.state = 'chase';
  const dx = m.x - P.x, dy = m.y - P.y, l = Math.hypot(dx, dy) || 1, kb = m.d.boss ? 1.2 : 6;
  m.kx = dx / l * kb * TS; m.ky = dy / l * kb * TS;
  const h = A.mons[sprKey(m)].h;
  popText(m.x, m.y - h - 6, (crit ? '치명! ' : '') + dmg, crit ? '#ffd34d' : '#ffffff', crit);
  if (!noProc && stats().uq.thunder && Math.random() < 0.25) thunder(m);
  if (m.d.split && m.splits < 3 && m.hp < m.maxHp * (0.75 - m.splits * 0.25)){
    m.splits++;
    for (let k = 0; k < 2; k++){ const s = spawn(pick(['slime_g', 'slime_b']), Math.floor(m.x / TS), Math.floor(m.y / TS)); s.x += rand(-30, 30); s.state = 'chase'; tryMove(s, 0, 0, 12); }
  }
  if (m.hp <= 0){
    m.dead = true;
    poof(m.x, m.y - h * 0.45, m.d.boss ? '#ffe28a' : '#e8d6b0', m.d.boss ? 40 : 16);
    dropCoins(m.x, m.y, (m.d.coin + ri(0, 2)) * m.cm);
    if (Math.random() < 0.18) pickups.push({ kind: 'heart', x: m.x + 10, y: m.y, t: 0 });
    S.stat.kills++;
    if (!m.d.boss && !m.d.mimic && Math.random() < 0.16 * (1 + stats().find / 150)) dropItem(m.x, m.y, makeItem(W.floor));
    if (m.d.mimic){ dropItem(m.x - 12, m.y, makeItem(W.floor, { minRar: 2 })); dropItem(m.x + 12, m.y, makeItem(W.floor, { minRar: 1 })); }
    if (m.d.boss) bossDown(m);
  }
}
function bossDown(m){
  W.bossDead = true; S.boss[W.floor] = true; P.hp = maxHp(); P.mp = maxMp(); writeSave();
  popText(m.x, m.y - TS * 2.4, m.d.boss + ' 처치!', '#ffe28a', true);
  const n = W.floor;
  for (let i = 0; i < 3; i++) setTimeout(() => { if (W && W.floor === n) dropItem(m.x + (i - 1) * 26, m.y + 8, makeItem(n, { minRar: i === 0 ? 2 : 1, boss: true })); }, 350 + i * 220);
  setTimeout(() => toast(m.d.boss + ' 처치!', n === NF ? '시험판의 마지막 층이에요' : '내려가는 계단이 열렸어요'), 300);
}
function hitObj(p){
  if (p.gone) return;
  const k = Math.max(1, Math.round(bm(W.floor) / bm(1)));
  if (p.breakable === 'jar'){
    p.gone = true; poof(p.x, p.y - TS * 0.4, '#d08a5a', 12);
    if (Math.random() < 0.6) dropCoins(p.x, p.y, ri(1, 3) * k);
    else if (Math.random() < 0.5) pickups.push({ kind: 'heart', x: p.x, y: p.y, t: 0 });
  } else if (p.breakable === 'chest'){
    p.name = 'd_chest_open'; p.o = A.objs.d_chest_open; p.breakable = null; poof(p.x, p.y - TS * 0.6, '#ffe28a', 16);
    dropItem(p.x, p.y + 8, makeItem(W.floor, { minRar: 1 }));
    if (Math.random() < 0.3) dropItem(p.x + 18, p.y + 10, makeItem(W.floor));
    dropCoins(p.x, p.y, ri(4, 8) * k);
  }
}

// ======================= 공격 =======================
function rollHit(){
  const s = stats(), crit = Math.random() * 100 < s.crit;
  let d = s.atk * (0.92 + Math.random() * 0.16);
  if (crit) d *= 1 + s.critDmg / 100;
  return { dmg: Math.max(1, Math.round(d)), crit };
}
function attack(){
  if (paused || P.dead > 0 || P.atkCd > 0 || P.dashT >= 0) return;
  const s = stats(), kind = s.kind;
  P.atkCd = s.cdEff; P.atkT = 0; P.atkHit = false;
  const ranged = kind === 'arrow' || kind === 'orb';
  const tgt = nearestMon(ranged ? 7 * TS : 1.8 * TS);
  let vx, vy;
  if (tgt){ vx = tgt.x - P.x; vy = (tgt.y - A.mons[sprKey(tgt)].h * 0.4) - (P.y - TS * 0.45); faceTo(vx, vy); }
  else [vx, vy] = dirVec();
  const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l; P.atkAng = Math.atan2(vy, vx);
  if (ranged){
    const sp = (kind === 'arrow' ? 9.5 : 6.2) * TS, h = rollHit();
    pshots.push({ kind, x: P.x + vx * 18, y: P.y - TS * 0.45 + vy * 18, vx: vx * sp, vy: vy * sp, life: 1.3, dmg: h.dmg, crit: h.crit, lv: S.eq.weapon ? S.eq.weapon.grade : 1 });
  }
}
function meleeHit(){
  const kind = stats().kind;
  const vx = Math.cos(P.atkAng), vy = Math.sin(P.atkAng), cy = P.y - TS * 0.45;
  const hitAt = (hx, hy, rr) => {
    for (const m of W.mons){ if (m.dead) continue; const my = m.y - A.mons[sprKey(m)].h * 0.45;
      if (Math.hypot(m.x - hx, my - hy) < rr + m.d.r * 0.7 && !m._hitNow){ m._hitNow = true; const h = rollHit(); hurtMon(m, h.dmg, h.crit); } }
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
const skillCost = () => Math.max(3, Math.round(2 * Math.sqrt(bm((W && W.floor) || 1))));
function skill(){
  if (paused || P.dead > 0 || P.skillCd > 0) return;
  const cost = skillCost();
  if (P.mp < cost){ popText(P.x, P.y - TS * 1.8, '마나 부족', '#8fb8ff'); return; }
  P.mp -= cost; P.skillCd = 0.6;
  const s = stats(), tgt = nearestMon(7 * TS); let vx, vy;
  if (tgt){ vx = tgt.x - P.x; vy = (tgt.y - A.mons[sprKey(tgt)].h * 0.4) - (P.y - TS * 0.45); faceTo(vx, vy); } else [vx, vy] = dirVec();
  const l = Math.hypot(vx, vy) || 1;
  const dmg = Math.max(1, Math.round(s.atk * 1.6 * (1 + s.skill / 100) * (0.92 + Math.random() * 0.16)));
  pshots.push({ kind: 'fire', x: P.x + vx / l * 20, y: P.y - TS * 0.45 + vy / l * 20, vx: vx / l * 7.5 * TS, vy: vy / l * 7.5 * TS, life: 1.4, dmg, crit: false });
}
function syncWeapon(){
  const w = S.eq.weapon;
  $('iWpn').src = A.icons.bag; $('wLv').textContent = w ? 'T' + w.tier : '-'; $('wName').textContent = '가방';
}
function explode(s, rad, dmg, col){
  s.life = 0; poof(s.x, s.y, col, 14); shake = Math.max(shake, 0.1);
  for (const m of W.mons){ if (m.dead) continue; const my = m.y - A.mons[sprKey(m)].h * 0.45;
    if (Math.hypot(m.x - s.x, my - s.y) < TS * rad + m.d.r * 0.5) hurtMon(m, dmg, !!s.crit); }
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
  if (k === 'q' || k === 'tab' || k === 'i'){ openBag('bag'); e.preventDefault(); }
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
bindBtn('bAtk', attack); bindBtn('bDash', dash); bindBtn('bSkill', skill); bindBtn('bWpn', () => openBag('bag'));
$('act').addEventListener('click', () => doAct());
$('tools').addEventListener('click', () => openTools());
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
function openPanel(build){ paused = true; joy.id = null; joy.dx = joy.dy = 0; const p = $('panel'); p.innerHTML = ''; p.className = 'panel'; build(p); $('veil').hidden = false; const f = p.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
function closePanel(){ if (!S) return; $('veil').hidden = true; paused = false; }
function el(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function coinLine(){ const d = el('div', 'coinline'); const i = el('img'); i.src = A.ui.icon_coin; i.alt = ''; d.append(i, '금화 ' + S.coins); return d; }

function titleScreen(){
  const saved = readSave();
  openPanel(p => {
    p.append(el('h2', null, 'ARPG 파밍 시험판'));
    p.append(el('p', null, saved ? '이어서 하거나 새 캐릭터를 고르세요.' : '함께 던전에 들어갈 캐릭터를 고르세요.'));
    if (saved){
      const r = el('div', 'pfoot'); const b = el('button', 'pbtn go', '이어하기 · ' + CHARS[saved.char].name + ' · ' + RANKN[saved.rank] + ' 등급 · 지하 ' + saved.best + '층까지');
      b.type = 'button'; b.addEventListener('click', () => { S = saved; dirty(); startGame(); }); r.append(b); p.append(r);
      p.append(el('p', null, '새로 시작하면 이전 기록은 지워져요.'));
    }
    const cards = el('div', 'cards');
    for (const c in CHARS){
      const b = el('button', 'card'); b.type = 'button';
      const im = el('img'); im.src = A.chars[c].frames.front[0]; im.alt = '';
      b.append(im, el('b', null, CHARS[c].name), el('span', null, '기본 체력 ' + CHARS[c].hp + ' · 마나 ' + CHARS[c].mp), el('span', null, CHARS[c].note));
      b.addEventListener('click', () => { S = newSave(c); dirty(); writeSave(); startGame(true); });
      cards.append(b);
    }
    p.append(cards);
  });
}
function mkBtn(txt, fn, cls){ const b = el('button', 'pbtn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
function closeRow(){ const f = el('div', 'pfoot'); f.append(mkBtn('닫기', closePanel, 'go')); return f; }

// ---- 가방 · 장비 · 상인 · 대장간 ----
let bagMode = 'bag', bagSel = null, confirmId = null;
const CMP = [['atk', '공격력', ''], ['dps', '초당 피해', ''], ['def', '방어', ''], ['hp', '체력', ''], ['mp', '마나', ''], ['crit', '치명타', '%'],
             ['as', '공격 속도', '%'], ['ms', '이동 속도', '%'], ['coin', '금화 획득', '%'], ['find', '아이템 발견', '%']];
function openBag(mode){ bagMode = mode || 'bag'; bagSel = null; confirmId = null; openPanel(renderBag); }
function refreshBag(){ const p = $('panel'), y = p.scrollTop; p.innerHTML = ''; renderBag(p); p.scrollTop = y; }
function selItem(){ if (!bagSel) return null; if (bagSel.eq) return S.eq[bagSel.eq] || null; return S.bag.find(x => x.id === bagSel.id) || null; }
function cell(it, onClick, sel){
  const b = el(it ? 'button' : 'div', 'cell' + (it ? '' : ' empty') + (it && isLocked(it) ? ' lock' : '') + (sel ? ' sel' : '') + (it && it.rar >= 2 ? ' glow' : ''));
  if (it){
    b.type = 'button'; b.style.setProperty('--rc', RARCOL[it.rar]);
    const im = el('img'); im.src = iconSrc(iconKey(it)); im.alt = ''; b.append(im);
    b.setAttribute('aria-label', itemName(it) + ', ' + RARN[it.rar] + ', T' + it.tier);
    b.addEventListener('click', onClick);
  }
  return b;
}
function equipItem(it){
  if (isLocked(it)) return;
  const old = S.eq[it.slot];
  S.bag = S.bag.filter(x => x !== it); if (old) S.bag.push(old);
  S.eq[it.slot] = it; bagSel = { eq: it.slot }; confirmId = null; afterGear(); refreshBag();
}
function unequip(slot){
  if (S.bag.length >= BAGCAP){ toast('가방이 가득 찼어요'); return; }
  const it = S.eq[slot]; S.bag.push(it); S.eq[slot] = null; bagSel = { id: it.id }; afterGear(); refreshBag();
}
function afterGear(){ dirty(); P.hp = Math.min(P.hp, maxHp()); P.mp = Math.min(P.mp, maxMp()); writeSave(); syncWeapon(); }
function sellItem(it){ S.coins += sellPrice(it); S.bag = S.bag.filter(x => x !== it); bagSel = null; confirmId = null; writeSave(); refreshBag(); }
function bulkSell(maxRar){
  let n = 0, g = 0;
  S.bag = S.bag.filter(it => { if (it.rar <= maxRar && !isLocked(it)){ g += sellPrice(it); n++; return false; } return true; });
  S.coins += g; bagSel = null; writeSave();
  toast(n ? n + '개를 팔았어요' : '팔 수 있는 장비가 없어요', n ? '금화 +' + g : null); refreshBag();
}
function rerollAff(it, idx){
  const cost = rerollCost(it); if (S.coins < cost){ toast('금화가 모자라요'); return; }
  const old = it.aff[idx], used = it.aff.filter((_, i) => i !== idx).map(a => a.id);
  const d = pickAff(it.slot, old.k, used); if (!d) return;
  S.coins -= cost; it.rr++; it.aff[idx] = rollAff(d, it.p, quality(it.rar)); dirty(); writeSave(); syncWeapon(); refreshBag();
}
function statBox(){
  const s = stats(), box = el('div', 'detail');
  box.append(el('b', 'dn', '내 능력치'));
  for (const [k, nm, u] of CMP){
    if (['coin', 'find', 'ms', 'as'].includes(k) && !s[k]) continue;
    const r = el('div', 'statrow'); r.append(el('span', null, nm), el('span', null, fnum(s[k]) + u)); box.append(r);
  }
  const red = Math.round(s.def / (s.def + 5 * bm((W && W.floor) || 1)) * 100);
  const r = el('div', 'statrow'); r.append(el('span', null, '피해 감소 (지금 층 기준)'), el('span', null, red + '%')); box.append(r);
  box.append(el('div', 'sub', '아이템을 눌러 보세요. 가방에서 고르면 지금 낀 장비와 비교해 보여 줘요.'));
  return box;
}
function detailEl(it, eqSlot){
  const d = el('div', 'detail'), lk = !eqSlot && isLocked(it);
  const nm = el('b', 'dn', itemName(it)); nm.style.color = RARTXT[it.rar]; d.append(nm);
  d.append(el('div', 'sub', RARN[it.rar] + ' · T' + it.tier + ' · ' + SLOTN[it.slot] + (it.wt ? ' (' + WT[it.wt].name + ')' : '')));
  if (lk) d.append(el('div', 'down', '잠김 · ' + RANKN[it.tier - 1] + ' 등급이 되면 착용할 수 있어요'));
  const bs = it.base;
  if (bs.dmg != null) d.append(el('div', null, '공격력 ' + fnum(bs.dmg)));
  if (bs.flat) d.append(el('div', null, '공격력 +' + fnum(bs.flat)));
  if (bs.def) d.append(el('div', null, '방어 +' + fnum(bs.def)));
  if (bs.hp) d.append(el('div', null, '최대 체력 +' + fnum(bs.hp)));
  if (bs.mp) d.append(el('div', null, '최대 마나 +' + fnum(bs.mp)));
  it.aff.forEach((a, i) => {
    const r = el('div', 'aff'), t = el('span', null, affText(a)); t.style.color = a.k === 'P' ? '#9a3d1e' : '#2f6f4a'; r.append(t);
    if (bagMode === 'smith'){ const cost = rerollCost(it), b = mkBtn('다시 굴리기 ' + cost, () => rerollAff(it, i), 'sm'); b.disabled = S.coins < cost; r.append(b); }
    d.append(r);
  });
  if (it.uq) d.append(el('div', 'uq', '★ ' + UNIQ[it.uq].d));
  d.append(el('div', 'sub', '판매가 ' + sellPrice(it) + ' 금화' + (lk ? ' (잠긴 장비라 비싸게 팔려요)' : '')));
  if (!eqSlot && !lk){
    const cur = S.eq[it.slot], a = stats(), eq2 = Object.assign({}, S.eq); eq2[it.slot] = it;
    const b = calcStats(eq2), box = el('div', 'cmp');
    box.append(el('div', 'sub', cur ? '지금 낀 ' + itemName(cur) + '와 비교' : '비어 있는 칸에 끼면'));
    for (const [k, nm, u] of CMP){
      const x = a[k] || 0, y = b[k] || 0, dv = y - x; if (Math.abs(dv) < 0.05) continue;
      const r = el('div', 'statrow'), v = el('span'); v.append(fnum(x) + u + ' → ' + fnum(y) + u + ' ');
      v.append(el('span', dv > 0 ? 'up' : 'down', (dv > 0 ? '▲' : '▼') + fnum(Math.abs(dv)) + u));
      r.append(el('span', null, nm), v); box.append(r);
    }
    d.append(box);
  }
  const f = el('div', 'pfoot');
  if (eqSlot) f.append(mkBtn('해제', () => unequip(eqSlot)));
  else {
    f.append(Object.assign(mkBtn(lk ? '잠김' : '장착', () => equipItem(it), 'go'), { disabled: lk }));
    f.append(mkBtn(confirmId === it.id ? '정말 팔까요? ' + sellPrice(it) : '팔기 ' + sellPrice(it), () => {
      if (it.rar >= 2 && confirmId !== it.id){ confirmId = it.id; refreshBag(); return; }
      sellItem(it);
    }));
  }
  d.append(f);
  return d;
}
function renderBag(p){
  p.classList.add('wide');
  p.append(el('h2', null, { bag: '가방', shop: '상인 · 사고팔기', smith: '대장간 · 옵션 다시 굴리기' }[bagMode]));
  p.append(coinLine());
  if (bagMode === 'shop'){
    const f = el('div', 'pfoot');
    f.append(mkBtn('자동 판매: ' + ['끔', '일반', '일반+마법'][S.auto], () => { S.auto = (S.auto + 1) % 3; writeSave(); refreshBag(); }));
    f.append(mkBtn('일반 모두 팔기', () => bulkSell(0)), mkBtn('마법 이하 모두 팔기', () => bulkSell(1)));
    p.append(f);
  } else if (bagMode === 'smith'){
    p.append(el('p', null, '옵션 한 줄을 골라 다시 굴려요. 같은 장비는 굴릴수록 값이 올라요.'));
  }
  const wrap = el('div', 'bagwrap'), L = el('div'), Rc = el('div');
  const sl = el('div', 'slots');
  for (const s of SLOTS){
    const it = S.eq[s], d = el('div', 'slot');
    d.append(cell(it, () => { bagSel = { eq: s }; confirmId = null; refreshBag(); }, bagSel && bagSel.eq === s), el('span', null, SLOTN[s]));
    sl.append(d);
  }
  L.append(sl);
  const head = el('div', 'baghead'); head.append(el('span', null, '가방 ' + S.bag.length + '/' + BAGCAP));
  head.append(mkBtn('정렬', () => { S.bag.sort((a, b) => b.rar - a.rar || b.tier - a.tier || b.price - a.price); writeSave(); refreshBag(); }, 'sm'));
  L.append(head);
  const g = el('div', 'bagg');
  for (let i = 0; i < BAGCAP; i++){
    const it = S.bag[i];
    g.append(cell(it, () => { bagSel = { id: it.id }; confirmId = null; refreshBag(); }, bagSel && !bagSel.eq && it && bagSel.id === it.id));
  }
  L.append(g);
  const it = selItem();
  Rc.append(it ? detailEl(it, bagSel.eq || null) : statBox());
  wrap.append(L, Rc); p.append(wrap); p.append(closeRow());
}

// ---- 길드 ----
function openGuild(){
  openPanel(p => {
    p.append(el('h2', null, '모험가 길드'));
    p.append(el('p', null, '지금 등급: ' + RANKN[S.rank] + ' · 착용할 수 있는 장비는 T' + (S.rank + 1) + '까지예요.'));
    p.append(coinLine());
    if (S.rank >= 4) p.append(el('p', null, '더 오를 등급이 없어요.'));
    else {
      const nr = S.rank + 1, bf = nr * FPT, cleared = !!S.boss[bf];
      const disc = Math.min(0.4, stats().haggle * 0.5 / 100), fee = Math.round(RANKFEE[nr] * (1 - disc));
      const box = el('div', 'detail');
      box.append(el('b', 'dn', RANKN[nr] + ' 등급 승급 시험'));
      box.append(el('div', null, '시험: 지하 ' + bf + '층 보스 처치 ' + (cleared ? '(완료)' : '(아직)')));
      box.append(el('div', null, '응시료: ' + fee + ' 금화' + (disc > 0 ? ' · 흥정으로 ' + Math.round(disc * 100) + '% 깎음' : '')));
      box.append(el('div', 'sub', '합격하면 T' + (nr + 1) + ' 장비를 착용할 수 있고 지하 ' + (bf + 1) + '층부터 내려갈 수 있어요. 시험판에서는 보스 처치가 승급 시험을 대신해요.'));
      const f = el('div', 'pfoot'), b = mkBtn('응시하기', () => {
        S.coins -= fee; S.rank++; writeSave(); toast(RANKN[S.rank] + ' 등급 합격!', 'T' + (S.rank + 1) + ' 장비를 착용할 수 있어요'); openGuild();
      }, 'go');
      b.disabled = !cleared || S.coins < fee; f.append(b); box.append(f); p.append(box);
    }
    const rows = el('div', 'detail');
    rows.append(el('b', 'dn', '등급표'));
    for (let i = 0; i < 5; i++){
      const r = el('div', 'statrow'); if (i === S.rank) r.style.fontWeight = '700';
      r.append(el('span', null, RANKN[i] + (i === S.rank ? ' (지금)' : '')), el('span', null, 'T' + (i + 1) + ' 장비' + (i ? ' · 응시료 ' + RANKFEE[i] : '')));
      rows.append(r);
    }
    p.append(rows); p.append(closeRow());
  });
}
// ---- 던전 입구 ----
function openGate(){
  openPanel(p => {
    p.append(el('h2', null, '던전 입구'));
    p.append(el('p', null, '지하 ' + NF + '층까지 있어요. 3층마다 보스가 있고, 보스를 쓰러뜨린 뒤 길드에서 승급해야 다음 층으로 내려갈 수 있어요.'));
    for (let t = 1; t <= 5; t++){
      const r = el('div', 'trow'); r.append(el('b', null, 'T' + t + ' · ' + RANKN[t - 1] + ' 등급 · ' + (t - 1) * 20 + '~' + t * 20 + '%'));
      for (let n = (t - 1) * FPT + 1; n <= t * FPT; n++){
        const ok = n <= S.best && t <= S.rank + 1;
        const b = mkBtn(n + '층' + (BOSSES[n] ? ' ★' : ''), () => { closePanel(); enterFloor(n); }, ok ? 'go' : ''); b.disabled = !ok; r.append(b);
      }
      p.append(r);
    }
    p.append(closeRow());
  });
}
function ending(){
  S.cleared = true; writeSave();
  openPanel(p => {
    p.append(el('h2', null, '시험판 끝'));
    p.append(el('p', null, '지하 ' + NF + '층의 보스까지 쓰러뜨렸어요. 마을로 돌아가 장비를 정리하고 다시 파밍해 볼 수 있어요.'));
    p.append(coinLine());
    const f = el('div', 'pfoot'); f.append(mkBtn('마을로 돌아가기', () => { closePanel(); enterTown(); }, 'go')); p.append(f);
  });
}
// ---- 시험 도구 (파밍 흐름 확인용 임시) ----
let toolFloor = 1, simRes = null, wipeAsk = false;
function simDrops(n, N){
  const rar = [0, 0, 0, 0], tier = [0, 0, 0, 0, 0]; let aff = 0, price = 0, teaser = 0;
  for (let i = 0; i < N; i++){ const it = makeItem(n); rar[it.rar]++; tier[it.tier - 1]++; aff += it.aff.length; price += it.price; if (it.tier > tierOf(n)) teaser++; }
  return { N, rar, tier, aff: aff / N, price: price / N, teaser };
}
function grantItems(n, c){
  let k = 0; for (; k < c && S.bag.length < BAGCAP; k++){ S.bag.push(makeItem(n)); S.stat.items++; }
  writeSave(); toast(k + '개를 받았어요', k < c ? '가방이 가득 찼어요' : null);
}
function openTools(){
  openPanel(p => {
    const pc = (v, N) => (v / N * 100).toFixed(1) + '%';
    p.append(el('h2', null, '시험 도구'));
    p.append(el('p', null, '파밍 흐름을 확인하려고 둔 임시 도구예요.'));
    const row = el('div', 'pfoot');
    row.append(mkBtn('−', () => { toolFloor = Math.max(1, toolFloor - 1); simRes = null; openTools(); }),
      el('b', null, '지하 ' + toolFloor + '층 · T' + tierOf(toolFloor) + ' · 진행도 ' + Math.round(progOf(toolFloor)) + '%'),
      mkBtn('+', () => { toolFloor = Math.min(NF, toolFloor + 1); simRes = null; openTools(); }));
    p.append(row);
    const r2 = el('div', 'pfoot');
    r2.append(mkBtn('드롭 1000개 굴려 보기', () => { simRes = simDrops(toolFloor, 1000); openTools(); }),
              mkBtn('이 층 장비 10개 받기', () => { grantItems(toolFloor, 10); openTools(); }));
    p.append(r2);
    if (simRes){
      const s = simRes, box = el('div', 'detail');
      box.append(el('b', 'dn', '드롭 ' + s.N + '개 결과'));
      box.append(el('div', null, '등급: 일반 ' + pc(s.rar[0], s.N) + ' · 마법 ' + pc(s.rar[1], s.N) + ' · 희귀 ' + pc(s.rar[2], s.N) + ' · 전설 ' + pc(s.rar[3], s.N)));
      box.append(el('div', null, '티어: ' + s.tier.map((v, i) => 'T' + (i + 1) + ' ' + pc(v, s.N)).join(' · ')));
      box.append(el('div', null, '맛보기(다음 티어): ' + pc(s.teaser, s.N) + ' · 평균 옵션 ' + s.aff.toFixed(2) + '개 · 평균 값 ' + Math.round(s.price) + '금화'));
      p.append(box);
    }
    const st = el('div', 'detail');
    st.append(el('div', null, '처치 ' + S.stat.kills + ' · 떨어진 장비 ' + S.stat.items + ' · 등급 ' + RANKN[S.rank]));
    p.append(st);
    const r3 = el('div', 'pfoot');
    r3.append(mkBtn('금화 +1,000', () => { S.coins += 1000; writeSave(); openTools(); }), mkBtn('금화 +10,000', () => { S.coins += 10000; writeSave(); openTools(); }));
    r3.append(mkBtn('등급 한 단계 (무료)', () => { if (S.rank < 4){ S.rank++; writeSave(); } openTools(); }));
    r3.append(mkBtn('보스 기록·층 해금', () => { for (let k = 1; k <= S.rank + 1; k++) S.boss[k * FPT] = true; S.best = Math.max(S.best, (S.rank + 1) * FPT); writeSave(); openTools(); }));
    p.append(r3);
    const r4 = el('div', 'pfoot');
    r4.append(mkBtn(wipeAsk ? '정말 처음부터? 한 번 더' : '처음부터 다시', () => { if (!wipeAsk){ wipeAsk = true; openTools(); return; } try { localStorage.removeItem(SKEY); } catch (e) {} location.reload(); }));
    r4.append(mkBtn('닫기', closePanel, 'go')); p.append(r4);
  });
}
function rest(){ P.hp = maxHp(); P.mp = maxMp(); poof(W.fountain.x, W.fountain.y - TS, '#9fe0ff', 18); toast('체력과 마나가 모두 찼어요', null, A.ui.icon_heart); }

// ======================= 장소 이동 =======================
let fade = 0;
function resetFx(){ shots = []; pshots = []; fx = []; texts = []; pickups = []; }
function placePlayer(){ P.x = W.start.x; P.y = W.start.y; P.dir = W.dungeon ? 'front' : 'back'; P.kx = P.ky = 0; P.trail = []; P.dashT = -1; P.atkT = -1; P.lock = 0.9; }
function enterTown(){ buildTown(); resetFx(); placePlayer(); $('place').textContent = '마을'; $('tools').hidden = false; fade = 1; writeSave(); }
function enterFloor(n){
  const F = floorDef(n);
  buildFloor(n); resetFx(); placePlayer(); S.best = Math.max(S.best, n);
  $('place').textContent = F.name + ' · T' + tierOf(n); $('tools').hidden = true; fade = 1;
  setTimeout(() => toast(F.name, F.boss ? '보스 ' + MDEF[F.boss].boss + '를 쓰러뜨리면 다음 층 계단이 열려요' : '계단은 처음부터 열려 있어요'), 300);
}
function startGame(first){
  P.hp = maxHp(); P.mp = maxMp(); syncWeapon(); $('veil').hidden = true; paused = false; enterTown();
  if (first) showHint('왼쪽 화면을 누르고 끌면 걸어요<br>던전에서 떨어진 장비는 가까이 가면 저절로 주워져요<br>가방 버튼(PC: I)으로 가방을 열어 장비를 끼세요<br>PC: WASD 이동 · 스페이스 공격 · Shift 대시 · E 불덩이 · F 대화');
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
    shots.push({ x: sx, y: sy, vx: Math.cos(a) * sh.spd * TS, vy: Math.sin(a) * sh.spd * TS, life: 3.5, col: sh.col, dmg: Math.max(1, Math.round(sh.dmg * m.dm)), arrow: sh.arrow });
  }
}

function update(dt){
  if (toastT > 0){ toastT -= dt; if (toastT <= 0) $('toast').hidden = true; }
  fade = Math.max(0, fade - dt * 2.2);
  if (paused || !W) return;
  gameT += dt; fullT = Math.max(0, fullT - dt); if ((saveT += dt) > 8){ saveT = 0; writeSave(); }
  if (P.dead > 0){ P.dead -= dt; if (P.dead <= 0){ P.hp = maxHp(); P.mp = maxMp(); P.inv = 1.5; enterTown(); } }
  const alive = P.dead <= 0;
  P.inv = Math.max(0, P.inv - dt); P.atkCd = Math.max(0, P.atkCd - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.skillCd = Math.max(0, P.skillCd - dt);
  P.mp = Math.min(maxMp(), P.mp + dt * (W.dungeon ? 0.5 + 0.03 * maxMp() : 2 + 0.2 * maxMp()) * (1 + stats().mpRegen / 100));
  if (!W.dungeon) P.hp = Math.min(maxHp(), P.hp + dt * (0.5 + 0.02 * maxHp()));
  let ix = 0, iy = 0;
  if (keys['arrowleft'] || keys['a']) ix -= 1; if (keys['arrowright'] || keys['d']) ix += 1;
  if (keys['arrowup'] || keys['w']) iy -= 1;   if (keys['arrowdown'] || keys['s']) iy += 1;
  if (ix || iy){ const l = Math.hypot(ix, iy); ix /= l; iy /= l; } else { ix = joy.dx; iy = joy.dy; if (Math.hypot(ix, iy) < 0.18) ix = iy = 0; }
  if (!alive) ix = iy = 0;
  const mag = Math.min(1, Math.hypot(ix, iy)); P.dx = ix; P.dy = iy;
  const SPD = CHARS[S.char].spd * TS * (1 + stats().ms / 100);
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
    const k = stats().kind;
    if (!P.atkHit && P.atkT > (k === 'punch' ? 0.03 : 0.06)){ P.atkHit = true; if (k === 'arc' || k === 'punch' || k === 'thrust') meleeHit(); }
    if (P.atkT > Math.min(0.26, stats().cdEff)) P.atkT = -1;
  }

  // 발밑 칸
  const ptx = Math.floor(P.x / TS), pty = Math.floor((P.y - 4) / TS), ahead = Math.floor((P.y - TS * 0.62) / TS);
  if (alive){
    for (const tr of W.traps) if (tr.tx === ptx && tr.ty === pty && trapUp(tr, gameT) && P.inv <= 0 && P.dashT < 0) hurtPlayer(Math.max(1, Math.round(1.5 * (1 + 0.25 * (W.floor - 1)))), 0, 0.5);
    const c = at(ptx, ahead);
    P.lock = Math.max(0, (P.lock || 0) - dt);
    if (P.dy < -0.3 && P.lock <= 0){
      if (c === 'A'){ joy.id = null; joy.dx = joy.dy = 0; keys['w'] = keys['arrowup'] = false; P.y += TS * 0.3; openGate(); }
      else if (c === '<'){ enterTown(); toast('마을로 돌아왔어요'); }
      else if (c === '>'){
        const n = W.floor;
        if (!W.bossDead){ if (toastT <= 0) toast('계단이 막혀 있어요', MDEF[floorDef(n).boss].boss + '를 쓰러뜨리면 열려요'); }
        else if (n >= NF) ending();
        else if (n % FPT === 0 && S.rank < tierOf(n)){ if (toastT <= 0) toast('길드 승급이 필요해요', '마을 길드에서 ' + RANKN[tierOf(n)] + ' 등급 승급 시험을 보세요'); }
        else enterFloor(n + 1);
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
    if ((pk.kind === 'coin' && d < TS * 2.2) || (pk.kind === 'item' && d < TS * 1.4)){ const k = pk.kind === 'coin' ? 6 : 4; pk.x += (P.x - pk.x) * Math.min(1, dt * k); pk.y += (P.y - pk.y) * Math.min(1, dt * k); }
    if (d < TS * 0.55){
      if (pk.kind === 'item'){ if (takeItem(pk)) pk.got = true; }
      else {
        pk.got = true;
        if (pk.kind === 'coin'){ S.coins += pk.v; }
        else { const v = Math.max(2, Math.round(maxHp() * 0.15)) * (stats().uq.miser ? 3 : 1); P.hp = Math.min(maxHp(), P.hp + v); popText(P.x, P.y - TS * 1.8, '+' + v, '#ff8fa0'); }
      }
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
      else { s.life = 0; if (hit) hurtMon(hit, s.dmg, s.crit); else poof(s.x, s.y, '#d8c8a0', 4); }
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
    if (alive && P.inv <= 0 && P.dashT < 0 && dist < m.d.r + R + 6){ hurtPlayer(Math.max(1, Math.round(m.d.dmg * m.dm)), dx / dist, dy / dist); m.cool = 0.9; m.charging = 0; }
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
  const kind = stats().kind, key = wpnKey();
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
    if (pk.kind === 'item'){
      const it = pk.it, im = IMG.ic[iconKey(it)], c = RARCOL[it.rar];
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (it.rar >= 2){ const g = ctx.createLinearGradient(0, pk.y - 62, 0, pk.y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, c);
        ctx.globalAlpha = 0.7; ctx.fillStyle = g; ctx.fillRect(pk.x - 4, pk.y - 62, 8, 62); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(20,14,10,.6)'; ctx.beginPath(); ctx.arc(pk.x, by - 4, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pk.x, by - 4, 15, 0, Math.PI * 2); ctx.stroke();
      if (im && im.complete && im.naturalWidth){ const sc = 24 / Math.max(im.naturalWidth, im.naturalHeight); ctx.drawImage(im, pk.x - im.naturalWidth * sc / 2, by - 4 - im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc); }
      continue;
    }
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
  $('hpTxt').textContent = Math.ceil(P.hp); $('mpTxt').textContent = Math.floor(P.mp);
  $('cdSkill').style.setProperty('--cd', (P.skillCd / 0.6).toFixed(3)); $('cdDash').style.setProperty('--cd', (P.dashCd / 0.8).toFixed(3));
  $('cdAtk').style.setProperty('--cd', (P.atkCd / stats().cdEff).toFixed(3));
  $('bSkill').classList.toggle('nomp', P.mp < skillCost());
  if (S.coins !== lastCoins){ $('coins').textContent = S.coins; lastCoins = S.coins; }
}
let last = performance.now();
function loop(now){ const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(now / 1000); hud(); requestAnimationFrame(loop); }
window.__G = { get P(){ return P; }, get W(){ return W; }, get S(){ return S; }, enterFloor, enterTown, makeItem, dropItem, stats, openBag, simDrops, itemName };
titleScreen();
requestAnimationFrame(loop);
})();
