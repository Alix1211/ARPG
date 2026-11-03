"""Compile the Gaia three-party test HTML using Golden Quest's existing art bundles.

The original game/town.html and all art_* files stay untouched.  This preview
builder reuses their already-generated asset manifest, so downloading and
reprocessing the many original source illustrations isn't required.
"""

from __future__ import annotations

import base64
import datetime as dt
import json
import re
from pathlib import Path
import sys
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
GAME = ROOT / "game"
OUTPUT = ROOT / "gaia_preview"


def read(name: str) -> str:
    return (HERE / name).read_text(encoding="utf-8")


def only_match(pattern: str, source: str, label: str) -> str:
    found = re.search(pattern, source, re.DOTALL)
    if not found:
        raise RuntimeError(f"원본 빌드에 {label} 정보가 없습니다.")
    return found.group(1)


def main() -> None:
    original = (GAME / "town.html").read_text(encoding="utf-8")
    if '<script type="text/plain" id="gameMain">' not in original:
        raise RuntimeError("원본 골든 퀘스트 게임 코드가 없습니다.")

    old_main = original.split('<script type="text/plain" id="gameMain">', 1)[1]
    manifest = old_main.lstrip("\r\n").split("\n", 1)[0]
    if not (manifest.startswith("const A=") and manifest.endswith(");")):
        raise RuntimeError("기존 그림 목록을 인식하지 못했습니다.")
    # 케인이 영상에서 뽑은 카일·아가사·실비아 걷기 그림을 시험판에만 끼워 넣는다(전체 빌드 불필요).
    import gaia_sheets
    gaia_pre, gaia_suf = gaia_sheets.prelude_and_suffix()
    import gaia_ui_art
    manifest = gaia_pre + gaia_ui_art.prelude() + manifest + gaia_suf + gaia_ui_art.suffix()   # 새 UI 키트 그림 덮어쓰기
    art_list = json.loads(only_match(r"var files=(\[.*?\]),left=files\.length", original, "그림 파일"))
    title = only_match(r"(art_title_[0-9a-f]{10}\.webp)", original, "시작 화면")

    modules = [
        "vfx.js", "skill_presentation.js", "skills2.js", "sage.js", "inn.js",
        "chat.js", "telemetry.js", "field_dungeon.js", "companion.js", "gaia_party.js", "gaia_skills.js", "gaia_hud.js",
        "dungeon.js", "sound.js", "bgm.js", "backup.js", "trade.js",
        "guild.js", "quest.js",
    ]
    js = read("tier_match.js") + "\n" + read("town.js").replace(
        "/*FIELD_DUNGEON*/", "\n".join(read(name) for name in modules)
    )
    js += "\n" + "\n".join(read(name) for name in ["minigames.js", "ui.js", "gamepad.js"])

    shell = read("shell.html")
    replacements = {
        "/*SAVE_SYNC*/": read("save_sync.js"),
        "/*VER*/": "GAIA 3P " + dt.datetime.now(dt.timezone.utc).strftime("%m%d-%H%M"),
        "/*TITLE*/": title,
        "/*BOOT_TOTAL*/1": str(sum(int(item[1]) for item in art_list)),
        "/*ART_LIST*/[]": json.dumps(art_list, ensure_ascii=False),
        "/*ASSETS*/": manifest,
        "/*GAME*/": js,
        "<title>마을 시험판</title>": "<title>가이아 대륙 · 3인 파티 테스트</title>",
    }
    for key, value in replacements.items():
        if key not in shell:
            raise RuntimeError(f"템플릿 마커 없음: {key}")
        shell = shell.replace(key, value)
    if "/*FIELD_DUNGEON*/" in shell:
        raise RuntimeError("전투 코드를 합치지 못했습니다.")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    split_html = OUTPUT / "gaia-town.html"
    split_html.write_text(shell, encoding="utf-8")

    # 분할형: 장치 메모리를 아끼는 원래 로딩 방식을 유지하는 ZIP.
    art_names = [entry[0].split("?", 1)[0] for entry in art_list]
    music_names = [path.name for path in sorted(GAME.glob("art_bgm_*.js"))]
    needed_files = [title, *art_names, *music_names]
    for name in needed_files:
        if not (GAME / name).is_file():
            raise FileNotFoundError(GAME / name)
    zip_path = OUTPUT / "GAIA-3PARTY-HTML-OFFLINE.zip"
    with ZipFile(zip_path, "w", ZIP_DEFLATED, compresslevel=4) as z:
        z.write(split_html, "gaia-town.html")
        for name in needed_files:
            z.write(GAME / name, name)

    # 단일형: 설치/압축 해제 없이 파일 하나로 열 수 있도록 그림·음악을 내장.
    inline = []
    for name in [*art_names, *music_names]:
        script = (GAME / name).read_text(encoding="utf-8")
        if "</script" in script.lower():
            raise RuntimeError(f"내장 가능한 스크립트가 아닙니다: {name}")
        inline.append("<script>" + script + "</script>")
    stand = shell.replace(
        '<script type="text/plain" id="gameMain">',
        "\n".join(inline) + '\n<script type="text/plain" id="gameMain">',
        1,
    )
    stand = stand.replace("var files=" + json.dumps(art_list, ensure_ascii=False), "var files=[]", 1)
    title_uri = "data:image/webp;base64," + base64.b64encode((GAME / title).read_bytes()).decode("ascii")
    stand = stand.replace("background-image:url('" + title + "')", "background-image:url('" + title_uri + "')")
    standalone = OUTPUT / "GAIA-3PARTY-TEST.html"
    standalone.write_text(stand, encoding="utf-8")
    print("완료:", standalone, standalone.stat().st_size // 1024, "KB")
    print("완료:", zip_path, zip_path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
