/* scalD rebrand preview: vines that grow in along the edges, curl like pen flourishes, then sway. Decoration only.
   Each vine is drawn from a few numbers (where it starts, which way it grows, how long), so it fits any screen size. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', doc = document;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEAL = { id: 'teal', stem: '#4F9392', lite: '#BFE6E2', a: '#9AD6D0', b: '#2C6061', berry: '#E48BA1' };
  var PINK = { id: 'pink', stem: '#C86882', lite: '#FFE1E8', a: '#FCCBD6', b: '#A14A66', berry: '#8CCBC6' };
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  var rng = function (seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; };
  var f = function (n) { return n.toFixed(1); };
  var el = function (tag, attrs, parent) { var e = doc.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  var smooth = function (p) {   // a smooth line through the points
    var d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 1; i < p.length - 1; i++) d += 'Q' + f(p[i][0]) + ' ' + f(p[i][1]) + ' ' + f((p[i][0] + p[i + 1][0]) / 2) + ' ' + f((p[i][1] + p[i + 1][1]) / 2);
    return d + 'L' + f(p[p.length - 1][0]) + ' ' + f(p[p.length - 1][1]);
  };

  /* one vine: a meandering stem with leaves on alternating sides, and now and then a curl with a berry at its tip */
  function vine(svg, o) {
    var r = rng(o.seed), c = o.hue, s = o.scale, n = Math.max(8, Math.round(o.len / 10)), pts = [], ang = [];
    var dx = Math.cos(o.dir), dy = Math.sin(o.dir), nx = -dy, ny = dx, p1 = r() * 6.28, p2 = r() * 6.28;
    for (var i = 0; i <= n; i++) {
      var t = i * 10, ease = Math.min(1, t / 120), off = (o.wave * Math.sin(t / (150 * s) + p1) + o.wave * .45 * Math.sin(t / (61 * s) + p2)) * ease;
      pts.push([o.x + dx * t + nx * off, o.y + dy * t + ny * off]);
    }
    for (i = 0; i <= n; i++) { var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)]; ang.push(Math.atan2(b[1] - a[1], b[0] - a[0])); }
    var secs = 2.4 + o.len / 420, g = el('g', { 'class': 'vine' }, svg), d = smooth(pts);
    g.style.transformOrigin = f(o.x) + 'px ' + f(o.y) + 'px';
    g.style.animationDuration = (8 + r() * 5).toFixed(1) + 's';
    var stem = el('path', { 'class': 'v-stem', d: d, pathLength: 1, stroke: c.stem, 'stroke-width': f(2.6 * s) }, g);
    stem.style.transitionDuration = secs.toFixed(2) + 's';
    var shine = el('path', { 'class': 'v-shine', d: d, pathLength: 1, stroke: c.lite, 'stroke-width': f(1.5 * s) }, g);
    shine.style.animationDuration = (7 + r() * 4).toFixed(1) + 's'; shine.style.animationDelay = (secs + r() * 3).toFixed(1) + 's';   // counted from when it starts growing
    var side = r() < .5 ? 1 : -1, nextLeaf = 3 + (r() * 3 | 0), nextCurl = 7 + (r() * 5 | 0);
    for (i = 2; i < n - 1; i++) {
      var when = (i / n * secs).toFixed(2) + 's', taper = 1 - .45 * i / n;
      if (i === nextCurl) {
        nextCurl += 11 + (r() * 7 | 0); nextLeaf = i + 2;
        var cp = [pts[i].slice()], h = ang[i] + side * 1.05, k0 = 1 / (30 * s * taper), x = pts[i][0], y = pts[i][1];
        for (var j = 1; j <= 44; j++) { var q = j / 44; h += side * k0 * (1 + 7 * q * q) * 3.4 * s; x += Math.cos(h) * 3.4 * s; y += Math.sin(h) * 3.4 * s; cp.push([x, y]); }
        var curl = el('path', { 'class': 'v-curl', d: smooth(cp), pathLength: 1, stroke: c.stem, 'stroke-width': f(1.8 * s * taper) }, g);
        curl.style.transitionDelay = when;
        var berry = el('circle', { 'class': 'v-berry', cx: f(x), cy: f(y), r: f(3.6 * s * taper), fill: c.berry }, g);
        berry.style.transformOrigin = f(x) + 'px ' + f(y) + 'px'; berry.style.transitionDelay = ((i / n) * secs + 1.1).toFixed(2) + 's';
        side = -side;
      } else if (i >= nextLeaf) {
        nextLeaf = i + 3 + (r() * 3 | 0);
        var L = (17 + r() * 13) * s * taper, rot = (ang[i] + side * (.75 + r() * .4)) * 180 / Math.PI;
        var hold = el('g', { transform: 'translate(' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ') rotate(' + f(rot) + ')' }, g);
        var flut = el('g', { 'class': 'v-flut' }, hold);
        flut.style.animationDuration = (3.6 + r() * 3).toFixed(1) + 's'; flut.style.animationDelay = (-r() * 4).toFixed(1) + 's';
        var blade = el('g', { 'class': 'v-leaf' }, flut); blade.style.transitionDelay = when;
        el('path', { d: 'M0 0C' + f(.25 * L) + ' ' + f(-.42 * L) + ' ' + f(.72 * L) + ' ' + f(-.34 * L) + ' ' + f(L) + ' 0C' + f(.72 * L) + ' ' + f(.34 * L) + ' ' + f(.25 * L) + ' ' + f(.42 * L) + ' 0 0Z', fill: 'url(#vg-' + c.id + ')' }, blade);
        el('path', { d: 'M0 0L' + f(L * .9) + ' 0', stroke: c.lite, 'stroke-width': f(.9 * s), 'stroke-opacity': .55, fill: 'none' }, blade);
        side = -side;
      }
    }
  }

  /* where the vines go: "page" hugs the two sides of the screen, "room" frames the hero without crossing the words or the window */
  function plan(kind, W, H) {
    // the empty margin beside the text: the page padding, plus whatever is left over once the 1240px column is centred
    var pad = clamp(W * .04, 20, 56), margin = pad + Math.max(0, (W - 1240 - pad * 2) / 2), phone = W < 760;
    var edge = Math.min(62, margin * .5), wave = Math.min(34, edge * .5), s = phone ? .5 : clamp(margin / 150, .58, 1.1);
    if (kind === 'page') return [
      { x: edge, y: H + 24, dir: -Math.PI / 2, len: H * 1.04, wave: wave, hue: TEAL, seed: 11, scale: s },
      { x: W - edge, y: -24, dir: Math.PI / 2, len: H * 1.04, wave: wave, hue: PINK, seed: 29, scale: s },
      { x: edge + wave * 1.4, y: -24, dir: Math.PI / 2, len: H * .3, wave: wave * .6, hue: PINK, seed: 47, scale: s * .8 },
      { x: W - edge - wave * 1.4, y: H + 24, dir: -Math.PI / 2, len: H * .36, wave: wave * .6, hue: TEAL, seed: 83, scale: s * .8 }
    ];
    if (phone) return [
      { x: 9, y: H * .62, dir: -Math.PI / 2, len: H * .5, wave: 4, hue: TEAL, seed: 5, scale: .5 },
      { x: W - 9, y: -20, dir: Math.PI / 2, len: H * .56, wave: 4, hue: PINK, seed: 17, scale: .5 }
    ];
    var rs = clamp(W / 1440, .62, 1.1);   // the room has its own space: under the headline and to the right of the window
    return [
      { x: -24, y: H - clamp(H * .075, 44, 74), dir: 0, len: W * .4, wave: clamp(H * .028, 12, 26), hue: TEAL, seed: 7, scale: rs },
      { x: W - clamp(W * .05, 30, 78), y: -24, dir: Math.PI / 2, len: H * .78, wave: clamp(W * .022, 7, 34), hue: PINK, seed: 19, scale: rs },
      { x: clamp(W * .019, 12, 30), y: -24, dir: Math.PI / 2, len: H * .2, wave: 6, hue: PINK, seed: 61, scale: rs * .75 }
    ];
  }

  function build(box, grow) {
    var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    box.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, 'aria-hidden': 'true' }, box), defs = el('defs', {}, svg);
    [TEAL, PINK].forEach(function (c) {
      var lg = el('linearGradient', { id: 'vg-' + c.id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el('stop', { offset: 0, 'stop-color': c.lite }, lg); el('stop', { offset: .4, 'stop-color': c.a }, lg); el('stop', { offset: 1, 'stop-color': c.b }, lg);
    });
    plan(box.getAttribute('data-vines'), W, H).forEach(function (o) { vine(svg, o); });
    if (!grow || reduced) { svg.classList.add('instant', 'grown'); return; }
    var start = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('grown'); }); }); };
    if (!('IntersectionObserver' in window)) return start();
    new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { threshold: .05 }).observe(box);
  }

  var boxes = [].slice.call(doc.querySelectorAll('[data-vines]')), sizes = [], timer;
  boxes.forEach(function (b, i) { sizes[i] = b.clientWidth + 'x' + b.clientHeight; build(b, true); });
  addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { boxes.forEach(function (b, i) { var now = b.clientWidth + 'x' + b.clientHeight; if (now !== sizes[i]) { sizes[i] = now; build(b, false); } }); }, 220);
  });
})();
