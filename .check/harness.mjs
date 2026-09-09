/* ============================================================
   harness.mjs — a headless smoke test for the portfolio

   There is no browser binary in this environment, so the page
   is booted in jsdom with the handful of APIs jsdom lacks
   stubbed out: canvas, SVG geometry, the observers and rAF.

   It is not a rendering test. What it does catch is the class
   of mistake that actually breaks a static site — a typo in a
   selector, a variable that was renamed in one file and not
   another, a script that throws before it finishes wiring
   itself up — and it reports every error rather than the first.

   Run:  node .check/harness.mjs
   ============================================================ */

import { readFileSync } from 'node:fs';
import jsdomPkg from 'jsdom';
import { install as installGeom } from './svg-geom.mjs';
const { JSDOM, VirtualConsole } = jsdomPkg;
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.FOLIO_ROOT || resolve(here, '..');

/* a plain static server over the repo root, so relative script
   and asset URLs resolve exactly as they would in production */
const ORIGIN = process.env.FOLIO_ORIGIN || 'http://127.0.0.1:8899';

/* the page animates on real timers, so waits here are real too */
const tick = (dom, ms) => new Promise((r) => setTimeout(r, ms));

const pages = process.argv.slice(2);
if (!pages.length) pages.push('index.html', 'playground.html');

let failed = 0;

for (const page of pages) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => {
    // resource loads we deliberately do not provide are not failures
    if (/Could not load|Error: Not implemented|not implemented/i.test(e.message)) return;
    errors.push((e.detail && e.detail.stack) || e.message);
  });
  vc.on('error', (m) => errors.push('console.error: ' + m));

  const html = readFileSync(resolve(ROOT, page), 'utf8')
    // the analytics beacon is not served locally
    .replace(/<script[^>]*_vercel[^>]*><\/script>/g, '')
    .replace(/<link[^>]*fonts\.(googleapis|gstatic)[^>]*>/g, '');

  /* Scripts come off the local static server (see ORIGIN), so
     the harness runs exactly the files in the repo. */
  const dom = new JSDOM(html, {
    url: ORIGIN + '/' + page,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      /* ---- the APIs jsdom does not implement ---- */
      const noop = () => {};
      const ctx2d = new Proxy({}, {
        get: (t, k) => {
          if (k === 'canvas') return { width: 0, height: 0 };
          if (k === 'createLinearGradient' || k === 'createRadialGradient') {
            return () => ({ addColorStop: noop });
          }
          return () => undefined;
        },
        set: () => true,
      });
      win.HTMLCanvasElement.prototype.getContext = () => ctx2d;

      const P = (x, y) => ({ x, y });
      installGeom(win);                    // real path lengths and points
      win.SVGElement.prototype.getExtentOfChar = function (i) {
        return { x: 300 + i * 40, y: 60, width: 38, height: 120 };
      };
      win.SVGElement.prototype.getScreenCTM = function () {
        return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      };
      win.SVGElement.prototype.createSVGPoint = function () {
        return { x: 0, y: 0, matrixTransform(m) { return P(this.x * m.a + m.e, this.y * m.d + m.f); } };
      };

      class Obs {
        constructor(cb) { this.cb = cb; }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() { return []; }
      }
      win.IntersectionObserver = Obs;
      win.ResizeObserver = Obs;

      win.matchMedia = (q) => ({
        matches: /hover: hover/.test(q),   // pretend a desktop pointer, no reduced motion
        media: q, addListener: noop, removeListener: noop,
        addEventListener: noop, removeEventListener: noop, onchange: null,
      });

      win.requestAnimationFrame = (cb) => win.setTimeout(() => cb(win.performance.now()), 16);
      win.cancelAnimationFrame = (id) => win.clearTimeout(id);
      win.scrollTo = noop;

      win.addEventListener('error', (e) => errors.push('window error: ' + (e.error ? e.error.stack : e.message)));
      win.addEventListener('unhandledrejection', (e) => errors.push('unhandled rejection: ' + e.reason));
    },
  });

  /* the scripts are at the end of <body>, so they have run by
     the time the document is parsed; give the deferred work a
     few ticks to throw as well */
  await new Promise((r) => setTimeout(r, 1500));
  dom.window.dispatchEvent(new dom.window.Event('load'));
  await new Promise((r) => setTimeout(r, 600));

  if (process.env.FOLIO_DEBUG) {
    console.log('  [debug] html class:', dom.window.document.documentElement.className);
    console.log('  [debug] globals:',
      ['__motion', '__theme', '__nav', '__ambient', '__ink', '__case']
        .map((k) => k + '=' + typeof dom.window[k]).join(' '));
  }

  const doc = dom.window.document;
  const checks = [];
  const ok = (name, cond, extra) => checks.push({ name, cond: !!cond, extra });

  if (page === 'index.html') {
    ok('intro overlay present', doc.getElementById('intro'));
    ok('hero name present', doc.getElementById('heroName'));
    ok('four sections', doc.querySelectorAll('[data-section]').length === 4,
      doc.querySelectorAll('[data-section]').length);
    ok('rail links resolve', Array.from(doc.querySelectorAll('.rail-link[href^="#"]'))
      .every((a) => doc.getElementById(a.getAttribute('href').slice(1))));
    ok('nav links resolve', Array.from(doc.querySelectorAll('.main-nav a[href^="#"]'))
      .every((a) => doc.getElementById(a.getAttribute('href').slice(1))));
    ok('three work rows', doc.querySelectorAll('.work-row[data-project]').length === 3);
    ok('case panel mounted', doc.querySelector('.cs-panel'));
    ok('ink layer mounted', doc.querySelector('.ik-layer'));
    ok('ambient stage mounted', doc.querySelector('.amb-stage'));
    ok('dock mounted', doc.querySelector('.dock'));
    ok('ink cursor mounted', doc.querySelector('.ic-cursor'));
    ok('nav API exposed', typeof dom.window.__nav === 'object');
    ok('case API exposed', typeof dom.window.__case === 'object');
    ok('ink API exposed', typeof dom.window.__ink === 'object');
    ok('ambient defaults to ink', dom.window.__ambient && dom.window.__ambient.current() === 'ink',
      dom.window.__ambient && dom.window.__ambient.current());
    ok('no transition overlay left', !doc.getElementById('tr'));
    ok('no vine classes left', !doc.querySelector('.fl-layer, .tv-bed, .lf-cursor'));
    ok('ink marks were drawn', doc.querySelectorAll('.ik-layer .ik').length > 0,
      doc.querySelectorAll('.ik-layer .ik').length);
    ok('ink strokes have a length set',
      Array.from(doc.querySelectorAll('.ik-line')).every((p) => p.style.getPropertyValue('--len')));

    /* ---- the opening sequence, watched end to end ----
       This runs before anything else is poked, because a click
       or a keypress anywhere on the page skips the intro on
       purpose — which is exactly what the interaction checks
       below would otherwise do to it. */
    const seen = new Set();
    const intro = doc.getElementById('intro');
    if (intro) {
      const mo = new dom.window.MutationObserver(() => {
        intro.classList.forEach((c) => seen.add(c));
      });
      mo.observe(intro, { attributes: true, attributeFilter: ['class'] });
      intro.classList.forEach((c) => seen.add(c));
      await tick(dom, 11000);
      mo.disconnect();
    }
    ok('intro toured with the bead', seen.has('bead'));
    ok('intro brought up the wordmark', seen.has('letters'));
    ok('intro landed the dot on the i', seen.has('landed'));
    ok('intro handed over to the page', seen.has('opening'));
    ok('intro removed itself', !doc.getElementById('intro'));
    ok('intro released the page', doc.documentElement.classList.contains('intro-done') &&
      !doc.documentElement.classList.contains('intro-on'));

    /* ---- the case study opens, swaps and closes ---- */
    const row = doc.querySelector('.work-row[data-project="fettle"]');
    row.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await tick(dom, 60);
    const cs = doc.querySelector('.cs');
    ok('case study opens on a row click', !cs.hidden && cs.classList.contains('on'));
    ok('case study shows the right project', doc.querySelector('#csTitle').textContent === 'Fettle',
      doc.querySelector('#csTitle').textContent);
    ok('case study fills its sections',
      doc.querySelectorAll('.cs .pj-stat').length === 3 &&
      doc.querySelectorAll('.cs .pj-shot').length === 3 &&
      doc.querySelectorAll('.cs .pj-meta .m').length === 4);
    ok('case study records the deep link', dom.window.location.search.includes('work=fettle'),
      dom.window.location.search);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tick(dom, 700);
    ok('escape closes the case study', cs.hidden);
    ok('deep link is cleared on close', !dom.window.location.search.includes('work='),
      dom.window.location.search);

    /* ---- navigation ---- */
    ok('goto reaches a section', dom.window.__nav.goto('about') === true);
    ok('goto rejects an unknown section', dom.window.__nav.goto('nope') === false);
    ok('all four sections are known', dom.window.__nav.sections().join(',') === 'works,about,playground,contact',
      dom.window.__nav.sections().join(','));
  }

  if (page === 'playground.html') {
    ok('no transition overlay left', !doc.getElementById('tr'));
    ok('playground grid present', doc.querySelectorAll('.pg-cell').length === 7);
    ok('ink layer mounted', doc.querySelector('.ik-layer'));
    ok('back link points home', doc.querySelector('.back[href="index.html"]'));
  }

  const bad = checks.filter((c) => !c.cond);
  console.log('\n=== ' + page + ' ===');
  console.log('  checks: ' + (checks.length - bad.length) + '/' + checks.length + ' passed');
  bad.forEach((c) => console.log('  ✗ ' + c.name + (c.extra !== undefined ? '  (got: ' + c.extra + ')' : '')));
  if (errors.length) {
    console.log('  script errors:');
    [...new Set(errors)].forEach((e) => console.log('    • ' + String(e).split('\n').slice(0, 3).join('\n      ')));
  } else {
    console.log('  script errors: none');
  }
  if (bad.length || errors.length) failed++;
  dom.window.close();
}

process.exit(failed ? 1 : 0);
