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
const VFX_DUR = { heal:.75, hit:.26, hurt:.3, kill:.55, fireburst:.55, iceburst:.55, icehit:.45, castfire:.75, castice:.75, slashpower:.42, spinpower:.45 };

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

// 스킬·타격 이펙트 하나를 그린다. 그렸으면 true (drawSkillFx가 부름)
function vfxSkill(f, k, x, y, r){
  if (!vfxReady('burst_fire_0')) return false;
  switch (f.type){
    // 폭발 그림 크기는 실제로 맞는 범위(r)에 맞춘다. 몬스터 몸집을 크게 넘지 않게.
    case 'fireburst': return vfxPlay('burst_fire_' + vfxPick(f, [0, 1, 2]), x, y + 14, Math.max(96, r * 1.9), k, { base: true, s0: .45 });
    case 'iceburst':  return vfxPlay('burst_ice_' + vfxPick(f, [0, 2, 4]), x, y + 14, Math.max(90, r * 1.9), k, { base: true, s0: .45 });
    case 'icehit':    return vfxPlay('burst_ice_2', x, y + 10, Math.max(70, r * 2.3), k, { base: true, s0: .5 });
    case 'heal':      return vfxPlay('heal_green', P.x, P.y,  r * 2.4, k, { s0: .75 });
    case 'castfire': case 'castice': return true;   // 발밑 마법진은 vfxGroundPass가 캐릭터 아래 층에 그린다
    case 'slashpower':{
      const a = f.a || 0, nm = 'hit_slash_' + vfxPick(f, [0, 2, 3]);
      return vfxPlay(nm, x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * 1.9, k, { rot: a + Math.PI / 4, add: true, s0: .7 });
    }
    case 'spinpower':{
      const a = Math.max(0, 1 - Math.pow(k, 1.6));
      vfxDraw('hit_slash_0', x, y, r * 2.1, { rot: k * 7 + Math.PI / 4, alpha: a, add: true });
      return vfxDraw('hit_slash_2', x, y, r * 2.1, { rot: k * 7 + Math.PI * 1.25, alpha: a, add: true });
    }
    case 'hit':       return vfxPlay('hit_spark_' + (f.crit ? 3 : vfxPick(f, [0, 2, 4])), x, y, r * 2.2, k, { add: true, s0: .45 });
    case 'hurt':      return vfxPlay('hit_spark_1', x, y, r * 2.0, k, { add: true, s0: .5 });
    case 'kill':      return vfxPlay('hit_rock_12', x, y + 6, r * 2.4, k, { base: true, s0: .5, alpha: .9 });
    default:          return vfxPlay('hit_spark_' + vfxPick(f, [0, 2, 4]), x, y, Math.max(70, r * 2.4), k, { add: true, s0: .5 });
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
const VFX_AURA = { shot_fire:'#ff8a2a', shot_ice:'#7ddcff', shot_dark:'#a050ff', shot_holy:'#ffe9a0', shot_poison:'#8cff38', shot_rock:'' };
// 플레이어가 쏘는 지팡이 투사체. 그렸으면 true
function vfxShot(s, a){
  const nm = s.kind === 'ice' ? 'shot_ice' : s.kind === 'fire' ? 'shot_fire' : '';
  if (!nm || !vfxReady(nm)) return false;
  vfxAura(s.x, s.y, VFX_AURA[nm], 36);
  return vfxDraw(nm, s.x, s.y, s.kind === 'ice' ? 78 : 70, { rot: a - VFX_HEAD[nm] * Math.PI / 180, alpha: 1 });
}
// ---- 바닥 층: 캐릭터·몬스터보다 아래에 깔리는 효과 (town.js 그리기 순서에서 스프라이트 앞에 부름) ----
function vfxGroundPass(){
  if (!sfx.length || !vfxReady('burst_fire_0')) return;
  for (const f of sfx){
    const k = f.t / (VFX_DUR[f.type] || .38); if (k < 0 || k >= 1) continue;
    const x = f.x == null ? P.x : f.x, y = f.y == null ? P.y - 30 : f.y, r = f.r || 72;
    // 시전 마법진은 캐릭터 발에 붙어 따라다닌다(달리면서 써도 발밑에 있음)
    if (f.type === 'castfire') vfxCastCircle(k, P.x, P.y + 4, r, '#ff7a2a', '#ffd9a0', 'ring_red');
    else if (f.type === 'castice') vfxCastCircle(k, P.x, P.y + 4, r, '#5fcfff', '#e8fbff', 'ring_blue');
    else if (f.type === 'fireburst') vfxGroundBurst(k, x, y + 14, r, '#ff8a2a', true);
    else if (f.type === 'iceburst' || f.type === 'icehit') vfxGroundBurst(k, x, y + 12, f.type === 'icehit' ? r * 1.3 : r, '#8de4ff', false);
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
  if (h.kind === 'lightning'){ vfxGroundBurst(k, h.x, h.y + 8, r * 1.5, '#ffe45c', false); return vfxPlay('burst_volt_0', h.x, h.y + 8, r * 3.6, k, { base: true, s0: .8 }); }
  if (h.kind === 'slime'){ vfxGroundBurst(k, h.x, h.y + 8, r * 1.3, '#8cff38', false); return vfxPlay('burst_poison_1', h.x, h.y + 8, r * 2.6, k, { base: true }); }
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
