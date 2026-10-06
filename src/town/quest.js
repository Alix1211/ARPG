// 스토리 퀘스트 엔진. 제목·인물별 대사·진행 데이터는 봉인 JSON에만 둔다.
const MAIN_QUESTS=A.mainQuests.quests||[];
const SIDE_QUESTS=A.mainQuests.sideQuests||[];
const ALL_QUESTS=[...MAIN_QUESTS,...SIDE_QUESTS];
let mainQuestState={active:{},completed:[],items:{},visited:[],flags:{}};
let questDialog=null,questWorldKey='',questUiDirty=true;
const questDef=id=>ALL_QUESTS.find(q=>q.id===id);
const questKind=q=>(q&&q.kind)||((q&&String(q.id).startsWith('MAIN_'))?'main':'side');
const questStep=q=>q&&mainQuestState.active[q.id]?q.steps[mainQuestState.active[q.id].step]:null;
const questNpc=no=>npcs.find(n=>n.no===no||n.k==='npc_'+String(no).padStart(2,'0'));
function questSave(){questUiDirty=true;questRefreshWorld();questRender();if(window.UI&&UI.save)UI.save();}
function questAvailable(q){
  const s=q.start||{},main=questKind(q)==='main';
  return !mainQuestState.completed.includes(q.id)&&!mainQuestState.active[q.id]&&(main||P.lv>=(s.level||1))&&
    (!s.previous||mainQuestState.completed.includes(s.previous))&&(!s.visit||mainQuestState.visited.includes(s.visit));
}
function questMapMatches(s){
  if(!s)return true;
  if(s.map&&s.map!==MAP)return false;
  if(s.floor&&!(MAP==='dungeon'&&window.__DUN&&__DUN.state().floor===s.floor))return false;
  if(s.market){
    const m=CUR&&CUR.market?CUR.market:(MAP==='town'?'town':null);
    if(m!==s.market)return false;
  }
  if(s.leg&&!(MAP==='field'&&window.__FD&&__FD.state().leg===s.leg))return false;
  return true;
}
function questNpcAction(n){
  if(!n)return null;
  for(const q of ALL_QUESTS){
    const s=questStep(q);
    if(s&&['talk','deliver'].includes(s.type)&&n.no===s.npc&&questMapMatches(s))return {q,step:s,start:false};
  }
  for(const q of ALL_QUESTS)if(mainQuestState.active[q.id]&&q.start.npc===n.no)return {q,step:questStep(q),start:false,waiting:true};
  for(const q of ALL_QUESTS)if(questAvailable(q)&&q.start.npc===n.no&&(questMapMatches(q.start)||n.questStartAlias===q.start.map))return {q,start:true};
  return null;
}
function questMarker(n){const a=questNpcAction(n);return a?(a.start?'!':'?'):'';}
function questMiniTargets(){
  const out=[],seen=new Set();
  const add=(x,y,id,kind)=>{
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const k=Math.round(x)+':'+Math.round(y);
    if(seen.has(k))return;seen.add(k);
    out.push({x,y,id,kind});
  };
  let activeMain=false;
  for(const q of ALL_QUESTS){
    if(!mainQuestState.active[q.id])continue;
    if(questKind(q)==='main')activeMain=true;
    const s=questStep(q);if(!s)continue;
    if(['talk','deliver'].includes(s.type)&&questMapMatches(s)){
      const n=questNpc(s.npc);if(n)add(n.x,n.y,q.id,'npc');
      continue;
    }
    if(s.point&&questMapMatches(s.point)){
      const p=questPoint(s);if(p)add(p.x,p.y,q.id,'point');
    }
  }
  if(!activeMain){
    const next=MAIN_QUESTS.find(q=>questAvailable(q));
    if(next){
      const n=questNpc(next.start.npc);
      if(n&&(questMapMatches(next.start)||n.questStartAlias===next.start.map))add(n.x,n.y,next.id,'start');
    }
  }
  return out;
}
function questAccept(id){
  const q=questDef(id),n=q&&questNpc(q.start.npc);
  if(!q||!questAvailable(q)||!n||!(questMapMatches(q.start)||n.questStartAlias===q.start.map)||Math.hypot(P.x-n.x,P.y-n.y)>90)return false;
  const reward=JSON.parse(JSON.stringify(q.reward||{}));
  reward.exp=Math.max(1,Math.round(expNeed(P.lv)*(reward.expRatio||(questKind(q)==='main'?.32:.18))));
  mainQuestState.active[id]={step:0,progress:0,reward};questSave();questCheckVisit();return true;
}
function questAdvance(q){
  const a=mainQuestState.active[q.id];if(!a)return false;
  const s=questStep(q);if(s&&s.give)for(const [id,n] of Object.entries(s.give))mainQuestState.items[id]=(mainQuestState.items[id]||0)+n;
  a.step++;a.progress=0;
  if(a.step>=q.steps.length)return questComplete(q);
  questSave();questCheckVisit();return true;
}
function questComplete(q){
  const a=mainQuestState.active[q.id];if(!a||a.step<q.steps.length||mainQuestState.completed.includes(q.id))return false;
  const r=a.reward;delete mainQuestState.active[q.id];mainQuestState.completed.push(q.id);
  if(q.effects&&q.effects.flags)for(const [k,v] of Object.entries(q.effects.flags))mainQuestState.flags[k]=v;
  setGold(P.gold+(r.gold||0));gainExp(r.exp||0);
  if(window.UI){
    for(const [k,n] of Object.entries(r.potions||{}))UI.addPotion(k,n);
    if(r.item&&!UI.add(UI.make(r.item))){setGold(P.gold+50);say('가방이 가득 차 장비 대신 50G를 받았습니다.');}
  }
  questSave();return true;
}
function questDecorateDialog(n){
  questDialog=null;
  const btn=$('dlgQuest'),a=questNpcAction(n);btn.hidden=!a;
  if(!a)return;
  const main=questKind(a.q)==='main';
  btn.textContent=a.start?(main?'★ 이야기 수락':'◇ 의뢰 수락'):(a.waiting?(main?'★ 진행 확인':'◇ 진행 확인'):(main?'★ 이야기 진행':'◇ 의뢰 진행'));
  btn.onclick=()=>questBeginDialog(n,a);
}
function questBeginDialog(n,a){
  if(Math.hypot(P.x-n.x,P.y-n.y)>90)return false;
  if(a.waiting){$('dlgLine').textContent=questObjective(a.q);$('dlgQuest').textContent='확인';$('dlgQuest').onclick=closeAll;return true;}
  const s=a.step;
  if(s&&s.type==='deliver'&&(mainQuestState.items[s.item]||0)<(s.need||1)){say('전달할 물품이 부족합니다.');return false;}
  questDialog={id:a.q.id,npc:n.no,start:a.start,step:mainQuestState.active[a.q.id]?.step,index:0,lines:a.start?a.q.intro:(s.lines||[])};
  $('dlgTrade').hidden=true;$('dlgTalk').hidden=true;
  $('dlgLine').textContent=questDialog.lines[0]||'';
  $('dlgQuest').textContent='다음';$('dlgQuest').onclick=questNextDialog;return true;
}
function questNextDialog(){
  const d=questDialog,q=d&&questDef(d.id),n=d&&questNpc(d.npc);
  if(!d||!q||!n||Math.hypot(P.x-n.x,P.y-n.y)>90)return false;
  if(++d.index<d.lines.length){$('dlgLine').textContent=d.lines[d.index];return true;}
  questDialog=null;
  let ok=false;
  if(d.start)ok=questAccept(q.id);
  else{
    const a=mainQuestState.active[q.id],s=questStep(q);
    if(a&&a.step===d.step&&s&&s.npc===n.no){
      if(s.type==='deliver'){
        const count=s.need||1;
        if((mainQuestState.items[s.item]||0)<count)return false;
        mainQuestState.items[s.item]-=count;
      }
      ok=questAdvance(q);
    }
  }
  closeAll();return ok;
}
function questOnKill(m){
  if(!m||m.dead!==true)return;
  for(const q of ALL_QUESTS){const s=questStep(q),a=mainQuestState.active[q.id];
    if(!s||!a||!questMapMatches(s))continue;
    if(s.type==='kill'&&(!s.target||s.target===m.type||s.target===m.family)){
      a.progress=Math.min(s.need||1,a.progress+1);if(a.progress>=(s.need||1))questAdvance(q);else questSave();
    }else if(s.type==='boss'&&m.boss){
      a.progress=1;questAdvance(q);
    }
  }
}
function questEventMatches(s,name,data){
  if(!s||s.type!=='event'||s.event!==name)return false;
  const f=s.filter||{};
  for(const [k,v] of Object.entries(f)){
    if(k==='profitPositive'){if(v&&!(Number(data.profit)>0))return false;continue;}
    if(data[k]!==v)return false;
  }
  return true;
}
function questOnEvent(name,data={}){
  let changed=false;
  for(const q of ALL_QUESTS){
    const s=questStep(q),a=mainQuestState.active[q.id];
    if(!a||!questEventMatches(s,name,data))continue;
    a.progress=Math.min(s.need||1,(a.progress||0)+(data.count||1));
    changed=true;
    if(a.progress>=(s.need||1))questAdvance(q);else questSave();
  }
  return changed;
}
function questCheckVisit(){
  let changed=false;
  const market=CUR&&CUR.market?':'+CUR.market:'';
  const key=(MAP==='dungeon'&&window.__DUN?'dungeon:'+__DUN.state().floor:MAP)+market;
  if(!mainQuestState.visited.includes(key)){mainQuestState.visited.push(key);changed=true;}
  for(const q of ALL_QUESTS){const s=questStep(q);
    if(s&&s.type==='visit'&&questMapMatches(s)){questAdvance(q);changed=false;}
  }
  if(changed)questSave();
}
function questSafePosition(x,y){
  let xy=nearestSafePosition(x,y);
  if(typeof walkableAt!=='function'||walkableAt(xy[0],xy[1]))return xy;
  // 랜덤 야외/던전에서 옛 고정 좌표가 벽 속에 들어가면 가장 가까운 실제 통행 셀로 옮긴다.
  if(CUR&&CUR.grid){
    let best=null,bd=Infinity;
    for(let gy=1;gy<CUR.grid.length-1;gy++)for(let gx=1;gx<CUR.grid[gy].length-1;gx++){
      if(!CUR.grid[gy][gx])continue;
      const px=(gx+.5)*TS,py=(gy+.5)*TS;if(!walkableAt(px,py))continue;
      const d=(px-x)*(px-x)+(py-y)*(py-y);if(d<bd){bd=d;best=[px,py];}
    }
    if(best)return best;
  }
  return xy;
}
function questPoint(s){
  if(!s.point||!questMapMatches(s.point))return null;
  const p=s.point,n=p.nearNpc&&questNpc(p.nearNpc);
  if(p.nearNpc&&!n)return null;
  let base=null;
  if(n)base=[n.x,n.y];
  else if(p.tile)base=[p.tile[0]*TS,p.tile[1]*TS];
  else if(p.world)base=[p.world[0],p.world[1]];
  else if(p.nearSpot){
    const z=spots.find(x=>x.kind!=='questclue'&&(x.name===p.nearSpot||(x.data&&Array.isArray(x.data.aliases)&&x.data.aliases.includes(p.nearSpot))));
    if(!z)return null;base=[z.x,z.y];
  }else if(p.spotPrefix){
    const z=spots.find(x=>x.kind!=='questclue'&&x.name&&x.name.startsWith(p.spotPrefix));if(!z)return null;base=[z.x,z.y];
  }else base=CUR.spawn||[P.x,P.y];
  const off=p.offset||p.spawnOffset||[0,0],xy=questSafePosition(base[0]+off[0],base[1]+off[1]);
  return {x:xy[0],y:xy[1]};
}
function questRefreshWorld(){
  for(let i=spots.length-1;i>=0;i--)if(spots[i].kind==='questclue')spots.splice(i,1);
  for(const q of ALL_QUESTS){
    const s=questStep(q),p=s&&['collect','inspect','scene'].includes(s.type)&&s.point&&questPoint(s);
    if(p)spots.push({name:s.itemName||s.name||'조사 지점',kind:'questclue',r:46,...p,questId:q.id,questType:s.type});
  }
}
function questPortrait(s){
  if(s.char&&A.storyChars&&A.storyChars[s.char]){
    const ch=A.storyChars[s.char];
    return {name:s.speaker||ch.name,title:s.title!=null?s.title:(ch.title||''),port:ch.port||A.face};
  }
  if(s.portraitNpc){
    const key='npc_'+String(s.portraitNpc).padStart(2,'0'),n=A.npcs.find(x=>x.no===s.portraitNpc);
    return {name:s.speaker||(n&&n.name)||'???',title:s.title!=null?s.title:((n&&n.title)||''),port:A.port[key]||A.face};
  }
  return {name:s.speaker||'루크레아',title:s.title||'',port:A.face};
}
function questOpenSpecial(q,s){
  const a=q&&mainQuestState.active[q.id];if(!a||!s)return false;
  if(!(s.lines||[]).length)return questAdvance(q);
  const ch=questPortrait(s);
  questDialog={id:q.id,special:true,step:a.step,index:0,lines:s.lines||[]};
  talking=null;show('dlg');$('dlgMainRow').hidden=false;$('dlgInnRow').hidden=true;
  $('dlgImg').src=ch.port;$('dlgName').textContent=ch.name;$('dlgTitle').textContent=ch.title||'';
  $('dlgTrade').hidden=true;$('dlgTalk').hidden=true;$('dlgQuest').hidden=false;
  $('dlgLine').textContent=questDialog.lines[0]||'';$('dlgQuest').textContent='다음';$('dlgQuest').onclick=questNextSpecial;
  return true;
}
function questNextSpecial(){
  const d=questDialog,q=d&&questDef(d.id);
  if(!d||!d.special||!q)return false;
  if(++d.index<d.lines.length){$('dlgLine').textContent=d.lines[d.index];return true;}
  const a=mainQuestState.active[q.id],step=d.step;questDialog=null;closeAll();
  if(a&&a.step===step)return questAdvance(q);
  return false;
}
function questCollect(id){
  const q=questDef(id),s=questStep(q),p=s&&questPoint(s);
  if(!s||!['collect','inspect','scene'].includes(s.type)||!p||Math.hypot(P.x-p.x,P.y-p.y)>70)return false;
  if(s.type==='inspect'||s.type==='scene')return questOpenSpecial(q,s);
  const a=mainQuestState.active[id];a.progress++;
  mainQuestState.items[s.item]=(mainQuestState.items[s.item]||0)+1;
  if(a.progress>=(s.need||1))questAdvance(q);else questSave();return true;
}
function questObjective(q){
  const s=questStep(q);if(!s)return '';
  if(s.objective)return s.objective;
  if(s.type==='talk'||s.type==='deliver'){
    const n=A.npcs.find(n=>n.no===s.npc);return (n?n.name:'대상')+(s.type==='talk'?'에게 이야기하기':'에게 전달하기');
  }
  if(s.type==='kill')return (s.objective||'처치')+' '+(mainQuestState.active[q.id].progress||0)+' / '+(s.need||1);
  if(s.type==='boss')return s.objective||'우두머리 상대하기';
  if(s.type==='collect')return s.objective||((s.itemName||'물품')+' 찾기');
  if(s.type==='inspect'||s.type==='scene')return s.objective||'현장 조사하기';
  if(s.type==='event')return s.objective||('조건 진행 '+(mainQuestState.active[q.id].progress||0)+' / '+(s.need||1));
  return s.objective||'방문하기';
}
function questCard(q,done){
  const d=document.createElement('div');d.className='gq '+(questKind(q)==='main'?'mainQuestCard':'sideQuestCard');
  const b=document.createElement('b');b.textContent=(questKind(q)==='main'?'★ ':'◇ ')+q.title;d.append(b);
  const line=document.createElement('small');line.textContent=done?'완료':questObjective(q);d.append(line);return d;
}
function questRender(){
  const host=$('mainQuestTrack'),list=$('mainQuestActive'),done=$('mainQuestDone');
  if(!host||!list||!done)return;
  host.replaceChildren();list.replaceChildren();done.replaceChildren();
  const sideList=$('sideQuestActive'),sideDone=$('sideQuestDone');
  if(sideList)sideList.replaceChildren();if(sideDone)sideDone.replaceChildren();
  for(const q of MAIN_QUESTS){
    if(mainQuestState.active[q.id]){
      list.append(questCard(q,false));const row=document.createElement('div');row.className='mainQtrack';row.textContent='★ '+q.title+' · '+questObjective(q);host.append(row);
    }else if(mainQuestState.completed.includes(q.id))done.append(questCard(q,true));
  }
  for(const q of SIDE_QUESTS){
    if(mainQuestState.active[q.id]&&sideList)sideList.append(questCard(q,false));
    else if(mainQuestState.completed.includes(q.id)&&sideDone)sideDone.append(questCard(q,true));
  }
  host.classList.toggle('on',host.children.length>0);
  if(!list.children.length){const s=document.createElement('small');s.textContent='마을에서 ! 표시를 찾아보세요.';list.append(s);}
  if(sideList&&!sideList.children.length){const s=document.createElement('small');s.textContent='진행 중인 연쇄·서브 의뢰가 없습니다.';sideList.append(s);}
  $('mainQuestDoneBlock').hidden=done.children.length===0;
  if($('sideQuestDoneBlock'))$('sideQuestDoneBlock').hidden=!sideDone||sideDone.children.length===0;
  questUiDirty=false;
}
function questDraw(){
  for(const n of npcs){const a=questNpcAction(n);if(!a)continue;const mark=a.start?'!':'?',main=questKind(a.q)==='main';
    ctx.save();ctx.font='900 27px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle=main?'#44240d':'#27394a';ctx.fillStyle=main?'#ffda55':'#d7ecff';
    const y=n.y-n.h-12+Math.sin(T*3)*3;ctx.strokeText(mark,n.x,y);ctx.fillText(mark,n.x,y);ctx.restore();
  }
  for(const s of spots)if(s.kind==='questclue'){
    const q=questDef(s.questId),main=questKind(q)==='main',mark=s.questType==='collect'?'◆':'?';
    ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle=main?'#ffe19c':'#e6f2ff';ctx.strokeStyle=main?'#8b5a22':'#4e6c88';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,13,7,0,0,7);ctx.fill();ctx.stroke();ctx.font='900 18px sans-serif';ctx.textAlign='center';ctx.fillText(mark,0,-13+Math.sin(T*4)*2);ctx.restore();
  }
}
function questTick(){
  const market=CUR&&CUR.market?':'+CUR.market:'';
  const leg=MAP==='field'&&window.__FD?':'+(__FD.state().leg||1):'';
  const key=MAP+':'+(MAP==='dungeon'&&window.__DUN?__DUN.state().floor:0)+market+leg;
  if(key!==questWorldKey&&!traveling){questWorldKey=key;questCheckVisit();questRefreshWorld();}
  if(!panel&&!traveling){
    for(const q of ALL_QUESTS){const s=questStep(q);if(s&&s.type==='scene'&&!s.point&&questMapMatches(s)){questOpenSpecial(q,s);break;}}
  }
  if(questUiDirty)questRender();
}
function questLoad(d){
  mainQuestState={active:{},completed:[],items:{},visited:[],flags:{}};
  if(d&&(d.schema===1||d.schema===2||d.schema===3)){
    mainQuestState.completed=(Array.isArray(d.completed)?d.completed:[]).filter(id=>questDef(id));
    for(const [id,a] of Object.entries(d.active||{})){
      const q=questDef(id);if(!q||mainQuestState.completed.includes(id))continue;
      const step=Math.max(0,Math.min(q.steps.length-1,Number(a.step)||0));
      mainQuestState.active[id]={step,progress:Math.max(0,Number(a.progress)||0),reward:a.reward||{...q.reward,exp:Math.round(expNeed(P.lv)*(questKind(q)==='main'?.32:.18))}};
    }
    for(const [id,n] of Object.entries(d.items||{}))if(Number.isFinite(n)&&n>0)mainQuestState.items[id]=Math.floor(n);
    mainQuestState.visited=(Array.isArray(d.visited)?d.visited:[]).filter(x=>typeof x==='string');
    mainQuestState.flags=d.flags&&typeof d.flags==='object'?{...d.flags}:{};
  }
  questWorldKey='';questUiDirty=true;questRefreshWorld();questRender();
}
window.QUEST={isDialog:()=>panel==='dlg'&&!!questDialog,accept:questAccept,collect:questCollect,onKill:questOnKill,onEvent:questOnEvent,onWorld:()=>{questWorldKey='';questRefreshWorld();},tick:questTick,draw:questDraw,
  decorateDialog:questDecorateDialog,marker:questMarker,openList:()=>{GUILD.open();questRender();},
  saveData:()=>({schema:3,...JSON.parse(JSON.stringify(mainQuestState))}),loadData:questLoad,
  state:()=>({active:Object.fromEntries(Object.entries(mainQuestState.active).map(([id,a])=>[id,{step:a.step,progress:a.progress}])),completed:mainQuestState.completed.slice(),items:{...mainQuestState.items},flags:{...mainQuestState.flags}}),
  points:()=>spots.filter(s=>s.kind==='questclue').map(s=>({id:s.questId,x:s.x,y:s.y,type:s.questType})),minimapTargets:questMiniTargets,nextDialog:questNextDialog,nextSpecial:questNextSpecial,
  lists:()=>({main:MAIN_QUESTS.map(q=>q.id),side:SIDE_QUESTS.map(q=>q.id)})};
$('mainQuestTrack').onclick=()=>QUEST.openList();
