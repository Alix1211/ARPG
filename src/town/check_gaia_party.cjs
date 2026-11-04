'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname;
const ids=['merc_f_sword','merc_f_mage'];
const partyAssets=Object.fromEntries(ids.map(id=>[id,{mercenary:true,job:id.endsWith('sword')?'sword':'mage',name:id,fr:{front:[],back:[],side:[]}}]));
let wipes=0;
let now=0;
const soundCalls=[];
const ctx={
  window:{},A:{companions:partyAssets},MAP:'town',GAIA_PARTY_MODE:true,P:{x:300,y:300,dir:'front',flip:false,lv:1,maxHp:4000,maxMp:2800},
  NUM:100,DAY:{t:0},DAYLEN:480,npcs:[],spots:[],monsters:[],pops:[],sfx:[],
  load:()=>({}),nearestSafePosition:(x,y)=>[x,y],basicDamage:()=>200,
  blocked:()=>false,combatMap:()=>false,say:()=>{},defeatPlayer:()=>{wipes++;},
  $:()=>null,console,Math,heartPop:()=>{},performance:{now:()=>now},
  SFX:{play:(name,volume=1)=>soundCalls.push({name,volume})},
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
assert.ok(soundCalls.some(s=>s.name==='hit'),'몽둥이 적중 시 퍽 효과음');
assert.ok(soundCalls.some(s=>s.name==='gaia_agatha_1'),'아가사 첫 피격음');
now=100;
p.friendlySwing([-1,0],{reach:90,cone:50});
assert.equal(soundCalls.filter(s=>s.name.startsWith('gaia_agatha_')).length,1,'연타에도 아가사 비명이 중첩되지 않음');
now=700;
assert.equal(p.whip(),true);
assert.ok(soundCalls.some(s=>s.name==='gaia_whip'),'채찍 적중 시 채찍 파일 재생');
assert.ok(soundCalls.some(s=>s.name==='gaia_sylvia'),'실비아 피격음 연결');
now=1400;
p.friendlySwing([-1,0],{reach:90,cone:50});
assert.ok(soundCalls.some(s=>s.name==='gaia_agatha_2'),'아가사 두 번째 피격음 순환');
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
now=2800;
assert.equal(p.hit(p.members()[0],75),true);
assert.ok(p.members()[0].hp<old&&p.members()[0].hp>old-75,'M·방어 보정이 적용된 동료 피격');
assert.equal(soundCalls.filter(s=>s.name==='gaia_agatha_1').length,2,'몬스터 공격에도 아가사 음성 재생');
const t=p.enemyTarget({x:p.members()[0].x,y:p.members()[0].y});
assert.equal(t,p.members()[0]);
p.members()[0].x=10000;
p.recall(true);
assert.ok(Math.hypot(p.members()[0].x-ctx.P.x,p.members()[0].y-ctx.P.y)<100,'동료 강제 소환');
p.hit(p.members()[0],1e9);
assert.equal(wipes,0,'아가사만 쓰러져도 카일이 즉시 전멸하지 않음');
assert.equal(p.members()[0].ko,true,'쓰러진 아가사 대기');
ctx.window.onCompanionPlayerDefeat();
assert.ok(p.members().every(m=>m.hp===m.maxHp));
assert.ok(p.members().every(m=>m.m===45));
ctx.updateCompanion(.016);
assert.equal(p.members().length,2);
console.log('가이아 3인 파티: 2인 로딩·동시 상태·회복·적 타깃·음원·피격 대기 테스트 통과');
