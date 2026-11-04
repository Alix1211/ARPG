#!/usr/bin/env python3
"""가이아 퀘스트 각색 대사(docs/gaia_quest_adapted_kyle.md)를 src/story/quests.json 에 넣는다.
바꾸는 것은 의뢰 대사(intro)와 단계별 대사(steps[].lines)뿐. 흐름·목표·보상·단계 종류는 그대로 둔다.
문서의 [※] 표시는 떼고 넣는다. 사용: python3 tools/apply_gaia_quest_text.py [--write]"""
import json, re, sys, copy, collections
MD='docs/gaia_quest_adapted_kyle.md'; QJ='src/story/quests.json'
md=open(MD,encoding='utf-8').read().split('\n')
Q={}; cur=None; sec=None
for ln in md:
    m=re.match(r'^## \[((?:MAIN|SIDE)_\d+)\]\s*(.*)$',ln)
    if m: cur=Q[m.group(1)]={'title':m.group(2).strip(),'intro':[],'steps':{}}; sec=None; continue
    if cur is None: continue
    if ln.startswith('[의뢰 대사]'): sec=('intro',); continue
    m=re.match(r'^\[단계(\d+) · (\w+)(?: · (.*))?\]\s*$',ln)
    if m:
        n=int(m.group(1)); cur['steps'][n]={'type':m.group(2),'head':m.group(3) or '','lines':[]}; sec=('step',n); continue
    if ln.startswith('시작:') or ln.startswith('보상:') or ln.startswith('## '): sec=None; continue
    if sec and ln.startswith('  ') and ln.strip():
        t=ln[2:].replace('[※]','').rstrip()
        (cur['intro'] if sec[0]=='intro' else cur['steps'][sec[1]]['lines']).append(t)
d=json.load(open(QJ,encoding='utf-8')); orig=copy.deepcopy(d)
problems=[]; stat=collections.Counter()
for q in d['quests']+d['sideQuests']:
    a=Q.get(q['id'])
    if not a: problems.append(f"{q['id']}: 각색 문서에 없음"); continue
    if a['title']!=q['title']: problems.append(f"{q['id']}: 제목 다름 문서='{a['title']}' 게임='{q['title']}' (게임 제목 유지)")
    if not a['intro']: problems.append(f"{q['id']}: 의뢰 대사 비어 있음")
    else: q['intro']=a['intro']; stat['intro']+=1
    if len(a['steps'])!=len(q['steps']): problems.append(f"{q['id']}: 단계 수 다름 문서={len(a['steps'])} 게임={len(q['steps'])}")
    for i,s in enumerate(q['steps'],1):
        b=a['steps'].get(i)
        if not b: problems.append(f"{q['id']} 단계{i}: 문서에 없음"); continue
        if b['type']!=s['type']: problems.append(f"{q['id']} 단계{i}: 종류 다름 문서={b['type']} 게임={s['type']}")
        if 'lines' in s or b['lines']:
            if not b['lines'] and 'lines' in s: problems.append(f"{q['id']} 단계{i}: 게임에는 대사가 있는데 문서에 없음")
            elif b['lines'] and 'lines' not in s: problems.append(f"{q['id']} 단계{i}: 문서에만 대사가 있음({s['type']})")
            elif b['lines']: s['lines']=b['lines']; stat['lines']+=1
extra=[k for k in Q if k not in {x['id'] for x in orig['quests']+orig['sideQuests']}]
if extra: problems.append('문서에만 있는 퀘스트: '+','.join(extra))
# 구조 불변 검사: 대사 외 모든 것이 그대로인지
def strip(x):
    x=copy.deepcopy(x)
    for q in x['quests']+x['sideQuests']:
        q.pop('intro',None)
        for s in q['steps']: s.pop('lines',None)
    return x
same=strip(orig)==strip(d)
print('넣은 의뢰 대사:',stat['intro'],'/ 넣은 단계 대사:',stat['lines'],'/ 대사 외 구조 동일:',same)
print('문제',len(problems),'건'); [print(' -',p) for p in problems[:40]]
SKIP=('제목 다름','문서에만 대사가 있음')   # 처치·수집·보스·거래 단계는 대사 칸이 없어 문서의 추임새 한 줄은 넣지 않는다
if '--write' in sys.argv and same and not [p for p in problems if not any(k in p for k in SKIP)]:
    json.dump(d,open(QJ,'w',encoding='utf-8'),ensure_ascii=False,indent=2); open(QJ,'a').write('\n'); print('저장함')
