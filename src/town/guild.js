// ======================= 모험가 길드 의뢰판 · F~S 승급 =======================
const GUILD_MOB_NAME=Object.fromEntries(Object.values(MOBDEF).map(d=>[d.id,d.name]));
const GUILD_TIER_THEME=['','spring','summer','autumn','winter','ice','volcano','swamp'];
const GUILD_RANKS=['F','E','D','C','B','A','S'];
const GUILD_DAILY_BASE=10;
const GUILD_EXTRA_BATCH=3;
const GUILD_BRIBE_RATES=[.30,.45,.60];
const GUILD_RANK_REWARD=[1,1.10,1.20,1.30,1.40,1.50,1.60];
const GUILD_RANK_DONE_NEED=20;
const GUILD_EXAM_DAYS=3.5;
const GUILD_EXAMS=[
  {to:1,floor:3,bossId:'slime_king'},
  {to:2,floor:6,bossId:'elem_wood'},
  {to:3,floor:9,bossId:'ogre_chief'},
  {to:4,floor:12,bossId:'wolf_chief'},
  {to:5,floor:15,bossId:'ice_guard_chief'},
  {to:6,floor:18,bossId:'dragon'}
];
const GUILD_EXAM_SCENE=[
  {
    intro:'하르트가 신청서를 뒤집어 보더니 코웃음을 쳤다. “F 딱지는 이제 지겨운 모양이군. 3층에 유난히 덩치 큰 슬라임 하나가 있네. 젊을 땐 나도 얕봤다가 장화 한 짝을 두고 왔지.”',
    pass:'하르트가 루크레아의 장화부터 봤다. “두 짝 다 있군. 나보다 낫네. E급 패는 가져가게. 이제 게시판 숫자도 조금 커질 거야. 자네는 그 말만 들었겠지?”',
    fail:'하르트는 상처보다 루크레아 얼굴을 먼저 살폈다. “살아서 왔으면 됐네.” 잠시 뜸을 들였다. “시험비? 그 질문부터 하는 걸 보니 멀쩡하군. 환불은 없네.”'
  },
  {
    intro:'하르트가 낡은 나무 조각을 책상 위에 올려놨다. “6층 고목 정령에게서 떨어진 거라네. 지난번 응시자는 이걸 기념품이라며 가져왔지. 승급은 못 했고.”',
    pass:'하르트가 등급패를 닦지도 않고 밀어 줬다. “D급. 축하한다는 말은 아껴두지. 이제 의뢰인이 자네한테 더 어려운 일을 맡기고 더 많은 돈을 준다는 뜻이니까.”',
    fail:'하르트가 의자를 뒤로 밀었다. “고목은 오래 산 만큼 성질도 오래됐네. 다시 가고 싶을 때 가게. 다만 길드 회계는 자네 용기까지 환불해주진 않아.”'
  },
  {
    intro:'하르트가 찌그러진 철판을 발끝으로 밀어냈다. “9층 무리장 작품이네. 원래는 어느 모험가의 가슴 갑옷이었지. 사람은 멀쩡했어. 자존심만 조금 접혔고.”',
    pass:'“C급.” 하르트가 새 패를 내려놓았다. “이제 초짜라고 부르면 화낼 자격은 생겼네. 내가 부르는 건 별개고.”',
    fail:'하르트가 한참 듣다가 고개를 끄덕였다. “도망칠 때를 아는 것도 실력이야. 시험비는 도망가지 않았네. 길드 금고에 아주 얌전히 있지.”'
  },
  {
    intro:'하르트가 창밖을 보고 말했다. “12층 늑대 무리장은 혼자 싸우는 법이 없네. 그래서 시험도 혼자 잡으라고 하는 거지.” 루크레아가 쳐다보자 어깨를 으쓱했다. “길드 전통은 가끔 이상해.”',
    pass:'하르트가 B급 패를 내밀다 말고 다시 당겼다. 먼지를 한 번 털고 건넸다. “이쯤 되면 물건도 좀 대접해야지. B급이네.”',
    fail:'“늑대한테 체면 세우다 사람 잡히는 꼴 많이 봤네.” 하르트는 잔을 밀어줬다. “물부터 마시게. 돈 얘기는… 자네가 먼저 하겠지. 환불은 없네.”'
  },
  {
    intro:'하르트가 손가락을 입김으로 녹이는 시늉을 했다. “15층 얼음 갑주 무리장. 거기 다녀온 친구 하나는 사흘 동안 숟가락을 못 잡았어. 그런데 술잔은 잡더군. 사람은 신기해.”',
    pass:'“A급.” 하르트가 잠깐 웃었다. “이제 길드에서 자네 이름을 모르는 사람이 더 적겠군. 빚쟁이까지 포함하면 마을 전체일지도 모르고.”',
    fail:'하르트가 난로 쪽 의자를 턱으로 가리켰다. “손부터 녹여. 다음 시험은 그 다음이네. 응시료는 이미 따뜻한 곳으로 갔고. 금고 말이야.”'
  },
  {
    intro:'하르트가 신청서를 오래 들여다봤다. 평소보다 농담이 늦었다. “18층까지 가게. 거기 붉은 비늘 녀석이 있네. 예전엔 이런 시험을 말릴 사람이 있었는데… 지금은 내가 신청서를 받고 있군.” 그는 펜을 내려놨다. “돌아오게. 그게 조건의 절반이야.”',
    pass:'하르트가 서랍 가장 안쪽에서 S급 패를 꺼냈다. “신발은 있군.” 루크레아가 눈을 흘기자 그제야 웃었다. “S급이네. 더 위는 없어. 적어도 공식적으로는.”',
    fail:'하르트가 아무 말 없이 잔을 하나 내밀었다. 한참 뒤에야 입을 열었다. “다시 갈 수 있는 사람이 실패한 사람은 아니네.” 그리고 아주 작게 덧붙였다. “시험비는 실패했지만.”'
  }
];

let guildNowOverride=null;
let guildExamPanelOpen=false;
let guildAbandonArmed=0;
let guildState={seq:1,board:[],active:[],completed:0,rank:0,rankDone:0,dayKey:'',todayAccepted:0,bribeCount:0,exam:null};

function guildNow(){return guildNowOverride==null?Date.now():guildNowOverride;}
function guildDayKey(ms=guildNow()){
  const d=new Date(ms-4*60*60*1000);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function guildRank(){return Math.max(0,Math.min(6,guildState.rank|0));}
function guildRankTier(){return guildRank()+1;}
function guildQuestTier(){return Math.min(window.GAME&&GAME.levelTier?GAME.levelTier(P.lv):1,guildRankTier());}
function guildRankName(r=guildRank()){return GUILD_RANKS[Math.max(0,Math.min(6,r))]+'급';}
function guildRankMul(r=guildRank()){return GUILD_RANK_REWARD[Math.max(0,Math.min(6,r))]||1;}
function guildDailyCap(){return GUILD_DAILY_BASE+Math.min(3,guildState.bribeCount|0)*GUILD_EXTRA_BATCH;}
function guildRound10(v){return Math.max(10,Math.round(v/10)*10);}
function guildBaseGold(tier,lv=P.lv){return Math.round(35+Math.max(1,lv)*8+tier*22);}
function guildReward(tier){
  const mul=guildRankMul(),exp0=window.GAME&&GAME.questExp?GAME.questExp('guild',P.lv):10;
  return {exp:Math.max(1,Math.round(exp0*mul)),gold:Math.max(1,Math.round(guildBaseGold(tier)*mul)),gear:Math.random()<.28};
}
function guildExamFee(rank=guildRank()){
  const tier=rank+1,lv=window.GAME&&GAME.tierMaxLevel?GAME.tierMaxLevel(tier):tier*10;
  return guildRound10(guildBaseGold(tier,lv)*guildRankMul(rank)*GUILD_DAILY_BASE*GUILD_EXAM_DAYS);
}
function guildBribeFee(){
  const tier=guildQuestTier(),rate=GUILD_BRIBE_RATES[Math.min(2,guildState.bribeCount|0)]||0;
  return guildRound10(guildBaseGold(tier,P.lv)*guildRankMul()*GUILD_EXTRA_BATCH*rate);
}
function guildSyncDay(save=true){
  const k=guildDayKey();
  if(guildState.dayKey===k)return false;
  guildState.dayKey=k;guildState.todayAccepted=0;guildState.bribeCount=0;guildState.board=[];
  guildGenerate();
  if(save&&window.UI&&UI.save)UI.save();
  return true;
}
function guildMake(type,idx){
  const tier=guildQuestTier(),rew=guildReward(tier),q={id:guildState.seq++,type,tier,prog:0,accepted:false,rank:guildRank(),...rew};
  if(type==='kill_any'){
    q.need=8+tier*2+(idx%3);q.title='주변 정리';q.desc='T'+tier+' 전투 지역의 몬스터 '+q.need+'마리 처치';
  }else if(type==='kill_type'){
    const pool=THEME_MOBS[GUILD_TIER_THEME[tier]]||THEME_MOBS.spring,target=pool[(idx+tier)%pool.length];
    q.target=target;q.need=4+tier;q.title=GUILD_MOB_NAME[target]+' 소탕';q.desc=GUILD_MOB_NAME[target]+' '+q.need+'마리 처치';
  }else if(type==='floor'){
    q.need=Math.max(2,tier*3);q.title='던전 정찰';q.desc='던전 지하 '+q.need+'층에 도달';
  }else{
    const goods=TRADE.goods,g=goods[(tier*3+idx*5)%goods.length];
    q.goodId=g.id;q.goodName=g.name;q.need=4+tier*2;q.title='긴급 납품';q.desc=g.name+' '+q.need+'개 납품';
  }
  return q;
}
function guildGenerate(){
  const types=['kill_any','kill_any','kill_type','kill_type','floor','delivery'];
  while(guildState.board.length<6){
    const idx=guildState.seq,type=types[(guildState.seq-1)%types.length];
    guildState.board.push(guildMake(type,idx));
  }
}
function guildDone(q){
  if(q.type==='delivery'){const c=TRADE.cargo()[q.goodId];return !!c&&c.qty>=q.need;}
  return (q.prog||0)>=q.need;
}
function guildProgressText(q){
  if(q.type==='delivery'){const c=TRADE.cargo()[q.goodId];return (c?c.qty:0)+' / '+q.need;}
  return Math.min(q.need,q.prog||0)+' / '+q.need;
}
function guildTrack(){
  const host=$('questTrack');if(!host)return;
  host.onclick=()=>guildOpen();host.title='의뢰창 열기';host.innerHTML='';
  if(!guildState.active.length){host.classList.remove('on');return;}
  host.classList.add('on');
  for(const q of guildState.active.slice(0,5)){
    const done=guildDone(q),row=document.createElement('div');row.className='qtrack'+(done?' done':'');
    row.innerHTML='<span class="qcheck"></span><span class="qtitle">'+q.title+'</span><span class="qprog">'+guildProgressText(q)+'</span>';
    host.append(row);
  }
}
function guildAccept(id){
  guildSyncDay();
  if(guildState.active.length>=5){say('진행 중 의뢰는 최대 5개입니다.');return false;}
  if(guildState.todayAccepted>=guildDailyCap()){
    guildExamPanelOpen=false;guildRender();say(guildState.bribeCount>=3?'오늘은 더 받을 수 없습니다.':'접수원이 장부를 덮었다가 다시 열었습니다. 뭔가 할 말이 있는 눈치입니다.');return false;
  }
  const i=guildState.board.findIndex(q=>q.id===id);if(i<0)return false;
  const q=guildState.board.splice(i,1)[0];q.accepted=true;guildState.active.push(q);guildState.todayAccepted++;
  guildGenerate();guildRender();guildTrack();if(window.UI&&UI.save)UI.save();return true;
}
function guildRandomGear(tier){
  const r=Math.random();
  if(r<.58){const wt=['sword','spear','gauntlet','bow','staff'][Math.floor(Math.random()*5)];return UI.make({kind:'weapon',wt,tier,roll:true});}
  if(r<.9){const kinds=['head','body','hands','feet'];return UI.make({kind:kinds[Math.floor(Math.random()*kinds.length)],tier,roll:true});}
  return UI.make({kind:Math.random()<.5?'ring':'neck',tier,roll:true});
}
function guildClaim(id){
  guildSyncDay();
  const i=guildState.active.findIndex(q=>q.id===id);if(i<0)return false;
  const q=guildState.active[i];if(!guildDone(q)){say('아직 의뢰 조건을 채우지 못했습니다.');return false;}
  if(q.type==='delivery'&&!TRADE.consume(q.goodId,q.need)){say('납품 물품이 부족합니다.');return false;}
  GAME.gainExp(q.exp);GAME.setGold(P.gold+q.gold);let extra='';
  if(q.gear&&window.UI){
    const it=guildRandomGear(Math.max(1,Math.min(7,q.tier)));
    if(UI.add(it))extra=' · '+it.name;
    else{const comp=50+q.tier*35;GAME.setGold(P.gold+comp);extra=' · 가방이 차서 '+comp+'G 추가';}
  }
  guildState.active.splice(i,1);guildState.completed++;guildState.rankDone++;
  if(window.QUEST)QUEST.onEvent('guild_claim',{id:q.id,type:q.type,count:1});
  say('의뢰 완료! EXP '+q.exp+' · '+q.gold+'G'+extra);
  guildGenerate();guildRender();guildTrack();if(window.UI&&UI.save)UI.save();return true;
}
function guildOnKill(m){
  if(!m||m.dead===false)return;
  let changed=false;
  for(const q of guildState.active){
    if(q.type==='kill_any'){q.prog=Math.min(q.need,(q.prog||0)+1);changed=true;}
    else if(q.type==='kill_type'&&(m.type===q.target||m.family===q.target)){q.prog=Math.min(q.need,(q.prog||0)+1);changed=true;}
  }
  const ex=guildState.exam;
  if(ex&&ex.status==='active'&&m.type===ex.bossId){
    ex.status='passed';ex.passedAt=guildNow();changed=true;
    say('승급 시험 목표를 잡았습니다. 길드로 돌아가 하르트에게 보고하세요.');
  }
  if(changed&&$('guild').classList.contains('on'))guildRender();
  if(changed)guildTrack();
  if(changed&&window.UI&&UI.save)UI.save();
}
function guildOnDungeonFloor(floor){
  let changed=false;for(const q of guildState.active)if(q.type==='floor'){q.prog=Math.max(q.prog||0,floor);changed=true;}
  if(changed&&$('guild').classList.contains('on'))guildRender();
}
function guildOnDefeat(){
  const ex=guildState.exam;if(!ex||ex.status!=='active')return false;
  ex.status='failed';ex.failedAt=guildNow();guildAbandonArmed=0;
  if(window.UI&&UI.save)UI.save();return true;
}
function guildCard(q,active){
  const d=document.createElement('div');d.className='gq'+(guildDone(q)?' done':'');
  const gear=q.gear?' · 장비 가능':'';
  d.innerHTML='<b>'+q.title+'</b><small>'+q.desc+'</small><div class="gprog">'+guildProgressText(q)+'</div><small>T'+q.tier+' · 보상 EXP '+q.exp+' · '+q.gold+'G'+gear+'</small>';
  const btn=document.createElement('button');btn.className='btn';btn.type='button';
  if(active){btn.textContent=guildDone(q)?'보상 받기':'진행 중';btn.disabled=!guildDone(q);btn.onclick=()=>guildClaim(q.id);}
  else{
    const capped=guildState.todayAccepted>=guildDailyCap();
    btn.textContent=capped?(guildState.bribeCount<3?'한도 · 뒷거래?':'오늘 한도'):'수락';
    btn.disabled=guildState.active.length>=5||(capped&&guildState.bribeCount>=3);
    btn.onclick=()=>guildAccept(q.id);
  }
  d.append(btn);return d;
}
function guildExamInfo(rank=guildRank()){return rank>=6?null:GUILD_EXAMS[rank];}
function guildExamRequirements(){
  const ex=guildExamInfo(),target=ex?ex.to:6,lvNeed=window.GAME&&GAME.tierMinLevel?GAME.tierMinLevel(target+1):target*10+1,fee=guildExamFee();
  return {level:{ok:P.lv>=lvNeed,need:lvNeed},done:{ok:guildState.rankDone>=GUILD_RANK_DONE_NEED,have:guildState.rankDone,need:GUILD_RANK_DONE_NEED},fee:{ok:P.gold>=fee,fee},targetRank:target};
}
function guildStartExam(){
  guildSyncDay();if(guildRank()>=6||guildState.exam)return false;
  const ex=guildExamInfo(),req=guildExamRequirements();if(!req.level.ok||!req.done.ok||!req.fee.ok){say('승급 시험 조건이 아직 모자랍니다.');guildExamPanelOpen=true;guildRender();return false;}
  GAME.setGold(P.gold-req.fee.fee);
  guildState.exam={targetRank:ex.to,bossId:ex.bossId,bossName:GUILD_MOB_NAME[ex.bossId]||ex.bossId,floor:ex.floor,fee:req.fee.fee,status:'active',startedAt:guildNow()};
  guildAbandonArmed=0;guildExamPanelOpen=true;guildRender();if(window.UI&&UI.save)UI.save();
  say('시험비를 냈습니다. 환불은 없습니다.');return true;
}
function guildFinishExam(){
  const ex=guildState.exam;if(!ex||ex.status!=='passed'||ex.targetRank!==guildRank()+1)return false;
  const scene=GUILD_EXAM_SCENE[guildRank()];
  guildState.rank=ex.targetRank;guildState.rankDone=0;guildState.exam=null;guildState.board=[];guildGenerate();
  guildExamPanelOpen=true;guildRender();guildTrack();if(window.UI&&UI.save)UI.save();
  say(scene?scene.pass:'길드 승급 완료.');return true;
}
function guildAbandonExam(){
  const ex=guildState.exam;if(!ex)return false;
  if(ex.status==='failed'){guildState.exam=null;guildAbandonArmed=0;guildRender();if(window.UI&&UI.save)UI.save();return true;}
  if(ex.status==='passed'){say('이미 시험 조건을 끝냈습니다. 하르트에게 보고하세요.');return false;}
  const now=Date.now();
  if(now>guildAbandonArmed){guildAbandonArmed=now+3500;say('시험비는 돌려받지 못합니다. 한 번 더 누르면 시험을 포기합니다.');guildRender();return false;}
  guildState.exam=null;guildAbandonArmed=0;guildRender();if(window.UI&&UI.save)UI.save();say('승급 시험을 포기했습니다. 시험비는 돌아오지 않습니다.');return true;
}
function guildPayBribe(){
  guildSyncDay();
  if(guildState.todayAccepted<guildDailyCap()||guildState.bribeCount>=3)return false;
  const fee=guildBribeFee();if(P.gold<fee){say('접수원이 금화 주머니를 힐끗 봤습니다. “오늘은… 장부가 아주 정직하군요.”');return false;}
  GAME.setGold(P.gold-fee);guildState.bribeCount++;guildRender();if(window.UI&&UI.save)UI.save();
  const lines=[
    '접수원이 금화를 서랍 아래로 밀어 넣었습니다. “이상하네요. 빈칸이 세 칸 더 있었군요.”',
    '접수원이 한숨을 쉬었습니다. “또 오셨네요. 오늘은 잉크값이 좀 올랐습니다.”',
    '접수원이 장부를 덮었습니다. “이제 서로 모르는 척하기엔 조금 늦었죠?”'
  ];
  say(lines[Math.min(2,guildState.bribeCount-1)]);return true;
}
function guildRenderBribe(){
  const box=$('guildBribeBox');if(!box)return;
  const capped=guildState.todayAccepted>=guildDailyCap();
  if(!capped){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  if(guildState.bribeCount>=3){
    box.innerHTML='<b>오늘 장부는 정말 끝</b><small>접수원이 장부를 품에 안았습니다. “오늘은 장부보다 제 목이 위험합니다. 내일 오세요.”</small>';
    return;
  }
  const fee=guildBribeFee(),rate=Math.round(GUILD_BRIBE_RATES[guildState.bribeCount]*100),n=guildState.bribeCount;
  const txt=n===0?'접수원이 장부를 덮고 주변을 한번 봤습니다. “원칙상 오늘은 끝입니다. …그런데 종이가 비싸서 그런지 빈칸 세 칸을 채우는 데 돈이 좀 듭니다.”':
    n===1?'접수원이 얼굴을 보자마자 서랍을 반쯤 열었습니다. “또 오셨네요. 아까보다 잉크값이 올랐습니다.”':
    '접수원이 헛기침을 했습니다. “이제 서로 모르는 척하기엔 좀 늦었죠? 오늘 마지막 세 칸입니다.”';
  box.innerHTML='<b>장부의 빈칸 '+GUILD_EXTRA_BATCH+'건 · 예상수익의 '+rate+'%</b><small>'+txt+'</small><div class="guildMoney">성의 '+fee.toLocaleString()+'G · 현재 '+P.gold.toLocaleString()+'G</div>';
  const btn=document.createElement('button');btn.className='btn';btn.type='button';btn.textContent='성의를 보인다';btn.onclick=guildPayBribe;box.append(btn);
}
function guildRenderExam(){
  const box=$('guildExamBox'),btn=$('guildExamBtn');if(!box||!btn)return;
  if(guildRank()>=6&&!guildState.exam){btn.textContent='S급 · 최종';btn.disabled=true;box.hidden=!guildExamPanelOpen;if(!box.hidden)box.innerHTML='<b>S급 모험가</b><small>공식 길드 등급은 여기까지입니다. 하르트가 “더 위가 있냐고? 그런 질문은 돈 냄새가 너무 나네.”라고 웃었습니다.</small>';return;}
  btn.disabled=false;btn.textContent=guildState.exam?(guildState.exam.status==='passed'?'합격 보고':'시험 진행'):'승급 시험';
  box.hidden=!guildExamPanelOpen;if(box.hidden)return;
  const rank=guildRank(),scene=GUILD_EXAM_SCENE[rank]||{},ex=guildState.exam,info=guildExamInfo(rank);
  if(!ex){
    const req=guildExamRequirements(),boss=GUILD_MOB_NAME[info.bossId]||info.bossId;
    box.innerHTML='<b>'+guildRankName(rank)+' → '+guildRankName(info.to)+' 승급시험</b><small>'+scene.intro+'</small>'+
      '<div class="greq '+(req.level.ok?'ok':'')+'">'+(req.level.ok?'✓':'○')+' Lv'+req.level.need+' 이상 · 현재 Lv'+P.lv+'</div>'+
      '<div class="greq '+(req.done.ok?'ok':'')+'">'+(req.done.ok?'✓':'○')+' 현 등급 의뢰 '+req.done.need+'건 완료 · '+req.done.have+'/'+req.done.need+'</div>'+
      '<div class="greq '+(req.fee.ok?'ok':'')+'">'+(req.fee.ok?'✓':'○')+' 시험비 '+req.fee.fee.toLocaleString()+'G · 현재 '+P.gold.toLocaleString()+'G</div>'+
      '<div class="gexamTarget">시험 목표 · 지하 '+info.floor+'층 '+boss+' 처치</div>';
    const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='시험비 내고 신청';b.disabled=!(req.level.ok&&req.done.ok&&req.fee.ok);b.onclick=guildStartExam;box.append(b);
    return;
  }
  if(ex.status==='active'){
    box.innerHTML='<b>'+guildRankName(rank)+' → '+guildRankName(ex.targetRank)+' 시험 진행 중</b><small>시험비 '+ex.fee.toLocaleString()+'G는 이미 길드 금고로 갔습니다. 하르트는 그 부분만큼은 아주 분명했습니다.</small><div class="gexamTarget">○ 지하 '+ex.floor+'층 '+ex.bossName+' 처치</div>';
    const b=document.createElement('button');b.className='btn ghost';b.type='button';b.textContent=Date.now()<guildAbandonArmed?'정말 포기 · 환불 없음':'시험 포기';b.onclick=guildAbandonExam;box.append(b);return;
  }
  if(ex.status==='passed'){
    box.innerHTML='<b>시험 목표 완료 · 보고만 남음</b><small>'+scene.pass+'</small><div class="gexamTarget ok">✓ '+ex.bossName+' 처치 완료</div>';
    const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='하르트에게 합격 보고';b.onclick=guildFinishExam;box.append(b);return;
  }
  box.innerHTML='<b>승급 시험 실패</b><small>'+scene.fail+'</small><div class="gexamTarget">시험비 '+ex.fee.toLocaleString()+'G · 환불 없음</div>';
  const b=document.createElement('button');b.className='btn';b.type='button';b.textContent='다시 준비한다';b.onclick=guildAbandonExam;box.append(b);
}
function guildRender(){
  guildSyncDay(false);guildGenerate();guildTrack();
  $('guildRank').textContent=guildRankName()+' 모험가';
  const meta=$('guildMeta');if(meta)meta.textContent='오늘 '+guildState.todayAccepted+'/'+guildDailyCap()+' · 현 등급 완료 '+guildState.rankDone+'/'+GUILD_RANK_DONE_NEED+' · 누적 '+guildState.completed+'건';
  const a=$('gActive'),b=$('gBoard');a.innerHTML='';b.innerHTML='';
  if(!guildState.active.length)a.innerHTML='<div class="gq"><small>진행 중인 의뢰가 없습니다.</small></div>';
  for(const q of guildState.active)a.append(guildCard(q,true));
  for(const q of guildState.board)b.append(guildCard(q,false));
  guildRenderBribe();guildRenderExam();
}
function guildOpen(exam=false){
  closeAll();panel='guild';$('guild').classList.add('on');if(exam)guildExamPanelOpen=true;guildRender();
}
function guildOpenExam(){guildExamPanelOpen=true;guildOpen(true);}
function guildClose(){$('guild').classList.remove('on');if(panel==='guild')panel=null;}
function guildSaveData(){return JSON.parse(JSON.stringify(guildState));}
function guildLoadData(d){
  if(!d){guildState.dayKey=guildDayKey();guildGenerate();guildTrack();return;}
  const migratedRank=Number.isFinite(+d.rank)?Math.max(0,Math.min(6,+d.rank|0)):Math.max(0,Math.min(6,(window.GAME&&GAME.levelTier?GAME.levelTier(P.lv):1)-1));
  guildState={
    seq:+d.seq||1,board:Array.isArray(d.board)?d.board:[],active:Array.isArray(d.active)?d.active:[],completed:d.completed|0,
    rank:migratedRank,rankDone:Number.isFinite(+d.rankDone)?Math.max(0,+d.rankDone|0):0,dayKey:d.dayKey||guildDayKey(),
    todayAccepted:Math.max(0,+d.todayAccepted|0),bribeCount:Math.max(0,Math.min(3,+d.bribeCount|0)),exam:d.exam&&typeof d.exam==='object'?d.exam:null
  };
  guildSyncDay(false);guildGenerate();guildTrack();
}
const examBtn=$('guildExamBtn');if(examBtn)examBtn.addEventListener('click',()=>{guildExamPanelOpen=!guildExamPanelOpen;guildRender();});

window.GUILD={
  open:guildOpen,openExam:guildOpenExam,close:guildClose,accept:guildAccept,claim:guildClaim,onKill:guildOnKill,onDungeonFloor:guildOnDungeonFloor,onDefeat:guildOnDefeat,
  startExam:guildStartExam,finishExam:guildFinishExam,abandonExam:guildAbandonExam,payBribe:guildPayBribe,
  saveData:guildSaveData,loadData:guildLoadData,refreshTrack:guildTrack,state:()=>JSON.parse(JSON.stringify(guildState)),
  dayKey:guildDayKey,setNow(ms){guildNowOverride=ms==null?null:+ms;guildSyncDay(false);guildRender();return guildDayKey();},
  examFee:guildExamFee,bribeFee:guildBribeFee,dailyCap:guildDailyCap,rankName:guildRankName,
  debugComplete(id){const q=guildState.active.find(x=>x.id===id);if(!q)return false;if(q.type==='delivery')return false;q.prog=q.need;guildRender();return true;},
  debugSetRank(r,done=0){guildState.rank=Math.max(0,Math.min(6,r|0));guildState.rankDone=Math.max(0,done|0);guildState.exam=null;guildState.board=[];guildGenerate();guildRender();return true;},
  debugExamPass(){if(!guildState.exam)return false;guildState.exam.status='passed';guildRender();return true;}
};
