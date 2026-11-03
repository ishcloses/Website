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
    // The Calendly event. The calendar fills in their name, email and phone, and sends them to the booked page once they book.
    link: 'https://calendly.com/ishcloses/30min',
    phoneQuestion: 'a1'   // where Phone Number sits in the event's questions (a1 = first). Change it if you reorder them in Calendly.
  },
  form: {
    // Applications go to Netlify Forms first (built into the hosting, see the hidden form at the bottom of index.html).
    // Email alerts are set in Netlify: Forms > closed-application > Form notifications.
    // If Netlify can't be reached, FormSubmit is the backup: the first address gets it and everyone in cc is copied.
    netlify: 'closed-application',
    backup: 'https://formsubmit.co/ajax/ishcloses@gmail.com',
    cc: ['nizalsells@gmail.com']
  },
  // Who isn't a fit yet. If any answer matches a line here, they see the not-a-fit screen instead of the calendar.
  // question is the id from QUESTIONS below, answer is the option exactly as it's written there. Add as many lines as you like.
  notAFit: [
    { question: 'hours', answer: 'Under 10' }
  ],
  instagram: 'ishcloses',
  // The "watch this before our call" video on the booked page. A Google Drive share link plays right on the page. Empty = section hidden.
  preCallVideo: 'https://drive.google.com/file/d/1hM1O5UE2jh30GBnz1p2YGFpNQotNoqt0/view?usp=share_link',
  pixels: {
    meta: '',     // Meta Pixel ID. Empty = off. Fires PageView, Lead on application, Schedule on the booked page.
    tiktok: ''    // TikTok Pixel ID. Empty = off. Fires page, SubmitForm on application, Schedule on the booked page.
  }
};

var QUESTIONS = [
  { id: 'doing', type: 'choice', q: 'What are you doing for money right now?', options: ['9-to-5', 'Side hustle', 'Sales job', 'My own business', 'Student', 'Nothing right now'] },
  { id: 'income', type: 'choice', q: 'Roughly how much are you making a month?', options: ['Under $2k', '$2k to $4k', '$4k to $7k', '$7k+'] },
  { id: 'goal', type: 'text', q: 'How much do you want to be making in 6 months?', ph: 'e.g. $8k a month' },
  { id: 'hours', type: 'choice', q: 'How many hours a week can you put into this?', options: ['Under 10', '10 to 20', '20 to 30', '30+'] },
  { id: 'why', type: 'long', q: 'Why now? What made you click this?', ph: 'Be specific.', hint: "Be specific. This is how I know you're serious and genuinely aware you need a change NOW." }
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

  /* ---------- sending to the inbox: Netlify Forms, then FormSubmit as the backup ----------
     One application per person, sent when they tap View available times.
     If both services are down the applicant carries on anyway. Whatever didn't send waits in this
     browser and goes out again the next time any Closed page opens (the booked page is the next one). */
  var PENDING = 'closed-pending', KEY = 'closed-app-v1';
  function post(url, opts) {
    var ctrl = 'AbortController' in window ? new AbortController() : null, timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    opts.signal = ctrl && ctrl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }
  function viaNetlify(f) {
    var b = new URLSearchParams(); b.append('form-name', C.form.netlify);
    Object.keys(f).forEach(function (k) { b.append(k, f[k]); });
    return post('/closed/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: b.toString(), keepalive: true })
      .then(function (r) { if (!r.ok) throw new Error('Netlify said ' + r.status); });
  }
  function viaBackup(f) {
    var p = { _subject: f.subject, _template: 'table', _captcha: 'false', _cc: C.form.cc.join(','), _honey: '' };
    Object.keys(f).forEach(function (k) { if (k !== 'subject') p[k] = f[k]; });
    return post(C.form.backup, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(p) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (res) { if (!r.ok || String(res.success) !== 'true') throw new Error(res.message || 'FormSubmit said ' + r.status); }); });
  }
  function deliver(f) {
    return viaNetlify(f).catch(function (err) {
      if (window.console) console.warn('Closed application: Netlify failed, trying the backup.', err && err.message);
      return viaBackup(f);
    });
  }
  function pending() { var p = store.get(PENDING) || {}; return p.subject ? { application: p } : p; }   // older visits saved one application on its own
  function settle(kind, f) {
    var p = pending(); if (f) p[kind] = f; else delete p[kind];
    if (Object.keys(p).length) store.set(PENDING, p); else try { localStorage.removeItem(PENDING); } catch (e) { }
  }
  /* saved here first and cleared once it lands, so it can go in the background without waiting on anyone */
  function submit(kind, f) {
    settle(kind, f);
    return deliver(f).then(function () { if (JSON.stringify(pending()[kind]) === JSON.stringify(f)) settle(kind); }, function (err) {
      if (window.console) console.error('Closed ' + kind + ' not sent yet, saved to resend:', err && err.message);
    });
  }
  var waiting = pending();
  Object.keys(waiting).forEach(function (kind) {
    deliver(waiting[kind]).then(function () { if (JSON.stringify(pending()[kind]) === JSON.stringify(waiting[kind])) settle(kind); }, function () { });
  });

  /* a Google Drive share link (drive.google.com/file/d/FILE_ID/view) plays through Drive's own player */
  function driveId(url) { var m = /drive\.google\.com\/.*(?:\/d\/|[?&]id=)([\w-]{10,})/.exec(url || ''); return m && m[1]; }

  /* ---------- the booked page ---------- */
  if (page === 'booked') {
    track('schedule');
    var v = $('#pre-video'), drive = driveId(C.preCallVideo);
    if (v && C.preCallVideo) {
      v.innerHTML = drive
        ? '<div class="vid"><iframe src="https://drive.google.com/file/d/' + drive + '/preview" title="Watch this before our call" allow="autoplay; fullscreen" allowfullscreen></iframe></div>'
        : '<a class="btn" href="' + esc(C.preCallVideo) + '" target="_blank" rel="noopener">Watch the video</a>';
      $('#pre-video-step').hidden = false;
      // Drive picks the quality from the player's size, so a vertical video gets a vertical frame instead of a thin strip in 16:9
      if (drive) {
        var probe = new Image();
        probe.onload = function () { if (probe.naturalHeight > probe.naturalWidth) $('.vid', v).classList.add('vid-tall'); };
        probe.src = 'https://drive.google.com/thumbnail?id=' + drive + '&sz=w400';
      }
    }
    return;
  }
  if (page !== 'home') return;

  /* ---------- config text ---------- */
  var labels = { cohortLong: C.cohort.long, cohortShort: C.cohort.short, spots: C.cohort.spots, doorsClose: C.cohort.doorsClose };
  $$('[data-bind]').forEach(function (el) { var k = el.getAttribute('data-bind'); if (labels[k] != null) el.textContent = labels[k]; });
  function ctaText(t) { $$('[data-cta]').forEach(function (el) { el.textContent = t; }); }
  ctaText('join the roster');

  /* ---------- countdown to the cohort, in Central time ---------- */
  var bar = $('#bar'), target = Date.parse(C.cohort.start), cd = {};
  $$('[data-cd]').forEach(function (el) { var k = el.getAttribute('data-cd'); (cd[k] = cd[k] || []).push(el); });
  var put = function (k, v) { cd[k].forEach(function (el) { el.textContent = v; }); };
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  function tick() {
    var ms = target - Date.now();
    if (!(ms > 0)) {
      bar.classList.add('done');
      $('.bar-msg', bar).textContent = 'Draft Day is here. Apply for the next draft.';
      var board = $('.board'); if (board) board.hidden = true;
      ctaText('apply for the next draft');
      var ft = $('#final-t'); if (ft) ft.textContent = 'The next draft opens soon.';
      return false;
    }
    var s = Math.floor(ms / 1000);
    put('d', pad(Math.floor(s / 86400))); put('h', pad(Math.floor(s % 86400 / 3600)));
    put('m', pad(Math.floor(s % 3600 / 60))); put('s', pad(s % 60));
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
    var speeds = desk ? [28, 33, 30, 36] : [25, 30];
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
  /* after the last question st.view is where they are: fit (the contact form), nofit or book (the calendar) */
  var qz = $('#apply'), body = $('#qz-body'), busy = false;
  var NAME = /^[\p{L}' .-]{1,40}$/u;
  function load(s) {
    s = s || { i: 0, a: {}, done: false };
    if (s.done && !s.view) s.view = 'book';   // applications from before the fit screen go straight to the calendar
    if (s.view === 'text') s.view = 'fit';
    s.i = Math.min(s.i || 0, QUESTIONS.length - 1);   // the quiz got shorter, so older saves land on a real question
    if (typeof s.sent !== 'string') s.sent = '';
    return s;
  }
  var st = load(store.get(KEY));
  var save = function () { st.ts = Date.now(); store.set(KEY, st); };
  var inApp = /Instagram|FBAN|FBAV|TikTok|musical_ly|Bytedance|Snapchat/i.test(navigator.userAgent);
  // ig.me opens the DM straight away on a phone. On a computer it hits a login wall, so the profile is the fallback there.
  var dm = (inApp || matchMedia('(pointer: coarse)').matches ? 'https://ig.me/m/' : 'https://instagram.com/') + C.instagram;
  function isFit() { return !C.notAFit.some(function (r) { return st.a[r.question] === r.answer; }); }

  function progress() {
    var n = QUESTIONS.length, i = st.done ? n : st.i;
    $('.qz-bar i', qz).style.setProperty('--p', (i / n * 100) + '%');
    $('.qz-count', qz).textContent = st.done ? '' : (i + 1) + '/' + n;
    var bk = $('.qz-back', qz); bk.setAttribute('aria-label', st.done ? (st.view === 'book' ? 'Back' : 'Back to my answers') : (i === 0 ? 'Back to the page' : 'Back'));
  }
  function render() {
    if (busy) return renderLoading();
    progress();
    if (st.done) return st.view === 'fit' ? renderFit() : st.view === 'nofit' ? renderNoFit() : renderBooking();
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
      : '<input class="qz-input" id="qz-in" name="' + Q.id + '" type="text" placeholder="' + esc(Q.ph) + '" value="' + esc(v) + '" maxlength="80"' +
        (Q.auto ? ' autocomplete="' + Q.auto + '"' : ' autocomplete="off"') + ' required>';
    body.innerHTML = '<form class="qz-step" novalidate><label class="qz-q" id="qz-title" for="qz-in">' + esc(Q.q) + '</label>' +
      (Q.hint ? '<p class="qz-hint">' + esc(Q.hint) + '</p>' : '') +
      '<div class="qz-field">' + field + '</div>' +
      '<p class="qz-err" id="qz-err" role="alert"></p>' +
      '<button class="btn" type="submit">' + (last ? 'Next' : 'OK') + '<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
      backBtn() + '</form>';
    var f = $('form', body), inp = $('#qz-in', body);
    inp.setAttribute('aria-describedby', 'qz-err');
    inp.addEventListener('input', function () { st.a[Q.id] = inp.value; save(); $('#qz-err', body).textContent = ''; });
    if (Q.type === 'long') inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) f.requestSubmit(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = inp.value.trim().replace(/\s+/g, ' '), err = '';
      if (!val) err = Q.id === 'why' ? "Tell me a little, even one line works." : 'This one is required.';
      else if (Q.id === 'why' && val.length < 3) err = 'Give me a bit more than that.';
      if (err) { $('#qz-err', body).textContent = err; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
      inp.removeAttribute('aria-invalid');
      st.a[Q.id] = val; save();
      if (last) analyze(); else next();
    });
    setTimeout(function () { inp.focus(); }, 60);
  }
  function backBtn(label) {
    if (!st.done && st.i === 0) return '';
    return '<button type="button" class="qz-prev"><svg class="ic" aria-hidden="true" style="transform:scaleX(-1)"><use href="#i-arrow"/></svg>' + (label || 'Back') + '</button>';
  }
  function next() { if (st.i < QUESTIONS.length - 1) { st.i++; save(); render(); } }
  function back() {
    if (busy) return;
    if (st.done && st.view === 'book') { st.view = 'fit'; save(); render(); return; }
    if (st.done) { st.done = false; st.i = QUESTIONS.length - 1; save(); render(); return; }
    if (st.i > 0) { st.i--; save(); render(); } else close();
  }

  /* everything in the one submission, sent when a fit applicant taps View available times */
  function fullName() { return [st.a.name, st.a.last].join(' ').replace(/\s+/g, ' ').trim(); }
  function details(subject) {
    var a = st.a;
    return {
      subject: subject, name: fullName(), email: a.email, phone: a.phone,
      doing_for_money: a.doing, making_a_month: a.income, wants_in_6_months: a.goal, hours_a_week: a.hours, why_now: a.why,
      ref: attr.ref || 'none', utm_source: attr.utm_source || '', utm_medium: attr.utm_medium || '', utm_campaign: attr.utm_campaign || '',
      utm_content: attr.utm_content || '', utm_term: attr.utm_term || '', landing_page: attr.landing || '',
      submitted: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' Central'
    };
  }
  /* "Analyzing answers" for a moment after the last question, then the fit or not-a-fit screen. Nothing is sent yet. */
  function analyze() {
    busy = true; render();
    setTimeout(function () { busy = false; st.done = true; st.view = isFit() ? 'fit' : 'nofit'; st.sent = ''; st.i = QUESTIONS.length - 1; save(); render(); }, 1500);
  }

  function renderLoading() {
    $('.qz-bar i', qz).style.setProperty('--p', '100%'); $('.qz-count', qz).textContent = '';
    body.innerHTML = '<div class="qz-step qz-load" role="status"><span class="qz-spin" aria-hidden="true"></span><h2 class="qz-q" id="qz-title">Analyzing answers</h2></div>';
  }

  function renderFit() {
    var a = st.a;
    var input = function (id, ph, type, auto, v) {
      return '<input class="qz-input" id="qz-' + id + '" name="' + id + '" type="' + type + '" placeholder="' + ph + '" aria-label="' + ph + '" autocomplete="' + auto + '" value="' + esc(v || '') + '" maxlength="' + (type === 'email' ? 120 : type === 'tel' ? 20 : 40) + '"' +
        (type === 'email' ? ' autocapitalize="none" spellcheck="false"' : type === 'tel' ? ' inputmode="tel"' : '') + ' aria-describedby="qz-err" required>';
    };
    body.innerHTML = '<form class="qz-step" novalidate>' +
      '<p class="qz-fit"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>Based on your answers, this looks like a fit.</p>' +
      '<h2 class="qz-q" id="qz-title">Grab a time with me</h2>' +
      '<div class="qz-fields"><div class="qz-pair">' + input('first', 'First name', 'text', 'given-name', a.name) + input('last', 'Last name', 'text', 'family-name', a.last) + '</div>' +
      input('email', 'Email', 'email', 'email', a.email) + input('phone', 'Phone number', 'tel', 'tel-national', a.phone) + '</div>' +
      '<p class="qz-err" id="qz-err" role="alert"></p>' +
      '<button class="btn btn-lg" type="submit">View available times<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button></form>';
    var f = $('form', body), keys = { first: 'name', last: 'last', email: 'email', phone: 'phone' };
    Object.keys(keys).forEach(function (id) {
      $('#qz-' + id, body).addEventListener('input', function (e) { a[keys[id]] = e.target.value; save(); $('#qz-err', body).textContent = ''; e.target.removeAttribute('aria-invalid'); });
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = function (id) { return $('#qz-' + id, body).value.trim().replace(/\s+/g, ' '); };
      var first = val('first'), last = val('last'), email = val('email'), digits = val('phone').replace(/\D/g, ''), bad = '', err = '';
      if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
      if (!NAME.test(first)) { bad = 'first'; err = first ? 'Just your first name, letters only.' : "What's your first name?"; }
      else if (!NAME.test(last)) { bad = 'last'; err = last ? 'Just your last name, letters only.' : "What's your last name?"; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { bad = 'email'; err = email ? "That doesn't look like an email." : "What's your email?"; }
      else if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) { bad = 'phone'; err = digits ? "That doesn't look like a US number. Use 10 digits, like (214) 555-0123." : "What's your phone number?"; }
      if (err) { $('#qz-err', body).textContent = err; $('#qz-' + bad, body).setAttribute('aria-invalid', 'true'); $('#qz-' + bad, body).focus(); return; }
      a.name = first; a.last = last; a.email = email; a.phone = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6); save();
      // the calendar opens straight away and the application sends in the background. Same details twice = no second email.
      var key = [first, last, email, a.phone].join('|');
      if (st.sent !== key) {
        submit('application', details('New Closed application: ' + fullName() + (attr.ref ? ' (ref: ' + attr.ref + ')' : '')));
        st.sent = key; track('lead');
      }
      st.view = 'book'; save(); render();
    });
    if (!a.name) setTimeout(function () { $('#qz-first', body).focus(); }, 60);
  }

  function renderNoFit() {
    var name = st.a.name ? ', ' + esc(st.a.name) : '';
    body.innerHTML = '<div class="qz-step"><h2 class="qz-q" id="qz-title">Doesn\'t look like this is the right fit right now.</h2>' +
      '<p class="qz-copy">Thanks for being real with your answers' + name + '. Based on what you shared, I don\'t think the roster is the right move for you at this moment, and I\'d rather tell you that than waste your time. That can change. If you still want to talk it through, message me on Instagram and I\'ll get back to you.</p>' +
      '<a class="btn btn-lg qz-dm" href="' + esc(dm) + '" target="_blank" rel="noopener">Message me on Instagram<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
      '<button type="button" class="qz-link" data-home>Back to the page</button></div>';
  }

  /* the Calendly link with what they typed on the fit screen already filled in */
  function calendly(embed) {
    var a = st.a, p = [];
    var add = function (k, v) { if (v) p.push(k + '=' + encodeURIComponent(v)); };
    if (embed) { add('embed_domain', location.hostname); add('embed_type', 'Inline'); add('hide_event_type_details', '1'); add('hide_gdpr_banner', '1'); }
    add('name', fullName()); add('email', a.email);
    if (a.phone) add(C.booking.phoneQuestion, '+1' + a.phone.replace(/\D/g, ''));
    return C.booking.link + (C.booking.link.indexOf('?') > -1 ? '&' : '?') + p.join('&');
  }
  function renderBooking() {
    var name = st.a.name ? esc(st.a.name) + ', your' : 'Your';
    var pre = C.preCallVideo ? '<li>Watch <a href="' + esc(C.preCallVideo) + '" target="_blank" rel="noopener">this short video</a> before the call.</li>' : '';
    body.innerHTML = '<div class="qz-step"><h2 class="qz-q" id="qz-title">Last step, pick a time with me</h2>' +
      '<p class="qz-hint">' + name + ' application is in. Grab a time that works below.</p>' +
      '<iframe class="bk-frame" src="' + esc(calendly(true)) + '" title="Book a call with Ismail"></iframe>' +
      '<a class="btn btn-ghost bk-alt" href="' + esc(calendly(false)) + '" target="_blank" rel="noopener">Calendar not loading? Open it here</a>' +
      '<div class="bk-after"><h3>After you book</h3><ul class="list">' + pre + '<li>Show up on time.</li><li>Be somewhere quiet.</li><li>Come with questions.</li></ul></div>' +
      backBtn() + '</div>';
  }
  // Calendly tells the page how tall it is (so the calendar grows instead of scrolling inside itself) and when a time is booked
  addEventListener('message', function (e) {
    if (e.origin !== 'https://calendly.com' || !e.data) return;
    if (e.data.event === 'calendly.event_scheduled') location.href = '/closed/booked/';
    var fr = $('.bk-frame', body), h = parseInt(e.data.payload && e.data.payload.height, 10);
    if (e.data.event === 'calendly.page_height' && fr && h > 400) fr.style.height = h + 'px';
  });

  function open() {
    st = load(store.get(KEY) || st); render();
    if (typeof qz.showModal === 'function') qz.showModal(); else qz.setAttribute('open', '');
    doc.documentElement.classList.add('lock'); dockState();
  }
  function close() { if (qz.close) qz.close(); else qz.removeAttribute('open'); }
  qz.addEventListener('close', function () { doc.documentElement.classList.remove('lock'); dockState(); });
  $('.qz-x', qz).addEventListener('click', close);
  $('.qz-back', qz).addEventListener('click', back);
  body.addEventListener('click', function (e) {
    if (e.target.closest('.qz-prev')) back();
    else if (e.target.closest('[data-home]')) close();
  });
  $$('[data-apply]').forEach(function (b) { b.addEventListener('click', open); });
  if (location.hash === '#apply') open();
})();
