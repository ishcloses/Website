/* scalD — the city.
   A procedural skyline drawn on canvas: windows are painted once into per-layer sheets and
   copied out each frame, the sky lives in the DOM, and the tallest tower is crowned with
   the floor-D mark. Used by the home scene (#city) and the closing skyline (#skyline). */
(function () {
  'use strict';
  var SC = window.SC || {};
  var reduced = !!SC.reduced, touch = !!SC.touch;
  var $ = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var out3 = function (t) { return 1 - Math.pow(1 - t, 3); };
  var inOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, al) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (al == null ? 1 : al) + ')'; }

  var SKY = { duskHor: [214, 136, 74], nightHor: [62, 42, 26], near: [9, 10, 17], far: [44, 40, 58], haze: [80, 58, 56] };
  var WARM = ['#F6CF7A', '#EDB65A', '#FFE3A3', '#F2C25E', '#FFD98C', '#E9A84A', '#FFF0C8', '#F9C66B'];
  var ROOFS = ['flat', 'flat', 'spire', 'step', 'antenna', 'slant'];
  /* the floor-D mark, same geometry as the logo (x, y, w, h in a 36 x 44 box) */
  var MARK = [[0, 0, 4.2, 44], [6.4, 0, 17.38, 3.2], [6.4, 5.83, 24.7, 3.2], [6.4, 11.66, 27.99, 3.2], [6.4, 17.49, 29.43, 3.2],
    [6.4, 23.31, 29.43, 3.2], [6.4, 29.14, 27.99, 3.2], [6.4, 34.97, 24.7, 3.2], [6.4, 40.8, 17.38, 3.2]];

  /* every window of a layer, painted once into an offscreen sheet; frames copy slices out of it */
  function atlas(L, W, dpr, rnd) {
    var minX = -W * .12, maxH = 0;
    L.b.forEach(function (b) { if (b.hf > maxH) maxH = b.hf; });
    var aw = Math.ceil(W * 1.26 * dpr), ah = Math.ceil((maxH + 4) * dpr);
    var c = document.createElement('canvas'); c.width = aw; c.height = ah;
    var x = c.getContext('2d');
    var cw = L.cw * dpr, ch = L.ch * dpr;
    var ww = Math.max(1, Math.round(cw * .56)), wh = Math.max(1, Math.round(ch * .48));
    L.b.forEach(function (b) {
      var fx = Math.round((b.x - minX) * dpr), fw = Math.floor(b.w * (1 - b.side) * dpr) - 1;
      var cols = Math.floor(fw / cw), rows = Math.floor((b.hf * dpr - ch * .5) / ch);
      for (var r = 0; r < rows; r++) {
        var wy = ah - Math.round(ch * .5 + (r + 1) * ch - ch * .26);
        for (var q = 0; q < cols; q++) {
          var wx = fx + Math.round(q * cw + cw * .22);
          if (rnd() < .6) { x.globalAlpha = .6 + rnd() * .4; x.fillStyle = WARM[(rnd() * WARM.length) | 0]; }
          else { x.globalAlpha = 1; x.fillStyle = 'rgba(150,170,215,.14)'; }
          x.fillRect(wx, wy, ww, wh);
        }
      }
    });
    return { c: c, minX: minX, ah: ah };
  }

  function sprites(R) {
    var d = document.createElement('canvas'), n = Math.max(64, Math.ceil(R * 2));
    d.width = d.height = n;
    var x = d.getContext('2d'), r = n / 2;
    var dg = x.createRadialGradient(r * .65, r * .65, r * .1, r, r, r);
    dg.addColorStop(0, '#FFF6D8'); dg.addColorStop(.55, '#EACB78'); dg.addColorStop(1, '#B98E3C');
    x.fillStyle = dg; x.beginPath(); x.arc(r, r, r - .5, 0, 6.2832); x.fill();
    x.fillStyle = 'rgba(150,110,45,.2)';
    [[.25, -.2, .22], [-.3, .15, .28], [.12, .36, .16], [-.06, -.42, .12], [.42, .18, .1]].forEach(function (m) {
      x.beginPath(); x.arc(r + m[0] * r, r + m[1] * r, m[2] * r, 0, 6.2832); x.fill();
    });
    var g = document.createElement('canvas'); g.width = g.height = 128;
    var y = g.getContext('2d'), gg = y.createRadialGradient(64, 64, 64 / 3.4 * .8, 64, 64, 64);
    gg.addColorStop(0, 'rgba(240,206,120,.3)'); gg.addColorStop(1, 'rgba(240,206,120,0)');
    y.fillStyle = gg; y.fillRect(0, 0, 128, 128);
    return { disc: d, glow: g };
  }

  function build(W, H, seed) {
    var rnd = rng(seed);
    var unit = W < 760 ? clamp(H / 900, .55, 1) : clamp(Math.min(W / 1280, H / 820), .55, 1.6);
    var cap = H * .5;
    var layers = [0, .24, .48, .74, 1].map(function (d) {
      var s = (.34 + .86 * d) * unit;
      var cw = Math.max(3, Math.round(3 + 4 * s)), ch = Math.max(4, Math.round(4 + 5.4 * s));
      var bs = [], x = -W * .1, wide = d < .3 ? 2.2 : 1;
      while (x < W * 1.1) {
        var w = (14 + rnd() * 24) * s * wide; if (rnd() < .14) w *= 1.7;
        w = Math.max(cw * 2, Math.round(w / cw) * cw);
        var cx = (x + w / 2) / W, r = rnd(), hf;
        if (r < .4) hf = (14 + rnd() * 30) * s;
        else if (r < .78) hf = (56 + rnd() * 110) * s;
        else hf = (140 + rnd() * 220) * s;
        if (d < .9) hf *= 1 + .85 * Math.exp(-Math.pow(cx - .5, 2) / .05) * (1 - d * .5);
        else hf *= .5;
        hf = Math.min(hf, cap);
        var h0 = Math.min(hf, (8 + rnd() * 18) * s), grows = hf - h0 > 8 * s;
        bs.push({
          x: x, w: w, h0: h0, hf: hf, grows: grows,
          t0: grows ? Math.min(.72, rnd() * .42 + Math.min(1, hf / (380 * s)) * .32) : 0,
          dur: .12 + rnd() * .18, roof: ROOFS[(rnd() * ROOFS.length) | 0],
          crane: grows && hf > 64 * s && rnd() < .5, side: .14 + rnd() * .12,
          town: .2 + rnd() * .55, litD: rnd() * .08, seed: rnd() * 100,
          edge: hf > 150 * s && rnd() < .45
        });
        x += w + (rnd() < .3 ? rnd() * 12 * s : rnd() * 2 * s);
      }
      var cars = [];
      if (d > .4) for (var i = 0, n = Math.round(W / 40 * s); i < n; i++) cars.push({ o: rnd() * W * 1.3, v: (16 + rnd() * 38) * s, dir: rnd() < .5 ? 1 : -1, lane: rnd() });
      return { d: d, s: s, cw: cw, ch: ch, b: bs, cars: cars };
    });
    /* the scalD tower: tallest, centred, the last to top out, crowned with the mark */
    var L = layers[2], s2 = L.s, tw = Math.max(L.cw * 6, Math.round(56 * s2 / L.cw) * L.cw);
    var tower = { x: W * .5 - tw / 2, w: tw, h0: 16 * s2, hf: H * .44, grows: true, t0: .5, dur: .32, roof: 'crown', crane: true, side: .2, town: .3, litD: 0, seed: 7, edge: true, hero: true };
    L.b = L.b.filter(function (b) { return b.x + b.w < tower.x - 3 || b.x > tower.x + tower.w + 3; });
    L.b.push(tower);
    var stars = [], clouds = [];
    for (var i = 0; i < 200; i++) stars.push({ x: rnd(), y: rnd(), r: rnd() < .9 ? .6 + rnd() * .7 : 1.3 + rnd(), ph: rnd() * 6.28 });
    for (i = 0; i < 7; i++) clouds.push({ x: rnd(), y: .18 + rnd() * .3, w: .18 + rnd() * .3, h: .012 + rnd() * .02 });
    return { layers: layers, stars: stars, clouds: clouds };
  }

  function City(cv, opts) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.o = opts;
    this.W = 0; this.H = 0; this.dpr = 0; this.D = null; this.q = 1; this.ema = null; this.fema = null; this.n = 0;
  }
  City.prototype.size = function () {
    var W = Math.max(1, this.cv.clientWidth), H = Math.max(1, this.cv.clientHeight);
    var dpr = clamp(Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(this.o.budget * this.q / (W * H))), .6, 2);
    var fresh = false;
    if (!this.D || W !== this.W || H !== this.H) { this.W = W; this.H = H; this.D = build(W, H, this.o.seed); fresh = true; }
    if (fresh || Math.abs(dpr - this.dpr) > .01) {
      this.dpr = dpr;
      this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
      var seed = this.o.seed;
      this.D.layers.forEach(function (L, i) { L.atlas = atlas(L, W, dpr, rng(seed * 31 + i * 7)); });
      this.sp = sprites(Math.min(W, H) * .16 * dpr);
      return true;
    }
    return false;
  };
  /* a machine that can't keep up gets a softer canvas, never dropped frames */
  City.prototype.track = function (drawMs, frameMs) {
    this.ema = this.ema == null ? drawMs : this.ema * .9 + drawMs * .1;
    if (frameMs > 0 && frameMs < 120) this.fema = this.fema == null ? frameMs : this.fema * .9 + frameMs * .1;
    if (++this.n < 60) return;
    if ((this.ema > 7.5 || (this.fema && this.fema > 21)) && this.q > .35) { this.q *= .72; this.n = 0; this.ema = this.fema = null; this.size(); }
  };

  City.prototype.draw = function (st) {
    var ctx = this.ctx, W = this.W, H = this.H, D = this.D;
    if (!D) return;
    var g = st.g, night = st.night, t = st.t;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var shift = g * H * .04, hy = H * st.horizon + shift;
    if (st.zoom !== 1) { ctx.translate(W / 2, H * .5); ctx.scale(st.zoom, st.zoom); ctx.translate(-W / 2, -H * .5); }
    var hor = mix(SKY.duskHor, SKY.nightHor, night);

    if (!this.o.clearSky) {
      ctx.imageSmoothingEnabled = true;
      var ca = (1 - night) * .5;
      if (ca > .01) {
        ctx.fillStyle = 'rgba(255,196,150,.09)'; ctx.globalAlpha = ca;
        for (var c = 0; c < D.clouds.length; c++) {
          var cl = D.clouds[c];
          ctx.beginPath(); ctx.ellipse(cl.x * W, hy - H * .6 + cl.y * H * .55 - shift * .5, cl.w * W, cl.h * H, 0, 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      var sa = clamp(night * 1.3 - .4, 0, 1) * .8;
      if (sa > .01) {
        ctx.fillStyle = '#FFF6DE';
        for (var i = 0; i < D.stars.length; i++) {
          var s = D.stars[i], y = s.y * H * 1.2 - H * .2;
          if (y > hy - 24 || y < -4) continue;
          ctx.globalAlpha = sa * (.55 + .45 * Math.sin(t * 1.6 + s.ph));
          ctx.fillRect(s.x * W, y, s.r, s.r);
        }
        ctx.globalAlpha = 1;
      }
      var m = Math.min(W, H), mxp = lerp(W * .62, W * .78, g) - st.mx * 4, myp = lerp(H * .3, H * .17, g), mr = lerp(m * .03, m * .036, g);
      ctx.globalAlpha = .75 + .25 * night;
      ctx.drawImage(this.sp.glow, mxp - mr * 2.8, myp - mr * 2.8, mr * 5.6, mr * 5.6);
      ctx.drawImage(this.sp.disc, mxp - mr, myp - mr, mr * 2, mr * 2);
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = st.zoom !== 1;
    if (hy < H) { ctx.fillStyle = '#06060B'; ctx.fillRect(0, hy, W, H - hy + 2); }

    for (var li = 0; li < D.layers.length; li++) {
      var L = D.layers[li], d = L.d;
      var base = Math.round((hy + 5 + d * d * H * .3) * this.dpr) / this.dpr;
      if (li === 2) {
        ctx.fillStyle = rgba(mix(hor, SKY.haze, .5));
        for (var hb = 0; hb < 6; hb++) { ctx.globalAlpha = .035 * (hb + 1); ctx.fillRect(0, hy - H * .4 + hb * H * .4 / 6, W, H * .4 / 6 + (hb === 5 ? 8 : .5)); }
        ctx.globalAlpha = 1;
      }
      var px = -st.mx * 12 * d;
      var body = mix(SKY.near, mix(SKY.far, hor, .25), (1 - d) * .7);
      var bodyC = rgba(body), sideC = rgba(mix(body, [0, 0, 0], .38));
      for (var bi = 0; bi < L.b.length; bi++) this.building(ctx, L, L.b[bi], base, px, g, night, t, bodyC, sideC);
      if (L.cars.length && base < H + 4) this.cars(ctx, L, base, px, t, night, W);
    }
    if (this.o.clearSky) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      var fade = ctx.createLinearGradient(0, 0, 0, H * .45);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  City.prototype.building = function (ctx, L, b, base, px, g, night, t, bodyC, sideC) {
    var s = L.s, W = this.W, H = this.H, dpr = this.dpr;
    var x = Math.round((b.x + px) * dpr) / dpr;
    if (x > W + 40 || x + b.w < -40) return;
    var k = b.grows ? clamp((g - b.t0) / b.dur, 0, 1) : 1;
    var h = b.h0 + (b.hf - b.h0) * out3(k);
    var top = base - h, rising = b.grows && k > 0 && k < 1;
    if (top - 80 * s > H) return;
    var skel = rising ? Math.min(h * .16, 30 * s) : 0, bt = top + skel, bh = Math.min(base, H + 2) - bt + 2;
    ctx.fillStyle = bodyC; ctx.fillRect(x, bt, b.w, bh);
    ctx.fillStyle = sideC; ctx.fillRect(x + b.w * (1 - b.side), bt, b.w * b.side, bh);

    /* windows hang from the base, so new floors appear as the building rises */
    var A = L.atlas, sh = Math.round((base - bt) * dpr);
    if (A && sh > 1) {
      var lit;
      if (!b.grows) lit = clamp(b.town + g * .6, 0, 1);
      else if (k <= 0) lit = b.town;
      else lit = clamp((g - b.t0 - b.dur * .7 - b.litD) / .08, 0, 1);
      lit *= .5 + .5 * night;
      if (b.hero && k >= 1) lit = 1;
      var sx = Math.round((b.x - A.minX) * dpr), sw = Math.floor(b.w * (1 - b.side) * dpr);
      sh = Math.min(sh, A.ah);
      ctx.globalAlpha = .15 + .85 * lit;
      ctx.drawImage(A.c, sx, A.ah - sh, sw, sh, x, base - sh / dpr, sw / dpr, sh / dpr);
      ctx.globalAlpha = 1;
    }

    if (skel > 0) {
      ctx.strokeStyle = 'rgba(222,186,104,.55)'; ctx.lineWidth = Math.max(.6, .7 * s);
      ctx.beginPath();
      for (var vx = x; vx <= x + b.w + .1; vx += L.cw * 2) { ctx.moveTo(vx + .5, top); ctx.lineTo(vx + .5, bt); }
      for (var vy = bt; vy >= top - .1; vy -= L.ch) { ctx.moveTo(x, vy + .5); ctx.lineTo(x + b.w, vy + .5); }
      ctx.stroke();
    }

    if (b.crane && rising) {
      var ca = Math.min(1, k / .05, (1 - k) / .05);
      var mx = x + b.w * .64, my = top - 44 * s, a = Math.sin(t * .32 + b.seed) * 1.1, jl = 70 * s, jx = Math.cos(a) * jl;
      var hx = mx + jx * .72, hk = my + 18 * s + Math.sin(t * .7 + b.seed) * 5 * s;
      ctx.globalAlpha = ca; ctx.strokeStyle = 'rgba(230,196,112,.9)'; ctx.lineWidth = Math.max(.8, 1.1 * s);
      ctx.beginPath();
      ctx.moveTo(mx, top); ctx.lineTo(mx, my - 10 * s);
      ctx.moveTo(mx - jx * .32, my); ctx.lineTo(mx + jx, my);
      ctx.moveTo(mx, my - 10 * s); ctx.lineTo(mx + jx * .62, my);
      ctx.moveTo(mx, my - 10 * s); ctx.lineTo(mx - jx * .3, my);
      ctx.moveTo(hx, my); ctx.lineTo(hx, hk);
      ctx.stroke();
      ctx.fillStyle = 'rgba(230,196,112,.95)'; ctx.fillRect(hx - 2 * s, hk, 4 * s, 3 * s);
      if (Math.sin(t * 3 + b.seed) > .25) { ctx.fillStyle = '#FF6A4D'; ctx.fillRect(mx + jx - 1.2, my - 1.2, 2.6, 2.6); }
      ctx.globalAlpha = 1;
    }

    if (!rising && k >= 1) {
      var cxr = x + b.w / 2;
      ctx.fillStyle = bodyC;
      if (b.roof === 'step') { ctx.fillRect(x + b.w * .16, top - 10 * s, b.w * .68, 10 * s); ctx.fillRect(x + b.w * .33, top - 17 * s, b.w * .34, 7 * s); }
      else if (b.roof === 'slant') { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + b.w, top - Math.min(b.w * .4, 30 * s)); ctx.lineTo(x + b.w, top); ctx.fill(); }
      else if (b.roof === 'flat') ctx.fillRect(x + b.w * .2, top - 4 * s, b.w * .26, 4 * s);
      if (b.roof === 'spire' || b.roof === 'antenna') {
        var tip = b.roof === 'spire' ? 26 * s : 22 * s, ax = b.roof === 'spire' ? cxr : x + b.w * .7;
        ctx.strokeStyle = '#1C1C2A'; ctx.lineWidth = Math.max(.8, s);
        ctx.beginPath(); ctx.moveTo(ax, top); ctx.lineTo(ax, top - tip);
        if (b.roof === 'antenna') { ctx.moveTo(x + b.w * .3, top); ctx.lineTo(x + b.w * .3, top - 14 * s); }
        ctx.stroke();
        if (Math.sin(t * 2.2 + b.seed) > 0) { ctx.fillStyle = 'rgba(255,92,71,.95)'; ctx.fillRect(ax - 1.3, top - tip - 1.3, 2.6, 2.6); }
      }
      if (b.edge) {
        var ew = Math.max(1, .8 * s), eh = Math.min(base, H + 2) - top;
        ctx.fillStyle = 'rgba(242,200,110,' + (.22 + .38 * night).toFixed(3) + ')';
        ctx.fillRect(x, top, ew, eh); ctx.fillRect(x + b.w - ew, top, ew, eh);
      }
      if (b.hero) this.crown(ctx, x, b.w, top, s, night, bodyC);
    }
  };

  /* the tower's crown: a stepped setback carrying the floor-D mark in gold light */
  City.prototype.crown = function (ctx, x, w, top, s, night, bodyC) {
    var cxr = x + w / 2;
    ctx.fillStyle = bodyC;
    ctx.fillRect(x + w * .12, top - 12 * s, w * .76, 12 * s);
    ctx.fillStyle = 'rgba(242,206,120,.85)';
    ctx.fillRect(x + w * .12, top - 12 * s, w * .76, Math.max(1, s));
    var mh = Math.max(26, 58 * s), mw = mh * 36 / 44, mx0 = cxr - mw / 2, my0 = top - 22 * s - mh;
    var gr = ctx.createRadialGradient(cxr, my0 + mh / 2, 0, cxr, my0 + mh / 2, mh * 1.3);
    gr.addColorStop(0, 'rgba(242,200,110,' + (.32 * (.5 + .5 * night)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(242,200,110,0)');
    ctx.fillStyle = gr; ctx.fillRect(cxr - mh * 1.3, my0 + mh / 2 - mh * 1.3, mh * 2.6, mh * 2.6);
    ctx.fillStyle = 'rgba(244,212,130,' + (.75 + .25 * night).toFixed(3) + ')';
    for (var i = 0; i < MARK.length; i++) {
      var r = MARK[i];
      ctx.fillRect(mx0 + r[0] / 36 * mw, my0 + r[1] / 44 * mh, r[2] / 36 * mw, r[3] / 44 * mh);
    }
  };

  City.prototype.cars = function (ctx, L, base, px, t, night, W) {
    var s = L.s, span = W * 1.3, a = .35 + .55 * night;
    var cw = Math.max(1.3, 1.8 * s), chh = Math.max(1, 1.1 * s), len = 10 * s;
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? '#FF5A47' : '#FFE9B8';
      for (var i = 0; i < L.cars.length; i++) {
        var c = L.cars[i];
        if ((c.dir < 0) !== !!pass) continue;
        var xx = ((c.o + t * c.v * c.dir) % span + span) % span - W * .15 + px;
        var y = base - 1.4 * s - c.lane * 1.8 * s;
        ctx.globalAlpha = a; ctx.fillRect(xx, y, cw, chh);
        ctx.globalAlpha = a * .32; ctx.fillRect(c.dir > 0 ? xx - len : xx + cw, y, len, chh);
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- the window ---------- */
  function buildRoom(svg, W, H) {
    if (W < 50 || H < 50) return { cx: W / 2, cy: H / 2 };
    var mobile = W < 760;
    var gw = mobile ? W * .7 : clamp(W * .34, 300, 620), gh = mobile ? H * .42 : Math.min(H * .64, gw * 1.36);
    var cx = W / 2, cy = mobile ? H * .47 : H * .5;
    var x0 = cx - gw / 2, y0 = cy - gh / 2, x1 = cx + gw / 2, y1 = cy + gh / 2;
    var dp = gw * .075, ix0 = x0 + dp, iy0 = y0 + dp * .9, ix1 = x1 - dp, iy1 = y1 - dp * .45;
    var fw = Math.max(5, gw * .018), tr = iy0 + (iy1 - iy0) * .2, R = Math.max(W, H);
    var f = function (n) { return n.toFixed(1); };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML =
      '<defs>' +
      '<radialGradient id="wl" gradientUnits="userSpaceOnUse" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * .78) + '"><stop offset="0" stop-color="#2E2316"/><stop offset=".34" stop-color="#16110B"/><stop offset="1" stop-color="#070605"/></radialGradient>' +
      '<linearGradient id="rt" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(y0) + '" x2="0" y2="' + f(iy0) + '"><stop offset="0" stop-color="#0A0806"/><stop offset="1" stop-color="#1B150E"/></linearGradient>' +
      '<linearGradient id="rb" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(iy1) + '" x2="0" y2="' + f(y1) + '"><stop offset="0" stop-color="#4A3920"/><stop offset="1" stop-color="#1E170E"/></linearGradient>' +
      '<linearGradient id="rl" gradientUnits="userSpaceOnUse" x1="' + f(x0) + '" y1="0" x2="' + f(ix0) + '" y2="0"><stop offset="0" stop-color="#0E0B08"/><stop offset="1" stop-color="#241C12"/></linearGradient>' +
      '<linearGradient id="rr" gradientUnits="userSpaceOnUse" x1="' + f(x1) + '" y1="0" x2="' + f(ix1) + '" y2="0"><stop offset="0" stop-color="#0B0907"/><stop offset="1" stop-color="#1C160E"/></linearGradient>' +
      '<linearGradient id="sh" gradientUnits="userSpaceOnUse" x1="' + f(ix0) + '" y1="' + f(iy0) + '" x2="' + f(ix1) + '" y2="' + f(iy1) + '"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF1D6" stop-opacity=".07"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#FFF1D6" stop-opacity=".035"/><stop offset=".86" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '</defs>' +
      '<path fill="url(#wl)" fill-rule="evenodd" d="M' + f(-W) + ' ' + f(-H) + 'H' + f(2 * W) + 'V' + f(2 * H) + 'H' + f(-W) + 'Z M' + f(x0) + ' ' + f(y0) + 'V' + f(y1) + 'H' + f(x1) + 'V' + f(y0) + 'Z"/>' +
      '<polygon fill="url(#rt)" points="' + [x0, y0, x1, y0, ix1, iy0, ix0, iy0].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rb)" points="' + [x0, y1, ix0, iy1, ix1, iy1, x1, y1].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rl)" points="' + [x0, y0, ix0, iy0, ix0, iy1, x0, y1].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rr)" points="' + [x1, y0, x1, y1, ix1, iy1, ix1, iy0].map(f).join(' ') + '"/>' +
      '<rect x="' + f(ix0) + '" y="' + f(iy0) + '" width="' + f(ix1 - ix0) + '" height="' + f(iy1 - iy0) + '" fill="url(#sh)"/>' +
      '<rect x="' + f(ix0) + '" y="' + f(tr) + '" width="' + f(ix1 - ix0) + '" height="' + f(fw * 1.1) + '" fill="#1E1810"/>' +
      '<rect x="' + f(ix0) + '" y="' + f(tr) + '" width="' + f(ix1 - ix0) + '" height="1" fill="#E8CB7A" fill-opacity=".22"/>' +
      '<rect x="' + f(ix0) + '" y="' + f(iy0) + '" width="' + f(ix1 - ix0) + '" height="' + f(iy1 - iy0) + '" fill="none" stroke="#231C12" stroke-width="' + f(fw) + '"/>' +
      '<rect x="' + f(ix0 + fw / 2 + .5) + '" y="' + f(iy0 + fw / 2 + .5) + '" width="' + f(Math.max(0, ix1 - ix0 - fw - 1)) + '" height="' + f(Math.max(0, iy1 - iy0 - fw - 1)) + '" fill="none" stroke="#E8CB7A" stroke-opacity=".2" stroke-width="1"/>' +
      '<line x1="' + f(x0) + '" y1="' + f(y1) + '" x2="' + f(x1) + '" y2="' + f(y1) + '" stroke="#E8CB7A" stroke-opacity=".32" stroke-width="1.5"/>';
    return { cx: cx, cy: cy };
  }

  var mem = {};
  function set(key, el, prop, val) { if (mem[key] !== val) { mem[key] = val; el.style[prop] = val; } }
  function cls(key, el, name, on) { if (mem[key] !== on) { mem[key] = on; el.classList.toggle(name, on); } }
  var t0 = performance.now(), mx = 0, tmx = 0;
  addEventListener('pointermove', function (e) { mx = e.clientX / innerWidth * 2 - 1; }, { passive: true });

  /* ================= the home scene: the window opens, the city is built ================= */
  var scene = $('#top'), stage = $('#stage');
  if (scene && stage && $('#city')) {
    var room = $('#room'), svg = $('#room-svg'), hero = $('#hero'), line = $('#scene-line');
    var hl = [].slice.call(document.querySelectorAll('.hl'));
    var sky = $('#sky'), skyDusk = $('#sky-dusk'), skyNight = $('#sky-night'), skyGlow = $('#sky-glow');
    var city = new City($('#city'), { seed: 11, budget: touch ? 2e6 : 3.8e6 });
    var geo = { top: 0, h: 0, span: 1, vh: 0, R: 0 }, PS = -1, lastFrame = 0;
    var measure = function () {
      geo.vh = stage.clientHeight || innerHeight; geo.top = scene.offsetTop; geo.h = scene.offsetHeight; geo.span = Math.max(1, geo.h - geo.vh);
      SC.solidAt = geo.top + geo.span - 60;
    };
    var layout = function () {
      city.size();
      var W = stage.clientWidth, H = stage.clientHeight, o = buildRoom(svg, W, H);
      room.style.transformOrigin = o.cx + 'px ' + o.cy + 'px';
      measure();
      geo.R = Math.max(W, H) * .7;
      skyDusk.style.height = skyNight.style.height = (H * 3.15).toFixed(1) + 'px';
      skyGlow.style.width = skyGlow.style.height = (geo.R * 2).toFixed(1) + 'px';
      skyGlow.style.left = (W / 2 - geo.R).toFixed(1) + 'px';
      PS = -1; mem = {};
    };
    var lastW = innerWidth, lastH = innerHeight, rt = 0;
    addEventListener('resize', function () {
      var w = innerWidth, h = innerHeight;
      if (touch && w === lastW && Math.abs(h - lastH) < 160) return;   /* the mobile toolbar sliding in and out */
      lastW = w; lastH = h;
      clearTimeout(rt); rt = setTimeout(layout, 120);
    });
    if (window.ResizeObserver) new ResizeObserver(measure).observe(scene);
    layout();

    SC.ticks.push(function (now, y) {
      var dt = lastFrame ? now - lastFrame : 0; lastFrame = now;
      var P = clamp((y - geo.top) / geo.span, 0, 1);
      var on = y < geo.top + geo.h && y + geo.vh > geo.top;
      if (!on) { SC.dockHold = false; return; }
      PS = (PS < 0 || SC.lenis || touch || reduced) ? P : PS + (P - PS) * .22;
      if (Math.abs(P - PS) < .0002) PS = P;
      var p = PS, zi = seg(p, 0, .34);
      var ro = 1 - seg(p, .25, .35);
      set('rt', room, 'transform', 'scale(' + (1 + Math.pow(zi, 2.2) * 3.8).toFixed(4) + ')');
      set('ro', room, 'opacity', ro.toFixed(3));
      set('rv', room, 'visibility', ro <= 0 ? 'hidden' : 'visible');
      var hk = seg(p, 0, .15);
      set('ho', hero, 'opacity', (1 - hk).toFixed(3));
      set('hv', hero, 'visibility', hk >= 1 ? 'hidden' : 'visible');
      var hx = (hk * 9).toFixed(2);
      set('h0', hl[0], 'transform', 'translate3d(-' + hx + 'vw,0,0)');
      set('h1', hl[1], 'transform', 'translate3d(-' + hx + 'vw,0,0)');
      set('h2', hl[2], 'transform', 'translate3d(' + hx + 'vw,0,0)');
      var lineOn = p > .5;
      cls('ln', line, 'on', lineOn);
      cls('dim', stage, 'dim', lineOn);
      SC.dockHold = p < .12;
      tmx += (mx - tmx) * .05;
      var st = { g: seg(p, .1, .9), night: seg(p, .05, .8), zoom: 1 + inOut(zi) * .12, t: reduced ? 6 : (now - t0) / 1000, mx: reduced ? 0 : tmx, horizon: .6 };
      var H = geo.vh, hy = H * .6 + st.g * H * .04, sy = (hy - 3.15 * H).toFixed(1);
      set('sz', sky, 'transform', 'scale(' + st.zoom.toFixed(4) + ')');
      set('sd', skyDusk, 'transform', 'translate3d(0,' + sy + 'px,0)');
      set('sn', skyNight, 'transform', 'translate3d(0,' + sy + 'px,0)');
      set('so', skyNight, 'opacity', st.night.toFixed(3));
      set('gt', skyGlow, 'transform', 'translate3d(0,' + (hy - geo.R).toFixed(1) + 'px,0)');
      set('go', skyGlow, 'opacity', (.1 + .24 * st.g * (.4 + .6 * st.night)).toFixed(3));
      var d0 = performance.now();
      city.draw(st);
      if (!reduced) city.track(performance.now() - d0, dt);
    });
    if (/[?&]debug/.test(location.search)) window.__scald = {
      city: city, go: function (y) { if (SC.lenis) SC.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }
    };
  }

  /* ================= the closing skyline: a still picture, drawn once when it comes into view ================= */
  var sk = $('#skyline');
  if (sk) {
    var sky2 = new City(sk, { seed: 23, clearSky: true, budget: 2.4e6 }), dirty = true;
    var paint = function () { if (!dirty) return; dirty = false; sky2.size(); sky2.draw({ g: 1, night: 1, zoom: 1, t: 6, mx: 0, horizon: .5 }); };
    addEventListener('resize', function () { dirty = true; });
    if ('IntersectionObserver' in window) {
      var vis = false;
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) paint(); }, { rootMargin: '0px 0px 300px 0px' }).observe(sk);
      SC.ticks.push(function () { if (vis && dirty) paint(); });
    } else paint();
  }
})();
