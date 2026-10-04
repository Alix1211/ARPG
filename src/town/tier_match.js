// 승인표의 단일 원장. 외형 번호는 강함/티어가 아니다.
const TIER_MATCH=A.tierCatalog;
const GEAR_BASE=Object.fromEntries(TIER_MATCH.gear.map(x=>[x.id,x]));
function gearBase(spec){
  if(spec.baseId){const b=GEAR_BASE[spec.baseId];if(!b)throw Error('알 수 없는 장비 '+spec.baseId);return b;}
  if(spec.g && !spec.roll){
    const key=spec.kind==='weapon'?`${spec.wt}_${String(spec.g).padStart(2,'0')}`:`${spec.style||'knight'}_${spec.kind}_${String(spec.g).padStart(2,'0')}`;
    if(GEAR_BASE[key])return GEAR_BASE[key];
  }
  const tier=Math.max(1,Math.min(7,spec.tier||1));
  let pool=TIER_MATCH.gear.filter(b=>b.kind===spec.kind&&b.tier===tier&&(!spec.wt||b.wt===spec.wt)&&(!spec.style||b.style===spec.style));
  const preferred=pool.filter(b=>b.primary);if(preferred.length)pool=preferred;
  if(!pool.length)throw Error(`승인표에 없는 장비 ${spec.kind}/${spec.wt||spec.style||''}/T${tier}`);
  return pool[Math.floor(Math.random()*pool.length)];
}
function gearFullName(base,aff=[]){
  const pf=aff.find(a=>a.k==='P'),sf=aff.find(a=>a.k==='S');
  return (sf?sf.nm+' ':'')+(pf?pf.nm+' ':'')+base.name;
}
function matchedMonsterStats(id,playerLv=1,floor=0,bossRole=''){
  const d=TIER_MATCH.monsters[id];if(!d)throw Error('몬스터 매핑 누락: '+id);
  const t=d.tier,within=Math.max(0,Math.min(9,playerLv-((t-1)*10+1))),part=floor?(floor-1)%3:0;
  const role=d.rank==='boss'?(bossRole||'pack'):d.rank,r=TIER_MATCH.ranks[role],s=TIER_MATCH.scales;
  // 초반 능력치 투자 폭은 크고 후반은 작다. 티어별 기울기를 명시해 저레벨 장비 기준에 맞춘다.
  return {tier:t,mobLv:Math.max(d.minLevel,(t-1)*10+1+within),rank:d.rank,bossRole:d.rank==='boss'?role:'',
    hp:Math.round(s.baseHP*s.hp[t-1]*d.speciesHP*r.hp*(1+within*s.withinHP[t-1]/9)*(1+part*.08)),
    dmg:Math.round(s.baseAttack*s.attack[t-1]*d.speciesAttack*r.attack*(1+within*s.withinAttack/9)*(1+part*.05)),
    exp:Math.round(2*s.exp[t-1]*r.exp),coinMul:s.coin[t-1]*r.coin,dropChance:r.drop};
}
window.TIER_MATCH_API={catalog:TIER_MATCH,base:gearBase,fullName:gearFullName,monsterStats:matchedMonsterStats};
