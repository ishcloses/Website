/* scalD — shared behaviour for every page.
   One requestAnimationFrame loop drives everything: Lenis smooth scrolling, then any
   per-frame "ticks" a page registers (the home scene does), then the nav and dock state. */
(function () {
  'use strict';
  var root = document.documentElement;
  var SC = window.SC = window.SC || {};
  var reduced = SC.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  SC.touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  SC.ticks = SC.ticks || [];
  SC.lenis = null;
  SC.solidAt = 12;       /* scroll position after which the nav gets its backing */
  SC.dockHold = false;   /* a page can hold the floating button back (the home hero does) */
  var $ = SC.$ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = SC.$$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* Lenis loads in the background; until it does, the page scrolls natively */
  if (!reduced) {
    var ls = document.createElement('script');
    ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.2.3/dist/lenis.min.js';
    ls.async = true;
    ls.onload = function () {
      try { SC.lenis = new window.Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1, syncTouch: false }); } catch (e) { SC.lenis = null; }
    };
    document.head.appendChild(ls);
  }
  SC.scroll = function () { return SC.lenis ? SC.lenis.scroll : window.scrollY; };
  function ease4(t) { return t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  SC.scrollTo = function (target) {
    if (SC.lenis) SC.lenis.scrollTo(target, { duration: 1.8, easing: ease4 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'), el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      SC.scrollTo(id === '#top' ? 0 : el);
    });
  });

  /* ---------- the loop ---------- */
  var nav = $('#nav'), dock = $('#dock'), navSolid = null, dockHidden = null, blockers = [];
  function loop(now) {
    requestAnimationFrame(loop);
    if (SC.lenis) SC.lenis.raf(now);
    var y = SC.scroll();
    for (var i = 0; i < SC.ticks.length; i++) SC.ticks[i](now, y);
    var solid = y > SC.solidAt;
    if (nav && solid !== navSolid) { navSolid = solid; nav.classList.toggle('is-solid', solid); }
    var hide = SC.dockHold || blockers.some(function (el) { return el.__in; });
    if (dock && hide !== dockHidden) { dockHidden = hide; dock.classList.toggle('hide', hide); }
  }
  requestAnimationFrame(loop);

  /* ---------- the floating button steps aside wherever a page already offers a call ---------- */
  blockers = $$('[data-nodock]');
  if ('IntersectionObserver' in window) {
    var bio = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.__in = e.isIntersecting; }); }, { threshold: .08 });
    blockers.forEach(function (el) { bio.observe(el); });
  }

  /* ---------- reveals, once ---------- */
  function countUp(box) {
    $$('[data-count]', box).forEach(function (el) {
      var to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      if (reduced) return;
      var t0 = null;
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 1500), e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + (to * e).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }
  var revealables = $$('.rv, .board, .stats');
  if ('IntersectionObserver' in window) {
    var once = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.classList.contains('stats')) countUp(e.target);
        if (e.target.classList.contains('tw')) setTimeout(function () { e.target.classList.add('lit'); }, reduced ? 0 : 900);
        once.unobserve(e.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { once.observe(el); });
    /* numbers that would count from zero start at zero only once they're sure to be counted */
    $$('.stats [data-count]').forEach(function (el) { if (!reduced) el.textContent = (el.dataset.pre || '') + (0).toFixed(+(el.dataset.dec || 0)) + (el.dataset.suf || ''); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in', 'lit'); });
  }

  /* ---------- logo roll ---------- */
  var track = $('#track'), pp = $('#pp');
  if (track && !reduced) {
    $$('li', track).forEach(function (li) {
      var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true');
      $$('img', c).forEach(function (im) { im.alt = ''; });
      track.appendChild(c);
    });
    track.classList.add('rolling');
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { track.classList.toggle('sleep', !es[0].isIntersecting); }).observe(track);
    var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5h2.6v13H8zM13.4 5.5H16v13h-2.6z"/></svg>';
    var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.6-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5z"/></svg>';
    var paused = false;
    var showPP = function () { pp.innerHTML = paused ? PLAY : PAUSE; pp.setAttribute('aria-label', paused ? 'Play the logos' : 'Pause the logos'); track.classList.toggle('paused', paused); };
    pp.addEventListener('click', function () { paused = !paused; showPP(); });
    showPP();
  } else if (pp) { pp.remove(); }

  /* ---------- client directory ---------- */
  $$('.floor').forEach(function (fl) {
    var b = $('.floor-row', fl), dt = $('.floor-detail', fl);
    if (!b || !dt) return;
    dt.inert = true;
    b.addEventListener('click', function () {
      var open = !fl.classList.contains('open');
      fl.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
      dt.inert = !open;
    });
  });

  /* ---------- method: pointing at a step lights its floor in the tower ---------- */
  var tower = $('#tower');
  if (tower) {
    var floors = {};
    $$('.tw-fl', tower).forEach(function (f) { floors[f.dataset.f] = f; });
    var steps = $$('.fstep');
    var light = function (n) {
      steps.forEach(function (s) { s.classList.toggle('on', s.dataset.f === n); });
      Object.keys(floors).forEach(function (k) { floors[k].classList.toggle('on', k === n); });
    };
    steps.forEach(function (s) {
      s.addEventListener('pointerenter', function () { light(s.dataset.f); });
      s.addEventListener('focusin', function () { light(s.dataset.f); });
    });
    var list = $('.fsteps');
    if (list) list.addEventListener('pointerleave', function () { light(null); });
  }

  /* ---------- gold buttons tilt toward the pointer and catch the light where it is ---------- */
  if (!reduced && !SC.touch) {
    $$('.btn-gold').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        b.style.setProperty('--rx', (-y * 16).toFixed(2) + 'deg');
        b.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        b.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- start ---------- */
  var fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 500); })]).then(function () { root.classList.add('go'); });
})();
