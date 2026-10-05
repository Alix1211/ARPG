// 문플로의 문서 선택/연결 방식. 백업은 기존 arpg_* 문자열 값의 묶음이며 저장 스키마는 유지한다.
(() => {
  const bridge=window.ArpgBridge, el=id=>document.getElementById(id);
  if(!bridge||typeof bridge.pickBackup!=='function'||typeof bridge.backupStatus!=='function'||typeof bridge.restoreBackup!=='function')return;
  el('driveBackup').hidden=false;
  let busy=false;
  function refresh(){
    let s={};try{s=JSON.parse(bridge.backupStatus()||'{}');}catch(e){}
    el('backupStatus').textContent='백업 파일: '+(s.linked?'연결됨':'안 됨')+' · 마지막 백업: '+(s.at?new Date(s.at).toLocaleString('ko-KR'):'없음')+(s.held?' · 불러오기 대기':s.error?' · 백업 실패':'');
    el('restoreBackup').disabled=!s.linked||busy;el('pickBackup').disabled=busy;
  }
  const message=text=>{el('backupMessage').textContent=text||'';refresh();};
  window.onArpgBackup=message;
  window.onArpgBackupFail=text=>{try{bridge.cancelRestore();}catch(e){}busy=false;window.ARPG_BACKUP_RESTORING=false;message(text);};
  function valid(text){
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
      for(const k of Object.keys(localStorage))if(k.startsWith('arpg_'))localStorage.removeItem(k);
      for(const [k,v] of Object.entries(all))localStorage.setItem(k,v);
      location.reload();
    }catch(e){message('기기 저장을 갱신하지 못했습니다. 앱을 완전히 껐다 켜 주세요.');}
  };
  el('settingsBtn').addEventListener('click',refresh);
  el('pickBackup').addEventListener('click',()=>{try{if(window.UI)UI.save();bridge.pickBackup();}catch(e){message('파일 선택 화면을 열지 못했습니다.');}});
  el('restoreBackup').addEventListener('click',()=>{
    if(busy||!confirm('현재 진행을 백업 파일 내용으로 바꿉니다. 불러오시겠습니까?'))return;
    busy=true;window.ARPG_BACKUP_RESTORING=true;message('백업 파일을 읽는 중입니다.');
    try{bridge.restoreBackup();}catch(e){window.onArpgBackupFail('백업 파일을 읽지 못했습니다.');}
  });
  refresh();
})();
