import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1100)

        # 옵션 3개 희귀 장비가 미확인으로 생성되고, 기본 수치만 보이며 옵션은 ???로 숨는다.
        r=await ev("""() => {
          GAME.P.lv=70;GAME.P.lifeSkills.identify=1;
          let it=null;for(let n=0;n<300;n++){const x=UI.make({kind:'weapon',wt:'sword',tier:4,roll:true,rar:2});if(x.aff.length===3){it=x;break;}}
          if(!it)return {made:false};
          UI.addAt(it,0);document.getElementById('bagBtn').click();
          const c=document.querySelector('[data-inventory="bag"][data-index="0"]');if(c)c.click();
          const vis=UI.itemStats(it),raw=it.st;
          return {made:true,unid:!!it.unid,name:it.name,aff:it.aff.length,min:UI.UNID_MIN_AFFIXES,
            hidden:it.aff.some(a=>(raw[a.st]||0)!==(vis[a.st]||0)),
            q:(document.getElementById('iinfo').textContent.match(/\?\?\?/g)||[]).length,
            badge:!!document.querySelector('[data-inventory="bag"][data-index="0"] .unidtag'),
            guide:document.getElementById('iinfo').textContent.includes('여관 감정사')};
        }""")
        assert r['made'] and r['min']==3 and r['aff']==3 and r['unid'] and r['name'].startswith('미확인 '),r
        assert r['hidden'] and r['q']==3 and r['badge'] and r['guide'],r

        # 착용은 가능하되 숨은 옵션은 미적용. 랭크2 희귀 자가 감정 뒤 즉시 옵션 효과가 켜진다.
        r=await ev("""() => {
          const it=UI.bagItems().find(x=>x.i===0).it;GAME.P.lifeSkills.identify=2;
          UI.equip(it,'w1');const equipped=UI.currentWeapon()===it,before=UI.combatMods().t,vis=UI.itemStats(it);
          const hiddenBefore=it.aff.every(a=>(before[a.st]||0)===(vis[a.st]||0));
          const ok=UI.identify(it,'self'),after=UI.combatMods().t;
          const on=it.aff.every(a=>(after[a.st]||0)===(it.st[a.st]||0));
          UI.save();return {equipped,hiddenBefore,ok,on,unid:!!it.unid,name:it.name};
        }""")
        assert r['equipped'] and r['hiddenBefore'] and r['ok'] and r['on'] and not r['unid'] and not r['name'].startswith('미확인 '),r
        await pg.reload();await pg.wait_for_timeout(1000)
        assert await ev("() => {const it=UI.currentWeapon();return !!it&&!it.unid&&!it.name.startsWith('미확인 ');}")

        # 새 전설 미확인 장비는 저장 뒤에도 미확인 유지.
        r=await ev("""() => {
          GAME.P.lv=70;const it=UI.make({kind:'weapon',wt:'staff',tier:5,roll:true,rar:3});
          UI.addAt(it,5);UI.save();return {unid:!!it.unid,aff:it.aff.length,id:it.id};
        }""")
        assert r['unid'] and r['aff']>=3,r
        await pg.reload();await pg.wait_for_timeout(1000)
        assert await ev("() => {const x=UI.bagItems().find(x=>x.i===5);return !!x&&!!x.it.unid;}")

        # 여관 감정사: 티어×50G. 감정 전 판매가는 감정 후의 약 50%.
        assert await ev("() => __INN.enter()")
        await pg.wait_for_timeout(650)
        assert await ev("() => __INN.open()")
        assert await ev("() => __INN.identify()")
        r=await ev("""() => {
          const it=UI.bagItems().find(x=>x.i===5).it;GAME.setGold(2000);
          const before=__SHOP.price(it),cost=UI.identifyCost(it),g=GAME.P.gold;
          const ok=UI.identify(it,'vendor'),after=__SHOP.price(it);
          return {ok,cost,tier:it.tier,spent:g-GAME.P.gold,before,after,unid:!!it.unid,vendor:UI.identifyVendorOpen()};
        }""")
        assert r['ok'] and r['cost']==r['tier']*50 and r['spent']==r['cost'] and not r['unid'] and r['vendor'],r
        assert abs(r['after']-r['before']*2)<=1,r

        # 이전 저장 호환: unid 필드가 없으면 감정 완료로 유지.
        await ev("""() => {const it=UI.bagItems().find(x=>x.i===5).it;delete it.unid;UI.save();}""")
        await pg.reload();await pg.wait_for_timeout(1000)
        r=await ev("""() => {const it=UI.bagItems().find(x=>x.i===5).it;return {has:Object.prototype.hasOwnProperty.call(it,'unid'),unid:!!it.unid,name:it.name};}""")
        assert not r['has'] and not r['unid'] and not r['name'].startswith('미확인 '),r

        assert not errs,errs
        print('identify ok')
        await b.close()

asyncio.run(main())
