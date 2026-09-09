/* ============================================================
   flora.js — procedural growth that follows you down the page

   The old version pinned four identical vines to the four
   corners and grew them once on load. This replaces that with a
   generator:

     · several distinct species per mode, never the same twice —
       climbers, trailing runners, arches, sprigs, tendril knots
     · growths seeded from their position, so a vine is stable
       across resizes but different from every other vine
     · placed all the way down the document, not just at the
       edges of the first screen, plus anchored to real elements
       (the hero name, the timeline, headings, text blocks)
     · they keep moving at rest — leaves breathe on their own
       clocks and a breeze periodically travels across the page
     · new growth unfurls as you scroll it into view

   The same engine drives both modes; only the species change.
   Eco grows vines, Night draws constellations.

   Exposes window.__flora = { setMode(key), refresh() }.
   ============================================================ */

(function () {
  if (!document.body) return;

  const NS = 'http://www.w3.org/2000/svg';
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Document-space layer ----------
     Fixed layers can't scroll with the page, so growth lives in
     its own absolutely-positioned layer sized to the document. */
  const layer = document.createElement('div');
  layer.className = 'fl-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  /* ---------- Seeded RNG ----------
     Position-seeded so a given vine always regenerates identically. */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const between = (r, a, b) => a + r() * (b - a);

  /* ============================================================
     Leaf vocabulary
     ============================================================ */
  const LEAVES = {
    oval:  'M0 0 C 7 -10, 18 -10, 26 0 C 18 10, 7 10, 0 0 Z',
    point: 'M0 0 C 9 -8, 21 -7, 32 0 C 21 7, 9 8, 0 0 Z',
    round: 'M0 0 C 5 -13, 20 -11, 24 0 C 20 11, 5 13, 0 0 Z',
    blade: 'M0 0 C 12 -6, 26 -4, 38 0 C 26 4, 12 6, 0 0 Z',
  };
  // 'fern' is drawn as a compound group rather than a single path,
  // so it is added to the pick list by hand
  const LEAF_KINDS = Object.keys(LEAVES).concat(['fern', 'fern']);

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* A leaf is nested twice: the outer group carries the gust
     (wind travelling across the page), the inner path carries its
     own idle sway. Two layers means they never fight over the
     same transform. */
  function addLeaf(svg, x, y, angle, scale, r, opts) {
    opts = opts || {};
    const g = el('g', {
      transform: 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') ' +
                 'rotate(' + angle.toFixed(1) + ') scale(' + scale.toFixed(2) + ')',
    }, svg);
    const gust = el('g', { class: 'fl-gust' }, g);
    const kind = opts.kind || pick(r, LEAF_KINDS);

    if (kind === 'fern') {
      // compound leaf: a midrib with leaflets stepping down it
      const fern = el('g', { class: 'fl-leaf fl-fern' }, gust);
      el('path', { d: 'M0 0 L 34 0', class: 'fl-rib' }, fern);
      for (let i = 1; i <= 5; i++) {
        const px = i * 6;
        const s = (1 - i / 7) * 7;
        el('path', { d: 'M' + px + ' 0 q 3 -' + s.toFixed(1) + ' 7 -' + (s * 0.5).toFixed(1), class: 'fl-leaflet' }, fern);
        el('path', { d: 'M' + px + ' 0 q 3 ' + s.toFixed(1) + ' 7 ' + (s * 0.5).toFixed(1), class: 'fl-leaflet' }, fern);
      }
      styleLeaf(fern, r, opts);
      return;
    }

    const leaf = el('path', { d: LEAVES[kind], class: 'fl-leaf' }, gust);
    styleLeaf(leaf, r, opts);
  }

  function styleLeaf(node, r, opts) {
    node.style.setProperty('--o', between(r, 0.5, 0.9).toFixed(2));
    node.style.setProperty('--sway', between(r, 4.5, 9).toFixed(2) + 's');
    node.style.setProperty('--tilt', between(r, 3, 8).toFixed(1) + 'deg');
    node.style.animationDelay =
      (opts.delay || 0).toFixed(2) + 's, ' + between(r, 0, 4).toFixed(2) + 's';
  }

  /* ============================================================
     Species — each returns an SVG sized in its own units
     ============================================================ */

  /* helper: run ornaments along a stem path */
  function dress(svg, path, r, opts) {
    const total = path.getTotalLength();
    path.style.setProperty('--len', total.toFixed(1));
    path.style.animationDelay = (opts.delay || 0) + 's';

    const n = opts.count || Math.round(between(r, 5, 9));
    const kind = opts.leafKind;
    for (let i = 0; i < n; i++) {
      const t = (opts.from || 0.12) + (i / Math.max(1, n - 1)) * ((opts.to || 0.94) - (opts.from || 0.12));
      const len = total * t;
      const p = path.getPointAtLength(len);
      const a = path.getPointAtLength(Math.max(0, len - 1));
      const b = path.getPointAtLength(Math.min(total, len + 1));
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const side = i % 2 ? 1 : -1;
      addLeaf(svg, p.x, p.y, ang + side * between(r, 42, 72),
        between(r, 0.62, 1.15) * (opts.scale || 1), r,
        { kind: kind, delay: (opts.delay || 0) + 0.4 + t * 1.7 });
    }

    // a curling tendril finishes most stems
    if (opts.curl !== false && r() > 0.3) {
      const tip = path.getPointAtLength(total);
      const dir = r() > 0.5 ? 1 : -1;
      const c = el('path', {
        d: 'M' + tip.x.toFixed(1) + ' ' + tip.y.toFixed(1) +
           ' c ' + (10 * dir) + ' -4, ' + (18 * dir) + ' 5, ' + (13 * dir) + ' 14' +
           ' c -3 6, -12 5, -11 -2 c 1 -5, 7 -6, 10 -2',
        class: 'fl-curl',
      }, svg);
      c.style.setProperty('--len', c.getTotalLength().toFixed(1));
      c.style.animationDelay = ((opts.delay || 0) + 2.1) + 's';
      c.style.setProperty('--sway', between(r, 6, 11).toFixed(2) + 's');
    }
  }

  function stem(svg, d, cls) {
    return el('path', { d: d, class: cls || 'fl-stem' }, svg);
  }

  /* A stem with no leaves on it. dress() is what normally measures a
     path and publishes --len, which is what the grow animation runs
     on; anything drawn without it just appears, fully formed, while
     everything around it is still unfurling. */
  function drawn(svg, d, delay) {
    const p = stem(svg, d);
    p.style.setProperty('--len', p.getTotalLength().toFixed(1));
    p.style.animationDelay = (delay || 0) + 's';
    return p;
  }

  /* --- ECO --- */
  const ECO = {
    /* climbs a vertical edge, wandering as it goes */
    climber: function (svg, r, W, H) {
      let d = 'M ' + between(r, 8, 26).toFixed(0) + ' ' + H;
      let x = 18, y = H;
      const steps = Math.round(between(r, 3, 5));
      for (let i = 0; i < steps; i++) {
        const ny = y - H / steps;
        const c1x = x + between(r, -34, 46), c2x = x + between(r, -40, 40);
        d += ' C ' + c1x.toFixed(0) + ' ' + (y - H / steps * 0.35).toFixed(0) +
             ', ' + c2x.toFixed(0) + ' ' + (ny + H / steps * 0.35).toFixed(0) +
             ', ' + (x = between(r, 10, W - 24)).toFixed(0) + ' ' + ny.toFixed(0);
        y = ny;
      }
      dress(svg, stem(svg, d), r, { count: Math.round(between(r, 6, 10)) });
    },

    /* runs sideways, leaves hanging beneath */
    trailer: function (svg, r, W, H) {
      const base = between(r, H * 0.25, H * 0.5);
      let d = 'M 0 ' + base.toFixed(0);
      let x = 0;
      const steps = Math.round(between(r, 2, 4));
      for (let i = 0; i < steps; i++) {
        const nx = x + W / steps;
        d += ' C ' + (x + W / steps * 0.4).toFixed(0) + ' ' + between(r, base - 40, base + 40).toFixed(0) +
             ', ' + (nx - W / steps * 0.4).toFixed(0) + ' ' + between(r, base - 40, base + 40).toFixed(0) +
             ', ' + nx.toFixed(0) + ' ' + between(r, base - 20, base + 30).toFixed(0);
        x = nx;
      }
      dress(svg, stem(svg, d), r, { count: Math.round(between(r, 5, 9)) });
    },

    /* bows over whatever it is anchored to */
    arch: function (svg, r, W, H) {
      const lift = between(r, H * 0.55, H * 0.85);
      const d = 'M 0 ' + H + ' C ' + (W * 0.18).toFixed(0) + ' ' + (H - lift).toFixed(0) +
                ', ' + (W * 0.82).toFixed(0) + ' ' + (H - lift).toFixed(0) + ', ' + W + ' ' + H;
      dress(svg, stem(svg, d), r, { count: Math.round(between(r, 7, 11)), from: 0.08, to: 0.92 });
    },

    /* a small burst — good beside headings */
    sprig: function (svg, r, W, H) {
      const bx = between(r, W * 0.3, W * 0.6), by = H;
      const arms = Math.round(between(r, 2, 4));
      for (let i = 0; i < arms; i++) {
        const spread = (i - (arms - 1) / 2) * between(r, 22, 40);
        const d = 'M ' + bx.toFixed(0) + ' ' + by +
                  ' C ' + (bx + spread * 0.4).toFixed(0) + ' ' + (by * 0.62).toFixed(0) +
                  ', ' + (bx + spread).toFixed(0) + ' ' + (by * 0.42).toFixed(0) +
                  ', ' + (bx + spread * 1.5).toFixed(0) + ' ' + between(r, 4, by * 0.3).toFixed(0);
        dress(svg, stem(svg, d), r, {
          count: Math.round(between(r, 3, 5)), delay: i * 0.18, scale: 0.8, curl: i === 0,
        });
      }
    },

    /* a sprig in a pot.

       The tub is the same one the desk scene draws a few hundred
       pixels to the right (see plantArt in js/scenes.js): a 52-wide
       rim over a tub tapering 42 to 32 across 31 of height. Copied
       deliberately rather than invented — two pots of different
       proportions on one screen would read as two different hands.

       The pot draws itself first and the stems climb out of it
       afterwards, which is the order the thing would actually
       happen in. */
    potted: function (svg, r, W, H) {
      const bx = W * 0.5;
      const RIM_H = 9, BODY_H = 31;
      const rimY = H - (RIM_H + BODY_H);

      // rim band, then the tub hanging under it
      drawn(svg, 'M ' + (bx - 26) + ' ' + rimY + ' h 52 v ' + RIM_H + ' h -52 Z', 0);
      drawn(svg, 'M ' + (bx - 21) + ' ' + (rimY + RIM_H) + ' h 42 l -5 ' + BODY_H + ' h -32 Z', 0.12);

      /* stems start just inside the rim, so they read as growing out
         of the soil rather than standing behind the pot */
      const arms = Math.round(between(r, 3, 4));
      for (let i = 0; i < arms; i++) {
        const spread = (i - (arms - 1) / 2) * between(r, 26, 42);
        const d = 'M ' + bx.toFixed(0) + ' ' + (rimY + 3).toFixed(0) +
                  ' C ' + (bx + spread * 0.35).toFixed(0) + ' ' + (rimY * 0.66).toFixed(0) +
                  ', ' + (bx + spread).toFixed(0) + ' ' + (rimY * 0.4).toFixed(0) +
                  ', ' + (bx + spread * 1.3).toFixed(0) + ' ' + between(r, 6, rimY * 0.26).toFixed(0);
        dress(svg, stem(svg, d), r, {
          count: Math.round(between(r, 4, 6)),
          delay: 0.34 + i * 0.16,
          scale: 0.82,
          curl: i === arms - 1,
        });
      }
    },

    /* two stems that reach around a target from both sides */
    wreath: function (svg, r, W, H) {
      const midY = H / 2;
      const left = 'M ' + (W * 0.06).toFixed(0) + ' ' + (midY + between(r, -20, 20)).toFixed(0) +
                   ' C ' + (W * 0.1).toFixed(0) + ' ' + (midY - H * 0.42).toFixed(0) +
                   ', ' + (W * 0.3).toFixed(0) + ' ' + (midY - H * 0.46).toFixed(0) +
                   ', ' + (W * 0.44).toFixed(0) + ' ' + (midY - H * 0.4).toFixed(0);
      const right = 'M ' + (W * 0.94).toFixed(0) + ' ' + (midY + between(r, -20, 20)).toFixed(0) +
                    ' C ' + (W * 0.9).toFixed(0) + ' ' + (midY + H * 0.42).toFixed(0) +
                    ', ' + (W * 0.7).toFixed(0) + ' ' + (midY + H * 0.46).toFixed(0) +
                    ', ' + (W * 0.56).toFixed(0) + ' ' + (midY + H * 0.4).toFixed(0);
      dress(svg, stem(svg, left), r, { count: 6, scale: 0.85 });
      dress(svg, stem(svg, right), r, { count: 6, scale: 0.85, delay: 0.35 });
    },

    /* the classic corner frame, but the geometry varies each time */
    corner: function (svg, r, W, H) {
      const a = 'M -10 ' + between(r, H * 0.06, H * 0.16).toFixed(0) +
                ' C ' + (W * 0.2).toFixed(0) + ' ' + between(r, 0, H * 0.1).toFixed(0) +
                ', ' + (W * 0.35).toFixed(0) + ' ' + between(r, H * 0.14, H * 0.24).toFixed(0) +
                ', ' + (W * 0.55).toFixed(0) + ' ' + between(r, H * 0.1, H * 0.18).toFixed(0) +
                ' C ' + (W * 0.75).toFixed(0) + ' ' + between(r, 0, H * 0.1).toFixed(0) +
                ', ' + (W * 0.85).toFixed(0) + ' ' + between(r, H * 0.16, H * 0.26).toFixed(0) +
                ', ' + W + ' ' + between(r, H * 0.1, H * 0.2).toFixed(0);
      const b = 'M ' + between(r, W * 0.06, W * 0.16).toFixed(0) + ' -10' +
                ' C ' + between(r, 0, W * 0.1).toFixed(0) + ' ' + (H * 0.2).toFixed(0) +
                ', ' + between(r, W * 0.14, W * 0.24).toFixed(0) + ' ' + (H * 0.35).toFixed(0) +
                ', ' + between(r, W * 0.1, W * 0.18).toFixed(0) + ' ' + (H * 0.55).toFixed(0) +
                ' C ' + between(r, 0, W * 0.1).toFixed(0) + ' ' + (H * 0.75).toFixed(0) +
                ', ' + between(r, W * 0.16, W * 0.26).toFixed(0) + ' ' + (H * 0.85).toFixed(0) +
                ', ' + between(r, W * 0.1, W * 0.2).toFixed(0) + ' ' + H;
      dress(svg, stem(svg, a), r, { count: Math.round(between(r, 5, 8)) });
      dress(svg, stem(svg, b), r, { count: Math.round(between(r, 5, 8)), delay: 0.3 });
    },
  };

  /* --- NIGHT: constellations that draw themselves --- */
  function constellation(svg, r, W, H, n, delay) {
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: between(r, W * 0.08, W * 0.92), y: between(r, H * 0.08, H * 0.92) });
    // join each point to its nearest unused neighbour — reads like a real chart
    const used = [pts[0]];
    const rest = pts.slice(1);
    let d = 0;
    while (rest.length) {
      let bi = 0, bd = Infinity, bu = used[0];
      rest.forEach((p, i) => {
        used.forEach((u) => {
          const dd = (p.x - u.x) * (p.x - u.x) + (p.y - u.y) * (p.y - u.y);
          if (dd < bd) { bd = dd; bi = i; bu = u; }
        });
      });
      const p = rest.splice(bi, 1)[0];
      const line = el('path', {
        d: 'M' + bu.x.toFixed(1) + ' ' + bu.y.toFixed(1) + ' L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1),
        class: 'fl-link',
      }, svg);
      line.style.setProperty('--len', Math.sqrt(bd).toFixed(1));
      line.style.animationDelay = (delay + d * 0.16) + 's';
      used.push(p);
      d++;
    }
    pts.forEach((p, i) => {
      const c = el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: between(r, 1.6, 3.4).toFixed(1), class: 'fl-star' }, svg);
      c.style.setProperty('--o', between(r, 0.5, 1).toFixed(2));
      c.style.setProperty('--tw', between(r, 2.4, 6).toFixed(1) + 's');
      c.style.animationDelay = (delay + i * 0.1) + 's, ' + between(r, 0, 3).toFixed(2) + 's';
    });
  }

  const NIGHT = {
    climber: function (svg, r, W, H) { constellation(svg, r, W, H, Math.round(between(r, 4, 7)), 0); },
    trailer: function (svg, r, W, H) { constellation(svg, r, W, H, Math.round(between(r, 4, 7)), 0); },
    arch: function (svg, r, W, H) { constellation(svg, r, W, H, Math.round(between(r, 5, 8)), 0); },
    sprig: function (svg, r, W, H) { constellation(svg, r, W, H, Math.round(between(r, 3, 5)), 0); },
    wreath: function (svg, r, W, H) {
      constellation(svg, r, W * 0.34, H, Math.round(between(r, 3, 5)), 0);
      const g = el('g', { transform: 'translate(' + (W * 0.66).toFixed(0) + ',0)' }, svg);
      constellation(g, r, W * 0.34, H, Math.round(between(r, 3, 5)), 0.4);
    },
    corner: function (svg, r, W, H) { constellation(svg, r, W, H, Math.round(between(r, 5, 9)), 0); },
  };

  const SPECIES = { eco: ECO, night: NIGHT };
  const KINDS = ['climber', 'trailer', 'arch', 'sprig', 'corner'];

  /* ============================================================
     Placement
     ============================================================ */

  /* Elements worth decorating, and how. Missing selectors are
     simply skipped, so one table covers every page.

     The hero name is deliberately absent. Vines climb it during
     the opening sequence and then leave with it — a permanent
     wreath there fought the wordmark rather than framing it.

     Kept deliberately short. An earlier version seeded growth
     from a dozen selectors and the result was vines on every
     screen of every page, which stops being scenery and starts
     being wallpaper. One or two anchors per page is the whole
     budget — enough that you notice it, not enough to compete
     with what you came to read. */
  /* A rule can fix its height in pixels, or ask for a fraction of
     what it is anchored to. The fraction matters for anything that
     has to line up with a drawing inside the anchor: the potted
     plant stands on the desk scene's ground line, and that line is
     always ~89% down the illustration however wide the viewport
     makes it. A fixed height only holds at one window size. */
  function boxH(rule, b) {
    if (rule.h) return rule.h;
    if (rule.hPct) return b.h * rule.hPct;
    return Math.min(b.h, 260);
  }

  const RULES = [
    /* home — one at the foot of the hero, one beside the thread */
    { sel: '.bottom .illus',       kind: 'potted',  place: 'left',   w: 130, hPct: 0.89, edge: 26 },
    { sel: '.works-next',          kind: 'arch',    place: 'around', padX: 70, padY: 56 },

    /* about — the portrait earns one, the opening line one */
    { sel: '.portrait',            kind: 'wreath',  place: 'around', padX: 60, padY: 30 },
    { sel: '.about-body .big',     kind: 'climber', place: 'left',   w: 110 },

    /* contact */
    { sel: '.contact-body .email-link', kind: 'arch', place: 'around', padX: 60, padY: 50 },

    /* playground */
    { sel: '.pg-grid',             kind: 'trailer', place: 'under',  h: 120 },
  ];

  let mode = 'off';
  let growths = [];
  let io = null;
  let nearIO = null;

  /* The readable column is roughly the middle of the page. Growth
     that strays into it gets dialled back; growth that stays in
     the margins keeps its full weight. */
  function zoneOf(box, docW) {
    const readL = docW * 0.16;
    const readR = docW * 0.84;
    const overlaps = box.left + box.w > readL && box.left < readR;
    return overlaps ? 'fl-overlap' : 'fl-margin';
  }

  function makeGrowth(kind, box, seed, flip) {
    const set = SPECIES[mode];
    if (!set) return;
    const gen = set[kind] || set.sprig;
    if (!gen) return;

    const zone = zoneOf(box, document.documentElement.clientWidth || 1);
    const host = document.createElement('div');
    host.className = 'fl ' + zone + (flip ? ' fl-flip' : '');
    host.style.left = Math.round(box.left) + 'px';
    host.style.top = Math.round(box.top) + 'px';
    host.style.width = Math.round(box.w) + 'px';
    host.style.height = Math.round(box.h) + 'px';

    const svg = el('svg', {
      viewBox: '0 0 ' + Math.round(box.w) + ' ' + Math.round(box.h),
      preserveAspectRatio: 'none',
    });
    host.appendChild(svg);
    layer.appendChild(host);           // must be live before getTotalLength works

    gen(svg, rng(seed), Math.round(box.w), Math.round(box.h));

    // the breeze travels left→right across the page
    const gd = (box.left / Math.max(1, layer.clientWidth)) * 0.9;
    host.style.setProperty('--gd', gd.toFixed(2) + 's');

    growths.push(host);
    if (io) io.observe(host);
    if (nearIO) nearIO.observe(host);
    return host;
  }

  function docBox(elm) {
    const r = elm.getBoundingClientRect();
    return {
      left: r.left + window.scrollX,
      top: r.top + window.scrollY,
      w: r.width,
      h: r.height,
    };
  }

  function build() {
    clear();
    if (mode === 'off' || !SPECIES[mode]) return;

    const docW = document.documentElement.clientWidth;
    const docH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    layer.style.height = docH + 'px';

    const vh = window.innerHeight || 800;
    const narrow = docW < 820;
    const edgeW = narrow ? 92 : Math.min(230, docW * 0.17);

    /* --- growth marching down both edges ---
       Spaced under a screen apart, so scrolling keeps turning up
       new plants rather than the same four corners. */
    const step = vh * (narrow ? 0.85 : 0.6);
    let slot = 0;
    for (let y = -40; y < docH - 60; y += step, slot++) {
      const r = rng(Math.round(y) * 2654435761 + 7);
      const sides = slot % 2 === 0 ? ['left', 'right'] : [slot % 4 === 1 ? 'right' : 'left'];
      sides.forEach((side, si) => {
        const rr = rng(Math.round(y) * 40503 + si * 917 + 3);
        const kind = slot === 0 ? 'corner' : pick(rr, KINDS);
        const h = between(rr, vh * 0.3, vh * 0.55);
        const w = edgeW * between(rr, 0.8, 1.15);
        const jitter = between(rr, -30, 30);
        makeGrowth(kind, {
          left: side === 'left' ? -w * 0.18 : docW - w * 0.82,
          top: y + jitter,
          w: w,
          h: h,
        }, Math.round(y) * 31 + si * 7717, side === 'right');
      });
      void r;
    }

    /* --- growth anchored to real content --- */
    RULES.forEach((rule, ri) => {
      const nodes = Array.from(document.querySelectorAll(rule.sel)).slice(0, rule.limit || 3);
      nodes.forEach((node, ni) => {
        if (!node.getClientRects().length) return;
        const b = docBox(node);
        if (b.w < 40 || b.h < 8) return;
        let box;
        if (rule.place === 'around') {
          box = {
            left: b.left - (rule.padX || 60),
            top: b.top - (rule.padY || 40),
            w: b.w + (rule.padX || 60) * 2,
            h: b.h + (rule.padY || 40) * 2,
          };
        } else if (rule.place === 'under') {
          box = { left: b.left, top: b.top + b.h - 20, w: b.w, h: rule.h || 120 };
        } else if (rule.place === 'left') {
          /* `edge` pins the growth to a fixed inset from the page's
             left margin instead of hanging it off the anchor's side.
             The anchor still supplies the vertical, which is the
             whole point for the potted plant: it has to keep
             standing on the desk scene's ground line however far
             across the page it is moved. */
          const gw = rule.w || 130;
          box = {
            left: rule.edge != null ? rule.edge : b.left - gw - 14,
            top: b.top,
            w: gw,
            h: boxH(rule, b),
          };
        } else {
          box = { left: b.left + b.w + 14, top: b.top, w: rule.w || 130, h: boxH(rule, b) };
        }
        // keep anchored growth on the page
        if (box.left < -box.w * 0.5) box.left = -box.w * 0.3;
        if (box.left + box.w > docW + box.w * 0.5) box.left = docW - box.w * 0.7;
        if (box.h < 60) box.h = 60;
        makeGrowth(rule.kind, box, (ri + 1) * 104729 + ni * 1299709, rule.place === 'left');
      });
    });
  }

  function clear() {
    if (io) growths.forEach((g) => io.unobserve(g));
    if (nearIO) growths.forEach((g) => nearIO.unobserve(g));
    growths = [];
    layer.innerHTML = '';
  }

  /* ---------- Unfurl on scroll, idle only while near ---------- */
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('grown');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '10% 0px 10% 0px', threshold: 0.01 });

    // pause animation work well outside the viewport
    nearIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('near', en.isIntersecting));
    }, { rootMargin: '60% 0px 60% 0px' });
  }

  /* ---------- The breeze ----------
     Every so often a gust rolls across the page; leaves further
     right feel it later, so it reads as wind rather than a blink. */
  let gustTimer = 0;
  function scheduleGust() {
    clearTimeout(gustTimer);
    if (REDUCED || mode === 'off') return;
    gustTimer = setTimeout(() => {
      layer.classList.add('gusting');
      setTimeout(() => layer.classList.remove('gusting'), 2600);
      scheduleGust();
    }, 5200 + Math.random() * 8000);
  }

  /* ---------- Rebuild on layout change ---------- */
  let rebuildTimer = 0;
  function scheduleRebuild(delay) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(build, delay || 260);
  }

  window.addEventListener('resize', () => scheduleRebuild(320));
  window.addEventListener('load', () => scheduleRebuild(140));

  if ('ResizeObserver' in window) {
    let lastH = 0;
    new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) > 120) { lastH = h; scheduleRebuild(300); }
    }).observe(document.body);
  }

  window.__flora = {
    setMode: function (key) {
      mode = key || 'off';
      layer.setAttribute('data-mode', mode);
      build();
      scheduleGust();
    },
    refresh: function () { scheduleRebuild(60); },
  };

  // if the ambient engine already booted, adopt its mode
  if (window.__ambient && window.__ambient.current) {
    window.__flora.setMode(window.__ambient.current());
    if (window.__ambient.on) window.__ambient.on(window.__flora.setMode);
  }
})();
