(function(root){'use strict';
// Race drives the physical gag; personality and tendency drive the dialogue.
const regular=[
 {name:'귀족의 명령 놀이',ask:'오늘은 내가 주인님이지?',reply:'호호, 명령은 또박또박 부탁드려요.',pattern:'bow'},
 {name:'전속 비서 체험',ask:'오빠라고 불러줄 수 있나?',reply:'오빠! 자, 주문은 크게 말해봐! 킥킥!',pattern:'dash'},
 {name:'술통 대장의 명령',ask:'오늘은 내가 대장이다!',reply:'우하하! 그 목소리로 대장 하겠어? 배에 힘 줘!',pattern:'bounce'},
 {name:'깃털 마사지',ask:'살살 부탁해! 깃털로!',reply:'히히! 살살도 날개 두 개 분량이야!',pattern:'feather'},
 {name:'꼬리의 유혹',ask:'여왕님, 꽉 잡아주세요!',reply:'어머, 꼬리 한 바퀴부터 갈까?',pattern:'spin'},
 {name:'용왕의 시종 체험',ask:'여왕님! 오늘은 시종으로 받아주세요!',reply:'좋다! 이 수컷, 기세는 합격이다!',pattern:'launch'},
 {name:'산책 갈까?',ask:'산책도 해주는 접객이 있다고?!',reply:'좋아! 내 보폭에 맞춰! 뛰어!',pattern:'dash'},
 {name:'촉촉 보습 세안',ask:'최고급 보습으로 부탁하지!',reply:'응! 빈틈없이 촉촉하게! 뿅!',pattern:'puddle'},
 {name:'실크 리본 체험',ask:'여왕님! 오늘은 선물처럼 묶어주세요!',reply:'좋아요. 리본은 제가 고를게요.',pattern:'cocoon'},
 {name:'달빛의 주인님 놀이',ask:'오늘은 나한테 명령해줘!',reply:'이 수컷, 입은 잠깐 쉬고 귀부터 열어봐. 킥킥!',pattern:'stone'}
];
const endings=['호호, 주인님! 다음 명령은 다음 잔과 함께요.','오빠, 정신은 챙기고 잔은 내려놔! 킥킥!','우하하! 대장님 목소리, 이제 좀 들리는구만!','히히! 칭찬 세 번! 하나도 빼먹지 마!','어머, 얼굴까지 리본 색깔이 됐네?','왕실 접객이 마음에 들었느냐!','잘 따라왔네! 주인님도 운동은 해야지!','뿅! 보습 끝! 이제 내 간식 시간!','매듭 풀렸어요. 아직 선물인 척하지 않아도 돼요.','킥킥! 그렇게 좋아? 다음에도 내 말 잘 듣고.'];
// Thirty portraits reuse nine supplied SD bodies by guest occupation.
const guestBodies=[2,3,4,6,1,4,5,3,0,3,0,7,4,1,4,3,5,2,0,8,4,3,5,4,6,1,8,4,0,7];
function courseScene(e,game){const s=game.staff[e.staffId],c=root.TavernSpecial.courses.find(c=>c.id===e.courseId);const base=regular[s.id];return {...base,name:c?.title||base.name,ask:s.tendency==='S'?'여왕님! 「'+(c?.title||base.name)+'」 부탁합니다!':'오늘은 내가 주인님! 「'+(c?.title||base.name)+'」!',reply:c?.line||base.reply};}
function tapScene(e,game){const effect=game.specialAt(e.tableId);if(!effect)return null;const s=game.staff[effect.staffId],stage=effect.stage,n=e.clicks;let pattern;
if(stage===3)pattern=['camera','launch','dash'][(n-1)%3];else if(s.race==='spider')pattern=n%2?'cocoon':'launch';else if(s.race==='slime')pattern=n%2?'puddle':'paper';else if(s.race==='beast'||s.race==='harpy')pattern=n%2?'dash':'feather';else pattern=['head','launch','bounce','paper'][(n-1)%4];
let ask=s.tendency==='S'?['으악! 채찍 백만 대다?!','여왕님! 나 날아간다아!','으하하! 잠깐! 왕좌가 돌아가!','나 아직 여기 있어요!'][((n-1)%4)]:['주인님도 운동하는 코스였어?!','내 팔이 먼저 퇴근하겠어!','우하하! 숫자가 너무 큰데?!','잠깐! 내가 지시하는 쪽 맞지?!'][((n-1)%4)];
if(s.id===4&&s.tendency==='S')ask=['으악! 꼬리 백만 바퀴?!','여왕님! 나 회전한다아!','한 바퀴 더라고?!','리본까지?!'][(n-1)%4];
if(s.id===8&&s.tendency==='S')ask=['으악! 거미줄 백만 겹?!','여왕님! 내가 선물꾸러미가 됐어!','이 리본! 끝이 없잖아!','으악! 나 굴러간다!'][(n-1)%4];
if(s.id===9&&s.tendency==='S')ask=['으악! 명령이 백만 개야?!','주인님! 내 귀가 먼저 항복했어!','알겠습니다! 네! 네!','잠깐! 명령이 또 왔다!'][(n-1)%4];
return {pattern,ask,reply:s.id===2?'우하하! 기합부터 더 크게!':s.id===7?'뿅! 나 다시 뭉쳤어!':s.id===5?'왕실 코스다! 숫자도 왕실 규모지!':s.id===6?'주인님! 잘 따라와!':s.id===3?'히히! 내 칭찬은 백만 번이야!':s.tendency==='S'?'킥킥! 주문은 네가 했잖아!':'호호! 주인님, 아직 한참 남았어요!',effect};}
root.TavernSceneData={regular,endings,guestBodies,courseScene,tapScene};
})(window);
