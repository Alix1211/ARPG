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
// 케인 2026-11-05: 단어는 은유하지 않는다(자지·보지·애액을 그대로). 패턴도 섞는다 — 카일이 먼저 몰아붙이기, 둘이 서로 경쟁, 카일이 느긋하게 받아치기, 상황 개그, 지문 한 줄.
// 호칭: 아가사는 실비아를 '언니'라고 부른다(케인 표현). 실비아는 아가사를 이름으로. 둘 다 카일에게는 존댓말·'주인님'.
const LIFE_DAY=[
  // ◆ 케인이 준 줄: 아가사의 자지 말, 실비아의 보지 말, 아가사의 '엎드릴까요?'
  ['아가사(밝음): 주인님, 방금 오크 어금니를 뽑아 보니 손에 착 감기는 게… 어제 밤 주인님 자지와 얼추 비슷한 굵기였습니다. 기념으로 챙길까요?',
   '카일(따짐): …야. 그걸 왜 챙겨. 내려놔.',
   '실비아(밝음): 그러고 보니 주인님, 오늘 슬라임 마흔 마리 잡는 동안 한 번만 더라고 하신 횟수가 어제 밤보다 많았습니다.',
   '카일(놀람): 그건 몹 얘기잖아!',
   '실비아(능청): 네, 그래서 더 놀랐습니다. 체력이 슬라임 쪽에 쓰이고 계셔서.',
   '실비아(부끄): 말씀하실 때마다 보지가 젖어서… 죄송합니다… ㅠㅠ',
   '아가사(밝음): 하하하하. 그래서 전 안 입었습니다. 엎드릴까요?'],
  // ◆ 케인이 준 장면(마지막 아가사 줄은 Claude)
  ['카일(능청): 실비아 이리와!!',
   '실비아(밝음): 네 주인님~~~ 뭐하시게요?? 충전해 주시게요? 저 보지 열려…. 읍읍..',
   '시끄러워서 입을 막아 버렸다…',
   '아가사(애원): 주인님, 저는요? 저도 보지 열려 있는데요.'],
  ['아가사(따짐): 언니, 어제 주인님 자지 제가 먼저 물었잖아요. 오늘은 언니 차례 아니에요.',
   '실비아(능청): 아가사, 순번은 마나 순서로 정하는 거야. 지금 내 마나가 바닥이니까 내가 먼저 충전받아야 해.',
   '카일(능청): 둘 다 줄 서. 앞뒤는 내가 정한다.'],
  ['카일(능청): 아가사, 아까 오크 때릴 때 엉덩이 흔들리는 거 봤다. 일부러 그랬지?',
   '아가사(밝음): 들키셨습니까? 다음엔 더 크게 흔들겠습니다. 주인님이 박자 맞춰 주시면 더 좋고요.',
   '카일(밝음): 이따 밤에 맞춰 주지.'],
  ['실비아(애원): 주인님, 마나가 바닥났습니다. 보충 좀 해 주십시오. 마나 포션 말고요. 주인님 정액으로요.',
   '카일(능청): 포션이 더 싼데.',
   '실비아(밝음): 포션은 제 안에서 데워지지 않습니다.'],
  ['아가사(곤란): 주인님, 방어구 끈이 풀렸는데 손이 안 닿습니다. 도와주시겠습니까?',
   '카일(밝음): 어디 끈이야. 뒤냐 앞이냐.',
   '아가사(능청): 앞입니다. 가슴 쪽이요. 풀면 쏟아집니다.',
   '실비아(따짐): 아가사, 몹이 오는데 그건 나중에 해.',
   '아가사(밝음): 언니는 주인님 앞에서 가슴 한 번 꺼내 본 적 없으시죠?',
   '실비아(능청): …몹 처리하고 나서 보여 줄게.'],
  ['카일(능청): 아가사, 오늘 밤에 엎드릴 준비해 둬. 실비아는 입 벌리고 대기.',
   '아가사(밝음): 네, 주인님!! 지금부터 준비하겠습니다.',
   '실비아(밝음): 저는 지금 벌려 놓겠습니다. 입은 평소에도 자주 벌리고 있지만요.'],
  ['실비아(부끄): 주인님, 마법 쓰다가 문득 알았는데 지금 속옷이 애액으로 다 젖었습니다. 마나가 아니라 애액이 새는 것 같습니다.',
   '카일(능청): 그건 힐로도 안 낫는 병이지.',
   '실비아(애원): 그럼 주인님이 직접 막아 주십시오.'],
  ['아가사(밝음): 언니, 내기해요. 오늘 주인님이 먼저 쌀 때까지 누가 더 오래 버티나.',
   '실비아(능청): 그건 주인님이 아니라 우리 둘이 지는 내기잖아.',
   '카일(밝음): 나도 걸자. 먼저 쓰러지는 쪽이 내일 몹 다 맡는 걸로.'],
  ['아가사(놀람): 주인님, 저 슬라임 좀 보십시오. 자지처럼 생긴 촉수가 나왔습니다.',
   '카일(따짐): 슬라임은 촉수 없는 거 알지?',
   '아가사(능청): 그러니까 더 수상합니다. 제가 먼저 확인해 보겠습니다. 입으로.',
   '카일(화남): 확인은 칼로 해!'],
  ['실비아(밝음): 주인님, 지팡이 끝이 닳았습니다. 주인님 자지로 다듬어 주시면 안 됩니까?',
   '카일(능청): 지팡이가 부러지겠는데.',
   '실비아(밝음): 부러져도 좋습니다. 주인님 걸로 다듬은 지팡이니까요.'],
  ['카일(밝음): 둘 다 오늘 잘했다. 상으로 밤에 뭐 해 줄까.',
   '아가사(밝음): 저는 뒤에서 하고 싶습니다!',
   '실비아(밝음): 저는 위에서요!',
   '카일(능청): 둘 다 접수. 순서는 가위바위보.'],
  ['아가사(애원): 주인님, 오늘 한 번도 못 받았습니다. 제 보지가 주인님 이름을 부르고 있습니다.',
   '카일(능청): 이름 불러도 대답 안 해 줄 건데.',
   '아가사(애원): 그럼 소리라도 내게 해 주십시오.'],
  ['카일(능청): 실비아, 힐 걸어 줄 때 신음 소리 좀 줄여. 몹이 놀라서 도망간다.',
   '실비아(부끄): 제가 낸 게 아니라 아가사가 낸 겁니다.',
   '아가사(놀람): 제가 언제요! 언니가 어젯밤에…',
   '실비아(능청): 어젯밤은 어젯밤이고.'],
  ['카일(능청): 오늘은 몹 말고 너희를 사냥하고 싶다.',
   '아가사(밝음): 주인님, 저는 이미 포획당했습니다. 줄만 걸어 주십시오.',
   '실비아(밝음): 저는 잡히기 전에 스스로 엎드렸습니다.'],
  ['아가사(밝음): 주인님, 길드 등급 올리는 것보다 제 보지 깊이 넣는 게 더 어렵다고 했던 사람이 누굽니까?',
   '카일(따짐): 내가 언제 그런 말을 했어.',
   '실비아(능청): 어젯밤에 하셨습니다. 아가사가 대답 못 하는 동안요.'],
  ['아가사(밝음): 주인님, 새 물약이 정력제라고 합니다. 한 병 사 드릴까요?',
   '카일(능청): 필요 없어. 너희 둘이 한 번에 못 버티잖아.',
   '실비아(따짐): 방금 그 말, 오늘 밤에 증명하십시오.'],
  ['아가사(밝음): 주인님 몽둥이는 두 개군요. 손에 든 거랑 허리 아래 거.',
   '실비아(밝음): 손에 든 건 몹이 맞고, 아래 건 저희가 맞습니다.',
   '카일(밝음): 시간 맞춰서 맞으러 와라.'],
  ['카일(능청): 채찍 새로 샀다. 시험 삼아 한 번 맞아 볼 사람.',
   '아가사(밝음): 저요!!! 엉덩이 내밀겠습니다!!',
   '실비아(밝음): 제가 먼저 손 들었습니다. 아가사는 어제도 맞았잖아.',
   '카일(밝음): 싸우지 마. 둘 다 번갈아 맞는다.']
];
// ---- 사냥 잡담 (밤) ----
const LIFE_NIGHT=[
  ['카일(능청): 오늘 밤은 한 방에서 다 같이 하자.',
   '아가사(밝음): 저는 찬성입니다!',
   '실비아(밝음): 침대가 작아서 한 명은 바닥인데, 제가 바닥 하겠습니다. 위에서 나는 소리를 들으면서요.'],
  ['아가사(밝음): 주인님, 별이 많네요. 저 별 수만큼 오늘 밤 해 주십시오.',
   '카일(능청): 셀 수 있는 만큼만 한다.',
   '실비아(능청): 센다는 건 중간에 끊긴다는 말씀이시군요.'],
  ['실비아(애원): 주인님, 밤 사냥은 추우니까 몸 좀 데워 주십시오.',
   '카일(능청): 뛰어. 뛰면 데워져.',
   '실비아(밝음): 그럼 주인님 위에서 뛰겠습니다.'],
  ['카일(능청): 실비아, 아가사, 둘 다 이리 와.',
   '둘이 동시에 달려왔다.',
   '아가사(밝음): 네 주인님!! 뭐 하시게요??',
   '실비아(밝음): 저 이미 다 젖었습니다!!',
   '카일(능청): …아직 아무 말도 안 했는데.'],
  ['카일(능청): 달빛에 보니까 너희 엉덩이가 더 하얗네.',
   '아가사(밝음): 주인님이 하도 때리셔서 빨개진 건 오늘 밤에 보여 드리겠습니다.',
   '실비아(밝음): 저는 아직 하얗습니다. 오늘 밤 빨갛게 해 주십시오.'],
  ['아가사(밝음): 주인님, 불 앞에서 하면 땀이 더 잘 납니다. 모닥불 더 키울까요?',
   '카일(능청): 키워.',
   '실비아(능청): 저희는 이미 불이 붙었습니다.'],
  ['실비아(부끄): …주인님, 아가사 자는 동안 저만 깨워서 한 번만 해 주시면 안 됩니까?',
   '아가사(능청): 언니, 나 안 자요. 다 듣고 있어요.',
   '카일(능청): 그럼 둘 다 일어나.'],
  ['카일(능청): 불침번은 번갈아 선다. 자는 쪽은 서 있는 쪽이 입으로 깨운다.',
   '아가사(밝음): …규정 위반 같은데 저는 찬성입니다.',
   '실비아(밝음): 저도 찬성입니다. 불침번을 자주 서겠습니다.'],
  ['카일(능청): 오늘 밤 소리 큰 쪽한테 상을 준다.',
   '아가사(밝음): 상이 뭔데요?',
   '카일(능청): 한 번 더.',
   '실비아(밝음): 그럼 그건 벌 아닙니까?'],
  ['실비아(능청): 아가사, 어제 네가 주인님 자지 입에 물고 있을 때 내가 옆에서 다 봤다?',
   '아가사(부끄): 언니도 보지 벌리고 기다렸잖아요!',
   '카일(밝음): 서로 다 봤으면 오늘은 같이 하면 되겠네.']
];
// 퀘스트로 이어지는 시작 줄(10번에 한 번). 숨김 퀘스트를 연결할 때 채운다.
const LIFE_LEAD_POOL=[];

// ---- 마을 진입 조우 (7지역 마을, 처음 한 번) ----
const LIFE_TOWN={
  spring:[   // ◆ 케인이 준 줄: "누구냐? 어느 마을에서 왔냐?" / "혹시 시간 되시면 저도 좀 훈육해 주실 수 없냐" / "파이어볼!!!!"
    '마을사람1: 누구냐? 어느 마을에서 왔냐?',
    '카일(능청): 지나가던 모험가야. 길 좀 빌리자.',
    '마을사람1: 혹시 시간 되시면 저도 좀 훈육해 주실 수 없냐.',
    '카일(능청): 채찍은 유료다. 선불이고.',
    '실비아(화남): 파이어볼!!!!',
    '아가사(곤란): 언니, 진짜로 쏘시면 경비대에 끌려갑니다. 말로만 하세요.',
    '카일(능청): 말로만 해. 말로만.'],
  summer:[
    '마을사람2: 이 동네는 날이 더워서 다들 홀딱 벗고 다니오. 아니, 얇게 입고.',
    '카일(밝음): 홀딱이 맞는 것 같은데.',
    '마을사람2: …솔직히 홀딱이오. 규칙 위반은 아니오.',
    '아가사(밝음): 주인님, 저희도 벗겠습니다. 로컬 룰입니다.',
    '실비아(능청): 로컬 룰은 존중해야 합니다. 제 보지에도 바람 좀 쐬겠습니다.',
    '카일(능청): 마을 안에서는 가슴까지만.'],
  autumn:[
    '마을사람3: 올해는 풍년이라 다들 밤마다 바쁘오. 인구 농사 말이오. 이 집은 벌써 일곱째요.',
    '카일(능청): 우린 아직 하나도 못 뽑았는데.',
    '아가사(밝음): 주인님, 저희도 열심히 하면 따라잡을 수 있습니다.',
    '실비아(밝음): 그럼 오늘 밤부터 야근입니다.',
    '카일(능청): 야근 수당은 쌍으로 주지.'],
  winter:[
    '마을사람4: 이 동네는 겨울에 추워서 다들 서로 체온으로 버티오. 마을 규칙이오. 체온 나눔.',
    '카일(밝음): 좋은 규칙이네. 따르자.',
    '아가사(밝음): 주인님이 법을 잘 지키는 분이라 존경합니다.',
    '실비아(능청): 법이니 체온을 전부 나눠야 합니다. 아래부터요.',
    '마을사람4: …여기서는 하지 마시오. 방 잡아 주겠소.'],
  ice:[
    '마을사람5: 어어어이으! (얼어붙은 기둥에 혀가 붙어 있다)',
    '카일(능청): 뭐 하는 거야.',
    '마을사람5: 혀가 붙어서 그러오… 따뜻한 물 좀 부어 주시오…',
    '아가사(능청): 제 입이 더 뜨겁습니다만.',
    '카일(능청): 그래. 한 번 해 봐.',
    '마을사람5: 으어어어 (그쪽 말고 물이오!)',
    '실비아(밝음): 주인님은 매번 제 입이 뜨겁다고 하셨죠.',
    '카일(밝음): 맞아. 일단 이 사람부터 물 부어 주고.'],
  volcano:[
    '마을사람6: 이 동네 용암 온천은 몸에 좋소. 특히 정력에 좋소. 이쪽 형씨는 한번 담가야겠소.',
    '카일(따짐): 내가 뭐 어때서.',
    '마을사람6: 눈 밑이 거뭇하오. 밤마다 두 번 만에 돌아눕는 눈이오.',
    '아가사(밝음): 주인님은 두 번 하고 돌아눕지 않으십니다. 세 번째에 제가 기절합니다.',
    '마을사람6: …내가 졌소. 온천은 공짜로 하시오.'],
  swamp:[
    '마을사람7: 진흙이 피부에 좋소! 뒹구시오! 두 분 다 뒹굴어 보시오! 이쪽 형씨도!',
    '카일(능청): 좋아. 뒹굴자. 셋이.',
    '마을사람7: 나도 껴 주시오!',
    '아가사(따짐): 안 됩니다. 이쪽은 주인님 전용입니다.',
    '실비아(능청): 구멍 세 개는 이미 다 예약이 찼습니다.']
};

// ---- 실비아의 보물 (지정 던전 2층 이상, 처음) ----
const LIFE_TREASURE=[
  '실비아(밝음): 주인님!! 보물입니다! 제가 보물을 주웠습니다!!',
  '카일(능청): 어디 줘 봐.',
  '카일(능청): …딜도잖아. 그것도 꽤 좋은 걸로.',
  '아가사(밝음): 그렇다면 보물이 맞습니다. 언니, 저도 한 번만 써 봐도 됩니까?',
  '실비아(밝음): 안 돼. 첫 사용은 내가 해. 팔지도 않을 거야.',
  '카일(능청): 팔아도 한 푼도 안 나오겠다. 가방에 넣어 둬. 오늘 밤 너희 둘이 쓰는 거 구경하지.'
];

// ---- 100일 기념 ----
const LIFE_D100=[
  '아가사(밝음): 주인님! 오늘이 우리가 만난 지 정확히 100일입니다!',
  '실비아(밝음): 그래서 기념으로 저희 둘이 상의했습니다. 100번 해 주십시오, 주인님.',
  '카일(능청): 100번이면 나도 100대 때린다. 엉덩이 내밀어.',
  '아가사(밝음): 감사합니다, 주인님!! 번호표는 제가 준비했습니다.',
  '실비아(밝음): 저는 맞은 만큼 되돌려 드리겠습니다. 합쳐서 200번이 되겠군요.',
  '카일(능청): 좋아. 오늘 밤은 안 재운다.'
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
