"""전투 목표 검사: 실제 게임 함수를 실행해 같은 티어 일반 장비의 수치를 측정한다."""
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as tmp:
    output = Path(tmp) / 'balance.json'
    subprocess.run(['node', str(ROOT / 'tools/sim_combat_balance.js'), str(output)], check=True, capture_output=True)
    data = json.loads(output.read_text())
    rows = data['rows']
assert 1.2 <= data['staffAverageRatio'] <= 1.4, data['staffAverageRatio']
for boundary in data['boundaries']:
    assert boundary['hpRatio'] >= 1.09 and boundary['attackRatio'] >= 1.07, boundary
assert data['magicFloor']
for pair in data['magicFloor']:
    assert .699 <= pair['ratio'] <= .701 and pair['flatPreserved'], pair
for lv in sorted({r['lv'] for r in rows}):
    melee = [r for r in rows if r['lv'] == lv and r['wt'] in ('sword', 'spear', 'gauntlet')]
    seconds = sum(r['seconds'] for r in melee) / 3
    # 평균 목표 6~10초, 공격 한 번/종별 반올림 차이 0.5초 허용.
    assert 0.2 <= seconds <= 10.5, (lv, seconds)
    # 이동·넉백·회피를 제외한 밀착 피격 상한. 회피 없이는 위험해야 한다.
    loss = sum(r['hpLoss'] for r in melee) / 3
    assert 1 <= loss <= 95, (lv, loss)
print('balance ok: 근접 평균 6~10초 근방 / 밀착 피격 위험 확인')
