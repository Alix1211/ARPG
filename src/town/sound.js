// ======================= 소리와 진동 (Claude, 2026-10-03) =======================
// 파일 없이 웹 오디오로 합성한 효과음. 옛 오락실 삑삑 소리가 되지 않게: 잡음(바람·마찰)과 부드러운 사인파,
// 짧은 잔향을 섞는다. 나중에 진짜 효과음 파일이 오면 SFX.files[이름] 에 넣으면 그 파일이 대신 재생된다.
const AUDIO_SETTINGS = (() => {
  let saved={};
  try { saved=JSON.parse(localStorage.getItem('arpg_audio_settings')||'null')||{}; } catch(e){}
  let legacyOff=false;try{legacyOff=localStorage.getItem('arpg_sound')==='off';}catch(e){}
  const clamp=(v,f)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):f;
  const values={sfx:clamp(saved.sfx,legacyOff?0:1),bgm:clamp(saved.bgm,legacyOff?0:1),vibration:saved.vibration!==false};
  return {get:()=>({...values}),set(key,value){
    if(key==='vibration')values[key]=!!value;
    else if(key==='sfx'||key==='bgm')values[key]=clamp(Number(value),values[key]);else return;
    try{localStorage.setItem('arpg_audio_settings',JSON.stringify(values));}catch(e){}
    if(typeof SFX!=='undefined')SFX.syncVolume();
    if(typeof BGM!=='undefined')BGM.sync();
    if(key==='vibration'&&!values.vibration)try{navigator.vibrate&&navigator.vibrate(0);}catch(e){}
  }};
})();
const SFX = (() => {
  let ac = null, out = null, rev = null, last = {};
  const fileVoices = {};
  function init(){
    if (ac) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); out = ac.createGain(); out.gain.value = 0.55 * AUDIO_SETTINGS.get().sfx; out.connect(ac.destination);
    // 작은 방 잔향(합성 임펄스)
    rev = ac.createConvolver(); const len = ac.sampleRate * 0.6, buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++){ const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = buf; const rg = ac.createGain(); rg.gain.value = 0.18; rev.connect(rg); rg.connect(out);
  }
  addEventListener('pointerdown', () => { init(); if (ac && ac.state === 'suspended') ac.resume(); }, { capture: true });
  addEventListener('keydown', () => { init(); if (ac && ac.state === 'suspended') ac.resume(); }, { capture: true });
  const noiseBuf = () => { const n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; };
  let NB = null;
  function env(g, t, a, peak, d){ g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function dest(wet){ const g = ac.createGain(); g.connect(out); if (wet) g.connect(rev); return g; }
  // 잡음 한 번: 대역 필터로 바람·마찰·타격 소리
  function noise(t, dur, f0, f1, q, peak, wet, type){
    NB = NB || noiseBuf(); const s = ac.createBufferSource(); s.buffer = NB;
    const f = ac.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, 0.01, peak, dur); s.connect(f); f.connect(g); g.connect(dest(wet)); s.start(t); s.stop(t + dur + 0.05);
  }
  // 음 한 번: 부드러운 사인·삼각파
  function tone(t, dur, f0, f1, peak, wet, type, a){
    const o = ac.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, a || 0.008, peak, dur); o.connect(g); g.connect(dest(wet)); o.start(t); o.stop(t + dur + 0.05);
  }
  const vary = (v, k = 0.08) => v * (1 + (Math.random() * 2 - 1) * k);
  const S = {
    swing(t){ noise(t, 0.16, vary(900), vary(2600), 1.4, 0.32); },
    thrust(t){ noise(t, 0.12, vary(1500), vary(3200), 2.2, 0.28); },
    punch(t){ noise(t, 0.07, vary(700), 300, 1.2, 0.3); },
    bow(t){ tone(t, 0.09, vary(330), 150, 0.16, 0, 'triangle'); noise(t + 0.01, 0.14, 2600, 5200, 3, 0.18); },
    staff(t){ tone(t, 0.32, vary(520), vary(780), 0.11, 1); tone(t + 0.02, 0.3, vary(660), vary(990), 0.07, 1); },
    hit(t){ tone(t, 0.12, vary(150), 55, 0.42); noise(t, 0.06, 1800, 600, 0.8, 0.22); },
    crit(t){ S.hit(t); tone(t + 0.02, 0.25, 1320, 1180, 0.09, 1); tone(t + 0.02, 0.25, 1980, 1760, 0.05, 1); },
    kill(t){ noise(t, 0.35, 1400, 200, 0.7, 0.22, 1); tone(t, 0.25, 260, 90, 0.14); },
    hurt(t){ tone(t, 0.16, 110, 60, 0.5); noise(t, 0.1, 900, 300, 0.9, 0.28); },
    fire(t){
      noise(t,.32,220,1450,.6,.48,1,'lowpass');noise(t+.04,.22,900,3200,1.1,.3,1);
      tone(t,.24,105,48,.34,1,'sine');tone(t+.05,.18,260,95,.18,1,'triangle');
    },
    ice(t){   // 후두두둑: 얼음 알갱이 다섯 알
      for(let i=0;i<5;i++){const u=t+i*.04+Math.random()*.012;tone(u,.07,vary(2300),vary(1500),.07,1,'triangle');noise(u,.08,5200,8500,3.5,.12,1);}
      tone(t+.18,.2,vary(3300),vary(2600),.05,1,'sine');
    },
    heal(t){ [523,659,784,1046].forEach((f,i)=>tone(t+i*.055,.55,f,0,.085,1,'sine',.025)); },
    slash(t){ noise(t,.25,550,4300,1,.48,1);tone(t,.14,190,58,.34,1);noise(t+.08,.11,2800,5200,2.5,.18,1); },
    spin(t){ noise(t,.48,480,3000,.8,.42,1);noise(t+.1,.38,3200,700,.9,.3,1);tone(t,.24,135,62,.28,1); },
    rock(t){ noise(t,.16,420,120,.9,.38,0);tone(t,.12,105,55,.24,0,'triangle'); },
    charge(t){ noise(t,.28,180,980,.7,.32,1,'lowpass');tone(t,.22,90,52,.22,0); },
    dark(t){ noise(t,.2,500,4600,1,.36,1);tone(t,.2,vary(130),vary(70),.2,1,'sawtooth');tone(t+.16,.4,vary(1750),vary(1650),.1,1,'triangle');tone(t+.16,.3,vary(2650),vary(2500),.05,1,'sine'); },   // 쉬익, 챙
    lightning(t){ noise(t,.12,6000,1800,4,.2,1);for(let i=0;i<6;i++)tone(t+i*.06,.09,vary(i%2?430:310),vary(i%2?310:430),.1,1,'sawtooth');tone(t,.4,980,210,.08,1,'sawtooth'); },   // 지잉징잉
    slime(t){ noise(t,.22,520,170,.7,.3,0,'lowpass');tone(t,.16,180,95,.13,0,'sine'); },
    coin(t){ tone(t, 0.18, 1568, 0, 0.12, 1, 'sine', 0.002); tone(t + 0.07, 0.3, 2093, 0, 0.11, 1, 'sine', 0.002); },
    buy(t){ S.coin(t); tone(t + 0.12, 0.3, 1046, 0, 0.06, 1); },
    item(t){ tone(t, 0.22, 784, 0, 0.12, 1, 'triangle', 0.002); tone(t + 0.06, 0.3, 1175, 0, 0.09, 1, 'triangle', 0.002); },
    potion(t){ for (let i = 0; i < 3; i++) tone(t + i * 0.09, 0.08, vary(240, 0.15), vary(420, 0.15), 0.2); tone(t + 0.3, 0.4, 880, 1320, 0.06, 1); },
    chest(t){ noise(t, 0.3, 300, 180, 3, 0.25, 0, 'bandpass'); [784, 988, 1175, 1568].forEach((f, i) => tone(t + 0.25 + i * 0.07, 0.4, f, 0, 0.08, 1, 'sine', 0.003)); },
    mimic(t){ const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(60, t + 0.6);
      f.type = 'lowpass'; f.frequency.value = 420; env(g, t, 0.05, 0.22, 0.6); o.connect(f); f.connect(g); g.connect(dest(1)); o.start(t); o.stop(t + 0.7); noise(t, 0.3, 500, 200, 1, 0.2); },
    travel(t){ noise(t, 0.5, 400, 1600, 0.8, 0.18, 1); },
    stairs(t){ for (let i = 0; i < 4; i++) noise(t + i * 0.13, 0.06, 500 - i * 60, 200, 1, 0.22); },
    tick(t){ tone(t, 0.04, 1200, 0, 0.05, 0, 'triangle', 0.001); },
    nope(t){ tone(t, 0.12, 300, 240, 0.08, 0, 'triangle'); },
  };
  return {
    files: (typeof A !== 'undefined' && A.sfx) || {},
    get on(){ return AUDIO_SETTINGS.get().sfx>0; },
    syncVolume(){
      const volume=AUDIO_SETTINGS.get().sfx;
      if(out)out.gain.value=.55*volume;
      for(const voices of Object.values(fileVoices))for(const a of voices){a.volume=.7*volume;if(!volume)a.pause();}
    },
    play(name){
      if (!this.on || document.hidden) return; init(); if (!ac || ac.state !== 'running') return;
      const now = ac.currentTime; if (last[name] && now - last[name] < 0.035) return; last[name] = now;   // 같은 소리 겹침 방지
      if (this.files[name]){
        const voices = fileVoices[name] || (fileVoices[name] = []);
        let a = voices.find(v => v.paused || v.ended);
        if (!a && voices.length < 4){ a = new Audio(this.files[name]); a.preload = 'auto'; voices.push(a); }
        if (!a) a = voices[0];
        a.pause(); a.currentTime = 0; a.volume = 0.7 * AUDIO_SETTINGS.get().sfx;
        a.play().catch(() => {});
        return;
      }
      if (S[name]) S[name](now + 0.005);
    },
  };
})();
// 진동 (안드로이드 크롬)
const HAP = (p) => { if (!AUDIO_SETTINGS.get().vibration) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
// ---- 기존 동작에 소리·진동 붙이기 (원래 함수는 그대로 두고 감싼다) ----
(() => {
  const wrap = (name, before, after) => {
    let f; try { f = eval(name); } catch (e) { return; } if (typeof f !== 'function') return;
    const g = function(...a){ if (before) before(...a); const r = f.apply(this, a); if (after) after(r, ...a); return r; };
    eval(name + ' = g');
  };
  const originalAttack=attack;
  attack=function(...args){const previous=P.atk,r=originalAttack.apply(this,args);if(P.atk&&P.atk!==previous){const w=P.atk.wt;SFX.play(w==='bow'?'bow':w==='staff'?'staff':w==='spear'?'thrust':w==='gauntlet'?'punch':'swing');}return r;};
  wrap('hitTarget', null, () => { const p = pops[pops.length - 1]; SFX.play(p && p.crit ? 'crit' : 'hit'); HAP(p && p.crit ? 28 : 12); });   // 허수아비·몬스터 공통 타격
  if (typeof killMonster === 'function') wrap('killMonster', null, () => { SFX.play('kill'); HAP(18); });
  if (typeof hurtPlayer === 'function') wrap('hurtPlayer', (v) => { if (playerInv <= 0 && !traveling){ SFX.play('hurt'); HAP(45); } });
  wrap('cast',null,(ok,id)=>{if(!ok)return;SFX.play({fire1:'fire',fire2:'fire',fire3:'fire_big',ice1:'ice',ice2:'ice',ice3:'ice_big',bolt1:'lightning',bolt2:'lightning',bolt3:'lightning',dark1:'dark',dark2:'dark',dark3:'dark_big',holy1_heal:'heal',holy2_shield:'heal',holy3_revive:'heal',sword1:'slash',sword2:'spin',sword3:'slash',spear1:'thrust',spear2:'thrust',spear3:'explosion',bow1:'bow',bow2:'bow',bow3:'bow',fist1:'punch',fist2:'punch',fist3:'explosion'}[id]||'staff');HAP(id==='sword2'||id==='fire3'||id==='dark3'||id==='spear3'||id==='fist3'?[18,20,28]:id==='fire1'||id==='fire2'?[12,22,34]:id==='sword1'||id==='sword3'?28:18);});
  wrap('drink', null, (ok) => { if (ok){ SFX.play('potion'); HAP([10, 40, 10]); } });
  wrap('travel', () => { if (!traveling) SFX.play('travel'); });
  // 생활스킬 타운 포탈/귀환 포탈은 실제 텔레포트 파일 효과음
  if (window.GAME && GAME.useTownPortal){ const f=GAME.useTownPortal; GAME.useTownPortal=function(...a){ const r=f.apply(this,a); if(r) SFX.play('teleport'); return r; }; }
  if (window.GAME && GAME.returnTownPortal){ const f=GAME.returnTownPortal; GAME.returnTownPortal=function(...a){ const r=f.apply(this,a); if(r) SFX.play('teleport'); return r; }; }
  if (typeof openDungeonChest === 'function') wrap('openDungeonChest', (spot) => { const m = spot && spot.data && spot.data.mimic; SFX.play(m ? 'mimic' : 'chest'); HAP(m ? [60, 30, 60] : [15, 40, 15]); });
  if (typeof nextDungeonFloor === 'function') wrap('nextDungeonFloor', () => SFX.play('stairs'));
  if (typeof previousDungeonFloor === 'function') wrap('previousDungeonFloor', () => SFX.play('stairs'));
  let lastGold = P.gold;
  wrap('setGold', (v) => { if (v > lastGold) SFX.play('coin'); else if (v < lastGold) SFX.play('buy'); lastGold = v; });
  // 가방에 물건이 들어오면 (ui.js가 나중에 로드되므로 잠시 뒤 연결)
  setTimeout(() => { if (window.UI && UI.add){ const a = UI.add; UI.add = function(it){ const r = a.call(this, it); if (r) SFX.play('item'); return r; }; } }, 0);
  const refresh=()=>{
    const v=AUDIO_SETTINGS.get();
    for(const key of ['sfx','bgm']){const value=Math.round(v[key]*100);$('volume_'+key).value=value;$('value_'+key).textContent=value+'%';}
    $('vibration').checked=v.vibration;
  };
  $('settingsBtn').addEventListener('click',()=>{show('settings');P.hold=false;refresh();});
  for(const key of ['sfx','bgm'])$('volume_'+key).addEventListener('input',e=>{AUDIO_SETTINGS.set(key,Number(e.target.value)/100);refresh();});
  $('vibration').addEventListener('change',e=>AUDIO_SETTINGS.set('vibration',e.target.checked));
  $('escapeStuck').addEventListener('click',emergencyEscape);
})();
