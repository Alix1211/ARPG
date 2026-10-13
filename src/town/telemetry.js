// ======================= 숨은 밸런스 플레이 기록 =======================
// 화면에는 노출하지 않고 세이브 안에만 저장한다. 케인이 세이브를 보내면 실제 플레이 기준으로 밸런스를 분석한다.
(() => {
  const MAX_ZONES=400, MAX_EVENTS=240;
  const fresh=()=>({
    schema:1, startedAt:Date.now(), playMs:0,
    totals:{deaths:0,kills:0,bossKills:0,damageIn:0,damageOut:0,portals:0,campRests:0,
      potions:{hp:0,mp:0,dual:0},goldEarned:0,goldSpent:0,loot:{normal:0,magic:0,rare:0,legendary:0}},
    levels:[], zones:[], events:[], active:null,
    features:{}   // 기능별 사용: {ms, opens, goldIn, goldOut}
  });
  let data=fresh(),ready=false,lastTick=Date.now();

  const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
  function pulse(){
    const now=Date.now(),dt=Math.max(0,Math.min(10000,now-lastTick));lastTick=now;
    if(ready&&!document.hidden&&dt>0){
      data.playMs=(data.playMs||0)+dt;
      if(data.active)data.active.ms=(data.active.ms||0)+dt;
    }
  }
  function trim(){if(data.zones.length>MAX_ZONES)data.zones.splice(0,data.zones.length-MAX_ZONES);if(data.events.length>MAX_EVENTS)data.events.splice(0,data.events.length-MAX_EVENTS);}
  function locKey(loc){
    if(!loc)return 'none';
    if(loc.map==='field')return ['field',loc.theme||'',loc.leg||1].join(':');
    if(loc.map==='fieldvillage')return ['village',loc.theme||''].join(':');
    if(loc.map==='dungeon')return ['dungeon',loc.dungeonTheme||'',loc.floor||1].join(':');
    return loc.map||'none';
  }
  function locInfo(loc){
    return {map:loc&&loc.map||'none',theme:loc&&loc.theme||null,leg:loc&&loc.leg||null,floor:loc&&loc.floor||null,
      dungeonTheme:loc&&loc.dungeonTheme||null,lv:window.GAME&&GAME.P?GAME.P.lv:null,key:locKey(loc)};
  }
  function event(type,extra={}){
    if(!ready)return;
    pulse();data.events.push({type,playMs:data.playMs,lv:window.GAME&&GAME.P?GAME.P.lv:null,...extra});trim();
  }
  function finishActive(reason='leave'){
    pulse();if(!data.active)return;
    const a=data.active;data.zones.push({...a,endedPlayMs:data.playMs,reason});data.active=null;trim();
  }
  function enter(loc){
    if(!ready||!loc)return;
    pulse();const info=locInfo(loc);
    if(data.active&&data.active.key===info.key)return;
    finishActive('move');
    data.active={...info,startedPlayMs:data.playMs,ms:0,kills:0,bossKills:0,deaths:0,damageIn:0,damageOut:0,potions:0};
  }
  function addZone(k,v){if(data.active)data.active[k]=(data.active[k]||0)+v;}
  function damageIn(v){if(!ready)return;v=Math.max(0,Math.round(v||0));data.totals.damageIn+=v;addZone('damageIn',v);}
  function damageOut(v){if(!ready)return;v=Math.max(0,Math.round(v||0));data.totals.damageOut+=v;addZone('damageOut',v);}
  function death(extra={}){
    if(!ready)return;pulse();data.totals.deaths++;addZone('deaths',1);event('death',{map:data.active&&data.active.map||null,theme:data.active&&data.active.theme||null,floor:data.active&&data.active.floor||null,...extra});
  }
  function kill(m){
    if(!ready)return;data.totals.kills++;addZone('kills',1);
    if(m&&(m.boss||m.rank==='boss')){data.totals.bossKills++;addZone('bossKills',1);event('boss_kill',{type:m.type||null,tier:m.tier||null,floor:data.active&&data.active.floor||null});}
  }
  function loot(it){
    if(!ready||!it)return;const names=['normal','magic','rare','legendary'],k=names[Math.max(0,Math.min(3,it.rar|0))];data.totals.loot[k]++;
  }
  function potion(k){if(!ready||!(k in data.totals.potions))return;data.totals.potions[k]++;addZone('potions',1);}
  function portal(home){if(!ready)return;data.totals.portals++;event('portal',{home:home&&home.map||'town',theme:home&&home.theme||null});}
  function camp(){if(!ready)return;data.totals.campRests++;event('camp',{theme:data.active&&data.active.theme||null,leg:data.active&&data.active.leg||null});}
  // 지금 쓰고 있는 기능 이름: 열린 창(상점·교역·길드 등) > 미니게임 종류 > 현재 장소
  function feature(){
    try{
      if(typeof panel!=='undefined'&&panel){
        if(panel==='minigames')return 'mini:'+((window.MINIGAMES&&MINIGAMES.active)||'menu');
        return String(panel);
      }
      if(typeof MAP!=='undefined')return (MAP==='field'||MAP==='dungeon'||MAP==='cave')?'hunt:'+MAP:'walk:'+MAP;
    }catch(e){}
    return 'other';
  }
  let curFeature=null;
  function feat(name){return data.features[name]||(data.features[name]={ms:0,opens:0,goldIn:0,goldOut:0});}
  function sampleFeature(){
    if(!ready||document.hidden)return;
    const name=feature();
    if(name!==curFeature){curFeature=name;feat(name).opens++;}
    feat(name).ms+=1000;
  }
  setInterval(sampleFeature,1000);
  function gold(delta){
    if(!ready||!Number.isFinite(delta)||!delta)return;
    if(delta>0)data.totals.goldEarned+=Math.round(delta);else data.totals.goldSpent+=Math.round(-delta);
    const f=feat(feature());if(delta>0)f.goldIn+=Math.round(delta);else f.goldOut+=Math.round(-delta);
  }
  function levelUp(from,to){
    if(!ready||to<=from)return;pulse();
    const Pp=window.GAME&&GAME.P,w=window.UI&&UI.currentWeapon?UI.currentWeapon():null;
    for(let lv=from+1;lv<=to;lv++)data.levels.push({lv,playMs:data.playMs,deaths:data.totals.deaths,gold:Pp?Pp.gold:null,at:Date.now(),
      kills:data.totals.kills,goldEarned:data.totals.goldEarned,goldSpent:data.totals.goldSpent,potions:clone(data.totals.potions),
      weapon:w&&(w.wt||w.kind)||null,stats:Pp&&clone(Pp.stats),mastery:Pp&&clone(Pp.mastery),where:data.active&&data.active.key||null});
    if(data.levels.length>70)data.levels=data.levels.slice(-70);
  }
  function loadData(d){
    data=fresh();
    if(d&&d.schema===1){
      data={...data,...clone(d),totals:{...data.totals,...clone(d.totals||{}),potions:{...data.totals.potions,...clone(d.totals&&d.totals.potions||{})},loot:{...data.totals.loot,...clone(d.totals&&d.totals.loot||{})}}};
      data.levels=Array.isArray(d.levels)?d.levels.slice(-70):[];
      data.features=d.features&&typeof d.features==='object'?clone(d.features):{};
      data.zones=Array.isArray(d.zones)?d.zones.slice(-MAX_ZONES):[];
      data.events=Array.isArray(d.events)?d.events.slice(-MAX_EVENTS):[];
      data.active=d.active&&typeof d.active==='object'?clone(d.active):null;
    }
    lastTick=Date.now();ready=true;
  }
  function saveData(){pulse();trim();return clone(data);}
  function reset(){data=fresh();lastTick=Date.now();ready=true;}
  // 초기화해도 지난 회차 기록은 남긴다(arpg_ 로 시작해 백업·드라이브 동기화에 함께 실림). 케인 1~10레벨 반복 육성 데이터용.
  const ARCHIVE_KEY='arpg_playlog';
  function archive(reason){
    try{
      finishActive(reason||'reset');const Pp=window.GAME&&GAME.P;
      const a=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'{"schema":1,"runs":[]}');if(!Array.isArray(a.runs))a.runs=[];
      a.runs.push({endedAt:Date.now(),reason:reason||'reset',lv:Pp?Pp.lv:null,gold:Pp?Pp.gold:null,log:saveData()});
      if(a.runs.length>30)a.runs=a.runs.slice(-30);
      localStorage.setItem(ARCHIVE_KEY,JSON.stringify(a));return a.runs.length;
    }catch(e){return 0;}
  }
  document.addEventListener('visibilitychange',pulse);
  window.TELEMETRY={loadData,saveData,reset,archive,enter,finish:finishActive,damageIn,damageOut,death,kill,loot,potion,portal,camp,gold,levelUp,state:()=>saveData()};
})();
