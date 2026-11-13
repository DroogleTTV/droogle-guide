/* Droogle viewer profile + Moogle Medals (2026-11-12). Shared by the Twitch panel's Me tab and the guide website's
   profile card, so both always show the same thing. The page that loads it works out who the viewer is, fetches their
   entry from profiles/<x>.json and calls draw(); everything else (medal list, rarity, Queen's Blood cards) loads here.
     ext/medals.json             - the medal list, rank titles, avatar frames and tier points (guide site)
     quest-data/medal_rarity.json - how many active members hold each medal, and the stream days (Quest Engine)
     qb/cards.json               - Queen's Blood card art and draw weights (guide site)
   Fetched text is always placed with textContent / setAttribute, never as HTML. */
(function () {
  'use strict';
  var SVGNS = 'http://www.w3.org/2000/svg', TZ = 'America/New_York';
  var RARITY_URL = 'https://raw.githubusercontent.com/DroogleTTV/droogle-guide/quest-data/medal_rarity.json';
  var TIER = { b: ['bronze', 'Bronze'], s: ['silver', 'Silver'], g: ['gold', 'Gold'], p: ['platinum', 'Platinum'] };
  var TORD = { b: 0, s: 1, g: 2, p: 3 };
  var BIRD_COL = { Yellow: '#ffd23f', Blue: '#5ec8ff', Green: '#7ee05a', Black: '#9aa3c0', Gold: '#ffb52e' };
  var CLASS_CAP = { Weak: 150, Good: 190, Great: 230, Wonderful: 255 };   // the chocobo classes and their feeding speed caps (chocobo guide)
  var DEF_RANKS = [[0, 'Onion Knight'], [5, 'Freelancer'], [15, 'Squire'], [30, 'Knight'], [50, 'Dragoon'], [80, 'Paladin'], [120, 'Sage'],
    [175, 'Dark Knight'], [250, 'Holy Knight'], [350, 'Mystic Knight'], [500, 'Champion of Light'], [700, 'Moogle Monarch']];
  var DEF_FRAMES = [[15, 'b'], [50, 's'], [175, 'g'], [400, 'p']], DEF_PTS = { b: 1, s: 3, g: 10, p: 25 };
  var WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function str(x, max) { return typeof x === 'string' ? x.slice(0, max || 400) : (typeof x === 'number' ? String(x) : ''); }
  function num(x) { var n = +x; return isFinite(n) ? n : 0; }
  function fmt(n) { return Math.round(num(n)).toLocaleString('en-US'); }
  function slug(n) { return n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function getJSON(url) { return fetch(url, { cache: 'no-store', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function qbTier(w) { return w <= 6 ? 'ur' : w <= 11 ? 'vr' : w <= 19 ? 'r' : w <= 31 ? 'u' : 'c'; }
  function spot(n, of) { return n > 0 ? '#' + fmt(n) + (of ? ' of ' + fmt(of) : '') : ''; }
  // days are counted from 1970-01-01 (the Quest Engine's earned dates and stream days, Droogle's local dates)
  var dparts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  function etDay(ms) { var o = {}; dparts.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; }); return Math.floor(Date.UTC(o.year, o.month - 1, o.day) / 864e5); }
  function today() { return etDay(Date.now()); }
  function streamDay() { return etDay(Date.now() - 6 * 36e5); }      // a stream that runs past midnight stays on its evening
  function dayText(d, long) { return new Date(d * 864e5).toLocaleDateString('en-US', long ? { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' } : { timeZone: 'UTC', month: 'short', day: 'numeric' }); }
  function isoDay(s) {               // "yyyy-mm-dd", or "mm-dd" for a window that comes back every year (this year's date)
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m && (m = /^(\d{2})-(\d{2})$/.exec(String(s || '')))) m = [0, new Date(today() * 864e5).getUTCFullYear(), m[1], m[2]];
    return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5) : null;
  }

  window.DroogleProfile = function (cfg) {
    var SITE = cfg.site, IMG = cfg.img, CLS = cfg.cls || {};
    var ME = null, MEDALS = null, RAR = null, QBCARDS = null, showAllCards = false, MEVIEW = 'profile', MFILTER = 'all';
    try { if (sessionStorage.getItem('droogleMeView') === 'medals') MEVIEW = 'medals'; } catch (e) {}

    function section(title, extra, cls) { var s = h('section', 'msec' + (cls ? ' ' + cls : '')), hd = h('div', 'mh'); add(hd, h('h3', null, title), extra ? h('span', null, extra) : null); s.appendChild(hd); return s; }
    function medalImg(t, cls) { var im = h('img', cls); im.src = IMG + 'medal_' + TIER[t][0] + '.png'; im.alt = TIER[t][1] + ' medal'; return im; }

    /* ---------- data ---------- */
    function validProfile(r) {
      if (!r || typeof r !== 'object') return null;
      var o = { p: r.p != null ? Math.max(0, num(r.p)) : null, pr: num(r.pr), h: r.h != null ? Math.max(0, num(r.h)) : null, hr: num(r.hr), r: str(r.r, 60),
        g: r.g != null ? Math.max(0, num(r.g)) : null, i: [], c: [], q: null, m: {}, me: {}, ms: r.ms != null ? Math.max(0, num(r.ms)) : null, msr: num(r.msr), a: null, fd: (num(r.fd) > 13000 && num(r.fd) < 40000) ? Math.floor(num(r.fd)) : 0 };
      if (r.m && typeof r.m === 'object') Object.keys(r.m).slice(0, 200).forEach(function (k) { if (/^[a-z0-9_]{1,30}$/.test(k) && num(r.m[k]) > 0) o.m[k] = num(r.m[k]); });
      if (r.me && typeof r.me === 'object') Object.keys(r.me).slice(0, 400).forEach(function (k) { var d = num(r.me[k]); if (/^[a-z0-9_]{1,30}$/.test(k) && d > 15000 && d < 40000) o.me[k] = Math.floor(d); });
      if (r.a && typeof r.a === 'object') {
        o.a = { n: Math.max(0, num(r.a.n)), s: Math.max(0, num(r.a.s)), b: Math.max(0, num(r.a.b)), f: num(r.a.f), d: [], o: r.a.o ? 1 : 0, fg: str(r.a.fg, 70), tg: str(r.a.tg, 70), tc: Math.max(0, num(r.a.tc)) };
        if (Array.isArray(r.a.d)) o.a.d = r.a.d.slice(0, 400).map(num).filter(function (d) { return d > 15000 && d < 40000; });
      }
      if (r.i && typeof r.i === 'object') Object.keys(r.i).slice(0, 80).forEach(function (k) { if (/^[A-Za-z0-9' .\-]{1,40}$/.test(k) && num(r.i[k]) > 0) o.i.push([k, num(r.i[k])]); });
      if (Array.isArray(r.c)) r.c.slice(0, 5).forEach(function (b) {
        if (!Array.isArray(b) || b.length < 8) return;
        var col = BIRD_COL[b[1]] ? b[1] : 'Yellow';
        o.c.push({ slot: num(b[0]), color: col, sex: b[2] === 'Female' ? 'Female' : b[2] === 'Male' ? 'Male' : '', cls: CLASS_CAP[b[3]] ? b[3] : '', wins: Math.max(0, num(b[4])),
          name: str(b[5], 30), speed: Math.max(0, Math.min(255, num(b[6]))), primary: b[7] === 1 });
      });
      o.c.sort(function (a, b) { return (b.primary ? 1 : 0) - (a.primary ? 1 : 0) || a.slot - b.slot; });
      if (r.q && typeof r.q === 'object') {
        o.q = { r: str(r.q.r, 60), s: r.q.s != null ? num(r.q.s) : null, qr: num(r.q.qr), c: [] };
        if (r.q.c && typeof r.q.c === 'object') Object.keys(r.q.c).slice(0, 400).forEach(function (k) { if (k.length <= 60 && num(r.q.c[k]) > 0) o.q.c.push([k, num(r.q.c[k])]); });
      }
      return o;
    }
    function validMedals(d) {
      if (!d || !Array.isArray(d.medals) || !Array.isArray(d.cats)) return null;
      var cats = d.cats.filter(function (c) { return c && typeof c.id === 'string' && typeof c.n === 'string'; }).map(function (c) { return { id: str(c.id, 20), n: str(c.n, 40) }; });
      var ms = d.medals.filter(function (m) { return m && TIER[m.t] && typeof m.id === 'string' && typeof m.n === 'string' && Array.isArray(m.r) && m.r.length; }).slice(0, 400).map(function (m) {
        return { id: str(m.id, 30), c: str(m.c, 20), t: m.t, n: str(m.n, 60), d: str(m.d, 120), from: isoDay(m.from), until: isoDay(m.until), s: m.s === 1,
          r: m.r.filter(function (x) { return Array.isArray(x) && typeof x[0] === 'string' && /^[a-z0-9_]{1,30}$/.test(x[0]) && num(x[1]) > 0; }).map(function (x) { return [x[0], num(x[1])]; }) };
      }).filter(function (m) { return m.r.length; });
      var pts = {}; ['b', 's', 'g', 'p'].forEach(function (t) { pts[t] = d.pts && num(d.pts[t]) > 0 ? num(d.pts[t]) : DEF_PTS[t]; });
      var ranks = Array.isArray(d.ranks) ? d.ranks.filter(function (x) { return Array.isArray(x) && typeof x[1] === 'string'; }).map(function (x) { return [num(x[0]), str(x[1], 30)]; }) : [];
      var frames = Array.isArray(d.frames) ? d.frames.filter(function (x) { return Array.isArray(x) && TIER[x[1]]; }).map(function (x) { return [num(x[0]), x[1]]; }) : [];
      ranks.sort(function (a, b) { return a[0] - b[0]; }); frames.sort(function (a, b) { return a[0] - b[0]; });
      return { cats: cats, medals: ms, pts: pts, ranks: ranks.length ? ranks : DEF_RANKS, frames: frames.length ? frames : DEF_FRAMES,
        max: ms.reduce(function (s, m) { return s + pts[m.t]; }, 0) };
    }
    function validRarity(d) {
      if (!d || typeof d !== 'object' || !d.m || typeof d.m !== 'object') return null;
      var o = { act: Math.max(0, num(d.act)), all: Math.max(0, num(d.all)), m: {}, streams: [] };
      Object.keys(d.m).slice(0, 400).forEach(function (k) { var v = d.m[k]; if (/^[a-z0-9_]{1,30}$/.test(k) && Array.isArray(v)) o.m[k] = [Math.max(0, num(v[0])), Math.max(0, num(v[1]))]; });
      if (Array.isArray(d.streams)) o.streams = d.streams.slice(-500).map(num).filter(function (x) { return x > 15000 && x < 40000; });
      return o;
    }
    function loadAll() {
      if (!MEDALS && !loadAll.m) { loadAll.m = 1; getJSON(SITE + 'ext/medals.json').then(function (d) { MEDALS = validMedals(d) || { cats: [], medals: [], failed: true }; })
        .catch(function () { MEDALS = { cats: [], medals: [], failed: true }; }).then(function () { loadAll.m = 0; redraw(); }); }
      if (!RAR && !loadAll.r) { loadAll.r = 1; getJSON(RARITY_URL + '?t=' + Math.floor(Date.now() / 6e5)).then(function (d) { RAR = validRarity(d) || { none: 1 }; })
        .catch(function () { RAR = { none: 1 }; }).then(function () { loadAll.r = 0; redraw(); }); }
    }

    /* ---------- medal state ---------- */
    function medalState(m, P) {      // earned?, earned day, progress 0..1, progress text, limited-window text
      var st = P ? P.m : {}, day = P && P.me[m.id] ? P.me[m.id] : null;
      var fr = m.r.map(function (x) { return Math.min(1, (st[x[0]] || 0) / x[1]); });
      var t = today(), open = (m.from == null || t >= m.from) && (m.until == null || t <= m.until);
      var earned = day != null || (open && fr.every(function (f) { return f >= 1; }));
      var p = fr.reduce(function (a, b) { return a + b; }, 0) / fr.length, txt = '', lim = '';
      if (!earned && open) {
        if (m.r.length === 1 && m.r[0][1] > 1) txt = fmt(Math.min(st[m.r[0][0]] || 0, m.r[0][1])) + ' / ' + fmt(m.r[0][1]);
        else if (m.r.length > 1) txt = fr.filter(function (f) { return f >= 1; }).length + ' of ' + m.r.length + ' done';
      }
      if (m.s && m.from != null && m.until != null) lim = open ? 'Seasonal, now until ' + dayText(m.until) : 'Seasonal, every year ' + dayText(m.from) + '–' + dayText(m.until);
      else if (m.from != null || m.until != null) {
        if (m.from != null && t < m.from) lim = 'Opens ' + dayText(m.from);
        else if (m.until != null && t > m.until) lim = 'Event ended';
        else lim = m.until != null ? 'Limited time, until ' + dayText(m.until) : 'Limited time';
      }
      return { earned: earned, day: day, p: open ? p : 0, txt: txt, lim: lim, open: open };
    }
    function rarity(m) {             // share of active members holding it
      if (!RAR || RAR.none || !RAR.m[m.id]) return null;
      var c = RAR.m[m.id], base = RAR.act > 0 ? RAR.act : RAR.all, n = RAR.act > 0 ? c[0] : c[1];
      if (!base) return null;
      var pc = n / base * 100;
      return { pc: pc, n: n, base: base, label: pc <= 2 ? 'Legendary' : pc <= 10 ? 'Rare' : pc <= 30 ? 'Uncommon' : 'Common',
        cls: pc <= 2 ? 'leg' : pc <= 10 ? 'rare' : pc <= 30 ? 'unc' : 'com',
        text: n === 0 ? 'No active member has this yet' : (pc < 1 ? '<1' : Math.round(pc)) + '% of active members' };
    }
    function scoreOf(P, states) {
      if (P && P.ms != null) return P.ms;
      var s = 0; MEDALS.medals.forEach(function (m) { if (states[m.id].earned) s += MEDALS.pts[m.t]; }); return s;
    }
    function rankOf(score) {
      var R = MEDALS && MEDALS.ranks ? MEDALS.ranks : DEF_RANKS, cur = R[0], nxt = null;
      for (var i = 0; i < R.length; i++) { if (score >= R[i][0]) { cur = R[i]; nxt = R[i + 1] || null; } }
      return { name: cur[1], at: cur[0], next: nxt, lv: R.indexOf(cur) + 1 };
    }
    function frameOf(score) { var F = MEDALS && MEDALS.frames ? MEDALS.frames : DEF_FRAMES, f = ''; F.forEach(function (x) { if (score >= x[0]) f = x[1]; }); return f; }
    function allStates(P) { var s = {}; if (MEDALS && MEDALS.medals) MEDALS.medals.forEach(function (m) { s[m.id] = medalState(m, P); }); return s; }
    function rarest(P, states, n) {
      return MEDALS.medals.filter(function (m) { return states[m.id].earned; }).sort(function (a, b) {
        var ra = rarity(a), rb = rarity(b);
        return (ra ? ra.pc : 101) - (rb ? rb.pc : 101) || TORD[b.t] - TORD[a.t] || (states[b.id].day || 0) - (states[a.id].day || 0);
      }).slice(0, n);
    }

    /* ---------- header ---------- */
    function avatar(W, frame) {
      var wrap = h('div', 'avw' + (frame ? ' fr-' + TIER[frame][0] : ''));
      if (W.img) { var av = h('img', 'av'); av.src = W.img; av.alt = ''; wrap.appendChild(av); } else wrap.appendChild(h('span', 'av ph', W.name.charAt(0).toUpperCase()));
      if (frame) wrap.setAttribute('title', TIER[frame][1] + ' frame');
      return wrap;
    }
    function drawHead(box, P, info) {
      var hd = h('div', 'mhead');
      hd.appendChild(avatar(ME.who, info ? info.frame : ''));
      var nm = h('div', 'mname'); nm.appendChild(h('b', null, ME.who.name));
      var tags = h('div', 'mtags');
      if (info) { var at = h('span', 'arank'); at.appendChild(medalImg(info.frame || 'b', 'ari')); at.appendChild(document.createTextNode(info.rank.name)); at.title = 'Adventurer Rank (from Moogle Medals)'; tags.appendChild(at); }
      if (P && P.r) { var cr = h('span', 'rank', P.r); cr.title = 'Chatbot rank'; tags.appendChild(cr); }
      if (tags.firstChild) nm.appendChild(tags);
      hd.appendChild(nm); box.appendChild(hd);
    }
    function meSwitch(box, nE, nAll) {
      var sw = h('div', 'mswitch'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Show');
      [['profile', 'Profile'], ['medals', 'Medals']].forEach(function (x) {
        var b = h('button', MEVIEW === x[0] ? 'on' : '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', MEVIEW === x[0] ? 'true' : 'false');
        if (x[0] === 'medals' && nAll) b.appendChild(h('span', 'cnt', nE + '/' + nAll));
        b.addEventListener('click', function () { setView(x[0]); });
        sw.appendChild(b);
      });
      box.appendChild(sw);
    }
    function setView(v, filter) {
      if (filter) MFILTER = filter;
      if (MEVIEW !== v) { MEVIEW = v; try { sessionStorage.setItem('droogleMeView', v); } catch (e) {} }
      redraw(); var sc = cfg.scroll && cfg.scroll(); if (sc) sc.scrollTop = 0;
    }

    /* ---------- profile view: Adventurer Rank, showcase, attendance, recent medals ---------- */
    function drawRankCard(box, P, info, states) {
      var c = h('section', 'arcard'), top = h('div', 'arTop');
      var lv = h('div', 'arLv'); add(lv, h('span', null, 'Rank'), h('b', null, String(info.rank.lv)));
      var tt = h('div', 'arT'); add(tt, h('span', 'k', 'Adventurer Rank'), h('b', null, info.rank.name));
      var sc = h('div', 'arS'); add(sc, h('b', null, fmt(info.score)), h('span', null, 'medal pts'));
      add(top, lv, tt, sc); c.appendChild(top);
      var R = info.rank, bar = h('div', 'arBar'), f = h('i');
      var frac = R.next ? (info.score - R.at) / (R.next[0] - R.at) : 1; f.style.width = Math.max(2, Math.min(100, frac * 100)).toFixed(1) + '%'; bar.appendChild(f);
      c.appendChild(bar);
      var sub = h('div', 'arSub');
      add(sub, h('span', null, R.next ? fmt(R.next[0] - info.score) + ' pts to ' + R.next[1] : 'Highest rank reached!'),
        P && P.msr ? h('b', null, spot(P.msr, ME.nm)) : null);
      c.appendChild(sub);
      // showcase: the rarest medals they hold
      var sh = h('div', 'show'), best = rarest(P, states, 3);
      best.forEach(function (m) {
        var r = rarity(m), t = h('button', 'shm ' + TIER[m.t][0]); t.type = 'button';
        add(t, medalImg(m.t, 'shi'), h('b', null, m.n), h('span', 'rl ' + (r ? r.cls : ''), r ? r.label + (r.n ? ' · ' + (r.pc < 1 ? '<1' : Math.round(r.pc)) + '%' : '') : TIER[m.t][1]));
        t.setAttribute('aria-label', m.n + ', ' + TIER[m.t][1] + (r ? ', ' + r.text : '') + '. Show in Medals');
        t.addEventListener('click', function () { setView('medals', 'earned'); });
        sh.appendChild(t);
      });
      for (var i = best.length; i < 3; i++) { var e = h('div', 'shm empty'); add(e, h('span', 'shq', '?'), h('span', 'rl', 'Earn a medal')); sh.appendChild(e); }
      var shh = h('div', 'shh'); add(shh, h('span', null, 'Showcase'), h('small', null, 'your rarest medals'));
      add(c, shh, sh);
      // categories finished
      var done = MEDALS.cats.filter(function (ct) { var l = MEDALS.medals.filter(function (m) { return m.c === ct.id && !m.s; }); return l.length && l.every(function (m) { return states[m.id].earned; }); });
      if (done.length) { var cb = h('div', 'cdone'); done.forEach(function (ct) { cb.appendChild(h('span', null, ct.n)); }); c.appendChild(cb); }
      box.appendChild(c);
    }
    function drawAttendance(box, P) {
      var A = P && P.a; if (!A || !A.n) return;
      var s = section('Attendance', !A.f ? '' : A.o ? 'Based on data starting June 2023' : 'Here since ' + dayText(A.f, true));   /* o = already here when the attendance records begin (2023-06-14) */
      var g = h('div', 'atts');
      [['Streams', A.n], ['Streak', A.s], ['Best streak', A.b]].forEach(function (x, i) {
        var d = h('div', 'att' + (i === 1 && x[1] >= 3 ? ' hot' : '')); add(d, h('b', null, fmt(x[1])), h('span', null, x[0])); g.appendChild(d);
      });
      s.appendChild(g);
      if (A.fg || A.tg) {                     /* first game watched, and the game watched on the most stream days */
        var gg = h('div', 'attg');
        if (A.fg) { var g1 = h('div'); add(g1, h('span', null, 'First game'), h('b', null, A.fg)); g1.title = 'The game on your first stream here'; gg.appendChild(g1); }
        if (A.tg) { var g2 = h('div'); add(g2, h('span', null, 'Most watched'), h('b', null, A.tg), A.tc ? h('small', null, fmt(A.tc) + ' streams') : null); g2.title = 'The game you have been here for the most'; gg.appendChild(g2); }
        s.appendChild(gg);
      }
      // calendar: the last 13 weeks, stream days you were at lit up
      var mine = {}; A.d.forEach(function (d) { mine[d] = 1; });
      var live = {}; if (RAR && RAR.streams && RAR.streams.length) RAR.streams.forEach(function (d) { live[d] = 1; }); else A.d.forEach(function (d) { live[d] = 1; });
      var end = streamDay(), wdEnd = new Date(end * 864e5).getUTCDay(), last = end + (6 - wdEnd), first = last - 13 * 7 + 1;
      var cal = h('div', 'cal'), months = h('div', 'calm'), grid = h('div', 'calg');
      for (var w = 0; w < 13; w++) {          // month name above the week that holds the 1st (and the first column)
        var d0 = first + w * 7, lab = '';
        for (var k = 0; k < 7; k++) if (new Date((d0 + k) * 864e5).getUTCDate() === 1) lab = new Date((d0 + k) * 864e5).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
        if (w === 0 && !lab) lab = new Date(d0 * 864e5).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
        months.appendChild(h('span', null, lab));
      }
      var wl = h('div', 'calw'); WD.forEach(function (x, i) { wl.appendChild(h('span', null, i % 2 ? x : '')); });
      for (var dd = first; dd <= last; dd++) {
        var cell = h('i', dd > end ? 'fut' : mine[dd] ? 'on' : live[dd] ? 'miss' : '');
        cell.title = dayText(dd) + (mine[dd] ? ': you were here' : live[dd] ? ': stream (missed)' : '');
        grid.appendChild(cell);
      }
      var body = h('div', 'calb'); add(body, wl, grid);
      add(cal, months, body);
      var leg = h('div', 'cleg'); add(leg, h('i', 'on'), h('span', null, 'You were here'), h('i', 'miss'), h('span', null, 'Missed stream'));
      add(s, cal, leg);
      box.appendChild(s);
    }
    function drawRecent(box, P, states) {
      var got = MEDALS.medals.filter(function (m) { return states[m.id].day != null; }).sort(function (a, b) { return states[b.id].day - states[a.id].day || TORD[b.t] - TORD[a.t]; }).slice(0, 4);
      if (!got.length) return;
      var s = section('Recent medals'), l = h('div', 'recent');
      got.forEach(function (m) { var r = h('div', 'rc ' + TIER[m.t][0]); add(r, medalImg(m.t, 'rci'), h('b', null, m.n), h('span', null, dayText(states[m.id].day))); l.appendChild(r); });
      s.appendChild(l); box.appendChild(s);
    }

    /* ---------- profile view: stats, chocobos, items, Queen's Blood ---------- */
    function followAge(fd) {                  /* "3y 10m" since the day they followed (calendar years and months) */
      var today = etDay(Date.now()), a = new Date(fd * 864e5), b = new Date(today * 864e5);
      var m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth() - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
      if (m < 0) m = 0;
      var y = Math.floor(m / 12), mo = m % 12, days = Math.max(0, today - fd);
      return y ? y + 'y' + (mo ? ' ' + mo + 'm' : '') : mo ? mo + 'm' : days + 'd';
    }
    function drawStats(box, P) {
      var st = h('div', 'mstats'), nuts = P.p != null ? P.p : P.g;        /* nuts and gil are the same purse: one tile */
      var tiles = [['Nuts / Gil', nuts != null ? fmt(nuts) : null, spot(P.pr, ME.np)], ['Hours watched', P.h != null ? fmt(P.h) : null, spot(P.hr, ME.nh)]];
      if (P.fd) tiles.push(['Following', followAge(P.fd), 'since ' + new Date(P.fd * 864e5).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' })]);
      tiles.forEach(function (x) {
        if (x[1] == null) return; var d = h('div', 'mstat'); add(d, h('span', 'k', x[0]), h('b', null, x[1]), x[2] ? h('span', 's', x[2]) : null); st.appendChild(d);
      });
      if (st.firstChild) box.appendChild(st);
    }
    function drawBirds(box, P) {
      var cs = section('Chocobo stable', P.c.length ? P.c.length + ' of 5' : '');
      if (!P.c.length) cs.appendChild(h('p', 'mempty', 'No chocobos yet. Type !chocobo in chat to learn how to catch one.'));
      P.c.forEach(function (b) {
        var row = h('div', 'bird' + (b.primary ? ' prim' : '')); row.style.setProperty('--bc', BIRD_COL[b.color]);
        var im = h('img', 'bsprite'); im.src = IMG + 'choco_' + b.color.toLowerCase() + '.png'; im.alt = b.color + ' chocobo';
        var bi = h('div', 'bi'), top = h('div', 'bt');
        add(top, h('b', null, b.name && b.name !== 'Unnamed' ? b.name : 'Unnamed'), b.primary ? h('span', 'ptag', 'Primary') : null);
        var sub = [b.color, b.cls, b.sex, b.wins + (b.wins === 1 ? ' win' : ' wins')].filter(Boolean).join(' · ');
        var bar = h('div', 'spd'), fill = h('i'); fill.style.width = (b.speed / 255 * 100).toFixed(1) + '%'; bar.appendChild(fill);
        var sp = h('div', 'spl'); add(sp, h('span', null, 'Speed'), h('b', null, b.speed + ' / 255'));
        add(bi, top, h('div', 'bs', sub), bar, sp);
        add(row, im, bi); cs.appendChild(row);
      });
      box.appendChild(cs);
    }
    function drawItems(box, P) {
      var items = P.i.slice().sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
      var is = section('Items', items.length ? items.reduce(function (s, x) { return s + x[1]; }, 0).toLocaleString('en-US') + ' total' : '');
      if (!items.length) is.appendChild(h('p', 'mempty', 'No items yet. Turn nuts into Gil and shop in the Item Shop.'));
      var grid = h('div', 'igrid');
      items.forEach(function (x) {
        var t = h('div', 'it'), ic = h('img'); ic.src = SITE + 'img/it_' + slug(x[0]) + '.png'; ic.alt = ''; ic.loading = 'lazy';
        ic.addEventListener('error', function () { ic.replaceWith(h('span', 'iph', x[0].charAt(0))); });
        t.title = x[0] + ' ×' + fmt(x[1]); add(t, ic, h('span', 'in', x[0]), h('b', null, '×' + fmt(x[1]))); grid.appendChild(t);
      });
      if (items.length) is.appendChild(grid);
      box.appendChild(is);
    }
    function drawQB(box, P) {
      var Q = P.q;
      var qs = section('Queen’s Blood', Q && Q.qr ? spot(Q.qr, ME.nq) : '');
      if (!Q || !Q.c.length) { qs.appendChild(h('p', 'mempty', 'No Queen’s Blood cards yet. Redeem Queen’s Blood with Pom Poms to draw your first.')); box.appendChild(qs); return; }
      var copies = Q.c.reduce(function (s, x) { return s + x[1]; }, 0);
      var qh = h('div', 'qbh'); add(qh, Q.r ? h('span', 'rank', Q.r) : null, Q.s != null ? h('span', 'qpts', fmt(Q.s) + ' pts') : null); qs.appendChild(qh);
      var prog = h('div', 'qprog'), pl = h('div', 'spl'), total = QBCARDS ? QBCARDS.cards.length : 152;
      add(pl, h('span', null, Q.c.length + ' of ' + total + ' cards'), h('b', null, fmt(copies) + (copies === 1 ? ' copy' : ' copies')));
      var pb = h('div', 'spd gold'), pf = h('i'); pf.style.width = Math.min(100, Q.c.length / total * 100).toFixed(1) + '%'; pb.appendChild(pf);
      add(prog, pl, pb); qs.appendChild(prog);
      var cg = h('div', 'cgrid'); qs.appendChild(cg);
      var more = h('button', 'more2'); more.type = 'button'; qs.appendChild(more);
      var drawCards = function () {
        cg.textContent = '';
        var byName = {}; if (QBCARDS) QBCARDS.cards.forEach(function (c) { byName[c.name] = c; });
        var list = Q.c.map(function (x) { var c = byName[x[0]]; return { n: x[0], k: x[1], id: c ? c.id : '', w: c ? c.w : 999 }; })
          .sort(function (a, b) { return a.w - b.w || (a.n < b.n ? -1 : 1); });
        (showAllCards ? list : list.slice(0, 6)).forEach(function (c) {
          var t = h('div', (CLS.card || 'card') + ' ' + qbTier(c.w));
          if (c.id && /^\d{1,3}[A-Z]?$/.test(String(c.id))) { var im = h('img'); im.src = SITE + 'qb/s/' + c.id + '.webp'; im.alt = c.n; im.loading = 'lazy'; t.appendChild(im); }
          else t.appendChild(h('span', 'cph', c.n));
          if (c.k > 1) t.appendChild(h('b', 'ck', '×' + c.k));
          t.title = c.n + (c.k > 1 ? ' ×' + c.k : '');
          cg.appendChild(t);
        });
        more.hidden = list.length <= 6;
        more.textContent = showAllCards ? 'Show fewer' : 'Show all ' + list.length + ' cards (rarest first)';
      };
      more.addEventListener('click', function () { showAllCards = !showAllCards; drawCards(); });
      if (cfg.qbUrl) {                        /* the panel: a link to their page on the guide */
        var pl2 = h('a', 'more2 qbpage', 'Open my Queen’s Blood page'); pl2.href = cfg.qbUrl(ME); pl2.target = '_blank'; pl2.rel = 'noopener noreferrer';
        pl2.setAttribute('aria-label', 'Open my Queen’s Blood page (opens the Droogle Dashboard website in a new tab)'); qs.appendChild(pl2);
      } else if (cfg.qb) {                    /* the guide: open the collection page right here */
        var pb2 = h('button', 'more2 qbpage', 'Open my Queen’s Blood page'); pb2.type = 'button';
        pb2.addEventListener('click', function () { var c = {}; Q.c.forEach(function (x) { c[x[0]] = x[1]; }); cfg.qb({ n: ME.who.name || ME.who.login, r: Q.r, s: Q.s, qr: Q.qr, c: c }, pb2); });
        qs.appendChild(pb2);
      }
      drawCards();
      if (!QBCARDS && !drawQB.busy) { drawQB.busy = 1; getJSON(SITE + 'qb/cards.json').then(function (d) { if (d && Array.isArray(d.cards)) { QBCARDS = { cards: d.cards.filter(function (c) { return c && typeof c.name === 'string'; }).map(function (c) { return { id: String(c.id), name: c.name, w: num(c.w) }; }) }; redraw(); } }).catch(function () {}); }
      box.appendChild(qs);
    }

    /* ---------- medals view ---------- */
    function drawMedals(box, P, states) {
      if (!MEDALS) { box.appendChild(h('p', 'mnone', 'Loading the Moogle Medals…')); return; }
      if (MEDALS.failed || !MEDALS.medals.length) { box.appendChild(h('p', 'mnone', 'The Moogle Medals couldn’t be loaded. Close and reopen this to try again.')); return; }
      var all = MEDALS.medals, per = { b: [0, 0], s: [0, 0], g: [0, 0], p: [0, 0] };
      all.forEach(function (m) { if (m.s) return; per[m.t][1]++; if (states[m.id].earned) per[m.t][0]++; });
      var tiers = h('div', 'mtiers');
      ['b', 's', 'g', 'p'].forEach(function (t) {
        var d = h('div', 'mtier'); add(d, medalImg(t, 'tm'), h('b', null, String(per[t][0])), h('span', null, 'of ' + per[t][1]));
        d.setAttribute('aria-label', TIER[t][1] + ': ' + per[t][0] + ' of ' + per[t][1] + ' earned'); tiers.appendChild(d);
      });
      box.appendChild(tiers);
      var ch = h('div', (CLS.chips || 'chips') + ' mfilter'); ch.setAttribute('role', 'group'); ch.setAttribute('aria-label', 'Show medals');
      [['all', 'All'], ['earned', 'Earned'], ['next', 'Closest'], ['rare', 'Rarest'], ['locked', 'Locked']].forEach(function (x) {
        var b = h('button', MFILTER === x[0] ? 'on' : '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', MFILTER === x[0] ? 'true' : 'false');
        b.addEventListener('click', function () { MFILTER = x[0]; redraw(); }); ch.appendChild(b);
      });
      box.appendChild(ch);
      var shown = 0;
      var row = function (m) {
        var s = states[m.id], rr = rarity(m), r = h('div', 'medal ' + (s.earned ? 'got ' : 'locked ') + TIER[m.t][0] + (s.lim ? ' lim' : ''));
        r.appendChild(medalImg(m.t, 'mimg'));
        var b = h('div', 'mb'), top = h('div', 'mn'); add(top, h('b', null, m.n), h('span', 'mt', TIER[m.t][1]));
        add(b, top, h('div', 'md', m.d));
        if (!s.earned && s.txt) { var bar = h('div', 'mbar'), f = h('i'); f.style.width = (s.p * 100).toFixed(1) + '%'; bar.appendChild(f); add(b, bar, h('div', 'mpt', s.txt)); }
        var meta = h('div', 'mmeta');
        if (s.earned && s.day != null) meta.appendChild(h('span', 'mdate', 'Earned ' + dayText(s.day, new Date(s.day * 864e5).getUTCFullYear() !== new Date().getUTCFullYear())));
        else if (s.earned) meta.appendChild(h('span', 'mdate', 'Earned'));
        if (rr && rr.n) { var rp = h('span', 'rl ' + rr.cls, rr.label); rp.title = rr.text; meta.appendChild(rp); }
        if (rr) meta.appendChild(h('span', 'rpc', rr.text));
        if (s.lim) meta.appendChild(h('span', 'ltag', s.lim));
        if (meta.firstChild) b.appendChild(meta);
        r.appendChild(b);
        r.setAttribute('aria-label', m.n + ', ' + TIER[m.t][1] + (s.earned ? ', earned' + (s.day != null ? ' ' + dayText(s.day, true) : '') : ', not earned yet') + '. ' + m.d +
          (s.txt ? '. Progress ' + s.txt : '') + (rr ? '. ' + rr.label + ': ' + rr.text : '') + (s.lim ? '. ' + s.lim : ''));
        return r;
      };
      var flat = function (title, list, empty) {
        var sec = section(title); list.forEach(function (m) { sec.appendChild(row(m)); }); shown = list.length;
        if (!list.length) sec.appendChild(h('p', 'mempty', empty)); box.appendChild(sec);
      };
      if (MFILTER === 'next') {
        flat('Closest to earning', all.filter(function (m) { return !states[m.id].earned && states[m.id].p > 0; }).sort(function (a, b) { return states[b.id].p - states[a.id].p; }).slice(0, 12),
          'Nothing in progress yet. Chat, play the mini-games and join in on stream to start earning!');
      } else if (MFILTER === 'rare') {
        if (!RAR || RAR.none) { box.appendChild(h('p', 'mnone', RAR ? 'Medal rarity isn’t available yet. It appears once the community has been tracked for a stream or two.' : 'Loading medal rarity…')); return; }
        flat('Rarest medals in the community', all.filter(function (m) { var r = rarity(m); return r && r.n > 0; }).sort(function (a, b) { return rarity(a).pc - rarity(b).pc || TORD[b.t] - TORD[a.t]; }).slice(0, 20), '');
      } else {
        MEDALS.cats.forEach(function (c) {
          var full = all.filter(function (m) { return m.c === c.id; }), got = full.filter(function (m) { return states[m.id].earned; }).length;
          var list = full.filter(function (m) { return MFILTER === 'all' || (MFILTER === 'earned') === states[m.id].earned; })
            .sort(function (a, b) { return TORD[a.t] - TORD[b.t]; });
          if (!list.length) return;
          if (c.id === 'season' || full.every(function (m) { return m.s; })) {      // seasonal: extra to the 100, no completion bar
            var ss = section(c.n, 'extra to the ' + MEDALS.medals.filter(function (m) { return !m.s; }).length, 'mseason');
            list.forEach(function (m) { ss.appendChild(row(m)); }); shown += list.length; box.appendChild(ss); return;
          }
          var complete = full.length && got === full.length;
          var sec = section(c.n, got + ' of ' + full.length, complete ? 'mdone' : '');
          if (complete) { var rb = h('div', 'ribbon'); add(rb, h('b', null, 'Category complete'), h('span', null, 'Every ' + c.n + ' medal earned')); sec.insertBefore(rb, sec.children[1] || null); }
          else { var cp = h('div', 'cbar'), cf = h('i'); cf.style.width = (got / full.length * 100).toFixed(1) + '%'; cp.appendChild(cf); sec.insertBefore(cp, sec.children[1] || null); }
          list.forEach(function (m) { sec.appendChild(row(m)); }); shown += list.length;
          box.appendChild(sec);
        });
        if (!shown) box.appendChild(h('p', 'mnone', MFILTER === 'earned' ? 'No medals yet. Every medal is free to earn; check the Locked list for ideas!' : 'You’ve earned every medal. Incredible!'));
      }
      box.appendChild(h('p', CLS.foot || 'foot', 'Moogle Medals are free to earn and never go away once you have them. Rarity counts members who were at a stream in each of the last 3 months. Progress updates about every 20 minutes while Droogle is live.'));
    }

    /* ---------- the whole thing ---------- */
    function redraw() {
      var box = cfg.box(); if (!box || !ME) return;
      box.textContent = '';
      loadAll();
      var P = ME.p, ready = MEDALS && !MEDALS.failed && MEDALS.medals.length, states = ready ? allStates(P) : {};
      var info = null;
      if (ready) { var sc = scoreOf(P, states); info = { score: sc, rank: rankOf(sc), frame: frameOf(sc) }; }
      drawHead(box, P, info);
      var nE = 0, nAll = 0; if (ready) MEDALS.medals.forEach(function (m) { if (m.s) return; nAll++; if (states[m.id].earned) nE++; });   // seasonal medals are extra to the 100
      meSwitch(box, nE, nAll);
      if (MEVIEW === 'medals') { drawMedals(box, P, states); return; }
      if (!P) {
        add(box, h('p', 'mnone', 'No profile yet. Chat during one of Droogle’s streams to start earning nuts, then check back after the stream. Profiles update about every 20 minutes while he’s live.'));
        return;
      }
      if (info) drawRankCard(box, P, info, states);
      drawStats(box, P);
      drawAttendance(box, P);
      if (ready) drawRecent(box, P, states);
      drawBirds(box, P); drawItems(box, P); drawQB(box, P);
      if (cfg.share && info) {
        var sb = h('button', 'more2 sharebtn', 'Save my profile card as an image'); sb.type = 'button';
        sb.addEventListener('click', function () { cfg.share(snapshot(P, info, states), sb); });
        box.appendChild(sb);
      }
      var when = ME.t && !isNaN(Date.parse(ME.t)) ? new Date(Date.parse(ME.t)).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
      box.appendChild(h('p', CLS.foot || 'foot', (when ? 'Updated ' + when + '. ' : '') + 'Profiles update about every 20 minutes while Droogle is live. For your exact nuts right now, type !nuts in chat.'));
    }
    function snapshot(P, info, states) {     // what the share card needs
      var per = { b: 0, s: 0, g: 0, p: 0 }, n = 0, tot = 0; MEDALS.medals.forEach(function (m) { if (m.s) return; tot++; if (states[m.id].earned) { per[m.t]++; n++; } });
      return { who: ME.who, rank: info.rank, score: info.score, frame: info.frame, spot: P.msr, of: ME.nm, per: per, earned: n, total: tot,
        show: rarest(P, states, 3).map(function (m) { var r = rarity(m); return { n: m.n, t: m.t, r: r ? r.label : '', pc: r ? r.pc : null }; }),
        nuts: P.p, hours: P.h, streams: P.a ? P.a.n : 0, streak: P.a ? P.a.b : 0, chatRank: P.r, img: IMG };
    }
    return { valid: validProfile, draw: function (me) { ME = me; redraw(); }, redraw: redraw, TIER: TIER };
  };
})();
