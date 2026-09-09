/* ============================================================
   timeline.js — the curved project thread

   Scrolling inks a serpentine path across the page. A comet
   rides the head of the ink; each checkpoint lights up as the
   line reaches it. Click one and a small card opens beside it:
   a shot, a name, a line about what it is, and a way through to
   the project's own page.

   The card is deliberately thin. This is a thread across the
   home page, not the archive — the full story of any project
   lives at project.html?p=<slug>, and everything is on one rail
   at projects.html. An earlier version unfolded a full viewer
   here with a looping video and a running slideshow, which was
   a case study pretending to be a teaser.

   Geometry lives in LAYOUTS below. Every node coordinate is an
   exact endpoint of a bezier segment in its path, so checkpoints
   always sit precisely on the curve — no eyeballing. The plot
   box carries the same aspect ratio as the viewBox, which lets
   the checkpoint buttons be plain HTML positioned in percent
   while still tracking the SVG perfectly at any width.
   ============================================================ */

(function () {
  const root = document.getElementById('tl');
  if (!root || !window.__PROJECTS) return;

  const PROJECTS = window.__PROJECTS;
  const ORDER = window.__PROJECT_ORDER || Object.keys(PROJECTS);
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const DWELL = 3800;   // ms each slide holds

  /* ---------- Geometry ----------
     Node coords are bezier segment endpoints, so they land on
     the curve exactly. `below` puts the label under the node. */
  const LAYOUTS = {
    /* Both curves are deliberately lopsided.

       The first version of each was symmetrical — two matched
       humps, the outer checkpoints at the same height, the
       spacing between them equal — and no amount of brush wobble
       on top could hide that the shape underneath was drawn with
       a compass. Irregularity has to be in the geometry: unequal
       peaks, unequal gaps, no two checkpoints on the same line.

       Every checkpoint is still an exact endpoint of a bezier
       segment, so it sits precisely on the curve. The extra
       endpoints between them are just shoulders, there to let one
       stretch of the line behave differently from the next. */
    wide: {
      vb: [0, 0, 1200, 420],
      d: 'M 14 286 ' +
         'C 46 208, 92 104, 152 94 ' +        // 01, a high early peak
         'C 232 84, 262 206, 318 262 ' +
         'C 396 340, 476 336, 556 318 ' +     // 02, a long shallow trough
         'C 664 294, 736 254, 800 200 ' +
         'C 872 140, 932 138, 1006 152 ' +    // 03, lower than the first
         'C 1078 166, 1130 212, 1184 240',
      nodes: [
        { x: 152,  y: 94,  below: false },
        { x: 556,  y: 318, below: true  },
        { x: 1006, y: 152, below: false },
      ],
    },
    tall: {
      vb: [-10, 0, 80, 600],
      d: 'M 22 26 ' +
         'C 66 116, -6 178, 26 286 ' +        // 02
         'C 52 372, 74 420, 34 512 ' +        // 03
         'C 20 546, 26 572, 30 592',
      nodes: [
        { x: 22, y: 26,  below: false },      // 01, at the head of the line
        { x: 26, y: 286, below: false },
        { x: 34, y: 512, below: false },
      ],
    },
  };

  /* ---------- DOM handles ---------- */
  const plot = root.querySelector('.tl-plot');
  const card = root.querySelector('.tl-card');

  const NS = 'http://www.w3.org/2000/svg';
  let svg = null, track = null, draw = null, comet = null;
  let inkPasses = [];
  let nodeEls = [];
  let pathLen = 0;
  let nodeAt = [];          // fraction along the path for each node
  let layoutKey = '';

  const mqTall = window.matchMedia('(max-width: 820px)');

  /* ============================================================
     The brush

     A single stroked path always looks plotted: dead-even weight,
     mathematically smooth. A real brush does neither. So the
     geometry is resampled into a run of short segments, each
     given its own width from a profile that swells through the
     middle and tapers at both ends, plus a little smooth noise so
     no two segments match. Every point is nudged along its own
     normal, which puts a hand's wobble into the line. A few
     segments are thinned and faded where the brush ran dry.

     Rebuilding it this way also means the reveal stays cheap —
     only the segments straddling the scroll position are touched
     on any given frame.
     ============================================================ */
  const SEG = 56;
  let segs = [];

  /* smooth pseudo-noise: summed sines, seeded, no library needed */
  function noise(t, seed) {
    return (
      Math.sin(t * 6.7 + seed * 1.7) * 0.5 +
      Math.sin(t * 15.3 + seed * 4.1) * 0.3 +
      Math.sin(t * 31.1 + seed * 9.3) * 0.2
    );
  }

  /* A much slower wander, one or two lobes across the whole line.
     noise() alone is a tremor: it makes the stroke look shaky
     while still following the curve exactly. This carries whole
     stretches off course, so the line arrives where it should
     without having gone there directly. The two together read as
     a hand; either one alone does not. */
  function drift(t) {
    return Math.sin(t * 2.6 + 0.7) * 0.62 + Math.sin(t * 1.3 + 2.2) * 0.38;
  }

  function buildBrush(svgEl, measure, total) {
    segs = [];
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'tl-brush');
    svgEl.appendChild(group);

    const wobble = layoutKey === 'tall' ? 1.9 : 4.4;

    function pointAt(t) {
      const p = measure.getPointAtLength(total * Math.max(0, Math.min(1, t)));
      const a = measure.getPointAtLength(total * Math.max(0, Math.min(1, t - 0.004)));
      const b = measure.getPointAtLength(total * Math.max(0, Math.min(1, t + 0.004)));
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      // unit normal, to push the point off the mathematical line
      const nx = -dy / len, ny = dx / len;
      const off = (noise(t, 3) * 0.58 + drift(t) * 0.9) * wobble;
      return { x: p.x + nx * off, y: p.y + ny * off };
    }

    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG, t1 = (i + 1) / SEG;
      // a few samples per segment keeps the curve smooth
      let d = '';
      for (let k = 0; k <= 3; k++) {
        const p = pointAt(t0 + (t1 - t0) * (k / 3));
        d += (k ? ' L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2);
      }

      const mid = (t0 + t1) / 2;
      // swell through the middle, taper at both ends
      const taper = Math.pow(Math.sin(Math.PI * mid), 0.45);
      const vary = 0.8 + noise(mid, 11) * 0.26;
      let w = (0.9 + 2.9 * taper) * vary;
      let op = 1;
      // where the brush skipped
      if (noise(mid, 23) > 0.6) { w *= 0.5; op = 0.4; }

      const seg = document.createElementNS(NS, 'path');
      seg.setAttribute('d', d);
      seg.setAttribute('class', 'tl-ink');
      seg.setAttribute('vector-effect', 'non-scaling-stroke');
      seg.style.strokeWidth = w.toFixed(2);
      seg.style.opacity = op;
      group.appendChild(seg);

      const sl = seg.getTotalLength() || 1;
      seg.style.strokeDasharray = sl + ' ' + sl;
      seg.style.strokeDashoffset = sl;
      segs.push({ el: seg, t0: t0, t1: t1, len: sl, state: -1 });
    }
  }

  /* Only the segments whose reveal actually changed get written. */
  function paintBrush(p) {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      let state;
      if (p >= s.t1) state = 1;
      else if (p <= s.t0) state = 0;
      else state = (p - s.t0) / (s.t1 - s.t0);
      if (state === s.state) continue;
      s.state = state;
      s.el.style.strokeDashoffset = (s.len * (1 - state)).toFixed(2);
    }
  }

  /* ============================================================
     Build the plot for the current breakpoint
     ============================================================ */
  function build() {
    const key = mqTall.matches ? 'tall' : 'wide';
    if (key === layoutKey) return;
    layoutKey = key;
    const L = LAYOUTS[key];

    plot.innerHTML = '';
    plot.style.aspectRatio = L.vb[2] + ' / ' + L.vb[3];

    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', L.vb.join(' '));
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');

    track = document.createElementNS(NS, 'path');
    track.setAttribute('d', L.d);
    track.setAttribute('class', 'tl-track');
    track.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(track);

    /* a soft halo under the stroke — ink soaking into the paper */
    const bleed = document.createElementNS(NS, 'path');
    bleed.setAttribute('d', L.d);
    bleed.setAttribute('class', 'tl-bleed');
    svg.appendChild(bleed);

    /* The measuring path is never painted. It exists so we can
       sample the geometry and rebuild it as a brush stroke. */
    draw = document.createElementNS(NS, 'path');
    draw.setAttribute('d', L.d);
    draw.setAttribute('class', 'tl-measure');
    svg.appendChild(draw);

    plot.appendChild(svg);
    pathLen = draw.getTotalLength();

    bleed.style.strokeDasharray = pathLen + ' ' + pathLen;
    bleed.style.strokeDashoffset = pathLen;
    inkPasses = [bleed];

    buildBrush(svg, draw, pathLen);

    comet = document.createElement('span');
    comet.className = 'tl-comet';
    plot.appendChild(comet);

    /* where along the path does each node sit? sample and match */
    nodeAt = L.nodes.map((n) => {
      let best = 0, bestD = Infinity;
      for (let i = 0; i <= 400; i++) {
        const len = (pathLen * i) / 400;
        const p = draw.getPointAtLength(len);
        const d2 = (p.x - n.x) * (p.x - n.x) + (p.y - n.y) * (p.y - n.y);
        if (d2 < bestD) { bestD = d2; best = len; }
      }
      return best / pathLen;
    });

    /* checkpoint buttons, positioned in percent of the plot box */
    nodeEls = ORDER.map((slug, i) => {
      const p = PROJECTS[slug];
      const n = L.nodes[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tl-node' + (n.below ? ' below' : '');
      b.dataset.slug = slug;
      b.style.left = (((n.x - L.vb[0]) / L.vb[2]) * 100).toFixed(3) + '%';
      b.style.top = (((n.y - L.vb[1]) / L.vb[3]) * 100).toFixed(3) + '%';
      b.setAttribute('aria-label', 'View ' + p.name);
      b.innerHTML =
        '<span class="tl-dot">' +
          '<svg class="tl-ring" viewBox="0 0 46 46" aria-hidden="true">' +
            '<circle cx="23" cy="23" r="21"/>' +
          '</svg>' +
          '<span class="tl-core"></span>' +
          '<span class="tl-num">0' + (i + 1) + '</span>' +
        '</span>' +
        '<span class="tl-tag">' +
          '<span class="tl-name"></span>' +
          '<span class="tl-cat"></span>' +
        '</span>';
      b.querySelector('.tl-name').textContent = p.short || p.name;
      b.querySelector('.tl-cat').textContent = p.cat;
      b.addEventListener('click', (e) => { e.stopPropagation(); select(slug); });
      plot.appendChild(b);
      return b;
    });

    if (selected) closeCard();
    progress = -1;              // force a redraw pass
    onScroll();
  }

  /* ============================================================
     Scroll → ink, comet, checkpoint reveals
     ============================================================ */
  let progress = -1;
  let target = 0;
  let ticking = false;

  function measure() {
    const r = plot.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // 0 as the plot enters from the bottom, 1 once it has travelled up
    const p = (vh * 0.82 - r.top) / Math.max(1, r.height * 0.82);
    target = Math.max(0, Math.min(1, p));
  }

  function render() {
    ticking = false;
    // ease toward the target so the ink glides rather than snaps
    const next = REDUCED ? target : progress + (target - progress) * 0.14;
    if (Math.abs(next - progress) < 0.0004 && progress >= 0) {
      if (Math.abs(target - progress) > 0.0004) queue();
      return;
    }
    progress = next;

    paintBrush(progress);
    // the halo lags the tip slightly — ink spreads after the brush
    inkPasses[0].style.strokeDashoffset =
      (pathLen * (1 - Math.max(0, progress - 0.015))).toFixed(2);

    const mid = progress > 0.012 && progress < 0.985;
    plot.classList.toggle('drawing', mid && !REDUCED);
    if (mid && !REDUCED) {
      const L = LAYOUTS[layoutKey];
      const pt = draw.getPointAtLength(pathLen * progress);
      comet.style.left = (((pt.x - L.vb[0]) / L.vb[2]) * 100).toFixed(3) + '%';
      comet.style.top = (((pt.y - L.vb[1]) / L.vb[3]) * 100).toFixed(3) + '%';
    }

    nodeEls.forEach((el, i) => {
      el.classList.toggle('lit', progress >= nodeAt[i] - 0.015);
    });

    if (Math.abs(target - progress) > 0.0004) queue();
  }

  function queue() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(render);
  }
  function onScroll() { measure(); queue(); }

  /* ============================================================
     The card

     A popover beside the checkpoint you picked. It holds the
     least that is still worth stopping for: a shot, the name,
     what kind of thing it is, one line about it, and the way
     through to the whole story.

     It is positioned in percent of the plot box, exactly like
     the checkpoints, so it tracks the curve at any width without
     measuring anything. The left edge is clamped well inside the
     box because the card is centred on its node and the outer
     two nodes sit near the ends of the line.
     ============================================================ */
  let selected = null;

  function markActive(slug) {
    nodeEls.forEach((el) => {
      const on = el.dataset.slug === slug;
      el.classList.toggle('active', on);
      el.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  function closeCard() {
    if (!selected) return;
    selected = null;
    card.classList.remove('open');
    card.setAttribute('aria-hidden', 'true');
    markActive(null);
  }

  function select(slug) {
    const data = PROJECTS[slug];
    if (!data) return;
    if (slug === selected) { closeCard(); return; }   // a second click closes it

    selected = slug;
    markActive(slug);

    const L = LAYOUTS[layoutKey];
    const i = ORDER.indexOf(slug);
    const n = L.nodes[i];

    /* centred on the node, but never so far out that the card
       hangs off the plot */
    const xPct = ((n.x - L.vb[0]) / L.vb[2]) * 100;
    const yPct = ((n.y - L.vb[1]) / L.vb[3]) * 100;
    card.style.left = Math.max(21, Math.min(79, xPct)).toFixed(2) + '%';
    card.style.top = yPct.toFixed(2) + '%';
    /* n.below means the checkpoint's own label hangs below it, so
       the card goes the other way and the two never overlap */
    card.classList.toggle('above', !!n.below);

    card.innerHTML =
      '<button class="tl-card-x" type="button" aria-label="Close">✕</button>' +
      '<span class="tl-card-shot">' +
        '<img src="assets/projects/web/' + slug + '-poster.jpg" alt="" ' +
             'loading="lazy" decoding="async">' +
      '</span>' +
      '<span class="tl-card-body">' +
        '<span class="micro tl-card-cat"></span>' +
        '<span class="tl-card-name"></span>' +
        '<span class="tl-card-line"></span>' +
        '<a class="tl-card-go" href="project.html?p=' + slug + '">' +
          '<span class="u">Open project</span><span class="a" aria-hidden="true">→</span>' +
        '</a>' +
      '</span>';

    card.querySelector('.tl-card-cat').textContent = data.cat;
    card.querySelector('.tl-card-name').textContent = data.short || data.name;
    card.querySelector('.tl-card-line').textContent = data.tagline || '';
    card.querySelector('.tl-card-x').addEventListener('click', (e) => {
      e.stopPropagation();
      closeCard();
      const el = nodeEls[i];
      if (el) el.focus();
    });
    /* a poster that is not there should cost the card its picture,
       not its content */
    const img = card.querySelector('img');
    img.addEventListener('error', () => {
      const shot = card.querySelector('.tl-card-shot');
      if (shot) shot.remove();
    }, { once: true });

    card.setAttribute('aria-hidden', 'false');
    card.classList.add('open');
  }

  /* click away, or Escape */
  document.addEventListener('click', (e) => {
    if (!selected) return;
    if (card.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.tl-node')) return;
    closeCard();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) {
      const i = ORDER.indexOf(selected);
      closeCard();
      if (nodeEls[i]) nodeEls[i].focus();
    }
  });

  /* ---------- Keyboard: arrow between checkpoints ---------- */
  plot.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const i = ORDER.indexOf(selected);
    if (i < 0) return;
    const step = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
    const next = (i + step + ORDER.length) % ORDER.length;
    e.preventDefault();
    selected = null;              // so select() opens rather than toggles shut
    select(ORDER[next]);
    nodeEls[next].focus();
  });

  /* ---------- Boot ---------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) root.classList.add('seen'); });
    }, { threshold: 0.2 }).observe(root);
  } else {
    root.classList.add('seen');
  }

  build();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { build(); onScroll(); });
  if (mqTall.addEventListener) mqTall.addEventListener('change', build);
  window.addEventListener('load', onScroll);
  onScroll();
})();
