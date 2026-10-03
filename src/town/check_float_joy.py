# 떠다니는 조이스틱: 누른 자리에 생기고, 멀리 끌면 따라오고, 떼면 제자리로 가는지
from playwright.sync_api import sync_playwright
import os
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    err = []; pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto('file://' + os.path.abspath('game/town.html')); pg.wait_for_timeout(2500)
    box = lambda: pg.evaluate("(()=>{const r=document.getElementById('stick').getBoundingClientRect();return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)]})()")
    home = box()
    x0 = pg.evaluate("GAME.P.x")
    pg.mouse.move(400, 500); pg.mouse.down(); pg.wait_for_timeout(100)
    at = box()
    pg.mouse.move(560, 500, steps=8); pg.wait_for_timeout(600)
    follow = box(); moved = pg.evaluate("GAME.P.x") - x0
    pg.mouse.up(); pg.wait_for_timeout(100)
    back = box()
    print('home', home, 'pressed', at, 'follow', follow, 'back', back, 'moved', round(moved))
    assert abs(at[0] - 400) < 3 and abs(at[1] - 500) < 3, 'not at touch'
    assert follow[0] > 420, 'no follow'
    assert back == home, 'not home'
    assert moved > 50, 'did not walk'
    print('errors', err); b.close()
