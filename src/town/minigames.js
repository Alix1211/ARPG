// 기존 페이지를 그대로 열고, 본편의 위치·세계 상태는 메모리에 보존한다.
(() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  let data = {version:1,tavern:null,bubble:null,arena:{played:0,wins:0}}, active=null;
  const root=document.createElement('section');root.id='minigameHost';root.hidden=true;
  root.innerHTML='<button id="minigameReturn" type="button">← 모험으로</button><div id="minigameLobby"><h2>돈 벌러 갑니다</h2><button data-mini="tavern">주점 영업</button><button data-mini="bubble-pang">버블팡</button><button data-mini="arena">격투장</button><div id="arenaWager" hidden><label>응원할 선수 <select id="arenaSide"><option value="left">실비아</option><option value="right">니샤</option></select></label><label>판돈 <input id="arenaStake" type="number" min="1" step="1" value="100"></label><button id="arenaEnter">경기장 입장</button><small>승리 2배 · 무승부 반환 · 패배/경기 중 퇴장 0</small></div><p id="minigameMoney"></p></div><iframe id="minigameFrame" title="미니게임" allow="autoplay; fullscreen" hidden></iframe>';
  document.body.appendChild(root);
  const frame=root.querySelector('iframe'),lobby=root.querySelector('#minigameLobby');
  const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='../minigames/fonts.css';document.head.appendChild(fonts);
  const style=document.createElement('style');style.textContent=`
    #minigameHost[hidden],#minigameHost [hidden]{display:none!important}
    #minigameHost{position:fixed;inset:0;z-index:1500;background:#160d08;font-family:'Noto Sans KR',sans-serif;display:grid;place-items:center}
    #minigameFrame{width:100%;height:100%;border:0;background:#160d08}
    #minigameReturn{position:absolute;top:max(4px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:3;padding:5px 14px;border:1px solid #bd914a;border-radius:7px;background:#2c160ae8;color:#f3e6c8;font-weight:bold}
    #minigameLobby{background:#2c160a;border:2px solid #b07a35;border-radius:14px;padding:25px;text-align:center;color:#f3e6c8;max-width:90vw}
    #minigameLobby button,#minigameLobby input,#minigameLobby select{font:inherit;padding:12px;margin:6px;border:1px solid #b07a35;border-radius:7px;background:#493019;color:#f3e6c8}
    #arenaWager label{display:block}#arenaWager input{width:110px}#arenaWager small{display:block}
  `;document.head.appendChild(style);
  function blocked(){return !!(window.ARPG_BACKUP_RESTORING||window.ARPG_SYNC_CHECKING||window.ARPG_SYNC_CONFLICT);}
  function money(){root.querySelector('#minigameMoney').textContent='금화 '+Math.round(GAME.P.gold).toLocaleString('ko-KR')+' G';}
  function save(){UI.refresh();UI.save();money();}
  function open(){
    if(active||blocked())return false;
    const map=GAME.locationState().map;
    if(!['town','inn','fieldvillage'].includes(map)){GAME.say('마을에서 돈 벌 궁리를 해 봅시다.');return false;}
    GAME.closeAll();GAME.releaseInput();GAME.setHold(false);GAME.setOpen('minigames');root.hidden=false;lobby.hidden=false;frame.hidden=true;root.querySelector('#arenaWager').hidden=true;money();return true;
  }
  function enter(kind,bet=null){
    if(active||blocked()||!['tavern','bubble-pang','arena'].includes(kind))return false;
    root.hidden=false;active={kind,bet,paid:false,source:null};GAME.setOpen('minigames');
    lobby.hidden=true;frame.hidden=false;frame.src='../minigames/'+kind+'/index.html?arpg=1';
    active.source=frame.contentWindow;return true;
  }
  function close(){
    if(blocked())return false;
    if(active&&frame.contentWindow.MiniHost?.flush&&!blocked())frame.contentWindow.MiniHost.flush();
    active=null;frame.removeAttribute('src');frame.hidden=true;root.hidden=true;GAME.releaseInput();GAME.setHold(false);GAME.setOpen(null);window.AUDIO?.bgm.sync();if(!blocked())save();
  }
  function child(source){return active&&source===frame.contentWindow&&!blocked();}
  window.ARPG_MINIGAME_LINK={
    init(source){if(!child(source))return null;return {kind:active.kind,gold:GAME.P.gold,state:clone(active.kind==='tavern'?data.tavern:active.kind==='bubble-pang'?data.bubble:null)};},
    checkpoint(source,state,cash){
      if(!child(source))return false;
      if(active.kind==='tavern'){
        if(!state||!Number.isFinite(cash)||!Array.isArray(state.staff)||state.staff.length!==10)return false;
        data.tavern=clone(state);GAME.setGold(cash);
      }else if(active.kind==='bubble-pang')data.bubble=clone(state);else return false;
      save();return true;
    },
    beginArena(source){
      if(!child(source)||active.kind!=='arena'||active.paid)return false;
      const b=active.bet;if(!b||!Number.isSafeInteger(b.stake)||b.stake<1||GAME.P.gold<b.stake)return false;
      GAME.setGold(GAME.P.gold-b.stake);active.paid=true;data.arena.played++;save();return true;
    },
    finishArena(source,winner){
      if(!child(source)||active.kind!=='arena'||!active.paid||active.settled||![null,'left','right'].includes(winner))return false;
      active.settled=true;const b=active.bet,payout=winner===null?b.stake:winner===b.side?b.stake*2:0;
      if(winner===b.side)data.arena.wins++;GAME.setGold(GAME.P.gold+payout);save();return {payout,gold:GAME.P.gold};
    },
    repeatArena(source){if(!child(source)||!active.settled)return false;active.paid=false;active.settled=false;return true;},
    isBlocked:blocked
  };
  root.querySelector('#minigameReturn').onclick=close;
  root.querySelectorAll('[data-mini]').forEach(b=>b.onclick=()=>{
    if(b.dataset.mini==='arena'){root.querySelector('#arenaWager').hidden=false;money();}else enter(b.dataset.mini);
  });
  root.querySelector('#arenaEnter').onclick=()=>{
    const stake=Number(root.querySelector('#arenaStake').value),side=root.querySelector('#arenaSide').value;
    if(!Number.isSafeInteger(stake)||stake<1||stake>GAME.P.gold){root.querySelector('#minigameMoney').textContent='가진 금화 안에서 판돈을 정해 주세요.';return;}
    enter('arena',{stake,side});
  };
  document.getElementById('minigamesBtn').onclick=open;
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!root.hidden){e.preventDefault();e.stopImmediatePropagation();close();}},{capture:true});
  window.MINIGAMES={open,enter,close,isOpen:()=>!root.hidden,get active(){return active?.kind||null;},saveData:()=>clone(data),loadData(value){
    if(value?.version===1&&value.arena&&typeof value.arena==='object')data=clone(value);
  }};
})();
