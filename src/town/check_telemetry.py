import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1000)
        await ev("() => TELEMETRY.reset()")
        await ev("() => {GAME.setGold(1000);GAME.setGold(850);GAME.P.hp=Math.floor(GAME.P.maxHp/2);GAME.drink('hp')}")
        await ev("() => TELEMETRY.enter({map:'field',theme:'spring',leg:1})")
        await pg.wait_for_timeout(120)
        await ev("() => {TELEMETRY.damageOut(345);TELEMETRY.damageIn(123);TELEMETRY.kill({type:'wolf',tier:1});TELEMETRY.kill({type:'slime_king',tier:1,boss:true});TELEMETRY.loot({rar:2});TELEMETRY.death({gold:GAME.P.gold})}")
        old=await ev("() => GAME.P.lv")
        need=await ev("() => GAME.expNeed(GAME.P.lv)")
        await ev("(n)=>GAME.gainExp(n)",need)
        await ev("() => TELEMETRY.enter({map:'dungeon',floor:1,dungeonTheme:'ruins'})")
        await pg.wait_for_timeout(80)
        st=await ev("() => TELEMETRY.state()")
        assert st['totals']['deaths']==1,st
        assert st['totals']['kills']==2 and st['totals']['bossKills']==1,st
        assert st['totals']['damageOut']>=345 and st['totals']['damageIn']>=123,st
        assert st['totals']['potions']['hp']==1,st
        assert st['totals']['goldEarned']>=700 and st['totals']['goldSpent']>=150,st
        assert st['totals']['loot']['rare']==1,st
        assert st['levels'] and st['levels'][-1]['lv']==old+1,st['levels']
        assert any(z['map']=='field' and z['ms']>0 for z in st['zones']),st['zones']

        await ev("() => UI.save()")
        raw=await ev("() => JSON.parse(localStorage.getItem('arpg_save_v3'))")
        assert raw.get('telemetry') and raw['telemetry']['schema']==1
        await pg.reload();await pg.wait_for_timeout(1200)
        st2=await ev("() => TELEMETRY.state()")
        assert st2['totals']['deaths']==1 and st2['totals']['bossKills']==1,st2
        assert st2['levels'] and st2['levels'][-1]['lv']==old+1,st2
        assert not errs,errs
        print('telemetry save ok',{'deaths':st2['totals']['deaths'],'zones':len(st2['zones']),'levels':len(st2['levels'])})
        await b.close()

asyncio.run(main())
