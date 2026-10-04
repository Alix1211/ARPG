# GPT 작업 지시서 — 아직 안 만든 스킬 12개 구현 (케인 지시 2026-10-04)

먼저 읽을 것: `AGENTS.md`(특히 §9 빠른 수정 루프), `docs/STATUS.md`, `docs/WORKLOG.md`, `docs/skills_design.md`, `docs/stats_skills.md`. 케인은 프로그래머가 아니다. 존댓말(격식체)로, 결과와 케인이 할 일만 짧게 보고한다.

## 1. 만들 스킬 (현재 `src/town/ui.js`의 `IMPLEMENTED`에 없는 것)
| 줄 | ID | 이름·성격 (docs/skills_design.md 「제안안 v1」 표를 그대로 따른다) |
|---|---|---|
| 얼음 | ice3 | 극야의 눈보라 (자기 주변 지속 다단 눈보라) |
| 뇌전 | bolt3 | 천벌의 뇌우 (전방 직선 낙뢰 3연속) |
| 암흑 | dark2 | 고통의 늪 (지정 위치 장판, 둔화+도트) |
| 백마법 | holy2_shield | 성역의 방패 (피해 흡수막) |
| 백마법 | holy3_revive | 기적의 소생 (사망 시 제자리 부활) |
| 창 | spear1, spear2, spear3 | 연속 찌르기 / 투창 강타 / 강하 찌르기 |
| 활 | bow1, bow3 | 표의 bow1, bow3 항목 |
| 무투 | fist1, fist3 | 표의 fist1, fist3 항목 |

- 표의 피해·마나·쿨타임·레벨 성장은 **시작값**이다. 케인이 해보고 숫자로 고친다. 과하게 고민하지 말고 표대로 넣는다.
- `docs/skills_design.md` 19행의 "22개 미구현"은 오래된 문장이다. 실제로는 위 12개만 남았다. 끝나면 이 문장도 고친다.
- holy3_revive의 대가는 미정이다. **임시값**: 부활 시 체력 30%로 시작, 레벨이 오를수록 비율 증가, 쿨타임 180초. 임시값이라고 보고에 적는다.
- 상태이상 '마비'는 아직 없다. bolt3 Lv5 마비는 기존 `stun`/`stagger` 같은 장치가 있으면 그것을 쓰고, 없으면 짧은 이동불가로 대신한다.

## 2. 만드는 방법
- 이미 만든 스킬(fire2, fire3, ice2, bolt1, bolt2, dark1, dark3, bow2, fist2, ice1 보호막, holy1_heal, sword1~3)을 **먼저 읽고 같은 방식으로** 만든다. `grep -n "bolt2\|dark3" src/town/*.js`로 SK 표, 시전 분기, 이름·설명(`SKN`, `SKD`), `IMPLEMENTED`, `SKG` 위치를 찾는다.
- 새 파일을 만들지 말고 기존 구조에 끼운다. 존재 확인 없이 새 시스템을 만들지 않는다.
- 기본 무기 공격 `WB` 표와 몬스터 수치(`data/tier_match.json`)는 건드리지 않는다. 케인이 직접 맞추는 중이다.
- 피해는 기존 스킬이 쓰는 공식(스킬 배율, 속성 보정)을 그대로 쓴다. 몬스터 체력이 최근 1/9로 낮아졌으니, 새 스킬이 같은 줄 기존 스킬보다 지나치게 세거나 약하지 않은지 `check_combat_balance.py`와 `tools/sim_combat_balance.js`로 한 번 본다.
- 퀵슬롯 규칙은 `docs/skills_design.md` 「규칙」을 따른다(든 무기에 맞는 스킬 최대 3 + 다른 무기 2).
- `TEST_UNLOCK_ALL_SKILLS`는 **false로 둔다.** 테스트가 필요하면 검사 스크립트 안에서만 임시로 켠다.

## 3. 이펙트 (중요 — 방식이 바뀌었다)
- 이펙트 그림 시트를 새로 만들거나 `assets/vfx`에 그림을 추가하지 않는다. 폭발·타격·번개·장판은 `src/town/vfx.js`의 코드 그리기 함수를 쓴다.
  - `vfxBlast(kind, seed, x, gy, R, k)` — 폭발. kind: `fire` `ice` `volt` `dark` `poison`
  - `vfxHitSpark(seed, x, y, R, k, 'hit'|'crit'|'hurt')` — 타격 불꽃
  - `vfxZig(...)` — 번개 줄기, `vfxFlame(...)` — 불꽃 장판, `vfxDust(...)` — 먼지
  - 새 효과 종류는 `vfxSkill`의 switch와 `VFX_DUR`에 이름과 지속시간을 추가한다. 쓰는 예는 `fireburst` `firestorm` `frostwave`.
- 바닥에 깔리는 층(마법진·장판)은 `vfxGroundPass`/`vfxZonesGround`, 위 층은 `vfxZonesTop`에 있다. 지속 장판(고통의 늪, 눈보라)은 `zones` 방식(`meteor`, `voidring` 구현 참고).
- 검·창·활·주먹의 베기 모양은 기존 `slashpower`/`spinpower` 방식(그림 시트 `hit_slash_*`)을 재사용해도 된다.
- 소리는 **다른 작업(GPT 사운드 담당)** 이 `sound.js`/`bgm.js`에서 하고 있다. 이 작업에서는 소리 파일을 건드리지 않는다.

## 4. 검사·기록
- `python3 src/town/build.py` 후 `check_skills.py`, `check_skill.py`, `check_combat.py`, `check_combat_balance.py`, `check_vfx.py`, `check_control.py`를 돌린다. 새 스킬마다 `check_skills.py`에 "배우면 퀵슬롯에 들어가고, 쓰면 마나가 줄고, 쿨타임이 돈다" 항목을 추가한다.
- 오류 없이 모든 스킬이 쓰이는지, 이펙트가 화면에 그려지는지 `check_vfx.py` 방식으로 확인한다(`__VFX.spawn`).
- 끝날 때마다 `docs/WORKLOG.md` 맨 아래에 작업일지를 추가한다. `docs/STATUS.md`의 스킬 현황과 `docs/skills_design.md`의 구현 목록을 고친다.
- 빌드 결과물 `game/`은 직접 커밋하지 않는다(봇이 올린다).

## 5. 올리는 순서
묶음별로 만들고 묶음마다 push한다. **push 후 빌드가 끝날 때까지(약 5분) 다음 push를 하지 않는다**(빌드가 건너뛰어진다).
1. 마법: ice3, bolt3, dark2
2. 백마법: holy2_shield, holy3_revive
3. 무기: spear1~3, bow1, bow3, fist1, fist3

## 6. 보고 형식 (케인에게)
- 만든 스킬 이름과 쓰는 법을 한 줄씩
- 임시로 정한 값(특히 부활 대가)
- 케인이 확인할 것(어느 판 번호부터 반영되는지, 어떤 무기·스킬 포인트로 해보면 되는지)
- 숫자 조정은 케인이 "마나 절반, 쿨타임 3초"처럼 말하면 한 번에 묶어서 고친다.
