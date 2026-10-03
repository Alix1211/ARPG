// ======================= 확장 액티브 스킬 (2차 묶음) =======================
// 설계: docs/skills_design.md 제안안 v1 (케인 승인 전 기본안). town.js cast()가 SK2의 id를 castExtra()로 넘긴다.
// 이 파일은 vfx.js 다음에 town.js 안으로 합쳐지므로 ctx, P, SK, CD, shots, sfx, pops 등을 그대로 쓴다.
const GCD = .9;   // 스킬을 쓰면 다른 슬롯도 이만큼 잠깐 잠긴다(큰 스킬 연타 방지)
const SK2 = {
  fire2:{mp:14,cd:4.5},                 // 화염 폭풍: 자기 중심 방사
  fire3:{mp:40,cd:15,root:.7},          // 운석 낙하: 지정 지점 유성 + 화염 장판
  ice2:{mp:9,cd:5},                     // 서리 돌풍: 전방 부채꼴 + 둔화(5랭크 빙결 확률)
  bolt1:{mp:5,cd:1.0},                  // 번개 구체: 전방 60도 3발, 아주 느리게 관통하며 계속 감전
  bolt2:{mp:17,cd:6},                   // 연쇄 벼락: 명중 후 주변으로 튕김(2→3→4)
  dark1:{mp:4,cd:.9},                   // 심연의 파편: 발밑에서 퍼지는 좁은 전방위 충격 + 낮은 확률 혼돈
  dark3:{mp:45,cd:18,root:.6},          // 파멸의 링: 퍼지는 원형 충격파(5랭크 흡혈)
  sword3:{mp:13,cd:12,root:.35},        // 초승달 검기: 멀리 나가는 관통 검기
  bow2:{mp:8,cd:4.5},                   // 산탄 사격: 부채꼴 5~7발
  fist2:{mp:6,cd:4},                    // 파동권: 직선 투기(4랭크 관통)
};
Object.assign(SK, SK2);
const SK2_POP = { fire2:'화염 폭풍!', fire3:'운석 낙하!', ice2:'서리 돌풍!', bolt2:'연쇄 벼락!', dark3:'파멸의 링!', sword3:'초승달 검기!', bow2:'산탄 사격!', fist2:'파동권!' };
const zones = [];   // 시간이 걸리는 효과(운석, 파멸의 링)

const skBody = t => ({ x:t.x, y:t.y - (t.h || 60) * .45 });   // 몸통 중심
const skGround = (t, z) => Math.hypot(t.x - z.x, (t.y - z.y) * 1.3);   // 바닥 기준 거리(세로를 조금 늘려 잼)

// 쓸 수 있으면 true, 대상이 없어 못 썼으면 false(마나·쿨타임 되돌림)
function castExtra(id, d, rank, cm, mod, skillMul){
  const mag = Math.max(8, cm.magic) * mod.dmg * skillMul, phy = Math.max(1, cm.phys) * mod.dmg * skillMul;
  const home = (P.passives && P.passives.magicGuide) || 0;
  const ang = Math.atan2(d[1], d[0]), ox = P.x + d[0] * 28, oy = P.y - 44 + d[1] * 28;
  const popName = () => { if (SK2_POP[id]) pops.push({ x:P.x, y:P.y - 115, t:0, txt:SK2_POP[id], crit:true }); };
  switch (id){
    case 'fire2': {
      const R = 150 + (rank >= 4 ? 25 : 0), dm = Math.round(mag * (1 + (cm.fire || 0) / 100) * (6.2 + rank * .18));
      let n = 0;
      for (const t of combatTargets()){
        if (Math.hypot(t.x - P.x, t.y - P.y) < R + 16){
          hitTarget(t, [Math.sign(t.x - P.x) || 1, Math.sign(t.y - P.y) || 0], true, dm);
          if (rank >= 3 || Math.random() < .4) applyMonsterStatus(t, 'burn', 3 + rank * .25);
          n++;
        }
      }
      sfx.push({ type:'castfire', t:0, x:P.x, y:P.y - 36, r:64 }, { type:'firestorm', t:0, x:P.x, y:P.y - 30, r:R });
      if (n) popName();
      return true;
    }
    case 'fire3': {
      const tg = nearestShotTarget(P.x, P.y - 30, 420);
      let gx = tg ? tg.x : P.x + d[0] * 170, gy = tg ? tg.y : P.y + d[1] * 130;
      if (blocked(gx, gy)){ gx = P.x + d[0] * 50; gy = P.y + d[1] * 40; }
      const em = mag * (1 + (cm.fire || 0) / 100);
      zones.push({ type:'meteor', map:(typeof MAP !== 'undefined' ? MAP : ''), x:gx, y:gy, t:0, delay:.85, r:125 + (rank >= 5 ? 15 : 0),
        dmg:Math.round(em * (9 + rank * .3)), tickDmg:Math.round(em * (.8 + rank * .04)), life:3 + (rank >= 4 ? 2 : 0), hit:false, tick:.5 });
      sfx.push({ type:'castfire', t:0, x:P.x, y:P.y - 36, r:72 });
      return true;
    }
    case 'ice2': {
      const R = 200, half = 55 * Math.PI / 180, dm = Math.round(mag * (1 + (cm.ice || 0) / 100) * (4.0 + rank * .12));
      let n = 0;
      for (const t of combatTargets()){
        const dx = t.x - P.x, dy = t.y - P.y, dist = Math.hypot(dx, dy);
        if (dist < R + 16 && (dist < 24 || Math.acos(Math.max(-1, Math.min(1, (dx * d[0] + dy * d[1]) / dist))) < half)){
          hitTarget(t, d, true, dm);
          if (rank >= 5 && Math.random() < .2) applyMonsterStatus(t, 'freeze', 1.5); else applyMonsterStatus(t, 'slow', 3 + rank * .3);
          n++;
        }
      }
      sfx.push({ type:'castice', t:0, x:P.x, y:P.y - 34, r:54 }, { type:'frostwave', t:0, a:ang, x:P.x, y:P.y - 30, r:R });
      if (n) popName();
      return true;
    }
    case 'bolt1': {
      // 전기 구체 3개가 전방 60도로 아주 느리게 퍼져 나가며, 닿아 있는 동안 계속 감전시킨다
      const rng = 360 + home * 80, aim = home > 0 ? magicAim(95, rng) : { vx:d[0] * 95, vy:d[1] * 95 };
      const a0 = Math.atan2(aim.vy, aim.vx), tick = Math.round(mag * (.28 + rank * .014));   // 느려진 만큼 한 적에게 틱이 더 많이 들어가므로 틱 피해를 낮춤
      for (const off of [-1, 0, 1]){
        const a = a0 + off * Math.PI / 6;
        shots.push({ x:P.x + Math.cos(a0) * 28, y:P.y - 44 + Math.sin(a0) * 28, vx:Math.cos(a) * 95, vy:Math.sin(a) * 95, speed:95, t:0, life:4.4, kind:'bolt',
          pierce:true, rehit:.24, hit:new Map(), hw:30, blast:0, fx:'voltburst', dmg:tick, stagger:false });
      }
      sfx.push({ type:'castbolt', t:0, x:P.x, y:P.y - 34, r:34 });
      return true;
    }
    case 'bolt2': {
      const first = nearestShotTarget(P.x, P.y - 44, 380);
      if (!first){ say('주변에 적이 없습니다'); return false; }
      const jumps = rank >= 5 ? 4 : rank >= 3 ? 3 : 2, dm0 = mag * (3.6 + rank * .1), used = new Set();
      let cur = first, from = { x:P.x, y:P.y - 50 };
      const pts = [from];
      for (let i = 0; i <= jumps && cur; i++){
        used.add(cur);
        const c = skBody(cur); pts.push(c);
        hitTarget(cur, [Math.sign(cur.x - from.x) || 1, 0], true, Math.round(dm0 * Math.pow(.9, i)));
        from = c;
        let nx = null, bd = 190;
        for (const t of combatTargets()){
          if (used.has(t)) continue;
          const b = skBody(t), dd = Math.hypot(b.x - from.x, b.y - from.y);
          if (dd < bd){ bd = dd; nx = t; }
        }
        cur = nx;
      }
      sfx.push({ type:'castbolt', t:0, x:P.x, y:P.y - 36, r:60 }, { type:'chain', t:0, pts, x:P.x, y:P.y - 40, r:40 });
      popName();
      return true;
    }
    case 'dark1': {
      // 발밑에서 원이 360도로 퍼지고(0.28초) 그대로 머물며 0.28초마다 3번 벤다(총 0.84초). 한 번당 화염구의 7.5%. 낮은 확률로 혼돈(대상당 한 번만 굴림).
      zones.push({ type:'darkpulse', map:(typeof MAP !== 'undefined' ? MAP : ''), x:P.x, y:P.y, t:0, exp:.28, dur:.84, R:118 + rank * 6, nextTick:.28, chaosRolled:new Set(),
        dmg:Math.round(mag * (2.45 + rank * .08) * .25 * .3), chaos:.12 + rank * .02 });
      sfx.push({ type:'castdark', t:0, x:P.x, y:P.y - 34, r:30 });
      return true;
    }
    case 'dark3': {
      zones.push({ type:'voidring', map:(typeof MAP !== 'undefined' ? MAP : ''), x:P.x, y:P.y, t:0, dur:.6, R:230 + (rank >= 4 ? 20 : 0), hit:new Set(),
        dmg:Math.round(mag * (13 + rank * .4)), drain:rank >= 5 ? .12 : 0 });
      sfx.push({ type:'castdark', t:0, x:P.x, y:P.y - 36, r:72 });
      popName();
      return true;
    }
    case 'sword3': {
      const hw = 60 + (rank >= 5 ? 14 : 0);
      shots.push({ x:ox, y:oy, vx:d[0] * 620, vy:d[1] * 620, speed:620, t:0, life:.85 + (rank >= 5 ? .15 : 0), kind:'blade', pierce:true, hit:new Set(), hw, blast:0, fx:'impact',
        dmg:Math.round(phy * (5.8 + rank * .16)), stagger:true });
      sfx.push({ type:'slashpower', t:0, a:ang, x:P.x, y:P.y - 30, r:110 });
      popName();
      return true;
    }
    case 'bow2': {
      const n = rank >= 5 ? 7 : rank >= 3 ? 6 : 5, spread = 60 * Math.PI / 180, dm = Math.round(phy * (.95 + rank * .03));
      for (let i = 0; i < n; i++){
        const a = ang + (i / (n - 1) - .5) * spread;
        shots.push({ x:ox, y:oy, vx:Math.cos(a) * 720, vy:Math.sin(a) * 720, speed:720, t:0, life:.5, kind:'bow', blast:0, dmg:dm });
      }
      popName();
      return true;
    }
    case 'fist2': {
      const pr = rank >= 4;
      shots.push({ x:ox, y:oy, vx:d[0] * 560, vy:d[1] * 560, speed:560, t:0, life:.75, kind:'wave', blast:pr ? 0 : 40, pierce:pr, hit:new Set(), hw:30, fx:'waveburst',
        dmg:Math.round(phy * (3.4 + rank * .1)), stagger:true });
      sfx.push({ type:'impact', t:0, x:P.x + d[0] * 34, y:P.y - 40, r:36 });
      popName();
      return true;
    }
  }
  return false;
}

// 관통 투사체가 한 대상에 처음 닿았을 때
function pierceHit(s, t){
  hitTarget(t, [Math.sign(t.x - s.x) || Math.sign(s.vx) || 1, Math.sign(s.vy) * .4 || 0], !!s.stagger, s.dmg);
  if (s.status) applyMonsterStatus(t, s.status, s.statusDur || 2.5);
  sfx.push({ type:s.fx || 'impact', t:0, x:t.x, y:t.y - (t.h || 60) * .5, r:34 });
  if (s.mpGain && (s.mpGot || 0) < (s.mpCap || 2)){ s.mpGot = (s.mpGot || 0) + s.mpGain; P.mp = Math.min(P.maxMp, P.mp + s.mpGain * NUM); syncBars(); }
}

function updZones(dt){
  for (let i = zones.length - 1; i >= 0; i--){
    const z = zones[i];
    if (typeof MAP !== 'undefined' && z.map !== MAP){ zones.splice(i, 1); continue; }
    z.t += dt;
    if (z.type === 'meteor'){
      if (!z.hit && z.t >= z.delay){
        z.hit = true;
        for (const t of combatTargets()) if (skGround(t, z) < z.r){ hitTarget(t, [Math.sign(t.x - z.x) || 1, Math.sign(t.y - z.y) || 0], true, z.dmg); applyMonsterStatus(t, 'burn', 3.5); }
        sfx.push({ type:'fireburst', t:0, x:z.x, y:z.y - 14, r:z.r });
      }
      if (z.hit){
        z.tick -= dt;
        if (z.tick <= 0){ z.tick += .5; for (const t of combatTargets()) if (skGround(t, z) < z.r * .85){ hitTarget(t, [0, 0], false, z.tickDmg); applyMonsterStatus(t, 'burn', 2.5); } }
      }
      if (z.t > z.delay + z.life) zones.splice(i, 1);
    } else if (z.type === 'darkpulse'){
      const e = Math.min(1, z.t / z.exp), cr = z.R * (1 - Math.pow(1 - e, 2));
      while (z.nextTick <= z.dur + .001 && z.t >= z.nextTick){
        z.nextTick += .28;
        for (const t of combatTargets()){
          if (skGround(t, z) > cr + 14) continue;
          hitTarget(t, [Math.sign(t.x - z.x) || 1, Math.sign(t.y - z.y) || 0], false, z.dmg);
          if (!z.chaosRolled.has(t)){ z.chaosRolled.add(t); if (Math.random() < z.chaos){ applyMonsterStatus(t, 'confuse', 2.5); pops.push({ x:t.x, y:t.y - (t.h || 60) - 6, t:0, txt:'혼돈!', crit:true }); } }
        }
      }
      if (z.t > z.dur + .3) zones.splice(i, 1);
    } else if (z.type === 'voidring'){
      const e = Math.min(1, z.t / z.dur), cr = z.R * (1 - Math.pow(1 - e, 2));
      for (const t of combatTargets()){
        if (z.hit.has(t) || skGround(t, z) > cr + 14) continue;
        z.hit.add(t);
        hitTarget(t, [Math.sign(t.x - z.x) || 1, Math.sign(t.y - z.y) || 0], true, z.dmg);
        applyMonsterStatus(t, 'slow', 2.5);
        if (z.drain){ const v = Math.round(z.dmg * z.drain); P.hp = Math.min(P.maxHp, P.hp + v); syncBars(); pops.push({ x:P.x, y:P.y - 100, t:0, txt:'+' + v, heal:true }); }
      }
      if (z.t > z.dur + .35) zones.splice(i, 1);
    }
  }
}
