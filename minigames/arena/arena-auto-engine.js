(function(root,factory){const Engine=factory();if(typeof module==='object'&&module.exports)module.exports=Engine;else root.ArenaAutoEngine=Engine;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const types=['punch','kick','magic'],beats={punch:'magic',kick:'punch',magic:'kick'};
 const profiles={left:{weights:[.4,.26,.34],bonus:'magic'},right:{weights:[.27,.4,.33],bonus:'kick'}};
 return class ArenaAutoEngine{
  constructor(random=Math.random){this.random=random;this.events=[];this.reset();}
  reset(){this.events=[];this.state={hp:{left:100,right:100},mp:{left:35,right:35},phase:'ready',elapsed:0,time:75,paused:false,rounds:0,winner:null,attack:null,hits:0,wait:.7};}
  emit(type,extra={}){this.events.push({type,...extra});}drain(){return this.events.splice(0);}
  start(){if(this.state.phase!=='ready')return false;this.state.phase='wait';this.state.elapsed=0;this.emit('start');return true;}
  pick(side){let n=this.random();const w=profiles[side].weights;return n<w[0]?'punch':n<w[0]+w[1]?'kick':'magic';}
  prepare(){
   const s=this.state,left=this.pick('left'),right=this.pick('right'),superLeft=s.mp.left>=100,superRight=s.mp.right>=100;
   let attacker=left===right?null:beats[left]===right?'left':'right';
   if(superLeft!==superRight)attacker=superLeft?'left':'right';
   if(superLeft&&superRight)attacker=null;
   const special=superLeft||superRight,type=special?'magic':attacker==='left'?left:attacker==='right'?right:left;
   if(superLeft)s.mp.left=0;if(superRight)s.mp.right=0;
   const hitCount=special?6:attacker?2+Math.floor(this.random()*3):2;
   const bonus=attacker&&profiles[attacker].bonus===type?1.12:1;
   const total=attacker?Math.round((special?22:7+this.random()*4)*bonus):special?13:3;
   s.attack={left,right,attacker,move:type,special,hitCount,total,critical:!special&&this.random()<.14};
   if(s.attack.critical)s.attack.total=Math.round(s.attack.total*1.35);
   s.phase='windup';s.elapsed=0;s.hits=0;this.emit('prepare',{...s.attack});
  }
  hit(){
   const s=this.state,a=s.attack,last=s.hits===a.hitCount-1;
   const amount=Math.floor(a.total/a.hitCount)+(last?a.total%a.hitCount:0);
   if(a.attacker){const defender=a.attacker==='left'?'right':'left';s.hp[defender]=Math.max(0,s.hp[defender]-amount);
    s.mp[a.attacker]=Math.min(100,s.mp[a.attacker]+(a.special?0:5));s.mp[defender]=Math.min(100,s.mp[defender]+(a.special?3:7));
   }else for(const side of ['left','right']){s.hp[side]=Math.max(0,s.hp[side]-amount);s.mp[side]=Math.min(100,s.mp[side]+4);}
   s.hits++;this.emit('hit',{...a,amount,last,index:s.hits});
   if(!s.hp.left||!s.hp.right||s.hits>=a.hitCount){s.phase='recover';s.elapsed=0;}
  }
  finish(){const s=this.state;s.winner=s.hp.left===s.hp.right?null:s.hp.left>s.hp.right?'left':'right';s.phase='finished';s.elapsed=0;this.emit('finish',{winner:s.winner});}
  step(dt){
   const s=this.state;if(s.paused||s.phase==='ready'||s.phase==='finished')return;
   s.elapsed+=dt;s.time=Math.max(0,s.time-dt);
   if(s.phase==='wait'&&s.elapsed>=s.wait){if(!s.time)this.finish();else this.prepare();}
   else if(s.phase==='windup'&&s.elapsed>=(s.attack.special?.85:.24)){s.phase='strike';s.elapsed=0;this.hit();}
   else if(s.phase==='strike'&&s.elapsed>=(s.attack.special?.12:.10)){s.elapsed=0;this.hit();}
   else if(s.phase==='recover'&&s.elapsed>=(s.attack.special?.85:.46)){
    s.rounds++;if(!s.hp.left||!s.hp.right||!s.time)this.finish();else{s.phase='wait';s.elapsed=0;s.wait=.35+this.random()*.35;this.emit('idle');}
   }
  }
 };
});
