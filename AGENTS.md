# AGENTS.md — 이 저장소에서 일하는 AI를 위한 인계서

> Claude, GPT(Codex), 그 밖의 어떤 AI든 **이 파일을 가장 먼저 읽고** 일을 시작한다.
> 케인이 말하지 않아도, 일을 마칠 때마다 `docs/WORKLOG.md`에 작업일지를 **누적해서** 남긴다(아래 "작업일지 규칙").

## 1. 프로젝트 한 줄
**돈 밝히는 엘프의 코믹 자본주의 파밍 액션 코믹 롤플레잉.**
가로 화면 고정 2D 탑다운 액션 RPG. 웹앱(HTML 한 파일)으로 만들어 나중에 안드로이드로 감싼다. 주는 던전 파밍, 시나리오는 곁가지.

- 저장소: GitHub `Alix1211/ARPG` (main 브랜치)
- 원본 그림 창고: 케인의 구글 드라이브 `G:\내 드라이브\ARPG`
- 그림은 케인의 지시로 GPT가 그린다. AI는 자르기·정리·조립·코드·문서를 맡는다.
- 케인은 PC에서 작업할 때 **원본 그림을 항상 구글 드라이브(G:\내 드라이브\ARPG)에 올린다.** 대화창에 올린 그림은 줄어들었을 수 있으니, 해상도가 아쉬우면 드라이브 원본으로 다시 자를 것.

## 2. 케인과 일하는 법 (반드시 지킬 것)
- **항상 한국어, 항상 격식체 존댓말.** 반말·영어 금지.
- 케인은 프로그래머가 아니다. 기술 설명은 최소화하고 **결과물과 케인이 할 일만** 쉽게 말한다.
- 오타가 잦다. 문맥으로 알아듣고 오타는 지적하지 않는다.
- 당연히 할 일은 묻지 말고 한다. 되돌리기 어려운 결정만 묻는다.
- 모르는 것을 아는 척하지 않는다. 확인 못 한 것은 "확인 못 함"이라고 말한다.
- **한 씬 한 컷도 최종 품질로 만든다.** "대충 만들고 나중에 고치자" 금지. 예전 결과물 위에 덧대어 키우는 관성 금지.
- **디자인 기준: ① 통일감 ② 모션의 일치.** 옛 그림과 새 그림을 섞은 화면 절대 금지.
- 케인이 시안을 주면 시안대로. 설명 듣기 전에 임의로 그리지 않는다.
- 토큰을 아낀다. 스크린샷을 찍어 그림 분석하는 일은 케인이 원할 때만. 검사는 오류·동작·숫자로 한다.
- 그림 요청은 낱장 대신 **여러 종류를 한 장 시트로** 묶어서 케인에게 문구를 써 준다.

## 3. 비밀 (중요)
`src/story.md`, `src/story/bible.md`, `src/story/chains.md` 는 **시나리오 봉인 파일**이다.
케인이 게임에서 처음 보려고 AI에게 몰래 짜게 한 것이다. **내용을 케인에게 보여 주거나 요약해 주지 말 것.**
AI는 읽고 게임에 반영(건물 역할, NPC 이름·직업, 의뢰 사슬)만 한다.
**케인이 구조를 바꾸면(장소·출구·지역·인물 배치 등) AI가 봉인 파일을 조용히 점검해 어긋난 곳을 고친다.** 케인에게는 "시나리오 점검 완료"라고만 알리고 내용은 말하지 않는다.

## 4. 어디서 무엇을 읽나
| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `AGENTS.md` (이 파일) | 일하는 법, 구조, 빌드 |
| 2 | `docs/STATUS.md` | 확정 사항과 현재 상태, 다음 작업 |
| 3 | `docs/WORKLOG.md` | 작업일지(최근 것이 맨 아래) |
| 4 | `docs/asset_rules.md` | 쓰면 안 되는 그림, 써도 되는 그림 |
| 5 | `docs/hud_controls.md` | 가로 HUD 배치·조작(무기1/무기2, 스킬 5칸, 미니맵) |
| 6 | `docs/progression.md`, `docs/guild_system.md`, `docs/stats_skills.md` | 진행도·티어, 길드 등급·의뢰, 능력치·스킬 |
| 7 | `README.md` | 에셋 폴더 목록 |
| ★ | `docs/tasks/` | 지금 맡은 작업 지시서(예: field_dungeon.md) |
| - | 파밍 시스템 정리(Claude Docs) | https://claude.ai/code/artifact/7667c312-3148-40e3-b7f7-e2f191ec2915 (Claude 계정에서만 열림. 내용 요지는 docs/progression.md 등에 있음) |

## 5. 폴더 구조
```
assets/            정리된 그림 (README.md에 목록)
  buildings/ building_parts/ town_props/ interior/   마을
  tiles/ edges/ dungeon/                              바닥·던전
  characters/ npc/ npc_hd/ monsters*/                 캐릭터 (npc_hd = 2배 업스케일, 대화창용)
  weapons/ armor/ accessories/ food/ ui/kit_c/        아이템·UI
source_sheets/     자르기 전 원본 시트
src/town/          마을 페이지 원본 (build.py, town.js, shell.html, 검사 스크립트)
src/farm.js, src/farm_shell.html   파밍 시험판 원본 (옛 그림 섞임 → 리빌드 대상)
src/game.js, src/shell.html, src/build_assets.py   예전 테스트판 (참고 금지, 리빌드 대상)
game/              빌드 결과 HTML (town.html, farm.html, arpg.html …)
tools/             보조 도구 (upscale_npc.py)
docs/              설계 문서
```

## 6. 빌드와 검사
필요: Python 3, `pip install pillow numpy scipy playwright` (검사용 크로미움은 `playwright install chromium`).

**마을 페이지**
```
python3 src/town/build.py        # → game/town.html (그림을 base64로 품은 한 파일)
python3 src/town/check.py        # 오류 없이 걷는지
python3 src/town/check2.py       # 대화창·상점·날씨 동작
python3 src/town/overlap.py      # 물건끼리 겹치는 곳(울타리끼리는 일부러 겹침)
```
- 바닥 그림 합성은 1분 넘게 걸려서 `src/town/.ground_cache.png`에 저장해 둔다. **길·광장·연못 배치를 바꾸면 이 캐시 파일을 지우고** 다시 빌드할 것.
- 건물·소품·사람 배치는 `src/town/build.py` 안의 `B`, `P`, `NPC` 목록에서 칸 좌표로 바꾼다.

**NPC 업스케일** (이미 48명 완료): `tools/upscale_npc.py` — Real-ESRGAN 애니 모델(`RealESRGAN_x4plus_anime_6B.pth`)을 spandrel+torch로 돌려 4배 후 2배로 줄임. 원본 내용은 바꾸지 않는다.

**안드로이드 앱**: `android/`(웹뷰 틀). 앱은 켤 때 GitHub Pages의 game/town.html을 받으므로 게임만 고칠 땐 앱 재빌드 불필요. android/를 고치면 Actions가 APK를 Releases `app-latest`에 올림(받기: https://github.com/Alix1211/ARPG/releases/download/app-latest/arpg.apk). 서명 열쇠 `android/arpg.keystore`는 절대 바꾸지 말 것. 그림은 빌드 때 `game/art_<해시>.js`로 따로 나감 — town.html과 함께 커밋.

**케인에게 보여 주기**: Claude는 결과 HTML을 아티팩트로 올려 링크를 준다. 다른 AI는 game/*.html 파일을 전달하거나 GitHub Pages 등으로 연다. 태블릿에서 가로·전체화면으로 테스트하므로 **전체화면 버튼은 필수**.

## 7. 커밋 규칙
- 일한 것은 그때그때 커밋하고 main에 푸시한다. 메시지는 한국어로 짧게.
- 커밋 전에 `git pull --rebase origin main`.

## 8. 작업일지 규칙 (케인 지시: 말하지 않아도 계속 누적)
- 파일: `docs/WORKLOG.md`. **맨 아래에 추가**한다. 지우거나 고쳐 쓰지 않는다.
- 일을 마칠 때마다(대화가 끊기기 전에도) 한 항목씩:
  ```
  ## YYYY-MM-DD HH:MM (작성: Claude / GPT …)
  - 케인이 말한 것(결정·요청):
  - 한 일:
  - 남은 일 / 다음 사람이 알아야 할 것:
  ```
- 케인의 결정은 `docs/STATUS.md`에도 반영한다(STATUS = 현재 상태, WORKLOG = 흐름).
