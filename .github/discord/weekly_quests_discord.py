#!/usr/bin/env python3
"""Droo's Weekly Quests -> Discord #announcements (Andrew 2026-11-23).
Builds the two webhook payloads for the Monday 12 PM ET post from the Dashboard's live quest data, and takes the
quests-page screenshot. It does NOT post: the scheduled task uploads the image and executes the webhook.
  python3 weekly_quests_discord.py OUTDIR [--image-url URL]   -> OUTDIR/quests.jpg, OUTDIR/payload.json
Exit code 3 = the Dashboard hasn't switched to this week's quests yet (try again later; never post last week)."""
import json, sys, os, html, datetime, urllib.request, subprocess
SITE = 'https://drooglettv.github.io/droogle-guide/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
IMG = sys.argv[sys.argv.index('--image-url') + 1] if '--image-url' in sys.argv else 'IMAGE_URL'
os.makedirs(OUT, exist_ok=True)
d = json.load(urllib.request.urlopen(SITE + 'data/quest_state.json?x=%d' % datetime.datetime.now().timestamp()))
# this Monday in Droogle's time (ET)
try:
    from zoneinfo import ZoneInfo
    now = datetime.datetime.now(ZoneInfo('America/New_York'))
except Exception:
    now = datetime.datetime.utcnow() - datetime.timedelta(hours=5)
mon = (now - datetime.timedelta(days=now.weekday())).date()
if d.get('week') != mon.isoformat():
    print('quest_state week is %s, expected %s' % (d.get('week'), mon)); sys.exit(3)
nxt = mon + datetime.timedelta(days=7)
fmt = lambda x: x.strftime('%b ') + str(x.day)
WEEK = '%s – %s' % (fmt(mon), fmt(nxt))
T = {'main': ('Main quest', 0x8BE04E, '❗'), 'side': ('Side quest', 0x4FB3FF, '❔'), 'hunt_c': ('Hunt', 0xFF5A6E, '💀'), 'hunt_b': ('Boss hunt', 0xFF2D4A, '👹'),
     'gold': ('Gold Saucer', 0xB583FF, '⭐'), 'chocobo': ('Chocobo', 0xFFD23F, '🪶'), 'treasure': ('Treasure', 0xFF9A3D, '🧰')}
ORDER = ['main', 'hunt_c', 'hunt_b', 'side', 'gold', 'chocobo', 'treasure']
qs = sorted([q for q in d['quests'] if q.get('type') in T], key=lambda q: ORDER.index(q['type']))
def cap(s): s = s.strip(); return (s[0].upper() + s[1:]).rstrip('.') + '.'
def when(q):
    l = q['desc'].lower()
    if q['type'] == 'main' and q.get('stages'): return 'All %d streams' % len(q['stages'])
    if q['type'].startswith('hunt'): return 'When it appears'
    if 'tonight' in l or 'one stream' in l: return 'In one stream'
    return 'Any time this week'
def reward(q):
    if q['type'] == 'main' and q.get('stages'):
        n = len(q['stages']); return '%s nuts per protected stream (up to %s)' % (format(q['exp'] // n, ','), format(q['exp'], ',')) if q['id'] == 'white_materia' else '%s nuts' % format(q['exp'], ',')
    return '%s nuts' % format(q['exp'], ',')
def desc(q):
    if q['type'].startswith('hunt'):
        return 'A %s lurks in **%s**. When it appears on stream, type `!hunt` to join the fight. Its name stays secret until then.' % ('boss mark' if q['type'] == 'hunt_b' else 'mark', q['loc'])
    t = cap(q['desc']).replace('time(s)', 'times').replace('!hunt', '`!hunt`')
    if q.get('emote'): t = t.replace('emote of the week', 'emote of the week, **%s**' % q['emote'])
    if q.get('paid') and q['id'] == 'white_materia': t += '\n*Progress on this one comes from Bits (Power-Up).*'
    return t
embeds = []
for q in qs:
    lab, col, em = T[q['type']]; lv = max(1, min(5, int(q.get('lvl') or 3)))
    embeds.append({'color': col, 'author': {'name': '%s  %s · %s' % (em, lab.upper(), q['loc'])},
                   'title': 'Mark Unknown' if q['type'].startswith('hunt') else q['name'], 'description': desc(q),
                   'fields': [{'name': '🥜 Reward', 'value': reward(q), 'inline': True},
                              {'name': '⭐ Difficulty', 'value': '★' * lv + '☆' * (5 - lv), 'inline': True},
                              {'name': '⏳ When', 'value': when(q), 'inline': True}],
                   'image': {'url': SITE + 'discord/spacer.png'}})   # a wide transparent strip makes every card full width (Andrew 2026-11-23 16:04)
# no footer line (Andrew 2026-11-23 16:07)
tot = sum(int(q.get('exp') or 0) for q in qs)
content = ('@here 📜 **Droo\'s Weekly Quests are up! · %s**\n'
           '%d new quests are pinned on the world map. Clear them together on stream and **everyone in chat** earns the EXP as nuts: up to **%s nuts** this week, kupo!\n'
           '🗺️ Follow live progress on the [Droogle Dashboard](<%squests/>) · type `!quests` in chat for a quick summary\n'
           '📅 Droogle is live Monday, Wednesday and Sunday at 8 PM ET') % (WEEK, len(qs), format(tot, ','), SITE)
msg1 = {'content': content, 'embeds': [{'color': 0x25D6C8, 'image': {'url': IMG}}], 'allowed_mentions': {'parse': ['everyone']}}
msg2 = {'embeds': embeds[:10], 'allowed_mentions': {'parse': []}}
json.dump({'week': mon.isoformat(), 'week_label': WEEK, 'messages': [msg1, msg2]}, open(os.path.join(OUT, 'payload.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# screenshot of the Dashboard's quests page (Playwright + Chromium are preinstalled in the cloud container)
js = r'''const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1240, height: 1180 }, deviceScaleFactor: 2 });
 await p.goto(process.argv[2], { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
 await p.screenshot({ path: process.argv[3], type: 'jpeg', quality: 88, fullPage: true }); await b.close(); })();'''
open(os.path.join(OUT, 'snap.js'), 'w').write(js)
subprocess.check_call(['node', os.path.join(OUT, 'snap.js'), SITE + 'quests/?x=%d' % now.timestamp(), os.path.join(OUT, 'quests.jpg')])
print('ok', WEEK, len(qs), 'quests', tot, 'nuts')
