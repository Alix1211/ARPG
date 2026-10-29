(() => {
  if(!window.MiniHost)return;let previous='',busy=false;
  function flush(){
    if(busy||MiniHost.blocked)return;
    const g=window.tavern,raw=JSON.parse(JSON.stringify(g));raw.events=[];raw.panel=null;raw.selection=null;raw.manualPaused=false;raw.dragging=false;
    const key=JSON.stringify(raw);if(key===previous)return;
    busy=true;if(MiniHost.save(raw,g.cash))previous=key;busy=false;
  }
  let held=false;MiniHost.flush=flush;setInterval(()=>{const g=window.tavern;if(MiniHost.blocked){if(!held){held=true;g._arpgWasPaused=g.manualPaused;}g.manualPaused=true;return;}if(held){held=false;g.manualPaused=g._arpgWasPaused;delete g._arpgWasPaused;}flush();},3000);addEventListener('pagehide',flush);flush();
})();
