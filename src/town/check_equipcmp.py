import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
SHOT=os.environ.get('CMP_SHOT','')

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)
        await ev("""() => {
          GAME.P.lv=70;
          UI.add(UI.make({kind:'weapon',wt:'sword',tier:1,roll:true,rar:1}));
          UI.add(UI.make({kind:'weapon',wt:'bow',tier:2,roll:true,rar:2}));
          UI.add(UI.make({kind:'weapon',wt:'sword',tier:3,roll:true,rar:2}));
          UI.add(UI.make({kind:'body',style:'knight',tier:1,roll:true,rar:1}));
          UI.add(UI.make({kind:'body',style:'knight',tier:3,roll:true,rar:2}));
          UI.add(UI.make({kind:'ring',tier:2,roll:true,rar:1}));
        }""")
        await pg.click('#bagBtn');await pg.wait_for_timeout(250)
        slots=await pg.query_selector_all('#bagPane .slot.has')
        assert len(slots)>=6,len(slots)
        # 무기 두 자루를 1번·2번에 끼운다
        await slots[0].click();await pg.wait_for_timeout(80)
        assert await ev("document.querySelectorAll('#iinfo .ccard').length")==2
        await (await pg.query_selector_all('#iinfo .btn'))[0].click();await pg.wait_for_timeout(80)
        slots=await pg.query_selector_all('#bagPane .slot.has')
        await slots[0].click();await pg.wait_for_timeout(80)
        await (await pg.query_selector_all('#iinfo .btn'))[1].click();await pg.wait_for_timeout(120)
        # 가방 무기를 고르면 카드 2장(무기1·무기2), 한 장에 '손에 듦'
        slots=await pg.query_selector_all('#bagPane .slot.has')
        await slots[0].click();await pg.wait_for_timeout(120)
        tags=await ev("[...document.querySelectorAll('#iinfo .ctag')].map(e=>e.textContent)")
        assert tags==['무기1 · 손에 듦','무기2'] or tags==['무기1','무기2 · 손에 듦'],tags
        assert await ev("document.querySelectorAll('#iinfo .ccard .cname').length")==2
        if SHOT:
            os.makedirs(SHOT,exist_ok=True);await pg.screenshot(path=os.path.join(SHOT,'cmp_weapon.png'))
        # 갑옷은 한 장, 반지는 두 장
        n={}
        for kind,ex in [('body',1),('ring',2)]:
            cnt=len(await pg.query_selector_all('#bagPane .slot.has'))
            for i in range(cnt):
                s=(await pg.query_selector_all('#bagPane .slot.has'))[i]
                await s.click();await pg.wait_for_timeout(60)
                t=await ev("iinfo.querySelector('.isub').textContent")
                if (kind=='body' and '몸' in t) or (kind=='ring' and '반지' in t):
                    n[kind]=await ev("document.querySelectorAll('#iinfo .ccard').length");break
            assert n.get(kind)==ex,(kind,n)
        # 낀 장비를 고르면 비교 카드는 없다
        await pg.click('#leftPane .slot.has');await pg.wait_for_timeout(80)
        assert await ev("document.querySelectorAll('#iinfo .ccard').length")==0
        assert not errs,errs
        print('equip compare cards ok',tags,n)
        await b.close()
asyncio.run(main())
