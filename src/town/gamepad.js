// ===================== 게임패드 (케인 2026-10-14) =====================
// 왼쪽 스틱 = 이동(움직인 방향이 곧 공격 방향, 활은 자동 조준 그대로)
// 기본: Y=창 · A=활 · X=검 · B=지팡이 (누르면 그 무기로 바꾸며 공격, 누르고 있으면 계속 공격)
//       십자키 위·오른쪽·아래·왼쪽 = 스킬 1~4, RB = 스킬 5, LB = 체력 물약, LT = 마나 물약, RT = 혼합 물약,
//       Start = 가방, Select = 마을 귀환 / 대화창: A = 다음, B = 닫기
// 설정 → '게임패드 버튼 설정'에서 동작마다 버튼을 바꿀 수 있고, 이 기기에 기억된다(케인 2026-10-14).
// 패드를 쓰면 화면의 공격·스킬 버튼과 조이스틱을 숨기고, 화면을 손으로 만지면 다시 보인다.
(function(){
  const $=id=>document.getElementById(id),G=window.GAME,U=()=>window.UI&&window.UI.pad;
  const NAME={0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',8:'Select',9:'Start',10:'L스틱 누름',11:'R스틱 누름',12:'십자 위',13:'십자 아래',14:'십자 왼쪽',15:'십자 오른쪽',16:'홈'};
  const bname=i=>i==null||i<0?'없음':(NAME[i]||('버튼 '+i));
  // 동작 목록: play = 사냥 중 / dlg = 대화창·창 닫기
  const ACTS=[
    {id:'w4',name:'창 공격',grp:'play'},{id:'w3',name:'활 공격',grp:'play'},{id:'w1',name:'검 공격',grp:'play'},{id:'w2',name:'지팡이 공격',grp:'play'},
    {id:'sk0',name:'스킬 1',grp:'play'},{id:'sk1',name:'스킬 2',grp:'play'},{id:'sk2',name:'스킬 3',grp:'play'},{id:'sk3',name:'스킬 4',grp:'play'},{id:'sk4',name:'스킬 5',grp:'play'},
    {id:'hp',name:'체력 물약',grp:'play'},{id:'mp',name:'마나 물약',grp:'play'},{id:'dual',name:'혼합 물약',grp:'play'},
    {id:'bag',name:'가방 열기·닫기',grp:'play'},{id:'portal',name:'마을 귀환',grp:'play'},
    {id:'ok',name:'대화 다음',grp:'dlg'},{id:'back',name:'대화·창 닫기',grp:'dlg'}
  ];
  const DEF={w4:3,w3:0,w1:2,w2:1,sk0:12,sk1:15,sk2:13,sk3:14,sk4:5,hp:4,mp:6,dual:7,bag:9,portal:8,ok:0,back:1};
  const KEY='gqs_padmap';   // 패드는 기기마다 달라서 드라이브 동기화(arpg_)에 싣지 않는다
  let MAP={...DEF};
  try{const m=JSON.parse(localStorage.getItem(KEY)||'null');if(m&&typeof m==='object')for(const k in DEF)if(Number.isInteger(m[k]))MAP[k]=m[k];}catch(e){}
  const saveMap=()=>{try{localStorage.setItem(KEY,JSON.stringify(MAP));}catch(e){}};
  const actOf=(i,grp)=>{for(const a of ACTS)if(a.grp===grp&&MAP[a.id]===i)return a.id;return null;};

  let prev=[],padOn=false,padMoved=false,holdBtn=null,info=null,setupOpen=false,waiting=null,lastPad=null;
  const getPad=()=>{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps||[])if(p&&p.connected)return p;return null;};
  function setPadMode(on){if(padOn===on)return;padOn=on;document.body.classList.toggle('padmode',on);}
  function showInfo(t){if(!info)info=$('padInfo');if(info)info.textContent=t;}
  addEventListener('gamepadconnected',e=>{setPadMode(true);showInfo('연결됨: '+(e.gamepad&&e.gamepad.id||'패드'));rumble(.4,.4,200);});
  addEventListener('gamepaddisconnected',()=>{if(!getPad()){setPadMode(false);showInfo('패드 없음');}});
  addEventListener('pointerdown',e=>{if(setupOpen)return;if(e.pointerType==='touch'||e.pointerType==='mouse')setPadMode(false);},{capture:true});
  // 패드가 십자키를 키보드 화살표로도 보내는 경우: 패드 모드에선 이동으로 쓰지 않는다(십자키=스킬).
  addEventListener('keydown',e=>{
    showInfo('키 신호: '+(e.code||e.key));
    if(padOn&&/^Arrow/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true});
  function rumble(strong,weak,ms){
    try{const p=getPad(),v=p&&p.vibrationActuator;if(v&&v.playEffect)v.playEffect('dual-rumble',{duration:ms,strongMagnitude:strong,weakMagnitude:weak}).catch(()=>{});}catch(e){}
  }
  const vis=id=>{const e=$(id);return e&&!e.hidden&&e.offsetParent!==null;};
  function press(i){
    showInfo('버튼: '+bname(i));
    if(setupOpen){onSetupPress(i);return;}
    const u=U();if(!u)return;
    if($('dlg').classList.contains('on')){
      if(i===MAP.ok){if(vis('dlgQuest'))$('dlgQuest').click();else if(vis('dlgTrade'))$('dlgTrade').click();}
      else if(i===MAP.back)G.closeAll();
      return;
    }
    if(G.isOpen()){
      if(i===MAP.back||i===MAP.bag){if(u.charOpen())u.closeChar();else G.closeAll();}
      return;
    }
    const a=actOf(i,'play');if(!a)return;
    if(a[0]==='w'){u.weapon(a);holdBtn=i;return;}
    if(a.startsWith('sk')){u.skill(+a.slice(2));return;}
    if(a==='hp'||a==='mp'||a==='dual'){u.pot(a);return;}
    if(a==='bag'){u.bag();return;}
    if(a==='portal'){G.useTownPortal();return;}
  }
  function release(i){if(i===holdBtn){holdBtn=null;const u=U();if(u)u.hold(false);}}

  // ---------- 버튼 설정 창 ----------
  // 패드 그림: 표준 배치(엑스박스형) 기준. 표준이 아닌 패드는 누른 버튼 번호로 표시한다.
  const PADSVG=`<svg viewBox="0 0 400 220" width="100%" style="max-width:420px;max-height:34vh;display:block;margin:0 auto">
   <path d="M90 40 Q200 22 310 40 Q372 50 388 140 Q398 205 350 208 Q318 210 296 168 L262 150 L138 150 L104 168 Q82 210 50 208 Q2 205 12 140 Q28 50 90 40Z" fill="#3a2c20" stroke="#c9a65a" stroke-width="3"/>
   <rect data-b="6" x="64" y="4" width="56" height="20" rx="8"/><text x="92" y="18">LT</text>
   <rect data-b="7" x="280" y="4" width="56" height="20" rx="8"/><text x="308" y="18">RT</text>
   <rect data-b="4" x="58" y="28" width="68" height="14" rx="6"/><text x="92" y="39">LB</text>
   <rect data-b="5" x="274" y="28" width="68" height="14" rx="6"/><text x="308" y="39">RB</text>
   <circle data-b="10" cx="92" cy="88" r="24"/><text x="92" y="93">L</text>
   <circle data-b="11" cx="254" cy="138" r="22"/><text x="254" y="143">R</text>
   <rect data-b="12" x="134" y="104" width="22" height="22" rx="3"/><text x="145" y="120">▲</text>
   <rect data-b="13" x="134" y="148" width="22" height="22" rx="3"/><text x="145" y="164">▼</text>
   <rect data-b="14" x="112" y="126" width="22" height="22" rx="3"/><text x="123" y="142">◀</text>
   <rect data-b="15" x="156" y="126" width="22" height="22" rx="3"/><text x="167" y="142">▶</text>
   <rect data-b="8" x="168" y="70" width="26" height="14" rx="7"/><text x="181" y="64" style="font-size:10px">Select</text>
   <rect data-b="9" x="206" y="70" width="26" height="14" rx="7"/><text x="219" y="64" style="font-size:10px">Start</text>
   <circle data-b="3" cx="306" cy="64" r="15"/><text x="306" y="69">Y</text>
   <circle data-b="0" cx="306" cy="116" r="15"/><text x="306" y="121">A</text>
   <circle data-b="2" cx="280" cy="90" r="15"/><text x="280" y="95">X</text>
   <circle data-b="1" cx="332" cy="90" r="15"/><text x="332" y="95">B</text>
  </svg>`;
  let box=null;
  function buildSetup(){
    box=document.createElement('div');box.id='padSetupBox';
    box.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(10,7,4,.72);display:flex;align-items:center;justify-content:center;font-family:inherit';
    box.innerHTML=`<div style="width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow-y:auto;background:#f3e6c8;border:3px solid #a8823e;border-radius:14px;padding:14px 14px 10px;box-sizing:border-box;color:#3b2a18">
      <div style="font-weight:900;font-size:19px;text-align:center;margin-bottom:4px">게임패드 버튼 설정</div>
      <div id="padSetupSay" style="text-align:center;font-size:13px;min-height:18px;color:#7a5a30;margin-bottom:6px">바꿀 동작을 누른 뒤, 쓰고 싶은 패드 버튼을 누르세요.</div>
      <div id="padSetupSvg">${PADSVG}</div>
      <div id="padSetupLast" style="text-align:center;font-size:13px;margin:4px 0 8px;color:#6f5b45">패드 버튼을 눌러 보세요</div>
      <div id="padSetupList" style="display:grid;grid-template-columns:1fr 1fr;gap:6px"></div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <button type="button" id="padSetupReset" style="padding:9px 14px;border-radius:8px;border:1px solid #a8823e;background:#e7d4a8;color:#3b2a18;font:inherit;font-weight:800">기본값으로</button>
        <button type="button" id="padSetupClose" style="padding:9px 18px;border-radius:8px;border:1px solid #6d4f22;background:#7a5a2c;color:#fff6df;font:inherit;font-weight:800">저장하고 닫기</button>
      </div></div>`;
    const st=document.createElement('style');
    st.textContent=`#padSetupSvg [data-b]{fill:#5b4633;stroke:#d9bd7a;stroke-width:1.5;transition:fill .08s}
      #padSetupSvg [data-b].on{fill:#ffd45c}#padSetupSvg [data-b].sel{stroke:#ff6b3d;stroke-width:3}
      #padSetupSvg text{fill:#fff3d6;font:800 13px sans-serif;text-anchor:middle;pointer-events:none}
      #padSetupList button{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:8px 10px;border-radius:8px;border:1px solid #c9a65a;background:#fff8e6;color:#3b2a18;font:inherit;font-size:14px;text-align:left}
      #padSetupList button b{color:#8a4b12;white-space:nowrap}#padSetupList button.wait{background:#ffe08a;border-color:#ff6b3d}
      #padSetupList .sep{grid-column:1/-1;font-size:12px;color:#7a5a30;margin-top:4px}`;
    box.appendChild(st);document.body.appendChild(box);
    $('padSetupClose').onclick=closeSetup;
    $('padSetupReset').onclick=()=>{MAP={...DEF};saveMap();waiting=null;renderList();say('기본 배치로 되돌렸습니다.');};
    box.addEventListener('pointerdown',e=>{if(e.target===box)closeSetup();});
  }
  function say(t){const e=$('padSetupSay');if(e)e.textContent=t;}
  function renderList(){
    const L=$('padSetupList');if(!L)return;L.innerHTML='';
    let grp=null;
    for(const a of ACTS){
      if(a.grp!==grp){grp=a.grp;if(grp==='dlg'){const s=document.createElement('div');s.className='sep';s.textContent='대화창이나 다른 창이 열려 있을 때';L.appendChild(s);}}
      const b=document.createElement('button');b.type='button';b.className=waiting===a.id?'wait':'';
      b.innerHTML=`<span>${a.name}</span><b>${waiting===a.id?'버튼을 누르세요…':bname(MAP[a.id])}</b>`;
      b.onclick=()=>{waiting=waiting===a.id?null:a.id;renderList();say(waiting?'「'+a.name+'」에 쓸 패드 버튼을 누르세요.':'바꿀 동작을 누른 뒤, 쓰고 싶은 패드 버튼을 누르세요.');};
      L.appendChild(b);
    }
    // 고르는 중인 동작의 지금 버튼을 그림에 표시
    if(box)box.querySelectorAll('[data-b]').forEach(el=>el.classList.toggle('sel',waiting!=null&&+el.dataset.b===MAP[waiting]));
  }
  function onSetupPress(i){
    const last=$('padSetupLast');if(last)last.textContent='누른 버튼: '+bname(i)+(lastPad&&lastPad.mapping!=='standard'?' (번호 '+i+')':'');
    if(!waiting)return;
    const a=ACTS.find(x=>x.id===waiting);
    // 같은 묶음 안에서 이미 그 버튼을 쓰던 동작은 서로 맞바꾼다(한 버튼에 두 동작이 걸리지 않게).
    const other=ACTS.find(x=>x.grp===a.grp&&x.id!==a.id&&MAP[x.id]===i);
    if(other)MAP[other.id]=MAP[a.id];
    MAP[a.id]=i;saveMap();
    say('「'+a.name+'」 → '+bname(i)+(other?' (「'+other.name+'」은(는) '+bname(MAP[other.id])+'(으)로 바뀜)':''));
    waiting=null;renderList();rumble(.25,.25,90);
  }
  function openSetup(){if(!box)buildSetup();box.style.display='flex';setupOpen=true;waiting=null;renderList();const p=getPad();say(p?'바꿀 동작을 누른 뒤, 쓰고 싶은 패드 버튼을 누르세요.':'패드를 연결하고 아무 버튼이나 눌러 주세요.');}
  function closeSetup(){if(box)box.style.display='none';setupOpen=false;waiting=null;}
  {const b=$('padSetup');if(b)b.addEventListener('click',openSetup);}

  (function loop(){
    requestAnimationFrame(loop);
    const p=getPad();lastPad=p;if(!p)return;
    const b=p.buttons||[];
    for(let i=0;i<b.length;i++){
      const on=!!(b[i]&&(b[i].pressed||b[i].value>.5));
      if(on&&!prev[i]){if(!setupOpen)setPadMode(true);press(i);}
      else if(!on&&prev[i])release(i);
      prev[i]=on;
    }
    if(setupOpen){
      if(box)box.querySelectorAll('[data-b]').forEach(el=>el.classList.toggle('on',!!prev[+el.dataset.b]));
      return;   // 설정 중엔 캐릭터를 움직이지 않는다
    }
    // 왼쪽 스틱 → 화면 조이스틱과 같은 값(끝까지 밀면 달리기)
    let x=p.axes[0]||0,y=p.axes[1]||0;const m=Math.hypot(x,y);
    if(m<.2){x=0;y=0;}
    if(m>=.2){setPadMode(true);G.padMove(x,y);padMoved=true;}
    else if(padMoved){G.padMove(0,0);padMoved=false;}
  })();
  window.PAD={rumble,active:()=>padOn,map:()=>({...MAP}),openSetup,closeSetup};
})();
