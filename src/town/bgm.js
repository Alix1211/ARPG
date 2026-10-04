// 첫 입력 후 음악을 재생하고 장소·전투·이벤트가 바뀌면 교차한다.
const BGM = (() => {
  const tracks=A.bgm||{},level={town:.25,field:.24,dungeon:.19,boss:.28,event:.22},fadeMs=1400;
  let unlocked=false,current=null,activeBoss=null,eventOverride=false;
  const fading=new Set(),ramps=new WeakMap();
  function target(){
    if(eventOverride||(window.QUEST&&QUEST.isDialog()))return 'event';
    if(MAP!=='dungeon'&&MAP!=='field'){activeBoss=null;return MAP==='town'||MAP==='inn'?'town':'field';}
    if(activeBoss&&(!monsters.includes(activeBoss)||activeBoss.dead))activeBoss=null;
    if(!activeBoss)activeBoss=monsters.find(m=>m.boss&&!m.dead&&(m.state==='chase'||Math.hypot(m.x-P.x,m.y-P.y)<360))||null;
    return activeBoss?'boss':MAP;
  }
  function ramp(a,goal,done){
    const token={};ramps.set(a,token);const start=performance.now(),from=a.volume;
    function tick(now){
      if(ramps.get(a)!==token)return;
      const p=Math.min(1,(now-start)/fadeMs);a.volume=Math.max(0,Math.min(1,from+(goal-from)*p));
      if(p<1)requestAnimationFrame(tick);else if(done)done();
    }requestAnimationFrame(tick);
  }
  function play(a){a.play().catch(()=>{});}
  function sync(){
    if(!unlocked)return;
    const volume=AUDIO_SETTINGS.get().bgm;
    if(!volume||document.hidden){
      if(current){ramps.delete(current.audio);current.audio.pause();current.audio.volume=0;current.goal=null;}
      for(const a of fading){ramps.delete(a);a.pause();}fading.clear();return;
    }
    const name=target();if(!tracks[name])return;
    const goal=level[name]*volume;
    if(current&&current.name===name){
      if(current.audio.paused)play(current.audio);
      if(current.goal!==goal){current.goal=goal;ramp(current.audio,goal);}return;
    }
    if(current){const old=current.audio;fading.add(old);ramp(old,0,()=>{old.pause();old.currentTime=0;fading.delete(old);});}
    const audio=new Audio(tracks[name]);audio.loop=true;audio.preload='none';audio.volume=0;
    current={name,audio,goal};play(audio);ramp(audio,goal);
  }
  const unlock=()=>{unlocked=true;sync();};
  addEventListener('pointerdown',unlock,{capture:true});addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',sync);setInterval(sync,300);
  return {sync,setEvent:on=>{eventOverride=!!on;sync();},get track(){return current&&current.name;},state:()=>({track:current?.name,volume:current?.audio.volume,paused:current?.audio.paused})};
})();
window.AUDIO={settings:AUDIO_SETTINGS,sfx:SFX,bgm:BGM,haptic:HAP};
