// ======================= 인터페이스: 전투 버튼 묶음, 가방·장비·능력치 창 =======================
(function(){
'use strict';
const $ = id => document.getElementById(id);
const G = window.GAME;            // town.js가 넘겨주는 것: P, setGold, near(), act(), closeAll(), isOpen()
const K = A.kit;                  // 키트 그림
const RARN = ['일반', '마법', '희귀', '전설'];
const RARC = ['#e8dcc0', '#6fb4ff', '#ffd34d', '#ff8a2a'];
const RART = ['#5b4630', '#2f6fb8', '#a8780a', '#c4580a'];
const SLOTN = { w1: '무기1', w2: '무기2', head: '투구', body: '갑옷', hands: '장갑', feet: '신발', neck: '목걸이', ring1: '반지', ring2: '반지' };
const WN = { sword: '검', spear: '창', gauntlet: '건틀릿', bow: '활', staff: '지팡이' };
// 무기별 한 번 피해 배율(검=100% 기준). docs/weapons.md
const WMULT = { sword: 1.0, spear: 1.2, gauntlet: 0.5, bow: 0.7, staff: 2.0 };
const WINFO = { sword: '보통 0.4초 · 짧음 · 넓은 부채꼴', spear: '조금 느림 0.5초 · 김 · 두 마리 관통', gauntlet: '아주 빠름 0.22초 · 아주 짧음 · 움찔', bow: '빠름 0.35초 · 아주 멂 · 걸어도 안 느려짐', staff: '느림 0.75초 · 중간 · 맞은 자리 폭발' };

// ---- 아이템 파밍 ----
let seq = 1;
const GRADE_NAME = ['나무','낡은','철','강철','기사의','서리','왕실','암흑','번개','태양의'];
const GRADE_MUL = [1.00,1.35,1.75,2.25,2.90,3.70,4.70,6.00,7.60,9.60];
const ALL_GEAR = ['weapon','head','body','hands','feet','ring','neck'];
// 일부러 무기/직업별로 과하게 제한하지 않는다.
// 검에 화염 마법, 지팡이에 공격 속도 같은 '이상하지만 가끔 대박인' 조합이 파밍의 핵심.
const AFFIX = [
  {id:'mighty', k:'P', nm:'강력한', st:'atkPct',  lo:6, hi:24, pct:1, slots:ALL_GEAR},
  {id:'arcane', k:'P', nm:'마력의', st:'matkPct', lo:6, hi:26, pct:1, slots:ALL_GEAR},
  {id:'swift',  k:'P', nm:'재빠른', st:'as',      lo:5, hi:22, pct:1, slots:ALL_GEAR},
  {id:'sharp',  k:'P', nm:'날카로운',st:'crit',   lo:3, hi:14, pct:1, slots:ALL_GEAR},
  {id:'fierce', k:'P', nm:'흉포한', st:'critDmg', lo:10,hi:48, pct:1, slots:ALL_GEAR},
  {id:'fire',   k:'P', nm:'화염의', st:'fire',    lo:8, hi:38, pct:1, slots:ALL_GEAR},
  {id:'ice',    k:'P', nm:'서리의', st:'ice',     lo:8, hi:38, pct:1, slots:ALL_GEAR},
  {id:'skill',  k:'P', nm:'비전의', st:'skill',   lo:6, hi:30, pct:1, slots:ALL_GEAR},
  {id:'sturdy', k:'S', nm:'견고한', st:'def',     lo:1, hi:7,  pct:0, slots:ALL_GEAR},
  {id:'bear',   k:'S', nm:'곰의',   st:'hp',      lo:3, hi:24, pct:0, slots:ALL_GEAR},
  {id:'sage',   k:'S', nm:'현자의', st:'mp',      lo:2, hi:18, pct:0, slots:ALL_GEAR},
  {id:'fox',    k:'S', nm:'여우의', st:'ms',      lo:3, hi:15, pct:1, slots:ALL_GEAR},
  {id:'gold',   k:'S', nm:'황금의', st:'coin',    lo:5, hi:30, pct:1, slots:ALL_GEAR},
  {id:'seek',   k:'S', nm:'보물꾼의',st:'find',   lo:4, hi:25, pct:1, slots:ALL_GEAR},
  {id:'lucky',  k:'S', nm:'행운의', st:'luck',    lo:1, hi:6,  pct:0, slots:ALL_GEAR},
];
const AFFIX_BY=Object.fromEntries(AFFIX.map(a=>[a.id,a]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rarityForTier(tier){
  const w = tier===1?[58,32,10,0]:tier===2?[50,34,16,0]:tier===3?[43,36,20,1]:tier===4?[38,36,23,3]:[32,36,27,5];
  let r=Math.random()*w.reduce((a,b)=>a+b,0); for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return i;} return 0;
}
function rollAffix(it, used){
  const pool=AFFIX.filter(a=>a.slots.includes(it.kind)&&!used.has(a.id)); if(!pool.length)return;
  const a=pool[Math.floor(Math.random()*pool.length)]; used.add(a.id);
  const tier=it.tier||1, q=.25+Math.random()*.75, scale=(tier-1)/4;
  const v=a.pct?Math.round((a.lo+(a.hi-a.lo)*(scale*.55+q*(.45+.55*scale)))):Math.max(1,Math.round((a.lo+(a.hi-a.lo)*(scale*.55+q*(.45+.55*scale)))));
  it.aff.push({id:a.id,k:a.k,nm:a.nm,st:a.st,v,pct:a.pct});
  it.st[a.st]=(it.st[a.st]||0)+v;
}
function finalizeName(it){
  const base = it.kind==='weapon' ? GRADE_NAME[it.g-1]+' '+WN[it.wt]
    : it.kind==='ring' ? ['구리','은','금','보석','별빛'][it.tier-1]+' 반지'
    : it.kind==='neck' ? ['구리','은','금','보석','별빛'][it.tier-1]+' 목걸이'
    : GRADE_NAME[it.g-1]+' '+({head:'투구',body:'갑옷',hands:'장갑',feet:'신발'}[it.kind]);
  const pf=(it.aff||[]).find(a=>a.k==='P'), sf=(it.aff||[]).find(a=>a.k==='S');
  it.name=(sf?sf.nm+' ':'')+(pf?pf.nm+' ':'')+base;
}
function make(spec){
  const roll=!!spec.roll, tier=clamp(spec.tier||Math.ceil((spec.g||1)/2),1,5);
  const g=clamp(spec.g || ((tier-1)*2 + (Math.random()<.48?1:2)),1,10);
  const it={id:seq++,kind:spec.kind,rar:spec.rar!=null?spec.rar:(roll?rarityForTier(tier):0),tier,g,st:{},aff:[]};
  const mul=GRADE_MUL[g-1];
  if(spec.kind==='weapon'){
    it.wt=spec.wt; it.icon=`${spec.wt}_${String(g).padStart(2,'0')}`;
    const k=spec.wt==='staff'?'matk':'atk'; it.st[k]=Math.max(1,Math.round(10*WMULT[spec.wt]*mul));
  } else if(spec.kind==='ring'||spec.kind==='neck'){
    it.icon=spec.kind+'_'+tier;
    if(spec.kind==='ring') it.st.luck=Math.max(1,tier); else {it.st.hp=3*tier;it.st.mp=2*tier;}
  } else {
    const style=spec.style|| (Math.random()<.5?'knight':'mage'); it.style=style;
    it.icon=`${style}_${spec.kind}_${String(g).padStart(2,'0')}`;
    const base={head:[2,1,1],body:[4,4,0],hands:[1,1,0],feet:[1,2,0]}[spec.kind];
    it.st.def=Math.max(1,Math.round(base[0]*mul)); if(base[1])it.st.hp=Math.max(1,Math.round(base[1]*mul)); if(base[2])it.st.mp=Math.max(1,Math.round(base[2]*mul));
  }
  if(roll && it.rar>0){
    const used=new Set(), n=it.rar===1?1:it.rar===2?(2+Math.floor(Math.random()*3)):4;
    while(it.aff.length<n) rollAffix(it,used);
  }
  finalizeName(it);
  it.price=spec.price||Math.max(10,Math.round(16*mul*[1,2.2,5,12][it.rar]));
  return it;
}
const STN = { atk:'공격력',matk:'마법 공격력',atkPct:'물리 공격',matkPct:'마법 공격',as:'공격 속도',crit:'치명타 확률',critDmg:'치명타 피해',fire:'화염마법',ice:'냉기마법',skill:'스킬 피해',def:'방어력',hp:'최대 체력',mp:'최대 마나',ms:'이동 속도',coin:'금화 획득',find:'아이템 발견',luck:'운' };
const PCTSTAT=new Set(['atkPct','matkPct','as','crit','critDmg','fire','ice','skill','ms','coin','find']);
const slotOk=(it,s)=>it.kind==='weapon'?(s==='w1'||s==='w2'):it.kind==='ring'?(s==='ring1'||s==='ring2'):it.kind===s;

const BAG=42,bag=new Array(BAG).fill(null);
const eq={w1:null,w2:null,head:null,body:null,hands:null,feet:null,neck:null,ring1:null,ring2:null};
let cur='w1';
// 새 성장판: 시험용 4무기는 제거. 시작 무기 하나만 들고 나머지는 직접 파밍.
eq.w1=make({kind:'weapon',wt:'bow',g:1,rar:0});

const BASE={str:5,vit:5,int:5,mag:6,dex:8,luck:3};
function totals(){
  const t={atk:0,matk:0,atkPct:0,matkPct:0,as:0,crit:0,critDmg:0,fire:0,ice:0,skill:0,def:0,hp:0,mp:0,ms:0,coin:0,find:0,luck:0};
  for(const s in eq){
    const it=eq[s]; if(!it)continue;
    if((s==='w1'||s==='w2')&&s!==cur)continue;
    for(const k in it.st)t[k]=(t[k]||0)+it.st[k];
  }
  return t;
}
function derived(){
  const t=totals(),b=BASE;
  const phys=Math.round((t.atk+Math.floor(b.str/2))*(1+t.atkPct/100));
  const magic=Math.round((t.matk+Math.floor(b.int/2))*(1+t.matkPct/100));
  return {
    t, phys, magic,
    maxHp:20+b.vit*4+t.hp,maxMp:10+b.mag*3+t.mp,
    rows:[['힘',b.str,`공격력 ${phys}`],['방어',t.def,'받는 피해 감소'],['체력',b.vit,`최대 체력 ${20+b.vit*4+t.hp}`],
          ['지능',b.int,`마법 공격력 ${magic}`],['마력',b.mag,`최대 마나 ${10+b.mag*3+t.mp}`],
          ['민첩',b.dex,`공격 속도 +${b.dex+t.as}%`],['운',b.luck+t.luck,`금화 +${(b.luck+t.luck)*2+t.coin}% · 발견 +${t.find}%`]],
  };
}

// ---- HUD: 큰 공격 버튼, 무기 교체, 가방 ----
const atk = $('atk'), atkIc = $('atkIc'), atkCap = $('atkCap');
function syncHud(){
  const w = eq[cur];
  atkIc.src = w ? A.icons[w.icon] : '';
  G.setWeapon(w);
  atkIc.style.visibility = w ? 'visible' : 'hidden';
  $('swapNo').textContent = cur === 'w1' ? '1' : '2';
  if (typeof syncQS === 'function') syncQS();
  $('lvTxt').textContent = G.P.lv;
  const d = derived();
  G.setMax(d.maxHp, d.maxMp);
}
atk.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (G.isOpen()) return;
  if (G.near()) { G.act(); return; }
  try { atk.setPointerCapture(e.pointerId); } catch (er) {}
  G.swing(eq[cur] ? eq[cur].wt : null); G.setHold(true);   // 누르고 있는 동안 계속 공격
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) atk.addEventListener(ev, () => G.setHold(false));
addEventListener('blur', () => G.setHold(false));
$('swap').addEventListener('pointerdown', e => {
  e.preventDefault(); if (G.isOpen()) return;
  const o = cur === 'w1' ? 'w2' : 'w1';
  if (!eq[o]){ G.say('무기2 칸이 비어 있습니다'); return; }
  cur = o; syncHud(); G.say(`${eq[cur].name}(으)로 바꿔 들었습니다`);
});
$('bagBtn').addEventListener('click', () => openChar('equip'));
addEventListener('keyup', e => { if (e.key.toLowerCase() === 'j') G.setHold(false); });
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'i' || k === 'b'){ if ($('char').classList.contains('on')) closeChar(); else if (!G.isOpen()) openChar('equip'); }
  if (k === 'q' && !G.isOpen()) $('swap').dispatchEvent(new PointerEvent('pointerdown'));
  if (k === 'j' && !e.repeat && !G.isOpen()){ if (G.near()) G.act(); else { G.swing(eq[cur] ? eq[cur].wt : null); G.setHold(true); } }
});
function frame(){
  const n = G.near();
  atkCap.textContent = n ? (n.kind === 'npc' ? '말 걸기' : '살펴보기') : '';
  atk.classList.toggle('talk', !!n);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


// ---- 퀵슬롯 5칸 (케인 시안 위치). 비워 두고, 스킬 탭에서 끌어다 놓아 채움 ----
const QPOS = [[-49, -88], [27, -102], [-99, -39], [-95, 32], [-47, 85]];   // 큰 버튼 가운데 기준
const SWAPPOS = [30, 88];
const QS = [null, null, null, null, null];
const SKG = [['불', ['fire1', 'fire2', 'fire3']], ['얼음', ['ice1', 'ice2', 'ice3']], ['뇌전', ['bolt1', 'bolt2', 'bolt3']], ['암흑', ['dark1', 'dark2', 'dark3']],
  ['백마법', ['holy1_heal', 'holy2_shield', 'holy3_revive']], ['검', ['sword1', 'sword2', 'sword3']], ['창', ['spear1', 'spear2', 'spear3']], ['활', ['bow1', 'bow2', 'bow3']], ['무투', ['fist1', 'fist2', 'fist3']]];
const SKW = { sword: 'sword', spear: 'spear', bow: 'bow', fist: 'gauntlet' };   // 무기 스킬: 맞는 무기면 100%, 아니면 피해 60%·마나 1.5배 (막지 않음). 마법: 아무 무기나 100%, 지팡이면 +25%
const LEARNED = new Set(['fire1', 'ice1', 'holy1_heal', 'sword1', 'sword2']);   // 시험용: 스킬 체계 전까지 배운 상태
const SKN = { fire1: '불덩이', ice1: '얼음 화살', holy1_heal: '치유', sword1: '강하게 베기', sword2: '회전 베기' };
const skBtns = [...document.querySelectorAll('.sk')];
const C0 = 62;
skBtns.forEach((b, i) => { b.style.left = (C0 + QPOS[i][0]) + 'px'; b.style.top = (C0 + QPOS[i][1]) + 'px'; b.hidden = false; });
$('swap').style.left = (C0 + SWAPPOS[0]) + 'px'; $('swap').style.top = (C0 + SWAPPOS[1]) + 'px';
// 물약 버튼 2개: 스킬 칸 위 (케인 지시)
const POT = { hp: 3, mp: 2 };   // 시작할 때 체력 물약 3, 마나 물약 2 — 잡화점(마르코)에서 삼
const potEl = { hp: $('potHp'), mp: $('potMp') };
potEl.hp.style.cssText += `left:${C0 - 26}px;top:${C0 - 172}px;background-image:url(${K.h_php})`;
potEl.mp.style.cssText += `left:${C0 + 40}px;top:${C0 - 172}px;background-image:url(${K.h_pmp})`;
function syncPot(){ for (const k of ['hp', 'mp']){ potEl[k].querySelector('b').textContent = POT[k]; potEl[k].classList.toggle('none', !POT[k]); } }
for (const k of ['hp', 'mp']) potEl[k].addEventListener('pointerdown', e => {
  e.preventDefault(); if (G.isOpen()) return;
  if (!POT[k]){ G.say(k === 'hp' ? '체력 물약이 없습니다' : '마나 물약이 없습니다'); return; }
  if (G.drink(k)){ POT[k]--; syncPot(); }
});
syncPot();
function needWeapon(id){ const w = SKW[id.replace(/[0-9].*$/, '')]; return w || null; }
function syncQS(){
  skBtns.forEach((b, i) => {
    const id = QS[i];
    b.style.backgroundImage = `url(${id ? A.skicon[id] : K.ring})`;
    b.classList.toggle('empty', !id);
    const nw = id && needWeapon(id), off = nw && (!eq[cur] || eq[cur].wt !== nw);
    b.dataset.pen = off ? '60%' : (id && !nw && eq[cur] && eq[cur].wt === 'staff' ? '+25%' : '');
  });
}
skBtns.forEach((b, i) => b.addEventListener('pointerdown', e => {
  e.preventDefault();
  if ($('char').classList.contains('on')){ if (QS[i]) startDrag(e, QS[i], i); return; }   // 창이 열려 있으면 빼거나 옮기기
  if (G.isOpen()) return;
  const id = QS[i]; if (!id) return;
  const nw = needWeapon(id), wt = eq[cur] ? eq[cur].wt : null;
  G.cast(id, nw ? (wt === nw ? { dmg: 1, mp: 1 } : { dmg: 0.6, mp: 1.5 }) : (wt === 'staff' ? { dmg: 1.25, mp: 1 } : { dmg: 1, mp: 1 }));
}));
(function cdLoop(){ skBtns.forEach((b, i) => { const id = QS[i]; b.querySelector('i').style.setProperty('--cd', id ? G.cdLeft(id) + 'turn' : '0turn'); }); requestAnimationFrame(cdLoop); })();
// 끌어다 놓기 (손가락·마우스 모두)
let drag = null; const ghost = $('ghost');
function startDrag(e, id, from){
  drag = { id, from }; ghost.src = A.skicon[id]; ghost.style.display = 'block'; moveGhost(e);
  $('cluster').classList.add('drop'); try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
}
function moveGhost(e){ ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
addEventListener('pointermove', e => { if (drag) moveGhost(e); });
addEventListener('pointerup', e => {
  if (!drag) return;
  ghost.style.display = 'none';
  const t = document.elementFromPoint(e.clientX, e.clientY), slot = t && t.closest && t.closest('.sk');   // 칸이 창 위에 떠 있을 때 먼저 찾음
  $('cluster').classList.remove('drop');
  if (slot){
    const i = +slot.dataset.i;
    if (drag.from != null){ const tmp = QS[i]; QS[i] = drag.id; QS[drag.from] = tmp; }       // 칸끼리 맞바꾸기
    else { const old = QS.indexOf(drag.id); if (old >= 0) QS[old] = null; QS[i] = drag.id; }
  } else if (drag.from != null) QS[drag.from] = null;                                          // 칸 밖에 놓으면 빼기
  drag = null; syncQS();
});

// ---- 캐릭터 창 ----
// 키트 그림 좌표(원본 픽셀): 장비창 kit_c_02, 가방 kit_c_01, 능력치 kit_c_02b
const EQS = { head: [72, 107], w1: [72, 196], hands: [72, 287], ring1: [71, 393], neck: [337, 107], w2: [337, 196], body: [337, 286], feet: [340, 379], ring2: [339, 472] };
const EQ_OFF = [[161, 467], [249, 467]];   // 허리띠·별 칸: 지금은 안 씀
const INV = { x: 80, y: 117, px: 65.5, py: 66.8, w: 60, h: 62 };
let tab = 'equip', pickSel = null;
const wrap = $('charWrap');
function el(t, c, txt){ const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
function fit(){
  const vw = innerWidth, vh = innerHeight, W = 458 + 12 + 608, H = 595 + 64;
  const s = Math.min(vw * 0.96 / W, vh * 0.96 / H);
  wrap.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit);
function openChar(t){ tab = t || tab; G.closeAll(); G.setOpen('char'); $('char').classList.add('on'); pickSel = null; render(); fit(); }
function closeChar(){ $('char').classList.remove('on'); $('iinfo').classList.remove('on'); G.setOpen(null); syncHud(); }
$('charClose').addEventListener('click', closeChar);
$('char').addEventListener('click', e => { if (e.target.id === 'char') closeChar(); });
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { tab = b.dataset.tab; pickSel = null; $('iinfo').classList.remove('on'); render(); });

function slotEl(it, x, y, w, h, onTap, selected){
  const s = el('button', 'slot'); s.type = 'button';
  s.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  if (it){
    const im = el('img'); im.src = A.icons[it.icon]; im.alt = it.name; s.append(im);
    s.style.setProperty('--rc', RARC[it.rar]); s.classList.add('has');
  }
  if (selected) s.classList.add('sel');
  s.addEventListener('click', onTap);
  return s;
}
function render(){
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
  const L = $('leftPane'); L.innerHTML = '';
  const d = derived(), Pp = G.P;
  if (tab === 'equip'){
    L.style.backgroundImage = `url(${K['02']})`; L.style.width = '458px'; L.style.height = '595px';
    const fig = el('img', 'fig'); fig.src = A.elfFront; L.append(fig);
    for (const s in EQS){
      const [x, y] = EQS[s], it = eq[s];
      const b = slotEl(it, x, y, 76, 77, () => tapEq(s), pickSel && pickSel.from === 'eq' && pickSel.slot === s);
      const lab = el('span', 'slab' + (it ? ' hide' : ''), SLOTN[s]); b.append(lab);
      if ((s === 'w1' || s === 'w2') && s === cur && it) b.append(el('span', 'held', '손에 듦'));
      L.append(b);
    }
    for (const [x, y] of EQ_OFF){ const o = el('div', 'off'); o.style.cssText = `left:${x}px;top:${y}px;width:74px;height:78px`; L.append(o); }
  } else if (tab === 'skill'){
    L.style.backgroundImage = 'none'; L.style.width = '458px'; L.style.height = '595px';
    const pane = el('div', 'skpane'); L.append(pane);
    pane.append(el('div', 'skhead', `스킬 · 보유 ${Pp.skillPts || 0}P`), el('div', 'sknote', '배운 스킬을 오른쪽 아래 빈 칸으로 끌어다 놓으세요 · 칸 밖에 놓으면 빠짐'));
    for (const [gname, ids] of SKG){
      const row = el('div', 'skrow'); row.append(el('b', '', gname));
      for (const id of ids){
        const c = el('button', 'skc' + (LEARNED.has(id) ? '' : ' lock')); c.type = 'button'; c.title = SKN[id] || '아직 못 배움';
        c.style.backgroundImage = `url(${A.skicon[id]})`;
        if (LEARNED.has(id)) c.addEventListener('pointerdown', e => { e.preventDefault(); startDrag(e, id, null); });
        row.append(c);
      }
      pane.append(row);
    }
  } else if (tab === 'trade' && window.TRADE){
    TRADE.renderSummary(L);
  } else {
    L.style.backgroundImage = `url(${K['02b']})`; L.style.width = '381px'; L.style.height = '610px';
    const face = el('img', 'sface'); face.src = A.face; L.append(face);
    const bars = [[Pp.hp, d.maxHp, 106], [Pp.mp, d.maxMp, 141], [Pp.exp, 100, 176]];
    bars.forEach(([v, m, y], i) => {
      const t = el('div', 'sbar'); t.style.top = (y - 1) + 'px';
      const f = el('i', 'b' + i); f.style.width = Math.max(0, Math.min(100, v / m * 100)) + '%'; t.append(f);
      t.append(el('span', '', i === 2 ? `경험치 ${v}%` : `${v} / ${m}`)); L.append(t);
    });
    d.rows.forEach(([n, v, sub], i) => {
      const r = el('div', 'srow'); r.style.top = (232 + i * 47.7) + 'px';
      r.append(el('b', '', n), el('em', '', v), el('small', '', sub)); L.append(r);
    });
    const lv = el('div', 'slv', `${Pp.name || '루크레아'} · Lv ${Pp.lv} · 견습 모험가 · 능력치 ${Pp.statPts || 0}P · 스킬 ${Pp.skillPts || 0}P`); L.append(lv);
  }
  // 오른쪽: 일반 가방 / 무역품 화물칸
  const R = $('bagPane'); R.innerHTML = '';
  if (tab === 'trade' && window.TRADE){
    TRADE.renderCargo(R);
  } else {
    R.style.backgroundImage = `url(${K['01']})`;
    R.append(el('div', 'btitle', '가방'));
    bag.forEach((it, i) => {
      const x = INV.x + (i % 7) * INV.px, y = INV.y + Math.floor(i / 7) * INV.py;
      R.append(slotEl(it, x, y, INV.w, INV.h, () => tapBag(i), pickSel && pickSel.from === 'bag' && pickSel.i === i));
    });
    const gl = el('div', 'bgold', `금화 ${Pp.gold}`); R.append(gl);
    const cnt = el('div', 'bcnt', `${bag.filter(Boolean).length} / ${BAG}`); R.append(cnt);
  }
}
function tapBag(i){
  if (!bag[i]){ pickSel = null; $('iinfo').classList.remove('on'); render(); return; }
  pickSel = { from: 'bag', i }; render(); showInfo(bag[i], 'bag');
}
function tapEq(s){
  if (!eq[s]){ pickSel = null; $('iinfo').classList.remove('on'); render(); return; }
  pickSel = { from: 'eq', slot: s }; render(); showInfo(eq[s], 'eq');
}
function cmpLine(it, other){
  const out = [];
  const keys = new Set([...Object.keys(it.st), ...Object.keys(other ? other.st : {})]);
  for (const k of keys){
    const a = it.st[k] || 0, b = other ? (other.st[k] || 0) : 0;
    const li = el('li', '', `${STN[k]} ${a}`);
    if (other && a !== b){ const sp = el('span', a > b ? 'up' : 'dn', a > b ? ` ▲${a - b}` : ` ▼${b - a}`); li.append(sp); }
    out.push(li);
  }
  return out;
}
function targetSlot(it){
  if (it.kind === 'weapon') return eq.w1 ? (eq.w2 ? cur : 'w2') : 'w1';
  if (it.kind === 'ring') return eq.ring1 ? (eq.ring2 ? 'ring1' : 'ring2') : 'ring1';
  return it.kind;
}
function showInfo(it, from){
  const I = $('iinfo'); I.innerHTML = '';
  const nm = el('div', 'iname', it.name); nm.style.color = RART[it.rar]; I.append(nm);
  I.append(el('div', 'isub', `${RARN[it.rar]} · ${it.kind === 'weapon' ? WN[it.wt] : SLOTN[targetSlot(it)]}`));
  if (it.kind === 'weapon') I.append(el('div', 'isub', WINFO[it.wt]));
  const ic = el('img', 'iic'); ic.src = A.icons[it.icon]; I.append(ic);
  const ul = el('ul', 'ist');
  const other = from === 'bag' ? eq[targetSlot(it)] : null;
  cmpLine(it, other).forEach(li => ul.append(li)); I.append(ul);
  if (from === 'bag' && other) I.append(el('div', 'icmp', `▲▼ 지금 낀 ${other.name}과 비교`));
  const row = el('div', 'ibtns');
  if (from === 'bag'){
    if (it.kind === 'weapon'){
      for (const s of ['w1', 'w2']){ const b = el('button', 'btn', `${SLOTN[s]}에 장착`); b.type = 'button'; b.onclick = () => equip(it, s); row.append(b); }
    } else if (it.kind === 'ring'){
      for (const s of ['ring1', 'ring2']){ const b = el('button', 'btn', s === 'ring1' ? '왼손 반지' : '오른손 반지'); b.type = 'button'; b.onclick = () => equip(it, s); row.append(b); }
    } else { const b = el('button', 'btn', '장착'); b.type = 'button'; b.onclick = () => equip(it, it.kind); row.append(b); }
    const d = el('button', 'btn ghost', '버리기'); d.type = 'button';
    d.onclick = () => { if (d.dataset.ok){ bag[pickSel.i] = null; pickSel = null; I.classList.remove('on'); render(); } else { d.dataset.ok = 1; d.textContent = '정말 버리기'; } };
    row.append(d);
  } else {
    const b = el('button', 'btn', '벗기'); b.type = 'button'; b.onclick = () => unequip(pickSel.slot); row.append(b);
  }
  I.append(row);
  I.classList.add('on');
}
function equip(it, s){
  const i = bag.indexOf(it); if (i < 0) return;
  bag[i] = eq[s]; eq[s] = it;
  if ((s === 'w1' || s === 'w2') && !eq[cur]) cur = s;
  pickSel = { from: 'eq', slot: s }; tab = 'equip'; render(); showInfo(it, 'eq'); syncHud();
}
function unequip(s){
  const i = bag.indexOf(null); if (i < 0){ G.say('가방이 가득 찼습니다'); return; }
  bag[i] = eq[s]; eq[s] = null;
  if (s === cur && !eq[cur]){ const o = s === 'w1' ? 'w2' : 'w1'; if (eq[o]) cur = o; }
  pickSel = { from: 'bag', i }; render(); showInfo(bag[i], 'bag'); syncHud();
}
window.UI = {
  addPotion(k, n){ POT[k] += n; syncPot(); },
  make, add(it){ const i = bag.indexOf(null); if (i < 0) return false; bag[i] = it; return true; },
  bagFull: () => bag.indexOf(null) < 0,
  bagItems: () => bag.map((it, i) => it ? { i, it } : null).filter(Boolean),
  removeBagAt(i){
    if (i < 0 || i >= BAG || !bag[i]) return null;
    const it = bag[i]; bag[i] = null; pickSel = null; $('iinfo').classList.remove('on');
    if ($('char').classList.contains('on')) render();
    if (typeof saveGame === 'function') saveGame();
    return it;
  },
  isOpen: () => $('char').classList.contains('on'), close: closeChar,
};
// ---- 저장 (이 기기의 브라우저에 자동 저장: 금화·체력·레벨·가방·장비·물약·퀵슬롯) ----
const SKEY = 'arpg_save_v2';
try { localStorage.removeItem('arpg_save_v1'); } catch (e) {}
function saveGame(){
  try {
    const P = G.P;
    localStorage.setItem(SKEY, JSON.stringify({ v: 2, t: Date.now(), name: P.name, passives: P.passives, lifeSkills: P.lifeSkills, statPts: P.statPts, skillPts: P.skillPts, gold: P.gold, hp: P.hp, mp: P.mp, lv: P.lv, exp: P.exp, bag, eq, cur, pot: POT, qs: QS, trade: window.TRADE ? TRADE.saveData() : null }));
  } catch (e) {}
}
function loadGame(){
  let d = null; try { d = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
  if (!d || d.v !== 2) return null;
  for (let i = 0; i < BAG; i++) bag[i] = d.bag && d.bag[i] || null;
  for (const k in eq) eq[k] = d.eq && d.eq[k] || null;
  cur = d.cur === 'w2' && eq.w2 ? 'w2' : 'w1';
  if (d.pot){ POT.hp = d.pot.hp | 0; POT.mp = d.pot.mp | 0; }
  if (d.qs) for (let i = 0; i < 5; i++) QS[i] = d.qs[i] && A.skicon[d.qs[i]] ? d.qs[i] : null;
  let mx = 0; for (const it of [...bag, ...Object.values(eq)]) if (it && it.id > mx) mx = it.id; seq = mx + 1;
  const P = G.P; P.name = d.name || P.name || '루크레아'; P.lv = d.lv || 1; P.exp = d.exp || 0; P.statPts = d.statPts | 0; P.skillPts = d.skillPts | 0; P.lifeSkills = Object.assign({}, P.lifeSkills || {}, d.lifeSkills || {}); P.passives = Object.assign({ magicGuide: 0 }, P.passives || {}, d.passives || {}); if (G.syncLifeUnlocks) G.syncLifeUnlocks(true); G.setGold(d.gold | 0);
  if (window.TRADE) TRADE.loadData(d.trade);
  return d;
}
const saved = loadGame();
syncHud(); syncPot();
if (saved){ G.P.hp = Math.max(1, Math.min(G.P.maxHp, saved.hp || G.P.maxHp)); G.P.mp = Math.min(G.P.maxMp, saved.mp || 0); G.setMax(G.P.maxHp, G.P.maxMp); G.say('이어서 합니다. 금화 ' + G.P.gold + '닢 그대로!'); }
setInterval(saveGame, 4000);
addEventListener('pagehide', saveGame); document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.UI.save = saveGame;
window.UI.reset = () => { try { localStorage.removeItem(SKEY); } catch (e) {} location.reload(); };
})();
