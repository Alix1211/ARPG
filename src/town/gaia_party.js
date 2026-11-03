'use strict';
// 가이아 대륙 3인 파티: 카일(직접 조작) + 아가사·실비아(AI).
// 기존 용병의 이동·길찾기·타격 모션을 각 동료에게 독립적으로 적용한다.
const GAIA_PARTY_IDS=['merc_f_sword','merc_f_mage'];
const GAIA_PARTY_NAMES=['아가사','실비아'];
const GAIA_LEASH=430;
const GAIA_M_MAX=100;
// 케인 확정(2026-11-03): 몽둥이=가까이서 넓게 때려 M을 크게 채움(몹에게도 약한 데미지), 채찍=멀리서 M이 낮은 동료를 자동 겨냥(몹 데미지 없음).
const GAIA_WHIP_RANGE=520,GAIA_WHIP_M=10,GAIA_CLUB_M=22;
const GAIA_M_LOW=8,GAIA_M_RESUME=40,GAIA_M_START=45;   // M이 8 밑이면 카일 곁으로 돌아와 맞고, 40이 되면 다시 싸운다
const GAIA_KO_TIME=15;                                    // 쓰러진 동료가 일어나기까지(초). 카일이 쓰러지면 기존처럼 전원 마을 부활
const gaiaFx=[];
// 균형 조정값(시뮬레이션으로 맞춤). 동료는 M이 찰수록만 강해진다(M 0이면 기본 능력).
// take=M 0일 때 동료가 받는 피해 배율, mGuard=M이 가득일 때 추가로 줄어드는 비율,
// out=M 0일 때 동료 공격력 배율, mDmg=M이 가득일 때 추가 공격력 배율, hpMul=동료 최대 체력 배율, heal=실비아 치유 비율,
// mob=가이아 몬스터 난이도(체력·공격력 배율, 몬스터 생성 시 적용 — 단일 조절값).
const GAIA_TUNE={take:.8,mGuard:.5,out:1.4,mDmg:1.5,hpMul:1,heal:.3,mob:1.3};
const GAIA_HEAL_M=35,GAIA_SHIELD_M=55;   // 실비아 치유·보호막의 M 소모량
window.GAIA_TUNE=GAIA_TUNE;
const gaiaMembers=[];
const gaiaTargets=[null,null],gaiaAttacks=[null,null];
let gaiaHudWait=0;
const gaiaUpdateOriginal=updateCompanion;
const gaiaDrawOriginal=drawCompanion;

// 세 명이 뭉쳐서 조심조심 다닌다: 몹 탐지·추격 범위를 좁힌다(아가사는 카일 곁 가까이에서만 싸움).
Object.assign(COMPANION_DEF.merc_f_sword,{aggro:300,pursuit:330,warpCombat:760});
Object.assign(COMPANION_DEF.merc_f_mage,{aggro:300,pursuit:360,warpCombat:760});
for(let i=0;i<GAIA_PARTY_IDS.length;i++){
  const id=GAIA_PARTY_IDS[i];
  if(COMPANION_DEF[id])COMPANION_DEF[id].name=GAIA_PARTY_NAMES[i];
  if(A.companions?.[id])A.companions[id].name=GAIA_PARTY_NAMES[i];
  if(COMPANION_IMG[id])COMPANION_IMG[id].name=GAIA_PARTY_NAMES[i];
}

function gaiaStatMax(i){return Math.max(NUM,Math.round(P.maxHp*(i===0?1.3:1.05)*GAIA_TUNE.hpMul));}
function gaiaManaMax(i){return Math.max(NUM,Math.round(P.maxMp*(i===0?.65:1.55)));}
function gaiaMakeMember(i,previous){
  const c=companionEmpty(),id=GAIA_PARTY_IDS[i],q=nearestSafePosition(P.x+(i===0?-70:70),P.y+24);
  c.active=id;c.mode='party';c.remaining=0;c.expired=false;
  c.x=q[0];c.y=q[1];c.lastX=c.x;c.lastY=c.y;c.lastMap=MAP;
  c.maxHp=gaiaStatMax(i);c.maxMp=gaiaManaMax(i);
  c.ko=false;c.koT=0;c.shield=0;c.shieldT=0;c.castCd=0;c.gaiaReturn=false;
  c.hp=previous&&Number.isFinite(+previous.hp)?Math.max(0,Math.min(c.maxHp,+previous.hp)):c.maxHp;
  c.mp=previous&&Number.isFinite(+previous.mp)?Math.max(0,Math.min(c.maxMp,+previous.mp)):c.maxMp;
  c.m=previous&&Number.isFinite(+previous.m)?Math.max(0,Math.min(GAIA_M_MAX,+previous.m)):GAIA_M_START;
  if(previous){
    c.skillCount=Math.max(0,+previous.skillCount||0);
    c.x=Number.isFinite(+previous.x)?+previous.x:c.x;
    c.y=Number.isFinite(+previous.y)?+previous.y:c.y;
    c.lastX=c.x;c.lastY=c.y;
    c.dir=['front','back','side'].includes(previous.dir)?previous.dir:c.dir;
    c.flip=!!previous.flip;
  }
  return c;
}
function gaiaEnsure(){
  if(gaiaMembers.length===2)return;
  gaiaMembers.splice(0,gaiaMembers.length,gaiaMakeMember(0),gaiaMakeMember(1));
}
function gaiaMemberIndex(c){return gaiaMembers.indexOf(c);}
function gaiaState(i){return gaiaMembers[i];}
function gaiaInLeash(c){return Math.hypot(c.x-P.x,c.y-P.y)<=GAIA_LEASH;}
function gaiaRecall(silent=false){
  gaiaEnsure();
  for(let i=0;i<gaiaMembers.length;i++){
    const c=gaiaMembers[i],theta=(i===0?2.6:.55),q=nearestSafePosition(P.x+Math.cos(theta)*74,P.y+Math.sin(theta)*74);
    c.x=q[0];c.y=q[1];c.lastX=c.x;c.lastY=c.y;c.lastMap=MAP;
    c.navPath=null;c.navWait=0;c.stuck=0;c.progressX=c.x;c.progressY=c.y;
    gaiaTargets[i]=null;gaiaAttacks[i]=null;
    companionFx.push({kind:'impact',x:c.x,y:c.y-40,t:0,life:.32});
  }
  if(!silent)say('카일의 소환 명령! 아가사와 실비아가 집합했습니다.');
}
function gaiaRefreshStats(c,i){
  const maxHp=gaiaStatMax(i),maxMp=gaiaManaMax(i);
  if(c.maxHp!==maxHp){c.hp=Math.min(maxHp,c.hp+Math.max(0,maxHp-c.maxHp));c.maxHp=maxHp;}
  if(c.maxMp!==maxMp){c.mp=Math.min(maxMp,c.mp+Math.max(0,maxMp-c.maxMp));c.maxMp=maxMp;}
  c.tier=Math.max(1,Math.min(7,Math.ceil((P.lv||1)/10)));
  // 두 히로인은 카일보다 기본 전투력이 높고, 카일의 지원으로 더 강해진다.
  c.damage=Math.max(1,Math.round(basicDamage()*(i===0?1.6:1.45)*(1+c.m/GAIA_M_MAX*GAIA_TUNE.mDmg)*GAIA_TUNE.out));
}
function gaiaUpdate(dt){
  gaiaEnsure();
  if(dt<=0)return;
  for(let i=0;i<2;i++){
    const c=gaiaMembers[i];
    gaiaRefreshStats(c,i);
    if(c.hp<=0&&!c.ko)gaiaKO(c,i);
    if(c.ko){
      c.koT-=dt;
      if(c.koT<=0){
        const q=nearestSafePosition(P.x+(i===0?-60:60),P.y+24);
        c.ko=false;c.hp=Math.round(c.maxHp*.4);c.m=GAIA_M_START;c.x=q[0];c.y=q[1];c.lastX=c.x;c.lastY=c.y;
        c.navPath=null;c.navWait=0;c.stuck=0;c.progressX=c.x;c.progressY=c.y;
        pops.push({x:c.x,y:c.y-95,t:0,txt:'복귀!',crit:true});
      }
      continue;
    }
    if(c.shield>0){c.shieldT-=dt;if(c.shieldT<=0)c.shield=0;}
    if(c.m<GAIA_M_LOW)c.mLow=true;else if(c.m>=GAIA_M_RESUME)c.mLow=false;
    // 실비아: 아가사가 쓰러졌거나 자기 체력이 위험하면 앞에 나서지 않고 카일 곁에서 치유·보호막만 쓴다.
    const support=i===1&&(gaiaMembers[0].ko||c.hp<c.maxHp*.45);
    c.gaiaReturn=!!c.mLow||support;
    if(!gaiaInLeash(c)){gaiaRecall(true);break;}
    companionState=c;companionTarget=gaiaTargets[i];companionAtk=gaiaAttacks[i];
    // 원래 AI는 고용 시간제한을 'hire'에만 적용하므로 party 모드에는 제한이 없다.
    gaiaUpdateOriginal(dt);
    gaiaMembers[i]=companionState;gaiaTargets[i]=companionTarget;gaiaAttacks[i]=companionAtk;
    if(c.m>0)c.m=Math.max(0,c.m-dt*1.1);
    if(i===1)gaiaCast(c,dt);   // 실비아: M으로 전체 힐·보호막
    if(!gaiaInLeash(c)){gaiaRecall(true);break;}
  }
  companionState=gaiaMembers[0];companionTarget=gaiaTargets[0];companionAtk=gaiaAttacks[0];
  gaiaHudWait-=dt;
  if(gaiaHudWait<=0){gaiaHudWait=.15;gaiaUpdateHud();}
}
function gaiaUpdateHud(){
  for(let i=0;i<gaiaMembers.length;i++){
    const c=gaiaMembers[i],hp=$('gaiaHp'+i),m=$('gaiaM'+i),num=$('gaiaNum'+i);
    if(hp)hp.style.width=Math.max(0,Math.min(100,c.hp/c.maxHp*100))+'%';
    if(m)m.style.width=Math.max(0,Math.min(100,c.m/GAIA_M_MAX*100))+'%';
    if(num)num.textContent=c.ko?'쓰러짐 '+Math.ceil(c.koT)+'초':'HP '+Math.ceil(c.hp/NUM)+' / M '+Math.round(c.m)+(c.shield>0?' 🛡':'');
  }
}
function gaiaAppend(list){gaiaEnsure();for(const c of gaiaMembers)if(!c.ko)list.push({companion:c,key:c.y});}
function gaiaDraw(c,dt){
  const i=gaiaMemberIndex(c);if(i<0)return gaiaDrawOriginal(c,dt);
  const old=companionAtk;
  companionAtk=gaiaAttacks[i];gaiaDrawOriginal(c,dt);companionAtk=old;
}
function gaiaFriendlySwing(dir,weapon){
  gaiaEnsure();
  const hit=[];
  for(const c of gaiaMembers){
    if(c.ko||c.hp<=0)continue;
    const dx=c.x-P.x,dy=c.y-P.y,dist=Math.hypot(dx,dy),along=dx*dir[0]+dy*dir[1];
    if(dist>Math.min(120,weapon.reach||90)||along<0)continue;
    if(weapon.cone&&dist>20&&along/dist<=Math.cos(weapon.cone*Math.PI/180))continue;
    if(!weapon.cone&&Math.abs(dx*dir[1]-dy*dir[0])>(weapon.width||38))continue;
    hit.push(c);
  }
  // 조준 보정: 근처(200 이내)에서 M이 가장 낮은 동료는 방향이 빗나가도 함께 맞아 M을 받는다(실비아도 굶지 않게).
  let low=null;
  for(const c of gaiaMembers){
    if(c.ko||c.hp<=0||Math.hypot(c.x-P.x,c.y-P.y)>200)continue;
    if(!low||c.m<low.m)low=c;
  }
  if(low&&!hit.includes(low))hit.push(low);
  for(const c of hit){
    // 아군을 때려서는 쓰러뜨리지 않는다(체력 1 아래로 내려가지 않음).
    const dmg=Math.max(1,Math.round(c.maxHp*.012));
    c.hp=Math.max(1,c.hp-dmg);c.m=Math.min(GAIA_M_MAX,c.m+GAIA_CLUB_M);
    pops.push({x:c.x,y:c.y-95,t:0,txt:'M +'+GAIA_CLUB_M,crit:true});
  }
}
// 채찍: 멀리서 M이 가장 낮은 동료를 자동으로 겨냥한다. 몹에게는 데미지가 없다.
function gaiaWhip(){
  gaiaEnsure();
  let best=null,score=1e9;
  for(const c of gaiaMembers){
    if(c.ko||c.hp<=0)continue;
    const d=Math.hypot(c.x-P.x,c.y-P.y);
    if(d>GAIA_WHIP_RANGE)continue;
    const sc=c.m/GAIA_M_MAX+d/4000;
    if(sc<score){score=sc;best=c;}
  }
  if(!best)return false;
  const dx=best.x-P.x,dy=best.y-P.y;
  if(Math.abs(dx)>Math.abs(dy)){P.dir='side';P.flip=dx<0;}else{P.dir=dy<0?'back':'front';P.flip=false;}
  if(P.atk){P.atk.dir=P.dir;P.atk.flip=P.flip;}
  best.hp=Math.max(1,best.hp-Math.max(1,Math.round(best.maxHp*.005)));
  best.m=Math.min(GAIA_M_MAX,best.m+GAIA_WHIP_M);
  pops.push({x:best.x,y:best.y-95,t:0,txt:'M +'+GAIA_WHIP_M,crit:true});
  gaiaFx.push({kind:'whip',c:best,t:0,life:.24,fx:P.x,fy:P.y-50});
  return true;
}
function gaiaDrawWhip(dt){
  for(let k=gaiaFx.length-1;k>=0;k--){
    const f=gaiaFx[k];f.t+=dt;if(f.t>=f.life){gaiaFx.splice(k,1);continue;}
    const u=f.t/f.life,x1=P.x,y1=P.y-50,x2=f.c.x,y2=f.c.y-52;
    const mx=(x1+x2)/2,my=(y1+y2)/2-26*Math.sin(u*Math.PI)+Math.sin(u*40)*5*(1-u);
    ctx.save();ctx.globalAlpha=Math.max(0,1-u*u);ctx.lineCap='round';
    ctx.strokeStyle='#3a2210';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(mx,my,x2,y2);ctx.stroke();
    ctx.strokeStyle='#e0b878';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo(mx,my,x2,y2);ctx.stroke();
    ctx.fillStyle='#fff2c8';ctx.beginPath();ctx.arc(x2,y2,6*(1-u)+2,0,7);ctx.fill();ctx.restore();
  }
}
// 쓰러진 동료는 일정 시간 뒤 스스로 일어난다. 카일이 쓰러지면 기존처럼 전원 마을 부활.
function gaiaKO(c,i){
  c.ko=true;c.koT=GAIA_KO_TIME;c.hp=0;c.m=0;c.shield=0;
  const k=i!=null?i:gaiaMemberIndex(c);if(k>=0){gaiaTargets[k]=null;gaiaAttacks[k]=null;}
  pops.push({x:c.x,y:c.y-95,t:0,txt:'쓰러짐!',enemy:true});
}
// 실비아: M으로 전체 치유·전체 보호막. 카일도 함께 받는다.
// 우선순위: ① 누가 35% 밑이면 즉시 치유 ② 몹이 가까우면 보호막 ③ 둘 이상이 60% 밑이거나 한 명이 50% 밑이면 치유.
function gaiaHealAll(c,all){
  for(const x of all){x.hp=Math.min(x.maxHp,x.hp+Math.round(x.maxHp*GAIA_TUNE.heal));pops.push({x:x.x,y:x.y-95,t:0,txt:'치유',heal:true});}
  c.m-=GAIA_HEAL_M;c.castCd=3.5;if(typeof syncBars==='function')syncBars();
}
function gaiaCast(c,dt){
  c.castCd=Math.max(0,(c.castCd||0)-dt);
  if(c.castCd>0||!combatMap())return;
  const all=[P,...gaiaMembers.filter(x=>!x.ko&&x.hp>0)];
  const crit=all.some(x=>x.hp<x.maxHp*.35),low=all.filter(x=>x.hp<x.maxHp*.6).length,mid=all.some(x=>x.hp<x.maxHp*.5);
  const near=monsters.some(m=>m&&!m.dead&&!m.removed&&Math.hypot(m.x-P.x,m.y-P.y)<420);
  if(crit&&c.m>=GAIA_HEAL_M){gaiaHealAll(c,all);return;}
  if(near&&!(P.shield>0)&&c.m>=GAIA_SHIELD_M){
    for(const x of all){
      const v=Math.round(x.maxHp*.2);
      if(x===P){P.shield=v;P.shieldMax=v;P.shieldT=8;P.shieldKind='holy';}
      else{x.shield=v;x.shieldT=8;}
      pops.push({x:x.x,y:x.y-95,t:0,txt:'보호막',mana:true});
    }
    c.m-=GAIA_SHIELD_M;c.castCd=4.5;if(typeof syncBars==='function')syncBars();return;
  }
  if((low>=2||mid)&&c.m>=GAIA_HEAL_M)gaiaHealAll(c,all);
}
function gaiaEnemyTarget(m){
  gaiaEnsure();let best=P,dist=Math.hypot(P.x-m.x,P.y-m.y);
  for(const c of gaiaMembers){
    if(c.hp<=0)continue;
    const d=Math.hypot(c.x-m.x,c.y-m.y);
    if(d<dist){dist=d;best=c;}
  }
  return best;
}
function gaiaHit(c,dmg){
  if(!c||!gaiaMembers.includes(c)||c.ko||c.hp<=0)return false;
  dmg=Math.max(1,Math.round(dmg*GAIA_TUNE.take*(1-GAIA_TUNE.mGuard*c.m/GAIA_M_MAX)));   // M이 찰수록 덜 아프다
  if(c.shield>0){const ab=Math.min(c.shield,dmg);c.shield-=ab;dmg-=ab;if(c.shield<=0)c.shield=0;if(dmg<=0)return true;}
  c.hp=Math.max(0,c.hp-dmg);
  pops.push({x:c.x,y:c.y-92,t:0,txt:'-'+dmg,enemy:true});
  if(c.hp<=0)gaiaKO(c);
  return true;
}
function gaiaResetParty(){
  gaiaEnsure();
  for(let i=0;i<2;i++){
    const c=gaiaMembers[i];c.hp=c.maxHp;c.mp=c.maxMp;c.m=GAIA_M_START;c.lastMap='';c.ko=false;c.koT=0;c.shield=0;c.castCd=0;c.gaiaReturn=false;
    gaiaTargets[i]=null;gaiaAttacks[i]=null;
  }
  companionFx.length=0;
}
function gaiaHeal(k){
  gaiaEnsure();
  for(const c of gaiaMembers){if(k!=='mp')c.hp=c.maxHp;if(k!=='hp')c.mp=c.maxMp;}
}
function gaiaNeeds(k){gaiaEnsure();return gaiaMembers.some(c=>k==='hp'?c.hp<c.maxHp:c.mp<c.maxMp);}
function gaiaSave(){
  gaiaEnsure();return {v:4,party:gaiaMembers.map(c=>({...companionPack(c),hp:c.hp,mp:c.mp,m:c.m}))};
}
function gaiaLoad(data){
  const old=data&&data.v===4&&Array.isArray(data.party)?data.party:[];
  gaiaMembers.splice(0,gaiaMembers.length,gaiaMakeMember(0,old[0]),gaiaMakeMember(1,old[1]));
  gaiaTargets[0]=gaiaTargets[1]=null;gaiaAttacks[0]=gaiaAttacks[1]=null;
  companionState=gaiaMembers[0];
  return true;
}

const gaiaFxOriginal=drawCompanionFx;
drawCompanionFx=function(dt,behind=false){gaiaFxOriginal(dt,behind);if(!behind)gaiaDrawWhip(dt);};

// 정식 동료 모드에서 원본 1인 용병 계약/스토리 자동 합류를 비활성화한다.
updateCompanion=gaiaUpdate;
appendCompanionSprite=gaiaAppend;
drawCompanion=gaiaDraw;
window.updateCompanion=gaiaUpdate;
window.appendCompanionSprite=gaiaAppend;
window.drawCompanion=gaiaDraw;
window.onCompanionPlayerDefeat=gaiaResetParty;
Object.assign(window.COMPANION,{
  saveData:gaiaSave,loadData:gaiaLoad,
  state:()=>({v:4,party:gaiaMembers.map(c=>({...c}))}),
  isActive:id=>!!id&&GAIA_PARTY_IDS.includes(id),
  syncStory:()=>false,
  hire:()=>false,hireFromDialog:()=>false,
  ensureMarket:()=>false,ensureTownTests:()=>{},
});
window.GAIA_PARTY={enabled:true,debugMonsters:()=>monsters,members:()=>gaiaMembers,recall:gaiaRecall,
  friendlySwing:gaiaFriendlySwing,whip:gaiaWhip,drawWhip:gaiaDrawWhip,enemyTarget:gaiaEnemyTarget,hit:gaiaHit,
  heal:gaiaHeal,needs:gaiaNeeds,reset:gaiaResetParty};
if($('gaiaRecallBtn'))$('gaiaRecallBtn').addEventListener('click',()=>gaiaRecall(false));
