// ======================= 확장 액티브 스킬 (2차 묶음) =======================
// 설계: docs/skills_design.md 제안안 v1 (케인 승인 전 기본안). town.js cast()가 SK2의 id를 castExtra()로 넘긴다.
// 이 파일은 vfx.js 다음에 town.js 안으로 합쳐지므로 ctx, P, SK, CD, shots, sfx, pops 등을 그대로 쓴다.
const GCD = .9;   // 스킬을 쓰면 다른 슬롯도 이만큼 잠깐 잠긴다(큰 스킬 연타 방지)
const SK2 = {
  holy2_shield:{mp:20,cd:15},
  holy3_revive:{mp:0,cd:180},
  ice3:{mp:35,cd:14,root:.35},
  bolt3:{mp:43,cd:16,root:.4},
  dark2:{mp:15,cd:7},
  fire2:{mp:14,cd:4.5},                 // 화염 폭풍: 자기 중심 방사
  fire3:{mp:40,cd:15,root:.7},          // 운석 낙하: 지정 지점 유성 + 화염 장판
  ice2:{mp:9,cd:5},                     // 서리 돌풍: 전방 부채꼴 + 둔화(5랭크 빙결 확률)
  bolt1:{mp:5,cd:1.0},                  // 번개 구체: 전방 60도 3발, 아주 느리게 관통하며 계속 감전
  bolt2:{mp:17,cd:6},                   // 연쇄 벼락: 명중 후 주변으로 튕김(2→3→4)
  dark1:{mp:4,cd:.9},                   // 심연의 파편: 발밑에서 퍼지는 좁은 전방위 충격 + 낮은 확률 혼돈
  dark3:{mp:45,cd:18,root:.6},          // 파멸의 링: 퍼지는 원형 충격파(5랭크 흡혈)
  spear1:{mp:4,cd:2},                    // 연속 찌르기: 좁은 직선 3연타
  spear2:{mp:7,cd:5},                    // 투창 강타: 투창 명중점 폭발
  spear3:{mp:16,cd:14,root:.45},         // 강하 찌르기: 지정 지점 낙하 충격파
  bow1:{mp:4,cd:1.5},                    // 맹독 화살: 단일 + 독 도트
  bow3:{mp:15,cd:12,root:.35},           // 화살 비: 넓은 원형 다단 장판
  fist1:{mp:3,cd:2},                     // 돌진 격: 짧은 대시 + 준비동작 캔슬
  fist3:{mp:16,cd:12,root:.35},          // 지진 쇄: 제자리 원형 3연타
  sword3:{mp:13,cd:12,root:.35},        // 초승달 검기: 멀리 나가는 관통 검기
  bow2:{mp:8,cd:4.5},                   // 산탄 사격: 부채꼴 5~7발
  fist2:{mp:6,cd:4},                    // 파동권: 직선 투기(4랭크 관통)
};
Object.assign(SK, SK2);
const SK2_POP = { fire2:'화염 폭풍!', fire3:'운석 낙하!', ice2:'서리 돌풍!', bolt2:'연쇄 벼락!', dark3:'파멸의 링!',
  spear1:'연속 찌르기!', spear2:'투창 강타!', spear3:'강하 찌르기!', bow1:'맹독 화살!', bow3:'화살 비!', fist1:'돌진 격!', fist3:'지진 쇄!',
  sword3:'초승달 검기!', bow2:'산탄 사격!', fist2:'파동권!' };
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
    case 'holy2_shield': {
      const v=Math.round(P.maxHp*(.6+rank*.08)*skillMul);
      P.shield=v;P.shieldMax=v;P.shieldT=rank>=4?8:5;P.shieldRank=rank;P.shieldKind='holy';syncBars();
      pops.push({x:P.x,y:P.y-100,t:0,txt:'성역의 방패 '+v,heal:true});
      sfx.push({type:'holyshield',t:0,x:P.x,y:P.y-30,r:70});return true;
    }
    case 'holy3_revive': {
      if(P.reviveArmed || (P.reviveReadyAt||0)>Date.now()){say(P.reviveArmed?'소생이 이미 준비되어 있습니다':'소생을 다시 준비하려면 기다려야 합니다');return false;}
      P.reviveArmed=true;P.reviveRank=rank;P.reviveReadyAt=Date.now()+180000;
      sfx.push({type:'heal',t:0,x:P.x,y:P.y-20,r:65});pops.push({x:P.x,y:P.y-110,t:0,txt:'소생 준비',heal:true});
      if(window.UI&&UI.save)UI.save();return true;
    }
    case 'ice3': {
      const hits=8+rank-1, dur=4;
      zones.push({type:'blizzard',map:MAP,x:P.x,y:P.y,t:0,dur,R:180,nextTick:dur/hits,interval:dur/hits,
        dmg:Math.round(mag*(1+(cm.ice||0)/100)*2.53*4.8/8),freeze:.06+rank*.035});
      sfx.push({type:'castice',t:0,x:P.x,y:P.y-34,r:72});
      return true;
    }
    case 'bolt3': {
      zones.push({type:'thunderstorm',map:MAP,x:P.x,y:P.y,t:0,dur:.95,R:70,d:d.slice(),nextTick:.15,interval:.35,hits:0,
        dmg:Math.round(mag*2.53*5.8/3),paralyze:rank>=5});
      sfx.push({type:'castbolt',t:0,x:P.x,y:P.y-34,r:65});
      return true;
    }
    case 'dark2': {
      const target=nearestShotTarget(P.x,P.y-30,360), dur=4+(rank>=4?1:0);
      let x=target?target.x:P.x+d[0]*160,y=target?target.y:P.y+d[1]*160;
      if(blocked(x,y)){x=P.x+d[0]*45;y=P.y+d[1]*45;}
      zones.push({type:'swamp',map:MAP,x,y,t:0,dur,R:130,nextTick:.5,interval:.5,dmg:Math.round(mag*2.53*2.7/8)});
      sfx.push({type:'castdark',t:0,x:P.x,y:P.y-34,r:55});
      return true;
    }
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
    case 'spear1': {
      zones.push({type:'spearcombo',map:MAP,x:P.x,y:P.y,d:d.slice(),t:0,dur:.4,nextTick:.02,interval:.12,hits:0,
        R:150+rank*4,width:27,dmg:Math.round(phy*(.68+rank*.025))});
      sfx.push({type:'spearthrust',t:0,a:ang,x:P.x+d[0]*90,y:P.y-34+d[1]*90,r:42});
      popName();return true;
    }
    case 'spear2': {
      shots.push({x:ox,y:oy,vx:d[0]*650,vy:d[1]*650,speed:650,t:0,life:.85,kind:'spear',blast:64+rank*4,
        fx:'spearburst',dmg:Math.round(phy*(3.7+rank*.12)),stagger:true});
      popName();return true;
    }
    case 'spear3': {
      const tg=nearestShotTarget(P.x,P.y-30,300);
      let x=tg?tg.x:P.x+d[0]*165,y=tg?tg.y:P.y+d[1]*165;if(blocked(x,y)){x=P.x+d[0]*55;y=P.y+d[1]*55;}
      zones.push({type:'spearfall',map:MAP,x,y,t:0,delay:.42,r:125+(rank-1)*6,dmg:Math.round(phy*(7+rank*.2)),hit:false});
      popName();return true;
    }
    case 'bow1': {
      shots.push({x:ox,y:oy,vx:d[0]*840,vy:d[1]*840,speed:840,t:0,life:.78,kind:'bow',blast:0,
        dmg:Math.round(phy*(1.7+rank*.06)),status:'poison',statusDur:4+rank*.3,fx:'poisonburst'});
      popName();return true;
    }
    case 'bow3': {
      const tg=nearestShotTarget(P.x,P.y-30,360);let x=tg?tg.x:P.x+d[0]*175,y=tg?tg.y:P.y+d[1]*175;
      if(blocked(x,y)){x=P.x+d[0]*55;y=P.y+d[1]*55;}
      zones.push({type:'arrowrain',map:MAP,x,y,t:0,dur:3.2,R:180+rank*8,nextTick:.25,interval:.4,
        dmg:Math.round(phy*(.95+rank*.04))});
      popName();return true;
    }
    case 'fist1': {
      const x0=P.x,y0=P.y,dist=86+rank*5,step=7;
      for(let q=0;q<dist;q+=step){const nx=P.x+d[0]*step,ny=P.y+d[1]*step;if(blocked(nx,ny))break;P.x=nx;P.y=ny;}
      const sx=P.x-x0,sy=P.y-y0,L2=sx*sx+sy*sy||1;
      for(const t of combatTargets()){
        const px=t.x-x0,py=t.y-y0,u=Math.max(0,Math.min(1,(px*sx+py*sy)/L2)),cx=x0+sx*u,cy=y0+sy*u;
        if(Math.hypot(t.x-cx,t.y-cy)<44)hitTarget(t,d,true,Math.round(phy*(2+rank*.07)),12);
      }
      sfx.push({type:'fistdash',t:0,x:P.x,y:P.y-34,r:58});popName();return true;
    }
    case 'fist3': {
      zones.push({type:'fistquake',map:MAP,x:P.x,y:P.y,t:0,dur:.62,R:125+rank*9,nextTick:.04,interval:.2,hits:0,
        dmg:Math.round(phy*(2.2+rank*.08))});
      popName();return true;
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
    if (z.type === 'blizzard' || z.type === 'swamp' || z.type === 'thunderstorm'){
      if(z.type==='blizzard'){z.x=P.x;z.y=P.y;}
      while(z.nextTick<=z.dur+.001 && z.t>=z.nextTick){
        z.nextTick+=z.interval;
        const thunder=z.type==='thunderstorm',center=thunder?{x:z.x+z.d[0]*(95+z.hits*90),y:z.y+z.d[1]*(95+z.hits*90)}:z;
        for(const target of combatTargets()) if(skGround(target,center)<z.R+14){
          hitTarget(target,[0,0],false,z.dmg);
          if(!thunder)applyMonsterStatus(target,'slow',.8);
          if(z.freeze && Math.random()<z.freeze)applyMonsterStatus(target,'freeze',.6);
          if(z.paralyze)applyMonsterStatus(target,'freeze',1);
        }
        if(thunder){z.hits++;sfx.push({type:'thunderstrike',t:0,x:center.x,y:center.y-14,r:z.R});}
      }
      if(z.t>z.dur+.05)zones.splice(i,1);
    } else if(z.type==='spearcombo'){
      while(z.hits<3&&z.t>=z.nextTick){
        z.nextTick+=z.interval;const third=z.hits===2;z.hits++;
        for(const target of combatTargets()){
          const dx=target.x-z.x,dy=target.y-z.y,along=dx*z.d[0]+dy*z.d[1],side=Math.abs(dx*z.d[1]-dy*z.d[0]);
          if(along>-10&&along<z.R&&side<z.width)hitTarget(target,z.d,third,Math.round(z.dmg*(third?1.5:1)),third?36:20);
        }
        sfx.push({type:'spearthrust',t:0,a:Math.atan2(z.d[1],z.d[0]),x:z.x+z.d[0]*(72+z.hits*12),y:z.y-34+z.d[1]*(72+z.hits*12),r:third?55:38,crit:third});
      }
      if(z.hits>=3&&z.t>z.dur)zones.splice(i,1);
    } else if(z.type==='spearfall'){
      if(!z.hit&&z.t>=z.delay){z.hit=true;for(const target of combatTargets())if(skGround(target,z)<z.r+14)hitTarget(target,[Math.sign(target.x-z.x)||1,Math.sign(target.y-z.y)||0],true,z.dmg,38);
        sfx.push({type:'spearburst',t:0,x:z.x,y:z.y-12,r:z.r});}
      if(z.t>z.delay+.45)zones.splice(i,1);
    } else if(z.type==='arrowrain'){
      while(z.nextTick<=z.dur+.001&&z.t>=z.nextTick){z.nextTick+=z.interval;
        for(const target of combatTargets())if(skGround(target,z)<z.R+14){hitTarget(target,[0,0],false,z.dmg);applyMonsterStatus(target,'slow',.9);}
      }
      if(z.t>z.dur+.05)zones.splice(i,1);
    } else if(z.type==='fistquake'){
      while(z.hits<3&&z.t>=z.nextTick){z.nextTick+=z.interval;z.hits++;
        for(const target of combatTargets())if(skGround(target,z)<z.R+14){hitTarget(target,[Math.sign(target.x-z.x)||1,Math.sign(target.y-z.y)||0],true,z.dmg,28);applyMonsterStatus(target,'slow',1.5);}
        sfx.push({type:'quake',t:0,x:z.x,y:z.y-8,r:z.R*(.7+z.hits*.1)});
      }
      if(z.hits>=3&&z.t>z.dur)zones.splice(i,1);
    } else if (z.type === 'meteor'){
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

// 소생은 한 번 준비하면 사망 시 소모된다. 재사용 시각은 저장해 재접속으로 초기화되지 않는다.
function tryRevivePlayer(){
  if(!P.reviveArmed)return false;
  P.reviveArmed=false;
  const rank=Math.max(1,Math.min(5,P.reviveRank||1));
  P.hp=Math.max(1,Math.round(P.maxHp*(.3+(rank-1)*.175)));
  P.reviveReadyAt=Date.now()+180000;CD.holy3_revive=180;P.reviveGrace=1.5;playerInv=1.5;
  P.castRoot=0;P.atk=null;P.shield=0;
  for(const key in PLAYER_STATUS)PLAYER_STATUS[key]=0;
  syncBars();sfx.push({type:'resurrection',t:0,x:P.x,y:P.y-20,r:110});
  pops.push({x:P.x,y:P.y-110,t:0,txt:'기적의 소생!',heal:true});
  if(window.UI&&UI.save)UI.save();return true;
}
