'use strict';
// 가이아(케인 2026-11-04): 여관 2층 '이들 숙소'의 아침 단련.
// 아가사가 스쿼트(Wellness-RPG 큐티너클 단련)를 하고, 그 점수만큼 길드에서 의뢰를 받아 온다.
// 길드 게시판에는 아가사가 가져온 의뢰만 올라온다(guild.js). 저녁 단련(실비아)은 아직 미정이라 여기에 없다.
// ※ 아래 수치는 모두 [임시]: 케인이 "뒤로 갈수록 의뢰는 많고, 스쿼트는 어려워진다"고 해서 길드 등급(F~S)에 맞춰 잡았다.
const SQUAT_TIER_BY_RANK=[1,1,2,2,2,3,3];      // 길드 등급 F,E,D,C,B,A,S → 박자 난이도(1 쉬움·90BPM / 2 보통·120 / 3 어려움·150)
const SQUAT_MAX_BY_RANK=[3,3,4,4,5,6,6];       // 등급별 한 번에 받아 올 수 있는 최대 의뢰 수(최대 6)
const SQUAT_MIN_RATIO=.2;                      // 이 점수 비율(만점=1) 미만이면 한 장도 못 받아 온다
const SQUAT_FULL_RATIO=.9;                     // 이 비율 이상이면 최대치
const SQUAT_LAYOUT={ds:.5,dy:0,sh:72,ss:1.5,rs:1,ry:0,cs:1,cy:0};   // 기구·받침대·링·캐릭터 배치(원본 확정값)
const SQUAT_NPC=[6.0,5.9];                      // 2층에서 아가사가 서 있는 자리(칸)
const SQUAT_TIER_NAME=['','쉬움','보통','어려움'];
let squatRoot=null,squatFrame=null,squatCur=null,squatNpcRef=null;

// 아침 = 새벽~낮 초반(하루 8분 중 약 2분 24초). 하단 시간 표시를 눌러 시간을 넘길 수도 있다.
function squatMorning(){return DAY.t>=.95||DAY.t<.25;}
function squatTier(){return SQUAT_TIER_BY_RANK[guildRank()]||1;}
function squatMax(){return SQUAT_MAX_BY_RANK[guildRank()]||3;}
function squatCount(ratio){
  if(!(ratio>=SQUAT_MIN_RATIO))return 0;
  return Math.max(1,Math.min(squatMax(),Math.round(squatMax()*Math.min(1,ratio/SQUAT_FULL_RATIO))));
}
function squatDoneToday(){guildSyncDay(false);return guildState.squatDay===guildDayKey();}

function squatSafeJson(o){return JSON.stringify(o).replace(/</g,'\\u003c');}
function squatEnsure(){
  if(squatRoot)return;
  const st=document.createElement('style');
  st.textContent='#gaiaSquat{position:fixed;inset:0;z-index:3000;background:#120a14}#gaiaSquat.hidden{display:none}'
    +'#gaiaSquat iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#2a2230}'
    +'#gaiaSquatX{position:absolute;z-index:2;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));min-width:44px;height:36px;padding:0 12px;border:1px solid #bd914a;border-radius:10px;background:#2c160af2;color:#f3e6c8;font:700 13px system-ui,sans-serif;cursor:pointer}';
  document.head.appendChild(st);
  squatRoot=document.createElement('div');squatRoot.id='gaiaSquat';squatRoot.className='hidden';
  squatFrame=document.createElement('iframe');squatFrame.setAttribute('allow','autoplay');
  const x=document.createElement('button');x.id='gaiaSquatX';x.type='button';x.textContent='나가기';
  x.addEventListener('click',()=>squatClose());
  squatRoot.append(squatFrame,x);document.body.appendChild(squatRoot);
  window.addEventListener('message',e=>{
    if(!squatCur||e.source!==squatFrame.contentWindow)return;
    const d=e.data||{};
    if(d.type==='gaia-squat-result')squatResult(d);
    else if(d.type==='gaia-squat-close')squatClose();
  });
}
function squatLaunch(){
  const S=A.gaiaSq;if(!S)return false;   // 자료(assets_private/gaia_squat)가 없는 빌드에서는 열리지 않는다
  squatEnsure();
  const tier=squatTier();
  const cfg={background:S.room||S.bgPort,backgroundL:S.room||S.bgLand,squat:{difficulty:tier,front:S.front,back:S.back,fb:6,bb:6,ball:S.ball,stand:S.stand,noFloor:true,fx:S.fx}};
  const aud=AUDIO_SETTINGS.get();
  const boot='<script>window.GAIA_SOUND_SOURCES='+squatSafeJson(S.snd)+';window.GAIA_SQ_LAYOUT='+squatSafeJson(SQUAT_LAYOUT)+';window.GAIA_SQ_SFX='+aud.sfx+';window.GAIA_SQ_BGM='+aud.sfx+';<\/script>';
  squatCur={tier,reported:false,result:null,npc:squatNpcRef};
  closeAll();panel='minigames';   // 게임이 멈추고 배경음악이 꺼진다
  squatFrame.srcdoc=S.doc.replace('/*LIFE_CONFIG*/',()=>squatSafeJson(cfg)).replace('<meta',()=>boot+'<meta');
  squatRoot.classList.remove('hidden');
  return true;
}
function squatResult(d){
  if(!squatCur||squatCur.reported)return;
  squatCur.reported=true;
  guildSyncDay(false);
  const ratio=Math.max(0,Math.min(1,+d.ratio||0)),n=squatCount(ratio);
  guildState.squatDay=guildDayKey();guildState.squatGot=n;guildState.squatRatio=ratio;
  guildCarry(n);
  squatCur.result={n,ratio,score:d.score|0};
  guildTrack();if(window.UI&&UI.save)UI.save();
}
function squatClose(){
  if(!squatCur)return;
  const c=squatCur;squatCur=null;
  if(squatFrame)squatFrame.srcdoc='';
  if(squatRoot)squatRoot.classList.add('hidden');
  if(panel==='minigames')panel=null;
  if(c.npc&&MAP==='inn2')squatTalk(c.npc);
}

// 여관방 대화 배경: 케인이 준 여관 2층 방 그림을 대화창 뒤에 깐다(대화창이 닫히면 걷힘). 이후 여관방 대화도 이 함수를 쓴다.
let squatBackdrop=null;
function squatRoomBackdrop(on){
  const S=A.gaiaSq;if(!S||!S.room)return;
  if(!squatBackdrop){
    squatBackdrop=document.createElement('div');squatBackdrop.id='gaiaRoomBg';
    squatBackdrop.style.cssText='position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .25s;background:#120a05 center/cover no-repeat;box-shadow:inset 0 0 160px #000c';
    squatBackdrop.style.backgroundImage='url('+S.room+')';
    document.body.appendChild(squatBackdrop);
    new MutationObserver(()=>{if(!$('dlg').classList.contains('on'))squatBackdrop.style.opacity='0';}).observe($('dlg'),{attributes:true,attributeFilter:['class']});
  }
  squatBackdrop.style.opacity=on?'1':'0';
}
function squatOnWorld(npcList,spotList,solidList,spriteList){
  const n=companionMarketNpc('merc_f_sword',SQUAT_NPC[0]*TS,SQUAT_NPC[1]*TS,false);if(!n)return;
  Object.assign(n,{name:'아가사',title:'여관 2층 · 아침 단련',squatHost:true,mercRoam:false,key:n.y});
  npcList.push(n);spriteList.push(n);squatNpcRef=n;
  solidList.push({x0:n.x-13,x1:n.x+13,y0:n.y-12,y1:n.y-1});
  spotList.push({name:n.name,x:n.x,y:n.y+6,r:56,kind:'npc',npc:n});
}
function squatLine(){
  const rk=guildRankName(),tier=squatTier();
  if(squatDoneToday()){
    const n=guildState.squatGot|0;
    if(n<=0)return '…죄송해요, 오늘은 박자가 영 안 맞았어요. 접수원이 의뢰서를 한 장도 안 내줬어요. 내일 아침에 다시 해 봐요.';
    if(n>=squatMax())return '어때요, 완벽했죠? 길드에서 의뢰서를 '+n+'장이나 받아 왔어요! 게시판에서 골라 가요.';
    return '길드에서 의뢰서를 '+n+'장 받아 왔어요. 게시판에서 골라 가요. 오늘 단련은 여기까지예요.';
  }
  if(!squatMorning())return '아직 몸이 덜 풀렸어요. 단련은 아침(새벽~낮 초반)에 해야 길드에서 의뢰서를 받아 올 수 있어요.';
  return '단련 시간이에요! 박자에 맞춰 스쿼트를 하면, 점수만큼 길드에서 의뢰서를 받아 올게요. 지금 길드가 '+rk+'이라 박자는 「'+SQUAT_TIER_NAME[tier]+'」, 많으면 '+squatMax()+'장까지예요.';
}
function squatTalk(n){
  talking=n;openDlg(n);
  const done=squatDoneToday(),morning=squatMorning();
  const dp=(A.gaiaDlg&&A.gaiaDlg.agatha)||(A.gaiaKit&&A.gaiaKit.port_agatha);if(dp)$('dlgImg').src=dp;
  squatRoomBackdrop(true);
  $('dlgName').textContent='아가사';$('dlgTitle').textContent='여관 2층 · 아침 단련';
  $('dlgLine').textContent=squatLine();
  const b=$('dlgTrade');b.hidden=false;
  b.textContent=!A.gaiaSq?'단련 자료 없음':done?'오늘 단련은 끝':morning?'단련 시작':'단련은 아침에만';
  b.disabled=!A.gaiaSq||done||!morning;
  return true;
}
function squatStart(){
  if(MAP!=='inn2'||squatDoneToday()||!squatMorning())return false;
  return squatLaunch();
}
window.GAIA_SQUAT={
  talk:squatTalk,start:squatStart,roomBackdrop:squatRoomBackdrop,onWorld:squatOnWorld,morning:squatMorning,doneToday:squatDoneToday,
  count:squatCount,tier:squatTier,max:squatMax,
  state:()=>({open:!!squatCur,day:guildState.squatDay,got:guildState.squatGot,ratio:guildState.squatRatio,tier:squatTier(),max:squatMax()}),
  debugResult(ratio){if(!squatCur)return false;squatResult({ratio,score:Math.round(ratio*1000)});return squatCur.result;}   // 시험용: 게임을 치르지 않고 결과만 넣는다
};
