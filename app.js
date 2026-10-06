(function () {
  function openFolds(el) {
    var node = el;
    while (node) {
      if (node.tagName === "DETAILS") node.open = true;
      node = node.parentElement;
    }
  }
  function openHash() {
    var id = (location.hash || "").slice(1);
    if (!id || id.indexOf("tale-") === 0) return;
    var el = document.getElementById(id);
    if (el) openFolds(el);
  }
  window.addEventListener("hashchange", openHash);
  openHash();

  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* localStorage без падений (приватный режим, запрет хранения) */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function lsJson(k) { try { var v = JSON.parse(lsGet(k)); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }

  /* ---------- меню ---------- */
  var bar = $('#bar'), menubtn = $('#menubtn'), menu = $('#menu');
  function setMenu(on) {
    bar.classList.toggle('open', on);
    menubtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  menubtn.addEventListener('click', function () { setMenu(!bar.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', function (e) {
    if (bar.classList.contains('open') && !e.target.closest('#bar')) setMenu(false);
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 899) setMenu(false); });

  /* ---------- режим чтения ---------- */
  var reader = $('#reader'), scroller = $('#r-scroll');
  var rTitle = $('#r-title'), rKicker = $('#r-kicker'), rTabs = $('#r-tabs'), rBody = $('#r-body'), rSrc = $('#r-src'), rNext = $('#r-next');
  var rAudio = $('#r-audio'), rPlay = $('#r-play'), rPlayBtn = $('#r-play-btn'), rSeek = $('#r-play-seek'), rPlayTime = $('#r-play-time'), rPlayDur = $('#r-play-dur'), rFig = $('#r-fig'), rVoice = $('#r-voice'), rJumps = $('#r-jumps');
  var rPos = $('#r-pos'), prog = $('#r-prog');
  var minus = $('#r-minus'), plus = $('#r-plus');
  var inertEls = $$('#bar, #main, .foot, #texts, .skip');
  var order = $$('.tale-text').map(function (a) { return a.id.replace('tale-', ''); });
  var baseTitle = document.title;
  var lastTrigger = null, cameFromSite = false, isOpen = false;
  var curSlug = null, pendingResume = null, restoreIdx = null, restoreUntil = 0, saveTimer = null;
  var listY = null, jumpHold = false, audioKey = null, pendingT = 0, lastSavedT = 0, words = 0;
  var rLeft = $('#r-left'), rRelated = $('#r-related'), rState = $('#r-state'), rDone = $('#r-done'), rReset = $('#r-reset');

  var RS_MIN = 16, RS_MAX = 36, rs = 0;
  function loadRs() {
    var v = NaN;
    try { v = parseInt(localStorage.getItem('tales-rs'), 10); } catch (e) {}
    rs = isNaN(v) ? (window.innerWidth < 900 ? 20 : 22) : Math.min(RS_MAX, Math.max(RS_MIN, v));
    applyRs();
  }
  function applyRs() {
    root.style.setProperty('--rs', rs + 'px');
    minus.disabled = rs <= RS_MIN; plus.disabled = rs >= RS_MAX;
  }
  function changeRs(d) {
    rs = Math.min(RS_MAX, Math.max(RS_MIN, rs + d));
    try { localStorage.setItem('tales-rs', String(rs)); } catch (e) {}
    applyRs();
  }
  /* тема чтения: пергамент по умолчанию, «ночь» — прежнее тёмное оформление */
  var themeBtn = $('#r-theme');
  function applyRt(t) {
    root.setAttribute('data-rt', t);
    themeBtn.setAttribute('aria-pressed', t === 'night' ? 'false' : 'true');
    themeBtn.setAttribute('aria-label', t === 'night' ? 'Светлый режим чтения (пергамент)' : 'Ночной режим чтения');
    themeBtn.firstChild.textContent = t === 'night' ? '\u2600' : '\u263E';
  }
  applyRt(lsGet('tales-rt') === 'night' ? 'night' : 'paper');
  themeBtn.addEventListener('click', function () {
    var t = root.getAttribute('data-rt') === 'night' ? 'paper' : 'night';
    lsSet('tales-rt', t); applyRt(t);
  });
  minus.addEventListener('click', function () { changeRs(-2); });
  plus.addEventListener('click', function () { changeRs(2); });

  function syncProg() {
    var max = scroller.scrollHeight - scroller.clientHeight;
    var p = max > 8 ? scroller.scrollTop / max : 1;
    prog.style.transform = 'scaleX(' + p + ')';
    updateLeft();
  }
  scroller.addEventListener('scroll', syncProg, { passive: true });

  function showVariant(k) {
    var vs = $$('.variant', rBody);
    vs.forEach(function (v, i) { v.hidden = i !== k; });
    $$('button', rTabs).forEach(function (b, i) { b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
    var v = vs[k];
    if (v) {
      rKicker.textContent = (v.getAttribute('data-label') || '') + ' · около ' + v.getAttribute('data-min') + ' мин';
      var audio = v.getAttribute('data-audio');
      saveVoice(true);
      rAudio.pause();
      if (audio) {
        var ve = ent(curSlug, v.getAttribute('data-num') || '');
        pendingT = ve && ve.t > 3 ? ve.t : 0;
        rAudio.hidden = false;
        if (rPlay) rPlay.hidden = false;
        rVoice.hidden = false;
        rVoice.textContent = 'Голос читает эту запись целиком.' + (pendingT ? ' Продолжится с ' + fmtT(pendingT) + '.' : '');
        if (rAudio.getAttribute('src') !== audio) {
          rAudio.src = audio;
          if (pendingT) { try { rAudio.currentTime = pendingT; } catch (e) {} }
        }
        audioKey = curSlug + '/' + (v.getAttribute('data-num') || '');
        lastSavedT = pendingT;
      } else {
        audioKey = null; pendingT = 0;
        rAudio.hidden = true;
        if (rPlay) rPlay.hidden = true;
        rAudio.removeAttribute('src');
        rVoice.hidden = false;
        rVoice.textContent = 'Эту запись голос пока не читает.';
      }
      if (vs.length > 1) {
        rPos.hidden = false;
        rPos.textContent = 'вариант ' + (k + 1) + ' из ' + vs.length;
      } else {
        rPos.hidden = true;
        rPos.textContent = '';
      }
    }
    scroller.scrollTop = 0;
    countWords();
    paintMark();
    requestAnimationFrame(function () { syncProg(); updateLeft(); });
  }

  function variantIndex(art, num) {
    var vs = $$('.variant', art);
    if (!num) return 0;
    for (var i = 0; i < vs.length; i++) {
      if (vs[i].getAttribute('data-num') === String(num)) return i;
    }
    return 0;
  }

  function render(slug, num) {
    var art = $('#tale-' + slug);
    if (saveTimer != null) { clearTimeout(saveTimer); saveProgress(); }
    curSlug = slug;
    rTitle.textContent = art.getAttribute('data-title');
    var img = art.getAttribute('data-img');
    if (img) { rFig.src = img; rFig.hidden = false; rFig.alt = art.getAttribute('data-title'); }
    else rFig.hidden = true;
    rBody.innerHTML = '';
    rTabs.innerHTML = '';
    var variants = $$('.variant', art);
    variants.forEach(function (v) { rBody.appendChild(v.cloneNode(true)); });
    var start = variantIndex(art, num);
    if (variants.length > 1) {
      variants.forEach(function (v, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Запись ' + (v.getAttribute('data-rec') || (i + 1)) + ' · ~' + v.getAttribute('data-min') + ' мин';
        b.addEventListener('click', function () {
          showVariant(i);
          var next = '#tale-' + slug + '/' + v.getAttribute('data-num');
          if (location.hash !== next) history.replaceState(null, '', next);
        });
        rTabs.appendChild(b);
      });
    }
    showVariant(start);
    var canon = '#tale-' + slug + '/' + variants[start].getAttribute('data-num');
    if (location.hash !== canon) history.replaceState(null, '', canon);
    rSrc.innerHTML = '';
    var src = $('.tale-src', art);
    if (src) rSrc.innerHTML = src.innerHTML;
    rNext.innerHTML = '';
    var i = order.indexOf(slug);
    [[i - 1, 'Предыдущая', '← '], [i + 1, 'Следующая', '']].forEach(function (pair, n) {
      var sl = order[pair[0]];
      if (!sl) return;
      var a = document.createElement('a');
      a.href = '#tale-' + sl;
      a.className = n === 0 ? 'rn-prev' : 'rn-next';
      a.innerHTML = '<span class="rn-k"></span><span class="rn-t"></span>';
      a.firstChild.textContent = pair[2] + pair[1] + (n === 1 ? ' →' : '');
      a.lastChild.textContent = $('#tale-' + sl).getAttribute('data-title');
      rNext.appendChild(a);
    });
    renderRelated(slug);
    document.title = art.getAttribute('data-title') + ' — Славянские сказки';
  }

  function openReader(slug, num) {
    if (!$('#tale-' + slug)) return;
    if (!isOpen) {
      lastTrigger = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      listY = window.pageYOffset;
      inertEls.forEach(function (el) { el.setAttribute('inert', ''); });
      reader.hidden = false;
      root.classList.add('reading');
      isOpen = true;
    }
    setMenu(false);
    jumpHold = false;
    render(slug, num || '');
    scroller.scrollTop = 0;
    rTitle.focus({ preventScroll: true });
    if (pendingResume && pendingResume.slug === slug) { startRestore(pendingResume.idx); }
    pendingResume = null;
    updateUp();
  }
  function restoreList() {
    if (listY == null) return false;
    var y = listY, go = function () { window.scrollTo(0, y); };
    listY = null;
    go(); requestAnimationFrame(go); setTimeout(go, 90); setTimeout(go, 300);
    return true;
  }
  function closeReader() {
    if (!isOpen) return;
    saveVoice(true);
    if (saveTimer != null) { clearTimeout(saveTimer); saveProgress(); }
    reader.hidden = true;
    if (rAudio) rAudio.pause();
    root.classList.remove('reading');
    inertEls.forEach(function (el) { el.removeAttribute('inert'); });
    isOpen = false;
    document.title = baseTitle;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    restoreIdx = null;
    didRestore = restoreList();
    updateResume();
    updateUp();
  }
  function parseHash() {
    var m = /^#tale-([a-z-]+)(?:\/(\d+))?$/.exec(location.hash);
    if (!m || !$('#tale-' + m[1])) return null;
    return { slug: m[1], num: m[2] || '' };
  }
  function onHash() {
    var h = parseHash();
    if (h) openReader(h.slug, h.num); else closeReader();
  }
  window.addEventListener('hashchange', function () { cameFromSite = true; onHash(); });

  $('#r-close').addEventListener('click', function () {
    if (cameFromSite) { history.back(); return; }
    history.replaceState(null, '', '#tales');
    closeReader();
    if (!didRestore) { var t = $('#tales'); if (t) t.scrollIntoView(); }
  });
  rNext.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    location.replace(a.getAttribute('href'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (isOpen) { $('#r-close').click(); }
    else if (bar.classList.contains('open')) { setMenu(false); menubtn.focus(); }
  });

  rJumps.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b) return;
    var part = parseFloat(b.getAttribute('data-jump'));
    var vis = $('.variant:not([hidden])', rBody) || $('.variant', rBody);
    if (!vis) return;
    var ps = $$('p', vis);
    var el = ps[Math.min(ps.length - 1, Math.floor(ps.length * part))] || vis;
    jumpHold = part > 0;
    el.scrollIntoView({ block: 'start' });
  });

  /* ---------- продолжить чтение ---------- */
  function visVariant() { return $('.variant:not([hidden])', rBody); }
  function paraEls() { var v = visVariant(); return v ? $$('p', v) : []; }
  function scrollToPara(i) {
    var ps = paraEls();
    var p = ps[Math.min(i, ps.length - 1)];
    if (!p) return;
    var top = p.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12;
    scroller.scrollTop = Math.max(0, top);
  }
  function startRestore(idx) {
    restoreIdx = idx;
    restoreUntil = Date.now() + 1800;
    var again = function () { if (restoreIdx != null) scrollToPara(restoreIdx); };
    requestAnimationFrame(again);
    setTimeout(again, 250);
    setTimeout(again, 800);
    setTimeout(function () { again(); restoreIdx = null; }, 1700);
    if (rFig && !rFig.complete) rFig.addEventListener('load', again, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(again);
  }
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    scroller.addEventListener(ev, function () { restoreIdx = null; restoreUntil = 0; jumpHold = false; }, { passive: true });
  });

  /* ---------- прогресс чтения (v2: отдельно по каждой записи) ---------- */
  var P_KEY = 'tales-p2', store = { v: 2, i: {} }, didRestore = false;
  function numsOf(slug) { var a = $('#tale-' + slug); return a ? $$('.variant', a).map(function (v) { return v.getAttribute('data-num') || ''; }) : []; }
  function persist() { lsSet(P_KEY, JSON.stringify(store)); }
  function loadStore() {
    var st = lsJson(P_KEY);
    if (st && st.v === 2 && st.i && typeof st.i === 'object') { store = st; return; }
    store = { v: 2, i: {} };
    /* миграция старого формата: tales-progress {slug: {num, idx, pct}} + tales-last */
    var old = lsJson('tales-progress'), last = lsGet('tales-last'), n = 0, any = false;
    if (old) Object.keys(old).forEach(function (slug) {
      var e = old[slug], nums = numsOf(slug);
      if (!e || typeof e !== 'object' || !nums.length) return;
      var num = e.num && nums.indexOf(String(e.num)) > -1 ? String(e.num) : nums[0];
      var p = Math.max(1, Math.min(99, parseInt(e.pct, 10) || 1));
      store.i[slug + '/' + num] = { p: p, i: Math.max(0, parseInt(e.idx, 10) || 0), t: 0, d: 0, ts: Date.now() - (slug === last ? 0 : 60000 * (1 + n++)) };
      any = true;
    });
    if (any) persist();
  }
  function ent(slug, num) { return store.i[slug + '/' + num] || null; }
  function statusOf(slug, num) {
    var e = ent(slug, num);
    if (e && e.d) return { k: 'done' };
    if (e && e.p >= 1) return { k: 'prog', p: Math.min(99, e.p) };
    return { k: 'new' };
  }
  function statusText(st) { return st.k === 'done' ? 'прочитана' : st.k === 'prog' ? 'в процессе ' + st.p + '%' : 'не начата'; }
  function curNum() { var v = visVariant(); return v ? (v.getAttribute('data-num') || '') : ''; }
  function fmtT(sec) { sec = Math.max(0, Math.floor(sec)); var m = Math.floor(sec / 60), r = sec % 60; return m + ':' + (r < 10 ? '0' : '') + r; }

  function readPos() {
    var v = visVariant();
    if (!v) return null;
    var max = scroller.scrollHeight - scroller.clientHeight;
    var pct = max > 8 ? Math.round(scroller.scrollTop / max * 100) : 0;
    var ps = $$('p', v), sr = scroller.getBoundingClientRect(), idx = 0, lastP = ps[ps.length - 1];
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].getBoundingClientRect().bottom > sr.top + 16) { idx = i; break; }
    }
    return { pct: pct, idx: idx, atEnd: max > 8 && !!lastP && lastP.getBoundingClientRect().bottom <= sr.bottom + 2 };
  }
  function saveProgress() {
    saveTimer = null;
    if (!isOpen || !curSlug || Date.now() < restoreUntil || jumpHold) return;
    var pos = readPos();
    if (!pos) return;
    var key = curSlug + '/' + curNum(), e = store.i[key];
    if (e && e.d) return;
    if (pos.atEnd) {
      store.i[key] = { p: 100, i: pos.idx, t: 0, d: 1, ts: Date.now() };
    } else {
      if (pos.pct < 3 && e && e.p >= 10) return;   /* прыжок к началу не сбрасывает прогресс */
      if (pos.pct < 1) return;
      store.i[key] = { p: Math.min(99, Math.max(e ? e.p : 0, pos.pct)), i: pos.idx, t: e ? e.t : 0, d: 0, ts: Date.now() };
    }
    persist();
    paintMark();
  }
  scroller.addEventListener('scroll', function () {
    if (saveTimer == null) saveTimer = setTimeout(saveProgress, 300);
  }, { passive: true });
  window.addEventListener('pagehide', function () {
    if (saveTimer != null) { clearTimeout(saveTimer); saveProgress(); }
    saveVoice(true);
  });

  /* озвучка: секунда для продолжения */
  function saveVoice(force) {
    if (!audioKey || !rAudio || !isFinite(rAudio.currentTime)) return;
    var t = rAudio.currentTime, dur = rAudio.duration;
    if (!force && Math.abs(t - lastSavedT) < 3) return;
    if (t < 3) return;
    var e = store.i[audioKey] || { p: 0, i: 0, t: 0, d: 0, ts: 0 };
    if (e.d) return;
    var near = isFinite(dur) && dur - t < 3;
    e.t = near ? 0 : Math.floor(t);
    if (isFinite(dur) && dur > 0) e.p = Math.min(99, Math.max(e.p, Math.round(t / dur * 100)));
    e.ts = Date.now();
    store.i[audioKey] = e;
    lastSavedT = t;
    persist();
  }
  rAudio.addEventListener('timeupdate', function () { saveVoice(false); updateLeft(); paintPlay(); });
  rAudio.addEventListener('pause', function () { saveVoice(true); updateLeft(); paintPlay(); });
  rAudio.addEventListener('loadedmetadata', function () {
    if (pendingT && isFinite(rAudio.duration) && pendingT < rAudio.duration - 3 && Math.abs(rAudio.currentTime - pendingT) > 1) {
      try { rAudio.currentTime = pendingT; } catch (e) {}
    }
    pendingT = 0;
    updateLeft();
    paintPlay();
  });
  rAudio.addEventListener('ended', function () {
    if (!audioKey) return;
    store.i[audioKey] = { p: 100, i: (store.i[audioKey] || {}).i || 0, t: 0, d: 1, ts: Date.now() };
    persist(); paintMark(); updateLeft(); paintPlay();
  });
  var seeking = false;
  function paintPlay() {
    if (!rPlay || !rSeek) return;
    var dur = rAudio.duration, t = rAudio.currentTime || 0, ok = isFinite(dur) && dur > 0;
    if (rPlayTime) rPlayTime.textContent = fmtT(t);
    if (rPlayDur) rPlayDur.textContent = ok ? fmtT(dur) : '0:00';
    if (!seeking) {
      var pct = ok ? (t / dur * 100) : 0;
      rSeek.value = String(Math.round(pct * 10));
      rSeek.style.setProperty('--p', pct + '%');
    }
    if (rPlayBtn) {
      rPlayBtn.textContent = rAudio.paused ? '▶' : '❚❚';
      rPlayBtn.setAttribute('aria-label', rAudio.paused ? 'Слушать' : 'Пауза');
    }
  }
  if (rPlayBtn) rPlayBtn.addEventListener('click', function () {
    if (rAudio.paused) { var p = rAudio.play(); if (p && p.catch) p.catch(function () {}); }
    else rAudio.pause();
  });
  if (rSeek) {
    rSeek.addEventListener('input', function () {
      seeking = true;
      rSeek.style.setProperty('--p', (rSeek.value / 10) + '%');
    });
    rSeek.addEventListener('change', function () {
      seeking = false;
      if (isFinite(rAudio.duration)) rAudio.currentTime = rAudio.duration * (rSeek.value / 1000);
      paintPlay();
    });
  }

  /* осталось читать: слова (150 слов/мин) и, если пошла озвучка, оставшаяся длительность */
  function countWords() {
    words = 0;
    paraEls().forEach(function (p) { var m = p.textContent.trim().match(/\S+/g); words += m ? m.length : 0; });
  }
  function updateLeft() {
    if (!isOpen || !rLeft) return;
    var v = visVariant();
    if (!v || !words) { rLeft.textContent = ''; return; }
    var st = statusOf(curSlug, curNum()), txt;
    if (st.k === 'done') txt = 'Прочитана';
    else {
      var vr = v.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
      var frac = vr.height > 0 ? Math.min(1, Math.max(0, (sr.top + 16 - vr.top) / vr.height)) : 0;
      var m = words * (1 - frac) / 150;
      txt = m < 0.5 ? 'Осталось меньше минуты' : 'Осталось ~' + Math.ceil(m) + ' мин';
    }
    if (audioKey && isFinite(rAudio.duration) && rAudio.duration > 0 && (rAudio.currentTime > 1 || !rAudio.paused)) {
      var rest = (rAudio.duration - rAudio.currentTime) / 60;
      txt += ' · голос: ' + (rest < 0.5 ? 'меньше минуты' : '~' + Math.ceil(rest) + ' мин');
    }
    rLeft.textContent = txt;
  }

  /* отметки «прочитана / сбросить» */
  function paintMark() {
    if (!rState) return;
    var num = curNum(), st = statusOf(curSlug || '', num), e = ent(curSlug || '', num);
    rState.textContent = 'Эта запись: ' + statusText(st) + '.';
    rDone.disabled = st.k === 'done';
    rReset.disabled = !e;
    updateLeft();
  }
  rDone.addEventListener('click', function () {
    var key = curSlug + '/' + curNum(), e = store.i[key];
    store.i[key] = { p: 100, i: e ? e.i : 0, t: 0, d: 1, ts: Date.now() };
    persist(); paintMark();
  });
  rReset.addEventListener('click', function () {
    var key = curSlug + '/' + curNum();
    delete store.i[key];
    persist();
    if (audioKey === key) { pendingT = 0; lastSavedT = 0; if (rAudio.paused) { try { rAudio.currentTime = 0; } catch (e) {} } rVoice.textContent = 'Голос читает эту запись целиком.'; }
    scroller.scrollTop = 0;
    paintMark();
  });

  /* ---------- «Продолжить чтение», «Недочитанные», отметки в списке ---------- */
  var resume = $('#resume'), resumeGo = $('#resume-go'), resumeT = $('#resume-t'), resumeX = $('#resume-x');
  var unf = $('#unf'), unfList = $('#unf-list');
  function inProgress() {
    return Object.keys(store.i).map(function (k) {
      var m = k.split('/');
      return { key: k, slug: m[0], num: m[1] || '', e: store.i[k] };
    }).filter(function (x) {
      return x.e && !x.e.d && x.e.p >= 1 && $('#tale-' + x.slug) && numsOf(x.slug).indexOf(x.num) > -1;
    }).sort(function (a, b) { return (b.e.ts || 0) - (a.e.ts || 0); });
  }
  function entryLabel(x) {
    var t = $('#tale-' + x.slug).getAttribute('data-title');
    var nums = numsOf(x.slug);
    var rec = nums.indexOf(x.num) + 1;
    return t + (nums.length > 1 ? ' · запись ' + rec : '') + ' · ' + Math.min(99, x.e.p) + '%';
  }
  function hrefOf(x) { return '#tale-' + x.slug + (x.num ? '/' + x.num : ''); }
  function updateResume() {
    paintCards();
    var list = inProgress();
    if (resume) {
      if (!list.length) resume.hidden = true;
      else {
        resumeT.textContent = entryLabel(list[0]);
        resumeGo.setAttribute('href', hrefOf(list[0]));
        resumeGo.setAttribute('data-key', list[0].key);
        resume.hidden = false;
      }
    }
    if (unf) {
      unfList.innerHTML = '';
      list.slice(1, 4).forEach(function (x) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = hrefOf(x); a.setAttribute('data-key', x.key); a.className = 'unf-a';
        a.textContent = entryLabel(x);
        li.appendChild(a); unfList.appendChild(li);
      });
      unf.hidden = list.length < 2;
    }
  }
  function goResume(a, ev) {
    var key = a.getAttribute('data-key'), e = key && store.i[key];
    if (!e) return;
    ev.preventDefault();
    var m = key.split('/');
    pendingResume = { slug: m[0], idx: e.i || 0 };
    var target = a.getAttribute('href');
    if (location.hash === target) onHash(); else location.hash = target;
  }
  resumeGo.addEventListener('click', function (e) { goResume(resumeGo, e); });
  unfList.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a'); if (a) goResume(a, e); });
  resumeX.addEventListener('click', function () {
    var key = resumeGo.getAttribute('data-key');
    if (key) { delete store.i[key]; persist(); }
    updateResume();
  });
  /* отметка в карточках списка: не начата / в процессе N% / прочитана */
  function paintCards() {
    $$('.tcard').forEach(function (c) {
      var slug = c.getAttribute('data-tale'), nums = numsOf(slug), box = $('.tstat', c);
      if (!nums.length) return;
      if (!box) { box = document.createElement('span'); box.className = 'tstat'; c.insertBefore(box, $('.tmeta', c)); }
      box.innerHTML = '';
      nums.forEach(function (n) {
        var st = statusOf(slug, n), b = document.createElement('span');
        b.className = 'st st-' + st.k;
        b.textContent = (nums.length > 1 ? 'Запись ' + (nums.indexOf(n) + 1) + ' · ' : '') + statusText(st) + (st.k === 'done' ? ' ✓' : '');
        box.appendChild(b);
      });
    });
  }

  /* ---------- герои: только те, кто есть в текстах сайта ---------- */
  function norm(t) { return String(t).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' '); }
  var HEROES = [
    { id: 'yaga', name: 'Баба-Яга', re: /баб[аыеуо]й?-яг|яга-баб|(?:^|[^а-я])яг[аиеуой](?:[^а-я]|$)/g },
    { id: 'koschey', name: 'Кощей', re: /кощ/g },
    { id: 'morozko', name: 'Морозко', re: /морозк/g },
    { id: 'wolf', name: 'Волк', re: /(?:^|[^а-я])вол[кч]/g },
    { id: 'bear', name: 'Медведь', re: /медвед/g },
    { id: 'firebird', name: 'Жар-птица', re: /жар-птиц/g },
    { id: 'vasilisa', name: 'Василиса', re: /василис/g },
    { id: 'ivan', name: 'Иван-царевич', re: /иван-царевич/g },
    { id: 'witch', name: 'Ведьма', re: /ведьм/g },
    { id: 'stepmother', name: 'Мачеха', re: /мачех/g },
    { id: 'pike', name: 'Щука', re: /(?:^|[^а-я])щук/g }
  ];
  var TALES = order.map(function (slug) {
    var art = $('#tale-' + slug), card = $('.tcard[data-tale="' + slug + '"]'), vs = $$('.variant', art);
    var full = ' ' + vs.map(function (v) { return $$('p', v).map(function (p) { return p.textContent; }).join(' '); }).join(' ') + ' ';
    var nf = full.toLowerCase().replace(/ё/g, 'е'), counts = {};
    HEROES.forEach(function (h) { var m = nf.match(h.re); counts[h.id] = m ? m.length : 0; });
    var first = vs.map(function (v) { return $$('p', v).slice(0, 3).map(function (p) { return p.textContent; }).join(' '); }).join(' ');
    var mins = vs.map(function (v) { return parseInt(v.getAttribute('data-min'), 10) || 0; });
    var hn = HEROES.filter(function (h) { return counts[h.id] > 0; }).map(function (h) { return h.name; }).join(' ');
    return {
      slug: slug, title: art.getAttribute('data-title'), li: card ? card.parentNode : null, counts: counts, mins: mins,
      voice: vs.some(function (v) { return !!v.getAttribute('data-audio'); }),
      idx: ' ' + norm(art.getAttribute('data-title') + ' ' + (card && $('.tblurb', card) ? $('.tblurb', card).textContent : '') + ' ' + full) + ' ',
      blurb: card && $('.tblurb', card) ? $('.tblurb', card).textContent : '',
      where: art.getAttribute('data-nums') || ''
    };
  });
  function talesBySlug(s) { return TALES.filter(function (t) { return t.slug === s; })[0]; }

  /* «Ещё сказки с этим героем»: только по реальным упоминаниям в текстах (не меньше 3 в обеих сказках) */
  function renderRelated(slug) {
    rRelated.innerHTML = ''; rRelated.hidden = true;
    var me = talesBySlug(slug);
    if (!me) return;
    var strong = HEROES.filter(function (h) { return me.counts[h.id] >= 3; }).sort(function (a, b) { return me.counts[b.id] - me.counts[a.id]; }).slice(0, 2);
    strong.forEach(function (h) {
      var others = TALES.filter(function (t) { return t.slug !== slug && t.counts[h.id] >= 3; }).slice(0, 4);
      if (!others.length) return;
      var p = document.createElement('p'), ul = document.createElement('p');
      p.className = 'rrel-k'; p.textContent = 'Ещё сказки, где есть: ' + h.name;
      ul.className = 'rrel-l';
      others.forEach(function (t) {
        var a = document.createElement('a'); a.href = '#tale-' + t.slug; a.textContent = t.title; ul.appendChild(a);
      });
      rRelated.appendChild(p); rRelated.appendChild(ul);
    });
    rRelated.hidden = !rRelated.firstChild;
  }
  rRelated.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    location.replace(a.getAttribute('href'));
  });

  /* ---------- поиск: одно слово, список названий ---------- */
  function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 9;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[b.length];
  }
  TALES.forEach(function (t) {
    var seen = {};
    t.words = t.idx.split(' ').filter(function (w) {
      if (w.length < 3 || seen[w]) return false;
      seen[w] = 1;
      return true;
    });
  });
  function taleNear(t, q) {
    if (t.idx.indexOf(q) > -1) return 0;
    var stem = q.length >= 6 ? q.slice(0, -2) : q.length >= 4 ? q.slice(0, -1) : '';
    if (stem.length >= 3 && t.idx.indexOf(stem) > -1) return 1;
    var best = 9, i;
    for (i = 0; i < t.words.length; i++) {
      var w = t.words[i];
      if (Math.abs(w.length - q.length) > 2) continue;
      var d = lev(q, w.length > q.length + 1 ? w.slice(0, q.length + 1) : w);
      if (d < best) best = d;
      if (best <= 1) return best;
    }
    return best;
  }
  var findBox = $('#findbox');
  function showFind(q) {
    var list = $('#find-list'), hint = $('#find-hint');
    if (!list || !hint) return;
    list.innerHTML = '';
    var raw = norm(q).trim();
    if (raw.length < 2) {
      hint.textContent = '';
      hint.hidden = true;
      return;
    }
    hint.hidden = false;
    var scored = [];
    TALES.forEach(function (t) {
      var d = taleNear(t, raw);
      if (d <= 1) scored.push({ t: t, d: d });
    });
    scored.sort(function (a, b) {
      if (a.d !== b.d) return a.d - b.d;
      var at = norm(a.t.title).indexOf(raw) > -1 ? 0 : 1;
      var bt = norm(b.t.title).indexOf(raw) > -1 ? 0 : 1;
      return at - bt;
    });
    if (!scored.length) {
      hint.textContent = 'Такого слова нет. Напиши короче или нажми кнопку ниже.';
      return;
    }
    var fuzzy = scored[0].d > 0 && norm(scored[0].t.title).indexOf(raw) < 0 && scored[0].t.idx.indexOf(raw) < 0;
    hint.textContent = (fuzzy ? 'Похоже на это. ' : '') + (scored.length === 1 ? 'Нашлась 1 сказка. Нажми на неё.' : 'Нашлось сказок: ' + scored.length + '. Нажми на название.');
    scored.forEach(function (x) {
      var t = x.t;
      var a = document.createElement('a');
      a.className = 'find-hit';
      a.href = '#tale-' + t.slug;
      a.innerHTML = '<span class="find-title"></span><span class="find-where"></span><span class="find-blurb"></span>';
      $('.find-title', a).textContent = t.title;
      $('.find-where', a).textContent = t.where;
      $('.find-blurb', a).textContent = t.blurb;
      list.appendChild(a);
    });
    var vv = window.visualViewport;
    var top = list.getBoundingClientRect().top;
    var room = vv ? vv.height : window.innerHeight;
    if (top > room - 140) window.scrollBy(0, top - 90);
  }
  function buildFind() {
    if (!findBox) return;
    findBox.innerHTML =
      '<label class="find-label" for="q">Слово</label>' +
      '<input id="q" class="qin" type="search" inputmode="search" placeholder="например: яга" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
      '<div class="find-ex" id="find-ex"></div>' +
      '<p class="find-hint" id="find-hint" hidden></p>' +
      '<div class="find-list" id="find-list"></div>' +
      '<button type="button" class="find-any" id="find-any">Не знаю, какую открыть</button>';
    var ex = $('#find-ex');
    ['яга', 'кощей', 'лиса', 'волк', 'колобок', 'царевна', 'мороз', 'щука'].forEach(function (w) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = w;
      b.addEventListener('click', function () {
        var q = $('#q');
        q.value = w;
        showFind(w);
      });
      ex.appendChild(b);
    });
    var qel = $('#q');
    function onType() { showFind(qel.value); }
    qel.addEventListener('input', onType);
    qel.addEventListener('keyup', onType);
    qel.addEventListener('search', onType);
    $('#find-any').addEventListener('click', function () {
      var t = TALES[Math.floor(Math.random() * TALES.length)];
      location.hash = '#tale-' + t.slug;
    });
  }
  buildFind();

  /* ---------- меню: подсветка текущего раздела ---------- */
  var SECS = [['find', 'find'], ['tales', 'tales'], ['more', 'more'], ['characters', 'characters'], ['plots', 'characters'], ['reading', 'reading'], ['gods', 'gods']];
  var navTick = false;
  function markNav() {
    navTick = false;
    var cur = '';
    SECS.forEach(function (s) {
      var el = document.getElementById(s[0]);
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) cur = s[1];
    });
    $$('a', menu).forEach(function (a) {
      var on = !isOpen && a.getAttribute('href') === '#' + cur;
      a.classList.toggle('cur', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  function queueNav() { if (!navTick) { navTick = true; requestAnimationFrame(markNav); } }
  window.addEventListener('scroll', queueNav, { passive: true });
  window.addEventListener('resize', queueNav);
  window.addEventListener('hashchange', queueNav);

  loadStore();
  paintCards();

  /* ---------- кнопка «Наверх» ---------- */
  var upBtn = $('#to-top');
  function updateUp() {
    var y = isOpen ? scroller.scrollTop : window.pageYOffset;
    var h = isOpen ? scroller.clientHeight : window.innerHeight;
    upBtn.hidden = !(y > h);
  }
  window.addEventListener('scroll', updateUp, { passive: true });
  window.addEventListener('resize', updateUp);
  scroller.addEventListener('scroll', updateUp, { passive: true });
  upBtn.addEventListener('click', function () {
    var beh = reduce ? 'auto' : 'smooth';
    if (isOpen) { scroller.scrollTo({ top: 0, behavior: beh }); rTitle.focus({ preventScroll: true }); }
    else { window.scrollTo({ top: 0, behavior: beh }); var b = $('.brand'); if (b) b.focus({ preventScroll: true }); }
  });

  /* ---------- фоновая музыка ---------- */
  var MUSIC = [
    { src: 'audio/music/teller-of-the-tales.mp3', title: 'Teller of the Tales' },
    { src: 'audio/music/midnight-tale.mp3', title: 'Midnight Tale' },
    { src: 'audio/music/enchanted-journey.mp3', title: 'Enchanted Journey' }
  ];
  var TARGET = 0.25, FADE_IN = 2500, FADE_OUT = 1500;
  var mBtn = $('#music'), mAudio = null, mCtx = null, mGain = null, mLevel = 0, mTimer = null, mIndex = 0;
  var wantOn = lsGet('tales-music') === '1', gesture = false, voiceOn = false, away = false, playing = false, endFading = false;

  function applyLevel(v, bookOnly) {
    mLevel = v;
    if (!bookOnly) {
      if (mGain && mCtx) { mGain.gain.cancelScheduledValues(mCtx.currentTime); mGain.gain.setTargetAtTime(v, mCtx.currentTime, 0.04); }
      else if (mAudio) mAudio.volume = Math.max(0, Math.min(1, v));
    }
    mBtn.setAttribute('data-level', v.toFixed(2));
  }
  function fadeTo(v, ms, done) {
    if (mTimer) clearInterval(mTimer);
    var from = mLevel, t0 = Date.now(), ramp = !!(mGain && mCtx);
    if (ramp) {
      /* плавное изменение считает аудиопоток: оно не замирает в свёрнутой вкладке */
      var g = mGain.gain, now = mCtx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(v, now + ms / 1000);
    }
    mTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      applyLevel(from + (v - from) * k, ramp);
      if (k >= 1) { clearInterval(mTimer); mTimer = null; if (done) done(); }
    }, 50);
  }
  function ensureAudio() {
    if (mAudio) return;
    mAudio = new Audio();
    mAudio.preload = 'none';
    mAudio.src = MUSIC[mIndex].src;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        mCtx = new AC();
        var node = mCtx.createMediaElementSource(mAudio);
        mGain = mCtx.createGain();
        mGain.gain.value = 0;
        node.connect(mGain); mGain.connect(mCtx.destination);
      }
    } catch (e) { mCtx = null; mGain = null; }
    applyLevel(0);
    mAudio.addEventListener('ended', nextTrack);
    mAudio.addEventListener('timeupdate', function () {
      if (playing && !endFading && mAudio.duration && mAudio.duration - mAudio.currentTime < 3) {
        endFading = true; fadeTo(0, 2500);
      }
    });
  }
  function nextTrack() {
    mIndex = (mIndex + 1) % MUSIC.length;
    endFading = false;
    applyLevel(0);
    mAudio.src = MUSIC[mIndex].src;
    if (playing) {
      var p = mAudio.play();
      if (p && p.catch) p.catch(blocked);
      fadeTo(TARGET, 3000);
    }
    mBtn.setAttribute('title', 'Фоновая музыка: ' + MUSIC[mIndex].title);
  }
  function blocked() {
    playing = false; gesture = false;
    if (mTimer) { clearInterval(mTimer); mTimer = null; }
    listenGesture();
  }
  function startMusic() {
    ensureAudio();
    if (mCtx && mCtx.state === 'suspended') mCtx.resume();
    var p = mAudio.play();
    if (p && p.catch) p.catch(blocked);
    fadeTo(TARGET, FADE_IN);
  }
  function stopMusic(ms) {
    if (!mAudio) return;
    var done = function () { if (!playing && mAudio) mAudio.pause(); };
    fadeTo(0, ms || FADE_OUT, done);
    /* в свёрнутой вкладке таймеры замедляются: пауза не должна зависеть только от них */
    setTimeout(done, (ms || FADE_OUT) + 300);
  }
  /* музыка играет, только если её включили и ничто из двух не мешает: голос сказки и свёрнутая страница */
  function sync() {
    var should = wantOn && gesture && !voiceOn && !away;
    if (should && !playing) { playing = true; startMusic(); }
    else if (!should && playing) { playing = false; stopMusic(away ? 800 : FADE_OUT); }
  }
  function setAway(v) {
    if (away !== v) { away = v; sync(); }
    if (v && rAudio && !rAudio.paused) rAudio.pause();
  }
  document.addEventListener('visibilitychange', function () { setAway(document.hidden || document.visibilityState === 'hidden'); });
  window.addEventListener('pagehide', function () { setAway(true); });
  window.addEventListener('pageshow', function () { setAway(!!document.hidden); });
  window.addEventListener('blur', function () { setAway(true); });
  window.addEventListener('focus', function () { setAway(!!document.hidden); });
  function paintMusic() {
    mBtn.setAttribute('aria-pressed', wantOn ? 'true' : 'false');
    mBtn.setAttribute('title', 'Фоновая музыка: ' + (wantOn ? 'включена' : 'выключена'));
  }
  function onGesture(e) {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target && e.target.closest && e.target.closest('#music')) return;
    gesture = true;
    unlistenGesture();
    sync();
  }
  function listenGesture() {
    if (!wantOn) return;
    document.addEventListener('click', onGesture, true);
    document.addEventListener('keydown', onGesture, true);
  }
  function unlistenGesture() {
    document.removeEventListener('click', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
  }
  mBtn.addEventListener('click', function () {
    wantOn = !wantOn;
    lsSet('tales-music', wantOn ? '1' : '0');
    gesture = true;
    unlistenGesture();
    paintMusic();
    sync();
  });
  rAudio.addEventListener('play', function () { voiceOn = true; sync(); });
  ['pause', 'ended'].forEach(function (ev) { rAudio.addEventListener(ev, function () { voiceOn = false; sync(); }); });
  paintMusic();
  listenGesture();

  loadRs();
  onHash();
  updateResume();
  queueNav();
  updateUp();
})();
