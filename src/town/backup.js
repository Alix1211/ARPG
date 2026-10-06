// 문플로의 문서 선택/연결 방식. 백업은 기존 arpg_* 문자열 값의 묶음이며 저장 스키마는 유지한다.
(() => {
  const bridge=window.ArpgBridge, el=id=>document.getElementById(id);
  if(!bridge||typeof bridge.pickBackup!=='function'||typeof bridge.backupStatus!=='function'||typeof bridge.restoreBackup!=='function')return;
  el('driveBackup').hidden=false;
  let busy=false;
  const automatic=typeof bridge.syncBackup==='function';
  if(automatic)el('restoreBackup').textContent='지금 동기화';
  const cover=document.createElement('div');
  cover.textContent='최신 저장 확인 중…';
  cover.style.cssText='position:fixed;inset:0;z-index:1000;background:#17120de6;color:#fff;display:none;align-items:center;justify-content:center;font:700 18px sans-serif';
  document.body.append(cover);
  let syncTimer;
  window.onArpgSyncDone=()=>{clearTimeout(syncTimer);window.ARPG_SYNC_CHECKING=false;cover.style.display='none';busy=false;refresh();};
  window.onArpgSyncStart=()=>{
    clearTimeout(syncTimer);busy=true;window.ARPG_SYNC_CHECKING=true;cover.style.display='flex';
    syncTimer=setTimeout(window.onArpgSyncDone,8000);refresh();
  };
  function refresh(){
    let s={};try{s=JSON.parse(bridge.backupStatus()||'{}');}catch(e){}
    el('backupStatus').textContent='백업 파일: '+(s.linked?'연결됨':'안 됨')+' · 마지막 백업: '+(s.at?new Date(s.at).toLocaleString('ko-KR'):'없음')+
      (automatic?(s.online===false?' · 오프라인 · 기기 저장으로 진행':s.syncing?' · 동기화 중':s.error?' · 동기화 대기':' · 자동 동기화'):(s.held?' · 불러오기 대기':s.error?' · 백업 실패':''));
    el('restoreBackup').disabled=!s.linked||busy;el('pickBackup').disabled=busy;
  }
  const message=text=>{el('backupMessage').textContent=text||'';refresh();};
  window.onArpgBackup=message;
  window.onArpgBackupFail=text=>{try{bridge.cancelRestore();}catch(e){}window.onArpgSyncDone();window.ARPG_BACKUP_RESTORING=false;message(text);};
  function valid(text){
    if(window.ARPG_SAVE_SYNC)return ARPG_SAVE_SYNC.valid(text);
    const all=JSON.parse(text);
    if(!all||Array.isArray(all)||typeof all!=='object'||Object.keys(all).some(k=>!k.startsWith('arpg_')||typeof all[k]!=='string'))throw Error();
    const s=JSON.parse(all.arpg_save_v3),obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(s.v!==3||!Number.isInteger(s.lv)||s.lv<1||s.lv>70||!['gold','hp','mp'].every(k=>Number.isFinite(s[k]))||!obj(s.stats)||!Array.isArray(s.bag)||!obj(s.eq))throw Error();
    return all;
  }
  window.onArpgRestore=text=>{
    let all;try{all=valid(text);}catch(e){window.onArpgBackupFail('불러올 수 없는 파일입니다. 기존 저장은 유지됩니다.');return;}
    try{bridge.applyBackup();}catch(e){window.onArpgBackupFail('기기 저장을 갱신하지 못했습니다.');}
  };
  window.onArpgBackupApplied=text=>{
    let all;try{all=valid(text);}catch(e){window.onArpgBackupFail('불러올 수 없는 파일입니다.');return;}
    // pagehide/4초 자동 저장이 예전 플레이 상태를 덮어쓰지 않도록 불러오기 동안 저장을 막는다.
    window.ARPG_BACKUP_RESTORING=true;
    try{
      if(window.ARPG_SAVE_SYNC)ARPG_SAVE_SYNC.apply(all);
      else for(const k of Object.keys(localStorage))if(k.startsWith('arpg_'))localStorage.removeItem(k);
      for(const [k,v] of Object.entries(all)){
        if(!window.ARPG_SAVE_SYNC)localStorage.setItem(k,v);
        // 앱 브리지 쪽 저장도 즉시 같은 값으로 맞춘다. 브라우저 저장만 바뀐 뒤 reload 되며
        // 앱의 더 최신 기본 저장이 다시 덮어쓰는 복원 회귀를 막는다.
        try{bridge.put(k,String(v));}catch(e){}
      }
      location.reload();
    }catch(e){message('기기 저장을 갱신하지 못했습니다. 앱을 완전히 껐다 켜 주세요.');}
  };
  el('settingsBtn').addEventListener('click',refresh);
  el('pickBackup').addEventListener('click',()=>{try{if(window.UI)UI.save();bridge.pickBackup();}catch(e){message('파일 선택 화면을 열지 못했습니다.');}});
  el('restoreBackup').addEventListener('click',()=>{
    if(automatic){if(!busy){window.onArpgSyncStart();try{bridge.syncBackup();}catch(e){window.onArpgSyncDone();}}return;}
    if(busy||!confirm('현재 진행을 백업 파일 내용으로 바꿉니다. 불러오시겠습니까?'))return;
    busy=true;window.ARPG_BACKUP_RESTORING=true;message('백업 파일을 읽는 중입니다.');
    try{bridge.restoreBackup();}catch(e){window.onArpgBackupFail('백업 파일을 읽지 못했습니다.');}
  });
  if(automatic){
    addEventListener('online',()=>bridge.syncBackup());
    if(window.ARPG_SYNC_CHECKING)window.onArpgSyncStart();
    try{bridge.webReady();}catch(e){window.onArpgSyncDone();}
  }
  refresh();
})();
