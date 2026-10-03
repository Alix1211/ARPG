"""승인된 부족 시트 자르기. 그림을 바꾸지 않고 투명 여백/크기를 정규화한다."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]

def slice_sheet(source,cols,rows,paths):
 im=Image.open(source).convert('RGBA'); a=np.array(im.getchannel('A'))
 # 생성 시트의 줄 간 실제 투명 틈을 찾아 각 개체의 뿔/지팡이를 자르지 않는다.
 cuts=[0]
 for r in range(1,rows):
  expected=round(im.height*r/rows);radius=round(im.height/rows*.18)
  scores=(a[max(cuts[-1]+1,expected-radius):expected+radius]>24).sum(axis=1)
  low=max(cuts[-1]+1,expected-radius)
  best=np.flatnonzero(scores==scores.min());cut=low+int(best[np.argmin(abs(best+low-expected))]);cuts.append(cut)
 cuts.append(im.height)
 previews=[]
 for r in range(rows):
  for c in range(cols):
   box=(round(im.width*c/cols),cuts[r],round(im.width*(c+1)/cols),cuts[r+1]);tile=im.crop(box)
   # 저알파 잔광은 유지하며 희미한 먼 점만 bbox 판단에서 제외.
   mask=tile.getchannel('A').point(lambda x:255 if x>16 else 0);bbox=mask.getbbox()
   if not bbox:raise ValueError(f'빈 칸 {r},{c}')
   tile=tile.crop(bbox);tile.thumbnail((204,204),Image.Resampling.LANCZOS)
   canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(tile,((256-tile.width)//2,(256-tile.height)//2))
   path=ROOT/paths[r*cols+c];path.parent.mkdir(parents=True,exist_ok=True);canvas.save(path)
   previews.append(canvas)
 sheet=Image.new('RGBA',(cols*256,rows*256))
 for i,t in enumerate(previews):sheet.alpha_composite(t,((i%cols)*256,(i//cols)*256))
 sheet.save(source.with_name(source.stem+'_normalized.png'))
 return paths

if __name__=='__main__':
 source=ROOT/'source_sheets/tier_match';manifest={}
 manifest['E1']=slice_sheet(source/'sheet_tier_accessories_gap_v1.png',2,2,[f'assets/accessories/{s}.png' for s in ['ring_green_bead','neck_green_bead','ring_ice','neck_ice']])
 ids=['skeleton_mage','skeleton_frost','ice_guard','slime_toxic','spider_toxic','mushroom_toxic','skeleton_swamp','swamp_mage']
 manifest['M1']=slice_sheet(source/'sheet_tier_monsters_gap_v1.png',3,8,[f'assets/monsters_3dir/{s}_{d}.png' for s in ids for d in ['front','left','right']])
 ids=['mimic_iron','mimic_frost','mimic_crystal','mimic_lava','mimic_swamp']
 manifest['M2']=slice_sheet(source/'sheet_tier_mimics_gap_v1.png',2,5,[f'assets/monsters/{s}_{d}.png' for s in ids for d in ['closed','open']])
 # orc_08은 두 오우거 동작이 한 파일에 들어 있다. 실물 투명 틈 x166~173을 기준으로 분리한다.
 im=Image.open(ROOT/'assets/monsters/orc_08.png').convert('RGBA')
 manifest['ogre_reserve']=[]
 for n,box in enumerate([(0,0,170,im.height),(170,0,im.width,im.height)],1):
  tile=im.crop(box);tile=tile.crop(tile.getchannel('A').getbbox())
  path=f'assets/monsters/ogre_club_pose_{n}.png';tile.save(ROOT/path);manifest['ogre_reserve'].append(path)
 (source/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('승인표 부족 에셋38개 + 오우거 예비 동작2개 자르기 완료')
