import asyncio, os
from playwright.async_api import async_playwright
URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1000)
        await pg.evaluate("() => __FD.enter('spring')")
        await pg.wait_for_timeout(1100)
        st=await pg.evaluate("() => __FD.state()")
        assert st['map']=='field', st
        assert st['props']>=40, st
        assert st['monsters']>=12, st
        killed=await pg.evaluate("() => __FD.hitFirst()")
        assert killed
        await pg.wait_for_timeout(100)
        st2=await pg.evaluate("() => __FD.state()")
        assert st2['drops']>=1, st2
        await pg.evaluate("() => { __P.x=3.0*48; __P.y=20*48; }")
        await pg.keyboard.down('ArrowLeft'); await pg.wait_for_timeout(650); await pg.keyboard.up('ArrowLeft')
        await pg.wait_for_timeout(800)
        out=await pg.evaluate("() => __FD.state()")
        assert out['map']=='out', out
        assert not errs, errs
        print('field ok',st,'->',out)
        await b.close()
asyncio.run(main())
