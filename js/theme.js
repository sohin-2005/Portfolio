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
    paper: { label: 'Paper',    bg: '#ECECEC', ink: '#111111' },
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
      try { localStorage.setItem('sohin-theme', key); } catch (e) { /* private mode */ }
    }
    return true;
  }

  let saved = null;
  try { saved = localStorage.getItem('sohin-theme'); } catch (e) { /* private mode */ }
  /* Paper still goes through apply(), so data-tone is always set
     rather than only once somebody has changed the theme. */
  apply(saved && THEMES[saved] ? saved : 'paper', false);

  window.__theme = {
    THEMES: THEMES,
    current: function () { return current; },
    apply: function (key) { return apply(key, true); },
  };
})();
