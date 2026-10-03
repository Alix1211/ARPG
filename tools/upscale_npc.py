import sys,torch,numpy as np,spandrel,os
from PIL import Image
from scipy import ndimage as nd
torch.set_num_threads(os.cpu_count())
m=spandrel.ModelLoader().load_from_file('anime6b.pth').eval()
def run(arr):  # HxWx3 float 0..1
    t=torch.from_numpy(arr).permute(2,0,1)[None].float()
    with torch.no_grad(): o=m(t)
    return o[0].permute(1,2,0).clamp(0,1).numpy()
for i in range(int(sys.argv[1]),int(sys.argv[2])+1):
    out=f'../assets/npc_hd/npc_{i:02d}.png'
    if os.path.exists(out): continue
    im=np.array(Image.open(f'../assets/npc/npc_{i:02d}.png').convert('RGBA')).astype(np.float32)/255
    rgb,a=im[...,:3],im[...,3]
    # 투명한 곳은 가장 가까운 불투명 색으로 채워 가장자리 번짐 방지
    idx=nd.distance_transform_edt(a<0.5,return_distances=False,return_indices=True)
    fill=rgb[idx[0],idx[1]]
    big=run(fill); ab=run(np.repeat(a[...,None],3,2)).mean(2)
    H,W=a.shape
    res=np.dstack([big,ab]); img=Image.fromarray((res*255).round().astype(np.uint8),'RGBA').resize((W*2,H*2),Image.LANCZOS)
    img.save(out); print(i,flush=True)
