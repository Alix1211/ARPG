// 첫 입력 후 음악을 재생하고 장소·전투·이벤트가 바뀌면 교차한다.
// HTMLAudioElement 대신 SFX와 같은 WebAudio 컨텍스트를 써서 Android에서 다른 음악 앱과 함께 재생되기 쉽게 한다.
const BGM = (() => {
  const tracks=A.bgm||{},level={town:.25,field:.24,dungeon:.19,boss:.28,event:.22},fadeSec=1.4;
  let unlocked=false,current=null,activeBoss=null,eventOverride=false,ac=null;
  const buffers={},loading={};
  function context(){
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    if(!window.__ARPG_AUDIO_CTX)window.__ARPG_AUDIO_CTX=new C({latencyHint:'playback'});
    return ac=window.__ARPG_AUDIO_CTX;
  }
  function target(){
    if(eventOverride||(window.QUEST&&QUEST.isDialog()))return 'event';
    if(MAP!=='dungeon'&&MAP!=='field'){activeBoss=null;return MAP==='town'||MAP==='inn'?'town':'field';}
    if(activeBoss&&(!monsters.includes(activeBoss)||activeBoss.dead))activeBoss=null;
    if(!activeBoss)activeBoss=monsters.find(m=>m.boss&&!m.dead&&(m.state==='chase'||Math.hypot(m.x-P.x,m.y-P.y)<360))||null;
    return activeBoss?'boss':MAP;
  }
  function load(name){
    if(buffers[name])return Promise.resolve(buffers[name]);
    if(!tracks[name])return Promise.resolve(null);
    if(!loading[name])loading[name]=fetch(tracks[name]).then(r=>r.arrayBuffer()).then(b=>context().decodeAudioData(b)).then(b=>buffers[name]=b).catch(()=>null);
    return loading[name];
  }
  function fade(g,to,done){
    if(!g||!ac)return;const t=ac.currentTime;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(to,t+fadeSec);
    if(done)setTimeout(done,fadeSec*1000+40);
  }
  function stop(cur){if(!cur)return;fade(cur.gain,0,()=>{try{cur.src.stop();}catch(e){};try{cur.src.disconnect();cur.gain.disconnect();}catch(e){}});}
  async function sync(){
    if(!unlocked)return;const c=context();if(!c)return;if(c.state==='suspended')try{await c.resume();}catch(e){}
    const volume=AUDIO_SETTINGS.get().bgm;
    if(!volume||document.hidden){if(current){stop(current);current=null;}return;}
    const name=target(),goal=(level[name]||.22)*volume;if(!tracks[name])return;
    if(current&&current.name===name){fade(current.gain,goal);return;}
    const token={name};current&&stop(current);current=token;
    const buf=await load(name);if(!buf||current!==token||!AUDIO_SETTINGS.get().bgm||document.hidden)return;
    const src=c.createBufferSource(),gain=c.createGain();src.buffer=buf;src.loop=true;gain.gain.value=0;src.connect(gain);gain.connect(c.destination);
    current={name,src,gain};src.start();fade(gain,goal);
  }
  const unlock=()=>{unlocked=true;context();sync();};
  addEventListener('pointerdown',unlock,{capture:true});addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',sync);setInterval(sync,300);
  return {sync,setEvent:on=>{eventOverride=!!on;sync();},get track(){return current&&current.name;},state:()=>({track:current?.name,volume:current?.gain?.gain?.value,paused:!current})};
})();
window.AUDIO={settings:AUDIO_SETTINGS,sfx:SFX,bgm:BGM,haptic:HAP};
