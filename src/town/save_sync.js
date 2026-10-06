// 저장 시각은 적용/이관 때 바꾸지 않는다. 유효한 저장 묶음 전체를 선택한다.
(() => {
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  function valid(text){
    const all=typeof text==='string'?JSON.parse(text):text;
    if(!object(all)||Object.keys(all).some(k=>!k.startsWith('arpg_')||typeof all[k]!=='string'))throw Error('bundle');
    const s=JSON.parse(all.arpg_save_v3);
    if(!object(s)||s.v!==3||!Number.isInteger(s.lv)||s.lv<1||s.lv>70||
       !['gold','hp','mp'].every(k=>Number.isFinite(s[k]))||!object(s.stats)||!Array.isArray(s.bag)||!object(s.eq)||
       (s.t!==undefined&&(!Number.isSafeInteger(s.t)||s.t<0)))throw Error('save');
    return all;
  }
  function latest(...candidates){
    let best=null,time=-1;
    for(const c of candidates)try{const all=valid(c),t=JSON.parse(all.arpg_save_v3).t||0;if(t>time){best=all;time=t;}}catch(e){}
    return best;
  }
  const ls=window.localStorage,set=Storage.prototype.setItem,rm=Storage.prototype.removeItem;
  function snapshot(){const all={};for(const k of Object.keys(ls))if(k.startsWith('arpg_'))all[k]=ls.getItem(k);return all;}
  function apply(all){
    valid(all);
    for(const k of Object.keys(ls))if(k.startsWith('arpg_'))rm.call(ls,k);
    for(const [k,v] of Object.entries(all))set.call(ls,k,v);
  }
  window.ARPG_SAVE_SYNC={valid,latest,snapshot,apply};
  const B=window.ArpgBridge;if(!B)return;
  document.documentElement.classList.add('app');
  window.ARPG_SYNC_CHECKING=typeof B.syncBackup==='function';
  if(window.ARPG_SYNC_CHECKING)setTimeout(()=>{if(window.onArpgSyncDone)window.onArpgSyncDone();else window.ARPG_SYNC_CHECKING=false;},8000);
  try{
    const local=snapshot(),native=JSON.parse(B.load()||'{}');
    let chosen=latest(native,local); // 동일 t에서는 앱 내부 저장을 우선한다.
    if(typeof B.reconcileLocal==='function')chosen=latest(JSON.parse(B.reconcileLocal(JSON.stringify(local))||'{}'),chosen);
    if(chosen)apply(chosen);
    else for(const [k,v] of Object.entries(native))if(k.startsWith('arpg_')&&typeof v==='string'&&ls.getItem(k)===null)set.call(ls,k,v);
  }catch(e){}
  try{for(const k of ['arpg_save_v1','arpg_save_v2']){rm.call(ls,k);B.del(k);}}catch(e){}
  Storage.prototype.setItem=function(k,v){
    if(this===ls&&k==='arpg_save_v3'&&(window.ARPG_SYNC_CHECKING||window.ARPG_BACKUP_RESTORING))return;
    set.call(this,k,v);if(this===ls&&/^arpg_/.test(k))try{B.put(k,String(v));}catch(e){}
  };
  Storage.prototype.removeItem=function(k){rm.call(this,k);if(this===ls&&/^arpg_/.test(k))try{B.del(k);}catch(e){}};
})();
