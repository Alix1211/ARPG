"""현자의 숙소: 원본 그림을 보존하고 빌드 시 배치·프레임 분할."""
from PIL import Image
import numpy as np
import os

def prepare(root, R, TS, enc, assets, ports):
    folder=os.path.join(root,'source_sheets','sage')
    def clean(im):
        a=np.array(im.convert('RGBA'))
        # 생성 시트의 거의 투명한 배경 잔여만 제거. 캐릭터 색은 건드리지 않는다.
        a[:,:,3][a[:,:,3]<12]=0
        return Image.fromarray(a)
    estate=clean(Image.open(os.path.join(folder,'residence.png')))
    mw,mh=30,22; size=(mw*TS,mh*TS)
    tile=Image.open(R+'tiles/spring/grass.png').convert('RGB').resize((TS,TS))
    ground=Image.new('RGB',size)
    for y in range(0,size[1],TS):
        for x in range(0,size[0],TS):ground.paste(tile,(x,y))
    estate=estate.resize((1380,920),Image.Resampling.LANCZOS)
    ground.paste(estate,(30,20),estate)
    sheet=clean(Image.open(os.path.join(folder,'master_idle.png')))
    cw,ch=sheet.width//3,sheet.height//2
    frames=[sheet.crop((i%3*cw,i//3*ch,(i%3+1)*cw,(i//3+1)*ch)) for i in range(6)]
    boxes=[im.getchannel('A').getbbox() for im in frames]
    box=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    frames=[im.crop(box) for im in frames];h=142;w=h*frames[0].width/frames[0].height
    keys=[]
    for i,im in enumerate(frames):
        k='sage_idle_'+str(i);assets[k]=enc(im.resize((round(w*2),h*2),Image.Resampling.LANCZOS),90);keys.append(k)
    ports[keys[0]]=enc(frames[0],90)
    # 저택 전체는 진입 금지. 앞쪽과 오른쪽 수련 마당은 비워 둔다.
    poly=[(30+1380*x,20+920*y) for x,y in [(0,0),(.54,0),(.64,.38),(.60,.56),(.45,.60),(.28,.64),(0,.67)]]
    npc=dict(k=keys[0],name='셀레네',title='은둔한 고대 엘프 · 무예 스승',x=880,y=650,w=w,h=h,
             line='어서 오렴. 먼 길을 걸었지? 앉아서 숨부터 돌려. 찻물은 방금 올렸단다.',shop='sage',at=None,idle=keys)
    return dict(name='현자의 숙소',map=dict(w=mw,h=mh,ts=TS,px=TS),ground=enc(ground,88),mini=enc(ground.resize((180,132)),85),
                blds=[],props=[],npcs=[npc],spawn=[1190,910],blockPolygons=[poly],
                exits=[dict(x0=1110,x1=1360,y0=970,y1=1056,to='out',pos=[15*TS,17.7*TS],dir='back')])
