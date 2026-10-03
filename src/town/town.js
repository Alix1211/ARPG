(function(){
'use strict';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const TS = A.map.ts; let MWp = 0, MHp = 0;
function load(s){ const i = new Image(); i.src = s; return i; }
const MAPS = {
  town: { name: '마을', map: A.map, ground: A.ground, mini: A.mini, blds: A.blds, props: A.props, npcs: A.npcs },
  out: { ...A.out },
};
let G = null, MINI = null, MAP = 'town', CUR = MAPS.town;
for (const id in MAPS){ MAPS[id].G = load(MAPS[id].ground); MAPS[id].MINI = load(MAPS[id].mini); }
const BI = {}; for (const k in A.b) BI[k] = load(A.b[k]);
const EL = {}; for (const d in A.elf) EL[d] = A.elf[d].map(load);
$('face').src = A.face; $('ringImg').src = A.ui['05'];
$('tag').style.backgroundImage = `url(${A.ui['06']})`;
document.documentElement.style.setProperty('--panel', `url(${A.ui['04']})`);
document.documentElement.style.setProperty('--slot', `url(${A.ui['14']})`);
document.documentElement.style.setProperty('--slotOn', `url(${A.ui['15']})`);
document.documentElement.style.setProperty('--banner', `url(${A.ui['06']})`);
for (const [v, k] of [['--oct', '18'], ['--x', 'h_close'], ['--tab0', 'h_bag'], ['--swapI', 'h_swap']]) document.documentElement.style.setProperty(v, `url(${A.kit[k]})`);
$('tabEq').style.backgroundImage = `url(${A.kit.tab1})`; $('tabSt').style.backgroundImage = `url(${A.kit.tab4})`;
const rand = (a, b) => a + Math.random() * (b - a);

// ======================= 배치 =======================
const solids = [], spots = [], sprites = [], trees = [], npcs = [], dummies = [];
let lamps = [];
function buildWorld(id){
  MAP = id; CUR = MAPS[id]; G = CUR.G; MINI = CUR.MINI; MWp = CUR.map.w * TS; MHp = CUR.map.h * TS;
  for (const L of [solids, spots, sprites, trees, npcs, dummies]) L.length = 0;
const hasNpc = new Set(CUR.npcs.map(n => n.at).filter(Boolean));
for (const b of CUR.blds){
  const gate = b.k === 'gate_twin_tower';
  const fw = b.w * (b.k === 'watchtower' ? 0.5 : 0.8);
  if (gate){ // 성문은 양쪽 탑만 막고 가운데는 문 앞까지 걸어갈 수 있게
    solids.push({ x0: b.x - b.w * 0.48, x1: b.x - b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x + b.w * 0.17, x1: b.x + b.w * 0.48, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x - b.w * 0.17, x1: b.x + b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.2 });
  } else solids.push({ x0: b.x - fw / 2, x1: b.x + fw / 2, y0: b.y - b.h * 0.36, y1: b.y - b.h * 0.1 });
  sprites.push({ img: BI[b.k], x: b.x, y: b.y, w: b.w, h: b.h, key: b.y - b.h * 0.1 });
  if (b.k === 'watchtower' || hasNpc.has(b.k)) continue;
  spots.push({ name: b.name, x: b.x + b.door * b.w, y: b.y - b.h * (gate ? 0.18 : 0.06), r: 46, kind: gate ? 'gate' : 'bld' });
}
for (const p of CUR.props){
  if (p.kind === 'gatewall'){ // 성벽: 가운데 문만 비우고 막음
    solids.push({ x0: p.x - p.w * 0.5, x1: p.x - p.w * 0.1, y0: p.y - p.h * 0.45, y1: p.y - 4 }, { x0: p.x + p.w * 0.1, x1: p.x + p.w * 0.5, y0: p.y - p.h * 0.45, y1: p.y - 4 }, { x0: p.x - p.w * 0.1, x1: p.x + p.w * 0.1, y0: p.y - p.h * 0.45, y1: p.y - p.h * 0.12 });
    sprites.push({ img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.y - 6 });
    spots.push({ name: p.name, x: p.x, y: p.y - p.h * 0.08, r: 46, kind: 'exit' });
    continue;
  }
  if (p.cw > 0) solids.push({ x0: p.x - p.w * p.cw / 2, x1: p.x + p.w * p.cw / 2, y0: p.y - p.cd, y1: p.y - 2 });
  const s = { img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.y - 4, tree: p.tree, ph: Math.random() * 7, pink: p.k === 'tree_blossom' };
  sprites.push(s); if (p.tree) trees.push(s);
  if (p.kind === 'dummy'){ s.dummy = { hp: 0, wob: 0, ph: 0 }; dummies.push(s); }
  if (p.name) spots.push({ name: p.name, x: p.x, y: p.y + 16, r: 46, kind: p.kind === 'dungeon' ? 'dungeon' : 'prop' });
}
for (const n of CUR.npcs) npcs.push({ ...n, img: BI[n.k], ph: Math.random() * 7, key: n.y });
for (const n of npcs){
  solids.push({ x0: n.x - 13, x1: n.x + 13, y0: n.y - 12, y1: n.y - 1 });
  sprites.push(n);
  spots.push({ name: n.name, x: n.x, y: n.y + 6, r: 50, kind: 'npc', npc: n });
}
  lamps = CUR.props.filter(p => p.k.startsWith('lamp') || p.kind === 'fire').map(p => p.kind === 'fire' ? { x: p.x, y: p.y - p.h * 0.45, r: 150 } : { x: p.x + (p.k === 'lamp_iron' ? p.w * 0.28 : p.w * 0.3), y: p.y - p.h * 0.8, r: 120 });
  $('place').dataset.map = CUR.name || '마을';
}
buildWorld('town');

// ======================= 플레이어 =======================
const P = { x: 23 * TS, y: 22.2 * TS, r: 11, dir: 'back', flip: false, moving: false, t: 0, gold: 300, hp: 40, mp: 28, maxHp: 40, maxMp: 28, lv: 1, exp: 0 };
function blocked(x, y){
  if (x < P.r || y < P.r + 20 || x > MWp - P.r || y > MHp - 6) return true;
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
function setGold(v){ P.gold = v; $('gold').textContent = '금화 ' + v; $('shopGold').textContent = v; }
setGold(P.gold);

// ======================= 입력 =======================
const keys = {};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (k === ' ' || k === 'e' || k === 'enter') act();
  if (k === 'escape') closeAll();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }, stick = $('stick'), knob = $('knob');
$('joy').addEventListener('pointerdown', e => {
  if (panel) return;
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
  stick.style.display = 'block'; stick.style.left = (e.clientX - 55) + 'px'; stick.style.top = (e.clientY - 55) + 'px';
  knob.style.transform = '';
});
addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy), m = 44;
  if (d > m){ dx *= m / d; dy *= m / d; }
  joy.dx = dx / m; joy.dy = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => { if (e.pointerId === joy.id){ joy.id = null; joy.dx = joy.dy = 0; stick.style.display = 'none'; } };
addEventListener('pointerup', endJoy); addEventListener('pointercancel', endJoy);
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
function show(id){ closeAll(); panel = id; $(id).classList.add('on'); joy.id = null; joy.dx = joy.dy = 0; stick.style.display = 'none'; }
function closeAll(){ for (const id of ['msg', 'dlg', 'shop']) $(id).classList.remove('on'); if (window.UI && UI.isOpen()) UI.close(); panel = null; }
function act(){
  if (panel === 'msg' || panel === 'dlg'){ closeAll(); return; }
  if (panel) return;
  if (!near) return;
  if (near.kind === 'npc') return openDlg(near.npc);
  if (near.kind === 'gate') return travel('out', MAPS.out.spawn, 'front');
  if (near.kind === 'exit') return travel('town', MAPS.out.back, 'front');
  const body = near.kind === 'dungeon' ? '던전은 다음 단계에서 연결합니다.'
    : near.kind === 'prop' ? ((MAP === 'out' && OUT_TXT[near.name]) || PROP_TXT[near.name] || '')
    : '실내는 다음 단계에서 만듭니다.';
  $('msgT').textContent = near.name; $('msgB').textContent = body; show('msg');
}
const OUT_TXT = { '이정표': '↑ 마을   ← 필드   → 던전', '연습용 허수아비': '마음껏 때려 보세요. 허수아비는 불평하지 않습니다.' };
// 장소 이동(어두워졌다 밝아짐)
let traveling = false;
function travel(id, pos, dir){
  if (traveling) return; traveling = true; closeAll();
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => {
    buildWorld(id); P.x = pos[0]; P.y = pos[1]; P.dir = dir || 'front'; P.atk = null;
    setTimeout(() => { f.classList.remove('on'); traveling = false; }, 120);
  }, 320);
}
function openDlg(n){
  talking = n;
  $('dlgImg').src = A.port[n.k]; $('dlgName').textContent = n.name; $('dlgTitle').textContent = n.title;
  $('dlgLine').textContent = n.line;
  $('dlgTrade').hidden = !n.shop && !n.go;
  $('dlgTrade').textContent = n.go === 'field' ? '지역 고르기' : n.go === 'dungeon' ? '던전으로' : '거래';
  show('dlg');
}
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeAll);
$('dlgTrade').addEventListener('click', () => {
  if (talking.go){ $('msgT').textContent = talking.go === 'field' ? '지역 고르기' : '던전으로';
    $('msgB').textContent = talking.go === 'field' ? '지역 선택창(봄 초원·여름 숲·…)은 다음 단계에서 붙입니다.' : '던전은 다음 단계에서 연결합니다.'; show('msg'); return; }
  openShop(talking);
});

// 가게 물건 (가안 가격)
const WN = { sword: '검', spear: '창', gauntlet: '건틀릿', bow: '활', staff: '지팡이' };
const GOODS = {
  arms: [].concat(
    ...['sword', 'spear', 'gauntlet', 'bow', 'staff'].map(t => [
      { ic: t + '_01', name: '나무 ' + WN[t], slot: '무기', price: 30, spec: { kind: 'weapon', wt: t, g: 1 } },
      { ic: t + '_02', name: '낡은 ' + WN[t], slot: '무기', price: 75, spec: { kind: 'weapon', wt: t, g: 2 } }]),
    [{ ic: 'armor_0', name: '낡은 투구', slot: '투구', price: 40, spec: { kind: 'head', g: 2 } }, { ic: 'armor_1', name: '낡은 갑옷', slot: '갑옷', price: 70, spec: { kind: 'body', g: 2 } },
     { ic: 'armor_2', name: '낡은 장갑', slot: '장갑', price: 30, spec: { kind: 'hands', g: 2 } }, { ic: 'armor_3', name: '낡은 신발', slot: '신발', price: 30, spec: { kind: 'feet', g: 2 } }]),
  pawn: [{ ic: 'ring', name: '구리 반지', slot: '반지', price: 120, spec: { kind: 'ring' } }, { ic: 'neck', name: '구리 목걸이', slot: '목걸이', price: 150, spec: { kind: 'neck' } }],
};
let sel = null;
function openShop(n){
  const list = GOODS[n.shop] || [];
  $('shopName').textContent = n.title.replace(' 주인', '');
  $('shopImg').src = A.port[n.k];
  const g = $('grid'); g.innerHTML = '';
  list.forEach((it, i) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'cell';
    const im = document.createElement('img'); im.src = A.icons[it.ic]; im.alt = it.name; c.append(im);
    const pr = document.createElement('span'); pr.textContent = it.price; c.append(pr);
    c.addEventListener('click', () => pick(it, c));
    g.append(c);
    if (i === 0) setTimeout(() => pick(it, c));
  });
  show('shop');
}
function pick(it, c){
  sel = it;
  for (const x of document.querySelectorAll('.cell')) x.classList.toggle('sel', x === c);
  $('infoIc').src = A.icons[it.ic]; $('infoName').textContent = it.name;
  $('infoSlot').textContent = it.slot + ' · 일반';
  $('infoPrice').textContent = '금화 ' + it.price;
  $('buy').disabled = P.gold < it.price;
  $('shopSay').textContent = '';
}
$('buy').addEventListener('click', () => {
  if (!sel || P.gold < sel.price) return;
  if (UI.bagFull()){ $('shopSay').textContent = '가방이 가득 찼습니다.'; return; }
  setGold(P.gold - sel.price);
  UI.add(UI.make({ ...sel.spec, price: sel.price }));
  $('shopSay').textContent = `${sel.name}을(를) 가방에 넣었습니다. 금화가 ${sel.price}닢 줄었습니다… (엘프가 지갑을 오래 쳐다봅니다)`;
  $('buy').disabled = P.gold < sel.price;
});


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
function drawFx(dt){ drawShots(dt); }
function drawBubble(dt, camX, camY){
  const b = $('bubble');
  if (!bubble){ b.style.display = 'none'; return; }
  bubble.t += dt; if (bubble.t > 1.8){ bubble = null; b.style.display = 'none'; return; }
  b.style.display = 'block'; b.textContent = bubble.txt;
  b.style.left = ((P.x - camX) * Z) + 'px'; b.style.top = ((P.y - 112 - camY) * Z) + 'px';
}
function setMax(h, m){ P.maxHp = h; P.maxMp = m; P.hp = Math.min(P.hp, h); P.mp = Math.min(P.mp, m); if (P.hp < 1) P.hp = h; syncBars(); }
function syncBars(){
  document.querySelector('.bar.hp i').style.width = (P.hp / P.maxHp * 100) + '%';
  document.querySelector('.bar.mp i').style.width = (P.mp / P.maxMp * 100) + '%';
  $('hpTxt').textContent = `${P.hp} / ${P.maxHp}`; $('mpTxt').textContent = `${P.mp} / ${P.maxMp}`;
}
window.GAME = { P, setWeapon, setGold, near: () => (panel ? null : near), act, closeAll, isOpen: () => !!panel, setOpen: v => { panel = v; }, swing, say, setMax };

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
  mx.strokeStyle = '#fff8'; mx.lineWidth = 2;
  mx.strokeRect(camX * sx, camY * sy, VW / Z * sx, VH / Z * sy);
  mx.fillStyle = '#ff3b2f'; mx.strokeStyle = '#fff'; mx.beginPath(); mx.arc(P.x * sx, P.y * sy, 5, 0, 7); mx.fill(); mx.stroke();
}

let last = performance.now(), T = 0;
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  let dx = joy.dx, dy = joy.dy;
  if (keys.a || keys.arrowleft) dx = -1; if (keys.d || keys.arrowright) dx = 1;
  if (keys.w || keys.arrowup) dy = -1; if (keys.s || keys.arrowdown) dy = 1;
  const mag = Math.hypot(dx, dy);
  P.moving = !panel && mag > 0.15 && !atkBusy();
  if (P.moving){
    // 조이스틱을 끝까지 밀면 뛰기, 키보드는 기본 뛰기(Shift 누르면 걷기)
    const kb = !joy.dx && !joy.dy;
    P.run = kb ? !keys.shift : mag > 0.82;
    const sp = P.run ? 320 : 165 * Math.min(1, mag / 0.82);
    move(dx / mag * sp * dt, dy / mag * sp * dt);
    if (Math.abs(dx) > Math.abs(dy)){ P.dir = 'side'; P.flip = dx < 0; } else P.dir = dy < 0 ? 'back' : 'front';
    P.t += dt;
  } else P.t = 0;
  near = null; let bd = 1e9;
  for (const s of spots){ const d = Math.hypot(P.x - s.x, P.y - s.y); if (d < s.r && d < bd){ bd = d; near = s; } }

  const vw = VW / Z, vh = VH / Z;
  let camX = P.x - vw / 2, camY = P.y - 30 - vh / 2;
  camX = Math.max(0, Math.min(MWp - vw, camX)); camY = Math.max(0, Math.min(MHp - vh, camY));
  weather(dt, camX, camY, vw, vh);
  updAtk(dt);
  if (MAP === 'town') updVils(dt, dayLook(DAY.t).lamp > 0.6);

  ctx.setTransform(dpr * Z, 0, 0, dpr * Z, -camX * dpr * Z, -camY * dpr * Z);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(G, 0, 0, MWp, MHp);
  drawGroundFx();

  const list = sprites.filter(s => s.x + s.w / 2 > camX && s.x - s.w / 2 < camX + vw && s.y > camY && s.y - s.h < camY + vh);
  list.push({ me: true, key: P.y });
  if (MAP === 'town') for (const v of vils) if (!v.hidden) list.push({ vil: v, key: v.y });
  list.sort((a, b) => a.key - b.key);
  for (const s of list){
    if (s.me){ drawMe(); continue; }
    if (s.vil){ drawVil(s.vil); continue; }
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
      ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h * br, s.w, s.h * br); continue;
    }
    ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h, s.w, s.h);
  }
  drawLeaves();
  drawFx(dt);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  DAY.t = (DAY.t + dt / DAYLEN) % 1;
  drawDay(camX, camY);
  drawRain(VW, VH);

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
let WPN = null;
function setWeapon(it){ WPN = it ? { wt: it.wt, img: WIMG[it.icon], dmg: it.st.atk || it.st.matk || 1 } : null; }
const WL = { sword: 60, spear: 94, bow: 62, staff: 80, gauntlet: 24 };      // 화면에서의 길이
const GRIP = { sword: 0.84, spear: 0.7, bow: 0.5, staff: 0.72, gauntlet: 0.5 }; // 손잡이 위치(위에서부터 비율)
const DUR = { sword: 0.32, spear: 0.36, bow: 0.42, staff: 0.46, gauntlet: 0.22 };
const PI = Math.PI;
function wDraw(x, y, ang, sc = 1, mir = false){
  const im = WPN && WPN.img; if (!im || !im.complete || !im.naturalWidth) return;
  const L = WL[WPN.wt] * sc, w = L * im.naturalWidth / im.naturalHeight;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (mir) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -L * GRIP[WPN.wt], w, L); ctx.restore();
}
const shots = [];
function attack(){
  if (!WPN){ say('맨손입니다'); return; }
  if (P.atk && P.atk.t < DUR[P.atk.wt] * 0.75) return;
  P.atk = { t: 0, wt: WPN.wt, dir: P.dir, flip: P.flip, n: P.atk ? P.atk.n + 1 : 0, shot: false };
}
function swing(){ attack(); }
const atkBusy = () => !!P.atk && P.atk.t < DUR[P.atk.wt];
function updAtk(dt){
  if (!P.atk) return;
  const a = P.atk; a.t += dt;
  const k = a.t / DUR[a.wt];
  if (!a.hit && k > 0.45 && a.wt !== 'bow' && a.wt !== 'staff'){
    a.hit = true;
    const d = a.dir === 'front' ? [0, 1] : a.dir === 'back' ? [0, -1] : [a.flip ? -1 : 1, 0];
    const reach = { sword: 78, spear: 104, gauntlet: 66 }[a.wt];
    for (const t of dummies){
      const dx = t.x - P.x, dy = (t.y - 30) - (P.y - 30), along = dx * d[0] + dy * d[1], side = Math.abs(dx * d[1] - dy * d[0]);
      if (along > -10 && along < reach && side < 46) hitDummy(t, d);
    }
  }
  if (!a.shot && k > 0.45 && (a.wt === 'bow' || a.wt === 'staff')){
    a.shot = true;
    const d = a.dir === 'front' ? [0, 1] : a.dir === 'back' ? [0, -1] : [a.flip ? -1 : 1, 0];
    const ox = a.dir === 'side' ? d[0] * 30 : 0, oy = a.dir === 'front' ? -34 : a.dir === 'back' ? -80 : -44;
    shots.push({ x: P.x + ox, y: P.y + oy, vx: d[0] * 520, vy: d[1] * 520, t: 0, kind: a.wt });
  }
  if (k > 1.2) P.atk = null;
}
function hitDummy(t, d){
  const dm = WPN ? WPN.dmg : 1, crit = Math.random() < 0.1, v = crit ? dm * 2 : dm;
  t.dummy.wob = 1; t.dummy.dir = d[0] || (Math.random() < 0.5 ? -1 : 1);
  pops.push({ x: t.x + (Math.random() * 16 - 8), y: t.y - t.h * 0.75, t: 0, txt: String(v), crit });
}
const pops = [];
function drawPops(dt){
  for (const p of pops){
    p.t += dt; const k = p.t / 0.9;
    ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.font = `900 ${p.crit ? 26 : 20}px sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#2a140a'; ctx.fillStyle = p.crit ? '#ffcf3a' : '#fff4dc';
    const y = p.y - k * 34; ctx.strokeText(p.txt, p.x, y); ctx.fillText(p.txt, p.x, y);
  }
  ctx.globalAlpha = 1;
  while (pops.length && pops[0].t > 0.9) pops.shift();
}
function drawShots(dt){
  drawPops(dt);
  for (const s of shots){
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (!s.done) for (const t of dummies){ if (Math.abs(s.x - t.x) < 22 && s.y > t.y - t.h * 0.85 && s.y < t.y){ s.done = true; s.t = 0.5; hitDummy(t, [Math.sign(s.vx), 0]); break; } }
    const al = Math.max(0, 1 - s.t / 0.5); ctx.globalAlpha = al;
    const a = Math.atan2(s.vy, s.vx);
    if (s.kind === 'bow'){
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(8, 0); ctx.stroke();
      ctx.fillStyle = '#d8d8e0'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill();
      ctx.fillStyle = '#f3e6c8'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-27, -4); ctx.lineTo(-19, 0); ctx.lineTo(-27, 4); ctx.fill();
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 14);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#9fd8ff'); g.addColorStop(1, 'rgba(90,160,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  while (shots.length && shots[0].t > 0.5) shots.shift();
}
// 휘두름 궤적(초승달)
function arcFx(cx, cy, r, a0, a1, k){
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.globalAlpha = 0.85 * (1 - k); ctx.strokeStyle = '#fff6dc'; ctx.lineCap = 'round';
  ctx.lineWidth = 7 * (1 - k) + 1.5; ctx.beginPath();
  // 각도 0 = 위 → 캔버스 각도로 바꿈(-PI/2)
  ctx.arc(cx, cy, r, Math.min(a0, a1) - PI / 2, Math.max(a0, a1) - PI / 2); ctx.stroke(); ctx.restore();
}
const lerp = (a, b, t) => a + (b - a) * t;
// 찌르기 잔상(창 아래 공격)
function streak(x, y, dx, dy, t, r){
  if (t <= 0 || r >= 1) return;
  ctx.save(); ctx.globalAlpha = 0.9 * (1 - r); ctx.strokeStyle = '#fff6dc'; ctx.lineCap = 'round';
  ctx.lineWidth = 6 * (1 - r) + 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 60 * t, y + dy * 60 * t); ctx.stroke(); ctx.restore();
}
// 주먹 충격(건틀릿 아래 공격)
function burst(x, y, r){
  if (r >= 1) return;
  ctx.save(); ctx.globalAlpha = 1 - r; ctx.strokeStyle = '#fff1c8'; ctx.lineWidth = 3; const R0 = 6 + r * 16;
  for (let i = 0; i < 8; i++){ const a = i * PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R0 * 0.5, y + Math.sin(a) * R0 * 0.5); ctx.lineTo(x + Math.cos(a) * R0, y + Math.sin(a) * R0); ctx.stroke(); }
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
  const a = P.atk, k = Math.min(1, a.t / DUR[wt]), ph = phase(k), d = a.dir;
  const thrust = ph.s * (1 - ph.r), alt = a.n % 2 ? 1 : -1;
  out.lunge = d === 'side' ? [3 * thrust, 0] : d === 'front' ? [0, 3 * thrust] : [0, -3 * thrust];
  if (d === 'side'){ // 무기는 모두 몸 뒤
    if (wt === 'sword'){ const an = ph.s === 0 ? lerp(-0.6, -2.0, ph.w) : lerp(-2.0, 1.9, ph.s) - ph.r * 0.6;
      out.back = () => wDraw(x + 22, y - 32, an);
      out.front = () => arcFx(x + 22, y - 32, 52, -1.6, lerp(-1.6, 1.9, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1)); }
    else if (wt === 'spear') out.back = () => wDraw(x - 6 - 10 * (1 - ph.w) + 34 * thrust, y - 40, PI / 2);
    else if (wt === 'bow') out.back = () => wDraw(x + 20, y - 44, 0, 1, true);
    else if (wt === 'staff') out.back = () => wDraw(x + 26 + 8 * thrust, y - 42, lerp(0.35, 1.2, thrust) - 0.25 * ph.w * (1 - ph.s));
    else out.back = () => wDraw(x + 18 + 20 * thrust, y - 44 + (alt > 0 ? 8 : -2), -PI / 2, 1.1, true);  // 주먹(그림 아래쪽)이 앞을 향하게
  } else if (d === 'back'){
    if (wt === 'sword'){ const an = ph.s === 0 ? lerp(0, -1.5, ph.w) : lerp(-1.5, 1.5, ph.s);
      out.back = () => { wDraw(x + 4, y - 58, an); arcFx(x + 4, y - 58, 48, -1.5, lerp(-1.5, 1.5, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1)); }; }
    else if (wt === 'spear') out.back = () => wDraw(x + 7, y - 58 - 32 * thrust, 0);
    else if (wt === 'bow') out.back = () => wDraw(x, y - 80, PI / 2);
    else if (wt === 'staff') out.back = () => wDraw(x + 9, y - 60 - 8 * thrust, lerp(0.25, -0.1, thrust));
    else out.back = () => wDraw(x + 10 * alt, y - 70 - 16 * thrust, PI, 1.1);
  } else { // 정면(아래로 공격): 무기는 그리지 않고 이펙트만
    if (wt === 'sword') out.front = () => arcFx(x, y - 30, 46, PI - 1.4, lerp(PI - 1.4, PI + 1.4, ph.s), ph.r * 1.4 + (ph.s > 0 ? 0.01 : 1));
    else if (wt === 'spear') out.front = () => streak(x + 4, y - 30, 0, 1, thrust, ph.r);
    else if (wt === 'gauntlet') out.front = () => burst(x + 10 * alt, y - 18 + 14 * thrust, ph.s > 0 ? ph.r : 1);
  }
  return out;
}
function drawMe(){
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 17, 6, 0, 0, 7); ctx.fill();
  const busy = atkBusy(), dir = busy ? P.atk.dir : P.dir, flip = busy ? P.atk.flip : P.flip;
  const fr = EL[dir][!busy && P.moving ? 1 + (Math.floor(P.t * (P.run ? 14 : 9)) % 4) : 0];
  const h = 98, w = h * 170 / 172, by = P.y + h * (11 / 344);
  const L = weaponLayers();
  ctx.save();
  if (flip && dir === 'side'){ ctx.translate(P.x, 0); ctx.scale(-1, 1); ctx.translate(-P.x, 0); }
  if (L.back) L.back();
  ctx.drawImage(fr, P.x - w / 2 + L.lunge[0], by - h + L.lunge[1], w, h);
  if (L.front) L.front();
  ctx.restore();
}

P.hp = P.maxHp; P.mp = P.maxMp;
window.__P = P; window.__T = dummies; window.__W = W; window.__D = DAY; window.__V = vils;
requestAnimationFrame(frame);
})();
