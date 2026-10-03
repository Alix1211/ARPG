# 몬스터·장비 이미지 ↔ 이름 ↔ 레벨 ↔ 티어 전수 대조표

**상태: 케인 표 승인 후 4단계 코드 반영·자동 검사22개·게임 게시 완료.**

조사 코드 기준: `669734c62d308f5118eb2e9694e6551d0e3f266b`. 푸시 전 최신 main `08448b3be9af7b097149381ca187f2ff0295dc8c`까지 갱신했으며, 사이 변경은 다른 작업의 문서만으로 조사 코드·에셋은 동일합니다. 조사일: 2026-10-04, 한국시간. A·B의 “현재”는 조사 당시(반영 전) 기록입니다. 승인 후 런타임은 B의 새 기초 이름·티어·착용 레벨과 C2~C4의 배치를 사용합니다.

**반영 전 조사 요약:** 몬스터126장·장비180장 전수 확인. 현재 사용 장비140장 중84장 이름 불일치(이름 매핑144건 중86건). 부족 그림은3개 시트38칸. 일반 무리와120% 우두머리 군집을 포함합니다.

빠른 이동: [현재 몬스터](#a-몬스터-전수-조사) · [장비 전체 표](#b-장비-이미지-180장현재-이름-전수-대조) · [승인용 배치](#c2-승인용-개체-id이름레벨지역등급) · [군집](#c4-군집-배치-케인-추가-확정-2026-10-04) · [부족 시트](#d-부족-이미지-시트-요청서)

## 0. 확인 방법과 결론

지정 순서대로 AGENTS → STATUS → WORKLOG 최근 항목 → progression → asset_rules·economy를 직접 읽었습니다. `src/town/build.py`, `field_dungeon.js`, `dungeon.js`, `ui.js`, `town.js`, `guild.js`의 실제 로딩·출현·이름·상점·저장 경로를 대조했습니다. 대상 PNG **306장 전체**를 10개 확인용 시트로 모아 열었고, 혼동되는 무기·몬스터는 확대해서 다시 확인했습니다. 아래 파일 링크는 저장소 원본입니다. 파일 번호·README의 옛 단계 설명은 강함의 근거로 쓰지 않았습니다.

| 조사 범위 | 실제 PNG 수 | 게임에서 로딩하는 수 | 비고 |
|---|---|---|---|
| monsters | 75 | 9 | 계열별 대표 한 장만 로딩 |
| monsters_3dir | 33 | 33 | 11종 × 정면·좌·우. 9종만 실제 출현 |
| monsters_v1 | 18 | 0 | 현 town 런타임 미사용, 옛 시험판 그림 |
| armor | 120 | 80 | 10종형 80장 사용, tier_* 40장 미사용 |
| weapons | 50 | 50 | 5계열 × 10장 |
| accessories | 10 | 10 | T6·T7도 다섯 번째 이미지 재사용 |

핵심 문제: (1) 동작·방향 그림을 성장 단계로 취급하면 잘못된 배치가 됩니다. (2) `orc`는 런타임에서 녹색 중무장 오크지만 `monsters/orc_*`는 갈색 오우거형입니다. (3) 마법사 후드·로브까지 투구·갑옷으로 부르고, 모든 슬롯에 같은 `나무/철/기사의/번개`를 붙입니다. (4) 모든 3의 배수 던전층에 똑같은 리치가 나옵니다. (5) 착용 레벨 제한이 없습니다. (6) 상점 방어구는 기사 이미지로 보여 준 뒤 구매 시 기사/마법사 이미지를 무작위 선택합니다.

**장비 이름·이미지 불일치 수는 B절의 집계표에 명시합니다.** 미사용 이미지를 잘못된 이름 건수에 섞지 않고, 동일 이미지에 T5/T6/T7 서로 다른 이름이 붙는 경우는 이름 매핑 건수로 별도 셉니다.

## 1. 공통 티어 기준 (progression.md와 동일)

| 티어 | 지역 | 권장 레벨 | 던전 층 | 신규 장비 최소 착용 레벨 |
|---|---|---|---|---|
| 1 | 봄 초원 | 1~10 | 1~3 | 1 |
| 2 | 여름 숲 | 11~20 | 4~6 | 11 |
| 3 | 가을 들판 | 21~30 | 7~9 | 21 |
| 4 | 겨울 설원 | 31~40 | 10~12 | 31 |
| 5 | 얼음 지대 | 41~50 | 13~15 | 41 |
| 6 | 화산 지대 | 51~60 | 16~18 | 51 |
| 7 | 늪지대 | 61~70 | 19층 이후 | 61 |

지역은 레벨로 잠그지 않습니다. 장비의 `티어`(지역 성장), `외형 ID`(실물 종류), `희귀도`(옵션 개수), `착용 레벨`은 서로 다른 값입니다. 10단계 외형 번호를 곧바로 7티어로 환산하지 않습니다. 이하 각 장비 행의 배정 티어·착용 레벨이 명시적 기준입니다. 같은 티어 안에 여러 외형을 둘 수 있지만 하나의 외형을 서로 다른 티어의 새 드랍으로 중복 배정하지 않습니다.

## A. 몬스터 전수 조사

### A1. 현재 코드 ID·표시 이름·실제 이미지

| 현재 코드 ID | 현재 표시 이름¹ | 사용/로딩 이미지 파일 | 현재 출현 코드² | 현재 수치 | 제안 배정 티어 | 제안 구분 |
|---|---|---|---|---|---|---|
| `wolf` | 늑대 | [wolf_front.png](../../assets/monsters_3dir/wolf_front.png)<br>[wolf_left.png](../../assets/monsters_3dir/wolf_left.png)<br>[wolf_right.png](../../assets/monsters_3dir/wolf_right.png) | F1, F2, F4, D2 | 기초 HP 38 / 공격 5; 실제값 A2 | T4 | 일반 |
| `rabbit` | 토끼 | [rabbit_front.png](../../assets/monsters_3dir/rabbit_front.png)<br>[rabbit_left.png](../../assets/monsters_3dir/rabbit_left.png)<br>[rabbit_right.png](../../assets/monsters_3dir/rabbit_right.png) | F1 | 기초 HP 18 / 공격 3; 실제값 A2 | T1 | 일반 |
| `bear` | 곰 | [bear_front.png](../../assets/monsters_3dir/bear_front.png)<br>[bear_left.png](../../assets/monsters_3dir/bear_left.png)<br>[bear_right.png](../../assets/monsters_3dir/bear_right.png) | F2, F4, D4 | 기초 HP 76 / 공격 9; 실제값 A2 | T2 | 정예 |
| `orc` | 오크 | [orc_front.png](../../assets/monsters_3dir/orc_front.png)<br>[orc_left.png](../../assets/monsters_3dir/orc_left.png)<br>[orc_right.png](../../assets/monsters_3dir/orc_right.png) | F3, F6, D3, D6 | 기초 HP 58 / 공격 7; 실제값 A2 | T6 | 일반 |
| `harpy` | 하피 | [harpy_front.png](../../assets/monsters_3dir/harpy_front.png)<br>[harpy_left.png](../../assets/monsters_3dir/harpy_left.png)<br>[harpy_right.png](../../assets/monsters_3dir/harpy_right.png) | F7, D5, D7 | 기초 HP 44 / 공격 6; 실제값 A2 | T3 | 정예 |
| `rogue` | 로그 | [rogue_front.png](../../assets/monsters_3dir/rogue_front.png)<br>[rogue_left.png](../../assets/monsters_3dir/rogue_left.png)<br>[rogue_right.png](../../assets/monsters_3dir/rogue_right.png) | F3, D2 | 기초 HP 42 / 공격 6; 실제값 A2 | T3 | 일반 |
| `darkmage` | 다크메이지 | [darkmage_front.png](../../assets/monsters_3dir/darkmage_front.png)<br>[darkmage_left.png](../../assets/monsters_3dir/darkmage_left.png)<br>[darkmage_right.png](../../assets/monsters_3dir/darkmage_right.png) | F5, D3, D4, D5, D6, D7 | 기초 HP 48 / 공격 8; 실제값 A2 | T5 | 정예 |
| `gargoyle` | 가고일 | [gargoyle_01.png](../../assets/monsters/gargoyle_01.png) | F5, D3, D4, D5, D7 | 기초 HP 68 / 공격 8; 실제값 A2 | T5 | 정예 |
| `demon` | 데몬 | [demon_front.png](../../assets/monsters_3dir/demon_front.png)<br>[demon_left.png](../../assets/monsters_3dir/demon_left.png)<br>[demon_right.png](../../assets/monsters_3dir/demon_right.png) | F6, D6, D7 | 기초 HP 80 / 공격 10; 실제값 A2 | T6 | 정예 |
| `slime` | 슬라임 | [slime_01.png](../../assets/monsters/slime_01.png) | F1, F7, D1 | 기초 HP 24 / 공격 4; 실제값 A2 | T1 | 일반 |
| `goblin` | 고블린 | [goblin_01.png](../../assets/monsters/goblin_01.png) | F1, F2, F3, D1 | 기초 HP 32 / 공격 5; 실제값 A2 | T2 | 일반 |
| `skeleton` | 스켈레톤 | [skeleton_01.png](../../assets/monsters/skeleton_01.png) | F4, F5, D1, D2, D3 | 기초 HP 36 / 공격 5; 실제값 A2 | T2 | 일반 |
| `spider` | 거미 | [spider_01.png](../../assets/monsters/spider_01.png) | F2, F7, D1, D2 | 기초 HP 26 / 공격 4; 실제값 A2 | T2 | 일반 |
| `mushroom` | 버섯괴물 | [mushroom_01.png](../../assets/monsters/mushroom_01.png) | F3, F7 | 기초 HP 30 / 공격 5; 실제값 A2 | T2 | 일반 |
| `elem_fire` | 화염 정령 | [elem_fire_01.png](../../assets/monsters/elem_fire_01.png) | F6, D6 | 기초 HP 46 / 공격 7; 실제값 A2 | T6 | 일반 |
| `elem_ice` | 얼음 정령 | [elem_ice_01.png](../../assets/monsters/elem_ice_01.png) | F4, F5, D4, D5 | 기초 HP 46 / 공격 7; 실제값 A2 | T4 | 일반 |
| `mimic` | 미믹 | [mimic_01.png](../../assets/monsters/mimic_01.png) | D1~D7 상자 이벤트(층당 35% 선정) | 기초 HP 82 / 공격 11; 실제값 A2 | T2 | 정예 |
| `lich` | 리치 | [lich_front.png](../../assets/monsters_3dir/lich_front.png)<br>[lich_left.png](../../assets/monsters_3dir/lich_left.png)<br>[lich_right.png](../../assets/monsters_3dir/lich_right.png) | D1~D7 각 3의 배수층 우두머리 | 기초 HP 320 / 공격 14; 실제값 A2 | T7 | 우두머리 |
| `dragon` | 드래곤 (미표시) | [dragon_front.png](../../assets/monsters_3dir/dragon_front.png)<br>[dragon_left.png](../../assets/monsters_3dir/dragon_left.png)<br>[dragon_right.png](../../assets/monsters_3dir/dragon_right.png) | 출현 없음 | MOBDEF·EXP 없음 | T6 | 우두머리 |
| `succubus` | 서큐버스 (미표시) | [succubus_front.png](../../assets/monsters_3dir/succubus_front.png)<br>[succubus_left.png](../../assets/monsters_3dir/succubus_left.png)<br>[succubus_right.png](../../assets/monsters_3dir/succubus_right.png) | 출현 없음 | MOBDEF·EXP 없음 | T6 | 정예 |

¹ 현재 표시 이름은 `guild.js`의 의뢰용 사전입니다. 몬스터 머리 위에는 HP바만 있어 레벨·티어·이름이 보이지 않습니다. `dragon`·`succubus`는 이미지만 로딩하며 정의/스폰/이름이 없습니다. `bug`, `elem_water`, `elem_wood`, `elem_wind`, 갈색 오우거(`ogre`)도 이미지가 있지만 현재 town의 전투 ID가 없습니다. wolf/rabbit/bear/rogue/demon/harpy/darkmage는 “코드만” 있는 가상 그림이 아니라 3방향 이미지가 실제로 존재합니다.
² F1~F7은 봄→여름→가을→겨울→얼음→화산→늪 필드입니다. D1~D7은 1~3→4~6→7~9→10~12→13~15→16~18→19층 이후입니다. A2는 각 출현을 빠짐없이 분리합니다.

### A2. 현재 출현별 레벨·HP·공격력·경험치 실측 계산표

런타임은 고정 몬스터 레벨이 아니라 `within=clamp(플레이어Lv−티어최소Lv,0,9)`를 쓰고 `mobLv=티어최소Lv+within`로 표시값을 만듭니다. 아래 HP·공격 범위는 해당 티어의 최소~최대 플레이어 레벨, 던전은 해당 구간 3개 층 전체입니다. 숫자는 코드의 Math.round까지 그대로 계산했습니다. EXP는 같은 티어의 플레이어 레벨 전체와 난수 0.92~1.08을 포함합니다. 즉 현재는 몬스터 종별 EXP 차이가 없으며 미믹×2, 보스×8만 예외입니다.

| 코드 ID | 이름 | 현재 장소 | 현재 몬스터 레벨 | HP | 공격력 | 현재 EXP³ | 현재 티어 | 현재 구분 |
|---|---|---|---|---|---|---|---|---|
| wolf | 늑대 | F1 봄 | 1~10 | 38~57 | 5~7 | 1~3 | T1 | 일반 |
| rabbit | 토끼 | F1 봄 | 1~10 | 18~27 | 3~4 | 1~3 | T1 | 일반 |
| goblin | 고블린 | F1 봄 | 1~10 | 32~48 | 5~7 | 1~3 | T1 | 일반 |
| slime | 슬라임 | F1 봄 | 1~10 | 24~36 | 4~5 | 1~3 | T1 | 일반 |
| wolf | 늑대 | F2 여름 | 11~20 | 59~88 | 7~9 | 3~5 | T2 | 일반 |
| bear | 곰 | F2 여름 | 11~20 | 118~176 | 12~16 | 3~5 | T2 | 일반 |
| spider | 거미 | F2 여름 | 11~20 | 40~60 | 5~7 | 3~5 | T2 | 일반 |
| goblin | 고블린 | F2 여름 | 11~20 | 50~74 | 7~9 | 3~5 | T2 | 일반 |
| rogue | 로그 | F3 가을 | 21~30 | 88~132 | 10~13 | 5~7 | T3 | 일반 |
| orc | 오크 | F3 가을 | 21~30 | 122~182 | 12~15 | 5~7 | T3 | 일반 |
| mushroom | 버섯괴물 | F3 가을 | 21~30 | 63~94 | 8~11 | 5~7 | T3 | 일반 |
| goblin | 고블린 | F3 가을 | 21~30 | 67~100 | 8~11 | 5~7 | T3 | 일반 |
| wolf | 늑대 | F4 겨울 | 31~40 | 101~151 | 10~13 | 6~9 | T4 | 일반 |
| bear | 곰 | F4 겨울 | 31~40 | 201~301 | 18~24 | 6~9 | T4 | 일반 |
| skeleton | 스켈레톤 | F4 겨울 | 31~40 | 95~143 | 10~13 | 6~9 | T4 | 일반 |
| elem_ice | 얼음 정령 | F4 겨울 | 31~40 | 122~182 | 14~19 | 6~9 | T4 | 일반 |
| elem_ice | 얼음 정령 | F5 얼음 | 41~50 | 147~220 | 17~22 | 8~10 | T5 | 일반 |
| darkmage | 다크메이지 | F5 얼음 | 41~50 | 154~230 | 19~25 | 8~10 | T5 | 일반 |
| gargoyle | 가고일 | F5 얼음 | 41~50 | 218~325 | 19~25 | 8~10 | T5 | 일반 |
| skeleton | 스켈레톤 | F5 얼음 | 41~50 | 115~172 | 12~16 | 8~10 | T5 | 일반 |
| demon | 데몬 | F6 화산 | 51~60 | 300~449 | 27~36 | 9~12 | T6 | 일반 |
| orc | 오크 | F6 화산 | 51~60 | 218~325 | 19~25 | 9~12 | T6 | 일반 |
| elem_fire | 화염 정령 | F6 화산 | 51~60 | 173~258 | 19~25 | 9~12 | T6 | 일반 |
| harpy | 하피 | F7 늪 | 61~70 | 189~283 | 18~24 | 10~13 | T7 | 일반 |
| spider | 거미 | F7 늪 | 61~70 | 112~167 | 12~16 | 10~13 | T7 | 일반 |
| slime | 슬라임 | F7 늪 | 61~70 | 103~154 | 12~16 | 10~13 | T7 | 일반 |
| mushroom | 버섯괴물 | F7 늪 | 61~70 | 129~193 | 15~20 | 10~13 | T7 | 일반 |
| slime | 슬라임 | 1~3층 | 1~10 | 24~43 | 4~6 | 1~3 | T1 | 일반 |
| spider | 거미 | 1~3층 | 1~10 | 26~47 | 4~6 | 1~3 | T1 | 일반 |
| skeleton | 스켈레톤 | 1~3층 | 1~10 | 36~65 | 5~8 | 1~3 | T1 | 일반 |
| goblin | 고블린 | 1~3층 | 1~10 | 32~58 | 5~8 | 1~3 | T1 | 일반 |
| lich | 리치 | 3층 | 1~10 | 913~1323 | 20~27 | 10~27 | T1 | 우두머리 |
| mimic | 미믹 | 1~3층 | 없음 (mobLv 누락) | 82 | 11 | 2~7 | T1 | 일반(강화 보상) |
| wolf | 늑대 | 4~6층 | 11~20 | 60~100 | 7~10 | 3~5 | T2 | 일반 |
| spider | 거미 | 4~6층 | 11~20 | 41~69 | 5~8 | 3~5 | T2 | 일반 |
| skeleton | 스켈레톤 | 4~6층 | 11~20 | 57~95 | 7~10 | 3~5 | T2 | 일반 |
| rogue | 로그 | 4~6층 | 11~20 | 66~111 | 8~12 | 3~5 | T2 | 일반 |
| lich | 리치 | 6층 | 11~20 | 1340~1942 | 27~35 | 24~43 | T2 | 우두머리 |
| mimic | 미믹 | 4~6층 | 없음 (mobLv 누락) | 130 | 15 | 6~11 | T2 | 일반(강화 보상) |
| skeleton | 스켈레톤 | 7~9층 | 21~30 | 78~125 | 9~12 | 5~7 | T3 | 일반 |
| gargoyle | 가고일 | 7~9층 | 21~30 | 147~237 | 14~20 | 5~7 | T3 | 일반 |
| darkmage | 다크메이지 | 7~9층 | 21~30 | 104~167 | 14~20 | 5~7 | T3 | 일반 |
| orc | 오크 | 7~9층 | 21~30 | 125~202 | 12~17 | 5~7 | T3 | 일반 |
| lich | 리치 | 9층 | 21~30 | 1766~2561 | 33~43 | 38~58 | T3 | 우두머리 |
| mimic | 미믹 | 7~9층 | 없음 (mobLv 누락) | 177 | 19 | 10~15 | T3 | 일반(강화 보상) |
| bear | 곰 | 10~12층 | 31~40 | 208~328 | 19~27 | 6~9 | T4 | 일반 |
| gargoyle | 가고일 | 10~12층 | 31~40 | 186~294 | 17~24 | 6~9 | T4 | 일반 |
| elem_ice | 얼음 정령 | 10~12층 | 31~40 | 126~199 | 15~21 | 6~9 | T4 | 일반 |
| darkmage | 다크메이지 | 10~12층 | 31~40 | 132~207 | 17~24 | 6~9 | T4 | 일반 |
| lich | 리치 | 12층 | 31~40 | 2193~3180 | 39~52 | 51~71 | T4 | 우두머리 |
| mimic | 미믹 | 10~12층 | 없음 (mobLv 누락) | 225 | 23 | 13~18 | T4 | 일반(강화 보상) |
| gargoyle | 가고일 | 13~15층 | 41~50 | 226~351 | 20~27 | 8~10 | T5 | 일반 |
| elem_ice | 얼음 정령 | 13~15층 | 41~50 | 153~237 | 17~24 | 8~10 | T5 | 일반 |
| darkmage | 다크메이지 | 13~15층 | 41~50 | 159~248 | 20~27 | 8~10 | T5 | 일반 |
| harpy | 하피 | 13~15층 | 41~50 | 146~227 | 15~21 | 8~10 | T5 | 일반 |
| lich | 리치 | 15층 | 41~50 | 2620~3799 | 46~60 | 62~83 | T5 | 우두머리 |
| mimic | 미믹 | 13~15층 | 없음 (mobLv 누락) | 272 | 27 | 15~21 | T5 | 일반(강화 보상) |
| demon | 데몬 | 16~18층 | 51~60 | 312~480 | 28~39 | 9~12 | T6 | 일반 |
| elem_fire | 화염 정령 | 16~18층 | 51~60 | 179~276 | 20~27 | 9~12 | T6 | 일반 |
| orc | 오크 | 16~18층 | 51~60 | 226~348 | 20~27 | 9~12 | T6 | 일반 |
| darkmage | 다크메이지 | 16~18층 | 51~60 | 187~288 | 22~31 | 9~12 | T6 | 일반 |
| lich | 리치 | 18층 | 51~60 | 3047~4418 | 52~68 | 72~94 | T6 | 우두머리 |
| mimic | 미믹 | 16~18층 | 없음 (mobLv 누락) | 320 | 31 | 18~23 | T6 | 일반(강화 보상) |
| demon | 데몬 | 19층 이후 | 61~70 | 358~548 | 32~44 | 10~13 | T7 | 일반 |
| harpy | 하피 | 19층 이후 | 61~70 | 197~301 | 19~26 | 10~13 | T7 | 일반 |
| gargoyle | 가고일 | 19층 이후 | 61~70 | 305~465 | 25~35 | 10~13 | T7 | 일반 |
| darkmage | 다크메이지 | 19층 이후 | 61~70 | 215~329 | 25~35 | 10~13 | T7 | 일반 |
| lich | 리치 | 21·24·27…층 | 61~70 | 3474~5037 | 58~76 | 81~105 | T7 | 우두머리 |
| mimic | 미믹 | 19층 이후 | 없음 (mobLv 누락) | 367 | 35 | 20~26 | T7 | 일반(강화 보상) |

³ EXP 식: `round(expNeed(플레이어Lv)/targetKillsForLevel(플레이어Lv) × 보정 × 등급배율 × 난수)`(최소 1). 저티어 보정 `max(.035,1−(플레이어Lv−티어상한)*.13)`, 상위티어 조기 도전 보정 `min(1.12,1+(티어최소Lv−플레이어Lv)*.01)`. `expNeed=round(120+18*(Lv−1)+2.2*(Lv−1)^1.55)`, `targetKills=min(240,90+floor(Lv*2.2))`. 위 표는 보정 1 조건입니다. Lv6의 일반몹 EXP는 T1에서도 T3에서도 T7에서도 대체로 2입니다. 플레이어 레벨에 따라 EXP를 새로 산출하므로 티어 보상 차이가 작습니다.
현재 필드 HP배율은 T1 1.00 → T7 4.30, 공격배율은 1.00 → 3.04입니다(티어 내 레벨 보정 전). 던전은 HP `1+.58*(T−1)+.12*층내순번`, 공격 `1+.36*(T−1)+.08*층내순번`; 보스 HP×2.3/공격×1.25. 리치는 기초 HP320이므로 T1 3층에서도 HP913~1323, 공격20~27입니다. 일반/정예 구분 필드는 현재 없고 `boss`만 있습니다. 미믹은 보상만 강화되고 레벨 추종·mobLv가 누락되어 있습니다.
현재 드랍: 일반 기본 30%(발견 보정, 상한 68%), 미믹 기본48%, 보스 장비1개 확정+65%로 추가1개. 무기58%/방어구32%/장신구10%. 희귀도(일반/마법/희귀/전설): T1 62/31/7/0 → T2 56/32/12/0 → T3 50/33/17/0 → T4 45/34/20/1 → T5 40/34/23/3 → T6 35/34/26/5 → T7 30/34/28/8(%,운 관련 보정 전). 티어별 외형 단계는 현재 [1,2]/[2,3]/[4,5]/[5,6]/[7,8]/[8,9]/[9,10]로 중복됩니다.

### A3. 이미지 126장 전체 판독·처리표

각 파일은 정확히 한 번 나옵니다. “미사용”은 현재 위치·레벨·HP·공격·EXP 모두 **미정의**라는 뜻입니다. 미사용 파일의 제안 티어는 실제 그림에 대한 배치안이며 현재 수치가 있다는 뜻이 아닙니다. 방향/행동 프레임은 같은 개체 ID에 묶고 약한 단계로 세지 않습니다. 3방향은 같은 행에 3개 파일을 모두 명시합니다. 아래 “보관”은 삭제가 아니라 신규 드랍/스폰에서 제외한다는 뜻입니다.

| 개체/제안 ID | 모든 해당 이미지 파일 | 직접 본 모습 | 현재 사용 여부 | 제안/참고 티어 | 구분 | 처리 기준 |
|---|---|---|---|---|---|---|
| bear | [bear_front.png](../../assets/monsters_3dir/bear_front.png)<br>[bear_left.png](../../assets/monsters_3dir/bear_left.png)<br>[bear_right.png](../../assets/monsters_3dir/bear_right.png) | 갈색 큰 곰, 긴 발톱·두꺼운 체격 | 현재 사용(A1·A2) | T2 | 정예 | 같은 개체 3방향 |
| darkmage | [darkmage_front.png](../../assets/monsters_3dir/darkmage_front.png)<br>[darkmage_left.png](../../assets/monsters_3dir/darkmage_left.png)<br>[darkmage_right.png](../../assets/monsters_3dir/darkmage_right.png) | 보라 후드·해골 장식·발광 지팡이 | 현재 사용(A1·A2) | T5 | 정예 | 같은 개체 3방향 |
| demon | [demon_front.png](../../assets/monsters_3dir/demon_front.png)<br>[demon_left.png](../../assets/monsters_3dir/demon_left.png)<br>[demon_right.png](../../assets/monsters_3dir/demon_right.png) | 붉은 뿔·날개·검은 갑주 | 현재 사용(A1·A2) | T6 | 정예 | 같은 개체 3방향 |
| dragon | [dragon_front.png](../../assets/monsters_3dir/dragon_front.png)<br>[dragon_left.png](../../assets/monsters_3dir/dragon_left.png)<br>[dragon_right.png](../../assets/monsters_3dir/dragon_right.png) | 붉은 비늘·황금 뿔·날개 달린 용 | 로딩만, 출현 없음 | T6 | 우두머리 | 같은 개체 3방향 |
| harpy | [harpy_front.png](../../assets/monsters_3dir/harpy_front.png)<br>[harpy_left.png](../../assets/monsters_3dir/harpy_left.png)<br>[harpy_right.png](../../assets/monsters_3dir/harpy_right.png) | 붉은 머리·갈색 날개·갈퀴 발 | 현재 사용(A1·A2) | T3 | 정예 | 같은 개체 3방향 |
| lich | [lich_front.png](../../assets/monsters_3dir/lich_front.png)<br>[lich_left.png](../../assets/monsters_3dir/lich_left.png)<br>[lich_right.png](../../assets/monsters_3dir/lich_right.png) | 뼈 왕관·지팡이·녹색 해골 불꽃 | 현재 사용(A1·A2) | T7 | 우두머리 | 같은 개체 3방향 |
| orc | [orc_front.png](../../assets/monsters_3dir/orc_front.png)<br>[orc_left.png](../../assets/monsters_3dir/orc_left.png)<br>[orc_right.png](../../assets/monsters_3dir/orc_right.png) | 녹색 피부·철 견갑·해골 허리띠·철퇴 | 현재 사용(A1·A2) | T6 | 일반 | 같은 개체 3방향; 갈색 오우거와 다른 종 |
| rabbit | [rabbit_front.png](../../assets/monsters_3dir/rabbit_front.png)<br>[rabbit_left.png](../../assets/monsters_3dir/rabbit_left.png)<br>[rabbit_right.png](../../assets/monsters_3dir/rabbit_right.png) | 흰 털·잎 장식·붉은 열매, 작은 짐승 | 현재 사용(A1·A2) | T1 | 일반 | 같은 개체 3방향 |
| rogue | [rogue_front.png](../../assets/monsters_3dir/rogue_front.png)<br>[rogue_left.png](../../assets/monsters_3dir/rogue_left.png)<br>[rogue_right.png](../../assets/monsters_3dir/rogue_right.png) | 갈색 후드·붉은 마스크·쌍단검 | 현재 사용(A1·A2) | T3 | 일반 | 같은 개체 3방향 |
| succubus | [succubus_front.png](../../assets/monsters_3dir/succubus_front.png)<br>[succubus_left.png](../../assets/monsters_3dir/succubus_left.png)<br>[succubus_right.png](../../assets/monsters_3dir/succubus_right.png) | 분홍 머리·뿔·박쥐 날개 | 로딩만, 출현 없음 | T6 | 정예 | 같은 개체 3방향 |
| wolf | [wolf_front.png](../../assets/monsters_3dir/wolf_front.png)<br>[wolf_left.png](../../assets/monsters_3dir/wolf_left.png)<br>[wolf_right.png](../../assets/monsters_3dir/wolf_right.png) | 흰/회색 털·푸른 눈, 설원형 늑대 | 현재 사용(A1·A2) | T4 | 일반 | 같은 개체 3방향; 늑대는 봄/여름에서 제거 |
| slime | [slime_01.png](../../assets/monsters/slime_01.png) | 작은 초록 젤리 | 현재 slime | T1 | 일반 | 초원만. 늪 T7에서 제거 |
| slime_water | [slime_02.png](../../assets/monsters/slime_02.png) | 작은 파랑 젤리 | 미사용 | T2 | 일반 | 여름 물가만. 얼음 슬라임으로 부르지 않음 |
| slime_red | [slime_03.png](../../assets/monsters/slime_03.png) | 작은 빨강 젤리, 불꽃/각질 없음 | 미사용 | T2 | 일반 | 예비. 빨강이라는 이유만으로 T6 화염몹 금지 |
| slime_gold | [slime_04.png](../../assets/monsters/slime_04.png) | 작은 노랑 젤리, 무장 없음 | 미사용 | T2 | 정예 | 예비 보너스 개체. 색만으로 고티어 금지 |
| slime_king | [slime_05.png](../../assets/monsters/slime_05.png) | 초록 몸·황금 왕관·보석 | 미사용 | T1 | 우두머리 | T1 3층 우두머리 |
| slime | [slime_06.png](../../assets/monsters/slime_06.png) | 초록 슬라임 기울어진/압축된 자세 | 미사용 | T1 | 일반 | slime_01 동작 프레임, 별도 티어 아님 |
| mushroom_brown | [mushroom_01.png](../../assets/monsters/mushroom_01.png)<br>[mushroom_02.png](../../assets/monsters/mushroom_02.png) | 갈색/주황 갓·밝은 점·작은 몸 | 01 현재 mushroom, 02 미사용 | T2 | 일반 | 동일 디자인 근접 변형; 둘 다 T2 |
| mushroom_red | [mushroom_03.png](../../assets/monsters/mushroom_03.png)<br>[mushroom_05.png](../../assets/monsters/mushroom_05.png)<br>[mushroom_06.png](../../assets/monsters/mushroom_06.png)<br>[mushroom_07.png](../../assets/monsters/mushroom_07.png) | 붉은 갓·밝은 점, 정면/뒤/측면 | 미사용 | T2 | 일반 | 같은 붉은 버섯 계열. T7 독버섯 아님 |
| mushroom_red_angry | [mushroom_04.png](../../assets/monsters/mushroom_04.png) | 붉은 갓·주름진 표정 | 미사용 | T2 | 정예 | 예비 정예; 일반보다 공격적, 고티어 근거 없음 |
| spider | [spider_01.png](../../assets/monsters/spider_01.png)<br>[spider_02.png](../../assets/monsters/spider_02.png)<br>[spider_03.png](../../assets/monsters/spider_03.png)<br>[spider_04.png](../../assets/monsters/spider_04.png)<br>[spider_05.png](../../assets/monsters/spider_05.png)<br>[spider_06.png](../../assets/monsters/spider_06.png) | 검붉은 거미·주황 무늬, 정면/뒤/측면/자세 | 01 현재 spider, 나머지 미사용 | T2 | 일반 | 하나의 숲 거미. T7 독거미는 별도 외형 필요 |
| beetle | [bug_01.png](../../assets/monsters/bug_01.png) | 청흑색 딱딱한 날개·더듬이 | 미사용 | T1 | 일반 | 봄 일반 딱정벌레 |
| wasp | [bug_02.png](../../assets/monsters/bug_02.png) | 황갈색 줄무늬·투명 날개·침 | 미사용 | T2 | 정예 | 여름 정예 말벌 |
| locust | [bug_03.png](../../assets/monsters/bug_03.png) | 초록 날개·뒷다리·갈색 몸 | 미사용 | T1 | 일반 | 봄 일반 메뚜기. 세 벌레는 다른 종 |
| goblin_spear | [goblin_01.png](../../assets/monsters/goblin_01.png)<br>[goblin_02.png](../../assets/monsters/goblin_02.png)<br>[goblin_03.png](../../assets/monsters/goblin_03.png)<br>[goblin_04.png](../../assets/monsters/goblin_04.png)<br>[goblin_05.png](../../assets/monsters/goblin_05.png)<br>[goblin_06.png](../../assets/monsters/goblin_06.png)<br>[goblin_07.png](../../assets/monsters/goblin_07.png)<br>[goblin_08.png](../../assets/monsters/goblin_08.png)<br>[goblin_09.png](../../assets/monsters/goblin_09.png) | 녹색·가죽 갑주·붉은 목수건·창, 방향/공격 | 01 현재 goblin, 나머지 미사용 | T2 | 일반 | 창 든 계열; 손이 가려진 측면도 장비 동일. 돌 던지기는 창/근접 고유행동과 정합화 |
| goblin_scout | [goblin_10.png](../../assets/monsters/goblin_10.png) | 녹색·가죽 옷·가시 팔찌, 창 없음 | 미사용 | T1 | 일반 | 창 없는 정찰병; 무기 계열 구분 |
| skeleton_bare | [skeleton_06.png](../../assets/monsters/skeleton_06.png)<br>[skeleton_07.png](../../assets/monsters/skeleton_07.png)<br>[skeleton_08.png](../../assets/monsters/skeleton_08.png) | 무기·갑주 없는 작은 해골, 정면/옆 | 미사용 | T1 | 일반 | 맨손 해골. 약한 단계 |
| skeleton_sword | [skeleton_01.png](../../assets/monsters/skeleton_01.png) | 칼만 든 해골 | 현재 skeleton | T2 | 일반 | 맨손보다 위, 방패병보다 아래 |
| skeleton_round | [skeleton_02.png](../../assets/monsters/skeleton_02.png)<br>[skeleton_03.png](../../assets/monsters/skeleton_03.png) | 검·둥근 나무 방패, 정면 변형 | 미사용 | T3 | 일반 | 같은 검방패 해골의 자세 차이 |
| skeleton_guard | [skeleton_04.png](../../assets/monsters/skeleton_04.png) | 검·큰 철테 사각 방패 | 미사용 | T3 | 정예 | 방패 크기·철테 근거로 정예 |
| skeleton_archer | [skeleton_05.png](../../assets/monsters/skeleton_05.png) | 활·화살 든 해골 | 미사용 | T3 | 일반 | 궁병 분기. 검방패보다 무조건 상위로 가정 안 함 |
| ogre_brawler | [orc_01.png](../../assets/monsters/orc_01.png)<br>[orc_02.png](../../assets/monsters/orc_02.png)<br>[orc_03.png](../../assets/monsters/orc_03.png)<br>[orc_04.png](../../assets/monsters/orc_04.png)<br>[orc_06.png](../../assets/monsters/orc_06.png)<br>[orc_09.png](../../assets/monsters/orc_09.png) | 갈색 대형 몸·엄니·털 어깨·철 장식, 맨손/방향/공격 | 미사용 (orc는 3dir가 우선) | T3 | 일반 | 이름을 갈색 오우거로 구분. 녹색 중무장 오크와 별도 ID |
| ogre_club | [orc_05.png](../../assets/monsters/orc_05.png)<br>[orc_07.png](../../assets/monsters/orc_07.png) | 갈색 오우거·대형 가시 철퇴, 공격 자세 | 미사용 | T3 | 정예 | 맨손 오우거보다 강한 분기 |
| ogre_club | [orc_08.png](../../assets/monsters/orc_08.png) | 철퇴 오우거 동작 2개가 한 PNG에 함께 있음 | 미사용 | T3 | 정예 | 직접 스프라이트 사용 금지. 승인 후 2칸 재분리하여 같은 개체 프레임 |
| gargoyle | [gargoyle_01.png](../../assets/monsters/gargoyle_01.png)<br>[gargoyle_02.png](../../assets/monsters/gargoyle_02.png)<br>[gargoyle_03.png](../../assets/monsters/gargoyle_03.png)<br>[gargoyle_04.png](../../assets/monsters/gargoyle_04.png)<br>[gargoyle_05.png](../../assets/monsters/gargoyle_05.png)<br>[gargoyle_06.png](../../assets/monsters/gargoyle_06.png) | 회색 돌 몸·날개·뿔, 정면/뒤/측면 | 01 현재 gargoyle, 나머지 미사용 | T5 | 정예 | 동일 석상 디자인. T5 얼음 동굴 석상 경비만; 얼음 갑주로 오명명 금지 |
| mimic_wood | [mimic_01.png](../../assets/monsters/mimic_01.png)<br>[mimic_02.png](../../assets/monsters/mimic_02.png)<br>[mimic_03.png](../../assets/monsters/mimic_03.png)<br>[mimic_04.png](../../assets/monsters/mimic_04.png) | 나무 상자 닫힘→이빨·혀·입 벌림 | 01 현재 mimic, 나머지 미사용 | T2 | 정예 | 강화 단계 아님. 01은 닫힘 예고, 전투시 02/03/04 사용 |
| elem_fire | [elem_fire_01.png](../../assets/monsters/elem_fire_01.png)<br>[elem_fire_02.png](../../assets/monsters/elem_fire_02.png)<br>[elem_fire_03.png](../../assets/monsters/elem_fire_03.png)<br>[elem_fire_04.png](../../assets/monsters/elem_fire_04.png) | 작은 주황 불 몸·불꽃 머리, 정면/공격/옆 | 01 현재 elem_fire, 나머지 미사용 | T6 | 일반 | 하나의 화염 정령 동작 |
| elem_ice | [elem_ice_01.png](../../assets/monsters/elem_ice_01.png)<br>[elem_ice_02.png](../../assets/monsters/elem_ice_02.png)<br>[elem_ice_03.png](../../assets/monsters/elem_ice_03.png) | 파랑 결정 갑주·뿔, 정면/공격/뒤 | 01 현재 elem_ice, 나머지 미사용 | T4 | 일반 | 방향/자세 차이, 같은 티어. 얼음 T5 상위 개체는 신규 요청 |
| elem_water | [elem_water_01.png](../../assets/monsters/elem_water_01.png)<br>[elem_water_02.png](../../assets/monsters/elem_water_02.png)<br>[elem_water_03.png](../../assets/monsters/elem_water_03.png) | 작은 파랑 물방울·물결 몸, 정면/옆/뒤 | 미사용 | T2 | 일반 | 동일 개체의 방향/자세 |
| elem_wood | [elem_wood_01.png](../../assets/monsters/elem_wood_01.png)<br>[elem_wood_02.png](../../assets/monsters/elem_wood_02.png)<br>[elem_wood_03.png](../../assets/monsters/elem_wood_03.png) | 나무껍질·잎·가지 몸, 정면/옆/뒤 | 미사용 | T2 | 우두머리 | 동일 개체의 방향/자세. 나무 정령은 T2 우두머리 전용 |
| elem_wind | [elem_wind_01.png](../../assets/monsters/elem_wind_01.png)<br>[elem_wind_02.png](../../assets/monsters/elem_wind_02.png)<br>[elem_wind_03.png](../../assets/monsters/elem_wind_03.png) | 회백색 소용돌이 몸, 정면/옆/뒤 | 미사용 | T3 | 일반 | 동일 개체의 방향/자세 |
| elem_fire (신규 배정 없음) | [fire.png](../../assets/monsters_v1/fire.png) | 작은 주황 불꽃 | 미사용 | T6 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| goblin_bare (신규 배정 없음) | [goblin.png](../../assets/monsters_v1/goblin.png) | 맨손 녹색 고블린 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| goblin_bare (신규 배정 없음) | [goblin_side.png](../../assets/monsters_v1/goblin_side.png) | 같은 맨손 고블린 측면 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| goblin_spear (신규 배정 없음) | [goblin_spear.png](../../assets/monsters_v1/goblin_spear.png) | 창 든 녹색 고블린 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| mushroom_brown (신규 배정 없음) | [mush_brown.png](../../assets/monsters_v1/mush_brown.png) | 갈색 갓 버섯 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| mushroom_red (신규 배정 없음) | [mush_red.png](../../assets/monsters_v1/mush_red.png) | 붉은 갓 버섯 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| mushroom_red_angry (신규 배정 없음) | [mush_red_angry.png](../../assets/monsters_v1/mush_red_angry.png) | 붉은 갓·화난 표정 | 미사용 | T2 | 정예 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| ogre_brawler (신규 배정 없음) | [orc.png](../../assets/monsters_v1/orc.png) | 갈색 맨손 오우거 | 미사용 | T3 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| ogre_club (신규 배정 없음) | [orc_club.png](../../assets/monsters_v1/orc_club.png) | 갈색 몽둥이 오우거 | 미사용 | T3 | 정예 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| skeleton_bare (신규 배정 없음) | [skeleton.png](../../assets/monsters_v1/skeleton.png) | 맨손 해골 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| skeleton_round (신규 배정 없음) | [skeleton_sword.png](../../assets/monsters_v1/skeleton_sword.png) | 검·둥근 방패 해골 | 미사용 | T3 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime_water (신규 배정 없음) | [slime_blue.png](../../assets/monsters_v1/slime_blue.png) | 파랑 슬라임 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime (신규 배정 없음) | [slime_green.png](../../assets/monsters_v1/slime_green.png) | 초록 슬라임 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime (신규 배정 없음) | [slime_hit.png](../../assets/monsters_v1/slime_hit.png) | 노랑으로 번쩍이며 찌그러진 피격, 별/번개 표시 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime_king (신규 배정 없음) | [slime_king.png](../../assets/monsters_v1/slime_king.png) | 왕관 초록 슬라임 | 미사용 | T1 | 우두머리 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime_red (신규 배정 없음) | [slime_red.png](../../assets/monsters_v1/slime_red.png) | 빨강 슬라임 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| slime (신규 배정 없음) | [slime_squash.png](../../assets/monsters_v1/slime_squash.png) | 초록 슬라임 점프/압축 | 미사용 | T1 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |
| spider (신규 배정 없음) | [spider.png](../../assets/monsters_v1/spider.png) | 검붉은 거미 | 미사용 | T2 | 일반 | 옛 화풍 보관. 티어는 대응 개체 참고만, 새 세트와 혼용 금지 |


## B. 장비 이미지 180장·현재 이름 전수 대조

현재 아이템에는 `requiredLevel`이 없고 `equip()`에서도 레벨을 검사하지 않습니다. 따라서 **현재 착용 레벨은 전 장비 제한 없음**입니다. 아래 착용 레벨은 승인 후 신규 아이템에 적용할 값입니다. 현재 이름은 접두·접미를 뺀 기초 이름입니다. 랜덤 옵션은 외형 이름과 분리해 유지합니다(예: `서리의 가죽 장갑`은 냉기 옵션이므로 허용, 이미지 자체가 가죽인데 기초 이름이 `철 장갑`이면 X).
판정 O = 기초 이름의 물건 종류·재질·주요 속성이 보이는 외형과 모순되지 않음. X = 천/가죽과 금속 혼동, 후드/모자와 투구 혼동, 로브와 갑옷 혼동, 뚜렷한 얼음/불/잎/암흑 모티프와 다른 속성, 새것에 낡은 이름 등 명백한 불일치. 철/강철의 합금이나 왕실/기사의 소유권을 이미지로 증명할 수는 없으므로 모순 없는 금속/화려한 의장형은 O로 판정하고, 새 이름에는 검증 불가능한 단정은 줄였습니다. 미사용은 `—`로 표기합니다.

| 슬롯·계열 | 이미지 파일 | 현재 기초 이름 | 실제 보이는 것 | 현재 O/X | 배정 티어 | 신규 착용 Lv | 승인용 새 기초 이름 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 무기/검 | [sword_01.png](../../assets/weapons/sword_01.png) | 나무 검 | 거친 나무 판자·나무 가드 | O | T1 | 1 | 목검 |  |
| 무기/검 | [sword_02.png](../../assets/weapons/sword_02.png) | 낡은 검 | 짧고 평범한 은회색 칼날·갈색 손잡이 | X | T1 | 6 | 짧은 철검 |  |
| 무기/검 | [sword_03.png](../../assets/weapons/sword_03.png) | 철 검 | 긴 은회색 직검·가죽 손잡이 | O | T2 | 11 | 긴 철검 |  |
| 무기/검 | [sword_04.png](../../assets/weapons/sword_04.png) | 강철 검 | 은회색 칼날·금색 가드·파란 손잡이 | O | T3 | 21 | 금장 강철검 |  |
| 무기/검 | [sword_05.png](../../assets/weapons/sword_05.png) | 기사의 검 | 금장 가드·초록 보석 | O | T3 | 26 | 녹보석 장식검 |  |
| 무기/검 | [sword_06.png](../../assets/weapons/sword_06.png) | 서리 검 | 파랑 결정 칼날·서리빛 가드 | O | T5 | 41 | 빙정검 |  |
| 무기/검 | [sword_07.png](../../assets/weapons/sword_07.png) | 왕실 검 | 금색 가드·붉은 보석 | O | T4 | 31 | 홍보석 의장검 |  |
| 무기/검 | [sword_08.png](../../assets/weapons/sword_08.png) | 암흑 검 | 검보라 칼날·자색 보석 | O | T6 | 51 | 흑수정검 |  |
| 무기/검 | [sword_09.png](../../assets/weapons/sword_09.png) | 번개 검 | 푸른 발광 칼날·금장·에너지 잔광 | X | T7 | 61 | 푸른 광휘검 |  |
| 무기/검 | [sword_10.png](../../assets/weapons/sword_10.png) | 태양의 검 | 금빛/주황 발광 칼날·날개형 가드 | O | T7 | 66 | 황금 광휘검 |  |
| 무기/창 | [spear_01.png](../../assets/weapons/spear_01.png) | 나무 창 | 나무 자루 끝에 금속 창날 | X | T1 | 1 | 나무 자루 창 |  |
| 무기/창 | [spear_02.png](../../assets/weapons/spear_02.png) | 낡은 창 | 붉은 자루·회색 창날·금속 끝장식 | X | T1 | 6 | 철테 창 |  |
| 무기/창 | [spear_03.png](../../assets/weapons/spear_03.png) | 철 창 | 긴 회색 창날·갈고리 가드 | O | T2 | 11 | 갈고리 철창 |  |
| 무기/창 | [spear_04.png](../../assets/weapons/spear_04.png) | 강철 창 | 회색 창날·붉은 깃발 | O | T3 | 21 | 붉은 깃발창 |  |
| 무기/창 | [spear_05.png](../../assets/weapons/spear_05.png) | 기사의 창 | 금장 창날·붉은 천·보석 | O | T3 | 26 | 홍보석 의장창 |  |
| 무기/창 | [spear_06.png](../../assets/weapons/spear_06.png) | 서리 창 | 금장 창날·파랑 깃발·초록 보석 | X | T4 | 31 | 푸른 깃발창 |  |
| 무기/창 | [spear_07.png](../../assets/weapons/spear_07.png) | 왕실 창 | 파랑 결정 창날·금장 | O | T5 | 41 | 빙정창 |  |
| 무기/창 | [spear_08.png](../../assets/weapons/spear_08.png) | 암흑 창 | 검보라 창날·자색 보석 | O | T6 | 51 | 흑수정창 |  |
| 무기/창 | [spear_09.png](../../assets/weapons/spear_09.png) | 번개 창 | 푸른 결정·발광 고리·금장 | X | T7 | 61 | 푸른 광휘창 |  |
| 무기/창 | [spear_10.png](../../assets/weapons/spear_10.png) | 태양의 창 | 황금 창날·주황 불빛·날개 가드 | O | T7 | 66 | 황금 광휘창 |  |
| 무기/건틀릿 | [gauntlet_01.png](../../assets/weapons/gauntlet_01.png) | 나무 건틀릿 | 천 붕대 감은 주먹 | X | T1 | 1 | 붕대 주먹 |  |
| 무기/건틀릿 | [gauntlet_02.png](../../assets/weapons/gauntlet_02.png) | 낡은 건틀릿 | 갈색 가죽 장갑·손목 띠 | X | T1 | 6 | 가죽 전투장갑 |  |
| 무기/건틀릿 | [gauntlet_03.png](../../assets/weapons/gauntlet_03.png) | 철 건틀릿 | 갈색 가죽 장갑·둥근 쇠징 | X | T2 | 11 | 쇠징 전투장갑 |  |
| 무기/건틀릿 | [gauntlet_04.png](../../assets/weapons/gauntlet_04.png) | 강철 건틀릿 | 회색 판금 주먹·금속 손목 | O | T3 | 21 | 철제 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_05.png](../../assets/weapons/gauntlet_05.png) | 기사의 건틀릿 | 회색 중판금·검정 손목·금테 | O | T3 | 26 | 중판금 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_06.png](../../assets/weapons/gauntlet_06.png) | 서리 건틀릿 | 붉은 가죽·긴 금속 발톱 | X | T4 | 31 | 발톱 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_07.png](../../assets/weapons/gauntlet_07.png) | 왕실 건틀릿 | 검갈색 철판·가시 | O | T4 | 36 | 가시 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_08.png](../../assets/weapons/gauntlet_08.png) | 암흑 건틀릿 | 파랑 룬·금빛 발톱 | X | T5 | 41 | 푸른 룬 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_09.png](../../assets/weapons/gauntlet_09.png) | 번개 건틀릿 | 검보라 갑주·보라 불꽃 | X | T6 | 51 | 암흑 불꽃 건틀릿 |  |
| 무기/건틀릿 | [gauntlet_10.png](../../assets/weapons/gauntlet_10.png) | 태양의 건틀릿 | 흰/금 판금·파랑 보석·날개 | X | T7 | 61 | 황금 날개 건틀릿 |  |
| 무기/활 | [bow_01.png](../../assets/weapons/bow_01.png) | 나무 활 | 평범한 나무 활·밝은 손잡이 감개 | O | T1 | 1 | 기본 목궁 |  |
| 무기/활 | [bow_02.png](../../assets/weapons/bow_02.png) | 낡은 활 | 나무 활·곡선 조각 손잡이 | X | T1 | 7 | 조각 목궁 |  |
| 무기/활 | [bow_03.png](../../assets/weapons/bow_03.png) | 철 활 | 나무 활·붉은 가죽 감개 | X | T2 | 11 | 가죽 감개 목궁 |  |
| 무기/활 | [bow_04.png](../../assets/weapons/bow_04.png) | 강철 활 | 가는 나무 활·금빛 손잡이 감개 | X | T1 | 4 | 경량 목궁 |  |
| 무기/활 | [bow_05.png](../../assets/weapons/bow_05.png) | 기사의 활 | 나무 몸통·은회색 금속 띠 보강 | O | T3 | 21 | 철테 강화궁 |  |
| 무기/활 | [bow_06.png](../../assets/weapons/bow_06.png) | 서리 활 | 검붉은 금속 보강·붉은 보석 | X | T4 | 31 | 홍보석 강화궁 |  |
| 무기/활 | [bow_07.png](../../assets/weapons/bow_07.png) | 왕실 활 | 초록 잎·덩굴·녹보석 | X | T4 | 36 | 덩굴 장식궁 |  |
| 무기/활 | [bow_08.png](../../assets/weapons/bow_08.png) | 암흑 활 | 흰/은 프레임·파랑 결정 | X | T5 | 41 | 빙정궁 |  |
| 무기/활 | [bow_09.png](../../assets/weapons/bow_09.png) | 번개 활 | 검보라 프레임·자색 결정 | X | T6 | 51 | 흑수정궁 |  |
| 무기/활 | [bow_10.png](../../assets/weapons/bow_10.png) | 태양의 활 | 황금 날개 프레임·발광 장식 | O | T7 | 61 | 황금 날개궁 |  |
| 무기/지팡이 | [staff_01.png](../../assets/weapons/staff_01.png) | 나무 지팡이 | 나무 가지·나무 돌기 | O | T1 | 1 | 나뭇가지 지팡이 |  |
| 무기/지팡이 | [staff_02.png](../../assets/weapons/staff_02.png) | 낡은 지팡이 | 초록 작은 보석·잎·나무 줄기 | X | T2 | 11 | 새잎 보석 지팡이 |  |
| 무기/지팡이 | [staff_03.png](../../assets/weapons/staff_03.png) | 철 지팡이 | 나무 자루·파랑 수정 | X | T3 | 21 | 푸른 수정 지팡이 |  |
| 무기/지팡이 | [staff_04.png](../../assets/weapons/staff_04.png) | 강철 지팡이 | 큰 초록 구슬·잎·굽은 나무 | X | T3 | 26 | 숲의 구슬 지팡이 |  |
| 무기/지팡이 | [staff_05.png](../../assets/weapons/staff_05.png) | 기사의 지팡이 | 불꽃 구슬·붉은 금속 갈고리 | X | T6 | 51 | 화염 구슬 지팡이 |  |
| 무기/지팡이 | [staff_06.png](../../assets/weapons/staff_06.png) | 서리 지팡이 | 파랑 얼음 가지·눈꽃·빙정 | O | T5 | 41 | 눈꽃 지팡이 |  |
| 무기/지팡이 | [staff_07.png](../../assets/weapons/staff_07.png) | 왕실 지팡이 | 보라 결정 다발·자색 구슬 | O | T6 | 56 | 자수정 지팡이 |  |
| 무기/지팡이 | [staff_08.png](../../assets/weapons/staff_08.png) | 암흑 지팡이 | 황금 원형 광륜·밝은 중심 | X | T4 | 31 | 광륜 지팡이 |  |
| 무기/지팡이 | [staff_09.png](../../assets/weapons/staff_09.png) | 번개 지팡이 | 검보라 갈고리·큰 자색 구슬 | X | T7 | 61 | 암흑 구슬 지팡이 |  |
| 무기/지팡이 | [staff_10.png](../../assets/weapons/staff_10.png) | 태양의 지팡이 | 황금 프레임·푸른 구슬·광륜 | O | T7 | 66 | 황금 광륜 지팡이 |  |
| 머리/기사 | [knight_head_01.png](../../assets/armor/knight_head_01.png) | 나무 투구 | 갈색 녹/사용흔·무장 장식 적음 투구 | X | T1 | 6 | 녹슨 판금 투구 |  |
| 머리/기사 | [knight_head_02.png](../../assets/armor/knight_head_02.png) | 낡은 투구 | 회색 판금·금테·작은 날개 문양 투구 | X | T2 | 11 | 날개 문양 판금 투구 |  |
| 머리/기사 | [knight_head_03.png](../../assets/armor/knight_head_03.png) | 철 투구 | 푸른 천/도색·금테·청보석 투구 | O | T3 | 21 | 청보석 판금 투구 |  |
| 머리/기사 | [knight_head_04.png](../../assets/armor/knight_head_04.png) | 강철 투구 | 붉은 천·금장·사자 문장 투구 | O | T4 | 31 | 붉은 사자 판금 투구 |  |
| 머리/기사 | [knight_head_05.png](../../assets/armor/knight_head_05.png) | 기사의 투구 | 검정 판금·붉은 균열·가시 투구 | O | T6 | 51 | 용암 판금 투구 |  |
| 머리/기사 | [knight_head_06.png](../../assets/armor/knight_head_06.png) | 서리 투구 | 흰/금 판금·날개·청보석 투구 | X | T7 | 61 | 황금 날개 판금 투구 |  |
| 머리/기사 | [knight_head_07.png](../../assets/armor/knight_head_07.png) | 왕실 투구 | 검보라 판금·자수정·가시 투구 | O | T7 | 64 | 자수정 판금 투구 |  |
| 머리/기사 | [knight_head_08.png](../../assets/armor/knight_head_08.png) | 암흑 투구 | 황금 판금·붉은 보석·사자 투구 | X | T7 | 68 | 황금 사자 판금 투구 |  |
| 머리/기사 | [knight_head_09.png](../../assets/armor/knight_head_09.png) | 번개 투구 | 파랑 얼음 결정·첨탑 투구 | X | T5 | 41 | 빙정 판금 투구 |  |
| 머리/기사 | [knight_head_10.png](../../assets/armor/knight_head_10.png) | 태양의 투구 | 붉은/금 판금·불꽃·홍보석 투구 | O | T6 | 56 | 화염 판금 투구 |  |
| 몸/기사 | [knight_body_01.png](../../assets/armor/knight_body_01.png) | 나무 갑옷 | 갈색 녹/사용흔·무장 장식 적음 흉갑 | X | T1 | 6 | 녹슨 판금 흉갑 |  |
| 몸/기사 | [knight_body_02.png](../../assets/armor/knight_body_02.png) | 낡은 갑옷 | 회색 판금·금테·작은 날개 문양 흉갑 | X | T2 | 11 | 날개 문양 판금 흉갑 |  |
| 몸/기사 | [knight_body_03.png](../../assets/armor/knight_body_03.png) | 철 갑옷 | 푸른 천/도색·금테·청보석 흉갑 | O | T3 | 21 | 청보석 판금 흉갑 |  |
| 몸/기사 | [knight_body_04.png](../../assets/armor/knight_body_04.png) | 강철 갑옷 | 붉은 천·금장·사자 문장 흉갑 | O | T4 | 31 | 붉은 사자 판금 흉갑 |  |
| 몸/기사 | [knight_body_05.png](../../assets/armor/knight_body_05.png) | 기사의 갑옷 | 검정 판금·붉은 균열·가시 흉갑 | O | T6 | 51 | 용암 판금 흉갑 |  |
| 몸/기사 | [knight_body_06.png](../../assets/armor/knight_body_06.png) | 서리 갑옷 | 흰/금 판금·날개·청보석 흉갑 | X | T7 | 61 | 황금 날개 판금 흉갑 |  |
| 몸/기사 | [knight_body_07.png](../../assets/armor/knight_body_07.png) | 왕실 갑옷 | 검보라 판금·자수정·가시 흉갑 | O | T7 | 64 | 자수정 판금 흉갑 |  |
| 몸/기사 | [knight_body_08.png](../../assets/armor/knight_body_08.png) | 암흑 갑옷 | 황금 판금·붉은 보석·사자 흉갑 | X | T7 | 68 | 황금 사자 판금 흉갑 |  |
| 몸/기사 | [knight_body_09.png](../../assets/armor/knight_body_09.png) | 번개 갑옷 | 파랑 얼음 결정·첨탑 흉갑 | X | T5 | 41 | 빙정 판금 흉갑 |  |
| 몸/기사 | [knight_body_10.png](../../assets/armor/knight_body_10.png) | 태양의 갑옷 | 붉은/금 판금·불꽃·홍보석 흉갑 | O | T6 | 56 | 화염 판금 흉갑 |  |
| 손/기사 | [knight_hands_01.png](../../assets/armor/knight_hands_01.png) | 나무 장갑 | 갈색 녹/사용흔·무장 장식 적음 건틀릿 | X | T1 | 6 | 녹슨 판금 건틀릿 |  |
| 손/기사 | [knight_hands_02.png](../../assets/armor/knight_hands_02.png) | 낡은 장갑 | 회색 판금·금테·작은 날개 문양 건틀릿 | X | T2 | 11 | 날개 문양 판금 건틀릿 |  |
| 손/기사 | [knight_hands_03.png](../../assets/armor/knight_hands_03.png) | 철 장갑 | 푸른 천/도색·금테·청보석 건틀릿 | O | T3 | 21 | 청보석 판금 건틀릿 |  |
| 손/기사 | [knight_hands_04.png](../../assets/armor/knight_hands_04.png) | 강철 장갑 | 붉은 천·금장·사자 문장 건틀릿 | O | T4 | 31 | 붉은 사자 판금 건틀릿 |  |
| 손/기사 | [knight_hands_05.png](../../assets/armor/knight_hands_05.png) | 기사의 장갑 | 검정 판금·붉은 균열·가시 건틀릿 | O | T6 | 51 | 용암 판금 건틀릿 |  |
| 손/기사 | [knight_hands_06.png](../../assets/armor/knight_hands_06.png) | 서리 장갑 | 흰/금 판금·날개·청보석 건틀릿 | X | T7 | 61 | 황금 날개 판금 건틀릿 |  |
| 손/기사 | [knight_hands_07.png](../../assets/armor/knight_hands_07.png) | 왕실 장갑 | 검보라 판금·자수정·가시 건틀릿 | O | T7 | 64 | 자수정 판금 건틀릿 |  |
| 손/기사 | [knight_hands_08.png](../../assets/armor/knight_hands_08.png) | 암흑 장갑 | 황금 판금·붉은 보석·사자 건틀릿 | X | T7 | 68 | 황금 사자 판금 건틀릿 |  |
| 손/기사 | [knight_hands_09.png](../../assets/armor/knight_hands_09.png) | 번개 장갑 | 파랑 얼음 결정·첨탑 건틀릿 | X | T5 | 41 | 빙정 판금 건틀릿 |  |
| 손/기사 | [knight_hands_10.png](../../assets/armor/knight_hands_10.png) | 태양의 장갑 | 붉은/금 판금·불꽃·홍보석 건틀릿 | O | T6 | 56 | 화염 판금 건틀릿 |  |
| 발/기사 | [knight_feet_01.png](../../assets/armor/knight_feet_01.png) | 나무 신발 | 갈색 녹/사용흔·무장 장식 적음 철장화 | X | T1 | 6 | 녹슨 판금 철장화 |  |
| 발/기사 | [knight_feet_02.png](../../assets/armor/knight_feet_02.png) | 낡은 신발 | 회색 판금·금테·작은 날개 문양 철장화 | X | T2 | 11 | 날개 문양 판금 철장화 |  |
| 발/기사 | [knight_feet_03.png](../../assets/armor/knight_feet_03.png) | 철 신발 | 푸른 천/도색·금테·청보석 철장화 | O | T3 | 21 | 청보석 판금 철장화 |  |
| 발/기사 | [knight_feet_04.png](../../assets/armor/knight_feet_04.png) | 강철 신발 | 붉은 천·금장·사자 문장 철장화 | O | T4 | 31 | 붉은 사자 판금 철장화 |  |
| 발/기사 | [knight_feet_05.png](../../assets/armor/knight_feet_05.png) | 기사의 신발 | 검정 판금·붉은 균열·가시 철장화 | O | T6 | 51 | 용암 판금 철장화 |  |
| 발/기사 | [knight_feet_06.png](../../assets/armor/knight_feet_06.png) | 서리 신발 | 흰/금 판금·날개·청보석 철장화 | X | T7 | 61 | 황금 날개 판금 철장화 |  |
| 발/기사 | [knight_feet_07.png](../../assets/armor/knight_feet_07.png) | 왕실 신발 | 검보라 판금·자수정·가시 철장화 | O | T7 | 64 | 자수정 판금 철장화 |  |
| 발/기사 | [knight_feet_08.png](../../assets/armor/knight_feet_08.png) | 암흑 신발 | 황금 판금·붉은 보석·사자 철장화 | X | T7 | 68 | 황금 사자 판금 철장화 |  |
| 발/기사 | [knight_feet_09.png](../../assets/armor/knight_feet_09.png) | 번개 신발 | 파랑 얼음 결정·첨탑 철장화 | X | T5 | 41 | 빙정 판금 철장화 |  |
| 발/기사 | [knight_feet_10.png](../../assets/armor/knight_feet_10.png) | 태양의 신발 | 붉은/금 판금·불꽃·홍보석 철장화 | O | T6 | 56 | 화염 판금 철장화 |  |
| 머리/마법사 | [mage_head_01.png](../../assets/armor/mage_head_01.png) | 나무 투구 | 흰색·금테·파랑 보석 후드 | X | T4 | 31 | 청보석 백금장 후드 |  |
| 머리/마법사 | [mage_head_02.png](../../assets/armor/mage_head_02.png) | 낡은 투구 | 붉은 천·금테·홍보석 후드 | X | T4 | 36 | 홍보석 금장 후드 |  |
| 머리/마법사 | [mage_head_03.png](../../assets/armor/mage_head_03.png) | 철 투구 | 파랑 천·별/달·금테 마법사 모자 | X | T3 | 21 | 별과 달 마법사 모자 |  |
| 머리/마법사 | [mage_head_04.png](../../assets/armor/mage_head_04.png) | 강철 투구 | 초록 잎·가지·녹색 후드 | X | T2 | 16 | 덩굴잎 후드 |  |
| 머리/마법사 | [mage_head_05.png](../../assets/armor/mage_head_05.png) | 기사의 투구 | 흰/금·날개·청보석 후드 | X | T7 | 61 | 흰 날개 후드 |  |
| 머리/마법사 | [mage_head_06.png](../../assets/armor/mage_head_06.png) | 서리 투구 | 검보라·가시·자색 결정 후드 | X | T6 | 51 | 자수정 가시 후드 |  |
| 머리/마법사 | [mage_head_07.png](../../assets/armor/mage_head_07.png) | 왕실 투구 | 붉은색·금장·태양 문장 후드 | X | T6 | 56 | 태양 문장 후드 |  |
| 머리/마법사 | [mage_head_08.png](../../assets/armor/mage_head_08.png) | 암흑 투구 | 검갈색 가죽·갈색 띠·금속 버클 후드 | X | T2 | 18 | 검은 가죽 후드 |  |
| 머리/마법사 | [mage_head_09.png](../../assets/armor/mage_head_09.png) | 번개 투구 | 파랑 얼음 결정·눈꽃·첨탑 후드 | X | T5 | 41 | 빙정 후드 |  |
| 머리/마법사 | [mage_head_10.png](../../assets/armor/mage_head_10.png) | 태양의 투구 | 흰/금·붉은 보석·날개, 몸에는 털 칼라 후드 | X | T7 | 66 | 황금 날개 후드 |  |
| 몸/마법사 | [mage_body_01.png](../../assets/armor/mage_body_01.png) | 나무 갑옷 | 흰색·금테·파랑 보석 로브 | X | T4 | 31 | 청보석 백금장 로브 |  |
| 몸/마법사 | [mage_body_02.png](../../assets/armor/mage_body_02.png) | 낡은 갑옷 | 붉은 천·금테·홍보석 로브 | X | T4 | 36 | 홍보석 금장 로브 |  |
| 몸/마법사 | [mage_body_03.png](../../assets/armor/mage_body_03.png) | 철 갑옷 | 파랑 천·별/달·금테 로브 | X | T3 | 21 | 별과 달 로브 |  |
| 몸/마법사 | [mage_body_04.png](../../assets/armor/mage_body_04.png) | 강철 갑옷 | 초록 잎·가지·녹색 로브 | X | T2 | 16 | 덩굴잎 로브 |  |
| 몸/마법사 | [mage_body_05.png](../../assets/armor/mage_body_05.png) | 기사의 갑옷 | 흰/금·날개·청보석 로브 | X | T7 | 61 | 흰 날개 로브 |  |
| 몸/마법사 | [mage_body_06.png](../../assets/armor/mage_body_06.png) | 서리 갑옷 | 검보라·가시·자색 결정 로브 | X | T6 | 51 | 자수정 가시 로브 |  |
| 몸/마법사 | [mage_body_07.png](../../assets/armor/mage_body_07.png) | 왕실 갑옷 | 붉은색·금장·태양 문장 로브 | X | T6 | 56 | 태양 문장 로브 |  |
| 몸/마법사 | [mage_body_08.png](../../assets/armor/mage_body_08.png) | 암흑 갑옷 | 검갈색 가죽·갈색 띠·금속 버클 로브 | X | T2 | 18 | 검은 가죽 로브 |  |
| 몸/마법사 | [mage_body_09.png](../../assets/armor/mage_body_09.png) | 번개 갑옷 | 파랑 얼음 결정·눈꽃·첨탑 로브 | X | T5 | 41 | 빙정 로브 |  |
| 몸/마법사 | [mage_body_10.png](../../assets/armor/mage_body_10.png) | 태양의 갑옷 | 흰/금·붉은 보석·날개, 몸에는 털 칼라 로브 | X | T7 | 66 | 황금 날개 로브 |  |
| 손/마법사 | [mage_hands_01.png](../../assets/armor/mage_hands_01.png) | 나무 장갑 | 흰색·금테·파랑 보석 장갑 | X | T4 | 31 | 청보석 백금장 장갑 |  |
| 손/마법사 | [mage_hands_02.png](../../assets/armor/mage_hands_02.png) | 낡은 장갑 | 붉은 천·금테·홍보석 장갑 | X | T4 | 36 | 홍보석 금장 장갑 |  |
| 손/마법사 | [mage_hands_03.png](../../assets/armor/mage_hands_03.png) | 철 장갑 | 파랑 천·별/달·금테 장갑 | X | T3 | 21 | 별과 달 장갑 |  |
| 손/마법사 | [mage_hands_04.png](../../assets/armor/mage_hands_04.png) | 강철 장갑 | 초록 잎·가지·녹색 장갑 | X | T2 | 16 | 덩굴잎 장갑 |  |
| 손/마법사 | [mage_hands_05.png](../../assets/armor/mage_hands_05.png) | 기사의 장갑 | 흰/금·날개·청보석 장갑 | O | T7 | 61 | 흰 날개 장갑 |  |
| 손/마법사 | [mage_hands_06.png](../../assets/armor/mage_hands_06.png) | 서리 장갑 | 검보라·가시·자색 결정 장갑 | X | T6 | 51 | 자수정 가시 장갑 |  |
| 손/마법사 | [mage_hands_07.png](../../assets/armor/mage_hands_07.png) | 왕실 장갑 | 붉은색·금장·태양 문장 장갑 | O | T6 | 56 | 태양 문장 장갑 |  |
| 손/마법사 | [mage_hands_08.png](../../assets/armor/mage_hands_08.png) | 암흑 장갑 | 검갈색 가죽·갈색 띠·금속 버클 장갑 | O | T2 | 18 | 검은 가죽 장갑 |  |
| 손/마법사 | [mage_hands_09.png](../../assets/armor/mage_hands_09.png) | 번개 장갑 | 파랑 얼음 결정·눈꽃·첨탑 장갑 | X | T5 | 41 | 빙정 장갑 |  |
| 손/마법사 | [mage_hands_10.png](../../assets/armor/mage_hands_10.png) | 태양의 장갑 | 흰/금·붉은 보석·날개, 몸에는 털 칼라 장갑 | X | T7 | 66 | 황금 날개 장갑 |  |
| 발/마법사 | [mage_feet_01.png](../../assets/armor/mage_feet_01.png) | 나무 신발 | 흰색·금테·파랑 보석 장화 | X | T4 | 31 | 청보석 백금장 장화 |  |
| 발/마법사 | [mage_feet_02.png](../../assets/armor/mage_feet_02.png) | 낡은 신발 | 붉은 천·금테·홍보석 장화 | X | T4 | 36 | 홍보석 금장 장화 |  |
| 발/마법사 | [mage_feet_03.png](../../assets/armor/mage_feet_03.png) | 철 신발 | 파랑 천·별/달·금테 장화 | X | T3 | 21 | 별과 달 장화 |  |
| 발/마법사 | [mage_feet_04.png](../../assets/armor/mage_feet_04.png) | 강철 신발 | 초록 잎·가지·녹색 장화 | X | T2 | 16 | 덩굴잎 장화 |  |
| 발/마법사 | [mage_feet_05.png](../../assets/armor/mage_feet_05.png) | 기사의 신발 | 흰/금·날개·청보석 장화 | O | T7 | 61 | 흰 날개 장화 |  |
| 발/마법사 | [mage_feet_06.png](../../assets/armor/mage_feet_06.png) | 서리 신발 | 검보라·가시·자색 결정 장화 | X | T6 | 51 | 자수정 가시 장화 |  |
| 발/마법사 | [mage_feet_07.png](../../assets/armor/mage_feet_07.png) | 왕실 신발 | 붉은색·금장·태양 문장 장화 | O | T6 | 56 | 태양 문장 장화 |  |
| 발/마법사 | [mage_feet_08.png](../../assets/armor/mage_feet_08.png) | 암흑 신발 | 검갈색 가죽·갈색 띠·금속 버클 장화 | O | T2 | 18 | 검은 가죽 장화 |  |
| 발/마법사 | [mage_feet_09.png](../../assets/armor/mage_feet_09.png) | 번개 신발 | 파랑 얼음 결정·눈꽃·첨탑 장화 | X | T5 | 41 | 빙정 장화 |  |
| 발/마법사 | [mage_feet_10.png](../../assets/armor/mage_feet_10.png) | 태양의 신발 | 흰/금·붉은 보석·날개, 몸에는 털 칼라 장화 | X | T7 | 66 | 황금 날개 장화 |  |
| 머리/기사 | [tier_knight_0_01.png](../../assets/armor/tier_knight_0_01.png) | 없음(미사용) | 갈색 녹/사용흔·무장 장식 적음 투구 | — | T1 | 6 | 녹슨 판금 투구 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 머리/기사 | [tier_knight_0_02.png](../../assets/armor/tier_knight_0_02.png) | 없음(미사용) | 회색 판금·금테·작은 날개 문양 투구 | — | T2 | 11 | 날개 문양 판금 투구 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 머리/기사 | [tier_knight_0_03.png](../../assets/armor/tier_knight_0_03.png) | 없음(미사용) | 푸른 천/도색·금테·청보석 투구 | — | T3 | 21 | 청보석 판금 투구 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 머리/기사 | [tier_knight_0_04.png](../../assets/armor/tier_knight_0_04.png) | 없음(미사용) | 검보라 판금·자수정·가시·보라 오라 투구 | — | T7 | 64 | 자수정 판금 투구 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 머리/기사 | [tier_knight_0_05.png](../../assets/armor/tier_knight_0_05.png) | 없음(미사용) | 붉은/금 판금·불꽃·홍보석·불꽃 오라 투구 | — | T6 | 56 | 황금 화염 판금 투구 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 몸/기사 | [tier_knight_1_01.png](../../assets/armor/tier_knight_1_01.png) | 없음(미사용) | 갈색 녹/사용흔·무장 장식 적음 흉갑 | — | T1 | 6 | 녹슨 판금 흉갑 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 몸/기사 | [tier_knight_1_02.png](../../assets/armor/tier_knight_1_02.png) | 없음(미사용) | 회색 판금·금테·작은 날개 문양 흉갑 | — | T2 | 11 | 날개 문양 판금 흉갑 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 몸/기사 | [tier_knight_1_03.png](../../assets/armor/tier_knight_1_03.png) | 없음(미사용) | 푸른 천/도색·금테·청보석 흉갑 | — | T3 | 21 | 청보석 판금 흉갑 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 몸/기사 | [tier_knight_1_04.png](../../assets/armor/tier_knight_1_04.png) | 없음(미사용) | 검보라 판금·자수정·가시·보라 오라 흉갑 | — | T7 | 64 | 자수정 판금 흉갑 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 몸/기사 | [tier_knight_1_05.png](../../assets/armor/tier_knight_1_05.png) | 없음(미사용) | 황금 판금·붉은 보석·사자·불꽃 오라 흉갑 | — | T6 | 58 | 황금 화염 판금 흉갑 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 손/기사 | [tier_knight_2_01.png](../../assets/armor/tier_knight_2_01.png) | 없음(미사용) | 갈색 녹/사용흔·무장 장식 적음 건틀릿 | — | T1 | 6 | 녹슨 판금 건틀릿 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 손/기사 | [tier_knight_2_02.png](../../assets/armor/tier_knight_2_02.png) | 없음(미사용) | 회색 판금·금테·작은 날개 문양 건틀릿 | — | T2 | 11 | 날개 문양 판금 건틀릿 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 손/기사 | [tier_knight_2_03.png](../../assets/armor/tier_knight_2_03.png) | 없음(미사용) | 푸른 천/도색·금테·청보석 건틀릿 | — | T3 | 21 | 청보석 판금 건틀릿 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 손/기사 | [tier_knight_2_04.png](../../assets/armor/tier_knight_2_04.png) | 없음(미사용) | 검보라 판금·자수정·가시·보라 오라 건틀릿 | — | T7 | 64 | 자수정 판금 건틀릿 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 손/기사 | [tier_knight_2_05.png](../../assets/armor/tier_knight_2_05.png) | 없음(미사용) | 붉은/금 판금·불꽃·홍보석·불꽃 오라 건틀릿 | — | T6 | 56 | 황금 화염 판금 건틀릿 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 발/기사 | [tier_knight_3_01.png](../../assets/armor/tier_knight_3_01.png) | 없음(미사용) | 갈색 녹/사용흔·무장 장식 적음 철장화 | — | T1 | 6 | 녹슨 판금 철장화 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 발/기사 | [tier_knight_3_02.png](../../assets/armor/tier_knight_3_02.png) | 없음(미사용) | 회색 판금·금테·작은 날개 문양 철장화 | — | T2 | 11 | 날개 문양 판금 철장화 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 발/기사 | [tier_knight_3_03.png](../../assets/armor/tier_knight_3_03.png) | 없음(미사용) | 푸른 천/도색·금테·청보석 철장화 | — | T3 | 21 | 청보석 판금 철장화 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 발/기사 | [tier_knight_3_04.png](../../assets/armor/tier_knight_3_04.png) | 없음(미사용) | 검보라 판금·자수정·가시·보라 오라 철장화 | — | T7 | 64 | 자수정 판금 철장화 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 발/기사 | [tier_knight_3_05.png](../../assets/armor/tier_knight_3_05.png) | 없음(미사용) | 붉은/금 판금·불꽃·홍보석·불꽃 오라 철장화 | — | T6 | 56 | 황금 화염 판금 철장화 | 동일 계열 대체 외형(같은 티어, 주 외형과 중복 드랍 가중치 없음) |
| 머리/마법사 | [tier_mage_0_01.png](../../assets/armor/tier_mage_0_01.png) | 없음(미사용) | 갈색 낡은 천/가죽·단순 띠 마법사 모자 | — | T1 | 1 | 낡은 가죽 마법사 모자 | T1 의류 보완 |
| 머리/마법사 | [tier_mage_0_02.png](../../assets/armor/tier_mage_0_02.png) | 없음(미사용) | 초록 천/가죽·잎·녹보석 마법사 모자 | — | T2 | 11 | 녹보석 잎 마법사 모자 | 명시적 대체 외형(같은 티어) |
| 머리/마법사 | [tier_mage_0_03.png](../../assets/armor/tier_mage_0_03.png) | 없음(미사용) | 파랑 천·금테·청보석 마법사 모자 | — | T3 | 26 | 청보석 금장 마법사 모자 | 명시적 대체 외형(같은 티어) |
| 머리/마법사 | [tier_mage_0_04.png](../../assets/armor/tier_mage_0_04.png) | 없음(미사용) | 보라 천·금테·자색 결정 마법사 모자 | — | T6 | 54 | 자수정 금장 마법사 모자 | 명시적 대체 외형(같은 티어) |
| 머리/마법사 | [tier_mage_0_05.png](../../assets/armor/tier_mage_0_05.png) | 없음(미사용) | 흰/금·청보석·황금 발광 고리 마법사 모자 | — | T7 | 68 | 황금 광륜 마법사 모자 | 명시적 대체 외형(같은 티어) |
| 몸/마법사 | [tier_mage_1_01.png](../../assets/armor/tier_mage_1_01.png) | 없음(미사용) | 갈색 낡은 천/가죽·단순 띠 로브 | — | T1 | 1 | 낡은 가죽 로브 | T1 의류 보완 |
| 몸/마법사 | [tier_mage_1_02.png](../../assets/armor/tier_mage_1_02.png) | 없음(미사용) | 초록 천/가죽·잎·녹보석 로브 | — | T2 | 11 | 녹보석 잎 로브 | 명시적 대체 외형(같은 티어) |
| 몸/마법사 | [tier_mage_1_03.png](../../assets/armor/tier_mage_1_03.png) | 없음(미사용) | 파랑 천·금테·청보석 로브 | — | T3 | 26 | 청보석 금장 로브 | 명시적 대체 외형(같은 티어) |
| 몸/마법사 | [tier_mage_1_04.png](../../assets/armor/tier_mage_1_04.png) | 없음(미사용) | 보라 천·금테·자색 결정 로브 | — | T6 | 54 | 자수정 금장 로브 | 명시적 대체 외형(같은 티어) |
| 몸/마법사 | [tier_mage_1_05.png](../../assets/armor/tier_mage_1_05.png) | 없음(미사용) | 흰/금·청보석·황금 발광 고리 로브 | — | T7 | 68 | 황금 광륜 로브 | 명시적 대체 외형(같은 티어) |
| 손/마법사 | [tier_mage_2_01.png](../../assets/armor/tier_mage_2_01.png) | 없음(미사용) | 갈색 낡은 천/가죽·단순 띠 장갑 | — | T1 | 1 | 낡은 가죽 장갑 | T1 의류 보완 |
| 손/마법사 | [tier_mage_2_02.png](../../assets/armor/tier_mage_2_02.png) | 없음(미사용) | 초록 천/가죽·잎·녹보석 장갑 | — | T2 | 11 | 녹보석 잎 장갑 | 명시적 대체 외형(같은 티어) |
| 손/마법사 | [tier_mage_2_03.png](../../assets/armor/tier_mage_2_03.png) | 없음(미사용) | 파랑 천·금테·청보석 장갑 | — | T3 | 26 | 청보석 금장 장갑 | 명시적 대체 외형(같은 티어) |
| 손/마법사 | [tier_mage_2_04.png](../../assets/armor/tier_mage_2_04.png) | 없음(미사용) | 보라 천·금테·자색 결정 장갑 | — | T6 | 54 | 자수정 금장 장갑 | 명시적 대체 외형(같은 티어) |
| 손/마법사 | [tier_mage_2_05.png](../../assets/armor/tier_mage_2_05.png) | 없음(미사용) | 흰/금·청보석·황금 발광 고리 장갑 | — | T7 | 68 | 황금 광륜 장갑 | 명시적 대체 외형(같은 티어) |
| 발/마법사 | [tier_mage_3_01.png](../../assets/armor/tier_mage_3_01.png) | 없음(미사용) | 갈색 낡은 천/가죽·단순 띠 장화 | — | T1 | 1 | 낡은 가죽 장화 | T1 의류 보완 |
| 발/마법사 | [tier_mage_3_02.png](../../assets/armor/tier_mage_3_02.png) | 없음(미사용) | 초록 천/가죽·잎·녹보석 장화 | — | T2 | 11 | 녹보석 잎 장화 | 명시적 대체 외형(같은 티어) |
| 발/마법사 | [tier_mage_3_03.png](../../assets/armor/tier_mage_3_03.png) | 없음(미사용) | 파랑 천·금테·청보석 장화 | — | T3 | 26 | 청보석 금장 장화 | 명시적 대체 외형(같은 티어) |
| 발/마법사 | [tier_mage_3_04.png](../../assets/armor/tier_mage_3_04.png) | 없음(미사용) | 보라 천·금테·자색 결정 장화 | — | T6 | 54 | 자수정 금장 장화 | 명시적 대체 외형(같은 티어) |
| 발/마법사 | [tier_mage_3_05.png](../../assets/armor/tier_mage_3_05.png) | 없음(미사용) | 흰/금·청보석·황금 발광 고리 장화 | — | T7 | 68 | 황금 광륜 장화 | 명시적 대체 외형(같은 티어) |
| 반지 | [acc_0_01.png](../../assets/accessories/acc_0_01.png) | 구리 반지 | 회색 금속 띠·가죽 감개 | X | T1 | 1 | 철띠 반지 |  |
| 반지 | [acc_0_02.png](../../assets/accessories/acc_0_02.png) | 은 반지 | 은색 문양·네모 파랑 보석 | O | T3 | 21 | 청보석 은반지 |  |
| 반지 | [acc_0_03.png](../../assets/accessories/acc_0_03.png) | 금 반지 | 금색 문양·네모 녹보석 | O | T4 | 31 | 녹보석 금반지 |  |
| 반지 | [acc_0_04.png](../../assets/accessories/acc_0_04.png) | 보석 반지 | 검금색 가시·보라 구슬·오라 | O | T6 | 51 | 자수정 오라 반지 |  |
| 반지 | [acc_0_05.png](../../assets/accessories/acc_0_05.png) | 별빛 반지 (T5), 룬 반지 (T6), 고대 반지 (T7) | 황금 날개·푸른 구슬·광륜 | O/X/X | T7 | 61 | 황금 광륜 반지 | 현재 T5~T7 동일 그림 |
| 목걸이 | [acc_1_01.png](../../assets/accessories/acc_1_01.png) | 구리 목걸이 | 가죽 끈·큰 이빨 | X | T1 | 1 | 송곳니 목걸이 |  |
| 목걸이 | [acc_1_02.png](../../assets/accessories/acc_1_02.png) | 은 목걸이 | 은 사슬·큰 파랑 결정 | O | T3 | 21 | 청수정 은목걸이 |  |
| 목걸이 | [acc_1_03.png](../../assets/accessories/acc_1_03.png) | 금 목걸이 | 금 사슬·큰 녹보석 | O | T4 | 31 | 녹보석 금목걸이 |  |
| 목걸이 | [acc_1_04.png](../../assets/accessories/acc_1_04.png) | 보석 목걸이 | 금/보라 사슬·큰 자색 구슬 | O | T6 | 51 | 자수정 오라 목걸이 |  |
| 목걸이 | [acc_1_05.png](../../assets/accessories/acc_1_05.png) | 별빛 목걸이 (T5), 룬 목걸이 (T6), 고대 목걸이 (T7) | 황금 날개·청보석·황금 오라 | O/X/X | T7 | 61 | 황금 날개 목걸이 | 현재 T5~T7 동일 그림 |


### B1. 불일치 숫자와 집계 단위

| 범위 | 고유 이미지 | O | X(이 이미지에 틀린 이름 존재) | 미사용 — |
|---|---|---|---|---|
| 무기 | 50 | 24 | 26 | 0 |
| 기사 10종형 방어구 | 40 | 20 | 20 | 0 |
| 마법사 10종형 방어구 | 40 | 6 | 34 | 0 |
| 미사용 5종형 방어구 | 40 | 0 | 0 | 40 |
| 장신구 | 10 | 6 | 4 | 0 |
| 합계 | 180 | 56 | 84 | 40 |

**현재 사용 이미지 140장 중 이름 불일치 84장. 전체 조사 이미지 180장 중 84장 X, 40장은 이름 미배정입니다.** 장신구의 T5/T6/T7 중복 이름을 각각 세면 현재 기초 이름↔아이콘 조합은 **144건 중 86건 X**입니다. 옵션 무한 조합은 별도 이름으로 세지 않습니다. 이 숫자는 위 행의 판정만 합산한 것이며 코드 런타임의 X 0건 검사는 아직 만들지 않았습니다.

### B2. 코드의 나머지 장비 이름·아이콘 매핑

`town.js` 상점은 별도의 표시 목록 16개가 있습니다. 아래 표는 실제 보여 주는 이미지 기준이며 B1 고유 이미지 숫자에 중복 합산하지 않습니다. 시작 활·필드/던전/상자·길드 보상은 모두 UI.make를 사용하므로 B표가 전체 생성기 매핑입니다. 일반점 물약은 장비가 아니어서 장비 집계에 포함하지 않습니다.

| 상점 아이콘 키 | 현재 상점 이름 | 현재 표시 파일 | O/X | 승인용 이름 | 승인용 티어/착용 |
|---|---|---|---|---|---|
| sword_01 | 나무 검 | [sword_01.png](../../assets/weapons/sword_01.png) | O | 목검 | T1 / Lv1 |
| sword_02 | 낡은 검 | [sword_02.png](../../assets/weapons/sword_02.png) | X | 짧은 철검 | T1 / Lv6 |
| spear_01 | 나무 창 | [spear_01.png](../../assets/weapons/spear_01.png) | X | 나무 자루 창 | T1 / Lv1 |
| spear_02 | 낡은 창 | [spear_02.png](../../assets/weapons/spear_02.png) | X | 철테 창 | T1 / Lv6 |
| gauntlet_01 | 나무 건틀릿 | [gauntlet_01.png](../../assets/weapons/gauntlet_01.png) | X | 붕대 주먹 | T1 / Lv1 |
| gauntlet_02 | 낡은 건틀릿 | [gauntlet_02.png](../../assets/weapons/gauntlet_02.png) | X | 가죽 전투장갑 | T1 / Lv6 |
| bow_01 | 나무 활 | [bow_01.png](../../assets/weapons/bow_01.png) | O | 기본 목궁 | T1 / Lv1 |
| bow_02 | 낡은 활 | [bow_02.png](../../assets/weapons/bow_02.png) | X | 조각 목궁 | T1 / Lv7 |
| staff_01 | 나무 지팡이 | [staff_01.png](../../assets/weapons/staff_01.png) | O | 나뭇가지 지팡이 | T1 / Lv1 |
| staff_02 | 낡은 지팡이 | [staff_02.png](../../assets/weapons/staff_02.png) | X | 새잎 보석 지팡이 | T2 / Lv11 |
| armor_0 | 낡은 투구 | [knight_head_02.png](../../assets/armor/knight_head_02.png) | X | 날개 문양 판금 투구 | T2 / Lv11 |
| armor_1 | 낡은 갑옷 | [knight_body_02.png](../../assets/armor/knight_body_02.png) | X | 날개 문양 판금 흉갑 | T2 / Lv11 |
| armor_2 | 낡은 장갑 | [knight_hands_02.png](../../assets/armor/knight_hands_02.png) | X | 날개 문양 판금 건틀릿 | T2 / Lv11 |
| armor_3 | 낡은 신발 | [knight_feet_02.png](../../assets/armor/knight_feet_02.png) | X | 날개 문양 판금 철장화 | T2 / Lv11 |
| ring | 구리 반지 | [acc_0_01.png](../../assets/accessories/acc_0_01.png) | X | 철띠 반지 | T1 / Lv1 |
| neck | 구리 목걸이 | [acc_1_01.png](../../assets/accessories/acc_1_01.png) | X | 송곳니 목걸이 | T1 / Lv1 |

상점 목록은 **16건 중 13건 X**입니다. `armor_0~3` 별칭은 `knight_*_02`지만 구매 spec에는 style이 없어 기사/마법사를 50%씩 뽑습니다. 승인 후 표시 목록·구매 결과는 동일한 명시적 외형 ID를 사용해야 합니다. `ring`/`neck` 별칭은 첫 번째 이미지입니다. 시작 무기는 bow_01, B표대로 T1/Lv1입니다. 상점 성장/랜덤 옵션 개편은 별도 예정작업이며 이번에는 이름·실물 일치만 바로잡습니다.

### B3. 최종 슬롯×티어×계열 충족표

기사/마법사는 직업 제한이 아니라 외형 계열입니다. 각 칸은 해당 티어에 최소 1종이 있는지를 검사합니다. 후보가 여러 장이면 B표의 개별 Lv·이름을 그대로 사용하고 난수 번호를 이름에 조합하지 않습니다.

| 슬롯·계열 | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
|---|---|---|---|---|---|---|---|
| 검 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 창 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 건틀릿 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 활 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 지팡이 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 머리/기사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 몸/기사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 손/기사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 발/기사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 머리/마법사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 몸/마법사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 손/마법사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 발/마법사 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 | 있음 |
| 반지 | 있음 | **부족** | 있음 | 있음 | **부족** | 있음 | 있음 |
| 목걸이 | 있음 | **부족** | 있음 | 있음 | **부족** | 있음 | 있음 |

장비 부족은 **장신구 T2·T5의 반지/목걸이 4칸**입니다. T6·T7에 기존 최고 외형을 억지 재사용하지 않고, 보라 오라 4번을 T6, 황금 광륜 5번을 T7로 배정합니다. 기존 장비는 부위별로 T1~T7 모두 채울 수 있으므로 추가 기사/마법사 그림을 무조건 요청하지 않습니다. T1 마법사 의류는 tier_mage_*_01을 정식 활용합니다.

## C. 승인용 최종 기준과 출현표

### C1. 티어 상대 강도와 등급 차이

수치 100배 패치는 하지 않습니다. 아래는 **현재 수치 단위의 상대 배율 제안**입니다. 같은 기본 외형을 무조건 7지역에 복사하는 현재 방식을 폐지하고, 개체 ID마다 티어·종별 계수·등급·최소 몬스터 레벨을 고정합니다. 티어 안에서만 완만한 플레이어 레벨 추종(HP 최대+30%, 공격 최대+15%)을 유지하며, 고티어 개체를 저레벨 플레이어에게 맞춰 약하게 낮추지 않습니다.

| 티어 | 일반 HP배율 | 일반 공격배율 | 일반 EXP배율 | 금화배율 | 보정 전 기준 HP / 공격 / EXP |
|---|---|---|---|---|---|
| T1 | 1 | 1 | 1 | 1 | 32 / 5 / 2 |
| T2 | 2.4 | 1.8 | 2.5 | 1.8 | 77 / 9 / 5 |
| T3 | 5.2 | 3 | 3.5 | 2.8 | 166 / 15 / 7 |
| T4 | 10.5 | 4.6 | 4.5 | 4.2 | 336 / 23 / 9 |
| T5 | 20 | 6.8 | 5.5 | 6 | 640 / 34 / 11 |
| T6 | 36 | 9.5 | 6.5 | 8.2 | 1152 / 48 / 13 |
| T7 | 62 | 13 | 7.5 | 11 | 1984 / 65 / 15 |

기준 일반몹 HP32/공격5/EXP2. 종별 계수: 소형(토끼·일반 슬라임·벌레) HP0.75/공격0.8, 표준(고블린·해골·거미·버섯·정령) 1/1, 중형(로그·하피·마법사·가고일) 1.2/1.1, 대형(곰·오우거·중무장 오크·데몬·용·리치) 1.5/1.2. 이후 아래 등급배율을 곱하고 마지막에 반올림합니다. 종별 계수는 이미지의 크기·무장/체격을 반영하며 티어 차이를 역전하지 않도록 제한합니다. 기존 각 종 MOBDEF를 그대로 티어배율에 중복 곱하지 않습니다.

| 구분 | HP | 공격 | EXP | 금화 | 기본 장비 드랍(발견 보정 전) |
|---|---|---|---|---|---|
| 일반 | ×1 | ×1 | ×1 | ×1 | 30% |
| 정예 | ×2.2 | ×1.45 | ×3 | ×2 | 55% |
| 우두머리: 군집 리더 | ×3.5 | ×1.6 | ×4 | ×3 | 장비 1개 확정, 추가 장비 없음 |
| 우두머리: 던전 3층 단위 | ×8 | ×2.2 | ×8 | ×6 | 장비1개 확정 + 65%로 1개 추가 |

EXP는 개체 티어의 기준값에 종별 계수는 곱하지 않고 등급배율과 기존 저티어 감쇠만 적용합니다. 상위티어 조기 보너스를 또 곱하지 않습니다. 경험치 곡선 `expNeed`는 그대로 유지합니다. 새 EXP 기준은 티어 중간 레벨의 현재 EXP 수준에 맞춘 제안이며, 최종 시간 목표는 승인 후 처치시간/사냥량으로 검증해야 합니다. 상위 지역에 들어가면 낮은 레벨이라도 높은 HP·공격력은 유지됩니다. 예: 표준 T1 HP32/공격5 → T3 HP166/공격15 → T7 HP1984/공격65(추종 보정 전). Lv6이 T3 일반에게 쉽게 버티는 현상을 줄이는 기준입니다.
던전 층내 1/2/3 순번은 HP×1.00/1.08/1.16, 공격×1.00/1.05/1.10. 군집 리더와 층 우두머리는 둘 다 우두머리이지만 보상·목적을 구분하여 3층 단위 보상을 필드에 대량 복제하지 않습니다. 미믹은 정예이며 각 티어의 실제 상자 재질을 가진 변형만 허용합니다.
드랍 티어는 개체 티어와 동일합니다. 다른 티어 외형을 추첨하지 않습니다. 장비 등급은 **일반/마법/희귀/전설**이고 위 배치 티어와 독립입니다. 기본 희귀도 확률은 A2의 기존 7티어 표를 유지합니다. 정예는 “일반” 확률에서 10%p를 빼 희귀에 +8%p/전설에 +2%p(T1~T3 전설 금지, 해당 2%p는 희귀로) 이동. 군집 리더·층 우두머리는 일반 확률에서 20%p를 빼 희귀+15%p/전설+5%p(T1~T3은 희귀로) 이동. 옵션 종류·범위·경제 분리·상점 성장 계획은 건드리지 않습니다.

### C2. 승인용 개체 ID·이름·레벨·지역·등급

아래는 **실제 활성화할 개체**입니다. A3의 예비/보관 외형은 이 표에 없으면 무작위 스폰하지 않습니다. `신규 필요`는 아직 파일이 없으므로 에셋 확보 전 대체 그림으로 출시하지 않습니다. 레벨은 개체의 최소 레벨이고, 표시 `mobLv=max(개체Lv, 티어최소Lv+within)`(티어상한 이하)로 합니다. 모든 개체에 적용할 HP/공격/EXP는 C1 공식으로 고정합니다. 계열명 ID는 특수기 판정을 위한 `family`로 보존하고, 변형 ID를 별도로 둡니다.

| 제안 개체 ID | 제안 표시 이름 | 티어 | 최소 몬스터Lv | 구분 | 제안 위치 | 외형 근거/파일군 | 종별 계수 |
|---|---|---|---|---|---|---|---|
| rabbit | 풀잎 토끼 | 1 | 1 | 일반 | 봄 | 토끼 3방향 | 소형 |
| slime | 초원 슬라임 | 1 | 2 | 일반 | 봄·1~3층 | slime_01/06 | 소형 |
| beetle | 검푸른 딱정벌레 | 1 | 4 | 일반 | 봄 | bug_01 | 소형 |
| locust | 초원 메뚜기 | 1 | 5 | 일반 | 봄 | bug_03 | 소형 |
| goblin_scout | 고블린 정찰병 | 1 | 6 | 일반 | 봄·1~3층 | goblin_10 | 표준 |
| skeleton_bare | 맨손 해골 | 1 | 8 | 일반 | 1~3층만 | skeleton_06/07/08 | 표준 |
| slime_king | 킹슬라임 | 1 | 10 | 우두머리 | 봄 군집·3층 | slime_05 | 소형 |
| slime_water | 물가 슬라임 | 2 | 11 | 일반 | 여름 물가·4~6층 | slime_02 | 소형 |
| goblin_spear | 고블린 창병 | 2 | 12 | 일반 | 여름·4~6층 | goblin_01~09 | 표준 |
| spider | 숲 거미 | 2 | 13 | 일반 | 여름·4~6층 | spider_01~06 | 표준 |
| mushroom_brown | 갈색 버섯괴물 | 2 | 14 | 일반 | 여름·4~6층 | mushroom_01/02 | 표준 |
| skeleton_sword | 해골 검병 | 2 | 15 | 일반 | 4~6층만 | skeleton_01 | 표준 |
| elem_water | 물방울 정령 | 2 | 16 | 일반 | 여름 물가 | elem_water_01~03 | 표준 |
| wasp | 숲의 큰 말벌 | 2 | 17 | 정예 | 여름 | bug_02 | 소형 |
| bear | 큰 갈색 곰 | 2 | 18 | 정예 | 여름 | 곰 3방향 | 대형 |
| mimic_wood | 나무 상자 미믹 | 2 | 19 | 정예 | 4~6층 상자 | mimic_01~04 | 표준 |
| spider_chief | 숲 거미 무리장 | 2 | 20 | 우두머리 | 여름/4~6층 군집 | spider_01~06·120% | 표준 |
| elem_wood | 고목 정령 | 2 | 20 | 우두머리 | 6층 | elem_wood_01~03 | 표준 |
| skeleton_round | 해골 방패병 | 3 | 21 | 일반 | 7~9층만 | skeleton_02/03 | 표준 |
| skeleton_archer | 해골 궁병 | 3 | 22 | 일반 | 7~9층만 | skeleton_05 | 표준 |
| elem_wind | 회오리 정령 | 3 | 23 | 일반 | 가을 | elem_wind_01~03 | 표준 |
| rogue | 복면 약탈자 | 3 | 24 | 일반 | 가을·7~9층 | 로그 3방향 | 중형 |
| ogre_brawler | 갈색 오우거 | 3 | 25 | 일반 | 가을·7~9층 | orc_01~04/06/09 | 대형 |
| skeleton_guard | 해골 철테 방패병 | 3 | 26 | 정예 | 7~9층만 | skeleton_04 | 표준 |
| harpy | 붉은 깃털 하피 | 3 | 27 | 정예 | 가을 | 하피 3방향 | 중형 |
| ogre_club | 철퇴 오우거 | 3 | 28 | 정예 | 가을·7~9층 | orc_05/07,08은 재분리 | 대형 |
| mimic_iron | 철테 상자 미믹 | 3 | 29 | 정예 | 7~9층 상자 | 신규 필요 M2 | 표준 |
| skeleton_mage | 마법 스켈레톤 | 3 | 30 | 우두머리 | 7~9층 군집 | 신규 필요 M1 | 중형 |
| ogre_chief | 철퇴 오우거 무리장 | 3 | 30 | 우두머리 | 가을 군집·9층 | 철퇴 오우거·120% | 대형 |
| wolf | 설원 늑대 | 4 | 31 | 일반 | 겨울·10~12층 | 늑대 3방향 | 표준 |
| elem_ice | 빙정 정령 | 4 | 35 | 일반 | 겨울·10~12층 | elem_ice_01~03 | 표준 |
| mimic_frost | 서리 상자 미믹 | 4 | 39 | 정예 | 10~12층 상자 | 신규 필요 M2 | 표준 |
| wolf_chief | 설원 늑대 무리장 | 4 | 40 | 우두머리 | 겨울 군집·12층 | 늑대 3방향·120% | 표준 |
| skeleton_frost | 서리 갑주 해골 | 5 | 41 | 일반 | 얼음·13~15층 | 신규 필요 M1 | 표준 |
| ice_guard | 얼음 갑주 정령 | 5 | 44 | 일반 | 얼음·13~15층 | 신규 필요 M1 | 표준 |
| darkmage | 보라 해골 마법사 | 5 | 47 | 정예 | 얼음 동굴·13~15층 | 다크메이지 3방향 | 중형 |
| gargoyle | 동굴 석상 수호자 | 5 | 49 | 정예 | 13~15층만 | gargoyle_01~06 | 중형 |
| mimic_crystal | 빙정 상자 미믹 | 5 | 49 | 정예 | 13~15층 상자 | 신규 필요 M2 | 표준 |
| ice_guard_chief | 얼음 갑주 무리장 | 5 | 50 | 우두머리 | 얼음 군집·15층 | ice_guard 신규 외형·120% | 표준 |
| elem_fire | 화염 정령 | 6 | 51 | 일반 | 화산·16~18층 | elem_fire_01~04 | 표준 |
| orc | 중무장 녹색 오크 | 6 | 54 | 일반 | 화산·16~18층 | 오크 3방향 | 대형 |
| succubus | 박쥐 날개 서큐버스 | 6 | 57 | 정예 | 16~18층만 | 서큐버스 3방향 | 중형 |
| demon | 붉은 갑주 데몬 | 6 | 58 | 정예 | 화산·16~18층 | 데몬 3방향 | 대형 |
| mimic_lava | 용암 상자 미믹 | 6 | 59 | 정예 | 16~18층 상자 | 신규 필요 M2 | 표준 |
| fire_chief | 화염 정령 무리장 | 6 | 60 | 우두머리 | 화산/16~18층 군집 | 화염 정령·120% | 표준 |
| dragon | 붉은 비늘 드래곤 | 6 | 60 | 우두머리 | 18층 | 드래곤 3방향 | 대형 |
| slime_toxic | 독주머니 슬라임 | 7 | 61 | 일반 | 늪·19층 이후 | 신규 필요 M1 | 소형 |
| spider_toxic | 늪 독거미 | 7 | 63 | 일반 | 늪·19층 이후 | 신규 필요 M1 | 표준 |
| mushroom_toxic | 포자 독버섯 | 7 | 65 | 일반 | 늪·19층 이후 | 신규 필요 M1 | 표준 |
| skeleton_swamp | 늪 이끼 해골 | 7 | 66 | 일반 | 늪·19층 이후 | 신규 필요 M1 | 표준 |
| swamp_mage | 늪의 저주술사 | 7 | 68 | 정예 | 늪·19층 이후 | 신규 필요 M1 | 중형 |
| mimic_swamp | 늪 상자 미믹 | 7 | 69 | 정예 | 19층 이후 상자 | 신규 필요 M2 | 표준 |
| lich | 녹색 불꽃 리치 | 7 | 70 | 우두머리 | 늪 군집·21/24/27…층 | 리치 3방향 | 대형 |


### C3. 던전 층별 활성 풀

| 층 | 테마 | 일반 풀 | 층 우두머리 | 정예 풀 |
|---|---|---|---|---|
| 1~3 | T1 봄 동굴 | slime, goblin_scout, skeleton_bare | 킹슬라임 (3층) | 없음 |
| 4~6 | T2 숲 동굴 | slime_water, goblin_spear, spider, mushroom_brown, skeleton_sword | 고목 정령 (6층) | mimic_wood |
| 7~9 | T3 들판 유적 | skeleton_round, skeleton_archer, rogue, ogre_brawler | 오우거 무리장 (9층) | skeleton_guard, ogre_club, mimic_iron |
| 10~12 | T4 설원 동굴 | wolf, elem_ice | 설원 늑대 무리장 (12층) | mimic_frost |
| 13~15 | T5 얼음 동굴 | skeleton_frost, ice_guard | 얼음 갑주 무리장 (15층) | darkmage, gargoyle, mimic_crystal |
| 16~18 | T6 화산 동굴 | elem_fire, orc | 드래곤 (18층) | succubus, demon, mimic_lava |
| 19층 이후 | T7 늪 동굴 | slime_toxic, spider_toxic, mushroom_toxic, skeleton_swamp | 리치 (21·24·27…층) | swamp_mage, mimic_swamp |

T7은 19~21층 패턴을 22~24·25~27…층에서 반복하며 몬스터 티어/레벨/보상은 T7/최대70을 유지합니다. T1에 리치·마법사·갑주 오크를 넣지 않습니다. 얼음에는 슬라임이 없습니다. T7에 초록 젤리/귀여운 버섯/숲 거미를 크기만 키워 복사하지 않습니다. 각 필드의 최종 일반/정예 풀은 C2의 해당 지역 행만 사용합니다. 군집이 없는 정예는 티어당 1~2개 조우 범위로 두고, 스폰 총량·리젠 확대는 별도 밸런스 패치에서 확정합니다.

### C4. 군집 배치 (케인 추가 확정 2026-10-04)

**일반 여러 마리 + 기본 크기의 120%인 무리 우두머리 1마리를 함께 배치합니다.** 킹슬라임과 일반 슬라임, 마법 스켈레톤과 일반 스켈레톤처럼 같은 계열/진영·설정에 맞는 조합을 씁니다. 120%는 가로·세로 각각 ×1.20이며 면적은 ×1.44입니다. 파일 여백을 포함한 캔버스 크기가 아니라 동일 계열의 실제 몸 크기를 기준으로 정규화합니다. 티어가 다른 일반몹을 따라붙이는 방식은 금지합니다.

| 티어·장소 | 군집 리더(1마리) | 동반 몬스터 | 모두 같은 티어 | 크기/차별화 | 에셋 상태 |
|---|---|---|---|---|---|
| T1 봄·1~3층 | slime_king 킹슬라임 | slime 초원 슬라임 4~6 | T1 | 일반 몸 기준120% + 실제 왕관 + 점프/슬라임 장판 | 기존 그림 |
| T2 여름·4~6층 | spider_chief 숲 거미 무리장 | spider 숲 거미 4~5 | T2 | 120% + 명확한 우두머리 표식 + 거미줄 선행 | 기존 그림 크기 차 + 리더 표식 |
| T3 7~9층 | skeleton_mage 마법 스켈레톤 | skeleton_round 3~4 + skeleton_archer 1~2 | T3 | 120% + 지팡이/해골 마법 + 전열/후열 | 마법 스켈레톤 신규 필요 |
| T3 가을·9층 | ogre_chief 철퇴 오우거 무리장 | ogre_brawler 3~4 | T3 | 120% + 대형 철퇴·내려치기, 부하 맨손 | 기존 그림 |
| T4 겨울·12층 | wolf_chief 설원 늑대 무리장 | wolf 설원 늑대 4~5 | T4 | 120% + 리더 표식·울부짖기 예고, 부하 돌진 | 기존 그림 크기 차 + 리더 표식 |
| T5 얼음·15층 | ice_guard_chief 얼음 갑주 무리장 | ice_guard 3~4 | T5 | 120% + 리더 표식·빙결 장판 | 갑주 정령 신규 필요 |
| T6 화산·16~18층 | fire_chief 화염 정령 무리장 | elem_fire 4~6 | T6 | 120% + 리더 표식·장판 예고, 부하 화염탄 | 기존 그림 크기 차 + 리더 표식 |
| T7 늪·21층 이후 | lich 녹색 불꽃 리치 | skeleton_swamp 4~6 | T7 | 리치 기본 몸120%, 해골 지팡이·녹색 불꽃·부하 이끼 갑주 | 부하 해골 신규 필요 |

군집 우두머리는 독립 데이터(`rank=boss`, `bossRole=pack`)로 둡니다. C1의 군집 보상을 적용하며 층 우두머리가 같은 리더일 때만 `bossRole=floor`로 승격합니다. **같은 조우에서 군집 리더와 층 우두머리를 두 마리 중복 생성하지 않습니다.** 일반/정예/우두머리 HP바에 이름·Lv·T·등급을 명시합니다. 리더 표식은 작은 왕관 UI 표시이며 새 이미지를 위장하는 색칠이 아닙니다. 킹슬라임은 이미지 왕관을 그대로 쓰므로 UI 표식을 중복하지 않습니다.
군집 전체를 한 번에 스폰하며 안전구역·진입점·계단에서 떨어진 통행 가능한 공간을 확보합니다. 부하는 리더 주변 서로 겹치지 않는 고리/전열/후열에 배치합니다. 스폰 시 리더 몸 중심 간격 최소1.4몸폭, 일반끼리 최소1.1몸폭. 리더 1+부하 최대6, 군집 반경은 약 3~5몸폭. 큰 종은 군집 수를 줄여 1+3~4로 하고 통로 폭이 부족하면 넓은 방/공터로 옮깁니다. 군집에 넣은 부하를 같은 방 일반 스폰에서 다시 더하지 않습니다. 군집 밖에서도 과도한 겹침을 방지합니다.
군집 구성원은 같은 경계/추격영역을 공유하지만 벽·통로를 뚫고 동시에 덮치지 않습니다. 마법 스켈레톤/리치는 후열, 방패 해골은 전열, 궁병은 측면 후열입니다. 리더 특수기는 명확한 예고 후 실행하고 부하 공격 타이밍을 분산합니다. 구체적인 새 마법/소환 패턴은 별도 특수공격 작업이며, 이번 반영 단계에서는 기존 기술을 해당 계열에 정합화하고 군집 스폰·표시·등급/보상만 연결합니다. 자동 소환으로 무한 EXP 파밍을 만들지 않습니다.
군집은 필드의 일부 조우점/넓은 던전 방에 배치합니다. 여기서 총 몬스터 수나 리젠을 임의로 늘리지는 않습니다. T1 봄 모든 곳이 보스 무리가 되는 일을 피하고, 일반 단독/소규모 무리와 함께 분포시킵니다. 군집 크기·리더120%·동반 개체 ID를 데이터로 명시하여 기획 표와 실제 스폰을 검사할 수 있게 합니다.

### C5. 같은 계열의 약→강 순서와 예비 처리

| 계열 | 낮은 티어 → 높은 티어 | 동작/방향과 구분 |
|---|---|---|
| 슬라임 | T1 초록/왕관 → T2 파랑 물가 → T7 독주머니 신규 | slime_06은 T1 동작. 빨강/노랑 T2 예비는 색만으로 고티어 아님 |
| 해골 | T1 맨손 → T2 검 → T3 검방패/궁병/마법 리더 → T5 서리 갑주 신규 → T7 이끼 갑주 신규 | 06/07/08 및 02/03은 각각 동일 단계; 마법 리더는 새 지팡이 그림 |
| 고블린 | T1 무창 정찰병 → T2 창병 | 01~09 창병 동작은 같은 T2 |
| 오우거/오크 | T3 갈색 맨손 → T3 갈색 철퇴 정예/무리장 → T6 녹색 중무장 오크 | 녹색 오크와 갈색 오우거는 같은 성장 이미지가 아닌 친연 분기 |
| 거미·버섯 | T2 숲 거미/버섯 → T7 독낭·독포자 신규 | 모든 현재 방향/자세는 T2에 묶음 |
| 얼음 정령 | T4 작은 결정 정령 → T5 중장 갑주 정령 신규/무리장 | 기존 01/02/03은 방향/자세이므로 T5로 억지 분리하지 않음 |
| 마법 적 | T3 해골 마법 리더 신규 → T5 보라 해골 마법사 → T7 늪 저주술사/리치 | 서로 다른 외형·역할. 기존 리치를 모든층에 복사하지 않음 |
| 미믹 | T2 나무 → T3 철테 → T4 서리 → T5 빙정 → T6 용암 → T7 늪 | 각 티어 상자 닫힘/입벌림은 동작쌍, 성장 두 단계가 아님 |

예비: slime_red, slime_gold, mushroom_red, mushroom_red_angry, 일부 tier_* 대체 장비는 표대로 등록 가능하나 최종 활성 풀에는 자동 혼입하지 않습니다. monsters_v1은 판독은 완료했지만 새 그림과 옛 화풍 혼용을 막기 위해 보관합니다. 승인 후에도 이미지의 생김새를 임의로 바꾸지 않습니다.

## D. 부족 이미지 시트 요청서

**확보 완료(2026-10-04):** 승인 후 아래 3개 시트38칸을 확보하여 `source_sheets/tier_match/`에 원본·정규화 시트·manifest를 보관했습니다. `tools/slice_tier_match.py`로 장신구4장, 몬스터 방향24장, 미믹10장을 분리했습니다. 아래 요청서는 조사 당시 부족분의 디자인 기준으로 남깁니다. orc_08의 두 오우거 동작도 `ogre_club_pose_1/2.png`로 분리했으며 활성 풀에는 혼입하지 않습니다.

그림은 **낱장 대신 아래 시트**로 요청합니다. 이번 단계에서 생성/가공/에셋 교체는 하지 않습니다. 요청 이름은 임시 파일명과 코드 ID를 명확하게 지정했으며, 실제 생성물이 확보되면 같은 문서의 “신규 필요”를 실물 파일로 대조한 뒤 반영합니다. 부족 에셋이 없는 티어/슬롯에는 추가 요청하지 않습니다.

### D1. 장신구 시트 E1 — 2열 × 2행, 총4칸

시트 ID: `sheet_tier_accessories_gap_v1.png`. 정사각 256px 칸, 전체512×512(또는 동일비율 고해상도). 행=티어, 열=슬롯. 기존 장신구와 같은 비도트 손그림 판타지 아이콘, 좌상단 광원·가는 갈색 윤곽·금속/보석 질감. 한 칸 한 에셋 중앙, 사방10% 이상 여백. 투명 PNG, 바닥·그림자·글자·번호·격자선 없음.

| 행/티어 | 1열: 반지 | 2열: 목걸이 | 신규 착용Lv |
|---|---|---|---|
| 1행 T2 | 가죽 끈과 작은 초록 구슬 반지 (ring_green_bead) | 가죽 끈과 작은 초록 구슬 목걸이 (neck_green_bead) | 11 |
| 2행 T5 | 은회색 얼음 가지 프레임·뚜렷한 파랑 빙정 반지 (ring_ice) | 은회색 얼음 가지 프레임·파랑 빙정 목걸이 (neck_ice) | 41 |

잘린 파일은 `assets/accessories/ring_green_bead.png`, `neck_green_bead.png`, `ring_ice.png`, `neck_ice.png`. T2는 T1 철띠/이빨보다 장식이 있으나 T3 은사슬 대보석보다 단순. T5는 T4 금/녹보석보다 명확한 빙정 구조, T6 암흑 오라/T7 황금 광륜보다 발광이 약하게 합니다.

### D2. 지역·군집 부족 몬스터 시트 M1 — 3열 × 8행, 총24칸

시트 ID: `sheet_tier_monsters_gap_v1.png`. 한 행 한 개체, **열 순서 정면/왼쪽/오른쪽**. 정사각512px 칸, 전체1536×4096(도구가 지원하는 해상도에서 동일 칸 비율 유지). 기존 monsters/monsters_3dir의 큰 머리·2D 손그림 판타지·비도트·따뜻한 윤곽·그라데이션 채색을 따릅니다. 세 방향에서 몸/의복/장비가 같은 개체여야 하며, 서로 다른 티어 그림으로 해석하지 않습니다. 중앙 정렬·10% 여백·투명 PNG·바닥 그림자/글자/격자선 없음. 폰에서 분리할 필요 없이 원본 시트로 전달합니다.

| 행 | 티어 | 개체ID | 정면/좌/우 3칸 공통 디자인 |
|---|---|---|---|
| 1 | T3 | skeleton_mage | 마법 스켈레톤: 뼈 몸·보라 천 후드·작은 지팡이·해골 마법 불빛. 갑옷이나 리치 왕관 없음. 일반 검방패 해골보다 지팡이/후드로 뚜렷하게 구분. 군집120%는 런타임에서 적용. |
| 2 | T5 | skeleton_frost | 서리 갑주 해골: 뼈가 보이고 얼음 판갑·빙정 검·사각 방패. T3 나무 방패병보다 명확히 중무장. |
| 3 | T5 | ice_guard | 얼음 갑주 정령: 기존 T4 작은 정령보다 각진 중장 빙정 갑주·큰 견갑·긴 결정 창. 우두머리120%는 런타임 적용. |
| 4 | T7 | slime_toxic | 독주머니 슬라임: 어두운 올리브 몸·뚜렷한 독낭/독액 방울·썩은 잎. 귀여운 작은 초록 젤리 단순 색교환 금지. |
| 5 | T7 | spider_toxic | 늪 독거미: 검녹색 중갑 껍질·굵은 다리·발광 독낭/송곳니. T2의 주황무늬 거미와 구별. |
| 6 | T7 | mushroom_toxic | 포자 독버섯: 짙은 녹/보라 갓·독포자 주머니·이끼 뿌리·거친 갓. T2 붉은 갓과 구별. |
| 7 | T7 | skeleton_swamp | 늪 이끼 해골: 뼈·썩은 중갑·늪 이끼·초록 독액 묻은 검/방패. 리치의 같은 T7 부하. |
| 8 | T7 | swamp_mage | 늪 저주술사: 이끼 녹색 후드·독주머니·가지 지팡이·녹색 저주 불빛. T5 보라 해골 마법사와 구별. |

잘린 파일: `assets/monsters_3dir/<개체ID>_front.png`, `_left.png`, `_right.png`. 새 마법 스켈레톤을 기존 어둠 마법사로 대체하지 않습니다. 기존 동작 이미지 중 판독상 뒷면인 것도 억지 좌우로 매핑하지 않습니다.

### D3. 고티어 미믹 시트 M2 — 2열 × 5행, 총10칸

시트 ID: `sheet_tier_mimics_gap_v1.png`. 정사각512px 칸, 전체1024×2560. 행=티어3~7, 열1=닫힌 상자, 열2=이빨과 혀를 드러낸 전투 모습. 같은 행은 같은 상자·문양·재질·각도를 유지합니다. 같은 원근으로 그리고 기본 미믹과 화풍 통일, 중앙배치/10%여백/투명PNG/바닥그림자·글자·격자선 없음.

| 행/티어 | 1열 닫힘 | 2열 전투 열림 | 개체ID |
|---|---|---|---|
| 1행 T3 | 철테·단단한 나무 상자 | 철테 유지·작은 이빨과 혀 | mimic_iron |
| 2행 T4 | 서리 낀 철테/흰 나무 상자 | 서리 유지·큰 이빨·차가운 혀 | mimic_frost |
| 3행 T5 | 파랑 빙정 중갑 상자 | 빙정 턱/이빨·찬 입김 | mimic_crystal |
| 4행 T6 | 검은 용암 판금·붉은 균열 상자 | 용암 턱/이빨·불 혀 | mimic_lava |
| 5행 T7 | 늪 이끼·녹색 독낭·검은 중갑 상자 | 이끼/독낭 유지·녹색 독액 혀 | mimic_swamp |

잘린 파일: `assets/monsters/<개체ID>_closed.png`, `_open.png`. 기존 T2 나무 미믹01~04는 그대로 같은 개체의 닫힘/공격 프레임으로 사용합니다. 미믹을 필수로 모든 티어에 두는 대신 T1에서는 제외하여 새 그림을 1행 낭비하지 않습니다.
필수 부족 합계: **3개 시트, 38칸(장신구4 + 몬스터24 + 미믹10)**. 모션 추가용 프레임은 이 요청서 범위에 억지로 늘리지 않습니다. 새 그림 없이 완성 가능한 T1~T4 일부만 먼저 적용하고 나머지를 어긋난 그림으로 때우는 방식도 금지합니다.

## E. 승인 이후 반영·검사·저장 호환 기준 (지금 구현하지 않음)

1. 개체별 `variantId/family/name/tier/minLevel/rank/bossRole/imageSet`와 장비별 `baseId/kind/style/name/tier/requiredLevel/icon`을 명시적 단일 목록으로 둡니다. 기초 이름을 GRADE_NAME에서 생성하지 않습니다. 기존 특수기 조건은 family로 연결하고 새 ID가 들어와도 계열 행동이 사라지지 않게 합니다. 아직 없는 파일은 누락 에러로 처리하여 다른 아이콘으로 대체하지 않습니다.
2. 필드·던전·길드 보상·상점 구매는 같은 목록을 조회합니다. 정예/우두머리와 군집이 실제로 같은 티어의 동반몹을 생성하는지 검사합니다. DUN_MOBS를 C3 기준으로 바꾸고 매3층 보스는 해당 테마의 다른 개체를 사용합니다. 새 로딩 목록에 필요한 모든 방향·프레임을 연결합니다. orc_08은 승인 후 재분리합니다.
3. `src/town/check_tier_match.py`(예정): 모든 활성 장비의 등록 이름↔icon↔slot 조합이 B표의 승인 목록과 일치하고 X가 0건인지, 실제 파일 존재·다른 슬롯/계열 잘못 연결·티어/착용 레벨 누락·이미지 중복 티어·미사용 보관 그림 혼입이 없는지 검사합니다. 별도의 런타임 검사에서 상점 표시=구매 실물, 저레벨 착용 차단, 새 저장복원을 확인합니다(구세이브 처리는 아래 케인 변경 결정 적용). 이미지의 의미를 컴퓨터가 자동 이해했다고 주장하지 않고 **직접 판독한 승인 목록이 검사 정답**입니다.
4. 몬스터 검사는 F1~F7·던전1~21층(후반24층 추가)의 실제 스폰을 수집해 개체/테마/티어/레벨/등급·보상, 티어 간 HP/공격 단조 증가, 일반<정예<우두머리 차이, 누락된 mobLv가 없는지 확인합니다. 군집은 리더1+지정 부하 수/계열/티어, 몸크기120%, 방벽/안전구역/다른 몸과 스폰 겹침, 층보스 중복생성 없음, 미믹 닫힘→열림을 검사합니다. 검사 파일만 `.github/workflows/town-build-check.yml`에 승인 후 연결합니다.
5. **케인 변경 결정(승인 후 2026-10-04):** 기존 캐릭터는 테스터이며 초기화 예정이므로 구세이브 호환·변환·백업·legacyEquippable을 만들지 않습니다. 이전 5·6항 변환 계획은 취소합니다. 새 장비는 안정된 `baseId`와 인스턴스 숫자 `id`를 가지며 기존 `arpg_save_v3` 저장 경로를 사용합니다. 새 장비의 이름/이미지/티어/착용 레벨과 새 저장복원은 검사합니다. 이전 테스트 캐릭터는 초기화 후 확인합니다.
6. 표의 C1은 기준 단위와 상대 배율입니다. 작업 중 다른 작업이 main에 반영한 `NUM=100`·신규 스킬·자연 동굴·야영지 일러스트·기존 7종 좌우 방향 보정을 보존했습니다. 신규 몬스터 HP/공격/EXP와 장비 고정 수치에 기존 NUM을 생성 지점에서 한 번 곱합니다. 금화/가격의 별도 100배 개편이나 새 스킬/길드 설계는 하지 않았습니다.
7. 새 이미지 전량 확보·승인 목록 실물 대조·코드 반영·위 검사와 기존 성장/전투/저장/상점/던전 검사를 통과한 뒤 게시합니다. game/ 직접 커밋 금지, 코드 CI 완료 확인 후 STATUS/WORKLOG를 갱신합니다. 이번은 문서만 변경하여 town-build-check를 시작하지 않으며, 푸시 직전 실행 중 CI가 없는지도 확인합니다. 수치100배·물약/치유 퍼센트·길드 재설계·미구현 액티브 확대는 이번 코드 범위에 넣지 않습니다.

## F. 사용자 표 확인 지점 / 이번 세션 기록

케인께 확인받을 표는 **C2·C3·C4(몬스터/군집 배치), B(장비 이름·티어·착용 레벨), D(부족 시트)**입니다. 이 표를 승인하기 전 게임 코드를 변경하지 않습니다. 승인된 뒤에도 없는 그림을 다른 그림으로 대체하지 않고 부족 시트를 확보한 다음 최종 상태로 반영합니다.

- 케인 요청: 전수 판독 후 기준표만 main에 커밋·푸시, 반드시 표 확인에서 멈춤. 추가 요청: 일반 몬스터와 120% 무리 우두머리가 함께 출현하는 군집(킹슬라임+슬라임, 마법 스켈레톤+해골)을 고려.
- 한 일: 지정 문서 순서 확인, 실제 PNG306장 전수 판독, 현재 코드 로딩/출현/레벨/수치/이름/상점 전수 대조, 7티어 명시적 재배치안·군집·장비 착용레벨·불일치 집계·3개 부족 시트 요청서·저장호환/검사 기준 작성.
- 단계1 기록 당시 남은 일: 사용자 표 승인 → 부족 그림 확보 및 실물 대조 → 코드·검사 반영(구세이브 변환은 위 변경 결정으로 취소). STATUS/WORKLOG는 이번 사용자 지시의 4단계 시점에 갱신하며, 1~3단계 작업일지는 이 절에 기록(이번 푸시는 tier_match.md 하나).
- 서명: GPT Codex. 현재 AGENTS.md 7절에는 한국어 커밋·pull --rebase 규칙은 있으나 별도의 커밋 서명 형식은 명시되어 있지 않습니다. 커밋 끝에 작성자를 명시합니다.

### 4단계 반영 기록 (2026-10-04, GPT Codex)

- 케인 승인: “승인 합니다.코드 변경 해주세요.” 군집은 120% 리더+동일 티어 부하로 확정. 기존 테스터 저장은 초기화 예정. 사용량 절약 요청 및 이미지 생성 이유 질문을 기록합니다. 부족38칸을 3개 시트로 만들고 방향/잘림 수정에 추가 생성이 있었음을 설명했으며 현재 추가 생성은 종료했습니다.
- 코드 커밋: `ccb3224a5bc0eef0e044fb4a6f363a154ff5b326`. 원장 `src/town/data/tier_match.json`: 장비184종, 몬스터53개체. `tier_match.js`·장비 생성·상점 표시/구매·필드/던전·길드 처치 ID 연결. 기존 번호 순 강도 추정과 같은 몬스터를 모든 티어에 복사하는 배치 제거.
- 일반/정예/군집·층 우두머리 HP/공격/EXP/금화/드랍 등급 차이, 개체 최소 레벨, 같은 티어 안 완만한 추종을 적용했습니다. 매3층 층 우두머리1마리, 군집 부하 중복 추가 금지, 120% 몸 크기, 마법 리더 후열·해골 전열/궁병 측면 후열, 이름·Lv·T·등급 표시. 넓은 출구 방을 보장하고 벽·소품·진입 안전 구역·몸 겹침을 피하며 미믹은 같은 티어 닫힘→열림으로 전환합니다.
- `check_tier_match.py`를 CI에 추가했습니다. 승인 표의 장비180장+신규4장 대조에서 이름·이미지 불일치 **0건**. 랜덤 생성·상점 표시=구매 실물·착용 레벨 차단, 필드7개·던전1~21/24층·자연 동굴 주요층·120% 군집 인원/간격·층 보스 중복 없음·6티어 미믹·NUM 단위 보존 검사를 통과했습니다. 기존 검사까지 로컬22개 통과, 최신 동굴/야영지 작업 병합 뒤 영향 검사4개 추가 통과.
- 자동검사에서 혼잡한 방의 미믹 배치 실패를 발견해 보완(`6cbab993`): 위장 상자가 사라지면 그 상자의 충돌만 해제, 상자 중심부터 안전 위치 탐색, 공간이 없으면 상자/충돌을 되돌리고 주변을 비운 뒤 재시도. 벽/다른 몸에 강제 스폰하지 않습니다. 검사에서는 안전하게 실제 출현한 미믹을 대조하며 한 방의 혼잡 때문에 전체 티어 검사를 종료하지 않습니다. 영향 검사3개 통과.
- 최종 코드 `c4d89ddd`에서 보스 드랍 행운 보정의 등급 역전도 방지했습니다. [자동 검사22개 성공](https://github.com/Alix1211/ARPG/actions/runs/37142815084), 게시 빌드 `09bfbafe1b0ec65bab1e2fadb4da75417f9fe13d` 확인 완료. STATUS·WORKLOG와 이 절에 완료 결과를 기록합니다. game/는 로컬 빌드 변경을 모두 되돌렸고 직접 커밋하지 않았습니다.

남은 검증은 새 Lv1 안드로이드 실플레이의 지역 간 난이도·처치시간·사냥량·드랍 체감입니다. 기존 테스트 캐릭터는 초기화 후 확인합니다.
