/* ============================================================
   motion.js — the easing vocabulary the whole site animates on

   Linear tweens are what make motion read as robotic. Real
   movement anticipates, overshoots, and settles. This file gives
   the rest of the site three things:

     spring()   an analytic damped-harmonic solver. Give it a
                stiffness, damping and mass and it returns both a
                normalised easing function and the duration the
                spring actually needs to settle — so a CSS
                keyframe or a JS tween can use identical physics.

     tween()    a small rAF driver for anything CSS cannot express
                (following an arc, driving several properties from
                one clock).

     EASE       hand-tuned cubic-beziers for the cases where a
                spring is overkill.

   Exposed as window.__motion. No dependencies, nothing to load.
   ============================================================ */

(function () {
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Springs ----------
     Closed-form solution of m·x'' + c·x' + k·x = 0 for a unit
     step. Underdamped springs overshoot and ring; critically
     damped ones arrive fast and stop dead. */
  function spring(opts) {
    opts = opts || {};
    const stiffness = opts.stiffness || 170;
    const damping = opts.damping || 16;
    const mass = opts.mass || 1;
    const v0 = opts.velocity || 0;

    const w0 = Math.sqrt(stiffness / mass);              // undamped frequency
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));  // damping ratio

    let solve;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);        // damped frequency
      solve = function (t) {
        return 1 - Math.exp(-zeta * w0 * t) *
          (Math.cos(wd * t) + ((zeta * w0 + v0) / wd) * Math.sin(wd * t));
      };
    } else {
      solve = function (t) {
        return 1 - Math.exp(-w0 * t) * (1 + (w0 + v0) * t);
      };
    }

    /* Walk forward until it has settled and stopped moving. */
    let duration = 0;
    const step = 1 / 60;
    let last = 0;
    for (let t = 0; t < 12; t += step) {
      const x = solve(t);
      if (Math.abs(1 - x) < 0.0015 && Math.abs(x - last) < 0.0015) { duration = t; break; }
      last = x;
      duration = t;
    }

    const ms = Math.round(duration * 1000);
    return {
      duration: ms,
      /* normalised: ease(0) === 0, ease(1) === 1 */
      ease: function (p) {
        if (p <= 0) return 0;
        if (p >= 1) return 1;
        return solve(p * duration);
      },
      /* a linear() CSS easing string, for handing the same physics to CSS */
      css: function (steps) {
        const n = steps || 48;
        const out = [];
        for (let i = 0; i <= n; i++) out.push(solve((i / n) * duration).toFixed(4));
        return 'linear(' + out.join(',') + ')';
      },
    };
  }

  /* ---------- Curves ----------
     Named so intent is readable at the call site. */
  const EASE = {
    // decelerate hard — good for things arriving
    out: (p) => 1 - Math.pow(1 - p, 3),
    outQuint: (p) => 1 - Math.pow(1 - p, 5),
    // accelerate — good for things leaving
    in: (p) => p * p * p,
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    // a small overshoot without full spring ringing
    back: (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    // gravity: fast down, no bounce
    gravity: (p) => p * p,
  };

  /* ---------- Tween ----------
     Drives a callback from 0 to 1. Returns a handle so callers
     can cancel — important when a sequence is skipped. */
  function tween(opts) {
    const dur = REDUCED ? 0 : Math.max(1, opts.duration || 400);
    const ease = opts.ease || EASE.out;
    const delay = REDUCED ? 0 : (opts.delay || 0);
    let raf = 0;
    let start = 0;
    let cancelled = false;

    function frame(now) {
      if (cancelled) return;
      if (!start) start = now;
      const elapsed = now - start - delay;
      if (elapsed < 0) { raf = requestAnimationFrame(frame); return; }
      const p = Math.min(1, elapsed / dur);
      opts.onUpdate(ease(p), p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else if (opts.onComplete) opts.onComplete();
    }
    raf = requestAnimationFrame(frame);

    return {
      cancel: function () {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
      },
      finish: function () {
        cancelled = true;
        if (raf) cancelAnimationFrame(raf);
        opts.onUpdate(1, 1);
        if (opts.onComplete) opts.onComplete();
      },
    };
  }

  /* ---------- Sequence ----------
     Fire callbacks at times along one clock, so a multi-beat
     animation reads as a script rather than nested timeouts. */
  function sequence(beats) {
    const timers = [];
    let done = false;
    beats.forEach((b) => {
      timers.push(setTimeout(() => { if (!done) b.run(); }, REDUCED ? 0 : b.at));
    });
    return {
      cancel: function () { done = true; timers.forEach(clearTimeout); },
    };
  }

  window.__motion = {
    spring: spring,
    tween: tween,
    sequence: sequence,
    EASE: EASE,
    reduced: REDUCED,
  };
})();
