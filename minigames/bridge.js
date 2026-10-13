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
    if(initial.kind!=='bubble-pang')return;
    const overlay=document.getElementById('overlay'),title=document.getElementById('ovTitle'),textBox=document.getElementById('ovText');
    const restart=document.getElementById('restartBtn'),retry=document.getElementById('retryBtn'),toast=document.getElementById('toast'),canvas=document.getElementById('gameCanvas');
    if(!overlay||!title||!textBox)return;
    let roundOpen=false,blockedRound=false;
    const showToast=msg=>{if(!toast)return;toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1300);};
    const begin=()=>{
      const info=window.MiniHost.beginBubbleRound();
      if(!info){
        roundOpen=false;blockedRound=true;if(canvas)canvas.style.pointerEvents='none';
        title.textContent='이용료 부족';textBox.innerHTML='이 판을 시작할 골드가 부족합니다.<br><br>모험으로 돌아가 골드를 마련해 주세요.';overlay.classList.add('show');
        return false;
      }
      blockedRound=false;if(canvas)canvas.style.pointerEvents='';roundOpen=true;
      showToast(`이용료 ${info.fee.toLocaleString('ko-KR')}G`);return true;
    };
    const appendSettlement=res=>{
      if(!res)return;
      const extra=res.outcome==='clear'
        ?`<br><br>정산 <b>+${res.reward.toLocaleString('ko-KR')}G</b>${res.jackpot?' · <b>대박 보너스!</b>':''}`
        :`<br><br>이번 판 보너스 골드는 없습니다. 획득한 소품·조각은 유지됩니다.`;
      textBox.insertAdjacentHTML('beforeend',extra);
    };
    document.addEventListener('click',e=>{
      if(e.target!==restart&&e.target!==retry)return;
      if(!begin()){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    document.addEventListener('keydown',e=>{if(blockedRound){e.preventDefault();e.stopImmediatePropagation();}},true);
    const observer=new MutationObserver(()=>{
      if(!roundOpen||!overlay.classList.contains('show'))return;
      const label=title.textContent||'';
      if(label!=='MISSION CLEAR'&&label!=='GAME OVER')return;
      const res=window.MiniHost.finishBubbleRound(label==='MISSION CLEAR'?'clear':'fail');
      roundOpen=false;appendSettlement(res);
    });
    observer.observe(overlay,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
    window.MiniHost.flush=()=>{observer.disconnect();};
    // 원본은 로드 직전에 첫 판을 이미 만들어 둔다. 첫 판도 동일하게 이용료를 낸다.
    begin();
  }
  addEventListener('load',()=>setTimeout(installBubbleEconomy,0),{once:true});
})();
