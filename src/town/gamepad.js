// ===================== 게임패드 (케인 2026-10-14) =====================
// 왼쪽 스틱 = 이동(움직인 방향이 곧 공격 방향, 활은 자동 조준 그대로)
// Y=창 · A=활 · X=검 · B=지팡이 (누르면 그 무기로 바꾸며 공격, 누르고 있으면 계속 공격)
// 십자키 위·오른쪽·아래·왼쪽 = 스킬 1~4, RB = 스킬 5
// LB = 체력 물약, LT = 마나 물약, RT = 혼합 물약, Start = 가방, Select = 마을 귀환
// 대화창: A = 다음, B = 닫기 / 창이 열려 있으면 B·Start = 닫기
// 패드를 쓰면 화면의 공격·스킬 버튼과 조이스틱을 숨기고, 화면을 손으로 만지면 다시 보인다.
(function(){
  const $=id=>document.getElementById(id),G=window.GAME,U=()=>window.UI&&window.UI.pad;
  const NAME={0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',8:'Select',9:'Start',10:'L스틱',11:'R스틱',12:'위',13:'아래',14:'왼쪽',15:'오른쪽'};
  const ATK={3:'w4',0:'w3',2:'w1',1:'w2'};          // Y A X B → 창 활 검 지팡이
  const DPAD={12:0,15:1,13:2,14:3};                  // 위 오른쪽 아래 왼쪽 → 스킬 1~4
  let prev=[],padOn=false,padMoved=false,holdBtn=null,info=null;
  const getPad=()=>{const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps||[])if(p&&p.connected)return p;return null;};
  function setPadMode(on){if(padOn===on)return;padOn=on;document.body.classList.toggle('padmode',on);}
  function showInfo(t){if(!info)info=$('padInfo');if(info)info.textContent=t;}
  addEventListener('gamepadconnected',e=>{setPadMode(true);showInfo('연결됨: '+(e.gamepad&&e.gamepad.id||'패드'));rumble(.4,.4,200);});
  addEventListener('gamepaddisconnected',()=>{if(!getPad()){setPadMode(false);showInfo('패드 없음');}});
  addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='mouse')setPadMode(false);},{capture:true});
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
    showInfo('버튼: '+(NAME[i]||('#'+i)));const u=U();if(!u)return;
    if($('dlg').classList.contains('on')){
      if(i===0){if(vis('dlgQuest'))$('dlgQuest').click();else if(vis('dlgTrade'))$('dlgTrade').click();}
      else if(i===1)G.closeAll();
      return;
    }
    if(G.isOpen()){
      if(i===1||i===9){if(u.charOpen())u.closeChar();else G.closeAll();}
      return;
    }
    if(i in ATK){u.weapon(ATK[i]);holdBtn=i;return;}
    if(i in DPAD){u.skill(DPAD[i]);return;}
    if(i===5){u.skill(4);return;}
    if(i===4){u.pot('hp');return;}
    if(i===6){u.pot('mp');return;}
    if(i===7){u.pot('dual');return;}
    if(i===9){u.bag();return;}
    if(i===8){G.useTownPortal();return;}
  }
  function release(i){if(i===holdBtn){holdBtn=null;const u=U();if(u)u.hold(false);}}
  (function loop(){
    requestAnimationFrame(loop);
    const p=getPad();if(!p)return;
    const b=p.buttons||[];
    for(let i=0;i<b.length;i++){
      const on=!!(b[i]&&(b[i].pressed||b[i].value>.5));
      if(on&&!prev[i]){setPadMode(true);press(i);}
      else if(!on&&prev[i])release(i);
      prev[i]=on;
    }
    // 왼쪽 스틱 → 화면 조이스틱과 같은 값(끝까지 밀면 달리기)
    let x=p.axes[0]||0,y=p.axes[1]||0;const m=Math.hypot(x,y);
    if(m<.2){x=0;y=0;}
    if(m>=.2){setPadMode(true);G.padMove(x,y);padMoved=true;}
    else if(padMoved){G.padMove(0,0);padMoved=false;}
  })();
  window.PAD={rumble,active:()=>padOn};
})();
