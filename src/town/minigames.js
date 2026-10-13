// 기존 페이지를 그대로 열고, 본편의 위치·세계 상태는 메모리에 보존한다.
// 2026-10-13 주점 3인 경제 테스트 게시 트리거
// 2026-10-13 식자재점 UI 복귀 수정 최종 게시
(() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const SUPPLY=[
    {id:'orange',name:'오렌지 주스 재료',cost:16,icon:'menu-13.png'},{id:'berry',name:'산딸기 주스 재료',cost:20,icon:'menu-14.png'},{id:'tea',name:'허브차 재료',cost:12,icon:'menu-19.png'},
    {id:'cheese',name:'숙성 치즈',cost:34,icon:'menu-49.png'},{id:'bread',name:'빵 바구니 재료',cost:22,icon:'menu-46.png'},{id:'fruit',name:'계절 과일',cost:27,icon:'menu-30.png'},
    {id:'tart',name:'숲딸기 타르트 재료',cost:43,icon:'menu-63.png'},{id:'ale',name:'드워프 흑맥주',cost:32,icon:'menu-0.png'},{id:'wine',name:'붉은 포도주',cost:52,icon:'menu-10.png'},{id:'cider',name:'황금 사과주',cost:38,icon:'menu-11.png'}
  ];
  const emptySupply=()=>Object.fromEntries(SUPPLY.map(x=>[x.id,0]));
  let data = {version:2,tavern:null,tavernSupply:emptySupply(),tavernRuns:[],bubble:null,arena:{played:0,wins:0}}, active=null;
  const root=document.createElement('section');root.id='minigameHost';root.hidden=true;
  root.innerHTML='<button id="minigameReturn" type="button">← 모험으로</button><div id="minigameLobby"><h2>돈 벌러 갑니다</h2><button data-mini="tavern">주점 영업</button><button data-mini="bubble-pang">버블팡</button><button data-mini="arena">격투장</button><div id="arenaWager" hidden><label>응원할 선수 <select id="arenaSide"><option value="left">실비아</option><option value="right">니샤</option></select></label><label>판돈 <input id="arenaStake" type="number" min="1" step="1" value="100"></label><button id="arenaEnter">경기장 입장</button><small>승리 2배 · 무승부 반환 · 패배/경기 중 퇴장 0</small></div><p id="minigameMoney"></p></div><iframe id="minigameFrame" title="미니게임" allow="autoplay; fullscreen" hidden></iframe>';
  const supply=document.createElement('section');supply.id='tavernSupplyShop';supply.hidden=true;
  supply.innerHTML='<div class="supply-card"><div class="supply-head"><b>주점 식자재점</b><span id="supplyGold"></span></div><p>DUSK POB 전용 재고 · 영업 전 정상가</p><div id="supplyGrid"></div><div class="supply-foot"><button id="supplyClose" type="button">장보기 끝</button></div></div>';
  root.appendChild(supply);document.body.appendChild(root);
  const frame=root.querySelector('iframe'),lobby=root.querySelector('#minigameLobby');
  const fonts=document.createElement('link');fonts.rel='stylesheet';fonts.href='../minigames/fonts.css';document.head.appendChild(fonts);
  const style=document.createElement('style');style.textContent=`
    #minigameHost[hidden],#minigameHost [hidden]{display:none!important}
    #minigameHost{position:fixed;inset:0;z-index:1500;background:#160d08;font-family:'Noto Sans KR',sans-serif;display:grid;place-items:center}
    #minigameFrame{width:100%;height:100%;border:0;background:#160d08}
    #minigameReturn{position:absolute;top:max(6px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:60;padding:5px 12px;border:1px solid #bd914a;border-radius:7px;background:#2c160af2;color:#f3e6c8;font-size:14px;font-weight:800;white-space:nowrap;pointer-events:auto;touch-action:manipulation}
    #minigameLobby{background:#2c160a;border:2px solid #b07a35;border-radius:14px;padding:25px;text-align:center;color:#f3e6c8;max-width:90vw}
    #minigameLobby button,#minigameLobby input,#minigameLobby select{font:inherit;padding:12px;margin:6px;border:1px solid #b07a35;border-radius:7px;background:#493019;color:#f3e6c8}
    #arenaWager label{display:block}#arenaWager input{width:110px}#arenaWager small{display:block}
    #tavernSupplyShop{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#160d08;padding:54px 18px 16px;box-sizing:border-box}
    .supply-card{width:min(1180px,96vw);max-height:calc(100vh - 76px);overflow:auto;background:#efe0bd;color:#3b2412;border:3px solid #b07a35;border-radius:14px;padding:14px 16px;box-sizing:border-box}
    .supply-head{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:18px;font-weight:900}.supply-card>p{margin:2px 0 10px;color:#72502d;font-size:14px}
    #supplyGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .supply-row{display:grid;grid-template-columns:52px minmax(0,1fr);grid-template-rows:auto auto;gap:4px 9px;align-items:center;border:1px solid #b8925f;border-radius:9px;background:#fff5df;padding:8px 9px;min-width:0}
    .supply-row img{grid-row:1/3;width:46px;height:46px;object-fit:contain}
    .supply-row>div:not(.supply-buy){min-width:0;word-break:keep-all;overflow-wrap:normal;line-height:1.25}
    .supply-row strong{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .supply-row small{display:block;margin-top:2px;font-size:12px;white-space:nowrap}
    .supply-buy{grid-column:2;display:flex;gap:5px;min-width:0}
    .supply-buy button,#supplyClose{border:1px solid #9c642d;border-radius:7px;background:#543218;color:#ffe8b0;font-weight:800;white-space:nowrap;touch-action:manipulation}
    .supply-buy button{flex:1 1 0;min-width:0;padding:5px 6px;margin:0;font-size:12px;line-height:1.1}
    #supplyClose{padding:6px 12px;font-size:13px}
    .supply-foot{text-align:right;margin-top:9px}
    @media(max-width:850px){#tavernSupplyShop{padding-inline:10px}.supply-card{width:98vw;padding:10px}#supplyGrid{grid-template-columns:1fr}.supply-row{grid-template-columns:48px minmax(0,1fr)}.supply-row img{width:42px;height:42px}.supply-buy button{font-size:11px;padding:5px 4px}}
    @media(max-height:650px){#tavernSupplyShop{padding-top:44px}.supply-card{max-height:calc(100vh - 56px)}.supply-head{font-size:16px}.supply-card>p{font-size:12px;margin-bottom:7px}.supply-row{padding:6px 8px}.supply-row img{width:40px;height:40px}}
  `;document.head.appendChild(style);
  function blocked(){return !!(window.ARPG_BACKUP_RESTORING||window.ARPG_SYNC_CHECKING||window.ARPG_SYNC_CONFLICT);}
  function money(){root.querySelector('#minigameMoney').textContent='금화 '+Math.round(GAME.P.gold).toLocaleString('ko-KR')+' G';}
  function ensureSupply(){
    if(!data.tavernSupply||typeof data.tavernSupply!=='object')data.tavernSupply=emptySupply();
    for(const x of SUPPLY)if(!Number.isInteger(data.tavernSupply[x.id])||data.tavernSupply[x.id]<0)data.tavernSupply[x.id]=0;
    return data.tavernSupply;
  }
  function renderSupply(){
    const stock=ensureSupply();root.querySelector('#supplyGold').textContent='보유 '+Math.round(GAME.P.gold).toLocaleString('ko-KR')+'G';
    root.querySelector('#supplyGrid').innerHTML=SUPPLY.map(x=>`<div class="supply-row"><img src="../minigames/tavern/assets/${x.icon}" alt=""><div><strong>${x.name}</strong><small>원가 ${x.cost}G · 주점 재고 ${stock[x.id]}개</small></div><div class="supply-buy">${[1,5,10].map(q=>`<button data-supply="${x.id}" data-qty="${q}" ${GAME.P.gold<x.cost*q?'disabled':''}>${q}개 · ${x.cost*q}G</button>`).join('')}</div></div>`).join('');
    root.querySelectorAll('[data-supply]').forEach(b=>b.onclick=()=>buySupply(b.dataset.supply,Number(b.dataset.qty)));
  }
  function buySupply(id,qty){
    const x=SUPPLY.find(x=>x.id===id);if(!x||![1,5,10].includes(qty))return false;const total=x.cost*qty;if(GAME.P.gold<total)return false;
    GAME.setGold(GAME.P.gold-total);ensureSupply()[id]+=qty;save();renderSupply();return true;
  }
  function addSupplyLoot(id,qty=1){
    const x=SUPPLY.find(x=>x.id===id);qty=Math.max(1,qty|0);if(!x)return false;
    ensureSupply()[id]+=qty;save();if(!supply.hidden)renderSupply();return true;
  }
  function openSupplyShop(){
    if(active||blocked()||GAME.locationState().map!=='town')return false;
    GAME.closeAll();GAME.releaseInput();GAME.setHold(false);GAME.setOpen('minigames');root.hidden=false;lobby.hidden=true;frame.hidden=true;supply.hidden=false;renderSupply();return true;
  }
  function save(){UI.refresh();UI.save();money();}
  function lobbyMode(kind){
    const direct=kind==='arena';
    lobby.querySelector('h2').textContent=direct?'격투장 입장·배팅소':'돈 벌러 갑니다';
    root.querySelectorAll('[data-mini]').forEach(b=>b.hidden=direct);
    root.querySelector('#arenaWager').hidden=!direct;
  }
  function open(kind=null){
    if(typeof kind!=='string')kind=null;
    if(active||blocked())return false;
    const map=GAME.locationState().map;
    if(!['town','inn','fieldvillage'].includes(map)){GAME.say('마을에서 돈 벌 궁리를 해 봅시다.');return false;}
    GAME.closeAll();GAME.releaseInput();GAME.setHold(false);GAME.setOpen('minigames');root.hidden=false;supply.hidden=true;lobby.hidden=false;frame.hidden=true;lobbyMode(kind);money();
    if(kind==='tavern'||kind==='bubble-pang')return enter(kind);
    return true;
  }
  function enter(kind,bet=null){
    if(active||blocked()||!['tavern','bubble-pang','arena'].includes(kind))return false;
    root.hidden=false;supply.hidden=true;active={kind,bet,paid:false,source:null};GAME.setOpen('minigames');
    lobby.hidden=true;frame.hidden=false;frame.src='../minigames/'+kind+'/index.html?arpg=1';
    active.source=frame.contentWindow;return true;
  }
  function close(){
    const locked=blocked();
    if(active&&!locked&&frame.contentWindow.MiniHost?.flush)frame.contentWindow.MiniHost.flush();
    active=null;frame.removeAttribute('src');frame.hidden=true;supply.hidden=true;lobby.hidden=true;root.hidden=true;lobbyMode(null);
    GAME.releaseInput();GAME.setHold(false);GAME.setOpen(null);window.AUDIO?.bgm.sync();
    if(!locked)save();
    return true;
  }
  function child(source){return active&&source===frame.contentWindow&&!blocked();}
  window.ARPG_MINIGAME_LINK={
    init(source){if(!child(source))return null;return {kind:active.kind,gold:GAME.P.gold,state:clone(active.kind==='tavern'?data.tavern:active.kind==='bubble-pang'?data.bubble:null),supply:active.kind==='tavern'?clone(ensureSupply()):null};},
    checkpoint(source,state,cash){
      if(!child(source))return false;
      if(active.kind==='tavern'){
        if(!state||!Number.isFinite(cash)||!Array.isArray(state.staff)||state.staff.length!==10)return false;
        data.tavern=clone(state);data.tavernSupply=clone(state.inventory||ensureSupply());GAME.setGold(cash);
        const r=state.result;if(r&&r.runId&&!data.tavernRuns.some(x=>x.runId===r.runId)){data.tavernRuns.push({runId:r.runId,day:r.day,teamCount:r.teamCount||state.team?.length||0,realSeconds:Math.round(r.realSeconds||0),gameSeconds:Math.round(r.gameSeconds||0),sales:r.sales||0,profit:r.profit||0,cashDelta:r.cashDelta||0,netWorthDelta:r.netWorthDelta||0,wages:r.wages||0,cogs:r.cogs||0,completed:r.completed||0,lost:r.lost||0,satisfaction:r.satisfaction||0,at:Date.now()});if(data.tavernRuns.length>30)data.tavernRuns.splice(0,data.tavernRuns.length-30);}
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
  root.querySelector('#minigameReturn').onclick=close;root.querySelector('#supplyClose').onclick=close;
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
  window.MINIGAMES={open,enter,close,openSupplyShop,buySupply,addSupplyLoot,supplyCatalog:()=>clone(SUPPLY),supplyState:()=>clone(ensureSupply()),runs:()=>clone(data.tavernRuns||[]),isOpen:()=>!root.hidden,get active(){return active?.kind||null;},saveData:()=>clone(data),loadData(value){
    if(value?.arena&&typeof value.arena==='object'){
      const old=clone(value);data={version:2,tavern:old.tavern||null,tavernSupply:old.tavernSupply||(old.tavern&&old.tavern.inventory?clone(old.tavern.inventory):emptySupply()),tavernRuns:Array.isArray(old.tavernRuns)?old.tavernRuns.slice(-30):[],bubble:old.bubble||null,arena:old.arena};ensureSupply();
    }
  }};
})();
