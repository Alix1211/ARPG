// 본편 엔진. 제목·인물별 대사·진행 데이터는 봉인 JSON에만 둔다.
const MAIN_QUESTS=A.mainQuests.quests;
let mainQuestState={active:{},completed:[],items:{},visited:[]};
let questDialog=null,questWorldKey='',questUiDirty=true;
const questDef=id=>MAIN_QUESTS.find(q=>q.id===id);
const questStep=q=>q&&mainQuestState.active[q.id]?q.steps[mainQuestState.active[q.id].step]:null;
const questNpc=no=>npcs.find(n=>n.no===no||n.k==='npc_'+String(no).padStart(2,'0'));
function questSave(){questUiDirty=true;questRefreshWorld();questRender();if(window.UI&&UI.save)UI.save();}
function questAvailable(q){
  const s=q.start||{};
  return !mainQuestState.completed.includes(q.id)&&!mainQuestState.active[q.id]&&P.lv>=(s.level||1)&&
    (!s.previous||mainQuestState.completed.includes(s.previous))&&(!s.visit||mainQuestState.visited.includes(s.visit));
}
function questMapMatches(s){return (!s.map||s.map===MAP)&&(!s.floor||(MAP==='dungeon'&&window.__DUN&&__DUN.state().floor===s.floor));}
function questNpcAction(n){
  if(!n)return null;
  for(const q of MAIN_QUESTS){
    const s=questStep(q);
    if(s&&['talk','deliver'].includes(s.type)&&n.no===s.npc&&questMapMatches(s))return {q,step:s,start:false};
  }
  for(const q of MAIN_QUESTS)if(questAvailable(q)&&q.start.npc===n.no&&questMapMatches(q.start))return {q,start:true};
  return null;
}
function questMarker(n){const a=questNpcAction(n);return a?(a.start?'!':'?'):'';}
function questAccept(id){
  const q=questDef(id),n=q&&questNpc(q.start.npc);
  if(!q||!questAvailable(q)||!questMapMatches(q.start)||!n||Math.hypot(P.x-n.x,P.y-n.y)>90)return false;
  const reward=JSON.parse(JSON.stringify(q.reward||{}));
  reward.exp=Math.max(1,Math.round(expNeed(P.lv)*(reward.expRatio||.32)));
  mainQuestState.active[id]={step:0,progress:0,reward};questSave();questCheckVisit();return true;
}
function questAdvance(q){
  const a=mainQuestState.active[q.id];if(!a)return false;
  const s=questStep(q);if(s.give)for(const [id,n] of Object.entries(s.give))mainQuestState.items[id]=(mainQuestState.items[id]||0)+n;
  a.step++;a.progress=0;
  if(a.step>=q.steps.length)return questComplete(q);
  questSave();questCheckVisit();return true;
}
function questComplete(q){
  const a=mainQuestState.active[q.id];if(!a||a.step<q.steps.length||mainQuestState.completed.includes(q.id))return false;
  // 먼저 완료로 기록해서 대화 중복 클릭·저장 재개로 보상이 중복되지 않게 한다.
  const r=a.reward;delete mainQuestState.active[q.id];mainQuestState.completed.push(q.id);
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
  btn.textContent=a.start?'★ 본편 수락':'★ 본편 진행';btn.onclick=()=>questBeginDialog(n,a);
}
function questBeginDialog(n,a){
  if(Math.hypot(P.x-n.x,P.y-n.y)>90)return false;
  const s=a.step;
  if(s&&s.type==='deliver'&&(mainQuestState.items[s.item]||0)<(s.need||1)){say('전달할 물품이 부족합니다.');return false;}
  questDialog={id:a.q.id,npc:n.no,start:a.start,step:mainQuestState.active[a.q.id]?.step,index:0,lines:a.start?a.q.intro:s.lines};
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
    if(a&&a.step===d.step&&s.npc===n.no){
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
  for(const q of MAIN_QUESTS){const s=questStep(q),a=mainQuestState.active[q.id];
    if(s&&s.type==='kill'&&questMapMatches(s)&&(!s.target||s.target===m.type||s.target===m.family)){
      a.progress=Math.min(s.need||1,a.progress+1);if(a.progress>=(s.need||1))questAdvance(q);else questSave();
    }
  }
}
function questCheckVisit(){
  let changed=false;
  const key=MAP==='dungeon'&&window.__DUN?'dungeon:'+__DUN.state().floor:MAP;
  if(!mainQuestState.visited.includes(key)){mainQuestState.visited.push(key);changed=true;}
  for(const q of MAIN_QUESTS){const s=questStep(q);
    if(s&&s.type==='visit'&&questMapMatches(s)){questAdvance(q);changed=false;}
  }
  if(changed)questSave();
}
function questPoint(s){
  if(!s.point||!questMapMatches(s.point))return null;
  const p=s.point,n=p.nearNpc&&questNpc(p.nearNpc);
  if(p.nearNpc&&!n)return null;
  const base=n?[n.x,n.y]:CUR.spawn||[P.x,P.y],off=p.offset||p.spawnOffset||[0,0];
  const xy=nearestSafePosition(base[0]+off[0],base[1]+off[1]);return {x:xy[0],y:xy[1]};
}
function questRefreshWorld(){
  for(let i=spots.length-1;i>=0;i--)if(spots[i].kind==='questclue')spots.splice(i,1);
  for(const q of MAIN_QUESTS){const s=questStep(q),p=s&&s.type==='collect'&&questPoint(s);
    if(p)spots.push({name:s.itemName,kind:'questclue',r:42,...p,questId:q.id});
  }
}
function questCollect(id){
  const q=questDef(id),s=questStep(q),p=s&&questPoint(s);
  if(!s||s.type!=='collect'||!p||Math.hypot(P.x-p.x,P.y-p.y)>65)return false;
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
  return s.type==='kill'?'처치 '+(mainQuestState.active[q.id].progress||0)+' / '+(s.need||1):'방문하기';
}
function questCard(q,done){
  const d=document.createElement('div');d.className='gq mainQuestCard';
  const b=document.createElement('b');b.textContent='★ '+q.title;d.append(b);
  const line=document.createElement('small');line.textContent=done?'완료':questObjective(q);d.append(line);return d;
}
function questRender(){
  const host=$('mainQuestTrack'),list=$('mainQuestActive'),done=$('mainQuestDone');if(!host)return;
  host.replaceChildren();list.replaceChildren();done.replaceChildren();
  for(const q of MAIN_QUESTS){
    if(mainQuestState.active[q.id]){
      list.append(questCard(q,false));const row=document.createElement('div');row.className='mainQtrack';row.textContent='★ '+q.title+' · '+questObjective(q);host.append(row);
    }else if(mainQuestState.completed.includes(q.id))done.append(questCard(q,true));
  }
  host.classList.toggle('on',host.children.length>0);
  if(!list.children.length){const s=document.createElement('small');s.textContent='마을에서 ! 표시를 찾아보세요.';list.append(s);}
  $('mainQuestDoneBlock').hidden=done.children.length===0;questUiDirty=false;
}
function questDraw(){
  for(const n of npcs){const mark=questMarker(n);if(!mark)continue;
    ctx.save();ctx.font='900 27px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#44240d';ctx.fillStyle='#ffda55';
    const y=n.y-n.h-12+Math.sin(T*3)*3;ctx.strokeText(mark,n.x,y);ctx.fillText(mark,n.x,y);ctx.restore();
  }
  for(const s of spots)if(s.kind==='questclue'){
    ctx.save();ctx.translate(s.x,s.y);ctx.fillStyle='#ffe19c';ctx.strokeStyle='#8b5a22';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,13,7,0,0,7);ctx.fill();ctx.stroke();ctx.font='900 18px sans-serif';ctx.textAlign='center';ctx.fillText('?',0,-13+Math.sin(T*4)*2);ctx.restore();
  }
}
function questTick(){
  const key=MAP+':'+(MAP==='dungeon'&&window.__DUN?__DUN.state().floor:0);
  if(key!==questWorldKey&&!traveling){questWorldKey=key;questCheckVisit();questRefreshWorld();}
  if(questUiDirty)questRender();
}
function questLoad(d){
  mainQuestState={active:{},completed:[],items:{},visited:[]};
  if(d&&d.schema===1){
    mainQuestState.completed=(Array.isArray(d.completed)?d.completed:[]).filter(id=>questDef(id));
    for(const [id,a] of Object.entries(d.active||{})){
      const q=questDef(id);if(!q||mainQuestState.completed.includes(id))continue;
      const step=Math.max(0,Math.min(q.steps.length-1,Number(a.step)||0));
      mainQuestState.active[id]={step,progress:Math.max(0,Number(a.progress)||0),reward:a.reward||{...q.reward,exp:Math.round(expNeed(P.lv)*.32)}};
    }
    for(const [id,n] of Object.entries(d.items||{}))if(Number.isFinite(n)&&n>0)mainQuestState.items[id]=Math.floor(n);
    mainQuestState.visited=(Array.isArray(d.visited)?d.visited:[]).filter(x=>typeof x==='string');
  }
  questWorldKey='';questUiDirty=true;questRefreshWorld();questRender();
}
window.QUEST={accept:questAccept,collect:questCollect,onKill:questOnKill,onWorld:()=>{questWorldKey='';questRefreshWorld();},tick:questTick,draw:questDraw,
  decorateDialog:questDecorateDialog,marker:questMarker,openList:()=>{GUILD.open();questRender();},
  saveData:()=>({schema:1,...JSON.parse(JSON.stringify(mainQuestState))}),loadData:questLoad,
  state:()=>({active:Object.fromEntries(Object.entries(mainQuestState.active).map(([id,a])=>[id,{step:a.step,progress:a.progress}])),completed:mainQuestState.completed.slice(),items:{...mainQuestState.items}}),
  points:()=>spots.filter(s=>s.kind==='questclue').map(s=>({id:s.questId,x:s.x,y:s.y})),nextDialog:questNextDialog};
$('mainQuestTrack').onclick=()=>QUEST.openList();
