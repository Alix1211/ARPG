// ======================= 모험가 길드 의뢰판 =======================
const GUILD_MOB_NAME={
  wolf:'늑대',rabbit:'토끼',bear:'곰',orc:'오크',harpy:'하피',rogue:'로그',darkmage:'다크메이지',
  gargoyle:'가고일',demon:'데몬',slime:'슬라임',goblin:'고블린',skeleton:'스켈레톤',
  spider:'거미',mushroom:'버섯괴물',elem_fire:'화염 정령',elem_ice:'얼음 정령',mimic:'미믹',lich:'리치'
};
const GUILD_TIER_THEME=['','spring','summer','autumn','winter','ice','volcano','swamp'];
let guildState={seq:1,board:[],active:[],completed:0};

function guildTier(){return window.GAME&&GAME.levelTier?GAME.levelTier(P.lv):1;}
function guildReward(tier){
  const exp=window.GAME&&GAME.questExp?GAME.questExp('guild',P.lv):10;
  const gold=Math.round(35+P.lv*8+tier*22);
  return {exp,gold,gear:Math.random()<.28};
}
function guildMake(type,idx){
  const tier=guildTier(),rew=guildReward(tier),q={id:guildState.seq++,type,tier,prog:0,accepted:false,...rew};
  if(type==='kill_any'){
    q.need=8+tier*2+idx;q.title='주변 정리';q.desc='같은 티어 전투 지역에서 몬스터 '+q.need+'마리 처치';
  }else if(type==='kill_type'){
    const pool=THEME_MOBS[GUILD_TIER_THEME[tier]]||THEME_MOBS.spring,target=pool[(idx+tier)%pool.length];
    q.target=target;q.need=4+tier;q.title=GUILD_MOB_NAME[target]+' 소탕';q.desc=GUILD_MOB_NAME[target]+' '+q.need+'마리 처치';
  }else if(type==='floor'){
    q.need=Math.max(2,tier*3);q.title='던전 정찰';q.desc='던전 지하 '+q.need+'층에 도달';
  }else{
    const goods=TRADE.goods, g=goods[(tier*3+idx*5)%goods.length];
    q.goodId=g.id;q.goodName=g.name;q.need=4+tier*2;q.title='긴급 납품';q.desc=g.name+' '+q.need+'개 납품';
  }
  return q;
}
function guildGenerate(){
  if(guildState.board.length||guildState.active.length>=3)return;
  guildState.board=[
    guildMake('kill_any',0),guildMake('kill_any',1),
    guildMake('kill_type',0),guildMake('kill_type',1),
    guildMake('floor',0),guildMake('delivery',0)
  ];
}
function guildDone(q){
  if(q.type==='delivery'){
    const c=TRADE.cargo()[q.goodId];return !!c&&c.qty>=q.need;
  }
  return (q.prog||0)>=q.need;
}
function guildProgressText(q){
  if(q.type==='delivery'){
    const c=TRADE.cargo()[q.goodId];return (c?c.qty:0)+' / '+q.need;
  }
  return Math.min(q.need,q.prog||0)+' / '+q.need;
}
function guildTrack(){
  const host=$('questTrack');if(!host)return;
  host.innerHTML='';
  if(!guildState.active.length){host.classList.remove('on');return;}
  host.classList.add('on');
  for(const q of guildState.active.slice(0,3)){
    const done=guildDone(q),row=document.createElement('div');
    row.className='qtrack'+(done?' done':'');
    const hasNum=Number.isFinite(q.need)&&q.need>0;
    const prog=hasNum?guildProgressText(q):'';
    row.innerHTML='<span class="qcheck"></span><span class="qtitle">'+q.title+'</span><span class="qprog">'+prog+'</span>';
    host.append(row);
  }
}
function guildAccept(id){
  if(guildState.active.length>=3){say('진행 중 의뢰는 최대 3개입니다.');return false;}
  const i=guildState.board.findIndex(q=>q.id===id);if(i<0)return false;
  const q=guildState.board.splice(i,1)[0];q.accepted=true;guildState.active.push(q);guildRender();guildTrack();
  if(window.UI&&UI.save)UI.save();return true;
}
function guildRandomGear(tier){
  const r=Math.random();
  if(r<.58){const wt=['sword','spear','gauntlet','bow','staff'][Math.floor(Math.random()*5)];return UI.make({kind:'weapon',wt,tier,roll:true});}
  if(r<.9){const kinds=['head','body','hands','feet'];return UI.make({kind:kinds[Math.floor(Math.random()*kinds.length)],tier,roll:true});}
  return UI.make({kind:Math.random()<.5?'ring':'neck',tier,roll:true});
}
function guildClaim(id){
  const i=guildState.active.findIndex(q=>q.id===id);if(i<0)return false;
  const q=guildState.active[i];if(!guildDone(q)){say('아직 의뢰 조건을 채우지 못했습니다.');return false;}
  if(q.type==='delivery'&&!TRADE.consume(q.goodId,q.need)){say('납품 물품이 부족합니다.');return false;}
  GAME.gainExp(q.exp);GAME.setGold(P.gold+q.gold);
  let extra='';
  if(q.gear&&window.UI){
    const it=guildRandomGear(Math.max(1,Math.min(7,q.tier)));
    if(UI.add(it))extra=' · '+it.name;
    else {const comp=50+q.tier*35;GAME.setGold(P.gold+comp);extra=' · 가방이 차서 '+comp+'G 추가';}
  }
  guildState.active.splice(i,1);guildState.completed++;
  say('의뢰 완료! EXP '+q.exp+' · '+q.gold+'G'+extra);
  if(!guildState.board.length&&!guildState.active.length)guildGenerate();
  guildRender();guildTrack();if(window.UI&&UI.save)UI.save();return true;
}
function guildOnKill(m){
  if(!m||m.dead===false)return;
  let changed=false;
  for(const q of guildState.active){
    if(q.type==='kill_any'){q.prog=Math.min(q.need,(q.prog||0)+1);changed=true;}
    else if(q.type==='kill_type'&&m.type===q.target){q.prog=Math.min(q.need,(q.prog||0)+1);changed=true;}
  }
  if(changed&&$('guild').classList.contains('on'))guildRender();if(changed)guildTrack();if(changed)guildTrack();
}
function guildOnDungeonFloor(floor){
  let changed=false;
  for(const q of guildState.active)if(q.type==='floor'){q.prog=Math.max(q.prog||0,floor);changed=true;}
  if(changed&&$('guild').classList.contains('on'))guildRender();
}
function guildCard(q,active){
  const d=document.createElement('div');d.className='gq'+(guildDone(q)?' done':'');
  const gear=q.gear?' · 장비 가능':'';
  d.innerHTML='<b>'+q.title+'</b><small>'+q.desc+'</small><div class="gprog">'+guildProgressText(q)+'</div><small>보상 EXP '+q.exp+' · '+q.gold+'G'+gear+'</small>';
  const btn=document.createElement('button');btn.className='btn';btn.type='button';
  if(active){btn.textContent=guildDone(q)?'보상 받기':'진행 중';btn.disabled=!guildDone(q);btn.onclick=()=>guildClaim(q.id);}
  else{btn.textContent='수락';btn.disabled=guildState.active.length>=3;btn.onclick=()=>guildAccept(q.id);}
  d.append(btn);return d;
}
function guildRender(){
  guildGenerate();guildTrack();$('guildRank').textContent='견습 · 완료 '+guildState.completed+'건';
  const a=$('gActive'),b=$('gBoard');a.innerHTML='';b.innerHTML='';
  if(!guildState.active.length)a.innerHTML='<div class="gq"><small>진행 중인 의뢰가 없습니다.</small></div>';
  for(const q of guildState.active)a.append(guildCard(q,true));
  for(const q of guildState.board)b.append(guildCard(q,false));
}
function guildOpen(){
  closeAll();panel='guild';$('guild').classList.add('on');guildRender();
}
function guildClose(){ $('guild').classList.remove('on');if(panel==='guild')panel=null; }
function guildSaveData(){return JSON.parse(JSON.stringify(guildState));}
function guildLoadData(d){
  if(!d){guildTrack();return;}guildState={seq:+d.seq||1,board:Array.isArray(d.board)?d.board:[],active:Array.isArray(d.active)?d.active:[],completed:d.completed|0};guildTrack();
}
window.GUILD={
  open:guildOpen,close:guildClose,accept:guildAccept,claim:guildClaim,onKill:guildOnKill,onDungeonFloor:guildOnDungeonFloor,
  saveData:guildSaveData,loadData:guildLoadData,refreshTrack:guildTrack,state:()=>JSON.parse(JSON.stringify(guildState)),
  debugComplete(id){const q=guildState.active.find(x=>x.id===id);if(!q)return false;if(q.type==='delivery')return false;q.prog=q.need;guildRender();return true;}
};
