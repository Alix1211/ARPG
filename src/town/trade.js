// ======================= 무역: 교역소·상인협회·화물칸 =======================
// 장비 경제와 완전히 분리한다. 장비는 비싸게 사고 헐값에 팔고, 지역 차익은 오직 무역품에서만 발생.
const TRADE_GOODS = [
  {id:'wheat',name:'밀',icon:'🌾',base:12},{id:'barley',name:'보리',icon:'🌿',base:11},{id:'rice',name:'쌀',icon:'🍚',base:15},
  {id:'potato',name:'감자',icon:'🥔',base:10},{id:'apple',name:'사과',icon:'🍎',base:16},{id:'grape',name:'포도',icon:'🍇',base:20},
  {id:'honey',name:'꿀',icon:'🍯',base:28},{id:'milk',name:'우유',icon:'🥛',base:18},{id:'egg',name:'달걀',icon:'🥚',base:12},
  {id:'chicken',name:'닭고기',icon:'🍗',base:24},{id:'pork',name:'돼지고기',icon:'🥩',base:32},{id:'beef',name:'쇠고기',icon:'🥩',base:42},
  {id:'fish',name:'생선',icon:'🐟',base:24},{id:'eel',name:'장어',icon:'🐠',base:36},{id:'salt',name:'소금',icon:'🧂',base:18},
  {id:'timber',name:'목재',icon:'🪵',base:26},{id:'wool',name:'양털',icon:'🧶',base:30},{id:'leather',name:'가죽',icon:'🟫',base:34},
  {id:'herb',name:'약초',icon:'🌿',base:26},{id:'mushroom',name:'버섯',icon:'🍄',base:22},{id:'pepper',name:'후추',icon:'⚫',base:48},
  {id:'chili',name:'화산 고추',icon:'🌶️',base:46},{id:'wine',name:'포도주',icon:'🍷',base:52},{id:'iron',name:'철광석',icon:'⛏️',base:44},
  {id:'obsidian',name:'흑요석',icon:'◆',base:68},
];
const TRADE_BY_ID = Object.fromEntries(TRADE_GOODS.map(g=>[g.id,g]));
const TRADE_REGIONS = {
  town:    {name:'큰 마을 교역소', short:'큰 마을', m:{wine:1.22,pepper:1.22,honey:1.22,obsidian:1.22,chili:1.22}},
  spring:  {name:'봄 초원 상인협회', short:'봄', m:{wheat:0.8,barley:0.79,milk:0.8,egg:0.67,honey:0.8,iron:1.15,pepper:1.15,obsidian:1.15}},
  summer:  {name:'여름 숲 상인협회', short:'여름', m:{apple:0.8,grape:0.8,timber:0.78,herb:0.74,chicken:0.78,salt:1.29,iron:1.16,beef:1.15}},
  autumn:  {name:'가을 들판 상인협회', short:'가을', m:{rice:0.8,barley:0.72,apple:0.67,grape:0.75,pork:0.75,wine:0.8,fish:1.26,herb:1.37}},
  winter:  {name:'겨울 설원 상인협회', short:'겨울', m:{potato:0.75,wool:0.75,leather:0.71,beef:0.8,apple:1.52,grape:1.61,pepper:1.63,chili:1.8}},
  ice:     {name:'얼음 지대 상인협회', short:'얼음', m:{fish:0.8,salt:0.73,wool:0.75,leather:0.71,wheat:1.64,barley:1.62,rice:1.8,pepper:1.64,wine:1.68}},
  volcano: {name:'화산 지대 상인협회', short:'화산', m:{iron:0.74,obsidian:0.76,chili:0.76,pepper:0.77,fish:1.71,milk:1.66,wheat:1.66,rice:1.76,apple:1.8}},
  swamp:   {name:'늪지대 상인협회', short:'늪', m:{eel:0.68,herb:0.64,mushroom:0.68,pepper:0.79,honey:0.61,salt:1.75,beef:1.77,iron:1.8,wheat:1.8}},
};
const TRADE_STACK_MAX = 50, TRADE_DAY_MS = 480000;
// 수레용 탈것(화물칸 확장 전용, 타고 다니지 않음). 칸 수·가격·구매 가능 마을 티어는 초기값(케인 플레이 피드백으로 조정).
const TRADE_MOUNTS = [
  {id:'pack',  name:'배낭',       icon:'🎒', slots:7,  price:0,     tier:0},
  {id:'donkey',name:'당나귀 수레', icon:'🫏', slots:10, price:4000,  tier:2},
  {id:'boar',  name:'멧돼지 수레', icon:'🐗', slots:14, price:10000, tier:3},
  {id:'ox',    name:'황소 수레',   icon:'🐂', slots:19, price:25000, tier:5},
  {id:'bear',  name:'백곰 수레',   icon:'🐻‍❄️', slots:24, price:60000, tier:7}
];
const REGION_TIER = {town:0, spring:1, summer:2, autumn:3, winter:4, ice:5, volcano:6, swamp:7};
const tradeState = { cargo:{}, pressure:{}, resetAt:Date.now()+TRADE_DAY_MS, mount:0, seen:{} };
function mountNow(){ return TRADE_MOUNTS[Math.max(0,Math.min(tradeState.mount|0,TRADE_MOUNTS.length-1))]; }
function cargoMax(){ return mountNow().slots; }
function mountImg(m,h,extra){ const u=(typeof A!=='undefined'&&A.mounts)?A.mounts[m.id]:''; return u?'<img src="'+u+'" alt="'+m.name+'" style="height:'+h+'px;vertical-align:middle;'+(extra||'')+'">':m.icon; }
let tradeRegion='town', tradeSel='wheat', tradeMode='buy';

function tradeRegionDef(k){ return TRADE_REGIONS[k] || TRADE_REGIONS.town; }
function tradeMod(region,id){ return tradeRegionDef(region).m[id] || 1; }
function tradePressure(region,id){
  if(Date.now() >= tradeState.resetAt){ tradeState.pressure={}; tradeState.resetAt=Date.now()+TRADE_DAY_MS; }
  const n=tradeState.pressure[region+':'+id]||0;
  return Math.max(.90,1-Math.floor(n/5)*.01); // 5개 팔 때마다 -1%, 하루 최대 -10%
}
function tradeDiscount(){ return Math.max(.90,1-.02*((P.lifeSkills&&P.lifeSkills.discount)||0)); }
function tradeOvercount(){ return Math.min(1.10,1+.02*((P.lifeSkills&&P.lifeSkills.overcount)||0)); }
function tradeQuote(region,id){
  const g=TRADE_BY_ID[id], m=tradeMod(region,id);
  if(!g)return {buy:0,sell:0,mod:1};
  return {
    buy:Math.max(1,Math.round(g.base*m*1.06*tradeDiscount())),
    sell:Math.max(1,Math.round(g.base*m*.94*tradePressure(region,id)*tradeOvercount())),
    mod:m
  };
}
function cargoSlots(){ return Object.keys(tradeState.cargo).filter(id=>tradeState.cargo[id]&&tradeState.cargo[id].qty>0).length; }
function cargoEntry(id){ return tradeState.cargo[id]||{qty:0,avg:0}; }
function tradeBuy(id,n){
  const g=TRADE_BY_ID[id]; if(!g)return false;
  const q=tradeQuote(tradeRegion,id), cur=cargoEntry(id);
  if(!cur.qty && cargoSlots()>=cargoMax()){ tradeMsg('화물칸이 가득 찼습니다.'); return false; }
  n=Math.max(0,Math.min(n|0,TRADE_STACK_MAX-cur.qty));
  if(!n){ tradeMsg('한 품목은 최대 '+TRADE_STACK_MAX+'개까지 싣습니다.'); return false; }
  const afford=Math.floor(P.gold/q.buy); n=Math.min(n,afford);
  if(!n){ tradeMsg('금화가 부족합니다.'); return false; }
  const next=cur.qty+n, avg=(cur.avg*cur.qty+q.buy*n)/next;
  tradeState.cargo[id]={qty:next,avg:avg};
  setGold(P.gold-q.buy*n);if(window.GUILD)GUILD.refreshTrack();if(window.QUEST)QUEST.onEvent('trade_buy',{region:tradeRegion,id,n,price:q.buy,count:n});if(window.UI&&UI.save)UI.save();
  tradeMsg(g.name+' '+n+'개 매입. 금화 '+(q.buy*n)+'닢… 남는 장사여야 할 텐데요.');
  renderTrade(); return true;
}
function tradeSell(id,n){
  const g=TRADE_BY_ID[id], cur=cargoEntry(id); if(!g||!cur.qty)return false;
  n=Math.max(0,Math.min(n|0,cur.qty)); if(!n)return false;
  const q=tradeQuote(tradeRegion,id), revenue=q.sell*n, cost=cur.avg*n, profit=Math.round(revenue-cost);
  cur.qty-=n; if(cur.qty<=0) delete tradeState.cargo[id]; else tradeState.cargo[id]=cur;
  const key=tradeRegion+':'+id; tradeState.pressure[key]=(tradeState.pressure[key]||0)+n;
  setGold(P.gold+revenue);if(window.GUILD)GUILD.refreshTrack();if(window.QUEST)QUEST.onEvent('trade_sell',{region:tradeRegion,id,n,price:q.sell,profit,count:n});if(window.UI&&UI.save)UI.save();
  tradeMsg((profit>=0?'좋습니다. ':'아깝군요. ')+g.name+' '+n+'개, '+(profit>=0?'+':'')+profit+'골드.');
  renderTrade(); return true;
}
function recordSeen(region){
  const q={}; for(const g of TRADE_GOODS){ const x=tradeQuote(region,g.id); q[g.id]=[x.buy,x.sell]; }
  tradeState.seen[region]={t:Date.now(),q};
}
function buyMount(){
  const next=TRADE_MOUNTS[(tradeState.mount|0)+1], tier=REGION_TIER[tradeRegion]||0;
  if(!next){ tradeMsg('이미 가장 든든한 짐승을 부리고 계십니다.'); return false; }
  if(tier<next.tier){ tradeMsg(next.name+'은(는) '+next.tier+'티어 이상의 마을에서 살 수 있습니다.'); return false; }
  if(P.gold<next.price){ tradeMsg('금화가 부족합니다. '+next.price+'닢이 필요합니다.'); return false; }
  setGold(P.gold-next.price); tradeState.mount=(tradeState.mount|0)+1;
  if(window.UI&&UI.save)UI.save();
  tradeMsg(next.name+'를 들였습니다! 화물칸이 '+next.slots+'칸으로 늘었습니다.');
  renderTrade(); return true;
}
function tradeMsg(t){ const e=$('tradeSay'); if(e)e.textContent=t; }

function tradeQtyMax(mode,id){
  const cur=cargoEntry(id),q=tradeQuote(tradeRegion,id);
  if(mode==='sell')return cur.qty||0;
  if(!cur.qty&&cargoSlots()>=cargoMax())return 0;
  return Math.max(0,Math.min(TRADE_STACK_MAX-cur.qty,Math.floor(P.gold/Math.max(1,q.buy))));
}
function bindTradePress(el,onTap,onHold){
  let timer=0,held=false;
  const clear=()=>{if(timer){clearTimeout(timer);timer=0;}};
  el.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;held=false;clear();timer=setTimeout(()=>{held=true;timer=0;onHold();},520);});
  el.addEventListener('pointerup',e=>{const was=held;clear();if(!was)onTap();});
  el.addEventListener('pointercancel',clear);el.addEventListener('pointerleave',e=>{if(e.buttons)clear();});
}
function openTradeQty(mode,id){
  tradeMode=mode;tradeSel=id;renderTrade();
  const max=tradeQtyMax(mode,id);if(max<1){tradeMsg(mode==='buy'?'더 살 수 없습니다.':'팔 물건이 없습니다.');return false;}
  const g=TRADE_BY_ID[id],q=tradeQuote(tradeRegion,id),o=$('tradeQty'),inp=$('tradeQtyInput');
  $('tradeQtyTitle').textContent=(mode==='buy'?'구매 수량':'판매 수량')+' · '+g.name;
  $('tradeQtyLine').textContent='1개 '+(mode==='buy'?q.buy:q.sell)+'G · 최대 '+max+'개';
  inp.min=1;inp.max=max;inp.value=Math.min(10,max);o.classList.add('on');inp.focus();inp.select();return true;
}
function closeTradeQty(){const o=$('tradeQty');if(o)o.classList.remove('on');}
function ensureTradeUI(){
  if($('trade'))return;
  const st=document.createElement('style');
  st.textContent=`
#trade{position:fixed;inset:0;z-index:82;display:none;align-items:center;justify-content:center;background:#100b06c9;font-family:sans-serif}#trade.on{display:flex}
#trade .tbox{width:min(1040px,96vw);height:min(650px,91vh);background:#eadab8;border:4px solid #7b5228;border-radius:16px;box-shadow:0 15px 50px #000a;padding:12px;color:#402915;display:grid;grid-template-rows:auto 1fr auto;gap:9px;box-sizing:border-box}
#tradeHead{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:10px;border-bottom:2px solid #b78a4d;padding-bottom:8px}#tradeTitle{font-size:20px}
#tradeTabs{display:flex;gap:5px}#tradeTabs button{border:2px solid #9a6b34;background:#d6bd8d;color:#4e3218;border-radius:8px;padding:6px 14px;font-weight:900}#tradeTabs button.on{background:#6f3e1f;color:#fff0ce}
#tradeNote{font-size:11px;color:#77511f;line-height:1.3;overflow:hidden}#tradeHead small{font-weight:900;white-space:nowrap}
#tradeColumns{display:grid;grid-template-columns:1.35fr .85fr;gap:10px;min-height:0}.tradePane{background:#f4e7c9;border:2px solid #b58a51;border-radius:11px;padding:8px;min-height:0;display:grid;grid-template-rows:auto 1fr}
.tradePane h3{margin:0 0 6px;font-size:14px;display:flex;justify-content:space-between;align-items:center}.tradePane h3 small{font-size:10px;color:#76542d}
#tradeList,#tradeCargoList{overflow:auto;align-content:start;display:grid;gap:5px;padding-right:2px}#tradeList{grid-template-columns:repeat(5,minmax(74px,1fr))}#tradeCargoList{grid-template-columns:repeat(3,minmax(78px,1fr))}
.tgood,.tcargo{border:2px solid #b58a51;border-radius:8px;background:#fff4d9;color:#4b321a;min-height:58px;padding:5px;text-align:left;position:relative;overflow:hidden}.tgood.sel,.tcargo.sel{border-color:#7b4616;box-shadow:inset 0 0 0 2px #e1b451}.tgood.dim,.tcargo.dim{opacity:.55}
.tgood i,.tcargo i{font-style:normal;font-size:21px;float:left;margin-right:4px}.tgood b,.tcargo b{font-size:11px;white-space:nowrap}.tgood small,.tcargo small{display:block;clear:both;font-size:9px;line-height:1.25;margin-top:3px}.tgood .hi{color:#b32720}.tgood .lo{color:#24689c}.tempty{border:1px dashed #bda77d;border-radius:8px;min-height:58px;opacity:.45}
#tradeDetail{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border-top:2px solid #b78a4d;padding-top:8px;min-height:86px}#tradeIcon{font-size:36px;width:45px;text-align:center}#tradeName{font-size:16px;font-weight:900}#tradePrice,#tradeStock,#tradeSeen{font-size:10px;line-height:1.35;color:#684c2c}
#tradeActionBox{display:grid;grid-template-columns:130px 80px;gap:5px;align-items:center}#tradeAction,#tradeClose,#tradeMountBtn{border:2px solid #a96d2b;background:#6f3e1f;color:#fff0ce;border-radius:8px;padding:8px;font-weight:900}#tradeClose{background:#e8d4ad;color:#50351d}#tradeAction:disabled{opacity:.35}
#tradeHold{grid-column:1/3;text-align:center;font-size:9px;color:#7d6546}#tradeMount{grid-column:1/4;font-size:10px;color:#5a3d20;border-top:1px solid #c7a875;padding-top:4px;display:flex;gap:8px;align-items:center}#tradeMountTxt{flex:1}#tradeMountBtn{padding:5px 9px;width:auto}
#tradeSay{grid-column:1/4;font-size:10px;color:#883d20;min-height:14px}
#tradeQty{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#1a1009a8;z-index:3}#tradeQty.on{display:flex}#tradeQty .qbox{width:280px;background:#f1dfb8;border:3px solid #795026;border-radius:12px;padding:16px;text-align:center;box-shadow:0 12px 30px #0008}#tradeQtyTitle{font-weight:900;font-size:16px}#tradeQtyLine{font-size:11px;color:#725233;margin:6px 0 10px}#tradeQtyInput{width:110px;font-size:24px;text-align:center;padding:4px;border:2px solid #9b7447;border-radius:8px;background:#fff8e8}#tradeQty .qrow{display:flex;gap:6px;justify-content:center;margin-top:10px}#tradeQty button{border:2px solid #99642c;border-radius:7px;padding:7px 12px;font-weight:900;background:#6f3e1f;color:#fff0ce}#tradeQty button.ghost{background:#e8d4ad;color:#50351d}
.tradeSummary{margin-top:52px;height:calc(100% - 52px);box-sizing:border-box;overflow:auto;background:linear-gradient(#f3e6c6,#e4cf9f);border:4px solid #7b5228;border-radius:16px;padding:18px 22px;color:#53391d}.tradeSummary h2{margin:0 0 10px}.tradeSummary p{font-size:13px;line-height:1.6}.tradeSummary strong{color:#9a541e}
.tradeCargo{position:relative;width:100%;height:100%;padding:118px 0 0 80px;box-sizing:border-box;display:grid;grid-template-columns:repeat(7,61px);grid-auto-rows:62px;gap:5px;align-content:start;overflow:hidden}.tradeCargo h3{position:absolute;left:0;right:0;top:38px;margin:0;text-align:center;font-size:19px;color:#fff0ce;text-shadow:0 2px 3px #4a1a14}.tradeCargo .tc{border:2px solid #ab8251;border-radius:10px;background:#ead8b5;text-align:center;padding:3px;min-width:0;box-sizing:border-box;overflow:hidden}.tradeCargo .tc.lock{opacity:.28;background:#c9b48c}.tradeCargo .tc i{font-style:normal;font-size:22px}.tradeCargo .tc b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tradeCargo .tc small{font-size:9px;color:#725435}
`;
  document.head.append(st);
  const d=document.createElement('div');d.id='trade';
  d.innerHTML='<div class="tbox"><div id="tradeHead"><b id="tradeTitle"></b><div id="tradeTabs"><button id="tradeBuyTab" type="button">사기</button><button id="tradeSellTab" type="button">팔기</button></div><span id="tradeNote"></span><small>금화 <em id="tradeGold">0</em></small></div><div id="tradeColumns"><section class="tradePane"><h3>이 마을 물품 <small>짧게 선택 · 길게 수량</small></h3><div id="tradeList"></div></section><section class="tradePane"><h3>내 화물 <small id="tradeHint"></small></h3><div id="tradeCargoList"></div></section></div><div id="tradeDetail"><div id="tradeIcon"></div><div><div id="tradeName"></div><div id="tradePrice"></div><div id="tradeStock"></div><div id="tradeSeen"></div></div><div id="tradeActionBox"><button id="tradeAction" type="button">1개 사기</button><button id="tradeClose" type="button">나가기</button><div id="tradeHold">길게 누르면 수량 선택</div></div><div id="tradeMount"><div id="tradeMountTxt"></div><button type="button" id="tradeMountBtn">수레 구매</button></div><div id="tradeSay"></div></div><div id="tradeQty"><div class="qbox"><div id="tradeQtyTitle"></div><div id="tradeQtyLine"></div><input id="tradeQtyInput" type="number" inputmode="numeric" min="1"><div class="qrow"><button id="tradeQtyMax" type="button">최대</button><button id="tradeQtyOk" type="button">확인</button><button class="ghost" id="tradeQtyCancel" type="button">취소</button></div></div></div></div>';
  document.body.append(d);
  d.addEventListener('click',e=>{if(e.target===d)closeTrade();});
  $('tradeClose').onclick=()=>closeTrade();$('tradeBuyTab').onclick=()=>{tradeMode='buy';renderTrade();};$('tradeSellTab').onclick=()=>{tradeMode='sell';renderTrade();};
  $('tradeMountBtn').onclick=()=>buyMount();
  bindTradePress($('tradeAction'),()=>{const max=tradeQtyMax(tradeMode,tradeSel);if(max<1)return;tradeMode==='buy'?tradeBuy(tradeSel,1):tradeSell(tradeSel,1);},()=>openTradeQty(tradeMode,tradeSel));
  $('tradeQtyCancel').onclick=closeTradeQty;$('tradeQty').addEventListener('click',e=>{if(e.target.id==='tradeQty')closeTradeQty();});
  $('tradeQtyMax').onclick=()=>{$('tradeQtyInput').value=tradeQtyMax(tradeMode,tradeSel);};
  $('tradeQtyOk').onclick=()=>{const max=tradeQtyMax(tradeMode,tradeSel),n=Math.max(1,Math.min(max,parseInt($('tradeQtyInput').value,10)||1));closeTradeQty();if(max<1)return;tradeMode==='buy'?tradeBuy(tradeSel,n):tradeSell(tradeSel,n);};
}
function openTrade(region){
  closeAll();ensureTradeUI();tradeRegion=TRADE_REGIONS[region]?region:'town';tradeMode='buy';panel='trade';$('trade').classList.add('on');recordSeen(tradeRegion);renderTrade();
}
function closeTrade(silent){closeTradeQty();const d=$('trade');if(d)d.classList.remove('on');if(panel==='trade')panel=null;}
function renderTrade(){
  ensureTradeUI();const R=tradeRegionDef(tradeRegion),cargoIds=Object.keys(tradeState.cargo).filter(id=>tradeState.cargo[id]&&tradeState.cargo[id].qty>0);
  if(tradeMode==='sell'&&!cargoEntry(tradeSel).qty&&cargoIds.length)tradeSel=cargoIds[0];
  $('tradeTitle').textContent=R.name;$('tradeGold').textContent=P.gold;$('tradeHint').textContent=cargoSlots()+'/'+cargoMax()+'칸';
  $('tradeBuyTab').classList.toggle('on',tradeMode==='buy');$('tradeSellTab').classList.toggle('on',tradeMode==='sell');
  const ent=Object.entries(R.m),nm=id=>TRADE_BY_ID[id]?TRADE_BY_ID[id].name:id;
  const cheap=ent.filter(e=>e[1]<=.85).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>nm(e[0])).join('·');
  const dear=ent.filter(e=>e[1]>=1.12).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>nm(e[0])).join('·');
  $('tradeNote').textContent=(cheap?'싼 것 '+cheap:'')+(cheap&&dear?' / ':'')+(dear?'비싸게 사는 것 '+dear:'');
  const list=$('tradeList');list.innerHTML='';
  for(const g of TRADE_GOODS){
    const q=tradeQuote(tradeRegion,g.id),cur=cargoEntry(g.id),card=document.createElement('button');card.type='button';
    const cls=q.mod>=1.18?'hi':q.mod<=.82?'lo':'';
    card.className='tgood'+(tradeMode==='buy'&&tradeSel===g.id?' sel':'')+(tradeMode==='sell'?' dim':'');
    card.innerHTML='<i>'+g.icon+'</i><b>'+g.name+'</b><small class="'+cls+'">사 '+q.buy+' / 팔 '+q.sell+(cur.qty?' · 보유 '+cur.qty:'')+'</small>';
    bindTradePress(card,()=>{tradeMode='buy';tradeSel=g.id;renderTrade();},()=>openTradeQty('buy',g.id));list.append(card);
  }
  const cargo=$('tradeCargoList');cargo.innerHTML='';
  for(let i=0;i<cargoMax();i++){
    const id=cargoIds[i];
    if(!id){const empty=document.createElement('div');empty.className='tempty';cargo.append(empty);continue;}
    const g=TRADE_BY_ID[id],cur=cargoEntry(id),q=tradeQuote(tradeRegion,id),card=document.createElement('button');card.type='button';
    card.className='tcargo'+(tradeMode==='sell'&&tradeSel===id?' sel':'')+(tradeMode==='buy'?' dim':'');
    card.innerHTML='<i>'+g.icon+'</i><b>'+g.name+' ×'+cur.qty+'</b><small>평균 '+Math.round(cur.avg)+'G · 팔 '+q.sell+'G</small>';
    bindTradePress(card,()=>{tradeMode='sell';tradeSel=id;renderTrade();},()=>openTradeQty('sell',id));cargo.append(card);
  }
  const g=TRADE_BY_ID[tradeSel]||TRADE_GOODS[0],q=tradeQuote(tradeRegion,g.id),cur=cargoEntry(g.id);
  $('tradeIcon').textContent=g.icon;$('tradeName').textContent=g.name;$('tradePrice').textContent='구매 '+q.buy+'G · 판매 '+q.sell+'G';
  const allProfit=cur.qty?Math.round((q.sell-cur.avg)*cur.qty):0;
  $('tradeStock').innerHTML='내 화물 <b>'+cur.qty+'</b>개'+(cur.qty?' · 평균 '+Math.round(cur.avg)+'G · 전부 팔면 '+(allProfit>=0?'+':'')+allProfit+'G':'');
  const rows=[];let best=null;
  for(const r in tradeState.seen){if(r===tradeRegion)continue;const e=tradeState.seen[r].q[g.id];if(!e)continue;rows.push(tradeRegionDef(r).short+' '+e[0]+'/'+e[1]);if(!best||e[1]>best.s)best={r,s:e[1]};}
  $('tradeSeen').textContent=rows.length?'수첩 · '+rows.join(' · '):'수첩 · 다른 마을 시세 미확인';
  const action=$('tradeAction'),max=tradeQtyMax(tradeMode,g.id);action.textContent=tradeMode==='buy'?'1개 사기':'1개 팔기';action.disabled=max<1;
  const m=mountNow(),nx=TRADE_MOUNTS[(tradeState.mount|0)+1],tier=REGION_TIER[tradeRegion]||0;
  $('tradeMountTxt').innerHTML=mountImg(m,30)+' <b>'+m.name+'</b> · 화물 '+m.slots+'칸'+(nx?' → '+mountImg(nx,20)+' '+nx.name+' '+nx.slots+'칸 / '+nx.price+'G':' · 최고 단계');
  $('tradeMountBtn').style.display=nx?'':'none';if(nx)$('tradeMountBtn').disabled=tier<nx.tier||P.gold<nx.price;
}
function tradeSaveData(){ return {cargo:tradeState.cargo,pressure:tradeState.pressure,resetAt:tradeState.resetAt,mount:tradeState.mount|0,seen:tradeState.seen}; }
function tradeLoadData(d){
  if(!d)return; tradeState.cargo=d.cargo&&typeof d.cargo==='object'?d.cargo:{}; tradeState.pressure=d.pressure&&typeof d.pressure==='object'?d.pressure:{};
  tradeState.resetAt=+d.resetAt||Date.now()+TRADE_DAY_MS;
  tradeState.mount=Math.max(0,Math.min(d.mount|0,TRADE_MOUNTS.length-1)); tradeState.seen=d.seen&&typeof d.seen==='object'?d.seen:{};
}
function tradeConsume(id,qty){
  qty=Math.max(1,qty|0);const c=cargoEntry(id);
  if(c.qty<qty)return false;
  c.qty-=qty;if(c.qty<=0)delete tradeState.cargo[id];
  if(window.GUILD)GUILD.refreshTrack();
  if($('trade').classList.contains('on'))renderTrade();
  return true;
}
function renderTradeSummary(L){
  ensureTradeUI();
  L.style.backgroundImage='none';L.style.width='458px';L.style.height='595px';
  const d=document.createElement('div');d.className='tradeSummary';
  let value=0,cost=0,units=0;
  for(const id in tradeState.cargo){const c=tradeState.cargo[id];if(!c||!c.qty)continue;units+=c.qty;cost+=c.avg*c.qty;value+=tradeQuote('town',id).sell*c.qty;}
  d.innerHTML='<h2>무역품 화물</h2><p>장비 가방과 별개로 보관됩니다.<br><strong>'+cargoSlots()+' / '+cargoMax()+'칸</strong> · 총 '+units+'개</p><p>평균 매입 총액 '+Math.round(cost)+'G<br>큰 마을 기준 처분가 '+Math.round(value)+'G</p><p>지역 상인협회에서 싸게 사고, 다른 지역에서 비싸게 파십시오.<br>같은 품목을 너무 많이 풀면 그 지역 매입가가 하루 동안 조금 내려갑니다.</p>';
  d.insertAdjacentHTML('afterbegin','<div style="float:right;text-align:center;margin:0 0 4px 8px">'+mountImg(mountNow(),128)+'<div style="font-size:11px;color:#7a5a30;margin-top:2px">'+mountNow().name+'</div></div>');
  const lines=['<b>시세 수첩</b> <small>(싼 것 / 비싸게 사 주는 것)</small>'];
  for(const r in TRADE_REGIONS){ const e=tradeState.seen[r]; if(!e){ lines.push(tradeRegionDef(r).short+': ?'); continue; }
    const arr=TRADE_GOODS.map(g=>({n:g.name,x:e.q[g.id][0]/g.base})).sort((a,b)=>a.x-b.x);
    lines.push(tradeRegionDef(r).short+': 싼 '+arr.slice(0,3).map(a=>a.n).join('·')+' / 비싼 '+arr.slice(-3).reverse().map(a=>a.n).join('·')); }
  const nb=document.createElement('p'); nb.style.cssText='font-size:12px;line-height:1.5;clear:both'; nb.innerHTML=lines.join('<br>'); d.append(nb);
  L.append(d);
}
function renderTradeCargo(R){
  ensureTradeUI();
  R.innerHTML='';R.style.backgroundImage=`url(${A.kit['01']})`;
  const d=document.createElement('div');d.className='tradeCargo';d.innerHTML='<h3>'+mountImg(mountNow(),28)+' '+mountNow().name+' · 화물 '+cargoMax()+'칸</h3>';
  const ids=Object.keys(tradeState.cargo).filter(id=>tradeState.cargo[id]&&tradeState.cargo[id].qty>0);
  const top=TRADE_MOUNTS[TRADE_MOUNTS.length-1].slots;
  for(let i=0;i<top;i++){
    const c=document.createElement('div');c.className='tc'+(i>=cargoMax()?' lock':'');const id=ids[i];
    if(i<cargoMax()&&id){const g=TRADE_BY_ID[id],e=tradeState.cargo[id];c.innerHTML='<i>'+g.icon+'</i><b>'+g.name+' ×'+e.qty+'</b><small>평균 '+Math.round(e.avg)+'G</small>';}
    else if(i>=cargoMax())c.innerHTML='<i>🔒</i>';
    d.append(c);
  }
  R.append(d);
}
window.TRADE={
  open:openTrade,close:closeTrade,quote:tradeQuote,buy:tradeBuy,sell:tradeSell,
  cargo:()=>JSON.parse(JSON.stringify(tradeState.cargo)),goods:TRADE_GOODS,regions:TRADE_REGIONS,
  saveData:tradeSaveData,loadData:tradeLoadData,consume:tradeConsume,renderSummary:renderTradeSummary,renderCargo:renderTradeCargo,
  state:()=>({region:tradeRegion,slots:cargoSlots(),max:cargoMax(),mount:tradeState.mount|0,seen:Object.keys(tradeState.seen),cargo:JSON.parse(JSON.stringify(tradeState.cargo)),resetAt:tradeState.resetAt}),
  buyMount,mounts:TRADE_MOUNTS,
  debugRegion:r=>{tradeRegion=TRADE_REGIONS[r]?r:'town';return tradeRegion;}
};
