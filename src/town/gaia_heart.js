'use strict';
// 가이아(케인 2026-11-05): 여관 2층 실비아의 저녁 치유.
// 밤(저녁~새벽)에 실비아와 하트 터치 미니게임을 하면, 두 게이지(정면 핑크·후면 M)의 평균만큼 체력·마나가 치유된다.
// 여관의 치유 기능(1층 유료 휴식, 방에 들어서면 차던 것)이 없어져서 이것이 유일한 여관 치유다. 게임 속 밤마다 1회.
// 박자(90/120/150 BPM)·배경음·효과음은 스쿼트(gaia_squat.js)와 같은 자료와 같은 길드 등급 난이도를 쓴다.
// 게임 문서는 gaia_heart_doc.html, 그림은 assets_private/gaia_heart(속옷 차림이라 공개 저장소에 올리지 않음).
// ※ 대사·수치는 모두 [임시]: 케인이 고친다.
const HEART_NPC=[9.0,5.5];          // 2층에서 실비아가 서 있는 자리(칸)
const HEART_MIN=.2;                 // 하나도 못 터뜨려도 이만큼은 치유된다
const HEART_NIGHT_FROM=.63;         // DAY.t 가 이 값 이상이거나 아침(.08) 전이면 밤(저녁~새벽)
let heartRoot=null,heartFrame=null,heartCur=null,heartNpcRef=null;

function heartIsNight(){const t=DAY.t;return t>=HEART_NIGHT_FROM||t<.08;}
// 밤은 하루 경계(자정)를 걸치므로 '그 밤이 시작된 날'로 센다(한 밤에 두 번 못 함)
function heartKey(){return 'n'+((guildState.gday|0)-(DAY.t<.08?1:0));}
function heartDoneToday(){return guildState.heartDay===heartKey();}

function heartEnsure(){
  if(heartRoot)return;
  const st=document.createElement('style');
  st.textContent='#gaiaHeart{position:fixed;inset:0;z-index:3000;background:#120a14}#gaiaHeart.hidden{display:none}'
    +'#gaiaHeart iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#1d1424}'
    +'#gaiaHeartX{position:absolute;z-index:2;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));min-width:44px;height:36px;padding:0 12px;border:1px solid #bd914a;border-radius:10px;background:#2c160af2;color:#f3e6c8;font:700 13px system-ui,sans-serif}';
  document.head.appendChild(st);
  heartRoot=document.createElement('div');heartRoot.id='gaiaHeart';heartRoot.className='hidden';
  heartFrame=document.createElement('iframe');heartFrame.setAttribute('allow','autoplay');
  const x=document.createElement('button');x.id='gaiaHeartX';x.type='button';x.textContent='나가기';
  x.addEventListener('click',()=>heartClose());
  heartRoot.append(heartFrame,x);document.body.appendChild(heartRoot);
  window.addEventListener('message',e=>{
    if(!heartCur||e.source!==heartFrame.contentWindow)return;
    const d=e.data||{};
    if(d.type==='gaia-heart-result')heartResult(d);
    else if(d.type==='gaia-heart-close')heartClose();
  });
}
function heartLaunch(){
  const H=A.gaiaHeart,S=A.gaiaSq;if(!H||!S)return false;   // 자료(assets_private)가 없는 빌드에서는 열리지 않는다
  heartEnsure();
  const tier=squatTier(),cfg={tier,bg:S.room||S.bgPort,front:H.front,back:H.back,minRatio:HEART_MIN};
  const aud=AUDIO_SETTINGS.get();
  const snd=Object.assign({},S.snd,{sylvia_hit:H.hit});
  const boot='<script>window.GAIA_SOUND_SOURCES='+squatSafeJson(snd)+';window.GAIA_HT_SFX='+aud.sfx+';window.GAIA_HT_BGM='+aud.sfx+';<\/script>';
  heartCur={tier,reported:false,result:null,npc:heartNpcRef};
  closeAll();panel='minigames';   // 게임이 멈추고 배경음악이 꺼진다
  heartFrame.srcdoc=H.doc.replace('/*HEART_CONFIG*/',()=>squatSafeJson(cfg)).replace('<meta',()=>boot+'<meta');
  heartRoot.classList.remove('hidden');
  return true;
}
function heartHeal(ratio){
  const r=Math.max(HEART_MIN,Math.min(1,ratio));
  P.hp=Math.min(P.maxHp,P.hp+Math.round(P.maxHp*r));P.mp=Math.min(P.maxMp,P.mp+Math.round(P.maxMp*r));P.mpAcc=0;
  if(r>=.5&&typeof PLAYER_STATUS!=='undefined')for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
  if(window.GAIA_PARTY&&GAIA_PARTY.members){for(const c of GAIA_PARTY.members()){if(!c)continue;c.hp=Math.min(c.maxHp,c.hp+Math.round(c.maxHp*r));c.mp=Math.min(c.maxMp,c.mp+Math.round(c.maxMp*r));}}
  syncBars();
  return r;
}
function heartResult(d){
  if(!heartCur||heartCur.reported)return;
  heartCur.reported=true;
  const avg=Math.max(0,Math.min(1,+d.ratio||0)),r=heartHeal(avg);
  guildState.heartDay=heartKey();guildState.heartRatio=avg;
  heartCur.result={ratio:avg,heal:r};
  if(window.UI&&UI.save)UI.save();
}
function heartClose(){
  if(!heartCur)return;
  const c=heartCur;heartCur=null;
  if(heartFrame)heartFrame.srcdoc='';
  if(heartRoot)heartRoot.classList.add('hidden');
  if(panel==='minigames')panel=null;
  if(c.npc&&MAP==='inn2')heartTalk(c.npc);
}

function heartOnWorld(npcList,spotList,solidList,spriteList){
  const n=companionMarketNpc('merc_f_mage',HEART_NPC[0]*TS,HEART_NPC[1]*TS,false);if(!n)return;
  Object.assign(n,{name:'실비아',title:'여관 2층 · 저녁 치유',heartHost:true,mercRoam:true,mercSpeed:16,mercRange:62,mercRangeY:40,mercWaitMin:2.5,mercWaitMax:6,key:n.y});   // 케인 2026-11-05: 서 있지 않고 천천히·좁게 돌아다닌다(너무 돌아다니면 말을 걸기 어렵다)
  npcList.push(n);spriteList.push(n);heartNpcRef=n;
  spotList.push({name:n.name,x:n.x,y:n.y+6,r:56,kind:'npc',npc:n});
}
function heartLine(){
  if(heartDoneToday()){
    const a=guildState.heartRatio||0;
    return a>=.8?'어때요, 많이 개운해졌죠? 오늘 밤은 여기까지예요. 다음 밤에 또 와요.'   // [임시]
      :'오늘은 이만큼만 풀어 드릴게요. 무리하지 말아요. 다음 밤에 또 와요.';              // [임시]
  }
  if(!heartIsNight())return '아직 해가 높아요. 해가 지고 나서 와요. 그때 몸을 풀어 드릴게요.';   // [임시]
  return '하루 고생했어요. 여기 앉아요. 떠오르는 하트를 터뜨릴수록 더 개운해질 거예요. 지금 길드가 '+guildRankName()+'이라 박자는 「'+SQUAT_TIER_NAME[squatTier()]+'」이에요.';   // [임시]
}
function heartTalk(n){
  talking=n;openDlg(n);
  const done=heartDoneToday(),night=heartIsNight();
  const U=A.gaiaDlgU&&A.gaiaDlgU.sylvia,dp=(U&&(U.talk_staff||U.talk))||(A.gaiaDlg&&A.gaiaDlg.sylvia);if(dp)$('dlgImg').src=dp;   // 여관 2층 = 속옷 차림(없으면 일상복)
  if(window.GAIA_SQUAT)GAIA_SQUAT.roomBackdrop(true);
  $('dlgName').textContent='실비아';$('dlgTitle').textContent='여관 2층 · 저녁 치유';
  $('dlgLine').textContent=heartLine();
  const b=$('dlgTrade');b.hidden=false;
  b.textContent=!(A.gaiaHeart&&A.gaiaSq)?'치유 자료 없음':done?'오늘 치유는 끝':!night?'밤에 열려요':'치유 시작';
  b.disabled=!(A.gaiaHeart&&A.gaiaSq)||done||!night;
  return true;
}
function heartStart(){
  if(MAP!=='inn2'||heartDoneToday()||!heartIsNight())return false;
  return heartLaunch();
}
window.GAIA_HEART={
  npcPos:()=>heartNpcRef?{x:heartNpcRef.x,y:heartNpcRef.y}:null,   // 시험용: 돌아다니는 NPC의 지금 자리
  talk:heartTalk,start:heartStart,onWorld:heartOnWorld,isNight:heartIsNight,doneToday:heartDoneToday,min:HEART_MIN,
  state:()=>({open:!!heartCur,key:heartKey(),done:heartDoneToday(),night:heartIsNight(),day:guildState.heartDay,ratio:guildState.heartRatio}),
  debugResult(ratio){if(!heartCur)return false;heartResult({ratio});return heartCur.result;}   // 시험용: 게임을 치르지 않고 결과만 넣는다
};
