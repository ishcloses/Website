/* scalD rebrand: dandelion seeds drifting on the wind, and the dandelion in the hero that lets them go. Decoration only.
   Everything is drawn from a few numbers, so it fits any screen size. The motion itself is CSS (transform and opacity). */
(function () {
  'use strict';
  var doc = document;
  var rng = function (seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; };
  var f = function (n) { return n.toFixed(1); };
  var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
  var rad = Math.PI / 180;

  /* one seed: a fan of fine bristles on a thin stalk, with the seed itself hanging underneath */
  function seedSVG(r) {
    var d = '', dots = '';
    for (var i = 0; i < 15; i++) {
      var a = (-170 + i * (160 / 14) + (r() - .5) * 7) * rad, L = 34 + r() * 12, x = 50 + L * Math.cos(a), y = 56 + L * Math.sin(a);
      d += 'M50 56Q' + f(50 + L * .5 * Math.cos(a) + (r() - .5) * 5) + ' ' + f(56 + L * .5 * Math.sin(a) - 4) + ' ' + f(x) + ' ' + f(y);
      dots += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="1.2"/>';
    }
    return '<svg viewBox="0 0 100 146" aria-hidden="true"><path d="' + d + 'M50 56L50 128" stroke-width=".75" vector-effect="non-scaling-stroke"/>' +
      '<g fill="currentColor" stroke="none">' + dots + '<ellipse cx="50" cy="134" rx="2.5" ry="7.5"/></g></svg>';
  }

  /* the dandelion head: a ball of the same seeds on a long stem, with a gap on the windward side where some have already left */
  function puffSVG(R, tall, r) {
    var c = R + 12, d = '', dots = '';
    for (var i = 0; i < 58; i++) {
      var deg = i * (360 / 58) + (r() - .5) * 7, gone = deg > 285 && deg < 345 && r() < .7;
      if (gone) continue;
      var a = deg * rad, L = R * (.76 + r() * .24), x = c + L * Math.cos(a), y = c + L * Math.sin(a);
      d += 'M' + f(c + R * .1 * Math.cos(a)) + ' ' + f(c + R * .1 * Math.sin(a)) + 'L' + f(x) + ' ' + f(y);
      for (var k = -2; k <= 2; k++) { var b = a + k * 22 * rad; d += 'M' + f(x) + ' ' + f(y) + 'L' + f(x + R * .17 * Math.cos(b)) + ' ' + f(y + R * .17 * Math.sin(b)); }
      dots += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="1"/>';
    }
    var w = c * 2;
    return '<svg viewBox="0 0 ' + f(w) + ' ' + f(tall) + '" aria-hidden="true"><path d="M' + f(c) + ' ' + f(c) + 'Q' + f(c + R * .25) + ' ' + f(c + (tall - c) * .5) + ' ' + f(c - R * .3) + ' ' + f(tall) + '" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-opacity=".7"/>' +
      '<path d="' + d + '" stroke-width=".7" vector-effect="non-scaling-stroke"/><g fill="currentColor" stroke="none">' + dots + '<circle cx="' + f(c) + '" cy="' + f(c) + '" r="' + f(R * .09) + '"/></g></svg>';
  }

  function seed(box, r, o) {
    var el = doc.createElement('span'), t = o.t[0] + r() * (o.t[1] - o.t[0]);
    el.className = 'seed';
    el.style.cssText = '--x:' + f(o.x) + 'px;--y:' + f(o.y) + 'px;--s:' + f(o.s) + 'px;--dx:' + f(o.dx) + 'px;--dy:' + f(o.dy) + 'px;--o:' + o.o.toFixed(2) +
      ';--t:' + t.toFixed(1) + 's;--d:-' + (r() * t).toFixed(1) + 's;--w:' + (3.4 + r() * 3.4).toFixed(1) + 's';
    el.innerHTML = '<span class="seed-sway">' + seedSVG(r) + '</span>';
    box.appendChild(el);
  }

  function build(box) {
    var W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    var kind = box.getAttribute('data-seeds'), phone = W < 760, r = rng(kind === 'room' ? 41 : 97), i;
    box.innerHTML = '';
    if (kind === 'room') {
      /* the dandelion stands in the gap between the headline and the window, and its seeds blow up and to the right */
      var R = clamp(H * .085, 46, 82), hx = phone ? -999 : W * .485, hy = H * .78;
      if (!phone) {
        var puff = doc.createElement('div'), top = hy - R - 12, tall = H - top + 24;
        puff.className = 'puff'; puff.style.cssText = 'left:' + f(hx - R - 12) + 'px;top:' + f(top) + 'px;width:' + f(R * 2 + 24) + 'px';
        puff.innerHTML = puffSVG(R, tall, r); box.appendChild(puff);
      }
      for (i = 0; i < (phone ? 5 : 10); i++) {
        var off = phone || i > 6;   // most leave from the dandelion, a few are already on the air
        seed(box, r, { x: off ? -40 + r() * W * .5 : hx + (r() - .2) * R * 1.3, y: off ? H * (.45 + r() * .55) : hy - R * (.4 + r() * .9), s: (phone ? 15 : 22) + r() * (phone ? 14 : 30),
          dx: W * (.3 + r() * .5), dy: -H * (.3 + r() * .55), o: .35 + r() * .5, t: [15, 30] });
      }
      return;
    }
    for (i = 0; i < (phone ? 6 : 12); i++) {
      seed(box, r, { x: -60 + r() * W * .7, y: H * (.3 + r() * .8), s: (phone ? 13 : 16) + r() * (phone ? 15 : 32), dx: W * (.45 + r() * .65), dy: -H * (.25 + r() * .55), o: .2 + r() * .38, t: [22, 46] });
    }
  }

  var boxes = [].slice.call(doc.querySelectorAll('[data-seeds]')), sizes = [], timer;
  boxes.forEach(function (b, i) { sizes[i] = b.clientWidth + 'x' + b.clientHeight; build(b); });
  addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { boxes.forEach(function (b, i) { var now = b.clientWidth + 'x' + b.clientHeight; if (now !== sizes[i]) { sizes[i] = now; build(b); } }); }, 220);
  });
})();
