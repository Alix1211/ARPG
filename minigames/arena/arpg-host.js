(() => {
  if(!window.MiniHost)return;
  const arena=ArenaPreview,start=document.getElementById('start'),reset=document.getElementById('reset'),original=start.onclick;
  const result=document.createElement('div');
  result.id='arpgArenaResult';
  result.style.cssText='position:absolute;bottom:9%;left:50%;transform:translateX(-50%);min-width:360px;text-align:center;color:#ffe4aa;font:bold 24px sans-serif;text-shadow:0 3px 5px #000;z-index:25;pointer-events:auto';
  document.getElementById('arena').appendChild(result);
  let settled=false,seriesActive=false,decisionOpen=false;

  const fmt=v=>Number(v||0).toLocaleString('ko-KR');
  function clearResult(){result.innerHTML='';}
  function button(label,fn){
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.style.cssText='margin:10px 6px 0;padding:10px 18px;border:1px solid #d7a951;border-radius:10px;background:#2a1812;color:#ffe8a8;font:bold 16px sans-serif;box-shadow:0 3px 8px #0008';
    b.onclick=fn;return b;
  }
  function show(text,actions=[]){
    result.innerHTML='<div>'+text+'</div>';
    for(const [label,fn] of actions)result.appendChild(button(label,fn));
  }
  function startSeries(){
    if(!['ready','finished'].includes(arena.state.phase)||MiniHost.blocked||decisionOpen)return;
    if(arena.state.phase==='finished'){
      if(seriesActive)return;
      if(!MiniHost.repeatArena())return;
    }
    const begun=MiniHost.beginArena();
    if(!begun){show('판돈이 부족하거나 현재 티어의 최소 판돈 단위가 맞지 않습니다.');return;}
    seriesActive=true;settled=false;decisionOpen=false;clearResult();original();
  }
  function continueSeries(){
    const r=MiniHost.arenaDecision('continue');if(!r)return;
    decisionOpen=false;settled=false;clearResult();original();
  }
  function cashOut(){
    const r=MiniHost.arenaDecision('cashout');if(!r)return;
    decisionOpen=false;seriesActive=false;settled=true;
    show(`회수 <b>${fmt(r.payout)}G</b> · ${r.streak}연승에서 종료`);
  }
  start.onclick=startSeries;
  // 경기 도중 재시작해서 판돈/패배를 우회하지 않는다.
  reset.hidden=true;

  function settle(){
    if(arena.state.phase!=='finished'||settled)return;
    const r=MiniHost.finishArena(arena.state.winner);if(!r)return;
    settled=true;
    if(r.status==='won'){
      decisionOpen=true;
      show(`${r.streak}연승 · 현재 판돈 <b>${fmt(r.bank)}G</b>`,[
        ['받고 끝내기',cashOut],
        ['전액 걸고 계속',continueSeries]
      ]);
    }else if(r.status==='draw'){
      decisionOpen=true;
      show(`무승부 · 현재 판돈 <b>${fmt(r.bank)}G</b> 유지`,[['재경기',continueSeries]]);
    }else if(r.status==='jackpot'){
      decisionOpen=false;seriesActive=false;
      show(`3연승! <b>${fmt(r.payout)}G</b> 회수 완료`);
    }else{
      decisionOpen=false;seriesActive=false;
      show('패배 · 진행 중이던 판돈은 모두 사라졌습니다.');
    }
  }
  MiniHost.flush=settle;
  setInterval(settle,100);
})();