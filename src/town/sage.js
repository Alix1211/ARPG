// 고대 엘프의 무예. 가격은 케인 확정 전 null: 무료 학습·임의 과금 금지.
const SAGE_SKILLS={
 sword4_whirl:{name:'휠윈드',desc:'몸을 회전시키며 2초 동안 주변을 여섯 번 벱니다.',mp:18,cd:12,mode:'spin',dur:2,hits:6,R:155,mul:.9,icon:'sword2'},
 sword5_fury:{name:'투사의 맹세',desc:'12초 동안 물리 공격력 30% 증가.',mp:12,cd:25,mode:'buff',buff:'attack',value:30,icon:'sword1'},
 sword6_quake:{name:'어스퀘이크',desc:'땅을 쳐 전방으로 이어지는 세 충격파. 적을 밀어냅니다.',mp:20,cd:14,mode:'quake',dur:.9,hits:3,R:85,mul:1.4,icon:'fist3'},
 sword7_judgment:{name:'단죄의 일섬',desc:'짧은 준비 뒤 돌진 베기와 세 번의 잔류 참격.',mp:32,cd:32,mode:'judgment',dur:1.1,hits:4,R:270,mul:1.6,icon:'sword3'},
 bow4_circle:{name:'윤무 사격',desc:'한 바퀴 회전하며 열두 방향으로 화살을 쏩니다.',mp:16,cd:10,mode:'arrows',dur:.6,hits:12,R:0,mul:1.1,icon:'bow2'},
 bow5_charge:{name:'차징샷',desc:'기를 모아 관통 사격. 학습 단계별 공격력 150 / 200 / 300%.',mp:13,cd:7,mode:'charge',dur:.9,hits:1,R:0,mul:1,icon:'bow1',max:3},
 bow6_agility:{name:'바람 걸음',desc:'12초 동안 이동속도 35% 증가.',mp:10,cd:24,mode:'buff',buff:'speed',value:35,icon:'bow3'},
 bow7_mark:{name:'사냥꾼의 낙인',desc:'주변 최대 여덟 적에게 표식. 잠시 뒤 심판의 화살이 관통합니다.',mp:30,cd:30,mode:'mark',dur:1.1,hits:1,R:360,mul:4.8,icon:'bow3'},
 spear4_wheel:{name:'선풍창',desc:'긴 창을 회전시켜 넓은 범위를 네 번 휩씁니다.',mp:18,cd:12,mode:'spin',dur:1.3,hits:4,R:200,mul:1.05,icon:'spear1'},
 spear5_vigor:{name:'불굴의 숨결',desc:'12초 동안 최대 체력 30% 증가. 증가분만큼 체력도 확보합니다.',mp:14,cd:28,mode:'buff',buff:'vitality',value:30,icon:'holy1_heal'},
 spear6_spirit:{name:'관통 기창',desc:'창을 던지는 자세로 거대한 관통 기운을 발사합니다.',mp:16,cd:9,mode:'spirit',dur:.35,hits:1,R:0,mul:3.5,icon:'spear2'},
 spear7_heaven:{name:'천창강림',desc:'도약 후 거대한 창의 환영과 두 겹의 충격파를 내리꽂습니다.',mp:34,cd:34,mode:'heaven',dur:1.1,hits:2,R:230,mul:3,icon:'spear3'},
 fist4_clones:{name:'분신술',desc:'네 분신이 주변을 번갈아 타격하는 여덟 연격.',mp:20,cd:14,mode:'clones',dur:1.5,hits:8,R:170,mul:.7,icon:'fist1'},
 fist5_barrage:{name:'연환권격',desc:'전방 중거리로 다섯 권격을 빠르게 연사합니다.',mp:16,cd:9,mode:'barrage',dur:.7,hits:5,R:0,mul:.85,icon:'fist2'},
 fist6_guard:{name:'금강체',desc:'12초 동안 추가 피해 감소 25%와 밀려남 저항. 보호막과 함께 사용 가능.',mp:12,cd:25,mode:'buff',buff:'guard',value:25,icon:'holy2_shield'},
 fist7_dance:{name:'파쇄연무',desc:'주변 적을 잔상으로 열 번 연타하고 마지막 일격으로 밀어냅니다.',mp:32,cd:32,mode:'dance',dur:1.7,hits:10,R:220,mul:.65,icon:'fist3'}
};
// 수업료(케인 확정 2026-10-14): 1단계 Lv10 3,000G / 2단계 Lv25 12,000G / 3단계 Lv40 40,000G / 궁극기 Lv55 120,000G. 차징샷처럼 여러 단계는 단계마다 같은 값.
const SAGE_TUITION={4:[10,3000],5:[25,12000],6:[40,40000],7:[55,120000]};
const SAGE_HIDDEN=id=>id.startsWith('fist');   // 격투가 보류(장비 착용 불가) → 판매·스킬창에서 숨김
for(const [id,s] of Object.entries(SAGE_SKILLS)){const t=SAGE_TUITION[+(id.match(/(\d)_/)||[])[1]]||[99,null];s.lv=t[0];s.price=t[1];s.max=s.max||1;SK[id]={mp:s.mp,cd:s.cd};SK2[id]=SK[id];P.skillLv[id]=P.skillLv[id]||0;A.skicon[id]=A.skicon[id]||A.skicon[s.icon];}
const sageActs=[],sageBuffs={};
let sageEchoImage=null;
function sageEcho(){if(sageEchoImage)return sageEchoImage;const im=EL.front[0];if(!im.complete||!im.naturalWidth)return im;const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext("2d");g.drawImage(im,0,0);g.globalCompositeOperation="source-atop";g.fillStyle="rgba(125,225,244,.42)";g.fillRect(0,0,c.width,c.height);sageEchoImage=c;return c;}
const sageLines=[
 '어서 오렴. 먼 길을 걸었지? 앉아서 숨부터 돌려. 찻물은 방금 올렸단다.\n\n무릎에 힘이 잔뜩 들어갔구나. 넘어지지 않으려고 버티는 건 좋지만, 그러면 다음 발을 떼기 어렵지. 천천히 해 보렴. 나는 기다릴 줄 안단다.',
 '어려 보인다고? 후후. 이 집 앞에 처음 심은 나무가 지금 마을에서 가장 오래된 나무란다.\n\n네가 서두르는 이유도 알지. 나도 한때는 그랬으니까. 다만 서둘러 배운 버릇은 오래 남아. 오늘은 발을 놓는 자리부터 보자꾸나.',
 '식사는 했니? 배가 비면 손끝부터 떨린단다. 마르타가 빵을 보내 줬으니 하나 가져가렴.\n\n수업료도 조금 덜어 달라고? 어머, 그건 안 되지. 빵은 내가 주고 싶은 것이고, 가르침은 우리가 약속한 것이란다. 둘을 섞으면 곤란해.',
 '처음엔 두 칸짜리 오두막이었단다. 제자가 늘어서 방을 하나 붙였지. 그다음엔 비 오는 날 쉴 처마를…\n\n금 장식? 음. 그건 내가 좋아해서. 오래 산다고 취향까지 없어지는 건 아니잖니. 자, 집 구경은 이쯤 하고 손을 펴 보렴.'
];
let sageLineIndex=0;
function sageBonus(k){return sageBuffs[k]&&sageBuffs[k].t>0?sageBuffs[k].value:0;}
function sageCast(id,d,rank,cm,mod,skillMul){
 const s=SAGE_SKILLS[id];if(!s)return false;
 if(s.mode==='buff'){
  const oldHp=P.maxHp;sageBuffs[s.buff]={t:12,value:s.value,mapKey:skillShowMapKey()};
  if(s.buff==='vitality'&&window.UI){UI.refresh();P.hp=Math.min(P.maxHp,P.hp+Math.max(0,P.maxHp-oldHp));syncBars();}
  sfx.push({type:'holyshield',t:0,x:P.x,y:P.y-25,r:90});skillShowImpact('holy',P.x,P.y,85,2);return true;
 }
 let targets=s.mode==='mark'?combatTargets().filter(t=>Math.hypot(t.x-P.x,t.y-P.y)<s.R).slice(0,8):[];
 if(s.mode==='mark'&&!targets.length){say('표식을 새길 상대가 없습니다.');return false;}
 if(sageActs.length>=8)sageActs.shift();
 sageActs.push({id,s,x:P.x,y:P.y,d:d.slice(),rank,cm,t:0,done:0,next:s.mode==='charge'?.7:s.mode==='mark'?.65:s.mode==='heaven'?.55:s.mode==='judgment'?.25:.05,
  dur:s.dur,targets,damage:Math.max(1,cm.phys)*mod.dmg*(1+(cm.skill||0)/100),mapKey:skillShowMapKey(),echoes:[]});
 return true;
}
function sageProjectile(a,angle,kind,mul,speed=740,life=.85,width=22){
 const d=[Math.cos(angle),Math.sin(angle)];shots.push({x:a.x+d[0]*28,y:a.y-44+d[1]*28,vx:d[0]*speed,vy:d[1]*speed,speed,t:0,life,kind,dmg:Math.round(a.damage*mul),pierce:true,hit:new Set(),hw:width,fx:kind==='bow'?'impact':'waveburst',skillId:a.id,visualStage:3,visualMapKey:a.mapKey});
}
function sageStrike(a,x,y,r,mul,d=a.d,kb=28){
 for(const t of combatTargets())if(Math.hypot(t.x-x,(t.y-y)*1.15)<r+12)hitTarget(t,d,true,Math.round(a.damage*mul),kb);
 skillShowImpact('stone',x,y,r,3);
}
function sageTick(dt){
 let refresh=false;
 for(const [k,b] of Object.entries(sageBuffs)){b.t-=dt;if(b.t<=0||P.hp<=0){delete sageBuffs[k];if(k==='vitality')refresh=true;}}
 if(refresh&&window.UI)UI.refresh();
 for(let i=sageActs.length-1;i>=0;i--){
  const a=sageActs[i],s=a.s;if(a.mapKey!==skillShowMapKey()||P.hp<=0){sageActs.splice(i,1);continue;}a.t+=dt;
  while(a.done<s.hits&&a.t>=a.next){
   const n=a.done++,ang=Math.atan2(a.d[1],a.d[0]);a.next+=(s.dur-(s.mode==='charge'?.7:0))/s.hits;
   if(s.mode==='spin'){a.x=P.x;a.y=P.y;sageStrike(a,a.x,a.y,s.R,s.mul);}
   else if(s.mode==='quake'){sageStrike(a,a.x+a.d[0]*(70+n*75),a.y+a.d[1]*(70+n*75),s.R,s.mul,a.d,55);}
   else if(s.mode==='arrows'){sageProjectile(a,ang+n*Math.PI/6,'bow',s.mul);}
   else if(s.mode==='charge'){sageProjectile(a,ang,'bow',[1.5,2,3][Math.min(2,a.rank-1)],1050,1.05,30);skillShowImpact('holy',a.x,a.y,65,2);}
   else if(s.mode==='spirit'){sageProjectile(a,ang,'spear',s.mul,760,1,40);}
   else if(s.mode==='barrage'){sageProjectile(a,ang,'wave',s.mul,660,.52,25);}
   else if(s.mode==='mark'){
    for(const t of a.targets)if(!t.dead&&!t.removed){hitTarget(t,[0,0],true,Math.round(a.damage*s.mul),20);skillShowImpact('holy',t.x,t.y,60,3);a.echoes.push({x:t.x,y:t.y,t:a.t});}
   }else if(s.mode==='heaven'){sageStrike(a,a.x+a.d[0]*105,a.y+a.d[1]*105,s.R+n*35,s.mul,a.d,60);}
   else if(s.mode==='judgment'){
    if(n===0){for(let j=0;j<9;j++)move(a.d[0]*16,a.d[1]*16);}
    const cx=a.x+a.d[0]*(70+n*42),cy=a.y+a.d[1]*(70+n*42);
    for(const t of combatTargets()){
     const dx=t.x-a.x,dy=t.y-a.y,along=dx*a.d[0]+dy*a.d[1],side=Math.abs(dx*a.d[1]-dy*a.d[0]);
     if(along>-30&&along<s.R+30&&side<75)hitTarget(t,a.d,true,Math.round(a.damage*s.mul),n===3?60:12);
    }skillShowImpact('stone',cx,cy,80,3);
   }else if(s.mode==='clones'||s.mode==='dance'){
    const theta=n*Math.PI/2,dx=Math.cos(theta)*95,dy=Math.sin(theta)*70;
    a.echoes.push({x:a.x+dx,y:a.y+dy,t:a.t});if(a.echoes.length>12)a.echoes.shift();
    sageStrike(a,a.x,a.y,s.R,s.mul*(s.mode==='dance'&&n===s.hits-1?3:1),[Math.cos(theta),Math.sin(theta)],n===s.hits-1?65:10);
   }
  }
  if(a.t>s.dur+.6)sageActs.splice(i,1);
 }
}
function sageDraw(){
 for(const [k,b] of Object.entries(sageBuffs)){
  vfxDraw(k==='guard'?'ring_blue':'ring_gold',P.x,P.y,120,{sy:.55,rot:T*.4,alpha:Math.min(1,b.t)*.65});
  if(k==='guard')vfxDraw('heal_arrow',P.x,P.y-40,115,{alpha:.3});
 }
 for(const a of sageActs){
  const s=a.s,k=Math.min(1,a.t/s.dur),fade=Math.max(0,1-(a.t-s.dur)/.6),ang=Math.atan2(a.d[1],a.d[0]);
  if(s.mode==='spin'){
   // 케인 2026-10-14: 몸 주위를 같이 돌던 원반 칼날(shot_blade) 3개는 뺐다. 회전하는 무기만 남긴다.
   wDrawWeapon({wt:a.id.startsWith('spear')?'spear':'sword',img:WIMG[(a.id.startsWith('spear')?'spear':'sword')+'_01']},P.x+Math.cos(a.t*10)*45,P.y-45+Math.sin(a.t*10)*22,a.t*10,1.4);
  }else if(s.mode==='charge'){
   if(a.t<.7){vfxDraw('ring_gold',a.x,a.y-44,110*(1-k*.5),{rot:-a.t*5,alpha:.9});for(let j=0;j<5;j++)vfxDraw('hit_spark_'+j,a.x+Math.cos(j*1.26+a.t*4)*(60*(1-k)),a.y-44+Math.sin(j*1.26+a.t*4)*30,22,{add:true,alpha:.8});}
  }else if(s.mode==='heaven'){
   const x=a.x+a.d[0]*105,y=a.y+a.d[1]*105,lift=a.t<.55?(1-a.t/.55)*250:0;
   wDrawWeapon({wt:'spear',img:WIMG.spear_01},x,y-110-lift,0,3.2);
   vfxDraw('ring_gold',x,y,s.R*2,{sy:.5,alpha:fade*.7});
  }else if(s.mode==='mark'){
   for(const t of a.targets)if(!t.dead&&!t.removed){vfxDraw('ring_gold',t.x,t.y-t.h*.5,75,{rot:a.t*3,alpha:fade});if(a.t>.55)skillDrawArrow(t.x,t.y-t.h*.5-(Math.max(0,.8-a.t)*400),Math.PI/2,2.5,fade);}
  }else if(s.mode==='clones'||s.mode==='dance'){
   const im=sageEcho();for(const e of a.echoes){const age=a.t-e.t;if(age>.45)continue;ctx.save();ctx.globalAlpha=(1-age/.45)*.65;ctx.drawImage(im,e.x-50,e.y-125,100,125);ctx.restore();}
  }else if(s.mode==='judgment'){
   vfxDraw('shot_blade',a.x+a.d[0]*k*270,a.y-40+a.d[1]*k*270,240,{rot:ang,alpha:fade,add:true});
  }
 }
}
function sageTrial(id,trialRank){
 const s=SAGE_SKILLS[id];if(MAP!=='sage'||!s)return false;
 const oldRank=P.skillLv[id]||0,oldMp=P.mp;closeAll();P.x=1000;P.y=730;P.dir='side';P.flip=false;P.castRoot=0;CD[id]=0;
 // 수업료 확정 전 현장에서만 시연. 영구 학습·저장 데이터는 바꾸지 않는다.
 P.skillLv[id]=Math.max(1,Math.min(s.max,trialRank||s.max));P.mp=Math.max(P.mp,s.mp*NUM);const ok=cast(id);P.skillLv[id]=oldRank;P.mp=Math.min(P.maxMp,oldMp);syncBars();
 say(s.name+' · 수련 시연');return ok;
}
function sageClear(){sageActs.length=0;for(const k of Object.keys(sageBuffs))delete sageBuffs[k];if(window.UI)UI.refresh();}
function sageLearn(id){
 const s=SAGE_SKILLS[id],rank=P.skillLv[id]||0;
 if(!s||MAP!=='sage'||!talking||talking.shop!=='sage'||!Number.isFinite(s.price)||s.price<=0||rank>=s.max)return false;
 if(P.lv<s.lv){say('Lv'+s.lv+'부터 배울 수 있습니다.');return false;}
 if(P.gold<s.price){say('금화가 부족합니다.');return false;}
 setGold(P.gold-s.price);P.skillLv[id]=rank+1;syncBars();if(window.UI){UI.refresh();UI.save();}say('「'+s.name+'」을(를) 익혔습니다. 스킬 창에서 무기별 칸에 등록하세요.');sageOpenShop();return true;
}
function sageOpenShop(){
 if(MAP!=='sage'||!talking||talking.shop!=='sage')return;
 show('dlg');$('dlgMainRow').hidden=true;$('dlgInnRow').hidden=true;
 $('dlgLine').style.whiteSpace='pre-line';
 $('dlgLine').textContent='배우고 싶은 것을 골라 보렴. 손에 익을 때까지 옆에서 봐 줄게.\n\n…할인? 후후, 너도 참. 차는 한 잔 더 줄 수 있단다.';
 let shop=$('sageShop');if(!shop){shop=document.createElement('div');shop.id='sageShop';shop.style.cssText='margin:8px 0;max-height:42vh;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;';$('dlgLine').parentNode.append(shop);}shop.hidden=false;shop.style.display='grid';shop.innerHTML='';
 for(const [group,prefix] of [['검','sword'],['활','bow'],['창','spear']]){
  const h=document.createElement('b');h.textContent=group;h.style.gridColumn='1 / -1';shop.append(h);
  for(const [id,s] of Object.entries(SAGE_SKILLS).filter(([id])=>id.startsWith(prefix))){
   const b=document.createElement('button');b.type='button';b.dataset.skill=id;
   b.style.cssText='min-height:90px;padding:9px;background:#23362c;color:#fff1cc;border:1px solid #b49b59;border-radius:8px;text-align:left;font-size:14px;font-family:inherit;';
   const rank=P.skillLv[id]||0;b.textContent=s.name+'\n'+s.desc+'\n'+(rank>=s.max?'학습 완료':s.price===null?'수업료 미정':s.price.toLocaleString()+' G · Lv'+s.lv+(s.max>1?' · '+(rank+1)+'/'+s.max+'단계':''));b.style.whiteSpace='pre-line';
   b.disabled=s.price===null||rank>=s.max||P.gold<s.price||P.lv<s.lv;if(P.lv<s.lv&&rank<s.max)b.style.opacity='.55';b.addEventListener('click',()=>sageLearn(id));const card=document.createElement('div');card.style.cssText='display:flex;flex-direction:column;gap:5px;';card.append(b);
   const trial=document.createElement('button');trial.type='button';trial.textContent='수련장에서 시험';trial.style.cssText='padding:8px;background:#655332;color:#fff4d8;border:1px solid #c9b16c;border-radius:6px;font-size:14px;font-family:inherit;';trial.addEventListener('click',()=>sageTrial(id));if(s.max===3){trial.textContent='3단계 시험';for(const rank of [1,2]){const t=trial.cloneNode(true);t.textContent=rank+'단계 시험';t.addEventListener('click',()=>sageTrial(id,rank));card.append(t);}}card.append(trial);shop.append(card);
  }
 }
}
function sageCloseShop(){const el=$('sageShop');if(el){el.hidden=true;el.style.display='none';}}
window.SAGE={skills:SAGE_SKILLS,clear:sageClear,bonus:sageBonus,learn:sageLearn,open:sageOpenShop,trial:sageTrial,state:()=>({acts:sageActs.length,buffs:JSON.parse(JSON.stringify(sageBuffs))}),talk(){sageCloseShop();$('dlgMainRow').hidden=false;$('dlgLine').textContent=sageLines[sageLineIndex++%sageLines.length];}};

$('dlgTalk').addEventListener('click',e=>{if(talking&&talking.shop==='sage'){e.stopImmediatePropagation();SAGE.talk();}},true);
