# 현재 상태 (대화가 끊겨도 여기부터 읽을 것)
## 가장 중요한 원칙 (디자인)
- 디자인은 싹 리빌드. 옛 그림과 새 그림을 찢어붙인 화면은 절대 안 됨.
- 기준: ① 통일감 ② 모션의 일치.
- 케인이 에셋으로 시안을 만들어 주면 그걸 참조해서 만든다. 설명 듣기 전엔 임의로 그리지 않는다.
  (HUD 시안은 받음 → docs/hud_controls.md. 마을은 케인 지시로 "일단 만들어 보고, 안 되면 GPT에게 구역별 한 장 지도를 그리게 해서 이어 붙인다". 마을은 클 필요 없음.)

## 이미 만든 것
- 파밍 시험판: game/farm.html (원본 src/farm.js, src/farm_shell.html) — 접두·접미 옵션 장비, 티어·길드 승급, 가방·상인·대장간, 전체화면 버튼, 가방 아이콘 버튼
- 예전 테스트판: game/arpg.html (캐릭터 선택, 마을, 던전 3층, 무기 5종×10등급, 보스 3) — 옛 그림이 섞여 있어 리빌드 대상
- 파밍 시스템 정리 문서(Claude Docs): https://claude.ai/code/artifact/7667c312-3148-40e3-b7f7-e2f191ec2915

## 확정 사항
- 아이템 이름은 옵션 이름이 앞 ("배짱의 구리 반지").
- 패드 테스트용 전체화면 버튼 필수.
- 능력치·스킬·숙련: docs/stats_skills.md
- NPC는 서 있거나 까딱이는 정도로 충분. 걷기 시트 캐릭터(검사·기사·용족 소녀)는 동료/빌런 후보.
- 가로 고정 2D 탑다운 액션 RPG. 마을 1개 + 던전 문(절차 생성). 월드맵은 보류.
- 시나리오는 비밀(src/story*). 케인에게 내용 공개 금지. 주는 던전 파밍.
- HUD: docs/hud_controls.md (우상단 미니맵, 무기1/무기2 교체, 스킬 최대 5 자유배치)
- 진행도·티어·길드: docs/progression.md, docs/guild_system.md
- 에셋 규칙: docs/asset_rules.md (문선팡 에셋, 임의로 자른 수풀·나무 금지. 정제된 시트만)
- 바닥은 이미 있음: assets/tiles(7테마), assets/edges, assets/dungeon/tiles·props
- 건물 16채(assets/buildings), 건물 부품 46(assets/building_parts), 실내 바닥·벽·가구(assets/interior), NPC 초상화 48(assets/npc)
- 시나리오 구성 완료(비밀): src/story.md(큰 줄기·건물 구입 순서), src/story/bible.md(NPC 48명 장부·건물별 역할), src/story/chains.md(연쇄 퀘스트 45개). 마을 배치 시 bible.md의 건물-역할 대응을 따른다.
- UI 키트: assets/ui/kit_c (인벤 01, 장비 02, 스탯창 02b)
## 다음 작업
- 마을 한 장 시험 제작(정제된 건물·바닥·부품만). 안 되면 GPT 구역별 지도 방식으로 전환.
- 이후 파밍 시험판을 새 HUD(무기1/무기2 교체, 스킬 5칸, 미니맵)와 새 UI 키트로 리빌드.
## 말투
- 케인에게 항상 격식체 한국어. 기술 설명 최소화, 결과와 케인이 할 일만.
