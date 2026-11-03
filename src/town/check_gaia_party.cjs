'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname;
const ids=['merc_f_sword','merc_f_mage'];
const partyAssets=Object.fromEntries(ids.map(id=>[id,{mercenary:true,job:id.endsWith('sword')?'sword':'mage',name:id,fr:{front:[],back:[],side:[]}}]));
let wipes=0;
const ctx={
  window:{},A:{companions:partyAssets},MAP:'town',P:{x:300,y:300,dir:'front',flip:false,lv:1,maxHp:4000,maxMp:2800},
  NUM:100,DAY:{t:0},DAYLEN:480,npcs:[],spots:[],monsters:[],pops:[],sfx:[],
  load:()=>({}),nearestSafePosition:(x,y)=>[x,y],basicDamage:()=>200,
  blocked:()=>false,combatMap:()=>false,say:()=>{},defeatPlayer:()=>{wipes++;},
  $:()=>null,console,Math,
};
ctx.window.UI={save:()=>{}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+'/companion.js','utf8')+'\n'+fs.readFileSync(root+'/gaia_party.js','utf8'),ctx);
const p=ctx.window.GAIA_PARTY;
assert.equal(p.enabled,true);
assert.equal(p.members().length,0);
p.recall(true);
assert.equal(p.members().map(m=>m.active).join(','),ids.join(','));
assert.equal(p.members().map(m=>m.mode).join(','),'party,party');
assert.ok(p.members().every(m=>m.hp===m.maxHp));
const [agasa,sylvia]=p.members();
const beforeStrike=agasa.hp;
p.friendlySwing([-1,0],{reach:90,cone:50});
assert.ok(agasa.hp<beforeStrike,'아군 타격 시 소량 체력 피해');
assert.equal(agasa.m,45+22,'아군 타격 시 M 충전(시작 M 45 + 22)');
p.reset();
agasa.hp-=500;sylvia.hp-=300;
assert.equal(p.needs('hp'),true);
p.heal('hp');
assert.ok(p.members().every(m=>m.hp===m.maxHp));
const save=ctx.window.COMPANION.saveData();
assert.equal(save.party.length,2);
agasa.hp-=700;
ctx.window.COMPANION.loadData(save);
assert.equal(p.members()[0].hp,p.members()[0].maxHp);
const old=p.members()[0].hp;
assert.equal(p.hit(p.members()[0],75),true);
assert.equal(p.members()[0].hp,old-75);
const t=p.enemyTarget({x:p.members()[0].x,y:p.members()[0].y});
assert.equal(t,p.members()[0]);
p.members()[0].x=10000;
p.recall(true);
assert.ok(Math.hypot(p.members()[0].x-ctx.P.x,p.members()[0].y-ctx.P.y)<100,'동료 강제 소환');
p.hit(p.members()[0],1e9);
assert.equal(wipes,1);
ctx.window.onCompanionPlayerDefeat();
assert.ok(p.members().every(m=>m.hp===m.maxHp));
assert.ok(p.members().every(m=>m.m===45));
ctx.updateCompanion(.016);
assert.equal(p.members().length,2);
console.log('가이아 3인 파티: 2인 로딩·동시 상태·회복·적 타깃·전멸 테스트 통과');
