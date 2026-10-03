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
const WBASE = { sword: 4, spear: 5, gauntlet: 3, bow: 4, staff: 5 };

// ---- 아이템 ----
let seq = 1;
function make(spec){
  // spec: { kind:'weapon', wt:'sword', g:1|2 } | { kind:'head'|'body'|'hands'|'feet', g } | { kind:'ring'|'neck', g }
  const it = { id: seq++, kind: spec.kind, rar: spec.rar || 0, g: spec.g || 1, st: {} };
  const gn = it.g === 1 ? '나무' : '낡은';
  if (spec.kind === 'weapon'){
    it.wt = spec.wt; it.icon = `${spec.wt}_${String(it.g).padStart(2, '0')}`;
    it.name = (it.g === 1 ? '나무 ' : '낡은 ') + WN[spec.wt];
    it.st[spec.wt === 'staff' ? 'matk' : 'atk'] = Math.round(WBASE[spec.wt] * (it.g === 1 ? 1 : 1.6));
  } else if (spec.kind === 'ring' || spec.kind === 'neck'){
    it.icon = spec.kind; it.name = spec.kind === 'ring' ? '구리 반지' : '구리 목걸이';
    if (spec.kind === 'ring') it.st.luck = 1; else { it.st.hp = 3; it.st.mp = 2; }
  } else {
    const r = { head: 0, body: 1, hands: 2, feet: 3 }[spec.kind];
    it.icon = 'armor_' + r; it.name = '낡은 ' + { head: '투구', body: '갑옷', hands: '장갑', feet: '신발' }[spec.kind];
    it.st.def = [2, 4, 1, 1][r]; if (spec.kind === 'body') it.st.hp = 4;
  }
  it.price = spec.price || 10;
  return it;
}
const STN = { atk: '공격력', matk: '마법 공격력', def: '방어력', hp: '최대 체력', mp: '최대 마나', luck: '운' };
const slotOk = (it, s) => it.kind === 'weapon' ? (s === 'w1' || s === 'w2') : it.kind === 'ring' ? (s === 'ring1' || s === 'ring2') : it.kind === s;

const BAG = 42, bag = new Array(BAG).fill(null);
const eq = { w1: null, w2: null, head: null, body: null, hands: null, feet: null, neck: null, ring1: null, ring2: null };
let cur = 'w1';                    // 지금 든 무기 칸
eq.w1 = make({ kind: 'weapon', wt: 'bow', g: 1 });

const BASE = { str: 5, vit: 5, int: 5, mag: 6, dex: 8, luck: 3 };
function totals(){
  const t = { atk: 0, matk: 0, def: 0, hp: 0, mp: 0, luck: 0 };
  for (const s in eq){
    const it = eq[s]; if (!it) continue;
    if ((s === 'w1' || s === 'w2') && s !== cur) continue;   // 들고 있는 무기만 계산
    for (const k in it.st) t[k] = (t[k] || 0) + it.st[k];
  }
  return t;
}
function derived(){
  const t = totals(), b = BASE;
  return {
    maxHp: 20 + b.vit * 4 + t.hp, maxMp: 10 + b.mag * 3 + t.mp,
    rows: [['힘', b.str, `공격력 ${t.atk + Math.floor(b.str / 2)}`], ['방어', t.def, '받는 피해 감소'], ['체력', b.vit, `최대 체력 ${20 + b.vit * 4 + t.hp}`],
           ['지능', b.int, `마법 공격력 ${t.matk + Math.floor(b.int / 2)}`], ['마력', b.mag, `최대 마나 ${10 + b.mag * 3 + t.mp}`],
           ['민첩', b.dex, `공격 속도 +${b.dex}%`], ['운', b.luck + t.luck, `금화 획득 +${(b.luck + t.luck) * 2}%`]],
  };
}

// ---- HUD: 큰 공격 버튼, 무기 교체, 가방 ----
const atk = $('atk'), atkIc = $('atkIc'), atkCap = $('atkCap');
function syncHud(){
  const w = eq[cur];
  atkIc.src = w ? A.icons[w.icon] : '';
  atkIc.style.visibility = w ? 'visible' : 'hidden';
  $('swapNo').textContent = cur === 'w1' ? '1' : '2';
  const d = derived();
  G.setMax(d.maxHp, d.maxMp);
}
atk.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (G.isOpen()) return;
  if (G.near()) { G.act(); return; }
  G.swing(eq[cur] ? eq[cur].wt : null);
});
$('swap').addEventListener('pointerdown', e => {
  e.preventDefault(); if (G.isOpen()) return;
  const o = cur === 'w1' ? 'w2' : 'w1';
  if (!eq[o]){ G.say('무기2 칸이 비어 있습니다'); return; }
  cur = o; syncHud(); G.say(`${eq[cur].name}(으)로 바꿔 들었습니다`);
});
$('bagBtn').addEventListener('click', () => openChar('equip'));
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'i' || k === 'b'){ if ($('char').classList.contains('on')) closeChar(); else if (!G.isOpen()) openChar('equip'); }
  if (k === 'q' && !G.isOpen()) $('swap').dispatchEvent(new PointerEvent('pointerdown'));
  if (k === 'j' && !G.isOpen()) atk.dispatchEvent(new PointerEvent('pointerdown'));
});
function frame(){
  const n = G.near();
  atkCap.textContent = n ? (n.kind === 'npc' ? '말 걸기' : '살펴보기') : '';
  atk.classList.toggle('talk', !!n);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

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
    const lv = el('div', 'slv', `Lv ${Pp.lv} · 견습 모험가`); L.append(lv);
  }
  // 가방
  const R = $('bagPane'); R.innerHTML = '';
  R.style.backgroundImage = `url(${K['01']})`;
  R.append(el('div', 'btitle', '가방'));
  bag.forEach((it, i) => {
    const x = INV.x + (i % 7) * INV.px, y = INV.y + Math.floor(i / 7) * INV.py;
    R.append(slotEl(it, x, y, INV.w, INV.h, () => tapBag(i), pickSel && pickSel.from === 'bag' && pickSel.i === i));
  });
  const gl = el('div', 'bgold', `금화 ${Pp.gold}`); R.append(gl);
  const cnt = el('div', 'bcnt', `${bag.filter(Boolean).length} / ${BAG}`); R.append(cnt);
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
  make, add(it){ const i = bag.indexOf(null); if (i < 0) return false; bag[i] = it; return true; },
  bagFull: () => bag.indexOf(null) < 0, isOpen: () => $('char').classList.contains('on'), close: closeChar,
};
syncHud();
})();
