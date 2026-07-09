/* ============================================================
   main.js — per-section page transition engine
   Each page ships with a covered overlay (#tr) in its own
   variant and breaks open on load. Clicking a [data-transition]
   link rebuilds the overlay in the TARGET page's variant,
   plays the cover animation, then navigates.

   Variants: t-shutter (Home/Works/Projects), t-splitv (About),
             t-iris (Playground), t-blinds (Contact)
   ============================================================ */

(function () {
  const tr = document.getElementById('tr');
  if (!tr) return;

  const PANELS = { 't-shutter': 2, 't-splitv': 2, 't-iris': 1, 't-blinds': 5 };
  const DUR = { 't-shutter': 760, 't-splitv': 760, 't-iris': 800, 't-blinds': 1000 };

  let animating = false;

  function typeOf(el) {
    for (const c of el.classList) if (c.indexOf('t-') === 0) return c;
    return 't-shutter';
  }

  /* ---------- Reveal on page load ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    const t = typeOf(tr);
    setTimeout(() => {
      tr.classList.remove('instant');
      void tr.offsetHeight; // reflow: re-enable transitions cleanly
      tr.classList.add('reveal');
      tr.classList.remove('cover');
      document.documentElement.classList.add('entered'); // content rises in under the shutters
      setTimeout(() => tr.classList.remove('on', 'reveal'), DUR[t]);
    }, 250);
  });

  /* ---------- Rebuild overlay in the target variant ---------- */
  function build(type, word) {
    tr.className = 'tr ' + type + ' on';
    let html = '';
    const n = PANELS[type] || 2;
    for (let i = 1; i <= n; i++) html += '<div class="p p' + i + '"></div>';
    html += '<div class="word"></div>';
    tr.innerHTML = html;
    tr.querySelector('.word').textContent = word;
  }

  /* ---------- Cover, then navigate ---------- */
  function go(href, type, word) {
    if (animating) return;
    animating = true;
    type = type || 't-shutter';
    build(type, word || '');
    void tr.offsetHeight; // force reflow so cover always animates
    tr.classList.add('cover');
    document.documentElement.classList.add('leaving'); // content sinks as shutters close
    setTimeout(() => { window.location.href = href; }, DUR[type] + 40);
  }
  window.__goPage = go; // used by the CmdK palette

  document.querySelectorAll('a[data-transition]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      go(link.getAttribute('href'), link.dataset.ttype, link.dataset.word);
    });
  });

  /* ---------- Restore state on back/forward cache ---------- */
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      animating = false;
      tr.classList.remove('on', 'cover', 'reveal', 'instant');
      document.documentElement.classList.remove('leaving');
      document.documentElement.classList.add('entered');
    }
  });
})();
