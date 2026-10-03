import asyncio
from playwright.async_api import async_playwright
JS='''(()=>{const out=[];const R=[];
for(const b of A.blds){const fw=b.w*0.8;R.push(['B:'+b.name,b.x-fw/2,b.x+fw/2,b.y-b.h*0.36,b.y-b.h*0.04]);}
for(const p of A.props){const w=Math.max(p.w*p.cw,p.w*0.5);R.push(['P:'+p.k+'@'+Math.round(p.x/48*10)/10+','+Math.round(p.y/48*10)/10,p.x-w/2,p.x+w/2,p.y-Math.max(p.cd,14),p.y]);}
for(const n of A.npcs){R.push(['N:'+n.name,n.x-16,n.x+16,n.y-14,n.y+4]);}
for(let i=0;i<R.length;i++)for(let j=i+1;j<R.length;j++){const a=R[i],b=R[j];
 if(a[0].startsWith('B:')&&b[0].startsWith('B:'))continue;
 if(a[1]<b[2]&&b[1]<a[2]&&a[3]<b[4]&&b[3]<a[4])out.push(a[0]+' X '+b[0]);}
return out;})()'''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page()
        await pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'../../game/town.html'))+'');await pg.wait_for_timeout(800)
        for o in await pg.evaluate(JS): print(o)
        await b.close()
asyncio.run(main())
