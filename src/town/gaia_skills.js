'use strict';
// 가이아 스킬: 카일·아가사·실비아 세 트리, 레벨 해금. 설계는 docs/gaia_skill_design.md.
// 이 표 한 곳만 고치면 이름·해금 레벨·배정이 바뀐다. 얼음·암흑 6종은 주인이 정해질 때까지 PARKED에 보존(코드·아이콘 그대로).
// 아이콘은 원래 스킬 것을 그대로 쓴다. 카일 신규 8종 아이콘은 GPT 그림이 오기 전까지 임시로 다른 아이콘을 빌려 쓴다.
// kind: 피해 기준(magic=마법 공격력, phys=물리), m: 동료 M 소모, r: 시전 거리, n: 최소 표적 수. special은 별도 로직.
const GAIA_TREE={
  kyle:{name:'카일',skills:[
    {id:'ky_slap',lv:1,name:'긴급매질',desc:'가장 M이 낮은 동료에게 채찍을 날려 M을 즉시 크게 채웁니다.',kyle:1,icon:'sword1'},
    {id:'ky_rush',lv:8,name:'몰아치기',desc:'방망이로 세 번 연달아 휘둘러 가까운 동료의 M을 채웁니다. 몬스터도 약하게 맞습니다.',kyle:1,icon:'sword2'},
    {id:'ky_wake',lv:14,name:'정신 차려',desc:'쓰러진 동료를 철썩! 때려 즉시 깨웁니다(체력 30%).',kyle:1,icon:'holy1_heal'},
    {id:'ky_bluff',lv:20,name:'긴급 허세',desc:'큰소리로 팀 전체의 공격력을 12초간 높입니다.',kyle:1,icon:'fire3'},
    {id:'ky_run',lv:24,name:'긴급 도망',desc:'세 명 모두 맵의 시작점으로 도망칩니다.',kyle:1,icon:'bow3'},
    {id:'ky_charge',lv:30,name:'긴급 M파워 충전',desc:'셋이 자석처럼 붙고 하트가 터집니다. 동료 M이 가득 차고 잠깐 피해가 줄지만, 직후 잠시 멍해집니다.',kyle:1,icon:'holy3_revive'},
    {id:'ky_spower',lv:34,name:'긴급 S파워',desc:'여성형 몬스터를 잠깐 스턴시킵니다. 쓸모는 없지만 웃깁니다.',kyle:1,icon:'bolt1'},
    {id:'ky_fog',lv:38,name:'긴급 독무',desc:'녹색 독안개를 뿌립니다. 안개 안의 몬스터는 우리를 쫓지 않고 헤맵니다.',kyle:1,icon:'dark2'},
  ]},
  agatha:{name:'아가사',skills:[
    {id:'sword1',lv:1,name:'강하게 베기',kind:'phys',m:14,r:125,n:1,desc:'전방 강타와 경직.'},
    {id:'ag_slam',lv:5,name:'검 내리꽂기',kind:'phys',m:20,r:140,n:1,slam:1,icon:'fist3',desc:'검을 바닥에 내리꽂아 주변 적을 밀쳐 내고 잠깐 경직시킵니다(도발은 없음). 정예·우두머리는 덜 밀립니다.'},
    {id:'sword2',lv:10,name:'회전 베기',kind:'phys',m:19,r:120,n:2,desc:'주변 전체를 베고 밀쳐 냅니다.'},
    {id:'spear1',lv:16,name:'연속 찌르기',kind:'phys',m:16,r:110,n:1,desc:'좁은 직선 3연속 찌르기.'},
    {id:'fist1',lv:22,name:'돌진 베기',kind:'phys',m:14,r:220,n:1,desc:'짧게 돌진해 쳐올리며 적의 준비동작을 끊습니다.'},
    {id:'sword3',lv:28,name:'초승달 검기',kind:'phys',m:30,r:300,n:1,desc:'멀리 나가며 관통하는 거대 검기.'},
    {id:'spear2',lv:34,name:'투검 강타',kind:'phys',m:20,r:300,n:1,desc:'검을 던져 맞은 자리에서 폭발합니다.'},
    {id:'fist3',lv:40,name:'대지 가르기',kind:'phys',m:34,r:150,n:2,desc:'제자리에서 3연속 원형 충격파, 둔화.'},
    {id:'spear3',lv:46,name:'강하 일격',kind:'phys',m:34,r:300,n:2,desc:'지정 지점에 내리꽂아 넓은 충격파.'},
    {id:'fist2',lv:52,name:'검기 파동',kind:'phys',m:19,r:300,n:1,desc:'앞으로 뻗는 투기, 높은 랭크는 관통.'},
  ]},
  sylvia:{name:'실비아',skills:[
    {id:'holy1_heal',lv:1,name:'치유',special:'heal',desc:'M으로 전원의 체력을 회복합니다.'},
    {id:'fire1',lv:3,name:'불덩이',kind:'magic',m:18,r:320,n:1,desc:'느리게 날아가 터지는 불덩이, 화상.'},
    {id:'bolt1',lv:8,name:'번개 구체',kind:'magic',m:18,r:300,n:1,desc:'전방 60도로 번개 구체 3개, 닿는 동안 감전.'},
    {id:'holy2_shield',lv:12,name:'성역의 방패',special:'shield',desc:'M으로 전원에게 보호막을 씌웁니다.'},
    {id:'fire2',lv:18,name:'화염 폭풍',kind:'magic',m:31,r:150,n:2,desc:'내 주변을 불기둥으로 태웁니다.'},
    {id:'bow1',lv:22,name:'맹독 마력 화살',kind:'magic',m:16,r:330,n:1,desc:'독이 밴 마력 화살 한 발, 지속 독 피해.'},
    {id:'bolt2',lv:28,name:'연쇄 벼락',kind:'magic',m:35,r:300,n:2,desc:'맞은 적에서 주변 적으로 튕기는 벼락.'},
    {id:'bow2',lv:34,name:'산탄 마력 화살',kind:'magic',m:22,r:260,n:2,desc:'부채꼴로 마력 화살 여러 발.'},
    {id:'fire3',lv:40,name:'운석 낙하',kind:'magic',m:70,r:320,n:3,desc:'지정 지점에 운석, 불바닥이 남습니다.'},
    {id:'bow3',lv:46,name:'마력 화살 비',kind:'magic',m:32,r:320,n:3,desc:'넓은 구역에 마력 화살 비, 맞은 적 둔화.'},
    {id:'holy3_revive',lv:52,name:'기적의 소생',special:'revive',m:100,cd:120,desc:'쓰러진 동료를 즉시 일으킵니다(체력 50%).'},
    {id:'bolt3',lv:58,name:'천벌의 뇌우',kind:'magic',m:75,r:300,n:3,desc:'전방으로 이어지는 낙뢰 3회.'},
  ]},
};
// 주인이 정해지지 않은 스킬(케인 결정 전). 스킬창·시전에서 빠지지만 코드와 아이콘은 보존한다.
const GAIA_PARKED=['ice1','ice2','ice3','dark1','dark2','dark3'];
const GAIA_FEMALE_FAMILIES=['harpy','succubus'];   // 긴급 S파워 대상(여성형). 케인이 늘리거나 줄이면 여기만 고친다.

const GAIA_KY_SK={ag_slam:{mp:0,cd:8},ky_slap:{mp:3,cd:20},ky_rush:{mp:4,cd:10},ky_wake:{mp:5,cd:45},ky_bluff:{mp:5,cd:40},ky_run:{mp:6,cd:60},ky_charge:{mp:8,cd:90},ky_spower:{mp:4,cd:30},ky_fog:{mp:5,cd:45}};
Object.assign(SK,GAIA_KY_SK);
const GAIA_ALL=Object.values(GAIA_TREE).flatMap(t=>t.skills.map(s=>({...s})));
const GAIA_BY_ID=Object.fromEntries(GAIA_ALL.map(s=>[s.id,s]));
const GAIA_OWNER=Object.fromEntries(Object.entries(GAIA_TREE).flatMap(([k,t])=>t.skills.map(s=>[s.id,k])));
// 예전 1인용 스킬 id 전부(카일이 더 이상 직접 쓰지 않음). 동료는 아래 allyCast가 빌려 쓴다.
const GAIA_OLD_IDS=['fire1','fire2','fire3','ice1','ice2','ice3','bolt1','bolt2','bolt3','dark1','dark2','dark3','holy1_heal','holy2_shield','holy3_revive','sword1','sword2','sword3','spear1','spear2','spear3','bow1','bow2','bow3','fist1','fist2','fist3'];
// 새 이름이 시전 문구에도 나오게
if(typeof SK2_POP!=='undefined')for(const s of GAIA_ALL)if(!s.kyle&&SK2_POP[s.id])SK2_POP[s.id]=s.name+'!';
// 신규 스킬 아이콘: GPT가 만든 카일 8종(A.gaiaKit)이 있으면 그것을, 없으면 원래 스킬 아이콘을 빌려 쓴다
if(A.skicon)for(const s of GAIA_ALL){
  if(A.gaiaKit&&A.gaiaKit[s.id])A.skicon[s.id]=A.gaiaKit[s.id];
  else if(!A.skicon[s.id]&&A.skicon[s.icon])A.skicon[s.id]=A.skicon[s.icon];
}

const gaiaSk={tree:GAIA_TREE,parked:GAIA_PARKED,owner:GAIA_OWNER,byId:GAIA_BY_ID,
  buff:{atk:1,atkT:0,guard:1,guardT:0},timers:[],fogs:[]};
gaiaSk.unlock=id=>GAIA_BY_ID[id]?GAIA_BY_ID[id].lv:999;
gaiaSk.unlocked=id=>!!GAIA_BY_ID[id]&&P.lv>=GAIA_BY_ID[id].lv;
gaiaSk.allyRank=id=>{const s=GAIA_BY_ID[id];return s?Math.max(0,Math.min(5,1+Math.floor((P.lv-s.lv)/10))):0;};
// 카일: 해금 레벨이 되면 1랭크를 공짜로 받는다. 예전 1인용 스킬은 카일 몫에서 뺀다.
gaiaSk.syncKyle=function(){
  if(!P.skillLv)P.skillLv={};
  for(const id of GAIA_OLD_IDS)if(P.skillLv[id]>0&&!gaiaSk.proxyActive)P.skillLv[id]=0;
  for(const s of GAIA_TREE.kyle.skills){
    if(!(s.id in P.skillLv))P.skillLv[s.id]=0;
    if(P.lv>=s.lv&&P.skillLv[s.id]<1)P.skillLv[s.id]=1;
    if(P.lv<s.lv)P.skillLv[s.id]=0;
  }
};
gaiaSk.proxyActive=false;

// ---------- 카일 스킬 ----------
const gaiaAlive=()=>GAIA_PARTY.members().filter(c=>!c.ko&&c.hp>0);
function gaiaMobsNear(x,y,r){return monsters.filter(m=>m&&!m.dead&&!m.removed&&!(m.vanishT>0)&&Math.hypot(m.x-x,m.y-y)<r);}
gaiaSk.kyleCast=function(id,d,rank,cm,skillMul){
  const fx=(type,r,x,y)=>sfx.push({type,t:0,x:x==null?P.x:x,y:y==null?P.y-30:y,r:r||80});
  if(id==='ky_slap'){
    let best=null;
    for(const c of gaiaAlive()){if(Math.hypot(c.x-P.x,c.y-P.y)>GAIA_WHIP_RANGE+80)continue;if(!best||c.m<best.m)best=c;}
    if(!best){say('채찍이 닿는 동료가 없습니다');return false;}
    const v=Math.round(60*skillMul);best.m=Math.min(GAIA_M_MAX,best.m+v);
    const dx=best.x-P.x,dy=best.y-P.y;if(Math.abs(dx)>Math.abs(dy)){P.dir='side';P.flip=dx<0;}else{P.dir=dy<0?'back':'front';P.flip=false;}
    gaiaFx.push({kind:'whip',c:best,t:0,life:.3,fx:P.x,fy:P.y-50});
    pops.push({x:best.x,y:best.y-95,t:0,txt:'M +'+v+' 긴급매질!',crit:true});
    return true;
  }
  if(id==='ky_rush'){
    const dir=[d[0],d[1]];
    for(let k=0;k<3;k++)gaiaSk.timers.push({t:k*.22,fn:()=>{
      GAIA_PARTY.friendlySwing(dir,{reach:120,cone:80});
      for(const t of combatTargets()){
        const dx=t.x-P.x,dy=t.y-P.y,dist=Math.hypot(dx,dy);
        if(dist<125&&(dist<20||(dx*dir[0]+dy*dir[1])/dist>Math.cos(80*Math.PI/180)))hitTarget(t,dir,false,Math.max(1,Math.round(Math.max(1,cm.phys)*.55*skillMul)));
      }
      sfx.push({type:'slashpower',t:0,a:Math.atan2(dir[1],dir[0]),x:P.x,y:P.y-30,r:120});
    }});
    pops.push({x:P.x,y:P.y-115,t:0,txt:'몰아치기!',crit:true});
    return true;
  }
  if(id==='ky_wake'){
    const ko=GAIA_PARTY.members().filter(c=>c.ko).sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0];
    if(!ko){say('쓰러진 동료가 없습니다');return false;}
    const q=nearestSafePosition(P.x+(ko===GAIA_PARTY.members()[0]?-60:60),P.y+24);
    ko.ko=false;ko.koT=0;ko.hp=Math.round(ko.maxHp*(.3+(rank-1)*.05));ko.m=Math.max(ko.m,GAIA_M_START);ko.x=q[0];ko.y=q[1];ko.lastX=ko.x;ko.lastY=ko.y;ko.navPath=null;ko.stuck=0;
    pops.push({x:ko.x,y:ko.y-95,t:0,txt:'정신 차려!',crit:true});fx('impact',70,ko.x,ko.y-30);
    return true;
  }
  if(id==='ky_bluff'){
    gaiaSk.buff.atk=1.3+(rank-1)*.04;gaiaSk.buff.atkT=12;
    pops.push({x:P.x,y:P.y-115,t:0,txt:'긴급 허세!',crit:true});
    for(const c of gaiaAlive())fx('impact',60,c.x,c.y-30);fx('spinpower',110);
    return true;
  }
  if(id==='ky_run'){
    const sp=CUR&&Array.isArray(CUR.spawn)?CUR.spawn:null;
    if(!sp){say('여기에는 도망칠 시작점이 없습니다');return false;}
    const q=nearestSafePosition(sp[0],sp[1]);P.x=q[0];P.y=q[1];P.atk=null;
    GAIA_PARTY.recall(true);fx('impact',90);
    pops.push({x:P.x,y:P.y-115,t:0,txt:'긴급 도망!!',crit:true});
    return true;
  }
  if(id==='ky_charge'){
    const al=gaiaAlive();if(!al.length){say('충전할 동료가 없습니다');return false;}
    // 세 명이 자석처럼 붙는다(카일 곁으로 모인다)
    for(const c of GAIA_PARTY.members()){
      if(c.ko)continue;
      const q=nearestSafePosition(P.x+(c===GAIA_PARTY.members()[0]?-26:26),P.y+8);c.x=q[0];c.y=q[1];c.lastX=c.x;c.lastY=c.y;c.navPath=null;
      c.m=GAIA_M_MAX;c.daze=0;
      for(let k=0;k<3;k++)pops.push({x:c.x+(k-1)*18,y:c.y-95-k*12,t:0,txt:'♥',heal:true});
    }
    gaiaSk.buff.guard=.75;gaiaSk.buff.guardT=4+(rank-1)*.4;
    gaiaSk.timers.push({t:gaiaSk.buff.guardT,fn:()=>{for(const c of gaiaAlive()){c.daze=2;pops.push({x:c.x,y:c.y-95,t:0,txt:'멍…',mana:true});}}});
    pops.push({x:P.x,y:P.y-125,t:0,txt:'긴급 M파워 충전!!',crit:true});fx('holy',120);
    if(typeof window.GAIA_CUTIN==='function')window.GAIA_CUTIN('charge');   // 컷인 그림(19금)이 오면 여기서 연결
    return true;
  }
  if(id==='ky_spower'){
    const list=monsters.filter(m=>m&&!m.dead&&!m.removed&&GAIA_FEMALE_FAMILIES.includes(m.family)&&Math.hypot(m.x-P.x,m.y-P.y)<460);
    if(!list.length){say('주변에 여성형 몬스터가 없습니다');return false;}
    const dur=3+(rank-1)*.4;
    for(const m of list){m.stun=Math.max(m.stun||0,dur*(m.boss||m.elite?.4:1));pops.push({x:m.x,y:m.y-(m.h||60)-10,t:0,txt:'♥ 홀렸다!',crit:true});}
    fx('impact',100);return true;
  }
  if(id==='ky_fog'){
    gaiaSk.fogs.push({x:P.x,y:P.y,r:170+rank*8,t:0,life:8+(rank-1)*.6});
    pops.push({x:P.x,y:P.y-115,t:0,txt:'긴급 독무!',crit:true});
    return true;
  }
  return false;
};

// ---------- 동료 자동 시전 ----------
// 원래 cast()를 동료 위치에서 빌려 쓴다: 잠깐 P의 위치·방향을 동료로 바꾸고, 피해 배율을 동료 공격력에 맞춘다.
function gaiaProxyCast(c,s,t){
  const id=s.id,rank=gaiaSk.allyRank(id);if(!SK[id]||rank<1)return false;
  const sv={x:P.x,y:P.y,dir:P.dir,flip:P.flip,mp:P.mp,root:P.castRoot,atk:P.atk,lv:P.skillLv[id],mg:P.passives&&P.passives.magicGuide};
  const dx=t.x-c.x,dy=t.y-c.y;
  P.x=c.x;P.y=c.y;
  if(Math.abs(dx)>Math.abs(dy)){P.dir='side';P.flip=dx<0;}else{P.dir=dy<0?'back':'front';P.flip=false;}
  P.mp=P.maxMp;P.skillLv[id]=rank;CD[id]=0;
  if(P.passives&&s.kind==='magic')P.passives.magicGuide=Math.max(1,sv.mg||0);   // 마법은 가까운 몹으로 유도되게
  gaiaSk.proxyActive=true;window.GAIA_PROXY=c;
  const cm=combatNow(),base=s.kind==='magic'?Math.max(8,cm.magic):Math.max(1,cm.phys);
  let ok=false;
  try{ok=cast(id,{dmg:Math.max(.05,c.damage/base),mp:0});}
  finally{
    P.x=sv.x;P.y=sv.y;P.dir=sv.dir;P.flip=sv.flip;P.mp=sv.mp;P.castRoot=sv.root;P.atk=sv.atk;P.skillLv[id]=sv.lv||0;
    if(P.passives)P.passives.magicGuide=sv.mg||0;
    gaiaSk.proxyActive=false;window.GAIA_PROXY=null;
  }
  return !!ok;
}
gaiaSk.allyTick=function(c,i,dt){
  const key=i===0?'agatha':'sylvia',list=GAIA_TREE[key].skills;
  c.skCd=c.skCd||{};
  for(const id in c.skCd)c.skCd[id]=Math.max(0,c.skCd[id]-dt);
  c.gcd=Math.max(0,(c.gcd||0)-dt);
  if(c.ko||c.gcd>0||(c.daze>0)||c.mLow||!combatMap())return;
  // 쓰러진 동료 소생(실비아 Lv52)
  const rv=list.find(s=>s.special==='revive');
  if(rv&&P.lv>=rv.lv&&!(c.skCd[rv.id]>0)&&c.m>=rv.m){
    const ko=GAIA_PARTY.members().find(x=>x.ko);
    if(ko){
      const q=nearestSafePosition(P.x+(ko===GAIA_PARTY.members()[0]?-60:60),P.y+24);
      ko.ko=false;ko.koT=0;ko.hp=Math.round(ko.maxHp*.5);ko.m=GAIA_M_START;ko.x=q[0];ko.y=q[1];ko.lastX=ko.x;ko.lastY=ko.y;ko.navPath=null;ko.stuck=0;
      c.m-=rv.m;c.skCd[rv.id]=rv.cd;c.gcd=1.5;
      pops.push({x:ko.x,y:ko.y-95,t:0,txt:'기적의 소생!',crit:true});sfx.push({type:'heal',t:0,x:ko.x,y:ko.y-20,r:90});
      return;
    }
  }
  const cand=list.filter(s=>!s.special&&P.lv>=s.lv).sort((a,b)=>b.lv-a.lv);
  if(!cand.length)return;
  const mobs=monsters.filter(m=>m&&!m.dead&&!m.removed&&!(m.vanishT>0)&&Math.hypot(m.x-c.x,m.y-c.y)<360&&Math.hypot(m.x-P.x,m.y-P.y)<520);
  if(!mobs.length)return;
  for(const s of cand){
    if((c.skCd[s.id]||0)>0||c.m<s.m+GAIA_M_LOW+2)continue;
    const near=mobs.filter(m=>Math.hypot(m.x-c.x,m.y-c.y)<s.r).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y));
    if(near.length<s.n)continue;
    if(s.slam){gaiaSk.allySlam(c,s);c.m-=s.m;c.skCd[s.id]=(SK[s.id]&&SK[s.id].cd)||8;c.gcd=1.1;return;}
    if(gaiaProxyCast(c,s,near[0])){c.m-=s.m;c.skCd[s.id]=(SK[s.id]&&SK[s.id].cd)||3;c.gcd=1.1;return;}
  }
};

// 아가사 Lv5 검 내리꽂기(케인 2026-11-03): 주변 광역 피해 + 밀치기 + 0.5초 경직. 도발 없음. 지진 쇄의 흔들림 효과를 재사용한다.
gaiaSk.allySlam=function(c,s){
  const rank=Math.max(1,gaiaSk.allyRank(s.id)),R=s.r+(rank-1)*8,dmg=Math.max(1,Math.round(c.damage*(1.8+rank*.12)));
  sfx.push({type:'quake',t:0,x:c.x,y:c.y-8,r:R});
  if(typeof skillShowImpact==='function')skillShowImpact('stone',c.x,c.y,R*.9,3);
  pops.push({x:c.x,y:c.y-115,t:0,txt:s.name+'!',crit:true});
  for(const m of combatTargets()){
    if(!m||m.dead||m.removed)continue;
    if(Math.hypot(m.x-c.x,(m.y-c.y)*1.3)>R+14)continue;
    hitTarget(m,[Math.sign(m.x-c.x)||1,Math.sign(m.y-c.y)||0],true,dmg,42);
    if(!m.dead)m.stun=Math.max(m.stun||0,.5*(m.boss||m.elite?.4:1));   // 넉백 뒤 0.5초 경직
  }
};

// ---------- 매 프레임 ----------
gaiaSk.tick=function(dt){
  const b=gaiaSk.buff;
  b.atkT=Math.max(0,b.atkT-dt);if(b.atkT<=0)b.atk=1;
  b.guardT=Math.max(0,b.guardT-dt);if(b.guardT<=0)b.guard=1;
  for(let k=gaiaSk.timers.length-1;k>=0;k--){const o=gaiaSk.timers[k];o.t-=dt;if(o.t<=0){gaiaSk.timers.splice(k,1);try{o.fn();}catch(e){}}}
  for(let k=gaiaSk.fogs.length-1;k>=0;k--){
    const f=gaiaSk.fogs[k];f.t+=dt;if(f.t>=f.life){gaiaSk.fogs.splice(k,1);continue;}
    for(const m of gaiaMobsNear(f.x,f.y,f.r))applyMonsterStatus(m,'confuse',.7);
  }
  gaiaSk._sync=(gaiaSk._sync||0)-dt;if(gaiaSk._sync<=0){gaiaSk._sync=.5;gaiaSk.syncKyle();}
};
gaiaSk.draw=function(dt){
  for(const f of gaiaSk.fogs){
    const u=f.t/f.life,al=Math.min(1,f.t*2.5,(f.life-f.t)*1.2)*.5;
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.55);
    const g=ctx.createRadialGradient(0,0,f.r*.1,0,0,f.r);g.addColorStop(0,'rgba(120,230,90,'+al+')');g.addColorStop(.7,'rgba(70,170,60,'+al*.8+')');g.addColorStop(1,'rgba(40,110,40,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,f.r,0,7);ctx.fill();
    for(let k=0;k<7;k++){const a=T*.6+k*.9,rr=f.r*(.25+.5*((k*37)%10)/10);ctx.fillStyle='rgba(150,255,120,'+al*.6+')';ctx.beginPath();ctx.arc(Math.cos(a)*rr,Math.sin(a)*rr,16+k*2,0,7);ctx.fill();}
    ctx.restore();
  }
};
window.GAIA_SK=gaiaSk;
