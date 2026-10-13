(function(root){'use strict';
const D=root.TavernSceneData,stage=document.createElement('div');stage.id='comic-stage';stage.setAttribute('aria-hidden','true');document.getElementById('game').append(stage);
const active=[],memory=new Map(),log=[];let serial=0,last=performance.now();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function image(src,cls,parent){const el=document.createElement('img');el.src=src;el.alt='';el.className=cls;parent.append(el);return el;}
function actor(src,cls,parent){const el=document.createElement('div');el.className='comic-actor '+cls;image(src,'actor-image',el);parent.append(el);return el;}
function remove(s){s.node.remove();const at=active.indexOf(s);if(at>=0)active.splice(at,1);}
function play(spec,game){const g=game.guest(spec.guestId),staff=game.staff[spec.staffId];if(!g||!staff||g.tableId===null)return false;const tableId=g.tableId,p=root.TavernView.POS[tableId];
for(const old of [...active])if(old.tableId===tableId){if(spec.kind==='tap'&&old.kind==='tap')return false;remove(old);}
const big=['camera','launch','dash'].includes(spec.pattern);if(big&&active.some(s=>s.big))return false;if(active.length>=2)return false;
const node=document.createElement('div');node.className='comic-scene pattern-'+spec.pattern;node.dataset.scene=++serial;node.dataset.sceneTable=tableId;node.dataset.kind=spec.kind;node.dataset.pattern=spec.pattern;stage.append(node);
const guest=actor('assets/guest-sd/'+D.guestBodies[g.sprite]+'-front.png','guest-actor',node),worker=actor('assets/'+staff.race+'-front.png','worker-actor',node);
const bubble=document.createElement('div');bubble.className='comic-bubble';node.append(bubble);const impact=document.createElement('div');impact.className='comic-impact';impact.textContent='팡!';node.append(impact);
const s={...spec,node,guest,worker,bubble,impact,elapsed:0,tableId,big,anchor:{x:p.x+125,y:p.y+85},duration:spec.kind==='intro'?2.2:spec.kind==='return'?3.2:4.6};
if(spec.pattern==='cocoon'){const web=document.createElement('span');web.className='comic-web';guest.append(web);s.web=web;}
if(spec.pattern==='feather'){s.feathers=Array.from({length:10},(_,i)=>image('assets/comic-feather.png','comic-feather',node));}
active.push(s);log.push({type:'start',pattern:s.pattern,tableId,kind:s.kind});if(log.length>60)log.shift();return true;
}
function pose(el,x,y,sx=1,sy=sx,r=0,o=1){el.style.transform=`translate(${x}px,${y}px) rotate(${r}deg) scale(${sx},${sy})`;el.style.opacity=o;}
function path(t,keys){let a=keys[0],b=keys[keys.length-1];for(let i=1;i<keys.length;i++)if(t<=keys[i].t){a=keys[i-1];b=keys[i];break;}let q=clamp((t-a.t)/(b.t-a.t||1),0,1);q=q*q*(3-2*q);let v={};for(const k of ['x','y','sx','sy','r','o']){let fallback=k==='o'||k==='sx'||k==='sy'?1:0;v[k]=(a[k]??fallback)+((b[k]??fallback)-(a[k]??fallback))*q;}return v;}
function drawScene(s,game){const g=game.guest(s.guestId),staff=game.staff[s.staffId];if(!g||g.tableId!==s.tableId||game.tables[s.tableId].staffId!==s.staffId){remove(s);return;}
const {x:ax,y:ay}=s.anchor,t=clamp((s.elapsed-.85)/(s.duration-1.3),0,1),amp=s.stage===3?1.3:s.stage===2?1.05:.8;let gx=ax-65,gy=ay-125,wx=ax+45,wy=ay-125;
pose(s.guest,gx,gy);pose(s.worker,wx,wy);s.impact.style.opacity='0';s.guest.style.filter='';s.worker.style.filter='';
s.bubble.textContent=s.kind==='return'?D.endings[s.staffId]:s.elapsed<.85?s.ask:s.elapsed>s.duration-.9?s.reply:s.ask;
s.bubble.style.left=clamp(ax-150,25,955)+'px';s.bubble.style.top=clamp(ay-182,83,485)+'px';
if(s.kind==='intro'){const o=s.elapsed<1.1?1:clamp((1.6-s.elapsed)/.5,0,1);pose(s.guest,gx,gy,1,1,0,o);pose(s.worker,wx,wy,1,1,0,o);s.bubble.textContent=s.elapsed<1?s.ask:s.reply;return;}
let v;
if(s.pattern==='launch'){v=path(t,[{t:0},{t:.15,x:0,y:20,sx:1.2,sy:.65},{t:.48,x:-230*amp,y:-190*amp,r:-330,sx:1.3,sy:1.3},{t:.58,x:-230*amp,y:-190*amp,r:-350,sx:1.3,sy:1.3},{t:.9,x:0,y:0,r:-720,sx:.7,sy:.7},{t:1,o:0,sx:.2,sy:.2}]);pose(s.guest,gx+v.x,gy+v.y,v.sx,v.sy,v.r,v.o);}
if(s.pattern==='camera'){v=path(t,[{t:0},{t:.34,x:640-gx-50,y:395-gy,r:10,sx:5,sy:5},{t:.44,x:640-gx-50,y:410-gy,r:0,sx:5.2,sy:1.1},{t:.62,x:650-gx-50,y:480-gy,r:25,sx:3.2,sy:.65},{t:.9,r:720,sx:.6,sy:.6},{t:1,o:0,sx:.2,sy:.2}]);pose(s.guest,gx+v.x,gy+v.y,v.sx,v.sy,v.r,v.o);if(t>.32&&t<.53){s.impact.style.opacity='1';s.impact.style.left='570px';s.impact.style.top='245px';stage.style.transform=`translate(${Math.sin(s.elapsed*70)*4}px,${Math.cos(s.elapsed*65)*3}px)`;}}
if(s.pattern==='head'){s.guest.classList.add('head-only');pose(s.guest,ax-45,ay-112,1,1,Math.sin(t*20)*8,Math.sin(t*Math.PI));pose(s.worker,wx,wy,1,1,0,0);}
if(s.pattern==='bow'){pose(s.worker,wx,wy,1,1,Math.sin(t*Math.PI)*35);pose(s.guest,gx,gy,1,1,-Math.sin(t*Math.PI)*6);}
if(s.pattern==='spin'||s.pattern==='bounce'){const bounce=s.pattern==='bounce'?Math.abs(Math.sin(t*Math.PI*5))*75:Math.sin(t*Math.PI)*30;pose(s.guest,gx,gy-bounce,1+Math.sin(t*30)*.12,1-Math.sin(t*30)*.12,s.pattern==='spin'?t*720:Math.sin(t*22)*12);pose(s.worker,wx,wy-bounce*.35,1,1,Math.sin(t*18)*5);}
if(s.pattern==='paper'){const target=s.kind==='return'||(s.kind==='tap'&&staff.tendency==='M')?s.worker:s.guest,tx=target===s.worker?wx:gx;v=path(t,[{t:0},{t:.25,sx:1.8,sy:.12,y:30},{t:.6,sx:1.7,sy:.15,y:95,r:20},{t:.75,sx:1.5,sy:.18,y:108,r:-20},{t:1}]);pose(target,tx+Math.sin(t*25)*18,gy+v.y,v.sx,v.sy,v.r);}
if(s.pattern==='puddle'){v=path(t,[{t:0},{t:.28,sx:2.5,sy:.18,y:122},{t:.6,sx:2.6,sy:.16,y:124},{t:.83,sx:.65,sy:1.5,y:-20},{t:1}]);pose(s.worker,wx,wy+v.y,v.sx,v.sy);pose(s.guest,gx,gy,1,1,Math.sin(t*25)*10);}
if(s.pattern==='cocoon'){const x=Math.sin(t*Math.PI*2)*180*amp;pose(s.guest,gx+x,gy+Math.abs(Math.sin(t*20))*12,1,1,t*720);s.web.style.opacity=t>.08&&t<.92?'1':'0';}
if(s.pattern==='stone'){s.guest.style.filter=t>.12&&t<.82?'grayscale(1) contrast(.6) drop-shadow(0 0 4px #bbb)':'';pose(s.guest,gx+(t>.8?Math.sin(t*70)*8:0),gy,1,1,t>.8?Math.sin(t*60)*7:0);}
if(s.pattern==='dash'||s.pattern==='feather'){const dx=t<.42?-t/.42*(ax+220):t<.5?1450-ax:(1-(t-.5)/.5)*(1450-ax),o=t>.42&&t<.5?0:1;pose(s.worker,wx+dx,wy-Math.abs(Math.sin(t*70))*14,1,1,Math.sin(t*50)*6,o);pose(s.guest,gx+dx+(t>.05&&t<.9?80:0),gy-Math.abs(Math.sin(t*60))*8,1,1,Math.sin(t*40)*12,o);}
if(s.feathers)s.feathers.forEach((el,i)=>{const angle=i*2.4;pose(el,ax+Math.cos(angle)*t*220,ay-40+Math.sin(angle)*t*140,1,1,t*360+i*20,Math.sin(t*Math.PI));});
}
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;stage.style.transform='';const game=root.tavern;if(game){if(!['open','closing'].includes(game.state)){for(const s of [...active])remove(s);memory.clear();}else if(!game.paused&&!document.hidden){for(const s of [...active]){s.elapsed+=dt;if(s.elapsed>=s.duration){log.push({type:'complete',pattern:s.pattern,tableId:s.tableId,kind:s.kind});remove(s);}else drawScene(s,game);}}}requestAnimationFrame(tick);}
function onEvent(e,game){const g=game.guest(e.guestId);if(e.type==='service'&&g){const c=D.regular[e.staffId];play({...c,kind:'ordinary',staffId:e.staffId,guestId:e.guestId,stage:1},game);}
if(e.type==='specialStart'){memory.set(e.tableId,{...e});const c=D.courseScene(e,game);play({...c,...e,kind:'intro',pattern:'intro'},game);}
if(e.type==='curtainTap'){const c=D.tapScene(e,game);if(c&&c.effect.elapsed>=.75)play({...c,...c.effect,kind:'tap'},game);}
if(e.type==='specialComplete'){const old=memory.get(e.tableId);memory.delete(e.tableId);if(old)play({...old,kind:'return',pattern:game.staff[e.staffId].tendency==='M'?'paper':'head',ask:'',reply:''},game);}
if(['checkout','replaceStaff','unassignStaff','lost'].includes(e.type)){for(const s of [...active])if(s.guestId===e.guestId||s.staffId===e.staffId)remove(s);}
}
root.TavernScenes={onEvent,log,get active(){return active;},playPattern(pattern,staffId,guestId,stage=1){return play({...D.regular[staffId],pattern,staffId,guestId,stage,kind:'tap'},root.tavern);},clear(){for(const s of [...active])remove(s);memory.clear();}};requestAnimationFrame(tick);
})(window);
