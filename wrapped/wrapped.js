/* Droogle Wrapped 2026 (Andrew 2026-11-27). The "Unwrap your 2026" ad opens the signed-in viewer's own year on the stream: five
   gifts, one per slide, tapped through like a story. Only the viewer's own Wrapped can be opened: the page asks Twitch who is
   signed in and reads only that viewer's entry (data/wrapped/<first hex>.json, filed under the first 16 hex of SHA-256 of the
   lowercase login, the same keys as the profile cards). The Quest Engine on the stream PC rebuilds the files through Dec 31.
   The ad and the #wrapped link switch on Dec 2, 2026 at midnight Eastern. Before that only the private preview link opens it. */
(function () {
  'use strict';
  var SITE = 'https://drooglettv.github.io/droogle-guide/';
  var DATA = 'data/wrapped/';
  var CID = 's9gtu4kx8bs7rjp5lv10g8hj7gy6ea';                   // the Droogle Channel Guide Twitch app (me/me.js)
  var OPEN = Date.UTC(2026, 11, 2, 5, 0, 0);                    // Dec 2, 2026 00:00 Eastern
  var CLOSE = Date.UTC(2027, 1, 1, 5, 0, 0);                    // the ad comes down Feb 1, 2027 (the #wrapped link keeps working)
  var PREVIEW = '7aca93c5d94811b38f5d55ca3e6684f21ba90b1c70ba5c491b4e5fe35d2447a2';   // SHA-256 of the private preview link's hash
  var YEAR = 2026;
  var NOTE = 'It’s been officially 13 years since I first started streaming. No matter how many of those 13 years you’ve been a part of, I thank you for being here in this community and on this journey. I never forget how fortunate I am to have even a single person taking time out of their day to spend it with me. Happy Holidays and thanks again!';
  var ART = 'wrapped/art/';   /* game box art from Twitch, 144 x 192, named by gameSlug */
  function gameSlug(t) { return String(t).toLowerCase().replace(/['\u2019]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  var BOW = 'wrapped/bow.png', LOGO = 'wrapped/logo.png', LOGO_BIG = 'img/logo.png';   /* logo.png: 855 x 360, sharp at 80 px tall on 3x screens */

  var ROLES = {
    white: ['The White Mage', 'Healing EXP'], black: ['The Black Mage', 'Attack EXP'], red: ['The Red Mage', 'Healing + attack EXP'],
    summoner: ['The Summoner', 'Summons + boosts'], dragoon: ['The Dragoon', 'Hunts joined'], thief: ['The Thief', 'Steals'],
    scholar: ['The Scholar', 'Quiz wins'], bard: ['The Bard', 'Chat messages'], chocobo: ['The Chocobo Knight', 'Races + duels won'],
    gambler: ['The Gambler', 'Pom Poms spent'], ninja: ['The Ninja', 'Hours watched'], blue: ['The Blue Mage', 'Medal categories'],
    berserker: ['The Berserker', 'Chaos caused']
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function n(x) { x = +x; return isFinite(x) ? x : 0; }
  function fmt(x) { return Math.round(n(x)).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pl(x, one, many) { return fmt(x) + ' ' + (n(x) === 1 ? one : many); }
  function day(d, year) { return new Date(n(d) * 864e5).toLocaleDateString('en-US', year ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function isOpen() { var t = Date.now(); return t >= OPEN; }
  function adTime() { var t = Date.now(); return (t >= OPEN && t < CLOSE) || sget('dgWrapPrev') === '1'; }

  /* ---------- seeded pixel snow (the same flakes as the design) ---------- */
  function snow(count, seed, w, h, big, lo, span) {
    var s = seed, out = '';
    function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < count; i++) {
      var z = r() < 0.25 ? big : big / 2, x = Math.round(r() * w), y = Math.round(r() * h), o = (lo + r() * span).toFixed(2);
      out += '<i class="wr-fl" style="left:' + x + 'px;top:' + y + 'px;width:' + z + 'px;height:' + z + 'px;opacity:' + o + '"></i>';
    }
    return out;
  }
  function flakes(count, seed, w, h, big, lo, span) {
    var s = seed, out = [];
    function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < count; i++) { var z = r() < 0.25 ? big : big / 2; out.push([Math.round(r() * w), Math.round(r() * h), z, lo + r() * span]); }
    return out;
  }

  /* ---------- the ad ---------- */
  var GIFT_SVG = '<svg class="wr-gift" aria-hidden="true" width="62" height="52" viewBox="0 0 62 52" style="left:16px;top:25px"><rect x="4" y="14" width="54" height="36" rx="4" fill="#e0265f"/><rect x="0" y="8" width="62" height="11" rx="3" fill="#ff4fa6"/><rect x="27" y="8" width="8" height="42" fill="#ffcf5a"/></svg>';
  function adInner(band) {
    var g = band ? GIFT_SVG.replace('left:16px;top:25px', 'left:12px;top:15px') : GIFT_SVG;
    return snow(16, 13, band ? 420 : 300, band ? 64 : 86, 4, 0.3, 0.5) + g +
      '<img class="wr-gift" src="' + BOW + '" alt="" aria-hidden="true" style="left:' + (band ? 17 : 21) + 'px;top:' + (band ? 2 : 12) + 'px;width:52px;height:49px">' +
      '<span class="wr-adt"><span class="k">DROOGLE WRAPPED</span><span class="h">Unwrap your ' + YEAR + '</span></span>' +
      (band ? '<svg class="chev" aria-hidden="true" viewBox="0 0 22 22"><path d="M8.5 5 L14.5 11 L8.5 17" fill="none" stroke="#ffcf5a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '');
  }
  function placeAds() {
    document.querySelectorAll('.wr-ad,.wr-band').forEach(function (e) { e.remove(); });
    if (!adTime()) return;
    var a = document.createElement('button'); a.type = 'button'; a.className = 'wr-ad'; a.setAttribute('aria-label', 'Unwrap your ' + YEAR + ': open your Droogle Wrapped');
    a.innerHTML = adInner(false); a.addEventListener('click', function () { go(a); });
    document.body.appendChild(a);
    var hero = $('header.hero');
    if (hero) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'wr-band'; b.setAttribute('aria-label', 'Unwrap your ' + YEAR + ': open your Droogle Wrapped');
      b.innerHTML = adInner(true); b.addEventListener('click', function () { go(b); });
      hero.insertBefore(b, hero.firstChild);
    }
  }
  function go(from) { opener = from; if (location.hash === '#wrapped' || /^#unwrap-/.test(location.hash)) openWrapped(); else location.hash = isOpen() ? 'wrapped' : (sget('dgWrapHash') || 'wrapped'); }

  /* ---------- who is signed in (Twitch) ---------- */
  function who() {
    var tok = load('dgTwTok');
    if (!tok) return Promise.resolve(null);
    return fetch('https://id.twitch.tv/oauth2/validate', { headers: { 'Authorization': 'OAuth ' + tok } }).then(function (r) {
      if (r.status === 401) { try { localStorage.removeItem('dgTwTok'); localStorage.removeItem('dgTwWho'); } catch (e) {} return null; }
      if (!r.ok) throw new Error('validate ' + r.status);
      return r.json();
    }).then(function (v) { return v && typeof v.login === 'string' && /^[a-z0-9_]{1,25}$/.test(v.login) ? v.login : null; });
  }
  function login() {
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    var st = [].map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    sset('dgTwState', st); sset('dgTwBack', location.href);
    location.href = 'https://id.twitch.tv/oauth2/authorize?client_id=' + encodeURIComponent(CID) + '&redirect_uri=' + encodeURIComponent(SITE + 'auth/') + '&response_type=token&scope=&state=' + st;
  }

  /* ---------- the slides ---------- */
  var BG = 'background:linear-gradient(180deg,#050a1a 0%,#0a1634 60%,#12204a 100%)', BG55 = 'background:linear-gradient(180deg,#050a1a 0%,#0a1634 55%,#12204a 100%)';
  function glow(css, color, op, blur) { return '<div aria-hidden="true" style="position:absolute;' + css + ';border-radius:50%;background:' + color + ';opacity:' + op + ';filter:blur(' + blur + 'px)"></div>'; }
  var NPAGES = 5;
  function bars(i) {
    var h = '<div aria-hidden="true" style="position:absolute;left:16px;right:16px;top:14px;display:grid;grid-template-columns:repeat(' + NPAGES + ',minmax(0,1fr));gap:6px">';
    for (var k = 0; k < NPAGES; k++) h += '<div style="height:4px;border-radius:2px;background:' + (k <= i ? '#f2f6ff' : 'rgba(242,246,255,0.25)') + '"></div>';
    return h + '</div>';
  }
  function head(k, t) {
    return '<div style="position:absolute;left:28px;right:28px;top:64px;display:flex;flex-direction:column;gap:6px"><div style="font:22px \'Jersey 15\',monospace;letter-spacing:.12em;color:#ffcf5a">' + k +
      '</div><h2 style="margin:0;font:400 40px/1 Anton,Impact,sans-serif;text-transform:uppercase">' + t + '</h2></div>';
  }
  function btn(cls, act, label, bottom, top) { return '<button type="button" class="wr-go ' + cls + '" data-act="' + act + '" style="' + (top != null ? 'top:' + top + 'px' : 'bottom:' + bottom + 'px') + '">' + label + '</button>'; }
  function box(label, value, color, sub, size) {
    return '<div style="padding:16px;border-radius:14px;background:rgba(18,32,74,0.85);border:1px solid #2a3b6b;min-width:0"><div style="font-size:13px;color:#b9c5e3">' + label +
      '</div><div style="font:' + (size || 40) + 'px/1.08 \'Jersey 15\',monospace;color:' + color + ';overflow-wrap:anywhere">' + value + '</div>' + (sub ? '<div style="font-size:13px;color:#dfe6f7">' + sub + '</div>' : '') + '</div>';
  }
  /* Gift 3's tiles (Andrew 2026-11-27): the engine sends up to 12, best first: [id, value, extra numbers...] */
  var MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var TILE = {   /* id: [label, color, value(t, d) -> [shown, text?], sub(t, d)] */
    reward: ['Favorite redemption', '#ff4fa6', function (t, d) { return [esc(d.rw || ''), 1]; }, function (t) { return pl(t[1], 'time', 'times') + ' this fall'; }],
    medals: ['Moogle Medals', '#6ff0b0', null, function (t) { return n(t[2]) ? '#' + fmt(t[2]) + ' collector' : ''; }],
    rank: ['Adventurer Rank', '#ffcf5a', function (t, d) { return [esc(d.rk || 'Onion Knight'), 1]; }, function (t) { return 'Lv. ' + fmt(t[1]); }],
    kupo: ['Kupo Nuts caught', '#ff4fa6', null, function (t) { var p = []; if (n(t[2])) p.push(fmt(t[2]) + ' gold'); if (n(t[3])) p.push(fmt(t[3]) + ' platinum'); return p.join(', '); }],
    qb: ['Queen’s Blood cards', '#c9a8ff', null, function (t) { return n(t[2]) ? 'LVL ' + fmt(t[2]) : ''; }],
    hours: ['Hours watched', '#ffcf5a', null, function () { return 'all-time'; }],
    ffgames: ['Final Fantasy games', '#2fe0d2', null, function () { return 'watched on stream'; }],
    nuts: ['Nuts banked', '#ffcf5a', null, function () { return 'best balance, all seasons'; }],
    chat: ['Chat messages', '#2fe0d2', null, function (t) { return n(t[2]) ? pl(t[2], 'top-chatter finish', 'top-chatter finishes') : ''; }],
    heal: ['Healing EXP', '#6ff0b0', null, function (t) { return 'Healer Lv. ' + fmt(t[2] || 1); }],
    atk: ['Attack EXP', '#ff4fa6', null, function (t) { return 'Attacker Lv. ' + fmt(t[2] || 1); }],
    credits: ['Stayed for the credits', '#c9a8ff', null, function (t) { return n(t[1]) === 1 ? 'stream' : 'streams'; }],
    prelude: ['There from the start', '#2fe0d2', null, function () { return 'in the first 10 minutes'; }],
    quests: ['Quests helped clear', '#6ff0b0', null, function () { return 'weekly quests'; }],
    rewards: ['Channel point rewards', '#ff4fa6', null, function () { return 'different ones redeemed'; }],
    pp: ['Pom Poms spent', '#ffcf5a', null, function () { return 'on channel points'; }],
    sfx: ['SFX played', '#2fe0d2', null, function () { return 'different sounds'; }],
    choco: ['Chocobos', '#ffcf5a', null, function (t) { return n(t[2]) ? pl(t[2], 'race or duel won', 'races and duels won') : 'in your stable'; }],
    hunts: ['Monster hunts joined', '#ff4fa6', null, function (t) { return n(t[2]) ? pl(t[2], 'final strike', 'final strikes') : ''; }],
    quiz: ['Quiz wins', '#c9a8ff', null, function () { return 'across 3 quiz games'; }],
    tonb: ['Tonberry hits', '#6ff0b0', null, function (t) { return n(t[2]) ? 'in on ' + pl(t[2], 'takedown', 'takedowns') : ''; }],
    raids: ['Raids ridden', '#2fe0d2', null, function () { return 'out with Droo'; }],
    hype: ['Hype Trains', '#ff4fa6', null, function () { return 'you helped fuel'; }],
    subs: ['Months subscribed', '#c9a8ff', null, function () { return 'in total'; }],
    bits: ['Bits cheered', '#ffcf5a', null, function () { return 'in total'; }],
    steals: ['Successful steals', '#6ff0b0', null, function () { return 'with !steal'; }],
    summons: ['Summons + boosts', '#c9a8ff', null, function () { return 'called'; }],
    chaos: ['Chaos caused', '#ff4fa6', null, function (t) { return n(t[1]) === 1 ? 'moment' : 'moments'; }],
    timer: ['Timer maxed out', '#ffcf5a', null, function (t) { return 'with you watching'; }],
    goals: ['Daily goals met', '#6ff0b0', null, function () { return 'while you were here'; }],
    pizza: ['It’s Pizza Time!', '#ffcf5a', null, function () { return 'all 4 goals in a night'; }],
    doom: ['Doom defied', '#c9a8ff', null, function () { return 'stayed past the timer'; }],
    hype5: ['Hype Train lv. 5', '#ff4fa6', null, function () { return 'cleared with you watching'; }],
    lurk: ['Long, quiet watches', '#2fe0d2', null, function () { return 'an hour+ without a word'; }],
    raidin: ['Raids you came in with', '#ff4fa6', null, function () { return 'party crasher'; }],
    items: ['Item Shop finds', '#6ff0b0', null, function () { return 'different items owned'; }],
    freenuts: ['“Free” Nuts claimed', '#ffcf5a', null, function (t) { return n(t[1]) === 1 ? 'stream' : 'streams'; }],
    triad: ['Triple Triad score', '#c9a8ff', null, function () { return 'card score'; }],
    snap: ['Thanos snaps survived', '#6ff0b0', null, function () { return 'perfectly balanced'; }],
    omni: ['Omnislash hits', '#2fe0d2', null, function () { return 'damage added'; }],
    bomb: ['!bomb blasts', '#ff4fa6', null, function (t) { var p = []; if (n(t[2])) p.push(fmt(t[2]) + ' in your hands'); if (n(t[3])) p.push(fmt(t[3]) + ' last pass'); return p.join(', '); }],
    ffb: ['FF Battles called', '#ffcf5a', null, function () { return 'correct predictions'; }],
    insomnia: ['Late nights', '#c9a8ff', null, function () { return 'chatting after 1 AM'; }],
    coldopen: ['Cold opens', '#2fe0d2', null, function () { return 'here before the show'; }],
    brb: ['BRB chats', '#6ff0b0', null, function () { return 'chatting through a break'; }],
    mail: ['Mailbox letters', '#ff4fa6', null, function () { return 'to the Moogle Mailbox'; }],
    credtop: ['Top of the credits', '#ffcf5a', null, function () { return '#1 healer or attacker'; }],
    wake: ['Droogle wake-ups', '#c9a8ff', null, function () { return 'with !wake'; }],
    hugs: ['!hugs given', '#ff4fa6', null, function () { return 'nuts shared'; }],
    clips: ['Clips made', '#2fe0d2', null, function () { return 'of the stream'; }],
    gifts: ['Subs gifted', '#ffcf5a', null, function () { return 'to the community'; }],
    marathon: ['Start-to-finish marathons', '#6ff0b0', null, function () { return '4+ hour streams'; }],
    games: ['Games watched', '#ff4fa6', null, function () { return 'this year'; }],
    follow: ['Following since', '#2fe0d2', function (t) { return [String(new Date(n(t[1]) * 864e5).getUTCFullYear()), 0]; }, function (t) { return day(t[1]); }],
    night: ['Your stream night', '#c9a8ff', function (t) { return [DAYS[n(t[1]) % 7], 1]; }, function (t) { return pl(t[2], 'stream', 'streams'); }],
    month: ['Busiest month', '#6ff0b0', function (t) { return [MONTHS[n(t[1])] || '', 1]; }, function (t) { return pl(t[2], 'stream', 'streams'); }],
    last: ['Last stream you caught', '#ffcf5a', function (t) { return [day(t[1]), 1]; }, function () { return 'see you at the next one'; }],
    one: ['The stream you caught', '#ff4fa6', function (t) { return [day(t[1]), 1]; }, function (t, d) { return d.g && d.g[0] ? esc(d.g[0][0]) : ''; }]
  };
  function tile(t, d, span) {
    var c = TILE[t[0]]; if (!c) return '';
    var v = c[2] ? c[2](t, d) : [fmt(t[1]), 0], txt = v[1], sub = c[3] ? c[3](t, d) : '';
    var size = txt ? (v[0].length > 16 ? 20 : v[0].length > 10 ? 24 : 28) : (v[0].length > 8 ? 28 : 34);
    return '<div style="padding:12px 14px;border-radius:14px;background:rgba(18,32,74,0.85);border:1px solid #2a3b6b;min-width:0' + (span ? ';grid-column:span 2' : '') + '">' +
      '<div style="font-size:12.5px;color:#b9c5e3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + c[0] + '</div>' +
      '<div style="font:' + size + 'px/1.08 ' + (txt ? 'Anton,Impact,sans-serif;text-transform:uppercase;margin:3px 0 2px' : '\'Jersey 15\',monospace') + ';color:' + c[1] + ';overflow-wrap:anywhere">' + v[0] + '</div>' +
      (sub ? '<div style="font-size:12px;color:#dfe6f7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sub + '</div>' : '') + '</div>';
  }
  function grid(list, d) {
    var h = '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">';
    list.forEach(function (t, i) { h += tile(t, d, i === list.length - 1 && list.length % 2 === 1); });
    return h + '</div>';
  }
  function roleLine(r, s, d) {
    s = s || {};
    switch (r) {
      case 'white': return 'Healer Lv. ' + fmt(s.heal_lv || 1) + ' with <b style="color:#fff">' + fmt(s.heal_exp) + '</b> healing EXP. Droo stayed standing because of you.';
      case 'black': return 'Attacker Lv. ' + fmt(s.atk_lv || 1) + ' with <b style="color:#fff">' + fmt(s.atk_exp) + '</b> attack EXP. Droo felt every spell.';
      case 'red': return 'Healer Lv. ' + fmt(s.heal_lv || 1) + ' and Attacker Lv. ' + fmt(s.atk_lv || 1) + '. You healed Droo and hit him just as hard.';
      case 'summoner': return '<b style="color:#fff">' + pl(n(s.summon_calls) + n(s.boost), 'summon and boost', 'summons and boosts') + '</b> called. When you called, something big showed up.';
      case 'dragoon': return '<b style="color:#fff">' + pl(s.hunt_join, 'monster hunt', 'monster hunts') + '</b> joined' + (n(s.hunt_final) ? ' and <b style="color:#fff">' + pl(s.hunt_final, 'final strike', 'final strikes') + '</b>' : '') + '. You jumped in every time.';
      case 'thief': return '<b style="color:#fff">' + pl(s.steals, 'successful steal', 'successful steals') + '</b>. Nobody’s pockets were safe.';
      case 'scholar': return '<b style="color:#fff">' + pl(n(s.trivia) + n(s.ntt_wins) + n(s.wtfm_wins), 'win', 'wins') + '</b> across trivia, Name That Track and Who’s That FF Monster. You always knew.';
      case 'bard': return '<b style="color:#fff">' + pl(s.chat_msgs, 'chat message', 'chat messages') + '</b>' + (n(s.chat_top) ? ' and <b style="color:#fff">' + pl(s.chat_top, 'top-chatter finish', 'top-chatter finishes') + '</b>' : '') + '. Chat was louder with you in it.';
      case 'chocobo': return '<b style="color:#fff">' + pl(n(s.choco_wins) + n(s.duel_wins), 'race or duel', 'races and duels') + '</b> won' + (n(s.choco_n) ? ' with a stable of ' + fmt(s.choco_n) : '') + '. Kweh!';
      case 'gambler': return '<b style="color:#fff">' + fmt(s.pp_spent) + '</b> Pom Poms spent. You never met a bet you didn’t like.';
      case 'blue': return 'Moogle Medals from <b style="color:#fff">' + pl(s.cats_n, 'category', 'different categories') + '</b>. You picked up a bit of everything.';
      case 'berserker': return '<b style="color:#fff">' + pl(s.chaos, 'moment', 'moments') + '</b> of pure chaos. You chose violence, kupo.';
    }
    var q = n(s.lurk_1h) + n(s.lurk_2h) + n(s.lurk_full);
    return q ? '<b style="color:#fff">' + pl(q, 'long, quiet watch', 'long, quiet watches') + '</b> without a word. We knew you were there.' : 'You watched from the shadows. We knew you were there.';
  }
  function roleStat(r, s, d) {
    s = s || {};
    switch (r) {
      case 'white': return s.heal_exp; case 'black': return s.atk_exp; case 'red': return n(s.heal_exp) + n(s.atk_exp);
      case 'summoner': return n(s.summon_calls) + n(s.boost); case 'dragoon': return s.hunt_join; case 'thief': return s.steals;
      case 'scholar': return n(s.trivia) + n(s.ntt_wins) + n(s.wtfm_wins); case 'bard': return s.chat_msgs; case 'chocobo': return n(s.choco_wins) + n(s.duel_wins);
      case 'gambler': return s.pp_spent; case 'blue': return s.cats_n; case 'berserker': return s.chaos;
    }
    return d.h;
  }
  function roleStatLabel(r, d) { return r === 'ninja' && !n(d.h) ? 'Streams caught' : ROLES[r][1]; }
  function roleStatValue(r, d) { return r === 'ninja' && !n(d.h) ? d.a : roleStat(r, d.s, d); }

  /* the gift tag under "More of your year" (Andrew 2026-11-27 11:45: "Feels empty"): hours as days, and where their stream count ranks */
  function wrapTag(d, t) {
    var h = n(d.h), ap = n(d.ap), days = Math.floor(h / 24), l1 = '', s1 = '';
    if (h >= 24) { l1 = fmt(h) + ' hours with Droo'; s1 = 'That\u2019s ' + pl(days, 'full day', 'full days') + '.'; }
    else if (h > 0) { l1 = pl(h, 'hour', 'hours') + ' with Droo'; s1 = 'Every one of them counted.'; }
    var l2 = ap >= 50 ? 'You caught more streams than ' + ap + '% of the party.' : 'One of ' + fmt(t.nv) + ' viewers who made ' + YEAR + '.';
    return '<div style="position:relative;margin:0 6px;padding:18px 20px 18px 44px;border-radius:14px;background:#f2f6ff;color:#0a1634;transform:rotate(-1.5deg);box-shadow:0 14px 32px rgba(0,0,0,0.45)">' +
      '<div aria-hidden="true" style="position:absolute;left:16px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;background:#0a1634"></div>' +
      '<div style="font:20px \'Jersey 15\',monospace;letter-spacing:.06em;color:#c2185b">YOUR YEAR, WRAPPED UP</div>' +
      (l1 ? '<div style="font:400 26px/1.05 Anton,Impact,sans-serif;text-transform:uppercase;margin-top:6px">' + l1 + '</div><div style="font-size:15px;color:#44507a;margin-top:2px">' + s1 + '</div>' : '') +
      '<div style="font-size:15px;font-weight:600;line-height:1.4;margin-top:' + (l1 ? 10 : 6) + 'px">' + l2 + '</div></div>';
  }
  function slides(d, t) {
    var name = esc(d.n), a = n(d.a), ns = n(t.ns), g = d.g || [], r = ROLES[d.r] ? d.r : 'ninja', out = [];
    NPAGES = (d.x || []).filter(function (t) { return t && TILE[t[0]]; }).length >= 9 ? 6 : 5;
    /* 1. Unwrap */
    out.push('<div class="wr-slide" style="' + BG55 + '">' + glow('left:-80px;top:-60px;width:360px;height:240px', '#2fe0d2', 0.22, 60) + glow('right:-90px;top:10px;width:340px;height:220px', '#ff4fa6', 0.22, 60) +
      snow(52, 7, 384, 800, 4, 0.35, 0.6) +
      '<svg aria-hidden="true" width="390" height="70" viewBox="0 0 390 70" style="position:absolute;left:0;top:38px"><path d="M-10 8 Q 97 52 195 14 Q 293 -18 400 30" fill="none" stroke="#33415f" stroke-width="2"/>' +
      '<circle cx="30" cy="24" r="6" fill="#ff4fa6"/><circle cx="72" cy="34" r="6" fill="#ffcf5a"/><circle cx="114" cy="34" r="6" fill="#2fe0d2"/><circle cx="156" cy="24" r="6" fill="#ff4fa6"/><circle cx="198" cy="13" r="6" fill="#ffcf5a"/><circle cx="240" cy="7" r="6" fill="#2fe0d2"/><circle cx="282" cy="8" r="6" fill="#ff4fa6"/><circle cx="324" cy="14" r="6" fill="#ffcf5a"/><circle cx="366" cy="23" r="6" fill="#2fe0d2"/></svg>' +
      bars(0) +
      '<div style="position:absolute;left:0;right:0;top:108px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 28px;text-align:center">' +
      '<img src="' + LOGO + '" alt="Droogle" style="height:80px;width:auto"><div style="font:26px \'Jersey 15\',monospace;letter-spacing:.12em;color:#ffcf5a">WRAPPED</div>' +
      '<div style="font:128px/0.85 \'Jersey 15\',monospace;background:linear-gradient(90deg,#2fe0d2,#ff4fa6);-webkit-background-clip:text;background-clip:text;color:transparent">' + YEAR + '</div>' +
      '<h2 style="margin:14px 0 0;font:400 34px/1.05 Anton,Impact,sans-serif;letter-spacing:.01em;text-transform:uppercase;overflow-wrap:anywhere">' + name + ', your year on the stream is all wrapped up</h2>' +
      '<p style="margin:4px 0 0;font-size:16px;line-height:1.45;color:#b9c5e3">Five gifts inside: the streams you caught, your game of the year, your party role, and what we did together.</p></div>' +
      '<svg role="img" aria-label="A wrapped gift" width="150" height="132" viewBox="0 0 150 132" style="position:absolute;left:120px;top:572px"><rect x="12" y="48" width="126" height="80" rx="6" fill="#e0265f"/><rect x="4" y="34" width="142" height="22" rx="5" fill="#ff4fa6"/><rect x="66" y="34" width="18" height="94" fill="#ffcf5a"/></svg>' +
      '<img src="' + BOW + '" alt="" aria-hidden="true" style="position:absolute;left:140px;top:568px;width:110px;height:104px">' +
      btn('gold', 'next', 'Unwrap it', null, 716) +
      '<svg aria-hidden="true" width="390" height="70" viewBox="0 0 390 70" style="position:absolute;left:0;bottom:0"><path d="M0 70 L0 40 L18 40 L32 10 L46 40 L60 40 L76 18 L92 40 L300 40 L318 6 L336 40 L352 40 L368 22 L384 40 L390 40 L390 70 Z" fill="#0b1f2c"/></svg>' +
      '<div style="position:absolute;left:0;right:0;bottom:18px;text-align:center;font-size:13px;color:#b9c5e3">Happy holidays, kupo!</div></div>');
    /* 2. You showed up */
    /* attendance wording by share of the year's streams (Andrew 2026-11-27: 107 of 112 deserves more than "over half") */
    var pc = ns > 0 ? a / ns : 0, miss = Math.max(0, ns - a), pcs = Math.floor(pc * 100) + '%', badge, sub;
    if (ns > 0 && a >= ns) { badge = 'Perfect attendance'; sub = 'out of ' + fmt(ns) + '. You never missed one.'; }
    else if (pc >= 0.95) { badge = 'Nearly perfect'; sub = 'out of ' + fmt(ns) + '. You only missed ' + fmt(miss) + '.'; }
    else if (pc >= 0.9) { badge = 'Almost every stream'; sub = 'out of ' + fmt(ns) + '. You only missed ' + fmt(miss) + '.'; }
    else if (pc >= 0.75) { badge = 'Front-row regular'; sub = 'out of ' + fmt(ns) + '. That\u2019s ' + pcs + ' of them.'; }
    else if (pc >= 0.5) { badge = 'Over half the streams'; sub = 'out of ' + fmt(ns) + '. That\u2019s ' + pcs + ' of them.'; }
    else if (pc >= 0.25) { badge = 'A real regular'; sub = 'out of ' + fmt(ns) + ' streams this year.'; }
    else if (a >= 5) { badge = 'Part of the party'; sub = 'out of ' + fmt(ns) + ' streams this year.'; }
    else { badge = ''; sub = a === 1 ? 'out of ' + fmt(ns) + '. Thanks for stopping by!' : 'out of ' + fmt(ns) + ' streams this year.'; }
    out.push('<div class="wr-slide" style="' + BG + '">' + glow('right:-120px;top:120px;width:360px;height:300px', '#2fe0d2', 0.16, 70) + snow(52, 21, 384, 800, 4, 0.3, 0.5) + bars(1) +
      head('GIFT 1 OF 5', 'You showed up') +
      '<div style="position:absolute;left:28px;right:28px;top:176px;display:flex;flex-direction:column;align-items:flex-start"><div style="font:190px/0.8 \'Jersey 15\',monospace;color:#2fe0d2">' + fmt(a) + '</div>' +
      '<div style="font-size:22px;font-weight:600;margin-top:10px">' + (a === 1 ? 'stream' : 'streams') + ' this year</div>' +
      '<div style="font-size:16px;color:#b9c5e3;margin-top:2px">' + sub + '</div></div>' +
      (badge ? '<div style="position:absolute;left:28px;top:428px;display:flex;align-items:center;gap:10px;padding:10px 16px 10px 12px;border-radius:12px;background:#ffcf5a;color:#1a1205;transform:rotate(-3deg)"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="none" stroke="#1a1205" stroke-width="2"/><path d="M6.5 11.5l3 3 6-7" fill="none" stroke="#1a1205" stroke-width="2.4"/></svg><span style="font-weight:700;font-size:17px">' + badge + '</span></div>' : '') +
      '<div style="position:absolute;left:28px;right:28px;top:508px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">' +
      box('First stream you caught', day(d.f), '#ff4fa6', '', 38) + box('Longest streak', n(d.b) === 1 ? '1 stream' : fmt(d.b) + ' in a row', '#ff4fa6', '', 38) +
      '<div style="grid-column:span 2;padding:16px;border-radius:14px;background:rgba(18,32,74,0.85);border:1px solid #2a3b6b;display:flex;align-items:baseline;justify-content:space-between;gap:12px"><div style="font-size:13px;color:#b9c5e3">Hours watched, all-time</div><div style="font:38px/1.05 \'Jersey 15\',monospace;color:#ffcf5a">' + (n(d.h) ? fmt(d.h) : 'Under 1') + '</div></div></div>' +
      btn('line', 'next', 'Next gift', 34) + '</div>');
    /* 3. Game of the year */
    var top = g[0] || ['Just hanging out', a], list = '';
    if (g.length >= 2) {
      list = '<div style="font-size:14px;color:#b9c5e3">Your top ' + (g.length === 2 ? 'two' : 'three') + '</div>';
      g.forEach(function (x) {
        /* Twitch box art beside each game (Andrew 2026-11-27 11:38); a game without art yet gets a plain card */
        list += '<div style="display:flex;align-items:center;gap:12px">' +
          '<img src="' + ART + gameSlug(x[0]) + '.jpg" alt="" aria-hidden="true" onerror="this.style.visibility=\'hidden\'" style="flex:none;width:42px;height:56px;border-radius:6px;object-fit:cover;background:#1b2a55;box-shadow:0 4px 10px rgba(0,0,0,0.4)">' +
          '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-weight:600;line-height:1.2"><span>' + esc(x[0]) + '</span><span style="font:22px \'Jersey 15\',monospace;color:#2fe0d2">' + fmt(x[1]) + '</span></div>' +
          '<div style="height:10px;border-radius:5px;background:#1b2a55"><div style="width:' + Math.max(4, Math.round(100 * n(x[1]) / Math.max(1, n(g[0][1])))) + '%;height:10px;border-radius:5px;background:linear-gradient(90deg,#2fe0d2,#ff4fa6)"></div></div></div></div>';
      });
    }
    var gn = n(d.gn), gline = gn > 1 ? 'You were there for ' + fmt(gn) + ' different games this year.' : gn === 1 ? 'Every stream you caught this year was ' + esc(top[0]) + '.' : '';
    out.push('<div class="wr-slide" style="' + BG + '">' + glow('left:-110px;top:260px;width:340px;height:300px', '#ff4fa6', 0.16, 70) + snow(52, 33, 384, 800, 4, 0.3, 0.5) + bars(2) +
      head('GIFT 2 OF 5', 'Your game of the year') +
      '<svg aria-hidden="true" width="2" height="60" viewBox="0 0 2 60" style="position:absolute;left:194px;top:150px"><rect width="2" height="60" fill="#ffcf5a"/></svg>' +
      '<div style="position:absolute;left:40px;right:40px;top:206px;padding:30px 22px 24px;border-radius:18px;background:#f2f6ff;color:#0a1634;text-align:center;transform:rotate(2deg);box-shadow:0 18px 40px rgba(0,0,0,0.45)">' +
      '<div aria-hidden="true" style="position:absolute;left:50%;top:10px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#0a1634"></div>' +
      '<div style="font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#8a2d5c;overflow-wrap:anywhere">To ' + name + ', from Droo</div>' +
      '<div style="font:40px/1.02 Anton,Impact,sans-serif;margin-top:8px;text-transform:uppercase">' + esc(top[0]) + '</div>' +
      '<div style="font:30px \'Jersey 15\',monospace;color:#c2185b;margin-top:6px">' + pl(top[1], 'stream', 'streams') + ' together</div></div>' +
      '<div style="position:absolute;left:28px;right:28px;top:474px;display:flex;flex-direction:column;gap:10px">' + list + (gline ? '<div style="font-size:14px;color:#b9c5e3;margin-top:4px">' + gline + '</div>' : '') + '</div>' +
      btn('line', 'next', 'Next gift', 34) + '</div>');
    /* 4. Your party role, and its tiles (one slide, or two when there are enough) */
    var xs = (d.x || []).filter(function (t) { return t && TILE[t[0]]; }), two = xs.length >= 9;   /* same test as NPAGES */
    if (two && n(d.h) > 0) xs = xs.filter(function (t) { return t[0] !== 'hours'; });   /* the tag on "More of your year" already says the hours */
    var first = xs.slice(0, 6), more = two ? xs.slice(6, 12) : [];
    if (!xs.length) first = [['rank', n(d.lv) || 1]];
    var title = ROLES[r][0].toUpperCase();
    out.push('<div class="wr-slide" style="' + BG + '">' + glow('left:40px;top:140px;width:320px;height:260px', '#2fe0d2', 0.14, 70) + snow(52, 45, 384, 800, 4, 0.3, 0.5) + bars(3) +
      head('GIFT 3 OF 5', 'Your party role') +
      '<div style="position:absolute;left:28px;right:28px;top:164px;bottom:104px;display:flex;flex-direction:column;gap:14px">' +
      '<div style="display:flex;flex-direction:column;gap:4px"><div style="font-size:16px;color:#b9c5e3">This year you played</div>' +
      '<div style="font:' + (title.length > 15 ? 58 : 68) + 'px/0.9 \'Jersey 15\',monospace;color:#2fe0d2">' + title + '</div>' +
      '<div style="font-size:15px;line-height:1.4;color:#dfe6f7;margin-top:6px">' + roleLine(r, d.s, d) + '</div></div>' +
      grid(first, d) + '</div>' +
      btn('line', 'next', more.length ? 'More of your year' : 'Last gift', 34) + '</div>');
    if (more.length) out.push('<div class="wr-slide" style="' + BG + '">' + glow('right:-100px;top:200px;width:340px;height:300px', '#ff4fa6', 0.14, 70) + snow(52, 69, 384, 800, 4, 0.3, 0.5) + bars(4) +
      head('GIFT 3 OF 5', 'More of your year') +
      '<div style="position:absolute;left:28px;right:28px;top:172px;display:flex;flex-direction:column;gap:30px">' + grid(more, d) + wrapTag(d, t) + '</div>' +
      btn('line', 'next', 'Last gift', 34) + '</div>');
    /* 5. Together */
    function stat(v, c, l) { return '<div><div style="font:62px/0.9 \'Jersey 15\',monospace;color:' + c + '">' + fmt(v) + '</div><div style="font-size:15px;color:#dfe6f7">' + l + '</div></div>'; }
    out.push('<div class="wr-slide" style="' + BG55 + '">' + glow('left:-80px;top:-40px;width:360px;height:240px', '#2fe0d2', 0.2, 60) + glow('right:-90px;top:20px;width:340px;height:220px', '#ff4fa6', 0.2, 60) +
      snow(52, 57, 384, 800, 4, 0.3, 0.55) + bars(NPAGES - 1) +
      head('GIFT 4 OF 5', 'What we did together') +
      '<div style="position:absolute;left:28px;right:28px;top:192px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 12px">' +
      stat(t.ns, '#2fe0d2', 'streams') + stat(t.ng, '#ff4fa6', 'games') + stat(t.nv, '#ffcf5a', 'of you stopped by') + stat(t.nm, '#6ff0b0', 'Moogle Medals earned') + '</div>' +
      '<div style="position:absolute;left:28px;right:28px;top:391px;padding:20px;border-radius:16px;background:#f2f6ff;color:#0a1634;transform:rotate(-1.5deg)">' +
      '<div style="font:22px \'Jersey 15\',monospace;color:#c2185b">GIFT 5 OF 5: A NOTE FROM DROO</div>' +
      '<p style="margin:8px 0 0;font-size:15px;line-height:1.5">' + esc(NOTE) + '</p>' +
      (n(d.fd) ? '<p style="margin:10px 0 0;font-size:14px;color:#44507a">You’ve been following since ' + day(d.fd, true) + '.</p>' : '') + '</div>' +
      '<button type="button" class="wr-go gold" data-act="card" style="bottom:88px">Save my Wrapped card</button>' +
      '<button type="button" class="wr-go" data-act="again" style="bottom:34px;height:44px;background:none;border:0;color:#f2f6ff;font-weight:600;font-size:16px">Unwrap it again</button></div>');
    return out;
  }
  function msgSlide(title, text, act, label) {
    return '<div class="wr-slide" style="' + BG55 + ';cursor:default">' + glow('left:-80px;top:-60px;width:360px;height:240px', '#2fe0d2', 0.22, 60) + glow('right:-90px;top:10px;width:340px;height:220px', '#ff4fa6', 0.22, 60) +
      snow(52, 7, 384, 800, 4, 0.35, 0.6) +
      '<div style="position:absolute;left:0;right:0;top:150px;display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 32px;text-align:center">' +
      '<img src="' + LOGO + '" alt="Droogle" style="height:40px;width:auto"><div style="font:26px \'Jersey 15\',monospace;letter-spacing:.12em;color:#ffcf5a">WRAPPED</div>' +
      '<div style="font:110px/0.85 \'Jersey 15\',monospace;background:linear-gradient(90deg,#2fe0d2,#ff4fa6);-webkit-background-clip:text;background-clip:text;color:transparent">' + YEAR + '</div>' +
      '<h2 style="margin:18px 0 0;font:400 30px/1.08 Anton,Impact,sans-serif;text-transform:uppercase">' + title + '</h2>' +
      '<p style="margin:0;font-size:16px;line-height:1.5;color:#b9c5e3">' + text + '</p></div>' +
      '<svg role="img" aria-label="A wrapped gift" width="150" height="132" viewBox="0 0 150 132" style="position:absolute;left:120px;top:560px"><rect x="12" y="48" width="126" height="80" rx="6" fill="#e0265f"/><rect x="4" y="34" width="142" height="22" rx="5" fill="#ff4fa6"/><rect x="66" y="34" width="18" height="94" fill="#ffcf5a"/></svg>' +
      '<img src="' + BOW + '" alt="" aria-hidden="true" style="position:absolute;left:140px;top:556px;width:110px;height:104px">' +
      (act ? btn(act === 'login' ? 'twitch' : 'gold', act, label, null, 716) : '') + '</div>';
  }

  /* ---------- the window ---------- */
  var M = null, STAGE = null, PAGES = [], AT = 0, DATAV = null, opener = null, busy = false;
  var ICON = { prev: 'M13.5 5 L7.5 11 L13.5 17', next: 'M8.5 5 L14.5 11 L8.5 17' };
  var TWITCH = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M4.3 3 3 6.4v13.1h4.5V22h2.5l2.5-2.5h3.7l4.8-4.8V3H4.3zm14.9 10.9-2.8 2.8h-4.5l-2.5 2.5v-2.5H5.6V4.6h13.6v9.3zM16.4 7.6v4.8h-1.7V7.6h1.7zm-4.5 0v4.8h-1.7V7.6h1.7z"/></svg>';
  function arrow(cls, path, label) { return '<button type="button" class="wr-btn ' + cls + '" aria-label="' + label + '"><svg aria-hidden="true" viewBox="0 0 22 22"><path d="' + path + '" fill="none" stroke="#f2f6ff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'; }
  function openWrapped() {
    if (M) return;
    M = document.createElement('div'); M.className = 'wr-modal'; M.setAttribute('role', 'dialog'); M.setAttribute('aria-modal', 'true'); M.setAttribute('aria-label', 'Droogle Wrapped ' + YEAR);
    M.innerHTML = '<div class="wr-stage"></div>' + arrow('wr-prev', ICON.prev, 'Previous gift') + arrow('wr-next', ICON.next, 'Next gift') +
      '<button type="button" class="wr-btn wr-x" aria-label="Close"><svg aria-hidden="true" viewBox="0 0 18 18"><path d="M4 4 L14 14 M14 4 L4 14" stroke="#f2f6ff" stroke-width="2.4" stroke-linecap="round"/></svg></button>';
    document.body.appendChild(M); document.body.classList.add('wr-open');
    STAGE = $('.wr-stage', M);
    $('.wr-prev', M).addEventListener('click', function () { show(AT - 1); });
    $('.wr-next', M).addEventListener('click', function () { show(AT + 1); });
    $('.wr-x', M).addEventListener('click', closeWrapped);
    M.addEventListener('click', function (e) { if (e.target === M) closeWrapped(); });
    STAGE.addEventListener('click', onTap);
    document.addEventListener('keydown', onKey); window.addEventListener('resize', layout);
    PAGES = [msgSlide('Unwrapping…', 'Finding your year on the stream.')]; AT = 0; paint(); layout();
    $('.wr-x', M).focus();
    start();
  }
  function closeWrapped() {
    if (!M) return;
    M.remove(); M = null; STAGE = null; document.body.classList.remove('wr-open');
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', layout);
    if (location.hash === '#wrapped' || /^#unwrap-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (opener && document.body.contains(opener)) opener.focus(); opener = null;
  }
  function onKey(e) {
    if (e.key === 'Escape') closeWrapped();
    else if (e.key === 'ArrowRight') show(AT + 1);
    else if (e.key === 'ArrowLeft') show(AT - 1);
    else if (e.key === 'Tab' && M) {     // keep focus inside the window
      var f = [].filter.call(M.querySelectorAll('button'), function (b) { return !b.disabled && b.offsetParent !== null; });
      if (!f.length) return; var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function onTap(e) {
    var b = e.target.closest('[data-act]');
    if (b) { var a = b.getAttribute('data-act');
      if (a === 'next') show(AT + 1); else if (a === 'again') show(0); else if (a === 'login') login(); else if (a === 'card') saveCard(b); else if (a === 'retry') start();
      return; }
    if (PAGES.length < 2) return;
    var r = STAGE.getBoundingClientRect(); show(e.clientX - r.left < r.width / 3 ? AT - 1 : AT + 1);
  }
  function show(i) { if (!M || i < 0 || i >= PAGES.length || i === AT) return; AT = i; paint(); }
  function paint() {
    STAGE.innerHTML = PAGES[AT]; var s = STAGE.firstChild; if (s) s.classList.add('in');
    $('.wr-prev', M).disabled = AT === 0; $('.wr-next', M).disabled = AT >= PAGES.length - 1;
    var multi = PAGES.length > 1; $('.wr-prev', M).style.visibility = $('.wr-next', M).style.visibility = multi ? '' : 'hidden';
  }
  function layout() {
    if (!M) return;
    var vw = window.innerWidth, vh = window.innerHeight, phone = vw <= 560, s, w, h, x, y;
    M.classList.toggle('phone', phone);
    s = phone ? Math.min(vw / 390, vh / 844) : Math.min(1, (vh - 48) / 844, (vw - 190) / 390);
    w = 390 * s; h = 844 * s; x = Math.round((vw - w) / 2); y = Math.round((vh - h) / 2);
    STAGE.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    var p = $('.wr-prev', M), nx = $('.wr-next', M), c = $('.wr-x', M);
    p.style.left = (x - 72) + 'px'; p.style.top = (y + h / 2 - 24) + 'px';
    nx.style.left = (x + w + 24) + 'px'; nx.style.top = (y + h / 2 - 24) + 'px';
    if (phone) { c.style.left = 'auto'; c.style.right = '10px'; c.style.top = (y + 26) + 'px'; }
    else { c.style.right = 'auto'; c.style.left = (x + w + 16) + 'px'; c.style.top = y + 'px'; }
  }
  function setPages(p, at) { PAGES = p; AT = at || 0; if (M) paint(); }
  function start() {
    if (busy) return; busy = true;
    who().then(function (u) {
      if (!u) { busy = false; setPages([msgSlide('Log in to unwrap', 'Your Wrapped is yours alone. Log in with Twitch and it opens right here.', 'login', TWITCH + 'Log in with Twitch')]); return; }
      return sha(u).then(function (h) {
        var k = h.slice(0, 16);
        return fetch(DATA + k.charAt(0) + '.json?t=' + Math.floor(Date.now() / 6e4), { cache: 'no-store', credentials: 'omit' }).then(function (r) {
          if (r.status === 404) return null; if (!r.ok) throw new Error(r.status); return r.json();
        }).then(function (sh) {
          busy = false;
          var d = sh && sh.u && sh.u[k];
          if (!d || typeof d !== 'object') { setPages([msgSlide('No Wrapped yet', 'Catch a stream this year and your Droogle Wrapped ' + YEAR + ' shows up here.')]); return; }
          DATAV = { d: d, t: sh }; setPages(slides(d, sh));
        });
      });
    }).catch(function () { busy = false; setPages([msgSlide('Couldn’t unwrap', 'Your Wrapped didn’t load just now. Give it a moment and try again.', 'retry', 'Try again')]); });
  }

  /* ---------- the share card (1080 x 1350 PNG) ---------- */
  function img(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function fitFont(x, text, tmpl, size, max) { do { x.font = tmpl.replace('#', size); if (x.measureText(text).width <= max) break; size -= 2; } while (size > 20); return size; }
  function wrapLines(x, text, max) { var w = text.split(' '), lines = [], cur = ''; w.forEach(function (t) { var c = cur ? cur + ' ' + t : t; if (x.measureText(c).width > max && cur) { lines.push(cur); cur = t; } else cur = c; }); if (cur) lines.push(cur); return lines; }
  function saveCard(b) {
    if (!DATAV) return; var d = DATAV.d, t = DATAV.t, r = ROLES[d.r] ? d.r : 'ninja';
    var old = b.textContent; b.disabled = true; b.textContent = 'Making your card…';
    var fonts = document.fonts && document.fonts.load ? Promise.all(['46px "Jersey 15"', '132px Anton', '400 30px Outfit'].map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve();
    Promise.all([fonts, img(LOGO_BIG), img(BOW)]).then(function (res) {
      var logo = res[1], bow = res[2], c = document.createElement('canvas'); c.width = 1080; c.height = 1350; var x = c.getContext('2d');
      x.fillStyle = '#e0265f'; x.fillRect(0, 0, 1080, 1350);
      x.save(); x.translate(540, 675); x.rotate(Math.PI / 4); x.fillStyle = '#ff4fa6';
      for (var i = -1224; i < 1224; i += 68) x.fillRect(i + 34, -1200, 34, 2400);       /* 34 px stripes at 135 degrees */
      x.restore();
      var L = 36, T = 36, W = 1008, H = 1278;
      x.save(); rr(x, L, T, W, H, 28); x.clip();
      var g = x.createLinearGradient(0, T, 0, T + H); g.addColorStop(0, '#050a1a'); g.addColorStop(0.6, '#0a1634'); g.addColorStop(1, '#12204a'); x.fillStyle = g; x.fillRect(L, T, W, H);
      [[L + 200, T + 110, 380, 'rgba(47,224,210,0.2)'], [L + W - 170, T + 180, 380, 'rgba(255,79,166,0.2)']].forEach(function (o) {
        var rg = x.createRadialGradient(o[0], o[1], 0, o[0], o[1], o[2]); rg.addColorStop(0, o[3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(L, T, W, H); });
      flakes(70, 91, 1000, 1270, 8, 0.25, 0.5).forEach(function (f) { x.fillStyle = 'rgba(242,246,255,' + f[3].toFixed(2) + ')'; x.fillRect(L + f[0], T + f[1], f[2], f[2]); });
      if (logo) x.drawImage(logo, L + 72, T + 70, 64 * logo.width / logo.height, 64);
      x.textBaseline = 'alphabetic'; x.fillStyle = '#ffcf5a'; x.font = '46px "Jersey 15"';
      if (x.letterSpacing !== undefined) x.letterSpacing = '4.6px';
      x.fillText('WRAPPED ' + YEAR, L + 72 + (logo ? 64 * logo.width / logo.height : 150) + 40, T + 122);
      if (x.letterSpacing !== undefined) x.letterSpacing = '0px';
      x.fillStyle = '#b9c5e3'; x.font = '400 30px Outfit'; x.fillText('My year on the Droogle stream', L + 72, T + 232);
      x.fillStyle = '#f2f6ff'; var nm = String(d.n || '').toUpperCase(); fitFont(x, nm, '#px Anton', 132, 864); x.fillText(nm, L + 72, T + 362);
      var rl = ROLES[r][0] + ' · ' + (d.rk || 'Onion Knight'); fitFont(x, rl, '#px "Jersey 15"', 54, 864);
      var gw = x.measureText(rl).width, gg = x.createLinearGradient(L + 72, 0, L + 72 + gw, 0); gg.addColorStop(0, '#2fe0d2'); gg.addColorStop(1, '#ff4fa6'); x.fillStyle = gg; x.fillText(rl, L + 72, T + 430);
      var bx = [['Streams caught', fmt(d.a) + ' / ' + fmt(t.ns), '#2fe0d2'], ['Moogle Medals', fmt(d.m), '#6ff0b0'], ['Game of the year', (d.g && d.g[0] ? d.g[0][0] : 'Just hanging out'), '#f2f6ff', 1], [roleStatLabel(r, d), fmt(roleStatValue(r, d)), '#ffcf5a']];
      bx.forEach(function (o, i) {
        var bxX = L + 72 + (i % 2) * (421 + 22), bxY = T + 560 + Math.floor(i / 2) * (196 + 22);
        rr(x, bxX, bxY, 421, 196, 22); x.fillStyle = 'rgba(18,32,74,0.88)'; x.fill(); x.lineWidth = 2; x.strokeStyle = '#2a3b6b'; x.stroke();
        x.fillStyle = '#b9c5e3'; x.font = '400 26px Outfit'; x.fillText(o[0], bxX + 30, bxY + 58);
        x.fillStyle = o[2];
        if (o[3]) { x.font = '44px Anton'; var ls = wrapLines(x, String(o[1]).toUpperCase(), 361).slice(0, 2); ls.forEach(function (l, j) { x.fillText(l, bxX + 30, bxY + 118 + j * 46); }); }
        else { fitFont(x, o[1], '#px "Jersey 15"', 96, 361); x.fillText(o[1], bxX + 30, bxY + 160); }
      });
      x.fillStyle = '#dfe6f7'; x.font = '400 28px Outfit'; x.fillText('twitch.tv/droogle', L + 72, T + H - 64);
      x.fillStyle = '#ffcf5a'; x.font = '40px "Jersey 15"'; x.textAlign = 'right'; x.fillText('Happy holidays, kupo!', L + W - 72, T + H - 64); x.textAlign = 'left';
      x.restore();
      if (bow) x.drawImage(bow, 1080 - 47 - 230, 44, 230, 217);
      c.toBlob(function (blob) {
        if (!blob) throw new Error('blob');
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Droogle Wrapped ' + YEAR + ' - ' + String(d.n || 'me').replace(/[^A-Za-z0-9_ -]/g, '') + '.png';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        b.textContent = 'Saved! Look in your downloads'; setTimeout(function () { b.textContent = old; b.disabled = false; }, 3000);
      }, 'image/png');
    }).catch(function () { b.textContent = 'Your browser couldn’t save the image'; setTimeout(function () { b.textContent = old; b.disabled = false; }, 3000); });
  }

  /* ---------- the links ---------- */
  function route() {
    var h = location.hash.slice(1);
    if (h === 'wrapped') { if (isOpen() || sget('dgWrapPrev') === '1') openWrapped(); return; }
    if (/^unwrap-[A-Za-z0-9]{6,40}$/.test(h)) sha(h).then(function (x) { if (x === PREVIEW) { sset('dgWrapPrev', '1'); sset('dgWrapHash', h); placeAds(); openWrapped(); } });
  }
  function init() { placeAds(); route(); window.addEventListener('hashchange', route); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setInterval(function () { if (!document.querySelector('.wr-ad') && adTime()) placeAds(); }, 6e4);   // the ad appears at midnight for anyone with the page open
})();
