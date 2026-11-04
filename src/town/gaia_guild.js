'use strict';
// 가이아(케인 2026-11-04): 모험가 길드는 걸어 들어가는 실내다(여관과 같은 방식).
// 마을의 길드 홀 문으로 들어가면 접수원이 접수대에 서 있고, 길드장 하르트는 안쪽 책상에 있다. 용병들이 홀을 오간다.
// 의뢰 게시판은 실내 벽에 걸려 있고(이름 '의뢰 게시판' → GUILD.open), 접수원·하르트에게 말을 걸어도 같은 의뢰창이 열린다.
// ※ 접수원 대사는 모두 [임시]: 케인이 정해 주신 말투가 아직 없어서 기능 안내만 적었다(이름도 아직 '접수원').
const GUILD_RECEP_POS=[7.85,4.05];        // SD 접수원이 서는 자리(칸): 접수대 앞 오른쪽(케인이 합성해 보여 준 위치)
const GUILD_COUNTER_POS=[7.0,4.2];        // SD 그림이 없을 때만 쓰는 말 거는 자리
const GUILD_HART_POS=[9.2,4.2];           // 안쪽 책상 옆(칸)
const GUILD_DOOR_FALLBACK=[1104,640];     // 길드 홀 문 앞(마을 좌표). 돌아갈 곳을 모를 때만 쓴다.
let guildReturn=null,guildBackdrop=null;

function guildHallEnter(){
  if(MAP!=='town'||!MAPS.guild)return false;
  const st=typeof locationState==='function'?locationState():{map:MAP,x:P.x,y:P.y,dir:P.dir||'front'};
  guildReturn={...st,x:P.x,y:P.y,dir:P.dir||'front'};
  return travel('guild',MAPS.guild.spawn,'back');
}
function guildHallLeave(){
  closeAll();if(MAP!=='guild')return false;
  const r=guildHallReturnState();
  return travel(r.map||'town',[r.x,r.y],r.dir||'front');
}
function guildHallReturnState(){
  return guildReturn?{...guildReturn}:{map:'town',x:GUILD_DOOR_FALLBACK[0],y:GUILD_DOOR_FALLBACK[1],dir:'front'};
}

// 접수원 대화 배경: 길드 접수대 그림이 있으면 대화창 뒤에 깐다(여관방 대화와 같은 방식, 대화창이 닫히면 걷힘).
function guildRoomBackdrop(on){
  const room=A.gaiaGuild&&A.gaiaGuild.room;if(!room)return;
  if(!guildBackdrop){
    guildBackdrop=document.createElement('div');guildBackdrop.id='gaiaGuildBg';
    guildBackdrop.style.cssText='position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity .25s;background:#120a05 center/cover no-repeat;box-shadow:inset 0 0 160px #000c';
    guildBackdrop.style.backgroundImage='url('+room+')';
    document.body.appendChild(guildBackdrop);
    new MutationObserver(()=>{if(!$('dlg').classList.contains('on'))guildBackdrop.style.opacity='0';}).observe($('dlg'),{attributes:true,attributeFilter:['class']});
  }
  guildBackdrop.style.opacity=on?'1':'0';
}
function guildRecepLine(){
  guildSyncDay(false);
  const done=guildState.squatDay===guildDayKey(),n=guildState.squatGot|0;
  if(done&&n>0)return '아가사 님이 의뢰서를 '+n+'장 받아 가셨어요. 게시판에서 골라 가세요.';
  if(done)return '오늘은 아가사 님 박자가 조금 어긋나서 의뢰서를 못 드렸어요. 내일 아침에 다시 오세요.';
  return '아직 오늘 의뢰서는 안 나갔어요. 아침에 아가사 님이 단련을 마치시면 점수만큼 내어 드릴게요.';
}
function guildRecepTalk(n){
  openDlg(n);   // 이름·말풍선 틀은 기본 대화창을 쓰고 아래에서 접수원 것으로 덮는다
  const dp=A.gaiaDlg&&A.gaiaDlg.receptionist;if(dp)$('dlgImg').src=dp;
  guildRoomBackdrop(true);
  $('dlgName').textContent=n.name;$('dlgTitle').textContent=n.title;
  $('dlgLine').textContent=guildRecepLine();
  const b=$('dlgTrade');b.hidden=false;b.disabled=false;b.textContent='의뢰 보기';
  return true;
}

function guildHallOnWorld(npcList,spotList,solidList,spriteList){
  const rc=A.gaiaGuild&&A.gaiaGuild.recep;
  if(rc&&rc.has){
    // 세계에는 SD 접수원(rc.k)이 서고, 말을 걸면 대화창에 큰 초상이 나온다(케인 2026-11-04). SD 그림이 없는 빌드에서는 접수대 앞 자리에서만 말을 걸 수 있다.
    const pos=rc.k?GUILD_RECEP_POS:GUILD_COUNTER_POS,x=pos[0]*TS,y=pos[1]*TS;
    const n={k:rc.k||'guild_recep',no:0,name:'접수원',title:'모험가 길드 · 접수대',x,y,w:rc.w||0,h:rc.h||0,line:guildRecepLine(),shop:'guild',at:null,guildHost:true,
      img:rc.k?BI[rc.k]:null,ph:Math.random()*7,key:y};
    if(rc.k){npcList.push(n);spriteList.push(n);solidList.push({x0:n.x-13,x1:n.x+13,y0:n.y-12,y1:n.y-1});}
    spotList.push({name:n.name,x:n.x,y:n.y+6,r:56,kind:'npc',npc:n});
  }
  const hb=(A.npcs||[]).find(v=>v.shop==='guild'&&v.name==='하르트');
  if(hb){
    const x=GUILD_HART_POS[0]*TS,y=GUILD_HART_POS[1]*TS;
    const n={...hb,x,y,at:null,img:BI[hb.k],ph:Math.random()*7,key:y};
    npcList.push(n);spriteList.push(n);
    solidList.push({x0:n.x-13,x1:n.x+13,y0:n.y-12,y1:n.y-1});
    spotList.push({name:n.name,x:n.x,y:n.y+6,r:50,kind:'npc',npc:n});
  }
  spotList.push({name:'출입문',x:7*TS,y:9.0*TS,r:58,kind:'guild_exit'});
}
window.GAIA_GUILD={
  enter:guildHallEnter,leave:guildHallLeave,returnState:guildHallReturnState,talk:guildRecepTalk,onWorld:guildHallOnWorld,backdrop:guildRoomBackdrop,
  state:()=>({map:MAP,x:P.x,y:P.y,returnState:guildHallReturnState()})
};
