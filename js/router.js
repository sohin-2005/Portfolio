/* ============================================================
   router.js — navigation between real documents

   Works, About, Contact and Playground are separate files, and
   they stay that way. Rewriting them into a single-page router
   would mean tearing down and rebuilding the timeline, the
   constellation, the case-study overlay and the cursor on every
   move, and every one of those is a place for state to leak.
   Real navigation has none of those failure modes — the browser
   already does it perfectly. The only thing wrong with it is the
   blink, so that is the only thing this file fixes.

   Three mechanisms, in order of preference:

     1. Speculation rules. Supporting browsers prerender the next
        document the moment you show intent, so the click lands
        on a page that is already built. Nothing to wait for.

     2. Cross-document view transitions. The browser snapshots
        the outgoing page and animates into the incoming one.
        Named elements — masthead, rail, dock, footer — are
        carried across untouched, so the furniture never blinks.
        See css/route.css; this file only sets html.vt so the
        fallback rules know to stand down.

     3. The hand-driven path, for everything else. Intent warms
        the page with rel=prefetch; the click plays the same exit
        animation and then navigates. Because the document is
        already in cache the gap is a frame or two.

   It also remembers that a move came from inside the site, so
   the opening sequence knows not to play again, and it keeps a
   thin progress thread on screen if a fetch ever runs long.

   Exposes window.__route = { go(href), warm(href) }.
   ============================================================ */

(function () {
  const doc = document;
  const root = doc.documentElement;

  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const SUPPORTS_VT = typeof doc.startViewTransition === 'function' &&
    CSS.supports('view-transition-name: none');
  const SEEN_KEY = 'sohin-internal-nav';

  /* Tell css/route.css which path is live. With cross-document
     view transitions the browser owns the animation, so the
     fallback keyframes must not also run. */
  if (SUPPORTS_VT && !REDUCED) root.classList.add('vt');

  /* ---------- What counts as ours ---------- */
  function internal(a) {
    if (!a || !a.getAttribute) return false;
    const raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return false;
    let url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    return /\.html$/.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/');
  }

  /* Same document, not just the same file.

     This compared pathname alone, which was fine while every page
     was its own file and became a bug the moment one file started
     serving many pages. project.html?p=fettle and
     project.html?p=audixa share a pathname, so "next project" was
     read as a link to the page you were already on: the click was
     cancelled and you were scrolled to the top of the same case
     study instead of being taken to the next one. */
  function samePage(url) {
    return url.pathname === location.pathname && url.search === location.search;
  }

  /* ============================================================
     1 — Prerender on intent
     ============================================================ */
  const speculated = new Set();
  const canSpeculate = HTMLScriptElement.supports &&
    HTMLScriptElement.supports('speculationrules');

  function speculate(href) {
    if (!canSpeculate || speculated.has(href) || speculated.size > 6) return;
    speculated.add(href);
    const s = doc.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify({
      prerender: [{ source: 'list', urls: [href], eagerness: 'immediate' }],
    });
    doc.head.appendChild(s);
  }

  /* ---------- 3 — plain warm, for the rest ---------- */
  const warmed = new Set();
  function prefetch(href) {
    if (warmed.has(href)) return;
    warmed.add(href);
    const l = doc.createElement('link');
    l.rel = 'prefetch';
    l.as = 'document';
    l.href = href;
    doc.head.appendChild(l);
  }

  function warm(href) {
    if (!href) return;
    let url;
    try { url = new URL(href, location.href); } catch (e) { return; }
    if (url.origin !== location.origin || samePage(url)) return;
    const clean = url.pathname + url.search;
    if (canSpeculate) speculate(clean);
    else prefetch(clean);
  }

  /* ============================================================
     The progress thread
     ============================================================ */
  let bar = null;
  function barEl() {
    if (bar) return bar;
    bar = doc.createElement('div');
    bar.className = 'route-bar';
    doc.body.appendChild(bar);
    return bar;
  }
  let barTimer = 0;
  function barStart() {
    clearTimeout(barTimer);
    // a prerendered page arrives instantly; only show the thread
    // if the move is actually taking a moment
    barTimer = setTimeout(() => {
      const b = barEl();
      b.classList.remove('done');
      void b.offsetWidth;
      b.classList.add('on');
    }, 220);
  }
  function barStop() {
    clearTimeout(barTimer);
    if (!bar) return;
    bar.classList.remove('on');
    bar.classList.add('done');
  }

  /* ============================================================
     The move
     ============================================================ */
  let leaving = false;

  function markInternal() {
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode */ }
  }

  function go(href) {
    if (!href || leaving) return;
    let url;
    try { url = new URL(href, location.href); } catch (e) { location.href = href; return; }

    markInternal();

    /* Same document, different anchor: no navigation at all. */
    if (samePage(url) && url.hash) {
      const el = doc.getElementById(url.hash.slice(1));
      if (el && window.__nav) { window.__nav.goto(url.hash.slice(1)); return; }
    }

    /* Supporting browsers animate the navigation themselves —
       handing them the URL is the whole job. */
    if (SUPPORTS_VT || REDUCED) {
      barStart();
      location.href = url.href;
      return;
    }

    /* Everywhere else: play the exit, then go. The page is
       already warm, so this reads as one continuous move. */
    leaving = true;
    barStart();
    root.classList.add('route-out');
    setTimeout(() => { location.href = url.href; }, 260);
  }

  /* ---------- Wiring ---------- */
  doc.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || !internal(a)) return;

    const url = new URL(a.href, location.href);

    /* An in-page anchor on this same document belongs to main.js,
       which scrolls to it. Leave it alone. */
    if (samePage(url) && url.hash) {
      const el = doc.getElementById(url.hash.slice(1));
      if (el) return;
    }
    if (samePage(url) && !url.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); return; }

    e.preventDefault();
    go(a.href);
  });

  /* Intent: pointer, touch or keyboard focus all warm the page. */
  let warmTimer = 0;
  function intent(e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || !internal(a)) return;
    clearTimeout(warmTimer);
    warmTimer = setTimeout(() => warm(a.getAttribute('href')), 45);
  }
  doc.addEventListener('pointerover', intent, { passive: true });
  doc.addEventListener('focusin', intent, { passive: true });
  doc.addEventListener('touchstart', intent, { passive: true });

  /* Coming back with the back button should never land on a
     page still wearing its exit animation. */
  window.addEventListener('pageshow', (e) => {
    leaving = false;
    root.classList.remove('route-out');
    barStop();
    if (e.persisted) root.classList.remove('route-out');
  });
  window.addEventListener('pagehide', () => { barStop(); });

  /* The very first paint of a document should not be mid-move. */
  window.addEventListener('load', barStop);

  window.__route = { go: go, warm: warm };

  /* main.js used to own this; keep the name working for the
     command palette and anything else that calls it. */
  window.__goPage = function (href) {
    if (!href) return;
    if (href.charAt(0) === '#') {
      if (window.__nav) window.__nav.goto(href.slice(1));
      return;
    }
    go(href);
  };
})();
