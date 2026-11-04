"""GPT 선물 코믹 인물 시트(길드용·마을용)를 한 명씩 잘라 게임 인물과 같은 크기·윤곽선으로 만든다.

사용: python3 src/town/make_comic_sprites.py <길드 시트.png> <마을 시트.png>
결과: assets_private/gaia_comic/guild_0..N.png, town_0..N.png  (2배 해상도, 게임에서는 절반 크기로 그린다)
수위가 있는 그림이라 공개 저장소에는 올리지 않는다(assets_private 는 .gitignore).

처리: 알파>40 덩어리로 인물을 나누고(작은 점 제거), 가장자리 붉은 번짐은 안쪽 색으로 덮고,
시트마다 기준 인물 한 명을 SD 높이 104px(2배=208)로 맞춘 배율을 전체에 적용한 뒤 2px 짙은 갈색 윤곽선을 둘러
기존 SD 인물(접수원·용병)과 같은 느낌으로 만든다.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SP = ROOT / "assets_private" / "gaia_comic"
OUTLINE = np.array((50, 32, 27)) / 255
SD_H = 104


def cut(path,sheet,target_h_of_ref,ref_idx):
    im=Image.open(path).convert('RGBA');a=np.array(im).astype(np.uint8);al=a[:,:,3]
    m=al>40
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=7))
    comps=[]
    for i in range(1,n+1):
        ys,xs=np.where((lab==i)&m)
        if len(ys)<3000:continue
        comps.append(dict(box=(xs.min(),ys.min(),xs.max()+1,ys.max()+1),lab=i))
    comps.sort(key=lambda c:(c['box'][1]//300,c['box'][0]))
    f=target_h_of_ref/(comps[ref_idx]['box'][3]-comps[ref_idx]['box'][1])
    out=[]
    for k,c in enumerate(comps):
        x0,y0,x1,y1=c['box'];pad=10
        x0=max(0,x0-pad);y0=max(0,y0-pad);x1=min(im.width,x1+pad);y1=min(im.height,y1+pad)
        sub=a[y0:y1,x0:x1].copy();mask_lab=(lab[y0:y1,x0:x1]==c['lab'])
        al=sub[:,:,3].astype(float)
        keep=(al>40)&ndi.binary_dilation(mask_lab,iterations=1)
        # 가장자리 색 번짐 제거: 안쪽(알파 높음)의 가장 가까운 색으로 가장자리 색을 바꾼다
        core=ndi.binary_erosion((al>200)&keep,iterations=2)
        idx=ndi.distance_transform_edt(~core,return_distances=False,return_indices=True)
        rgb=sub[:,:,:3].copy()
        band=keep&~core
        rgb[band]=sub[:,:,:3][idx[0][band],idx[1][band]]
        alpha=np.clip((al-40)/(200-40),0,1)*keep
        alpha=ndi.gaussian_filter(alpha,.6)
        box=np.argwhere(alpha>.05);yb0,xb0=box.min(0);yb1,xb1=box.max(0)+1
        rgb=rgb[yb0:yb1,xb0:xb1];alpha=alpha[yb0:yb1,xb0:xb1]
        h0,w0=alpha.shape;th=max(8,round(h0*f*2));tw=max(8,round(w0*f*2))   # 2배 해상도로 저장
        pre=np.dstack([rgb/255*alpha[...,None],alpha])
        small=np.array(Image.fromarray((pre*255).astype('uint8'),'RGBA').resize((tw,th),Image.LANCZOS)).astype(float)/255
        al2=small[...,3];c2=np.where(al2[...,None]>1e-3,small[...,:3]/np.maximum(al2[...,None],1e-3),0)
        solid=al2>.5;grown=ndi.binary_dilation(solid,structure=ndi.generate_binary_structure(2,2),iterations=2)
        soft=ndi.gaussian_filter(grown.astype(float),.6)
        a_f=al2[...,None];a_b=np.clip(soft,0,1)[...,None]
        ao=a_f+a_b*(1-a_f)
        rgbo=np.where(ao>1e-4,(c2*a_f+OUTLINE*a_b*(1-a_f))/np.maximum(ao,1e-4),0)
        res=np.dstack([np.clip(rgbo,0,1),np.clip(ao,0,1)])
        # 바깥 2px 윤곽선 때문에 사방 3px 여백
        img=Image.fromarray((res*255).astype('uint8'),'RGBA')
        fn = f'{sheet}_{k}.png'; img.save(SP / fn); out.append((fn, img.size))
    return out


if __name__ == "__main__":
    SP.mkdir(parents=True, exist_ok=True)
    print(cut(sys.argv[1], "guild", SD_H, 0))   # 길드 시트: 기사(0번)를 기준 높이로
    print(cut(sys.argv[2], "town", SD_H, 1))    # 마을 시트: 흰 머리 아가씨(1번)를 기준 높이로
