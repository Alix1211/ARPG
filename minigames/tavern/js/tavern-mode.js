(function(root){
'use strict';
const mode={lifeEnabled:false,useBusinessOnly(game){
 if(game.businessOnly)return;game.businessOnly=true;
 // Keep growth prototypes and saved plans intact; only this UI instance bypasses daytime.
 const original={start:game.start,step:game.step,dayClock:game.dayClock,setTeam:game.setTeam,purchase:game.purchase};
 const preparing=(fn,args)=>{const status=game.life.status;game.life.status='planning';try{return fn.apply(game,args)}finally{game.life.status=status}};
 game.start=function(){const status=this.life.status;this.life.status='finished';try{return original.start.call(this)}finally{this.life.status=status}};
 game.step=function(dt){if(this.state==='ready')return;return original.step.call(this,dt)};
 game.dayClock=function(){return this.state==='ready'?'18:00':original.dayClock.call(this)};
 game.setTeam=function(...args){return this.state==='ready'?preparing(original.setTeam,args):original.setTeam.apply(this,args)};
 game.purchase=function(...args){return this.state==='ready'?preparing(original.purchase,args):original.purchase.apply(this,args)};
}};
root.TavernMode=mode;
if(typeof module!=='undefined'&&module.exports)module.exports=mode;
})(typeof window!=='undefined'?window:globalThis);
