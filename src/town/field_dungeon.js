// ======================= 필드 · 몬스터 =======================
const FIELD_THEMES = [
  ['spring','봄 초원','T1 · 권장 Lv1~10'], ['summer','여름 숲','T2 · 권장 Lv11~20'], ['autumn','가을 들판','T3 · 권장 Lv21~30'],
  ['winter','겨울 설원','T4 · 권장 Lv31~40'], ['ice','얼음 지대','T5 · 권장 Lv41~50'], ['volcano','화산 지대','T6 · 권장 Lv51~60'], ['swamp','늪지대','T7 · 권장 Lv61~70']
];
const FIELD_INFO = Object.fromEntries(FIELD_THEMES.map(x => [x[0], x]));
const fieldTiles = {};
for (const th of FIELD_THEMES.map(x => x[0])){
  fieldTiles[th] = {};
  for (const k in (A.field.tiles[th] || {})) fieldTiles[th][k] = load(A.field.tiles[th][k]);
}
const mon3 = {}, mon1 = {};
for (const n in A.monsters3){ mon3[n] = {}; for (const d in A.monsters3[n]) mon3[n][d] = load(A.monsters3[n][d]); }
for (const n in A.monsters1) mon1[n] = load(A.monsters1[n]);
const monsters = [], dropsLoot = [], enemyShots = [], enemyHazards = [];
const dropImgs = {};
const FIELD_TIER={spring:1,summer:2,autumn:3,winter:4,ice:5,volcano:6,swamp:7};
// 2026-10-06: 7지역 야외 필드/최종 거점 완성형
const FIELD_LAYOUT={
  spring:{start:[2.5,16],end:[47.1,7],curve:[13,14,27,22],village:[39.4,10.8,43.1,12.8],cave:[44,4.2],camp:[15.5,24],ruin:[28.5,18.5],special:[36,24],sign:[4.2,15.4]},
  summer:{start:[2.5,18],end:[47.1,9],curve:[12,11,27,24],village:[38.7,12.6,42.7,14.5],cave:[43.7,5.0],camp:[13.5,24.8],ruin:[25.5,8.0],special:[33.5,23.8],sign:[4.0,17.4]},
  autumn:{start:[2.5,14],end:[47.1,20],curve:[13,20,28,9],village:[38.8,17.0,42.8,19.0],cave:[43.8,23.5],camp:[14.0,7.0],ruin:[27.5,23.8],special:[34.5,8.0],sign:[4.0,13.4]},
  winter:{start:[2.5,18],end:[47.1,6.5],curve:[15,23,29,12],village:[38.5,10.6,42.4,12.8],cave:[43.8,3.8],camp:[13.2,9.0],ruin:[27.0,24.0],special:[35.5,21.5],sign:[4.1,17.3]},
  ice:{start:[2.5,13],end:[47.1,18],curve:[13,7,29,24],village:[38.5,16.0,42.5,18.0],cave:[43.7,22.0],camp:[14.0,24.0],ruin:[26.5,6.5],special:[35.0,9.0],sign:[4.0,12.4]},
  volcano:{start:[2.5,20],end:[47.1,8],curve:[12,13,29,25],village:[38.7,11.6,42.7,13.5],cave:[43.8,4.5],camp:[12.8,25.0],ruin:[26.5,8.5],special:[35.5,24.0],sign:[4.0,19.4]},
  swamp:{start:[2.5,17],end:[47.1,13],curve:[13,24,29,7],village:[38.4,14.8,42.4,16.8],cave:[43.8,18.2],camp:[13.3,7.5],ruin:[27.5,24.0],special:[34.0,6.5],sign:[4.0,16.4]}
};
const FIELD_POI={
  spring:{start:['15_','지역 이정표'],camp:['14_','야영지'],ruin:['13_','무너진 폐허'],special:['12_','버섯 군락']},
  summer:{start:['15_','부서진 울타리'],camp:['14_','숲속 천막'],ruin:['13_','덩굴 낀 폐허'],special:['12_','큰 버섯 군락']},
  autumn:{start:['15_','버려진 수레'],camp:['14_','건초 더미'],ruin:['13_','낡은 허수아비'],special:['12_','호박 무더기']},
  winter:{start:['13_','눈 덮인 이정표'],camp:['14_','꺼진 모닥불'],ruin:['15_','버려진 썰매'],special:['12_','눈사람']},
  ice:{start:['15_','얼음 제단'],camp:['14_','고드름 바위'],ruin:['13_','얼어붙은 갑옷'],special:['12_','얼음 부유물']},
  volcano:{start:['15_','불의 제단'],camp:['14_','용암 가장자리'],ruin:['13_','녹아붙은 갑옷'],special:['12_','검게 탄 묘비']},
  swamp:{start:['14_','낡은 판자길'],camp:['15_','마녀의 솥'],ruin:['13_','가라앉은 기둥'],special:['12_','독버섯 군락']}
};
const PLAYER_STATUS={slow:0,stone:0,bleed:0,burn:0,bleedTick:0,burnTick:0};
let fieldTheme = 'spring', fieldSerial = 0, playerInv = 0, fieldBuildMs = 0, fieldLeg = 1, fieldLegs = 1, legBusy = false;

function combatTargets(){ return dummies.concat(monsters.filter(m => !m.dead && !m.removed && !(m.vanishT>0))); }
function waitImages(list){ return Promise.all(list.map(im => im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; }))); }
function fieldPattern(g, im){ try { return g.createPattern(im, 'repeat'); } catch(e){ return '#607d45'; } }
function fieldPropMeta(theme, prefix){
  return (A.field.props[theme] || []).find(x => x.name.startsWith(prefix)) || null;
}
function fieldPropSize(name){
  if(/tree_(big|maple|ginkgo|pine_big|willow|mangrove|burnt_big|frozen|crystal)/.test(name))return 3.7;
  if(/tree_(mid|pine|bare|burnt|dead|vine)/.test(name))return 3.0;
  if(/tree_young/.test(name))return 2.3;
  if(name.includes('cave'))return 3.6;if(name.includes('ruin'))return 2.6;if(name.includes('campfire')||name.includes('tent'))return 1.7;
  if(name.includes('log'))return 1.9;if(/rock_big|rock_lava|rock_ice/.test(name))return 1.9;if(name.includes('rocks')||name.includes('obsidian')||name.includes('ice_shards'))return 1.55;
  if(name.includes('bush')||name.includes('fern')||name.includes('reeds'))return 1.45;
  if(name.includes('ice_pillar')||name.includes('lava_edge')||name.includes('crater'))return 1.7;
  return 1.15;
}
function isTreeName(n){ return n.includes('tree_'); }
function isSoftName(n){ return n.includes('grass') || n.includes('flowers') || n.includes('mushroom'); }
let fieldMapW=48,fieldMapH=32,fieldOutdoor=null; // 2026-10-06: 막힘 가독성/축소 거점 기준

function inTownReserve(x,y){const L=FIELD_LAYOUT[fieldTheme]||FIELD_LAYOUT.spring;return fieldLeg===fieldLegs&&x>L.village[0]-4&&x<L.village[2]+4&&y>L.village[1]-5&&y<L.village[3]+4;}
function outdoorFloor(bg,x,y){return !!(bg&&bg.grid&&bg.grid[y]&&bg.grid[y][x]);}
function outdoorBoundary(bg,x,y){
  if(!bg||!bg.grid||outdoorFloor(bg,x,y))return false;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(outdoorFloor(bg,x+dx,y+dy))return true;
  return false;
}
function fixedFieldY(x){const L=FIELD_LAYOUT[fieldTheme]||FIELD_LAYOUT.spring,t=Math.max(0,Math.min(1,(x-L.start[0])/(L.end[0]-L.start[0])));return L.start[1]*(1-t)+L.end[1]*t+Math.sin(t*Math.PI*2)*2.6;}
function nearMainPath(x,y,pad){
  if(fieldOutdoor&&fieldOutdoor.grid){
    const ix=Math.floor(x),iy=Math.floor(y),r=Math.ceil(pad||2);
    for(let yy=iy-r;yy<=iy+r;yy++)for(let xx=ix-r;xx<=ix+r;xx++)if(outdoorFloor(fieldOutdoor,xx,yy))return true;
    return false;
  }
  return Math.abs(y-fixedFieldY(x))<(pad||2.2);
}
async function makeFieldGround(theme,withVillage=false){
  const isLast=!!withVillage;
  if(isLast){
    // 마지막 거점은 이동용 큰 필드가 아니라 '작은 지역 거점'으로 사용한다.
    fieldMapW=48;fieldMapH=32;fieldOutdoor=null;
    const W=48,H=32,L=FIELD_LAYOUT[theme]||FIELD_LAYOUT.spring,w=W*TS,h=H*TS,c=document.createElement('canvas');c.width=w;c.height=h;
    const g=c.getContext('2d'),t=fieldTiles[theme],ims=Object.values(t);await waitImages(ims);
    const base=t.grass||ims[0],flower=t.grass_flower||base,dirt=t.dirt||t.path||base,path=t.path||dirt;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)g.drawImage(Math.random()<.13?flower:base,x*TS,y*TS,TS+1,TS+1);

    // 입구 → 거점 → 다음 지역 출구. 기존 마지막 맵의 분위기는 유지하되 이동거리는 줄인다.
    g.save();g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(L.start[0]*TS,L.start[1]*TS);g.bezierCurveTo(L.curve[0]*TS,L.curve[1]*TS,L.curve[2]*TS,L.curve[3]*TS,L.end[0]*TS,L.end[1]*TS);
    g.strokeStyle=fieldPattern(g,dirt);g.globalAlpha=.36;g.lineWidth=142;g.stroke();g.strokeStyle=fieldPattern(g,path);g.globalAlpha=.93;g.lineWidth=82;g.stroke();g.restore();
    const vx=L.village[0],vy=L.village[1];g.save();g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo((vx-2.4)*TS,(vy-2.0)*TS);g.bezierCurveTo((vx-1.7)*TS,(vy-1.2)*TS,(vx-.8)*TS,(vy-.3)*TS,vx*TS,vy*TS);
    g.strokeStyle=fieldPattern(g,dirt);g.globalAlpha=.42;g.lineWidth=88;g.stroke();g.strokeStyle=fieldPattern(g,path);g.globalAlpha=.92;g.lineWidth=52;g.stroke();
    g.globalAlpha=.76;g.fillStyle=fieldPattern(g,dirt);g.beginPath();g.ellipse((vx+.6)*TS,(vy+.4)*TS,4.1*TS,2.5*TS,0,0,7);g.fill();g.restore();

    const pools={
      spring:[[23,6.5,2.5,1.35],[37.5,24.3,2.2,1.2]],summer:[[20,7.0,2.5,1.4],[33.5,25.0,2.5,1.3]],
      autumn:[[18,24.0,2.3,1.2],[33.5,5.8,2.1,1.1]],winter:[[22,6.0,2.6,1.4],[35,25,2.3,1.2]],
      ice:[[18,7.0,2.8,1.5],[31,25,2.6,1.3]],volcano:[[20,7.0,2.7,1.4],[33,24.5,2.5,1.3]],
      swamp:[[19,5.8,3.0,1.6],[31,25.0,3.2,1.7]]
    }[theme]||[];
    if(t.water&&t.sand)for(const q of pools){
      g.save();g.beginPath();g.ellipse(q[0]*TS,q[1]*TS,q[2]*TS,q[3]*TS,0,0,7);g.clip();g.globalAlpha=.72;g.fillStyle=fieldPattern(g,t.sand);
      g.fillRect((q[0]-q[2])*TS,(q[1]-q[3])*TS,q[2]*2*TS,q[3]*2*TS);g.globalAlpha=.86;g.beginPath();g.ellipse(q[0]*TS,q[1]*TS,q[2]*.76*TS,q[3]*.72*TS,0,0,7);g.clip();
      g.fillStyle=fieldPattern(g,t.water);g.fillRect((q[0]-q[2])*TS,(q[1]-q[3])*TS,q[2]*2*TS,q[3]*2*TS);g.restore();
    }
    const mini=document.createElement('canvas');mini.width=288;mini.height=192;mini.getContext('2d').drawImage(c,0,0,mini.width,mini.height);
    return {ground:c,mini,w:W,h:H,start:{x:L.start[0],y:L.start[1]},end:{x:L.end[0],y:L.end[1]},grid:null,rooms:[]};
  }

  // 중간 필드 = 던전의 방+복도 생성 규칙을 쓰되, 화면에서는 밝은 야외 지형으로 보인다.
  fieldMapW=48;fieldMapH=48;
  const D=genRoomLayout(48,48,12,{x:32,y:18,w:12,h:10});
  D.carve(1,D.start.cy-1,D.start.x,D.start.cy+1);
  D.carve(D.far.x+D.far.w-1,D.far.cy-1,46,D.far.cy+1);

  const visualTheme=theme,t=fieldTiles[visualTheme],ims=Object.values(t);await waitImages(ims);
  const base=t.grass||ims[0],flower=t.grass_flower||base,dirt=t.dirt||t.path||base,blockedTex=t.water||base;
  const dark={
    spring:'rgba(18,62,24,.49)',summer:'rgba(12,52,28,.53)',autumn:'rgba(68,43,20,.41)',
    winter:'rgba(45,64,72,.33)',ice:'rgba(25,68,98,.35)',volcano:'rgba(50,18,10,.45)',swamp:'rgba(20,42,25,.51)'
  }[visualTheme]||'rgba(20,55,25,.45)';
  const liquidBlocked=visualTheme==='volcano'||visualTheme==='swamp'||visualTheme==='ice';

  const c=document.createElement('canvas');c.width=48*TS;c.height=48*TS;const g=c.getContext('2d');
  const shade=document.createElement('canvas');shade.width=c.width;shade.height=c.height;const sg=shade.getContext('2d');
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){
    const walk=D.g[y][x]===1,boundary=!walk&&outdoorBoundary({grid:D.g},x,y);
    if(walk){
      g.drawImage(Math.random()<.18?flower:base,x*TS,y*TS,TS+1,TS+1);
      if(Math.random()<.045){g.globalAlpha=.18;g.drawImage(dirt,x*TS,y*TS,TS+1,TS+1);g.globalAlpha=1;}
    }else{
      // 통행 판정은 기존 grid 그대로 두고, 막힘 영역의 시각 경계만 맵 생성 시 1회 부드럽게 섞는다.
      if(liquidBlocked&&!boundary)g.drawImage(blockedTex,x*TS,y*TS,TS+1,TS+1);
      else g.drawImage(base,x*TS,y*TS,TS+1,TS+1);
      sg.fillStyle=dark;sg.fillRect(x*TS,y*TS,TS+1,TS+1);
    }
  }
  const soft=document.createElement('canvas');soft.width=c.width;soft.height=c.height;const fg=soft.getContext('2d');
  fg.filter='blur(15px)';fg.drawImage(shade,0,0);fg.filter='none';g.drawImage(soft,0,0);

  const mini=document.createElement('canvas');mini.width=288;mini.height=288;const mg=mini.getContext('2d');
  mg.fillStyle=visualTheme==='volcano'?'#492017':visualTheme==='ice'?'#315b72':visualTheme==='swamp'?'#273b2a':'#284b28';mg.fillRect(0,0,288,288);
  mg.fillStyle=visualTheme==='winter'||visualTheme==='ice'?'#b8d1d1':visualTheme==='autumn'?'#b88b4e':'#80b95b';
  for(let y=0;y<48;y++)for(let x=0;x<48;x++)if(D.g[y][x])mg.fillRect(x*6,y*6,6,6);

  const bg={ground:c,mini,w:48,h:48,grid:D.g,rooms:D.rooms,start:{x:1.8,y:D.start.cy},end:{x:46.2,y:D.far.cy},startRoom:D.start,farRoom:D.far};
  fieldOutdoor=bg;return bg;
}
function mkFieldProp(meta, x, y, kind, name){
  if (!meta) return null; const wt = fieldPropSize(meta.name), w = wt * TS, im = BI[meta.key], ar = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
  const h = Math.max(TS*.8, w * ar);
  const soft = isSoftName(meta.name), tree = isTreeName(meta.name);
  return { k:meta.key, name:name || null, x:x*TS, y:y*TS, w, h, cw:soft?0:(tree?.16:.72), cd:soft?0:(tree?.35*TS:.45*TS), tree, shadow:!soft, kind:kind || '', r:kind==='dungeon'?64:46 };
}
function fieldPropClear(x, y, meta, out){
  const soft = isSoftName(meta.name), rr = soft ? 0.7 : Math.max(1.0, fieldPropSize(meta.name) * 0.48);
  for (const p of out){
    if (!p || !p.k) continue;
    const pm = (A.field.props[fieldTheme] || []).find(q => q.key === p.k);
    const pr = pm && isSoftName(pm.name) ? 0.55 : Math.max(0.9, (p.w / TS) * 0.42);
    if (Math.hypot(x - p.x / TS, y - p.y / TS) < rr + pr + (soft ? 0.15 : 0.45)) return false;
  }
  return true;
}
function randomFieldProps(theme,isLast=false,bg=null){
  const visualTheme=theme,all=A.field.props[visualTheme]||[],out=[],poi=FIELD_POI[theme]||FIELD_POI.spring;
  const cave=fieldPropMeta(visualTheme,'16_');
  const startMeta=fieldPropMeta(visualTheme,poi.start[0]),campMeta=fieldPropMeta(visualTheme,poi.camp[0]),ruinMeta=fieldPropMeta(visualTheme,poi.ruin[0]),specialMeta=fieldPropMeta(visualTheme,poi.special[0]);
  if(isLast){
    const L=FIELD_LAYOUT[theme]||FIELD_LAYOUT.spring;
    const fixedPoi=[
      mkFieldProp(startMeta,L.sign[0],L.sign[1],'',poi.start[1]),
      mkFieldProp(campMeta,L.camp[0],L.camp[1],theme==='spring'||theme==='summer'?'fire':'',poi.camp[1]),
      mkFieldProp(ruinMeta,L.ruin[0],L.ruin[1],'',poi.ruin[1]),
      mkFieldProp(specialMeta,L.special[0],L.special[1],'',poi.special[1]),
      mkFieldProp(cave,L.cave[0],L.cave[1],'dungeon','필드 동굴 입구')
    ];
    if(fixedPoi[0])fixedPoi[0].aliases=['지역 이정표'];
    if(fixedPoi[1])fixedPoi[1].aliases=['야영지'];
    if(fixedPoi[2])fixedPoi[2].aliases=['무너진 폐허'];
    for(const p of fixedPoi)if(p)out.push(p);
    const pool=all.filter(x=>!/^1[3-6]_/.test(x.name));let tries=0;
    while(out.length<46&&tries++<620){
      const x=2+Math.random()*44,y=2+Math.random()*28;
      if(nearMainPath(x,y,2.3)||(x>L.village[0]-4&&x<L.village[2]+4&&y>L.village[1]-5&&y<L.village[3]+4)||Math.hypot(x-L.cave[0],y-L.cave[1])<4||Math.hypot(x-L.start[0],y-L.start[1])<4||Math.hypot(x-L.end[0],y-L.end[1])<4)continue;
      const meta=pool[Math.floor(Math.random()*pool.length)];if(!meta)break;if(!fieldPropClear(x,y,meta,out))continue;
      const p=mkFieldProp(meta,x,y,'',null);if(p)out.push(p);
    }
    return out;
  }

  // 막힌 경계는 눈으로도 '벽'처럼 읽혀야 한다. 나무/수풀/바위/테마 지형을 거의 연속으로 배치한다.
  const boundaryPool=all.filter(m=>/(tree|bush|rock|fern|reeds|obsidian|ice_shards|ice_pillar|lava_edge|crater|mangrove|stump)/.test(m.name));
  let boundaryCount=0;
  for(let y=1;y<47;y++)for(let x=1;x<47;x++){
    if(!outdoorBoundary(bg,x,y)||Math.random()>.80)continue;
    if(Math.hypot(x-bg.start.x,y-bg.start.y)<3.2||Math.hypot(x-bg.end.x,y-bg.end.y)<3.2)continue;
    const meta=boundaryPool[Math.floor(Math.random()*boundaryPool.length)];if(!meta)continue;
    const p=mkFieldProp(meta,x+.5,y+.82,'',null);
    if(p){p.cw=0;p.cd=0;out.push(p);boundaryCount++;}
    if(boundaryCount>=190)break;
  }

  // 경계 바로 뒤에도 듬성듬성 오브제를 더 넣어 '빈 검은 바닥'처럼 보이지 않게 한다.
  let deepCount=0;
  for(let tries=0;tries<700&&deepCount<55;tries++){
    const x=2+Math.random()*44,y=2+Math.random()*44,ix=Math.floor(x),iy=Math.floor(y);
    if(outdoorFloor(bg,ix,iy)||outdoorBoundary(bg,ix,iy))continue;
    const meta=boundaryPool[Math.floor(Math.random()*boundaryPool.length)];if(!meta)break;
    const p=mkFieldProp(meta,x,y,'',null);if(p){p.cw=0;p.cd=0;out.push(p);deepCount++;}
  }

  const rooms=(bg&&bg.rooms||[]).filter(r=>r!==bg.startRoom&&r!==bg.farRoom);
  if(rooms.length){
    const r0=rooms[Math.floor(Math.random()*rooms.length)],r1=rooms[Math.floor(Math.random()*rooms.length)];
    const c0=mkFieldProp(campMeta,r0.cx,r0.cy,theme==='spring'||theme==='summer'?'fire':'',poi.camp[1]),c1=mkFieldProp(ruinMeta,r1.cx,r1.cy,'',poi.ruin[1]);
    if(c0){c0.aliases=['야영지'];out.push(c0);}if(c1){c1.aliases=['무너진 폐허'];out.push(c1);}
  }
  const sg=mkFieldProp(startMeta,bg.start.x+1.4,bg.start.y-.5,'',poi.start[1]);if(sg){sg.aliases=['지역 이정표'];out.push(sg);}
  const softPool=all.filter(m=>isSoftName(m.name));let tries=0;
  while(out.length<250&&tries++<900){
    const x=2+Math.random()*44,y=2+Math.random()*44;if(!outdoorFloor(bg,Math.floor(x),Math.floor(y)))continue;
    if(Math.hypot(x-bg.start.x,y-bg.start.y)<4||Math.hypot(x-bg.end.x,y-bg.end.y)<4)continue;
    const meta=softPool[Math.floor(Math.random()*softPool.length)];if(!meta)break;
    const p=mkFieldProp(meta,x,y,'',null);if(p)out.push(p);
  }
  return out;
}
function fieldBuilding(k,name,x,y,wt,kind,market){
  const im=BI[k], ar=im&&im.naturalWidth?im.naturalHeight/im.naturalWidth:.82;
  const w=wt*TS, h=w*ar;
  return {k,name,x:x*TS,y:y*TS,w,h,door:0,kind:kind||'bld',market:market||null};
}
function makeFieldVillage(theme){
  const L=FIELD_LAYOUT[theme]||FIELD_LAYOUT.spring;
  // 지역별 마지막 거점 위치를 따로 둔다. 건물 기능은 같고 주변 지형·소품이 지역 분위기를 만든다.
  const gate=fieldBuilding('cottage_thatch',FIELD_INFO[theme][1]+' 작은 마을',L.village[0],L.village[1],4.2,'field_village',theme);
  const house=fieldBuilding('house_red','마을 주택',L.village[2],L.village[3],3.5,'bld',theme);house.noSpot=1;
  return [gate,house];
}
function villageProp(k,x,y,wt,name=null,kind=''){
  const im=BI[k],ar=im&&im.naturalWidth?im.naturalHeight/im.naturalWidth:.8,w=wt*TS,h=w*ar;
  return {k,name,x:x*TS,y:y*TS,w,h,cw:kind?0:.72,cd:kind?0:.34*TS,kind,shadow:true};
}
async function makeFieldVillageGround(theme){
  const W=32,H=22,w=W*TS,h=H*TS,cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d'),t=fieldTiles[theme],ims=Object.values(t);await waitImages(ims);
  const base=t.grass||ims[0],flower=t.grass_flower||base,dirt=t.dirt||t.path||base,path=t.path||dirt;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)g.drawImage(Math.random()<.16?flower:base,x*TS,y*TS,TS+1,TS+1);
  g.save();g.lineCap='round';g.lineJoin='round';
  g.globalAlpha=.55;g.fillStyle=fieldPattern(g,dirt);g.beginPath();g.ellipse(16*TS,12.2*TS,8.2*TS,4.8*TS,0,0,7);g.fill();
  g.beginPath();g.moveTo(16*TS,21.5*TS);g.lineTo(16*TS,12*TS);g.strokeStyle=fieldPattern(g,path);g.globalAlpha=.96;g.lineWidth=76;g.stroke();
  g.beginPath();g.moveTo(8.5*TS,11.1*TS);g.bezierCurveTo(11*TS,12*TS,21*TS,12*TS,23.5*TS,11.1*TS);g.lineWidth=54;g.stroke();g.restore();
  const mini=document.createElement('canvas');mini.width=256;mini.height=176;mini.getContext('2d').drawImage(cv,0,0,mini.width,mini.height);
  return {ground:cv,mini};
}
function villageNpc(shop,name,title,line,x,y,market){
  const base=MAPS.town.npcs.find(n=>n.shop===shop);
  if(!base)return null;
  return {...base,name,title,line,shop,market,x:x*TS,y:y*TS,at:null};
}
function themedVillageEdgeProps(theme){
  const all=A.field.props[theme]||[],out=[],pick=(re)=>all.filter(m=>re.test(m.name));
  const pool=pick(/tree|bush|fern|reeds|rock|obsidian|ice_shards|ice_pillar|stump|mangrove|lava_edge/);
  if(!pool.length)return out;
  const spots=[[2.0,4.5],[4.0,3.5],[28.0,4.2],[30.0,6.2],[2.4,17.5],[4.7,19.2],[27.8,18.5],[30,16.8],
    [7,3.2],[12,2.7],[20,2.8],[25,3.3],[6,19.3],[11,20],[21,20],[26,19.5]];
  for(let i=0;i<spots.length;i++){
    const m=pool[(i*3+FIELD_TIER[theme])%pool.length],p=mkFieldProp(m,spots[i][0],spots[i][1],'',null);
    if(p){p.cw=0;p.cd=0;out.push(p);}
  }
  return out;
}
let fieldVillageReturn=null;
async function prepareFieldVillage(theme,returnState){
  theme=theme in FIELD_INFO?theme:'spring';fieldTheme=theme;fieldVillageReturn=returnState||fieldVillageReturn;
  if(fieldVillageReturn){const minLegs=(FIELD_TIER[theme]||1)+1;fieldLegs=Math.max(minLegs,fieldVillageReturn.legs||0);fieldLeg=Math.max(1,Math.min(fieldVillageReturn.leg||fieldLegs,fieldLegs));}
  const bg=await makeFieldVillageGround(theme);
  const b1=fieldBuilding('cottage_thatch','마을집',5.7,7.2,4.0,'bld',theme);b1.noSpot=1;
  const b2=fieldBuilding('house_blue','마을집',26.3,7.2,4.0,'bld',theme);b2.noSpot=1;
  const props=[
    villageProp('fountain',16,13.0,3.5),
    villageProp('stall_red',9.2,10.2,3.2),villageProp('stall_blue',22.8,10.2,3.2),
    villageProp('bench_iron',12.2,15.6,1.7),villageProp('bench_iron',19.8,15.6,1.7),
    villageProp('cart',5.3,13.9,2.1),villageProp('hay',27.1,14.2,1.6),
    villageProp('flowerbed_wood',8.0,16.7,2.0),villageProp('flowerbed_wood',24.0,16.7,2.0),
    villageProp('pot_flowers',12.2,8.4,1.0),villageProp('pot_flowers',19.8,8.4,1.0),
    villageProp('tree_small',3.0,5.0,2.7),villageProp('tree_small',29.0,5.2,2.7),
    ...themedVillageEdgeProps(theme)
  ].filter(p=>p&&BI[p.k]);
  const general=villageNpc('general','마을 잡화상','잡화 노점','필요한 물건은 여기서 챙겨 가세요.',9.2,11.0,theme);
  const trader=villageNpc('trade','마을 교역상','교역 노점','이 지역 물건 시세부터 보고 가시죠.',22.8,11.0,theme);
  const map={name:FIELD_INFO[theme][1]+' 작은 마을',market:theme,map:{w:32,h:22,ts:TS,px:TS},ground:bg.ground,mini:bg.mini,
    blds:[b1,b2],props,npcs:[general,trader].filter(Boolean),spawn:[16*TS,19.2*TS],
    exits:[{x0:13.8*TS,x1:18.2*TS,y0:21.1*TS,y1:22*TS,fn:()=>leaveFieldVillage()}]};
  map.G=bg.ground;map.MINI=bg.mini;MAPS.fieldvillage=map;return map;
}
async function enterFieldVillage(theme){
  if(traveling)return false;
  const fs=window.__FD&&__FD.state?__FD.state():null;
  const ret={theme:fs&&fs.theme?fs.theme:fieldTheme,leg:fs&&fs.leg?fs.leg:fieldLeg,legs:fs&&fs.legs?fs.legs:fieldLegs,x:P.x,y:P.y,dir:P.dir||'front'};
  const m=await prepareFieldVillage(theme||fieldTheme,ret);travel('fieldvillage',m.spawn,'back');return true;
}
async function leaveFieldVillage(){
  if(traveling||!fieldVillageReturn)return false;
  const q=fieldVillageReturn;await prepareField(q.theme,q.leg,q.legs);travel('field',[q.x,q.y+TS*.85],q.dir||'front');return true;
}

// 길 구간(leg): 목적지 티어와 같은 수의 필드를 이어서 지난다. 마지막 구간(leg===legs)에만 작은 마을이 있다.
async function prepareField(theme, leg, legs){
  const t0 = performance.now();
  fieldTheme = theme in FIELD_INFO ? theme : 'spring'; fieldSerial++;
  const minLegs=(FIELD_TIER[fieldTheme]||1)+1; fieldLegs=Math.max(minLegs,legs||0); fieldLeg=Math.max(1,Math.min(leg||1,fieldLegs));
  const lg = fieldLeg, ls = fieldLegs, th = fieldTheme, isLast = lg === ls;
  const bg=await makeFieldGround(th,isLast),props=randomFieldProps(th,isLast,bg),start=bg.start,end=bg.end;
  const ex=[];
  if(lg>1)ex.push({x0:1.05*TS,x1:2.4*TS,y0:(start.y-1.8)*TS,y1:(start.y+1.8)*TS,fn:()=>goLeg(th,lg-1,ls,'right')});
  else ex.push({x0:1.05*TS,x1:2.4*TS,y0:(start.y-1.8)*TS,y1:(start.y+1.8)*TS,to:'out',pos:[2.2*TS,11.4*TS],dir:'side'});
  if(isLast)ex.push({x0:(bg.w-1.15)*TS,x1:bg.w*TS,y0:(end.y-2.6)*TS,y1:(end.y+2.6)*TS,fn:()=>askDestination()});
  else ex.push({x0:(bg.w-2.4)*TS,x1:(bg.w-1.05)*TS,y0:(end.y-1.8)*TS,y1:(end.y+1.8)*TS,fn:()=>goLeg(th,lg+1,ls,'left')});
  const storyBlds=[];
  if(!isLast&&th==='autumn'&&lg===3){
    const rs=(bg.rooms||[]).filter(r=>r!==bg.startRoom&&r!==bg.farRoom).sort((a,b)=>(b.w*b.h)-(a.w*a.h));
    const rr=rs[0];if(rr)storyBlds.push(fieldBuilding('house_red','상인협회',rr.cx,rr.y+rr.h-1.0,3.8,'bld',th));
  }
  const map={
    name:FIELD_INFO[th][1]+(ls>1?' '+lg+'/'+ls:''),market:th,map:{w:bg.w,h:bg.h,ts:TS,px:TS},ground:bg.ground,mini:bg.mini,
    blds:isLast?makeFieldVillage(th):storyBlds,props,npcs:[],grid:bg.grid||null,rooms:bg.rooms||[],startRoom:bg.startRoom||null,farRoom:bg.farRoom||null,
    spawn:[(start.x+.8)*TS,start.y*TS],exits:ex,fieldStart:start,fieldEnd:end
  };
  map.G = bg.ground; map.MINI = bg.mini;
  MAPS.field = map; fieldBuildMs = performance.now() - t0; return map;
}
async function goLeg(theme, leg, legs, side){
  if (legBusy || traveling) return false; legBusy = true;
  try{const m=await prepareField(theme,leg,legs),end=m.fieldEnd||{x:m.map.w-3,y:8};travel('field',side==='right'?[(end.x-.8)*TS,end.y*TS]:m.spawn,'side');return true;}
  finally { legBusy = false; }
}
function askDestination(){
  if (panel || traveling) return; P.x -= 70; openRegionSelect('village');
}
function ensureRegionUI(){
  if ($('regionPick')) return;
  const st = document.createElement('style');
  st.textContent = '#regionPick{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:#0d1220aa}#regionPick.on{display:flex}#regionPick .rp{width:min(760px,92vw);padding:34px;border:4px solid #8a6b3e;border-radius:20px;background:#201a15f2;color:#fff3d6;box-shadow:0 18px 60px #000a;font-family:sans-serif}#regionPick h2{margin:0 0 8px;text-align:center;font-size:30px}#regionPick p{text-align:center;color:#d8c7a5}#regionGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:20px}#regionGrid button{padding:16px 18px;border:2px solid #80643a;border-radius:14px;background:#352b20;color:#fff3d6;text-align:left;font-weight:800;font-size:18px}#regionGrid button small{display:block;margin-top:4px;color:#c9b891;font-weight:600}#regionGrid button:hover{background:#4a3927}#regionGrid button:disabled{opacity:.45}';
  document.head.append(st);
  const o = document.createElement('div'); o.id='regionPick'; o.innerHTML='<div class="rp"><h2>어디로 가시겠습니까?</h2><p id="regionNote"></p><div id="regionGrid"></div></div>';
  document.body.append(o);
  o.addEventListener('click',e=>{ if(e.target===o) closeRegionSelect(); });
}
function regionUnlockInfo(theme){
  const tier=FIELD_TIER[theme]||1;
  if(tier<=1)return {open:true,level:1,quest:null};
  const level=(tier-1)*10,quest='MAIN_'+String((tier-1)*10).padStart(3,'0');
  const completed=window.QUEST&&QUEST.state?QUEST.state().completed:[];
  return {open:P.lv>=level||completed.includes(quest),level,quest};
}
function regionBtnHtml(r){
  const n=(FIELD_TIER[r[0]]||1)+1,u=regionUnlockInfo(r[0]);
  return r[1]+'<small>'+r[2]+' · '+(n-1)+'개 야외길 + 마지막 거점'+(u.open?'':' · 잠김 (Lv'+u.level+' 또는 이야기 진행)')+'</small>';
}
function fillRegionGrid(mode){
  const gr=$('regionGrid'); gr.innerHTML='';
  $('regionNote').textContent = mode==='village' ? '이동 가능한 지역만 선택할 수 있습니다. 다음 지역은 레벨 또는 이야기 진행으로 열립니다.' : '봄 초원부터 시작합니다. 다음 지역은 10레벨 단위 또는 이야기 진행으로 순서대로 열립니다.';
  if (mode==='village'){ const b=document.createElement('button'); b.type='button'; b.dataset.theme='town'; b.innerHTML='큰 마을<small>바로 돌아갑니다</small>'; b.onclick=()=>{ closeRegionSelect(); returnFromField(); }; gr.append(b); }
  for (const r of FIELD_THEMES){
    const b=document.createElement('button'),u=regionUnlockInfo(r[0]); b.type='button'; b.dataset.theme=r[0]; b.innerHTML=regionBtnHtml(r);
    if(!u.open||(mode==='village'&&r[0]===fieldTheme)) b.disabled=true;
    b.onclick=()=>selectRegion(r[0],b); gr.append(b);
  }
}
function openRegionSelect(mode){ closeAll(); ensureRegionUI(); fillRegionGrid(mode); panel='region'; $('regionPick').classList.add('on'); }
function closeRegionSelect(silent){ const o=$('regionPick'); if(o) o.classList.remove('on'); if(panel==='region') panel=null; }
async function selectRegion(theme, btn){
  const unlock=regionUnlockInfo(theme);
  if(!unlock.open){say('아직 갈 수 없는 지역입니다. Lv'+unlock.level+' 또는 이야기 진행이 필요합니다.');return false;}
  ensureRegionUI(); const bs=[...$('regionGrid').querySelectorAll('button')]; bs.forEach(x=>x.disabled=true); const keep=btn&&btn.innerHTML; if(btn) btn.textContent='길을 확인하는 중…';
  try { const m=await prepareField(theme,1); closeRegionSelect(); travel('field',m.spawn,'side'); }
  finally { fillRegionGrid(MAP==='field'?'village':'field'); if(btn&&keep) btn.innerHTML=keep; }
  return true;
}
function returnFromField(){ travel('out',[2.2*TS,11.4*TS],'side'); }

const MOBDEF=TIER_MATCH.monsters;
const THEME_MOBS=Object.fromEntries(FIELD_THEMES.map((x,i)=>[x[0],TIER_MATCH.fieldPools[i]]));
function mobImageSet(id){
  const imgs=mon3[id];if(!imgs||!imgs.front)throw Error('몬스터 이미지 누락: '+id);
  return imgs;
}
let packSerial=0;
function createMonster(id,x,y,opts={}){
  const d=MOBDEF[id],st=matchedMonsterStats(id,P.lv,opts.floor||0,opts.bossRole||'');
  st.hp*=NUM;st.dmg*=NUM;st.exp*=NUM;
  if(opts.caveChallenge){st.hp*=1.4;st.dmg*=1.4;}
  const baseW=82*d.bodySize,w=baseW*(d.rank==='boss'?1.2:1);
  return {...st,monster:1,type:id,family:d.family,name:d.name,elite:d.rank==='elite',boss:d.rank==='boss',baseW,w,h:w,x,y,maxHp:st.hp,
    sp:d.sp*(1+(d.tier-1)*.025),ranged:d.ranged||0,range:d.range||42,skill:d.skill||'',
    shotStatus:d.shotStatus||'',touchStatus:d.touchStatus||'',skillCd:.7+Math.random()*1.5,
    imgs:mobImageSet(id),face:'front',flip:false,state:'wander',tx:x,ty:y,wait:Math.random()*2,cd:Math.random(),
    hurt:0,stun:0,dead:false,death:0,homeX:x,homeY:y,...opts};
}
function spawnClear(m,placed=monsters,field=false){
  if(field){
    const x=m.x/TS,y=m.y/TS;
    if(CUR&&CUR.grid&&gridBlocked(m.x,m.y,m.w*.5))return false;
    if(!CUR.grid&&(nearMainPath(x,y,1.6)||inTownReserve(x,y)||Math.hypot(x-2.5,y-16)<6||Math.hypot(x-44.5,y-7)<5||Math.hypot(x-44,y-4.2)<5||Math.hypot(x-15.5,y-24)<4))return false;
  }
  if(pointInSolid(m.x,m.y,m.w*.5))return false;
  if(!field&&typeof gridBlocked==='function'&&gridBlocked(m.x,m.y,m.w*.5))return false;
  return placed.every(other=>other.removed||Math.hypot(m.x-other.x,m.y-other.y)>=Math.max(m.w,other.w)*1.1);
}
function spawnPack(config,cx,cy,opts={}){
  const packId=++packSerial,leader=createMonster(config.leader,cx,cy,{...opts,packId,packLeader:true});
  const members=[];
  for(const member of config.members){
    const n=member.min+Math.floor(Math.random()*(member.max-member.min+1));
    for(let i=0;i<n;i++)members.push(member.id);
  }
  const radius=Math.max(leader.w,...members.map(id=>82*MOBDEF[id].bodySize))*1.5,local=[leader];
  const phase=Math.random()*Math.PI*2;
  const magicFormation=config.leader==='skeleton_mage'||config.leader==='lich';
  const frontline=members.filter(id=>!MOBDEF[id].ranged),rear=members.filter(id=>MOBDEF[id].ranged);
  for(let i=0;i<members.length;i++){
    const id=members[i],ranged=!!MOBDEF[id].ranged,formation=ranged?rear:frontline,j=formation.indexOf(id)+members.slice(0,i).filter(x=>x===id).length;
    let x=cx+Math.cos(phase+i*Math.PI*2/members.length)*radius,y=cy+Math.sin(phase+i*Math.PI*2/members.length)*radius;
    if(magicFormation){
      // 마법 리더는 후열, 해골은 왼쪽 진입 방향 전열, 궁병은 측면 후열.
      const row=Math.floor(j/3),column=j%3,count=Math.min(3,formation.length-row*3),gap=82*MOBDEF[id].bodySize*1.15;
      x=cx+(ranged?1:-1)*(radius+row*gap);y=cy+(column-(count-1)/2)*gap;
    }
    local.push(createMonster(id,x,y,{floor:opts.floor||0,caveChallenge:!!opts.caveChallenge,packId,packLeader:false,packX:cx,packY:cy,packRadius:radius+240,skillCd:1.4+i*.36}));
  }
  const field=opts.field||false;
  for(let i=0;i<local.length;i++)if(!spawnClear(local[i],monsters.concat(local.slice(0,i)),field))return false;
  leader.packX=cx;leader.packY=cy;leader.packRadius=radius+240;
  monsters.push(...local);return true;
}
function pointInSolid(px, py, pad=0){
  for (const s of solids) if (px > s.x0 - pad && px < s.x1 + pad && py > s.y0 - pad && py < s.y1 + pad) return true;
  return false;
}
const FIELD_MOB_N=32;   // 필드 몬스터 예산(이전 16)
function spawnFieldMonsters(theme){
  monsters.length=0;dropsLoot.length=0;enemyShots.length=0;enemyHazards.length=0;
  const tier=FIELD_TIER[theme]||1,pool=THEME_MOBS[theme],elites=TIER_MATCH.fieldElites[tier-1];
  // 32마리 예산(케인 2026-10-04: 필드 100% 상향) 안에서 군집을 교체 배치(부하를 일반 스폰에 중복 추가하지 않는다).
  const first=createMonster(pool[0],0,0);
  for(let tries=0;tries<400;tries++){
    first.x=(5+Math.random()*(fieldMapW-10))*TS;first.y=(3+Math.random()*(fieldMapH-6))*TS;
    if(spawnClear(first,monsters,true)){first.tx=first.homeX=first.x;first.ty=first.homeY=first.y;monsters.push(first);break;}
  }
  const pack=TIER_MATCH.groups.find(g=>g.tier===tier&&!g.dungeonOnly);
  if(pack)for(let tries=0;tries<700;tries++)if(spawnPack(pack,(7+Math.random()*(fieldMapW-14))*TS,(6+Math.random()*(fieldMapH-12))*TS,{field:true}))break;
  for(let i=monsters.length;i<FIELD_MOB_N;i++){
    const id=elites.length&&(i===FIELD_MOB_N/2-2||i===FIELD_MOB_N-2)?elites[(fieldSerial+(i>FIELD_MOB_N/2?1:0))%elites.length]:pool[i%pool.length];
    for(let tries=0;tries<400;tries++){
      const m=createMonster(id,(5+Math.random()*(fieldMapW-10))*TS,(3+Math.random()*(fieldMapH-6))*TS);
      if(spawnClear(m,monsters,true)){monsters.push(m);break;}
    }
  }
}
function restAtCamp(){
  if(MAP!=='field'||traveling)return false;
  traveling=true;closeAll();
  const f=$('fade'),art=$('campArt');f.classList.add('slow');requestAnimationFrame(()=>f.classList.add('on'));
  setTimeout(()=>{
    if(window.TELEMETRY)TELEMETRY.camp();
    P.hp=P.maxHp;P.mp=P.maxMp;P.mpAcc=0;
    for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
    spawnFieldMonsters(fieldTheme);syncBars();
    if(typeof SFX!=='undefined')SFX.play('heal');
    const pic=A.camp&&A.camp[dayLook(DAY.t).lamp>.5?'night':'day'];
    if(art&&pic){art.style.backgroundImage='url('+pic+')';requestAnimationFrame(()=>art.classList.add('on'));}
    setTimeout(()=>{
      if(art)art.classList.remove('on');
      setTimeout(()=>{
        f.classList.remove('on');
        setTimeout(()=>{f.classList.remove('slow');traveling=false;say('푹 쉬었습니다. 주변의 기척이 다시 느껴집니다.');},560);
      },pic?720:0);
    },pic?2600:220);
  },560);
  return true;
}
function snapshotDynamicWorld(){
  return {
    monsters:monsters.slice(),dropsLoot:dropsLoot.slice(),enemyShots:enemyShots.slice(),enemyHazards:enemyHazards.slice(),
    solids:solids.slice(),spots:spots.slice(),sprites:sprites.slice(),trees:trees.slice(),npcs:npcs.slice(),dummies:dummies.slice(),exits:exits.slice(),
    lamps:lamps.slice()
  };
}
function restoreDynamicWorld(s){
  if(!s)return;
  const put=(dst,src)=>{dst.splice(0,dst.length,...(src||[]));};
  put(monsters,s.monsters);put(dropsLoot,s.dropsLoot);put(enemyShots,s.enemyShots);put(enemyHazards,s.enemyHazards);
  put(solids,s.solids);put(spots,s.spots);put(sprites,s.sprites);put(trees,s.trees);put(npcs,s.npcs);put(dummies,s.dummies);put(exits,s.exits);
  lamps=(s.lamps||[]).slice();
}
function afterDynamicBuild(id){
  if(window.__PORTAL_RUNTIME_RESTORE)return;
  if(id==='field'){dunGrid=null;spawnFieldMonsters(fieldTheme);}
  else if(id==='dungeon')spawnDungeonMonsters();
  else {dunGrid=null;monsters.length=0;dropsLoot.length=0;enemyShots.length=0;enemyHazards.length=0;}
}
function monsterBlocked(x,y){ return blocked(x,y); }
function moveMonster(m,dx,dy){
  if(!monsterBlocked(m.x+dx,m.y)) m.x+=dx;
  if(!monsterBlocked(m.x,m.y+dy)) m.y+=dy;
}
function faceMonster(m,dx,dy){
  if(Math.abs(dx)>Math.abs(dy)*.8){ m.face=dx<0?'left':'right'; }
  else m.face=dy<0&&m.imgs.back?'back':'front';
}
function defeatPlayer(){
  if(tryRevivePlayer())return;
  if(typeof onCompanionPlayerDefeat==='function')onCompanionPlayerDefeat();
  if(window.TELEMETRY)TELEMETRY.death({gold:P.gold});
  if(window.GUILD)GUILD.onDefeat();
  const lost=Math.floor(P.gold*.15); setGold(Math.max(0,P.gold-lost)); P.hp=P.maxHp; P.mp=P.maxMp; syncBars();
  for(const k in PLAYER_STATUS) PLAYER_STATUS[k]=0;P.shield=0;syncBars();
  say(lost?('쓰러졌습니다. 금화 '+lost+'닢을 잃었습니다.'):'쓰러졌습니다.');
  travel('town',[23*TS,22.2*TS],'front');
}
function rawPlayerDamage(v,label){
  if(P.reviveGrace>0)return;
  const cm=window.UI&&UI.combatMods?UI.combatMods():{damageReduce:0};
  v=Math.max(1,Math.round(v*(1-Math.min(75,cm.damageReduce||0)/100)));
  if(P.shield>0){v=absorbShield(v);if(v<=0)return;}   // 빙결 보호막이 먼저 받는다
  const actual=Math.min(P.hp,v);if(window.TELEMETRY)TELEMETRY.damageIn(actual);
  P.hp=Math.max(0,P.hp-v);syncBars();if(window.CHATTER)CHATTER.hurt();
  pops.push({x:P.x,y:P.y-95,t:0,txt:(label?label+' ':'')+'-'+v,enemy:true});
  if(P.hp<=0)defeatPlayer();
}
function applyPlayerStatus(kind,dur){
  if(!kind)return; PLAYER_STATUS[kind]=Math.max(PLAYER_STATUS[kind]||0,dur||2);
  if(kind==='slow') pops.push({x:P.x,y:P.y-110,t:0,txt:'둔화!',enemy:true});
  else if(kind==='stone') pops.push({x:P.x,y:P.y-110,t:0,txt:'석화!',enemy:true});
  else if(kind==='bleed') pops.push({x:P.x,y:P.y-110,t:0,txt:'출혈!',enemy:true});
  else if(kind==='burn') pops.push({x:P.x,y:P.y-110,t:0,txt:'화상!',enemy:true});
}
function hurtPlayer(v,dx,dy,status,statusDur){
  if(playerInv>0||traveling) return false;
  playerInv=.55; rawPlayerDamage(v); sfx.push({type:'hurt',t:0,x:P.x,y:P.y-42,r:36});
  if(P.reviveGrace>0)return true;
  const d=Math.hypot(dx,dy)||1; move(-dx/d*14,-dy/d*14);
  if(status&&!(P.shield>0)) applyPlayerStatus(status,statusDur);   // 보호막이 남아 있으면 상태이상도 막는다
  return true;
}
function updatePlayerStatus(dt){
  for(const k of ['slow','stone','bleed','burn']) PLAYER_STATUS[k]=Math.max(0,(PLAYER_STATUS[k]||0)-dt);
  if(PLAYER_STATUS.bleed>0){ PLAYER_STATUS.bleedTick-=dt; if(PLAYER_STATUS.bleedTick<=0){PLAYER_STATUS.bleedTick=.8;rawPlayerDamage(Math.max(1,P.maxHp*.025),'출혈');} }
  else PLAYER_STATUS.bleedTick=0;
  if(PLAYER_STATUS.burn>0){ PLAYER_STATUS.burnTick-=dt; if(PLAYER_STATUS.burnTick<=0){PLAYER_STATUS.burnTick=.7;rawPlayerDamage(Math.max(1,P.maxHp*.02),'화상');} }
  else PLAYER_STATUS.burnTick=0;
}
function playerMoveFactor(){ return PLAYER_STATUS.stone>0?0:(PLAYER_STATUS.slow>0?.48:1); }
function playerControlLocked(){ return PLAYER_STATUS.stone>0||P.castRoot>0; }
function enemyShot(m,dx,dy,speed,status,kind,dmgMul=1){
  const q=Math.hypot(dx,dy)||1;
  enemyShots.push({x:m.x,y:m.y-m.h*.55,vx:dx/q*speed,vy:dy/q*speed,t:0,life:1.6,dmg:Math.max(1,Math.round(m.dmg*dmgMul)),status:status||'',statusDur:status==='stone'?1.15:status==='slow'?2.2:3.2,kind:kind||'bolt',done:false});
}
// 몹 동작 연출(그림 쪽에서 읽음): kind = lunge(덮치기) / shoot(쏘기 반동) / wind(큰 기술 준비→내리치기) / burst(퍼뜨리기) / roar(포효)
function monAct(m,kind,dur,dx,dy){const q=Math.hypot(dx,dy)||1;m.act={k:kind,t:0,dur,dx:dx/q,dy:dy/q};}
function specialMonsterAI(m,dx,dy,d,dt){
  if(m.enraged){ /* marker only */ }
  if(m.skill==='berserk'&&!m.enraged&&m.hp<m.maxHp*.48){m.enraged=true;monAct(m,'roar',.55,dx,dy);m.sp*=1.55;m.dmg=Math.round(m.dmg*1.35);pops.push({x:m.x,y:m.y-m.h,t:0,txt:'광폭!',crit:true});}
  if(m.chargeWind>0){m.chargeWind-=dt;if(m.chargeWind<=0){m.chargeT=.42;m.chargeHit=false;}return true;}
  if(m.chargeT>0){
    m.chargeT-=dt; moveMonster(m,m.chargeDx*m.sp*3.6*dt,m.chargeDy*m.sp*3.6*dt);
    if(!m.chargeHit&&Math.hypot(P.x-m.x,P.y-m.y)<38){m.chargeHit=true;hurtPlayer(Math.round(m.dmg*1.35),P.x-m.x,P.y-m.y);}
    return true;
  }
  if(m.vanishT>0){
    m.vanishT-=dt;
    if(m.vanishT<=0){
      const q=d||1,tx=P.x-dx/q*58,ty=P.y-dy/q*58;
      if(!monsterBlocked(tx,ty)){m.x=tx;m.y=ty;}
    }
    return true;
  }
  if(m.skillCd>0)return false;
  if(m.skill==='rock'&&d<225){
    enemyShot(m,dx,dy,165,'','rock',1.05);monAct(m,'shoot',.3,dx,dy);if(typeof SFX!=='undefined')SFX.play('rock');m.skillCd=1.7+Math.random()*.5;
    pops.push({x:m.x,y:m.y-m.h,t:0,txt:'돌 던지기!',enemy:true});return true;
  }
  if(m.skill==='pounce'&&d>70&&d<205){
    const q=d||1;m.chargeDx=dx/q;m.chargeDy=dy/q;m.chargeWind=.24;if(typeof SFX!=='undefined')SFX.play('charge');m.skillCd=2.0+Math.random()*.4;return true;
  }
  if(m.skill==='dart'&&d<145){
    const q=d||1,mx=-dy/q,my=dx/q,side=Math.random()<.5?-1:1;
    {const x0=m.x,y0=m.y;moveMonster(m,mx*side*44,my*side*44);m.vox=(m.vox||0)+x0-m.x;m.voy=(m.voy||0)+y0-m.y;}m.skillCd=1.5+Math.random()*.4;return true;
  }
  if(m.skill==='splash'&&d<78){
    enemyHazards.push({kind:'slime',x:P.x,y:P.y-18,t:0,delay:.24,life:.8,r:48,dmg:Math.max(1,Math.round(m.dmg*.65)),status:'slow',done:false});if(typeof SFX!=='undefined')SFX.play('slime');
    monAct(m,'wind',.36,dx,dy);m.skillCd=2.2;return true;
  }
  if(m.skill==='cleave'&&d<72){
    enemyHazards.push({kind:'cleave',x:P.x,y:P.y-20,t:0,delay:.32,life:.7,r:58,dmg:Math.max(1,Math.round(m.dmg*1.25)),done:false});
    monAct(m,'wind',.44,dx,dy);m.skillCd=2.1;return true;
  }
  if(m.skill==='charge'&&d<225){const q=d||1;m.chargeDx=dx/q;m.chargeDy=dy/q;m.chargeWind=.42;m.skillCd=3.5;return true;}
  if(m.skill==='lightning'&&d<270){enemyHazards.push({kind:'lightning',x:P.x,y:P.y-25,t:0,delay:.65,life:1.0,r:38,dmg:Math.round(m.dmg*1.25),done:false});if(typeof SFX!=='undefined')SFX.play('lightning');monAct(m,'wind',.77,dx,dy);m.skillCd=2.8+Math.random()*.7;return true;}
  if(m.skill==='petrify'&&d<230){enemyShot(m,dx,dy,185,'stone','stone',.75);monAct(m,'shoot',.34,dx,dy);m.skillCd=3.0;return true;}
  if(m.skill==='radial'&&d<235){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;enemyShots.push({x:m.x,y:m.y-m.h*.5,vx:Math.cos(a)*220,vy:Math.sin(a)*220,t:0,life:1.55,dmg:Math.max(1,Math.round(m.dmg*.8)),kind:'feather',done:false});}
    monAct(m,'burst',.38,dx,dy);m.skillCd=2.7+Math.random()*.5;return true;
  }
  if(m.skill==='blink'&&d<230){m.vanishT=.55;m.skillCd=3.8+Math.random()*.8;return true;}
  if(m.skill==='web'&&d<165){enemyShot(m,dx,dy,205,'slow','web',.65);monAct(m,'shoot',.3,dx,dy);m.skillCd=2.8;return true;}
  return false;
}
function applyMonsterStatus(m,kind,dur){
  if(!m||m.dead||!kind)return;
  if(kind==='burn'){m.burnT=Math.max(m.burnT||0,dur||3);m.burnTick=Math.min(m.burnTick||.55,.55);}
  else if(kind==='slow'){m.slowT=Math.max(m.slowT||0,dur||2.5);}
  else if(kind==='poison'){m.poisonT=Math.max(m.poisonT||0,dur||4);m.poisonTick=Math.min(m.poisonTick||.65,.65);}
  else if(kind==='confuse'){if(m.boss||m.elite)dur=(dur||2.5)*.4;m.confuseT=Math.max(m.confuseT||0,dur||2.5);}
  else if(kind==='freeze'){if(m.boss||m.elite)dur=(dur||.75)*.4;m.freezeT=Math.max(m.freezeT||0,dur||.75);m.stun=Math.max(m.stun||0,dur||.75);}
}
function updEncounters(dt){
  playerInv=Math.max(0,playerInv-dt); updatePlayerStatus(dt);
  if(!combatMap()) return;

  for(const h of enemyHazards){
    h.t+=dt;
    if(!h.done&&h.t>=h.delay){h.done=true;if(Math.hypot(P.x-h.x,(P.y-30)-h.y)<h.r)hurtPlayer(h.dmg,P.x-h.x,P.y-h.y,h.status||'',h.status==='slow'?2.5:0);}
  }
  for(let i=enemyHazards.length-1;i>=0;i--) if(enemyHazards[i].t>enemyHazards[i].life)enemyHazards.splice(i,1);

  for(const s of enemyShots){
    s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(!s.done&&blocked(s.x,s.y)){s.done=true;continue;}
    if(!s.done&&Math.hypot(s.x-P.x,s.y-(P.y-35))<18){
      s.done=true; hurtPlayer(s.dmg,s.vx,s.vy,s.status,s.statusDur);
    }
    if(s.t>s.life) s.done=true;
  }
  for(let i=enemyShots.length-1;i>=0;i--) if(enemyShots[i].done) enemyShots.splice(i,1);

  for(const m of monsters){
    if(m.removed) continue;
    if(m.dead){
      if(m.reviveT>0){
        m.reviveT-=dt;
        if(m.reviveT<=0){m.dead=false;m.hp=Math.max(1,Math.round(m.maxHp*.38));m.death=0;m.stun=.45;pops.push({x:m.x,y:m.y-m.h,t:0,txt:'다시 일어남!',enemy:true});}
      } else {m.death+=dt;if(m.death>1)m.removed=true;}
      continue;
    }
    m.hurt=Math.max(0,m.hurt-dt);m.stun=Math.max(0,m.stun-dt);m.stunImm=Math.max(0,(m.stunImm||0)-dt);m.cd=Math.max(0,(m.cd||0)-dt);m.skillCd=Math.max(0,(m.skillCd||0)-dt);
    m.slowT=Math.max(0,(m.slowT||0)-dt);m.freezeT=Math.max(0,(m.freezeT||0)-dt);m.poisonT=Math.max(0,(m.poisonT||0)-dt);m.rdy=0;
    if(m.poisonT>0){m.poisonTick=(m.poisonTick||0)-dt;if(m.poisonTick<=0){m.poisonTick=.65;const pv=Math.max(1,Math.round(m.maxHp*.016));m.hp-=pv;pops.push({x:m.x,y:m.y-m.h*.8,t:0,txt:'독 '+pv,crit:true});if(m.hp<=0){killMonster(m);continue;}}}
    if(m.burnT>0){
      m.burnT=Math.max(0,m.burnT-dt);m.burnTick=(m.burnTick||0)-dt;
      if(m.burnTick<=0){m.burnTick=.55;const bv=Math.max(1,Math.round(m.maxHp*.022));m.hp-=bv;pops.push({x:m.x,y:m.y-m.h*.8,t:0,txt:'화상 '+bv,crit:true});if(m.hp<=0){killMonster(m);continue;}}
    }
    if(m.stun>0)continue;
    if(m.confuseT>0){   // 혼돈: 공격 못 하고 제멋대로 헤맨다
      m.confuseT=Math.max(0,m.confuseT-dt);m.cfT=(m.cfT||0)-dt;
      if(m.cfT<=0){m.cfT=.35+Math.random()*.4;const ca=Math.random()*6.283;m.cfx=Math.cos(ca);m.cfy=Math.sin(ca);}
      m.chargeWind=0;m.chargeT=0;faceMonster(m,m.cfx,m.cfy);moveMonster(m,m.cfx*m.sp*.7*dt,m.cfy*m.sp*.7*dt);continue;
    }
    const dx=P.x-m.x,dy=P.y-m.y,d=Math.hypot(dx,dy),moveMul=m.slowT>0?.58:1;
    const groupDistance=m.packId?Math.hypot(P.x-m.packX,P.y-m.packY):0;
    if(d<280&&(!m.packId||groupDistance<m.packRadius)){
      m.state='chase'; faceMonster(m,dx,dy);{const qd=d||1;m.fdx=dx/qd;m.fdy=dy/qd;}
      if(specialMonsterAI(m,dx,dy,d,dt)) continue;
      if(m.ranged&&d<m.range){
        m.rdy=.32;
        if(m.cd<=0){enemyShot(m,dx,dy,270,m.shotStatus,m.shotStatus||'bolt',1);monAct(m,'shoot',.3,dx,dy);m.cd=1.45+Math.random()*.65;}
      } else if(!m.ranged&&d<42){
        m.rdy=.25;
        if(m.cd<=0){hurtPlayer(m.dmg,dx,dy,m.touchStatus,m.touchStatus==='slow'?2.4:0);monAct(m,'lunge',.26,dx,dy);m.cd=.9+Math.random()*.35;}
      } else if(d>30){
        moveMonster(m,dx/d*m.sp*moveMul*dt,dy/d*m.sp*moveMul*dt);
      }
    } else {
      m.state='wander'; m.wait-=dt;
      const wx=m.tx-m.x,wy=m.ty-m.y,wd=Math.hypot(wx,wy);
      if(m.wait<=0||wd<8){m.tx=m.homeX+(Math.random()*2-1)*90;m.ty=m.homeY+(Math.random()*2-1)*70;m.tx=Math.max(40,Math.min(MWp-40,m.tx));m.ty=Math.max(55,Math.min(MHp-20,m.ty));m.wait=1.5+Math.random()*3;}
      else{faceMonster(m,wx,wy);moveMonster(m,wx/wd*m.sp*moveMul*.28*dt,wy/wd*m.sp*moveMul*.28*dt);}
    }
  }

  for(const d of dropsLoot){
    if(d.picked) continue;
    if(Math.hypot(d.x-P.x,d.y-P.y)<28){
      if(d.kind==='gold'){setGold(P.gold+d.amount);d.picked=true;}
      else if(window.UI&&UI.add(d.item)){d.picked=true;if(window.TELEMETRY)TELEMETRY.loot(d.item);say(d.item.name+' 획득');if(window.CHATTER)CHATTER.loot(d.item);}
      else if(window.CHATTER)CHATTER.event('bagfull');
    }
  }
}
function hitMonster(m,d,stagger,dmOver,kbOver){
  if(!m||m.dead)return;
  const rr=rollPlayerDamage(dmOver||basicDamage()),v=rr.v,crit=rr.crit;
  // 정예·우두머리는 경직을 한 번 받으면 잠시 면역(무한 경직 방지)
  let st=stagger?.32:.12,kb=kbOver!=null?kbOver:(stagger?20:12);
  if(m.boss||m.elite){kb*=.4;if(m.stunImm>0){st=0;kb*=.3;}else if(stagger)m.stunImm=4;}
  const actual=Math.min(Math.max(0,m.hp),v);if(window.TELEMETRY)TELEMETRY.damageOut(actual);
  m.hp-=v;m.hurt=.18;m.stun=st;m.hitK=(stagger||crit)?1:.65;
  if(!dmOver&&WPN&&window.GAME&&GAME.gainMastery)GAME.gainMastery(WPN.wt,1);
  const q=Math.hypot(d[0],d[1])||1;
  m.hitDx=d[0]/q;m.hitDy=d[1]/q;const kx0=m.x,ky0=m.y;
  for(const f of [1,.6,.3]){const nx=m.x+d[0]/q*kb*f,ny=m.y+d[1]/q*kb*f;if(!monsterBlocked(nx,ny)){m.x=nx;m.y=ny;break;}}
  m.vox=(m.vox||0)+kx0-m.x;m.voy=(m.voy||0)+ky0-m.y;   // 순간이동하지 않고 미끄러져 밀려나 보이게   // 벽에 닿으면 갈 수 있는 만큼만
  pops.push({x:m.x+(Math.random()*14-7),y:m.y-m.h*.72,t:0,txt:String(v),crit});
  sfx.push({type:'hit',t:0,x:m.x,y:m.y-m.h*.55,r:crit?58:40,crit});
  if(m.hp<=0)killMonster(m);
}
function monsterTier(m){
  if(m&&m.tier)return m.tier;
  if(MAP==='field')return FIELD_TIER[fieldTheme]||1;
  return 1;
}
function randomDropItem(m){
  if(!window.UI)return null;
  const tier=monsterTier(m),r=Math.random(),magicBoost=m&&m.caveChallenge?2:1;
  if(r<.58){
    const wt=['sword','spear','gauntlet','bow','staff'][Math.floor(Math.random()*5)];
    return UI.make({kind:'weapon',wt,tier,rank:m&&m.rank,roll:true,magicBoost});
  }
  if(r<.90){
    const kinds=['head','body','hands','feet'];
    return UI.make({kind:kinds[Math.floor(Math.random()*kinds.length)],tier,rank:m&&m.rank,roll:true,magicBoost});
  }
  return UI.make({kind:Math.random()<.55?'ring':'neck',tier,rank:m&&m.rank,roll:true,magicBoost});
}
function monsterExp(m){
  const tier=monsterTier(m),cap=tier*10,lv=P.lv||1;
  const decay=lv>cap?Math.max(.035,1-(lv-cap)*.13):1;
  return Math.max(1,Math.round((m.exp||2)*decay*(.92+Math.random()*.16)));
}
function killMonster(m){
  if(m.family==='skeleton'&&!m.revived&&Math.random()<.48){
    m.revived=true;m.dead=true;m.death=0;m.hp=0;m.reviveT=1.5;return;
  }
  m.dead=true;m.death=0;m.hp=0;m.fallDir=m.hitDx!=null?(m.hitDx>=0?1:-1):(Math.random()<.5?1:-1);
  if(window.TELEMETRY)TELEMETRY.kill(m);
  sfx.push({type:'kill',t:0,x:m.x,y:m.y,r:44});
  const tier=monsterTier(m),coinBonus=(window.UI&&UI.coinBonus)?UI.coinBonus():0,rewardMul=m.coinMul||TIER_MATCH.scales.coin[tier-1];
  const coin=Math.round((2+Math.floor(Math.random()*8))*(1+coinBonus/100)*rewardMul);
  dropsLoot.push({kind:'gold',x:m.x-8,y:m.y,amount:coin,ph:Math.random()*7});
  const find=(window.UI&&UI.findBonus)?UI.findBonus():0,dropChance=m.boss?1:Math.min(.68,(m.dropChance||.30)+find/250);
  if(Math.random()<dropChance){
    const it=randomDropItem(m);if(it)dropsLoot.push({kind:'item',x:m.x+12,y:m.y,item:it,ph:Math.random()*7});
    if(m.bossRole==='floor'&&Math.random()<.65){const it2=randomDropItem(m);if(it2)dropsLoot.push({kind:'item',x:m.x+28,y:m.y+5,item:it2,ph:2+Math.random()*5});}
  }
  if(window.GAME&&GAME.gainExp)GAME.gainExp(monsterExp(m));
  if(window.GUILD)GUILD.onKill(m);
  if(window.QUEST)QUEST.onKill(m);
}
function appendEncounterSprites(list){if(!combatMap())return;drawEnemySkillFx();for(const m of monsters)if(!m.removed)list.push({mon:m,key:m.y});}
function drawEnemySkillFx(){
  ctx.save();
  for(const s of enemyShots){
    if(s.kind==='rock'&&!vfxReady('shot_rock')){
      ctx.fillStyle='#7b6248';ctx.strokeStyle='#c1a27d';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(s.x,s.y,8,0,7);ctx.fill();ctx.stroke();
    }
  }
  for(const h of enemyHazards){
    if(vfxHazard(h))continue;
    const p=Math.max(0,Math.min(1,h.t/Math.max(.01,h.delay))),r=(h.r||40)*(0.35+p*.65);
    ctx.globalAlpha=.25+.5*(1-p);
    ctx.strokeStyle=h.kind==='slime'?'#8cff38':'#ff9b42';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(h.x,h.y,r,r*.45,0,0,7);ctx.stroke();
  }
  ctx.restore();
}
// ── 몹 움직임 ──
// 종류별 걸음새: jelly(통통) / hop(깡충) / run(네발 달리기) / waddle(뒤뚱) / float(둥실). heavy는 쿵쿵 먼지.
function monStyle(m){
  if(m.sty)return m.sty;
  const f=m.family||'',t=m.type||'';let s='waddle';
  if(f==='slime'||f==='mushroom')s='jelly';
  else if(f==='rabbit'||f==='locust')s='hop';
  else if(f==='wasp'||f==='harpy'||f==='darkmage'||f==='lich'||f==='succubus'||f==='dragon'||(f.indexOf('elem_')===0&&f!=='elem_wood'&&t.indexOf('ice_guard')!==0&&t!=='fire_chief'))s='float';
  else if(f==='wolf'||f==='bear'||f==='beetle'||f==='spider')s='run';
  else if(f==='mimic')s='waddle';   // V2에서는 상자에서 깨어난 지역 수호자형 외형
  m.heavy=f==='ogre'||f==='bear'||f==='dragon'||f==='gargoyle'||f==='elem_wood'||f==='demon'||f==='mimic'||t.indexOf('ice_guard')===0||t==='fire_chief'||!!m.boss;
  return m.sty=s;
}
const MON_WHITE=new WeakMap();
function monWhite(img){   // 맞았을 때 번쩍이는 흰 실루엣(그림당 한 번만 만든다)
  let c=MON_WHITE.get(img);if(c)return c;
  const w=img.naturalWidth||img.width||1,h=img.naturalHeight||img.height||1;
  c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.drawImage(img,0,0,w,h);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,w,h);
  MON_WHITE.set(img,c);return c;
}
function monPuff(m,x,y,n,vx,col,r0){
  const fx=m.fx||(m.fx=[]);
  for(let i=0;i<n&&fx.length<24;i++){const a=Math.random()*6.283,sp=20+Math.random()*40;
    fx.push({x:x+(Math.random()*10-5),y:y,vx:Math.cos(a)*sp+(vx||0),vy:Math.sin(a)*sp*.45-10,t:0,life:.42+Math.random()*.3,r:(r0||4)+Math.random()*3,c:col||'#cfc6b4'});}
}
function drawMonster(m,sdt){
  const dts=sdt||.016,isRevive=m.dead&&m.reviveT>0,dying=m.dead&&!isRevive,leftFace=m.face==='left';
  const img=leftFace?(m.imgs.right||m.imgs.left||m.imgs.front):(m.imgs[m.face]||m.imgs.front); if(!img)return;
  m.age=(m.age||0)+dts;
  ctx.save();
  if(m.chargeWind>0){ctx.globalAlpha=1;ctx.strokeStyle='#ff6b42';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,34+Math.sin(T*18)*4,12,0,0,7);ctx.stroke();}
  const sty=monStyle(m),heavy=m.heavy;
  const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,ar=iw/ih;
  let dh=m.h,dw=dh*ar;if(dw>m.w*1.45){dw=m.w*1.45;dh=dw/ar;}   // 그림 비율 유지, 너무 넓은 그림만 제한
  // ── 걸음 위상·진행 방향 기울기 ──
  const dxm=m.x-(m.lx==null?m.x:m.lx),dym=m.y-(m.ly==null?m.y:m.ly),dist=Math.hypot(dxm,dym);m.lx=m.x;m.ly=m.y;
  const moving=!m.dead&&dist>.15;m.walkA=Math.max(0,Math.min(1,(m.walkA||0)+(moving?1:-1)*dts*7));
  const stepF=sty==='run'?1.25:heavy?.62:1;
  m.walkPh=(m.walkPh||0)+dts*(moving?Math.min(16,6+m.sp/12)*stepF:2.4);
  const lt=Math.max(-1.4,Math.min(1.4,dxm/(dts*Math.max(40,m.sp))));m.lean=(m.lean||0)+(lt-(m.lean||0))*Math.min(1,dts*10);
  const wa=m.walkA,ph=m.walkPh+(m.x*.013),s1=Math.sin(ph),hop=Math.abs(s1);
  let yOff=0,rot=0,sx=1,sy=1,ox=m.vox||0,oy=m.voy||0,flash=0,fade=1,lift=0;
  { const kd=Math.exp(-dts*16);m.vox=(m.vox||0)*kd;m.voy=(m.voy||0)*kd; if(Math.abs(m.vox)<.05)m.vox=0; if(Math.abs(m.voy)<.05)m.voy=0; }
  const idleS=Math.sin(T*(sty==='jelly'?3.4:2.1)+m.x*.02)*(sty==='jelly'?.055:.022)*(1-wa);
  if(sty==='jelly'){yOff=-hop*dh*.13*wa;const sq=(hop-.5)*.26*wa;sy+=idleS+sq;sx*=1-sq*.55;}
  else if(sty==='hop'){const a=m.family==='mimic'?.12:.2;yOff=-Math.pow(hop,.8)*dh*a*wa;sy+=idleS+(hop-.45)*.18*wa;}
  else if(sty==='run'){yOff=-hop*dh*.035*wa;rot=m.lean*.075*wa+s1*.014*wa;sy+=idleS+(hop-.5)*.035*wa;if(m.family==='beetle'){const puff=Math.sin(T*4.6+m.x*.01)*.035;sx*=1+puff;sy*=1-puff*.55;}}
  else if(sty==='float'){lift=dh*(.075+.026*Math.sin(T*2.4+m.x*.03));yOff=-lift;rot=m.lean*.045*wa+Math.sin(T*1.7+m.y*.02)*.012;sy+=Math.sin(T*2.4+m.x*.03+1)*.016;}
  else {const sw=heavy?.028:.078;rot=s1*sw*wa;ox+=s1*m.w*(heavy?.008:.022)*wa;yOff=-hop*dh*(heavy?.024:.042)*wa;sy+=idleS+(hop-.5)*(heavy?.028:.045)*wa;}
  // 무거운 몹: 발이 땅에 닿을 때 먼지
  if(heavy&&sty!=='float'&&wa>.6&&!m.dead){const sg=s1<0;if(m.stepSg!=null&&m.stepSg!==sg)monPuff(m,m.x+(sg?-1:1)*m.w*.12,m.y-2,2,0,'#cdbf9f',3);m.stepSg=sg;}
  // ── 맞았을 때: 번쩍 + 맞은 반대로 젖혀지며 찌그러짐 ──
  if(m.hurt>0&&!m.dead){const k=Math.min(1,m.hurt/.18)*(m.hitK||1),hd=(m.hitDx==null?0:m.hitDx);
    flash=Math.min(.85,k*1.2);rot-=hd*.2*k;sx*=1+.13*k;sy*=1-.13*k;ox+=Math.sin(T*70)*1.4*k;}
  // ── 공격 준비(곧 때리기 직전 움츠림) ──
  if(m.rdy&&m.cd>0&&m.cd<m.rdy&&!m.dead){const p=1-m.cd/m.rdy,fx=m.fdx||0,fy=m.fdy||0;ox-=fx*5*p;oy-=fy*3*p;sy*=1+.07*p;sx*=1-.03*p;}
  // ── 돌진 기술 ──
  if(m.chargeWind>0){ox-=(m.chargeDx||0)*5+Math.sin(T*70)*1.5;sy*=.86;sx*=1.1;}
  if(m.chargeT>0){rot+=(m.chargeDx>=0?1:-1)*.2;sx*=1.1;sy*=.94;m.dustT=(m.dustT||0)-dts;if(m.dustT<=0){m.dustT=.05;monPuff(m,m.x,m.y-2,1,-(m.chargeDx||0)*40,'#cdbf9f',4);}}
  // ── 동작 연출(덮치기·쏘기·큰 기술·포효) ──
  const A=m.act;
  if(A&&!m.dead){A.t+=dts;
    if(A.t>=A.dur)m.act=null;
    else{const p=A.t/A.dur,k=A.k,adx=A.dx,ady=A.dy,pw=Math.min(18,dw*.2);
      if(k==='lunge'){const f=p<.3?p/.3:1-(p-.3)/.7;ox+=adx*pw*f;oy+=ady*pw*.7*f;sx*=1+.14*f*Math.abs(adx);sy*=1-.06*f*Math.abs(adx)+.1*f*Math.abs(ady);}
      else if(k==='shoot'){const f=(1-p)*(1-p);ox-=adx*6*f;oy-=ady*4*f;sy*=1-.1*f;sx*=1+.1*f;}
      else if(k==='wind'){if(p<.78){const q=p/.78;ox-=adx*7*q;oy-=ady*4*q;sy*=1+.1*q;rot-=(adx>=0?1:-1)*.1*q;}
        else{const r=(p-.78)/.22,f=Math.sin(r*Math.PI);ox+=adx*12*f;oy+=ady*8*f;sy*=1-.12*f;sx*=1+.1*f;}}
      else if(k==='burst'){const f=Math.sin(p*Math.PI);sx*=1+.2*f;sy*=1+.2*f;yOff-=6*f;}
      else if(k==='roar'){const f=Math.sin(p*Math.PI);sy*=1+.14*f;sx*=1+.1*f;ox+=Math.sin(T*60)*2*f;}
    }}
  // ── 등장(처음 보일 때 톡 튀어나옴) ──
  if(m.age<.3){const e=m.age/.3,c1=1.70158,c3=c1+1,eb=1+c3*Math.pow(e-1,3)+c1*Math.pow(e-1,2),s=.6+.4*eb;sx*=s;sy*=s;fade*=Math.min(1,e*2.5);}
  // ── 쓰러짐 ──
  if(isRevive){const c=Math.min(1,(1.5-m.reviveT)/.2)*Math.min(1,m.reviveT/.4);sy*=1-.62*c;sx*=1+.15*c;yOff*=1-c;}
  else if(dying){
    const p=Math.min(1,m.death),dsg=m.fallDir||1,e=Math.min(1,p/.45),ee=e*e;
    if(!m.puffed){m.puffed=1;monPuff(m,m.x,m.y-m.h*.15,7,0,sty==='jelly'?'#b9e07a':sty==='float'?'#e8f0ff':'#cfc6b4',5);}
    if(p<.14)flash=Math.max(flash,(1-p/.14)*.9);
    if(sty==='jelly'){const q=Math.min(1,p*2.2);sy*=1-.88*q;sx*=1+.55*q;yOff*=1-q;}
    else if(sty==='float'){rot+=dsg*.7*ee;yOff*=1-e;sy*=1-.45*ee;}
    else{rot+=dsg*(Math.PI/2)*ee;ox+=dsg*dw*.06*ee;yOff*=1-e;}
    if(p>.45){const q=(p-.45)/.55;sx*=1-.3*q;sy*=1-.3*q;}
    fade=p<.4?1:1-(p-.4)/.6;
  }
  // ── 그리기 ──
  const a=(m.vanishT>0?.10:1)*fade;
  ctx.globalAlpha=Math.max(0,a);
  if(m.enraged&&!dying){ctx.strokeStyle='rgba(255,60,35,.55)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(m.x+ox,m.y+oy-m.h*.42,m.w*.45,m.h*.52,0,0,7);ctx.stroke();}
  if(!vfxMonsterGround(m)){
    if(m.burnT>0){ctx.strokeStyle='rgba(255,105,30,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y-m.h*.35,m.w*.38,m.h*.38,0,0,7);ctx.stroke();}
    if(m.slowT>0||m.freezeT>0){ctx.strokeStyle='rgba(90,190,255,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(m.x,m.y,m.w*.38,8,0,0,7);ctx.stroke();}
  }
  // 그림자: 뛰어오르거나 떠 있으면 작고 옅어진다
  const hgt=Math.max(0,Math.min(.5,-yOff/dh*2.2));
  ctx.save();ctx.globalAlpha=Math.max(0,a)*(1-hgt);ctx.fillStyle='rgba(0,0,0,.27)';ctx.beginPath();ctx.ellipse(m.x+ox,m.y+oy*.6,m.w*.3*(1-hgt*.5),5*(1-hgt*.4),0,0,7);ctx.fill();ctx.restore();
  const mirror=leftFace;
  ctx.save();ctx.translate(m.x+ox,m.y+oy+yOff);ctx.rotate(rot);if(mirror)ctx.scale(-1,1);ctx.scale(sx,sy);
  ctx.drawImage(img,-dw/2,-dh,dw,dh);
  if(flash>0){ctx.globalAlpha=Math.max(0,a)*flash;ctx.drawImage(monWhite(img),-dw/2,-dh,dw,dh);}
  ctx.restore();
  // 먼지·연기
  if(m.fx&&m.fx.length){
    for(let i=m.fx.length-1;i>=0;i--){const f=m.fx[i];f.t+=dts;if(f.t>=f.life){m.fx.splice(i,1);continue;}
      f.x+=f.vx*dts;f.y+=f.vy*dts;f.vx*=Math.exp(-3*dts);f.vy*=Math.exp(-3*dts);
      const q=f.t/f.life;ctx.globalAlpha=(1-q)*.5;ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1+q*1.2),0,7);ctx.fill();}
    ctx.globalAlpha=Math.max(0,a);
  }
  if(!m.dead){
    ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#21160e';ctx.fillStyle=m.boss?'#ffda6b':m.rank==='elite'?'#bfa6ff':'#f7f1df';
    const label=`${m.boss&&m.type!=='slime_king'?'♛ ':''}${m.name}${m.boss?' 우두머리':m.rank==='elite'?' 정예':''}`;
    ctx.strokeText(label,m.x,m.y-m.h-20);ctx.fillText(label,m.x,m.y-m.h-20);
    const bw=48,bx=m.x-bw/2,by=m.y-m.h-10;ctx.fillStyle='#24140f';ctx.fillRect(bx,by,bw,6);ctx.fillStyle='#c63e32';ctx.fillRect(bx+1,by+1,(bw-2)*Math.max(0,m.hp/m.maxHp),4);}
  if(!m.dead)vfxMonsterIcons(m,m.y-m.h-10);
  if(m.confuseT>0&&!m.dead){ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#2a1038';ctx.fillStyle='#d9a8ff';const qx=m.x+m.w*.42+Math.sin(T*9)*3,qy=m.y-m.h-2;ctx.strokeText('?',qx,qy);ctx.fillText('?',qx,qy);}
  ctx.restore();
}
function dropImage(icon){
  if (!A.icons[icon]) return null;
  if (!dropImgs[icon]) dropImgs[icon] = load(A.icons[icon]);
  return dropImgs[icon];
}
function drawEncounterGround(){
  if(!combatMap())return;
  for(const d of dropsLoot){if(d.picked)continue;const bob=Math.sin(T*4+d.ph)*2;
    if(d.kind==='gold'){ctx.fillStyle='#ffe06a';ctx.strokeStyle='#8d5d18';ctx.lineWidth=2;ctx.beginPath();ctx.arc(d.x,d.y-8+bob,7,0,7);ctx.fill();ctx.stroke();}
    else{const im=dropImage(d.item.icon);if(im&&im.complete)ctx.drawImage(im,d.x-14,d.y-30+bob,28,28);}
  }
}
function drawEncounterFx(){
  if(!combatMap())return;
  for(const h of enemyHazards){
    if(h.kind==='lightning'&&!vfxReady('ring_gold')){
      if(h.t<h.delay){
        const k=h.t/h.delay;ctx.save();ctx.globalAlpha=.35+.45*k;ctx.strokeStyle='#ffe45c';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(h.x,h.y,h.r*(1-.35*k),0,7);ctx.stroke();ctx.restore();
      }else{
        const k=Math.min(1,(h.t-h.delay)/.22);ctx.save();ctx.globalAlpha=1-k;ctx.strokeStyle='#dff4ff';ctx.lineWidth=8*(1-k)+2;
        ctx.beginPath();ctx.moveTo(h.x-5,h.y-150);ctx.lineTo(h.x+7,h.y-100);ctx.lineTo(h.x-4,h.y-58);ctx.lineTo(h.x,h.y);ctx.stroke();ctx.restore();
      }
    }
  }
  for(const s of enemyShots){
    if(vfxEnemyShot(s))continue;
    const col=s.kind==='stone'?'#b7b7a6':s.kind==='web'?'#e8f7ff':s.kind==='burn'?'#ff8a33':s.kind==='slow'?'#8edcff':s.kind==='feather'?'#ffd8ef':'#d9a4ff';
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,10);g.addColorStop(0,'#fff');g.addColorStop(.35,col);g.addColorStop(1,'rgba(80,50,130,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.kind==='stone'?13:11,0,7);ctx.fill();
  }
}
function drawEncounterMini(mx,sx,sy){
  if(!combatMap())return;mx.fillStyle='#e3483c';for(const m of monsters)if(!m.dead&&!m.removed&&!(m.vanishT>0)){mx.beginPath();mx.arc(m.x*sx,m.y*sy,2.2,0,7);mx.fill();}
}
function autoAimMonster(){
  if(!combatMap()||!monsters.length)return;
  const lim=WPN&&(WPN.wt==='bow'||WPN.wt==='staff')?620:190; let best=null,bd=lim;
  for(const m of monsters){if(m.dead||m.removed)continue;const d=Math.hypot(m.x-P.x,m.y-P.y);if(d<bd){bd=d;best=m;}}
  if(!best)return;const dx=best.x-P.x,dy=best.y-P.y;
  // 가장 가까운 적의 주축 방향. 아래/위 적이 조금 옆에 있어도 세로 방향을 유지한다.
  if(Math.abs(dx)>Math.abs(dy)){P.dir='side';P.flip=dx<0;}else{P.dir=dy<0?'back':'front';P.flip=false;}
}

window.__FD_READY=true;
window.__FD={
  async enter(theme,leg){const m=await prepareField(theme||'spring',leg);travel('field',m.spawn,'side');return true;},
  prepareVillage:(theme,ret)=>prepareFieldVillage(theme,ret),enterVillage:enterFieldVillage,leaveVillage:leaveFieldVillage,
  goLeg,askDestination,
  mapInfo(){return {blds:MAPS.field.blds.length,exits:MAPS.field.exits.length,name:MAPS.field.name,map:MAP};},
  warp(tx,ty){P.x=tx*TS;P.y=ty*TS;return true;},
  state(){const fm=MAPS.field||{},st=fm.fieldStart||{x:2.5,y:20},en=fm.fieldEnd||{x:56.5,y:8},grid=fm.grid||null;let walkable=0;if(grid)for(const row of grid)for(const v of row)walkable+=v?1:0;return {map:MAP,theme:fieldTheme,leg:fieldLeg,legs:fieldLegs,villageReturn:fieldVillageReturn?{...fieldVillageReturn}:null,tier:FIELD_TIER[fieldTheme]||1,serial:fieldSerial,buildMs:Math.round(fieldBuildMs),monsters:monsters.filter(m=>!m.removed).length,props:fm.props?fm.props.length:0,dungeons:fm.props?fm.props.filter(p=>p.kind==='dungeon').length:0,drops:dropsLoot.filter(d=>!d.picked).length,hp:P.hp,gold:P.gold,stuckSpawns:monsters.filter(m=>!m.dead&&(pointInSolid(m.x,m.y,10)||(CUR&&CUR.grid&&gridBlocked(m.x,m.y,10)))).length,layout:fm.props?fm.props.slice(4,12).map(p=>[Math.round(p.x),Math.round(p.y),p.k]):[],village:fm.blds?fm.blds.map(b=>({name:b.name,kind:b.kind,market:b.market,x:Math.round(b.x),y:Math.round(b.y)})):[],fieldSize:fm.map?{w:fm.map.w,h:fm.map.h}:null,outdoorDungeon:!!grid,rooms:fm.rooms?fm.rooms.length:0,walkableCells:walkable,start:{x:st.x,y:st.y},end:{x:en.x,y:en.y}};},
  hitFirst(){const m=monsters.find(x=>!x.dead);if(!m)return false;hitMonster(m,[1,0],true,m.hp+5);return true;},
  debugTarget(dx,dy,freeze){
    const m=monsters.find(x=>!x.dead&&!x.removed);if(!m)return false;
    for(const x of monsters)if(x!==m)x.removed=true;
    m.x=P.x+dx;m.y=P.y+dy;m.vx=m.vy=0;if(freeze)m.stun=99;return {x:m.x,y:m.y};
  },
  flinchTest(){const m={monster:1,boss:1,hp:9999,maxHp:9999,x:P.x+500,y:P.y+500,h:60,w:60,hurt:0,stun:0,type:'test'};hitMonster(m,[1,0],true,1);const a=m.stun;m.stun=0;hitMonster(m,[1,0],true,1);return [a,m.stun];},
  debugMonster(){const m=monsters.find(x=>!x.dead&&!x.removed);return m?{type:m.type,family:m.family,name:m.name,rank:m.rank,bossRole:m.bossRole,packId:m.packId||0,packLeader:!!m.packLeader,w:m.w,baseW:m.baseW,x:m.x,y:m.y,exp:m.exp,dropChance:m.dropChance,blocked:pointInSolid(m.x,m.y,m.w*.5)||gridBlocked(m.x,m.y,m.w*.5),tier:m.tier,mobLv:m.mobLv||0,hp:m.hp,maxHp:m.maxHp,dmg:m.dmg,skill:m.skill,sp:m.sp}:null;},
  debugMonsters(){return monsters.filter(x=>!x.dead&&!x.removed).map(m=>({type:m.type,family:m.family,name:m.name,rank:m.rank,bossRole:m.bossRole,packId:m.packId||0,packLeader:!!m.packLeader,w:m.w,baseW:m.baseW,x:m.x,y:m.y,exp:m.exp,dropChance:m.dropChance,blocked:pointInSolid(m.x,m.y,m.w*.5)||gridBlocked(m.x,m.y,m.w*.5),tier:m.tier,mobLv:m.mobLv||0,hp:m.hp,maxHp:m.maxHp,dmg:m.dmg,skill:m.skill,sp:m.sp}));},
  testSpawn(id,dx,dy){const m=createMonster(id,P.x+dx,P.y+dy);m.stun=99;monsters.push(m);return monsters.indexOf(m);},   // 연출 확인용
  testOp(i,op,a){const m=monsters[i];if(!m)return false;if(op==='hit')hitMonster(m,[a||1,0],true,1);else if(op==='kill')killMonster(m);else if(op==='act')monAct(m,a,.5,1,0);else if(op==='clear'){for(const x of monsters)x.removed=true;}else if(op==='go'){m.stun=0;}return true;},
  hurtTest(v){rawPlayerDamage(v);return P.hp;},   // 검사용: 방어 계산 후 직접 피해
  respawn:()=>spawnFieldMonsters(fieldTheme),rest:restAtCamp,prepareField,openRegionSelect,regionUnlocked:t=>regionUnlockInfo(t)
};
