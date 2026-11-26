(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle ---------- */
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- Nav: border on scroll + active section ---------- */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var link = byId[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Copy email ---------- */
  var copyBtn = document.querySelector('.copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy');
      var done = function () {
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('is-done');
        setTimeout(function () { copyBtn.textContent = 'Copy email'; copyBtn.classList.remove('is-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.location.href = 'mailto:' + text; });
      } else {
        window.location.href = 'mailto:' + text;
      }
    });
  }

  /* ---------- Year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Chessboard: the Italian Game on a loop ---------- */
  var board = document.getElementById('board');
  if (!board) return;

  // ︎ asks for text (not emoji) presentation, so the pawn renders as a glyph on iOS.
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var BACK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  var FILES = 'abcdefgh';
  var MOVES = [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['f8', 'c5']];

  var hlFrom = document.getElementById('hl-from');
  var hlTo = document.getElementById('hl-to');
  var moveMarks = Array.prototype.slice.call(document.querySelectorAll('#moves b'));
  var pieces = {}; // square -> element

  function place(el, square) {
    el.style.setProperty('--x', FILES.indexOf(square[0]));
    el.style.setProperty('--y', 8 - Number(square[1]));
  }

  function setup() {
    Object.keys(pieces).forEach(function (sq) { pieces[sq].remove(); });
    pieces = {};
    for (var f = 0; f < 8; f++) {
      [['w', BACK[f], 1], ['w', 'p', 2], ['b', 'p', 7], ['b', BACK[f], 8]].forEach(function (spec) {
        var el = document.createElement('span');
        var square = FILES[f] + spec[2];
        el.className = 'piece piece--' + spec[0];
        el.textContent = GLYPH[spec[1]] + '︎';
        place(el, square);
        board.appendChild(el);
        pieces[square] = el;
      });
    }
    hlFrom.classList.remove('on');
    hlTo.classList.remove('on');
    moveMarks.forEach(function (m) { m.classList.remove('on'); });
  }

  function play(i) {
    var from = MOVES[i][0], to = MOVES[i][1];
    var el = pieces[from];
    if (!el) return;
    delete pieces[from];
    pieces[to] = el;
    place(el, to);
    place(hlFrom, from);
    place(hlTo, to);
    hlFrom.classList.add('on');
    hlTo.classList.add('on');
    moveMarks.forEach(function (m) { m.classList.toggle('on', Number(m.getAttribute('data-ply')) === i); });
  }

  setup();

  if (reduceMotion) {
    for (var i = 0; i < MOVES.length; i++) play(i);
    return;
  }

  var ply = 0;
  var timer = null;
  function tick() {
    if (ply < MOVES.length) {
      play(ply);
      ply += 1;
      timer = setTimeout(tick, 1100);
    } else {
      timer = setTimeout(function () {
        board.classList.add('is-resetting');
        setTimeout(function () {
          setup();
          board.classList.remove('is-resetting');
          ply = 0;
          timer = setTimeout(tick, 900);
        }, 450);
      }, 2600);
    }
  }

  // Only animate while the board is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !timer) {
          timer = setTimeout(tick, 700);
        } else if (!entry.isIntersecting && timer) {
          clearTimeout(timer);
          timer = null;
        }
      });
    }).observe(board);
  } else {
    timer = setTimeout(tick, 700);
  }
})();
