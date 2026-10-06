'use strict';
// 테스트 동행 2인: 러스티(총/실제 용병), 카엘렌(검/향후 파티원).
// 공통 테스트 규칙: 비용 선불, 고용 시점 플레이어 기본공격×1.15 고정, 사망 없음,
// 길을 잃으면 플레이어 근처 워프, 한 게임 하루(현재 8분) 만료 후 모험 중에는 유지하고 다음 마을/패배 때 복귀.

const COMPANION_DEF={
  // 카엘렌: 플레이어 뒤를 붙는 추종자가 아니라 먼저 적을 물고 버티는 전방 검사.
  hero:{name:'카엘렌',title:'검사 · 파티 테스트',kind:'sword',range:74,aggro:620,pursuit:760,attackCd:.68,speed:252,warpIdle:680,warpCombat:1250,stuckCombat:6.0},
  // 러스티: 플레이어 주변을 유지하는 후방 지원 사수.
  knight:{name:'러스티',title:'이계의 용병 · 총병',kind:'gun',range:390,aggro:370,pursuit:470,attackCd:.72,speed:205,warpIdle:520,warpCombat:700,stuckCombat:3.0}
};
// 광장 시험 배치만 끌 수 있다. 전투 자산/세이브/향후 정식 합류 규칙과 분리한다.
let companionTownTestsEnabled=true;
let companionTarget=null;
const COMPANION_IMG={};
for(const id in (A.companions||{})){
  const src=A.companions[id],fr={};
  for(const d of ['front','back','side'])fr[d]=(src.fr[d]||[]).map(load);
  COMPANION_IMG[id]={...src,fr};
}
const companionFx=[];
let companionState={active:null,remaining:0,expired:false,damage:0,x:0,y:0,dir:'front',flip:false,t:0,cd:0,atkT:0,lastMap:'',stuck:0,lastX:0,lastY:0,expireSaid:false};

function companionFee(id){
  if(!COMPANION_DEF[id])return 0;
  return Math.max(50,Math.round(((P.lv||1)*25)/10)*10);
}
function companionStateCopy(){return JSON.parse(JSON.stringify(companionState));}
function companionIsActive(id){return !!companionState.active&&(!id||companionState.active===id);}
function companionSetTownTests(enabled){
  companionTownTestsEnabled=!!enabled;
  if(MAP==='town')buildWorld('town');
  return companionTownTestsEnabled;
}
function companionEnsureTownTests(){
  if(MAP!=='town'||!companionTownTestsEnabled)return;
  for(const id of ['hero','knight']){
    if(companionState.active===id)continue;
    let n=npcs.find(x=>x.companion===id);
    if(!n){
      const base=(A.npcs||[]).find(x=>x.companion===id);
      if(base){n={...base,img:BI[base.k],ph:Math.random()*7,key:base.y};npcs.push(n);}
    }
    if(!n)continue;
    n.hide=false;
    if(!sprites.includes(n))sprites.push(n);
    if(!spots.some(x=>x.kind==='npc'&&x.npc===n))spots.push({name:n.name,x:n.x,y:n.y+6,r:50,kind:'npc',npc:n});
    if(!solids.some(x=>x._companion===id)){const q={x0:n.x-13,x1:n.x+13,y0:n.y-12,y1:n.y-1,_companion:id};solids.push(q);}
  }
}
function companionDiagnostics(){
  const ids=['hero','knight'],ns=ids.map(id=>npcs.find(n=>n.companion===id)).filter(Boolean);
  const ss=ids.map(id=>sprites.find(n=>n.companion===id)).filter(Boolean);
  const ps=ids.map(id=>spots.find(x=>x.kind==='npc'&&x.npc&&x.npc.companion===id)).filter(Boolean);
  const imgs=ns.map(n=>n.img&&n.img.complete&&n.img.naturalWidth>0?1:0).join('');
  return {n:ns.length,s:ss.length,p:ps.length,img:imgs||'--',active:companionState.active||'-',map:MAP};
}
function drawTownTestCompanionsForced(){
  if(MAP!=='town'||!companionTownTestsEnabled)return;
  for(const id of ['hero','knight']){
    if(companionState.active===id)continue;
    const n=npcs.find(x=>x.companion===id);if(!n||n.hide||!n.img||!n.img.complete||!n.img.naturalWidth)continue;
    const h=118,w=h*(n.img.naturalWidth/n.img.naturalHeight);
    ctx.save();
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,220,90,.22)';ctx.strokeStyle='rgba(255,230,120,.95)';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(n.x,n.y+2,34,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.drawImage(n.img,n.x-w/2,n.y-h,w,h);
    ctx.font='900 13px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='rgba(30,20,10,.95)';ctx.fillStyle='#fff09a';
    const label='TEST · '+n.name;ctx.strokeText(label,n.x,n.y-h-12);ctx.fillText(label,n.x,n.y-h-12);
    ctx.restore();
  }
}
function companionButtonText(n){
  if(!n||!n.companion||!COMPANION_DEF[n.companion])return '동행';
  if(companionState.active===n.companion)return '동행 중';
  const fee=companionFee(n.companion);
  return (COMPANION_DEF[n.companion].kind==='gun'?'고용 ':'동행 ')+fee+'G';
}
function companionSetNpcHidden(id,hidden){
  if(MAP!=='town')return;
  hidden=hidden||!companionTownTestsEnabled;
  for(const n of npcs)if(n.companion===id)n.hide=!!hidden;
  for(let i=spots.length-1;i>=0;i--){
    const s=spots[i];if(s.kind==='npc'&&s.npc&&s.npc.companion===id&&hidden)spots.splice(i,1);
  }
  if(!hidden){
    const n=npcs.find(x=>x.companion===id);
    if(n&&!spots.some(s=>s.kind==='npc'&&s.npc===n))spots.push({name:n.name,x:n.x,y:n.y+6,r:50,kind:'npc',npc:n});
  }
}
function companionWarp(){
  if(!companionState.active)return;
  companionTarget=null;
  const [tx,ty]=COMPANION_DEF[companionState.active].kind==='sword'?companionDesiredFront():companionDesired();
  const q=nearestSafePosition(tx,ty);
  companionState.x=q[0];companionState.y=q[1];companionState.stuck=0;companionState.lastX=q[0];companionState.lastY=q[1];
  companionState.navPath=null;companionState.navWait=0;companionState.progressX=q[0];companionState.progressY=q[1];
}
function companionSave(){
  if(!companionState.active)return null;
  return {v:1,active:companionState.active,remaining:Math.max(0,companionState.remaining),expired:!!companionState.expired,
    damage:Math.max(1,Math.round(companionState.damage||1)),x:companionState.x,y:companionState.y,dir:companionState.dir,flip:!!companionState.flip};
}
function companionLoad(d){
  companionTarget=null;companionFx.length=0;
  const id=d&&d.active;
  if(!id||!COMPANION_DEF[id]){
    companionState={active:null,remaining:0,expired:false,damage:0,x:0,y:0,dir:'front',flip:false,t:0,cd:0,atkT:0,lastMap:'',stuck:0,lastX:0,lastY:0,expireSaid:false};
    return false;
  }
  companionState={active:id,remaining:Math.max(0,+d.remaining||0),expired:!!d.expired,damage:Math.max(1,Math.round(+d.damage||1)),
    x:Number.isFinite(+d.x)?+d.x:P.x-48,y:Number.isFinite(+d.y)?+d.y:P.y+18,dir:['front','back','side'].includes(d.dir)?d.dir:'front',flip:!!d.flip,
    t:0,cd:0,atkT:0,lastMap:MAP,stuck:0,lastX:+d.x||P.x,lastY:+d.y||P.y,expireSaid:false};
  if(MAP==='town')companionSetNpcHidden(id,true);
  return true;
}
function companionReturn(reason,silent=false){
  const id=companionState.active;if(!id)return false;
  companionTarget=null;
  companionState={active:null,remaining:0,expired:false,damage:0,x:0,y:0,dir:'front',flip:false,t:0,cd:0,atkT:0,lastMap:MAP,stuck:0,lastX:0,lastY:0,expireSaid:false};
  companionFx.length=0;
  if(MAP==='town')buildWorld('town');
  if(!silent)say(reason==='defeat'?'동행 계약이 끝났습니다. 대여료는 돌아오지 않습니다.':'오늘 몫은 여기까지. 동행인이 돌아갔습니다.');
  if(window.UI&&UI.save)UI.save();
  return true;
}
function companionHire(id){
  const d=COMPANION_DEF[id];if(!d)return false;
  if(companionState.active===id){
    if($('dlgLine'))$('dlgLine').textContent=d.name+'이(가) 이미 같이 움직이고 있습니다.';
    return false;
  }
  const fee=companionFee(id);
  if(P.gold<fee){
    if($('dlgLine'))$('dlgLine').textContent=d.name+'이(가) 금화 주머니를 한 번 보고는 시선을 돌렸습니다. “먼저 계산부터.”';
    return false;
  }
  const old=companionState.active;
  companionTarget=null;companionFx.length=0;
  if(old)companionSetNpcHidden(old,false);
  setGold(P.gold-fee);
  const q=nearestSafePosition(P.x-48,P.y+18);
  companionState={active:id,remaining:DAYLEN,expired:false,damage:Math.max(1,Math.round(basicDamage()*1.15)),
    x:q[0],y:q[1],dir:P.dir||'front',flip:!!P.flip,t:0,cd:.15,atkT:0,lastMap:MAP,stuck:0,lastX:q[0],lastY:q[1],expireSaid:false};
  companionSetNpcHidden(id,true);
  if($('dlgLine'))$('dlgLine').textContent=d.name+'이(가) 장비를 챙겼습니다. “하루치 선불 확인. 중간에 쓰러져도 환불은 없습니다.”';
  const b=$('dlgTrade');if(b){b.textContent='동행 중';b.disabled=true;}
  if(window.UI&&UI.save)UI.save();
  return true;
}
function companionHireFromDialog(n){return n&&n.companion?companionHire(n.companion):false;}
function companionOnPlayerDefeat(){if(companionState.active)companionReturn('defeat',true);}

function companionLOS(x1,y1,x2,y2){
  const n=Math.max(2,Math.ceil(Math.hypot(x2-x1,y2-y1)/38));
  for(let i=1;i<n;i++){const t=i/n;if(blocked(x1+(x2-x1)*t,y1+(y2-y1)*t))return false;}
  return true;
}
function companionPickTarget(){
  if(!companionState.active||!combatMap())return null;
  const c=companionState,d=COMPANION_DEF[c.active];let best=null,score=1e9;
  // 이미 물고 있는 적은 인식 경계를 넘거나 다른 적이 가까워져도 전투를 이어간다.
  if(d.kind==='sword'&&companionTarget&&monsters.includes(companionTarget)&&!companionTarget.dead&&!companionTarget.removed&&
      Math.hypot(companionTarget.x-c.x,companionTarget.y-c.y)<=d.pursuit&&
      Math.hypot(companionTarget.x-P.x,companionTarget.y-P.y)<=d.warpCombat)return companionTarget;
  for(const m of monsters){
    if(!m||m.dead||m.removed)continue;
    const pp=Math.hypot(m.x-P.x,m.y-P.y),cc=Math.hypot(m.x-c.x,m.y-c.y);
    // 검사는 플레이어 전방에서 넓게 찾아가고, 총병은 플레이어 근처만 지원한다.
    const seen=d.kind==='sword'?(pp<=d.aggro||cc<=d.aggro*.72):(pp<=d.aggro&&cc<=d.pursuit);
    if(!seen)continue;
    if(d.kind==='gun'&&!companionLOS(c.x,c.y,m.x,m.y))continue;
    // 카엘렌은 가까운 적보다 플레이어에게 접근한 적을 조금 더 우선한다.
    const scoreNow=d.kind==='sword'?(pp*.58+cc*.42):(cc+pp*.35);
    if(scoreNow<score){score=scoreNow;best=m;}
  }
  companionTarget=best;return best;
}
function companionClearStep(x,y,tx,ty){
  const n=Math.max(1,Math.ceil(Math.hypot(tx-x,ty-y)/8));
  for(let i=1;i<=n;i++)if(blocked(x+(tx-x)*i/n,y+(ty-y)*i/n))return false;
  return true;
}
function companionDetour(tx,ty){
  const c=companionState,step=24,margin=10;
  const gx=Math.round((tx-c.x)/step),gy=Math.round((ty-c.y)/step);
  const xmin=Math.min(0,gx)-margin,xmax=Math.max(0,gx)+margin;
  const ymin=Math.min(0,gy)-margin,ymax=Math.max(0,gy)+margin;
  const nodes=[{x:0,y:0,parent:-1}],seen=new Set(['0,0']);
  let end=-1;
  // 직선이 막힐 때만 제한된 우회 탐색. 각 구간 충돌도 확인해 모서리 관통을 막는다.
  for(let i=0;i<nodes.length&&i<1800;i++){
    const p=nodes[i],x=c.x+p.x*step,y=c.y+p.y*step;
    if(Math.hypot(x-tx,y-ty)<=step&&companionClearStep(x,y,tx,ty)){end=i;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=p.x+dx,ny=p.y+dy,key=nx+','+ny;
      if(nx<xmin||nx>xmax||ny<ymin||ny>ymax||seen.has(key))continue;
      if(companionClearStep(x,y,c.x+nx*step,c.y+ny*step)){seen.add(key);nodes.push({x:nx,y:ny,parent:i});}
    }
  }
  if(end<0)return [];
  const route=[[tx,ty]];
  for(let i=end;i>0;i=nodes[i].parent)route.push([c.x+nodes[i].x*step,c.y+nodes[i].y*step]);
  return route.reverse();
}
function companionMoveTo(tx,ty,speed,dt){
  const c=companionState,isSword=COMPANION_DEF[c.active].kind==='sword';
  if(isSword){
    if(companionClearStep(c.x,c.y,tx,ty))c.navPath=null;
    else{
      const changed=!c.navGoal||Math.hypot(tx-c.navGoal[0],ty-c.navGoal[1])>72;
      if(c.navWait<=0||changed){c.navPath=companionDetour(tx,ty);c.navGoal=[tx,ty];c.navWait=.8;}
      while(c.navPath&&c.navPath.length&&Math.hypot(c.navPath[0][0]-c.x,c.navPath[0][1]-c.y)<5)c.navPath.shift();
      if(c.navPath&&c.navPath.length){[tx,ty]=c.navPath[0];}
    }
  }
  return companionStepTo(tx,ty,speed,dt);
}
function companionStepTo(tx,ty,speed,dt){
  const c=companionState,dx=tx-c.x,dy=ty-c.y,dd=Math.hypot(dx,dy);if(dd<2)return false;
  const travel=Math.min(dd,speed*dt),sx=dx/dd*travel,sy=dy/dd*travel,ox=c.x,oy=c.y;
  if(companionClearStep(c.x,c.y,c.x+sx,c.y+sy)){c.x+=sx;c.y+=sy;}
  else{
    if(companionClearStep(c.x,c.y,c.x+sx,c.y))c.x+=sx;
    if(companionClearStep(c.x,c.y,c.x,c.y+sy))c.y+=sy;
  }
  const mx=c.x-ox,my=c.y-oy,moved=Math.hypot(mx,my)>.08;
  if(Math.abs(mx)>Math.abs(my)*.8){c.dir='side';c.flip=mx<0;}else if(Math.abs(my)>.05)c.dir=my<0?'back':'front';
  if(moved){c.t+=dt;c.moving=true;}
  return moved;
}
function companionDesired(){
  let x=P.x-48,y=P.y+18;
  if(P.dir==='front'){x=P.x+(P.flip?36:-36);y=P.y-54;}
  else if(P.dir==='back'){x=P.x+(P.flip?-36:36);y=P.y+58;}
  else if(P.dir==='side'){x=P.x+(P.flip?58:-58);y=P.y+18;}
  return [x,y];
}
function companionDesiredFront(){
  let x=P.x,y=P.y-88;
  if(P.dir==='front'){x=P.x;y=P.y+96;}
  else if(P.dir==='back'){x=P.x;y=P.y-96;}
  else if(P.dir==='side'){x=P.x+(P.flip?-105:105);y=P.y+6;}
  return [x,y];
}
function companionHit(m,v,dx,dy,kb){
  if(!m||m.dead||m.removed)return false;
  v=Math.max(1,Math.round(v));const actual=Math.min(Math.max(0,m.hp),v);
  if(window.TELEMETRY)TELEMETRY.damageOut(actual);
  m.hp-=v;m.hurt=Math.max(m.hurt||0,.16);m.stun=Math.max(m.stun||0,.08);m.hitK=.7;
  const q=Math.hypot(dx,dy)||1;m.hitDx=dx/q;m.hitDy=dy/q;
  const push=kb||6;
  if(push>0){const nx=m.x+dx/q*push,ny=m.y+dy/q*push;if(!monsterBlocked(nx,ny)){m.x=nx;m.y=ny;}}
  pops.push({x:m.x+(Math.random()*10-5),y:m.y-m.h*.72,t:0,txt:String(v),crit:false});
  sfx.push({type:'hit',t:0,x:m.x,y:m.y-m.h*.55,r:34});
  if(m.hp<=0)killMonster(m);
  return true;
}
function companionAttack(m){
  const c=companionState,d=COMPANION_DEF[c.active],dx=m.x-c.x,dy=m.y-c.y,dist=Math.hypot(dx,dy)||1;
  c.cd=d.attackCd;c.atkT=.22;c.attackAngle=Math.atan2(dy,dx);
  if(Math.abs(dx)>Math.abs(dy)*.8){c.dir='side';c.flip=dx<0;}else c.dir=dy<0?'back':'front';
  if(d.kind==='gun'){
    const a=Math.atan2(dy,dx),mx=c.x+Math.cos(a)*29,my=c.y-54+Math.sin(a)*10;
    companionFx.push({kind:'muzzle',x:mx,y:my,a,t:0,life:.18});
    companionFx.push({kind:'laser',x1:mx,y1:my,x2:m.x,y2:m.y-m.h*.55,t:0,life:.22});
    companionFx.push({kind:'impact',x:m.x,y:m.y-m.h*.55,t:0,life:.24});
    companionHit(m,c.damage,dx,dy,3);
  }else{
    const a=Math.atan2(dy,dx);
    companionFx.push({kind:'slash',x:c.x,y:c.y-43,a,t:0,life:.30});
    companionFx.push({kind:'swordflash',x:c.x,y:c.y-43,a,t:0,life:.18});
    companionHit(m,c.damage,dx,dy,10);
  }
}
function updateCompanion(dt){
  const c=companionState;if(!c.active||dt<=0)return;
  c.moving=false;
  c.navWait=Math.max(0,(c.navWait||0)-dt);
  const d=COMPANION_DEF[c.active];
  if(c.lastMap!==MAP){c.lastMap=MAP;companionFx.length=0;companionWarp();}
  if(!c.expired){
    c.remaining=Math.max(0,c.remaining-dt);
    if(c.remaining<=0){
      c.expired=true;
      if(!c.expireSaid){
        c.expireSaid=true;
        say('동행 하루가 끝났습니다. 모험 중에는 계속 함께하고, 다음 마을에서 돌아갑니다.');
        if(window.UI&&UI.save)UI.save();
      }
    }
  }
  if(c.expired&&(MAP==='town'||MAP==='fieldvillage')){companionReturn('expired');return;}
  c.cd=Math.max(0,c.cd-dt);c.atkT=Math.max(0,c.atkT-dt);
  const target=companionPickTarget(),distP=Math.hypot(c.x-P.x,c.y-P.y);
  let moved=false,attemptedMove=false;
  if(d.kind==='sword'&&target){
    // 전투 중에는 플레이어에게 조금 멀어졌다고 복귀하지 않는다.
    // 카엘렌은 목표를 물고 앞에서 버티며, 정말 이탈했을 때만 워프한다.
    const dd=Math.hypot(target.x-c.x,target.y-c.y);
    if(distP>d.warpCombat){companionWarp();return;}
    if(dd>d.range){attemptedMove=true;moved=companionMoveTo(target.x,target.y,d.speed,dt);}
    else if(c.cd<=0)companionAttack(target);
  }else if(d.kind==='gun'&&target){
    if(distP>d.warpCombat){companionWarp();return;}
    const dd=Math.hypot(target.x-c.x,target.y-c.y);
    if(dd<=d.range&&c.cd<=0)companionAttack(target);
    const want=companionDesired(),fd=Math.hypot(c.x-want[0],c.y-want[1]);
    if(fd>95){attemptedMove=true;moved=companionMoveTo(want[0],want[1],d.speed,dt);}
  }else{
    if(distP>d.warpIdle){companionWarp();return;}
    const want=d.kind==='sword'?companionDesiredFront():companionDesired(),dd=Math.hypot(c.x-want[0],c.y-want[1]);
    if(dd>28){attemptedMove=true;moved=companionMoveTo(want[0],want[1],d.speed,dt);}
    else{c.t=0;c.dir=P.dir||c.dir;c.flip=!!P.flip;}
  }
  // 공격/재사용 대기/전방 대기는 길막이 아니다. 연속 이동 실패만 구조 대상으로 삼는다.
  if(attemptedMove&&d.kind==='sword'){
    if(!Number.isFinite(c.progressX)){c.progressX=c.lastX;c.progressY=c.lastY;}
    if(Math.hypot(c.x-c.progressX,c.y-c.progressY)>=24){c.stuck=0;c.progressX=c.x;c.progressY=c.y;}
    else c.stuck+=dt;
  }else{
    c.stuck=attemptedMove&&!moved?c.stuck+dt:0;
    c.progressX=c.x;c.progressY=c.y;
  }
  // 검사 전투 중에는 6초 이상 완전히 막힌 경우에만 구조용 워프. 몹을 치다 말고 복귀하지 않게 한다.
  const stuckLimit=d.kind==='sword'?d.stuckCombat:(target?d.stuckCombat:2.2);
  if(c.stuck>stuckLimit)companionWarp();
  c.lastX=c.x;c.lastY=c.y;
}
function appendCompanionSprite(list){
  if(!companionState.active)return;
  list.push({companion:companionState,key:companionState.y});
}
function drawCompanion(c,dt){
  const src=COMPANION_IMG[c.active];if(!src||!src.fr)return;
  const d=c.dir||'front',arr=src.fr[d]&&src.fr[d].length?src.fr[d]:src.fr.front;
  const moving=!!c.moving;
  const idx=moving?1+(Math.floor(c.t*9)%Math.max(1,arr.length-1)):0,im=arr[Math.min(idx,arr.length-1)];if(!im)return;
  const h=98,w=h*((im.naturalWidth||100)/(im.naturalHeight||100));
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(c.x,c.y,16,5.5,0,0,7);ctx.fill();
  if(c.active==='hero')drawCompanionFx(0,true);
  if(c.active==='hero'){
    // 카엘렌은 항상 검을 들고 있는 것이 보이게 한다.
    const resting=d==='side'?(c.flip?Math.PI*.88:Math.PI*.12):(d==='back'?-Math.PI*.42:Math.PI*.42);
    const ang=c.atkT>0?c.attackAngle+(1-c.atkT/.22)*2.1-1.05:resting;
    const bx=c.x+(d==='side'?(c.flip?-16:16):15),by=c.y-43;
    ctx.save();ctx.translate(bx,by);ctx.rotate(ang);
    ctx.strokeStyle='rgba(40,28,18,.95)';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.stroke();
    ctx.strokeStyle='#d7ad65';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(8,-9);ctx.lineTo(8,9);ctx.stroke();
    ctx.fillStyle='#dceafa';ctx.strokeStyle='#455b73';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(10,-4);ctx.lineTo(46,-3);ctx.lineTo(55,0);ctx.lineTo(46,3);ctx.lineTo(10,4);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.98)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(12,-1);ctx.lineTo(49,-1);ctx.stroke();
    ctx.restore();
  }
  // 검과 검 잔광을 먼저 그리고 몸을 덮어 그려 손/몸 뒤에 들어가게 한다.
  ctx.save();if(c.flip&&d==='side'){ctx.translate(c.x,0);ctx.scale(-1,1);ctx.translate(-c.x,0);}
  const kick=c.atkT>0?(c.atkT/.22)*4:0;ctx.drawImage(im,c.x-w/2,c.y-h+4-kick,w,h);
  ctx.restore();
}
function drawCompanionFx(dt,behind=false){
  for(let i=companionFx.length-1;i>=0;i--){
    const f=companionFx[i];if(!behind)f.t+=dt;
    const k=Math.max(0,1-f.t/f.life);if(k<=0){if(!behind)companionFx.splice(i,1);continue;}
    const sword=f.kind==='slash'||f.kind==='swordflash';if(sword!==behind)continue;
    ctx.save();ctx.globalCompositeOperation='lighter';
    if(f.kind==='laser'){
      ctx.lineCap='round';ctx.strokeStyle='rgba(45,120,255,'+(.42*k)+')';ctx.lineWidth=16*k;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
      ctx.strokeStyle='rgba(170,225,255,'+(.98*k)+')';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,'+(.95*k)+')';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
    }else if(f.kind==='muzzle'){
      ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.fillStyle='rgba(170,225,255,'+(.95*k)+')';
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(28*k,-8*k);ctx.lineTo(20*k,0);ctx.lineTo(28*k,8*k);ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,'+(.95*k)+')';ctx.beginPath();ctx.arc(4,0,5*k,0,7);ctx.fill();
    }else if(f.kind==='impact'){
      ctx.translate(f.x,f.y);ctx.strokeStyle='rgba(130,205,255,'+(.95*k)+')';ctx.lineWidth=3;
      for(let q=0;q<6;q++){const a=q*Math.PI/3+f.t*8,r=9+22*(1-k);ctx.beginPath();ctx.moveTo(Math.cos(a)*6,Math.sin(a)*6);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
      ctx.strokeStyle='rgba(230,250,255,'+(.9*k)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,8+18*(1-k),0,7);ctx.stroke();
    }else if(f.kind==='swordflash'){
      ctx.translate(f.x,f.y);ctx.rotate(f.a);ctx.strokeStyle='rgba(255,245,210,'+(.9*k)+')';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(54,0);ctx.stroke();
    }else{
      // 카엘렌 검 궤적: 루크레아의 강베기처럼 굵은 반달형 잔광.
      const sweep=f.a+(1-k)*.45;
      ctx.strokeStyle='rgba(255,238,195,'+(.28*k)+')';ctx.lineWidth=18*k;ctx.lineCap='round';ctx.beginPath();ctx.arc(f.x,f.y,66,sweep-1.15,sweep+1.15);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,245,'+(.95*k)+')';ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.x,f.y,66,sweep-1.12,sweep+1.12);ctx.stroke();
      ctx.strokeStyle='rgba(175,215,255,'+(.6*k)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,53,sweep-1.05,sweep+.95);ctx.stroke();
    }
    ctx.restore();
  }
}
function companionDebugExpire(){if(companionState.active){companionState.remaining=0;companionState.expired=true;companionState.expireSaid=true;}return companionStateCopy();}
function companionDebugTick(dt){updateCompanion(dt);return companionStateCopy();}

window.COMPANION={
  fee:companionFee,previewDamage:()=>Math.max(1,Math.round(basicDamage()*1.15)),buttonText:companionButtonText,hire:companionHire,hireFromDialog:companionHireFromDialog,
  ensureTownTests:companionEnsureTownTests,diagnostics:companionDiagnostics,
  townTestsEnabled:()=>companionTownTestsEnabled,setTownTestsEnabled:companionSetTownTests,
  saveData:companionSave,loadData:companionLoad,state:companionStateCopy,isActive:companionIsActive,
  onDefeat:companionOnPlayerDefeat,debugExpire:companionDebugExpire,debugTick:companionDebugTick
};
window.updateCompanion=updateCompanion;
window.appendCompanionSprite=appendCompanionSprite;
window.drawCompanion=drawCompanion;
window.drawCompanionFx=drawCompanionFx;
window.drawTownTestCompanionsForced=drawTownTestCompanionsForced;
window.onCompanionPlayerDefeat=companionOnPlayerDefeat;
