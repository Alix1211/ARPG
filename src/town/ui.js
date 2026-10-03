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

// ---- 아이템 ----
let seq = 1;
function make(spec){
  // spec: { kind:'weapon', wt:'sword', g:1|2 } | { kind:'head'|'body'|'hands'|'feet', g } | { kind:'ring'|'neck', g }
  const it = { id: seq++, kind: spec.kind, rar: spec.rar || 0, g: spec.g || 1, st: {} };
  const gn = it.g === 1 ? '나무' : '낡은';
  if (spec.kind === 'weapon'){
    it.wt = spec.wt; it.icon = `${spec.wt}_${String(it.g).padStart(2, '0')}`;
    it.name = (it.g === 1 ? '나무 ' : '낡은 ') + WN[spec.wt];
    it.st[spec.wt === 'staff' ? 'matk' : 'atk'] = Math.max(1, Math.round(10 * WMULT[spec.wt] * (it.g === 1 ? 1 : 1.6)));   // 기준 10 × 무기 배율 × 등급
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
// 시험용: 다른 무기 4종을 가방에 넣고 시작 (모션 확인용)
['sword', 'spear', 'gauntlet', 'staff'].forEach((wt, i) => { bag[i] = make({ kind: 'weapon', wt, g: 1, price: 30 }); });

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
    pane.append(el('div', 'skhead', '스킬'), el('div', 'sknote', '배운 스킬을 오른쪽 아래 빈 칸으로 끌어다 놓으세요 · 칸 밖에 놓으면 빠짐'));
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
  bagFull: () => bag.indexOf(null) < 0, isOpen: () => $('char').classList.contains('on'), close: closeChar,
};
// ---- 저장 (이 기기의 브라우저에 자동 저장: 금화·체력·레벨·가방·장비·물약·퀵슬롯) ----
const SKEY = 'arpg_save_v1';
function saveGame(){
  try {
    const P = G.P;
    localStorage.setItem(SKEY, JSON.stringify({ v: 1, t: Date.now(), gold: P.gold, hp: P.hp, mp: P.mp, lv: P.lv, exp: P.exp, bag, eq, cur, pot: POT, qs: QS }));
  } catch (e) {}
}
function loadGame(){
  let d = null; try { d = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) {}
  if (!d || d.v !== 1) return null;
  for (let i = 0; i < BAG; i++) bag[i] = d.bag && d.bag[i] || null;
  for (const k in eq) eq[k] = d.eq && d.eq[k] || null;
  cur = d.cur === 'w2' && eq.w2 ? 'w2' : 'w1';
  if (d.pot){ POT.hp = d.pot.hp | 0; POT.mp = d.pot.mp | 0; }
  if (d.qs) for (let i = 0; i < 5; i++) QS[i] = d.qs[i] && A.skicon[d.qs[i]] ? d.qs[i] : null;
  let mx = 0; for (const it of [...bag, ...Object.values(eq)]) if (it && it.id > mx) mx = it.id; seq = mx + 1;
  const P = G.P; P.lv = d.lv || 1; P.exp = d.exp || 0; G.setGold(d.gold | 0);
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
