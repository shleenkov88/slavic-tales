(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

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
  var minus = $('#r-minus'), plus = $('#r-plus');
  var inertEls = $$('#bar, #main, .foot, #texts, .skip');
  var order = $$('.tale-text').map(function (a) { return a.id.replace('tale-', ''); });
  var baseTitle = document.title;
  var lastTrigger = null, cameFromSite = false, isOpen = false;

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

  function showVariant(k) {
    var vs = $$('.variant', rBody);
    vs.forEach(function (v, i) { v.hidden = i !== k; });
    $$('button', rTabs).forEach(function (b, i) { b.setAttribute('aria-pressed', i === k ? 'true' : 'false'); });
    scroller.scrollTop = 0;
  }

  function render(slug) {
    var art = $('#tale-' + slug);
    rTitle.textContent = art.getAttribute('data-title');
    rKicker.textContent = 'по Афанасьеву ' + art.getAttribute('data-nums') + ' · около ' + art.getAttribute('data-min') + ' мин';
    rBody.innerHTML = '';
    rTabs.innerHTML = '';
    var variants = $$('.variant', art);
    variants.forEach(function (v) { rBody.appendChild(v.cloneNode(true)); });
    if (variants.length > 1) {
      variants.forEach(function (v, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = v.getAttribute('data-label');
        b.addEventListener('click', function () { showVariant(i); });
        rTabs.appendChild(b);
      });
    }
    showVariant(0);
    rSrc.innerHTML = '';
    var src = $('.tale-src', art);
    if (src) rSrc.innerHTML = src.innerHTML;
    rNext.innerHTML = '';
    var i = order.indexOf(slug);
    [[i - 1, '← '], [i + 1, '']].forEach(function (p, n) {
      var s = order[p[0]];
      if (!s) return;
      var a = document.createElement('a');
      a.href = '#tale-' + s;
      a.textContent = (n === 0 ? '← ' : '') + $('#tale-' + s).getAttribute('data-title') + (n === 1 ? ' →' : '');
      rNext.appendChild(a);
    });
    document.title = art.getAttribute('data-title') + ' — Славянские сказки';
  }

  function openReader(slug) {
    if (!$('#tale-' + slug)) return;
    if (!isOpen) {
      lastTrigger = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      inertEls.forEach(function (el) { el.setAttribute('inert', ''); });
      reader.hidden = false;
      root.classList.add('reading');
      isOpen = true;
    }
    setMenu(false);
    render(slug);
    scroller.scrollTop = 0;
    rTitle.focus({ preventScroll: true });
  }
  function closeReader() {
    if (!isOpen) return;
    reader.hidden = true;
    root.classList.remove('reading');
    inertEls.forEach(function (el) { el.removeAttribute('inert'); });
    isOpen = false;
    document.title = baseTitle;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }
  function slugFromHash() {
    var m = /^#tale-([a-z-]+)$/.exec(location.hash);
    return m && $('#tale-' + m[1]) ? m[1] : null;
  }
  function onHash() {
    var s = slugFromHash();
    if (s) openReader(s); else closeReader();
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

  loadRs();
  onHash();
})();
