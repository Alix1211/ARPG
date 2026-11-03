'use strict';
// 가이아 HUD: GPT가 만든 그림 묶음(assets/ui/gaia_kit, A.gaiaKit)을 화면에 붙인다.
// 그림이 없으면(A.gaiaKit 없음) 아무것도 바꾸지 않아 예전 화면 그대로 나온다.
// 글자·숫자·게이지 길이·쿨다운은 모두 코드가 그린다(그림에는 글자가 없음).
const GAIA_HUD={ready:false,K:null};
(function(){
  const K=A.gaiaKit;if(!K)return;
  GAIA_HUD.K=K;
  const u=k=>'url('+K[k]+')';
  const css=`
/* 케인 2026-11-04: 동료 체력 카드가 왼쪽 의뢰 목록을 가려서 상단 중앙으로(버튼 줄과 안 겹치게 중앙에서 살짝 왼쪽) */
#gaiaPartyHud.gk{left:calc(50% - 90px);top:6px;width:150px;height:76px;padding:0;background:none;border:0;border-radius:0;overflow:visible;text-shadow:none}
.gcard{position:relative;width:150px;height:36px;margin:0 0 4px}
.gcard .gport{position:absolute;left:8px;top:8.5px;width:19px;height:19px;border-radius:50%;object-fit:cover;z-index:0}
.gcard.ko .gport{filter:grayscale(1) brightness(.7)}
.gcard .gframe{position:absolute;left:0;top:0;width:150px;height:36px;z-index:1;pointer-events:none}
.gcard .gcl{position:absolute;left:49px;top:3px;width:92px;display:flex;justify-content:space-between;font:800 8px/10px sans-serif;color:#ffe7bb;text-shadow:0 1px 1px #000;z-index:3}
.gcard .gbar{position:absolute;left:49px;width:92px;overflow:hidden;border-radius:3px;z-index:2}
.gcard .gbar.hp{top:16.3px;height:5.6px}.gcard .gbar.m{top:26.8px;height:3.8px}
.gcard .gfill{height:100%;width:100%;overflow:hidden;position:relative}
.gcard .gfill img{position:absolute;left:0;top:0;width:92px;height:100%}
#gaiaRecallBtn.gk{left:calc(50% - 53px);top:86px;width:76px;height:33px;padding:0;border:0;border-radius:0;background:${u('gather_n')} center/100% 100% no-repeat;color:#ffe9bd;font:800 11px sans-serif;text-shadow:0 1px 2px #000;display:flex;align-items:center;justify-content:center}
#gaiaRecallBtn.gk:active:not(:disabled){background-image:${u('gather_p')};padding-top:1px}
#gaiaRecallBtn.gk:disabled{background-image:${u('gather_d')};color:#9a9a9a;text-shadow:none}
#atk.gkd{background:${u('dial')} center/100% 100% no-repeat!important;filter:drop-shadow(0 4px 6px #000a)}
#atk .atkz.gk{opacity:0;filter:none;transition:opacity .1s}
#atk .atkz.gk.zon{opacity:1;filter:none}
#atk .gkc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#atk .gkc.p{opacity:0}#atk:active .gkc.p{opacity:1}#atk:active .gkc.n{opacity:0}
.sk.gk{background-size:80% 80%!important;background-position:center!important;background-repeat:no-repeat!important}
.sk.gk::after{content:'';position:absolute;left:-4px;top:-4px;right:-4px;bottom:-4px;background:${u('ring_ok')} center/100% 100% no-repeat;pointer-events:none;z-index:3}
.sk.gk.empty::after{background-image:${u('ring_empty')}}
.sk.gk.empty{opacity:1}
.gcts{display:flex;gap:12px;justify-content:center;margin:6px 0 8px}
.gct{position:relative;width:64px;height:80px;border:0;background:none;padding:0;cursor:pointer;touch-action:manipulation}
.gct .gctp{position:absolute;left:12px;top:12px;width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:50% 20%}
.gct .gctr{position:absolute;left:0;top:0;width:64px;height:64px;pointer-events:none}
.gct .gctn{position:absolute;left:0;right:0;top:64px;text-align:center;font:800 11px "Noto Sans KR",sans-serif;color:#7a5a38}
.gct.on .gctn{color:#3a2210}
.gct.off .gctp{filter:grayscale(1) brightness(.6)}
.gcts.eqtabs{position:absolute;left:0;right:0;top:2px;margin:0;z-index:6}
.gcts.eqtabs .gctn{color:#f3dcae;text-shadow:0 1px 2px #000,0 0 3px #000}.gcts.eqtabs .gct.on .gctn{color:#fff3c8}
.geqstat{position:absolute;left:162px;width:174px;top:410px;text-align:center;font:800 11px/1.45 "Noto Sans KR",sans-serif;color:#3a2210;text-shadow:0 1px 0 #fff8;background:#f0e1bd99;border-radius:6px;padding:3px 0;z-index:5;pointer-events:none}
.skc.glockimg{position:relative}
.skc.lock.glockimg{filter:brightness(.8)}
.skc.glockimg::after{content:'';position:absolute;left:-4px;top:-4px;right:-4px;bottom:-4px;background:${u('lock')} center/100% 100% no-repeat;pointer-events:none}
`;
  const st=document.createElement('style');st.id='gaiaKitStyle';st.textContent=css;document.head.append(st);

  // 동료 카드 두 장(초상·이름·체력·M)
  const hud=document.getElementById('gaiaPartyHud');
  if(hud){
    hud.classList.add('gk');hud.innerHTML='';
    const keys=['agatha','sylvia'];
    for(let i=0;i<2;i++){
      const c=document.createElement('div');c.className='gcard';c.id='gaiaCard'+i;
      c.innerHTML=`<img class="gport" src="${K['port_'+keys[i]]}" alt=""><img class="gframe" src="${K.card}" alt="">`
        +`<div class="gcl"><span>${GAIA_PARTY_NAMES[i]}</span><span id="gaiaNum${i}"></span></div>`
        +`<div class="gbar hp"><div class="gfill" id="gaiaHp${i}"><img id="gaiaHpImg${i}" src="${K.hp_fill}" alt=""></div></div>`
        +`<div class="gbar m"><div class="gfill" id="gaiaM${i}"><img src="${K.m_fill}" alt=""></div></div>`;
      hud.append(c);
    }
  }
  const btn=document.getElementById('gaiaRecallBtn');
  if(btn){btn.classList.add('gk');btn.textContent='동료 집합';}
  GAIA_HUD.ready=true;
})();

// 매 0.15초: 카드·집합 버튼 갱신. 쓰러진 동료는 체력 띠 자리에 회색 '쓰러짐' 띠가 일어날 때까지 줄어든다.
GAIA_HUD.update=function(members,koTime,mMax){
  if(!GAIA_HUD.ready)return false;
  const K=GAIA_HUD.K,$$=id=>document.getElementById(id);
  let far=false;
  for(let i=0;i<members.length;i++){
    const c=members[i],card=$$('gaiaCard'+i);if(!card)continue;
    card.classList.toggle('ko',!!c.ko);
    const hp=$$('gaiaHp'+i),m=$$('gaiaM'+i),num=$$('gaiaNum'+i),img=$$('gaiaHpImg'+i);
    const want=c.ko?K.down_fill:K.hp_fill;if(img&&img.dataset.s!==(c.ko?'d':'h')){img.src=want;img.dataset.s=c.ko?'d':'h';}
    if(hp)hp.style.width=Math.max(0,Math.min(100,c.ko?c.koT/koTime*100:c.hp/c.maxHp*100))+'%';
    if(m)m.style.width=Math.max(0,Math.min(100,c.m/mMax*100))+'%';
    if(num)num.textContent=c.ko?Math.ceil(c.koT)+'초':'M '+Math.round(c.m)+(c.shield>0?' ◈':'');
    if(!c.ko&&c.hp>0&&Math.hypot(c.x-P.x,c.y-P.y)>150)far=true;
  }
  const btn=$$('gaiaRecallBtn');if(btn)btn.disabled=!far;   // 다 곁에 모여 있으면 누를 일이 없으므로 회색
  return true;
};

// 캐릭터 탭 줄(스킬창·장비창 공용). 선택/비선택 고리 그림 위에 얼굴을 놓는다.
GAIA_HUD.tabs=function(selected,onPick,locked){
  const K=GAIA_HUD.K,row=document.createElement('div');row.className='gcts';
  for(const [k,nm] of [['kyle','카일'],['agatha','아가사'],['sylvia','실비아']]){
    const b=document.createElement('button');b.type='button';
    const off=locked&&locked[k];
    b.className='gct'+(selected===k?' on':'')+(off?' off':'');
    b.innerHTML=K?`<img class="gctp" src="${K['port_'+k]}" alt=""><img class="gctr" src="${off?K.tab_dis:selected===k?K.tab_sel:K.tab_un}" alt=""><span class="gctn">${nm}</span>`
      :`<span class="gctn" style="top:20px">${nm}</span>`;
    if(!off)b.onclick=()=>onPick(k);
    row.append(b);
  }
  return row;
};
window.GAIA_HUD=GAIA_HUD;
