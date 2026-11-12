/* Droogle Channel Guide: "Log in with Twitch" and the viewer's own profile card (2026-11-12).
   The same profile and Moogle Medals as the Twitch panel's Me tab, built from the same data:
     profiles/<x>.json on the guide repo's quest-data branch (filed under SHA-256 of the lowercase login; no names),
     ext/medals.json (medal list) and qb/cards.json (Queen's Blood cards) on this site.
   Sign-in is Twitch's implicit grant flow (no server, no scopes): Twitch sends the viewer back to auth/ with a token,
   which stays in this browser only. The guide checks it with Twitch's /validate when it loads and every hour, as
   Twitch requires, and gets the viewer's name and avatar from Get Users.
   Hidden until CLIENT_ID is filled in (the Droogle Channel Guide app in the Twitch developer console); add ?twdev=1 to
   a page address to see it before then. */
(function () {
  'use strict';
  var CLIENT_ID = '';            // the Twitch app's Client ID (public by design); the sign-in stays hidden while this is empty
  var SITE = 'https://drooglettv.github.io/droogle-guide/';
  var REDIRECT = SITE + 'auth/';
  var PROFILE_BASE = 'https://raw.githubusercontent.com/DroogleTTV/droogle-guide/quest-data/profiles/';
  var TOK = 'dgTwTok', WHO = 'dgTwWho', SVGNS = 'http://www.w3.org/2000/svg';
  var dev = /[?&]twdev=1\b/.test(location.search);
  try { if (dev) sessionStorage.setItem('dgTwDev', '1'); else if (sessionStorage.getItem('dgTwDev') === '1') dev = true; } catch (e) {}
  if (!CLIENT_ID && !dev) return;
  var CID = CLIENT_ID || 'dev-client-id';
  var $ = function (id) { return document.getElementById(id); };

  var TWITCH = 'M4.3 2 3 5.3v13.4h4.6V21h2.6l2.4-2.3h3.7L21 13.9V2zm15.1 11.1-2.9 2.9h-4.6l-2.4 2.4V16H5.6V3.6h13.8zM16.5 6.9h-1.6v4.8h1.6zm-4.4 0h-1.6v4.8h1.6z';
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function svgUse(id, cls) {
    var s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    var u = document.createElementNS(SVGNS, 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s;
  }
  function svgPath(d, cls, vb) {
    var s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', vb || '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'currentColor'); s.appendChild(p); return s;
  }
  function str(x, max) { return typeof x === 'string' ? x.slice(0, max || 400) : (typeof x === 'number' ? String(x) : ''); }
  function num(x) { var n = +x; return isFinite(n) ? n : 0; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmt(n) { return Math.round(num(n)).toLocaleString('en-US'); }
  function norm(t) { return String(t).toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9%]+/g, ' ').trim(); }
  function getJSON(url) {
    return fetch(url, { cache: 'no-store', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  var BIRD_COL = { Yellow: '#ffd23f', Blue: '#5ec8ff', Green: '#7ee05a', Black: '#9aa3c0', Gold: '#ffb52e' };
  var CLASS_CAP = { Weak: 150, Good: 190, Great: 230, Wonderful: 255 };   // the chocobo classes and their feeding speed caps (chocobo guide)
  function slug(n) { return n.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function hex16(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.toLowerCase())).then(function (b) {
      return [].map.call(new Uint8Array(b).slice(0, 8), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }

  function validProfile(r) {
    if (!r || typeof r !== 'object') return null;
    var o = { p: r.p != null ? Math.max(0, num(r.p)) : null, pr: num(r.pr), h: r.h != null ? Math.max(0, num(r.h)) : null, hr: num(r.hr), r: str(r.r, 60),
      g: r.g != null ? Math.max(0, num(r.g)) : null, i: [], c: [], q: null, m: {} };
    if (r.m && typeof r.m === 'object') Object.keys(r.m).slice(0, 200).forEach(function (k) { if (/^[a-z0-9_]{1,30}$/.test(k) && num(r.m[k]) > 0) o.m[k] = num(r.m[k]); });
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
  function spot(n, of) { return n > 0 ? '#' + fmt(n) + (of ? ' of ' + fmt(of) : '') : ''; }
  function section(title, extra) { var s = h('section', 'msec'), hd = h('div', 'mh'); add(hd, h('h3', null, title), extra ? h('span', null, extra) : null); s.appendChild(hd); return s; }
  function drawMe() {
    if (!BOX() || !ME) return; var box = BOX(), P = ME.p, W = ME.who; box.textContent = '';
    // header
    var hd = h('div', 'mhead');
    if (W.img) { var av = h('img', 'av'); av.src = W.img; av.alt = ''; hd.appendChild(av); } else hd.appendChild(h('span', 'av ph', W.name.charAt(0).toUpperCase()));
    var nm = h('div', 'mname'); add(nm, h('b', null, W.name), P && P.r ? h('span', 'rank', P.r) : null);
    hd.appendChild(nm); box.appendChild(hd);
    loadMedals();
    var st = P && P.m ? P.m : {}, nE = 0;
    if (MEDALS && MEDALS.medals) MEDALS.medals.forEach(function (m) { if (medalState(m, st).earned) nE++; });
    meSwitch(box, nE, MEDALS && MEDALS.medals ? MEDALS.medals.length : 0);
    if (MEVIEW === 'medals') { drawMedals(box, st); return; }
    if (!P) {
      add(box, h('p', 'mnone', 'No profile yet. Chat during one of Droogle’s streams to start earning nuts, then check back after the stream. Profiles update about every 20 minutes while he’s live.'));
      return;
    }
    // stats
    var st = h('div', 'mstats');
    [['Nuts', P.p, spot(P.pr, ME.np)], ['Hours watched', P.h, spot(P.hr, ME.nh)], ['Gil', P.g, '']].forEach(function (x) {
      if (x[1] == null) return; var d = h('div', 'mstat'); add(d, h('span', 'k', x[0]), h('b', null, fmt(x[1])), x[2] ? h('span', 's', x[2]) : null); st.appendChild(d);
    });
    box.appendChild(st);
    // chocobos
    var cs = section('Chocobo stable', P.c.length ? P.c.length + ' of 5' : '');
    if (!P.c.length) cs.appendChild(h('p', 'mempty', 'No chocobos yet. Type !chocobo in chat to learn how to catch one.'));
    P.c.forEach(function (b) {
      var row = h('div', 'bird' + (b.primary ? ' prim' : '')); row.style.setProperty('--bc', BIRD_COL[b.color]);
      var im = h('img', 'bsprite'); im.src = SITE + 'me/img/choco_' + b.color.toLowerCase() + '.png'; im.alt = b.color + ' chocobo';
      var bi = h('div', 'bi'), top = h('div', 'bt');
      add(top, h('b', null, b.name && b.name !== 'Unnamed' ? b.name : 'Unnamed'), b.primary ? h('span', 'ptag', 'Primary') : null);
      var sub = [b.color, b.cls, b.sex, b.wins + (b.wins === 1 ? ' win' : ' wins')].filter(Boolean).join(' · ');
      var bar = h('div', 'spd'), fill = h('i'); fill.style.width = (b.speed / 255 * 100).toFixed(1) + '%'; bar.appendChild(fill);
      var sp = h('div', 'spl'); add(sp, h('span', null, 'Speed'), h('b', null, b.speed + ' / 255'));
      add(bi, top, h('div', 'bs', sub), bar, sp);
      add(row, im, bi); cs.appendChild(row);
    });
    box.appendChild(cs);
    // items
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
    // Queen's Blood
    var Q = P.q;
    var qs = section('Queen’s Blood', Q && Q.qr ? spot(Q.qr, ME.nq) : '');
    if (!Q || !Q.c.length) qs.appendChild(h('p', 'mempty', 'No Queen’s Blood cards yet. Redeem Queen’s Blood with Pom Poms to draw your first.'));
    else {
      var copies = Q.c.reduce(function (s, x) { return s + x[1]; }, 0);
      var qh = h('div', 'qbh');
      add(qh, Q.r ? h('span', 'rank', Q.r) : null, Q.s != null ? h('span', 'qpts', fmt(Q.s) + ' pts') : null);
      qs.appendChild(qh);
      var prog = h('div', 'qprog'), pl = h('div', 'spl');
      var total = QBCARDS ? QBCARDS.cards.length : 152;
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
        var show = meShowAll ? list : list.slice(0, 6);
        show.forEach(function (c) {
          var t = h('div', 'qcard ' + tier(c.w));
          if (c.id && /^\d{1,3}[A-Z]?$/.test(String(c.id))) { var im = h('img'); im.src = SITE + 'qb/s/' + c.id + '.webp'; im.alt = c.n; im.loading = 'lazy'; t.appendChild(im); }
          else t.appendChild(h('span', 'cph', c.n));
          if (c.k > 1) t.appendChild(h('b', 'ck', '×' + c.k));
          t.title = c.n + (c.k > 1 ? ' ×' + c.k : '');
          cg.appendChild(t);
        });
        more.hidden = list.length <= 6;
        more.textContent = meShowAll ? 'Show fewer' : 'Show all ' + list.length + ' cards (rarest first)';
      };
      more.addEventListener('click', function () { meShowAll = !meShowAll; drawCards(); });
      drawCards();
      if (!QBCARDS) getJSON(SITE + 'qb/cards.json').then(function (d) { if (d && Array.isArray(d.cards)) { QBCARDS = { cards: d.cards.filter(function (c) { return c && typeof c.name === 'string'; }).map(function (c) { return { id: String(c.id), name: c.name, w: num(c.w) }; }) }; drawMe(); } }).catch(function () {});
    }
    box.appendChild(qs);
    var when = ME.t && !isNaN(Date.parse(ME.t)) ? new Date(Date.parse(ME.t)).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
    box.appendChild(h('p', 'mfoot', (when ? 'Updated ' + when + '. ' : '') + 'Profiles update about every 20 minutes while Droogle is live. For your exact nuts right now, type !nuts in chat.'));
  }
  /* ---------- Moogle Medals (inside the Me tab) ---------- */
  var MEDALS = null, MEVIEW = 'profile', MFILTER = 'all';
  try { if (sessionStorage.getItem('droogleMeView') === 'medals') MEVIEW = 'medals'; } catch (e) {}
  var TIER = { b: ['bronze', 'Bronze'], s: ['silver', 'Silver'], g: ['gold', 'Gold'], p: ['platinum', 'Platinum'] };
  function validMedals(d) {
    if (!d || !Array.isArray(d.medals) || !Array.isArray(d.cats)) return null;
    var cats = d.cats.filter(function (c) { return c && typeof c.id === 'string' && typeof c.n === 'string'; }).map(function (c) { return { id: str(c.id, 20), n: str(c.n, 40) }; });
    var ms = d.medals.filter(function (m) { return m && TIER[m.t] && typeof m.id === 'string' && typeof m.n === 'string' && Array.isArray(m.r) && m.r.length; }).slice(0, 400).map(function (m) {
      return { id: str(m.id, 30), c: str(m.c, 20), t: m.t, n: str(m.n, 60), d: str(m.d, 120),
        r: m.r.filter(function (x) { return Array.isArray(x) && typeof x[0] === 'string' && /^[a-z0-9_]{1,30}$/.test(x[0]) && num(x[1]) > 0; }).map(function (x) { return [x[0], num(x[1])]; }) };
    }).filter(function (m) { return m.r.length; });
    return { cats: cats, medals: ms };
  }
  function medalState(m, st) {     // earned?, progress 0..1, progress text
    var fr = m.r.map(function (x) { return Math.min(1, (st[x[0]] || 0) / x[1]); });
    var earned = fr.every(function (f) { return f >= 1; });
    var p = fr.reduce(function (a, b) { return a + b; }, 0) / fr.length, txt = '';
    if (!earned) {
      if (m.r.length === 1 && m.r[0][1] > 1) txt = fmt(Math.min(st[m.r[0][0]] || 0, m.r[0][1])) + ' / ' + fmt(m.r[0][1]);
      else if (m.r.length > 1) txt = fr.filter(function (f) { return f >= 1; }).length + ' of ' + m.r.length + ' done';
    }
    return { earned: earned, p: p, txt: txt };
  }
  function medalImg(t, cls) { var im = h('img', cls); im.src = SITE + 'me/img/medal_' + TIER[t][0] + '.png'; im.alt = TIER[t][1] + ' medal'; return im; }
  function meSwitch(box, nEarned, nAll) {
    var sw = h('div', 'mswitch'); sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Show');
    [['profile', 'Profile'], ['medals', 'Medals']].forEach(function (x) {
      var b = h('button', MEVIEW === x[0] ? 'on' : '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', MEVIEW === x[0] ? 'true' : 'false');
      if (x[0] === 'medals' && nAll) b.appendChild(h('span', 'cnt', nEarned + '/' + nAll));
      b.addEventListener('click', function () {
        if (MEVIEW === x[0]) return; MEVIEW = x[0];
        try { sessionStorage.setItem('droogleMeView', MEVIEW); } catch (e) {}
        drawMe(); SCR().scrollTop = 0;
      });
      sw.appendChild(b);
    });
    box.appendChild(sw);
  }
  function loadMedals() {
    if (MEDALS || loadMedals.busy) return; loadMedals.busy = true;
    getJSON(SITE + 'ext/medals.json').then(function (d) { MEDALS = validMedals(d); if (ME) drawMe(); })
      .catch(function () { MEDALS = { cats: [], medals: [], failed: true }; if (ME) drawMe(); })
      .then(function () { loadMedals.busy = false; });
  }
  function drawMedals(box, st) {
    if (!MEDALS) { box.appendChild(h('p', 'mnone', 'Loading the Moogle Medals…')); return; }
    if (MEDALS.failed || !MEDALS.medals.length) { box.appendChild(h('p', 'mnone', 'The Moogle Medals couldn’t be loaded. Close and reopen the panel to try again.')); return; }
    var all = MEDALS.medals, states = {}, per = { b: [0, 0], s: [0, 0], g: [0, 0], p: [0, 0] };
    all.forEach(function (m) { var s = medalState(m, st); states[m.id] = s; per[m.t][1]++; if (s.earned) per[m.t][0]++; });
    var tiers = h('div', 'mtiers');
    ['b', 's', 'g', 'p'].forEach(function (t) {
      var d = h('div', 'mtier'); add(d, medalImg(t, 'tm'), h('b', null, String(per[t][0])), h('span', null, 'of ' + per[t][1]));
      d.setAttribute('aria-label', TIER[t][1] + ': ' + per[t][0] + ' of ' + per[t][1] + ' earned'); tiers.appendChild(d);
    });
    box.appendChild(tiers);
    var ch = h('div', 'mchips mfilter'); ch.setAttribute('role', 'group'); ch.setAttribute('aria-label', 'Show medals');
    [['all', 'All'], ['earned', 'Earned'], ['next', 'Closest'], ['locked', 'Locked']].forEach(function (x) {
      var b = h('button', MFILTER === x[0] ? 'on' : '', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', MFILTER === x[0] ? 'true' : 'false');
      b.addEventListener('click', function () { MFILTER = x[0]; drawMe(); }); ch.appendChild(b);
    });
    box.appendChild(ch);
    var order = { b: 0, s: 1, g: 2, p: 3 }, shown = 0;
    var row = function (m) {
      var s = states[m.id], r = h('div', 'medal ' + (s.earned ? 'got ' : 'locked ') + TIER[m.t][0]);
      r.appendChild(medalImg(m.t, 'mimg'));
      var b = h('div', 'mb'), top = h('div', 'mn'); add(top, h('b', null, m.n), h('span', 'mt', TIER[m.t][1]));
      add(b, top, h('div', 'md', m.d));
      if (!s.earned && s.txt) { var bar = h('div', 'mbar'), f = h('i'); f.style.width = (s.p * 100).toFixed(1) + '%'; bar.appendChild(f); add(b, bar, h('div', 'mpt', s.txt)); }
      r.appendChild(b);
      r.setAttribute('aria-label', m.n + ', ' + TIER[m.t][1] + (s.earned ? ', earned' : ', not earned yet') + '. ' + m.d + (s.txt ? '. Progress ' + s.txt : ''));
      return r;
    };
    if (MFILTER === 'next') {
      var nx = all.filter(function (m) { return !states[m.id].earned && states[m.id].p > 0; }).sort(function (a, b) { return states[b.id].p - states[a.id].p; }).slice(0, 12);
      var sec = section('Closest to earning');
      nx.forEach(function (m) { sec.appendChild(row(m)); }); shown = nx.length;
      if (!nx.length) sec.appendChild(h('p', 'mempty', 'Nothing in progress yet. Chat, play the mini-games and join in on stream to start earning!'));
      box.appendChild(sec);
    } else {
      MEDALS.cats.forEach(function (c) {
        var list = all.filter(function (m) { return m.c === c.id; });
        var got = list.filter(function (m) { return states[m.id].earned; }).length;
        list = list.filter(function (m) { return MFILTER === 'all' || (MFILTER === 'earned') === states[m.id].earned; })
          .sort(function (a, b) { return order[a.t] - order[b.t]; });
        if (!list.length) return;
        var sec = section(c.n, got + ' of ' + all.filter(function (m) { return m.c === c.id; }).length);
        list.forEach(function (m) { sec.appendChild(row(m)); }); shown += list.length;
        box.appendChild(sec);
      });
      if (!shown) box.appendChild(h('p', 'mnone', MFILTER === 'earned' ? 'No medals yet. Every medal is free to earn; check the Locked list for ideas!' : 'You’ve earned every medal. Incredible!'));
    }
    box.appendChild(h('p', 'mfoot', 'Moogle Medals are free to earn and never go away once you have them. Progress updates about every 20 minutes while Droogle is live.'));
  }



  function tier(w) { return w <= 6 ? 'ur' : w <= 11 ? 'vr' : w <= 19 ? 'r' : w <= 31 ? 'u' : 'c'; }

  /* ---------- sign-in ---------- */
  var ME = null, QBCARDS = null, meShowAll = false, TOKEN = null, MODAL = null;
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function rnd() { var a = new Uint8Array(16); crypto.getRandomValues(a); return [].map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function login() {
    var st = rnd();
    try { sessionStorage.setItem('dgTwState', st); sessionStorage.setItem('dgTwBack', location.href.split('#')[0] + (location.hash === '#me' ? '' : location.hash) + '#me'); } catch (e) {}
    location.href = 'https://id.twitch.tv/oauth2/authorize?client_id=' + encodeURIComponent(CID) + '&redirect_uri=' + encodeURIComponent(REDIRECT) +
      '&response_type=token&scope=&state=' + st;
  }
  function logout() {
    var t = TOKEN; TOKEN = null; ME = null; store(TOK, null); store(WHO, null);
    if (t) fetch('https://id.twitch.tv/oauth2/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'client_id=' + encodeURIComponent(CID) + '&token=' + encodeURIComponent(t) }).catch(function () {});
    chips(); if (MODAL) renderCard();
  }
  function validate() {       // Twitch requires a check when the site loads and every hour after
    if (!TOKEN) return Promise.resolve(null);
    return fetch('https://id.twitch.tv/oauth2/validate', { headers: { 'Authorization': 'OAuth ' + TOKEN } }).then(function (r) {
      if (r.status === 401) { TOKEN = null; store(TOK, null); store(WHO, null); ME = null; chips(); if (MODAL) renderCard(); return null; }
      if (!r.ok) throw new Error('validate ' + r.status);
      return r.json();
    }).then(function (v) {
      if (!v || typeof v.login !== 'string' || !/^[a-z0-9_]{1,25}$/.test(v.login)) return null;
      var who = null; try { who = JSON.parse(load(WHO) || 'null'); } catch (e) {}
      if (who && who.login === v.login && Date.now() - (who.at || 0) < 864e5) return who;
      return fetch('https://api.twitch.tv/helix/users', { headers: { 'Client-Id': CID, 'Authorization': 'Bearer ' + TOKEN } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          var u = d && d.data && d.data[0];
          var w = { login: v.login, name: u && typeof u.display_name === 'string' ? str(u.display_name, 40) : v.login,
            img: u && /^https:\/\/static-cdn\.jtvnw\.net\//.test(u.profile_image_url || '') ? u.profile_image_url : '', at: Date.now() };
          store(WHO, JSON.stringify(w)); return w;
        });
    });
  }
  function whoNow() { try { return TOKEN ? JSON.parse(load(WHO) || 'null') : null; } catch (e) { return null; } }

  /* ---------- the chip in the sidebar and the top bar ---------- */
  function chipFor(where) {
    var w = whoNow(), b = h('button', 'twchip twchip-' + where + (w ? ' in' : ''));
    b.type = 'button';
    if (w) {
      if (w.img) { var im = h('img'); im.src = w.img; im.alt = ''; b.appendChild(im); } else b.appendChild(h('span', 'ph', w.name.charAt(0).toUpperCase()));
      if (where === 'side') { var t = h('span', 'tx'); add(t, h('b', null, w.name), h('small', null, 'My profile & medals')); b.appendChild(t); }
      b.setAttribute('aria-label', 'Open your profile, ' + w.name);
    } else {
      b.appendChild(svgPath(TWITCH, 'twico'));
      if (where === 'side') b.appendChild(h('span', 'tx', 'Log in with Twitch')); else b.appendChild(h('span', 'tx', 'Log in'));
      b.setAttribute('aria-label', 'Log in with Twitch to see your profile');
    }
    b.addEventListener('click', function () { if (whoNow()) openCard(); else login(); });
    return b;
  }
  function chips() {
    var side = document.querySelector('.side .slogo'), top = document.querySelector('.topnav');
    document.querySelectorAll('.twchip').forEach(function (e) { e.remove(); });
    if (side) side.insertAdjacentElement('afterend', chipFor('side'));
    if (top) top.appendChild(chipFor('top'));
  }

  /* ---------- the profile card ---------- */
  function BOX() { return $('twm-body'); }
  function SCR() { return $('twm-scroll'); }
  function openCard() {
    if (MODAL) return;
    MODAL = h('div', 'twm'); MODAL.setAttribute('role', 'dialog'); MODAL.setAttribute('aria-modal', 'true'); MODAL.setAttribute('aria-label', 'Your Droogle profile');
    var card = h('div', 'twm-card'), bar = h('div', 'twm-bar'), x = h('button', 'twm-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close');
    x.appendChild(svgPath('M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z'));
    var out = h('button', 'twm-out', 'Log out'); out.type = 'button'; out.id = 'twm-out';
    add(bar, h('span', 'twm-t', 'Droogle profile'), out, x);
    var sc = h('div', 'twm-scroll'); sc.id = 'twm-scroll'; var bd = h('div'); bd.id = 'twm-body'; sc.appendChild(bd);
    add(card, bar, sc); MODAL.appendChild(card); document.body.appendChild(MODAL); document.body.classList.add('twm-open');
    x.addEventListener('click', closeCard); out.addEventListener('click', logout);
    MODAL.addEventListener('click', function (e) { if (e.target === MODAL) closeCard(); });
    document.addEventListener('keydown', esc);
    if (location.hash !== '#me') history.replaceState(null, '', location.pathname + location.search + '#me');
    renderCard(); x.focus();
  }
  function esc(e) { if (e.key === 'Escape') closeCard(); }
  function closeCard() {
    if (!MODAL) return; MODAL.remove(); MODAL = null; document.body.classList.remove('twm-open'); document.removeEventListener('keydown', esc);
    if (location.hash === '#me') history.replaceState(null, '', location.pathname + location.search);
  }
  function msg(title, text, btn) {
    var box = BOX(); box.textContent = ''; var g = h('div', 'gate'), im = h('img', 'gbird'); im.src = SITE + 'me/img/choco_yellow.png'; im.alt = '';
    add(g, im, h('h2', null, title), h('p', null, text));
    if (btn) { var b = h('button', 'cta'); b.type = 'button'; add(b, svgPath(TWITCH, 'twico'), document.createTextNode(btn.label)); b.addEventListener('click', btn.on); g.appendChild(b);
      if (btn.note) g.appendChild(h('p', 'fine', btn.note)); }
    box.appendChild(g);
  }
  function renderCard() {
    if (!MODAL) return;
    $('twm-out').hidden = !TOKEN;
    var w = whoNow();
    if (!w) {
      msg('Your Droogle profile', 'See your nuts, Chatbot rank, hours watched, items, chocobos, Queen’s Blood cards and Moogle Medals.', {
        label: 'Log in with Twitch', on: login,
        note: 'Twitch only tells the guide your name and avatar. You only ever see your own profile, and you can log out any time.' });
      return;
    }
    if (ME && ME.who.login === w.login) { drawMe(); return; }
    msg('Your profile', 'Loading your profile…');
    hex16(w.login).then(function (k) {
      return getJSON(PROFILE_BASE + k.charAt(0) + '.json?t=' + Math.floor(Date.now() / 6e4)).then(function (shard) {
        var raw = shard && shard.u && typeof shard.u === 'object' ? shard.u[k] : null;
        ME = { who: w, p: validProfile(raw), np: num(shard && shard.np), nh: num(shard && shard.nh), nq: num(shard && shard.nq), t: str(shard && shard.t, 40) };
        if (MODAL) drawMe();
      });
    }).catch(function () { msg('Your profile', 'Your profile couldn’t be loaded right now. Close this and try again in a moment.'); });
  }

  /* ---------- start ---------- */
  TOKEN = load(TOK);
  chips();
  var go = function () { if (location.hash === '#me') openCard(); };
  validate().then(function () { chips(); go(); }, function () { go(); });
  window.addEventListener('hashchange', function () { if (location.hash === '#me') openCard(); });
  setInterval(function () { validate().then(function () { chips(); }, function () {}); }, 36e5);
})();
