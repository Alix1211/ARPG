'use strict';
// 여관 1단계: 실내 이동 + 토비 회복. 감정은 다음 묶음에서 이 대화창에 연결한다.
function innCost(){return Math.max(0,(P.lv||1)*8);}
function enterInn(){if(MAP!=='town')return false;return travel('inn',MAPS.inn.spawn,'back');}
function leaveInn(){closeAll();return MAP==='inn'?travel('town',MAPS.inn.back,'front'):false;}
function openInnDlg(n){
  talking=n;
  $('dlgImg').src=A.port[n.k];$('dlgName').textContent=n.name;$('dlgTitle').textContent=n.title;
  $('dlgLine').textContent=n.line||'어서 와요~ 잠깐 쉬었다 가세요.';
  $('dlgMainRow').hidden=true;$('dlgInnRow').hidden=false;
  $('dlgRest').textContent='푹 쉬기 ('+innCost()+'G)';
  show('dlg');return true;
}
function restInn(){
  if(MAP!=='inn')return false;
  if(P.hp>=P.maxHp&&P.mp>=P.maxMp){$('dlgLine').textContent='지금은 쉴 필요가 없어 보입니다.';return false;}
  const cost=innCost();
  if(P.gold<cost){$('dlgLine').textContent='금화가 부족합니다.';return false;}
  setGold(P.gold-cost);
  const f=$('fade');f.classList.add('slow');requestAnimationFrame(()=>f.classList.add('on'));
  setTimeout(()=>{
    P.hp=P.maxHp;P.mp=P.maxMp;P.mpAcc=0;
    if(typeof PLAYER_STATUS!=='undefined')for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
    syncBars();$('dlgLine').textContent='푹 쉬었어요. 체력과 마나가 모두 회복됐습니다.';
    if(window.UI&&UI.save)UI.save();
    setTimeout(()=>{f.classList.remove('on');setTimeout(()=>f.classList.remove('slow'),420);},160);
  },360);
  return true;
}
$('dlgRest').addEventListener('click',restInn);
$('dlgLeave').addEventListener('click',()=>closeAll());
window.__INN={enter:enterInn,leave:leaveInn,open:()=>{const n=npcs.find(x=>x.shop==='inn');return n?openInnDlg(n):false;},rest:restInn,cost:innCost,state:()=>({map:MAP,x:P.x,y:P.y,gold:P.gold,hp:P.hp,mp:P.mp})};
