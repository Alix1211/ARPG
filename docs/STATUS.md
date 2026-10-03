# 현재 상태 (대화가 끊겨도 여기부터 읽을 것)
## 확정 사항
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
- 파밍 핵심 시험판: 장비 7칸+무기2, 접두/접미 옵션, 희귀도 색, 진행도별 드랍, 판매·재굴림·감정, 길드 등급 제한, 미니맵, 가로 레이아웃
## 말투
- 케인에게 항상 격식체 한국어. 기술 설명 최소화, 결과와 케인이 할 일만.
