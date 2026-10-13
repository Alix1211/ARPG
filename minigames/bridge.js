// 본편에서 열었을 때만 활성화. 별도 실행판의 저장은 그대로 유지한다.
(() => {
  if(parent===window||!new URLSearchParams(location.search).has('arpg'))return;
  let link,initial;try{link=parent.ARPG_MINIGAME_LINK;initial=link?.init(window);}catch{}if(!initial)return;
  window.MiniHost={initial,get blocked(){return link.isBlocked();},save(state,cash){return link.checkpoint(window,state,cash);},beginArena:()=>link.beginArena(window),finishArena:w=>link.finishArena(window,w),repeatArena:()=>link.repeatArena(window),flush:null};
})();
