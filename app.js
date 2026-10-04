(function () {
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
  var rAudio = $('#r-audio'), rFig = $('#r-fig'), rVoice = $('#r-voice'), rJumps = $('#r-jumps');
  var rPos = $('#r-pos'), prog = $('#r-prog');
  var minus = $('#r-minus'), plus = $('#r-plus');
  var inertEls = $$('#bar, #main, .foot, #texts, .skip');
  var order = $$('.tale-text').map(function (a) { return a.id.replace('tale-', ''); });
  var baseTitle = document.title;
  var lastTrigger = null, cameFromSite = false, isOpen = false;
  var curSlug = null, pendingResume = null, restoreIdx = null, restoreUntil = 0, saveTimer = null;

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
  minus.addEventListener('click', function () { changeRs(-2); });
  plus.addEventListener('click', function () { changeRs(2); });

  function syncProg() {
    var max = scroller.scrollHeight - scroller.clientHeight;
    var p = max > 8 ? scroller.scrollTop / max : 1;
    prog.style.transform = 'scaleX(' + p + ')';
  }
  scroller.addEventListener('scroll', syncProg, { passive: true });

  function showVariant(k) {
    var vs = $$('.variant', rBody);
    vs.forEach(function (v, i) { v.hidden = i !== k; });
    $$('button', rTabs).forEach(function (b, i) { b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
    var v = vs[k];
    if (v) {
      rKicker.textContent = 'по Афанасьеву № ' + v.getAttribute('data-num') + ' · около ' + v.getAttribute('data-min') + ' мин';
      var audio = v.getAttribute('data-audio');
      rAudio.pause();
      if (audio) {
        rAudio.hidden = false;
        rVoice.hidden = false;
        rVoice.textContent = audio.indexOf('geese-') === -1 ? 'Голос читает начало. Дальше — сам текст.' : 'Голос читает эту запись целиком.';
        if (rAudio.getAttribute('src') !== audio) rAudio.src = audio;
      } else {
        rAudio.hidden = true;
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
    requestAnimationFrame(syncProg);
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
        b.textContent = '№ ' + v.getAttribute('data-num') + ' · ~' + v.getAttribute('data-min') + ' мин';
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
    [[i - 1, '← '], [i + 1, '']].forEach(function (pair, n) {
      var s = order[pair[0]];
      if (!s) return;
      var a = document.createElement('a');
      a.href = '#tale-' + s;
      a.textContent = (n === 0 ? '← ' : '') + $('#tale-' + s).getAttribute('data-title') + (n === 1 ? ' →' : '');
      rNext.appendChild(a);
    });
    document.title = art.getAttribute('data-title') + ' — Славянские сказки';
  }

  function openReader(slug, num) {
    if (!$('#tale-' + slug)) return;
    if (!isOpen) {
      lastTrigger = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      inertEls.forEach(function (el) { el.setAttribute('inert', ''); });
      reader.hidden = false;
      root.classList.add('reading');
      isOpen = true;
    }
    setMenu(false);
    render(slug, num || '');
    scroller.scrollTop = 0;
    rTitle.focus({ preventScroll: true });
    if (pendingResume && pendingResume.slug === slug) { startRestore(pendingResume.idx); }
    pendingResume = null;
    updateUp();
  }
  function closeReader() {
    if (!isOpen) return;
    reader.hidden = true;
    if (rAudio) rAudio.pause();
    root.classList.remove('reading');
    inertEls.forEach(function (el) { el.removeAttribute('inert'); });
    isOpen = false;
    document.title = baseTitle;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
    restoreIdx = null;
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
    var t = $('#tales'); if (t) t.scrollIntoView();
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
    scroller.addEventListener(ev, function () { restoreIdx = null; restoreUntil = 0; }, { passive: true });
  });

  function saveProgress() {
    saveTimer = null;
    if (!isOpen || !curSlug || Date.now() < restoreUntil) return;
    var v = visVariant();
    if (!v) return;
    var max = scroller.scrollHeight - scroller.clientHeight;
    var pct = max > 8 ? Math.round(scroller.scrollTop / max * 100) : 0;
    var ps = $$('p', v), sTop = scroller.getBoundingClientRect().top, idx = 0, lastP = ps[ps.length - 1];
    for (var i = 0; i < ps.length; i++) {
      if (ps[i].getBoundingClientRect().bottom > sTop + 16) { idx = i; break; }
    }
    var all = lsJson('tales-progress') || {};
    var done = lastP && lastP.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom + 2;
    if (done) {
      delete all[curSlug];
      if (lsGet('tales-last') === curSlug) lsDel('tales-last');
    } else if (pct >= 1) {
      all[curSlug] = { num: v.getAttribute('data-num') || '', idx: idx, pct: Math.min(99, pct) };
      lsSet('tales-last', curSlug);
    } else {
      return;
    }
    lsSet('tales-progress', JSON.stringify(all));
  }
  scroller.addEventListener('scroll', function () {
    if (saveTimer == null) saveTimer = setTimeout(saveProgress, 300);
  }, { passive: true });
  window.addEventListener('pagehide', function () { if (saveTimer != null) { clearTimeout(saveTimer); saveProgress(); } });

  var resume = $('#resume'), resumeGo = $('#resume-go'), resumeT = $('#resume-t'), resumeX = $('#resume-x');
  function updateResume() {
    if (!resume) return;
    var last = lsGet('tales-last'), all = lsJson('tales-progress') || {}, e = last && all[last];
    var art = last && $('#tale-' + last);
    if (!e || !art || !(e.pct >= 1)) { resume.hidden = true; return; }
    resumeT.textContent = art.getAttribute('data-title') + ' · ' + e.pct + '%';
    resumeGo.setAttribute('href', '#tale-' + last + (e.num ? '/' + e.num : ''));
    resume.hidden = false;
  }
  resumeGo.addEventListener('click', function (e) {
    var last = lsGet('tales-last'), all = lsJson('tales-progress') || {}, en = last && all[last];
    if (!en) return;
    e.preventDefault();
    pendingResume = { slug: last, idx: en.idx || 0 };
    var target = '#tale-' + last + (en.num ? '/' + en.num : '');
    if (location.hash === target) onHash(); else location.hash = target;
  });
  resumeX.addEventListener('click', function () {
    var last = lsGet('tales-last'), all = lsJson('tales-progress') || {};
    if (last) { delete all[last]; lsSet('tales-progress', JSON.stringify(all)); }
    lsDel('tales-last');
    updateResume();
  });

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
  var wantOn = lsGet('tales-music') === '1', gesture = false, voiceOn = false, playing = false, endFading = false;

  function applyLevel(v) {
    mLevel = v;
    if (mGain && mCtx) mGain.gain.setTargetAtTime(v, mCtx.currentTime, 0.04);
    else if (mAudio) mAudio.volume = Math.max(0, Math.min(1, v));
    mBtn.setAttribute('data-level', v.toFixed(2));
  }
  function fadeTo(v, ms, done) {
    if (mTimer) clearInterval(mTimer);
    var from = mLevel, t0 = Date.now();
    mTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      applyLevel(from + (v - from) * k);
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
  function stopMusic() {
    if (!mAudio) return;
    fadeTo(0, FADE_OUT, function () { if (!playing && mAudio) mAudio.pause(); });
  }
  function sync() {
    var should = wantOn && gesture && !voiceOn;
    if (should && !playing) { playing = true; startMusic(); }
    else if (!should && playing) { playing = false; stopMusic(); }
  }
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
  updateUp();
})();
