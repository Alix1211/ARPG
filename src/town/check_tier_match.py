"""실물 판독 승인표를 기준으로 매핑 및 실제 7지역/22개 층을 검사한다."""
import asyncio
import json
import math
import re
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'src/town/data/tier_match.json').read_text())
VIS = json.loads((ROOT / 'src/town/data/monster_visual_v2.json').read_text())
DOC = (ROOT / 'docs/tasks/tier_match.md').read_text()
GEAR = {g['id']: g for g in DATA['gear']}
THEMES = ['spring', 'summer', 'autumn', 'winter', 'ice', 'volcano', 'swamp']


def static_checks():
    rows = DOC.split('## B. 장비 이미지')[1].split('### B1.')[0]
    mismatches = []
    checked = set()
    for line in rows.splitlines():
        if not line.startswith('| ') or '](' not in line:
            continue
        v = [x.strip() for x in line.strip('|').split('|')]
        path = re.search(r'../../([^)]*)', v[1]).group(1)
        ident = Path(path).stem
        g = GEAR[ident]
        if (g['file'], g['name'], g['tier'], g['requiredLevel'], g['approvedAppearance']) != (
                path, v[7], int(v[5][1:]), int(v[6]), v[3]):
            mismatches.append(ident)
        checked.add(ident)
    assert len(checked) == 180, len(checked)
    assert not mismatches, f'이름·이미지 불일치 {len(mismatches)}건: {mismatches}'
    extras = {'ring_green_bead', 'neck_green_bead', 'ring_ice', 'neck_ice'}
    assert set(GEAR) == checked | extras
    for g in GEAR.values():
        assert g['icon'] == g['id'] == Path(g['file']).stem, g
        assert (ROOT / g['file']).is_file(), g
        assert (g['tier']-1)*10 < g['requiredLevel'] <= g['tier']*10, g
    for tier in range(1, 8):
        for kind in ['head', 'body', 'hands', 'feet', 'ring', 'neck']:
            assert any(g['kind'] == kind and g['tier'] == tier for g in GEAR.values()), (tier, kind)
        for wt in ['sword', 'spear', 'gauntlet', 'bow', 'staff']:
            assert any(g.get('wt') == wt and g['tier'] == tier for g in GEAR.values()), (tier, wt)
    monster_rows = DOC.split('### C2.')[1].split('### C3.')[0]
    checked = set()
    for line in monster_rows.splitlines():
        v = [x.strip() for x in line.strip('|').split('|')]
        if len(v) != 8 or v[0] not in DATA['monsters']:
            continue
        m = DATA['monsters'][v[0]]
        assert (m['name'], m['tier'], m['minLevel'], m['rank']) == (
            v[1], int(v[2]), int(v[3]), {'일반':'normal','정예':'elite','우두머리':'boss'}[v[4]]), m
        checked.add(m['id'])
    assert checked == set(DATA['monsters']) and len(checked) == 53
    for m in DATA['monsters'].values():
        assert (m['tier']-1)*10 < m['minLevel'] <= m['tier']*10, m
        for path in m['images'].values():
            assert 'monsters_v1' not in path and (ROOT/path).is_file(), path
    # V2 전면 교체: 53종 모두 새 아틀라스 행이 있어야 하고, 각 셀은 실제 그림이어야 한다.
    assert set(VIS['rows']) == set(DATA['monsters']) and len(VIS['rows']) == 53
    cell = int(VIS['cell'])
    assert VIS['columns'] == ['front','back','left','right']
    part_imgs = {}
    for i, fn in enumerate(VIS['parts'], 1):
        path = ROOT / 'source_sheets' / 'monster_v2' / fn
        assert path.is_file(), path
        im = Image.open(path).convert('RGBA')
        assert im.width == cell * 4 and im.height % cell == 0, (path, im.size)
        part_imgs[i] = im
    for ident, ref in VIS['rows'].items():
        part, row = int(ref['part']), int(ref['row'])
        assert part in part_imgs and 0 <= row < part_imgs[part].height // cell, (ident, ref)
        for col in range(4):
            a = part_imgs[part].crop((col*cell,row*cell,(col+1)*cell,(row+1)*cell)).getchannel('A')
            assert a.getbbox(), (ident, ref, col)
    for key in ['fieldPools', 'fieldElites', 'dungeonPools', 'dungeonElites']:
        for tier, pool in enumerate(DATA[key], 1):
            assert all(DATA['monsters'][ident]['tier'] == tier for ident in pool), (key, tier)
    for group in DATA['groups']:
        assert group['leaderScale'] == 1.2
        assert DATA['monsters'][group['leader']]['rank'] == 'boss'
        assert sum(m['max'] for m in group['members']) <= 6
        assert all(DATA['monsters'][m['id']]['tier'] == group['tier'] for m in group['members'])
    print('승인표 180장+신규4장 / 몬스터 V2 53종 4방향 아틀라스 정상')


def check_spawn(ms, tier, dungeon=False, floor=0, cave=False):
    assert ms, (tier, floor)
    allowed = set(DATA['dungeonPools' if dungeon else 'fieldPools'][tier-1])
    allowed.update(DATA['dungeonElites' if dungeon else 'fieldElites'][tier-1])
    groups = [g for g in DATA['groups'] if g['tier'] == tier and (dungeon or not g.get('dungeonOnly'))]
    for group in groups:
        allowed.add(group['leader'])
        allowed.update(m['id'] for m in group['members'])
    if dungeon and floor % 3 == 0:
        allowed.add(DATA['floorBosses'][tier-1])
    for m in ms:
        assert m['type'] in allowed, (tier, floor, m)
        assert not m['blocked'], m
        assert m['tier'] == tier and (tier-1)*10 < m['mobLv'] <= tier*10, m
        assert m['mobLv'] >= DATA['monsters'][m['type']]['minLevel'], m
        assert m['maxHp'] > 0 and m['dmg'] > 0 and m['exp'] > 0, m
        # main의 NUM=100 단위를 잃고 새 몬스터만 100배 약해지는 통합 회귀를 막는다.
        definition = DATA['monsters'][m['type']]
        role = m['bossRole'] if m['rank'] == 'boss' else m['rank']
        rank = DATA['ranks'][role]
        part = (floor-1) % 3 if floor else 0
        expected_hp = math.floor(DATA['scales']['baseHP']*DATA['scales']['hp'][tier-1]*definition['speciesHP']*rank['hp']*(1+part*.08)+.5)*100*(1.4 if cave else 1)
        assert m['maxHp'] == expected_hp, (m, expected_hp)
        assert m['exp'] == math.floor(2*DATA['scales']['exp'][tier-1]*rank['exp']+.5)*100, m
        assert m['rank'] == DATA['monsters'][m['type']]['rank'], m
        if m['packLeader']:
            assert math.isclose(m['w']/m['baseW'], 1.2), m
            cfg = next(g for g in groups if g['leader'] == m['type'])
            pack = [x for x in ms if x['packId'] == m['packId']]
            assert sum(x['packLeader'] for x in pack) == 1, pack
            for member in cfg['members']:
                n = sum(x['type'] == member['id'] for x in pack)
                assert member['min'] <= n <= member['max'], (cfg, pack)
    for i, m in enumerate(ms):
        for other in ms[:i]:
            distance = math.hypot(m['x']-other['x'], m['y']-other['y'])
            assert distance >= max(m['w'], other['w'])*1.09, (floor, m, other, distance)
    if dungeon and floor % 3 == 0:
        bosses = [m for m in ms if m['bossRole'] == 'floor']
        assert len(bosses) == 1 and bosses[0]['type'] == DATA['floorBosses'][tier-1], bosses
    if not dungeon:
        assert len(ms) == 32, (tier, len(ms))
        assert any(m['packLeader'] for m in ms), (tier, ms)


async def runtime_checks():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        pg = await browser.new_page(viewport={'width':1280,'height':720})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto((ROOT/'game/town.html').as_uri())
        await pg.wait_for_function('window.UI && window.__FD && window.TIER_MATCH_API')
        await pg.wait_for_timeout(800)
        result = await pg.evaluate("""() => {
          const api=TIER_MATCH_API, c=api.catalog, failures=[];
          for(const base of c.gear){
            const it=UI.make({baseId:base.id,rar:0});
            for(const key of ['name','icon','tier','requiredLevel'])if(it[key]!==base[key])failures.push([base.id,key,it[key]]);
            if(!A.icons[it.icon])failures.push([base.id,'missing icon']);
          }
          for(let tier=1;tier<=7;tier++)for(const kind of ['head','body','hands','feet','ring','neck','weapon']){
            const choices=kind==='weapon'?['sword','spear','gauntlet','bow','staff']:[null];
            for(const wt of choices)for(let n=0;n<8;n++){
              const it=UI.make({kind,wt,tier,roll:true}),base=api.base({baseId:it.baseId});
              const expected=it.unid?'미확인 '+base.name:api.fullName(base,it.aff);
              if(it.tier!==tier||it.name!==expected)failures.push(['random',it]);
            }
          }
          const random=Math.random,life=GAME.P.lifeSkills,passive=GAME.P.passives;
          try{
            for(const sample of [.08,.15,.49,.8,.95]){
              Math.random=()=>sample;GAME.P.lifeSkills={};GAME.P.passives={};
              const before=UI.make({baseId:'bow_10',rank:'boss',roll:true}).rar;
              GAME.P.lifeSkills={moneyScent:3};GAME.P.passives={greed:5};
              const after=UI.make({baseId:'bow_10',rank:'boss',roll:true}).rar;
              if(after<before)failures.push(['boss luck worsened rarity',sample,before,after]);
            }
          }finally{Math.random=random;GAME.P.lifeSkills=life;GAME.P.passives=passive;}
          GAME.P.lv=1;
          const high=UI.make({baseId:'sword_09'});UI.add(high);
          if(UI.canEquip(high)||UI.equip(high,'w1')!==false)failures.push(['equip level guard']);
          let last={hp:0,dmg:0,exp:0};
          for(const id of ['goblin_scout','goblin_spear','skeleton_round','elem_ice','ice_guard','elem_fire','skeleton_swamp']){
            const s=api.monsterStats(id,1);
            if(s.hp<=last.hp||s.dmg<=last.dmg||s.exp<=last.exp)failures.push(['tier strength',id,s,last]);last=s;
          }
          const normal=api.monsterStats('skeleton_round',21),elite=api.monsterStats('skeleton_guard',21),boss=api.monsterStats('skeleton_mage',21);
          for(const k of ['hp','dmg','exp','dropChance'])if(!(normal[k]<elite[k]&&elite[k]<boss[k]))failures.push(['rank strength',k]);
          return failures;
        }""")
        assert not result, result
        # 상점에 표시된 이름/아이콘과 실제 구매품을 대조한다.
        await pg.evaluate("()=>{GAME.setGold(99999);__SHOP.open(A.npcs.find(n=>n.shop==='arms'));}")
        cells = pg.locator('#goods .cell')
        if not await cells.count():
            cells = pg.locator('#shop .cell')
        for index in range(await cells.count()):
            await cells.nth(index).click()
            before = await pg.evaluate("()=>({name:infoName.textContent,icon:infoIc.src,n:UI.bagItems().length})")
            await pg.click('#buy')
            purchased = await pg.evaluate("()=>{const it=UI.bagItems().at(-1).it;return {name:it.name,icon:A.icons[it.icon],n:UI.bagItems().length};}")
            assert purchased['name'] == before['name'] and purchased['icon'] == before['icon'], (before, purchased)
            assert purchased['n'] == before['n']+1
        await pg.evaluate('()=>GAME.closeAll()')
        # 이동 갱신 전 스폰 순간을 같은 평가 안에서 수집한다.
        for tier, theme in enumerate(THEMES, 1):
            await pg.evaluate('t=>__FD.enter(t)', theme)
            await pg.wait_for_timeout(650)
            await pg.wait_for_function("t=>__FD.state().map==='field'&&__FD.state().theme===t&&__FD.state().monsters>0", arg=theme)
            ms = await pg.evaluate("()=>{__FD.respawn();return __FD.debugMonsters();}")
            check_spawn(ms, tier)
        for floor in list(range(1,22))+[24]:
            ms = await pg.evaluate("async f=>{await __DUN.go(f);const old=GAME.P.lv;GAME.P.lv=1;__DUN.respawn();GAME.P.lv=old;return __FD.debugMonsters();}", floor)
            check_spawn(ms, min(7, math.ceil(floor/3)), True, floor)
            assert not (await pg.evaluate('__DUN.state()'))['blocked'], floor
        # 다른 작업에서 추가된 자연 동굴에서도 큰 군집이 벽/소품에 겹치지 않는다.
        await pg.evaluate("__DUN.setTheme('cave')")
        for floor in [1,7,15,21]:
            ms = await pg.evaluate("async f=>{await __DUN.go(f);__DUN.respawn();return __FD.debugMonsters();}", floor)
            check_spawn(ms, min(7, math.ceil(floor/3)), True, floor, cave=True)
        await pg.evaluate("__DUN.setTheme('ruins')")
        for tier in range(2,8):
            mimic = None
            for attempt in range(8):
                await pg.evaluate('f=>__DUN.go(f)', (tier-1)*3+1)
                mimic = await pg.evaluate('__DUN.debugMimic()')
                if mimic and mimic['opened']:
                    break
            assert mimic and mimic['closed'] and mimic['opened'] and not mimic['blocked'], (tier,mimic)
            assert (tier-1)*10 < mimic['mobLv'] <= tier*10, mimic
        # 던전에서 필드로 직접 돌아와도 던전 벽 판정이 남지 않는다.
        await pg.evaluate("()=>__FD.enter('spring')")
        await pg.wait_for_timeout(650)
        await pg.wait_for_function("()=>__FD.state().map==='field'&&__FD.state().theme==='spring'&&__FD.state().monsters>0")
        ms = await pg.evaluate("()=>{__FD.respawn();return __FD.debugMonsters();}")
        check_spawn(ms, 1)
        assert not errors, errors
        await browser.close()
        print('7지역·1~21/24층·120%군집·184장비 생성·착용 제한 정상')


if __name__ == '__main__':
    static_checks()
    asyncio.run(runtime_checks())
