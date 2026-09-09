/* ============================================================
   intro.js — the opening sequence

   The page is held back: dimmed, blurred and unreadable, with
   nothing to look at but the name. The name is then written.

   It is the real Sogea wordmark from the hero, cloned and
   scaled up, and it is written stroke by stroke by an invisible
   pen — see js/wordmark.js for how, and for why a font has to
   be taken apart before it can be written at all. It arrives
   with its tittle missing. A dot then falls from above the
   screen, drops cleanly onto the "i", squashes and springs.
   Then the whole thing lifts, the blur clears, and the wordmark
   scales onto the real name in the hero.

   The name is written here and only here. The hero holds the
   same wordmark and can write it itself, but does not when this
   sequence is going to run: it would be the same name arriving
   twice in two different sizes. window.__introWrites is how the
   two agree, which is why this file is loaded before hero.js
   rather than after it.

   Because both wordmarks are now the same drawing, the hand-off
   at the end is a pure scale and translate from one to the
   other. There is no dissolve between two different letterforms
   any more, which is what it used to be: the sequence simply
   becomes the page.

   Locating the dot:
   Nothing is measured or guessed. The cloned wordmark carries
   its own tittle as a real element at the exact centre and
   radius the font puts it, so the dot falls to a point read
   straight off that circle. The wordmark is never scaled by CSS
   while the sequence runs, so the screen-space target the dot
   falls to cannot drift.

   Plays once per session, on the home page only. Coming back
   from About, Contact or the Playground goes straight to the
   page. Skippable at any point with a click, a key, or a scroll.
   ============================================================ */

(function () {
  const host = document.getElementById('intro');
  const source = document.getElementById('heroName');
  if (!host || !window.__motion || !window.__wordmark || !source) return;

  const M = window.__motion;
  const W = window.__wordmark;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- When to play ----------
     Once per session. A refresh inside the same session is still
     a refresh, so it replays then; arriving from another page of
     the site does not. */
  const NAV_FLAG = 'sohin-internal-nav';
  const SEEN_FLAG = 'sohin-intro-seen';

  function navType() {
    try {
      const e = performance.getEntriesByType('navigation')[0];
      if (e && e.type) return e.type;
      if (performance.navigation) {
        return performance.navigation.type === 1 ? 'reload' : 'navigate';
      }
    } catch (e) { /* not available */ }
    return 'navigate';
  }

  function shouldPlay() {
    if (M.reduced) return false;

    let internal = false;
    let seen = false;
    try {
      internal = sessionStorage.getItem(NAV_FLAG) === '1';
      sessionStorage.removeItem(NAV_FLAG);
      seen = sessionStorage.getItem(SEEN_FLAG) === '1';
    } catch (e) { /* private mode */ }

    const type = navType();
    if (type === 'back_forward') return false;
    if (internal) return false;
    // a refresh is a deliberate request to see it again
    if (type === 'reload') return true;
    if (seen) return false;

    if (document.referrer) {
      try {
        if (new URL(document.referrer).origin === location.origin) return false;
      } catch (e) { /* malformed referrer — treat as external */ }
    }
    // a deep link is a request for a section, not for the overture
    if (location.hash && location.hash.length > 1) return false;
    return true;
  }

  function markSeen() {
    try { sessionStorage.setItem(SEEN_FLAG, '1'); } catch (e) { /* private mode */ }
  }

  if (!shouldPlay()) {
    host.remove();
    document.documentElement.classList.add('intro-done');
    return;                       // __introWrites stays false: the hero writes
  }

  markSeen();
  document.documentElement.classList.add('intro-on');

  /* ---------- Start at the top ----------
     A reload is one of the cases this sequence plays for, and a
     reload is also the case where the browser restores wherever
     you had scrolled to. The two together meant the overture
     played over a page that was already parked at Projects, and
     you were handed a mid-page scroll position at the end of it.

     It broke the hand-off as well as the impression: the last
     beat measures the hero's box on screen and flies the wordmark
     to it, so with the page scrolled down the hero was never
     there to fly to.

     Restoration is turned off rather than fought, and turned back
     on when the sequence ends, so ordinary back-and-forward
     navigation still remembers where you were. Deep links never
     reach here — a URL with a hash is a request for a section,
     and shouldPlay() has already declined. */
  let priorRestore = null;
  try {
    if ('scrollRestoration' in history) {
      priorRestore = history.scrollRestoration;
      history.scrollRestoration = 'manual';
    }
  } catch (e) { /* not available */ }

  function toTop() { window.scrollTo(0, 0); }
  toTop();
  /* again on load: the browser may restore after this script runs */
  window.addEventListener('load', toTop);

  /* ---------- The wordmark ----------
     A copy of the hero's, with its clip ids renamed so the two
     do not share stencils. Taken now, before hero.js has had a
     chance to arm the original, so it is cloned whole. */
  const svg = W.clone(source, 'in-');
  svg.setAttribute('class', 'intro-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.removeAttribute('role');
  svg.removeAttribute('aria-label');

  const layer = document.createElementNS(NS, 'g');
  layer.setAttribute('class', 'intro-art');
  svg.appendChild(layer);

  const stageEl = host.querySelector('.intro-mark');
  stageEl.appendChild(svg);

  /* the hero must not write a name this sequence is about to
     write; hero.js reads this before it arms anything */
  window.__introWrites = true;

  const bead = host.querySelector('.intro-bead');
  const canvas = host.querySelector('.intro-trail');
  const skipBtn = host.querySelector('.intro-skip');

  const tweens = [];
  const timers = [];
  let seq = null;
  let pen = null;
  let finished = false;
  let trailRaf = 0;

  function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

  /* ============================================================
     The trail

     Drawn on a canvas rather than as an SVG path: fading a
     stroke by age is one composite per frame here, where in SVG
     it would mean a separate element per segment.
     ============================================================ */
  const ctx = canvas.getContext('2d');
  let DPR = 1, VW = 0, VH = 0;

  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth;
    VH = window.innerHeight;
    canvas.width = Math.max(1, Math.round(VW * DPR));
    canvas.height = Math.max(1, Math.round(VH * DPR));
    if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  function inkColour() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ink-line').trim();
    if (v) return v;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink-rgb').trim();
    return 'rgba(' + (ink || '17,17,17') + ', 0.7)';
  }

  const pos = { x: VW * 0.5, y: -80 };
  let prev = null;
  let painting = false;

  function setBead(x, y, squash) {
    pos.x = x; pos.y = y;
    bead.style.transform =
      'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' +
      (squash ? ' scale(' + squash[0].toFixed(3) + ',' + squash[1].toFixed(3) + ')' : '');
  }

  function trailFrame() {
    trailRaf = requestAnimationFrame(trailFrame);
    if (!ctx) return;

    // age the whole canvas rather than tracking segment lifetimes
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.075)';
    ctx.fillRect(0, 0, VW, VH);
    ctx.globalCompositeOperation = 'source-over';

    if (!painting) { prev = null; return; }
    if (prev) {
      const d = Math.hypot(pos.x - prev.x, pos.y - prev.y);
      // the faster it falls the thinner the line — ink runs out
      const w = Math.max(0.8, 4.2 - Math.min(3.2, d * 0.16));
      ctx.strokeStyle = inkColour();
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    prev = { x: pos.x, y: pos.y };
  }
  trailRaf = requestAnimationFrame(trailFrame);

  window.addEventListener('resize', () => { if (!finished) sizeCanvas(); });

  /* ============================================================
     The script
     ============================================================ */
  function ready() {
    if (document.fonts && document.fonts.ready) return document.fonts.ready;
    return Promise.resolve();
  }

  function run() {
    if (finished) return;

    /* ---------- The tittle ----------
       The wordmark carries its own, as a real circle at exactly
       the centre and radius the font puts it. The old sequence
       had to mask the font's own tittle out of a line of live
       text and guess a replacement from character extents;
       there is nothing to mask and nothing to guess here. This
       IS the dot, simply held back until the falling one
       arrives on top of it. */
    const dot = svg.querySelector('.hero-dot');
    if (!dot) { finish(); return; }

    const dotX = parseFloat(dot.getAttribute('cx'));
    const dotY = parseFloat(dot.getAttribute('cy'));
    const dotR = parseFloat(dot.getAttribute('r'));
    if (!isFinite(dotX) || !isFinite(dotY) || !isFinite(dotR)) { finish(); return; }
    dot.setAttribute('class', 'hero-dot intro-dot');

    /* the ring it pings out of the impact */
    const ping = document.createElementNS(NS, 'circle');
    ping.setAttribute('class', 'intro-ping');
    ping.setAttribute('cx', dotX);
    ping.setAttribute('cy', dotY);
    ping.setAttribute('r', dotR * 1.4);
    layer.appendChild(ping);

    /* ---------- Where that dot sits on screen ----------
       The wordmark is never transformed by CSS while the
       sequence runs, so this mapping stays true from the moment
       it is taken to the moment the dot arrives. */
    function targetPoint() {
      const m = svg.getScreenCTM();
      if (!m) return { x: VW / 2, y: VH / 2, r: 8 };
      const p = svg.createSVGPoint();
      p.x = dotX; p.y = dotY;
      const s = p.matrixTransform(m);
      return { x: s.x, y: s.y, r: dotR * Math.abs(m.a) };
    }

    /* ---------- Beat 1: the name is written ----------
       Faster than the hero writes it. The hero's pace is for
       someone already reading the page; here the whole screen is
       being held for it, and a held screen runs out of patience
       sooner than a filled one.

       The fall is hung off the end of the writing rather than
       off the clock, and starts a little before the last stroke
       lands, so the dot is already in the air as the pen leaves
       the paper and the two beats read as one movement. */
    function name() {
      host.classList.add('letters');
      /* Slower than the hero writes it, not faster.

         This ran at 0.2 on the theory that a held screen runs out
         of patience sooner than a filled one. That is true of a
         screen with nothing on it, and false of one with the only
         thing you came for being drawn on it: at that rate the
         name was finished before you had worked out that it was
         being written by hand. The whole point of taking a font
         apart is lost if nobody gets to watch it go down. */
      const plan = W.arm(svg, { speed: 0.34, lift: 65, min: 150 });
      if (!plan) { after(260, fall); return; }
      pen = W.write(svg, plan, { dot: false });
      after(Math.max(200, plan.total - 280), fall);
    }

    /* ---------- Beat 2: the fall ----------
       Straight down out of the sky onto the tittle. It starts
       above the viewport, accelerates under gravity and stretches
       as it goes, which is what sells the weight of it. */
    function fall() {
      if (finished) return;
      const t = targetPoint();

      // size the bead so the hand-off to the SVG dot is invisible
      bead.style.width = (t.r * 2).toFixed(1) + 'px';
      bead.style.height = (t.r * 2).toFixed(1) + 'px';
      bead.style.marginLeft = (-t.r).toFixed(1) + 'px';
      bead.style.marginTop = (-t.r).toFixed(1) + 'px';

      const from = { x: t.x, y: -Math.max(60, t.r * 6) };
      setBead(from.x, from.y);
      painting = true;
      host.classList.add('bead');

      tweens.push(M.tween({
        duration: 880,
        ease: M.EASE.gravity,
        onUpdate: (v) => {
          // drawn out as it picks up speed, round again on arrival
          const stretch = 1 + Math.min(0.62, v * 0.7) * (1 - Math.pow(v, 6));
          setBead(from.x, from.y + (t.y - from.y) * v, [1 / stretch, stretch]);
        },
        onComplete: impact,
      }));
    }

    function impact() {
      if (finished) return;
      painting = false;
      host.classList.remove('bead');
      host.classList.add('landed');           // the SVG dot takes over

      const s = M.spring({ stiffness: 190, damping: 14, mass: 1 });
      tweens.push(M.tween({
        duration: s.duration,
        ease: s.ease,
        onUpdate: (v) => {
          const squash = 1 + (1 - v) * 0.8;    // wide and flat at impact
          const squish = 1 - (1 - v) * 0.45;
          dot.setAttribute('transform',
            'translate(' + dotX + ',' + dotY + ') ' +
            'scale(' + squash.toFixed(3) + ',' + squish.toFixed(3) + ') ' +
            'translate(' + (-dotX) + ',' + (-dotY) + ')');
        },
      }));

      /* The rest of the sequence hangs off the landing rather
         than off the clock, so the beats stay in step however
         long the fall actually took. */
      after(1150, handover);
      after(2200, finish);
    }

    /* ---------- Beat 4: hand over to the page ----------
       The wordmark slides and scales onto the real name in the
       header, so the last thing the sequence does is become the
       page rather than get out of its way. */
    function handover() {
      if (finished) return;
      host.classList.add('opening');
      /* the page beneath was held at nothing; this is the cue
         for it to come up, under the wordmark rather than after
         it, so the two movements read as one */
      document.documentElement.classList.add('intro-opening');
      /* the hero has to be on screen to be measured, and this is
         the last moment before it is */
      toTop();
      // let the opening rule (which is what carries the transform
      // transition) land before the transform itself is written
      void svg.getBoundingClientRect().width;
      try {
        const hero = document.getElementById('heroName');
        if (!hero) return;
        const h = hero.getBoundingClientRect();
        const w = svg.getBoundingClientRect();
        if (!h.width || !w.width) return;

        /* The same drawing at both ends, so this is a pure scale
           and translate between two boxes: origin at the centre
           of this one, travel from centre to centre. It used to
           be a serif wordmark dissolving into a geometric one and
           needed the text's own box measured out of the SVG's;
           now the sequence simply becomes the page. */
        svg.style.transformOrigin = '50% 50%';
        svg.style.transform =
          'translate(' +
            ((h.left + h.width / 2) - (w.left + w.width / 2)).toFixed(1) + 'px,' +
            ((h.top + h.height / 2) - (w.top + w.height / 2)).toFixed(1) + 'px) ' +
          'scale(' + (h.width / w.width).toFixed(4) + ')';
      } catch (e) { /* the plain fade is a perfectly good fallback */ }
    }

    /* One beat on the clock. Everything after it hangs off the
       beat before, so the sequence stays in step however long the
       writing and the fall actually take. */
    seq = M.sequence([
      { at: 200, run: name },
    ]);
  }

  /* ---------- Exit ---------- */
  function finish() {
    if (finished) return;
    finished = true;
    window.removeEventListener('load', toTop);
    try {
      if (priorRestore !== null) history.scrollRestoration = priorRestore;
    } catch (e) { /* not available */ }
    if (seq) seq.cancel();
    if (pen) pen.cancel();
    tweens.forEach((t) => t.cancel());
    timers.forEach(clearTimeout);
    if (trailRaf) cancelAnimationFrame(trailRaf);
    painting = false;
    document.documentElement.classList.remove('intro-on');
    document.documentElement.classList.remove('intro-opening');
    document.documentElement.classList.add('intro-done');
    host.classList.add('gone');
    setTimeout(() => { if (host.parentNode) host.remove(); }, 900);
    /* the page was held still while this played; the growth
       layer measures the document, so it needs a fresh look */
    setTimeout(() => {
      if (window.__flora && window.__flora.refresh) window.__flora.refresh();
      window.dispatchEvent(new Event('resize'));
    }, 260);
  }

  function skip() {
    if (finished) return;
    host.classList.add('opening');
    document.documentElement.classList.add('intro-opening');
    painting = false;
    setTimeout(finish, 340);
  }

  skipBtn.addEventListener('click', skip);
  host.addEventListener('click', skip);
  window.addEventListener('keydown', skip, { once: true });
  window.addEventListener('wheel', skip, { once: true, passive: true });
  window.addEventListener('touchstart', skip, { once: true, passive: true });

  /* Never trap anyone behind a stuck intro. */
  setTimeout(finish, 11000);

  ready().then(() => {
    // one frame so the font has actually painted before measuring
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
})();
