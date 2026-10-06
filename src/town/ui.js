// ======================= 인터페이스: 전투 버튼 묶음, 가방·장비·능력치 창 =======================
(function(){
'use strict';
const $ = id => document.getElementById(id);
const G = window.GAME;            // town.js가 넘겨주는 것: P, setGold, near(), act(), closeAll(), isOpen()
const K = A.kit;                  // 키트 그림
const NUM = G.NUM || 100;         // 수치 규모(town.js). 체력·마나·공격·방어 등 고정값은 기준 단위×NUM
const RARN = ['일반', '마법', '희귀', '전설'];
const RARC = ['#e8dcc0', '#6fb4ff', '#ffd34d', '#ff8a2a'];
const RART = ['#5b4630', '#2f6fb8', '#a8780a', '#c4580a'];
const SLOTN = { w1: '무기1', w2: '무기2', head: '머리', body: '몸', hands: '장갑', feet: '신발', neck: '목걸이', ring1: '반지', ring2: '반지' };
const WN = { sword: '검', spear: '창', gauntlet: '건틀릿', bow: '활', staff: '지팡이' };
// 무기별 한 번 피해 배율(검=100% 기준). docs/weapons.md
const WMULT = { sword: 1.0, spear: 1.2, gauntlet: 0.5, bow: 0.7, staff: 1.4 };
const WINFO = { sword: '보통 0.4초 · 짧음 · 넓은 부채꼴', spear: '조금 느림 0.5초 · 김 · 두 마리 관통', gauntlet: '아주 빠름 0.22초 · 아주 짧음 · 움찔', bow: '빠름 0.35초 · 아주 멂 · 걸어도 안 느려짐', staff: '느림 0.75초 · 중간 · 맞은 자리 폭발' };

// ---- 아이템 파밍 ----
let seq = 1;
const GRADE_MUL = [1.00,1.35,1.75,2.25,2.90,3.70,4.70,6.00,7.60,9.60];
const ALL_GEAR = ['weapon','head','body','hands','feet','ring','neck'];
const UNID_MIN_AFFIXES = 3;
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
function rarityForTier(tier, rank='normal', magicBoost=1){
  tier=clamp(tier||1,1,7);
  const table=[[62,31,7,0],[56,32,12,0],[50,33,17,0],[45,34,20,1],[40,34,23,3],[35,34,26,5],[30,34,28,8]];
  const w=table[tier-1].slice();
  const shift=rank==='elite'?10:(rank==='boss'?20:0);
  const legend=tier<4?0:(rank==='boss'?5:rank==='elite'?2:0);
  const scent=(G.P.lifeSkills&&G.P.lifeSkills.moneyScent)||0, greed=(G.P.passives&&G.P.passives.greed)||0;
  const bonus=scent*1.2+greed*.6;
  if(bonus>0){const shift=Math.min(w[0]-20,bonus);w[0]-=shift;w[2]+=shift*.75;w[3]+=shift*.25;}
  w[0]-=shift;w[2]+=shift-legend;w[3]+=legend;
  if(magicBoost>1){
    const magic=w[1]+w[2]+w[3],total=w[0]+magic,target=Math.min(.95,(magic/Math.max(1,total))*magicBoost);
    if(target>0&&magic>0)w[0]=magic*(1-target)/target;
  }
  let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return i;}return 0;
}
function rollAffix(it, used){
  const pool=AFFIX.filter(a=>a.slots.includes(it.kind)&&!used.has(a.id)); if(!pool.length)return;
  const a=pool[Math.floor(Math.random()*pool.length)]; used.add(a.id);
  const tier=it.tier||1, q=.25+Math.random()*.75, scale=(tier-1)/6;
  const raw=a.lo+(a.hi-a.lo)*(scale*.55+q*(.45+.55*scale)), flat=!a.pct&&a.st!=='luck';   // 체력·마나·방어 같은 고정값은 NUM배로 더 잘게 굴린다
  const v=a.pct?Math.round(raw):Math.max(1,Math.round(flat?raw*NUM:raw));
  it.aff.push({id:a.id,k:a.k,nm:a.nm,st:a.st,v,pct:a.pct});
  it.st[a.st]=(it.st[a.st]||0)+v;
}
function finalizeName(it){
  const base=GEAR_BASE[it.baseId];if(!base)throw Error('장비 기초 이름 누락');
  it.name=gearFullName(base,it.aff);
}
function make(spec){
  const base=gearBase(spec),tier=base.tier,g=base.powerGrade,roll=!!spec.roll;
  const it={id:seq++,baseId:base.id,kind:base.kind,icon:base.icon,requiredLevel:base.requiredLevel,
    rar:spec.rar!=null?spec.rar:(roll?rarityForTier(tier,spec.rank,spec.magicBoost||1):0),tier,g,st:{},aff:[]};
  const mul=GRADE_MUL[g-1];
  if(base.kind==='weapon'){
    it.wt=base.wt;const key=base.wt==='staff'?'matk':'atk';
    it.st[key]=Math.max(1,Math.round(10*WMULT[base.wt]*mul*NUM));
  }else if(base.kind==='ring'||base.kind==='neck'){
    if(base.kind==='ring')it.st.luck=tier;else {it.st.hp=3*tier*NUM;it.st.mp=2*tier*NUM;}
  }else {
    it.style=base.style;const stats={head:[2,1,1],body:[4,4,0],hands:[1,1,0],feet:[1,2,0]}[base.kind];
    it.st.def=Math.max(1,Math.round(stats[0]*mul*NUM));
    if(stats[1])it.st.hp=Math.max(1,Math.round(stats[1]*mul*NUM));
    if(stats[2])it.st.mp=Math.max(1,Math.round(stats[2]*mul*NUM));
  }
  if(roll&&it.rar>0){
    const used=new Set(),n=it.rar===1?1:it.rar===2?2+Math.floor(Math.random()*3):4;
    while(it.aff.length<n)rollAffix(it,used);
  }
  finalizeName(it);
  if(roll&&it.aff.length>=UNID_MIN_AFFIXES){it.unid=true;it.name='미확인 '+base.name;}
  it.price=spec.price||Math.max(10,Math.round(16*mul*[1,2.2,5,12][it.rar]));return it;
}
function canEquip(it){return G.P.lv>=(it.requiredLevel||1);}
function itemStats(it){
  const st=Object.assign({},it&&it.st||{});
  if(it&&it.unid)for(const a of (it.aff||[])){
    const k=a.st,v=Number(a.v)||0;if(!k||!v)continue;
    st[k]=(st[k]||0)-v;if(Math.abs(st[k])<1e-9)delete st[k];
  }
  return st;
}
function identifyNeedRank(it){return Math.max(1,Math.min(3,(it&&it.rar)||1));}
function identifyCost(it){return Math.max(1,Math.round(((it&&it.tier)||1)*50));}
const STN = { atk:'공격력',matk:'마법 공격력',atkPct:'물리 공격',matkPct:'마법 공격',as:'공격 속도',crit:'치명타 확률',critDmg:'치명타 피해',fire:'화염마법',ice:'냉기마법',skill:'스킬 피해',def:'방어력',hp:'최대 체력',mp:'최대 마나',ms:'이동 속도',coin:'금화 획득',find:'아이템 발견',luck:'운' };
const PCTSTAT=new Set(['atkPct','matkPct','as','crit','critDmg','fire','ice','skill','ms','coin','find']);
const slotOk=(it,s)=>it.kind==='weapon'?(s==='w1'||s==='w2'):it.kind==='ring'?(s==='ring1'||s==='ring2'):it.kind===s;

const BAG_PAGE=42,BAG_MAX_PAGES=5,BAG=BAG_PAGE*BAG_MAX_PAGES,bag=new Array(BAG).fill(null);
const BAG_UPGRADE=[10000,30000,50000,100000];let bagPages=1,bagPage=0;
const bagLimit=()=>bagPages*BAG_PAGE;
function bagFreeIndex(){for(let i=0;i<bagLimit();i++)if(!bag[i])return i;return -1;}
const STASH=56,stash=new Array(STASH).fill(null);
const eq={w1:null,w2:null,head:null,body:null,hands:null,feet:null,neck:null,ring1:null,ring2:null};
let cur='w1';
// 새 성장판: 시험용 4무기는 제거. 시작 무기 하나만 들고 나머지는 직접 파밍.
eq.w1=make({kind:'weapon',wt:'bow',g:1,rar:0});

function totals(){
  const t={atk:0,matk:0,atkPct:0,matkPct:0,as:0,crit:0,critDmg:0,fire:0,ice:0,skill:0,def:0,hp:0,mp:0,ms:0,coin:0,find:0,luck:0};
  for(const s in eq){
    const it=eq[s];if(!it)continue;
    if((s==='w1'||s==='w2')&&s!==cur)continue;
    const st=itemStats(it);for(const k in st)t[k]=(t[k]||0)+st[k];
  }
  return t;
}
function derived(){
  const t=totals(),b=G.P.stats||{str:5,vit:5,int:5,mag:6,dex:8,luck:3};
  const wt=eq[cur]&&eq[cur].wt, mb=wt&&G.masteryBonus?G.masteryBonus(wt):{lv:0,dmg:0,as:0};
  const passive=G.P.passives||{}, life=G.P.lifeSkills||{};
  const phys=Math.max(1,Math.round((t.atk+b.str*.85*NUM)*(1+t.atkPct/100)*(1+mb.dmg/100)));
  let magicBase=t.matk+b.int*.85*NUM;
  if(wt&&wt!=='staff'){
    // 마법 공용: 같은 단계·지능·숙련의 일반 지팡이 기준 70% 보장.
    // 물리 공격 옵션은 변환하지 않는다. 직접 얻은 matk가 더 높으면 그대로 사용한다.
    const staffBase=10*WMULT.staff*GRADE_MUL[eq[cur].g-1]*NUM;
    magicBase=Math.max(magicBase,(staffBase+b.int*.85*NUM)*(1+mb.dmg/100)*.7);
  }
  const magic=Math.max(1,Math.round(magicBase*(1+t.matkPct/100)*(1+(wt==='staff'?mb.dmg:0)/100)));
  const maxHp=Math.round((20+b.vit*5)*NUM+t.hp), maxMp=Math.round((10+b.mag*4)*NUM+t.mp);
  const as=b.dex*.45+t.as+mb.as+(passive.rapid||0)*3;
  const crit=Math.min(65,5+b.dex*.08+t.crit+(passive.precision||0)*2);
  const critDmg=150+t.critDmg;
  const damageReduce=Math.min(65,t.def/NUM*.75+(passive.survival||0)*3);
  const manaReduce=Math.min(35,(passive.manaFlow||0)*4);
  const coin=(b.luck+t.luck)*1.5+t.coin+(passive.greed||0)*3+(life.moneyScent||0)*2;
  const find=t.find+(passive.greed||0)*5+(life.moneyScent||0)*5;
  const move=b.dex*.12+t.ms;
  return {
    t,phys,magic,maxHp,maxMp,as,crit,critDmg,damageReduce,manaReduce,coin,find,move,mastery:mb,
    fire:t.fire||0,ice:t.ice||0,skill:t.skill||0,
    rows:[
      ['str','힘',b.str,`물리 공격 ${phys}`],
      [null,'방어',t.def,`피해 감소 ${damageReduce.toFixed(1)}%`],
      ['vit','체력',b.vit,`최대 체력 ${maxHp}`],
      ['int','지능',b.int,`마법 공격 ${magic}`],
      ['mag','마력',b.mag,`최대 마나 ${maxMp}`],
      ['dex','민첩',b.dex,`공격 속도 +${as.toFixed(1)}%`],
      [null,'운',b.luck+t.luck,`골드 +${coin.toFixed(0)}% · 발견 +${find.toFixed(0)}%`]
    ]
  };
}
function combatMods(){return derived();}
function findBonus(){return derived().find;}
function coinBonus(){return derived().coin;}

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
$('me').querySelector('.ring').addEventListener('click', () => openChar('stat'));
$('me').querySelector('.ring').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChar('stat'); } });
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
const SKW = { sword: 'sword', spear: 'spear', bow: 'bow', fist: 'gauntlet' };   // 무기 스킬: 맞는 무기면 100%, 아니면 피해 60%·마나 1.5배 (막지 않음). 마법: 지팡이 기준(지팡이 +25% 보너스는 2026-10-04 제거)
const IMPLEMENTED = new Set(['holy2_shield','holy3_revive','ice3','bolt3','dark2','fire1','fire2','fire3','ice1','ice2','bolt1','bolt2','dark1','dark3','holy1_heal','sword1','sword2','sword3','spear1','spear2','spear3','bow1','bow2','bow3','fist1','fist2','fist3']);
const SKN = { holy2_shield:'성역의 방패', holy3_revive:'기적의 소생', ice3:'극야의 눈보라', bolt3:'천벌의 뇌우', dark2:'고통의 늪', fire1:'불덩이', fire2:'화염 폭풍', fire3:'운석 낙하', ice1:'빙결 보호막', ice2:'서리 돌풍', bolt1:'번개 구체', bolt2:'연쇄 벼락', dark1:'심연의 파편', dark3:'파멸의 링',
  holy1_heal:'치유', sword1:'강하게 베기', sword2:'회전 베기', sword3:'초승달 검기',
  spear1:'연속 찌르기', spear2:'투창 강타', spear3:'강하 찌르기',
  bow1:'맹독 화살', bow2:'산탄 사격', bow3:'화살 비',
  fist1:'돌진 격', fist2:'파동권', fist3:'지진 쇄' };
const SKD = { holy2_shield:'강한 피해 흡수막 5초, 4단계부터 8초. 다른 보호막과 중첩되지 않음', holy3_revive:'미리 눌러 준비하면 사망 시 제자리 소생. 체력30→100%, 마나0, 발동 후 재사용180초', ice3:'내 주변 4초 눈보라·둔화, 단계가 오르면 타수·빙결 확률 증가', bolt3:'전방으로 이어지는 낙뢰 3회, 5단계는 1초 이동불가', dark2:'가까운 적 발밑에 둔화·지속 피해 장판, 4단계부터 5초', fire1:'느리게 날아가 펑 터지는 불덩이, 화상', fire2:'내 주변을 불기둥으로 태움', fire3:'지정 지점에 운석, 불바닥이 남음(시전 중 멈춤)', ice1:'얼음막이 피해를 대신 받고 상태이상도 막음. 깨지면 주변이 얼어붙음', ice2:'전방 부채꼴 냉기, 둔화',
  bolt1:'전방 60도로 느리게 나가는 전기 구체 3개, 닿는 동안 감전', bolt2:'맞은 적에서 주변 적으로 튕기는 벼락', dark1:'발밑에서 퍼지는 좁은 전방위 어둠, 낮은 확률로 혼돈', dark3:'퍼져 나가는 어둠의 충격파(시전 중 멈춤)',
  holy1_heal:'체력을 크게 회복', sword1:'전방 강타·경직', sword2:'주변 전체 베기', sword3:'멀리 나가며 관통하는 거대 검기',
  spear1:'좁은 직선 3연속 찌르기, 마지막 타격이 강한 치명타', spear2:'창을 던져 맞은 자리에서 폭발', spear3:'지정 지점에 강하해 넓은 충격파',
  bow1:'맹독 화살 한 발, 명중 시 지속 독 피해', bow2:'부채꼴로 화살 여러 발', bow3:'넓은 구역에 화살 비, 맞은 적 둔화',
  fist1:'짧게 돌진해 쳐올리며 적의 준비동작을 끊음', fist2:'앞으로 뻗는 투기, 4랭크부터 관통', fist3:'제자리에서 3연속 원형 충격파, 둔화' };
const skillRank=id=>(G.P.skillLv&&G.P.skillLv[id])||0;
const skillLearned=id=>IMPLEMENTED.has(id)&&skillRank(id)>0;
const PASSIVE_ICON={magicGuide:'bolt2',precision:'bow2',rapid:'fist2',manaFlow:'ice2',survival:'holy2_shield',greed:'dark2'};
const LIFE_ICON={townPortal:'holy3_revive',identify:'bolt3',discount:'bow3',overcount:'sword3',enchant:'fire3',moneyScent:'dark3'};
const passiveIcon=id=>A.skicon[PASSIVE_ICON[id]]||K.ring;
const lifeIcon=id=>A.skicon[LIFE_ICON[id]]||K.ring;
const quickLearned=id=>id==='townPortal'?((G.P.lifeSkills&&G.P.lifeSkills.townPortal)||0)>0:skillLearned(id);
const quickIcon=id=>id==='townPortal'?lifeIcon('townPortal'):A.skicon[id];
const skBtns = [...document.querySelectorAll('.sk')];
const C0 = 62;
skBtns.forEach((b, i) => { b.style.left = (C0 + QPOS[i][0]) + 'px'; b.style.top = (C0 + QPOS[i][1]) + 'px'; b.hidden = false; });
$('swap').style.left = (C0 + SWAPPOS[0]) + 'px'; $('swap').style.top = (C0 + SWAPPOS[1]) + 'px';
// 물약 버튼 2개: 스킬 칸 위 (케인 지시)
const POT = { hp: 3, mp: 2 };   // 시작할 때 체력 물약 3, 마나 물약 2 — 잡화점(마르코)에서 삼
const SCR = { portal: 0, ident: 0 }, SCR_MAX = 20;   // 스크롤(포탈·감정): 한 종류당 20장까지
const potEl = { hp: $('potHp'), mp: $('potMp') };
potEl.hp.style.cssText += `left:${C0 - 26}px;top:${C0 - 172}px;background-image:url(${K.h_php})`;
potEl.mp.style.cssText += `left:${C0 + 40}px;top:${C0 - 172}px;background-image:url(${K.h_pmp})`;
function syncPot(){ for (const k of ['hp', 'mp']){ potEl[k].querySelector('b').textContent = POT[k]; potEl[k].classList.toggle('none', !POT[k]); } }
for (const k of ['hp', 'mp']) potEl[k].addEventListener('pointerdown', e => {
  e.preventDefault(); if (G.isOpen()) return;
  if (!POT[k]){ G.say(k === 'hp' ? '체력 물약이 없습니다' : '마나 물약이 없습니다'); return; }
  if (G.drink(k)){ POT[k]--; syncPot(); if (!POT[k] && window.CHATTER) CHATTER.event('nopot', 1900); }
});
syncPot();
function needWeapon(id){if(id==='townPortal')return null;const w=SKW[id.replace(/[0-9].*$/,'')];return w||null;}
// 미니맵 오른쪽 아래 버튼: 지금은 타운 포탈. 나중에 다른 스킬(버프 등)을 이 자리에 쓰려면 MM_BTN만 바꾸면 된다.
const MM_BTN = 'townPortal', mmBtn = $('mmPortal'), mmCd = $('mmPortalCd');
function syncMmBtn(){
  const r = (G.P.lifeSkills && G.P.lifeSkills.townPortal) || 0, left = (G.P.portalReadyAt || 0) - Date.now(), loc = G.locationState && G.locationState();
  mmBtn.style.backgroundImage = `url(${lifeIcon(MM_BTN)})`;
  const sc = SCR.portal, inTown = !!(loc && (loc.map === 'town' || loc.map === 'inn'));
  mmBtn.classList.toggle('off', inTown || (!(r && left <= 0) && !sc));
  mmCd.textContent = !r ? '' : left > 0 ? (left > 60000 ? Math.ceil(left / 60000) + '분' : Math.ceil(left / 1000) + '초') : '';
  $('mmPortalScr').textContent = sc ? sc : '';
}
mmBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (G.isOpen()) return; G.useTownPortal(); setTimeout(syncMmBtn, 50); });
setInterval(syncMmBtn, 500);
function syncQS(){
  skBtns.forEach((b,i)=>{
    if(QS[i]&&!quickLearned(QS[i]))QS[i]=null;
    const id=QS[i];
    b.style.backgroundImage=`url(${id?quickIcon(id):K.ring})`;
    b.dataset.glyph=id==='townPortal'?'↩':'';
    b.classList.toggle('empty',!id);
    const nw=id&&needWeapon(id),off=nw&&(!eq[cur]||eq[cur].wt!==nw);
    b.dataset.pen=id==='townPortal'?'':(off?'60%':'');
  });
}
skBtns.forEach((b, i) => b.addEventListener('pointerdown', e => {
  e.preventDefault();
  if ($('char').classList.contains('on')){ if (QS[i]) startDrag(e, QS[i], i); return; }   // 창이 열려 있으면 빼거나 옮기기
  if (G.isOpen()) return;
  const id=QS[i];if(!id||!quickLearned(id))return;
  if(id==='townPortal'){G.useTownPortal();return;}
  const nw=needWeapon(id),wt=eq[cur]?eq[cur].wt:null;
  G.cast(id,nw?(wt===nw?{dmg:1,mp:1}:{dmg:.6,mp:1.5}):{dmg:1,mp:1});
}));
(function cdLoop(){ skBtns.forEach((b, i) => { const id = QS[i]; b.querySelector('i').style.setProperty('--cd', id ? G.cdLeft(id) + 'turn' : '0turn'); }); requestAnimationFrame(cdLoop); })();
// 끌어다 놓기 (손가락·마우스 모두)
let drag=null,dragSuppressClickUntil=0;const ghost=$('ghost');
function startDrag(e,id,from){
  drag={id,from,sx:e.clientX,sy:e.clientY,moved:false};ghost.src=quickIcon(id);ghost.style.display='block';moveGhost(e);
  $('cluster').classList.add('drop');
}
function moveGhost(e){
  if(drag&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>9)drag.moved=true;
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
}
function quickDropIndex(x,y){
  let best=-1,bd=1e9;
  skBtns.forEach((b,i)=>{
    const r=b.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(x-cx,y-cy);
    const inside=x>=r.left-18&&x<=r.right+18&&y>=r.top-18&&y<=r.bottom+18;
    if(inside&&d<bd){best=i;bd=d;}
  });
  return best;
}
function dragClickSuppressed(){return Date.now()<dragSuppressClickUntil;}
addEventListener('pointermove',e=>{if(drag){if(e.cancelable)e.preventDefault();moveGhost(e);}},{passive:false});
addEventListener('pointerup',e=>{
  if(!drag)return;
  ghost.style.display='none';$('cluster').classList.remove('drop');
  const d=drag,i=quickDropIndex(e.clientX,e.clientY);
  if(i>=0){
    if(d.from!=null){const tmp=QS[i];QS[i]=d.id;QS[d.from]=tmp;}
    else{const old=QS.indexOf(d.id);if(old>=0)QS[old]=null;QS[i]=d.id;}
  }else if(d.from!=null)QS[d.from]=null;
  if(d.moved)dragSuppressClickUntil=Date.now()+350;
  drag=null;syncQS();saveGame();
});

// ---- 캐릭터 창 ----
// 키트 그림 좌표(원본 픽셀): 장비창 kit_c_02, 가방 kit_c_01, 능력치 kit_c_02b
const EQS = { head: [72, 107], w1: [72, 196], hands: [72, 287], ring1: [71, 393], neck: [337, 107], w2: [337, 196], body: [337, 286], feet: [340, 379], ring2: [339, 472] };
const EQ_OFF = [[161, 467], [249, 467]];   // 허리띠·별 칸: 지금은 안 씀
const INV = { x: 80, y: 117, px: 65.5, py: 66.8, w: 60, h: 62 };
let tab = 'equip', pickSel = null, identifyVendor = false;
const wrap = $('charWrap');
function el(t, c, txt){ const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
function fit(){
  const vw = innerWidth, vh = innerHeight, W = 458 + 12 + 608, H = 595 + 64;
  const s = Math.min(vw * 0.96 / W, vh * 0.96 / H);
  wrap.style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit);
function openChar(t){ identifyVendor=false;tab = t || tab; G.closeAll(); G.setOpen('char'); $('char').classList.add('on'); document.body.classList.add('inventory-open'); pickSel = null; render(); fit(); }
function openIdentifyVendor(){openChar('equip');identifyVendor=true;return true;}
function closeChar(){ identifyVendor=false;cancelItemDrag();document.body.classList.remove('inventory-open');$('shop').classList.remove('on');document.body.append($('shop')); $('char').classList.remove('on'); $('iinfo').classList.remove('on'); G.setOpen(null); syncHud(); }
$('charClose').addEventListener('click', closeChar);
$('char').addEventListener('click', e => { if (e.target.id === 'char') closeChar(); });
for (const b of document.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { tab = b.dataset.tab; pickSel = null; $('iinfo').classList.remove('on'); render(); });

function slotEl(it, x, y, w, h, onTap, selected){
  const s = el('button', 'slot'); s.type = 'button';
  s.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  if (it){
    const im = el('img'); im.src = A.icons[it.icon]; im.alt = it.name; s.append(im);
    s.style.setProperty('--rc', RARC[it.rar]); s.classList.add('has');
    if (it.requiredLevel && G.P && it.requiredLevel > G.P.lv){ s.classList.add('lvlock'); s.append(el('span', 'lvtag', 'Lv' + it.requiredLevel)); }
    if(it.unid)s.append(el('span','unidtag','?'));
    if(it.locked)s.append(el('span','locktag','🔒'));
  }
  if (selected) s.classList.add('sel');
  s.addEventListener('click', onTap);
  return s;
}
let skillScroll=0;   // 스킬창 스크롤 위치(스킬을 배울 때 창을 다시 그려도 유지)
function render(){
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
  const L = $('leftPane'); if(L.contains($('shop')))document.body.append($('shop'));$('shop').classList.toggle('on',tab==='shop'); L.innerHTML = '';
  const d = derived(), Pp = G.P;
  if(tab==='shop'){
    L.style.cssText='width:458px;height:595px;background:none';L.append($('shop'));$('shop').classList.add('on');
  } else if(tab==='stash'){
    L.style.cssText='width:458px;height:595px;background:none';renderStash(L);
  } else if (tab === 'equip'){
    L.style.backgroundImage = `url(${K['02']})`; L.style.width = '458px'; L.style.height = '595px';
    const fig = el('img', 'fig'); fig.src = A.elfFront; L.append(fig);
    for (const s in EQS){
      const [x, y] = EQS[s], it = eq[s];
      const b = slotEl(it, x, y, 76, 77, () => tapEq(s), pickSel && pickSel.from === 'eq' && pickSel.slot === s);
      const lab = el('span', 'slab' + (it ? ' hide' : ''), SLOTN[s]); b.append(lab);
      if ((s === 'w1' || s === 'w2') && s === cur && it) b.append(el('span', 'held', '손에 듦'));
      bindItemSlot(b,{from:'eq',slot:s});L.append(b);
    }
    for (const [x, y] of EQ_OFF){ const o = el('div', 'off'); o.style.cssText = `left:${x}px;top:${y}px;width:74px;height:78px`; L.append(o); }
  } else if(tab==='skill'){
    L.style.backgroundImage='none';L.style.width='458px';L.style.height='595px';
    const pane=el('div','skpane');L.append(pane);pane.addEventListener('scroll',()=>{skillScroll=pane.scrollTop;});pane.scrollTop=skillScroll;requestAnimationFrame(()=>{pane.scrollTop=skillScroll;});
    const skhead=el('div','skhead'+((Pp.skillPts||0)>0?' pointpulse':''),`전투 스킬 · 보유 ${Pp.skillPts||0}P`);
    pane.append(skhead,el('div','sknote','액티브와 패시브가 같은 포인트를 사용합니다. 2·3번째 스킬은 바로 앞 스킬 Lv3이 필요합니다. 배운 액티브는 퀵슬롯으로 끌어 놓을 수 있습니다.'));
    for(const [gname,ids] of SKG){
      const row=el('div','skrow');row.append(el('b','',gname));
      for(const id of ids){
        const wrap=el('div','skcwrap'),rank=skillRank(id),impl=IMPLEMENTED.has(id),pre=G.skillPrereq?G.skillPrereq(id):{id:null,ok:true},preOk=rank>0||pre.ok;
        const c=el('button','skc'+(impl&&rank>0&&preOk?'':' lock'));c.type='button';
        const preTxt=pre.id&&!preOk?` · 선행 ${SKN[pre.id]||pre.id} Lv3 필요`:'';
        c.title=SKN[id]?SKN[id]+' · '+SKD[id]+preTxt+(rank>0?'':' (아직 배우지 않음)'):'추후 구현';c.style.backgroundImage=`url(${A.skicon[id]})`;
        if(impl&&rank>0)c.addEventListener('pointerdown',e=>{e.preventDefault();startDrag(e,id,null);});
        wrap.append(c,el('span','skrank',impl?`Lv${rank}/5`:'-'));
        if(impl){const plus=el('button','growplus','+');plus.type='button';plus.disabled=Pp.skillPts<1||rank>=5||!preOk;plus.title=!preOk?`선행 스킬 ${SKN[pre.id]||pre.id} Lv3 필요`:'';plus.onclick=e=>{e.stopPropagation();G.investSkill(id);};wrap.append(plus);}
        row.append(wrap);
      }
      pane.append(row);
    }
    pane.append(el('div','sectionhead',`패시브 · 같은 스킬포인트 사용`));
    const pg=el('div','passgrid');pane.append(pg);
    for(const [key,dv] of Object.entries(G.PASSIVE_DEF||{})){
      const rank=(Pp.passives&&Pp.passives[key])||0,tile=el('div','skilltile');
      const ic=el('button','skc');ic.type='button';ic.title=dv.name;ic.style.backgroundImage=`url(${passiveIcon(key)})`;ic.tabIndex=-1;
      const plus=el('button','growplus stplus','+');plus.type='button';plus.disabled=Pp.skillPts<1||rank>=dv.max;plus.onclick=e=>{e.stopPropagation();G.investPassive(key);};
      tile.append(ic,el('b','stname',dv.name),el('small','stdesc',dv.desc),plus,el('span','strank',`Lv${rank}/${dv.max}`));pg.append(tile);
    }
    pane.append(el('div','sectionhead',`생활스킬 · 보유 ${Pp.lifePts||0}P`));
    const lg=el('div','lifegrid');pane.append(lg);
    for(const [key,dv] of Object.entries(G.LIFE_DEF||{})){
      const rank=(Pp.lifeSkills&&Pp.lifeSkills[key])||0,locked=Pp.lv<dv.unlock,tile=el('div','skilltile'+(locked?' lock':''));
      const ic=el('button','skc life'+(key==='townPortal'&&!locked&&rank>0?' drag':''));ic.type='button';ic.style.backgroundImage=`url(${lifeIcon(key)})`;ic.title=key==='townPortal'&&!locked&&rank>0?'길게 눌러 퀵슬롯에 등록 / 탭하여 사용':dv.name;
      if(key==='townPortal'&&!locked&&rank>0){
        let moved=false,sx=0,sy=0;
        ic.addEventListener('pointerdown',e=>{e.preventDefault();sx=e.clientX;sy=e.clientY;moved=false;startDrag(e,'townPortal',null);});
        ic.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>10)moved=true;});
        ic.addEventListener('click',e=>{if(moved||dragClickSuppressed())return;e.preventDefault();closeChar();G.useTownPortal();});
      }
      const desc=locked?`Lv${dv.unlock} 해금`:(dv.desc[Math.max(0,rank-1)]||dv.desc[dv.desc.length-1]);
      const plus=el('button','growplus stplus','+');plus.type='button';plus.disabled=locked||rank<1||rank>=dv.max||Pp.lifePts<1;plus.onclick=e=>{e.stopPropagation();G.investLife(key);};
      tile.append(ic,el('b','stname',dv.name),el('small','stdesc',desc),plus,el('span','strank',locked?`Lv${dv.unlock}`:`Lv${rank}/${dv.max}`));lg.append(tile);
    }
    pane.append(el('div','sectionhead','무기 숙련도 · 적중할 때 자동 상승'));
    for(const wt of ['sword','spear','gauntlet','bow','staff']){
      const m=Pp.mastery[wt],need=G.masteryNeed(m.lv),row=el('div','masterrow');
      row.append(el('b','',WN[wt]),el('span','',`Lv${m.lv}/50`),el('small','',`${m.xp}/${need} · 피해 +${(m.lv*.5).toFixed(1)}% · 공속 +${(m.lv*.15).toFixed(1)}%`),el('span','',''));
      pane.append(row);
    }
  } else if (tab === 'trade' && window.TRADE){
    TRADE.renderSummary(L);
  } else {
    L.style.backgroundImage = `url(${K['02b']})`; L.style.width = '381px'; L.style.height = '610px';
    const face = el('img', 'sface'); face.src = A.face; L.append(face);
    const expMax=Pp.lv>=70?1:G.expNeed(Pp.lv),bars=[[Pp.hp,d.maxHp,106],[Pp.mp,d.maxMp,141],[Pp.lv>=70?1:Pp.exp,expMax,176]];
    bars.forEach(([v,m,y],i)=>{const t=el('div','sbar');t.style.top=(y-1)+'px';const f=el('i','b'+i);f.style.width=Math.max(0,Math.min(100,v/m*100))+'%';t.append(f);t.append(el('span','',i===2?(Pp.lv>=70?'MAX LEVEL':`경험치 ${v} / ${m}`):`${v} / ${m}`));L.append(t);});
    d.rows.forEach(([key,n,v,sub],i)=>{const r=el('div','srow');r.style.top=(232+i*47.7)+'px';r.append(el('b','',n),el('em','',v),el('small','',sub));if(key){const plus=el('button','statplus','+');plus.type='button';plus.disabled=(Pp.statPts||0)<1;plus.onclick=()=>G.investStat(key);r.append(plus);}L.append(r);});
    const lv=el('div','slv');lv.append(document.createTextNode(`${Pp.name||'루크레아'} · Lv${Pp.lv} · T${G.levelTier(Pp.lv)} · `));
    lv.append(el('span',(Pp.statPts||0)>0?'pointpulse':'',`능력 ${Pp.statPts||0}P`),document.createTextNode(' · '),el('span',(Pp.skillPts||0)>0?'pointpulse':'',`스킬 ${Pp.skillPts||0}P`),document.createTextNode(` · 생활 ${Pp.lifePts||0}P`));L.append(lv);
  }
  $('tabSt').classList.toggle('pointpulse',(Pp.statPts||0)>0);
  $('tabSk').classList.toggle('pointpulse',(Pp.skillPts||0)>0);
  // 오른쪽: 일반 가방 / 무역품 화물칸
  const R = $('bagPane'); R.innerHTML = '';
  if (tab === 'trade' && window.TRADE){
    TRADE.renderCargo(R);
  } else {
    R.style.backgroundImage = `url(${K['01']})`;
    {const t=el('div', 'btitle', '가방');if(SCR.portal||SCR.ident){const s=el('span','',`  · 포탈 스크롤 ${SCR.portal} · 감정 스크롤 ${SCR.ident}`);s.style.cssText='font-size:12px;font-weight:700;color:#e3d2a8';t.append(s);}R.append(t);}
    bagPage=Math.max(0,Math.min(bagPages-1,bagPage));const start=bagPage*BAG_PAGE;
    for(let j=0;j<BAG_PAGE;j++){const i=start+j,it=bag[i];
      const x=INV.x+(j%7)*INV.px,y=INV.y+Math.floor(j/7)*INV.py;
      const cell=slotEl(it,x,y,INV.w,INV.h,()=>tapBag(i),pickSel&&pickSel.from==='bag'&&pickSel.i===i);bindItemSlot(cell,{from:'bag',i});
      if(tab==='shop'&&it){const price=el('small','slotprice',it.locked?'잠금':__SHOP.price(it)+(__SHOP.rate(it)>1.05?'▲':__SHOP.rate(it)<.95?'▼':''));cell.append(price);}R.append(cell);
    }
    const gl = el('div', 'bgold', `금화 ${Pp.gold}`); R.append(gl);
    const cnt = el('div', 'bcnt', `${bag.slice(0,bagLimit()).filter(Boolean).length} / ${bagLimit()}`); R.append(cnt);R.append(bagPageDots(),sortButtons('bag'));
  }
}
function tapBag(i){
  if(tab==='shop'&&bag[i]){pickSel={from:'bag',i};render();__SHOP.selectBag(i);return;}
  if(tab==='stash'&&bag[i]){stashInfo('bag',i);return;}
  if (!bag[i]){ pickSel = null; $('iinfo').classList.remove('on'); render(); return; }
  pickSel = { from: 'bag', i }; render(); showInfo(bag[i], 'bag');
}
function tapEq(s){
  if (!eq[s]){ pickSel = null; $('iinfo').classList.remove('on'); render(); return; }
  pickSel = { from: 'eq', slot: s }; render(); showInfo(eq[s], 'eq');
}
function r2(x){ return Math.round(x * 100) / 100; }
// 새 장비(it)와 낀 장비(o)의 수치를 한 줄씩. 숫자는 낀 장비 값, ▲▼는 "새 장비가 이만큼 더 좋다/나쁘다"
function cmpLine(o, it){
  const out = [],os=o?itemStats(o):{},ns=it?itemStats(it):{};
  const keys = new Set([...Object.keys(os), ...Object.keys(ns)]);
  for (const k of keys){
    const a = o ? (os[k] || 0) : 0, b = it ? (ns[k] || 0) : 0;
    const li = el('li', '', `${STN[k]} ${a}`);
    if (it && o !== it && a !== b){ const d = r2(Math.abs(b - a)); li.append(el('span', b > a ? 'up' : 'dn', b > a ? ` ▲${d}` : ` ▼${d}`)); }
    out.push(li);
  }
  return out;
}
const CMPN = { w1: '무기1', w2: '무기2', ring1: '왼손 반지', ring2: '오른손 반지' };
// 가방 장비를 고르면 정보창 왼쪽에 "지금 낀 장비" 카드를 붙인다. 무기·반지는 두 장, 나머지는 한 장.
function cmpCards(it){
  const slots = it.kind === 'weapon' ? ['w1', 'w2'] : it.kind === 'ring' ? ['ring1', 'ring2'] : [it.kind];
  const box = el('div', 'icmp');
  for (const s of slots){
    const o = eq[s], c = el('div', 'ccard'), held = (s === 'w1' || s === 'w2') && s === cur && !!o;
    c.append(el('div', 'ctag' + (held ? ' held' : ''), (CMPN[s] || SLOTN[s]) + (held ? ' · 손에 듦' : '')));
    if (o){
      const nm = el('div', 'cname', o.name); nm.style.color = RART[o.rar]; c.append(nm);
      if (o.kind === 'weapon') c.append(el('div', 'isub', WN[o.wt]));
    } else c.append(el('div', 'cempty', '비어 있음'));
    const ul = el('ul', 'ist'); cmpLine(o, it).forEach(li => ul.append(li)); c.append(ul);
    box.append(c);
  }
  box.append(el('div', 'cnote', '▲▼ = 새 장비 기준 차이'));
  return box;
}
function targetSlot(it){
  if (it.kind === 'weapon') return eq.w1 ? (eq.w2 ? cur : 'w2') : 'w1';
  if (it.kind === 'ring') return eq.ring1 ? (eq.ring2 ? 'ring1' : 'ring2') : 'ring1';
  return it.kind;
}
function identifyItem(it,via='self'){
  if(!it||!it.unid)return false;
  if(via==='vendor'){
    const inInn=window.__INN&&__INN.state&&__INN.state().map==='inn';
    if(!identifyVendor||!inInn){G.say('여관 감정사를 이용해 주세요.');return false;}
    const cost=identifyCost(it);if(G.P.gold<cost){G.say('금화가 부족합니다.');return false;}G.setGold(G.P.gold-cost);
  }else if(via==='scroll'){
    if(!(SCR.ident>0)){G.say('감정 스크롤이 없습니다.');return false;}
    SCR.ident--;G.say(['감정 스크롤… 100골드가 연기가 됐네!','아까워라… 그래도 궁금하니까!'][Math.random()<.5?0:1]);
  }else{
    const need=identifyNeedRank(it),rank=(G.P.lifeSkills&&G.P.lifeSkills.identify)||0;
    if(rank<need){G.say('감정 랭크가 부족합니다. 여관 감정사를 이용해 주세요.');return false;}
  }
  it.unid=false;finalizeName(it);syncHud();render();
  if(pickSel)showInfo(it,pickSel.from==='eq'?'eq':'bag');
  saveGame();return true;
}
function showInfo(it, from){
  const I = $('iinfo'); I.innerHTML = '';
  const nm = el('div', 'iname', it.name); nm.style.color = RART[it.rar]; I.append(nm);
  I.append(el('div', 'isub', `${RARN[it.rar]} · ${it.kind === 'weapon' ? WN[it.wt] : SLOTN[targetSlot(it)]}`));
  I.append(el('div','isub',`T${it.tier} · 착용 Lv${it.requiredLevel||1}`));
  if (it.kind === 'weapon') I.append(el('div', 'isub', WINFO[it.wt]));
  const ic = el('img', 'iic'); ic.src = A.icons[it.icon]; I.append(ic);
  const ul = el('ul', 'ist');
  cmpLine(it, null).forEach(li => ul.append(li));
  if(it.unid)for(let i=0;i<(it.aff||[]).length;i++)ul.append(el('li','unidline','???'));
  I.append(ul);
  if (from === 'bag') I.append(cmpCards(it));
  const row = el('div', 'ibtns');
  if(it.unid){
    const need=identifyNeedRank(it),rank=(G.P.lifeSkills&&G.P.lifeSkills.identify)||0;
    if(identifyVendor){const b=el('button','btn',`감정사 감정 (${identifyCost(it)}G)`);b.type='button';b.onclick=()=>identifyItem(it,'vendor');row.append(b);}
    if(SCR.ident>0){const b=el('button','btn',`감정 스크롤 (보유 ${SCR.ident})`);b.type='button';b.onclick=()=>identifyItem(it,'scroll');row.append(b);}
    if(rank>=need){const b=el('button','btn','자가 감정');b.type='button';b.onclick=()=>identifyItem(it,'self');row.append(b);}
    else I.append(el('div','isub','자가 감정 랭크 부족 · 여관 감정사를 이용하세요.'));
  }
  if (from === 'bag'){
    if (it.kind === 'weapon'){
      for (const s of ['w1', 'w2']){ const b = el('button', 'btn', `${SLOTN[s]}에 장착`); b.type = 'button'; b.disabled=!canEquip(it); b.onclick = () => equip(it, s); row.append(b); }
    } else if (it.kind === 'ring'){
      for (const s of ['ring1', 'ring2']){ const b = el('button', 'btn', s === 'ring1' ? '왼손 반지' : '오른손 반지'); b.type = 'button'; b.disabled=!canEquip(it); b.onclick = () => equip(it, s); row.append(b); }
    } else { const b = el('button', 'btn', '장착'); b.type = 'button'; b.disabled=!canEquip(it); b.onclick = () => equip(it, it.kind); row.append(b); }
    const d = el('button', 'btn ghost', it.locked?'잠금 해제 후 버리기':'버리기'); d.type = 'button';d.disabled=!!it.locked;
    d.onclick = () => { if(it.locked)return; if (d.dataset.ok){ bag[pickSel.i] = null; pickSel = null; I.classList.remove('on'); render();saveGame(); } else { d.dataset.ok = 1; d.textContent = '정말 버리기'; } };
    row.append(d);
  } else {
    const b = el('button', 'btn', '벗기'); b.type = 'button'; b.onclick = () => unequip(pickSel.slot); row.append(b);
  }
  I.append(row);
  I.classList.add('on');
}
function equip(it, s){
  if(!slotOk(it,s)||!canEquip(it)){G.say('착용 레벨이 부족합니다. Lv'+it.requiredLevel+'부터 착용할 수 있습니다.');return false;}
  const i = bag.indexOf(it); if (i < 0) return;
  bag[i] = eq[s]; eq[s] = it;
  if ((s === 'w1' || s === 'w2') && !eq[cur]) cur = s;
  pickSel = { from: 'eq', slot: s }; tab = 'equip'; render(); showInfo(it, 'eq'); syncHud();saveGame();
}
function unequip(s){
  const i = bag.indexOf(null); if (i < 0){ G.say('가방이 가득 찼습니다'); return; }
  bag[i] = eq[s]; eq[s] = null;
  if (s === cur && !eq[cur]){ const o = s === 'w1' ? 'w2' : 'w1'; if (eq[o]) cur = o; }
  pickSel = { from: 'bag', i }; render(); showInfo(bag[i], 'bag'); syncHud();saveGame();
}

// 가방·상점·창고는 같은 Pointer Events 이동 규칙을 사용합니다.
let itemDrag=null,itemClickUntil=0;
const kindOrder=it=>{const list=it.kind==='weapon'?['sword','spear','gauntlet','bow','staff']:['head','body','hands','feet','ring','neck','material','potion','junk'],i=list.indexOf(it.kind==='weapon'?it.wt:it.kind);return i<0?99:(it.kind==='weapon'?i:5+i);};
function sortInventory(where,by){
  const a=where==='stash'?stash:bag,n=where==='stash'?a.length:bagLimit();
  const tier=(x,y)=>(y.tier||1)-(x.tier||1)||(y.rar||0)-(x.rar||0)||kindOrder(x)-kindOrder(y);
  const cmp=by==='price'?(x,y)=>__SHOP.baseValue(y)-__SHOP.baseValue(x):by==='kind'?(x,y)=>kindOrder(x)-kindOrder(y)||tier(x,y):tier;
  const filled=a.slice(0,n).filter(Boolean).map((it,i)=>({it,i})).sort((x,y)=>cmp(x.it,y.it)||x.i-y.i).map(x=>x.it);
  a.splice(0,n,...filled,...Array(n-filled.length).fill(null));pickSel=null;$('iinfo').classList.remove('on');if(tab==='shop')__SHOP.clearSelection();render();saveGame();
}
function sortButtons(where){
  const bar=el('div','inventorySort');for(const [key,label] of [['tier','티어'],['price','가격'],['kind','종류']]){const b=el('button','btn',label);b.type='button';b.dataset.sort=key;b.onclick=()=>sortInventory(where,key);bar.append(b);}return bar;
}
function bagPageDots(){const bar=el('div','bagPages');for(let i=0;i<bagPages;i++){const b=el('button','bagDot');b.type='button';b.classList.toggle('on',i===bagPage);b.setAttribute('aria-label','가방 '+(i+1)+'페이지');b.onclick=()=>{bagPage=i;pickSel=null;$('iinfo').classList.remove('on');render();};bar.append(b);}return bar;}
let bagSwipe=null;const bagPaneEl=$('bagPane');
bagPaneEl.addEventListener('pointerdown',e=>{if(!$('char').classList.contains('on')||bagPages<2)return;bagSwipe={x:e.clientX,y:e.clientY};});
bagPaneEl.addEventListener('pointerup',e=>{if(!bagSwipe)return;const dx=e.clientX-bagSwipe.x,dy=e.clientY-bagSwipe.y;bagSwipe=null;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4){cancelItemDrag();itemClickUntil=performance.now()+450;bagPage=Math.max(0,Math.min(bagPages-1,bagPage+(dx<0?1:-1)));pickSel=null;$('iinfo').classList.remove('on');render();e.preventDefault();}});

function inventoryItem(ref){return ref.from==='eq'?eq[ref.slot]:ref.from==='goods'?ref.it:(ref.from==='stash'?stash:bag)[ref.i];}
function inventoryDrop(source,target){
  if(!source||!target)return false;const it=inventoryItem(source);if(!it)return false;
  if(source.from==='goods')return target.from==='bag'&&__SHOP.buyAt(source.it,target.i);
  if(target.from==='merchant'||target.from==='goods'){if(source.from==='bag'&&it.locked){G.say('잠긴 아이템입니다.');return false;}return source.from==='bag'&&__SHOP.sellAt(source.i);}
  if(source.from==='eq'){
    if(target.from!=='bag'||!eq[source.slot])return false;
    const other=bag[target.i];if(other&&(!slotOk(other,source.slot)||!canEquip(other)))return false;
    bag[target.i]=it;eq[source.slot]=other;
  }else if(target.from==='eq'){
    if(source.from!=='bag'||!slotOk(it,target.slot)||!canEquip(it)){G.say('이 칸에 착용할 수 없거나 착용 레벨이 부족합니다.');return false;}
    bag[source.i]=eq[target.slot];eq[target.slot]=it;
  }else{
    if(!['bag','stash'].includes(source.from)||!['bag','stash'].includes(target.from))return false;
    if((source.from==='stash'||target.from==='stash')&&tab!=='stash')return false;
    const a=source.from==='stash'?stash:bag,b=target.from==='stash'?stash:bag;
    if(target.i<0||target.i>=b.length)return false;
    [a[source.i],b[target.i]]=[b[target.i],a[source.i]];
  }
  if(!eq[cur])cur=eq.w1?'w1':eq.w2?'w2':'w1';pickSel=null;$('iinfo').classList.remove('on');render();syncHud();saveGame();return true;
}
function cancelItemDrag(){if(!itemDrag)return;if(itemDrag.holdTimer)clearTimeout(itemDrag.holdTimer);itemDrag.node.classList.remove('dragging');if(itemDrag.ghost)itemDrag.ghost.remove();itemDrag=null;}
function bindItemSlot(node,ref){
  node.dataset.inventory=ref.from;if(ref.i!=null)node.dataset.index=ref.i;if(ref.slot)node.dataset.eq=ref.slot;node._inventoryRef=ref;
  node.addEventListener('click',e=>{if(performance.now()<itemClickUntil){e.stopImmediatePropagation();e.preventDefault();}},true);
  node.addEventListener('pointerdown',e=>{
    if(e.button!==0||!inventoryItem(ref))return;cancelItemDrag();itemDrag={ref,node,pid:e.pointerId,x:e.clientX,y:e.clientY,t:performance.now(),moved:false,long:false};node.setPointerCapture(e.pointerId);
    if(ref.from==='bag')itemDrag.holdTimer=setTimeout(()=>{const d=itemDrag,it=d&&inventoryItem(d.ref);if(!d||d.ref!==ref||d.moved||!it)return;it.locked=!it.locked;d.long=true;itemClickUntil=performance.now()+550;G.say(it.locked?'아이템을 잠갔습니다.':'아이템 잠금을 풀었습니다.');saveGame();},550);
  });
}
addEventListener('pointermove',e=>{
  const d=itemDrag;if(!d||e.pointerId!==d.pid)return;const dist=Math.hypot(e.clientX-d.x,e.clientY-d.y);
  if(!d.moved&&(dist>=8||(performance.now()-d.t>=200&&dist>=2))){d.moved=true;if(d.holdTimer){clearTimeout(d.holdTimer);d.holdTimer=0;}d.node.classList.add('dragging');const im=el('img','itemGhost');const it=inventoryItem(d.ref);im.src=A.icons[it.icon||it.ic];d.ghost=im;document.body.append(im);$('iinfo').classList.remove('on');}
  if(d.moved){e.preventDefault();d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';}
},{passive:false});
addEventListener('pointerup',e=>{
  const d=itemDrag;if(!d||e.pointerId!==d.pid)return;
  if(d.long){cancelItemDrag();render();return;}
  if(d.moved){const at=document.elementFromPoint(e.clientX,e.clientY),cell=at&&at.closest('[data-inventory]');const target=cell?cell._inventoryRef:at&&at.closest('#shop')?{from:'merchant'}:null;itemClickUntil=performance.now()+500;cancelItemDrag();inventoryDrop(d.ref,target);}else{const ref=d.ref;cancelItemDrag();dblTap(ref);}
});
// 더블클릭(모바일은 두 번 탭): 상점에선 사기·팔기, 창고에선 넣기·빼기, 평소엔 장비 착용·해제
let lastTap=null;
function dblTap(ref){
  const now=performance.now(),cur0=inventoryItem(ref),key=ref.from+':'+(ref.i!=null?ref.i:ref.slot||'')+':'+(cur0?cur0.id:'');
  if(lastTap&&lastTap.key===key&&now-lastTap.t<380){lastTap=null;quickMove(ref);return;}
  lastTap={key,t:now};
}
function quickMove(ref){
  const it=inventoryItem(ref);if(!it)return;
  const toBag=()=>{const i=bagFreeIndex();if(i<0){G.say('가방이 가득 찼습니다.');return;}inventoryDrop(ref,{from:'bag',i});};
  if(ref.from==='goods'||ref.from==='stash'||ref.from==='eq'){toBag();return;}
  if(ref.from!=='bag')return;
  if(tab==='shop'){inventoryDrop(ref,{from:'merchant'});return;}
  if(tab==='stash'){const i=stash.indexOf(null);if(i<0){G.say('창고가 가득 찼습니다.');return;}inventoryDrop(ref,{from:'stash',i});return;}
  const slots=(it.kind==='weapon'?['w1','w2']:it.kind==='ring'?['ring1','ring2']:[it.kind]).filter(s=>s in eq);
  if(!slots.length)return;
  inventoryDrop(ref,{from:'eq',slot:slots.find(s=>!eq[s])||(slots.includes(cur)?cur:slots[0])});
}
addEventListener('pointercancel',cancelItemDrag);addEventListener('blur',cancelItemDrag);
function openStash(){
  const loc=G.locationState();if(!loc||!['town','village'].includes(loc.map)){G.say('창고는 마을에서만 이용할 수 있습니다.');return false;}openChar('stash');return true;
}
function renderStash(L){
  const frame=el('div','stashFrame');frame.append(el('h2','','개인 창고'),el('small','',`${stash.filter(Boolean).length} / ${STASH} · 이용료 없음`));
  const grid=el('div','stashGrid');stash.forEach((it,i)=>{const b=slotEl(it,0,0,46,46,()=>stashInfo('stash',i),false);b.style.cssText='position:relative;width:100%;height:100%';bindItemSlot(b,{from:'stash',i});grid.append(b);});frame.append(grid,sortButtons('stash'));L.append(frame);
}
function stashInfo(from,i){
  const a=from==='stash'?stash:bag,it=a[i];if(!it)return;pickSel={from,i};const I=$('iinfo');I.innerHTML='';I.append(el('div','iname',it.name),el('div','isub',`T${it.tier||1} · ${RARN[it.rar||0]}`));const b=el('button','btn',from==='bag'?'창고에 넣기':'가방으로 꺼내기');b.type='button';b.onclick=()=>{const to=from==='bag'?'stash':'bag',idx=to==='stash'?stash.indexOf(null):bagFreeIndex();if(idx<0){G.say(to==='stash'?'창고가 가득 찼습니다.':'가방이 가득 찼습니다.');return;}inventoryDrop({from,i},{from:to,i:idx});};I.append(b);I.classList.add('on');
}

window.UI = {
  addPotion(k,n){POT[k]+=n;syncPot();},potions:()=>({hp:POT.hp,mp:POT.mp}),
  addScroll(k,n){const had=SCR[k]|0;SCR[k]=Math.min(SCR_MAX,had+n);syncMmBtn();if($('char').classList.contains('on'))render();return SCR[k]-had;},
  scrolls:()=>({portal:SCR.portal,ident:SCR.ident}),scrollMax:SCR_MAX,
  useScroll(k){if(!(SCR[k]>0))return false;SCR[k]--;syncMmBtn();if($('char').classList.contains('on'))render();saveGame();return true;},
  make,canEquip,equip,itemStats,identify:identifyItem,identifyCost,openIdentifyVendor,identifyVendorOpen:()=>identifyVendor,UNID_MIN_AFFIXES,inventoryDrop,sortInventory,openStash,stashOpen:()=>tab==='stash'&&$('char').classList.contains('on'),stashItems:()=>stash.map((it,i)=>it?{i,it}:null).filter(Boolean),
  merchant(){openChar('shop');},bindItemSlot,addAt(it,i){if(i<0||i>=bagLimit()||bag[i])return false;bag[i]=it;return true;},add(it){const i=bagFreeIndex();if(i<0)return false;bag[i]=it;return true;},
  bagPages:()=>bagPages,bagPage:()=>bagPage,bagUpgradePrice:()=>BAG_UPGRADE[bagPages-1]||0,expandBag(){if(bagPages>=BAG_MAX_PAGES)return false;bagPages++;bagPage=bagPages-1;render();saveGame();return true;},
  combatMods,findBonus,coinBonus,skillRank,currentWeapon:()=>eq[cur],
  quickSlots:()=>QS.slice(),assignQuick(i,id){if(i<0||i>=5||!quickLearned(id))return false;const old=QS.indexOf(id);if(old>=0)QS[old]=null;QS[i]=id;syncQS();saveGame();return true;},
  dragDebug:()=>drag?{id:drag.id,from:drag.from,moved:drag.moved}:null,quickDropIndex,
  refresh(){syncHud();if($('char').classList.contains('on'))render();},
  bagFull:()=>bagFreeIndex()<0,
  bagItems:()=>bag.slice(0,bagLimit()).map((it,i)=>it?{i,it}:null).filter(Boolean),
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
const SKEY='arpg_save_v3';
try{localStorage.removeItem('arpg_save_v1');localStorage.removeItem('arpg_save_v2');}catch(e){}
let RESETTING=false;
function saveGame(){
  if(RESETTING||window.ARPG_BACKUP_RESTORING||window.ARPG_SYNC_CHECKING)return;
  try{
    const P=G.P;
    localStorage.setItem(SKEY,JSON.stringify({v:3,gearSchema:TIER_MATCH.schema,t:Date.now(),name:P.name,stats:P.stats,mastery:P.mastery,skillLv:P.skillLv,passives:P.passives,lifeSkills:P.lifeSkills,
      statPts:P.statPts,skillPts:P.skillPts,lifePts:P.lifePts,portalReadyAt:P.portalReadyAt,reviveReadyAt:P.reviveReadyAt,reviveArmed:!!P.reviveArmed,reviveRank:P.reviveRank,gold:P.gold,hp:P.hp,mp:P.mp,lv:P.lv,exp:P.exp,bag,bagPages,bagPage,stash,eq,cur,pot:POT,scr:SCR,qs:QS,
      location:G.locationState?G.locationState():null,lastVisitedTown:G.lastVisitedTown?G.lastVisitedTown():null,
      telemetry:window.TELEMETRY?TELEMETRY.saveData():null,companion:window.COMPANION?COMPANION.saveData():null,
      trade:window.TRADE?TRADE.saveData():null,guild:window.GUILD?GUILD.saveData():null,quests:window.QUEST?QUEST.saveData():null}));
  }catch(e){}
}
function loadGame(){
  let d=null;try{d=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(e){}
  if(!d||d.v!==3)return null;
  bagPages=Math.max(1,Math.min(BAG_MAX_PAGES,d.bagPages|0||1));bagPage=Math.max(0,Math.min(bagPages-1,d.bagPage|0));
  for(let i=0;i<BAG;i++)bag[i]=d.bag&&d.bag[i]||null;
  for(let i=0;i<STASH;i++)stash[i]=d.stash&&d.stash[i]||null;
  for(const k in eq)eq[k]=d.eq&&d.eq[k]||null;
  cur=d.cur==='w2'&&eq.w2?'w2':'w1';
  if(d.pot){POT.hp=d.pot.hp|0;POT.mp=d.pot.mp|0;}
  if(d.scr){SCR.portal=Math.max(0,Math.min(SCR_MAX,d.scr.portal|0));SCR.ident=Math.max(0,Math.min(SCR_MAX,d.scr.ident|0));}
  if(d.qs)for(let i=0;i<5;i++)QS[i]=d.qs[i]&&(d.qs[i]==='townPortal'||A.skicon[d.qs[i]])?d.qs[i]:null;
  // unid 필드가 없는 이전 저장 장비는 falsy이므로 모두 감정 완료로 취급한다.
  let mx=0;for(const it of [...bag,...stash,...Object.values(eq)])if(it&&it.id>mx)mx=it.id;seq=mx+1;
  const P=G.P;P.name=d.name||P.name||'루크레아';P.lv=d.lv||1;P.exp=d.exp||0;P.statPts=d.statPts|0;P.skillPts=d.skillPts|0;P.lifePts=d.lifePts|0;
  P.stats=Object.assign({},P.stats,d.stats||{});P.mastery=Object.assign({},P.mastery,d.mastery||{});P.skillLv=Object.assign({},P.skillLv,d.skillLv||{});
  P.lifeSkills=Object.assign({},P.lifeSkills||{},d.lifeSkills||{});P.passives=Object.assign({},P.passives||{},d.passives||{});P.portalReadyAt=+d.portalReadyAt||0;P.reviveReadyAt=+d.reviveReadyAt||0;P.reviveArmed=!!d.reviveArmed;P.reviveRank=Math.max(1,Math.min(5,+d.reviveRank||1));
  if(G.syncLifeUnlocks)G.syncLifeUnlocks(true);G.setGold(d.gold|0);if(window.COMPANION)COMPANION.loadData(d.companion);if(window.TRADE)TRADE.loadData(d.trade);if(window.GUILD)GUILD.loadData(d.guild);if(window.QUEST)QUEST.loadData(d.quests);return d;
}
const saved=loadGame();
if(G.loadLastVisitedTown)G.loadLastVisitedTown(saved&&saved.lastVisitedTown||null);
if(window.TELEMETRY)TELEMETRY.loadData(saved&&saved.telemetry||null);
if(!saved&&window.TELEMETRY)TELEMETRY.enter(G.locationState());
// 테스트용: 구현된 액티브 스킬을 전부 배운 상태(1랭크)로 만든다(포인트는 건드리지 않음 — 저장 검사와 충돌). 정식 시작 전에 false로 바꿀 것.
const TEST_UNLOCK_ALL_SKILLS=false;
if(TEST_UNLOCK_ALL_SKILLS){for(const id of IMPLEMENTED)if(!((G.P.skillLv||{})[id]>0)){G.P.skillLv=G.P.skillLv||{};G.P.skillLv[id]=1;}}
syncHud();syncPot();
if(saved){
  G.P.hp=Math.max(1,Math.min(G.P.maxHp,saved.hp||G.P.maxHp));G.P.mp=Math.min(G.P.maxMp,saved.mp||0);G.setMax(G.P.maxHp,G.P.maxMp);
  Promise.resolve(G.resumeLocation?G.resumeLocation(saved.location):false).then(()=>{
    G.say('이어서 합니다. 금화 '+G.P.gold+'닢 그대로!');
  });
}
setInterval(saveGame,4000);addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
window.UI.save=saveGame;window.UI.reset=()=>{RESETTING=true;try{localStorage.removeItem(SKEY);}catch(e){}location.reload();};
// 테스트용 초기화 버튼: 두 번 눌러야 지워진다. 정식 시작 전에 false로.
const TEST_RESET_BUTTON=true;
{const b=document.getElementById('resetBtn');
 if(b&&TEST_RESET_BUTTON){b.hidden=false;let armed=false,tm=0;
  b.addEventListener('click',()=>{if(!armed){armed=true;b.textContent='정말 지울까요?';tm=setTimeout(()=>{armed=false;b.textContent='초기화';},3500);}
   else{clearTimeout(tm);window.UI.reset();}});}}
})();
