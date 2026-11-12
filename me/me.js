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
  var CLIENT_ID = 's9gtu4kx8bs7rjp5lv10g8hj7gy6ea';   // Droogle Channel Guide app (Twitch developer console, 2026-11-12)            // the Twitch app's Client ID (public by design); the sign-in stays hidden while this is empty
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

  function hex16(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.toLowerCase())).then(function (b) {
      return [].map.call(new Uint8Array(b).slice(0, 8), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  // the profile and Moogle Medals are drawn by profile.js, the same file the Twitch panel uses
  if (!window.DroogleProfile) return;
  var PROF = window.DroogleProfile({ site: SITE, img: SITE + 'me/img/', cls: { foot: 'mfoot', card: 'qcard', chips: 'mchips' },
    box: function () { return BOX(); }, scroll: function () { return SCR(); }, share: shareCard });
  function drawMe() { if (BOX() && ME) PROF.draw(ME); }

  /* ---------- "Save as image": a 1200x630 card to post anywhere ---------- */
  function loadImg(src, cors) {
    return new Promise(function (ok) { var im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; });
  }
  var FRAME_COL = { b: ['#7a4420', '#f3c49c', '#e0a274'], s: ['#7d8aa3', '#ffffff', '#c8d2e2'], g: ['#a8740e', '#fff0b8', '#f9c74f'], p: ['#9be7ff', '#f5d0ff', '#b7a3ff'] };
  var TIERN = { b: 'bronze', s: 'silver', g: 'gold', p: 'platinum' };
  function shareCard(d, btn) {
    btn.disabled = true; var old = btn.textContent; btn.textContent = 'Making your card…';
    var fonts = document.fonts && document.fonts.load ? Promise.all(['24px Anton', '24px Pixel', '600 24px Outfit', '400 24px Outfit'].map(function (f) { return document.fonts.load(f).catch(function () {}); })) : Promise.resolve();
    var imgs = [d.who.img ? loadImg(d.who.img, true) : Promise.resolve(null), Promise.resolve(null)]
      .concat(['b', 's', 'g', 'p'].map(function (t) { return loadImg(d.img + 'medal_' + TIERN[t] + '.png', false); }));
    Promise.all([fonts].concat(imgs)).then(function (r) {
      var av = r[1], med = { b: r[3], s: r[4], g: r[5], p: r[6] };
      var W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
      var bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1b2d53'); bg.addColorStop(.55, '#0f1a31'); bg.addColorStop(1, '#0b1322');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      var glow = x.createRadialGradient(250, 250, 10, 250, 250, 420); glow.addColorStop(0, 'rgba(37,214,200,.16)'); glow.addColorStop(1, 'rgba(37,214,200,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(249,199,79,.35)'; x.lineWidth = 2; rr(x, 18, 18, W - 36, H - 36, 26); x.stroke();
      // avatar + frame
      var ax = 190, ay = 215, ar = 112;
      if (d.frame) { var fc = FRAME_COL[d.frame], g = x.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar); g.addColorStop(0, fc[0]); g.addColorStop(.45, fc[1]); g.addColorStop(1, fc[2]);
        x.beginPath(); x.arc(ax, ay, ar + 12, 0, Math.PI * 2); x.fillStyle = g; x.shadowColor = fc[2]; x.shadowBlur = 30; x.fill(); x.shadowBlur = 0; }
      else { x.beginPath(); x.arc(ax, ay, ar + 6, 0, Math.PI * 2); x.fillStyle = '#25d6c8'; x.fill(); }
      x.save(); x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI * 2); x.clip();
      if (av) x.drawImage(av, ax - ar, ay - ar, ar * 2, ar * 2); else { x.fillStyle = '#1a2a4a'; x.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); x.fillStyle = '#25d6c8'; x.font = '110px Anton'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(d.who.name.charAt(0).toUpperCase(), ax, ay + 6); }
      x.restore(); x.textAlign = 'left'; x.textBaseline = 'alphabetic';
      // name, rank
      x.fillStyle = '#fff'; x.font = fit(x, d.who.name, 'Anton', 84, 640) ; x.fillText(d.who.name, 360, 168);
      x.fillStyle = '#9aa8c4'; x.font = '600 26px Outfit'; x.fillText('Adventurer Rank ' + d.rank.lv, 362, 214);
      x.fillStyle = '#f9c74f'; x.font = fit(x, d.rank.name, 'Anton', 56, 520); x.fillText(d.rank.name, 360, 270);
      x.textAlign = 'right'; x.fillStyle = '#f9c74f'; x.font = '78px Pixel'; x.fillText(String(d.score), 1150, 172);
      x.fillStyle = '#9aa8c4'; x.font = '600 24px Outfit'; x.fillText('medal points' + (d.spot ? ' · #' + d.spot + (d.of ? ' of ' + d.of : '') : ''), 1150, 206); x.textAlign = 'left';
      // tier counts
      var tx = 362;
      ['b', 's', 'g', 'p'].forEach(function (t) {
        if (med[t]) x.drawImage(med[t], tx, 300, 52, 52);
        x.fillStyle = '#fff'; x.font = '44px Pixel'; x.fillText(String(d.per[t]), tx + 60, 342); tx += 60 + x.measureText(String(d.per[t])).width + 34;
      });
      x.fillStyle = '#9aa8c4'; x.font = '600 24px Outfit'; x.fillText(d.earned + ' of ' + d.total + ' Moogle Medals', tx + 6, 336);
      // showcase
      x.fillStyle = '#fff'; x.font = '30px Anton'; x.fillText('Showcase', 60, 420);
      d.show.forEach(function (m, i) {
        var bx = 60 + i * 370, by = 440, bw = 350, bh = 120;
        x.fillStyle = 'rgba(6,12,24,.6)'; rr(x, bx, by, bw, bh, 16); x.fill();
        x.strokeStyle = { b: 'rgba(205,127,72,.6)', s: 'rgba(200,210,226,.55)', g: 'rgba(249,199,79,.7)', p: 'rgba(190,170,255,.75)' }[m.t]; x.lineWidth = 2; rr(x, bx, by, bw, bh, 16); x.stroke();
        if (med[m.t]) x.drawImage(med[m.t], bx + 14, by + 18, 84, 84);
        x.fillStyle = '#fff'; x.font = fit(x, m.n, '600', 28, 230, 'Outfit'); x.fillText(m.n, bx + 110, by + 56);
        x.fillStyle = m.r === 'Legendary' ? '#ff8fe0' : m.r === 'Rare' ? '#f9c74f' : '#9aa8c4'; var rt = m.r ? m.r + (m.pc != null ? ' · ' + (m.pc < 1 ? '<1' : Math.round(m.pc)) + '% have it' : '') : { b: 'Bronze', s: 'Silver', g: 'Gold', p: 'Platinum' }[m.t];
        x.font = fit(x, rt, '600', 22, 225, 'Outfit'); x.fillText(rt, bx + 110, by + 90);
      });
      if (!d.show.length) { x.fillStyle = '#6f7f9f'; x.font = '600 26px Outfit'; x.fillText('Earn Moogle Medals on stream to fill your showcase!', 60, 500); }
      // footer
      x.fillStyle = '#9aa8c4'; x.font = '600 22px Outfit';
      var bits = []; if (d.streams) bits.push(d.streams + ' streams'); if (d.streak) bits.push('best streak ' + d.streak); if (d.hours != null) bits.push(d.hours.toLocaleString('en-US') + ' hours watched');
      x.fillText(bits.join('  ·  '), 60, 600);
      x.textAlign = 'right'; x.fillStyle = '#25d6c8'; x.font = '600 24px Outfit'; x.fillText('twitch.tv/droogle', 1150, 600);
      try {
        c.toBlob(function (b) {
          if (!b) throw new Error('blob');
          var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'droogle-profile-' + d.who.login + '.png';
          document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
          btn.textContent = 'Saved! Look in your downloads'; setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 3000);
        }, 'image/png');
      } catch (e) { btn.textContent = 'Your browser couldn’t save the image'; setTimeout(function () { btn.textContent = old; btn.disabled = false; }, 3000); }
    });
  }
  function rr(x, a, b, w, hh, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + hh, r); x.arcTo(a + w, b + hh, a, b + hh, r); x.arcTo(a, b + hh, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function fit(x, text, fam, size, max, fam2) {      // shrink a font until the text fits
    var f = fam2 ? function (s) { return fam + ' ' + s + 'px ' + fam2; } : function (s) { return s + 'px ' + fam; };
    for (; size > 14; size -= 2) { x.font = f(size); if (x.measureText(text).width <= max) break; }
    return f(size);
  }

  /* ---------- sign-in ---------- */
  var ME = null, TOKEN = null, MODAL = null;
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
      msg('Your Droogle profile', 'See your Moogle Medals, Adventurer Rank, attendance, nuts, hours watched, chocobos, items and Queen’s Blood cards.', {
        label: 'Log in with Twitch', on: login,
        note: 'Twitch only tells the guide your name and avatar. You only ever see your own profile, and you can log out any time.' });
      return;
    }
    if (ME && ME.who.login === w.login) { drawMe(); return; }
    msg('Your profile', 'Loading your profile…');
    hex16(w.login).then(function (k) {
      return getJSON(PROFILE_BASE + k.charAt(0) + '.json?t=' + Math.floor(Date.now() / 6e4)).then(function (shard) {
        var raw = shard && shard.u && typeof shard.u === 'object' ? shard.u[k] : null;
        ME = { who: w, p: PROF.valid(raw), np: num(shard && shard.np), nh: num(shard && shard.nh), nq: num(shard && shard.nq), nm: num(shard && shard.nm), t: str(shard && shard.t, 40) };
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
