"""docs/dialogue_rewrite/rw_*.txt 를 src/story/quests.json 에 적용(검사만: --check).
형식: '### 퀘스트ID' / '[intro]' / '[step N]' 다음 줄들이 대사. 지정하지 않은 블록은 그대로 둔다."""
import json,glob,re,sys,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QP=os.path.join(ROOT,'src/story/quests.json')
d=json.load(open(QP,encoding='utf-8'))
Q={q['id']:q for q in d['quests']+d['sideQuests']}
FACES={'밝음','놀람','따짐','흐뭇','능청','뾰로통','격분','신남','못마땅','곤란','상처지침','상처담담','상처울적','상처아픔','상처미소'}
NAMES={n['name'] for n in d['npcs']}|{'토비','마르코','루나','그레타','핀','브란','하르트','에드먼','페닉스','고르던','오토','라이너','에다','미나','루크레아','카엘렌','러스티','???'}
LINE=re.compile(r'^([^:：()\n]{1,14}?)(?:\(([^)]{1,8})\))?\s*[:：]\s*(.*)$')
edits={};errs=[];warn=set()
for f in sorted(glob.glob(os.path.join(ROOT,'docs/dialogue_rewrite/rw_*.txt'))):
  qid=blk=None
  for ln in open(f,encoding='utf-8').read().splitlines():
    ln=ln.rstrip()
    if not ln:continue
    if ln.startswith('### '):qid=ln[4:].split()[0];blk=None;continue
    m=re.match(r'^\[(intro|step (\d+))\]$',ln)
    if m:blk='intro' if m.group(1)=='intro' else int(m.group(2));edits.setdefault(qid,{})[blk]=[];continue
    if qid is None or blk is None:errs.append(f'{f}: 위치 없음 {ln[:30]}');continue
    mm=LINE.match(ln)
    if mm:
      if mm.group(2) and (mm.group(1).strip()!='루크레아' or mm.group(2) not in FACES):errs.append(f'{qid} 표정 오류: {ln[:30]}')
      if mm.group(1).strip() not in NAMES:warn.add(mm.group(1).strip())
    edits[qid][blk].append(ln)
for qid,bs in edits.items():
  q=Q.get(qid)
  if not q:errs.append('없는 퀘스트 '+qid);continue
  for b,lines in bs.items():
    if b=='intro':q['intro']=lines
    else:
      if b>=len(q['steps']):errs.append(f'{qid} step {b} 없음');continue
      if not q['steps'][b].get('lines'):errs.append(f'{qid} step {b} 원래 대사 없음')
      q['steps'][b]['lines']=lines
print('퀘스트',len(edits),'오류',len(errs));[print(' ',e) for e in errs[:30]]
print('초상 없는 화자(그대로 표시):',sorted(warn))
if '--check' not in sys.argv and not errs:
  json.dump(d,open(QP,'w',encoding='utf-8'),ensure_ascii=False,indent=2);print('적용함')
