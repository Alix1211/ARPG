// 스킬 연출 전용. 피해·범위·마나·쿨타임은 원래 스킬 코드가 담당한다.
const SKILL_SHOW = {events:[], pose:null, stop:0, shake:0, flash:0, color:'#fff0cc'};
const skillShowMapKey=()=>MAP+(MAP==='field'?':'+fieldSerial:'');
const skillStage = id => /[4-7]_/.test(id)?3:Number((id.match(/[123]/)||['1'])[0]);
const skillElement = id => id.startsWith('fire')?'fire':id.startsWith('ice')?'ice':id.startsWith('bolt')?'volt':id.startsWith('dark')?'dark':id.startsWith('holy')?'holy':'stone';
const SKILL_COLOR = {fire:'#ff8233',ice:'#a1e8ff',volt:'#fff0a1',dark:'#b18aff',holy:'#ffedb1',stone:'#ffd58d'};
function skillShowEvent(type,x,y,r,extra={}){
  if(SKILL_SHOW.events.length>=48)SKILL_SHOW.events.shift();
  SKILL_SHOW.events.push({type,x,y,r,t:0,map:MAP,life:1.1,seed:Math.random()*1000,mapKey:skillShowMapKey(),...extra});
}
function skillShowImpact(kind,x,y,r,stage=2){
  skillShowEvent('impact',x,y,r,{kind,stage,life:stage===3?1.15:.8});
  SKILL_SHOW.shake=Math.max(SKILL_SHOW.shake,stage===3?7:3.5);
  SKILL_SHOW.flash=Math.max(SKILL_SHOW.flash,stage===3?.13:.065);
  SKILL_SHOW.color=SKILL_COLOR[kind]||SKILL_COLOR.stone;
  SKILL_SHOW.stop=Math.max(SKILL_SHOW.stop,stage===3?.05:.025);
  if(stage===3&&typeof SFX!=='undefined')SFX.play(kind==='fire'?'fire_big':kind==='volt'?'lightning':kind==='dark'?'dark_big':'explosion');
  if(stage===3&&typeof HAP==='function')HAP([28,15,40],2);
}
function skillShowStart(id,d,rank,shotAt,zoneAt,fxAt){
  const stage=skillStage(id),kind=skillElement(id),weaponType={sword:'sword',spear:'spear',bow:'bow',fist:'gauntlet'}[id.replace(/[1-7].*/, '')]||'staff';
  const weapon={wt:weaponType,img:WIMG[weaponType+'_01'],item:null};
  const pose={id,stage,kind,d:d.slice(),dir:P.dir,flip:P.flip,t:0,map:MAP,life:window.SAGE&&SAGE.skills[id]&&SAGE.skills[id].dur?SAGE.skills[id].dur:id==='fist3'?.64:id==='spear3'?.68:id==='bow3'?.6:stage===3?.64:.5,weapon,mapKey:skillShowMapKey()};
  SKILL_SHOW.pose=pose;
  for(let i=shotAt;i<shots.length;i++){shots[i].skillId=id;shots[i].visualStage=stage;shots[i].visualMapKey=skillShowMapKey();}
  for(let i=zoneAt;i<zones.length;i++){zones[i].skillId=id;zones[i].visualStage=stage;zones[i].visualWeapon=weapon;zones[i].visualMapKey=skillShowMapKey();}
  for(let i=fxAt;i<sfx.length;i++){sfx[i].skillId=id;sfx[i].visualStage=stage;}
  skillShowEvent('cast',P.x,P.y,stage===3?112:stage===2?82:52,{kind,stage,id,life:stage===3?.7:.45});
  if(['sword1','sword2','fire2','ice2','bolt2'].includes(id))skillShowImpact(kind,P.x,P.y,id==='sword2'?128:id==='fire2'?150:id==='ice2'?100:65,stage);
  if(id==='bow2')skillShowEvent('fan',P.x+d[0]*35,P.y-44+d[1]*35,90,{a:Math.atan2(d[1],d[0]),life:.4});
}
// 연출은 실시간으로 진행하며 전투만 아주 짧게 멈춘다. 메뉴 중에는 모두 정지한다.
function skillShowTick(dt,paused){
  if(paused)return false;
  const stopped=SKILL_SHOW.stop>0;
  SKILL_SHOW.stop=Math.max(0,SKILL_SHOW.stop-dt);
  SKILL_SHOW.shake=Math.max(0,SKILL_SHOW.shake-dt*24);
  SKILL_SHOW.flash=Math.max(0,SKILL_SHOW.flash-dt*.8);
  const pose=SKILL_SHOW.pose;
  if(pose){pose.t+=dt;if(pose.mapKey!==skillShowMapKey()||pose.t>=pose.life||P.hp<=0)SKILL_SHOW.pose=null;}
  for(let i=SKILL_SHOW.events.length-1;i>=0;i--){const f=SKILL_SHOW.events[i];f.t+=dt;if(f.mapKey!==skillShowMapKey()||f.t>=f.life)SKILL_SHOW.events.splice(i,1);}
  if(!SKILL_SHOW.events.length&&!SKILL_SHOW.pose){SKILL_SHOW.shake=0;SKILL_SHOW.flash=0;}
  return stopped;
}
function skillShowPose(){
  const p=SKILL_SHOW.pose,out={x:0,y:0,rot:0,sx:1,sy:1,shadow:1,frame:null,dir:null,flip:false};if(!p)return out;
  const k=p.t/p.life;out.dir=p.dir;out.flip=p.flip;
  if(p.id==='spear3'||p.id==='spear7_heaven'){
    const launch=Math.min(1,p.t/.15),land=Math.max(0,Math.min(1,(p.t-(p.id==='spear7_heaven'?.4:.28))/.14));
    out.y=-118*Math.sin(launch*Math.PI/2)*(1-land);out.shadow=Math.max(.3,1+out.y/160);
    if(p.t>.42){out.sy=1-.18*Math.sin(Math.min(1,(p.t-.42)/.2)*Math.PI);out.sx=1.08;}
    out.rot=p.t<.3?-.16:.12;out.frame=0;
  }else if(p.id==='fist3'){
    const phase=(p.t%.2)/.2;out.y=-12*Math.sin(phase*Math.PI);out.sy=phase<.25?.84:1;out.sx=phase<.25?1.12:1;out.rot=(phase<.25?-.17:.09)*(p.flip?-1:1);out.frame=0;
  }else if(p.id==='sword2'||p.id==='sword4_whirl'||p.id==='spear4_wheel'||p.id==='bow4_circle'){
    out.dir=['side','back','side','front'][Math.min(3,Math.floor(k*4))];out.flip=k>.5;out.rot=Math.sin(k*Math.PI*4)*.13;out.y=-6*Math.sin(k*Math.PI);out.frame=0;
  }else if(p.id.startsWith('fist')||p.id.startsWith('spear')||p.id.startsWith('sword')){
    const lunge=Math.sin(k*Math.PI);out.x=p.d[0]*12*lunge;out.y=p.d[1]*8*lunge;out.rot=(p.flip?-1:1)*.12*lunge;out.frame=0;
  }else if(p.stage===3){out.y=-9*Math.sin(k*Math.PI);out.shadow=.86;out.frame=0;}
  return out;
}
function skillShowWeapon(p){
  if(!p||p.kind!=='stone')return;
  const a=Math.atan2(p.d[1],p.d[0]),k=p.t/p.life;
  if(p.id==='sword2')wDrawWeapon(p.weapon,P.x+Math.cos(k*Math.PI*4)*30,P.y-40+Math.sin(k*Math.PI*4)*13,k*Math.PI*4+Math.PI/2,1.2);
  else if(p.id==='spear3')wDrawWeapon(p.weapon,P.x+9,P.y-47,k<.5?Math.PI:0,1.15);
  else if(p.id==='fist3'){
    const q=(p.t%.2)/.2;wDrawWeapon(p.weapon,P.x-17,P.y-40+q*26,Math.PI,1.25);wDrawWeapon(p.weapon,P.x+17,P.y-40+q*26,Math.PI,1.25);
  }else wDrawWeapon(p.weapon,P.x+p.d[0]*25,P.y-43+p.d[1]*12,a+Math.PI/2,1.12);
}
function skillDrawArrow(x,y,a,size=1,alpha=1){
  // 일반 화살과 같은 화살촉·깃털 형태를 크게 그려 화살 비에서도 식별되게 한다.
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(size,size);ctx.globalAlpha*=alpha;
  ctx.fillStyle='#4a2c17';ctx.fillRect(-38,-2,43,4);ctx.fillStyle='#d1a55b';ctx.fillRect(-37,-1,41,1.5);
  ctx.fillStyle='#a6bdc9';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(0,-7);ctx.lineTo(4,0);ctx.lineTo(0,7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e9f5fb';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(0,-7);ctx.lineTo(4,0);ctx.closePath();ctx.fill();
  ctx.fillStyle='#efe5cc';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-36,0);ctx.lineTo(-46,side*7);ctx.lineTo(-29,side*5);ctx.lineTo(-24,0);ctx.closePath();ctx.fill();}
  ctx.restore();
}
function skillShowCracks(f,k){
  const fade=Math.min(1,k*9)*(1-k),r=f.r*(.65+.35*Math.min(1,k*4));
  ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.65);ctx.globalAlpha=fade;
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9+vfxRnd(f.seed,i)*.4;ctx.beginPath();ctx.moveTo(0,0);
    for(let j=1;j<5;j++){const rr=r*j/4,aa=a+(vfxRnd(f.seed+i,j)-.5)*.22;ctx.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr);}
    ctx.strokeStyle='#251d18';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#d99d50';ctx.lineWidth=1.4;ctx.stroke();
  }ctx.restore();
}
function skillShowGround(){
  for(const f of SKILL_SHOW.events){
    const k=f.t/f.life;
    if(f.type==='cast'){
      if(f.kind==='stone'){vfxDraw('ring_gold',f.x,f.y+3,f.r*2,{sy:.62,alpha:(1-k)*.55});continue;}
      vfxDraw(f.kind==='dark'?'vortex':f.kind==='ice'?'ring_blue':f.kind==='fire'?'ring_red':'ring_gold',f.x,f.y+3,f.r*2.4,{rot:f.t*(f.stage===3?2:-2),sy:.52,alpha:(1-k)*.85});
      if(f.stage===3)vfxDraw('ring_gold',f.x,f.y+3,f.r*1.8,{rot:-f.t*3,sy:.52,alpha:(1-k)*.7});
    }else if(f.type==='impact'){
      if(f.kind==='stone'){skillShowCracks(f,k);vfxDraw('status_ground_stone',f.x,f.y,f.r*1.65,{sy:.6,alpha:(1-k)*.65});}
      else vfxDraw('status_ground_'+(f.kind==='volt'?'volt':f.kind==='holy'?'ice':f.kind),f.x,f.y,f.r*2,{sy:.64,alpha:Math.min(1,k*8)*(1-k)*.75});
      vfxDraw(f.kind==='ice'?'ring_blue':f.kind==='fire'?'ring_red':'ring_gold',f.x,f.y,f.r*(.6+1.5*Math.min(1,k*3)),{sy:.58,alpha:(1-k)*.7});
    }
  }
}
function skillShowTop(){
  for(const f of SKILL_SHOW.events){
    const k=f.t/f.life,fade=1-k;
    if(f.type==='impact'){
      if(f.kind==='stone'){
        for(let i=0;i<(f.stage===3?12:7);i++){
          const a=i*2.399+f.seed,dist=f.r*(.25+k*.9),lift=Math.sin(k*Math.PI)*55*(.5+vfxRnd(f.seed,i));
          vfxDraw('hit_rock_'+(i%15),f.x+Math.cos(a)*dist,f.y+Math.sin(a)*dist*.55-lift,28+vfxRnd(f.seed,i+20)*24,{rot:a+k*2,alpha:fade});
        }
        vfxPlay('hit_spark_3',f.x,f.y-14,f.r*1.6,k,{add:true});
      }else{
        const element=f.kind==='holy'?'volt':f.kind,frame=Math.min(4,Math.floor(k*5));
        vfxDraw('burst_'+element+'_'+frame,f.x,f.y+6,f.r*2.25*(.6+.4*Math.min(1,k*4)),{base:true,alpha:fade});
      }
    }else if(f.type==='cast'&&f.kind!=='stone'){
      for(let i=0;i<(f.stage===3?8:4);i++){
        const a=i*2.399+f.t*3,rr=f.r*(.5+.15*Math.sin(f.t*4+i));
        vfxDraw('hit_spark_'+(i%5),P.x+Math.cos(a)*rr,P.y+Math.sin(a)*rr*.5-25-f.t*60,15+f.stage*4,{add:true,alpha:fade*.8});
      }
    }else if(f.type==='fan'){
      for(let i=0;i<5;i++)skillDrawArrow(f.x+Math.cos(f.a+(i-2)*.2)*k*65,f.y+Math.sin(f.a+(i-2)*.2)*k*65,f.a+(i-2)*.2,.9,fade*.65);
    }
  }
}
function skillShowScreen(){
  if(SKILL_SHOW.flash<=0)return;
  ctx.save();ctx.globalAlpha=SKILL_SHOW.flash;ctx.fillStyle=SKILL_SHOW.color;ctx.fillRect(0,0,VW,VH);ctx.restore();
}
function skillShowZoneGround(z){
  if(z.type==='spearfall'){
    if(!z.hit)vfxDraw('ring_gold',z.x,z.y,z.r*2,{sy:.58,alpha:.35+.4*z.t/z.delay});
    return true;
  }
  if(z.type==='arrowrain'){
    const fade=Math.max(0,Math.min(1,z.t*5,(z.dur-z.t)*3));
    vfxDraw('ring_gold',z.x,z.y,z.R*2,{sy:.7,alpha:fade*.4});
    for(let i=0;i<20;i++){
      const phase=(z.t*2.5+i*.163)%1,a=i*2.399,r=z.R*Math.sqrt((i+.5)/20),x=z.x+Math.cos(a)*r,y=z.y+Math.sin(a)*r/1.3;
      if(phase>.65){skillDrawArrow(x,y-11,1.19,.68,fade*(1-phase)/.35);vfxDraw('hit_rock_'+(i%15),x,y,30,{sy:.55,alpha:fade*(1-phase)});}
    }return true;
  }
  if(z.type==='blizzard'||z.type==='swamp'){
    const ice=z.type==='blizzard',fade=Math.max(0,Math.min(1,z.t*4,(z.dur-z.t)*3));
    vfxDraw(ice?'ring_blue':'vortex',z.x,z.y,z.R*2.1,{sy:.7,rot:ice?0:-z.t*.8,alpha:fade*.65});
    vfxDraw(ice?'status_ground_ice':'status_ground_slow',z.x,z.y,z.R*1.3,{sy:.7,alpha:fade*.5});return true;
  }
  return z.type==='fistquake';
}
function skillShowZoneTop(z){
  if(z.type==='spearfall'){
    if(!z.hit){const k=z.t/z.delay;wDrawWeapon(z.visualWeapon||{wt:'spear',img:WIMG.spear_01},z.x,z.y-300*(1-k*k)-25,Math.PI,1.8);vfxDraw('shot_holy',z.x,z.y-300*(1-k*k)-85,130,{rot:Math.PI/2-VFX_HEAD.shot_holy*Math.PI/180,alpha:k*.65});}
    return true;
  }
  if(z.type==='arrowrain'){
    const fade=Math.max(0,Math.min(1,z.t*5,(z.dur-z.t)*3));
    for(let i=0;i<20;i++){
      const phase=(z.t*2.5+i*.163)%1;if(phase>.65)continue;
      const a=i*2.399,r=z.R*Math.sqrt((i+.5)/20),x=z.x+Math.cos(a)*r,y=z.y+Math.sin(a)*r/1.3,drop=(1-phase/.65)*255;
      skillDrawArrow(x-drop*.38,y-drop-14,1.19,.85,fade);
    }return true;
  }
  if(z.type==='blizzard'||z.type==='swamp'){
    const ice=z.type==='blizzard',fade=Math.max(0,Math.min(1,z.t*4,(z.dur-z.t)*3));
    for(let i=0;i<(ice?18:10);i++){
      const a=i*2.399+z.t*(ice?2.2:-.5),rr=z.R*Math.sqrt((i+.5)/(ice?18:10)),x=z.x+Math.cos(a)*rr,y=z.y+Math.sin(a)*rr/1.3;
      if(ice){vfxDraw('shot_ice',x,y-35-((z.t*75+i*31)%120),45+i%3*12,{rot:a-Math.PI/2-VFX_HEAD.shot_ice*Math.PI/180,alpha:fade*.85});if(i<5)vfxDraw('burst_ice_2',x,y+10,100,{base:true,alpha:fade*.75});}
      else vfxDraw('burst_dark_'+(i%5),x,y+10,70+25*Math.sin(z.t*3+i)**2,{base:true,alpha:fade*.85});
    }return true;
  }
  if(z.type==='meteor'&&z.t<z.delay){
    const k=z.t/z.delay,e=k*k,sx=z.x+240,sy=z.y-560,a=Math.atan2(546,-240),x=sx-240*e,y=sy+546*e;
    for(let i=3;i>=0;i--)vfxDraw('shot_fire',x-Math.cos(a)*i*38,y-Math.sin(a)*i*38,160+i*22,{rot:a-VFX_HEAD.shot_fire*Math.PI/180,alpha:(1-i*.2)*.85});
    vfxDraw('shot_rock',x,y,100,{rot:a-VFX_HEAD.shot_rock*Math.PI/180});
    return true;
  }
  if(z.type==='voidring'||z.type==='darkpulse'){
    const big=z.type==='voidring',e=Math.min(1,z.t/(z.exp||z.dur)),r=z.R*(1-(1-e)**2),fade=z.t>z.dur?Math.max(0,1-(z.t-z.dur)/.35):1;
    for(let i=0;i<(big?14:7);i++){const a=i*Math.PI*2/(big?14:7)+z.t*.7;vfxDraw('burst_dark_'+(i%5),z.x+Math.cos(a)*r,z.y+Math.sin(a)*r*.55+10,big?110:60,{base:true,alpha:fade});}
    if(big)vfxDraw('vortex',z.x,z.y-25,175,{rot:-z.t*2,sy:.6,alpha:fade*.7});return true;
  }
  return false;
}
window.__SKILL_SHOW={state:()=>({effects:SKILL_SHOW.events.length,pose:SKILL_SHOW.pose&&SKILL_SHOW.pose.id,stop:SKILL_SHOW.stop,shake:SKILL_SHOW.shake}),clear:()=>{SKILL_SHOW.events.length=0;SKILL_SHOW.pose=null;SKILL_SHOW.stop=0;SKILL_SHOW.shake=0;SKILL_SHOW.flash=0;}};
