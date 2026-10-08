"""퀘스트 물품 34종의 실제 그림 연결/획득/전달/저장/작은 화면 회귀 검사. 내용은 출력하지 않는다."""
import asyncio,json,os
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
URL=os.environ.get("ARPG_GAME_URL",(ROOT/"game/town.html").as_uri())
async def main():
    spec=json.loads((ROOT/"src/story/quest_items.json").read_text(encoding="utf-8"))
    data=json.loads((ROOT/"src/story/quests.json").read_text(encoding="utf-8"))
    required=set()
    for q in data["quests"]+data["sideQuests"]:
        for step in q["steps"]:
            if step.get("item"):required.add(step["item"])
            required.update(step.get("give",{}))
    ids={item["id"] for item in spec["items"]}
    assert len(ids)==34 and ids==required,"art coverage"
    for item in spec["items"]:
        im=Image.open(ROOT/"assets/quest_items"/(item["id"]+".png"))
        assert im.mode=="RGBA" and im.size==(256,256),"icon format"
        bounds=im.getchannel("A").getbbox()
        assert bounds and min(bounds[:2])>=20 and max(bounds[2:])<=236,"icon safe margin"
    async with async_playwright() as p:
        launch={"headless":True}
        if os.environ.get("ARPG_CHROME"):launch["executable_path"]=os.environ["ARPG_CHROME"]
        browser=await p.chromium.launch(**launch)
        pg=await browser.new_page(viewport={"width":1280,"height":720})
        errors=[];pg.on("pageerror",lambda error:errors.append(str(error)))
        await pg.goto(URL)
        await pg.wait_for_function("window.QUEST && window.UI")
        ev=pg.evaluate
        assert await ev("() => Object.keys(A.questItems).length")==34
        assert await ev("""async () => {
          await Promise.all(Object.values(A.questItems).map(x=>{const i=new Image();i.src=x.icon;return i.decode();}));
          return true;
        }""")
        await ev("() => {QUEST.loadData(null);QUEST.openList();}")
        assert await pg.locator("#questItemsBlock").is_hidden(),"future items hidden"
        assert await pg.locator("#questItems .questItem").count()==0
        # 모든 종류는 실제로 소지한 경우에만 그려진다. 알 수 없는 옛 저장 물품은 유지하되 노출하지 않는다.
        await ev("""() => QUEST.loadData({schema:3,active:{},completed:[],items:{
          ...Object.fromEntries(Object.keys(A.questItems).map(id=>[id,2])),unknown_legacy_item:3},visited:[],flags:{}})""")
        assert await pg.locator("#questItems .questItem").count()==34
        assert await ev("() => QUEST.state().items.unknown_legacy_item")==3
        assert await ev("() => [...document.querySelectorAll('#questItems img')].every(i=>i.complete&&i.naturalWidth>0)")
        for width,height in [(1280,720),(1024,768),(844,390)]:
            await pg.set_viewport_size({"width":width,"height":height})
            box=await pg.locator("#guild").bounding_box()
            assert box["x"]>=0 and box["y"]>=0 and box["x"]+box["width"]<=width and box["y"]+box["height"]<=height,"quest panel viewport"
            assert await ev("() => {const h=document.getElementById('guild');return h.scrollWidth<=h.clientWidth+1;}"),"horizontal overflow"
        # 실제 수집 지점 이동 → 그림 그리기 → 회수 → 보유 수량 → 획득 알림.
        await ev("() => {GAME.closeAll();QUEST.loadData(null);}")
        q=next(q for q in data["quests"] if any(s["type"]=="collect" and s.get("point",{}).get("map")=="field" for s in q["steps"]))
        index=next(i for i,s in enumerate(q["steps"]) if s["type"]=="collect" and s.get("point",{}).get("map")=="field")
        step=q["steps"][index];point=step["point"]
        await ev("(x)=>__FD.enter(x.market,x.leg||1)",point);await pg.wait_for_timeout(850)
        await ev("(x)=>QUEST.loadData({schema:3,active:{[x.id]:{step:x.step,progress:0,reward:{gold:0,exp:0}}},completed:[],items:{},visited:[],flags:{}})",{"id":q["id"],"step":index})
        pt=await ev("id=>QUEST.points().find(p=>p.id===id)",q["id"]);assert pt,"collect point"
        await ev("p=>{GAME.P.x=p.x;GAME.P.y=p.y;}",pt)
        assert await ev("""() => {
          const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,sources=new Set(Object.values(A.questItems).map(x=>x.icon));let count=0;
          proto.drawImage=function(...args){if(sources.has(args[0].src))count++;return draw.apply(this,args);};
          try{QUEST.draw();}finally{proto.drawImage=draw;}return count>0;
        }"""),"collect point uses real icon"
        assert await ev("id=>QUEST.collect(id)",q["id"])
        assert await ev("id=>QUEST.state().items[id]",step["item"])==1
        assert await pg.locator("#questItemNotice.on img").count()==1
        await ev("() => QUEST.openList()")
        assert await pg.locator("#questItems .questItem").count()==1
        assert await pg.locator(".mainQuestCard .questItem").count()>=1,"delivery card art"
        # 旧 저장 호환 및 전달 후 수량 제거. 실제 대화 완료 경로를 사용한다.
        saved=await ev("() => QUEST.saveData()")
        await ev("() => QUEST.loadData(null)");await ev("x=>QUEST.loadData(x)",saved)
        assert await ev("id=>QUEST.state().items[id]",step["item"])==1
        active_step=await ev("id=>QUEST.state().active[id].step",q["id"])
        delivery=q["steps"][active_step]
        assert delivery["type"]=="deliver","test next delivery"
        await ev("() => {GAME.closeAll();GAME.resumeLocation({map:'town',x:1104,y:1065});}")
        await pg.wait_for_timeout(800)
        await ev("no=>{const n=A.npcs.find(n=>n.no===no);GAME.P.x=n.x;GAME.P.y=n.y+16;}",delivery["npc"])
        await pg.wait_for_timeout(130);await ev("() => GAME.act()")
        await pg.locator("#dlgQuest").click()
        for _ in range(30):
            if not await pg.locator("#dlg").is_visible():break
            await pg.locator("#dlgQuest").click()
        assert await ev("id=>QUEST.state().items[id]||0",step["item"])==0,"delivery consumes"
        await ev("() => QUEST.openList()");assert await pg.locator("#questItemsBlock").is_hidden()
        # 대화로 지급하는 물품도 아이콘/알림에 연결된다.
        giver=next(q for q in data['quests'] if any(s.get('give') and s['type']=='talk' for s in q['steps']))
        give_index=next(i for i,s in enumerate(giver['steps']) if s.get('give') and s['type']=='talk')
        give_step=giver['steps'][give_index]
        await ev("(x)=>{GAME.closeAll();QUEST.loadData({schema:3,active:{[x.id]:{step:x.step,progress:0,reward:{gold:0,exp:0}}},completed:[],items:{},visited:[],flags:{}});}",{'id':giver['id'],'step':give_index})
        await ev("no=>{const n=A.npcs.find(n=>n.no===no);GAME.P.x=n.x;GAME.P.y=n.y+16;}",give_step['npc'])
        await pg.wait_for_timeout(130);await ev("() => GAME.act()")
        await pg.locator('#dlgQuest').click()
        for _ in range(30):
            if not await pg.locator('#dlg').is_visible():break
            await pg.locator('#dlgQuest').click()
        for item_id in give_step['give']:
            assert await ev('id=>QUEST.state().items[id]||0',item_id)>0,'dialogue gives item'
        await ev('() => QUEST.openList()')
        assert await pg.locator("#questItems .questItem").count()>=1
        # 작은 화면 실물 검수용 캡처는 요청된 경우에만 남긴다.
        if os.environ.get("ARPG_QA_DIR"):
            folder=Path(os.environ["ARPG_QA_DIR"]);folder.mkdir(parents=True,exist_ok=True)
            await pg.set_viewport_size({"width":844,"height":390})
            await pg.screenshot(path=str(folder/"quest-items-phone.png"))
            await pg.set_viewport_size({"width":1024,"height":768})
            await pg.screenshot(path=str(folder/"quest-items-tablet.png"))
        await ev("() => {QUEST.loadData({schema:1,items:{},active:{},completed:[]});}")
        assert await pg.locator("#questItemsBlock").is_hidden()
        assert not errors,"runtime error count "+str(len(errors))
        await browser.close()
    print("quest item art ok: 34 icons, hidden future items, collect/deliver/give, old saves, 3 viewport sizes")
if __name__=="__main__":asyncio.run(main())
