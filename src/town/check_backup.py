"""앱 연결을 모의한 백업/복원과 휴대폰 닫기 버튼 회귀 검사. 실제 드라이브 제공자는 기기에서 확인한다."""
import asyncio, json, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
MOCK=r"""(() => {
  const ls=localStorage,set=Storage.prototype.setItem;
  let store=JSON.parse(ls.getItem('native_test_store')||'{}');
  const persist=()=>set.call(ls,'native_test_store',JSON.stringify(store));
  window.mock={status:{linked:false,at:0},picks:0,reads:0,applies:0};
  window.ArpgBridge={
    load:()=>JSON.stringify(store),isApp:()=>true,
    put:(k,v)=>{store[k]=v;persist();},del:k=>{delete store[k];persist();},
    backupStatus:()=>JSON.stringify(mock.status),pickBackup:()=>{mock.picks++;},
    restoreBackup:()=>{mock.reads++;},
    cancelRestore:()=>{},applyBackup:()=>{mock.applies++;},
  };
})();"""

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        browser=await b.new_page(viewport={'width':844,'height':390})
        await browser.goto(URL);await browser.wait_for_function('window.UI')
        await browser.click('#settingsBtn')
        assert not await browser.locator('#pickBackup').is_visible()
        assert not await browser.locator('#restoreBackup').is_visible()
        await browser.close()
        ctx=await b.new_context(viewport={'width':844,'height':390})
        await ctx.add_init_script(MOCK)
        pg=await ctx.new_page();errors=[]
        pg.on('pageerror',lambda e:errors.append(str(e)))
        await pg.goto(URL);await pg.wait_for_function('window.UI')
        assert await pg.evaluate("() => typeof window.onArpgRestore==='function'"),errors
        ev=pg.evaluate
        await pg.click('#settingsBtn')
        assert await pg.locator('#pickBackup').is_visible()
        assert await pg.locator('#restoreBackup').is_disabled()
        await pg.click('#pickBackup')
        assert await ev("() => mock.picks===1 && !!JSON.parse(localStorage.getItem('native_test_store')).arpg_save_v3")
        await ev("() => {mock.status={linked:true,at:1728000000000,held:true};onArpgBackup('연결했습니다.');}")
        assert '연결됨' in await pg.locator('#backupStatus').inner_text()
        assert '불러오기 대기' in await pg.locator('#backupStatus').inner_text()
        assert not await pg.locator('#restoreBackup').is_disabled()
        for selector in ['#pickBackup','#restoreBackup']:
            box=await pg.locator(selector).bounding_box()
            assert box and box['y']>=0 and box['y']+box['height']<=390,selector
        # Cancel leaves native state/local save untouched.
        async def cancel(d): await d.dismiss()
        pg.on('dialog',cancel)
        await pg.click('#restoreBackup')
        assert await ev('() => mock.reads===0 && !window.ARPG_BACKUP_RESTORING')
        pg.remove_listener('dialog',cancel)
        async def accept(d): await d.accept()
        pg.on('dialog',accept)
        await ev('() => {GAME.setGold(654);UI.save();}')
        before=await ev("() => localStorage.getItem('arpg_save_v3')")
        await pg.click('#restoreBackup')
        assert await ev('() => mock.reads===1 && window.ARPG_BACKUP_RESTORING')
        # During I/O, both explicit and automatic saves must not overwrite the incoming save.
        await ev('() => {GAME.setGold(111);UI.save();}')
        await pg.wait_for_timeout(4200)
        assert await ev("() => localStorage.getItem('arpg_save_v3')")==before
        await ev("() => onArpgBackupFail('불러올 수 없는 파일입니다.')")
        assert not await ev('() => window.ARPG_BACKUP_RESTORING')
        assert await ev("() => localStorage.getItem('arpg_save_v3')")==before
        for invalid in ['not json','{}',json.dumps({'arpg_save_v3':json.dumps({'v':2})}),json.dumps({'other_app':'{}'})]:
            await ev('(t) => onArpgRestore(t)',invalid)
            assert await ev("() => localStorage.getItem('arpg_save_v3')")==before
        # A complete backup restores the original v3 payload and ancillary settings.
        saved=json.loads(before);saved['gold']=987;saved['lv']=7
        saved['stash']=[None]*56
        payload=json.dumps({'arpg_save_v3':json.dumps(saved),'arpg_audio_settings':json.dumps({'sfx':.21,'bgm':.32,'vibration':False})})
        await ev("() => localStorage.setItem('arpg_obsolete_test','old')")
        await ev('(t) => onArpgRestore(t)',payload)
        assert await ev('() => mock.applies===1')
        await ev('(t) => onArpgBackupApplied(t)',payload)
        await pg.wait_for_function('window.UI && GAME.P.gold===987 && GAME.P.lv===7')
        assert await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3')).v===3 && !localStorage.getItem('arpg_obsolete_test')")
        assert await ev('() => AUDIO.settings.get().sfx===.21 && AUDIO.settings.get().bgm===.32 && !AUDIO.settings.get().vibration')
        # Phone-only red X: above the action row, independent of trade/quest/talk actions.
        if await pg.locator('#settingsClose').is_visible(): await pg.click('#settingsClose')
        await ev("""() => {document.getElementById('dlg').classList.add('on');GAME.setOpen('dlg');
          document.getElementById('dlgMainRow').hidden=false;document.getElementById('dlgInnRow').hidden=true;
          document.getElementById('dlgLine').textContent='화면 검사';}""")
        x=await pg.locator('#dlgCloseX').bounding_box();row=await pg.locator('#dlgMainRow').bounding_box()
        assert x and x['x']>=0 and x['x']+x['width']<=844 and x['y']>=0
        assert x['y']+x['height']<row['y']
        assert not await pg.locator('#dlgMainRow [data-close]').is_visible()
        await pg.screenshot(path='/tmp/arpg_phone_dialog.png')
        await pg.click('#dlgCloseX');assert not await ev('() => GAME.isOpen()')
        await pg.set_viewport_size({'width':1280,'height':720})
        await ev("() => {document.getElementById('dlg').classList.add('on');GAME.setOpen('dlg');}")
        assert not await pg.locator('#dlgCloseX').is_visible()
        assert await pg.locator('#dlgMainRow [data-close]').is_visible()
        assert not errors,errors
        print('backup and phone dialog ok: app-only, confirm/cancel, invalid rejection, restore, save guard, phone X')
        await b.close()

asyncio.run(main())
