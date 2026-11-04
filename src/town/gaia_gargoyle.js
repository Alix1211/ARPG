'use strict';
// 가이아(케인 2026-11-04): 가고일(5단계 던전 정예, 최소 Lv49) 1회성 이벤트 두 번.
//  ① 처음 마주쳤을 때(가까이 다가왔을 때) 짧은 대화  ② 처음 쓰러뜨렸을 때 짧은 대화 + 희귀(노란색) 검 1자루가 그 자리에 떨어진다.
// 원본 소설(가고일 둥지·엘프 장인의 단검·실비아 나이 들통)을 퀘스트 없이 1회성 이벤트로 줄인 것. 대화 중에는 전투가 멈춘다.
// 한 번 일어나면 다시 나오지 않는다(저장: QUEST flags). 대사는 전부 [임시] — 케인이 고친다.
const GARG_SEE_DIST=360;
const GARG_LINES_SEE=[   // [임시]
  ['실비아','카일 님, 저 석상…… 방금 눈이 움직이지 않았습니까? 날개가 달린 정예 가고일 같습니다.'],
  ['아가사','제, 제가 먼저 들이받겠습니다!! 무서워서 떠는 것이 아니라 영광이라서 떠는 것입니다!!'],
  ['카일','침착해. 아가사가 앞, 실비아 씨는 뒤. 날개부터 꺾는다.']];
const GARG_LINES_KILL=[  // [임시]
  ['아가사','수고하셨습니다!! 감사합니다!!!'],
  ['실비아','카일 님, 둥지 바닥에 검이 한 자루 떨어져 있습니다. 손잡이에 오래된 엘프 각인이 있습니다. 이 서체는 200년 전 장인들이 쓰던 것입니다.'],
  ['카일','200년 전? 실비아 씨, 100살 좀 넘었다면서 그걸 어떻게 알아?'],
  ['실비아','저, 전해 들은 것입니다!! 저는 늙은 사람이 아닙니다!! 정말로 풍문으로만 들었습니다!!'],
  ['아가사','카일 님, 실비아 언니 귀가 새빨개졌습니다!'],
  ['카일','그만 놀려. 검은 내가 챙긴다. 쓸 만해 보여.']];
function gargFlags(){return mainQuestState.flags||(mainQuestState.flags={});}
function gargPort(who){
  if(who==='카일')return GAIA_KYLE_PORT()||A.face;
  const d=A.gaiaDlg||{};return (who==='아가사'?d.agatha:d.sylvia)||A.face;
}
function gargOpen(lines){
  if(!lines.length)return;
  let i=0;
  const showLine=()=>{
    const [who,t]=lines[i];
    $('dlgImg').src=gargPort(who);$('dlgName').textContent=who;$('dlgTitle').textContent='';
    $('dlgLine').classList.remove('narr');$('dlgLine').textContent=t;
    $('dlgQuest').textContent=i<lines.length-1?'다음':'확인';
  };
  window.GAIA_EVENT_PAUSE=true;talking=null;
  show('dlg');$('dlgMainRow').hidden=false;$('dlgInnRow').hidden=true;$('dlgTrade').hidden=true;$('dlgTalk').hidden=true;$('dlgQuest').hidden=false;
  showLine();
  $('dlgQuest').onclick=()=>{if(++i<lines.length){showLine();return;}closeAll();};
}
function gargTick(simPaused){
  // 대화가 닫혔는데 멈춤이 남아 있으면 푼다(중간에 X로 닫은 경우 포함)
  if(window.GAIA_EVENT_PAUSE&&!$('dlg').classList.contains('on'))window.GAIA_EVENT_PAUSE=false;
  if(simPaused||panel||traveling)return;
  if(gargFlags().gargSee)return;
  if(typeof combatMap!=='function'||!combatMap())return;
  for(const m of monsters){
    if(m.dead||m.removed||m.family!=='gargoyle')continue;
    if(Math.hypot(m.x-P.x,m.y-P.y)>GARG_SEE_DIST)continue;
    gargFlags().gargSee=1;if(window.UI&&UI.save)UI.save();
    gargOpen(GARG_LINES_SEE);return;
  }
}
function gargOnKill(m){
  if(!m||m.family!=='gargoyle'||gargFlags().gargKill)return;
  gargFlags().gargKill=1;gargFlags().gargSee=1;
  const it=window.UI?UI.make({kind:'weapon',wt:'sword',tier:monsterTier(m),rank:m.rank,roll:true,rar:2}):null;   // 희귀(노란색) 검
  if(it)dropsLoot.push({kind:'item',x:m.x,y:m.y+6,item:it,ph:Math.random()*7});
  if(window.UI&&UI.save)UI.save();
  setTimeout(()=>{if(!panel)gargOpen(GARG_LINES_KILL);},450);   // 쓰러지는 연출을 잠깐 본 뒤
}
window.GAIA_GARGOYLE={tick:gargTick,onKill:gargOnKill,
  state:()=>({see:!!gargFlags().gargSee,kill:!!gargFlags().gargKill,paused:!!window.GAIA_EVENT_PAUSE,swords:dropsLoot.filter(d=>d.kind==='item'&&d.item&&d.item.rar===2&&d.item.wt==='sword').length}),
  debugReset(){delete gargFlags().gargSee;delete gargFlags().gargKill;},
  debugSpawn(dx){const m=createMonster('gargoyle',P.x+(dx||200),P.y,{});monsters.push(m);return m.type;},
  debugKill(m){gargOnKill(m);}};
