'use strict';
// 가이아(케인 2026-11-05): 살아있는 세계. 퀘스트 목록에 없는 곳에서 갑자기 터지는 입으로만 야한 생활개그.
//   1) 사냥 잡담: 몇 마리 잡을 때마다(12~22) 아가사·실비아가 대화창을 연다. 전투 중엔 기다렸다가, 쿨타임 150초.
//   2) 마을 진입 조우: 7지역 마을마다 처음 들어설 때 한 번(초상화 없는 마을사람 포함).
//   3) 실비아의 보물: 지정 던전(2층 이상)에서 처음 안전해졌을 때. 상품가치 0골드 '그냥 좋은 딜도'.
//   4) 100일 기념: 게임 속 날짜(guildState.gday)가 100이 되면 어디서든 멈추고 대화.
// 대화는 quest.js 의 questShowLine 을 그대로 쓴다("이름(표정): 말"). 초상이 없는 이름은 초상 없이 이름표만 나온다.
// 수위: 대사는 노골적으로 가도 되고 행위·장면 묘사는 하지 않는다. 여자들은 카일에게 존댓말·"주인님", 카일은 반말.
// ※ 모든 대사는 [임시] — 케인이 고친다. 케인이 직접 준 줄은 그대로 넣었다(◆).
// ※ 퀘스트로 이어지는 시작 줄(LEAD_POOL, 10번에 한 번)은 숨김 퀘스트를 연결할 때 채운다. 비어 있으면 일반 잡담으로 나간다.
const LIFE_COOL=150000,LIFE_KILL_MIN=12,LIFE_KILL_MAX=22,LIFE_LEAD_RATE=.1,LIFE_SAFE_DIST=420;

// ---- 사냥 잡담 (낮) ----
const LIFE_DAY=[
  // ◆ 케인이 준 줄: 아가사의 자지 말, 실비아의 보지 말, 아가사의 '엎드릴까요?'
  ['아가사(밝음): 주인님, 방금 오크 어금니를 뽑아 보니 손에 착 감기는 게… 어제 밤 주인님 자지와 얼추 비슷한 굵기였습니다. 기념으로 챙길까요?',
   '카일(따짐): …야. 그걸 왜 챙겨. 내려놔.',
   '실비아(밝음): 그러고 보니 주인님, 오늘 슬라임 마흔 마리 잡는 동안 한 번만 더라고 하신 횟수가 어제 밤보다 많았습니다.',
   '카일(놀람): 그건 몹 얘기잖아!',
   '실비아(능청): 네, 그래서 더 놀랐습니다. 체력이 슬라임 쪽에 쓰이고 계셔서.',
   '실비아(부끄): 말씀하실 때마다 보지가 젖어서… 죄송합니다… ㅠㅠ',
   '아가사(밝음): 하하하하. 그래서 전 안 입었습니다. 엎드릴까요?'],
  ['아가사(밝음): 주인님, 방금 베신 몬스터요. 죽는 순간 내는 소리가 어제 밤 실비아 님 소리랑 똑같았습니다.',
   '실비아(부끄): 아가사 님!! 저는 그렇게 높지 않았습니다!',
   '카일(지침): 전투 중에 그런 얘기 하지 마.'],
  ['실비아(능청): 주인님, 요즘 손목 쓰시는 각도가 부쩍 좋아지셨습니다. 연습을 어디서 하셨습니까?',
   '카일(곤란): …검 얘기지?',
   '실비아(능청): 물론입니다. 저는 검 얘기만 했습니다. 손목으로 하는 다른 일은 말씀드리지 않았습니다.'],
  ['아가사(곤란): 주인님, 방금 슬라임이 제 허벅지에 붙었는데… 솔직히 말씀드리면 조금 괜찮았습니다. 죄송합니다.',
   '카일(따짐): 사과할 일이 아니라 떼어낼 일이잖아.'],
  ['실비아(애원): 주인님, 제가 마나가 떨어지면 주인님이 제 허리를 안아 주시는 건 규정입니까?',
   '카일(못마땅): 규정 아니야.',
   '실비아(애원): 그럼 규정으로 정해 주십시오. 한 번 안으실 때마다 마나 회복이 두 배입니다. 제가 그렇게 느낍니다.'],
  ['아가사(능청): 주인님, 방패는 앞을 막는 것이지만 저는 뒤를 내어 드리는 쪽이 더 자신 있습니다.',
   '카일(지침): 전투 중에 쓸 말이 아니야.'],
  ['실비아(밝음): 주인님, 오늘 몬스터들은 왜 이렇게 뭉쳐 다닐까요? 저희 같으면 이럴 땐 셋이 한 방에서…',
   '카일(화남): 끝까지 말하지 마.'],
  ['아가사(부끄): 주인님, 제가 오늘 속옷을 입었는지 안 입었는지 맞히시면 소원 하나 들어 드리겠습니다.',
   '카일(능청): …입었어.',
   '아가사(밝음): 틀리셨습니다. 확인하셔야겠네요, 주인님.',
   '카일(지침): …일단 걸으면서 하자.'],
  ['실비아(능청): 주인님, 방금 오크가 저를 보고 침을 흘렸습니다. 불쾌했지만… 솔직히 주인님이 저를 보실 때보다는 덜 흘렸습니다.',
   '카일(놀람): 나 침 안 흘려!',
   '아가사(밝음): 흘리십니다. 어젯밤에 제 등에 떨어졌습니다.'],
  ['카일(능청): 오늘은 내가 앞에서 걷지.',
   '아가사(밝음): 주인님이 앞에 서시면 저희는 뒤에서 풍경을 감상할 수 있어 좋습니다.',
   '실비아(밝음): 엉덩이 풍경입니다.',
   '카일(화남): …내가 뒤로 갈게.'],
  ['아가사(밝음): 주인님, 제가 힘이 세다는 건 아시지요? 어제 허리를 잡으셨을 때 제가 빠져나갈 수 있었는데도 안 빠져나간 거, 눈치채셨습니까?',
   '카일(곤란): …눈치챘지. 그래서 더 곤란했고.'],
  ['실비아(밝음): 주인님, 사냥이 끝나면 오늘은 제가 먼저입니다. 아가사 님은 어제 두 번 하셨으니까요.',
   '아가사(따짐): 세 번입니다, 실비아 님.',
   '카일(지침): …내가 몇 번인지는 안 세냐.'],
  ['아가사(곤란): 주인님, 방금 마신 물약이 이상하게 몸을 달아오르게 합니다. 아, 아닙니다. 그냥 주인님 때문입니다.',
   '카일(못마땅): 물약 탓을 해. 제발 물약 탓을 해.'],
  ['실비아(능청): 주인님의 칼날은 언제 봐도 믿음직스럽습니다. …검 얘기입니다.',
   '카일(따짐): 한 번만 더 그러면 얘기 안 들어 준다.',
   '실비아(밝음): 그럼 안 들으시고 보시기만 하십시오.'],
  ['아가사(밝음): 주인님, 나중에 은퇴하시면 어디서 살고 싶으십니까? 저는 방이 하나뿐인 집이 좋습니다. 침대가 큰 집.',
   '실비아(밝음): 저는 벽이 두꺼운 집이요.',
   '카일(곤란): …이유는 묻지 않을게.'],
  ['실비아(부끄): 주인님, 제가 힐을 드릴 때 가슴께에 손을 얹는 건 마법 효율 때문입니다. 정말입니다. …조금은 아닙니다.'],
  ['아가사(능청): 주인님, 지금 "엎드려!" 하고 외치시면 몬스터보다 제가 먼저 엎드릴 자신이 있습니다.',
   '카일(지침): …전투 중에 엎드리지 마.'],
  ['실비아(놀람): 주인님, 방금 고블린이 "살려 줘"라고 했는데 저는 "더 세게"로 들렸습니다. 제가 이상한 걸까요?',
   '아가사(능청): 이상하지 않습니다. 저도 그렇게 들렸습니다.',
   '카일(화남): 둘 다 이상해!'],
  ['아가사(밝음): 주인님, 궁금한 게 있습니다. 위에서 하시는 게 좋으십니까, 뒤에서 하시는 게 좋으십니까? 전투 포지션 얘기입니다.',
   '카일(능청): …전투 포지션이면 전위지.',
   '아가사(밝음): 네. 저도 전위입니다. 침대에서도요.']
];
// ---- 사냥 잡담 (밤) ----
const LIFE_NIGHT=[
  ['실비아(부끄): 주인님, 밤이 되니 제 몸이 자꾸 여관 쪽을 봅니다. 마을 쪽 말입니다.',
   '아가사(능청): 제 몸도 같은 방향을 보고 있습니다.',
   '카일(지침): …몬스터 먼저 잡고.'],
  ['아가사(밝음): 주인님, 별이 예쁩니다. 하지만 주인님 뒷모습이 더 예쁩니다. 특히 허리 아래가요.'],
  ['실비아(애원): 주인님, 밤 사냥은 위험하니까 제가 곁에 꼭 붙어 있겠습니다. 팔 말고 다른 데 붙어도 됩니까?',
   '카일(능청): …팔에만 붙어.',
   '실비아(밝음): 팔부터 시작하겠습니다.'],
  ['아가사(부끄): 주인님, 밤이 되면 제 호흡이 가빠지는 건 어둠 때문이 아닙니다. 기대 때문입니다.'],
  ['실비아(밝음): 주인님, 달빛 아래서 보니 주인님 얼굴이 더 야… 한 게 아니라 늠름하십니다.',
   '카일(따짐): 방금 야라고 했지?',
   '실비아(능청): 야생의 야였습니다.'],
  ['카일(지침): …둘 다 오늘은 좀 조용히 걷자.',
   '아가사(밝음): 네, 주인님. 침대에서 소리 내겠습니다.',
   '실비아(부끄): 저도 그렇게 하겠습니다.'],
  ['아가사(애원): 주인님, 이 근처에 인적이 없습니다. 제가 지금 꿇어앉아도 아무도 보지 않습니다만…',
   '카일(따짐): 내가 본다고!'],
  ['실비아(애원): 주인님, 마나를 너무 써서 허리가 휘청합니다. 안아서 옮겨 주시면… 아니, 업어서 옮겨 주시면… 아니, 아무 데나 눕혀 주셔도 됩니다.',
   '카일(곤란): 여기 던전이야.',
   '실비아(애원): 그래서 더 좋습니다.'],
  ['아가사(능청): 주인님, 어제는 제가 위에 있었으니 오늘은 주인님이 위에 계십시오. 공평해야 합니다. 정의로운 길드원으로서 하는 말입니다.'],
  ['실비아(밝음): 주인님, 오늘 밤 저희 둘 중 누구를 먼저 부르실지 정하셨습니까? 못 정하시면 가위바위보로 정하겠습니다. 이긴 사람이 먼저입니다.',
   '아가사(능청): 그럼 저는 방금 주먹을 풀었습니다.',
   '카일(지침): …가위바위보 하지 마. 내가 정해.']
];
// 퀘스트로 이어지는 시작 줄(10번에 한 번). 숨김 퀘스트를 연결할 때 채운다.
const LIFE_LEAD_POOL=[];

// ---- 마을 진입 조우 (7지역 마을, 처음 한 번) ----
const LIFE_TOWN={
  spring:[   // ◆ 케인이 준 줄: "누구냐? 어느 마을에서 왔냐?" / "혹시 시간 되시면 저도 좀 훈육해 주실 수 없냐"
    '마을사람1: 누구냐? 어느 마을에서 왔냐?',
    '카일(능청): 지나가던 모험가야. 길 좀 빌리자.',
    '마을사람1: 혹시 시간 되시면 저도 좀 훈육해 주실 수 없냐.',
    '카일(놀람): 뭐?',
    '실비아(화남): 파이어볼!!!!',
    '아가사(곤란): 실비아 님, 진짜로 쏘시면 경비대에 끌려갑니다. 말씀만 하십시오.',
    '카일(따짐): 말로만 해. 말로만.'],
  summer:[
    '마을사람2: 어서 오시오! 이 동네는 날이 더워서 다들 홀딱… 아니, 얇게 입고 다니오.',
    '카일(따짐): 방금 두 번 틀렸지?',
    '마을사람2: 거 참, 입이 더위를 먹어서 그렇소.',
    '아가사(능청): 주인님, 저도 더위를 먹은 것 같습니다. 속옷부터 정리할까요?',
    '실비아(밝음): 저는 괜찮습니다. 주인님이 벗기시는 쪽이 더 시원하니까요.',
    '카일(지침): …여관부터 찾자.'],
  autumn:[
    '마을사람3: 올해는 풍년이라 다들 밤마다 바쁘오. 농사 말이오. 인구 농사.',
    '카일(능청): 곡식 농사 얘기 아니었어?',
    '마을사람3: 곡식은 하늘이 하고, 이쪽은 우리가 하오. 보시오, 이 집은 벌써 일곱째요.',
    '실비아(부끄): 일곱이라니… 주인님, 저희는 아직 하나도…',
    '아가사(능청): 주인님, 오늘부터 열심히 하시면 따라잡을 수 있습니다.',
    '카일(화남): 경쟁하는 거 아니야!'],
  winter:[
    '마을사람4: 이 동네는 겨울에 추워서 다들 서로 체온으로 버티오. 마을 규칙이오. 체온 나눔.',
    '카일(따짐): 그런 규칙이 어딨어.',
    '마을사람4: 저기 팻말 보이시오? 아홉 번째 조항이오.',
    '아가사(밝음): 주인님, 법이라 하니 따라야 합니다. 저는 이미 달아올랐습니다.',
    '실비아(능청): 저는 오는 길에 이미 체온을 한참 나눴습니다. 주인님 등에다가요.',
    '카일(지침): …네가 매달린 거잖아.'],
  ice:[
    '마을사람5: 어어어이으! (얼어붙은 기둥에 혀가 붙어 있다)',
    '카일(놀람): 야, 뭐 하는 거야.',
    '마을사람5: 혀가 붙어서 그러오… 따뜻한 물 좀 부어 주시오…',
    '아가사(능청): 제 입이 더 뜨겁습니다만.',
    '카일(화남): …쓸데없는 소리 말고 물이나 부어.',
    '실비아(부끄): 주인님도 매번 제 입이 뜨겁다고 하셨…',
    '카일(놀람): 지금 말고!!'],
  volcano:[
    '마을사람6: 이 동네 용암 온천은 몸에 좋소. 특히 정력에 좋소. 이쪽 형씨는 한번 담가야겠소.',
    '카일(따짐): 내가 뭐 어때서.',
    '마을사람6: 눈 밑이 거뭇하오. 밤마다 두 번 만에 돌아눕는 눈이오.',
    '아가사(능청): 주인님, 어제 두 번 만에 돌아누우셨던 건…',
    '카일(화남): 그건 졸려서야!',
    '실비아(밝음): 저는 세 번까지 기억합니다.',
    '카일(지침): …가자.'],
  swamp:[
    '마을사람7: 진흙이 피부에 좋소! 뒹구시오! 두 분 다 뒹굴어 보시오! 이쪽 형씨도!',
    '카일(능청): 저 눈빛 뭐야.',
    '아가사(곤란): 주인님, 저들의 눈빛은 늪보다 탁합니다.',
    '실비아(밝음): 뒹구는 건 방에서 하시지요, 주인님.',
    '마을사람7: 그럼 방에서 같이 하겠소?',
    '카일(화남): 안 해!']
};

// ---- 실비아의 보물 (지정 던전 2층 이상, 처음) ----
const LIFE_TREASURE=[
  '실비아(밝음): 주인님!! 보물입니다! 제가 보물을 주웠습니다!!',
  '카일(곤란): …그게 뭔데. 이리 줘 봐.',
  '카일(못마땅): …야. 이거 딜도잖아. 그것도 꽤 좋은 걸로.',
  '아가사(밝음): 그렇다면 보물이 맞습니다, 주인님.',
  '실비아(밝음): 그렇죠? 이건 팔지 않겠습니다. 평생 간직하겠습니다.',
  '카일(지침): …팔아도 한 푼도 안 나오겠다. 가방에 넣어 둬.'
];

// ---- 100일 기념 ----
const LIFE_D100=[
  '아가사(밝음): 주인님! 오늘이 우리가 만난 지 정확히 100일입니다!',
  '실비아(밝음): 그래서 기념으로 저희 둘이 상의했는데요. 100번 해 주십시오, 주인님.',
  '카일(놀람): 뭘 100번을 해!',
  '아가사(능청): 뭐든지요. 저는 세는 번호표까지 준비했습니다.',
  '실비아(부끄): 저는 세는 건 아가사 님께 맡기고, 소리 내는 쪽을 맡겠습니다.',
  '카일(화남): …그럼 나도 정하지. 100번이면 100대다. 둘 다 엉덩이 맞을 각오해라.',
  '아가사(밝음): 감사합니다, 주인님!!',
  '실비아(밝음): 맞은 만큼 되돌려 드리겠습니다. 합쳐서 200번이 되겠군요, 주인님.',
  '카일(지침): …나 오늘 못 자겠네.'
];

// ====================== 동작 ======================
let lifeBusy=null,lifeKillsSince=0,lifeNextAt=0,lifeChatPending=false,lifeLastChat=0,lifeTownSeen='';
function lifeRand(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function lifeS(){
  if(!guildState.life)guildState.life={towns:{},seen:{},treasure:false,d100:false,kills:0,chat:0};
  return guildState.life;
}
function lifeSave(){if(window.UI&&UI.save)UI.save();}
function lifeIsNight(){const t=DAY.t;return t>=.63||t<.08;}
function lifeFree(){
  if(!GAIA_PARTY_MODE||lifeBusy)return false;
  if(typeof panel!=='undefined'&&panel)return false;
  if(typeof traveling!=='undefined'&&traveling)return false;
  if(window.GAIA_EVENT_PAUSE||window.ARPG_TITLE_OPEN||window.ARPG_BACKUP_RESTORING)return false;
  if(window.MINIGAMES&&MINIGAMES.isOpen())return false;
  if(P.hp!==undefined&&P.hp<=0)return false;
  return ['town','fieldvillage','field','dungeon'].includes(MAP);
}
// 근처에 살아 있는 몬스터가 없고 보스도 없을 때
function lifeSafe(){
  for(const m of monsters){
    if(m.dead||m.removed)continue;
    if(m.bossRole)return false;
    if(Math.hypot(m.x-P.x,m.y-P.y)<LIFE_SAFE_DIST)return false;
  }
  return true;
}
function lifeFace(line){const m=/^([^:：()\n]{1,14}?)(?:\(([^)]{1,8})\))?\s*[:：]/.exec(line||'');return m?m[1].trim():'';}
function lifeShow(){
  const b=lifeBusy;if(!b)return;
  const line=b.lines[b.i];
  questShowLine(line);
  const who=lifeFace(line),anon=!!who&&!questSpeaker(who);   // 초상이 없는 이름(마을사람)은 그림 없이 이름표만
  $('dlgImg').style.visibility=anon?'hidden':'visible';
  $('dlgQuest').textContent=b.i<b.lines.length-1?'다음':'확인';
}
function lifeNext(){
  const b=lifeBusy;if(!b)return;
  if(++b.i<b.lines.length)lifeShow();else lifeEnd(false);
}
function lifePlay(lines,done){
  if(lifeBusy||!lines||!lines.length)return false;
  lifeBusy={lines,i:0,done:done||null};
  window.GAIA_EVENT_PAUSE=true;   // 대화하는 동안 월드를 멈춘다(사냥터에서 맞고 있지 않게)
  talking=null;show('dlg');
  $('dlgMainRow').hidden=false;$('dlgInnRow').hidden=true;
  for(const id of ['dlgTrade','dlgTalk','dlgGuildExam'])if($(id))$(id).hidden=true;
  const q=$('dlgQuest');q.hidden=false;q.disabled=false;q.onclick=lifeNext;
  lifeShow();return true;
}
function lifeEnd(closedEarly){
  const b=lifeBusy;if(!b)return;
  lifeBusy=null;
  $('dlgImg').style.visibility='visible';$('dlgLine').classList.remove('narr');$('dlgQuest').hidden=true;
  window.GAIA_EVENT_PAUSE=false;
  if(!closedEarly)closeAll();
  try{if(b.done)b.done();}catch(e){console.error(e);}
  lifeSave();
}
function lifeGiveTreasure(){
  if(!window.UI||!UI.makeLoot||!UI.add)return false;
  const it=UI.makeLoot({kind:'junk',name:'실비아의 보물',icon:'junk_wood',tier:1,price:1,
    desc:'감정 결과: 그냥 좋은 딜도. 상점에선 한 푼도 안 쳐 주지만 두 사람에겐 보물이다.'});
  it.price=0;
  if(UI.add(it)){say('실비아의 보물을 얻었습니다.');return true;}
  dropsLoot.push({kind:'item',x:P.x,y:P.y+10,item:it,ph:0});say('가방이 가득 차서 실비아의 보물을 발밑에 두었습니다.');return true;
}
// 잡담 한 토막 고르기(안 나온 것 먼저, 다 나오면 처음부터)
function lifePickChat(){
  const L=lifeS();
  if(LIFE_LEAD_POOL.length&&Math.random()<LIFE_LEAD_RATE){
    const i=lifeRand(0,LIFE_LEAD_POOL.length-1);return {lines:LIFE_LEAD_POOL[i].lines||LIFE_LEAD_POOL[i],lead:i};
  }
  const night=lifeIsNight(),pool=night?LIFE_NIGHT:LIFE_DAY,pre=night?'n':'d';
  let free=[];for(let i=0;i<pool.length;i++)if(!L.seen[pre+i])free.push(i);
  if(!free.length){for(let i=0;i<pool.length;i++)delete L.seen[pre+i];free=pool.map((_,i)=>i);}
  const i=free[lifeRand(0,free.length-1)];L.seen[pre+i]=1;
  return {lines:pool[i],idx:i,night};
}
function lifeFireChat(){
  const pick=lifePickChat();if(!pick)return false;
  lifeChatPending=false;lifeLastChat=Date.now();lifeS().chat++;
  return lifePlay(pick.lines,()=>lifeSave());
}
function lifeOnKill(m){
  if(!GAIA_PARTY_MODE)return;
  const L=lifeS();L.kills++;
  if(!lifeNextAt)lifeNextAt=lifeRand(LIFE_KILL_MIN,LIFE_KILL_MAX);
  if(++lifeKillsSince>=lifeNextAt){lifeKillsSince=0;lifeNextAt=lifeRand(LIFE_KILL_MIN,LIFE_KILL_MAX);lifeChatPending=true;}
}
function lifeTick(){
  if(lifeBusy){if(!$('dlg').classList.contains('on'))lifeEnd(true);return;}   // 닫기로 중간에 닫아도 보상은 준다
  if(!lifeFree()){lifeTownSeen='';return;}
  const L=lifeS(),safe=lifeSafe();
  // 100일 기념(한 번)
  if(((guildState.gday|0)>=100)&&!L.d100&&safe){L.d100=true;lifePlay(LIFE_D100,()=>lifeSave());return;}
  // 마을 진입 조우(마을마다 처음 한 번, 도착하고 잠시 뒤)
  if(MAP==='fieldvillage'&&window.__FD){
    const th=(__FD.state()||{}).theme;
    if(th&&LIFE_TOWN[th]&&!L.towns[th]){
      if(lifeTownSeen!==th){lifeTownSeen=th;lifeTownT=Date.now();return;}
      if(Date.now()-lifeTownT>1200){L.towns[th]=1;lifePlay(LIFE_TOWN[th],()=>lifeSave());return;}
    }
  }else lifeTownSeen='';
  // 실비아의 보물(던전 2층 이상, 한 번)
  if(MAP==='dungeon'&&!L.treasure&&safe&&window.__DUN){
    const s=__DUN.state();
    if(s&&s.floor>=2&&!s.busy){L.treasure=true;lifePlay(LIFE_TREASURE,()=>{lifeGiveTreasure();});return;}
  }
  // 사냥 잡담
  if(lifeChatPending&&safe&&(MAP==='field'||MAP==='dungeon')&&Date.now()-lifeLastChat>LIFE_COOL)lifeFireChat();
}
let lifeTownT=0;
setInterval(lifeTick,500);
window.GAIA_LIFE={
  onKill:lifeOnKill,
  state:()=>({busy:!!lifeBusy,pending:lifeChatPending,killsSince:lifeKillsSince,nextAt:lifeNextAt,life:JSON.parse(JSON.stringify(lifeS()))}),
  // 시험용
  play:lifePlay,
  fire(name){
    if(name==='d100')return lifePlay(LIFE_D100,()=>lifeSave());
    if(name==='treasure')return lifePlay(LIFE_TREASURE,()=>{lifeGiveTreasure();});
    if(name&&name.startsWith('town:'))return lifePlay(LIFE_TOWN[name.slice(5)],()=>lifeSave());
    if(name==='chat'){lifeLastChat=0;return lifeFireChat();}
    return false;
  },
  counts:()=>({day:LIFE_DAY.length,night:LIFE_NIGHT.length,towns:Object.keys(LIFE_TOWN).length}),
  setPending(v){lifeChatPending=!!v;lifeLastChat=0;},
  cool:()=>LIFE_COOL
};
