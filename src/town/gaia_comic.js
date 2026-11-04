'use strict';
// 가이아(케인 2026-11-04): GPT가 선물한 코믹 인물을 길드 홀과 마을에 세운다(걷지 않고 서거나 앉아 있는 장식 인물).
// 그림은 assets_private/gaia_comic 에서 gaia_comic_assets.py 가 A.b['comic_*'] / A.gaiaComic 으로 넣는다.
// 이름·대사는 케인이 정하기 전이라 말을 걸 수 없다(장식). 움직임은 town.js 그리기의 s.fx 로 인물마다 다르게 준다:
//   breath 숨쉬기 진폭, sway/swayHz 발끝 기준 좌우 흔들림(라디안/속도), nod/nodHz 위아래 까딱임(px/속도)
// 자리는 칸 단위(발 위치). i 는 A.gaiaComic.guild/town 의 번호.
const COMIC_GUILD=[
  {i:0,x:1.9,y:3.9,fx:{breath:.03,nod:1.6,nodHz:3.1}},                // 기사: 손가락질하며 꾸짖는 중
  {i:1,x:3.3,y:4.05,fx:{breath:.04,sway:.026,swayHz:1.6}},            // 팔을 든 채 꿇어앉은 아가씨: 버티느라 흔들
  {i:2,x:10.3,y:3.25,fx:{breath:.032}},                               // 학자 + 서가 밑 아가씨
  {i:3,x:3.4,y:5.75,fx:{breath:.03,nod:2.2,nodHz:3.7}},               // 드워프(호루라기) + 기는 아가씨: 탁자 뒤
  {i:4,x:9.0,y:5.55,fx:{breath:.03,sway:.01,swayHz:.9}},              // 엘프 서기
  {i:5,x:9.4,y:8.55,fx:{breath:.04,sway:.034,swayHz:2.1}}             // 짐을 든 아가씨: 휘청
];
const COMIC_TOWN=[
  {i:2,x:20.9,y:20.8,fx:{breath:.036,sway:.012,swayHz:1.0}},          // 분수 곁 금발 아가씨
  {i:1,x:31.9,y:19.9,fx:{breath:.04,sway:.016,swayHz:1.2}},           // 서 있는 흰 머리 아가씨
  {i:0,x:15.6,y:19.9,fx:{breath:.04,sway:.02,swayHz:1.4}}             // 기는 갈색 머리 아가씨
];
function comicOnWorld(id,spriteList,solidList){
  const meta=A.gaiaComic;if(!meta)return;
  const list=id==='guild'?COMIC_GUILD:id==='town'?COMIC_TOWN:null;if(!list)return;
  const arr=meta[id]||[];
  if(spriteList.some(s=>s.comic))return;   // 이미 세웠으면 다시 세우지 않는다
  for(const c of list){
    const m=arr[c.i];if(!m||!BI[m.k])continue;
    const x=c.x*TS,y=c.y*TS;
    const n={k:m.k,img:BI[m.k],x,y,w:m.w,h:m.h,title:'장식',name:'',comic:true,fx:c.fx,ph:Math.random()*7,key:y};
    spriteList.push(n);
    solidList.push({x0:x-m.w*.3,x1:x+m.w*.3,y0:y-12,y1:y-1});
  }
}
window.GAIA_COMIC={onWorld:comicOnWorld,count:()=>sprites.filter(s=>s.comic).length};
if(typeof MAP!=='undefined'&&(MAP==='town'||MAP==='guild'))comicOnWorld(MAP,sprites,solids);   // 모듈이 buildWorld('town') 뒤에 실려 처음 한 번은 여기서 세운다
