// 실제 sound.js의 래퍼와 GAME에 공개한 함수 경로, 진동 우선순위를 검사한다.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/town/sound.js'),'utf8');
const start=source.indexOf('const HAP =');
const end=source.indexOf('  // 생활스킬',start);
assert(start>=0&&end>start);
let now=1000;
const calls=[];
const settings={vibration:true};
const context=vm.createContext({
  navigator:{vibrate:pattern=>{calls.push(pattern);return true;}},
  Date:{now:()=>now},
  AUDIO_SETTINGS:{get:()=>settings},
  SFX:{play:()=>{}},
  P:{atk:null},pops:[],playerInv:0,traveling:false
});
vm.runInContext(`
window=globalThis;
function attack(){}
function hitTarget(){}
function killMonster(){}
function hurtPlayer(){}
function cast(id){return id!=='rejected';}
function drink(){return true;}
GAME={cast,drink};
originalCast=cast;
`,context);
vm.runInContext(source.slice(start,end)+'})(); globalThis.haptic=HAP;',context);
const invoke=code=>vm.runInContext(code,context);
assert(invoke('GAME.cast===cast && GAME.cast!==originalCast'),'GAME.cast must use wrapped function');
invoke("GAME.cast('ice1')");
assert.equal(calls.at(-1),45,'actual skill button path vibrates');
const count=calls.length;
invoke('hitTarget()');assert.equal(calls.length,count,'hit must not interrupt cast');
invoke('hurtPlayer()');assert.equal(calls.at(-1),65,'hurt overrides cast');
invoke("GAME.cast('fire1')");assert.equal(calls.length,count+1,'cast must not interrupt hurt');
now+=66;
invoke("GAME.cast('fire1')");
assert.deepEqual(Array.from(calls.at(-1)),[35,22,45]);
now+=40;invoke('hitTarget()');assert.deepEqual(Array.from(calls.at(-1)),[35,22,45],'protect pauses too');
now+=63;invoke('hitTarget()');assert.equal(calls.at(-1),22);
const afterHit=calls.length;invoke('hitTarget()');assert.equal(calls.length,afterHit,'rapid hits do not restart motor');
now+=23;invoke('pops.push({crit:true});hitTarget()');assert.equal(calls.at(-1),40);
now+=41;invoke("GAME.cast('fire3')");assert.deepEqual(Array.from(calls.at(-1)),[40,20,55]);
now+=116;const beforeReject=calls.length;invoke("GAME.cast('rejected')");assert.equal(calls.length,beforeReject);
invoke('GAME.drink()');assert.deepEqual(Array.from(calls.at(-1)),[20,40,20]);
invoke('haptic(0)');assert.equal(calls.at(-1),0);
invoke('hitTarget()');assert.equal(calls.at(-1),40,'cancel clears priority lock');
settings.vibration=false;const beforeOff=calls.length;invoke("GAME.cast('ice1');hurtPlayer()");assert.equal(calls.length,beforeOff);
settings.vibration=true;now+=100;
invoke('navigator.vibrate=()=>false;haptic(100,3)');
invoke('navigator.vibrate=p=>{globalThis.last=p;return true;};haptic(22)');
assert.equal(context.last,22,'rejected vibration must not lock following calls');
console.log('haptics ok: exported cast/drink, durations, priority, pause, throttle, rejection, disable');
