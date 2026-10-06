/* Пояснения к старым и редким словам.
   Словарь — здесь, в одном месте. Текст на странице не меняется: слово только оборачивается
   в <span class="gl">, само пояснение показывается в панели внизу экрана.
   Поля: t — заголовок, d — пояснение, f — формы везде, s — только в текстах сайта, k — только в сказках,
   cs — с учётом регистра, nb — не помечать, если перед словом стоит это (RegExp). */
(function () {
  'use strict';
  var G = [
    /* А: тексты сайта (и те же слова в сказках) */
    { t: 'кринка', d: 'Глиняный горшок для молока, расширяется книзу.', f: ['кринк(?:а|у|ой|и|е)'] },
    { t: 'вязка', d: 'Связка.', s: ['вязка'] },
    { t: 'мёд', d: 'Здесь не пчелиный мёд, а старинный хмельной напиток из мёда.', s: ['мёд'], k: ['мёд(?=[-‑](?:пиво|вино)| и вино|, пиво)'] },
    { t: 'ступа', d: 'Тяжёлый сосуд, в котором толкут зерно пестом.', f: ['ступ(?:а|е|у|ой)'] },
    { t: 'толкач', d: 'Пест — тяжёлый стержень, которым толкут в ступе.', f: ['толкач(?:|ом|а)'] },
    { t: 'помело', d: 'Палка с тряпкой на конце, чтобы обметать; метла.', f: ['помел(?:о|ом|а)'] },
    { t: 'голик', d: 'Веник из голых прутьев.', f: ['голик(?:|е|ом|а|у)'] },
    { t: 'курьи ножки', d: 'Куриные ножки.', f: ['курьих', 'курьи'] },
    { t: 'терем', d: 'В Древней Руси — жилые покои в верхней части дома или дом в виде башни.', f: ['терем(?:|а|е|у|ом|ах|ов)'] },
    { t: 'горница', d: 'Комната в крестьянском доме, чистая половина избы.', f: ['горниц(?:а|у|е|ы|ей|ах)'] },
    { t: 'палаты', d: 'Большое богатое здание, покои.', f: ['палат(?:ы|ах|ам|ами|у|е)?'] },
    { t: 'колпак', d: 'Головной убор конусом или округлый.', f: ['колпак(?:|и|а|ах|ом|ами|ов)'] },
    { t: 'копытце', d: 'След от копыта — ямка (в сказке в ней стоит вода).', f: ['копытц(?:е|а|ем)'] },
    { t: 'навыворот', d: 'Изнанкой наружу.', f: ['навыворот'] },
    { t: 'нагольная шуба', d: 'Шуба из шкур, сшитая кожей наружу и ничем не покрытая.', f: ['нагольн(?:ая|ой|ую|ый|ом)'] },
    { t: 'масть', d: 'Окрас шерсти животного.', s: ['масти', 'масть'] },
    { t: 'ветла', d: 'Дерево, белая ива.', f: ['ветл(?:а|ой|у|е|ы)'] },
    { t: 'русальная неделя', d: 'Народное название Зелёных святок — праздничных дней около Троицы.', f: ['русальн(?:ая|ой|ую) недел(?:я|е|ю)'] },
    { t: 'игрец', d: 'Музыкант, тот, кто играет на инструменте.', f: ['игрец'] },
    { t: 'Смородина', d: 'Река из славянских преданий: отделяет мир живых от мира мёртвых.', f: ['Смородин(?:а|ы|е|у|ой|к(?:а|и|е|у|ой)?)'], cs: true },
    { t: 'диво', d: 'Чудо, диковина.', f: ['диво'] },
    { t: 'за тридевять земель', d: 'Очень далеко.', f: ['за тридевять земель'] },
    { t: 'тридевятое царство', d: 'В сказках — очень далёкая страна.', f: ['тридевят(?:ое|ом|ого) царств(?:о|е|а)'] },
    { t: 'лад', d: 'Согласие, мир.', s: ['лад'] },
    { t: 'не видать, как ушей своих', d: 'Никогда не получить желаемого.', s: ['не видать, как ушей своих'] },
    { t: 'оборачивается', d: 'Превращается в кого-то другого.', s: ['оборачивается', 'оборачивает'] },
    { t: 'хворь', d: 'Болезнь.', f: ['хвор(?:ь|и|ью)'] },
    { t: 'веретено', d: 'Ручное орудие для прядения: длинная палочка с утолщением посередине.', f: ['веретен(?:о|ом|а|е)', 'веретёшк(?:о|ом|а|е)'] },
    { t: 'присказка', d: 'Короткая шутливая прибаутка в начале или в конце сказки.', s: ['присказк(?:а|у|и|е|ой)'] },
    { t: 'веленье', d: 'Приказание.', f: ['велень(?:е|ю|я)', 'велени(?:е|ю|я)'] },
    { t: 'лубяная', d: 'Сделанная из луба — внутреннего слоя коры, лыка.', f: ['лубян(?:ая|ую|ой|ый|ом)'] },
    { t: 'рябая', d: 'Пёстрая.', f: ['ряб(?:ая|ую|ой)'] },
    { t: 'Сивко-бурко, вещий воронко', d: 'Клички коня по масти: сивый — серый, бурый — серовато-коричневый, вороной — чёрный.', f: ['Сивко-бурко, вещий воронко'] },
    { t: 'колодочка', d: 'Маленькая колода — обрубок толстого бревна.', f: ['колодочк(?:а|у|е|ой|и)'] },
    { t: 'кривда', d: 'Неправда, ложь.', f: ['кривд(?:а|ы|е|у|ой|ою)'] },
    { t: 'сулить', d: 'Обещать.', f: ['сул(?:ит|ил|ила|или|ят|ить|ишь|ю)'] },
    { t: 'стрелец', d: 'Стрелок.', f: ['стрел(?:ец|ьца|ьцу|ьцом|ьце|ьцы|ьцов)'] },
    { t: 'красная девица', d: 'Красивая девушка: «красный» в старину значило «красивый».', f: ['красн(?:ая|ой|ую|а|у) девиц(?:а|ы|е|у|ей)'] },
    { t: 'королевна', d: 'Дочь короля.', f: ['королевн(?:а|ы|е|у|ой|ою)'] },
    /* Б: частые и трудные слова сказок */
    { t: 'тотчас', d: 'Сразу же, немедленно.', k: ['тотчас'] },
    { t: 'воротиться', d: 'Вернуться.', k: ['воротил(?:ся|ась|ось|ись)', 'воротит(?:ься|ся)', 'воротятся', 'воротимся', 'воротись', 'воротитесь'] },
    { t: 'коли', d: 'Если; в старину ещё — когда.', k: ['коли'], nb: /дрова\s+$/ },
    { t: 'сказывать', d: 'Говорить, рассказывать.', k: ['сказыва(?:ть|ет|ешь|ют|ю|л|ла|ли|й|йте)'] },
    { t: 'ларчик', d: 'Маленький ларец — ящичек с крышкой для ценных вещей.', k: ['ларч(?:ик|ика|ике|иком|ики)'] },
    { t: 'перстень', d: 'Кольцо с драгоценным камнем.', k: ['перст(?:ень|ня|ню|нем|не|ни)'] },
    { t: 'просвира', d: 'Белый хлебец особой формы для церковной службы.', k: ['просвир(?:а|ы|у|е|ой|ами|ок)'] },
    { t: 'просвирня', d: 'Женщина, которая печёт просвиры — церковные хлебцы.', k: ['просвирн(?:я|и|е|ю|ей)', 'просвирнин(?:а|ой|у|ы)'] },
    { t: 'али', d: 'Или.', k: ['али'] },
    { t: 'гой еси', d: 'Старинное приветствие: «будь здоров!»', k: ['гой еси'] },
    { t: 'пуще', d: 'Больше, сильнее.', k: ['пуще'] },
    { t: 'мамки', d: 'Мамки — кормилицы, няньки.', k: ['мамки и няньки', 'няньки и мамки', 'мамок и нянек', 'мамками и няньками', 'мамкам и нянькам'] },
    { t: 'верста', d: 'Старая мера длины, чуть больше километра (1066 м).', k: ['верст(?:а|ы|у|е|ой|ам|ах)?', 'вёрст'] },
    { t: 'потчевать', d: 'Угощать.', k: ['потчева(?:ть|ет|ла|л|ли)', 'потчу(?:ет|ют|ю)'] },
    { t: 'кафтан', d: 'Старинная верхняя одежда длиной до колен.', k: ['кафтан(?:|а|у|ом|е|ы)'] },
    { t: 'булатный', d: 'Из булата — старинной узорчатой и очень прочной стали.', k: ['булатн(?:ый|ая|ое|ые|ого|ую|ым|ыми|ом)'] },
    { t: 'испить', d: 'Выпить немного.', k: ['испить', 'испила', 'испил', 'изопьёт', 'испей'] },
    { t: 'молвить', d: 'Сказать.', k: ['молви(?:л|ла|ли|ть|т)'] },
    { t: 'середний', d: 'Средний.', k: ['середн(?:ий|яя|его|ему|ей|юю|ие|их|им)'] },
    { t: 'тужить', d: 'Горевать, тосковать.', k: ['туж(?:и|ить|ит|ат|ишь|ил|ила)'] },
    { t: 'кручиниться', d: 'Грустить, горевать.', k: ['кручин(?:иться|ишься|ится|ился|илась|ись)'] },
    { t: 'сноха', d: 'Жена сына — так её называют его отец и мать.', k: ['снох(?:а|и|у|е|ой)?'] },
    { t: 'колодезь', d: 'Колодец.', k: ['колодез(?:ь|я|ю|ем|е)'] },
    { t: 'пособить', d: 'Помочь.', k: ['пособ(?:ить|лю|ил|ила|и|ит|ят)'] },
    { t: 'оземь', d: 'Об землю.', k: ['оземь'] },
    { t: 'кабы', d: 'Если бы.', k: ['кабы'] },
    { t: 'сусек', d: 'Закром — отгороженное место в амбаре для зерна или муки.', k: ['сусек(?:|у|е|а)'] },
    { t: 'лытать', d: 'Отлынивать.', k: ['лытаешь', 'лытать'] },
    { t: 'ширинка', d: 'Маленький, часто вышитый платок.', k: ['ширинк(?:а|у|ой|е|и)'] },
    { t: 'кросна', d: 'Ручной ткацкий станок.', k: ['кросн(?:а|ах|ами)'] },
    { t: 'сряда', d: 'Нарядная одежда, наряд.', k: ['сряд(?:а|ы|ой)'] },
    { t: 'пошевёнки', d: 'Пошевни — широкие сани, обшитые внутри лубом или досками.', k: ['пошевёнк(?:и|ах|ам)', 'пошевн(?:и|ях|ям)'] },
    { t: 'мянда', d: 'Мелкая сосна, растущая в низинах.', k: ['мянд(?:а|ы|ой)'] },
    { t: 'убрус', d: 'Вышитый платок или полотенце.', k: ['убрус(?:|а|ом)'] },
    { t: 'вельми', d: 'Очень, весьма.', k: ['вельми'] }
  ];

  var L = 'а-яёА-ЯЁa-zA-Z0-9';
  function src(f) { return f.replace(/[её]/g, '[её]'); }
  function build(scope) {
    var parts = [], map = [];
    G.forEach(function (g, i) {
      var fs = (g.f || []).concat(scope === 's' ? (g.s || []) : (g.k || []));
      if (!fs.length) return;
      parts.push('(' + fs.map(src).map(function (x) { return '(?:' + x + ')'; }).join('|') + ')');
      map.push(i);
    });
    return { re: new RegExp('(^|[^' + L + '])(?:' + parts.join('|') + ')(?![' + L + '])', 'gi'), map: map };
  }
  var RX = { s: build('s'), k: build('k') };
  var SKIP = 'a, button, summary, h1, h2, h3, dt, script, style, .gl, .vh, .vnote, [lang="uk"], .tcard, .where, .find, cite';

  function mark(block, scope) {
    if (block.getAttribute('data-gl')) return;
    block.setAttribute('data-gl', '1');
    var R = RX[scope], used = {};
    var tw = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null, false), nodes = [], n;
    while ((n = tw.nextNode())) {
      var p = n.parentNode;
      if (p && p.closest && !p.closest(SKIP)) nodes.push(n);
    }
    nodes.forEach(function (node) {
      var text = node.nodeValue, re = R.re, m, out = [], last = 0;
      if (!/[а-яё]/i.test(text)) return;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        var gi = -1;
        for (var j = 2; j < m.length; j++) if (m[j] !== undefined) { gi = j - 2; break; }
        if (gi < 0) continue;
        var id = R.map[gi], g = G[id], word = m[gi + 2], start = m.index + m[1].length;
        if (used[id]) { re.lastIndex = start + 1; continue; }
        if (g.cs && word.charAt(0) !== word.charAt(0).toUpperCase()) { re.lastIndex = start + 1; continue; }
        if (g.nb && g.nb.test(text.slice(Math.max(0, start - 20), start))) { re.lastIndex = start + 1; continue; }
        /* не трогаем первую букву записи: там буквица */
        if (start === 0 && node.parentNode.matches && node.parentNode.matches('.variant > p:first-of-type') && node === node.parentNode.firstChild) { re.lastIndex = start + 1; continue; }
        used[id] = 1;
        out.push(document.createTextNode(text.slice(last, start)));
        var s = document.createElement('span');
        s.className = 'gl'; s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0');
        s.setAttribute('aria-expanded', 'false'); s.setAttribute('aria-controls', 'glp'); s.setAttribute('data-g', id);
        s.textContent = word;
        out.push(s);
        last = start + word.length;
        re.lastIndex = last;
      }
      if (!out.length) return;
      out.push(document.createTextNode(text.slice(last)));
      var frag = document.createDocumentFragment();
      out.forEach(function (x) { if (x.nodeType !== 3 || x.nodeValue) frag.appendChild(x); });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function run() {
    var i, b;
    b = document.querySelectorAll('#characters article.char, #plots article.plot, #reading .prose-block');
    for (i = 0; i < b.length; i++) mark(b[i], 's');
    b = document.querySelectorAll('article.tale-text section.variant');
    for (i = 0; i < b.length; i++) mark(b[i], 'k');
  }

  /* панель */
  var panel = document.createElement('div');
  panel.id = 'glp'; panel.className = 'glp'; panel.hidden = true;
  panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Пояснение слова'); panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = '<div class="glp-in"><p class="glp-t"><b></b> — <span></span></p><button type="button" class="glp-x" aria-label="Закрыть пояснение">×</button></div>';
  var pT = panel.querySelector('b'), pD = panel.querySelector('.glp-t span'), cur = null;

  function close() {
    if (panel.hidden) return false;
    panel.hidden = true;
    document.documentElement.classList.remove('gl-open');
    if (cur) cur.setAttribute('aria-expanded', 'false');
    cur = null;
    return true;
  }
  function open(el) {
    var g = G[+el.getAttribute('data-g')];
    if (!g) return;
    if (cur === el && !panel.hidden) { close(); return; }
    if (cur) cur.setAttribute('aria-expanded', 'false');
    var host = (el.closest && el.closest('.reader')) || document.body;
    if (panel.parentNode !== host) host.appendChild(panel);
    pT.textContent = g.t;
    pD.textContent = g.d.charAt(0).toLowerCase() + g.d.slice(1);
    panel.hidden = false;
    document.documentElement.classList.add('gl-open');
    el.setAttribute('aria-expanded', 'true');
    cur = el;
  }
  document.addEventListener('click', function (e) {
    var t = e.target, el = t.closest && t.closest('.gl');
    if (el) { e.preventDefault(); open(el); return; }
    if (t.closest && t.closest('.glp-x')) { var c = cur; close(); if (c) c.focus(); return; }
    if (t.closest && t.closest('.glp-in')) return;
    close();
  });
  document.addEventListener('keydown', function (e) {
    var el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.classList && el.classList.contains('gl')) { e.preventDefault(); open(el); }
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { var c = cur; close(); if (c && c.focus) c.focus(); e.stopPropagation(); }
  }, true);
  window.addEventListener('hashchange', close);

  run();
})();
