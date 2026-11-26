(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var EMAIL = 'ashwin.a.anand@gmail.com';

  /* Run start() while el is on screen and stop() when it leaves. */
  function whileVisible(el, start, stop, opts) {
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) start(); else if (stop) stop(); });
    }, opts || { threshold: 0.25 }).observe(el);
  }

  /* ================= Theme (circular View Transition) ================= */
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setTheme(next) {
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }
  function toggleTheme(origin) {
    var next = isDark() ? 'light' : 'dark';
    if (!document.startViewTransition || reduce) { setTheme(next); return; }
    var x = origin ? origin.x : window.innerWidth / 2;
    var y = origin ? origin.y : window.innerHeight - 40;
    var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var vt = document.startViewTransition(function () { setTheme(next); });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }
  $$('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var b = btn.getBoundingClientRect();
      toggleTheme({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
    });
  });

  /* ================= Dock: highlight the section on screen ================= */
  var dockLinks = $$('.dock__item[href^="#"]');
  if ('IntersectionObserver' in window && dockLinks.length) {
    var linkFor = {};
    dockLinks.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        dockLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        var link = linkFor[e.target.id];
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(linkFor).forEach(function (id) { var el = document.getElementById(id); if (el) secObs.observe(el); });
  }

  /* ================= Scramble text (section labels) ================= */
  var GLYPHS = '!<>-_\\/[]{}=+*^?#01';
  function scramble(el) {
    var final = el.getAttribute('data-final') || el.textContent;
    el.setAttribute('data-final', final);
    el.setAttribute('aria-label', final);
    if (reduce || document.hidden) { el.textContent = final; return; }
    var frame = 0, total = 22;
    (function step() {
      if (document.hidden) { el.textContent = final; return; }
      var out = '';
      for (var i = 0; i < final.length; i++) {
        var settle = (i / final.length) * total * 0.7 + 6;
        out += (frame >= settle || final[i] === ' ') ? final[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (++frame <= total + 6) setTimeout(step, 28); else el.textContent = final;
    })();
  }

  /* ================= Reveal on scroll (+ stagger) ================= */
  $$('.skills, .about').forEach(function (group) {
    $$('.reveal', group).forEach(function (el, i) { el.style.setProperty('--d', i); });
  });
  var reveals = $$('.reveal');
  function revealed(el) { el.classList.add('in'); $$('[data-scramble]', el).forEach(scramble); }
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(revealed);
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { revealed(e.target); revObs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* ================= Bangalore clock ================= */
  var clock = $('#clock');
  if (clock) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }); } catch (e) {}
    var tickClock = function () {
      if (!fmt) return;
      var parts = fmt.formatToParts(new Date()), hm = '', ap = '';
      parts.forEach(function (p) {
        if (p.type === 'hour' || p.type === 'minute' || (p.type === 'literal' && p.value.trim() === ':')) hm += p.value;
        if (p.type === 'dayPeriod') ap = p.value;
      });
      clock.innerHTML = hm + '<span class="ampm">' + ap + '</span>';
    };
    tickClock(); setInterval(tickClock, 10000);
  }

  /* ================= Copy email ================= */
  function copyEmail(btn) {
    var done = function () {
      if (!btn) return;
      var label = $('.copy__label', btn) || btn;
      var prev = label.textContent;
      label.textContent = 'Copied!'; btn.classList.add('is-done');
      setTimeout(function () { label.textContent = prev; btn.classList.remove('is-done'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, function () { location.href = 'mailto:' + EMAIL; });
    } else { location.href = 'mailto:' + EMAIL; }
  }
  $$('.copy').forEach(function (b) { b.addEventListener('click', function () { copyEmail(b); }); });

  /* ================= Pointer effects (desktop only) ================= */
  if (finePointer && !reduce) {
    // Spotlight glow inside cards and tiles
    $$('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // Magnetic buttons
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * 0.22 + 'px,' + dy * 0.32 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // Name: letters of "Ashwin" get bolder near the cursor
    var intro = $('.tile--intro');
    var letters = $$('.name__first .ch');
    var lastEv = null, ticking = false;
    if (intro) {
      intro.addEventListener('pointermove', function (e) {
        lastEv = e;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          var ev = lastEv;
          letters.forEach(function (ch) {
            var b = ch.getBoundingClientRect();
            var d = Math.hypot(ev.clientX - (b.left + b.width / 2), ev.clientY - (b.top + b.height / 2));
            var w = 600 + Math.max(0, 1 - d / 300) * 200 - Math.min(1, d / 900) * 120;
            ch.style.setProperty('--w', Math.round(w));
          });
        });
      });
      intro.addEventListener('pointerleave', function () { letters.forEach(function (ch) { ch.style.removeProperty('--w'); }); });
    }

    // Chessboard tilt + glare
    var card = $('#board-card');
    if (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', ((px - 0.5) * 16).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 14).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100) + '%');
        card.style.setProperty('--gy', (py * 100) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.removeProperty('--rx'); card.style.removeProperty('--ry');
      });
    }
  }

  /* ================= Chessboard: the Italian Game on a loop ================= */
  (function chess() {
    var board = $('#board');
    if (!board) return;
    var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    var BACK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    var FILES = 'abcdefgh';
    var MOVES = [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5']];
    var hlFrom = $('#hl-from'), hlTo = $('#hl-to');
    var marks = $$('.moves b');
    var pieces = {};
    function place(el, sq) { el.style.setProperty('--x', FILES.indexOf(sq[0])); el.style.setProperty('--y', 8 - Number(sq[1])); }
    function setup() {
      Object.keys(pieces).forEach(function (sq) { pieces[sq].remove(); });
      pieces = {};
      for (var f = 0; f < 8; f++) {
        [['w', BACK[f], 1], ['w', 'p', 2], ['b', 'p', 7], ['b', BACK[f], 8]].forEach(function (s) {
          var el = document.createElement('span');
          el.className = 'piece piece--' + s[0];
          el.textContent = GLYPH[s[1]] + '︎'; // text, not emoji, presentation
          var sq = FILES[f] + s[2];
          place(el, sq); board.appendChild(el); pieces[sq] = el;
        });
      }
      hlFrom.classList.remove('on'); hlTo.classList.remove('on');
      marks.forEach(function (m) { m.classList.remove('on'); });
    }
    function play(i) {
      var from = MOVES[i][0], to = MOVES[i][1], el = pieces[from];
      if (!el) return;
      delete pieces[from]; pieces[to] = el; place(el, to);
      place(hlFrom, from); place(hlTo, to); hlFrom.classList.add('on'); hlTo.classList.add('on');
      marks.forEach(function (m) { m.classList.toggle('on', Number(m.getAttribute('data-ply')) === i); });
    }
    setup();
    if (reduce) { for (var i = 0; i < MOVES.length; i++) play(i); return; }
    var ply = 0, timer = null;
    function tick() {
      if (ply < MOVES.length) { play(ply++); timer = setTimeout(tick, 1100); return; }
      timer = setTimeout(function () {
        board.classList.add('is-resetting');
        setTimeout(function () { setup(); board.classList.remove('is-resetting'); ply = 0; timer = setTimeout(tick, 900); }, 450);
      }, 2600);
    }
    whileVisible(board, function () { if (!timer) timer = setTimeout(tick, 900); },
      function () { clearTimeout(timer); timer = null; });
  })();

  /* ================= Project visuals ================= */
  function cycler(el, selector, ms) {
    var items = $$(selector, el), i = 0, t = null;
    function step() { items.forEach(function (n, k) { n.classList.toggle('on', k === i); }); i = (i + 1) % items.length; }
    return {
      start: function () { if (t) return; step(); t = setInterval(step, ms); },
      stop: function () { clearInterval(t); t = null; }
    };
  }
  $$('[data-anim]').forEach(function (card) {
    var kind = card.getAttribute('data-anim');
    var anim = { start: function () {}, stop: function () {} };
    if (kind === 'pipe') anim = cycler(card, '.pipe span[data-step]', 850);
    if (kind === 'score') {
      var home = $('[data-score="home"]', card), away = $('[data-score="away"]', card), clk = $('[data-score="clock"]', card);
      var secs = 134, h = 21, a = 18, st = null;
      anim = {
        start: function () {
          if (st) return;
          st = setInterval(function () {
            secs = secs > 0 ? secs - 1 : 134;
            clk.textContent = 'Q4 ' + String((secs / 60) | 0).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
            if (Math.random() < 0.12) {
              var who = Math.random() < 0.5 ? home : away;
              var pts = Math.random() < 0.3 ? 3 : 2;
              if (who === home) { h += pts; if (h > 99) h = 21; who.textContent = h; } else { a += pts; if (a > 99) a = 18; who.textContent = a; }
              who.classList.add('bump'); setTimeout(function () { who.classList.remove('bump'); }, 450);
            }
          }, 1000);
        },
        stop: function () { clearInterval(st); st = null; }
      };
    }
    if (kind === 'term') {
      var lines = $$('.term__line', card), tt = null, running = false;
      var showAll = function () { lines.forEach(function (l) { l.textContent = l.getAttribute('data-line'); }); };
      var type = function () {
        lines.forEach(function (l) { l.textContent = ''; });
        var li = 0, ci = 0;
        (function next() {
          if (!running) return;
          if (li >= lines.length) { tt = setTimeout(type, 2800); return; }
          var full = lines[li].getAttribute('data-line');
          if (lines[li].classList.contains('term__line--out')) { lines[li].textContent = full; li++; ci = 0; tt = setTimeout(next, 380); return; }
          lines[li].textContent = full.slice(0, ++ci);
          if (ci >= full.length) { li++; ci = 0; tt = setTimeout(next, 420); } else { tt = setTimeout(next, 45 + Math.random() * 50); }
        })();
      };
      if (reduce) showAll();
      anim = {
        start: function () { if (running || reduce) return; running = true; type(); },
        stop: function () { running = false; clearTimeout(tt); showAll(); }
      };
    }
    if (reduce) { card.classList.add('is-live'); return; }
    whileVisible(card, function () { card.classList.add('is-live'); anim.start(); }, anim.stop);
  });

  /* ================= Stacking project cards: dim the ones underneath ================= */
  (function stack() {
    var cards = $$('.stack .proj');
    if (!cards.length || reduce) return;
    var wide = window.matchMedia('(min-width: 761px)');
    var ticking = false;
    function update() {
      ticking = false;
      if (!wide.matches) { cards.forEach(function (c) { c.classList.remove('is-covered'); }); return; }
      for (var i = 0; i < cards.length; i++) {
        var next = cards[i + 1];
        var covered = !!next && next.getBoundingClientRect().top - cards[i].getBoundingClientRect().top < 120;
        cards[i].classList.toggle('is-covered', covered);
      }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ================= Count-up numbers ================= */
  $$('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count'));
    var from = parseFloat(el.getAttribute('data-from') || '0');
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var fmt = function (v) { return (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suffix; };
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = fmt(to); return; }
    el.textContent = fmt(from);
    var obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      if (document.hidden) { el.textContent = fmt(to); return; }
      var t0 = performance.now(), dur = 1500;
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(from + (to - from) * e);
        if (p < 1) { if (document.hidden) { el.textContent = fmt(to); return; } requestAnimationFrame(step); }
      })(t0);
    }, { threshold: 0.6 });
    obs.observe(el);
  });

  /* ================= Activity heatmap ================= */
  (function heatmap() {
    var host = $('#heatmap'), dataEl = $('#activity-data'), tip = $('#tooltip');
    if (!host || !dataEl) return;
    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var start = new Date(data.start + 'T00:00:00');
    var total = 0, frag = document.createDocumentFragment();
    var dfmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    data.counts.forEach(function (n, i) {
      total += n;
      var cell = document.createElement('i');
      var lvl = n === 0 ? 0 : n <= 2 ? 1 : n <= 6 ? 2 : n <= 14 ? 3 : 4;
      if (lvl) cell.className = 'l' + lvl;
      cell.style.setProperty('--c', Math.floor(i / 7));
      var day = new Date(start); day.setDate(start.getDate() + i);
      cell.setAttribute('data-tip', (n ? n + ' commit' + (n > 1 ? 's' : '') : 'No commits') + ' · ' + dfmt.format(day));
      frag.appendChild(cell);
    });
    host.appendChild(frag);

    var months = $('#heatmap-months');
    if (months) {
      var mfmt = new Intl.DateTimeFormat('en-US', { month: 'short' }), lastM = -1, lastCol = -9;
      for (var w = 0; w * 7 < data.counts.length; w++) {
        var wd = new Date(start); wd.setDate(start.getDate() + w * 7);
        if (wd.getMonth() !== lastM) {
          lastM = wd.getMonth();
          if (w === 0 && wd.getDate() > 14) continue;
          if (w - lastCol < 4 || w > 50) continue;
          lastCol = w;
          var sp = document.createElement('span');
          sp.textContent = mfmt.format(wd);
          sp.style.gridColumn = (w + 1) + ' / span 4';
          months.appendChild(sp);
        }
      }
    }
    var totalEl = $('#activity-total');
    if (totalEl) totalEl.textContent = total.toLocaleString('en-US');

    var box = host.closest('.tile--activity');
    if (reduce) box.classList.add('is-live');
    else whileVisible(box, function () { box.classList.add('is-live'); }, null, { threshold: 0.3 });

    var sc = $('.activity__scroll', box);
    if (sc) sc.scrollLeft = sc.scrollWidth;

    host.addEventListener('pointerover', function (e) {
      var c = e.target.closest('i'); if (!c) return;
      var b = c.getBoundingClientRect(), r = box.getBoundingClientRect();
      tip.textContent = c.getAttribute('data-tip');
      tip.style.left = (b.left - r.left + b.width / 2) + 'px';
      tip.style.top = (b.top - r.top) + 'px';
      tip.classList.add('on');
    });
    host.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
  })();

  /* ================= Command palette (⌘K) ================= */
  (function palette() {
    var dlg = $('#palette'), input = $('#palette-input'), list = $('#palette-list');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var items = $$('li', list), sel = 0;
    function visible() { return items.filter(function (li) { return !li.hidden; }); }
    function mark() {
      var vis = visible();
      items.forEach(function (li) { li.setAttribute('aria-selected', 'false'); });
      if (vis[sel]) { vis[sel].setAttribute('aria-selected', 'true'); vis[sel].scrollIntoView({ block: 'nearest' }); }
    }
    function open() { input.value = ''; items.forEach(function (li) { li.hidden = false; }); sel = 0; mark(); dlg.showModal(); input.focus(); }
    function close() { dlg.close(); }
    function run(li) {
      if (!li) return;
      var action = li.getAttribute('data-action'), target = li.getAttribute('data-target');
      close();
      // Let the dialog finish closing (it restores focus, which would cancel a smooth scroll)
      setTimeout(function () {
        if (action === 'goto') { var el = $(target); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
        if (action === 'open') window.open(target, '_blank', 'noopener');
        if (action === 'copy') copyEmail(null);
        if (action === 'theme') toggleTheme(null);
      }, 60);
    }
    $$('[data-open-palette]').forEach(function (b) { b.addEventListener('click', open); });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? close() : open(); }
    });
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (li) { li.hidden = q && li.textContent.toLowerCase().indexOf(q) === -1; });
      sel = 0; mark();
    });
    input.addEventListener('keydown', function (e) {
      var vis = visible();
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(vis.length - 1, sel + 1); mark(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      if (e.key === 'Enter') { e.preventDefault(); run(vis[sel]); }
    });
    list.addEventListener('click', function (e) { run(e.target.closest('li')); });
    list.addEventListener('pointermove', function (e) {
      var li = e.target.closest('li'); if (!li) return;
      var i = visible().indexOf(li); if (i !== sel && i > -1) { sel = i; mark(); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  })();

  /* ================= Year ================= */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
