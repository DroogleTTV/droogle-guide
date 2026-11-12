/* Queen's Blood: Top 10 collectors + collection viewer for the Droogle guide site (2026-11-12).
   Cards and odds: qb/cards.json (from SAMMI's QB Numbers.ini and QB Random TXT.txt: each redemption picks one line of the pool).
   Collections: the Quest Engine pushes qb_top.json to the repo's quest-data branch when QBdeck.ini changes (5 min bundling);
   qb/top.json is the copy made when the site was built. Whichever is newer is shown. */
(function () {
  'use strict';
  var root = document.getElementById('qbtop'); if (!root) return;
  var LIVE = 'https://raw.githubusercontent.com/DroogleTTV/droogle-guide/quest-data/qb_top.json';
  var CARDS = null, BYKEY = {}, DATA = null, POOL = 3030;
  var TIERS = [['urare', 'Ultra rare', 6], ['vrare', 'Very rare', 11], ['rare', 'Rare', 19], ['uncommon', 'Uncommon', 31], ['common', 'Common', 1e9]];   /* by odds, not the in-game Standard/Legendary label */
  function tier(w) { for (var i = 0; i < TIERS.length; i++) if (w <= TIERS[i][2]) return TIERS[i]; return TIERS[TIERS.length - 1]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(w) { var p = w / POOL * 100; return (p >= 1 ? p.toFixed(2) : p >= 0.1 ? p.toFixed(2) : p.toFixed(3)).replace(/0+$/, '').replace(/\.$/, '') + '%'; }
  function oneIn(w) { return '1 in ' + Math.round(POOL / w).toLocaleString('en-US'); }
  function img(id, big) { return 'qb/' + (big ? 'l' : 's') + '/' + encodeURIComponent(id) + '.webp'; }
  function rankParts(r) { var m = /^LVL\s+(\d+)\s+(.*)$/i.exec(r || ''); return m ? ['Lv. ' + m[1], m[2]] : ['', r || 'Blood Peasant']; }
  function when(t) { var d = new Date(t); if (isNaN(d)) return ''; return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function get(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); }
  function owned(u) { var out = []; for (var k in u.c) if (BYKEY[k] && u.c[k] > 0) out.push({ card: BYKEY[k], n: u.c[k] }); return out; }

  root.className = 'qbw';
  root.innerHTML = '<details class="qbx" id="qbtopx"><summary><span class="qbcrest"><b>10</b></span><span class="qbst"><span class="k">Queen&rsquo;s Blood Leaderboard</span>' +
    '<h3>Top Ten Collectors</h3><p>Open the board, then pick a name to look through that player&rsquo;s whole collection.</p></span>' +
    '<span class="qbchev" aria-hidden="true"><svg viewBox="0 0 14 14"><path d="M2 5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></span></summary>' +
    '<div class="qbboard"><div class="qbempty">Shuffling the deck&hellip;</div></div></details>';
  var board = root.querySelector('.qbboard');

  Promise.all([get('qb/cards.json'), get('qb/top.json').catch(function () { return null; })]).then(function (r) {
    CARDS = r[0].cards; POOL = r[0].pool || POOL; CARDS.forEach(function (c) { BYKEY[c.k] = c; });
    DATA = r[1]; render();
    var m = Math.floor(Date.now() / 60000);
    get(LIVE + '?t=' + m).then(function (live) { if (live && live.top && live.top.length && (!DATA || new Date(live.t) > new Date(DATA.t))) { DATA = live; render(); } }).catch(function () {});
    openFromHash();
  }).catch(function () { board.innerHTML = '<div class="qbempty">The leaderboard couldn&rsquo;t load right now. Try <span class="cmd">!topqb</span> in chat.</div>'; });

  function render() {
    if (!DATA || !DATA.top || !DATA.top.length) { board.innerHTML = '<div class="qbempty">No collectors yet.</div>'; return; }
    var total = CARDS.length, h = '<div class="qbmeta"><span>' + DATA.top.length + ' of ' + (DATA.players || DATA.top.length) + ' collectors</span><span>Updated ' + esc(when(DATA.t)) + '</span></div>';
    DATA.top.forEach(function (u, i) {
      var own = owned(u), uniq = own.length, copies = own.reduce(function (a, o) { return a + o.n; }, 0), rp = rankParts(u.r);
      var best = own.slice().sort(function (a, b) { return a.card.w - b.card.w || b.n - a.n; }).slice(0, 3);
      var fan = best.map(function (o, j) { return '<img src="' + img(o.card.id) + '" alt="' + esc(o.card.name) + '" loading="lazy" style="--r:' + ((j - (best.length - 1) / 2) * 7) + 'deg">'; }).join('');
      h += '<div class="qblane' + (i < 3 ? ' p' + (i + 1) : '') + '" style="animation-delay:' + (i * 55) + 'ms">' +
        '<span class="qbcoin t">' + (i + 1) + '</span>' +
        '<div class="qbwho"><button class="qbname" type="button" data-i="' + i + '" title="Open ' + esc(u.n) + '&rsquo;s collection">' + esc(u.n) + '</button>' +
        '<span class="qbrank">' + (rp[0] ? '<i>' + esc(rp[0]) + '</i>' : '') + esc(rp[1]) + '</span>' +
        '<div class="qbbar"><i style="width:' + (uniq / total * 100).toFixed(1) + '%"></i></div>' +
        '<div class="qbcount"><b>' + uniq + '</b> of ' + total + ' cards &middot; ' + copies + ' copies</div></div>' +
        '<div class="qbfan" aria-hidden="true">' + fan + '</div>' +
        '<span class="qbcoin c">' + Number(u.s).toLocaleString('en-US') + '<small>PTS</small></span></div>';
    });
    board.innerHTML = h;
  }
  board.addEventListener('click', function (e) { var b = e.target.closest('.qbname'); if (b) openDeck(+b.getAttribute('data-i'), b); });

  /* ---------- collection viewer ---------- */
  var M = null, Z = null, cur = null, view = { show: 'owned', sort: 'num' }, opener = null;
  function shell() {
    if (M) return;
    M = document.createElement('div'); M.className = 'qbw qbm'; M.setAttribute('role', 'dialog'); M.setAttribute('aria-modal', 'true');
    M.innerHTML = '<div class="qbpanel"><button class="qbx2" type="button" aria-label="Close">&#10005;</button><div class="qbbody"></div></div>';
    document.body.appendChild(M);
    Z = document.createElement('div'); Z.className = 'qbw qbz'; Z.setAttribute('role', 'dialog'); Z.setAttribute('aria-modal', 'true');
    document.body.appendChild(Z);
    M.addEventListener('click', function (e) {
      if (e.target === M || e.target.closest('.qbx2')) return closeDeck();
      var p = e.target.closest('.qbpill'); if (p) { view[p.getAttribute('data-g')] = p.getAttribute('data-v'); paint(); return; }
      var c = e.target.closest('.qbc'); if (c) zoom(c.getAttribute('data-k'));
    });
    Z.addEventListener('click', function (e) { if (e.target === Z || e.target.closest('.qbx2')) closeZoom(); });
    document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (Z.classList.contains('on')) closeZoom(); else if (M.classList.contains('on')) closeDeck(); });
  }
  function openDeck(i, from) {
    var u = DATA && DATA.top[i]; if (!u) return; shell(); cur = u; opener = from || null; view = { show: 'owned', sort: 'num' };
    paint(); M.classList.add('on'); M.scrollTop = 0; document.documentElement.style.overflow = 'hidden';
    try { history.replaceState(null, '', '#qb-' + encodeURIComponent(u.n)); } catch (e) {}
    M.querySelector('.qbx2').focus();
  }
  function closeDeck() {
    M.classList.remove('on'); document.documentElement.style.overflow = '';
    try { history.replaceState(null, '', '#qbtop'); } catch (e) {}
    if (opener) opener.focus();
  }
  function paint() {
    var u = cur, own = {}, list = [], rp = rankParts(u.r), uniq = 0, copies = 0;
    CARDS.forEach(function (c) { var n = u.c[c.k] || 0; if (n > 0) { own[c.k] = n; uniq++; copies += n; } });
    CARDS.forEach(function (c) { if (view.show === 'all' || own[c.k]) list.push(c); });
    var num = function (c) { var m = /^(\d+)([AB]?)$/.exec(c.id); return m ? +m[1] + (m[2] ? m[2].charCodeAt(0) / 1000 : 0) : 999; };
    if (view.sort === 'rare') list.sort(function (a, b) { return a.w - b.w || num(a) - num(b); });
    else if (view.sort === 'copies') list.sort(function (a, b) { return (own[b.k] || 0) - (own[a.k] || 0) || a.w - b.w || num(a) - num(b); });
    else list.sort(function (a, b) { return num(a) - num(b); });
    var tc = {}; CARDS.forEach(function (c) { if (own[c.k]) { var t = tier(c.w)[0]; tc[t] = (tc[t] || 0) + 1; } });
    var pill = function (g, v, t) { return '<button type="button" class="qbpill' + (view[g] === v ? ' on' : '') + '" data-g="' + g + '" data-v="' + v + '">' + t + '</button>'; };
    var h = '<div class="qbhead"><div class="who"><div class="k">Queen&rsquo;s Blood Collection</div><h2>' + esc(u.n) + '</h2><div class="rk">' + esc((rp[0] ? rp[0] + ' ' : '') + rp[1]) + '</div></div>' +
      '<div class="qbstats"><div class="qbstat"><b>' + uniq + '/' + CARDS.length + '</b><span>Cards</span></div><div class="qbstat"><b>' + copies + '</b><span>Copies</span></div>' +
      '<div class="qbstat"><b>' + Number(u.s).toLocaleString('en-US') + '</b><span>Points</span></div><div class="qbstat"><b>' + (tc.urare || 0) + '</b><span>Ultra rare</span></div></div></div>' +
      '<div class="qbtools"><span class="lbl">Show</span>' + pill('show', 'owned', 'Owned') + pill('show', 'all', 'All 152') + '<span class="qbsep"></span><span class="lbl">Sort</span>' +
      pill('sort', 'num', 'Card #') + pill('sort', 'rare', 'Rarest first') + pill('sort', 'copies', 'Most copies') + '</div><div class="qbgrid">';
    if (!list.length) h += '<div class="qbnone">No cards yet.</div>';
    list.forEach(function (c) {
      var n = own[c.k] || 0, t = tier(c.w);
      h += '<button type="button" class="qbc r-' + t[0] + (n ? '' : ' miss') + '" data-k="' + esc(c.k) + '" aria-label="' + esc('#' + c.id + ' ' + c.name + ', ' + t[1] + ', ' + (n ? n + ' owned' : 'not owned')) + '">' +
        (n > 1 ? '<span class="qbq">&times;' + n + '</span>' : '') +
        '<span class="im" data-n="#' + esc(c.id) + '"><img src="' + (n ? img(c.id) : 'qb/s/Card_Back.webp') + '" alt="" loading="lazy"></span>' +
        '<span class="nm">' + esc(c.name) + '</span><span class="qbtier"><i></i>' + t[1] + ' <em>' + pct(c.w) + '</em></span></button>';
    });
    M.querySelector('.qbbody').innerHTML = h + '</div>';
  }
  function zoom(k) {
    var c = BYKEY[k]; if (!c) return; var n = (cur && cur.c[k]) || 0, t = tier(c.w); Z.dataset.k = k;
    Z.innerHTML = '<div class="qbzin r-' + t[0] + '"><button class="qbx2" type="button" aria-label="Close">&#10005;</button><img src="' + img(c.id, true) + '" alt="' + esc(c.name) + '">' +
      '<div class="qbzt"><span class="pl"><span>Card #' + esc(c.id) + '</span><span class="qbtier"><i></i>' + t[1] + '</span></span><h3>' + esc(c.name) + '</h3><dl>' +
      '<dt>Chance per redemption</dt><dd>' + pct(c.w) + ' &nbsp;(' + oneIn(c.w) + ')</dd>' +
      '<dt>In ' + esc(cur ? cur.n : '') + '&rsquo;s collection</dt><dd>' + (n ? '&times;' + n : 'Not yet') + '</dd></dl>' +
      '<p class="hint">Every Queen&rsquo;s Blood redemption draws one card from the same pool, so these odds are the same for everyone.</p></div></div>';
    Z.classList.add('on'); Z.querySelector('.qbx2').focus();
  }
  function closeZoom() { Z.classList.remove('on'); var b = M && M.querySelector('.qbc[data-k="' + (window.CSS && CSS.escape ? CSS.escape(Z.dataset.k || '') : '') + '"]'); if (b) b.focus(); }
  function openFromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === 'qbtop') { document.getElementById('qbtopx').open = true; return; }
    if (h.indexOf('qb-') === 0 && DATA) { var name = h.slice(3).toLowerCase(); for (var i = 0; i < DATA.top.length; i++) if (DATA.top[i].n.toLowerCase() === name) { document.getElementById('qbtopx').open = true; openDeck(i); return; } }
  }
})();
