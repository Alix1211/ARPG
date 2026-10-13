// 본편에서 열었을 때만 활성화. 별도 실행판의 저장은 그대로 유지한다.
(() => {
  if(parent===window||!new URLSearchParams(location.search).has('arpg'))return;
  let link,initial;try{link=parent.ARPG_MINIGAME_LINK;initial=link?.init(window);}catch{}if(!initial)return;
  window.MiniHost={
    initial,
    get blocked(){return link.isBlocked();},
    save(state,cash){return link.checkpoint(window,state,cash);},
    beginBubbleRound:()=>link.beginBubbleRound(window),
    finishBubbleRound:outcome=>link.finishBubbleRound(window,outcome),
    beginArena:()=>link.beginArena(window),
    finishArena:w=>link.finishArena(window,w),
    arenaDecision:action=>link.arenaDecision(window,action),
    repeatArena:()=>link.repeatArena(window),
    flush:null
  };

  function installBubbleEconomy(){
    if(initial.kind!=='bubble-pang'||typeof window.startGame!=='function'||typeof window.victory!=='function'||typeof window.gameOver!=='function')return;
    const originalStart=window.startGame,originalVictory=window.victory,originalGameOver=window.gameOver;
    let roundOpen=false;
    const begin=()=>{
      const info=window.MiniHost.beginBubbleRound();
      if(!info){
        roundOpen=false;
        if(typeof window.showOverlay==='function')window.showOverlay('이용료 부족','이 판을 시작할 골드가 부족합니다.<br><br>모험으로 돌아가 골드를 마련해 주세요.');
        return false;
      }
      roundOpen=true;
      if(typeof window.toast==='function')window.toast(`이용료 ${info.fee.toLocaleString('ko-KR')}G`);
      return true;
    };
    const appendSettlement=res=>{
      const box=document.getElementById('ovText');if(!box||!res)return;
      const extra=res.outcome==='clear'
        ?`<br><br>정산 <b>+${res.reward.toLocaleString('ko-KR')}G</b>${res.jackpot?' · <b>대박 보너스!</b>':''}`
        :`<br><br>이번 판 보너스 골드는 없습니다. 획득한 소품·조각은 유지됩니다.`;
      box.insertAdjacentHTML('beforeend',extra);
    };
    window.startGame=function(){if(!begin())return false;return originalStart.apply(this,arguments);};
    window.victory=function(){const res=roundOpen?window.MiniHost.finishBubbleRound('clear'):null;roundOpen=false;const out=originalVictory.apply(this,arguments);appendSettlement(res);return out;};
    window.gameOver=function(){const res=roundOpen?window.MiniHost.finishBubbleRound('fail'):null;roundOpen=false;const out=originalGameOver.apply(this,arguments);appendSettlement(res);return out;};
    // 원본은 로드 직전에 첫 판을 이미 만들어 둔다. 첫 판도 동일하게 이용료를 낸다.
    begin();
  }
  addEventListener('load',()=>setTimeout(installBubbleEconomy,0),{once:true});
})();
