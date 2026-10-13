(function(root){
const races=['elf','human','dwarf','harpy','lamia','dragon','beast','slime','spider','darkelf'];
const names=['실비아','로제','브리카','피피','사피라','루비아','루루','모모','아라네','니샤'];
const profiles=[
 ['M','청순','차분','우아하지만 돈 계산은 칼같은 현실파','우아한 단골 관리','칭찬은 무료지만 지명은 유료랍니다. 호호.'],
 [null,'귀염','활달','붙임성 좋은 주점 살림꾼','살림꾼','오빠, 외상 말고 현금으로 사랑해 줘.'],
 ['M','보이시','활달','호탕하고 적극적인 술친구','술친구','우하하! 잔은 작아도 계산서는 크지!'],
 ['M','귀염','활달','칭찬에 신나는 수다쟁이','가벼운 발걸음','깃털 관리비가 얼만데! 팁 좀 줘!'],
 ['S','섹시','차분','느긋한 흥정 고수','끈질긴 권유','어머, 할인까지 감아 달라고?'],
 ['S','섹시','차분','당당하고 꼼꼼한 여왕님','여왕의 접객','이 몸이 데워 준 잔이다. 식기 전에 마셔라.'],
 [null,'귀염','활달','장난기 많은 씩씩한 산책 친구','산책 친구','산책 갈까? 계산부터 하고!'],
 ['M','귀염','활달','낙천적인 먹보, 엉뚱한 논리','말랑한 회복력','보습은 촉촉하게, 계산은 깔끔하게!'],
 ['S','섹시','지성','차분한 완벽주의자','여덟 손의 정리','손은 많아도 예약 시간은 하나랍니다.'],
 ['S','청순','지성','능청스러운 독설가','취향 저격','단골 할인? 단골 할증부터 들어 봤어?']];
const stats=[[45,65,45,35],[55,40,55,40],[45,25,55,65],[60,30,60,40],[65,50,40,35],[35,65,30,60],[50,25,50,65],[40,25,60,65],[35,45,70,40],[60,55,40,35]];
const STAFF=races.map((race,i)=>({id:i,race,name:names[i],stats:{lore:stats[i][0],charisma:stats[i][1],dexterity:stats[i][2],stamina:stats[i][3]},tendency:profiles[i][0],appearance:profiles[i][1],temperament:profiles[i][2],personality:profiles[i][3],trait:profiles[i][4],line:profiles[i][5],level:1,xp:0,accessories:[],affinity:0,storyStage:0,outfits:['service','party','swim','casual'],outfit:'service',wage:70}));
const NEEDS=[{id:'lore',name:'화술',detail:'재미있는 이야기와 대화를 원합니다.',line:'이 근처 재미있는 소식 없소?'},{id:'charisma',name:'품격',detail:'당당하고 품격 있는 접객을 원합니다.',line:'오늘은 대접 좀 받아 보겠소!'},{id:'stamina',name:'체력',detail:'활기찬 접객을 원합니다.',line:'밤은 긴데 벌써 지치면 안 되지!'},{id:'dexterity',name:'서비스',detail:'세심하고 능숙한 접객을 원합니다.',line:'잔도 채우고 배도 채우고. 부탁하네!'}];
const COURSES=[
 {id:'hospitality',icon:'menu-0.png',name:'접객 연습',scene:'closed',stat:'charisma',gain:4,cost:60,energy:10,motion:'greet',line:'빈 의자도 손님이라 생각하고. 자, 인사부터!'},
 {id:'cleaning',icon:'lesson-clean.png',name:'청소 실습',scene:'clean',stat:'dexterity',gain:4,cost:45,energy:12,motion:'clean',line:'반짝반짝! 손님보다 바닥이 먼저 반하겠네.'},
 {id:'role',icon:'lesson-role.png',name:'S·M 역할 놀이',scene:'practice',stat:'charisma',gain:5,cost:80,energy:14,motion:'shake',line:'오늘 대장은 누구? 지휘봉은 한 개, 왕관은 열 개!'},
 {id:'voice',icon:'icon-service.png',name:'발성·표현 연습',scene:'bedroom',stat:'lore',gain:4,cost:60,energy:8,motion:'bounce',line:'호호! 우하하! 히히! 벽 너머에서도 박수가 오네!'},
 {id:'reading',icon:'ledger.png',name:'서재 공부',scene:'study',stat:'lore',gain:5,cost:70,energy:8,motion:'read',line:'이 책은 두껍고 수강료는 더 두껍네.'},
 {id:'fitness',icon:'lesson-fitness.png',name:'체력 단련',scene:'training',stat:'stamina',gain:5,cost:65,energy:18,motion:'run',line:'하나 둘! 오늘은 잔 대신 몸을 들어 올린다!'}];
const LESSON_LEVELS=[{id:0,name:'초급',required:0,multiplier:1},{id:1,name:'중급',required:45,multiplier:1.5},{id:2,name:'상급',required:65,multiplier:2}];
const TALK_CHOICES=[{id:'listen',label:'수다 한 판',stat:'lore',gain:1,affinity:4,scene:'bedroom'}, {id:'encourage',label:'내일 뭐 하고 놀까?',stat:'charisma',gain:1,affinity:3,scene:'study'}, {id:'practice',label:'역할 바꿔 한 판',stat:'dexterity',gain:1,affinity:3,scene:'practice'}];
const TALK_RESPONSES=[
 {listen:'호호, 오늘 귀족 손님이 은화 하나를 삼십 분이나 닦더군요. 지갑도 닦아 드릴까요 했지요.',encourage:'내일은 인사를 더 우아하게. 계산서는 더 빠르게 건네겠어요.',practice:'어서 오세요. 할인은 없지만 미소는 넉넉하답니다. 자, 제법 그럴듯하죠?'},
 {listen:'오늘은 시장 아줌마가 덤을 줬어! 사장님 얼굴 보고는 다시 가져가더라. 킥킥.',encourage:'내일 목표? 팁으로 새 리본 사기! 일단 잔부터 반짝반짝 닦을게.',practice:'어서 와, 오빠! 주문은 세 개까지 기억해. 네 개부터는 종이에 써 줘.'},
 {listen:'우하하! 맥주통이 비었길래 누굴 혼낼까 했는데, 내 잔이 제일 크더군!',encourage:'내일은 한 손에 잔 네 개다! 아니, 먼저 두 개부터 해 보자.',practice:'손님, 한 잔 더? 이건 권유가 아니라 아주 훌륭한 제안이지!'},
 {listen:'오늘 깃털 하나를 주웠다며 손님이 돌려줬어. 세탁비는 안 주고! 너무하잖아.',encourage:'내일은 말 절반, 주문 기억 두 배! 근데 말 절반은 좀 어려워.',practice:'깃털처럼 가볍게 다가가서, 계산서는 묵직하게! 히히, 배웠다!'},
 {listen:'손님이 꼬리 길이만큼 할인해 달래. 그럼 계산서도 길게 늘여 드렸지.',encourage:'내일은 말을 조금 천천히 해 볼까. 손님 지갑 열리는 속도에 맞춰서.',practice:'어머, 벌써 가시려고? 마지막 한 잔은 아직 메뉴에 남아 있는데.'},
 {listen:'오늘 손님이 이 몸에게 잔을 데워 달라더군. 식탁 전체를 데울 뻔했다!',encourage:'이 몸의 목표는 완벽한 접객이다. 단, 왕좌 같은 의자는 사 줘야겠다.',practice:'어서 오너라. 편히 앉아라. 계산할 때까지는 이 몸의 귀한 손님이다!'},
 {listen:'산책 다녀오니 손님이 기다리고 있더라. 자기 차례도 산책인 줄 알고! 킥킥.',encourage:'내일은 달리기보다 걷기! 잔 들고 달리면 술이 먼저 도착하거든.',practice:'어서 와! 자리 골라 볼까? 내 꼬리 옆은 직원석이야!'},
 {listen:'설거지하다 거품이랑 헷갈렸대. 그래서 직원 명찰을 두 개 붙였어!',encourage:'내일은 컵을 안 미끄러뜨릴 거야. 손님 마음만 말랑하게 만들래.',practice:'촉촉한 접객, 깔끔한 계산! 물기 없는 영수증도 준비했지!'},
 {listen:'한 손님이 팔마다 한 잔씩 달라더군요. 그래서 여덟 잔을 계산했지요.',encourage:'내일은 주문 순서를 정확히 정리하겠어요. 손보다 메모가 더 빠를 때도 있거든요.',practice:'주문은 왼쪽부터, 계산은 오른쪽부터. 손님은 가운데서 편히 쉬세요.'},
 {listen:'비밀 메뉴 있냐고 묻길래 있다고 했지. 뭔지는 비밀이라고도 했고. 킥킥.',encourage:'내일은 농담을 조금 줄일까? 아냐, 계산 틀리는 것만 줄이자.',practice:'어서 와. 지갑은 가져왔지? 그럼 절반은 이미 성공이네.'}];
const LIFE_CONFIG={blocks:3,secondsPerBlock:5,maxTalks:2,restRecovery:45,trainingXP:30,workGain:.2};
const MENUS=[
{id:'orange',category:'drink',name:'오렌지 주스',tag:'상큼함',price:65,cost:16,icon:'menu-13.png',desc:'갓 짠 오렌지의 산뜻한 맛. 여행객에게 인기 있는 음료.'},
{id:'berry',category:'drink',name:'산딸기 주스',tag:'달콤함',price:75,cost:20,icon:'menu-14.png',desc:'향긋한 산딸기를 으깨 만든 달콤한 음료.'},
{id:'tea',category:'drink',name:'따뜻한 허브차',tag:'편안함',price:50,cost:12,icon:'menu-19.png',desc:'몸을 녹여주는 향긋한 차. 조용히 쉬고 싶은 손님에게 어울립니다.'},
{id:'cheese',category:'food',name:'숙성 치즈 접시',tag:'든든함',price:120,cost:34,icon:'menu-49.png',desc:'진한 치즈를 넉넉하게 담았습니다. 맥주와 잘 어울립니다.'},
{id:'bread',category:'food',name:'바삭한 빵 바구니',tag:'든든함',price:90,cost:22,icon:'menu-46.png',desc:'따뜻하게 구운 빵. 부담 없이 배를 채우는 메뉴.'},
{id:'fruit',category:'food',name:'계절 과일 접시',tag:'상큼함',price:105,cost:27,icon:'menu-30.png',desc:'시장에 도착한 제철 과일을 모은 산뜻한 한 접시.'},
{id:'tart',category:'food',name:'숲딸기 타르트',tag:'달콤함',price:150,cost:43,icon:'menu-63.png',desc:'바삭한 과자 위에 크림과 숲딸기를 올렸습니다.'},
{id:'ale',category:'alcohol',name:'드워프 흑맥주',tag:'진한 맛',price:125,cost:32,icon:'menu-0.png',desc:'거품이 풍성하고 깊은 맛이 나는 드워프 양조장 맥주.'},
{id:'wine',category:'alcohol',name:'붉은 포도주',tag:'향긋함',price:180,cost:52,icon:'menu-10.png',desc:'천천히 음미하기 좋은 포도주. 이야기 자리와 어울립니다.'},
{id:'cider',category:'alcohol',name:'황금 사과주',tag:'달콤함',price:145,cost:38,icon:'menu-11.png',desc:'사과 향이 남는 부드러운 술. 가볍게 마시기 좋습니다.'}
];
const REQUESTS={drink:{label:'음료',icon:'menu-13.png'},food:{label:'음식',icon:'menu-49.png'},alcohol:{label:'주류',icon:'menu-10.png'},service:{label:'서비스',icon:'icon-service.png'},extension:{label:'연장',icon:'icon-extend.png'},checkout:{label:'계산',icon:'icon-checkout.png'}};
const SERVICES=[{id:'talk',name:'허풍에 리본 달기',need:'lore',energy:3,line:'그 허풍, 리본만 달면 선물로 팔겠네! 킥킥!'},{id:'party',name:'오늘 대장은 누구?',need:'charisma',energy:6,line:'한 잔! 두 잔! 잔도 줄 서고 콧대도 줄 서네!'},{id:'care',name:'폭신폭신 한 판',need:'stamina',energy:3,line:'폭신폭신! 의자랑 너무 친해지면 데려가겠다고 하더라!'},{id:'detail',name:'수상한 소품 점검',need:'dexterity',energy:4,line:'반짝반짝! 바구니 안은 왜 달그락거리냐고? 나도 몰라! 킥킥!'}];
const GUEST_NAMES=['길드 용병','젊은 상인','순례자','견습 기사','광산 일꾼','왕도 서기관','노년 귀족','골목 장인','검술 수련생','해상 상인','여행 음악가','은퇴 기사','약초 연구자','마을 주민','떠돌이 학자','시장 중개인','궁정 사절','성문 경비병','귀족 청년','숲의 사냥꾼','도서관 조수','행상인','백발 마법사','견습 연금술사','왕실 심부름꾼','대장장이','장거리 여행객','수도원 방문객','청년 모험가','노련한 경비대장'];
const START_UNLOCKED=[0,1,2];
const CONFIG={duration:180,spawnInterval:12,maxGuests:14,waitLimit:55,unassignedLimit:55,requestLimit:70,initialCash:3000,initialStock:4,extensionFee:40};
const api={TALK_RESPONSES,COURSES,LESSON_LEVELS,TALK_CHOICES,LIFE_CONFIG,STAFF,NEEDS,MENUS,REQUESTS,SERVICES,GUEST_NAMES,START_UNLOCKED,CONFIG};root.TavernData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
