(function () {
  'use strict';

  var DATA = window.BLOG_DATA;
  var NOTES = DATA.notes;
  var STORAGE_KEY = 'mbs.tree.expanded';

  var els = {
    tree: document.getElementById('tree'),
    filter: document.getElementById('tree-filter'),
    category: document.getElementById('note-category'),
    title: document.getElementById('note-title'),
    lead: document.getElementById('note-lead'),
    meta: document.getElementById('note-meta'),
    body: document.getElementById('note-body'),
    pager: document.getElementById('note-pager'),
    sidebar: document.getElementById('sidebar'),
    about: document.getElementById('about-link'),
    scrim: document.querySelector('.scrim'),
    menuBtn: document.querySelector('.topbar__menu')
  };

  var filterText = '';

  /* ---------- Pomocnicze ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'text') node.textContent = attrs[key];
        else if (key === 'className') node.className = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function svg(markup) {
    var wrap = document.createElement('span');
    wrap.innerHTML = markup; /* stała, zaufana treść ikony */
    return wrap.firstChild;
  }

  var CHEVRON = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  function encodePath(id) {
    return id.split('/').map(encodeURIComponent).join('/');
  }

  function noteHref(id) {
    return '#/' + encodePath(id);
  }

  function currentNoteId() {
    var hash = window.location.hash.replace(/^#\/?/, '');
    if (!hash) return DATA.defaultNote;
    var id = hash.split('/').map(decodeURIComponent).join('/');
    return NOTES[id] ? id : DATA.defaultNote;
  }

  /* ---------- Stan rozwinięcia folderów ---------- */

  function loadExpanded() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw));
    } catch (error) { /* brak dostępu do storage — użyj domyślnych */ }
    return new Set();
  }

  function saveExpanded() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expanded)));
    } catch (error) { /* ignoruj */ }
  }

  var expanded = loadExpanded();

  /* Foldery prowadzące do notatki — trzeba je otworzyć, żeby ją pokazać */
  function ancestorsOf(id) {
    var parts = id.split('/');
    var paths = [];
    for (var i = 0; i < parts.length - 1; i++) {
      paths.push(parts.slice(0, i + 1).join('/'));
    }
    return paths;
  }

  /* ---------- Filtr ---------- */

  function matches(text) {
    return text.toLowerCase().indexOf(filterText) !== -1;
  }

  /* Zwraca true, gdy gałąź zawiera notatkę pasującą do filtra */
  function branchMatches(node) {
    if (node.note) {
      var note = NOTES[node.note];
      return !!note && (matches(note.title) || matches(node.note));
    }
    if (matches(node.name)) return true;
    return node.children.some(branchMatches);
  }

  /* ---------- Drzewo ---------- */

  function renderTree(activeId) {
    /* forced = rodzic pasuje nazwą, więc pokazujemy całą jego zawartość */
    function build(nodes, isRoot, forced) {
      var ul = el('ul', isRoot ? null : { role: 'group' });

      nodes.forEach(function (node) {
        if (filterText && !forced && !branchMatches(node)) return;

        if (node.note) {
          var note = NOTES[node.note];
          if (!note) return;
          var link = el('a', {
            className: 'tree__row',
            href: noteHref(node.note),
            role: 'treeitem'
          }, [
            el('span', { className: 'tree__spacer', 'aria-hidden': 'true' }),
            el('span', { className: 'tree__label', text: note.title })
          ]);
          if (node.note === activeId) link.setAttribute('aria-current', 'page');
          ul.appendChild(el('li', null, [link]));
          return;
        }

        var isOpen = filterText ? true : expanded.has(node.path);
        var showAll = forced || (filterText ? matches(node.name) : false);

        var chevron = el('span', { className: 'tree__chevron', 'aria-hidden': 'true' }, [svg(CHEVRON)]);
        var button = el('button', {
          className: 'tree__row',
          type: 'button',
          role: 'treeitem',
          'aria-expanded': String(isOpen)
        }, [chevron, el('span', { className: 'tree__label', text: node.name })]);

        button.addEventListener('click', function () {
          if (expanded.has(node.path)) expanded.delete(node.path);
          else expanded.add(node.path);
          saveExpanded();
          renderTree(activeId);
        });

        var li = el('li', null, [button]);

        if (isOpen) {
          if (node.children.length) {
            li.appendChild(build(node.children, false, showAll));
          } else {
            li.appendChild(el('ul', { role: 'group' }, [
              el('li', { className: 'tree__empty', text: 'Brak notatek' })
            ]));
          }
        }

        ul.appendChild(li);
      });

      return ul;
    }

    var built = build(DATA.tree, true, false);
    els.tree.replaceChildren.apply(els.tree, Array.from(built.childNodes));

    if (filterText && !els.tree.childNodes.length) {
      els.tree.appendChild(el('li', { className: 'tree__empty', text: 'Brak wyników' }));
    }
  }

  /* ---------- Treść notatki ---------- */

  function renderPager(id) {
    var order = DATA.order;
    var index = order.indexOf(id);
    var prev = index > 0 ? order[index - 1] : null;
    var next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;

    var items = [];
    if (prev) {
      items.push(el('a', { className: 'pager__link pager__link--prev', href: noteHref(prev) }, [
        el('span', { className: 'pager__label', text: '← Poprzednia' }),
        el('span', { className: 'pager__title', text: NOTES[prev].title })
      ]));
    }
    if (next) {
      items.push(el('a', { className: 'pager__link pager__link--next', href: noteHref(next) }, [
        el('span', { className: 'pager__label', text: 'Następna →' }),
        el('span', { className: 'pager__title', text: NOTES[next].title })
      ]));
    }
    els.pager.replaceChildren.apply(els.pager, items);
  }

  function renderMeta(note) {
    var meta = [];
    if (note.date) meta.push(el('time', { datetime: note.date, text: note.date }));
    meta.push(el('span', { text: note.minutes + ' min czytania' }));
    if (note.tags.length) {
      meta.push(el('span', { className: 'article__tags' }, note.tags.map(function (tag) {
        return el('span', { className: 'article__tag', text: '#' + tag });
      })));
    }
    els.meta.replaceChildren.apply(els.meta, meta);
  }

  function showMessage(text) {
    els.lead.hidden = true;
    els.body.replaceChildren(el('p', { className: 'notice', text: text }));
  }

  function renderArticle(id) {
    var note = NOTES[id];

    els.category.textContent = note.category;
    els.title.textContent = note.title;
    renderMeta(note);
    renderPager(id);
    document.title = note.title + ' — MBS. Knowledge Hub Blog';

    /* Treść jest już w pamięci — HTML powstał w build.js z własnego Markdownu */
    if (!note.lead && !note.html) {
      showMessage('Notatka jest pusta.');
      return;
    }

    els.lead.innerHTML = note.lead;
    els.lead.hidden = !note.lead;
    els.body.innerHTML = note.html;
  }

  /* ---------- Panel mobilny ---------- */

  function setDrawer(open) {
    els.sidebar.classList.toggle('is-open', open);
    els.scrim.hidden = !open;
    els.menuBtn.setAttribute('aria-expanded', String(open));
    els.menuBtn.setAttribute('aria-label', open ? 'Zamknij menu kategorii' : 'Otwórz menu kategorii');
  }

  els.menuBtn.addEventListener('click', function () {
    setDrawer(!els.sidebar.classList.contains('is-open'));
  });
  els.scrim.addEventListener('click', function () { setDrawer(false); });
  els.sidebar.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && els.sidebar.classList.contains('is-open')) {
      setDrawer(false);
      els.menuBtn.focus();
    }
  });

  els.filter.addEventListener('input', function () {
    filterText = els.filter.value.trim().toLowerCase();
    renderTree(currentNoteId());
  });

  /* ---------- Routing ---------- */

  function route(isInitial) {
    var id = currentNoteId();

    if (!NOTES[id]) {
      renderTree('');
      els.category.textContent = '';
      els.title.textContent = 'Brak notatek';
      els.meta.replaceChildren();
      els.pager.replaceChildren();
      showMessage('Katalog datasource jest pusty. Dodaj pliki .md i uruchom node build.js.');
      return;
    }

    ancestorsOf(id).forEach(function (folder) { expanded.add(folder); });
    saveExpanded();

    renderTree(id);
    renderArticle(id);
    setDrawer(false);

    if (DATA.about && id === DATA.about) els.about.setAttribute('aria-current', 'page');
    else els.about.removeAttribute('aria-current');

    if (!isInitial) window.scrollTo(0, 0);
  }

  if (DATA.about) {
    els.about.href = noteHref(DATA.about);
  } else {
    els.about.hidden = true;
  }

  window.addEventListener('hashchange', function () { route(false); });
  route(true);
})();
