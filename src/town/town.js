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
$('msg').style.backgroundImage = `url(${A.ui['04']})`;

// ---- 충돌 상자 ----
const solids = [], spots = [], sprites = [];
for (const b of A.blds){
  const gate = b.k === 'gate_twin_tower';
  const fw = b.w * (gate ? 0.46 : b.k === 'watchtower' ? 0.5 : 0.8);
  if (gate){ // 성문은 양쪽 탑만 막고 가운데는 문 앞까지 걸어갈 수 있게
    solids.push({ x0: b.x - b.w * 0.48, x1: b.x - b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x + b.w * 0.17, x1: b.x + b.w * 0.48, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.05 });
    solids.push({ x0: b.x - b.w * 0.17, x1: b.x + b.w * 0.17, y0: b.y - b.h * 0.42, y1: b.y - b.h * 0.2 });
  } else solids.push({ x0: b.x - fw / 2, x1: b.x + fw / 2, y0: b.y - b.h * 0.36, y1: b.y - b.h * 0.1 });
  sprites.push({ img: BI[b.k], x: b.x, y: b.y, w: b.w, h: b.h, key: b.y - b.h * 0.1 });
  if (b.k !== 'watchtower') spots.push({ name: b.name, x: b.x + b.door * b.w, y: b.y - b.h * (gate ? 0.18 : 0.06), r: 46, kind: gate ? 'gate' : 'bld' });
}
for (const p of A.props){
  solids.push({ x0: p.x - p.w * 0.42, x1: p.x + p.w * 0.42, y0: p.y - Math.min(p.h, 30) * 0.6, y1: p.y - 2 });
  sprites.push({ img: BI[p.k], x: p.x, y: p.y, w: p.w, h: p.h, key: p.y });
  if (p.name) spots.push({ name: p.name, x: p.x, y: p.y + 14, r: 44, kind: 'board' });
}

// ---- 플레이어 ----
const P = { x: 23 * TS, y: 22 * TS, r: 11, dir: 'front', flip: false, moving: false, t: 0 };
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

// ---- 입력 ----
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key.toLowerCase() === 'e') act(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 }, stick = $('stick'), knob = $('knob');
$('joy').addEventListener('pointerdown', e => {
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

// ---- 살펴보기 ----
let near = null, paused = false;
function act(){
  if (paused){ closeMsg(); return; }
  if (!near) return;
  const body = near.kind === 'gate' ? '던전 문은 다음 단계에서 연결합니다.'
    : near.kind === 'board' ? '길드 의뢰가 붙는 곳입니다. 의뢰는 다음 단계에서 붙입니다.'
    : '실내는 다음 단계에서 만듭니다.';
  $('msgT').textContent = near.name; $('msgB').textContent = body;
  $('msg').style.display = 'block'; paused = true;
}
function closeMsg(){ $('msg').style.display = 'none'; paused = false; }
$('msgOk').addEventListener('click', closeMsg);

// ---- 화면 ----
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
  for (const s of solids) mx.fillRect(s.x0 * sx, s.y0 * sy - 6, (s.x1 - s.x0) * sx, (s.y1 - s.y0) * sy + 6);
  mx.strokeStyle = '#fff8'; mx.lineWidth = 2;
  mx.strokeRect(camX * sx, camY * sy, VW / Z * sx, VH / Z * sy);
  mx.fillStyle = '#ff3b2f'; mx.strokeStyle = '#fff'; mx.beginPath(); mx.arc(P.x * sx, P.y * sy, 5, 0, 7); mx.fill(); mx.stroke();
}

let last = performance.now();
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // 이동
  let dx = joy.dx, dy = joy.dy;
  if (keys.a || keys.arrowleft) dx = -1; if (keys.d || keys.arrowright) dx = 1;
  if (keys.w || keys.arrowup) dy = -1; if (keys.s || keys.arrowdown) dy = 1;
  const mag = Math.hypot(dx, dy);
  P.moving = !paused && mag > 0.15;
  if (P.moving){
    const sp = 165 * Math.min(1, mag);
    move(dx / mag * sp * dt, dy / mag * sp * dt);
    if (Math.abs(dx) > Math.abs(dy)){ P.dir = 'side'; P.flip = dx < 0; } else P.dir = dy < 0 ? 'back' : 'front';
    P.t += dt;
  } else P.t = 0;
  // 가까운 곳
  near = null; let bd = 1e9;
  for (const s of spots){ const d = Math.hypot(P.x - s.x, P.y - s.y); if (d < s.r && d < bd){ bd = d; near = s; } }
  $('act').classList.toggle('on', !!near);

  // 카메라
  let camX = P.x - VW / Z / 2, camY = P.y - 30 - VH / Z / 2;
  camX = Math.max(0, Math.min(MWp - VW / Z, camX)); camY = Math.max(0, Math.min(MHp - VH / Z, camY));
  if (VW / Z > MWp) camX = (MWp - VW / Z) / 2;
  ctx.setTransform(dpr * Z, 0, 0, dpr * Z, -camX * dpr * Z, -camY * dpr * Z);
  ctx.fillStyle = '#1d1510'; ctx.fillRect(camX, camY, VW / Z, VH / Z);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(G, 0, 0, MWp, MHp);

  // 정렬해서 그리기
  const list = sprites.filter(s => s.x + s.w / 2 > camX && s.x - s.w / 2 < camX + VW / Z && s.y > camY && s.y - s.h < camY + VH / Z);
  list.push({ me: true, key: P.y });
  list.sort((a, b) => a.key - b.key);
  for (const s of list){
    if (s.me){ drawMe(); continue; }
    ctx.drawImage(s.img, s.x - s.w / 2, s.y - s.h, s.w, s.h);
  }

  // 이름표
  const tag = $('tag');
  if (near){
    tag.style.display = 'block'; tag.textContent = near.name;
    tag.style.left = ((P.x - camX) * Z) + 'px'; tag.style.top = ((P.y - 104 - camY) * Z) + 'px';
  } else tag.style.display = 'none';
  drawMini(camX, camY);
  requestAnimationFrame(frame);
}
function drawMe(){
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 17, 6, 0, 0, 7); ctx.fill();
  const fr = EL[P.dir][P.moving ? 1 + (Math.floor(P.t * 9) % 4) : 0];
  const h = 98, w = h * 170 / 172, by = P.y + h * (11 / 344);
  ctx.save();
  if (P.flip && P.dir === 'side'){ ctx.translate(P.x, 0); ctx.scale(-1, 1); ctx.translate(-P.x, 0); }
  ctx.drawImage(fr, P.x - w / 2, by - h, w, h);
  ctx.restore();
}
window.__P = P;
requestAnimationFrame(frame);
})();
