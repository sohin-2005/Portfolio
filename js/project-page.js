/* ============================================================
   project-page.js — one project, in full, on its own URL

   project.html?p=<slug>. Everything comes from the shared data
   in js/projects-data.js, and the markup it builds is the .pj-*
   structure css/project.css was written for.

   This replaced an in-page overlay that rendered the same
   content into a dialog. The content was fine; having no URL was
   not. A case study you cannot link to, bookmark or send to
   somebody is a case study nobody reads twice.

   Images are real files with a graceful failure: a shot whose
   file is missing removes its own figure rather than leaving a
   broken-image box in the middle of a case study.
   ============================================================ */

(function () {
  const root = document.getElementById('projectPage');
  if (!root || !window.__PROJECTS) return;

  const PROJECTS = window.__PROJECTS;
  const ORDER = window.__PROJECT_ORDER || Object.keys(PROJECTS);

  /* ---------- Which project? ---------- */
  function slugFromUrl() {
    let q = null;
    try { q = new URLSearchParams(location.search).get('p'); } catch (e) { /* old browser */ }
    if (!q) {
      /* ?p= is the contract, but a bare #slug should not 404 */
      const h = (location.hash || '').replace('#', '');
      if (h) q = h;
    }
    return q && PROJECTS[q] ? q : null;
  }

  const slug = slugFromUrl();

  if (!slug) {
    /* A real state, not a crash: somebody has landed on the page
       with no project named, or one that has since been removed. */
    root.innerHTML =
      '<div class="pj-hero">' +
        '<h1 class="pj-title">Not found</h1>' +
        '<div class="pj-meta"><div class="m">' +
          '<span class="micro">Sorry</span>' +
          '<span class="v">That project does not exist.</span>' +
        '</div></div>' +
      '</div>' +
      '<div class="pj-body"><section class="pj-section">' +
        '<a class="pj-next" href="projects.html">' +
          '<span class="micro">Go to</span>' +
          '<span class="pj-next-name">All projects</span>' +
          '<span class="pj-next-arr">→</span>' +
        '</a>' +
      '</section></div>';
    document.title = 'Not found — Sohin Santhosh';
    return;
  }

  const data = PROJECTS[slug];
  const idx = ORDER.indexOf(slug);
  const nextSlug = ORDER[(idx + 1) % ORDER.length];
  const next = PROJECTS[nextSlug];

  document.title = data.name + ' — Sohin Santhosh';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', data.name + ' — ' + data.cat + '. ' + (data.tagline || ''));

  /* ---------- Helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function paras(box, arr) {
    arr.filter(Boolean).forEach(function (t) { box.appendChild(el('p', null, t)); });
  }

  /* An image that removes its own container if the file is not
     there, so a gap in the assets is invisible rather than a
     broken icon in the middle of the page.

     Appended before the src is set, deliberately. Holding it back
     until onload and appending then looks tidier and does not
     work: a detached image carrying loading="lazy" is never near
     any viewport, so the browser is entitled to never fetch it,
     and every picture on this page stayed blank. In the document
     first, then let it load. */
  function figure(container, src, alt, eager, onFail) {
    const img = new Image();
    img.alt = alt || '';
    img.decoding = 'async';
    if (!eager) img.loading = 'lazy';
    img.addEventListener('error', function () { if (onFail) onFail(); }, { once: true });
    container.appendChild(img);
    img.src = src;
  }

  /* ---------- Build ---------- */
  const frag = document.createDocumentFragment();

  /* hero */
  const hero = el('div', 'pj-hero');
  const kicker = el('span', 'micro pj-kicker',
    '0' + (idx + 1) + ' / 0' + ORDER.length + ' — ' + data.cat);
  hero.appendChild(kicker);
  hero.appendChild(el('h1', 'pj-title', data.name));
  if (data.tagline) hero.appendChild(el('p', 'pj-tagline', data.tagline));

  const meta = el('div', 'pj-meta');
  [['Category', data.cat], ['Year', data.year], ['Role', data.role], ['Stack', data.stack]]
    .forEach(function (m) {
      if (!m[1]) return;
      const d = el('div', 'm');
      d.appendChild(el('span', 'micro', m[0]));
      d.appendChild(el('span', 'v', m[1]));
      meta.appendChild(d);
    });
  hero.appendChild(meta);

  /* the two outbound links, if there are any */
  const links = data.links || {};
  if (links.live || links.repo) {
    const row = el('div', 'pj-links');
    if (links.live) {
      const a = el('a', 'pj-link pj-link-live');
      a.href = links.live;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = 'Visit the site<span class="pj-arr" aria-hidden="true">↗</span>';
      row.appendChild(a);
    }
    if (links.repo) {
      const a = el('a', 'pj-link');
      a.href = links.repo;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.innerHTML = 'Source on GitHub<span class="pj-arr" aria-hidden="true">↗</span>';
      row.appendChild(a);
    }
    hero.appendChild(row);
  }
  frag.appendChild(hero);

  /* cover */
  const cover = el('div', 'pj-cover');
  frag.appendChild(cover);
  figure(cover, 'assets/projects/' + slug + '-cover.jpg', data.name + ' cover',
    true, function () { cover.remove(); });

  /* body */
  const body = el('div', 'pj-body');

  function section(title, fill) {
    const s = el('section', 'pj-section');
    s.appendChild(el('h2', 'pj-h', title));
    fill(s);
    body.appendChild(s);
    return s;
  }

  section('Overview', function (s) {
    const p = el('div', 'pj-prose');
    paras(p, data.overview || []);
    s.appendChild(p);
  });

  if (data.challenge || data.solution) {
    const s = el('section', 'pj-section pj-two');
    [['The Challenge', data.challenge], ['The Solution', data.solution]].forEach(function (c) {
      if (!c[1]) return;
      const d = el('div');
      d.appendChild(el('h2', 'pj-h', c[0]));
      const p = el('div', 'pj-prose');
      paras(p, [c[1]]);
      d.appendChild(p);
      s.appendChild(d);
    });
    body.appendChild(s);
  }

  if ((data.stats || []).length) {
    section('Results', function (s) {
      const box = el('div', 'pj-stats');
      data.stats.forEach(function (st) {
        const d = el('div', 'pj-stat');
        d.appendChild(el('span', 'n', st.n));
        d.appendChild(el('span', 'l', st.l));
        box.appendChild(d);
      });
      s.appendChild(box);
    });
  }

  if ((data.shots || []).length) {
    section('Screens', function (s) {
      const gal = el('div', 'pj-gallery');
      data.shots.forEach(function (cap, i) {
        const d = el('div', 'pj-shot');
        gal.appendChild(d);
        figure(d, 'assets/projects/' + slug + '-' + (i + 1) + '.png', cap,
          false, function () { d.remove(); });
        d.appendChild(el('span', 'cap', cap));
      });
      s.appendChild(gal);
    });
  }

  if (data.video && (data.video.local || data.video.cdn)) {
    section('Demo', function (s) {
      const box = el('div', 'pj-video');
      const v = document.createElement('video');
      v.controls = true;
      v.preload = 'none';
      v.playsInline = true;
      if (data.poster !== false) v.poster = 'assets/projects/web/' + slug + '-poster.jpg';
      /* the local file first (fastest, always the right codec),
         the CDN copy as a fallback; the error listener sits on the
         <video>, which is what fires once every <source> is out */
      if (data.video.local) {
        const src = document.createElement('source');
        src.src = data.video.local;
        src.type = 'video/mp4';
        v.appendChild(src);
      }
      if (data.video.cdn) {
        const src = document.createElement('source');
        src.src = data.video.cdn;
        v.appendChild(src);
      }
      v.addEventListener('error', function () { box.remove(); });
      box.appendChild(v);
      s.appendChild(box);
    });
  }

  frag.appendChild(body);

  /* next */
  const nx = el('a', 'pj-next');
  nx.href = 'project.html?p=' + nextSlug;
  nx.appendChild(el('span', 'micro', 'Next project'));
  nx.appendChild(el('span', 'pj-next-name', next.short || next.name));
  nx.appendChild(el('span', 'pj-next-arr', '→'));
  frag.appendChild(nx);

  root.appendChild(frag);
})();
