(() => {
  if(!window.MiniHost)return;
  const arena=ArenaPreview,start=document.getElementById('start'),reset=document.getElementById('reset'),original=start.onclick;
  const result=document.createElement('div');result.id='arpgArenaResult';result.style.cssText='position:absolute;bottom:12%;left:50%;transform:translateX(-50%);color:#ffe4aa;font:bold 24px sans-serif;text-shadow:0 3px 5px #000;z-index:25;pointer-events:none';document.getElementById('arena').appendChild(result);
  let settled=false;
  start.onclick=()=>{
    if(!['ready','finished'].includes(arena.state.phase)||MiniHost.blocked)return;
    if(arena.state.phase==='finished'&&!MiniHost.repeatArena())return;
    if(!MiniHost.beginArena()){result.textContent='판돈이 부족합니다.';return;}
    result.textContent='';settled=false;original();
  };
  // 경기 도중 재시작해서 판돈/패배를 우회하지 않는다.
  reset.hidden=true;
  function settle(){
    if(arena.state.phase==='finished'&&!settled){const paid=MiniHost.finishArena(arena.state.winner);if(paid){settled=true;result.textContent=paid.payout?'회수 '+paid.payout+' G':'판돈은 경기장으로…';}}
  }
  MiniHost.flush=settle;setInterval(settle,100);
})();
