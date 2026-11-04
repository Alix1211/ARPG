'use strict';
// 가이아(케인 2026-11-04): 대화창의 큰 초상을 터치하면 만진 부위가 스프링처럼 출렁이다 가라앉는다. 숨 쉴 때는 가슴이 아주 약하게 같이 움직인다.
// 한 장짜리 그림을 격자 삼각형으로 나눠 부위 주변만 변형한다(부위 밖은 그대로 → 이음매 없음). 초상이 아닌 곳은 건드리지 않는다.
// 부위 좌표는 초상 그림 안의 비율(0~1). amp 는 그림 높이 대비 최대 출렁임, breath 는 숨쉬기 반영 정도.
// 초상 그림이 바뀌면(자르기·페더 값) 이 좌표도 다시 잡아야 한다 → GAIA_JIGGLE.debug(true) 로 부위 상자를 화면에 그려 확인한다.
const JG_REGIONS={
  receptionist:[
    {n:'가슴',cx:.50,cy:.405,rx:.36,ry:.105,amp:.026,breath:1,hz:2.9},
    {n:'엉덩이·허리',cx:.50,cy:.735,rx:.38,ry:.095,amp:.022,breath:0,hz:2.6},
    {n:'머리카락 왼쪽',cx:.07,cy:.66,rx:.07,ry:.2,amp:.016,breath:0,hz:1.7,sway:1},
    {n:'머리카락 오른쪽',cx:.93,cy:.66,rx:.07,ry:.2,amp:.016,breath:0,hz:1.7,sway:1}
  ],
  agatha:[
    {n:'가슴',cx:.77,cy:.44,rx:.12,ry:.07,amp:.02,breath:1,hz:3.0},
    {n:'엉덩이',cx:.66,cy:.65,rx:.17,ry:.07,amp:.016,breath:0,hz:2.7},
    {n:'머리카락',cx:.45,cy:.5,rx:.1,ry:.25,amp:.014,breath:0,hz:1.6,sway:1}
  ],
  sylvia:[
    {n:'가슴',cx:.55,cy:.47,rx:.15,ry:.07,amp:.02,breath:1,hz:3.0},
    {n:'엉덩이',cx:.52,cy:.70,rx:.2,ry:.07,amp:.016,breath:0,hz:2.7},
    {n:'머리카락',cx:.26,cy:.55,rx:.13,ry:.28,amp:.016,breath:0,hz:1.5,sway:1}
  ]
};
let jg=null,jgDebug=false;
function jgSyncPortrait(){
  const dlg=$('dlg'),img=$('dlgImg');if(!dlg||!img)return;
  const on=dlg.classList.contains('on'),src=img.getAttribute('src')||'';
  let key=null;
  if(on&&src&&A.gaiaDlg){for(const k of Object.keys(JG_REGIONS)){if(A.gaiaDlg[k]===src){key=k;break;}}}
  if(!key){jgStop();return;}
  if(jg&&jg.key===key&&jg.src===src){if(!jg.raf)jgStart();return;}
  jgStop();
  const cv=document.getElementById('dlgFx')||(()=>{const c=document.createElement('canvas');c.id='dlgFx';img.after(c);return c;})();
  const im=new Image();
  const st={key,src,cv,im,ready:false,regs:JG_REGIONS[key].map(r=>({...r,x:0,y:0,vx:0,vy:0})),raf:0,last:0,down:false,lx:0,ly:0,t:0};
  jg=st;
  im.onload=()=>{
    if(jg!==st)return;
    cv.width=im.naturalWidth;cv.height=im.naturalHeight;cv.style.aspectRatio=im.naturalWidth+'/'+im.naturalHeight;
    st.ready=true;if(!dlg.classList.contains('jg'))dlg.classList.add('jg');jgStart();
  };
  im.src=src;
  if(!cv._jgBound){
    cv._jgBound=true;
    cv.addEventListener('pointerdown',e=>{if(!jg)return;jg.down=true;const p=jgPos(e);jg.lx=p[0];jg.ly=p[1];jgPoke(p[0],p[1],0,0,true);try{cv.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
    cv.addEventListener('pointermove',e=>{if(!jg||!jg.down)return;const p=jgPos(e);jgPoke(p[0],p[1],p[0]-jg.lx,p[1]-jg.ly,false);jg.lx=p[0];jg.ly=p[1];e.preventDefault();});
    const up=()=>{if(jg)jg.down=false;};
    cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',up);
  }
}
function jgPos(e){const r=jg.cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];}
function jgPoke(u,v,du,dv,tap){
  for(const r of jg.regs){
    const nx=(u-r.cx)/r.rx,ny=(v-r.cy)/r.ry,d=nx*nx+ny*ny;
    if(d>1.25)continue;
    const w=Math.max(0,1-d/1.25);
    if(tap){r.vy+=w*r.amp*(r.sway?0:14);r.vx+=w*r.amp*(r.sway?18:(Math.random()<.5?-5:5));}
    else{r.vy+=Math.max(-.4,Math.min(.4,dv*4))*w*r.amp*10;r.vx+=Math.max(-.4,Math.min(.4,du*4))*w*r.amp*10;}
    const lim=r.amp*1.6;r.vy=Math.max(-lim*20,Math.min(lim*20,r.vy));r.vx=Math.max(-lim*20,Math.min(lim*20,r.vx));
  }
}
function jgStart(){if(!jg||!jg.ready||jg.raf)return;jg.last=0;jg.raf=requestAnimationFrame(jgFrame);}
function jgStop(){
  if(jg){if(jg.raf)cancelAnimationFrame(jg.raf);jg.raf=0;jg=null;}
  const d=$('dlg');if(d&&d.classList.contains('jg'))d.classList.remove('jg');   // 없는 클래스를 지워도 변화 기록이 생겨 관찰자가 끝없이 돌므로 있을 때만 지운다
}
function jgTri(ctx,im,s,d){
  // 원본 삼각형 s=[x0,y0,x1,y1,x2,y2] 을 d 로 옮겨 그린다(이음매가 안 보이게 목표 삼각형을 중심에서 살짝 키운다)
  const cx=(d[0]+d[2]+d[4])/3,cy=(d[1]+d[3]+d[5])/3,e=.9,g=[];
  for(let i=0;i<6;i+=2){const dx=d[i]-cx,dy=d[i+1]-cy,l=Math.hypot(dx,dy)||1;g.push(d[i]+dx/l*e,d[i+1]+dy/l*e);}
  const den=s[0]*(s[3]-s[5])+s[2]*(s[5]-s[1])+s[4]*(s[1]-s[3]);if(Math.abs(den)<1e-6)return;
  const a=(d[0]*(s[3]-s[5])+d[2]*(s[5]-s[1])+d[4]*(s[1]-s[3]))/den;
  const b=(d[1]*(s[3]-s[5])+d[3]*(s[5]-s[1])+d[5]*(s[1]-s[3]))/den;
  const c=(s[0]*(d[2]-d[4])+s[2]*(d[4]-d[0])+s[4]*(d[0]-d[2]))/den;
  const dd=(s[0]*(d[3]-d[5])+s[2]*(d[5]-d[1])+s[4]*(d[1]-d[3]))/den;
  const ee=(s[0]*(s[2]*d[4]-s[4]*d[2])+s[2]*(s[4]*d[0]-s[0]*d[4])+s[4]*(s[0]*d[2]-s[2]*d[0]))/den;
  const ff=(s[0]*(s[2]*d[5]-s[4]*d[3])+s[2]*(s[4]*d[1]-s[0]*d[5])+s[4]*(s[0]*d[3]-s[2]*d[1]))/den;
  ctx.save();ctx.beginPath();ctx.moveTo(g[0],g[1]);ctx.lineTo(g[2],g[3]);ctx.lineTo(g[4],g[5]);ctx.closePath();ctx.clip();
  ctx.setTransform(a,b,c,dd,ee,ff);ctx.drawImage(im,0,0);ctx.restore();
}
function jgFrame(ts){
  const st=jg;if(!st){return;}
  st.raf=0;
  if(!$('dlg').classList.contains('on')||!st.ready){jgStop();return;}
  const dt=st.last?Math.min(.05,(ts-st.last)/1000):.016;
  if(st.last&&ts-st.last<30){st.raf=requestAnimationFrame(jgFrame);return;}   // 약 30fps
  st.last=ts;st.t+=dt;
  const W=st.cv.width,H=st.cv.height,ctx=st.cv.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(st.im,0,0);
  for(const r of st.regs){
    const w0=2*Math.PI*r.hz,k=w0*w0,c=2*.11*w0;
    for(const ax of ['x','y']){
      const pos=r[ax],vel=r['v'+ax];
      const acc=-k*pos-c*vel,nv=vel+acc*dt;r['v'+ax]=nv;r[ax]=pos+nv*dt;
    }
    const br=r.breath?Math.sin(st.t*2*Math.PI*.24)*.0045:0;      // 숨쉬기: 아주 약하게
    const oy=(r.y+br)*H,ox=r.x*W;
    if(Math.abs(oy)<.04&&Math.abs(ox)<.04)continue;
    // 부위 상자를 비운 뒤 변형한 격자를 그린다
    const bx0=Math.max(0,Math.floor((r.cx-r.rx)*W)),bx1=Math.min(W,Math.ceil((r.cx+r.rx)*W));
    const by0=Math.max(0,Math.floor((r.cy-r.ry)*H)),by1=Math.min(H,Math.ceil((r.cy+r.ry)*H));
    ctx.clearRect(bx0,by0,bx1-bx0,by1-by0);
    const cell=10,nx=Math.max(2,Math.round((bx1-bx0)/cell)),ny=Math.max(2,Math.round((by1-by0)/cell));
    const P=[];
    for(let j=0;j<=ny;j++){P.push([]);for(let i=0;i<=nx;i++){
      const sx=bx0+(bx1-bx0)*i/nx,sy=by0+(by1-by0)*j/ny;
      const u=(sx/W-r.cx)/r.rx,v=(sy/H-r.cy)/r.ry,d=u*u+v*v;
      let wgt=d>=1?0:(1-d)*(1-d);
      // 상자 가장자리는 그대로(변형 0) → 바깥 그림과 이어진다
      const ex=Math.min(1,(1-Math.abs(u))*4),ey=Math.min(1,(1-Math.abs(v))*4);wgt*=Math.max(0,Math.min(ex,ey));
      P[j].push([sx,sy,sx+ox*wgt,sy+oy*wgt*(r.sway?.35:1)]);
    }}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const a=P[j][i],b=P[j][i+1],c=P[j+1][i],d=P[j+1][i+1];
      jgTri(ctx,st.im,[a[0],a[1],b[0],b[1],c[0],c[1]],[a[2],a[3],b[2],b[3],c[2],c[3]]);
      jgTri(ctx,st.im,[b[0],b[1],d[0],d[1],c[0],c[1]],[b[2],b[3],d[2],d[3],c[2],c[3]]);
    }
  }
  if(jgDebug){
    ctx.save();ctx.lineWidth=2;ctx.font='bold 16px sans-serif';
    st.regs.forEach((r,i)=>{ctx.strokeStyle='#ff0';ctx.strokeRect((r.cx-r.rx)*W,(r.cy-r.ry)*H,r.rx*2*W,r.ry*2*H);ctx.fillStyle='#ff0';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(String(i+1),(r.cx-r.rx)*W+4,(r.cy-r.ry)*H+17);ctx.fillText(String(i+1),(r.cx-r.rx)*W+4,(r.cy-r.ry)*H+17);});
    ctx.restore();
  }
  st.raf=requestAnimationFrame(jgFrame);
}
(function(){
  const dlg=$('dlg'),img=$('dlgImg');if(!dlg||!img)return;
  const mo=new MutationObserver(jgSyncPortrait);
  mo.observe(dlg,{attributes:true,attributeFilter:['class']});
  mo.observe(img,{attributes:true,attributeFilter:['src']});
})();
window.GAIA_JIGGLE={debug:v=>{jgDebug=!!v;},poke:(u,v)=>{if(jg&&jg.ready)jgPoke(u,v,0,0,true);},state:()=>jg?{key:jg.key,ready:jg.ready,regs:jg.regs.map(r=>({n:r.n,x:r.x,y:r.y}))}:null,regions:JG_REGIONS};
