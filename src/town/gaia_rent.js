'use strict';
// 가이아(케인 2026-11-04): 여관 2층은 이들만의 방. 토비에게 돈 내고 쉬던 개념을 없애고 방을 월세로 산다.
//  - 처음부터 방값 1,000골드를 '외상'으로 안고 시작(금화는 음수가 되지 않음). 외상으로도 입주는 된다.
//  - 30일(낮밤 한 바퀴=하루=8분) 안에 내야 한다. 갚으면 그 달이 정식 계약, 다음 30일은 월세(1,000G)를 또 내야 한다.
//  - 못 내고 기한이 지나면 여관 2층 사용 금지 7일. 그동안 토비는 상대해 주지 않는다(1층 감정사는 계속 쓴다).
//    금지가 끝나면 외상은 그대로 남고 새 30일이 시작된다. 게임 오버·저장 삭제 없음.
//  - 2층 방에 들어가면 체력·마나가 찬다. 새 버튼·안내창은 만들지 않고 토비 대화창의 '푹 쉬기' 자리를 바꿔 쓴다.
// ※ 토비 대사는 모두 [임시] — 케인이 고친다. 금액·기간은 아래 상수만 바꾸면 된다.
const RENT_FEE=1000,RENT_DAYS=30,RENT_BAN_DAYS=7;
function rentS(){if(!guildState.rent)guildState.rent={end:RENT_DAYS,paid:false,n:0,banEnd:0};return guildState.rent;}
function rentDay(){return guildState.gday|0;}
function rentBanLeft(){return Math.max(0,rentS().banEnd-rentDay());}
function rentLeft(){return Math.max(0,rentS().end-rentDay());}
function rentFmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function rentSave(){if(window.UI&&UI.save)UI.save();}
function rentSetLine(t){if($('dlgLine'))$('dlgLine').textContent=t;}

// 낮밤이 한 바퀴 돌 때마다(town.js) 호출
function rentOnDay(){
  guildState.gday=(guildState.gday|0)+1;
  const r=rentS(),d=rentDay();
  if(r.banEnd){
    if(d>=r.banEnd){r.banEnd=0;r.end=d+RENT_DAYS;r.paid=false;say('토비가 다시 상대해 줄 모양입니다.');}   // [임시]
  }else if(d>=r.end){
    if(r.paid){r.end+=RENT_DAYS;r.paid=false;say('방값 낼 때가 다시 돌아왔습니다.');}                  // [임시]
    else{
      r.banEnd=d+RENT_BAN_DAYS;say('방값 기한이 지났습니다. 한동안 2층을 쓸 수 없습니다.');            // [임시]
      if(MAP==='inn2'&&typeof leaveInn2==='function')leaveInn2();
    }
  }
  rentSave();
}
function rentCanEnter(){
  if(rentBanLeft()>0){say('토비가 계단 앞을 막아섰습니다. 방값부터 해결해야 합니다.');return false;}   // [임시]
  return true;
}
function rentOnEnterRoom(){
  if(P.hp>=P.maxHp&&P.mp>=P.maxMp)return;
  P.hp=P.maxHp;P.mp=P.maxMp;P.mpAcc=0;
  if(typeof PLAYER_STATUS!=='undefined')for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
  syncBars();setTimeout(()=>say('방에서 한숨 돌리니 몸이 개운합니다.'),700);   // [임시] 방 그림이 바뀐 뒤에 말풍선
}
// 토비 대화창: '푹 쉬기' 자리를 상태에 맞춰 바꾼다(없는 버튼을 새로 만들지 않음)
function rentDlg(n){
  const r=rentS(),btn=$('dlgRest');if(!btn)return;
  if(rentBanLeft()>0){
    btn.textContent='상대 안 해줌 ('+rentBanLeft()+'일)';btn.disabled=true;
    rentSetLine('토비가 장부에서 눈을 떼지 않았다. “방값부터요. '+rentBanLeft()+'일은 얼굴 마주치지 맙시다.”');   // [임시]
  }else if(r.paid){
    btn.textContent='방값 납부 완료';btn.disabled=true;
    rentSetLine('토비가 장부를 톡톡 두드렸다. “이번 달은 다 받았어요. 방은 마음껏 쓰세요. 다음 정산은 '+rentLeft()+'일 뒤예요.”');   // [임시]
  }else{
    const first=!(r.n>0);
    btn.textContent=(first?'방값 갚기 (':'월세 내기 (')+rentFmt(RENT_FEE)+'G)';btn.disabled=false;
    rentSetLine(first
      ?'토비가 장부를 펼쳤다. “방값 '+rentFmt(RENT_FEE)+'골드, 외상이에요. '+rentLeft()+'일 안에는 갚아요. 안 그러면 계단은 못 올라가요.”'   // [임시]
      :'토비가 장부를 펼쳤다. “월세 때예요. '+rentFmt(RENT_FEE)+'골드, '+rentLeft()+'일 안에요.”');   // [임시]
  }
}
function rentPay(){
  const r=rentS();
  if(rentBanLeft()>0||r.paid)return false;
  if(P.gold<RENT_FEE){rentSetLine('토비가 금액을 다시 세어보다가 슬쩍 장부를 덮었다. “모자라요. 모아서 와요.”');return false;}   // [임시]
  setGold(P.gold-RENT_FEE);r.paid=true;r.n++;
  rentSave();rentDlg();
  rentSetLine('토비가 금화를 세어 서랍에 넣었다. “확실히 받았어요. 방 마음껏 쓰세요.”');   // [임시]
  return true;
}
window.GAIA_RENT={fee:RENT_FEE,onDay:rentOnDay,canEnter:rentCanEnter,onEnterRoom:rentOnEnterRoom,dlg:rentDlg,pay:rentPay,
  state:()=>({day:rentDay(),...rentS(),left:rentLeft(),banLeft:rentBanLeft()}),
  debugDays(n){for(let i=0;i<n;i++)rentOnDay();return GAIA_RENT.state();}};
