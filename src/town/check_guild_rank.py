import asyncio, os
from playwright.async_api import async_playwright

URL='file://'+os.path.abspath(os.path.join(os.path.dirname(__file__),'../../game/town.html'))
BOSSES=['slime_king','elem_wood','ogre_chief','wolf_chief','ice_guard_chief','dragon']
RANKS=['F','E','D','C','B','A','S']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        ev=pg.evaluate
        await pg.goto(URL);await pg.wait_for_timeout(1200)

        # 화면 요소
        assert await pg.locator('#guildMeta').count()==1
        assert await pg.locator('#guildExamBtn').count()==1
        assert await pg.locator('#guildExamBox').count()==1
        assert await pg.locator('#guildBribeBox').count()==1
        assert await pg.locator('#dlgGuildExam').count()==1

        # 04:00 경계: 03:30은 전날, 04:30은 오늘.
        k1=await ev("() => {const t=new Date(2026,0,2,3,30).getTime();return GUILD.setNow(t)}")
        assert k1=='2026-01-01',k1
        d=await ev("() => GUILD.saveData()");d['todayAccepted']=9;d['bribeCount']=2
        await ev("d=>GUILD.loadData(d)",d)
        k2=await ev("() => {const t=new Date(2026,0,2,4,30).getTime();return GUILD.setNow(t)}")
        st=await ev("() => GUILD.state()")
        assert k2=='2026-01-02' and st['todayAccepted']==0 and st['bribeCount']==0,(k2,st)

        # 10건 한도 -> 뒷거래 30/45/60% -> 최대 19건.
        await ev("() => {GUILD.setNow(new Date(2026,0,2,12,0).getTime());GAME.P.lv=15;GAME.setGold(999999);GUILD.debugSetRank(1,0)}")
        st=await ev("() => GUILD.saveData()");st['todayAccepted']=9;st['bribeCount']=0;st['active']=[];st['board']=st['board'][:6]
        await ev("d=>GUILD.loadData(d)",st)
        qid=await ev("() => GUILD.state().board[0].id")
        assert await ev("id=>GUILD.accept(id)",qid)
        assert await ev("() => GUILD.state().todayAccepted")==10
        qid=await ev("() => GUILD.state().board[0].id")
        assert not await ev("id=>GUILD.accept(id)",qid)
        fees=[]
        for accepted,cap in [(10,13),(13,16),(16,19)]:
            st=await ev("() => GUILD.saveData()");st['todayAccepted']=accepted;st['active']=[]
            await ev("d=>GUILD.loadData(d)",st)
            fee=await ev("() => GUILD.bribeFee()");fees.append(fee)
            g0=await ev("() => GAME.P.gold")
            assert await ev("() => GUILD.payBribe()")
            g1=await ev("() => GAME.P.gold")
            assert g0-g1==fee,(g0,g1,fee)
            assert await ev("() => GUILD.dailyCap()")==cap
        assert fees[0] < fees[1] < fees[2],fees
        st=await ev("() => GUILD.saveData()");st['todayAccepted']=19;st['active']=[]
        await ev("d=>GUILD.loadData(d)",st)
        assert not await ev("() => GUILD.payBribe()")

        # F→S 여섯 번: 레벨/20건/시험비/지정 보스/보고.
        await ev("() => GUILD.setNow(null)")
        fees=[]
        for rank,boss in enumerate(BOSSES):
            next_lv=(rank+1)*10+1
            await ev("([r,lv])=>{GAME.P.lv=lv;GAME.setGold(999999);GUILD.debugSetRank(r,20)}",[rank,next_lv])
            fee=await ev("() => GUILD.examFee()");fees.append(fee)
            g0=await ev("() => GAME.P.gold")
            assert await ev("() => GUILD.startExam()"),(rank,boss)
            ex=await ev("() => GUILD.state().exam")
            assert ex and ex['bossId']==boss and ex['targetRank']==rank+1,(rank,ex)
            g1=await ev("() => GAME.P.gold")
            assert g1==g0-fee,(rank,g0,fee,g1,ex)
            # 다른 보스는 통과가 아니다.
            await ev("() => GUILD.onKill({dead:true,type:'rabbit',rank:'normal'})")
            assert await ev("() => GUILD.state().exam.status")=='active'
            await ev("(b) => GUILD.onKill({dead:true,type:b,rank:'boss'})",boss)
            assert await ev("() => GUILD.state().exam.status")=='passed'
            assert await ev("() => GUILD.finishExam()")
            s=await ev("() => GUILD.state()")
            assert s['rank']==rank+1 and s['rankDone']==0,(rank,s)
        assert await ev("() => GUILD.rankName()")=='S급'
        assert fees==sorted(fees) and len(set(fees))==6,fees

        # 시험 중 실제 패배 -> 실패, 시험비 환불 없음.
        await ev("() => {GAME.P.lv=11;GAME.P.reviveArmed=false;GAME.P.reviveReadyAt=0;GAME.setGold(999999);GUILD.debugSetRank(0,20)}")
        fee=await ev("() => GUILD.examFee()");g0=await ev("() => GAME.P.gold")
        assert await ev("() => GUILD.startExam()")
        assert await ev("() => __FD.enter('spring')")
        await pg.wait_for_timeout(900)
        await ev("() => {GAME.P.reviveArmed=false;GAME.P.reviveGrace=0;__FD.hurtTest(GAME.P.maxHp*100)}")
        await pg.wait_for_timeout(850)
        ex=await ev("() => GUILD.state().exam")
        assert ex and ex['status']=='failed',ex
        # 죽음 자체의 15% 손실은 별도이므로, 최소한 시험비가 되돌아오지 않았음만 확인.
        assert await ev("() => GAME.P.gold") < g0-fee+1

        # 저장/복원: 등급·당일 횟수·뒷거래·시험 유지.
        await ev("() => {GUILD.setNow(null);GAME.P.lv=51;GAME.setGold(999999);GUILD.debugSetRank(4,20)}")
        assert await ev("() => GUILD.startExam()")
        d=await ev("() => GUILD.saveData()");d['todayAccepted']=13;d['bribeCount']=1
        await ev("d=>GUILD.loadData(d)",d);await ev("() => UI.save()")
        await pg.reload();await pg.wait_for_timeout(1200)
        s=await ev("() => GUILD.state()")
        assert s['rank']==4 and s['rankDone']==20 and s['todayAccepted']==13 and s['bribeCount']==1,s
        assert s['exam'] and s['exam']['bossId']=='ice_guard_chief' and s['exam']['status']=='active',s

        # 옛 길드 저장(rank 없음)은 현재 레벨 티어에 맞춰 이관.
        await ev("""() => {GAME.P.lv=35;GUILD.loadData({seq:9,board:[],active:[],completed:12});}""")
        s=await ev("() => GUILD.state()")
        assert s['rank']==3,s

        assert not errs,errs
        print('guild rank F-S ok',{'ranks':RANKS,'fees':fees,'bribes':fees})
        await b.close()

asyncio.run(main())
