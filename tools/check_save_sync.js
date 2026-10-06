'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/town/save_sync.js'),'utf8');
function bundle(t,gold=1){return {arpg_save_v3:JSON.stringify({v:3,t,lv:1,gold,hp:10,mp:10,stats:{},bag:[],eq:{}}),arpg_audio_settings:JSON.stringify({sfx:gold})};}
function boot(local,native,automatic=true){
  const ctx={setTimeout:()=>0,document:{documentElement:{classList:{add(){}}}}};ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(`class Storage{getItem(k){return this[k]??null;}setItem(k,v){this[k]=String(v);}removeItem(k){delete this[k];}};
    window.Storage=Storage;window.localStorage=new Storage();`,ctx);
  Object.assign(ctx.localStorage,local);let stored=native;
  ctx.ArpgBridge={load:()=>JSON.stringify(stored),put:(k,v)=>stored[k]=v,del:k=>delete stored[k],
    reconcileLocal:text=>{stored=ctx.ARPG_SAVE_SYNC.latest(stored,JSON.parse(text))||{};return JSON.stringify(stored);}};
  if(automatic)ctx.ArpgBridge.syncBackup=()=>{};
  vm.runInContext(source,ctx);
  return {ctx,stored:()=>stored};
}
for(const [lt,nt,expected] of [[1,2,2],[3,2,3],[2,2,2]]){
  const {ctx,stored}=boot(bundle(lt,lt),bundle(nt,nt));
  assert.equal(JSON.parse(ctx.localStorage.arpg_save_v3).t,expected);
  assert.equal(JSON.parse(stored().arpg_save_v3).t,expected);
  assert.equal(JSON.parse(ctx.localStorage.arpg_audio_settings).sfx,expected);
  const before=ctx.localStorage.arpg_save_v3;
  ctx.localStorage.setItem('arpg_save_v3',bundle(999).arpg_save_v3); // 시작 비교 전 자동 저장 차단
  assert.equal(ctx.localStorage.arpg_save_v3,before);
  ctx.ARPG_SYNC_CHECKING=false;
  ctx.localStorage.setItem('arpg_save_v3',bundle(1000).arpg_save_v3); // 오프라인 플레이 저장
  assert.equal(JSON.parse(stored().arpg_save_v3).t,1000);
  const winner=ctx.ARPG_SAVE_SYNC.latest(stored(),bundle(1001,42)); // 재연결: Drive 최신
  ctx.ARPG_SAVE_SYNC.apply(winner);
  assert.equal(JSON.parse(ctx.localStorage.arpg_save_v3).gold,42);
  assert.equal(JSON.parse(ctx.localStorage.arpg_save_v3).t,1001);
  assert.equal(ctx.ARPG_SAVE_SYNC.latest(bundle(1002),bundle(1001)).arpg_save_v3,bundle(1002).arpg_save_v3);
  assert.equal(ctx.ARPG_SAVE_SYNC.latest({arpg_save_v3:'invalid'},bundle(2)).arpg_save_v3,bundle(2).arpg_save_v3);
}
const old=boot(bundle(1),bundle(2),false);assert(!old.ctx.ARPG_SYNC_CHECKING);
assert.throws(()=>old.ctx.ARPG_SAVE_SYNC.valid(bundle(-1)));
assert.throws(()=>old.ctx.ARPG_SAVE_SYNC.valid(bundle('99999')));
console.log('save sync ok: three-store freshness, atomic bundle, startup guard, offline save, reconnect, invalid rejection, legacy app');
