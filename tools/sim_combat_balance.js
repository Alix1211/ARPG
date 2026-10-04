// 실제 생성·파생·평타·시전 함수를 실행하는 재현용 수치 시뮬레이션.
// 이동/회피/넉백/상태이상은 제외: 명중한 공격만 비교하고 피격은 밀착 상한으로 표시.
const fs=require('fs'),vm=require('vm');
const root=require('path').resolve(__dirname,'..');
const read=p=>process.env.BALANCE_REV?require('child_process').execFileSync('git',['show',process.env.BALANCE_REV+':'+p],{cwd:root,encoding:'utf8'}):fs.readFileSync(root+'/'+p,'utf8');
const ui=read('src/town/ui.js'),town=read('src/town/town.js'),match=read('src/town/tier_match.js');
const catalog=JSON.parse(read('src/town/data/tier_match.json'));
function fn(s,n){const i=s.indexOf('function '+n+'(');if(i<0)throw Error(n);let j=s.indexOf('{',i),depth=1;while(depth&&++j<s.length){if(s[j]==='{')depth++;if(s[j]==='}')depth--;}return s.slice(i,j+1);}
function decl(s,n){let i=s.indexOf('const '+n+' ');if(i<0)i=s.indexOf('const '+n+'=');return s.slice(i,s.indexOf(';',i)+1);}
const P={stats:{},mastery:{},passives:{},lifeSkills:{},skillLv:{},mp:1e9,x:0,y:0,dir:'side',flip:false};
const ctx={P,G:{P,NUM:100},NUM:100,TIER_MATCH:catalog,seq:1,eq:{},cur:'w1',window:{},console,Math,PI:Math.PI,pops:[],
  finalizeName:()=>{},gearBase:s=>catalog.gear.find(b=>b.id===s.baseId),syncBars:()=>{},sfx:[],shots:[],CD:{},SK2:{},GCD:.9,
  faceVec:()=>[1,0],combatTargets:()=>[{x:30,y:0}],hitTarget:(t,d,stagger,damage)=>ctx.skillDamage=damage,
  playerControlLocked:()=>false};
vm.createContext(ctx);
vm.runInContext([decl(ui,'WMULT'),decl(ui,'GRADE_MUL'),decl(town,'WB'),decl(town,'SK'),fn(town,'masteryBonus'),fn(ui,'make'),fn(ui,'itemStats'),fn(ui,'totals'),fn(ui,'derived'),fn(match,'matchedMonsterStats'),fn(town,'basicDamage'),fn(town,'cast')].join('\n'),ctx);
ctx.G.masteryBonus=ctx.masteryBonus;ctx.combatNow=ctx.derived;
const weights=['sword','spear','gauntlet','bow','staff'];
function setup(lv,wt){
  P.lv=lv;const points=5*(lv-1)+5*Math.floor(lv/10),caster=wt==='staff';
  P.stats={str:5,int:5,vit:5+Math.floor(points*.3),mag:6+Math.floor(points*.1),dex:8+Math.floor(points*.1),luck:3};
  P.stats[caster?'int':'str']+=Math.floor(points*.5);P.mastery[wt]={lv:Math.floor((lv-1)/2)};
  ctx.eq={};
  for(const kind of ['weapon','head','body','hands','feet','neck','ring']){
    const tier=Math.floor((lv-1)/10)+1;
    const eligible=catalog.gear.filter(b=>b.kind===kind&&b.tier===tier&&b.requiredLevel<=lv&&(kind!=='weapon'||b.wt===wt));
    eligible.sort((a,b)=>b.powerGrade-a.powerGrade||a.id.localeCompare(b.id));
    if(!eligible.length){if(kind==='weapon')throw Error(`장비 누락 ${lv}/${kind}/${wt}`);continue;}
    const it=ctx.make({baseId:eligible[0].id,rar:0});ctx.eq[kind==='weapon'?'w1':kind]=it;
  }
  ctx.WPN={wt};return ctx.derived();
}
function skill(wt,cm){
  // 전 무기 공통 비교: 근접은 강베기(검100%, 타무기60%), 원거리는 불덩이.
  const id=['sword','spear','gauntlet'].includes(wt)?'sword1':'fire1';
  P.skillLv[id]=1;P.mp=1e9;ctx.CD[id]=0;ctx.shots.length=0;ctx.skillDamage=0;
  ctx.cast(id,{dmg:id==='sword1'&&wt!=='sword'?.6:1,mp:1});
  const damage=ctx.skillDamage||(ctx.shots[0]&&ctx.shots[0].dmg)||0;
  return {id,dps:damage*(1+cm.crit/100*(cm.critDmg/100-1))/vm.runInContext('SK',ctx)[id].cd};
}
let seed=20261004;function rng(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function duel(cm,wt,m){
  const w=vm.runInContext('WB',ctx)[wt],dur=w.dur/(1+cm.as/100),interval=dur*.75,base=ctx.basicDamage();
  let totalT=0,totalD=0;const count=1000;
  for(let i=0;i<count;i++){
    let hp=m.hp*100,time=dur*.45,nextMob=.45,damage=0;
    while(hp>0){
      while(nextMob<time){damage+=Math.max(1,Math.round(m.dmg*100*(1-cm.damageReduce/100)));nextMob+=.9+rng()*.35;}
      hp-=Math.round(base*(rng()<cm.crit/100?cm.critDmg/100:1));if(hp>0)time+=interval;
    }
    totalT+=time;totalD+=damage;
  }
  return {seconds:totalT/count,incoming:totalD/count,hpLoss:totalD/count/cm.maxHp*100};
}
if(process.env.BALANCE_STAFF_MULT)vm.runInContext('WMULT.staff='+Number(process.env.BALANCE_STAFF_MULT),ctx);
const rows=[];
for(const lv of Array.from({length:70},(_,i)=>i+1)){
  const tier=Math.floor((lv-1)/10)+1;
  const ids=catalog.fieldPools[tier-1].filter(id=>catalog.monsters[id].rank==='normal');
  for(const wt of weights){const cm=setup(lv,wt),w=vm.runInContext('WB',ctx)[wt];
    const results=ids.map(id=>duel(cm,wt,ctx.matchedMonsterStats(id,lv)));
    const average=k=>results.reduce((s,x)=>s+x[k],0)/results.length;
    rows.push({lv,tier,wt,grade:ctx.eq.w1.g,maxHp:cm.maxHp,normalDps:ctx.basicDamage()*(1+cm.crit/100*(cm.critDmg/100-1))/(w.dur*.75/(1+cm.as/100)),skill:skill(wt,cm),seconds:average('seconds'),incoming:average('incoming'),hpLoss:average('hpLoss')});
  }
}
const magicFloor=[];
for(const grade of Array.from({length:10},(_,i)=>i+1))for(const mastery of [0,25,50]){
  P.stats={str:20,int:20,vit:5,mag:6,dex:8,luck:3};
  const staff=catalog.gear.find(b=>b.wt==='staff'&&b.powerGrade===grade);if(!staff)continue;
  P.mastery.staff={lv:mastery};ctx.eq={w1:ctx.make({baseId:staff.id,rar:0})};const ref=ctx.derived().magic;
  for(const wt of weights.filter(w=>w!=='staff')){
    const b=catalog.gear.find(b=>b.wt===wt&&b.powerGrade===grade);if(!b)continue;
    P.mastery[wt]={lv:mastery};ctx.eq={w1:ctx.make({baseId:b.id,rar:0})};
    const normal=ctx.derived().magic;ctx.eq.w1.st.matk=ref*2;const withFlat=ctx.derived().magic;
    magicFloor.push({wt,grade,mastery,ratio:normal/ref,flatPreserved:withFlat>=ref*2});
  }
}
const skillRatios=Array.from({length:70},(_,i)=>i+1).map(lv=>{
  const r=rows.filter(r=>r.lv===lv),melee=r.filter(r=>['sword','spear','gauntlet'].includes(r.wt));
  return r.find(r=>r.wt==='staff').skill.dps/(melee.reduce((s,r)=>s+r.skill.dps,0)/3);
});
const boundaries=[];
for(let tier=1;tier<7;tier++){
 const first=t=>Object.entries(catalog.monsters).find(([,d])=>d.tier===t&&d.rank==='normal');
 const [oldId,oldDef]=first(tier),[newId,newDef]=first(tier+1);
 const old=ctx.matchedMonsterStats(oldId,tier*10),next=ctx.matchedMonsterStats(newId,tier*10+1);
 boundaries.push({tier,hpRatio:(next.hp/newDef.speciesHP)/(old.hp/oldDef.speciesHP),attackRatio:(next.dmg/newDef.speciesAttack)/(old.dmg/oldDef.speciesAttack)});
}
const output={boundaries,magicFloor,staffAverageRatio:skillRatios.reduce((s,r)=>s+r,0)/skillRatios.length,staffRatioRange:[Math.min(...skillRatios),Math.max(...skillRatios)],method:'일반종별1000회, 실제함수/명중100%/75% 재공격/기대DPS/밀착피해상한/1랭크/일반장비/숙련floor((lv-1)/2)/힘 또는 지능50%·체력30%·민첩10%·마력10%',rows};
const dest=process.argv[2];if(dest)fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
console.log(rows.filter(x=>x.wt==='sword'&&[1,5,10,11,15,20,21,30,31,40,41,50,51,60,61,70].includes(x.lv)).map(x=>`${x.lv}: ${x.seconds.toFixed(2)}s / ${x.hpLoss.toFixed(1)}%`).join('\n'));
