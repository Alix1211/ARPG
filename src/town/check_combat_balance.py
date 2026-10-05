"""전투 목표 검사: 실제 게임 함수를 실행해 같은 티어 일반 장비의 수치를 측정한다. 미확인 옵션 필터도 함께 로드한다."""
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
    # 2026-10-05 실플레이 기준: 기존 T2 동굴 7~8층 체감을 일반 기준으로 올려 몬스터 HP/공격을 2배로 재설정.
    # 순수 평타·명중100% 시뮬레이션은 실제 스킬/회피 플레이보다 길고 위험하게 나온다.
    assert 0.4 <= seconds <= 22.0, (lv, seconds)
    # 이동·넉백·회피 없이 계속 맞는 상한. 사망 가능한 값도 정상이며 폭주 회귀만 막는다.
    loss = sum(r['hpLoss'] for r in melee) / 3
    assert 1 <= loss <= 340, (lv, loss)
print('balance ok: 실플레이 재기준(일반 HP/공격 2배) 회귀 범위 확인')
