/* ============================================================
   svg-geom.mjs — enough SVG path geometry for the checks

   jsdom has no layout engine, so getTotalLength and
   getPointAtLength do not exist. Stubbing them with constants
   makes every check pass for the wrong reason: nodes and
   ripples get placed at fictional coordinates, and a contact
   sheet drawn from them tells you nothing.

   This flattens a path into a polyline and answers both
   questions from it. It understands the commands the site
   actually emits — M, L, C and A — and nothing else, which is
   the honest scope for a test helper.
   ============================================================ */

function arcToCubics(x0, y0, rx, ry, rot, large, sweep, x, y) {
  // endpoint → centre parameterisation (SVG spec, F.6.5)
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx2 = (x0 - x) / 2, dy2 = (y0 - y) / 2;
  const x1 = cos * dx2 + sin * dy2;
  const y1 = -sin * dx2 + cos * dy2;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const check = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (check > 1) { const s = Math.sqrt(check); rx *= s; ry *= s; }

  const sq = Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) /
    (rx * rx * y1 * y1 + ry * ry * x1 * x1));
  let coef = Math.sqrt(sq);
  if (large === sweep) coef = -coef;
  const cx1 = (coef * rx * y1) / ry;
  const cy1 = (-coef * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (x0 + x) / 2;
  const cy = sin * cx1 + cos * cy1 + (y0 + y) / 2;

  const ang = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1;
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const th0 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dth = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dth > 0) dth -= Math.PI * 2;
  if (sweep && dth < 0) dth += Math.PI * 2;

  const pts = [];
  const steps = Math.max(6, Math.ceil(Math.abs(dth) / 0.15));
  for (let i = 1; i <= steps; i++) {
    const th = th0 + (dth * i) / steps;
    const px = cos * rx * Math.cos(th) - sin * ry * Math.sin(th) + cx;
    const py = sin * rx * Math.cos(th) + cos * ry * Math.sin(th) + cy;
    pts.push({ x: px, y: py });
  }
  return pts;
}

export function flatten(d) {
  const tokens = String(d).match(/[MLCAmlca]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const pts = [];
  let i = 0, cx = 0, cy = 0, cmd = 'M';
  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/[MLCAmlca]/.test(tokens[i])) cmd = tokens[i++];
    if (i >= tokens.length) break;
    if (cmd === 'M' || cmd === 'm') {
      const x = num(), y = num();
      cx = cmd === 'm' ? cx + x : x;
      cy = cmd === 'm' ? cy + y : y;
      pts.push({ x: cx, y: cy });
      cmd = cmd === 'm' ? 'l' : 'L';
    } else if (cmd === 'L' || cmd === 'l') {
      const x = num(), y = num();
      cx = cmd === 'l' ? cx + x : x;
      cy = cmd === 'l' ? cy + y : y;
      pts.push({ x: cx, y: cy });
    } else if (cmd === 'C' || cmd === 'c') {
      const rel = cmd === 'c';
      const x1 = num() + (rel ? cx : 0), y1 = num() + (rel ? cy : 0);
      const x2 = num() + (rel ? cx : 0), y2 = num() + (rel ? cy : 0);
      const x3 = num() + (rel ? cx : 0), y3 = num() + (rel ? cy : 0);
      const N = 24;
      for (let s = 1; s <= N; s++) {
        const t = s / N, u = 1 - t;
        pts.push({
          x: u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          y: u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        });
      }
      cx = x3; cy = y3;
    } else if (cmd === 'A' || cmd === 'a') {
      const rel = cmd === 'a';
      const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
      const x = num() + (rel ? cx : 0), y = num() + (rel ? cy : 0);
      arcToCubics(cx, cy, rx, ry, rot, large, sweep, x, y).forEach((p) => pts.push(p));
      cx = x; cy = y;
    } else {
      i++;
    }
  }
  return pts;
}

/* Install real implementations on a jsdom window. */
export function install(win) {
  const cache = new WeakMap();

  function table(el) {
    const d = el.getAttribute('d') || '';
    let entry = cache.get(el);
    if (entry && entry.d === d) return entry;
    const pts = flatten(d);
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    entry = { d, pts, acc, total: acc[acc.length - 1] || 0 };
    cache.set(el, entry);
    return entry;
  }

  win.SVGElement.prototype.getTotalLength = function () {
    return this.tagName === 'path' ? table(this).total : 0;
  };
  win.SVGElement.prototype.getPointAtLength = function (len) {
    const t = table(this);
    if (!t.pts.length) return { x: 0, y: 0 };
    const target = Math.max(0, Math.min(t.total, len));
    let lo = 0, hi = t.acc.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t.acc[mid] < target) lo = mid + 1; else hi = mid;
    }
    const i = Math.max(1, lo);
    const seg = t.acc[i] - t.acc[i - 1] || 1;
    const f = (target - t.acc[i - 1]) / seg;
    const a = t.pts[i - 1], b = t.pts[i];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
}
