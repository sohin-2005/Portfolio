/* ============================================================
   dock.js — the floating scenery + palette dock

   Bottom-right pill on every page. Collapsed it shows the live
   glyph of whichever ambient mode is running; open it offers the
   four scenery modes and all eight colour palettes.

   It wraps window.__theme.apply so that ANY caller — this dock,
   the Playground theme engine, the CmdK palette — re-tints the
   ambient scenery and re-syncs the swatches. One source of truth.
   ============================================================ */

(function () {
  const A = window.__ambient;
  const T = window.__theme;
  const LV = window.__leaves;
  if (!A || !document.body) return;

  /* ---------- Glyphs ----------
     Stroked, currentColor, so they invert cleanly when a mode
     button goes active. Classed spans animate while live. */
  const GLYPH = {
    off:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="8"/><path d="M6.7 17.3 17.3 6.7"/></svg>',
    // a climbing stem with a leaf pair — the whole motif in 24px
    eco:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 21c0-5.5 1.4-9.4 4.2-11.8"/>' +
      '<path d="M12 14.2c-2.6 0-4.6-.9-5.8-2.7-1.2-1.8-1-3.6-.6-4 .4-.4 2.2-.6 4 .6 1.8 1.2 2.7 3.2 2.7 5.8z"/>' +
      '<g class="g-blink"><path d="M13.6 10.4c.3-2.5 1.6-4.3 3.6-5.2 2-.9 3.7-.4 4 .1.3.5-.2 2.2-1.9 3.5-1.7 1.3-3.8 1.7-5.7 1.6z"/></g></svg>',
    night:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20.5 15.1A8.6 8.6 0 0 1 9.4 3.7a8.9 8.9 0 1 0 11.1 11.4z"/>' +
      '<g class="g-blink"><path d="M17.2 4.3v2.4M16 5.5h2.4M20.4 9.1v1.8M19.5 10h1.8"/></g></svg>',
  };

  /* ---------- Build ---------- */
  const dock = document.createElement('div');
  dock.className = 'dock';

  const panel = document.createElement('div');
  panel.className = 'dock-panel';

  /* scenery */
  const gMode = document.createElement('div');
  gMode.className = 'dock-group';
  gMode.innerHTML = '<span class="dock-label">Scenery</span>';
  const modeRow = document.createElement('div');
  modeRow.className = 'dock-modes';
  gMode.appendChild(modeRow);

  A.ORDER.forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dock-mode';
    b.dataset.mode = key;
    b.innerHTML = GLYPH[key];
    b.title = A.MODES[key].label;
    b.setAttribute('aria-label', 'Scenery: ' + A.MODES[key].label);
    b.addEventListener('click', () => A.apply(key));
    modeRow.appendChild(b);
  });
  panel.appendChild(gMode);

  /* palette */
  let themeRow = null;
  if (T) {
    const gTheme = document.createElement('div');
    gTheme.className = 'dock-group';
    gTheme.innerHTML = '<span class="dock-label">Palette</span>';
    themeRow = document.createElement('div');
    themeRow.className = 'dock-themes';
    gTheme.appendChild(themeRow);

    Object.keys(T.THEMES).forEach((key) => {
      const t = T.THEMES[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dock-theme';
      b.dataset.theme = key;
      b.title = t.label;
      b.setAttribute('aria-label', 'Palette: ' + t.label);
      b.style.setProperty('--sw-bg', t.bg);
      b.style.setProperty('--sw-ink', t.ink);
      b.innerHTML = '<i></i>';
      b.addEventListener('click', () => T.apply(key));
      themeRow.appendChild(b);
    });
    panel.appendChild(gTheme);
  }

  /* leaves — only worth offering where something grows */
  let leafRow = null;
  if (LV) {
    const gLeaf = document.createElement('div');
    gLeaf.className = 'dock-group';
    gLeaf.innerHTML = '<span class="dock-label">Leaves</span>';
    leafRow = document.createElement('div');
    leafRow.className = 'dock-leaves';
    gLeaf.appendChild(leafRow);

    LV.ORDER.forEach((key) => {
      const t = LV.TINTS[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dock-leaf';
      b.dataset.leaf = key;
      b.title = t.label;
      b.setAttribute('aria-label', 'Leaves: ' + t.label);
      /* the ink swatch is currentColor, so it re-tints with the
         palette the same way the real leaves do */
      b.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 21c0-5.5 1.4-9.4 4.2-11.8"/>' +
        '<path class="blade" d="M13.6 10.4c.3-2.5 1.6-4.3 3.6-5.2 2-.9 3.7-.4 4 .1.3.5-.2 2.2-1.9 3.5-1.7 1.3-3.8 1.7-5.7 1.6z"/>' +
        '</svg><span>' + t.label + '</span>';
      if (t.stem) {
        b.style.setProperty('--lf-stem', t.stem);
        b.style.setProperty('--lf-leaf', t.leaf);
      }
      b.addEventListener('click', () => { LV.apply(key); syncLeaves(); });
      leafRow.appendChild(b);
    });
    panel.appendChild(gLeaf);
  }

  /* trigger */
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dock-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<span class="dock-toggle-glyph"></span><span class="dock-toggle-text"></span>';
  const tGlyph = toggle.querySelector('.dock-toggle-glyph');
  const tText = toggle.querySelector('.dock-toggle-text');

  dock.appendChild(panel);
  dock.appendChild(toggle);
  document.body.appendChild(dock);

  /* ---------- Sync ---------- */
  function syncModes() {
    const cur = A.current();
    modeRow.querySelectorAll('.dock-mode').forEach((b) => {
      const on = b.dataset.mode === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    tGlyph.innerHTML = GLYPH[cur];
    tText.textContent = cur === 'off' ? 'Scenery' : A.MODES[cur].label;
  }

  function syncLeaves() {
    if (!leafRow || !LV) return;
    const cur = LV.current();
    leafRow.querySelectorAll('.dock-leaf').forEach((b) => {
      const on = b.dataset.leaf === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncThemes() {
    if (!themeRow || !T) return;
    const cur = T.current();
    themeRow.querySelectorAll('.dock-theme').forEach((b) => {
      const on = b.dataset.theme === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /* Any theme change anywhere re-tints the scenery and re-syncs
     the swatches — including changes made from the Playground. */
  if (T && typeof T.apply === 'function') {
    const original = T.apply;
    T.apply = function (key) {
      const ok = original.call(T, key);
      if (ok) {
        if (window.__ambient && window.__ambient.retint) window.__ambient.retint();
        syncThemes();
      }
      return ok;
    };
  }

  /* Track the engine rather than only our own clicks, so the dock
     stays correct even if the mode is changed from somewhere else. */
  if (A.on) A.on(syncModes);

  syncModes();
  syncThemes();
  syncLeaves();

  /* theme.js re-applies stored choices to a page that comes back
     from the back/forward cache or a prerender; the dock's pressed
     states have to follow or it shows the old selection */
  window.addEventListener('sohin:prefs', () => { syncModes(); syncThemes(); syncLeaves(); });

  /* ---------- Open / close ---------- */
  let open = false;

  function setOpen(v) {
    open = v;
    dock.classList.toggle('open', v);
    toggle.setAttribute('aria-expanded', v ? 'true' : 'false');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!open);
  });

  /* Opens on click only. It used to open on hover as well, which
     meant it sprang open whenever the pointer merely passed near
     the corner. Click, Escape and a click outside still work. */

  document.addEventListener('click', (e) => {
    if (open && !dock.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { setOpen(false); toggle.focus(); }
  });
  dock.addEventListener('focusout', () => {
    setTimeout(() => { if (!dock.contains(document.activeElement)) setOpen(false); }, 0);
  });
})();
