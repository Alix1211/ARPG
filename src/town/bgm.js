// 지역 음악: 첫 입력 이후에만 재생하고, 이동·우두머리 조우 시 천천히 교차한다.
const BGM = (() => {
  const tracks = (typeof A !== 'undefined' && A.bgm) || {};
  const level = { town: 0.25, field: 0.24, dungeon: 0.19, boss: 0.28 };
  const fadeMs = 1400;
  let unlocked = false, current = null, activeBoss = null;
  const fading = new Set(), ramps = new WeakMap();

  function target(){
    if (MAP !== 'dungeon') { activeBoss = null; return MAP === 'town' ? 'town' : 'field'; }
    if (activeBoss && (!monsters.includes(activeBoss) || activeBoss.dead)) activeBoss = null;
    if (!activeBoss) activeBoss = monsters.find(m => m.boss && !m.dead &&
      (m.state === 'chase' || Math.hypot(m.x - P.x, m.y - P.y) < 360)) || null;
    return activeBoss ? 'boss' : 'dungeon';
  }
  function ramp(a, goal, done){
    const token = {}; ramps.set(a, token);
    const start = performance.now(), from = a.volume;
    function tick(now){
      if (ramps.get(a) !== token) return;
      const p = Math.min(1, (now - start) / fadeMs);
      a.volume = Math.max(0, Math.min(1, from + (goal - from) * p));
      if (p < 1) requestAnimationFrame(tick);
      else if (done) done();
    }
    requestAnimationFrame(tick);
  }
  function play(a){ a.play().catch(() => {}); }
  function sync(){
    if (!unlocked) return;
    if (!SFX.on || document.hidden){
      if (current) current.audio.pause();
      for (const a of fading) a.pause();
      return;
    }
    const name = target();
    if (!tracks[name]) return;
    if (current && current.name === name){
      if (current.audio.paused) play(current.audio);
      return;
    }
    if (current){
      const old = current.audio; fading.add(old);
      ramp(old, 0, () => { old.pause(); old.currentTime = 0; fading.delete(old); });
    }
    const audio = new Audio(tracks[name]);
    audio.loop = true; audio.preload = 'none'; audio.volume = 0;
    current = { name, audio };
    play(audio);
    ramp(audio, level[name]);
  }
  function unlock(){ unlocked = true; sync(); }
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', sync);
  setInterval(sync, 300);
  return { sync, get track(){ return current && current.name; } };
})();
