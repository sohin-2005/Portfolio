/* ============================================================
   wordmark.js — the name, and how it gets written

   The wordmark is real Sogea, and a font cannot be written:
   live text is filled outlines with no notion of a pen, so
   there is nothing to draw along. Each letter in the markup is
   therefore its own outline used as a clip, with a fat monoline
   brush swept along the letter's medial axis underneath it.
   Unrolling the brush paints the true letterform, terminals and
   overshoots included.

   Two places need that: the opening sequence writes the name,
   and the hero writes it for anyone the sequence does not play
   for. Rather than keep two copies of the geometry and two
   copies of the timing, the markup lives once in index.html
   (where it also serves visitors with no JavaScript) and this
   file lends it out.

     clone()   a deep copy with its clip ids renamed, because
               two wordmarks on one page with the same clipPath
               ids means the second one silently borrows the
               first one's clips.

     write()   the pen. Each stroke is measured with
               getTotalLength, hidden by pushing its own length
               into stroke-dashoffset, then unrolled. One tween
               drives all eight off a single clock, and each
               stroke is given time in proportion to how long it
               actually is — which is what makes the pen read as
               moving at a constant speed rather than spending
               the same beat on the "i" as on the "o". Between
               strokes the clock runs on with nothing to draw:
               that gap is the pen lifting. The nib rides the
               tip through getPointAtLength, so it sits on the
               ink rather than near it.

   Nothing here hides anything it cannot guarantee to bring
   back. arm() is only ever called when a write is definitely
   going to follow, so the name is complete with JavaScript off
   and under reduced motion.
   ============================================================ */

(function () {
  const M = window.__motion;

  /* ---------- Defaults ----------
     ms per user unit of path. Units are the font's own, 1000 to
     the em, and the eight strokes come to roughly 6500 of them,
     so SPEED is the dial that sets how fast the hand moves —
     6500 x SPEED, plus a lift between each pair of strokes, is
     the whole duration. Erring slow on purpose: this is the one
     piece of the page that rewards being watched. */
  const SPEED = 0.38;
  const LIFT = 45;      // the pen off the paper, between strokes
  const MIN = 110;      // the n's stem is 240 units; do not snap it

  /* One ease, across the whole word.

     This used to sit on each stroke instead, and that is what made
     the writing feel stuttery: an ease-in-out per stroke means the
     pen decelerates to a dead stop at the end of every one of the
     eight and accelerates from nothing into the next. Eight
     stop-starts in two and a half seconds reads as hesitation, not
     as handwriting.

     Moved up to the whole word, it does what a hand does — gets
     going once, holds a steady rate through the middle, and
     settles once at the end. Strokes now run at whatever rate that
     clock is passing through them, which is to say linearly, and
     the only pauses left are the real ones where the pen is off
     the paper between strokes. */
  function easeWord(p) { return 0.5 - Math.cos(Math.PI * p) / 2; }

  function strokesOf(svg) {
    return [].slice.call(svg.querySelectorAll('.hero-ink .hs'));
  }

  /* ---------- clone ----------
     Clip ids are document-global. A second wordmark carrying the
     same ids does not error, it just quietly clips itself with
     the first one's paths, which puts every letter through the
     wrong stencil. */
  function clone(src, prefix) {
    const out = src.cloneNode(true);
    out.removeAttribute('id');
    [].slice.call(out.querySelectorAll('clipPath[id]')).forEach(function (cp) {
      const from = cp.getAttribute('id');
      const to = prefix + from;
      cp.setAttribute('id', to);
      [].slice.call(out.querySelectorAll('[clip-path="url(#' + from + ')"]'))
        .forEach(function (el) { el.setAttribute('clip-path', 'url(#' + to + ')'); });
    });
    /* a copy taken after the original was armed would inherit its
       half-unrolled dashes */
    strokesOf(out).forEach(function (el) {
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
    });
    out.classList.remove('is-armed', 'is-writing', 'is-dotted');
    return out;
  }

  /* ---------- arm ----------
     Take the word apart. Returns the stroke plan, or null if the
     paths cannot be measured, in which case the caller must
     leave the name exactly as it was drawn. */
  function arm(svg, opts) {
    opts = opts || {};
    const paths = strokesOf(svg);
    if (!paths.length) return null;

    const speed = opts.speed || SPEED;
    const lift = opts.lift == null ? LIFT : opts.lift;
    const min = opts.min == null ? MIN : opts.min;

    let segs;
    try {
      segs = paths.map(function (el) {
        const len = el.getTotalLength();
        el.style.strokeDasharray = len + ' ' + len;
        el.style.strokeDashoffset = len;
        return { el: el, len: len, at: 0, dur: 0, done: false };
      });
    } catch (e) {
      return null;               // no path measurement here
    }

    let t = 0;
    segs.forEach(function (s, i) {
      s.at = t;
      s.dur = Math.max(min, s.len * speed);
      t += s.dur + (i < segs.length - 1 ? lift : 0);
    });

    svg.classList.add('is-armed');
    return { segs: segs, total: t };
  }

  /* ---------- write ----------
     Unrolls a plan from arm(). `dot` says whether the tittle
     drops in at the end: the hero dots its own i, the opening
     sequence drops the dot out of the sky instead and wants it
     left alone. */
  function write(svg, plan, opts) {
    opts = opts || {};
    const segs = plan.segs;
    const total = plan.total;
    const nib = svg.querySelector('.hero-nib');

    function paint(p) {
      const now = p * total;
      let inking = false;

      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const local = (now - s.at) / s.dur;

        if (local <= 0) continue;                 // not started
        if (local >= 1) {                         // finished
          if (!s.done) { s.el.style.strokeDashoffset = '0'; s.done = true; }
          continue;
        }

        const e = local;              // the ease lives on the word, not here
        s.el.style.strokeDashoffset = (s.len * (1 - e)).toFixed(2);
        if (nib) {
          const pt = s.el.getPointAtLength(s.len * e);
          nib.setAttribute('transform',
            'translate(' + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ')');
        }
        inking = true;
      }
      svg.classList.toggle('is-writing', inking);
    }

    function land() {
      segs.forEach(function (s) { s.el.style.strokeDashoffset = '0'; });
      svg.classList.remove('is-writing');
      if (opts.dot !== false) {
        /* the pen lifts, then comes back for the tittle */
        setTimeout(function () { svg.classList.add('is-dotted'); }, 130);
      }
      if (opts.onComplete) opts.onComplete();
    }

    const run = M.tween({
      duration: total,
      ease: easeWord,
      /* motion.js calls onUpdate(eased, raw). The eased one is the
         whole point here; an earlier version took the raw second
         argument and quietly threw the easing away. */
      onUpdate: function (eased) { paint(eased); },
      onComplete: land,
    });

    return {
      duration: total,
      cancel: function () { run.cancel(); },
      /* snap to written, wherever it had got to */
      finish: function () { run.cancel(); land(); },
    };
  }

  /* ---------- reveal ----------
     Put an armed wordmark back together without animating it. */
  function reveal(svg) {
    strokesOf(svg).forEach(function (el) { el.style.strokeDashoffset = '0'; });
    svg.classList.remove('is-writing');
    svg.classList.add('is-dotted');
  }

  window.__wordmark = {
    clone: clone,
    arm: arm,
    write: write,
    reveal: reveal,
    SPEED: SPEED,
  };
})();
