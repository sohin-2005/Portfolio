/* ============================================================
   preview.mjs — a contact sheet of the ink marks

   The harness proves the code runs. This proves it looks like
   something. It boots the page, pulls the marks the generator
   actually produced, flattens the CSS into presentation
   attributes (so a plain rasteriser can draw them) and tiles
   them into one sheet.

   Run:  node .check/preview.mjs > .check/ink-sheet.svg
   ============================================================ */

import jsdomPkg from 'jsdom';
import { install as installGeom } from './svg-geom.mjs';
const { JSDOM, VirtualConsole } = jsdomPkg;

const ORIGIN = process.env.FOLIO_ORIGIN || 'http://127.0.0.1:8899';
const LINE = '#2f6b52';
const FILL = '#3c7d61';

const vc = new VirtualConsole();
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: ORIGIN + '/index.html',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  virtualConsole: vc,
});

const win = dom.window;
const noop = () => {};
const ctx2d = new Proxy({}, {
  get: (t, k) => (k === 'canvas' ? { width: 0, height: 0 }
    : (k === 'createLinearGradient' || k === 'createRadialGradient')
      ? () => ({ addColorStop: noop }) : () => undefined),
  set: () => true,
});
win.HTMLCanvasElement.prototype.getContext = () => ctx2d;
installGeom(win);            // real path lengths and points
class Obs { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
win.IntersectionObserver = Obs;
win.ResizeObserver = Obs;
win.matchMedia = (q) => ({ matches: false, media: q, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
win.requestAnimationFrame = (cb) => win.setTimeout(() => cb(0), 16);
win.cancelAnimationFrame = (id) => win.clearTimeout(id);

const doc = win.document;
doc.documentElement.style.setProperty('--ink-line', LINE);
doc.documentElement.style.setProperty('--ink-fill', FILL);

/* load the generator on its own — no page needed, just a target */
await new Promise((r) => setTimeout(r, 100));
await new Promise((resolve, reject) => {
  const s = doc.createElement('script');
  s.src = '/js/ink.js';
  s.onload = resolve;
  s.onerror = reject;
  doc.body.appendChild(s);
});
await new Promise((r) => setTimeout(r, 200));

/* ask for one of every mark, laid out on a grid */
const CELL = 260;
const KINDS = ['trace', 'sweep', 'contour', 'drop', 'halo', 'corner'];
const COLS = 3;

const layer = doc.querySelector('.ik-layer');
layer.style.height = '2000px';
Object.defineProperty(doc.documentElement, 'clientWidth', { value: COLS * CELL, configurable: true });

win.__ink.setMode('ink');
await new Promise((r) => setTimeout(r, 120));

/* The generator has no public "draw me a trace" door, and it
   should not — placement is part of what it decides. So the
   sheet is produced the same way the page produces one: by
   putting an anchor of each kind on the grid and letting the
   rule table find them. */
layer.innerHTML = '';
const stage = doc.createElement('div');
doc.body.appendChild(stage);
const RULE_FOR = {
  trace: 'about-body', sweep: 'rz-h', contour: 'cn-title',
  drop: 'page-title', halo: 'portrait', corner: null,
};
const anchors = [];
KINDS.forEach((kind, i) => {
  const a = doc.createElement('div');
  const col = i % COLS, row = Math.floor(i / COLS);
  a.className = RULE_FOR[kind] === 'about-body' ? 'big' : (RULE_FOR[kind] || 'spacer');
  if (RULE_FOR[kind] === 'about-body') { const w = doc.createElement('div'); w.className = 'about-body'; w.appendChild(a); stage.appendChild(w); }
  else stage.appendChild(a);
  a.getBoundingClientRect = () => ({
    left: col * CELL + 40, top: row * CELL + 40, width: CELL - 80, height: CELL - 80,
    right: col * CELL + CELL - 40, bottom: row * CELL + CELL - 40,
  });
  a.getClientRects = () => [1];
  anchors.push(a);
});

win.__ink.refresh();
await new Promise((r) => setTimeout(r, 500));

/* ---------- flatten CSS into attributes ---------- */
function flatten(root) {
  root.querySelectorAll('.ik-line, .ik-echo, .ik-link').forEach((p) => {
    const w = p.style.getPropertyValue('--w') || 1.6;
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', LINE);
    p.setAttribute('stroke-width', p.classList.contains('ik-echo') ? (w * 0.6).toFixed(2) : w);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('opacity', p.classList.contains('ik-echo') ? 0.22 : (p.style.getPropertyValue('--o') || 0.7));
  });
  root.querySelectorAll('.ik-dot, .ik-star').forEach((c) => {
    c.setAttribute('fill', FILL);
    c.setAttribute('opacity', c.style.getPropertyValue('--o') || 0.75);
  });
  root.querySelectorAll('.ik-ring').forEach((c) => {
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', LINE);
    c.setAttribute('stroke-width', 1);
    c.setAttribute('opacity', 0.28);
  });
  root.querySelectorAll('.ik-blot').forEach((c) => {
    c.setAttribute('fill', FILL);
    c.setAttribute('opacity', 0.14);
  });
}

const W = COLS * CELL;
const H = Math.ceil(KINDS.length / COLS) * CELL;
let out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
out += '<rect width="' + W + '" height="' + H + '" fill="#ececec"/>';
for (let c = 1; c < COLS; c++) out += '<line x1="' + c * CELL + '" y1="0" x2="' + c * CELL + '" y2="' + H + '" stroke="rgba(17,17,17,0.12)"/>';
for (let r = 1; r * CELL < H; r++) out += '<line x1="0" y1="' + r * CELL + '" x2="' + W + '" y2="' + r * CELL + '" stroke="rgba(17,17,17,0.12)"/>';

layer.querySelectorAll('.ik').forEach((host) => {
  flatten(host);
  const svg = host.querySelector('svg');
  const left = parseFloat(host.style.left) || 0;
  const top = parseFloat(host.style.top) || 0;
  const w = parseFloat(host.style.width) || 100;
  const h = parseFloat(host.style.height) || 100;
  const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(' ').map(Number);
  out += '<g transform="translate(' + left + ',' + top + ') scale(' +
    (w / (vb[2] || 1)).toFixed(4) + ',' + (h / (vb[3] || 1)).toFixed(4) + ')">' +
    svg.innerHTML + '</g>';
});
out += '</svg>';
process.stdout.write(out);
dom.window.close();
