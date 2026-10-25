/* scalD — the city.
   A procedural skyline on canvas, drawn at up to twice the screen's resolution. Every building is
   seen in perspective from the middle of the window, so it shows the side that faces you; tall ones
   step back in tiers, glass towers catch the sky, and the windows are painted once into a sheet per
   layer (plus a soft copy that makes the nearest lights glow) and copied out each frame.
   Used by the home scene (#city) and the closing skyline (#skyline). */
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

  var SKY = { duskHor: [214, 136, 74], nightHor: [62, 42, 26], near: [12, 13, 20], far: [54, 50, 72], haze: [98, 72, 66], glassD: [38, 48, 80], glassN: [13, 17, 32] };
  var WARM = ['#FFD68C', '#F5C266', '#FFE6AE', '#F0B65A', '#FFDB97', '#E9A64C', '#FFF1D0', '#FBCB72'];
  var COOL = ['#E4ECFF', '#CFDDF7', '#F2F5FF', '#C2D4F2'];
  var STYLE = ['grid', 'grid', 'grid', 'grid', 'ribbon', 'ribbon', 'glass', 'deco'];
  var ROOFS = ['flat', 'flat', 'tank', 'tank', 'spire', 'antenna', 'slant', 'box', 'step'];
  /* the floor-D mark, same geometry as the logo (x, y, w, h in a 36 x 44 box) */
  var MARK = [[0, 0, 4.2, 44], [6.4, 0, 17.38, 3.2], [6.4, 5.83, 24.7, 3.2], [6.4, 11.66, 27.99, 3.2], [6.4, 17.49, 29.43, 3.2],
    [6.4, 23.31, 29.43, 3.2], [6.4, 29.14, 27.99, 3.2], [6.4, 34.97, 24.7, 3.2], [6.4, 40.8, 17.38, 3.2]];

  /* one window into the sheet: lit (warm homes, cool offices, some with the blinds half down) or dark glass */
  function pane(x, wx, wy, w, h, on, cool, k, blinds, rnd) {
    wx = Math.round(wx);
    if (on) {
      var pal = cool ? COOL : WARM;
      x.globalAlpha = (.55 + rnd() * .45) * k; x.fillStyle = pal[(rnd() * pal.length) | 0];
      x.fillRect(wx, wy, w, h);
      if (blinds && rnd() < .22) { x.globalAlpha = .55 * k; x.fillStyle = '#1A130A'; x.fillRect(wx, wy, w, Math.max(1, Math.round(h * (.25 + rnd() * .45)))); }
    } else {
      x.globalAlpha = (.05 + rnd() * .1) * k; x.fillStyle = '#9BB0DA'; x.fillRect(wx, wy, w, h);
    }
  }

  /* every window of a layer, painted once: the front of each tier at full width, the side in perspective */
  function atlas(L, W, dpr, rnd) {
    var minX = -W * .16, maxH = 0;
    L.b.forEach(function (b) { if (b.hf > maxH) maxH = b.hf; });
    var aw = Math.ceil((W * 1.42 + 80) * dpr), ah = Math.ceil((maxH + 6) * dpr);
    var c = document.createElement('canvas'); c.width = aw; c.height = ah;
    var x = c.getContext('2d');
    var cw = L.cw * dpr, ch = L.ch * dpr;
    L.b.forEach(function (b) {
      var st = b.style;
      var ww = st === 'glass' ? .94 : st === 'ribbon' ? .86 : st === 'deco' ? .4 : .56;
      var wh = st === 'glass' ? .64 : st === 'deco' ? .66 : .48;
      var homes = st === 'grid' || st === 'deco';
      b.tiers.forEach(function (t) {
        var tw = (t.x1 - t.x0) * dpr, sw = tw * b.side, fw = tw - sw;
        var fx = (t.x0 - minX) * dpr + (b.sideL ? sw : 0), sx = (t.x0 - minX) * dpr + (b.sideL ? 0 : fw);
        var r0 = Math.max(0, Math.ceil((t.y0 * dpr - ch * .5) / ch)), r1 = Math.floor((t.y1 * dpr - ch * .5) / ch);
        var cols = Math.max(0, Math.floor((fw - cw * .3) / cw)), off = (fw - cols * cw) / 2;
        var scw = cw * .62, scols = Math.max(0, Math.floor((sw - scw * .4) / scw)), soff = (sw - scols * scw) / 2;
        var pw = Math.max(1, Math.round(cw * ww)), ph = Math.max(1, Math.round(ch * wh)), spw = Math.max(1, Math.round(scw * .58));
        for (var r = r0; r < r1; r++) {
          var wy = ah - Math.round(ch * .5 + (r + 1) * ch - ch * (1 - wh) / 2);
          var on = homes ? .58 : (rnd() < .55 ? .9 : .07), cool = rnd() < (st === 'glass' ? .8 : st === 'ribbon' ? .6 : .12);
          for (var q = 0; q < cols; q++) pane(x, fx + off + q * cw + cw * (1 - ww) / 2, wy, pw, ph, rnd() < on, cool, 1, homes, rnd);
          for (q = 0; q < scols; q++) pane(x, sx + soff + q * scw + scw * .21, wy, spw, ph, rnd() < on * .85, cool, .5, false, rnd);
        }
      });
    });
    x.globalAlpha = 1;
    return { c: c, minX: minX, ah: ah, glow: soften(c, 5) };
  }
  /* a small copy of the sheet; scaled back up, it becomes the glow around the lights */
  function soften(c, f) {
    var s = document.createElement('canvas');
    s.width = Math.max(1, Math.ceil(c.width / f)); s.height = Math.max(1, Math.ceil(c.height / f));
    var x = s.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(c, 0, 0, s.width, s.height);
    return { c: s, f: f };
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
    var l = document.createElement('canvas'); l.width = l.height = 32;
    var z = l.getContext('2d'), lg = z.createRadialGradient(16, 16, 0, 16, 16, 16);
    lg.addColorStop(0, 'rgba(255,214,140,.9)'); lg.addColorStop(.25, 'rgba(255,190,110,.35)'); lg.addColorStop(1, 'rgba(255,170,90,0)');
    z.fillStyle = lg; z.fillRect(0, 0, 32, 32);
    return { disc: d, glow: g, lamp: l };
  }

  /* tall buildings step back once or twice on the way up */
  function tiers(b, s, rnd) {
    var x0 = b.x, x1 = b.x + b.w;
    if (b.grows || b.hf < 110 * s || b.style === 'glass' || rnd() < .4) return [{ x0: x0, x1: x1, y0: 0, y1: b.hf }];
    var f = .58 + rnd() * .18, ins = b.w * (.1 + rnd() * .07), out = [{ x0: x0, x1: x1, y0: 0, y1: b.hf * f }];
    if (rnd() < .55) out.push({ x0: x0 + ins, x1: x1 - ins, y0: b.hf * f, y1: b.hf });
    else {
      var f2 = f + (1 - f) * .58, ins2 = ins + b.w * (.08 + rnd() * .05);
      out.push({ x0: x0 + ins, x1: x1 - ins, y0: b.hf * f, y1: b.hf * f2 }, { x0: x0 + ins2, x1: x1 - ins2, y0: b.hf * f2, y1: b.hf });
    }
    return out;
  }

  function build(W, H, seed) {
    var rnd = rng(seed);
    var unit = W < 760 ? clamp(H / 900, .55, 1) : clamp(Math.min(W / 1280, H / 820), .55, 1.6);
    var cap = H * .5;
    var layers = [0, .24, .48, .74, 1].map(function (d) {
      var s = (.34 + .86 * d) * unit;
      var cw = Math.max(3, Math.round(3 + 4 * s)), ch = Math.max(4, Math.round(4 + 5.4 * s));
      var bs = [], x = -W * .14, wide = d < .3 ? 2.2 : 1;
      while (x < W * 1.16) {
        var w = (14 + rnd() * 24) * s * wide; if (rnd() < .14) w *= 1.7;
        w = Math.max(cw * 2.5, Math.round(w / cw) * cw);
        var cx = (x + w / 2) / W, r = rnd(), hf;
        if (r < .4) hf = (14 + rnd() * 30) * s;
        else if (r < .78) hf = (56 + rnd() * 110) * s;
        else hf = (140 + rnd() * 220) * s;
        if (d < .9) hf *= 1 + .85 * Math.exp(-Math.pow(cx - .5, 2) / .05) * (1 - d * .5);
        else hf *= .5;
        hf = Math.min(hf, cap);
        var h0 = Math.min(hf, (8 + rnd() * 18) * s), grows = hf - h0 > 8 * s;
        var b = {
          x: x, w: w, h0: h0, hf: hf, grows: grows,
          t0: grows ? Math.min(.72, rnd() * .42 + Math.min(1, hf / (380 * s)) * .32) : 0,
          dur: .12 + rnd() * .18, style: hf > 90 * s ? STYLE[(rnd() * STYLE.length) | 0] : (rnd() < .8 ? 'grid' : 'ribbon'),
          roof: ROOFS[(rnd() * ROOFS.length) | 0], crane: grows && hf > 64 * s && rnd() < .5,
          side: clamp(Math.abs(cx - .5) * (.16 + .3 * d) + .02, .03, .3), sideL: cx > .5,
          town: .2 + rnd() * .55, litD: rnd() * .08, seed: rnd() * 100, v: (rnd() * 4) | 0,
          edge: hf > 150 * s && rnd() < .4, cold: rnd() < .4
        };
        b.tiers = tiers(b, s, rnd);
        bs.push(b);
        x += w + (rnd() < .3 ? rnd() * 12 * s : rnd() * 2 * s);
      }
      var cars = [];
      if (d > .4) for (var i = 0, n = Math.round(W / 40 * s); i < n; i++) cars.push({ o: rnd() * W * 1.3, v: (16 + rnd() * 38) * s, dir: rnd() < .5 ? 1 : -1, lane: rnd() });
      return { d: d, s: s, cw: cw, ch: ch, b: bs, cars: cars };
    });
    /* the scalD tower: tallest, centred, the last to top out, crowned with the mark */
    var L = layers[2], s2 = L.s, tw = Math.max(L.cw * 6, Math.round(56 * s2 / L.cw) * L.cw);
    var tower = { x: W * .5 - tw / 2, w: tw, h0: 16 * s2, hf: H * .44, grows: true, t0: .5, dur: .32, style: 'glass', roof: 'crown', crane: true,
      side: .04, sideL: false, town: .3, litD: 0, seed: 7, v: 0, edge: true, cold: false, hero: true };
    tower.tiers = [{ x0: tower.x, x1: tower.x + tw, y0: 0, y1: tower.hf }];
    L.b = L.b.filter(function (b) { return b.x + b.w < tower.x - 3 || b.x > tower.x + tower.w + 3; });
    L.b.push(tower);
    var stars = [], clouds = [];
    for (var i = 0; i < 240; i++) stars.push({ x: rnd(), y: rnd(), r: rnd() < .9 ? .6 + rnd() * .7 : 1.3 + rnd(), ph: rnd() * 6.28 });
    for (i = 0; i < 7; i++) clouds.push({ x: rnd(), y: .18 + rnd() * .3, w: .18 + rnd() * .3, h: .012 + rnd() * .02 });
    return { layers: layers, stars: stars, clouds: clouds, unit: unit };
  }

  function City(cv, opts) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.o = opts;
    this.W = 0; this.H = 0; this.dpr = 0; this.D = null; this.q = 1; this.ema = null; this.fema = null; this.n = 0;
    this.ox = 0; this.oy = 0;
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
    if ((this.ema > 8 || (this.fema && this.fema > 21)) && this.q > .3) { this.q *= .72; this.n = 0; this.ema = this.fema = null; this.size(); }
  };

  City.prototype.draw = function (st) {
    var ctx = this.ctx, W = this.W, H = this.H, D = this.D, dpr = this.dpr;
    if (!D) return;
    var g = st.g, night = st.night, t = st.t, ox = st.ox || 0, oy = st.oy || 0;
    this.ox = ox; this.oy = oy;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    var shift = g * H * .04, hy = H * st.horizon + shift;
    if (st.zoom !== 1) { ctx.translate(W / 2, H * .5); ctx.scale(st.zoom, st.zoom); ctx.translate(-W / 2, -H * .5); }
    if (ox || oy) ctx.translate(ox, oy);
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
      var sa = clamp(night * 1.3 - .4, 0, 1) * .85;
      if (sa > .01) {
        ctx.fillStyle = '#FFF6DE';
        for (var i = 0; i < D.stars.length; i++) {
          var s = D.stars[i], y = s.y * H * 1.2 - H * .2;
          if (y > hy - 24 || y < -4 - oy) continue;
          ctx.globalAlpha = sa * (.55 + .45 * Math.sin(t * 1.6 + s.ph));
          ctx.fillRect(s.x * W, y, s.r, s.r);
        }
        ctx.globalAlpha = 1;
        this.plane(ctx, t, night, W, H, D.unit);
      }
      var m = Math.min(W, H), mxp = lerp(W * .62, W * .78, g) - st.mx * 4, myp = lerp(H * .3, H * .17, g), mr = lerp(m * .03, m * .036, g);
      ctx.globalAlpha = .75 + .25 * night;
      ctx.drawImage(this.sp.glow, mxp - mr * 2.8, myp - mr * 2.8, mr * 5.6, mr * 5.6);
      ctx.drawImage(this.sp.disc, mxp - mr, myp - mr, mr * 2, mr * 2);
      ctx.globalAlpha = 1;
    }
    ctx.imageSmoothingEnabled = this.smooth = st.zoom !== 1;
    if (hy < H - oy) { ctx.fillStyle = '#07070C'; ctx.fillRect(-W, hy, W * 3, H - hy - oy + 4); }

    var haze = mix(hor, SKY.haze, .5);
    for (var li = 0; li < D.layers.length; li++) {
      var L = D.layers[li], d = L.d;
      var base = Math.round((hy + 5 + d * d * H * .3) * dpr) / dpr;
      /* haze settles over everything behind this layer, thickest at street level */
      if (li > 0) {
        var fh = H * (.2 - .08 * d), fg = ctx.createLinearGradient(0, base - fh, 0, base);
        fg.addColorStop(0, rgba(haze, 0)); fg.addColorStop(1, rgba(haze, (.3 - .1 * night).toFixed(3)));
        ctx.fillStyle = fg; ctx.fillRect(-W, base - fh, W * 3, fh + 1);
      }
      var px = -st.mx * 12 * d;
      var body = mix(SKY.near, mix(SKY.far, hor, .25), (1 - d) * .7);
      var pal = [body, mix(body, [0, 0, 0], .22), mix(body, [70, 56, 46], .16), mix(body, [40, 50, 74], .16)].map(function (f) {
        return { f: rgba(f), s: rgba(mix(f, [0, 0, 0], .45)), rim: rgba(mix(f, hor, .6), (.5 - .25 * night).toFixed(3)), c: f };
      });
      var glass = mix(mix(SKY.glassD, SKY.glassN, night), body, .3 + (1 - d) * .4);
      for (var bi = 0; bi < L.b.length; bi++) this.building(ctx, L, L.b[bi], base, px, g, night, t, pal, glass, hor);
      if (d >= .48 && base < H - oy + 60) {
        var sg = ctx.createLinearGradient(0, base - 54 * L.s, 0, base);
        sg.addColorStop(0, 'rgba(255,170,96,0)'); sg.addColorStop(1, 'rgba(255,170,96,' + (.16 * (.35 + .65 * night)).toFixed(3) + ')');
        ctx.fillStyle = sg; ctx.fillRect(-W, base - 54 * L.s, W * 3, 54 * L.s);
      }
      if (d >= .74 && base < H - oy + 10) this.lamps(ctx, L, base, px, night, W);
      if (L.cars.length && base < H - oy + 4) this.cars(ctx, L, base, px, t, night, W);
    }
    if (this.o.clearSky) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      var fade = ctx.createLinearGradient(0, 0, 0, H * .45);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  City.prototype.building = function (ctx, L, b, base, px, g, night, t, pal, glass, hor) {
    var s = L.s, W = this.W, H = this.H, dpr = this.dpr, oy = this.oy;
    var x = Math.round((b.x + px) * dpr) / dpr, dx = x - b.x;
    if (x + this.ox > W + 60 || x + b.w + this.ox < -60) return;
    var k = b.grows ? clamp((g - b.t0) / b.dur, 0, 1) : 1;
    var h = b.h0 + (b.hf - b.h0) * out3(k);
    var top = base - h, rising = b.grows && k > 0 && k < 1;
    if (top - 80 * s + oy > H) return;
    var skel = rising ? Math.min(h * .16, 30 * s) : 0, built = h - skel, P = pal[b.v];
    var floor = Math.min(base, H - oy + 2);

    /* the body, tier by tier: the face toward you, the side in shadow, a lit ledge on top */
    for (var i = 0; i < b.tiers.length; i++) {
      var T = b.tiers[i];
      if (T.y0 >= built) break;
      var ty = base - Math.min(T.y1, built), tb = Math.min(base - T.y0, floor) + 1;
      var tx = T.x0 + dx, tw = T.x1 - T.x0, sw = tw * b.side, fw = tw - sw, fx = b.sideL ? tx + sw : tx, sx = b.sideL ? tx : tx + fw;
      if (b.style === 'glass') {
        var gl = ctx.createLinearGradient(0, ty, 0, base);
        gl.addColorStop(0, rgba(mix(glass, hor, .32))); gl.addColorStop(.55, rgba(glass)); gl.addColorStop(1, rgba(mix(glass, [0, 0, 0], .35)));
        ctx.fillStyle = gl;
      } else ctx.fillStyle = P.f;
      ctx.fillRect(fx, ty, fw, tb - ty);
      ctx.fillStyle = P.s; ctx.fillRect(sx, ty, sw, tb - ty);
      ctx.fillStyle = P.rim; ctx.fillRect(tx, ty, tw, Math.max(.5, .55 * s));
      if (b.style === 'glass' && fw > 6) {
        ctx.fillStyle = 'rgba(255,255,255,' + (.05 - .03 * night).toFixed(3) + ')';
        ctx.fillRect(fx + fw * .18, ty, fw * .1, tb - ty); ctx.fillRect(fx + fw * .62, ty, fw * .05, tb - ty);
      }
    }

    /* windows hang from the base, so new floors appear as the building rises */
    var A = L.atlas, sh = Math.round(built * dpr);
    if (A && sh > 1) {
      var lit;
      if (!b.grows) lit = clamp(b.town + g * .6, 0, 1);
      else if (k <= 0) lit = b.town;
      else lit = clamp((g - b.t0 - b.dur * .7 - b.litD) / .08, 0, 1);
      lit *= .5 + .5 * night;
      if (b.hero && k >= 1) lit = 1;
      var ax = Math.round((b.x - A.minX) * dpr), aw = Math.ceil(b.w * dpr);
      sh = Math.min(sh, A.ah);
      ctx.globalAlpha = .12 + .88 * lit;
      ctx.drawImage(A.c, ax, A.ah - sh, aw, sh, x, base - sh / dpr, aw / dpr, sh / dpr);
      /* the nearest lights bloom */
      if (L.d >= .74 && lit > .05) {
        var G = A.glow, f = G.f;
        ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .55 * lit;
        ctx.drawImage(G.c, ax / f, (A.ah - sh) / f, aw / f, sh / f, x, base - sh / dpr, aw / dpr, sh / dpr);
        ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = this.smooth;
      }
      ctx.globalAlpha = 1;
    }

    if (skel > 0) {
      ctx.strokeStyle = 'rgba(222,186,104,.55)'; ctx.lineWidth = Math.max(.6, .7 * s);
      ctx.beginPath();
      for (var vx = x; vx <= x + b.w + .1; vx += L.cw * 2) { ctx.moveTo(vx + .5, top); ctx.lineTo(vx + .5, top + skel); }
      for (var vy = top + skel; vy >= top - .1; vy -= L.ch) { ctx.moveTo(x, vy + .5); ctx.lineTo(x + b.w, vy + .5); }
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

    if (!rising && k >= 1) this.roof(ctx, b, b.tiers[b.tiers.length - 1], dx, top, s, night, t, P, base, floor);
  };

  /* what's on the roof: water tanks, plant rooms, spires and masts with their red lights */
  City.prototype.roof = function (ctx, b, T, dx, top, s, night, t, P, base, floor) {
    var tx = T.x0 + dx, tw = T.x1 - T.x0, cx = tx + tw / 2, line = Math.max(.7, .9 * s);
    ctx.fillStyle = P.f;
    if (b.roof === 'step') { ctx.fillRect(tx + tw * .16, top - 10 * s, tw * .68, 10 * s); ctx.fillRect(tx + tw * .33, top - 17 * s, tw * .34, 7 * s); }
    else if (b.roof === 'slant') { ctx.beginPath(); ctx.moveTo(tx, top); ctx.lineTo(tx + tw, top - Math.min(tw * .4, 30 * s)); ctx.lineTo(tx + tw, top); ctx.fill(); }
    else if (b.roof === 'flat') ctx.fillRect(tx + tw * .2, top - 4 * s, tw * .26, 4 * s);
    else if (b.roof === 'box') { ctx.fillRect(tx + tw * .12, top - 5 * s, tw * .22, 5 * s); ctx.fillRect(tx + tw * .5, top - 3.5 * s, tw * .3, 3.5 * s); }
    else if (b.roof === 'tank' && tw > 14 * s) {
      var kw = Math.max(4, 8 * s), kh = kw * 1.1, kx = tx + tw * (.18 + (b.seed % 1) * .4), legs = kh * .5;
      ctx.fillStyle = P.s;
      ctx.fillRect(kx + kw * .12, top - legs, line, legs); ctx.fillRect(kx + kw * .82, top - legs, line, legs);
      ctx.fillStyle = P.f; ctx.fillRect(kx, top - legs - kh, kw, kh);
      ctx.beginPath(); ctx.moveTo(kx - .4, top - legs - kh); ctx.lineTo(kx + kw / 2, top - legs - kh * 1.42); ctx.lineTo(kx + kw + .4, top - legs - kh); ctx.fill();
    }
    if (b.roof === 'spire' || b.roof === 'antenna' || (b.style === 'deco' && tw > 20 * s)) {
      var tall = b.roof === 'spire' || b.style === 'deco';
      if (b.style === 'deco') {
        ctx.fillStyle = P.f; ctx.fillRect(tx + tw * .2, top - 8 * s, tw * .6, 8 * s); ctx.fillRect(tx + tw * .34, top - 14 * s, tw * .32, 6 * s);
        ctx.fillStyle = 'rgba(255,214,150,' + (.22 + .5 * night).toFixed(3) + ')';
        ctx.fillRect(tx + tw * .2, top - 8 * s, tw * .6, Math.max(.8, .8 * s)); ctx.fillRect(tx + tw * .34, top - 14 * s, tw * .32, Math.max(.8, .8 * s));
      }
      var tip = tall ? 30 * s : 22 * s, ax = tall ? cx : tx + tw * .7, from = b.style === 'deco' ? top - 14 * s : top;
      ctx.strokeStyle = '#20202E'; ctx.lineWidth = Math.max(.8, s);
      ctx.beginPath(); ctx.moveTo(ax, from); ctx.lineTo(ax, top - tip);
      if (b.roof === 'antenna') { ctx.moveTo(tx + tw * .3, top); ctx.lineTo(tx + tw * .3, top - 14 * s); }
      ctx.stroke();
      if (Math.sin(t * 2.2 + b.seed) > 0) {
        ctx.fillStyle = 'rgba(255,92,71,.95)'; ctx.fillRect(ax - 1.3, top - tip - 1.3, 2.6, 2.6);
        ctx.globalAlpha = .3; ctx.drawImage(this.sp.lamp, ax - 4, top - tip - 4, 8, 8); ctx.globalAlpha = 1;
      }
    }
    if (b.edge) {
      var ew = Math.max(1, .8 * s), sw = tw * b.side, fx = b.sideL ? tx + sw : tx, fw = tw - sw, eh = floor - top;
      ctx.fillStyle = b.cold ? 'rgba(206,224,255,' + (.18 + .4 * night).toFixed(3) + ')' : 'rgba(242,200,110,' + (.22 + .4 * night).toFixed(3) + ')';
      ctx.fillRect(fx, top, ew, eh); ctx.fillRect(fx + fw - ew, top, ew, eh);
    }
    if (b.hero) this.crown(ctx, tx, tw, top, s, night, P.f);
  };

  /* the tower's crown: a stepped setback carrying the floor-D mark in gold light */
  City.prototype.crown = function (ctx, x, w, top, s, night, bodyC) {
    var cxr = x + w / 2;
    ctx.fillStyle = bodyC;
    ctx.fillRect(x + w * .12, top - 12 * s, w * .76, 12 * s);
    ctx.fillStyle = 'rgba(242,206,120,.85)';
    ctx.fillRect(x + w * .12, top - 12 * s, w * .76, Math.max(1, s));
    var mh = Math.max(26, 58 * s), mw = mh * 36 / 44, mx0 = cxr - mw / 2, my0 = top - 22 * s - mh;
    var gr = ctx.createRadialGradient(cxr, my0 + mh / 2, 0, cxr, my0 + mh / 2, mh * 1.4);
    gr.addColorStop(0, 'rgba(242,200,110,' + (.36 * (.5 + .5 * night)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(242,200,110,0)');
    ctx.fillStyle = gr; ctx.fillRect(cxr - mh * 1.4, my0 + mh / 2 - mh * 1.4, mh * 2.8, mh * 2.8);
    ctx.fillStyle = 'rgba(246,216,138,' + (.78 + .22 * night).toFixed(3) + ')';
    for (var i = 0; i < MARK.length; i++) {
      var r = MARK[i];
      ctx.fillRect(mx0 + r[0] / 36 * mw, my0 + r[1] / 44 * mh, r[2] / 36 * mw, r[3] / 44 * mh);
    }
  };

  /* sodium street lamps along the nearest streets */
  City.prototype.lamps = function (ctx, L, base, px, night, W) {
    var s = L.s, gap = 26 * s, y = base - 3 * s, r = 5 * s, a = .3 + .6 * night, x0 = ((px % gap) + gap) % gap - gap + Math.floor(-this.ox / gap) * gap;
    ctx.globalAlpha = a;
    for (var x = x0; x < W - this.ox + gap; x += gap) ctx.drawImage(this.sp.lamp, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
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

  /* a plane crossing high over the city, strobe and nav lights */
  City.prototype.plane = function (ctx, t, night, W, H, unit) {
    var a = clamp((night - .3) / .3, 0, 1);
    if (a <= 0) return;
    var span = W * 1.7, x = ((t * 24 * unit) % span) - W * .35, y = H * .13 + Math.sin(t * .05) * H * .015;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FF5A47'; ctx.fillRect(x, y, 1.6, 1.6);
    ctx.fillStyle = '#8CFFC0'; ctx.fillRect(x + 8, y + .7, 1.5, 1.5);
    if ((t * 1.1) % 1 < .07) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 3.4, y - .6, 2.6, 2.6); ctx.globalAlpha = a * .5; ctx.drawImage(this.sp.lamp, x - 4, y - 9, 18, 18); }
    ctx.globalAlpha = 1;
  };

  /* ---------- the room and its window ----------
     On wide screens the window stands to the right of the copy; on phones it's a wide window under it. */
  function buildRoom(svg, W, H, tb) {
    if (W < 50 || H < 50) return { cx: W / 2, cy: H / 2 };
    var mobile = W < 760, gx = clamp(W * .04, 20, 56), gw, gh, cx, cy;
    if (mobile) {
      gw = W - gx * 2; gh = clamp(H - tb - 46, Math.min(130, H * .2), H * .36);
      cx = W / 2; cy = H - 24 - gh / 2;
    } else {
      gw = clamp(W * .3, 280, 580); gh = Math.min(H * .68, gw * 1.34);
      cx = Math.min(W * .715, W - gx - gw / 2 - 10); cy = H * .54;
    }
    var x0 = cx - gw / 2, y0 = cy - gh / 2, x1 = cx + gw / 2, y1 = cy + gh / 2;
    var m = Math.min(gw, gh), dp = m * .075, ix0 = x0 + dp, iy0 = y0 + dp * .9, ix1 = x1 - dp, iy1 = y1 - dp * .45;
    var fw = Math.max(4, m * .016), R = Math.max(W, H);
    var f = function (n) { return n.toFixed(1); };
    var rect = function (x, y, w, h, fill, op) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(Math.max(0, w)) + '" height="' + f(Math.max(0, h)) + '" fill="' + fill + '"' + (op != null ? ' fill-opacity="' + op + '"' : '') + '/>'; };
    var hole = 'M' + f(-W) + ' ' + f(-H) + 'H' + f(2 * W) + 'V' + f(2 * H) + 'H' + f(-W) + 'Z M' + f(x0) + ' ' + f(y0) + 'V' + f(y1) + 'H' + f(x1) + 'V' + f(y0) + 'Z';

    /* the steel frame: a transom on the tall window, two mullions on the wide one */
    var bars = '';
    if (!mobile) { var tr = iy0 + (iy1 - iy0) * .22; bars += rect(ix0, tr, ix1 - ix0, fw * 1.1, '#1C160F') + rect(ix0, tr, ix1 - ix0, 1, '#E8CB7A', .22); }
    else for (var i = 1; i < 3; i++) { var bx = ix0 + (ix1 - ix0) * i / 3 - fw * .45; bars += rect(bx, iy0, fw * .9, iy1 - iy0, '#1C160F') + rect(bx, iy0, 1, iy1 - iy0, '#E8CB7A', .14); }

    /* a plant on the sill, in silhouette against the view */
    var plant = '';
    if (!mobile && m > 260) {
      var pw = m * .075, ph = pw * .85, pcx = ix0 + m * .1, pb = y1 - dp * .18, sy = pb - ph;
      plant = '<g fill="#0D0E0A" stroke="#E8CB7A" stroke-opacity=".1" stroke-width="1">';
      for (var j = 0; j < 7; j++) {
        var a = -150 + j * 20 + (j % 2 ? 6 : -4), rad = a * Math.PI / 180, len = m * (.09 + .035 * Math.abs(Math.sin(j * 1.7)));
        var ex = pcx + Math.cos(rad) * len * .5, ey = sy + Math.sin(rad) * len * .5;
        plant += '<ellipse cx="' + f(ex) + '" cy="' + f(ey) + '" rx="' + f(len * .5) + '" ry="' + f(len * .15) + '" transform="rotate(' + f(a) + ' ' + f(ex) + ' ' + f(ey) + ')"/>';
      }
      plant += '</g><path fill="#16110B" d="M' + f(pcx - pw / 2) + ' ' + f(sy) + 'H' + f(pcx + pw / 2) + 'L' + f(pcx + pw * .38) + ' ' + f(pb) + 'H' + f(pcx - pw * .38) + 'Z"/>' +
        rect(pcx - pw / 2, sy, pw, 1, '#E8CB7A', .25);
    }

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML =
      '<defs>' +
      '<radialGradient id="wl" gradientUnits="userSpaceOnUse" cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * .8) + '"><stop offset="0" stop-color="#302416"/><stop offset=".32" stop-color="#17110B"/><stop offset="1" stop-color="#070605"/></radialGradient>' +
      '<radialGradient id="lamp" gradientUnits="userSpaceOnUse" cx="' + f(mobile ? W * .5 : W * .16) + '" cy="' + f(mobile ? -H * .05 : H * .1) + '" r="' + f(R * .62) + '"><stop offset="0" stop-color="#FFBE78" stop-opacity=".075"/><stop offset="1" stop-color="#FFBE78" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="rt" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(y0) + '" x2="0" y2="' + f(iy0) + '"><stop offset="0" stop-color="#0A0806"/><stop offset="1" stop-color="#1B150E"/></linearGradient>' +
      '<linearGradient id="rb" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(iy1) + '" x2="0" y2="' + f(y1) + '"><stop offset="0" stop-color="#4E3C22"/><stop offset="1" stop-color="#1E170E"/></linearGradient>' +
      '<linearGradient id="rl" gradientUnits="userSpaceOnUse" x1="' + f(x0) + '" y1="0" x2="' + f(ix0) + '" y2="0"><stop offset="0" stop-color="#0E0B08"/><stop offset="1" stop-color="#261D12"/></linearGradient>' +
      '<linearGradient id="rr" gradientUnits="userSpaceOnUse" x1="' + f(x1) + '" y1="0" x2="' + f(ix1) + '" y2="0"><stop offset="0" stop-color="#0B0907"/><stop offset="1" stop-color="#1C160E"/></linearGradient>' +
      '<linearGradient id="sl" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(y1) + '" x2="0" y2="' + f(y1 + dp * .4) + '"><stop offset="0" stop-color="#5A4527"/><stop offset="1" stop-color="#1A140C"/></linearGradient>' +
      '<linearGradient id="sh" gradientUnits="userSpaceOnUse" x1="' + f(ix0) + '" y1="' + f(iy0) + '" x2="' + f(ix1) + '" y2="' + f(iy1) + '"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#FFF1D6" stop-opacity=".07"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#FFF1D6" stop-opacity=".035"/><stop offset=".86" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="rf" gradientUnits="userSpaceOnUse" cx="' + f(ix0 + (ix1 - ix0) * .22) + '" cy="' + f(iy0 + (iy1 - iy0) * .64) + '" r="' + f(m * .36) + '"><stop offset="0" stop-color="#FFC48A" stop-opacity=".07"/><stop offset="1" stop-color="#FFC48A" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<path fill="url(#wl)" fill-rule="evenodd" d="' + hole + '"/>' +
      '<path fill="url(#lamp)" fill-rule="evenodd" d="' + hole + '"/>' +
      '<polygon fill="url(#rt)" points="' + [x0, y0, x1, y0, ix1, iy0, ix0, iy0].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rb)" points="' + [x0, y1, ix0, iy1, ix1, iy1, x1, y1].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rl)" points="' + [x0, y0, ix0, iy0, ix0, iy1, x0, y1].map(f).join(' ') + '"/>' +
      '<polygon fill="url(#rr)" points="' + [x1, y0, x1, y1, ix1, iy1, ix1, iy0].map(f).join(' ') + '"/>' +
      rect(ix0, iy0, ix1 - ix0, iy1 - iy0, 'url(#sh)') + rect(ix0, iy0, ix1 - ix0, iy1 - iy0, 'url(#rf)') + bars +
      '<rect x="' + f(ix0) + '" y="' + f(iy0) + '" width="' + f(ix1 - ix0) + '" height="' + f(iy1 - iy0) + '" fill="none" stroke="#211A11" stroke-width="' + f(fw) + '"/>' +
      '<rect x="' + f(ix0 + fw / 2 + .5) + '" y="' + f(iy0 + fw / 2 + .5) + '" width="' + f(Math.max(0, ix1 - ix0 - fw - 1)) + '" height="' + f(Math.max(0, iy1 - iy0 - fw - 1)) + '" fill="none" stroke="#E8CB7A" stroke-opacity=".2" stroke-width="1"/>' +
      plant +
      rect(x0 - dp * .5, y1 - 1, gw + dp, dp * .4, 'url(#sl)') + rect(x0 - dp * .5, y1 - 1, gw + dp, 1.5, '#E8CB7A', .34);
    return { cx: cx, cy: cy };
  }

  var mem = {};
  function set(key, el, prop, val) { if (mem[key] !== val) { mem[key] = val; el.style[prop] = val; } }
  function cls(key, el, name, on) { if (mem[key] !== on) { mem[key] = on; el.classList.toggle(name, on); } }
  var t0 = performance.now(), mx = 0, tmx = 0;
  addEventListener('pointermove', function (e) { mx = e.clientX / innerWidth * 2 - 1; }, { passive: true });

  /* ================= the home scene: walk to the window, the city is built ================= */
  var scene = $('#top'), stage = $('#stage');
  if (scene && stage && $('#city')) {
    var room = $('#room'), svg = $('#room-svg'), hero = $('#hero'), copy = $('#hero-copy'), line = $('#scene-line');
    var sky = $('#sky'), skyDusk = $('#sky-dusk'), skyNight = $('#sky-night'), skyGlow = $('#sky-glow');
    var city = new City($('#city'), { seed: 11, budget: touch ? 3.2e6 : 7e6 });
    var geo = { top: 0, h: 0, span: 1, vh: 0, R: 0 }, win = { cx: 0, cy: 0 }, PS = -1, lastFrame = 0;
    var measure = function () {
      geo.vh = stage.clientHeight || innerHeight; geo.top = scene.offsetTop; geo.h = scene.offsetHeight; geo.span = Math.max(1, geo.h - geo.vh);
      SC.solidAt = geo.top + geo.span - 60;
    };
    var layout = function () {
      city.size();
      var W = stage.clientWidth, H = stage.clientHeight;
      win = buildRoom(svg, W, H, copy ? copy.offsetTop + copy.offsetHeight : H * .55);
      room.style.transformOrigin = win.cx + 'px ' + win.cy + 'px';
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
    /* the copy's final height (once the fonts land) sets the window's size on phones */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (innerWidth < 760) buildRoomAgain(); });
    function buildRoomAgain() { win = buildRoom(svg, stage.clientWidth, stage.clientHeight, copy ? copy.offsetTop + copy.offsetHeight : stage.clientHeight * .55); room.style.transformOrigin = win.cx + 'px ' + win.cy + 'px'; mem = {}; }

    SC.ticks.push(function (now, y) {
      var dt = lastFrame ? now - lastFrame : 0; lastFrame = now;
      var P = clamp((y - geo.top) / geo.span, 0, 1);
      var on = y < geo.top + geo.h && y + geo.vh > geo.top;
      if (!on) { SC.dockHold = false; return; }
      PS = (PS < 0 || SC.lenis || touch || reduced) ? P : PS + (P - PS) * .22;
      if (Math.abs(P - PS) < .0002) PS = P;
      var p = PS, zi = seg(p, 0, .48), ze = inOut(zi), ro = 1 - seg(p, .36, .48);
      set('rt', room, 'transform', 'scale(' + (1 + Math.pow(zi, 2.1) * 4.4).toFixed(4) + ')');
      set('ro', room, 'opacity', ro.toFixed(3));
      set('rv', room, 'visibility', ro <= 0 ? 'hidden' : 'visible');
      var hk = seg(p, 0, .2);
      set('ho', hero, 'opacity', (1 - hk).toFixed(3));
      set('hv', hero, 'visibility', hk >= 1 ? 'hidden' : 'visible');
      set('ht', hero, 'transform', 'translate3d(0,' + (-hk * 5).toFixed(2) + 'vh,0)');
      var lineOn = p > .56;
      cls('ln', line, 'on', lineOn);
      cls('dim', stage, 'dim', lineOn);
      SC.dockHold = p < .14;
      tmx += (mx - tmx) * .05;
      /* the view starts framed by the window and settles to the centre as you step through it */
      var W = city.W, H = geo.vh, dpr = city.dpr || 1, back = 1 - ze;
      var st = { g: seg(p, .1, .9), night: seg(p, .04, .8), zoom: 1 + ze * .12, t: reduced ? 6 : (now - t0) / 1000, mx: reduced ? 0 : tmx, horizon: .6,
        ox: Math.round((win.cx - W / 2) * back * dpr) / dpr, oy: Math.round((win.cy - H * .5) * back * (W < 760 ? .8 : 1) * dpr) / dpr };
      var hy = H * .6 + st.g * H * .04 + st.oy, sy = (hy - 3.15 * H).toFixed(1);
      set('sz', sky, 'transform', 'scale(' + st.zoom.toFixed(4) + ')');
      set('sd', skyDusk, 'transform', 'translate3d(0,' + sy + 'px,0)');
      set('sn', skyNight, 'transform', 'translate3d(0,' + sy + 'px,0)');
      set('so', skyNight, 'opacity', st.night.toFixed(3));
      set('gt', skyGlow, 'transform', 'translate3d(' + st.ox.toFixed(1) + 'px,' + (hy - geo.R).toFixed(1) + 'px,0)');
      set('go', skyGlow, 'opacity', (.1 + .24 * st.g * (.4 + .6 * st.night)).toFixed(3));
      var d0 = performance.now();
      city.draw(st);
      if (!reduced) city.track(performance.now() - d0, dt);
    });
    if (/[?&]debug/.test(location.search)) {
      window.__scald = { city: city, go: function (y) { if (SC.lenis) SC.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); } };
      /* ?debug&shot=<px | fraction of the scene, like 0.5 | #id> jumps there once loaded, for screenshots */
      var shot = /[?&]shot=([^&]+)/.exec(location.search);
      if (shot) addEventListener('load', function () {
        setTimeout(function () {
          var v = decodeURIComponent(shot[1]), el = v.charAt(0) === '#' && $(v);
          window.__scald.go(el ? el.getBoundingClientRect().top + scrollY : (+v <= 1 ? geo.top + geo.span * +v : +v));
        }, 400);
      });
    }
  }

  /* ================= the closing skyline: a still picture, drawn once when it comes into view ================= */
  var sk = $('#skyline');
  if (sk) {
    var sky2 = new City(sk, { seed: 23, clearSky: true, budget: touch ? 2e6 : 4.5e6 }), dirty = true;
    var paint = function () { if (!dirty) return; dirty = false; sky2.size(); sky2.draw({ g: 1, night: 1, zoom: 1, t: 6, mx: 0, horizon: .5 }); };
    addEventListener('resize', function () { dirty = true; });
    if ('IntersectionObserver' in window) {
      var vis = false;
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) paint(); }, { rootMargin: '0px 0px 300px 0px' }).observe(sk);
      SC.ticks.push(function () { if (vis && dirty) paint(); });
    } else paint();
  }
})();
