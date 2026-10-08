"""승인된 투명 배경 6x6 시트를 34개 256px 아이콘과 정규 격자 시트로 자른다."""
import argparse,json,shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("source",type=Path)
    args=parser.parse_args()
    spec=json.loads((ROOT/"src/story/quest_items.json").read_text(encoding="utf-8"))
    source=Image.open(args.source).convert("RGBA")
    assert source.getchannel("A").getextrema()[0]==0,"transparent source required"
    cols,rows,size=spec["columns"],spec["rows"],spec["cellSize"]
    target=ROOT/"assets/quest_items";target.mkdir(parents=True,exist_ok=True)
    sheets=ROOT/"source_sheets/quests";sheets.mkdir(parents=True,exist_ok=True)
    raw=sheets/"quest_items_generated.png"
    if args.source.resolve()!=raw.resolve():shutil.copy2(args.source,raw)
    sheet=Image.new("RGBA",(cols*size,rows*size))
    cells=set()
    for item in spec["items"]:
        cell=item["cell"];assert cell not in cells;cells.add(cell)
        col,row=cell%cols,cell//cols
        bounds=(round(col*source.width/cols),round(row*source.height/rows),round((col+1)*source.width/cols),round((row+1)*source.height/rows))
        crop=source.crop(bounds)
        bbox=crop.getchannel("A").point(lambda a:255 if a>=16 else 0).getbbox()
        assert bbox is not None,"empty occupied cell"
        crop=crop.crop(bbox);crop.thumbnail((208,208),Image.Resampling.LANCZOS)
        icon=Image.new("RGBA",(size,size))
        icon.alpha_composite(crop,((size-crop.width)//2,(size-crop.height)//2))
        icon.save(target/(item["id"]+".png"),optimize=True)
        sheet.alpha_composite(icon,(col*size,row*size))
    assert len(cells)==34
    for cell in range(cols*rows):
        if cell in cells:continue
        col,row=cell%cols,cell//cols
        crop=source.crop((round(col*source.width/cols),round(row*source.height/rows),round((col+1)*source.width/cols),round((row+1)*source.height/rows)))
        assert crop.getchannel("A").point(lambda a:255 if a>=32 else 0).getbbox() is None,"expected empty cell"
    sheet.save(sheets/"quest_items.png",optimize=True)
    print("quest item art: 34 transparent icons, 256x256, 6x6 sheet, 2 empty cells")
if __name__=="__main__":main()
