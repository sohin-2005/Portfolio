/* ============================================================
   project.js — data-driven project detail pages
   Reads ?p=<slug>, renders report, stats, generated wireframe
   screenshots, and a demo-video slot with graceful placeholder.
   Real screenshots/videos can replace the generated art by
   dropping files into assets/projects/ (see video slot hint).
   ============================================================ */

(function () {
  const PROJECTS = {
    audixa: {
      name: 'Audixa', cat: 'AI Expense Platform', year: '3 weeks · solo', role: 'Full Stack Developer',
      stack: 'React · TypeScript · tRPC · Express · Drizzle ORM · MySQL', type: 'finance',
      overview: [
        'Audixa is an AI-powered expense platform: receipts go in, decisions come out. OCR extracts line items from uploaded receipts, and an automated auditing layer checks every expense against company policy before a human ever sees it.',
        'Built solo in three weeks — the full stack, from the type-safe tRPC API and Drizzle/MySQL data layer to the finance dashboard with approvals, flagged reviews, analytics and real-time alerts.',
      ],
      challenge: 'Expense review is slow because every receipt needs human eyes — even the 90% that are obviously fine. The interesting problem was deciding automatically which expenses actually deserve attention.',
      solution: 'OCR receipt extraction feeds a policy-compliance engine that audits each expense automatically. Compliant items sail through; violations are flagged with reasons into a review queue, with dashboards and real-time alerts keeping approvers on top of what matters.',
      stats: [
        { n: 'Solo', l: 'team of one' }, { n: '3 wks', l: 'idea to shipped' }, { n: 'OCR', l: 'receipt extraction' },
      ],
      shots: ['Finance dashboard', 'Flagged review queue', 'Receipt extraction'],
    },
    fettle: {
      name: 'Fettle', cat: 'Recovery-aware Workout Planner', year: '2 weeks · solo', role: 'Full Stack Developer',
      stack: 'Next.js · React · TypeScript · Tailwind CSS · Supabase', type: 'travel',
      overview: [
        'Fettle is a workout planning app that takes recovery as seriously as training. An interactive body map visualizes muscle recovery in real time, so you can see at a glance which muscle groups are ready to work and which still need rest.',
        'It generates data-driven weekly training plans around that recovery state, and synchronizes across devices through optional cloud authentication with Supabase.',
      ],
      challenge: 'Most workout apps plan as if you recover instantly — schedule chest on Monday, chest again on Tuesday, and let soreness sort itself out. Training plans need to react to how the body actually recovers.',
      solution: 'A recovery model drives everything: each completed session updates per-muscle recovery curves rendered live on the interactive body map, and the weekly plan generator schedules around them — hitting recovered muscle groups and protecting the ones still rebuilding.',
      stats: [
        { n: '2 wks', l: 'solo build' }, { n: 'Live', l: 'recovery body map' }, { n: 'Sync', l: 'across devices' },
      ],
      shots: ['Recovery body map', 'Weekly plan generator', 'Session tracker'],
    },
    bubble: {
      name: 'Bubble Detection', cat: 'Financial ML System', year: '3 months · team of 4', role: 'UI/UX Developer',
      stack: 'Python · Scikit-learn · FinBERT · FastAPI · PostgreSQL · Streamlit', type: 'chart',
      overview: [
        'A financial bubble detection system that combines market data with news sentiment to predict bubble and crash probabilities — turning two very different signals into one early-warning view.',
        'Built with a team of four over three months. I owned the UI/UX: the Streamlit interface that turns model output into probabilities, signals and explanations an analyst can actually read.',
      ],
      challenge: 'Bubbles are obvious in hindsight and invisible in the moment. Price action alone lags; sentiment alone is noisy. The system needed to fuse both into a probability an analyst can trust.',
      solution: 'A hybrid model combining Z-score and PSY-based bubble indicators on market data with FinBERT news sentiment, stacked into an ensemble classifier — reaching over 90% classification performance, served through FastAPI and visualized in Streamlit.',
      stats: [
        { n: '90%+', l: 'classification performance' }, { n: '2', l: 'signal sources fused' }, { n: '4', l: 'person team' },
      ],
      shots: ['Probability dashboard', 'Sentiment signals', 'Model performance'],
    },
  };
  const ORDER = ['audixa', 'fettle', 'bubble'];

  /* ---------- resolve slug ---------- */
  const slug = new URLSearchParams(location.search).get('p');
  const data = PROJECTS[slug];
  if (!data) { location.replace('works.html'); return; }
  const idx = ORDER.indexOf(slug);

  /* ============================================================
     Wireframe screenshot generator — seeded, monochrome
     ============================================================ */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const NS = 'http://www.w3.org/2000/svg';

  /* Map hardcoded ink/paper colors to theme-aware equivalents:
     ink → currentColor (+opacity attr), paper → .bgf/.bgs classes
     styled with var(--bg) in project.css. */
  function themedColor(e, k, v) {
    const s = String(v);
    let m;
    if (s === '#111') return 'currentColor';
    if ((m = s.match(/^rgba\(17,\s*17,\s*17,\s*([0-9.]+)\)$/))) {
      e.setAttribute(k + '-opacity', m[1]);
      return 'currentColor';
    }
    if (s === '#ececec' || s === '#f6f6f5') {
      e.classList.add(k === 'fill' ? 'bgf' : 'bgs');
      return null;
    }
    if ((m = s.match(/^rgba\(236,\s*236,\s*236,\s*([0-9.]+)\)$/))) {
      e.classList.add(k === 'fill' ? 'bgf' : 'bgs');
      e.setAttribute(k + '-opacity', m[1]);
      return null;
    }
    return v;
  }

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) {
      let v = attrs[k];
      if (k === 'fill' || k === 'stroke') v = themedColor(e, k, v);
      if (v !== null) e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  function frame(W, H) {
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, xmlns: NS });
    svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: '#f6f6f5' }, svg);
    // browser chrome
    svgEl('rect', { x: 0, y: 0, width: W, height: 34, fill: '#ececec' }, svg);
    svgEl('line', { x1: 0, y1: 34, x2: W, y2: 34, stroke: 'rgba(17,17,17,0.2)' }, svg);
    [14, 30, 46].forEach((cx) => svgEl('circle', { cx: cx, cy: 17, r: 4.5, fill: 'none', stroke: '#111', 'stroke-width': 1.2 }, svg));
    svgEl('rect', { x: 70, y: 9, width: W - 140, height: 16, rx: 8, fill: 'rgba(17,17,17,0.08)' }, svg);
    return svg;
  }
  function blocks(svg, r, x, y, w, h, rows, cols, gap) {
    const bw = (w - gap * (cols - 1)) / cols;
    const bh = (h - gap * (rows - 1)) / rows;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        svgEl('rect', {
          x: x + j * (bw + gap), y: y + i * (bh + gap), width: bw, height: bh, rx: 3,
          fill: 'rgba(17,17,17,' + (0.05 + r() * 0.1).toFixed(2) + ')',
          stroke: 'rgba(17,17,17,0.25)', 'stroke-width': 0.8,
        }, svg);
  }
  function bars(svg, r, x, y, w, h, n) {
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const bh = h * (0.25 + r() * 0.75);
      svgEl('rect', { x: x + i * bw + bw * 0.18, y: y + h - bh, width: bw * 0.64, height: bh, fill: 'rgba(17,17,17,' + (0.5 + r() * 0.4).toFixed(2) + ')' }, svg);
    }
  }
  function line(svg, r, x, y, w, h) {
    let d = '';
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const px = x + (w / n) * i;
      const py = y + h * (0.15 + r() * 0.7);
      d += (i ? ' L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1);
    }
    svgEl('path', { d: d, fill: 'none', stroke: '#111', 'stroke-width': 1.6 }, svg);
  }
  function listRows(svg, r, x, y, w, n, rh) {
    for (let i = 0; i < n; i++) {
      const yy = y + i * rh;
      svgEl('circle', { cx: x + 10, cy: yy + rh / 2, r: 6, fill: 'rgba(17,17,17,0.25)' }, svg);
      svgEl('rect', { x: x + 26, y: yy + rh / 2 - 8, width: w * (0.3 + r() * 0.3), height: 6, rx: 3, fill: 'rgba(17,17,17,0.4)' }, svg);
      svgEl('rect', { x: x + 26, y: yy + rh / 2 + 2, width: w * (0.15 + r() * 0.2), height: 4, rx: 2, fill: 'rgba(17,17,17,0.18)' }, svg);
      svgEl('line', { x1: x, y1: yy + rh, x2: x + w, y2: yy + rh, stroke: 'rgba(17,17,17,0.12)' }, svg);
    }
  }
  function donut(svg, cx, cy, rad) {
    svgEl('circle', { cx: cx, cy: cy, r: rad, fill: 'none', stroke: 'rgba(17,17,17,0.15)', 'stroke-width': rad * 0.42 }, svg);
    const c = 2 * Math.PI * rad;
    svgEl('circle', {
      cx: cx, cy: cy, r: rad, fill: 'none', stroke: '#111', 'stroke-width': rad * 0.42,
      'stroke-dasharray': c * 0.62 + ' ' + c, transform: 'rotate(-90 ' + cx + ' ' + cy + ')',
    }, svg);
  }
  function bubbles(svg, r, x, y, w, n) {
    let yy = y;
    for (let i = 0; i < n; i++) {
      const bw = w * (0.3 + r() * 0.35);
      const left = r() > 0.45;
      const bh = 22 + r() * 18;
      svgEl('rect', {
        x: left ? x : x + w - bw, y: yy, width: bw, height: bh, rx: 10,
        fill: left ? 'rgba(17,17,17,0.1)' : '#111',
      }, svg);
      yy += bh + 10;
    }
  }

  function shot(type, seed, W, H) {
    const r = rng(seed);
    const svg = frame(W, H);
    const top = 34;
    const CH = H - top;
    if (type === 'dashboard') {
      svgEl('rect', { x: 0, y: top, width: 120, height: CH, fill: 'rgba(17,17,17,0.05)' }, svg);
      listRows(svg, r, 12, top + 16, 96, 6, 30);
      blocks(svg, r, 140, top + 20, W - 160, 70, 1, 4, 14);
      bars(svg, r, 140, top + 110, (W - 174) / 2, CH - 140, 9);
      line(svg, r, 154 + (W - 174) / 2, top + 110, (W - 174) / 2, CH - 140);
    } else if (type === 'shop') {
      svgEl('rect', { x: 20, y: top + 18, width: W - 40, height: CH * 0.34, rx: 4, fill: 'rgba(17,17,17,0.85)' }, svg);
      svgEl('rect', { x: 44, y: top + 18 + CH * 0.12, width: W * 0.3, height: 12, rx: 6, fill: '#ececec' }, svg);
      svgEl('rect', { x: 44, y: top + 38 + CH * 0.12, width: W * 0.18, height: 8, rx: 4, fill: 'rgba(236,236,236,0.6)' }, svg);
      blocks(svg, r, 20, top + 30 + CH * 0.34, W - 40, CH * 0.5, 1, 3, 16);
    } else if (type === 'chart') {
      line(svg, r, 30, top + 30, W - 60, CH * 0.42);
      line(svg, r, 30, top + 30, W - 60, CH * 0.42);
      for (let i = 0; i < 5; i++)
        svgEl('line', { x1: 30, y1: top + 30 + (CH * 0.42 / 4) * i, x2: W - 30, y2: top + 30 + (CH * 0.42 / 4) * i, stroke: 'rgba(17,17,17,0.1)' }, svg);
      bars(svg, r, 30, top + CH * 0.52, W - 60, CH * 0.34, 22);
    } else if (type === 'finance') {
      svgEl('rect', { x: 24, y: top + 20, width: W * 0.42, height: CH * 0.3, rx: 8, fill: '#111' }, svg);
      svgEl('rect', { x: 42, y: top + 42, width: W * 0.16, height: 10, rx: 5, fill: 'rgba(236,236,236,0.7)' }, svg);
      svgEl('rect', { x: 42, y: top + 62, width: W * 0.24, height: 16, rx: 8, fill: '#ececec' }, svg);
      donut(svg, W * 0.75, top + 20 + CH * 0.15, CH * 0.13);
      listRows(svg, r, 24, top + CH * 0.42, W - 48, 4, (CH * 0.5) / 4);
    } else if (type === 'travel') {
      svgEl('rect', { x: 0, y: top, width: W * 0.55, height: CH, fill: 'rgba(17,17,17,0.06)' }, svg);
      for (let i = 0; i < 7; i++)
        svgEl('circle', { cx: W * 0.08 + r() * W * 0.4, cy: top + 30 + r() * (CH - 60), r: 3 + r() * 5, fill: 'rgba(17,17,17,' + (0.3 + r() * 0.5).toFixed(2) + ')' }, svg);
      let d = '';
      for (let i = 0; i < 5; i++) {
        const px = W * 0.08 + r() * W * 0.4, py = top + 30 + r() * (CH - 60);
        d += (i ? ' L' : 'M') + px.toFixed(0) + ' ' + py.toFixed(0);
      }
      svgEl('path', { d: d, fill: 'none', stroke: '#111', 'stroke-width': 1.4, 'stroke-dasharray': '5 4' }, svg);
      listRows(svg, r, W * 0.58, top + 20, W * 0.38, 5, (CH - 40) / 5);
    } else {
      svgEl('rect', { x: 0, y: top, width: 130, height: CH, fill: 'rgba(17,17,17,0.05)' }, svg);
      listRows(svg, r, 12, top + 14, 106, 6, 32);
      bubbles(svg, r, 150, top + 24, W - 190, 6);
      svgEl('rect', { x: 150, y: H - 40, width: W - 190, height: 24, rx: 12, fill: 'none', stroke: 'rgba(17,17,17,0.35)' }, svg);
    }
    return svg;
  }

  /* ============================================================
     Populate the page
     ============================================================ */
  document.title = data.name + ' — Sohin Santhosh';
  document.getElementById('trWord').textContent = data.name;
  document.getElementById('pjIndex').textContent = '0' + (idx + 1) + ' / 0' + ORDER.length + ' — ' + data.cat;
  document.getElementById('pjTitle').textContent = data.name;

  const meta = document.getElementById('pjMeta');
  [['Category', data.cat], ['Year', data.year], ['Role', data.role], ['Stack', data.stack]].forEach((m) => {
    const d = document.createElement('div');
    d.className = 'm';
    const k = document.createElement('span'); k.className = 'micro'; k.textContent = m[0];
    const v = document.createElement('span'); v.className = 'v'; v.textContent = m[1];
    d.appendChild(k); d.appendChild(v);
    meta.appendChild(d);
  });

  document.getElementById('pjCover').appendChild(shot(data.type, idx * 97 + 13, 1200, 520));

  function paras(id, arr) {
    const box = document.getElementById(id);
    arr.forEach((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      box.appendChild(p);
    });
  }
  paras('pjOverview', data.overview);
  paras('pjChallenge', [data.challenge]);
  paras('pjSolution', [data.solution]);

  const stats = document.getElementById('pjStats');
  data.stats.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'pj-stat';
    const n = document.createElement('span'); n.className = 'n'; n.textContent = s.n;
    const l = document.createElement('span'); l.className = 'l'; l.textContent = s.l;
    d.appendChild(n); d.appendChild(l);
    stats.appendChild(d);
  });

  const gallery = document.getElementById('pjGallery');
  data.shots.forEach((cap, i) => {
    const d = document.createElement('div');
    d.className = 'pj-shot';
    d.appendChild(shot(data.type, idx * 97 + 31 * (i + 1), i === 0 ? 1200 : 590, i === 0 ? 480 : 400));
    const c = document.createElement('span');
    c.className = 'cap';
    c.textContent = cap;
    d.appendChild(c);
    gallery.appendChild(d);
  });

  /* video slot: tries assets/projects/<slug>.mp4, falls back to a styled placeholder */
  const vbox = document.getElementById('pjVideo');
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  const srcEl = document.createElement('source');
  srcEl.src = 'assets/projects/' + slug + '.mp4';
  srcEl.type = 'video/mp4';
  video.appendChild(srcEl);
  srcEl.addEventListener('error', () => {
    vbox.innerHTML = '';
    const ph = document.createElement('div');
    ph.className = 'video-ph';
    const big = document.createElement('div');
    big.className = 'big';
    big.textContent = 'Demo video slot';
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = 'Drop a walkthrough at <code>assets/projects/' + slug + '.mp4</code> and it will play here automatically.';
    ph.appendChild(big); ph.appendChild(hint);
    vbox.appendChild(ph);
  });
  vbox.appendChild(video);

  /* next project */
  const next = PROJECTS[ORDER[(idx + 1) % ORDER.length]];
  const nextSlug = ORDER[(idx + 1) % ORDER.length];
  const nextEl = document.getElementById('pjNext');
  nextEl.href = 'project.html?p=' + nextSlug;
  nextEl.dataset.word = next.name;
  document.getElementById('pjNextName').textContent = next.name;
})();
