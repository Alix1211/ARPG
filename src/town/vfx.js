// ======================= 전투 이펙트(VFX) =======================
// 시트에서 잘라 낸 그림(assets/vfx, tools/vfx_slice.py)으로 스킬·타격·몬스터 공격·상태이상을 그린다.
// 그림이 아직 안 불러졌으면 각 호출부가 예전 선 그림으로 대신 그린다(vfxReady).
const VFXI = {};
(function(){
  const src = (typeof A !== 'undefined' && A.vfx) || {};
  for (const k in src){ const im = new Image(); im.src = src[k]; VFXI[k] = im; }
})();
// 투사체 그림이 가리키는 방향(도, 캔버스 기준: 0=오른쪽, 90=아래). 날아가는 방향에 맞춰 돌릴 때 쓴다.
const VFX_HEAD = { shot_fire:145, shot_rock:155, shot_poison:150, shot_dark:142, shot_holy:155, shot_ice:-33, shot_blade:0 };
const VFX_STATUS = { burn:'fire', slow:'slow', freeze:'ice', stone:'stone', bleed:'blood' };

// 효과별 지속 시간(초). town.js의 drawSkillFx와 아래 바닥 층이 같이 쓴다.
const VFX_DUR = { holyshield:.65,resurrection:1.2, thunderstrike:.55, heal:.75, hit:.26, hurt:.3, kill:.6, fireburst:.7, iceburst:.65, icehit:.5, castfire:.75, castice:.75, slashpower:.42, spinpower:.45,
  firestorm:.75, frostwave:.65, chain:.4, voltburst:.5, darkburst:.6, poisonburst:.55, waveburst:.4, castdark:.75, castbolt:.75,
  spearthrust:.3,spearburst:.5,fistdash:.35,quake:.55 };

function vfxReady(n){ const im = VFXI[n]; return !!(im && im.complete && im.naturalWidth > 0); }
// n 그림을 (x,y)에 가로 w 크기로 그린다. o: rot(라디안) alpha add(밝게 겹치기) base(그림 아랫변을 y에 맞춤) sy(세로 눌림) flip
function vfxDraw(n, x, y, w, o){
  const im = VFXI[n]; if (!vfxReady(n)) return false;
  o = o || {};
  const h = w * im.naturalHeight / im.naturalWidth;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, o.alpha == null ? ctx.globalAlpha : o.alpha));
  if (o.add) ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.sy) ctx.scale(1, o.sy);
  if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(im, -w / 2, o.base ? -h : -h / 2, w, h);
  ctx.restore();
  return true;
}
// 한 번 터지는 연출: 작게 시작해 커지며 사라진다. k = 0~1 진행도
function vfxPlay(n, x, y, size, k, o){
  o = o || {};
  const s0 = o.s0 == null ? .55 : o.s0;
  const e = 1 - Math.pow(1 - Math.min(1, k * 1.7), 3);
  const w = size * (s0 + (1 - s0) * e) * (1 + k * .1);
  const a = k < .12 ? k / .12 : Math.max(0, 1 - Math.pow((k - .12) / .88, 1.5));
  return vfxDraw(n, x, y, w, Object.assign({}, o, { alpha: a * (o.alpha == null ? 1 : o.alpha) }));
}
function vfxPick(f, list){ if (f.v == null) f.v = Math.floor(Math.random() * 1000); return list[f.v % list.length]; }

// ================= 코드로 직접 그리는 폭발(그림 없이) =================
// 섬광 → 불덩이 → 연기, 튀는 파편, 속성별 특징(얼음 조각·번개 줄기·어둠 수축·독 거품)을 겹쳐 그린다.
// 모양은 진행도 k(0~1)와 씨앗(seed)만으로 정해져서, 같은 폭발은 매 프레임 같은 모양이다.
const VFX_PAL = {
  fire:  { core:[255,248,214], mid:[255,176,46],  out:[255,72,18],  smoke:[44,32,28],  s1:'#fff0a0', s2:'#ff8a2a' },
  ice:   { core:[255,255,255], mid:[190,240,255], out:[70,170,255], smoke:[205,238,255], s1:'#ffffff', s2:'#9fe4ff' },
  volt:  { core:[255,255,255], mid:[255,244,120], out:[255,190,20], smoke:[60,50,20],  s1:'#ffffff', s2:'#ffe45c' },
  dark:  { core:[240,220,255], mid:[170,100,255], out:[80,25,150],  smoke:[28,8,48],   s1:'#f0e0ff', s2:'#b070ff' },
  poison:{ core:[240,255,190], mid:[150,255,60],  out:[50,150,20],  smoke:[30,60,15],  s1:'#eaffb0', s2:'#8cff38' }
};
function vfxRnd(s, i){ const v = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); }
function vfxSeed(o){ if (o.v == null) o.v = Math.floor(Math.random() * 1000); return o.v + 1; }
function vfxC(c, a){ return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')'; }
function vfxGlow(x, y, rad, stops){
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, rad));
  for (const s of stops) g.addColorStop(s[0], s[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, 7); ctx.fill();
}
// 지그재그 줄기(번개) 하나. 두 번 겹쳐 그려 빛번짐과 심지를 만든다.
function vfxZig(x0, y0, x1, y1, amp, tick, seed, a, wide, col, core){
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = 6;
  const path = () => {
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let j = 1; j < n; j++){ const t = j / n, o = (vfxRnd(seed + tick * 3.7, j) - .5) * 2 * amp * Math.sin(t * 3.14); ctx.lineTo(x0 + dx * t + nx * o, y0 + dy * t + ny * o); }
    ctx.lineTo(x1, y1);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = a * .55; ctx.strokeStyle = col; ctx.lineWidth = wide; path(); ctx.stroke();
  ctx.globalAlpha = a; ctx.strokeStyle = core; ctx.lineWidth = Math.max(1, wide * .35); path(); ctx.stroke();
}

// 속성 폭발 한 방. (x, gy) = 바닥에 닿는 자리, R = 폭발 반지름(실제로 맞는 범위에 맞춘다), k = 0~1 진행도
function vfxBlast(kind, seed, x, gy, R, k){
  const Pa = VFX_PAL[kind]; if (!Pa) return false;
  k = Math.max(0, Math.min(1, k));
  const e = 1 - Math.pow(1 - Math.min(1, k * 2.4), 3);
  const life = k < .12 ? k / .12 : Math.max(0, 1 - Math.pow((k - .12) / .88, 1.5));
  const heat = Math.max(0, 1 - k * 1.7);
  const cy = gy - R * .38, tt = k * .6;
  const rn = (i) => vfxRnd(seed, i);
  ctx.save();
  // 1) 연기·안개: 몸통 뒤에 깔려서 터진 뒤에도 잠깐 남는다
  if (k > .16 && kind !== 'volt'){
    const s = (k - .16) / .84, sa = Math.sin(s * Math.PI) * (kind === 'ice' ? .3 : kind === 'dark' ? .5 : .38);
    for (let i = 0; i < 5; i++){
      const an = rn(40 + i) * 6.283, d = R * .35 * rn(50 + i);
      const px = x + Math.cos(an) * d, py = cy + Math.sin(an) * d * .5 - R * (.15 + .55 * s) * (.5 + rn(60 + i));
      const rad = R * (.28 + .3 * rn(70 + i)) * (.6 + .6 * s);
      vfxGlow(px, py, rad, [[0, vfxC(Pa.smoke, sa)], [.6, vfxC(Pa.smoke, sa * .6)], [1, vfxC(Pa.smoke, 0)]]);
    }
  }
  // 2) 몸통: 겹친 덩어리들이 부풀며 식는다(속이 하얗다가 노랑→주황→붉게)
  for (let i = 0; i < 7; i++){
    const an = rn(i) * 6.283, d = R * .5 * e * (.3 + .7 * rn(10 + i));
    const px = x + Math.cos(an) * d, py = cy + Math.sin(an) * d * .7 - R * .3 * k * (.4 + rn(20 + i));
    const rad = R * (.3 + .28 * rn(30 + i)) * (.35 + .65 * e) * (1 - .2 * k);
    vfxGlow(px, py, rad, [[0, vfxC(Pa.core, life * heat)], [.3, vfxC(Pa.mid, life * .95)], [.7, vfxC(Pa.out, life * .65)], [1, vfxC(Pa.out, 0)]]);
  }
  // 3) 속성별 몸통 보강
  if (kind === 'dark'){   // 한가운데가 검게 뚫린 구체: 터지기 전에 빨려 들어가는 점들
    vfxGlow(x, cy, R * .55 * (.7 + .5 * e), [[0, 'rgba(8,0,20,' + (life * .92).toFixed(3) + ')'], [.55, 'rgba(60,15,110,' + (life * .6).toFixed(3) + ')'], [1, 'rgba(90,30,160,0)']]);
    if (k < .4){
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++){
        const an = i * .628 + rn(80 + i), rr = R * (1.05 - .95 * (k / .4)) * (.8 + .4 * rn(90 + i));
        vfxGlow(x + Math.cos(an) * rr, cy + Math.sin(an) * rr * .7, 5, [[0, vfxC(Pa.s1 === '' ? Pa.mid : Pa.mid, .95)], [1, vfxC(Pa.out, 0)]]);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  if (kind === 'poison'){   // 터지는 거품
    for (let i = 0; i < 8; i++){
      const bx = x + (rn(100 + i) - .5) * R * 1.4 * e, rise = k * R * (.35 + .7 * rn(110 + i)), by = cy + R * .1 - rise;
      const br = R * (.07 + .08 * rn(120 + i)) * (1 + k * .5), ba = Math.max(0, 1 - Math.pow(k, 2.2)) * Math.min(1, k * 8);
      ctx.fillStyle = vfxC([140, 255, 70], ba * .22); ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill();
      ctx.strokeStyle = vfxC([205, 255, 150], ba * .9); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = vfxC([255, 255, 255], ba * .9); ctx.beginPath(); ctx.arc(bx - br * .35, by - br * .35, Math.max(1, br * .22), 0, 7); ctx.fill();
    }
  }
  // 4) 터지는 순간의 섬광(밝게 겹치기)
  if (k < .3){
    const q = k / .3;
    ctx.globalCompositeOperation = 'lighter';
    vfxGlow(x, cy, R * (.55 + .9 * q), [[0, vfxC(Pa.core, Math.pow(1 - q, 1.3))], [.45, vfxC(Pa.mid, .6 * Math.pow(1 - q, 1.3))], [1, vfxC(Pa.out, 0)]]);
    ctx.globalCompositeOperation = 'source-over';
  }
  // 5) 튀는 파편: 중력에 휘며 떨어지는 불꽃/불씨 (줄무늬 꼬리)
  const nsp = ({ fire:14, volt:9, dark:8, poison:6, ice:0 })[kind];
  if (nsp){
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const sa = Math.pow(1 - k, 1.2);
    for (let i = 0; i < nsp; i++){
      const an = rn(130 + i) * 6.283, sp = R * (2.2 + 2.4 * rn(140 + i));
      const vx = Math.cos(an) * sp, vy = Math.sin(an) * sp * .8 - sp * .3;
      const px = x + vx * tt * (1 - .3 * k), py = cy + vy * tt * (1 - .3 * k) + R * 5 * tt * tt;
      ctx.strokeStyle = i % 2 ? Pa.s2 : Pa.s1; ctx.globalAlpha = sa; ctx.lineWidth = 2.4 * (1 - k) + .8;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - vx * .035, py - vy * .035); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // 6) 얼음: 깨져 튀는 유리 조각 + 십자 서리 섬광
  if (kind === 'ice'){
    if (k < .35){
      const q = k / .35; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = vfxC([230, 250, 255], 1 - q); ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++){ const an = i * 1.047 + .3, l1 = R * (.25 + .8 * q), l0 = R * .1; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * l0, cy + Math.sin(an) * l0); ctx.lineTo(x + Math.cos(an) * l1, cy + Math.sin(an) * l1); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    for (let i = 0; i < 9; i++){
      const an = rn(150 + i) * 6.283, sp = R * (1.5 + 1.5 * rn(160 + i)), L = R * (.12 + .12 * rn(170 + i)), w = L * .36;
      const px = x + Math.cos(an) * sp * tt * (1 - .25 * k), py = cy + Math.sin(an) * sp * .85 * tt * (1 - .25 * k) - sp * .1 * tt + R * 4.5 * tt * tt;
      const rot = an + k * 5 * (rn(180 + i) - .5), a = Math.pow(1 - k, .8) * Math.min(1, k * 14);
      ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(0, w); ctx.lineTo(-L * .6, 0); ctx.lineTo(0, -w); ctx.closePath();
      ctx.fillStyle = vfxC([196, 238, 255], a * .85); ctx.fill(); ctx.strokeStyle = vfxC([255, 255, 255], a); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.restore();
    }
  }
  // 7) 번개: 사방으로 갈라지는 전기 줄기(몇 프레임마다 모양이 바뀜)
  if (kind === 'volt'){
    const tick = Math.floor(k * 16), a = Math.max(0, 1 - Math.pow(k, 1.5));
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++){
      const an = i * 1.047 + rn(190 + i) * .6, len = R * (.75 + .5 * rn(200 + i)) * (.5 + .5 * e);
      vfxZig(x, cy, x + Math.cos(an) * len, cy + Math.sin(an) * len * .8, R * .16, tick, seed + i, a, 6 * (1 - k) + 2, '#ffd93a', '#fffbe0');
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  return true;
}

// 타격 불꽃: 번쩍 + 사방으로 뻗는 선 (치명타는 십자 섬광이 더해짐, 'hurt'는 붉은색)
function vfxHitSpark(seed, x, y, R, k, mode){
  k = Math.max(0, Math.min(1, k));
  const crit = mode === 'crit', hurt = mode === 'hurt';
  const e = 1 - Math.pow(1 - Math.min(1, k * 2.6), 3), fade = Math.pow(1 - k, 1.4);
  const main = hurt ? [255, 90, 70] : crit ? [255, 170, 40] : [255, 214, 120], core = hurt ? [255, 225, 215] : [255, 250, 220];
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  vfxGlow(x, y, R * (.45 + .5 * k), [[0, vfxC(core, fade)], [.5, vfxC(main, fade * .6)], [1, vfxC(main, 0)]]);
  const n = crit ? 11 : 7;
  for (let i = 0; i < n; i++){
    const an = i / n * 6.283 + vfxRnd(seed, i) * .5, r0 = R * (.12 + .5 * e), r1 = r0 + R * (.35 + .4 * vfxRnd(seed, 20 + i)) * (1 - k);
    ctx.strokeStyle = vfxC(main, fade * .55); ctx.lineWidth = (crit ? 6 : 4.5) * (1 - k) + 1;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke();
    ctx.strokeStyle = vfxC(core, fade); ctx.lineWidth = (crit ? 2.6 : 1.8) * (1 - k) + .6; ctx.stroke();
  }
  if (crit){   // 네 갈래 별빛
    const L = R * 1.15 * (1 - k * .5), W = R * .1 * (1 - k);
    for (let q = 0; q < 2; q++){
      ctx.save(); ctx.translate(x, y); ctx.rotate(q * 1.5708 + .785);
      ctx.fillStyle = vfxC(core, fade); ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, W); ctx.lineTo(L, 0); ctx.lineTo(0, -W); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = vfxC(main, fade * .5); ctx.lineWidth = 2 * (1 - k) + .5; ctx.beginPath(); ctx.arc(x, y, R * (.2 + .8 * e), 0, 7); ctx.stroke();
  ctx.restore();
  return true;
}
// 쓰러질 때 먼지: 바닥으로 퍼지는 흙먼지 + 튀는 부스러기
function vfxDust(seed, x, gy, R, k){
  k = Math.max(0, Math.min(1, k));
  const e = 1 - Math.pow(1 - Math.min(1, k * 2), 3), a = Math.sin(Math.min(1, k * 1.15) * Math.PI) * .5;
  ctx.save();
  for (let i = 0; i < 7; i++){
    const an = i / 7 * 6.283 + vfxRnd(seed, i) * .8, d = R * (.35 + .65 * vfxRnd(seed, 10 + i)) * e;
    const px = x + Math.cos(an) * d, py = gy + Math.sin(an) * d * .38 - R * .22 * k * (.4 + vfxRnd(seed, 20 + i)), rad = R * (.22 + .18 * vfxRnd(seed, 30 + i)) * (.6 + .6 * e);
    vfxGlow(px, py, rad, [[0, 'rgba(176,160,132,' + a.toFixed(3) + ')'], [.6, 'rgba(150,136,112,' + (a * .6).toFixed(3) + ')'], [1, 'rgba(150,136,112,0)']]);
  }
  for (let i = 0; i < 6; i++){
    const an = -3.14 * (.15 + .7 * vfxRnd(seed, 40 + i)), sp = R * (1.4 + 1.6 * vfxRnd(seed, 50 + i)), tt = k * .6;
    ctx.fillStyle = 'rgba(120,104,84,' + (Math.pow(1 - k, 1.2) * .9).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(x + Math.cos(an) * sp * tt, gy + Math.sin(an) * sp * tt + R * 5 * tt * tt, 2.4 * (1 - k * .5), 0, 7); ctx.fill();
  }
  ctx.restore();
  return true;
}
// 타오르는 불꽃 한 가닥(장판용): 아래가 넓고 끝이 일렁이며 뾰족한 방울꼴. ph = 0~1 위상
function vfxFlame(x, gy, w, ph, al){
  const h = w * (1.5 + .5 * Math.sin(ph * 6.283)), sway = Math.sin(ph * 12.566) * w * .18;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, gy);
  const layer = (s, c0, c1) => {
    const ww = w * s, hh = h * (.55 + .45 * s);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-ww * .6, -hh * .15, -ww * .55, -hh * .6, sway * s, -hh);
    ctx.bezierCurveTo(ww * .55, -hh * .6, ww * .6, -hh * .15, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, -hh); g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fill();
  };
  layer(1, vfxC([255, 120, 20], al * .8), vfxC([255, 60, 10], 0));
  layer(.62, vfxC([255, 200, 70], al * .9), vfxC([255, 150, 30], 0));
  layer(.3, vfxC([255, 250, 210], al), vfxC([255, 230, 150], 0));
  ctx.restore();
}

// 폭발 종류별로 맞는 반지름을 정한다 (몬스터 몸집을 크게 넘지 않게)
function vfxBlastR(r, min, mul){ return Math.max(min, r * mul); }
// 스킬·타격 이펙트 하나를 그린다. 그렸으면 true (drawSkillFx가 부름)
function vfxSkill(f, k, x, y, r){
  if (f.type === 'chain') return vfxChain(f, k);
  const sd = vfxSeed(f);
  switch (f.type){
    case 'fireburst': return vfxBlast('fire', sd, x, y + 14, vfxBlastR(r, 50, .95), k);
    case 'iceburst':  return vfxBlast('ice', sd, x, y + 14, vfxBlastR(r, 46, .95), k);
    case 'icehit':    return vfxBlast('ice', sd, x, y + 10, vfxBlastR(r, 36, 1.15), k);
    case 'voltburst': return vfxBlast('volt', sd, x, y + 14, vfxBlastR(r, 36, 1.15), k);
    case 'darkburst': return vfxBlast('dark', sd, x, y + 14, vfxBlastR(r, 36, 1.15), k);
    case 'poisonburst': return vfxBlast('poison', sd, x, y + 14, vfxBlastR(r, 36, 1.15), k);
    case 'firestorm':{
      const e = 1 - Math.pow(1 - Math.min(1, k * 1.6), 3);
      vfxBlast('fire', sd, x, y + 14, Math.max(40, r * .5), k);
      for (let i = 0; i < 8; i++){
        const a = i * .785 + .3, rr = r * (.35 + .65 * e) * (i % 2 ? 1 : .8), ki = Math.max(0, Math.min(1, (k - (i % 4) * .06) / .8));
        vfxBlast('fire', sd + i + 1, x + Math.cos(a) * rr, y + 14 + Math.sin(a) * rr * .6, Math.max(26, r * .3), ki);
      }
      return true;
    }
    case 'holyshield': case 'resurrection':{
      const a=1-k,R=r*(.4+.6*k);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#ffe8a0';ctx.lineWidth=5*a+1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y+20-i*25*k,R*(1-i*.18),R*.4,0,0,7);ctx.stroke();}
      if(f.type==='resurrection'){ctx.strokeStyle='#fffce1';ctx.lineWidth=9*a;ctx.beginPath();ctx.moveTo(x,y-160*k);ctx.lineTo(x,y+15);ctx.moveTo(x-30,y-75*k);ctx.lineTo(x+30,y-75*k);ctx.stroke();}
      ctx.restore();return true;
    }
    case 'thunderstrike':{
      vfxZig(x-24,y-260,x,y+14,28,Math.floor(k*12),sd,1-k,6,'#9faeff','#ffffff');
      vfxBlast('volt',sd,x,y+14,r,k);return true;
    }
    case 'frostwave':{
      const a = f.a || 0, e = 1 - Math.pow(1 - Math.min(1, k * 1.5), 3);
      for (let i = 0; i < 9; i++){
        const row = i % 3, idx = Math.floor(i / 3) - 1, dist = r * (.3 + .3 * row) * (.4 + .6 * e), lat = idx * dist * .5;
        const ki = Math.max(0, Math.min(1, (k - row * .07) / .8));
        vfxBlast('ice', sd + i + 1, x + Math.cos(a) * dist - Math.sin(a) * lat, y + 10 + Math.sin(a) * dist + Math.cos(a) * lat, 24 + row * 6, ki);
      }
      return true;
    }
    case 'spearthrust': return vfxHitSpark(sd,x,y,r*1.05,k,f.crit?'crit':'hit');
    case 'spearburst': vfxHitSpark(sd,x,y,r*.85,k,'crit');vfxDust(sd+9,x,y+18,r*.7,k);return true;
    case 'fistdash': return vfxHitSpark(sd,x,y,r*1.15,k,'crit');
    case 'quake': vfxDust(sd,x,y+16,r*.9,k);vfxHitSpark(sd+3,x,y,r*.75,k,'hit');return true;
    case 'hit':   return vfxHitSpark(sd, x, y, r * 1.15, k, f.crit ? 'crit' : 'hit');
    case 'hurt':  return vfxHitSpark(sd, x, y, r * 1.0, k, 'hurt');
    case 'kill':  return vfxDust(sd, x, y + 8, Math.max(34, r * 1.1), k);
    case 'heal':  return true;   // 치유 마법진은 vfxGroundPass가 캐릭터 발밑(아래 층)에 그린다
    case 'castfire': case 'castice': case 'castdark': case 'castbolt': return true;
  }
  // 아래는 그림 시트를 쓰는 베기·파동 효과
  if (!vfxReady('burst_fire_0')) return false;
  switch (f.type){
    case 'waveburst': return vfxPlay('hit_spark_3', x, y, Math.max(70, r * 2.4), k, { add: true, s0: .45 });   // 발밑 마법진은 vfxGroundPass가 캐릭터 아래 층에 그린다
    case 'slashpower':{
      const a = f.a || 0, nm = 'hit_slash_' + vfxPick(f, [0, 2, 3]);
      return vfxPlay(nm, x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * 1.9, k, { rot: a + Math.PI / 4, add: true, s0: .7 });
    }
    case 'spinpower':{
      const a = Math.max(0, 1 - Math.pow(k, 1.6));
      vfxDraw('hit_slash_0', x, y, r * 2.1, { rot: k * 7 + Math.PI / 4, alpha: a, add: true });
      return vfxDraw('hit_slash_2', x, y, r * 2.1, { rot: k * 7 + Math.PI * 1.25, alpha: a, add: true });
    }
    default:          return vfxHitSpark(sd, x, y, Math.max(34, r * 1.2), k, 'hit');
  }
}
// 날아가는 것 밑에 바닥 그림자와 번지는 빛을 깔아서 "떠다니는 그림"처럼 보이지 않게 한다.
function vfxAura(x, y, col, r){
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 40, 15, 5, 0, 0, 7); ctx.fill();
  if (col){
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r || 34);
    g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r || 34, 0, 7); ctx.fill();
  }
  ctx.restore();
}
const VFX_AURA = { shot_fire:'#ff8a2a', shot_ice:'#7ddcff', shot_dark:'#a050ff', shot_holy:'#ffe9a0', shot_poison:'#8cff38', shot_rock:'', shot_blade:'#cfe8ff' };
// 플레이어가 쏘는 투사체(지팡이·마법·검기·파동). 그렸으면 true
const VFX_PSHOT = { ice:'shot_ice', fire:'shot_fire', dark:'shot_dark', blade:'shot_blade', wave:'shot_holy' };
function vfxShot(s, a){
  if(s.kind==='spear'){
    ctx.save();ctx.translate(s.x,s.y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle='rgba(255,214,120,.35)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(18,0);ctx.stroke();
    ctx.strokeStyle='#fff7d6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-28,0);ctx.lineTo(17,0);ctx.stroke();
    ctx.fillStyle='#ffd06a';ctx.beginPath();ctx.moveTo(29,0);ctx.lineTo(14,-7);ctx.lineTo(14,7);ctx.closePath();ctx.fill();ctx.restore();return true;
  }
  if (s.kind === 'bolt') return vfxBoltOrb(s);
  const nm = VFX_PSHOT[s.kind] || '';
  if (!nm || !vfxReady(nm)) return false;
  vfxAura(s.x, s.y, VFX_AURA[nm], nm === 'shot_blade' ? (s.hw || 60) * .8 : s.pellet ? 16 : 36);
  const w = s.pellet ? 30 : nm === 'shot_blade' ? (s.hw || 60) * 2.6 : nm === 'shot_ice' ? 78 : nm === 'shot_holy' ? 84 : nm === 'shot_dark' ? 76 : 70;
  return vfxDraw(nm, s.x, s.y, w, { rot: a - (VFX_HEAD[nm] || 0) * Math.PI / 180, alpha: 1 });
}
// 번개 구체: 그림 없이 빛 덩어리와 튀는 전기줄기로 그린다
function vfxBoltOrb(s){
  const t = performance.now() / 1000;
  vfxAura(s.x, s.y, '#ffe45c', 40);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 17);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.4, '#ffe45c'); g.addColorStop(1, 'rgba(255,200,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, 17, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fffbd0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++){
    const a = t * 9 + i * 1.57 + Math.sin(t * 31 + i) * .6, l = 14 + 10 * Math.abs(Math.sin(t * 23 + i * 2.1));
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * l * .55 + Math.sin(a * 3) * 3, s.y + Math.sin(a) * l * .55); ctx.lineTo(s.x + Math.cos(a) * l, s.y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  return true;
}
// 연쇄 벼락: 맞은 대상들을 잇는 지그재그 전기줄기 + 맞은 곳 번개 폭발
function vfxChain(f, k){
  const p = f.pts; if (!p || p.length < 2) return true;
  if (f.seed == null) f.seed = Math.random() * 100;
  const a = Math.max(0, 1 - k * k), tick = Math.floor(k * 14);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 1; i < p.length; i++){
    const A = p[i - 1], B = p[i], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, n = 7, amp = 14 * Math.min(1, L / 80);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(A.x, A.y);
      for (let j = 1; j < n; j++){ const t = j / n, o = Math.sin(f.seed + i * 3.1 + j * 5.7 + tick * 1.7) * amp; ctx.lineTo(A.x + dx * t + nx * o, A.y + dy * t + ny * o); }
      ctx.lineTo(B.x, B.y);
    };
    ctx.globalAlpha = a * .55; ctx.strokeStyle = '#ffd93a'; ctx.lineWidth = 9 * (1 - k) + 3; path(); ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = '#fffbe0'; ctx.lineWidth = 3.2 * (1 - k) + 1.2; path(); ctx.stroke();
  }
  ctx.restore();
  for (let i = 1; i < p.length; i++) vfxBlast('volt', Math.floor(f.seed) + i, p[i].x, p[i].y + 22, 34, k);
  return true;
}
// ---- 바닥 층: 캐릭터·몬스터보다 아래에 깔리는 효과 (town.js 그리기 순서에서 스프라이트 앞에 부름) ----
function vfxGroundPass(){
  if ((!sfx.length && !zones.length) || !vfxReady('burst_fire_0')) return;
  vfxZonesGround();
  for (const f of sfx){
    const k = f.t / (VFX_DUR[f.type] || .38); if (k < 0 || k >= 1) continue;
    const x = f.x == null ? P.x : f.x, y = f.y == null ? P.y - 30 : f.y, r = f.r || 72;
    // 시전 마법진은 캐릭터 발에 붙어 따라다닌다(달리면서 써도 발밑에 있음)
    if (f.type === 'castfire') vfxCastCircle(k, P.x, P.y + 4, r, '#ff7a2a', '#ffd9a0', 'ring_red');
    else if (f.type === 'castice') vfxCastCircle(k, P.x, P.y + 4, r, '#5fcfff', '#e8fbff', 'ring_blue');
    else if (f.type === 'castdark') vfxCastCircle(k, P.x, P.y + 4, r, '#a050ff', '#ecd9ff', 'ring_blue');
    else if (f.type === 'castbolt') vfxCastCircle(k, P.x, P.y + 4, r, '#ffe45c', '#fffbd0', 'ring_gold');
    else if (f.type === 'heal') vfxPlay('heal_green', P.x, P.y + 10, r * 2.2, k, { s0: .75, base: true, sy: .78 });
    else if (f.type === 'firestorm') vfxGroundBurst(k, x, y + 14, r, '#ff8a2a', true);
    else if (f.type === 'frostwave') vfxGroundBurst(k, x + Math.cos(f.a || 0) * r * .5, y + 14 + Math.sin(f.a || 0) * r * .5, r * .7, '#8de4ff', false);
    else if (f.type === 'fireburst') vfxGroundBurst(k, x, y + 14, r, '#ff8a2a', true);
    else if (f.type === 'iceburst' || f.type === 'icehit') vfxGroundBurst(k, x, y + 12, f.type === 'icehit' ? r * 1.3 : r, '#8de4ff', false);
  }
}
// ---- 시간이 걸리는 효과(운석·파멸의 링): 바닥 층 ----
function vfxZonesGround(){
  for (const z of zones){
    if(z.type==='spearfall'&&!z.hit){
      const k=Math.min(1,z.t/z.delay),yy=z.y-250*(1-k);ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#fff1b0';ctx.lineWidth=8*(1-k)+2;
      ctx.beginPath();ctx.moveTo(z.x,yy-80);ctx.lineTo(z.x,z.y-10);ctx.stroke();ctx.restore();
    } else if(z.type==='arrowrain'){
      ctx.save();ctx.strokeStyle='#f4e6ba';ctx.lineWidth=2;ctx.globalAlpha=Math.max(0,Math.min(1,(z.dur-z.t)*2));
      for(let q=0;q<12;q++){const ph=(z.t*2.7+q*.173)%1,a=q*2.399,x=z.x+Math.cos(a)*z.R*Math.sqrt((q+.5)/12),y=z.y+Math.sin(a)*z.R*.72-ph*120;
        ctx.beginPath();ctx.moveTo(x-10,y-36);ctx.lineTo(x+4,y+8);ctx.stroke();}
      ctx.restore();
    } else if(z.type==='blizzard'||z.type==='swamp'){
      const ice=z.type==='blizzard',alpha=Math.min(1,z.t*4,(z.dur-z.t)*3);
      ctx.save();ctx.globalAlpha=Math.max(0,alpha);ctx.fillStyle=ice?'rgba(100,205,255,.2)':'rgba(75,20,110,.5)';
      ctx.strokeStyle=ice?'#9eeaff':'#b06cde';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(z.x,z.y,z.R,z.R/1.3,0,0,7);ctx.fill();ctx.stroke();ctx.restore();
    } else if(z.type==='spearfall'&&!z.hit){
      const k=Math.min(1,z.t/z.delay);ctx.save();ctx.translate(z.x,z.y);ctx.scale(1,.55);ctx.globalAlpha=.35+.35*Math.sin(z.t*18);
      ctx.strokeStyle='#ffd66e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,z.r*(1-k*.45),0,7);ctx.stroke();ctx.restore();
    } else if(z.type==='arrowrain'){
      const a=Math.max(0,Math.min(1,z.t*4,(z.dur-z.t)*3));ctx.save();ctx.translate(z.x,z.y);ctx.scale(1,.55);ctx.globalAlpha=a*.7;
      ctx.fillStyle='rgba(180,210,120,.12)';ctx.strokeStyle='#e8d98a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,z.R,0,7);ctx.fill();ctx.stroke();ctx.restore();
    } else if (z.type === 'meteor'){
      if (z.t < z.delay){   // 낙하 예고: 붉은 원이 조여 들어온다
        const k = z.t / z.delay, pulse = .55 + .25 * Math.sin(z.t * 22);
        ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, .55);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, z.r); g.addColorStop(0, 'rgba(255,90,30,.28)'); g.addColorStop(1, 'rgba(255,60,20,.06)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#ff5a1a'; ctx.globalAlpha = pulse; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, 7); ctx.stroke();
        ctx.globalAlpha = .9; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(0, 0, z.r * (1 - k * .85), 0, 7); ctx.stroke();
        ctx.restore();
      } else {   // 불타는 바닥
        const left = z.delay + z.life - z.t, a = Math.min(1, left / .7);
        ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, .55);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, z.r); g.addColorStop(0, 'rgba(255,120,30,.42)'); g.addColorStop(.7, 'rgba(255,80,20,.2)'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, 7); ctx.fill(); ctx.restore();
        vfxDraw('status_ground_fire', z.x, z.y, z.r * 1.9, { sy: .6, alpha: .75 * a });
        for (let i = 0; i < 6; i++){
          const an = i * 1.047 + 0.6, rr = z.r * (.35 + .4 * ((i * 37) % 10) / 10), ph = ((z.t * 1.4 + i * .17) % 1);
          vfxFlame(z.x + Math.cos(an) * rr, z.y + Math.sin(an) * rr * .55 + 4, 15 + 8 * ph, ph + i * .31, a * Math.sin(ph * 3.14) * .95);
        }
      }
    } else if (z.type === 'voidring' || z.type === 'darkpulse'){
      const e = Math.min(1, z.t / (z.exp || z.dur)), cr = z.R * (1 - Math.pow(1 - e, 2)), a = z.t > z.dur ? Math.max(0, 1 - (z.t - z.dur) / (z.type === 'darkpulse' ? .3 : .35)) : 1;
      ctx.save(); ctx.translate(z.x, z.y + 4); ctx.scale(1, .55);
      const g = ctx.createRadialGradient(0, 0, cr * .6, 0, 0, cr + 18); g.addColorStop(0, 'rgba(120,40,200,0)'); g.addColorStop(.8, 'rgba(120,40,200,.34)'); g.addColorStop(1, 'rgba(120,40,200,0)');
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cr + 18, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b070ff'; ctx.lineWidth = 12 * (1 - e * .6) + 2; ctx.globalAlpha = a * .9; ctx.beginPath(); ctx.arc(0, 0, cr, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#f0e0ff'; ctx.lineWidth = 3; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(0, 0, cr, 0, 7); ctx.stroke();
      ctx.restore();
    }
  }
}
// ---- 위 층: 떨어지는 운석, 링을 따라 솟는 어둠 ----
function vfxZonesTop(){
  for (const z of zones){
    if(z.type==='blizzard'||z.type==='swamp'){
      ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(z.dur-z.t)*3));
      for(let i=0;i<24;i++){
        const a=i*2.4+z.t*(z.type==='blizzard'?2:.3),r=z.R*Math.sqrt((i+.5)/24),x=z.x+Math.cos(a)*r,y=z.y+Math.sin(a)*r/1.3;
        if(z.type==='blizzard'){ctx.strokeStyle='#dbf7ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8,y-35);ctx.lineTo(x,y-19);ctx.stroke();}
        else {ctx.strokeStyle='#bd80dc';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y-3,3+3*Math.sin(z.t*3+i)**2,3,0,0,7);ctx.stroke();}
      }ctx.restore();
    } else if (z.type === 'meteor' && z.t < z.delay){
      const k = z.t / z.delay, e = k * k, sx = z.x + 240, sy = z.y - 560;
      const mx = sx + (z.x - sx) * e, my = sy + (z.y - 14 - sy) * e, ang = Math.atan2(z.y - 14 - sy, z.x - sx);
      ctx.save(); ctx.globalAlpha = .18 + .3 * e; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(z.x, z.y + 2, z.r * .5 * e, z.r * .22 * e, 0, 0, 7); ctx.fill(); ctx.restore();
      vfxAura(mx, my, '#ff8a2a', 70);
      if (!vfxDraw('shot_fire', mx, my, 150, { rot: ang - 145 * Math.PI / 180 })){
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 40); g.addColorStop(0, '#fff'); g.addColorStop(.4, '#ffb347'); g.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 40, 0, 7); ctx.fill();
      }
    } else if (z.type === 'voidring' || z.type === 'darkpulse'){
      const sm = z.type === 'darkpulse', e = Math.min(1, z.t / (z.exp || z.dur)), cr = z.R * (1 - Math.pow(1 - e, 2)), a = z.t > z.dur ? Math.max(0, 1 - (z.t - z.dur) / (sm ? .3 : .35)) : 1;
      const n = sm ? 8 : 12;
      for (let i = 0; i < n; i++){
        const an = i * (6.2832 / n) + z.t * 2;
        vfxBlast('dark', 7 + i, z.x + Math.cos(an) * cr, z.y + 6 + Math.sin(an) * cr * .55, sm ? 22 : 30, .3 + .25 * ((z.t * 1.6 + i * .21) % 1));
      }
    }
  }
}

// 발밑에서 위잉 돌며 떠오르는 마법진. 캐릭터 아래에 깔린다.
function vfxCastCircle(k, x, gy, r, col, col2, img){
  const a = k < .15 ? k / .15 : k > .65 ? (1 - k) / .35 : 1;
  const e = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3), R = Math.max(30, r * 1.15) * (.6 + .4 * e);
  const spin = k * 11;
  ctx.save();
  // 바닥을 물들이는 빛(밝은 땅에서 하얗게 날아가지 않게 일반 합성)
  ctx.save(); ctx.translate(x, gy); ctx.scale(1, .5);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
  g.addColorStop(0, col + '66'); g.addColorStop(.6, col + '33'); g.addColorStop(1, col + '00');
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 1.3, 0, 7); ctx.fill();
  // 도는 마법진(바닥에 눕힌 원)
  ctx.lineCap = 'round';
  const ring = (rad, rot, dash, lw, c, al) => {
    ctx.save(); ctx.rotate(rot); ctx.setLineDash(dash); ctx.strokeStyle = c; ctx.globalAlpha = a * al; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.stroke(); ctx.restore();
  };
  ring(R, spin * .6, [], 7, col, .75); ring(R, spin * .6, [], 2.5, col2, 1);
  ring(R * .78, -spin, [14, 9], 4.5, col, .9);
  ring(R * .5, spin * 1.4, [6, 8], 3.5, col, .9);
  for (const dir of [1, -1]){   // 겹친 두 삼각형(육망성)
    ctx.save(); ctx.rotate(spin * .8 * dir); ctx.strokeStyle = col; ctx.globalAlpha = a * .9; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < 3; i++){ const an = i * 2.0944 + (dir > 0 ? 0 : 1.0472); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * R * .72, Math.sin(an) * R * .72); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  // 그림 시트의 마법진을 아래에 은은하게 겹쳐 색감을 더함
  vfxDraw(img, x, gy + 2, R * 2.3, { alpha: a * .5, sy: .8 });
  // 위로 솟는 빛줄기
  ctx.strokeStyle = col2; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++){
    const an = i * .698 + spin * .5, px = x + Math.cos(an) * R * .85, py = gy + Math.sin(an) * R * .85 * .5;
    const rise = ((k * 2.2 + i * .13) % 1), h = 14 + 34 * rise;
    ctx.globalAlpha = a * (1 - rise) * .9;
    ctx.beginPath(); ctx.moveTo(px, py - 40 * rise); ctx.lineTo(px, py - 40 * rise - h); ctx.stroke();
  }
  ctx.restore();
}
// 폭발 자리 바닥: 번지는 빛 + 퍼지는 충격 고리 + (불은) 그을음. 폭발 그림 아래에 깔린다.
function vfxGroundBurst(k, x, gy, r, col, scorch){
  const e = 1 - Math.pow(1 - Math.min(1, k * 1.8), 3), a = 1 - Math.pow(k, 1.6);
  ctx.save(); ctx.translate(x, gy); ctx.scale(1, .5);
  if (scorch){
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .95);
    sg.addColorStop(0, 'rgba(20,8,2,.38)'); sg.addColorStop(1, 'rgba(20,8,2,0)');
    ctx.globalAlpha = Math.min(1, k * 6) * (1 - Math.pow(k, 2.2)); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, r * .95, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
  g.addColorStop(0, col + '88'); g.addColorStop(.55, col + '30'); g.addColorStop(1, col + '00');
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = col; ctx.lineWidth = 6 * (1 - k) + 1.5; ctx.globalAlpha = a * .7;
  ctx.beginPath(); ctx.arc(0, 0, r * (.25 + .85 * e), 0, 7); ctx.stroke();
  ctx.restore();
}
// 몬스터가 쏘는 투사체. 그렸으면 true
function vfxEnemyShot(s){
  const nm = ({ rock:'shot_rock', stone:'shot_rock', burn:'shot_fire', slow:'shot_ice', web:'shot_ice', feather:'shot_holy' })[s.kind] || 'shot_dark';
  if (!vfxReady(nm)) return false;
  const a = Math.atan2(s.vy, s.vx), w = s.kind === 'feather' ? 44 : s.kind === 'web' ? 46 : 58;
  vfxAura(s.x, s.y, VFX_AURA[nm], 30);
  return vfxDraw(nm, s.x, s.y, w, { rot: a - VFX_HEAD[nm] * Math.PI / 180 });
}
// 몬스터 공격 예고·적중 자리(번개·슬라임 튀김·내려치기). 그렸으면 true
function vfxHazard(h){
  if (!vfxReady('ring_red')) return false;
  const delay = Math.max(.01, h.delay), p = Math.max(0, Math.min(1, h.t / delay)), r = h.r || 40;
  const ring = h.kind === 'slime' ? 'ring_green' : h.kind === 'lightning' ? 'ring_gold' : 'ring_red';
  if (h.t < delay){
    return vfxDraw(ring, h.x, h.y + 4, r * 3.0 * (.7 + p * .3), { alpha: .35 + .5 * p, sy: .85 });
  }
  const k = Math.min(1, (h.t - delay) / (h.kind === 'lightning' ? .32 : .4));
  if (h.kind === 'lightning'){ vfxGroundBurst(k, h.x, h.y + 8, r * 1.5, '#ffe45c', false); return vfxBlast('volt', vfxSeed(h), h.x, h.y + 8, r * 1.3, k); }
  if (h.kind === 'slime'){ vfxGroundBurst(k, h.x, h.y + 8, r * 1.3, '#8cff38', false); return vfxBlast('poison', vfxSeed(h), h.x, h.y + 8, r * 1.1, k); }
  return vfxPlay('hit_slash_2', h.x, h.y - 6, r * 2.5, k, { rot: -Math.PI / 4 + (h.x % 2 ? 0 : Math.PI), add: true, s0: .7 });
}
// 몬스터에 걸린 상태이상 표시. 몬스터 그림 아래(발)에 깔리는 효과
function vfxMonsterGround(m){
  if (!vfxReady('status_ground_slow')) return false;
  const fl = .8 + Math.sin(T * 14 + m.x) * .15;
  if (m.burnT > 0) vfxDraw('burst_fire_4', m.x, m.y + 4, m.w * 1.5, { base: true, alpha: fl });
  if (m.slowT > 0) vfxDraw('status_ground_slow', m.x, m.y - 2, m.w * 1.5, { alpha: .85, sy: .7 });
  if (m.freezeT > 0) vfxDraw('burst_ice_0', m.x, m.y + 6, m.w * 1.35, { base: true, alpha: .9 });
  return true;
}
// 몬스터 머리 위 상태 아이콘 줄. by = 체력바 위치
function vfxMonsterIcons(m, by){
  if (!vfxReady('status_icon_fire')) return;
  const list = [];
  if (m.burnT > 0) list.push('fire');
  if (m.poisonT > 0 && vfxReady('status_icon_poison')) list.push('poison');
  if (m.freezeT > 0) list.push('ice'); else if (m.slowT > 0) list.push('slow');
  list.forEach((k, i) => vfxDraw('status_icon_' + k, m.x + (i - (list.length - 1) / 2) * 24, by - 14, 22));
}
// 플레이어 상태이상: 발 밑 효과 + 머리 위 아이콘과 남은 시간
function vfxPlayerStatus(){
  if (typeof PLAYER_STATUS === 'undefined' || !vfxReady('status_ground_slow')) return;
  const on = [];
  for (const k of ['burn', 'slow', 'stone', 'bleed']) if (PLAYER_STATUS[k] > 0) on.push(k);
  if (!on.length) return;
  const fl = .8 + Math.sin(T * 14) * .15;
  for (const k of on){
    const g = k === 'burn' ? 'fire' : k === 'bleed' ? 'blood' : k;
    vfxDraw('status_ground_' + g, P.x, P.y + 2, 84, { alpha: fl, sy: .7 });
  }
  on.forEach((k, i) => {
    const g = k === 'burn' ? 'fire' : k === 'bleed' ? 'blood' : k, x = P.x + (i - (on.length - 1) / 2) * 30, y = P.y - 122;
    vfxDraw('status_icon_' + g, x, y, 26);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 12, y + 16, 24, 4);
    ctx.fillStyle = '#ffd36a'; ctx.fillRect(x - 11, y + 17, 22 * Math.min(1, PLAYER_STATUS[k] / 3), 2);
  });
}
// 검사·디버그용: 그림이 모두 불러와졌는지 보고, 원하는 이펙트를 플레이어 앞에 띄운다.
window.__VFX = {
  names(){ return Object.keys(VFXI); },
  loaded(){ return Object.keys(VFXI).filter(vfxReady).length; },
  spawn(type, dx, dy, r, extra){ sfx.push(Object.assign({ type, t: 0, x: P.x + (dx || 0), y: P.y + (dy || 0), r: r || 50 }, extra || {})); },
  shot(kind, dx, dy, ang){ enemyShots.push({ x: P.x + dx, y: P.y + dy, vx: Math.cos(ang) * 1, vy: Math.sin(ang) * 1, t: 0, life: 5, dmg: 0, kind, done: false }); },
  hazard(kind, dx, dy, r){ enemyHazards.push({ kind, x: P.x + dx, y: P.y + dy, t: 0, delay: .5, life: 3, r: r || 48, dmg: 0, done: true }); },
  status(k, sec){ PLAYER_STATUS[k] = sec; },
  monStatus(burn, slow, freeze){ const m = monsters.find(x => !x.dead && !x.removed); if (!m) return false; m.burnT = burn; m.slowT = slow; m.freezeT = freeze; return true; }
};
