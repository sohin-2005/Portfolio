/* ============================================================
   hero.js — the name on the page

   The writing itself lives in js/wordmark.js, because the
   opening sequence needs it too. What is left here is the two
   things that are only true of the hero:

     Who writes. If the opening sequence is going to play, it
     writes the name and this file does not: the sequence then
     hands its finished wordmark over to this one, which is the
     same wordmark at a different size, so the two read as one
     object settling into place. Writing it here as well would
     be the name arriving twice. When the sequence is not
     playing — a return from About, a deep link, a second visit
     in the same session — nobody has written it yet, so this
     file does.

     The tilt. The name watches the pointer across the whole
     page, not just its own box. An object that only notices you
     once you are on top of it is a button, and this is not a
     button.
   ============================================================ */

(function () {
  const stage = document.getElementById('heroStage');
  const tilt = document.getElementById('heroTilt');
  const mark = document.getElementById('heroName');
  if (!stage || !tilt || !mark) return;

  const M = window.__motion;
  const W = window.__wordmark;
  const reduced = M
    ? M.reduced
    : !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const sub = document.querySelector('.hero-sub');

  function settle() {
    if (sub) sub.classList.add('is-in');
  }

  /* ---------- Waiting for the tab ----------
     requestAnimationFrame does not run in a background tab, so a
     page opened in one would start writing, stall on the first
     stroke, and be found later with half a name on it. Waiting
     for the tab to be looked at fixes that.

     It waits, though; it does not gate. Embedded views, some
     webviews and every screenshot service report themselves
     hidden and never change their mind, and a name that answers
     that by never drawing itself is worse than one that animates
     where nobody is watching. So the wait expires. */
  function whenVisible(fn) {
    if (!document.hidden) { fn(); return; }
    let fired = false;
    function go() {
      if (fired) return;
      fired = true;
      document.removeEventListener('visibilitychange', onVis);
      fn();
    }
    function onVis() { if (!document.hidden) go(); }
    document.addEventListener('visibilitychange', onVis);
    setTimeout(go, 4000);
  }

  /* ---------- Waiting for the opening sequence ----------
     intro.js puts intro-done on <html> both when the sequence
     finishes and when it decides not to play at all, so this one
     signal covers a first visit, a return from About, and a deep
     link equally. */
  function whenHandedOver(fn) {
    const de = document.documentElement;
    let fired = false;
    function go() {
      if (fired) return;
      fired = true;
      fn();
    }
    if (de.classList.contains('intro-done')) { go(); return; }

    const mo = new MutationObserver(function () {
      if (de.classList.contains('intro-done')) { mo.disconnect(); go(); }
    });
    mo.observe(de, { attributes: true, attributeFilter: ['class'] });
    /* a sequence that never finished must not cost the page its name */
    setTimeout(function () { mo.disconnect(); go(); }, 12000);
  }

  /* ============================================================
     Write it, or let the sequence write it

     window.__introWrites is set by intro.js, which runs first
     precisely so this decision can be made before anything is
     hidden. If it is missing — intro.js failed to load, or this
     is a page without an opening sequence — the answer is no,
     and the hero writes.
     ============================================================ */
  const introWrites = !!window.__introWrites;

  if (reduced || !M || !W || introWrites) {
    /* nothing to arm: the name is already drawn, and stays drawn */
    if (introWrites) whenHandedOver(settle);
    else settle();
  } else {
    const plan = W.arm(mark);
    if (!plan) {
      settle();
    } else {
      if (sub) sub.classList.add('is-held');
      whenHandedOver(function () {
        whenVisible(function () {
          /* one frame of grace so the hand-off transform has
             landed before the first stroke goes down */
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              /* Last resort. Nothing below is expected to fail, but
                 the page carries a name, and a name half-drawn
                 because a tween was interrupted is not a state to
                 leave anyone in.

                 Rescheduled rather than fired while the page is
                 hidden: a backgrounded tab has a legitimately
                 paused tween, and snapping the word finished
                 behind someone's back would spend the animation
                 they came for. */
              let guard = 0;

              const run = W.write(mark, plan, {
                onComplete: function () { clearTimeout(guard); setTimeout(settle, 320); },
              });

              (function watch() {
                clearTimeout(guard);
                guard = setTimeout(function () {
                  if (document.hidden) { watch(); return; }
                  run.finish();
                  settle();
                }, run.duration + 8000);
              })();
            });
          });
        });
      });
    }
  }

  /* ============================================================
     The tilt

     Written straight to a custom property inside a rAF that
     stops itself once it has caught up. No state, no listener
     doing work on every event.
     ============================================================ */
  const fine = !window.matchMedia || matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduced || !fine) return;

  const MAX_Y = 7;    // degrees, from horizontal travel
  const MAX_X = 5;    // degrees, from vertical travel
  let tgX = 0, tgY = 0, curX = 0, curY = 0, raf = 0;

  function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  function frame() {
    curX += (tgX - curX) * 0.075;
    curY += (tgY - curY) * 0.075;
    tilt.style.setProperty('--rx', curX.toFixed(3) + 'deg');
    tilt.style.setProperty('--ry', curY.toFixed(3) + 'deg');
    if (Math.abs(tgX - curX) < 0.005 && Math.abs(tgY - curY) < 0.005) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
  }

  function run() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('pointermove', function (e) {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    tgY = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)) * MAX_Y;
    tgX = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)) * -MAX_X;
    run();
  }, { passive: true });

  /* pointer off the document, or the tab going away: the name
     returns to square rather than holding a pose */
  function level() { tgX = 0; tgY = 0; run(); }
  document.addEventListener('pointerleave', level);
  window.addEventListener('blur', level);
})();
