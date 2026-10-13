(function(root){
'use strict';
const defaults={music:.28,sfx:.65,musicEnabled:true,sfxEnabled:true};let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem('fantasy-tavern-audio')||'{}')}}catch{}
for(const k of ['music','sfx'])settings[k]=Number.isFinite(settings[k])?Math.max(0,Math.min(1,settings[k])):defaults[k];
let unlocked=false,gesture=false,track=null,music=new Audio(),voices=[];music.loop=true;music.preload='none';const log=[];
function record(kind,name){log.push({kind,name});if(log.length>100)log.shift();}
function playCue(name){if(!unlocked||!settings.sfxEnabled||!settings.sfx||document.hidden)return;const a=new Audio('assets/audio/sfx-'+name+'.mp3');a.volume=settings.sfx;a.preload='auto';voices=voices.filter(x=>!x.ended&&!x.paused);if(voices.length>=3)voices.shift().pause();voices.push(a);record('sfx',name);a.play().catch(()=>{});}
function sync(context){const name=context?.special?'special':context?.state==='open'||context?.state==='closing'?'tavern':context?.state==='result'?'hub':context?.page==='market'?'market':context?.page==='clinic'?'clinic':context?.page==='rest'?'rest':context?.page==='talk'?(context.scene==='study'?'study':context.scene==='practice'?'role':'rest'):context?.page==='education'?(context.course||'study'):'hub';
if(track!==name){music.pause();track=name;music.src='assets/audio/bgm-'+name+'.mp3';record('bgm',name);}music.volume=settings.music;if(unlocked&&settings.musicEnabled&&settings.music&&!document.hidden){if(music.paused)music.play().catch(()=>{});}else music.pause();}
function begin(e){if(e.isTrusted===false)return;unlocked=true;gesture=true;setTimeout(()=>gesture=false,0);if(settings.musicEnabled&&track&&!document.hidden)music.play().catch(()=>{});}
document.addEventListener('pointerdown',begin,true);document.addEventListener('pointerup',begin,true);document.addEventListener('keydown',begin,true);
document.addEventListener('click',e=>{begin(e);const b=e.target.closest('button,[data-table]');if(!b||b.disabled)return;let cue=null;
if(b.hasAttribute('data-curtain'))return;
if(b.id==='waiting-slot'||b.id==='admit')cue='door';
else if(b.matches('[data-table], [data-table-button]')){const t=root.tavern?.tables[Number(b.dataset.table??b.dataset.tableButton)],g=root.tavern?.guest(t?.guestId);cue=g?.request?'bell':'table-crowd';}
else if(b.matches('[data-talk],[data-life-staff],[data-staff],[data-employee]'))cue=b.dataset.talk==='practice'?'female-surprise':'female-laugh';
else if(b.id==='schedule-course'&&root.TavernView?.life.state.course==='role'||b.matches('[data-course="role"]'))cue='whip';
else if(b.id==='life-advance'&&root.tavern?.life.status==='finished')cue='fanfare';
else if(b.id==='next-day'||b.id==='business'&&root.tavern?.state==='result')cue='closing';
else if(b.matches('[data-menu-choice],[data-service],[data-special],[data-close],#checkout,#gift-checkout'))return;
else cue='bell';if(cue)playCue(cue);if(cue==='fanfare')playCue('applause');if(cue==='whip')playCue('impact');
});
function onEvent(e){if(!gesture)return;const ctx=root.tavern;
if(e.type==='served'){const m=root.TavernData.MENUS.find(m=>m.id===e.itemId);playCue(m.category==='food'?'plate':m.id==='ale'?'mug':'glass');}
if(e.type==='seat')playCue('door');if(e.type==='greet'||e.type==='replaceStaff')playCue('female-laugh');if(e.type==='unassignStaff')playCue('bell');
if(e.type==='purchase'||e.type==='checkout')playCue('coins');
if(e.type==='checkout')playCue(ctx.guest(e.guestId)?.satisfaction>=65?'male-laugh':'grumble');
if(e.type==='service')playCue(e.good?'male-laugh':'grumble');
if(e.type==='levelUp'||e.type==='rankUp')playCue('fanfare');
if(e.type==='specialStart')playCue('curtain');if(e.type==='curtainTap'){const cues=[['impact','male-reaction'],['whip','female-laugh'],['glass','coins'],['fail','heart']][(e.clicks-1)%4];cues.forEach(playCue);}
if(e.type==='revealTendency')playCue('fanfare');
}
function set(key,value){if(key==='music'||key==='sfx')settings[key]=Math.max(0,Math.min(1,Number(value)));else if(key==='musicEnabled'||key==='sfxEnabled')settings[key]=!!value;try{localStorage.setItem('fantasy-tavern-audio',JSON.stringify(settings))}catch{}music.volume=settings.music;if(!settings.musicEnabled)music.pause();if(!settings.sfxEnabled)voices.forEach(a=>a.pause());}
document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();voices.forEach(a=>a.pause());}});
root.TavernAudio={sync,onEvent,playCue,set,settings,log,stop(){music.pause();voices.forEach(a=>a.pause())},get track(){return track},get unlocked(){return unlocked}};
})(window);
