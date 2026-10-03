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
    case 'fireburst': return vfxPlay('burst_fire_' + vfxPick(f, [0, 1, 2]), x, y + 14, Math.max(150, r * 3.1), k, { base: true });
    case 'iceburst':  return vfxPlay('burst_ice_' + vfxPick(f, [0, 2, 4]), x, y + 14, Math.max(140, r * 3.0), k, { base: true });
    case 'icehit':    return vfxPlay('burst_ice_2', x, y + 10, Math.max(100, r * 3.2), k, { base: true });
    case 'heal':      return vfxPlay('heal_green', x, y + 20, r * 3.0, k, { s0: .75 });
    case 'castfire':  return vfxPlay('ring_red', x, y + 32, Math.max(110, r * 3.0), k, { s0: .6, sy: .9 });
    case 'castice':   return vfxPlay('ring_blue', x, y + 32, Math.max(110, r * 3.0), k, { s0: .6, sy: .9 });
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
// 플레이어가 쏘는 지팡이 투사체. 그렸으면 true
function vfxShot(s, a){
  const nm = s.kind === 'ice' ? 'shot_ice' : s.kind === 'fire' ? 'shot_fire' : '';
  if (!nm || !vfxReady(nm)) return false;
  return vfxDraw(nm, s.x, s.y, s.kind === 'ice' ? 78 : 70, { rot: a - VFX_HEAD[nm] * Math.PI / 180, alpha: 1 });
}
// 몬스터가 쏘는 투사체. 그렸으면 true
function vfxEnemyShot(s){
  const nm = ({ rock:'shot_rock', stone:'shot_rock', burn:'shot_fire', slow:'shot_ice', web:'shot_ice', feather:'shot_holy' })[s.kind] || 'shot_dark';
  if (!vfxReady(nm)) return false;
  const a = Math.atan2(s.vy, s.vx), w = s.kind === 'feather' ? 44 : s.kind === 'web' ? 46 : 58;
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
  if (h.kind === 'lightning') return vfxPlay('burst_volt_0', h.x, h.y + 8, r * 4.6, k, { base: true, s0: .8 });
  if (h.kind === 'slime') return vfxPlay('burst_poison_1', h.x, h.y + 8, r * 3.2, k, { base: true });
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
