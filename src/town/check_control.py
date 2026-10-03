import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        ctx=await browser.new_context(viewport={'width':1280,'height':720}, has_touch=True)
        pg=await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(900)

        # Android 경로: TouchEvent로 한 번 누르고 끌었을 때 바로 이동해야 한다.
        x0=await pg.evaluate("() => GAME.P.x")
        await pg.evaluate("""() => {
          const el=document.getElementById('joy');
          const mk=(x,y)=>new Touch({identifier:17,target:el,clientX:x,clientY:y,pageX:x,pageY:y,screenX:x,screenY:y});
          const t0=mk(250,520);
          el.dispatchEvent(new TouchEvent('touchstart',{touches:[t0],targetTouches:[t0],changedTouches:[t0],bubbles:true,cancelable:true}));
          const t1=mk(340,520);
          document.dispatchEvent(new TouchEvent('touchmove',{touches:[t1],targetTouches:[],changedTouches:[t1],bubbles:true,cancelable:true}));
        }""")
        await pg.wait_for_timeout(450)
        j=await pg.evaluate("() => __CTRL.joy()")
        x1=await pg.evaluate("() => GAME.P.x")
        assert j['dx'] > .5, j
        assert x1 > x0 + 20, (x0,x1,j)
        await pg.evaluate("""() => {
          const el=document.getElementById('joy');
          const t=new Touch({identifier:17,target:el,clientX:340,clientY:520,pageX:340,pageY:520,screenX:340,screenY:520});
          document.dispatchEvent(new TouchEvent('touchend',{touches:[],targetTouches:[],changedTouches:[t],bubbles:true,cancelable:true}));
        }""")
        await pg.wait_for_timeout(60)
        assert abs((await pg.evaluate("() => __CTRL.joy().dx"))) < .01

        # 필드에서 위/아래 타깃에 마법이 실제 좌표 방향으로 출발하는지.
        await pg.evaluate("() => __FD.enter('spring')")
        await pg.wait_for_timeout(850)
        await pg.evaluate("() => { GAME.P.mp=99999; GAME.P.passives.magicGuide=1; __P.dir='side'; __P.flip=false; __FD.debugTarget(0,220); GAME.cast('fire1',{dmg:1,mp:1}); }")
        await pg.wait_for_timeout(30)
        down=await pg.evaluate("() => __CTRL.shots().filter(s=>s.kind==='fire').slice(-1)[0]")
        assert down and down['vy'] > 0 and abs(down['vy']) > abs(down['vx'])*2, down

        await pg.wait_for_timeout(1500)
        await pg.evaluate("() => { GAME.P.mp=99999; GAME.P.passives.magicGuide=1; __P.dir='side'; __P.flip=false; __FD.debugTarget(0,-220); GAME.cast('fire1',{dmg:1,mp:1}); }")
        await pg.wait_for_timeout(30)
        up=await pg.evaluate("() => __CTRL.shots().filter(s=>s.kind==='fire').slice(-1)[0]")
        assert up and up['vy'] < 0 and abs(up['vy']) > abs(up['vx'])*2, up

        # 지팡이는 새 필드/새 타깃으로 분리해, 발사 직후 방향만 확인한다.
        await pg.evaluate("() => __FD.enter('spring')")
        await pg.wait_for_timeout(850)
        await pg.evaluate("""() => {
          __FD.debugTarget(0,320);
          GAME.P.passives.magicGuide=1;
          GAME.setWeapon({wt:'staff',icon:'staff_01',st:{matk:10}});
          __P.dir='side'; __P.flip=false; GAME.swing();
        }""")
        await pg.wait_for_timeout(365)
        staff=await pg.evaluate("() => __CTRL.shots().filter(s=>s.kind==='staff'&&!s.done).slice(-1)[0]")
        assert staff and staff['vy'] > 0 and abs(staff['vy']) > abs(staff['vx'])*2, staff

        assert not errs, errs
        print('touch + vertical magic ok', round(x1-x0), down, up, staff)
        await browser.close()

asyncio.run(main())
