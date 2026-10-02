import base64, io, json, numpy as np
from PIL import Image
T=96  # 2x 해상도 (게임 칸 48px)
def enc(img, q=86):
    b=io.BytesIO(); img.save(b,'WEBP',quality=q,method=6); return "data:image/webp;base64,"+base64.b64encode(b.getvalue()).decode()
def tile(p, dark=None):
    im=Image.open(p).convert('RGB').resize((T,T),Image.LANCZOS)
    if dark: im=Image.fromarray((np.asarray(im).astype(float)*np.array(dark)).clip(0,255).astype(np.uint8))
    return enc(im)
def spr(p, h, **kw):
    im=Image.open(p).convert('RGBA'); H=round(h*T); W=max(1,round(im.width*H/im.height))
    d={'src':enc(im.resize((W,H),Image.LANCZOS)),'w':W/2,'h':H/2}; d.update(kw); return d
A={}
# 타일
A['tiles']={
 'grass':tile('tiles_v2/spring_grass.png'),'grass2':tile('tiles_v2/summer_grass.png'),'path':tile('tiles_v2/spring_path.png'),
 'floor':tile('dungeon/floor.png'),'floor_crack':tile('dungeon/floor_crack.png'),'floor_moss':tile('dungeon/floor_moss.png'),
 'wall_front':tile('dungeon/wall_front.png'),'wall_front_moss':tile('dungeon/wall_front_moss.png'),'wall_top':tile('dungeon/wall_top.png',(0.52,0.5,0.55)),
 'door_open':tile('dungeon/door_open.png'),'stairs_down':tile('dungeon/stairs_down.png'),'stairs_up':tile('dungeon/stairs_up.png'),
 'pit':tile('dungeon/pit.png'),'lava':tile('dungeon/lava.png'),'water':tile('dungeon/water.png')}
# 마을 오브젝트
O={}
for th in ['spring','summer']:
    O[f'{th}_tree_big']=spr(f'field_assets/objects/{th}/tree_big.png',2.6,cw=.3,ch=.35)
    O[f'{th}_tree_small']=spr(f'field_assets/objects/{th}/tree_small.png',2.1,cw=.25,ch=.3)
    O[f'{th}_bush']=spr(f'field_assets/objects/{th}/bush.png',1.1,cw=.7,ch=.35)
O['flowers']=spr('field_assets/objects/spring/flowers.png',.8)
O['rock']=spr('field_assets/objects/spring/rock_big.png',1.1,cw=.75,ch=.4)
O['fence']=spr('field_assets/objects/spring/fence_h.png',1.0,cw=.95,ch=.25)
O['sign']=spr('field_assets/objects/spring/sign.png',1.25,cw=.3,ch=.2)
for k,h,cw,ch in [('fountain',1.9,.8,.55),('bench',1.15,.85,.35),('lantern',1.9,.25,.25),('windmill',2.6,.6,.5),('birdhouse',2.0,.25,.25),
                  ('pot_tulip',1.0,.7,.35),('barrel_flower',1.1,.7,.4),('picket',1.1,.95,.25),('rabbit',.95,.6,.3),('stepping',1.2,0,0)]:
    O['g_'+k]=spr(f'garden/{k}.png',h,cw=cw,ch=ch)
O['market_stall']=spr('props/shop/market_stall.png',2.4,cw=.85,ch=.45)
O['flower_shop']=spr('props/shop/flower_shop.png',3.0,cw=.85,ch=.5)
O['hanging_sign']=spr('props/shop/hanging_sign.png',1.6,cw=.3,ch=.2)
for k,h,cw,ch in [('torch',1.05,0,0),('pillar',1.9,.5,.35),('chest_closed',.9,.8,.4),('chest_open',1.05,.8,.4),('barrel',1.0,.7,.35),
                  ('jar',.85,.6,.3),('bones',.8,0,0),('cobweb',1.0,0,0),('spike_down',.88,0,0),('spike_up',.9,0,0)]:
    O['d_'+k]=spr(f'dprops/{k}.png',h,cw=cw,ch=ch)
A['objs']=O
# 캐릭터
C={}
for c in ['elf','hero','knight','dragon']:
    fr={}
    for d in ['front','back','side']:
        ims=[Image.open(f'chars/{c}/{d}_{i}.png') for i in range(5)]
        fh=ims[0].height-20; sc=(1.9*T)/fh
        fr[d]=[enc(im.resize((round(im.width*sc),round(im.height*sc)),Image.LANCZOS)) for im in ims]
    C[c]={'frames':fr,'w':round(ims[0].width*sc)/2,'h':round(ims[0].height*sc)/2}
A['chars']=C
# 몬스터
M={}
one=[('slime_g','mon2/slime_01.png',.8),('slime_b','mon2/slime_02.png',.8),('slime_r','mon2/slime_03.png',.8),('slime_king','mon2/slime_05.png',1.9),
     ('mush_b','mon2/mushroom_01.png',1.1),('mush_r','mon2/mushroom_03.png',1.1),('skel','mon2/skeleton_06.png',1.35),('skel_sw','mon2/skeleton_02.png',1.4),
     ('skel_bow','mon2/skeleton_05.png',1.35),('goblin','mon2/goblin_01.png',1.35),('spider','mon2/spider_01.png',.95),('gargoyle','mon2/gargoyle_01.png',1.45),
     ('fire','mon2/elem_fire_01.png',1.2),('mimic','mon2/mimic_01.png',.95),('mimic_open','mon2/mimic_02.png',1.05),('bee','mon2/bug_02.png',.9)]
for k,p,h in one: M[k]=spr(p,h)
for k,h in [('orc',2.2),('rogue',1.4),('darkmage',1.5),('lich',2.4),('demon',1.8),('wolf',1.15)]:
    for d in ['left','front','right']: M[f'{k}_{d}']=spr(f'mon3/{k}_{d}.png',h)
A['mons']=M
# 무기 아이콘
W={}
for t in ['sword','bow','staff','spear','gauntlet']:
    for i in range(1,11):
        im=Image.open(f'weapons/{t}_{i:02d}.png'); s=72/max(im.size)
        W[f'{t}_{i}']=enc(im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS),88)
A['weapons']=W
# UI
U={}
for n in ['orb_red','orb_empty','orb_blue']:
    im=Image.open(f'ui2n/{n}.png'); c=Image.new('RGBA',(183,160),(0,0,0,0)); c.paste(im,(0,0),im); U[n]=enc(c.resize((137,120),Image.LANCZOS),90)
for n,s in [('btn_sword',120),('btn_boot',96),('skill_fire',96),('joystick_ring',150),('joystick_knob',66),('icon_coin',48),('icon_heart',48),('r06_01',64),('r06_12',64)]:
    im=Image.open(f'ui2n/{n}.png'); f=s/max(im.size); U[n]=enc(im.resize((round(im.width*f),round(im.height*f)),Image.LANCZOS),90)
A['ui']=U
js='const A='+json.dumps(A)+';\n'
open('rpg/assets.js','w').write(js); print(len(js)//1024,'KB')
