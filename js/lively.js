/* ============================================================
   lively.js — spring motion, layered on top

   Motion One does two things the hand-written CSS in this site
   cannot: real spring physics, and inView with a stagger that
   stays correct however the elements happen to be laid out.

   It is loaded as a module from a CDN, which means it can fail:
   a blocked domain, an offline visitor, an old browser. So every
   starting state in here is written FROM JavaScript, after the
   import has already resolved. If the import never lands,
   nothing has been hidden and the page is simply the page — the
   same reason the intro is additive rather than a gate.

   API note: in Motion One a spring is an easing generator, not
   an option flag — animate(el, keys, { easing: spring({...}) }).
   Passing Framer Motion's { type: "spring" } here is silently
   ignored and you get a default ease instead, which is the sort
   of bug that looks like "the springs feel wrong" forever.

   Transform and opacity only, so the compositor does the work
   and a long page stays smooth.
   ============================================================ */

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Every element this file hides is recorded here first. If
   anything downstream throws — a CDN that half-loads, a browser
   that turns out not to have what Motion One needs — the catch
   puts all of them back. Hiding content and then failing is the
   one outcome that must not be possible. */
const armed = [];
function disarm() {
  armed.forEach((el) => {
    el.style.opacity = '';
    el.style.transform = '';
    el.style.willChange = '';
  });
  armed.length = 0;
}

/* Motion One drives the Web Animations API. No animate() on an
   element means no springs, and there is no point hiding
   anything to find that out afterwards. */
const HAS_WAAPI = typeof Element !== 'undefined' &&
  typeof Element.prototype.animate === 'function';

if (!REDUCED && HAS_WAAPI) {
  try {
    const { animate, inView, stagger, spring } = await import(
      'https://cdn.jsdelivr.net/npm/motion@10.18.0/+esm'
    );

    /* One physical character for the whole site: a spring with a
       little weight, and a plain ease for the small stuff where
       ringing would just be noise. */
    const RISE = spring({ stiffness: 130, damping: 18, mass: 0.9 });
    const SOFT = [0.22, 1, 0.36, 1];

    /* Motion One writes the whole transform itself, so the only
       thing set up front is opacity — otherwise the two fight
       over the same property on the first frame. */
    function arm(els, dy) {
      els.forEach((el) => {
        el.style.opacity = '0';
        el.style.willChange = 'transform, opacity';
        armed.push(el);
      });
      return dy;
    }

    function group(selector, opts) {
      const els = Array.from(document.querySelectorAll(selector));
      if (!els.length) return;
      const o = opts || {};
      const dy = arm(els, o.y === undefined ? 22 : o.y);

      els.forEach((el, i) => {
        /* index within its own container, so three cards in a row
           stagger across the row rather than by document order */
        const peers = el.parentElement
          ? Array.from(el.parentElement.children).filter((n) => els.indexOf(n) !== -1)
          : [el];
        const k = Math.max(0, peers.indexOf(el));

        /* inView keeps observing, so without this an element
           replays its entrance every time you scroll back past
           it. Stop the observer the first time it fires.

           stop is declared with let and checked after the call
           as well: an observer that fires synchronously would
           reach the callback before inView has returned, and a
           const referenced from inside its own initialiser
           throws. The done flag is what actually guarantees
           once-only; stop is just tidying up. */
        let done = false;
        let stop = null;
        stop = inView(el, () => {
          if (done) return;
          done = true;
          if (stop) stop();
          animate(
            el,
            { opacity: [0, 1], y: [dy, 0] },
            o.soft
              ? { duration: 0.55, easing: SOFT, delay: k * (o.step || 0.05) }
              : { easing: RISE, delay: k * (o.step || 0.06) }
          ).finished.then(() => {
            // commit the resting state and stop paying for the layer
            el.style.opacity = '1';
            el.style.willChange = '';
          }, () => { el.style.opacity = '1'; });
        }, { margin: '0px 0px -12% 0px', amount: 0.12 });
      });
    }

    /* The project thread is not in this list on purpose: its
       checkpoints are revealed by the scroll position along the
       curve in js/timeline.js, and a second system fading the
       same elements would fight it. */
    group('.contact-cell', { y: 18, step: 0.06 });
    group('.rz-item', { y: 16, step: 0.04 });
    group('.fact-row', { y: 12, step: 0.04 });
    group('.chips span', { y: 10, step: 0.018, soft: true });

    /* ---------- The section heads ----------
       Number, title and note arrive in that order, which is the
       order they are read in. */
    document.querySelectorAll('.sec-head').forEach((head) => {
      const parts = Array.from(head.querySelectorAll('.sec-num, .sec-title, .sec-note'));
      if (!parts.length) return;
      parts.forEach((p) => { p.style.opacity = '0'; armed.push(p); });

      let done = false;
      let stop = null;
      stop = inView(head, () => {
        if (done) return;
        done = true;
        if (stop) stop();
        animate(
          parts,
          { opacity: [0, 1], y: [18, 0] },
          { easing: RISE, delay: stagger(0.08) }
        ).finished.then(() => {
          parts.forEach((p) => { p.style.opacity = '1'; });
        }, () => { parts.forEach((p) => { p.style.opacity = '1'; }); });
      }, { margin: '0px 0px -10% 0px', amount: 0.2 });
    });

    /* ---------- Safety net ----------
       Everything above hides its target and waits for inView to
       put it back, and inView is an IntersectionObserver, not a
       promise. In a document the browser considers hidden — a tab
       opened in the background, an embedded view, a page being
       screenshotted — that callback can be throttled hard or never
       delivered at all. When it is not delivered the content stays
       at opacity 0 permanently, which is precisely the outcome the
       top of this file says must not be possible. The import
       failing was already covered by the catch below; this covers
       the observer simply never speaking.

       Only things actually on screen get rescued. Anything still
       below the fold is legitimately waiting its turn, so it is
       left armed and looked at again the next time the page
       moves. Once nothing is left waiting, the listener goes. */
    function restore(el) {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.willChange = '';
    }

    function net() {
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      let waiting = 0;
      armed.slice().forEach((el) => {
        /* anything mid-animation is on a fractional opacity, and
           anything finished is on '1'; only an untouched '0' is
           evidence that nobody ever came for it */
        if (el.style.opacity !== '0') return;
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh + 1) restore(el);
        else waiting++;
      });
      if (!waiting) window.removeEventListener('scroll', netSoon);
    }

    let netQueued = false;
    function netSoon() {
      if (netQueued) return;
      netQueued = true;
      setTimeout(function () { netQueued = false; net(); }, 400);
    }

    /* long enough that a working observer has certainly had its
       turn, including the longest stagger delay above */
    setTimeout(net, 3500);
    window.addEventListener('scroll', netSoon, { passive: true });

    document.documentElement.classList.add('lively');
  } catch (e) {
    /* Motion One never arrived, or something in it did not do
       what this browser expected. Put back everything that was
       hidden and leave the page exactly as it was without us. */
    disarm();
  }
}
