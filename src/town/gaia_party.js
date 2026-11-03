'use strict';
// 가이아 대륙 3인 파티: 카일(직접 조작) + 아가사·실비아(AI).
// 기존 용병의 이동·길찾기·타격 모션을 각 동료에게 독립적으로 적용한다.
const GAIA_PARTY_IDS=['merc_f_sword','merc_f_mage'];
const GAIA_PARTY_NAMES=['아가사','실비아'];
const GAIA_LEASH=430;
const GAIA_M_MAX=100;
const gaiaMembers=[];
const gaiaTargets=[null,null],gaiaAttacks=[null,null];
let gaiaHudWait=0;
const gaiaUpdateOriginal=updateCompanion;
const gaiaDrawOriginal=drawCompanion;

for(let i=0;i<GAIA_PARTY_IDS.length;i++){
  const id=GAIA_PARTY_IDS[i];
  if(COMPANION_DEF[id])COMPANION_DEF[id].name=GAIA_PARTY_NAMES[i];
  if(A.companions?.[id])A.companions[id].name=GAIA_PARTY_NAMES[i];
  if(COMPANION_IMG[id])COMPANION_IMG[id].name=GAIA_PARTY_NAMES[i];
}

function gaiaStatMax(i){return Math.max(NUM,Math.round(P.maxHp*(i===0?1.3:1.05)));}
function gaiaManaMax(i){return Math.max(NUM,Math.round(P.maxMp*(i===0?.65:1.55)));}
function gaiaMakeMember(i,previous){
  const c=companionEmpty(),id=GAIA_PARTY_IDS[i],q=nearestSafePosition(P.x+(i===0?-70:70),P.y+24);
  c.active=id;c.mode='party';c.remaining=0;c.expired=false;
  c.x=q[0];c.y=q[1];c.lastX=c.x;c.lastY=c.y;c.lastMap=MAP;
  c.maxHp=gaiaStatMax(i);c.maxMp=gaiaManaMax(i);
  c.hp=previous&&Number.isFinite(+previous.hp)?Math.max(0,Math.min(c.maxHp,+previous.hp)):c.maxHp;
  c.mp=previous&&Number.isFinite(+previous.mp)?Math.max(0,Math.min(c.maxMp,+previous.mp)):c.maxMp;
  c.m=previous&&Number.isFinite(+previous.m)?Math.max(0,Math.min(GAIA_M_MAX,+previous.m)):0;
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
  c.damage=Math.max(1,Math.round(basicDamage()*(i===0?1.6:1.45)*(1+c.m/GAIA_M_MAX*.75)));
}
function gaiaUpdate(dt){
  gaiaEnsure();
  if(dt<=0)return;
  for(let i=0;i<2;i++){
    const c=gaiaMembers[i];
    gaiaRefreshStats(c,i);
    if(!gaiaInLeash(c)){gaiaRecall(true);break;}
    companionState=c;companionTarget=gaiaTargets[i];companionAtk=gaiaAttacks[i];
    // 원래 AI는 고용 시간제한을 'hire'에만 적용하므로 party 모드에는 제한이 없다.
    gaiaUpdateOriginal(dt);
    gaiaMembers[i]=companionState;gaiaTargets[i]=companionTarget;gaiaAttacks[i]=companionAtk;
    if(c.m>0)c.m=Math.max(0,c.m-dt*1.1);
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
    if(num)num.textContent='HP '+Math.ceil(c.hp/NUM)+' / M '+Math.round(c.m);
  }
}
function gaiaAppend(list){gaiaEnsure();for(const c of gaiaMembers)list.push({companion:c,key:c.y});}
function gaiaDraw(c,dt){
  const i=gaiaMemberIndex(c);if(i<0)return gaiaDrawOriginal(c,dt);
  const old=companionAtk;
  companionAtk=gaiaAttacks[i];gaiaDrawOriginal(c,dt);companionAtk=old;
}
function gaiaFriendlySwing(dir,weapon){
  gaiaEnsure();
  for(const c of gaiaMembers){
    const dx=c.x-P.x,dy=c.y-P.y,dist=Math.hypot(dx,dy),along=dx*dir[0]+dy*dir[1];
    if(dist>Math.min(120,weapon.reach||90)||along<0)continue;
    if(weapon.cone&&dist>20&&along/dist<=Math.cos(weapon.cone*Math.PI/180))continue;
    if(!weapon.cone&&Math.abs(dx*dir[1]-dy*dir[0])>(weapon.width||38))continue;
    const dmg=Math.max(1,Math.round(c.maxHp*.012));
    c.hp=Math.max(0,c.hp-dmg);c.m=Math.min(GAIA_M_MAX,c.m+22);
    pops.push({x:c.x,y:c.y-95,t:0,txt:'M +22',crit:true});
    if(c.hp<=0){defeatPlayer(true);break;}
  }
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
  if(!c||!gaiaMembers.includes(c)||c.hp<=0)return false;
  c.hp=Math.max(0,c.hp-Math.max(1,Math.round(dmg)));
  pops.push({x:c.x,y:c.y-92,t:0,txt:'-'+Math.max(1,Math.round(dmg)),enemy:true});
  if(c.hp<=0)defeatPlayer(true);
  return true;
}
function gaiaResetParty(){
  gaiaEnsure();
  for(let i=0;i<2;i++){
    const c=gaiaMembers[i];c.hp=c.maxHp;c.mp=c.maxMp;c.m=0;c.lastMap='';
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
window.GAIA_PARTY={enabled:true,members:()=>gaiaMembers,recall:gaiaRecall,
  friendlySwing:gaiaFriendlySwing,enemyTarget:gaiaEnemyTarget,hit:gaiaHit,
  heal:gaiaHeal,needs:gaiaNeeds,reset:gaiaResetParty};
if($('gaiaRecallBtn'))$('gaiaRecallBtn').addEventListener('click',()=>gaiaRecall(false));
