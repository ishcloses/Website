/* Closed: the motion layer. Decoration only.
   The quiz, the forms, the tracking and the countdown all live in closed.js and work without this file.
   Motion uses transform and opacity, and none of it runs for people who ask for reduced motion. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  if (doc.body.getAttribute('data-page') !== 'home') return;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  window.closedFx = true;

  /* ---------- questions: open and close with a smooth height (works with or without the rest of the motion) ---------- */
  $$('.qa details').forEach(function (d) {
    var sum = $('summary', d), run = null;
    sum.addEventListener('click', function (e) {
      if (reduced || !d.animate) return;
      e.preventDefault();
      var opening = !d.open || d.classList.contains('closing'), from = d.offsetHeight;
      if (run) run.cancel();
      d.classList.toggle('closing', !opening);
      if (opening) d.open = true;
      var to = opening ? d.offsetHeight : sum.offsetHeight + (d.offsetHeight - d.clientHeight);
      run = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 380, easing: 'cubic-bezier(.3,.7,.2,1)' });
      run.onfinish = function () { run = null; if (!opening) { d.open = false; d.classList.remove('closing'); } };
    });
  });

  if (reduced || !('IntersectionObserver' in window)) { root.classList.remove('fx', 'intro-on'); return; }

  try {
    var go = function () { root.classList.add('go'); };

    /* ---------- the intro: the line types itself out, the name appears, the count runs to 100, then it lifts ---------- */
    var intro = $('#intro');
    if (root.classList.contains('intro-on') && intro) {
      var chars = [];
      $$('[data-type]', intro).forEach(function (line) {
        var t = line.textContent; line.textContent = '';
        line.setAttribute('aria-label', t);
        t.split('').forEach(function (c) { var i = doc.createElement('i'); i.textContent = c; line.appendChild(i); chars.push(i); });
      });
      var n = $('#intro-n'), t0 = performance.now(), TYPE = 1350, TOTAL = 2350, done = false;
      var finish = function () {
        if (done) return; done = true;
        chars.forEach(function (c) { c.classList.add('on'); });
        if (n) n.textContent = '100';
        intro.classList.add('mark', 'out'); go();
        try { sessionStorage.setItem('closed-intro', '1'); } catch (e) { }
        setTimeout(function () { root.classList.remove('intro-on'); }, 1100);
      };
      var step = function (now) {
        if (done) return;
        var p = (now - t0) / TOTAL, k = Math.floor(clamp((now - t0) / TYPE, 0, 1) * chars.length);
        for (var i = 0; i < k; i++) chars[i].classList.add('on');
        if (n) n.textContent = ('00' + Math.round(clamp(p, 0, 1) * 100)).slice(-3);
        if (now - t0 > TYPE + 150) intro.classList.add('mark');
        if (p >= 1) { setTimeout(finish, 260); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      intro.addEventListener('click', finish);
      addEventListener('keydown', finish, { once: true });
    } else {
      root.classList.remove('intro-on');
      requestAnimationFrame(function () { requestAnimationFrame(go); });
    }

    /* one scroll listener for everything that follows the scroll */
    var jobs = [], queued = false, vh = function () { return window.innerHeight; };
    var frame = function () { queued = false; for (var i = 0; i < jobs.length; i++) jobs[i](); };
    var onScroll = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);

    /* ---------- the nav tucks away while you read down, and comes back as soon as you scroll up ---------- */
    var nav = $('#nav'), lastY = window.scrollY;
    jobs.push(function () {
      var y = window.scrollY, qz = $('#apply');
      if (y < vh() * .6 || y < lastY - 2 || (qz && qz.open)) nav.classList.remove('away');
      else if (y > lastY + 4) nav.classList.add('away');
      lastY = y;
    });

    /* ---------- sections fade up as they arrive, a beat apart ---------- */
    var rvIO = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; rvIO.unobserve(el);
        el.style.transitionDelay = (k++ * 90) + 'ms'; el.classList.add('in');
        setTimeout(function () { el.style.transitionDelay = ''; }, 1200);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    $$('[data-rv]').forEach(function (el) { rvIO.observe(el); });

    /* ---------- numbers count up when they come into view (same font the whole way; only the digits change) ---------- */
    var countUp = function (el) {
      var end = parseFloat(el.getAttribute('data-count')), dec = (el.getAttribute('data-count').split('.')[1] || '').length, t0c = 0;
      var tick = function (now) {
        if (!t0c) t0c = now;
        var p = clamp((now - t0c) / 1400, 0, 1);
        el.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick); else el.textContent = el.getAttribute('data-end') || end.toFixed(dec);
      };
      requestAnimationFrame(tick);
    };
    var countIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countIO.unobserve(e.target); countUp(e.target); } });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { if (el.getBoundingClientRect().top > vh()) countIO.observe(el); });

    /* ---------- the ladder: the step in the middle of the screen is the one that's lit ---------- */
    var rungs = $$('.rung');
    if (rungs.length) jobs.push(function () {
      var mid = vh() * .55, best = null, dist = 1e9;
      rungs.forEach(function (r) { var b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid); if (b.bottom > 0 && b.top < vh() && d < dist) { dist = d; best = r; } });
      rungs.forEach(function (r) { r.classList.toggle('on', r === best); });
    });

    /* ---------- desktop: the wall eases down to a crawl while you hover it, and smooth scrolling ---------- */
    if (fine) {
      var wall = $('#wall'), rate = 1, goal = 1, easing = false;
      var ease = function () {
        rate += (goal - rate) * .1;
        if (Math.abs(goal - rate) < .01) rate = goal;
        $$('.wall-track', wall).forEach(function (t) { (t.getAnimations ? t.getAnimations() : []).forEach(function (a) { a.playbackRate = rate; }); });
        if (rate !== goal) requestAnimationFrame(ease); else easing = false;
      };
      var pace = function (to) { goal = to; if (!easing) { easing = true; requestAnimationFrame(ease); } };
      if (wall) { wall.addEventListener('pointerenter', function () { pace(.2); }); wall.addEventListener('pointerleave', function () { pace(1); }); }

      var ls = doc.createElement('script'); ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js'; ls.async = true;
      ls.onload = function () {
        if (!window.Lenis) return;
        var lenis = new window.Lenis({ lerp: .11, autoRaf: true }), qz = $('#apply');
        qz.setAttribute('data-lenis-prevent', '');
        new MutationObserver(function () { if (qz.open) lenis.stop(); else lenis.start(); }).observe(qz, { attributes: true, attributeFilter: ['open'] });
        $$('.nav a[href^="#"]').forEach(function (a) { a.addEventListener('click', function (e) { var t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -10 }); } }); });
      };
      doc.head.appendChild(ls);
    }

    frame();
  } catch (err) {
    root.classList.remove('fx', 'intro-on');   // if any of this trips, drop the motion and show the plain page
    if (window.console) console.warn('Closed motion is off:', err && err.message);
  }
})();
