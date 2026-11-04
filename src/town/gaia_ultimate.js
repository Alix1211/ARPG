'use strict';
// 가이아 3인 파티 전용 필살기. 그림은 사용자 업로드 assets/gaia_cutins/A01..A04, S01..S04.
// 컷인 약 2초 동안 전투 정지 → 마지막 컷이 확대·투명화 → 동료 광역 공격.
// 전투 수치·마나·재사용 시간은 gaia_skills.js / town.js가 담당한다.
const GAIA_ULT = (()=>{
  let state=null, layer=null, stage=null, strips=[], caption=null, canvas=null, ink=null;
  const CUTIN_SEC=2.0, EFFECT_SEC=1.25;
  const colors={agatha:['#a87dff','#38164c'],sylvia:['#6ceaff','#0d405f']};
  function setup(){
    if(layer)return;
    const style=document.createElement('style');
    style.textContent=`
      #gaiaUlt{position:fixed;inset:0;z-index:29;display:none;overflow:hidden;pointer-events:none;isolation:isolate}
      #gaiaUlt .gu-stage{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 50% 55%,#323245bb,#090817df)}
      #gaiaUlt .gu-panel{position:absolute;inset:-5%;width:110%;height:110%;opacity:0;background:radial-gradient(ellipse at 55% 40%,#8665b2,#271a42 72%);box-shadow:inset 0 0 30px #fff5;will-change:transform,opacity;clip-path:polygon(0 0,100% 0,94% 100%,0 100%)}
      #gaiaUlt .gu-panel:nth-child(even){clip-path:polygon(5% 0,100% 0,100% 100%,0 100%)}
      #gaiaUlt .gu-panel img{width:100%;height:100%;object-fit:cover;object-position:center 43%;filter:contrast(1.07) saturate(1.08)}
      #gaiaUlt .gu-panel::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 4px #ffffffa8,inset 0 0 90px #0007}
      #gaiaUlt .gu-caption{position:absolute;left:0;right:0;bottom:6%;text-align:center;z-index:2;color:#fff9d9;font:italic 1000 clamp(34px,8vw,96px)/1 sans-serif;letter-spacing:.06em;-webkit-text-stroke:2px #180f24;text-shadow:5px 7px 0 #20122d,0 0 26px #ffffffb8;opacity:0;transform:translateY(24px) scale(.8)}
      #gaiaUlt .gu-fx{position:absolute;inset:0;width:100%;height:100%}`;
    document.head.appendChild(style);
    layer=document.createElement('div');layer.id='gaiaUlt';layer.setAttribute('aria-hidden','true');
    stage=document.createElement('div');stage.className='gu-stage';layer.appendChild(stage);
    for(let i=0;i<4;i++){
      const panel=document.createElement('div');panel.className='gu-panel';
      const img=document.createElement('img');img.alt='';panel.append(img);stage.append(panel);strips.push(panel);
    }
    caption=document.createElement('div');caption.className='gu-caption';layer.append(caption);
    canvas=document.createElement('canvas');canvas.className='gu-fx';layer.append(canvas);ink=canvas.getContext('2d');
    document.body.appendChild(layer);
  }
  function casting(){return !!state&&state.phase==='cutin';}
  function start(who,mul){
    if(state||!combatMap()||!window.GAIA_PARTY)return false;
    const c=GAIA_PARTY.members()[who==='agatha'?0:1];
    if(!c||c.ko||c.hp<=0)return false;
    const enemies=monsters.some(m=>m&&!m.dead&&!m.removed&&!(m.vanishT>0)&&Math.hypot(m.x-c.x,m.y-c.y)<540);
    if(!enemies)return false;
    setup();
    const prefix=who==='agatha'?'A':'S',images=A.gaiaCutins||{};
    for(let i=0;i<4;i++){
      const src=images[prefix+String(i+1).padStart(2,'0')];
      const im=strips[i].firstChild;
      if(src){im.src=src;im.style.display='block';}else{im.removeAttribute('src');im.style.display='none';}
      strips[i].style.background=who==='agatha'
        ?`radial-gradient(ellipse at ${30+i*15}% 38%,#8c659b,#26122f 75%)`
        :`radial-gradient(ellipse at ${30+i*15}% 38%,#3f9abf,#0b253e 75%)`;
    }
    caption.textContent=who==='agatha'?'엑스터시!!':'워터폴~~!!';
    stage.style.background=who==='agatha'?'#1b0a28':'#051a30';
    stage.style.opacity='1';
    layer.style.display='block';
    state={who,c,mul,phase:'cutin',t:0,fxT:0,wave:0,map:MAP,mapSerial:typeof fieldSerial!=='undefined'?fieldSerial:null};
    P.hold=false;
    drawCutin(0);
    return true;
  }
  function drawCutin(t){
    const slot=Math.min(3,Math.floor(t/.45));
    const within=(t-slot*.45)/.45;
    for(let i=0;i<4;i++){
      const age=t-i*.45,el=strips[i];
      if(i>slot){el.style.opacity='0';continue;}
      const entered=Math.min(1,age/.12),exit=Math.max(0,(age-.37)/.13);
      const fade=i===slot?Math.max(0,Math.min(1,entered,1-exit*.28)):Math.max(0,.18-(slot-i-1)*.16);
      el.style.opacity=String(fade);
      const x=(i%2?-1:1)*(1-entered)*19;
      const final=i===3&&t>1.7?Math.min(1,(t-1.7)/.3):0;
      el.style.transform=`translate3d(${x}%,${-final*20}%,0) scale(${1.04+Math.min(1,Math.max(0,age))*0.1+final*.7})`;
      if(final)el.style.opacity=String(Math.max(0,fade*(1-final)));
    }
    const word=Math.max(0,Math.min(1,(t-1.27)/.22));
    caption.style.opacity=String(word*(t>1.76?Math.max(0,1-(t-1.76)/.24):1));
    caption.style.transform=`translateY(${(1-word)*24}px) scale(${.8+word*.25})`;
  }
  function pulse(){
    if(!state)return;
    const {who,c,mul}=state,agatha=who==='agatha',radius=agatha?340:470;
    const mult=(agatha?2.6:.72)*mul;
    const amount=Math.max(1,Math.round(Math.max(c.damage||0,NUM)*mult));
    for(const m of monsters){
      if(!m||m.dead||m.removed||(m.vanishT>0))continue;
      const dx=m.x-c.x,dy=m.y-c.y,dist=Math.hypot(dx,dy*1.22);
      if(dist>radius)continue;
      hitTarget(m,[dx/(dist||1),dy/(dist||1)],agatha,amount,agatha?55:4);
      if(agatha&&!m.dead)m.stun=Math.max(m.stun||0,(m.boss||m.elite)?.28:.7);
    }
    if(typeof SFX!=='undefined')SFX.play(agatha?'rock':'ice',agatha?.7:.48);
    if(agatha&&typeof skillShowImpact==='function')skillShowImpact('stone',c.x,c.y,260,3);
    if(!agatha)sfx.push({type:'iceburst',t:0,x:c.x,y:c.y-30,r:115});
    if(typeof HAP==='function')HAP(agatha?[55,25,80]:[25,10,22],2);
  }
  function paintEffect(t){
    if(!state||!canvas||!ink)return;
    const width=Math.max(1,window.innerWidth),height=Math.max(1,window.innerHeight),dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    ink.setTransform(dpr,0,0,dpr,0,0);ink.clearRect(0,0,width,height);
    const u=Math.min(1,t/EFFECT_SEC),fade=Math.min(1,(EFFECT_SEC-t)*4),c=state.c;
    const cx=width/2+(c.x-P.x)*Z,cy=height/2+(c.y-P.y)*Z;
    if(state.who==='sylvia'){
      ink.fillStyle=`rgba(12,65,112,${.2*fade})`;ink.fillRect(0,0,width,height);
      // 화면 폭 전역에 빗줄기가 거듭 내리꽂히는 네 차례의 폭포.
      for(let i=0;i<53;i++){
        const seed=(i*71+13)%113,lag=(i*17%29)/29,fall=(u*2.8+lag)%1;
        const x=(i+.22+(seed/113)*.55)/53*width,y=-height*.6+fall*height*2.1;
        ink.strokeStyle=`rgba(119,233,255,${(.5+lag*.4)*fade})`;ink.lineWidth=2+i%4;ink.beginPath();ink.moveTo(x,y-85);ink.lineTo(x-13,y+32);ink.stroke();
        if(y>height*.68&&y<height*1.12){
          ink.strokeStyle=`rgba(171,248,255,${.6*fade})`;ink.lineWidth=2;
          ink.beginPath();ink.ellipse(x,height*.85,18+fall*21,8,0,0,Math.PI*2);ink.stroke();
        }
      }
      const wash=ink.createRadialGradient(cx,cy,4,cx,cy,width*.55);
      wash.addColorStop(0,`rgba(192,255,255,${.23*fade})`);wash.addColorStop(1,'rgba(10,135,255,0)');ink.fillStyle=wash;ink.fillRect(0,0,width,height);
    }else{
      const wave=Math.min(1,u*1.32),rr=Math.hypot(width,height)*.75*wave;
      ink.fillStyle=`rgba(57,20,83,${.16*fade})`;ink.fillRect(0,0,width,height);
      for(let i=0;i<3;i++){
        const r=rr-i*94;if(r<0)continue;
        ink.strokeStyle=`rgba(${i===0?'255,230,255':'180,113,255'},${(.75-i*.17)*fade})`;
        ink.lineWidth=10-i*2;ink.beginPath();ink.ellipse(cx,cy,r,Math.max(2,r*.5),0,0,Math.PI*2);ink.stroke();
      }
      for(let i=0;i<23;i++){
        const a=i*2.4,r=rr*(.34+(i%7)*.09),px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r*.55;
        ink.fillStyle=`rgba(225,173,255,${fade*.8})`;ink.beginPath();ink.arc(px,py,2+i%4,0,Math.PI*2);ink.fill();
      }
    }
  }
  function finish(){
    state=null;if(layer){layer.style.display='none';ink&&ink.clearRect(0,0,canvas.width,canvas.height);}
  }
  function tick(dt,paused){
    if(!state)return false;
    if(paused)return state.phase==='cutin';
    if(state.map!==MAP||(MAP==='field'&&state.mapSerial!==fieldSerial)){finish();return false;}
    if(state.phase==='cutin'){
      state.t+=dt;drawCutin(Math.min(CUTIN_SEC,state.t));
      if(state.t>=CUTIN_SEC){
        state.phase='effect';state.fxT=0;state.wave=0;stage.style.opacity='0';caption.style.opacity='0';
        pulse();state.wave=1;
      }
      return true;
    }
    state.fxT+=dt;
    if(state.who==='sylvia'){
      const beats=[0,.25,.51,.78];
      while(state.wave<beats.length&&state.fxT>=beats[state.wave]){pulse();state.wave++;}
    }
    paintEffect(state.fxT);
    if(state.fxT>=EFFECT_SEC){stage.style.opacity='1';finish();}
    return false;
  }
  return {start,tick,casting};
})();
window.GAIA_ULT=GAIA_ULT;
