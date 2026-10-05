"""가방/상점/창고의 실제 포인터 이동과 저장·거래 보존 검사."""
import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def move(pg,source,target):
    a=await pg.locator(source).bounding_box();b=await pg.locator(target).bounding_box()
    assert a and b,(source,target)
    await pg.mouse.move(a['x']+a['width']/2,a['y']+a['height']/2)
    await pg.mouse.down();await pg.mouse.move(b['x']+b['width']/2,b['y']+b['height']/2,steps=12);await pg.mouse.up()
    await pg.wait_for_timeout(30)
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch();pg=await browser.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL);await pg.wait_for_timeout(900)
        await pg.evaluate("""()=>{GAME.closeAll();UI.bagItems().forEach(r=>UI.removeBagAt(r.i));UI.add(UI.make({baseId:'sword_01',rar:0}));UI.add(UI.make({baseId:'spear_02',rar:0}));bagBtn.click();}""")
        ids=await pg.evaluate('UI.bagItems().map(r=>r.it.id)')
        await move(pg,'[data-inventory=bag][data-index="0"]','[data-inventory=bag][data-index="1"]')
        assert await pg.evaluate('UI.bagItems().map(r=>r.it.id)')==ids[::-1]
        await move(pg,'[data-inventory=bag][data-index="1"]','[data-inventory=bag][data-index="41"]')
        assert await pg.evaluate('UI.bagItems().find(r=>r.i===41).it.id')==ids[0]
        await move(pg,'[data-inventory=bag][data-index="41"]','[data-eq=w2]')
        assert await pg.evaluate("document.querySelector('[data-eq=w2]').classList.contains('has')")
        await move(pg,'[data-eq=w2]','[data-inventory=bag][data-index="41"]')
        assert await pg.evaluate('UI.bagItems().find(r=>r.i===41).it.id')==ids[0]
        for key in ['tier','price','kind']:
            await pg.click('#bagPane [data-sort='+key+']')
            assert await pg.evaluate('UI.bagItems().map(r=>r.i)')==[0,1]
            order=await pg.evaluate('UI.bagItems().map(r=>r.it.wt)')
            assert order==(['spear','sword'] if key=='price' else ['sword','spear']), (key,order)
        # Pointer Events가 터치 입력도 처리하고 탭은 선택으로 남습니다.
        cdp=await pg.context.new_cdp_session(pg)
        a=await pg.locator('[data-inventory=bag][data-index="0"]').bounding_box()
        b=await pg.locator('[data-inventory=bag][data-index="2"]').bounding_box()
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':a['x']+10,'y':a['y']+10}]})
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':b['x']+10,'y':b['y']+10}]})
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert await pg.evaluate('UI.bagItems().some(r=>r.i===2)')
        # 창고: 마을 허용, 반대쪽 칸 교환·자동정리·저장 복원
        await pg.evaluate("GAME.closeAll();const p=A.props.find(p=>p.kind==='stash');GAME.P.x=p.x;GAME.P.y=p.y+28")
        await pg.wait_for_timeout(150)
        assert await pg.evaluate("GAME.near()&&GAME.near().kind==='stash'")
        if os.environ.get('BAG_CAPTURE'):await pg.screenshot(path='/tmp/bag_chest_town.png')
        await pg.click('#atk')
        assert await pg.evaluate('UI.stashOpen()')
        await move(pg,'[data-inventory=bag][data-index="1"]','[data-inventory=stash][data-index="0"]')
        assert await pg.evaluate('UI.stashItems().length')==1
        await move(pg,'[data-inventory=stash][data-index="0"]','[data-inventory=bag][data-index="40"]')
        assert await pg.evaluate('UI.stashItems().length')==0
        await pg.evaluate("UI.inventoryDrop({from:'bag',i:40},{from:'stash',i:55});UI.sortInventory('stash','tier');UI.save()")
        saved=await pg.evaluate('UI.stashItems().map(r=>r.it.id)')
        await pg.reload();await pg.wait_for_timeout(900)
        assert await pg.evaluate('UI.stashItems().map(r=>r.it.id)')==saved
        # 상점: 양쪽 동시 노출, 끌기/버튼 매각, 고등급 확인, 구매
        await pg.evaluate("__SHOP.open({shop:'arms',title:'테스트 상점 주인',k:Object.keys(A.port)[0]})")
        assert await pg.locator('#shop').is_visible() and await pg.locator('#bagPane').is_visible()
        before=await pg.evaluate('GAME.P.gold')
        await move(pg,'#bagPane .slot.has','#grid .cell:first-child')
        assert await pg.evaluate('GAME.P.gold')>before
        await pg.evaluate("UI.add(UI.make({baseId:'sword_01',rar:0}));UI.refresh()")
        await pg.wait_for_timeout(510);await pg.locator('#bagPane .slot.has').first.click();before=await pg.evaluate('GAME.P.gold')
        await pg.click('#buy');assert await pg.evaluate('GAME.P.gold')>before
        await pg.evaluate("UI.add(UI.make({baseId:'sword_01',rar:2}));UI.refresh()")
        rare_i=await pg.evaluate("UI.bagItems().find(r=>(r.it.rar||0)>=2).i")
        before=await pg.evaluate('UI.bagItems().length')
        await pg.locator(f'[data-inventory=bag][data-index="{rare_i}"]').click();await pg.click('#buy')
        assert await pg.evaluate('UI.bagItems().length')==before-1
        await pg.evaluate('GAME.setGold(10000)');before=await pg.evaluate('UI.bagItems().length')
        await move(pg,'#grid .cell:first-child','[data-inventory=bag][data-index="41"]')
        assert await pg.evaluate('UI.bagItems().length')==before+1
        await pg.wait_for_timeout(510);await pg.locator('#grid .cell').first.click();await pg.click('#buy')
        assert await pg.evaluate('UI.bagItems().length')==before+2
        await pg.evaluate("while(!UI.bagFull())UI.add(UI.make({baseId:'sword_01',rar:0}));UI.refresh()")
        before=await pg.evaluate('GAME.P.gold');await pg.locator('#grid .cell').first.click();await pg.click('#buy')
        assert await pg.evaluate('GAME.P.gold')==before
        assert await pg.evaluate('UI.openStash()')
        await pg.locator('[data-inventory=stash].has').first.click();await pg.locator('#iinfo .btn').click()
        assert await pg.evaluate('UI.stashItems().map(r=>r.it.id)')==saved
        # 새 저장에 창고가 유지됩니다.
        await pg.evaluate('UI.save()');await pg.reload();await pg.wait_for_timeout(900)
        assert await pg.evaluate('UI.stashItems().map(r=>r.it.id)')==saved
        await pg.evaluate("__SHOP.open({shop:'arms',title:'테스트 상점 주인',k:Object.keys(A.port)[0]})")
        # 필요한 화면만 캡처; 모든 창과 핵심 버튼이 화면 안에 들어옵니다.
        if os.environ.get('BAG_CAPTURE'):
            for w,h in [(1280,720),(1920,1200),(844,390)]:
                await pg.set_viewport_size({'width':w,'height':h});await pg.wait_for_timeout(80)
                for part in ['#leftPane','#bagPane','#charClose']:
                    r=await pg.locator(part).bounding_box();assert r and r['x']>=0 and r['y']>=0 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,r
                await pg.screenshot(path=f'/tmp/bag_shop_{w}.png')
            await pg.evaluate('GAME.closeAll();bagBtn.click()');await pg.screenshot(path='/tmp/bag_inventory.png')
            await pg.evaluate('UI.openStash()');await pg.screenshot(path='/tmp/bag_stash.png')
            cells=await pg.locator('.stashGrid .slot').evaluate_all('(es)=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
            assert len(cells)==56 and max(c['h'] for c in cells)-min(c['h'] for c in cells)<1,cells
        await pg.add_init_script("const old=JSON.parse(localStorage.getItem('arpg_save_v3'));if(old){delete old.stash;localStorage.setItem('arpg_save_v3',JSON.stringify(old));}")
        await pg.reload();await pg.wait_for_timeout(900)
        assert await pg.evaluate('UI.stashItems().length')==0
        await pg.evaluate("GAME.locationState=()=>({map:'field'})")
        assert not await pg.evaluate('UI.openStash()')
        assert not errs,errs
        await browser.close();print('bag/shop/stash pointer, sort, equip, confirm, full, save OK')
asyncio.run(main())
