from pathlib import Path

src=Path('src/town/field_dungeon.js').read_text(encoding='utf-8')
html_path=Path('game/town.html')
html=html_path.read_text(encoding='utf-8')

src_start=src.index("  const feather=!!window.__FIELD_FEATHER_TEST;")
src_end=src.index("\n\n  const mini=document.createElement('canvas');",src_start)
new_block=src[src_start:src_end]

old_start=html.index("  const c=document.createElement('canvas');c.width=48*TS;c.height=48*TS;const g=c.getContext('2d');")
old_end=html.index("\n\n  const mini=document.createElement('canvas');",old_start)
html=html[:old_start]+new_block+html[old_end:]
html_path.write_text(html,encoding='utf-8')
print('patched field feather preview block only')
