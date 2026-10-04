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
  town:    {name:'큰 마을 교역소', short:'큰 마을', m:{}},
  spring:  {name:'봄 초원 상인협회', short:'봄', m:{wheat:.68,barley:.72,milk:.70,egg:.72,honey:.75,iron:1.30,pepper:1.25,obsidian:1.35}},
  summer:  {name:'여름 숲 상인협회', short:'여름', m:{apple:.68,grape:.72,timber:.65,herb:.75,chicken:.82,salt:1.25,iron:1.25,beef:1.15}},
  autumn:  {name:'가을 들판 상인협회', short:'가을', m:{rice:.68,barley:.78,apple:.75,grape:.70,pork:.72,wine:.68,fish:1.25,herb:1.20}},
  winter:  {name:'겨울 설원 상인협회', short:'겨울', m:{potato:.65,wool:.65,leather:.72,beef:.80,apple:1.35,grape:1.40,pepper:1.45,chili:1.25}},
  ice:     {name:'얼음 지대 상인협회', short:'얼음', m:{fish:.62,salt:.65,wool:.75,leather:.78,wheat:1.45,barley:1.40,rice:1.50,pepper:1.55,wine:1.35}},
  volcano: {name:'화산 지대 상인협회', short:'화산', m:{iron:.60,obsidian:.50,chili:.65,pepper:.78,fish:1.55,milk:1.45,wheat:1.40,rice:1.45,apple:1.35}},
  swamp:   {name:'늪지대 상인협회', short:'늪', m:{eel:.55,herb:.60,mushroom:.55,pepper:.70,honey:.85,salt:1.35,beef:1.30,iron:1.35,wheat:1.20}},
};
const TRADE_STACK_MAX = 50, TRADE_DAY_MS = 480000;
// 수레용 탈것(화물칸 확장 전용, 타고 다니지 않음). 칸 수·가격·구매 가능 마을 티어는 초기값(케인 플레이 피드백으로 조정).
const TRADE_MOUNTS = [
  {id:'pack',  name:'배낭',       icon:'🎒', slots:7,  price:0,     tier:0},
  {id:'donkey',name:'당나귀 수레', icon:'🫏', slots:10, price:1200,  tier:2},
  {id:'boar',  name:'멧돼지 수레', icon:'🐗', slots:14, price:3500,  tier:3},
  {id:'ox',    name:'황소 수레',   icon:'🐂', slots:19, price:9000,  tier:5},
  {id:'bear',  name:'백곰 수레',   icon:'🐻‍❄️', slots:24, price:22000, tier:7}
];
const REGION_TIER = {town:0, spring:1, summer:2, autumn:3, winter:4, ice:5, volcano:6, swamp:7};
const tradeState = { cargo:{}, pressure:{}, resetAt:Date.now()+TRADE_DAY_MS, mount:0, seen:{} };
function mountNow(){ return TRADE_MOUNTS[Math.max(0,Math.min(tradeState.mount|0,TRADE_MOUNTS.length-1))]; }
function cargoMax(){ return mountNow().slots; }
let tradeRegion='town', tradeSel='wheat';

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
  setGold(P.gold-q.buy*n);if(window.GUILD)GUILD.refreshTrack();if(window.UI&&UI.save)UI.save();
  tradeMsg(g.name+' '+n+'개 매입. 금화 '+(q.buy*n)+'닢… 남는 장사여야 할 텐데요.');
  renderTrade(); return true;
}
function tradeSell(id,n){
  const g=TRADE_BY_ID[id], cur=cargoEntry(id); if(!g||!cur.qty)return false;
  n=Math.max(0,Math.min(n|0,cur.qty)); if(!n)return false;
  const q=tradeQuote(tradeRegion,id), revenue=q.sell*n, cost=cur.avg*n, profit=Math.round(revenue-cost);
  cur.qty-=n; if(cur.qty<=0) delete tradeState.cargo[id]; else tradeState.cargo[id]=cur;
  const key=tradeRegion+':'+id; tradeState.pressure[key]=(tradeState.pressure[key]||0)+n;
  setGold(P.gold+revenue);if(window.GUILD)GUILD.refreshTrack();if(window.UI&&UI.save)UI.save();
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

function ensureTradeUI(){
  if($('trade'))return;
  const st=document.createElement('style');
  st.textContent=`
#trade{position:fixed;inset:0;z-index:82;display:none;align-items:center;justify-content:center;background:#100b06b8}
#trade.on{display:flex}
#trade .tbox{width:min(980px,94vw);height:min(620px,88vh);background:#eadab8;border:4px solid #7b5228;border-radius:18px;box-shadow:0 15px 50px #000a;padding:14px;color:#402915;font-family:sans-serif;display:grid;grid-template-columns:1fr 285px;grid-template-rows:auto 1fr;gap:10px}
#tradeHead{grid-column:1/3;display:flex;align-items:center;gap:12px;border-bottom:2px solid #b78a4d;padding-bottom:8px}
#tradeHead b{font-size:21px} #tradeHead small{margin-left:auto;font-weight:900;color:#77511f}
#tradeList{display:grid;grid-template-columns:repeat(5,minmax(92px,1fr));gap:7px;overflow:auto;align-content:start;padding-right:4px}
.tgood{border:2px solid #b58a51;border-radius:11px;background:#f5e9cd;padding:6px;text-align:left;color:#4b321a;min-height:82px}
.tgood.sel{border-color:#7b4616;box-shadow:inset 0 0 0 2px #e1b451}
.tgood i{font-style:normal;font-size:25px;float:left;margin-right:5px}.tgood b{font-size:13px}.tgood small{display:block;clear:both;font-size:11px;margin-top:6px;line-height:1.35}
.tgood .hi{color:#b32720}.tgood .lo{color:#24689c}
#tradeInfo{border-left:2px solid #b78a4d;padding-left:12px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;overflow:auto}
#tradeIcon{font-size:58px;line-height:70px} #tradeName{font-size:20px;font-weight:900} #tradePrice{font-weight:900;font-size:17px}
#tradeStock{font-size:12px;line-height:1.55;color:#684c2c;min-height:62px}
#tradeBtns{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}
#tradeBtns button,#tradeClose{border:2px solid #a96d2b;background:#6f3e1f;color:#fff0ce;border-radius:8px;padding:7px;font-weight:900}
#tradeBtns button:disabled{opacity:.35} #tradeClose{margin-top:auto;background:#e8d4ad;color:#50351d}
#tradeSay{font-size:12px;color:#883d20;min-height:42px;line-height:1.4}
.tradeSummary{padding:20px;color:#53391d}.tradeSummary h2{margin:0 0 10px}.tradeSummary p{font-size:13px;line-height:1.6}.tradeSummary strong{color:#9a541e}
.tradeCargo{position:relative;width:100%;height:100%;padding:82px 42px 46px;box-sizing:border-box;display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:72px;gap:8px;overflow:auto}
.tradeCargo h3{position:absolute;left:48px;top:28px;margin:0;font-size:20px;color:#6d431f}.tradeCargo .tc{border:2px solid #ab8251;border-radius:10px;background:#ead8b5;text-align:center;padding:5px;min-width:0}.tradeCargo .tc i{font-style:normal;font-size:25px}.tradeCargo .tc b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tradeCargo .tc small{font-size:10px;color:#725435}
`;
  document.head.append(st);
  const d=document.createElement('div'); d.id='trade';
  d.innerHTML='<div class="tbox"><div id="tradeHead"><b id="tradeTitle"></b><span id="tradeHint"></span><small>금화 <em id="tradeGold">0</em></small></div><div id="tradeList"></div><div id="tradeInfo"><div id="tradeIcon"></div><div id="tradeName"></div><div id="tradePrice"></div><div id="tradeStock"></div><div id="tradeBtns"><button data-tb="b1">1개 사기</button><button data-tb="b5">5개 사기</button><button data-tb="b10">10개 사기</button><button data-tb="s1">1개 팔기</button><button data-tb="s5">5개 팔기</button><button data-tb="sa">전부 팔기</button></div><div id="tradeSay"></div><button id="tradeClose">나가기</button></div></div>';
  document.body.append(d);
  const inf=$('tradeInfo'), cl=$('tradeClose');
  const seen=document.createElement('div'); seen.id='tradeSeen'; seen.style.cssText='font-size:11px;line-height:1.5;color:#684c2c;width:100%;text-align:left';
  const mt=document.createElement('div'); mt.id='tradeMount'; mt.style.cssText='width:100%;border-top:2px solid #b78a4d;padding-top:6px;font-size:12px;line-height:1.45;color:#50351d';
  mt.innerHTML='<div id="tradeMountTxt"></div><button type="button" id="tradeMountBtn" style="margin-top:4px;border:2px solid #a96d2b;background:#6f3e1f;color:#fff0ce;border-radius:8px;padding:6px;font-weight:900;width:100%">구매</button>';
  inf.insertBefore(seen,cl); inf.insertBefore(mt,cl);
  $('tradeMountBtn').onclick=()=>buyMount();
  d.addEventListener('click',e=>{if(e.target===d)closeTrade();});
  $('tradeClose').onclick=()=>closeTrade();
  $('tradeBtns').addEventListener('click',e=>{
    const k=e.target.dataset.tb;if(!k)return;
    const c=cargoEntry(tradeSel);
    if(k==='b1')tradeBuy(tradeSel,1); else if(k==='b5')tradeBuy(tradeSel,5); else if(k==='b10')tradeBuy(tradeSel,10);
    else if(k==='s1')tradeSell(tradeSel,1); else if(k==='s5')tradeSell(tradeSel,5); else if(k==='sa')tradeSell(tradeSel,c.qty);
  });
}
function openTrade(region){
  closeAll(); ensureTradeUI(); tradeRegion=TRADE_REGIONS[region]?region:'town'; panel='trade'; $('trade').classList.add('on'); recordSeen(tradeRegion); renderTrade();
}
function closeTrade(silent){
  const d=$('trade'); if(d)d.classList.remove('on'); if(panel==='trade')panel=null;
}
function renderTrade(){
  ensureTradeUI(); const R=tradeRegionDef(tradeRegion);
  $('tradeTitle').textContent=R.name; $('tradeGold').textContent=P.gold;
  $('tradeHint').textContent='화물 '+cargoSlots()+'/'+cargoMax()+'칸';
  const list=$('tradeList'); list.innerHTML='';
  for(const g of TRADE_GOODS){
    const q=tradeQuote(tradeRegion,g.id), c=cargoEntry(g.id), b=document.createElement('button');
    b.className='tgood'+(tradeSel===g.id?' sel':''); b.type='button';
    const cls=q.mod>=1.18?'hi':q.mod<=.82?'lo':'';
    b.innerHTML='<i>'+g.icon+'</i><b>'+g.name+'</b><small class="'+cls+'">사 '+q.buy+' / 팔 '+q.sell+(c.qty?' · '+c.qty+'개':'')+'</small>';
    b.onclick=()=>{tradeSel=g.id;renderTrade();}; list.append(b);
  }
  const g=TRADE_BY_ID[tradeSel]||TRADE_GOODS[0], q=tradeQuote(tradeRegion,g.id), c=cargoEntry(g.id);
  $('tradeIcon').textContent=g.icon; $('tradeName').textContent=g.name;
  $('tradePrice').textContent='매입 '+q.buy+' · 매각 '+q.sell+' 골드';
  const allProfit=c.qty?Math.round((q.sell-c.avg)*c.qty):0;
  $('tradeStock').innerHTML='보유 <b>'+c.qty+'</b>개'+(c.qty?'<br>평균 매입 '+Math.round(c.avg)+' · 지금 전부 팔면 <b>'+(allProfit>=0?'+':'')+allProfit+'</b>':'<br>화물칸에 없습니다.');
  const btn=[...$('tradeBtns').querySelectorAll('button')];
  btn[0].disabled=P.gold<q.buy||c.qty>=TRADE_STACK_MAX; btn[1].disabled=P.gold<q.buy||c.qty>=TRADE_STACK_MAX;
  btn[2].disabled=P.gold<q.buy||c.qty>=TRADE_STACK_MAX; btn[3].disabled=!c.qty; btn[4].disabled=c.qty<1; btn[5].disabled=!c.qty;
  // 시세 수첩: 다녀온 다른 마을의 같은 품목 가격
  const rows=[]; let best=null;
  for(const r in tradeState.seen){ if(r===tradeRegion)continue; const e=tradeState.seen[r].q[g.id]; if(!e)continue; rows.push('<span>'+tradeRegionDef(r).short+' 사 '+e[0]+' / 팔 '+e[1]+'</span>'); if(!best||e[1]>best.s)best={r,s:e[1]}; }
  $('tradeSeen').innerHTML=rows.length?('<b>수첩</b> · '+rows.join(' · ')+(best&&q.buy?'<br>가장 비싸게 파는 곳: '+tradeRegionDef(best.r).short+' ('+(best.s-q.buy>=0?'+':'')+(best.s-q.buy)+'/개)':'')):'<b>수첩</b> · 아직 다녀온 다른 마을이 없습니다.';
  // 탈것
  const m=mountNow(), nx=TRADE_MOUNTS[(tradeState.mount|0)+1], tier=REGION_TIER[tradeRegion]||0;
  $('tradeMountTxt').innerHTML=m.icon+' <b>'+m.name+'</b> · 화물 '+m.slots+'칸'+(nx?'<br>다음: '+nx.icon+' '+nx.name+' '+nx.slots+'칸 · '+nx.price+'G'+(tier<nx.tier?' ('+nx.tier+'티어 마을부터)':''):'<br>최고 단계');
  $('tradeMountBtn').style.display=nx?'':'none'; if(nx)$('tradeMountBtn').disabled=tier<nx.tier||P.gold<nx.price;
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
  L.style.backgroundImage='none';L.style.width='458px';L.style.height='595px';
  const d=document.createElement('div');d.className='tradeSummary';
  let value=0,cost=0,units=0;
  for(const id in tradeState.cargo){const c=tradeState.cargo[id];if(!c||!c.qty)continue;units+=c.qty;cost+=c.avg*c.qty;value+=tradeQuote('town',id).sell*c.qty;}
  d.innerHTML='<h2>무역품 화물</h2><p>장비 가방과 별개로 보관됩니다.<br><strong>'+cargoSlots()+' / '+cargoMax()+'칸</strong> · 총 '+units+'개</p><p>평균 매입 총액 '+Math.round(cost)+'G<br>큰 마을 기준 처분가 '+Math.round(value)+'G</p><p>지역 상인협회에서 싸게 사고, 다른 지역에서 비싸게 파십시오.<br>같은 품목을 너무 많이 풀면 그 지역 매입가가 하루 동안 조금 내려갑니다.</p>';
  L.append(d);
}
function renderTradeCargo(R){
  R.innerHTML='';R.style.backgroundImage=`url(${A.kit['01']})`;
  const d=document.createElement('div');d.className='tradeCargo';d.innerHTML='<h3>'+mountNow().icon+' '+mountNow().name+' · 화물칸</h3>';
  const ids=Object.keys(tradeState.cargo).filter(id=>tradeState.cargo[id]&&tradeState.cargo[id].qty>0);
  for(let i=0;i<cargoMax();i++){
    const c=document.createElement('div');c.className='tc';const id=ids[i];
    if(id){const g=TRADE_BY_ID[id],e=tradeState.cargo[id];c.innerHTML='<i>'+g.icon+'</i><b>'+g.name+' ×'+e.qty+'</b><small>평균 '+Math.round(e.avg)+'G</small>';}
    d.append(c);
  }
  const nb=document.createElement('div'); nb.className='tseen'; nb.style.cssText='grid-column:1/-1;font-size:11px;line-height:1.45;color:#5b4023;border-top:2px solid #b78a4d;padding-top:6px;margin-top:4px';
  const lines=['<b>시세 수첩</b> (싸게 사는 곳 / 비싸게 사 주는 곳)'];
  for(const r in TRADE_REGIONS){ const e=tradeState.seen[r]; if(!e){ lines.push(tradeRegionDef(r).short+': ?'); continue; }
    const arr=TRADE_GOODS.map(g=>({n:g.name,x:e.q[g.id][0]/g.base})).sort((a,b)=>a.x-b.x);
    lines.push(tradeRegionDef(r).short+': 싼 '+arr.slice(0,3).map(a=>a.n).join('·')+' / 비싼 '+arr.slice(-3).reverse().map(a=>a.n).join('·')); }
  nb.innerHTML=lines.join('<br>'); d.append(nb);
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
