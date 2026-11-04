'use strict';
// 가이아(케인 2026-11-04): 대화창의 큰 초상을 터치하면 만진 부위가 출렁인다.
// 케인이 준 참고 파일(GAIA Touch Touch · rosegold lounge)의 방식을 그대로 따른다:
//   WebGL 조각 셰이더로 그림 전체를 휘게 한다 — 부위마다 가우시안 패치(p.y -= 파동×패치, p.x 로 부풀어 오르는 효과, 몸 전체 살짝 옆 흔들림),
//   파동 = sin(t×진동수)×exp(−t×감쇠)×세기×진폭, 부위는 좌우 두 쪽을 따로 출렁이게 한다.
//   터치하면 그림 전체가 살짝 흔들리고(jerk) 효과음·진동이 따라온다. (♥✦ 반짝임·글자·안내 원은 케인이 "반짝임은 아니다"라 해서 뺐다 — 참고 파일에서 가져올 것은 출렁임 물리뿐)
// 부위 좌표는 초상 그림 안의 비율(0~1). cx,cy 중심, rx,ry 패치 반지름, amp 진폭(그림 높이 대비), w 진동수(rad/s), dec 감쇠(1/s),
//   word 좌우 짝·소리 높이 구분용 이름(화면에 글자로는 나오지 않음), vib 진동(ms), sway=1 이면 위아래가 아니라 좌우(머리카락) 흔들림, breath=1 이면 숨 쉴 때 아주 약하게 같이 움직임.
// 초상 그림이 바뀌면(자르기·페더 값) 이 좌표도 다시 잡아야 한다 → GAIA_JIGGLE.debug(true) 로 부위 상자를 그림 위에 그려 확인한다.
const JG_MAX=6;
const JG_BUST={w:26,dec:5.2,word:'톡!',vib:70,breath:1};
const JG_HIP={w:22,dec:4.6,word:'찰싹!',vib:110};
const JG_HAIR={w:10,dec:2.4,sway:1,vib:0,amp:.012};
const JG_REGIONS={
  receptionist:[
    {n:'가슴 왼쪽',cx:.34,cy:.405,rx:.22,ry:.105,amp:.027,...JG_BUST},
    {n:'가슴 오른쪽',cx:.66,cy:.405,rx:.22,ry:.105,amp:.027,...JG_BUST},
    {n:'엉덩이 왼쪽',cx:.36,cy:.745,rx:.22,ry:.09,amp:.023,...JG_HIP},
    {n:'엉덩이 오른쪽',cx:.64,cy:.745,rx:.22,ry:.09,amp:.023,...JG_HIP},
    {n:'머리카락 왼쪽',cx:.07,cy:.64,rx:.09,ry:.22,...JG_HAIR},
    {n:'머리카락 오른쪽',cx:.93,cy:.64,rx:.09,ry:.22,...JG_HAIR}
  ],
  agatha:[
    {n:'가슴',cx:.77,cy:.44,rx:.14,ry:.08,amp:.024,...JG_BUST},
    {n:'엉덩이',cx:.66,cy:.65,rx:.18,ry:.08,amp:.02,...JG_HIP},
    {n:'머리카락',cx:.45,cy:.5,rx:.11,ry:.25,...JG_HAIR}
  ],
  sylvia:[
    {n:'가슴',cx:.55,cy:.47,rx:.17,ry:.08,amp:.024,...JG_BUST},
    {n:'엉덩이',cx:.52,cy:.71,rx:.2,ry:.085,amp:.02,...JG_HIP},
    {n:'머리카락',cx:.26,cy:.55,rx:.14,ry:.28,...JG_HAIR}
  ]
};
let jg=null,jgDebug=false,jgGl=null;   // jgGl: 한 번 만든 WebGL 자원(캔버스는 하나를 계속 쓴다)

function jgInitGl(cv){
  if(jgGl&&jgGl.cv===cv)return jgGl;
  let gl=null;
  try{gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false});}catch(e){}
  if(!gl)return null;
  try{
    const mk=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vs=mk(gl.VERTEX_SHADER,'attribute vec2 a_pos;varying vec2 v_pos;void main(){v_pos=a_pos;gl_Position=vec4(2.0*a_pos.x-1.0,1.0-2.0*a_pos.y,0.0,1.0);}');
    const fs=mk(gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec2 v_pos;uniform sampler2D u_art;'+
      'uniform vec4 u_reg['+JG_MAX+'];uniform vec2 u_wv['+JG_MAX+'];'+
      'void main(){vec2 p=v_pos;float sw=0.0;'+
      'for(int i=0;i<'+JG_MAX+';i++){'+
        'vec2 d=(v_pos-u_reg[i].xy)/u_reg[i].zw;float g=exp(-2.4*dot(d,d));'+
        'p.y-=u_wv[i].x*g;'+                                             // 위아래 출렁임
        'p.x-=u_wv[i].y*g+0.20*u_wv[i].x*g*(v_pos.x-u_reg[i].x);'+      // 좌우 흔들림 + 부풀어 오르는 효과(참고 파일과 같은 계수)
        'sw+=u_wv[i].x+u_wv[i].y;}'+
      'p.x+=sw*0.07;'+                                                  // 몸 전체가 살짝 옆으로
      'gl_FragColor=texture2D(u_art,p);}');
    const pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error('link');
    gl.useProgram(pr);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(pr,'a_pos');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(pr,'u_art'),0);
    jgGl={cv,gl,reg:gl.getUniformLocation(pr,'u_reg'),wv:gl.getUniformLocation(pr,'u_wv')};
    return jgGl;
  }catch(e){return null;}
}

function jgSyncPortrait(){
  const dlg=$('dlg'),img=$('dlgImg');if(!dlg||!img)return;
  const on=dlg.classList.contains('on'),src=img.getAttribute('src')||'';
  let key=null;
  if(on&&src&&A.gaiaDlg){for(const k of Object.keys(JG_REGIONS)){if(A.gaiaDlg[k]===src){key=k;break;}}}
  if(!key){jgStop();return;}
  if(jg&&jg.key===key&&jg.src===src){if(!jg.raf&&jg.ready)jgStart();return;}
  jgStop();
  const cv=document.getElementById('dlgFx')||(()=>{const c=document.createElement('canvas');c.id='dlgFx';img.after(c);return c;})();
  const G=jgInitGl(cv);if(!G)return;   // WebGL 이 없으면 그냥 정지 그림(효과 없음)
  const im=new Image();
  const st={key,src,cv,G,im,ready:false,regs:JG_REGIONS[key].map(r=>({...r,hits:[]})),raf:0,last:0,down:false,lastDragAt:0,lastSnd:0};
  jg=st;
  im.onload=()=>{
    if(jg!==st)return;
    const gl=G.gl;
    cv.width=Math.min(1024,im.naturalWidth*2);cv.height=Math.round(cv.width*im.naturalHeight/im.naturalWidth);
    cv.style.aspectRatio=im.naturalWidth+'/'+im.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D,gl.getParameter(gl.TEXTURE_BINDING_2D));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
    st.ready=true;if(!dlg.classList.contains('jg'))dlg.classList.add('jg');
    jgStart();
  };
  im.src=src;
  if(!cv._jgBound){
    cv._jgBound=true;
    cv.addEventListener('pointerdown',e=>{if(!jg||!jg.ready)return;jg.down=true;jgTouch(e,true);try{cv.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
    cv.addEventListener('pointermove',e=>{if(!jg||!jg.down)return;jgTouch(e,false);e.preventDefault();});
    const up=()=>{if(jg)jg.down=false;};
    cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  }
}
function jgTouch(e,tap){
  const st=jg,r=st.cv.getBoundingClientRect();
  const u=(e.clientX-r.left)/r.width,v=(e.clientY-r.top)/r.height;
  let best=null,bd=1.6;
  for(const reg of st.regs){const nx=(u-reg.cx)/reg.rx,ny=(v-reg.cy)/reg.ry,d=nx*nx+ny*ny;if(d<bd){bd=d;best=reg;}}
  const now=performance.now();
  if(!tap){if(!best||now-st.lastDragAt<130)return;st.lastDragAt=now;}
  if(!best){if(tap)jgJerk();return;}
  best.hits.push({t0:now,pw:tap?1.16:.85});
  if(best.hits.length>4)best.hits.shift();
  // 옆 쪽(가슴·엉덩이 좌우)도 살짝 따라 움직인다
  for(const o of st.regs){if(o!==best&&o.word&&o.word===best.word)o.hits.push({t0:now+40,pw:(tap?1.16:.85)*.45});}
  jgJerk();jgFx(best,tap);
}
function jgJerk(){const c=jg&&jg.cv;if(!c)return;c.classList.remove('jerk');void c.offsetWidth;c.classList.add('jerk');}
function jgFx(reg,tap){
  const now=performance.now();
  if(tap||now-jg.lastSnd>260){
    jg.lastSnd=now;
    try{
      const ac=window.__ARPG_AUDIO_CTX,vol=(typeof AUDIO_SETTINGS!=='undefined'?AUDIO_SETTINGS.get().sfx:1);
      if(ac&&ac.state==='running'&&vol>0&&!document.hidden){
        const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime,hip=reg.word==='찰싹!';
        o.type='triangle';o.frequency.setValueAtTime(hip?340:460,t);o.frequency.exponentialRampToValueAtTime(hip?150:170,t+.13);
        g.gain.setValueAtTime(.15*vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.17);
        o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.18);
      }
    }catch(_){}
    if(reg.vib&&typeof HAP==='function')HAP([reg.vib],1);   // 케인: 진동은 길고 세게(약하면 느껴지지 않는다)
  }
}
function jgStart(){if(!jg||!jg.ready||jg.raf)return;jg.last=0;jg.raf=requestAnimationFrame(jgFrame);}
function jgStop(){
  if(jg){if(jg.raf)cancelAnimationFrame(jg.raf);jg.raf=0;jg=null;}
  const d=$('dlg');if(d&&d.classList.contains('jg'))d.classList.remove('jg');   // 없는 클래스를 지워도 변화 기록이 생겨 관찰자가 끝없이 돌므로 있을 때만 지운다
}
function jgFrame(ts){
  const st=jg;if(!st)return;
  st.raf=0;
  if(!$('dlg').classList.contains('on')||!st.ready){jgStop();return;}
  const gl=st.G.gl,now=performance.now(),T=ts/1000;
  const reg=new Float32Array(JG_MAX*4),wv=new Float32Array(JG_MAX*2);
  for(let i=0;i<JG_MAX;i++){reg[i*4]=.5;reg[i*4+1]=.5;reg[i*4+2]=1;reg[i*4+3]=1;}
  st.regs.forEach((r,i)=>{
    reg[i*4]=r.cx;reg[i*4+1]=r.cy;reg[i*4+2]=r.rx;reg[i*4+3]=r.ry;
    let w=0;
    r.hits=r.hits.filter(h=>(now-h.t0)/1000<4/r.dec);
    for(const h of r.hits){const t=(now-h.t0)/1000;if(t<0)continue;w+=Math.sin(t*r.w)*Math.exp(-t*r.dec)*h.pw*r.amp;}   // 참고 파일과 같은 감쇠 진동
    if(r.breath)w+=Math.sin(T*1.5)*.0035;   // 숨쉬기: 아주 약하게
    if(r.sway){wv[i*2+1]=w;}else{wv[i*2]=w;}
  });
  gl.viewport(0,0,st.cv.width,st.cv.height);
  gl.uniform4fv(st.G.reg,reg);gl.uniform2fv(st.G.wv,wv);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
  if(jgDebug){   // 부위 상자·번호는 화면 위 덮개로 그린다(WebGL 캔버스에는 2D로 못 그림)
    let ov=document.getElementById('gjDbg');
    if(!ov){ov=document.createElement('div');ov.id='gjDbg';document.body.appendChild(ov);}
    const r=st.cv.getBoundingClientRect();
    ov.innerHTML=st.regs.map((q,i)=>'<div style="position:fixed;z-index:99998;pointer-events:none;border:2px solid #ff0;color:#ff0;font:bold 14px sans-serif;text-shadow:0 0 3px #000;left:'+(r.left+(q.cx-q.rx*.6)*r.width)+'px;top:'+(r.top+(q.cy-q.ry*.6)*r.height)+'px;width:'+(q.rx*1.2*r.width)+'px;height:'+(q.ry*1.2*r.height)+'px">'+(i+1)+'</div>').join('');
  }else{const ov=document.getElementById('gjDbg');if(ov)ov.remove();}
  st.raf=requestAnimationFrame(jgFrame);
}
(function(){
  const dlg=$('dlg'),img=$('dlgImg');if(!dlg||!img)return;
  const mo=new MutationObserver(jgSyncPortrait);
  mo.observe(dlg,{attributes:true,attributeFilter:['class']});
  mo.observe(img,{attributes:true,attributeFilter:['src']});
})();
window.GAIA_JIGGLE={debug:v=>{jgDebug=!!v;},
  poke:(u,v)=>{if(!jg||!jg.ready)return;const r=jg.cv.getBoundingClientRect();jgTouch({clientX:r.left+u*r.width,clientY:r.top+v*r.height},true);},
  state:()=>jg?{key:jg.key,ready:jg.ready,regs:jg.regs.map(r=>({n:r.n,hits:r.hits.length}))}:null,regions:JG_REGIONS};
