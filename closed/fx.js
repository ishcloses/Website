/* Closed: the motion layer. Decoration only.
   The quiz, the forms, the tracking and the countdown all live in closed.js and work without this file.
   Motion here uses transform and opacity, and none of it runs for people who ask for reduced motion. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  if (doc.body.getAttribute('data-page') !== 'home') return;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  var vh = function () { return window.innerHeight; };
  window.closedFx = true;

  /* ---------- spots left: the little meter beside the number (SPOTS_LEFT out of CONFIG.cohort.spots) ---------- */
  var fill = $('#left-fill'), total = parseInt(CONFIG.cohort.spots, 10);
  if (fill && total > 0) fill.style.transform = 'scaleX(' + clamp(SPOTS_LEFT / total, 0, 1) + ')';

  /* ---------- questions: open and close with a smooth height ---------- */
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
      run = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 340, easing: 'cubic-bezier(.3,.7,.2,1)' });
      run.onfinish = function () { run = null; if (!opening) { d.open = false; d.classList.remove('closing'); } };
    });
  });

  if (reduced || !('IntersectionObserver' in window)) { root.classList.remove('fx'); return; }
  root.classList.add('fx');

  try {
    /* one scroll listener for everything that follows the scroll */
    var jobs = [], queued = false;
    var frame = function () { queued = false; for (var i = 0; i < jobs.length; i++) jobs[i](); };
    var onScroll = function () { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);

    /* ---------- the thin gold progress bar at the very top ---------- */
    var prog = doc.createElement('div'); prog.className = 'prog'; prog.setAttribute('aria-hidden', 'true'); prog.innerHTML = '<i></i>';
    doc.body.appendChild(prog);
    jobs.push(function () { var max = root.scrollHeight - vh(); prog.firstChild.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0) + ')'; });

    /* ---------- looping animations only run in the sections on screen ---------- */
    var liveIO = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('live', e.isIntersecting); }); }, { rootMargin: '120px 0px' });
    $$('main > section').forEach(function (s) { liveIO.observe(s); });

    /* ---------- sections fade and slide in, one piece after the other ----------
       Only pieces below the screen at load are hidden first, so nothing already in view flashes. */
    var pieces = ['.agent-photo', '.agent-copy', '.roster .head > *', '.hundo > *', '.enemy .head > *', '.vs-row', '.enemy-end', '.ladder .head > *', '.ladder-note',
      '.standard .head > *', '.std', '.contract .head > *', '.deal-side', '.nf', '.faq .head > *', '.qa details', '.final-card'];
    var rvIO = new IntersectionObserver(function (es) {
      var k = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, delay = k++ * 80;
        rvIO.unobserve(el);
        el.style.transitionDelay = delay + 'ms'; el.classList.add('in');
        setTimeout(function () { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, delay + 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    $$(pieces.join(',')).forEach(function (el) { if (el.getBoundingClientRect().top > vh() * .95) { el.classList.add('rv'); rvIO.observe(el); } });

    /* ---------- numbers count up when they come into view ---------- */
    $$('.final-spots [data-bind="spots"], .left [data-bind="spotsLeft"]').forEach(function (el) { if (/^\d+$/.test(el.textContent)) el.setAttribute('data-count', el.textContent); });
    var countUp = function (el) {
      var end = parseFloat(el.getAttribute('data-count')), dec = (el.getAttribute('data-count').split('.')[1] || '').length, t0 = 0;
      var step = function (now) {
        if (!t0) t0 = now;
        var p = clamp((now - t0) / 1500, 0, 1);
        el.textContent = (end * (1 - Math.pow(1 - p, 4))).toFixed(dec);
        if (p < 1) requestAnimationFrame(step); else { el.classList.remove('counting'); el.style.width = ''; el.style.display = ''; }
      };
      requestAnimationFrame(step);
    };
    var hold = function (el) {   // even-width digits in a fixed box while it counts, so nothing around the number moves
      var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
      el.classList.add('counting');
      if (!el.closest('.hundo-n')) { el.style.width = el.getBoundingClientRect().width.toFixed(2) + 'px'; el.style.display = 'inline-block'; }
      el.textContent = (0).toFixed(dec);
    };
    var countIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countIO.unobserve(e.target); countUp(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .5 });
    $$('[data-count]').forEach(function (el) { if (el.getBoundingClientRect().top > vh()) { hold(el); countIO.observe(el); } });

    /* the countdown rolls up to the real time: once in the top bar at load, once on the big board when it shows */
    var target = Date.parse(CONFIG.cohort.start), pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var left = function () { var s = Math.max(0, Math.floor((target - Date.now()) / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; };
    var roll = function (box) {
      if (!box || !(target - Date.now() > 0)) return;
      var els = $$('[data-cd]', box), t0 = 0;
      var step = function (now) {
        if (!t0) t0 = now;
        var p = clamp((now - t0) / 1200, 0, 1), e = 1 - Math.pow(1 - p, 3), real = left();
        els.forEach(function (el) { el.textContent = pad(Math.round(real[el.getAttribute('data-cd')] * e)); });
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    roll($('#bar'));
    var board = $('.board');
    if (board) new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { io.disconnect(); roll(board); } }, { threshold: .6 }).observe(board);

    /* ---------- the Closed Ladder: a gold line that fills as you scroll, each stage lights up when the line reaches it ---------- */
    var tl = $('.ladder-tl'), rail = tl && $('.rail i', tl), rungs = $$('.rung'), wide = matchMedia('(min-width: 1000px)'), reach = 0;
    var ladder = function () {
      var r = tl.getBoundingClientRect(), h = vh(), side = wide.matches;
      if (r.top > h) return;
      var p = side ? (h * .85 - r.top) / (r.height + h * .1) : (h * .62 - r.top - 20) / (r.height - 40);
      reach = Math.max(reach, clamp(p, 0, 1));
      rail.style.transform = side ? 'scaleX(' + reach.toFixed(4) + ')' : 'scaleY(' + reach.toFixed(4) + ')';
      rungs.forEach(function (li, i) {
        var at = side ? (i + .5) / rungs.length : (li.offsetTop + 8) / (r.height - 40);
        if (reach > 0 && reach >= at - .001) li.classList.add('lit');
      });
    };
    if (rail) { jobs.push(ladder); wide.addEventListener && wide.addEventListener('change', onScroll); }

    /* ---------- gold shimmer: a bright copy of the words sits on top and a soft band of it sweeps across ----------
       The band slides one way and the copy slides back the other, so the letters stay put and only the light moves. */
    var shimmer = function (host) {   // the copy is drawn by CSS from data-t, so the words are never in the page twice
      var layer = doc.createElement('span');
      layer.className = 'shim'; layer.setAttribute('aria-hidden', 'true'); layer.innerHTML = '<span class="shim-w"><span class="shim-t"></span></span>';
      layer.firstChild.firstChild.setAttribute('data-t', host.textContent.replace(/\s+/g, ' ').trim());
      host.classList.add('shim-host'); host.appendChild(layer);
    };
    $$('.hero h1 .gold, .enemy-end .gold').forEach(shimmer);
    $$('.head h2 .gold, .agent-copy h2 .gold, .nf h2 .gold, .final h2 .gold').forEach(function (g) {
      if (g.getClientRects().length === 1) { g.classList.add('shim-inline'); shimmer(g); }   // only when the gold words sit on one line
    });

    /* ---------- desktop only: things that react to the mouse ---------- */
    if (fine) {
      /* a soft gold light that trails the cursor */
      var cur = doc.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true'); doc.body.appendChild(cur);
      var cx = 0, cy = 0, tx = 0, ty = 0, moving = false, seen = false;
      var follow = function () {
        cx += (tx - cx) * .16; cy += (ty - cy) * .16;
        cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        if (Math.abs(tx - cx) + Math.abs(ty - cy) > .3) requestAnimationFrame(follow); else moving = false;
      };
      addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        tx = e.clientX; ty = e.clientY;
        if (!seen) { seen = true; cx = tx; cy = ty; }
        cur.classList.add('on');
        if (!moving) { moving = true; requestAnimationFrame(follow); }
      }, { passive: true });
      root.addEventListener('mouseleave', function () { cur.classList.remove('on'); });

      /* cards light up under the cursor: one shared glow that moves into whichever card you're over */
      var cg = doc.createElement('span'); cg.className = 'cg'; cg.setAttribute('aria-hidden', 'true');
      $$('.std, .rung-b, .nf, .agent-copy, .deal-side, .guarantee, .final-card').forEach(function (card) {
        card.classList.add('glowable');
        card.addEventListener('pointerenter', function () { card.appendChild(cg); requestAnimationFrame(function () { cg.classList.add('on'); }); });
        card.addEventListener('pointermove', function (e) { var r = card.getBoundingClientRect(); cg.style.transform = 'translate3d(' + (e.clientX - r.left).toFixed(1) + 'px,' + (e.clientY - r.top).toFixed(1) + 'px,0)'; });
        card.addEventListener('pointerleave', function () { cg.classList.remove('on'); });
      });

      /* the Agent Standard cards tilt toward the cursor and lift */
      $$('.std').forEach(function (el) {
        var r = null, at = 0;
        el.addEventListener('pointermove', function (e) {
          if (!r || at !== window.scrollY) { el.style.transform = ''; r = el.getBoundingClientRect(); at = window.scrollY; }
          var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          el.classList.add('tilt');
          el.style.transform = 'perspective(1100px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg) translate3d(0,-6px,0)';
        });
        el.addEventListener('pointerleave', function () { r = null; el.classList.remove('tilt'); el.style.transform = ''; });
      });

      /* the main buttons lean toward the cursor */
      $$('.hero .btn-glow, .final .btn-glow').forEach(function (b) {
        var mx = 0, my = 0, zone = b.parentNode;
        zone.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2 - mx), dy = e.clientY - (r.top + r.height / 2 - my);
          var near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 36;
          mx = near ? dx * .14 : 0; my = near ? dy * .3 : 0;
          b.style.transform = near ? 'translate3d(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px,0)' : '';
        });
        zone.addEventListener('pointerleave', function () { mx = my = 0; b.style.transform = ''; });
      });

      /* the screenshot wall eases down to a crawl while you hover it, instead of stopping dead */
      var wall = $('#wall'), rate = 1, goal = 1, easing = false;
      var ease = function () {
        rate += (goal - rate) * .1;
        if (Math.abs(goal - rate) < .01) rate = goal;
        $$('.wall-track', wall).forEach(function (t) { (t.getAnimations ? t.getAnimations() : []).forEach(function (a) { a.playbackRate = rate; }); });
        if (rate !== goal) requestAnimationFrame(ease); else easing = false;
      };
      var pace = function (to) { goal = to; if (!easing) { easing = true; requestAnimationFrame(ease); } };
      if (wall) { wall.addEventListener('pointerenter', function () { pace(.2); }); wall.addEventListener('pointerleave', function () { pace(1); }); }

      /* smooth scrolling (Lenis). Loaded on its own so the page never waits for it, and it steps aside while the quiz is open. */
      var ls = doc.createElement('script'); ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js'; ls.async = true;
      ls.onload = function () {
        if (!window.Lenis) return;
        var lenis = new window.Lenis({ lerp: .12, autoRaf: true }), qz = $('#apply');
        qz.setAttribute('data-lenis-prevent', '');
        new MutationObserver(function () { if (qz.open) lenis.stop(); else lenis.start(); }).observe(qz, { attributes: true, attributeFilter: ['open'] });
      };
      doc.head.appendChild(ls);
    }

    frame();
  } catch (err) {
    root.classList.remove('fx');   // if any of this trips, drop the motion and show the plain page
    if (window.console) console.warn('Closed motion is off:', err && err.message);
  }
})();
