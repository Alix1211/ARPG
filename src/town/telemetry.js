// ======================= 숨은 밸런스 플레이 기록 =======================
// 화면에는 노출하지 않고 세이브 안에만 저장한다. 케인이 세이브를 보내면 실제 플레이 기준으로 밸런스를 분석한다.
(() => {
  const MAX_ZONES=400, MAX_EVENTS=240;
  const fresh=()=>({
    schema:1, startedAt:Date.now(), playMs:0,
    totals:{deaths:0,kills:0,bossKills:0,damageIn:0,damageOut:0,portals:0,campRests:0,
      potions:{hp:0,mp:0},goldEarned:0,goldSpent:0,loot:{normal:0,magic:0,rare:0,legendary:0}},
    levels:[], zones:[], events:[], active:null
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
  function gold(delta){
    if(!ready||!Number.isFinite(delta)||!delta)return;
    if(delta>0)data.totals.goldEarned+=Math.round(delta);else data.totals.goldSpent+=Math.round(-delta);
  }
  function levelUp(from,to){
    if(!ready||to<=from)return;pulse();
    for(let lv=from+1;lv<=to;lv++)data.levels.push({lv,playMs:data.playMs,deaths:data.totals.deaths,gold:window.GAME&&GAME.P?GAME.P.gold:null,at:Date.now()});
    if(data.levels.length>70)data.levels=data.levels.slice(-70);
  }
  function loadData(d){
    data=fresh();
    if(d&&d.schema===1){
      data={...data,...clone(d),totals:{...data.totals,...clone(d.totals||{}),potions:{...data.totals.potions,...clone(d.totals&&d.totals.potions||{})},loot:{...data.totals.loot,...clone(d.totals&&d.totals.loot||{})}}};
      data.levels=Array.isArray(d.levels)?d.levels.slice(-70):[];
      data.zones=Array.isArray(d.zones)?d.zones.slice(-MAX_ZONES):[];
      data.events=Array.isArray(d.events)?d.events.slice(-MAX_EVENTS):[];
      data.active=d.active&&typeof d.active==='object'?clone(d.active):null;
    }
    lastTick=Date.now();ready=true;
  }
  function saveData(){pulse();trim();return clone(data);}
  function reset(){data=fresh();lastTick=Date.now();ready=true;}
  document.addEventListener('visibilitychange',pulse);
  window.TELEMETRY={loadData,saveData,reset,enter,finish:finishActive,damageIn,damageOut,death,kill,loot,potion,portal,camp,gold,levelUp,state:()=>saveData()};
})();
