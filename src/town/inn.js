'use strict';
// 여관 1단계 + 감정사: 실내 이동, 회복, 미확인 장비 감정.
function innCost(){return Math.max(0,(P.lv||1)*8);}
function enterInn(){if(MAP!=='town')return false;return travel('inn',MAPS.inn.spawn,'back');}
function leaveInn(){closeAll();return MAP==='inn'?travel('town',MAPS.inn.back,'front'):false;}
function openInnDlg(n){
  talking=n;
  $('dlgImg').src=A.port[n.k];$('dlgName').textContent=n.name;$('dlgTitle').textContent=n.title;
  $('dlgLine').textContent=n.line||'왔네요. 앉아 있어요. 방 정리는 제가 마저 할게요.';
  $('dlgMainRow').hidden=true;$('dlgInnRow').hidden=false;
  $('dlgRest').textContent='푹 쉬기 ('+innCost()+'G)';
  show('dlg');return true;
}
function identifyInn(){
  if(MAP!=='inn'||!window.UI||!UI.openIdentifyVendor)return false;
  closeAll();return UI.openIdentifyVendor();
}
function restInn(){
  if(MAP!=='inn')return false;
  if(P.hp>=P.maxHp&&P.mp>=P.maxMp){$('dlgLine').textContent='토비가 루크레아를 위아래로 훑어봤다. “멀쩡한데요? 침대가 그립다는 이유면 말리진 않겠지만.”';return false;}
  const cost=innCost();
  if(P.gold<cost){$('dlgLine').textContent='토비가 금액을 다시 세어보다가 슬쩍 장부를 덮었다. “오늘은 그냥 앉았다 가요. 방값 얘긴… 다음에 합시다.”';return false;}
  setGold(P.gold-cost);
  const f=$('fade');f.classList.add('slow');requestAnimationFrame(()=>f.classList.add('on'));
  setTimeout(()=>{
    P.hp=P.maxHp;P.mp=P.maxMp;P.mpAcc=0;
    if(typeof PLAYER_STATUS!=='undefined')for(const k in PLAYER_STATUS)PLAYER_STATUS[k]=0;
    syncBars();$('dlgLine').textContent='토비가 커튼을 걷었다. “해가 꽤 올라왔네요. 얼굴빛은 아까보다 낫고요. 아, 물은 문 옆에 뒀어요.”';
    if(window.UI&&UI.save)UI.save();
    setTimeout(()=>{f.classList.remove('on');setTimeout(()=>f.classList.remove('slow'),420);},160);
  },360);
  return true;
}
$('dlgRest').addEventListener('click',restInn);
$('dlgIdentify').addEventListener('click',identifyInn);
$('dlgLeave').addEventListener('click',()=>{if(MAP==='inn')leaveInn();else closeAll();});
window.__INN={enter:enterInn,leave:leaveInn,open:()=>{const n=npcs.find(x=>x.shop==='inn');return n?openInnDlg(n):false;},rest:restInn,identify:identifyInn,cost:innCost,state:()=>({map:MAP,x:P.x,y:P.y,gold:P.gold,hp:P.hp,mp:P.mp})};
