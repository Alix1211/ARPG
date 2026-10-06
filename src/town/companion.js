'use strict';
// 테스트 동행 2인: 러스티(총/실제 용병), 카엘렌(검/향후 파티원).
// 공통 테스트 규칙: 비용 선불, 고용 시점 플레이어 기본공격×1.15 고정, 사망 없음,
// 길을 잃으면 플레이어 근처 워프, 한 게임 하루(현재 8분) 만료 후 모험 중에는 유지하고 다음 마을/패배 때 복귀.

const COMPANION_DEF={
  hero:{name:'카엘렌',title:'검사 · 파티 테스트',kind:'sword',range:68,aggro:285,attackCd:.72,speed:225},
  knight:{name:'러스티',title:'이계의 용병 · 총병',kind:'gun',range:370,aggro:340,attackCd:.72,speed:205}
};
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
function companionButtonText(n){
  if(!n||!n.companion||!COMPANION_DEF[n.companion])return '동행';
  if(companionState.active===n.companion)return '동행 중';
  const fee=companionFee(n.companion);
  return (COMPANION_DEF[n.companion].kind==='gun'?'고용 ':'동행 ')+fee+'G';
}
function companionSetNpcHidden(id,hidden){
  if(MAP!=='town')return;
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
  let tx=P.x-48,ty=P.y+18;
  if(P.dir==='front'){tx=P.x+(P.flip?36:-36);ty=P.y-54;}
  else if(P.dir==='back'){tx=P.x+(P.flip?-36:36);ty=P.y+58;}
  else if(P.dir==='side'){tx=P.x+(P.flip?58:-58);ty=P.y+18;}
  const q=nearestSafePosition(tx,ty);
  companionState.x=q[0];companionState.y=q[1];companionState.stuck=0;companionState.lastX=q[0];companionState.lastY=q[1];
}
function companionSave(){
  if(!companionState.active)return null;
  return {v:1,active:companionState.active,remaining:Math.max(0,companionState.remaining),expired:!!companionState.expired,
    damage:Math.max(1,Math.round(companionState.damage||1)),x:companionState.x,y:companionState.y,dir:companionState.dir,flip:!!companionState.flip};
}
function companionLoad(d){
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
  const d=COMPANION_DEF[companionState.active];let best=null,score=1e9;
  for(const m of monsters){
    if(!m||m.dead||m.removed)continue;
    const pp=Math.hypot(m.x-P.x,m.y-P.y);if(pp>d.aggro)continue;
    const cc=Math.hypot(m.x-companionState.x,m.y-companionState.y);if(cc>d.range+120)continue;
    if(!companionLOS(companionState.x,companionState.y,m.x,m.y))continue;
    const s=cc+pp*.35;if(s<score){score=s;best=m;}
  }
  return best;
}
function companionMoveTo(tx,ty,speed,dt){
  const c=companionState,dx=tx-c.x,dy=ty-c.y,dd=Math.hypot(dx,dy);if(dd<2)return false;
  const sx=dx/dd*speed*dt,sy=dy/dd*speed*dt,ox=c.x,oy=c.y;
  if(!blocked(c.x+sx,c.y))c.x+=sx;
  if(!blocked(c.x,c.y+sy))c.y+=sy;
  const mx=c.x-ox,my=c.y-oy;
  if(Math.abs(mx)>Math.abs(my)*.8){c.dir='side';c.flip=mx<0;}else if(Math.abs(my)>.05)c.dir=my<0?'back':'front';
  c.t+=dt;
  return Math.hypot(mx,my)>.08;
}
function companionDesired(){
  let x=P.x-48,y=P.y+18;
  if(P.dir==='front'){x=P.x+(P.flip?36:-36);y=P.y-54;}
  else if(P.dir==='back'){x=P.x+(P.flip?-36:36);y=P.y+58;}
  else if(P.dir==='side'){x=P.x+(P.flip?58:-58);y=P.y+18;}
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
  c.cd=d.attackCd;c.atkT=.22;
  if(Math.abs(dx)>Math.abs(dy)*.8){c.dir='side';c.flip=dx<0;}else c.dir=dy<0?'back':'front';
  if(d.kind==='gun'){
    companionFx.push({kind:'laser',x1:c.x,y1:c.y-54,x2:m.x,y2:m.y-m.h*.55,t:0,life:.16});
    companionHit(m,c.damage,dx,dy,3);
  }else{
    companionFx.push({kind:'slash',x:c.x+dx/dist*45,y:c.y-38+dy/dist*18,a:Math.atan2(dy,dx),t:0,life:.22});
    companionHit(m,c.damage,dx,dy,10);
  }
}
function updateCompanion(dt){
  const c=companionState;if(!c.active||dt<=0)return;
  const d=COMPANION_DEF[c.active];
  if(c.lastMap!==MAP){c.lastMap=MAP;companionWarp();}
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
  const distP=Math.hypot(c.x-P.x,c.y-P.y);
  if(distP>520){companionWarp();return;}
  const target=companionPickTarget();
  let moved=false;
  if(d.kind==='sword'&&target&&Math.hypot(target.x-P.x,target.y-P.y)<=d.aggro){
    const dd=Math.hypot(target.x-c.x,target.y-c.y);
    if(dd>d.range)moved=companionMoveTo(target.x,target.y,d.speed,dt);
    else if(c.cd<=0)companionAttack(target);
  }else if(d.kind==='gun'&&target){
    const dd=Math.hypot(target.x-c.x,target.y-c.y);
    if(dd<=d.range&&c.cd<=0)companionAttack(target);
    const want=companionDesired(),fd=Math.hypot(c.x-want[0],c.y-want[1]);
    if(fd>95)moved=companionMoveTo(want[0],want[1],d.speed,dt);
  }else{
    const want=companionDesired(),dd=Math.hypot(c.x-want[0],c.y-want[1]);
    if(dd>28)moved=companionMoveTo(want[0],want[1],d.speed,dt);
    else{c.t=0;c.dir=P.dir||c.dir;c.flip=!!P.flip;}
  }
  if(!moved&&Math.hypot(c.x-P.x,c.y-P.y)>95)c.stuck+=dt;else c.stuck=Math.max(0,c.stuck-dt*2);
  if(c.stuck>2.2)companionWarp();
  c.lastX=c.x;c.lastY=c.y;
}
function appendCompanionSprite(list){
  if(!companionState.active)return;
  list.push({companion:companionState,key:companionState.y});
}
function drawCompanion(c,dt){
  const src=COMPANION_IMG[c.active];if(!src||!src.fr)return;
  const d=c.dir||'front',arr=src.fr[d]&&src.fr[d].length?src.fr[d]:src.fr.front;
  const moving=c.t>0&&Math.hypot(c.x-c.lastX,c.y-c.lastY)>.02;
  const idx=moving?1+(Math.floor(c.t*9)%Math.max(1,arr.length-1)):0,im=arr[Math.min(idx,arr.length-1)];if(!im)return;
  const h=98,w=h*((im.naturalWidth||100)/(im.naturalHeight||100));
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(c.x,c.y,16,5.5,0,0,7);ctx.fill();
  ctx.save();if(c.flip&&d==='side'){ctx.translate(c.x,0);ctx.scale(-1,1);ctx.translate(-c.x,0);}
  const kick=c.atkT>0?(c.atkT/.22)*4:0;ctx.drawImage(im,c.x-w/2,c.y-h+4-kick,w,h);ctx.restore();
}
function drawCompanionFx(dt){
  for(let i=companionFx.length-1;i>=0;i--){
    const f=companionFx[i];f.t+=dt;const k=Math.max(0,1-f.t/f.life);if(k<=0){companionFx.splice(i,1);continue;}
    ctx.save();ctx.globalCompositeOperation='lighter';
    if(f.kind==='laser'){
      ctx.lineCap='round';ctx.strokeStyle='rgba(70,145,255,'+(.28*k)+')';ctx.lineWidth=11*k;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
      ctx.strokeStyle='rgba(185,225,255,'+(.95*k)+')';ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();
      ctx.fillStyle='rgba(210,240,255,'+(.9*k)+')';ctx.beginPath();ctx.arc(f.x2,f.y2,8+8*(1-k),0,7);ctx.fill();
    }else{
      ctx.strokeStyle='rgba(225,240,255,'+(.9*k)+')';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(f.x,f.y,48,f.a-.95,f.a+.95);ctx.stroke();
    }
    ctx.restore();
  }
}
function companionDebugExpire(){if(companionState.active){companionState.remaining=0;companionState.expired=true;companionState.expireSaid=true;}return companionStateCopy();}
function companionDebugTick(dt){updateCompanion(dt);return companionStateCopy();}

window.COMPANION={
  fee:companionFee,buttonText:companionButtonText,hire:companionHire,hireFromDialog:companionHireFromDialog,
  saveData:companionSave,loadData:companionLoad,state:companionStateCopy,isActive:companionIsActive,
  onDefeat:companionOnPlayerDefeat,debugExpire:companionDebugExpire,debugTick:companionDebugTick
};
window.updateCompanion=updateCompanion;
window.appendCompanionSprite=appendCompanionSprite;
window.drawCompanion=drawCompanion;
window.drawCompanionFx=drawCompanionFx;
window.onCompanionPlayerDefeat=companionOnPlayerDefeat;
