/* Closed: landing page, application quiz and booking step.
   Everything you'll want to change lives in CONFIG right below. */
var CONFIG = {
  cohort: {
    start: '2026-12-07T00:00:00-06:00',   // Monday, Dec 7, 12:00 AM Central (Dallas). The countdown runs to this.
    long: 'Monday, Dec 7',              // shown in the bar, FAQ and final section
    short: 'Dec 7',                     // short form of the date
    spots: '15',                         // how many spots
    doorsClose: 'Monday, Dec 7'         // when applications for this cohort close
  },
  booking: {
    link: 'https://calendar.app.google/cDBpxXE37ATK8RDN8',
    embed: 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ15-eXbX8qXRTHMDjIa-7qFMv2QrBXkT9YBua8ofGfaePBWQ4jOoU6MEOjhF6Ekhv-MK-xx-vrY?gv=true'
  },
  form: {
    // FormSubmit sends every application to the first address and copies everyone in cc.
    // After you activate it, you can swap the email here for the random string FormSubmit gives you.
    endpoint: 'https://formsubmit.co/ajax/ishcloses@gmail.com',
    cc: ['nizalsells@gmail.com']
  },
  instagram: 'ishcloses',
  preCallVideo: '',                                    // the "watch this before the call" video link. Empty = placeholder.
  pixels: {
    meta: '',     // Meta Pixel ID. Empty = off. Fires PageView, Lead on application, Schedule on the booked page.
    tiktok: ''    // TikTok Pixel ID. Empty = off. Fires page, SubmitForm on application, Schedule on the booked page.
  }
};

var QUESTIONS = [
  { id: 'name', type: 'text', q: "What's your first name?", ph: 'First name', auto: 'given-name' },
  { id: 'doing', type: 'choice', q: 'What are you doing for money right now?', options: ['9-to-5', 'Side hustle', 'Sales job', 'My own business', 'Student', 'Nothing right now'] },
  { id: 'income', type: 'choice', q: 'Roughly how much are you making a month?', options: ['Under $2k', '$2k to $4k', '$4k to $7k', '$7k+'] },
  { id: 'goal', type: 'text', q: 'How much do you want to be making in 6 months?', ph: 'e.g. $8k a month' },
  { id: 'hours', type: 'choice', q: 'How many hours a week can you put into this?', options: ['Under 10', '10 to 20', '20 to 30', '30+'] },
  { id: 'why', type: 'long', q: 'Why now? What made you click this?', ph: 'Be specific.', hint: "Be specific. This is how I know you're serious and genuinely aware you need a change NOW." },
  { id: 'ig', type: 'ig', q: "What's your Instagram?", ph: 'yourhandle', hint: "So I know who I'm talking to before the call." }
];

(function () {
  'use strict';
  var C = CONFIG, doc = document, page = doc.body.getAttribute('data-page');
  /* a still page: no pinch or double-tap zoom (iOS ignores the viewport setting for pinches) */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { doc.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });
  doc.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var lastTouch = 0;
  doc.addEventListener('touchend', function (e) { var now = Date.now(); if (now - lastTouch < 320 && !e.target.closest('input,textarea,select,a,button,summary,iframe')) e.preventDefault(); lastTouch = now; }, { passive: false });
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k, area) { try { return JSON.parse((area || localStorage).getItem(k)); } catch (e) { return null; } },
    set: function (k, v, area) { try { (area || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- where the lead came from: ?ref=ismail, ?ref=nizal and UTMs, kept for the whole visit ---------- */
  var ATTR_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'ttclid'];
  var attr = store.get('closed-attr', sessionStorage) || {};
  var qs = new URLSearchParams(location.search);
  ATTR_KEYS.forEach(function (k) { var v = qs.get(k); if (v) attr[k] = v.slice(0, 120); });
  if (!attr.landing) attr.landing = location.pathname + location.search;
  store.set('closed-attr', attr, sessionStorage);
  if (attr.ref) try { sessionStorage.setItem('closed-ref', attr.ref); } catch (e) { }

  /* ---------- pixels (off until there's an ID in CONFIG.pixels) ---------- */
  function loadPixels() {
    if (C.pixels.meta) {
      /* Meta Pixel base code */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', C.pixels.meta); window.fbq('track', 'PageView');
    }
    if (C.pixels.tiktok) {
      /* TikTok Pixel base code */
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; }; ttq.load = function (e, n) { var i = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {}; var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t; var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a); }; }(window, doc, 'ttq');
      window.ttq.load(C.pixels.tiktok); window.ttq.page();
    }
  }
  function track(kind) {
    try {
      if (window.fbq) window.fbq('track', kind === 'lead' ? 'Lead' : 'Schedule');
      if (window.ttq) window.ttq.track(kind === 'lead' ? 'SubmitForm' : 'Schedule');
    } catch (e) { }
  }
  loadPixels();

  /* ---------- the booked page ---------- */
  if (page === 'booked') {
    track('schedule');
    var v = $('#pre-video');
    if (v && C.preCallVideo) { v.innerHTML = '<a class="btn" href="' + esc(C.preCallVideo) + '" target="_blank" rel="noopener">Watch the video</a>'; $('#pre-video-step').hidden = false; }
    return;
  }
  if (page !== 'home') return;

  /* ---------- config text ---------- */
  var labels = { cohortLong: C.cohort.long, cohortShort: C.cohort.short, spots: C.cohort.spots, doorsClose: C.cohort.doorsClose };
  $$('[data-bind]').forEach(function (el) { var k = el.getAttribute('data-bind'); if (labels[k] != null) el.textContent = labels[k]; });
  function ctaText(t) { $$('[data-cta]').forEach(function (el) { el.textContent = t; }); }
  ctaText('be one of the ' + C.cohort.spots);

  /* ---------- countdown to the cohort, in Central time ---------- */
  var bar = $('#bar'), target = Date.parse(C.cohort.start), cd = {};
  $$('[data-cd]').forEach(function (el) { cd[el.getAttribute('data-cd')] = el; });
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  function tick() {
    var ms = target - Date.now();
    if (!(ms > 0)) {
      bar.classList.add('done');
      $('.bar-msg', bar).textContent = 'Cohort started. Apply for the next one.';
      ctaText('Apply for the next cohort');
      var ft = $('#final-t'); if (ft) ft.textContent = 'The next one opens soon.';
      return false;
    }
    var s = Math.floor(ms / 1000);
    cd.d.textContent = pad(Math.floor(s / 86400)); cd.h.textContent = pad(Math.floor(s % 86400 / 3600));
    cd.m.textContent = pad(Math.floor(s % 3600 / 60)); cd.s.textContent = pad(s % 60);
    return true;
  }
  if (tick()) (function loop() { setTimeout(function () { if (tick()) loop(); }, 1000 - Date.now() % 1000 + 5); })();

  /* ---------- student wins: columns that keep scrolling, each student's story in order ---------- */
  var wins = []; try { wins = JSON.parse($('#wins-data').textContent); } catch (e) { }
  var wall = $('#wall'), wallPP = $('#wall-pp'), layoutKey = '';
  var MAIN = ['Shahzeb', 'Muzz', 'Ibrahim', 'Omar'];
  function card(w, dup) {
    var alt = dup ? '' : esc('Screenshot: ' + w.student + ', ' + w.stage + '. ' + w.line);
    return '<article class="wc"' + (dup ? ' aria-hidden="true"' : '') + '>' +
      '<img src="/closed/wins/' + esc(w.img) + '-s.webp" width="' + w.w + '" height="' + w.h + '" alt="' + alt + '" loading="lazy" decoding="async">' +
      '</article>';
  }
  function buildWall() {
    if (!wall || !wins.length) return;
    var desk = matchMedia('(min-width: 900px)').matches, key = desk ? 'd' : 'm';
    if (key === layoutKey) return; layoutKey = key;
    var by = function (names) { return wins.filter(function (w) { return names.indexOf(w.student) > -1 || (names.indexOf('more') > -1 && MAIN.indexOf(w.student) < 0); }); };
    var cols = desk ? [by(['Shahzeb']), by(['Muzz']), by(['Ibrahim', 'more']), by(['Omar'])] : [by(['Shahzeb', 'Ibrahim', 'more']), by(['Muzz', 'Omar'])];
    var speeds = desk ? [24, 29, 26, 31] : [22, 26];
    wall.innerHTML = cols.map(function (list) {
      var once = list.map(function (w) { return card(w, false); }).join('');
      return '<div class="wall-col"><div class="wall-track">' + once + (reduced ? '' : list.map(function (w) { return card(w, true); }).join('')) + '</div></div>';
    }).join('');
    if (reduced) return;
    $$('.wall-track', wall).forEach(function (t, i) {
      var cycle = (t.scrollHeight + 8) / 2;
      t.style.setProperty('--dur', Math.max(30, cycle / speeds[i]).toFixed(1) + 's');
    });
  }
  buildWall();
  addEventListener('resize', function () { clearTimeout(buildWall.t); buildWall.t = setTimeout(buildWall, 150); });
  if (wallPP) wallPP.addEventListener('click', function () {
    var on = wall.classList.toggle('paused'); wallPP.setAttribute('aria-pressed', String(on)); wallPP.textContent = on ? 'Play the wall' : 'Pause the wall';
  });
  if (wall && 'IntersectionObserver' in window) new IntersectionObserver(function (es) {
    $$('.wall-track', wall).forEach(function (t) { if (!wall.classList.contains('paused')) t.style.animationPlayState = es[0].isIntersecting ? '' : 'paused'; });
  }).observe(wall);

  /* ---------- the sticky Apply button on phones: shows once the hero button is gone ---------- */
  var dock = $('#dock'), heroCta = $('#hero-cta'), finalSec = $('#final'), past = false, atEnd = false;
  function dockState() { var on = past && !atEnd && !qz.open; dock.classList.toggle('on', on); dock.setAttribute('aria-hidden', String(!on)); $('.btn', dock).tabIndex = on ? 0 : -1; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { var e = es[0]; past = !e.isIntersecting && e.boundingClientRect.top < 0; dockState(); }).observe(heroCta);
    new IntersectionObserver(function (es) { atEnd = es[0].isIntersecting; dockState(); }, { threshold: .15 }).observe(finalSec);
  }

  /* ---------- the application ---------- */
  var qz = $('#apply'), body = $('#qz-body'), KEY = 'closed-app-v1';
  var st = store.get(KEY) || { i: 0, a: {}, done: false };
  var save = function () { st.ts = Date.now(); store.set(KEY, st); };
  var inApp = /Instagram|FBAN|FBAV|TikTok|musical_ly|Bytedance|Snapchat/i.test(navigator.userAgent);

  function progress() {
    var n = QUESTIONS.length, i = st.done ? n : st.i;
    $('.qz-bar i', qz).style.setProperty('--p', (i / n * 100) + '%');
    $('.qz-count', qz).textContent = st.done ? '' : (i + 1) + '/' + n;
    var bk = $('.qz-back', qz); bk.setAttribute('aria-label', st.done ? 'Back to my answers' : (i === 0 ? 'Back to the page' : 'Back'));
  }
  function render() {
    progress();
    if (st.done) return renderBooking();
    var Q = QUESTIONS[st.i], v = st.a[Q.id] || '', html;
    if (Q.type === 'choice') {
      html = '<div class="qz-step"><h2 class="qz-q" id="qz-title">' + esc(Q.q) + '</h2><div class="qz-opts" role="group" aria-labelledby="qz-title">' +
        Q.options.map(function (o) { return '<button type="button" class="qz-opt" aria-pressed="' + (o === v) + '" data-v="' + esc(o) + '">' + esc(o) + '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg></button>'; }).join('') +
        '</div>' + backBtn() + '</div>';
      body.innerHTML = html;
      $$('.qz-opt', body).forEach(function (b) {
        b.addEventListener('click', function () {
          $$('.qz-opt', body).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          st.a[Q.id] = b.getAttribute('data-v'); save();
          setTimeout(next, reduced ? 0 : 200);
        });
      });
      var sel = $('.qz-opt[aria-pressed="true"]', body) || $('.qz-opt', body); sel.focus();
      return;
    }
    var last = st.i === QUESTIONS.length - 1;
    var field = Q.type === 'long'
      ? '<textarea class="qz-input" id="qz-in" name="' + Q.id + '" placeholder="' + esc(Q.ph) + '" maxlength="800" required>' + esc(v) + '</textarea>'
      : '<input class="qz-input" id="qz-in" name="' + Q.id + '" type="text" placeholder="' + esc(Q.ph) + '" value="' + esc(v) + '" maxlength="' + (Q.type === 'ig' ? 31 : 80) + '"' +
        (Q.auto ? ' autocomplete="' + Q.auto + '"' : ' autocomplete="off"') + (Q.type === 'ig' ? ' autocapitalize="none" autocorrect="off" spellcheck="false"' : '') + ' required>';
    body.innerHTML = '<form class="qz-step" novalidate><label class="qz-q" id="qz-title" for="qz-in">' + esc(Q.q) + '</label>' +
      (Q.hint ? '<p class="qz-hint">' + esc(Q.hint) + '</p>' : '') +
      '<div class="qz-field' + (Q.type === 'ig' ? ' qz-at' : '') + '">' + field + '</div>' +
      '<p class="qz-err" id="qz-err" role="alert"></p>' +
      '<button class="btn" type="submit">' + (last ? 'Submit my application' : 'OK') + '<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
      backBtn() + '<div class="qz-fail-slot"></div></form>';
    var f = $('form', body), inp = $('#qz-in', body);
    inp.setAttribute('aria-describedby', 'qz-err');
    inp.addEventListener('input', function () { st.a[Q.id] = inp.value; save(); $('#qz-err', body).textContent = ''; });
    if (Q.type === 'long') inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) f.requestSubmit(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = inp.value.trim().replace(/\s+/g, ' '), err = '';
      if (Q.type === 'ig') val = val.replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?].*$/, '');
      if (!val) err = Q.id === 'why' ? "Tell me a little, even one line works." : 'This one is required.';
      else if (Q.id === 'name' && !/^[\p{L}' .-]{1,40}$/u.test(val)) err = 'Just your first name, letters only.';
      else if (Q.type === 'ig' && !/^[A-Za-z0-9._]{1,30}$/.test(val)) err = "That doesn't look like an Instagram handle. Letters, numbers, dots and underscores only.";
      else if (Q.id === 'why' && val.length < 3) err = 'Give me a bit more than that.';
      if (err) { $('#qz-err', body).textContent = err; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      inp.removeAttribute('aria-invalid');
      st.a[Q.id] = val; save();
      if (last) send(f); else next();
    });
    setTimeout(function () { inp.focus(); }, 60);
  }
  function backBtn(label) {
    if (!st.done && st.i === 0) return '';
    return '<button type="button" class="qz-prev"><svg class="ic" aria-hidden="true" style="transform:scaleX(-1)"><use href="#i-arrow"/></svg>' + (label || 'Back') + '</button>';
  }
  function next() { if (st.i < QUESTIONS.length - 1) { st.i++; save(); render(); } }
  function back() {
    if (st.done) { st.done = false; st.i = QUESTIONS.length - 1; save(); render(); return; }
    if (st.i > 0) { st.i--; save(); render(); } else close();
  }

  function send(f) {
    var btn = $('button[type="submit"]', f), slot = $('.qz-fail-slot', f), a = st.a;
    btn.disabled = true; btn.firstChild.textContent = 'Sending...'; slot.innerHTML = '';
    var payload = {
      _subject: 'New Closed application: ' + a.name + (attr.ref ? ' (ref: ' + attr.ref + ')' : ''),
      _template: 'table', _captcha: 'false', _cc: C.form.cc.join(','), _honey: '',
      'First name': a.name, 'Doing for money': a.doing, 'Making a month': a.income, 'Wants in 6 months': a.goal,
      'Hours a week': a.hours, 'Why now': a.why, 'Instagram': '@' + a.ig, 'Instagram link': 'https://instagram.com/' + a.ig,
      'Ref': attr.ref || 'none', 'UTM source': attr.utm_source || '', 'UTM medium': attr.utm_medium || '', 'UTM campaign': attr.utm_campaign || '',
      'UTM content': attr.utm_content || '', 'UTM term': attr.utm_term || '', 'Landing page': attr.landing || '',
      'Submitted': new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' Central'
    };
    var ctrl = 'AbortController' in window ? new AbortController() : null, timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(C.form.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), signal: ctrl && ctrl.signal })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok || String(res.j.success) !== 'true') throw new Error(res.j.message || 'The form service said no');
        st.done = true; st.i = QUESTIONS.length - 1; save(); track('lead'); render();
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (window.console) console.error('Closed application failed:', err && err.message);
        btn.disabled = false; btn.firstChild.textContent = 'Try again';
        slot.innerHTML = '<div class="qz-fail" role="alert"><p>That didn\'t go through on our end. Your answers are saved, so you can try again, or DM me on Instagram and I\'ll get you in.</p>' +
          '<a class="btn btn-ghost" href="https://ig.me/m/' + esc(C.instagram) + '" target="_blank" rel="noopener">DM me on IG instead</a></div>';
      });
  }

  function renderBooking() {
    var name = st.a.name ? esc(st.a.name) + ', your' : 'Your';
    var btn = '<a class="btn' + (inApp ? '' : ' btn-ghost') + ' bk-alt" href="' + esc(C.booking.link) + '" target="_blank" rel="noopener">' + (inApp ? 'Book your call' : 'Calendar not loading? Open it here') + '</a>';
    var pre = C.preCallVideo ? '<li>Watch <a href="' + esc(C.preCallVideo) + '" target="_blank" rel="noopener">this short video</a> before the call.</li>' : '';
    body.innerHTML = '<div class="qz-step"><h2 class="qz-q" id="qz-title">Last step, pick a time with me</h2>' +
      '<p class="qz-hint">' + name + ' application is in. Grab a time that works below.</p>' +
      (inApp ? btn + '<p class="bk-note">Calendar not loading in this app? Tap the button.</p>' : '') +
      '<iframe class="bk-frame" src="' + esc(C.booking.embed) + '" title="Book a call with Ismail" loading="lazy"></iframe>' +
      (inApp ? '' : btn) +
      '<div class="bk-confirm"><p>Picked a time? Tap this so I know you\'re locked in.</p><a class="btn btn-lg" href="/closed/booked/">I booked my call<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg></a></div>' +
      '<div class="bk-after"><h3>After you book</h3><ul class="list">' + pre + '<li>Show up on time.</li><li>Be somewhere quiet.</li><li>Come with questions.</li></ul></div>' +
      backBtn('Back to my answers') + '</div>';
  }

  function open() {
    st = store.get(KEY) || st; render();
    if (typeof qz.showModal === 'function') qz.showModal(); else qz.setAttribute('open', '');
    doc.documentElement.classList.add('lock'); dockState();
  }
  function close() { if (qz.close) qz.close(); else qz.removeAttribute('open'); }
  qz.addEventListener('close', function () { doc.documentElement.classList.remove('lock'); dockState(); });
  $('.qz-x', qz).addEventListener('click', close);
  $('.qz-back', qz).addEventListener('click', back);
  body.addEventListener('click', function (e) { if (e.target.closest('.qz-prev')) back(); });
  $$('[data-apply]').forEach(function (b) { b.addEventListener('click', open); });
  if (location.hash === '#apply') open();
})();
