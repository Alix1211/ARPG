(() => {
 const asset=name=>`assets/${name}.png`;
 const stage=document.querySelector('#arena'),canvas=document.querySelector('#effects'),ctx=canvas.getContext('2d');
 const nodes={left:document.querySelector('#left'),right:document.querySelector('#right')};
 const engine=new ArenaAutoEngine(),start=document.querySelector('#start'),curtain=document.querySelector('#curtain'),cutin=document.querySelector('#cutin'),combo=document.querySelector('#combo');
 let last=0,audio=null,sound=true,particles=[],rings=[],sparks=[],attack=null,impact=null,hitStop=0,shaking=0,flash=0,resultTime=-1,endStep=-1,cutTime=-1,hiddenPause=false;
 const animations=new Set(),colors={punch:'#ffb04b',kick:'#72d8ff',magic:'#d78cff'};
 const rand=(a,b)=>a+Math.random()*(b-a),other=side=>side==='left'?'right':'left';
 function fit(){stage.style.zoom=Math.min(innerWidth/1280,innerHeight/720)}addEventListener('resize',fit);fit();
 function pose(side,p){nodes[side].dataset.pose=p;nodes[side].querySelector('img').src=asset(`${ARENA_DATA.fighters[side].id}-${p}`);}
 function bars(){for(const side of ['left','right'])for(const stat of ['hp','mp'])document.querySelector(`#${side}-${stat}`).style.clipPath=`inset(0 ${100-engine.state[stat][side]}% 0 0)`;}
 function animate(el,frames,options){const a=el.animate(frames,options);animations.add(a);a.onfinish=()=>animations.delete(a);return a;}
 function callout(name){const el=document.querySelector('#callout');el.src=asset(name);animate(el,[{opacity:0,transform:'translate(-50%,-50%) scale(2)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.16},{opacity:1,transform:'translate(-50%,-50%) scale(1.05)',offset:.7},{opacity:0,transform:'translate(-50%,-50%) scale(1.2)'}],{duration:950});}
 function unlock(){if(!sound)return;audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}
 function tone(freq,to,duration,type='sine',volume=.045,delay=0){if(!sound||!audio)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,to),t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 function noise(duration=.15,volume=.06){if(!sound||!audio)return;const b=audio.createBuffer(1,Math.round(audio.sampleRate*duration),audio.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const source=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();f.type='lowpass';f.frequency.value=1800;g.gain.value=volume;source.buffer=b;source.connect(f);f.connect(g);g.connect(audio.destination);source.start();source.onended=()=>{source.disconnect();f.disconnect();g.disconnect();};}
 function soundEffect(type){if(type==='charge'){tone(110,950,.65,'sawtooth',.035);tone(330,1320,.7,'sine',.025);}
  else if(type==='super'){noise(.45,.09);tone(95,25,.55,'sawtooth',.06);tone(950,220,.3,'triangle',.035);}
  else if(type==='curtain'){noise(.35,.04);tone(440,100,.22,'triangle',.025);}
  else if(type==='comic'){tone(100,900,.12,'triangle',.055);tone(850,60,.28,'sine',.06,.12);noise(.06,.025);}
  else if(type==='win'){for(let i=0;i<4;i++)tone([523,659,784,1046][i],[523,659,784,1046][i],.2,'triangle',.035,i*.1);}
  else{noise(.09,.04);tone(type==='magic'?650:150,type==='magic'?190:30,.13,type==='magic'?'sine':'sawtooth',.045);}}
 function burst(x,y,color,count=45,mode='spark'){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),v=rand(90,mode==='fire'?650:850);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.3,.9),max:1,size:rand(2,9),color,mode,rotation:rand(0,6)});}if(particles.length>550)particles.splice(0,particles.length-550);}
 function ring(x,y,color,size=170){rings.push({x,y,color,size,life:.45,max:.45});}
 function cutIn(side){cutTime=0;cutin.hidden=false;cutin.dataset.side=side;cutin.querySelector('img').src=asset(`${ARENA_DATA.fighters[side].id}-magic`);soundEffect('charge');}
 function process(){for(const e of engine.drain()){
  stage.dataset.phase=engine.state.phase;
  if(e.type==='start'){start.hidden=true;callout('fight');}
  else if(e.type==='idle'){attack=null;impact=null;combo.hidden=true;for(const s of ['left','right'])pose(s,'idle');}
  else if(e.type==='prepare'){
   attack={...e,t:0};pose('left',e.left);pose('right',e.right);bars();
   if(e.special){const side=e.attacker||'left';pose(side,'magic');cutIn(side);burst(side==='left'?360:940,330,e.attacker==='left'?'#aaff83':'#d278ff',20,'fire');}
  }else if(e.type==='hit'){
   bars();const side=e.attacker,defender=side?other(side):null,x=defender==='left'?335:defender==='right'?950:640;
   impact={side,defender,t:0,special:e.special,critical:e.critical,index:e.index,last:e.last};
   if(side){pose(side,e.move);pose(defender,'hurt');}else{pose('left','guard');pose('right','guard');}
   const color=e.special?(side==='left'?'#c9ff64':'#ffa8fd'):colors[e.move];
   burst(x,340,color,e.special?75:40,e.special?'fire':'spark');ring(x,340,color,e.special?280:155);
   if(e.special){burst(x,340,'#fff4b7',25,'star');sparks.push({x,y:340,life:.18,color});}
   shaking=e.special?13:e.critical?10:6;hitStop=e.last?.065:.035;flash=e.special?.28:e.index===1?.16:.07;
   combo.hidden=false;combo.querySelector('span').textContent=`${e.index} HIT`;combo.style.left=side==='left'?'760px':'290px';
   combo.classList.toggle('super',e.special);soundEffect(e.special&&e.index===1?'super':e.move);
   if(e.last&&e.special)callout('vs');
  }else if(e.type==='finish'){
   resultTime=0;endStep=-1;attack=null;impact=null;combo.hidden=true;cutin.hidden=true;
   const winner=e.winner;for(const s of ['left','right'])pose(s,s===winner?'win':'kneel');
   callout('ko');if(winner){burst(winner==='left'?320:960,240,'#ffdc72',70,'star');soundEffect('win');}
  }
 }}
 function endScene(dt){if(resultTime<0)return;resultTime+=dt;const winner=engine.state.winner,loser=winner?other(winner):null;
  if(winner){const hop=Math.abs(Math.sin(resultTime*7));nodes[winner].style.transform=`translateY(${-25*hop}px) rotate(${Math.sin(resultTime*7)*2}deg)`;}
  if(!loser){if(resultTime>2)start.hidden=false;return;}
  if(resultTime>=1.9&&endStep<0){pose(loser,'blush');endStep=0;}
  if(resultTime>=2.8&&resultTime<6.6){curtain.hidden=false;curtain.style.left=loser==='left'?'75px':'720px';curtain.src=asset(`curtain-frame-${Math.min(5,Math.floor((resultTime-2.8)/.1))}`);nodes[loser].style.opacity=resultTime>3.4?'0':'1';
   if(endStep<1){soundEffect('curtain');endStep=1;}if(resultTime>3.45){const shake=Math.sin(resultTime*30)*4;curtain.style.transform=`translateX(${shake}px) rotate(${Math.sin(resultTime*13)*1.5}deg)`;}
   const beat=Math.floor(resultTime);if(beat>=4&&beat<=6&&endStep<beat){endStep=beat;soundEffect('comic');burst(loser==='left'?320:960,300,'#ff8dbc',12,'heart');burst(loser==='left'?320:960,340,'#ffda62',12,'coin');}
  }else if(resultTime>=6.6&&resultTime<7.25){nodes[loser].style.opacity='1';curtain.style.transform='';curtain.src=asset(`curtain-frame-${Math.max(0,5-Math.floor((resultTime-6.6)/.1))}`);}
  else if(resultTime>=7.25){curtain.hidden=true;nodes[loser].style.opacity='1';start.classList.add('again');start.hidden=false;}
 }
 function update(dt){
  if(cutTime>=0){cutTime+=dt;cutin.style.opacity=Math.min(1,cutTime/.1)*Math.min(1,Math.max(0,(.83-cutTime)/.14));cutin.querySelector('img').style.transform=`translateX(${(cutin.dataset.side==='left'?-1:1)*(1-Math.min(1,cutTime/.18))*500}px) scale(${1+cutTime*.12})`;if(cutTime>.85){cutTime=-1;cutin.hidden=true;}}
  if(attack)attack.t+=dt;if(impact)impact.t+=dt;
  if(resultTime<0){for(const s of ['left','right'])nodes[s].style.transform='';
   if(attack&&engine.state.phase==='windup'){const s=attack.attacker;if(s)nodes[s].style.transform=`translateY(${-3*Math.sin(attack.t*30)}px) scale(1.015)`;}
   if(impact&&impact.t<.25){const p=Math.sin(impact.t/.25*Math.PI),side=impact.side;
    if(side){const sign=side==='left'?1:-1;nodes[side].style.transform=`translate(${sign*55*p}px,${-8*p}px) scale(${1+.035*p})`;nodes[impact.defender].style.transform=`translate(${sign*40*p}px,${-18*p}px) rotate(${sign*4*p}deg) scale(${1-.07*p},${1+.03*p})`;}else for(const s of ['left','right'])nodes[s].style.transform=`translateX(${(s==='left'?-1:1)*24*p}px)`;
   }
  }
  shaking=Math.max(0,shaking-dt*32);flash=Math.max(0,flash-dt*2.5);const dx=rand(-shaking,shaking),dy=rand(-shaking/2,shaking/2);
  document.querySelector('.backdrop').style.transform=`translate(${dx}px,${dy}px) scale(${1+(impact?.special&&impact.t<.25?.05:.015)})`;
  canvas.style.transform=`translate(${dx*.5}px,${dy*.5}px)`;document.querySelector('#flash').style.opacity=flash;
  endScene(dt);
 }
 function lightning(x,y,color){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.shadowColor=color;ctx.shadowBlur=15;for(let k=0;k<4;k++){ctx.beginPath();ctx.moveTo(x,y);for(let i=1;i<=7;i++)ctx.lineTo(x+(k<2?-1:1)*i*45+rand(-18,18),y+(k%2?-1:1)*i*18+rand(-20,20));ctx.stroke();}ctx.restore();}
 function draw(dt){ctx.clearRect(0,0,1280,720);
  if(attack&&engine.state.phase==='windup'&&attack.special){const x=attack.attacker==='left'?350:950,y=330,r=70+attack.t*100;ctx.save();ctx.strokeStyle='#f0bbff';ctx.lineWidth=4;ctx.globalAlpha=.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y,r+i*23,r*.5,attack.t*7+i,0,7);ctx.stroke();}ctx.restore();}
  if(impact&&impact.t<.2){const x=impact.defender==='left'?335:impact.defender==='right'?950:640;ctx.save();ctx.globalAlpha=1-impact.t/.2;
   const glow=ctx.createRadialGradient(x,340,0,x,340,impact.special?260:125);glow.addColorStop(0,'#fff');glow.addColorStop(.2,'#ffe2b0');glow.addColorStop(.55,impact.special?'#ba57ff88':'#ff8d3d77');glow.addColorStop(1,'#ff600000');ctx.fillStyle=glow;ctx.fillRect(x-300,40,600,600);
   if(impact.special||impact.critical)lightning(x,340,'#e2b6ff');
   ctx.strokeStyle='#fff8d2';ctx.lineWidth=impact.special?9:5;for(let i=0;i<11;i++){const a=i*Math.PI*2/11;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*45,340+Math.sin(a)*45);ctx.lineTo(x+Math.cos(a)*(impact.special?330:180),340+Math.sin(a)*(impact.special?250:135));ctx.stroke();}ctx.restore();}
  if(attack&&attack.special&&cutTime>=0){ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle='#efc5ff';ctx.lineWidth=2;for(let i=0;i<25;i++){const y=i*30;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1280,y+50*Math.sin(i));ctx.stroke();}ctx.restore();}
  ctx.save();ctx.globalCompositeOperation='lighter';
  rings=rings.filter(r=>r.life>0);for(const r of rings){if(dt)r.life-=dt;ctx.globalAlpha=Math.max(0,r.life/r.max);ctx.strokeStyle=r.color;ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(r.x,r.y,r.size*(1-r.life/r.max),r.size*.6*(1-r.life/r.max),0,0,7);ctx.stroke();}
  particles=particles.filter(p=>p.life>0);for(const p of particles){if(dt){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(['heart','coin'].includes(p.mode)?-130:300)*dt;if(p.mode==='heart'||p.mode==='coin'){p.vx*=.94;p.vy=Math.min(-45,p.vy);}}
   ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
   if(p.mode==='heart'){ctx.beginPath();ctx.moveTo(0,8);ctx.bezierCurveTo(-20,-6,-8,-18,0,-8);ctx.bezierCurveTo(8,-18,20,-6,0,8);ctx.fill();}
   else if(p.mode==='coin'){ctx.beginPath();ctx.ellipse(0,0,8,12,0,0,7);ctx.fill();ctx.strokeStyle='#fff2a6';ctx.lineWidth=2;ctx.stroke();}
   else if(p.mode==='star'){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?3:10;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
   else if(p.mode==='fire'){ctx.fillStyle=p.life>.45?'#ffd887':p.color;ctx.beginPath();ctx.moveTo(0,-p.size*3);ctx.lineTo(p.size,p.size);ctx.lineTo(-p.size,p.size);ctx.closePath();ctx.fill();}
   else{ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*2);}ctx.restore();}ctx.restore();
 }
 function tick(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;const active=!engine.state.paused&&!document.hidden;
  if(active){if(hitStop>0)hitStop-=dt;else engine.step(dt);process();update(dt);}draw(active?dt:0);document.querySelector('#time').textContent=Math.ceil(engine.state.time);requestAnimationFrame(tick);
 }
 function pause(){engine.state.paused=!engine.state.paused;stage.classList.toggle('is-paused',engine.state.paused);document.querySelector('#paused').hidden=!engine.state.paused;document.querySelector('#pause').setAttribute('aria-pressed',engine.state.paused);if(audio){if(engine.state.paused)audio.suspend();else if(sound)audio.resume();}for(const a of animations)if(engine.state.paused)a.pause();else a.play();}
 function reset(){engine.reset();particles=[];rings=[];attack=null;impact=null;hitStop=0;shaking=0;flash=0;resultTime=-1;cutTime=-1;cutin.hidden=true;curtain.hidden=true;combo.hidden=true;document.querySelector('#flash').style.opacity=0;for(const a of animations)a.cancel();animations.clear();stage.classList.remove('is-paused');stage.dataset.phase='ready';document.querySelector('#paused').hidden=true;document.querySelector('#pause').setAttribute('aria-pressed','false');for(const s of ['left','right']){pose(s,'idle');nodes[s].style.transform='';nodes[s].style.opacity='1';}bars();start.classList.remove('again');start.hidden=false;}
 start.onclick=()=>{unlock();if(engine.state.phase==='finished')reset();engine.start();process();};document.querySelector('#reset').onclick=reset;document.querySelector('#pause').onclick=pause;
 document.querySelector('#sound').setAttribute('aria-pressed','true');document.querySelector('#sound').onclick=()=>{sound=!sound;document.querySelector('#sound').setAttribute('aria-pressed',sound);document.querySelector('#sound').setAttribute('aria-label',sound?'효과음 끄기':'효과음 켜기');if(!sound&&audio)audio.suspend();if(sound)unlock();};
 document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen();try{await screen.orientation.lock('landscape')}catch{}}}catch{}};
 addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Space'){e.preventDefault();if(engine.state.phase==='ready'||engine.state.phase==='finished')start.click();else pause();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenPause=!engine.state.paused;if(hiddenPause)pause();}else if(hiddenPause){hiddenPause=false;if(engine.state.paused)pause();}});
 const preloads=[];for(const id of ['elf','darkelf'])for(const p of ['idle','punch','kick','magic','guard','hurt','win','kneel','blush']){const im=new Image();im.src=asset(`${id}-${p}`);preloads.push(im);}for(let i=0;i<6;i++){const im=new Image();im.src=asset(`curtain-frame-${i}`);preloads.push(im);}
 window.ArenaPreview={engine,get state(){return engine.state},get effectCount(){return particles.length+rings.length},get resultTime(){return resultTime}};stage.dataset.phase='ready';requestAnimationFrame(tick);
})();
