'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const sandbox={console};sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(`
const A={companions:{}},P={x:1000,y:1000,dir:'side',flip:false,lv:1,gold:10000};
let MAP='field',wall=false,warpCount=0,obstacle=null;
const monsters=[],npcs=[],sprites=[],spots=[],solids=[],pops=[],sfx=[];
const DAYLEN=480,BI={};
function load(s){return s;}function combatMap(){return MAP==='field';}
function blocked(x,y){return wall||!!(obstacle&&obstacle(x,y));}function monsterBlocked(){return true;}
function nearestSafePosition(x,y){warpCount++;return [x,y];}
function setGold(v){P.gold=v;}function basicDamage(){return 100;}
function $(id){return null;}function say(){}function killMonster(m){m.dead=true;}
function buildWorld(){npcs.length=sprites.length=spots.length=solids.length=0;
  if(COMPANION.townTestsEnabled())for(const id of ['hero','knight'])if(!COMPANION.isActive(id)){
    const n={companion:id};npcs.push(n);sprites.push(n);spots.push({kind:'npc',npc:n});solids.push({_companion:id});
  }
}
`,sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/town/companion.js'),'utf8'),sandbox);
function run(code){return vm.runInContext(code,sandbox);}
run(`function setup(id,x,y,mx,my){
  MAP='field';wall=false;obstacle=null;P.x=1000;P.y=1000;monsters.length=0;
  COMPANION.loadData({active:id,remaining:480,damage:1,x,y});
  if(mx!=null)monsters.push({x:mx,y:my,h:60,hp:10000});
  warpCount=0;
}`);
// 전방 배치와 넓은 인식: 플레이어 뒤로 복귀하지 않고 500px 앞의 적을 향해 진격.
run(`setup('hero',1105,1006,1500,1000);COMPANION.debugTick(.1);`);
assert(run('companionState.x>1105&&warpCount===0'));
run(`setup('hero',1105,1006);COMPANION.debugTick(.1);`);
assert(run('companionState.x===1105&&warpCount===0'));
// 6초 넘게 멀리서 공격/쿨타임 대기해도 구조 워프하지 않는다.
run(`setup('hero',1500,1000,1550,1000);for(let i=0;i<90;i++)COMPANION.debugTick(.1);`);
assert(run('warpCount===0&&companionState.stuck===0&&monsters[0].hp<10000'));
// 적이 최초 인식 거리 밖으로 가도 추격/교전 유지. 죽으면 새 타깃 선정.
run(`monsters[0].x=1700;companionState.x=1650;monsters.push({x:1100,y:1000,h:60,hp:10000});`);
assert(run('companionPickTarget()===monsters[0]'));
run('monsters[0].dead=true;');assert(run('companionPickTarget()===monsters[1]'));
// 실제 길막만 누적하고, 전투/평시 모두 6초는 기다린다.
for(const fighting of [false,true]){
  run(`setup('hero',1300,1000,${fighting?'1600,1000':'null,null'});wall=true;
    for(let i=0;i<59;i++)COMPANION.debugTick(.1);`);
  assert.equal(run('warpCount'),0);
  run('for(let i=0;i<3;i++)COMPANION.debugTick(.1);');assert.equal(run('warpCount'),1);
}
// 이동이 재개되면 연속 길막 시계를 초기화한다.
run(`setup('hero',1300,1000,1600,1000);wall=true;
  for(let i=0;i<50;i++)COMPANION.debugTick(.1);wall=false;COMPANION.debugTick(.1);`);
assert.equal(run('companionState.stuck'),0);
// 정말 크게 이탈하면 구조하며, 카엘렌은 앞쪽 안전 위치로 배치.
run(`setup('hero',2300,1000,2340,1000);COMPANION.debugTick(.1);`);
assert(run('warpCount===1&&companionState.x>P.x'));
// 러스티는 뒤에서 사격하고, 세 발사 효과를 모두 만든다. 벽 너머 사격은 금지.
run(`setup('knight',942,1018,1200,1000);COMPANION.debugTick(.1);`);
assert(run("companionState.x<P.x&&['muzzle','laser','impact'].every(k=>companionFx.some(f=>f.kind===k))"));
run('wall=true;');assert.equal(run('companionPickTarget()'),null);
run(`setup('hero',1100,1000,1140,1000);COMPANION.debugTick(.1);`);
assert(run("['slash','swordflash'].every(k=>companionFx.some(f=>f.kind===k))"));
// 시험 배치를 꺼도 동행 세이브와 전투 시스템은 유지하며 복귀/재배치로 부활하지 않는다.
run(`MAP='town';COMPANION.setTownTestsEnabled(false);COMPANION.ensureTownTests();`);
assert(run("npcs.length===0&&spots.length===0&&solids.length===0&&COMPANION.state().active==='hero'"));
run(`COMPANION.onDefeat();COMPANION.ensureTownTests();`);assert.equal(run('npcs.length'),0);
run('COMPANION.setTownTestsEnabled(true);');assert.equal(run('npcs.length'),2);
console.log('companion AI ok: engagement, rescue, rear support, effects, test visibility');

// 벽을 돌아 살아 있는 교전 대상에게 도착한다. 모서리를 뚫거나 워프하지 않는다.
run(`setup('hero',1100,1000,1500,1000);
  obstacle=(x,y)=>x>=1170&&x<=1230&&y>=850&&y<=1150;
  let crossedWall=false;
  for(let i=0;i<300;i++){COMPANION.debugTick(.016);if(blocked(companionState.x,companionState.y))crossedWall=true;}`);
assert(run('warpCount===0&&!crossedWall&&monsters[0].hp<10000'),JSON.stringify(run('({warpCount,crossedWall,c:companionState,hp:monsters[0].hp})')));
// 좁은 구간의 작은 왕복 움직임도 진행 없는 끼임으로 판정한다.
run(`setup('hero',1300,1000,1600,1000);wall=true;
  for(let i=0;i<62;i++){companionState.x=1300+(i%2)*2;COMPANION.debugTick(.1);}`);
assert.equal(run('warpCount'),1);
// 검/검 궤적은 몸보다 먼저, 후면 패스에서는 시간 진행 없이 딱 한 번 렌더한다.
run(`setup('hero',1100,1000,1140,1000);COMPANION.debugTick(.1);
  const drawCalls=[],ctx=new Proxy({}, {get:(o,k)=>o[k]||((...args)=>drawCalls.push(k)),set:(o,k,v)=>(o[k]=v,true)});
  COMPANION_IMG.hero={fr:{front:[{naturalWidth:100,naturalHeight:100}],side:[{naturalWidth:100,naturalHeight:100}]}};
  drawCompanion(companionState,0);`);
assert(run("drawCalls.indexOf('stroke')<drawCalls.indexOf('drawImage')&&companionFx.every(f=>f.t===0)"));
run('drawCalls.length=0;drawCompanionFx(.016);');
assert(run("!drawCalls.includes('stroke')&&companionFx.every(f=>f.t===.016)"));
console.log('companion detour + behind-body sword ok');
