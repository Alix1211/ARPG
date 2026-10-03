import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(900)
        a=await ev("[__P.x,__P.y]");await pg.wait_for_timeout(1500);print('idle drift',a,await ev("[__P.x,__P.y]"))
        await pg.mouse.move(200,560);await pg.mouse.down();await pg.mouse.move(150,520);await pg.wait_for_timeout(400)
        print('dragging moved',await ev("[Math.round(__P.x),Math.round(__P.y)]"))
        # 버튼을 뗀 이벤트를 놓친 상황: 버튼 없이 마우스만 움직임
        await ev("dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',buttons:0,clientX:100,clientY:500}))")
        x=await ev("[Math.round(__P.x),Math.round(__P.y)]");await pg.wait_for_timeout(800);print('after lost up',x,await ev("[Math.round(__P.x),Math.round(__P.y)]"))
        await pg.mouse.up();print('errors',errs);await b.close()
asyncio.run(main())
