/* ============================================================
   theme.js — global theme system
   Loaded in the <head> of every page so the persisted theme is
   applied before first paint. All CSS derives from --bg/--ink
   (via color-mix), canvases read --ink-rgb per frame, and the
   generated SVGs use currentColor — so one palette swap restyles
   the entire portfolio.
   ============================================================ */

(function () {
  /* Marks that JS is alive, so scroll-reveal can start elements
     low. Without JS the class never lands and everything is
     simply visible — there is no load state to get stuck in. */
  document.documentElement.classList.add('js');

  const THEMES = {
    /* The default. Keyed 'paper' still, so nothing that refers to
       the first palette by name has to change. */
    paper: { label: 'White',    bg: '#FFFFFF', ink: '#111111' },
    noir:  { label: 'Noir',     bg: '#121212', ink: '#EDEDED' },
    sage:  { label: 'Sage',     bg: '#E3E9E0', ink: '#1C2620' },
    sand:  { label: 'Sand',     bg: '#EAE2D0', ink: '#221A0E' },
    blush: { label: 'Blush',    bg: '#EFE2E2', ink: '#27141A' },
    ocean: { label: 'Ocean',    bg: '#DFE7EB', ink: '#0C1C24' },
    forest:{ label: 'Midnight', bg: '#101613', ink: '#D8E6DC' },
    cream: { label: 'Cream',    bg: '#f4efe3', ink: '#1F1B12' },
    // true black, for Night scenery — constellations need the dark
    space: { label: 'Space',    bg: '#04050A', ink: '#D9E1EE' },
   };

  function rgbOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  /* Is this palette a dark one?

     Almost everything on the site derives from --bg and --ink
     through color-mix and needs no more than that. Shadows are
     the exception: a shadow mixed from --ink is dark on Paper
     and light on Noir, which stops being a shadow and starts
     being a glow. So the tone is published as an attribute and
     the few rules that genuinely need to know can ask.

     Measured rather than listed, so a palette added later is
     classified without anyone remembering to come back here. */
  function isDark(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    // Rec. 601 luma is plenty for a two-way decision
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  }

  /* Versioned. The defaults changed — white and no scenery — and
     an unversioned key would have kept every returning visitor on
     whatever they had last picked, which for most of them was
     simply the old default. Bumping it once lets everyone see the
     new ones; after that, choices stick as before. */
  const KEY = 'sohin-theme-v2';

  let current = 'paper';

  function apply(key, persist) {
    const t = THEMES[key];
    if (!t) return false;
    const s = document.documentElement.style;
    s.setProperty('--bg', t.bg);
    s.setProperty('--ink', t.ink);
    s.setProperty('--bg-rgb', rgbOf(t.bg));
    s.setProperty('--ink-rgb', rgbOf(t.ink));
    document.documentElement.setAttribute('data-tone', isDark(t.bg) ? 'dark' : 'light');
    current = key;
    if (persist) {
      try { localStorage.setItem(KEY, key); } catch (e) { /* private mode */ }
    }
    return true;
  }

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  const initial = stored();
  /* The default still goes through apply(), so data-tone is always
     set rather than only once somebody has changed the theme. */
  apply(initial && THEMES[initial] ? initial : 'paper', false);

  window.__theme = {
    THEMES: THEMES,
    current: function () { return current; },
    apply: function (key) { return apply(key, true); },
    /* Bring this page back in line with what is stored. Goes
       through the public apply so the dock's wrapper runs and its
       swatches follow. */
    sync: function () {
      const want = stored();
      const key = want && THEMES[want] ? want : 'paper';
      if (key !== current) window.__theme.apply(key);
    },
  };

  /* ============================================================
     Keeping every page on the same choice

     Each page reads the stored theme, scenery and leaf colour as
     it loads, so a normal page load was always consistent. The
     pages that were not are the ones that never loaded again:

       a page restored by the back button comes out of the
         browser's back/forward cache exactly as it was left, with
         none of its scripts re-run;
       a page js/router.js prerendered on hover was built with
         whatever was stored at the moment of the hover, and is
         shown later, as is, when you click;
       another open tab of the site.

     Change the palette, go back, and you were looking at the old
     one. So on each of those moments this re-reads what is stored
     and applies anything that differs. Scenery goes first: Night
     drives the palette, so settling it first means the theme
     check that follows sees the palette Night has already set.
     ============================================================ */
  function resync() {
    const A = window.__ambient, L = window.__leaves, T = window.__theme;
    try { if (A && A.sync) A.sync(); } catch (e) { /* keep going */ }
    try { if (T && T.sync) T.sync(); } catch (e) { /* keep going */ }
    try { if (L && L.sync) L.sync(); } catch (e) { /* keep going */ }
    window.dispatchEvent(new Event('sohin:prefs'));
  }

  window.addEventListener('pageshow', function (e) { if (e.persisted) resync(); });
  document.addEventListener('prerenderingchange', resync);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resync(); });
  /* fires in every other document of this origin when one of them
     writes to localStorage — other tabs, and prerendered pages */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('sohin-') === 0) resync();
  });
})();
