/* ============================================================
   ambient.js — living scenery modes

   Two moods layer over the colour themes, plus off:

     eco     fine motes drift upward on a slow current
     night   a parallax starfield with fireflies wandering it

   Both are theme-aware. Rather than hard-coding light or dark
   particles, each mode declares a hue and the engine reads the
   current --bg-rgb luminance to decide whether to render that
   hue dark-on-light or light-on-dark, so one palette swap
   re-tints the scenery on any theme.

   Night additionally pins the palette to space black — a
   starfield is pointless on paper — and restores whatever was
   in use when you leave it.

   This file owns the viewport-fixed layer: the colour wash and
   the particle canvas. Everything anchored to the document —
   vines, tendrils, constellations — is drawn by js/flora.js,
   which follows the mode broadcast from here.

   Exposes window.__ambient = { MODES, current(), apply(key),
   retint(), on(fn) } for the dock and the flora layer.
   ============================================================ */

(function () {
  if (!document.body) return;

  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const STORE = 'sohin-ambient';

  /* ---------- Mode table ----------
     hue/sat describe the mood; lLight is the lightness used when
     the page background is light, lDark when it is dark. */
  const MODES = {
    off:    { label: 'Off' },
    eco:    { label: 'Eco',    hue: 152, sat: 34, lLight: 28, lDark: 64 },
    // Night forces the space-black palette — a starfield needs real dark
    night:  { label: 'Night',  hue: 224, sat: 30, lLight: 34, lDark: 78, theme: 'space' },
  };
  const ORDER = ['off', 'eco', 'night'];

  /* the mode was briefly called "ink"; anyone carrying that in
     localStorage lands on Eco rather than on nothing */
  const ALIAS = { ink: 'eco' };

  /* ---------- Stage ---------- */
  const stage = document.createElement('div');
  stage.className = 'amb-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML =
    '<div class="amb-wash"></div>' +
    '<canvas id="ambient"></canvas>';
  document.body.appendChild(stage);

  const wash = stage.querySelector('.amb-wash');
  const canvas = stage.querySelector('#ambient');
  const ctx = canvas.getContext('2d');

  /* ---------- Theme reading ---------- */
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function bgIsLight() {
    const p = cssVar('--bg-rgb', '236, 236, 236').split(',').map(Number);
    // Rec. 709 luma, good enough to pick a contrast direction
    return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) > 140;
  }

  /* hsl string for the active mode, at a given lightness offset/alpha */
  let PALETTE = null;
  function buildPalette(key) {
    const m = MODES[key];
    if (!m || !m.hue) return null;
    const light = bgIsLight();
    const L = light ? m.lLight : m.lDark;
    const hsl = (dl, a) =>
      'hsla(' + m.hue + ',' + m.sat + '%,' + Math.max(4, Math.min(96, L + (dl || 0))) + '%,' + (a === undefined ? 1 : a) + ')';
    return { light: light, hsl: hsl, base: hsl(0, 1) };
  }

  /* ---------- Wash gradients ---------- */
  function washFor(key) {
    const p = PALETTE;
    if (!p) return 'none';
    const soft = p.light ? 0.1 : 0.16;
    const faint = p.light ? 0.05 : 0.09;
    switch (key) {
      case 'eco':
        return 'radial-gradient(120% 90% at 0% 0%, ' + p.hsl(14, soft) + ' 0%, transparent 46%),' +
               'radial-gradient(120% 90% at 100% 100%, ' + p.hsl(14, soft) + ' 0%, transparent 46%),' +
               'radial-gradient(140% 100% at 50% 50%, transparent 55%, ' + p.hsl(-6, faint) + ' 100%)';
      case 'night':
        return 'radial-gradient(120% 100% at 50% 40%, transparent 30%, ' + p.hsl(-12, p.light ? 0.14 : 0.3) + ' 100%)';
      default:
        return 'none';
    }
  }

  /* ============================================================
     Canvas particle systems
     ============================================================ */
  let W = 0, H = 0, DPR = 1;
  let system = null;                 // { init, frame }
  const pointer = { x: -1, y: -1, tx: -1, ty: -1 };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function count(divisor, cap) { return Math.max(8, Math.min(Math.round((W * H) / divisor), cap)); }

  /* --- eco: no particles at all ---
     This mode used to drift green motes up the page and open the
     odd ripple. Both have gone: over a long scrolling page they
     read as something moving about behind the content rather
     than as atmosphere. Eco is now the colour wash and the
     growth in js/flora.js, and the canvas stays idle — which is
     also why the loop never starts for it, so it costs nothing.

     Night still has its starfield; that one is the point of the
     mode rather than a decoration on top of it. */

  /* --- night: parallax starfield, wandering fireflies, rare comet --- */
  function nightSystem() {
    let stars = [], flies = [], comet = null, nextComet = 4000;
    return {
      init: function () {
        stars = Array.from({ length: count(6200, 190) }, () => ({
          x: rand(0, W), y: rand(0, H),
          r: rand(0.4, 1.7),
          d: rand(0.2, 1),
          ph: rand(0, Math.PI * 2),
          tw: rand(0.0009, 0.0045),
          a: rand(0.28, 0.95),
        }));
        flies = Array.from({ length: count(130000, 10) }, () => ({
          x: rand(0, W), y: rand(0, H),
          ph1: rand(0, 6.28), ph2: rand(0, 6.28),
          s1: rand(0.00016, 0.00042), s2: rand(0.00021, 0.00055),
          ax: rand(60, 200), ay: rand(40, 150),
          ox: rand(0, W), oy: rand(0, H),
          pulse: rand(0.0011, 0.0028),
          r: rand(1.3, 2.6),
        }));
        comet = null;
        nextComet = rand(3000, 9000);
      },
      frame: function (t, dt) {
        const P = PALETTE;
        const px = (pointer.x < 0 ? W / 2 : pointer.x) / W - 0.5;
        const py = (pointer.y < 0 ? H / 2 : pointer.y) / H - 0.5;

        for (const s of stars) {
          const tw = 0.45 + 0.55 * Math.sin(t * s.tw + s.ph);
          const x = s.x - px * 26 * s.d;
          const y = s.y - py * 26 * s.d;
          ctx.fillStyle = P.hsl(20, s.a * tw);
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const f of flies) {
          f.x = f.ox + Math.sin(t * f.s1 + f.ph1) * f.ax + Math.sin(t * f.s2 * 1.7 + f.ph2) * f.ax * 0.35;
          f.y = f.oy + Math.cos(t * f.s2 + f.ph2) * f.ay + Math.cos(t * f.s1 * 2.1 + f.ph1) * f.ay * 0.3;
          const pulse = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * f.pulse + f.ph1), 2);
          const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 9);
          glow.addColorStop(0, 'hsla(48,90%,' + (P.light ? 46 : 68) + '%,' + (pulse * 0.45).toFixed(3) + ')');
          glow.addColorStop(1, 'hsla(48,90%,60%,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'hsla(50,92%,' + (P.light ? 38 : 76) + '%,' + (0.35 + pulse * 0.6).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }

        nextComet -= dt * 16;
        if (!comet && nextComet <= 0) {
          comet = { x: rand(0, W * 0.6), y: rand(0, H * 0.35), vx: rand(3.4, 5.2), vy: rand(1.3, 2.4), life: 1 };
          nextComet = rand(7000, 18000);
        }
        if (comet) {
          comet.x += comet.vx * dt; comet.y += comet.vy * dt;
          comet.life -= 0.0035 * dt;
          if (comet.life <= 0 || comet.x > W + 60 || comet.y > H + 60) {
            comet = null;
          } else {
            const tail = 90;
            const g = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * tail / 4, comet.y - comet.vy * tail / 4);
            g.addColorStop(0, P.hsl(34, comet.life * 0.85));
            g.addColorStop(1, P.hsl(34, 0));
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(comet.x, comet.y);
            ctx.lineTo(comet.x - comet.vx * tail / 4, comet.y - comet.vy * tail / 4);
            ctx.stroke();
          }
        }
      },
    };
  }

  /* Eco has no particle system — it is the wash and the growth,
     nothing on the canvas. A missing entry here is the signal
     for that, and apply() below treats it exactly like off as
     far as the canvas and the loop are concerned. */
  const SYSTEMS = { night: nightSystem };

  /* ---------- Canvas plumbing ---------- */
  function resize() {
    // 1.5 is indistinguishable from 2 for soft particles and
    // costs a bit over half the fill rate
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (system) system.init();
  }

  let raf = 0, last = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(3, (now - last) / 16.667) || 1;   // frames elapsed, clamped
    last = now;
    ctx.clearRect(0, 0, W, H);
    if (system && PALETTE) system.frame(now, dt);
  }
  function startLoop() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, W, H);
  }

  /* ---------- Apply ---------- */
  let current = 'off';

  /* Anything that needs to know the mode changed — the dock's
     buttons, a command palette — subscribes here, so no UI can
     fall out of step with the engine no matter who drove it. */
  const listeners = [];

  function paint() {
    PALETTE = buildPalette(current);
    if (!PALETTE) {
      wash.style.background = 'none';
      // hand the ink colours back to the page ink, so anything
      // still on screen when scenery is switched off stays legible
      document.documentElement.style.removeProperty('--ink-line');
      document.documentElement.style.removeProperty('--ink-fill');
      return;
    }
    wash.style.background = washFor(current);
    const rs = document.documentElement.style;
    rs.setProperty('--ink-line', PALETTE.hsl(-4, 0.72));
    rs.setProperty('--ink-fill', PALETTE.hsl(6, 0.78));
  }

  let themeBeforeNight = null;

  /* Night is only worth looking at on a dark ground, so it takes
     the palette over while it runs and hands it back on exit. */
  function syncTheme(key) {
    const T = window.__theme;
    if (!T) return;
    const want = MODES[key] && MODES[key].theme;
    if (want) {
      if (T.current() !== want) {
        themeBeforeNight = T.current();
        T.apply(want);
      }
    } else if (themeBeforeNight) {
      const back = themeBeforeNight;
      themeBeforeNight = null;
      if (T.current() === 'space') T.apply(back);
    }
  }

  function apply(key, persist) {
    if (!MODES[key]) return false;
    current = key;
    syncTheme(key);

    ORDER.forEach((k) => stage.classList.toggle('m-' + k, k === current));
    paint();

    if (key === 'off' || !SYSTEMS[key]) {
      // off, or a mode that paints nothing on the canvas (eco)
      stage.classList.remove('live');
      system = null;
      stopLoop();
      if (W) ctx.clearRect(0, 0, W, H);
    } else {
      system = SYSTEMS[key]();
      if (!W) resize(); else system.init();
      stage.classList.add('live');
      if (REDUCED) {
        stopLoop();
        ctx.clearRect(0, 0, W, H);
        system.frame(performance.now(), 1);   // one static frame
      } else {
        startLoop();
      }
    }

    if (persist) { try { localStorage.setItem(STORE, key); } catch (e) { /* private mode */ } }
    document.documentElement.setAttribute('data-ambient', key);
    listeners.forEach((fn) => { try { fn(current); } catch (e) { /* a bad listener must not break the swap */ } });
    return true;
  }

  window.addEventListener('resize', () => {
    resize();
    if (REDUCED && system) { ctx.clearRect(0, 0, W, H); system.frame(performance.now(), 1); }
  });
  window.addEventListener('mousemove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  window.addEventListener('mouseout', () => { pointer.x = -1; pointer.y = -1; });

  // pause when the tab is hidden — no point burning frames nobody sees
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else if (system && !REDUCED) startLoop();
  });

  resize();

  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) { /* private mode */ }
  if (saved && ALIAS[saved]) saved = ALIAS[saved];
  // Eco is the house style, so it is what a first-time visitor gets
  apply(saved && MODES[saved] ? saved : 'eco', false);

  window.__ambient = {
    MODES: MODES,
    ORDER: ORDER,
    current: function () { return current; },
    apply: function (k) { return apply(k, true); },
    retint: paint,                  // called by the dock after a theme swap
    on: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
  };
})();
