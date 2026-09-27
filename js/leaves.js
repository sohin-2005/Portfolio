/* ============================================================
   leaves.js — what colour the growing things are

   The vines and ferns that climb the page (js/flora.js) draw
   themselves in currentColor, which means they take the page's
   ink and read as pen drawings. That is the default and it is
   the right default: it survives all nine palettes without a
   single override.

   But they are leaves, and sometimes leaves should be green.
   This publishes the two custom properties flora.css already
   reads — --fl-stem and --fl-leaf — and remembers the choice.

   Loaded in <head> alongside theme.js so the tint is set before
   flora ever builds, rather than repainting the garden a beat
   after it has grown.
   ============================================================ */

(function () {
  /* One pair of greens for every palette, rather than a green per
     theme. They have to sit on Paper at one end and on Space at
     the other, so they are picked mid-range: dark enough to read
     on off-white, light enough to read on near-black. A green
     tuned to look perfect on Paper disappears on Noir. */
  const TINTS = {
    ink: {
      label: 'Ink',
      swatch: 'currentColor',
    },
    green: {
      label: 'Green',
      stem: '#4b7a45',
      leaf: '#6da45f',
      swatch: '#6da45f',
    },
  };

  const KEY = 'sohin-leaves';
  let current = 'ink';

  function apply(key, persist) {
    const t = TINTS[key];
    if (!t) return false;
    const s = document.documentElement.style;
    if (t.stem) {
      s.setProperty('--fl-stem', t.stem);
      s.setProperty('--fl-leaf', t.leaf);
    } else {
      /* removed rather than set to currentColor, so the fallback
         in flora.css is what applies and the ink stays live */
      s.removeProperty('--fl-stem');
      s.removeProperty('--fl-leaf');
    }
    document.documentElement.setAttribute('data-leaves', key);
    current = key;
    if (persist) {
      try { localStorage.setItem(KEY, key); } catch (e) { /* private mode */ }
    }
    return true;
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  apply(saved && TINTS[saved] ? saved : 'ink', false);

  window.__leaves = {
    TINTS: TINTS,
    ORDER: ['ink', 'green'],
    current: function () { return current; },
    apply: function (key) { return apply(key, true); },
    /* bring this page back in line with what is stored; see the
       resync in theme.js */
    sync: function () {
      let v = null;
      try { v = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
      const want = v && TINTS[v] ? v : 'ink';
      if (want !== current) apply(want, false);
    },
  };
})();
