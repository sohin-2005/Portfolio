/* ============================================================
   theme.js — global theme system
   Loaded in the <head> of every page so the persisted theme is
   applied before first paint. All CSS derives from --bg/--ink
   (via color-mix), canvases read --ink-rgb per frame, and the
   generated SVGs use currentColor — so one palette swap restyles
   the entire portfolio.
   ============================================================ */

(function () {
  const THEMES = {
    paper: { label: 'Paper',    bg: '#ECECEC', ink: '#111111' },
    noir:  { label: 'Noir',     bg: '#121212', ink: '#EDEDED' },
    sage:  { label: 'Sage',     bg: '#E3E9E0', ink: '#1C2620' },
    sand:  { label: 'Sand',     bg: '#EAE2D0', ink: '#221A0E' },
    blush: { label: 'Blush',    bg: '#EFE2E2', ink: '#27141A' },
    ocean: { label: 'Ocean',    bg: '#DFE7EB', ink: '#0C1C24' },
    forest:{ label: 'Midnight', bg: '#101613', ink: '#D8E6DC' },
    cream: { label: 'Cream',    bg: '#f4efe3', ink: '#1F1B12' },
   };

  function rgbOf(hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
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
    current = key;
    if (persist) {
      try { localStorage.setItem('sohin-theme', key); } catch (e) { /* private mode */ }
    }
    return true;
  }

  let saved = null;
  try { saved = localStorage.getItem('sohin-theme'); } catch (e) { /* private mode */ }
  if (saved && THEMES[saved] && saved !== 'paper') apply(saved, false);

  window.__theme = {
    THEMES: THEMES,
    current: function () { return current; },
    apply: function (key) { return apply(key, true); },
  };
})();
