import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':1280,'height':720});errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_function('window.AUDIO && window.UI')
        assert await ev("() => ['town','field','dungeon','boss','event'].every(k=>A.bgm[k]) && A.sfx.bow.startsWith('data:audio/mpeg;')")
        assert await pg.locator('#snd').count()==0 and await pg.locator('#panic').count()==0
        await pg.click('#settingsBtn');assert await ev('() => GAME.isPaused()')
        await pg.wait_for_timeout(1700)
        assert await ev("() => AUDIO.bgm.track==='town' && !AUDIO.bgm.state().paused")
        await ev("""() => {window.vibrations=[];navigator.vibrate=p=>{vibrations.push(p);return true;};
          const s=document.getElementById('volume_sfx');s.value=0;s.dispatchEvent(new Event('input'));}""")
        assert await ev('() => !AUDIO.sfx.on && AUDIO.settings.get().bgm===1 && AUDIO.settings.get().vibration')
        await ev('() => AUDIO.haptic(12)');assert await ev('() => vibrations.at(-1)===12')
        await pg.uncheck('#vibration');await ev('() => AUDIO.haptic(30)')
        assert await ev('() => vibrations.at(-1)===0')
        await ev("""() => {const s=document.getElementById('volume_sfx');s.value=37;s.dispatchEvent(new Event('input'));
          const m=document.getElementById('volume_bgm');m.value=0;m.dispatchEvent(new Event('input'));}""")
        assert await ev('() => AUDIO.sfx.on && AUDIO.bgm.state().paused')
        await ev("() => {const m=document.getElementById('volume_bgm');m.value=42;m.dispatchEvent(new Event('input'));}")
        await pg.wait_for_timeout(1600)
        assert await ev('() => Math.abs(AUDIO.bgm.state().volume-.25*.42)<.001 && !AUDIO.bgm.state().paused')
        await pg.reload();await pg.wait_for_function('window.AUDIO && window.UI');await pg.click('#settingsBtn')
        assert await ev('() => AUDIO.settings.get().sfx===.37 && AUDIO.settings.get().bgm===.42 && !AUDIO.settings.get().vibration')
        await pg.click('#settingsClose');assert not await ev('() => GAME.isPaused()')
        await ev("() => __FD.enter('spring')");await pg.wait_for_function("document.getElementById('place').dataset.map!=='마을'")
        await pg.wait_for_timeout(450);assert await ev("() => AUDIO.bgm.track==='field'")
        await ev('() => {AUDIO.bgm.setEvent(true);}');assert await ev("() => AUDIO.bgm.track==='event'")
        await ev('() => {AUDIO.bgm.setEvent(false);}');assert await ev("() => AUDIO.bgm.track==='field'")
        await ev('() => __FD.debugTarget(10,0)');await pg.click('#settingsBtn')
        hp=await ev('() => GAME.P.hp');await pg.wait_for_timeout(1100);assert await ev('() => GAME.P.hp')==hp
        await pg.set_viewport_size({'width':844,'height':390})
        box=await pg.locator('#settings').bounding_box();assert box['y']>=0 and box['y']+box['height']<=390,box
        await pg.screenshot(path='/tmp/arpg_settings.png')
        await pg.click('#escapeStuck');assert await ev("() => document.getElementById('place').dataset.map==='마을' && !GAME.isPaused()")
        # One attack start produces one sound even when another attack input is rejected.
        assert await ev("""() => {GAME.setWeapon({wt:'bow'});const original=AUDIO.sfx.play;let count=0;
          AUDIO.sfx.play=n=>{if(n==='bow')count++;};GAME.P.atk=null;GAME.swing();GAME.swing();
          AUDIO.sfx.play=original;return count===1;}""")
        await ev('() => __DUN.go(3)');await pg.wait_for_timeout(900)
        # Boss override uses the actual live boss, then reverts after its removal.
        assert await ev("""() => {const boss=__FD.debugMonsters().find(m=>m.rank==='boss');return !!boss;}""")
        await ev("""() => {const m=__FD.debugMonsters().find(m=>m.rank==='boss');GAME.P.x=m.x;GAME.P.y=m.y;AUDIO.bgm.sync();}""")
        assert await ev("() => AUDIO.bgm.track==='boss'")
        await ev("""() => {while(__FD.hitFirst()){}AUDIO.bgm.sync();}""")
        assert await ev("() => AUDIO.bgm.track==='dungeon'")
        await ev("() => {localStorage.removeItem('arpg_audio_settings');localStorage.setItem('arpg_sound','off');}")
        await pg.reload();await pg.wait_for_function('window.AUDIO')
        assert await ev('() => AUDIO.settings.get().sfx===0 && AUDIO.settings.get().bgm===0 && AUDIO.settings.get().vibration')
        assert not errs,errs
        print('audio/settings ok: independent volumes, vibration, persist, pause, escape, 5 tracks, single-shot')
        await b.close()
asyncio.run(main())
