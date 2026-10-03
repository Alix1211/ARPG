(function(){
'use strict';
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const M = A.map, TS = M.ts, MWp = M.w * TS, MHp = M.h * TS;
function load(s){ const i = new Image(); i.src = s; return i; }
const G = load(A.ground), MINI = load(A.mini);
const BI = {}; for (const k in A.b) BI[k] = load(A.b[k]);
const EL = {}; for (const d in A.elf) EL[d] = A.elf[d].map(load);
$('face').src = A.face; $('ringImg').src = A.ui['05'];
$('tag').style.backgroundImage = `url(${A.ui['06']})`;
document.documentElement.style.setProperty('--panel', `url(${A.ui['04']})`);
document.documentElement.style.setProperty('--slot', `url(${A.ui['14']})`);
document.documentElement.style.setProperty('--slotOn', `url(${A.ui['15']})`);
document.documentElement.style.setProperty('--banner', `url(${A.ui['06']})`);
const rand = (a, b) => a + Math.random() * (b - a);

// ======================= 배치 =======================
const solids = [], spots = [], sprites = [], trees = [];
const hasNpc = new Set(A.npcs.map(n => n.at).filter(Boolean));
for (const b of A.blds){
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
for (const p of A.props){
  if (p.cw > 0) solids.push({ x0: p.x - p.w * p.cw / 2, x1: p.x + p.w * p.cw / 2, y0: p.y - p.cd, y1: p.y - 2 });
  const s = { img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.y - 4, tree: p.tree, ph: Math.random() * 7, pink: p.k === 'tree_blossom' };
  sprites.push(s); if (p.tree) trees.push(s);
  if (p.name) spots.push({ name: p.name, x: p.x, y: p.y + 16, r: 46, kind: 'prop' });
}
const npcs = A.npcs.map(n => ({ ...n, img: BI[n.k], ph: Math.random() * 7, key: n.y }));
for (const n of npcs){
  solids.push({ x0: n.x - 13, x1: n.x + 13, y0: n.y - 12, y1: n.y - 1 });
  sprites.push(n);
  spots.push({ name: n.name, x: n.x, y: n.y + 6, r: 50, kind: 'npc', npc: n });
}

// ======================= 플레이어 =======================
const P = { x: 23 * TS, y: 22.2 * TS, r: 11, dir: 'back', flip: false, moving: false, t: 0, gold: 300 };
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
$('act').addEventListener('pointerdown', e => { e.preventDefault(); act(); });
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
function closeAll(){ for (const id of ['msg', 'dlg', 'shop']) $(id).classList.remove('on'); panel = null; }
function act(){
  if (panel === 'msg' || panel === 'dlg'){ closeAll(); return; }
  if (panel) return;
  if (!near) return;
  if (near.kind === 'npc') return openDlg(near.npc);
  const body = near.kind === 'gate' ? '던전 문은 다음 단계에서 연결합니다.'
    : near.kind === 'prop' ? PROP_TXT[near.name] || ''
    : '실내는 다음 단계에서 만듭니다.';
  $('msgT').textContent = near.name; $('msgB').textContent = body; show('msg');
}
function openDlg(n){
  talking = n;
  $('dlgImg').src = A.port[n.k]; $('dlgName').textContent = n.name; $('dlgTitle').textContent = n.title;
  $('dlgLine').textContent = n.line;
  $('dlgTrade').hidden = !n.shop;
  show('dlg');
}
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeAll);
$('dlgTrade').addEventListener('click', () => openShop(talking));

// 가게 물건 (가안 가격)
const WN = { sword: '검', spear: '창', gauntlet: '건틀릿', bow: '활', staff: '지팡이' };
const GOODS = {
  arms: [].concat(
    ...['sword', 'spear', 'gauntlet', 'bow', 'staff'].map(t => [
      { ic: t + '_01', name: '나무 ' + WN[t], slot: '무기', price: 30 },
      { ic: t + '_02', name: '낡은 ' + WN[t], slot: '무기', price: 75 }]),
    [{ ic: 'armor_0', name: '낡은 투구', slot: '투구', price: 40 }, { ic: 'armor_1', name: '낡은 갑옷', slot: '갑옷', price: 70 },
     { ic: 'armor_2', name: '낡은 장갑', slot: '장갑', price: 30 }, { ic: 'armor_3', name: '낡은 신발', slot: '신발', price: 30 }]),
  pawn: [{ ic: 'ring', name: '구리 반지', slot: '반지', price: 120 }, { ic: 'neck', name: '구리 목걸이', slot: '목걸이', price: 150 }],
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
  setGold(P.gold - sel.price);
  $('shopSay').textContent = `${sel.name}을(를) 샀습니다. 금화가 ${sel.price}닢 줄었습니다… (엘프가 지갑을 오래 쳐다봅니다)`;
  $('buy').disabled = P.gold < sel.price;
});

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
const lamps = A.props.filter(p => p.k.startsWith('lamp')).map(p => ({ x: p.x + (p.k === 'lamp_iron' ? p.w * 0.28 : p.w * 0.3), y: p.y - p.h * 0.8, r: 120 }));
$('place').addEventListener('click', () => { DAY.t = (Math.floor(DAY.t * 5 + 1) % 5) / 5 + 0.02; });
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
  const nm = '마을 · ' + dayName(DAY.t);
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
  for (const b of A.blds){ const fw = b.w * 0.8; mx.fillRect((b.x - fw / 2) * sx, (b.y - b.h * 0.42) * sy, fw * sx, b.h * 0.34 * sy); }
  mx.fillStyle = '#ffe08a';
  for (const n of npcs){ mx.beginPath(); mx.arc(n.x * sx, n.y * sy, 2.5, 0, 7); mx.fill(); }
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
  P.moving = !panel && mag > 0.15;
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
  $('act').classList.toggle('on', !!near && !panel);
  $('act').textContent = near && near.kind === 'npc' ? '말 걸기' : '살펴보기';

  const vw = VW / Z, vh = VH / Z;
  let camX = P.x - vw / 2, camY = P.y - 30 - vh / 2;
  camX = Math.max(0, Math.min(MWp - vw, camX)); camY = Math.max(0, Math.min(MHp - vh, camY));
  weather(dt, camX, camY, vw, vh);

  ctx.setTransform(dpr * Z, 0, 0, dpr * Z, -camX * dpr * Z, -camY * dpr * Z);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(G, 0, 0, MWp, MHp);
  drawGroundFx();

  const list = sprites.filter(s => s.x + s.w / 2 > camX && s.x - s.w / 2 < camX + vw && s.y > camY && s.y - s.h < camY + vh);
  list.push({ me: true, key: P.y });
  list.sort((a, b) => a.key - b.key);
  for (const s of list){
    if (s.me){ drawMe(); continue; }
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
  requestAnimationFrame(frame);
}
function drawMe(){
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 17, 6, 0, 0, 7); ctx.fill();
  const fr = EL[P.dir][P.moving ? 1 + (Math.floor(P.t * (P.run ? 14 : 9)) % 4) : 0];
  const h = 98, w = h * 170 / 172, by = P.y + h * (11 / 344);
  ctx.save();
  if (P.flip && P.dir === 'side'){ ctx.translate(P.x, 0); ctx.scale(-1, 1); ctx.translate(-P.x, 0); }
  ctx.drawImage(fr, P.x - w / 2, by - h, w, h);
  ctx.restore();
}
window.__P = P; window.__W = W; window.__D = DAY;
requestAnimationFrame(frame);
})();
