/* ============================================================
   main.js — in-page navigation and reveal

   About, Contact and Playground are their own documents; moving
   between them belongs to js/router.js. What is left here is
   everything that happens inside a single page.

   This file owns three small jobs:

     · smooth, interruptible scrolling to a section, with the
       address bar kept in step so links are still shareable
     · a scroll spy that keeps the side rail and the hero nav
       marking wherever you actually are
     · the reveal observer, which lifts a section the last few
       pixels into place as it arrives

   Exposes window.__nav = { goto(id), sections() }.
   ============================================================ */

(function () {
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ============================================================
     Reveal
     ============================================================ */
  const revealables = Array.from(document.querySelectorAll('.reveal'));
  if (revealables.length) {
    if (!('IntersectionObserver' in window) || REDUCED) {
      revealables.forEach((el) => el.classList.add('in'));
    } else {
      const ro = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            ro.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
      revealables.forEach((el) => ro.observe(el));

      /* Anything already on screen at load should not wait for a
         scroll event that may never come. */
      requestAnimationFrame(() => {
        revealables.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.92) el.classList.add('in');
        });
      });
    }
  }

  /* ============================================================
     Smooth scrolling

     Written by hand rather than left to scroll-behavior so the
     header offset is respected, the easing matches the rest of
     the site, and a second click part-way through retargets
     instead of fighting the first.
     ============================================================ */
  const M = window.__motion;
  let scrollTween = null;

  /* A section carries a screen-tenth of padding above its head.
     Scrolling to the section box would land you in that empty
     air and read as "nothing happened", so the target is the
     head itself, with a comfortable band left above it. */
  function offsetOf(el) {
    const head = el.querySelector ? el.querySelector('.sec-head') : null;
    const r = (head || el).getBoundingClientRect();
    const gap = head ? Math.min(90, window.innerHeight * 0.09) : 8;
    return Math.max(0, r.top + window.scrollY - gap);
  }

  function scrollTo(el) {
    if (!el) return;
    const to = Math.min(
      offsetOf(el),
      document.documentElement.scrollHeight - window.innerHeight
    );
    if (REDUCED || !M) { window.scrollTo(0, to); return; }

    const from = window.scrollY;
    const dist = to - from;
    if (Math.abs(dist) < 2) return;

    if (scrollTween) scrollTween.cancel();
    // longer trips take longer, but never uncomfortably so
    const dur = Math.min(1150, 420 + Math.abs(dist) * 0.28);
    scrollTween = M.tween({
      duration: dur,
      ease: M.EASE.outQuint,
      onUpdate: (v) => { window.scrollTo(0, from + dist * v); },
      onComplete: () => { scrollTween = null; },
    });
  }

  /* a real wheel or touch gesture always wins over an animation */
  ['wheel', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => {
      if (scrollTween) { scrollTween.cancel(); scrollTween = null; }
    }, { passive: true });
  });

  function goto(id) {
    const el = document.getElementById(String(id).replace(/^#/, ''));
    if (!el) return false;
    scrollTo(el);
    try { history.replaceState(null, '', '#' + el.id); } catch (e) { /* file:// */ }
    return true;
  }

  /* Any link that resolves to a place on THIS document is a
     scroll, not a navigation — whether it was written as
     "#works" or as "index.html#works". Links to other documents
     fall through to js/router.js. */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const raw = a.getAttribute('href');
    if (!raw || /^(mailto:|tel:|javascript:)/i.test(raw)) return;
    if (a.target && a.target !== '_self') return;

    let url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname !== location.pathname) return;      // another document
    const id = url.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;

    e.preventDefault();
    goto(id);
  });

  /* ============================================================
     Scroll spy

     Marks whichever section owns the middle of the viewport, so
     the rail never flickers between two neighbours the way a
     pure "topmost visible" test does.
     ============================================================ */
  const sections = Array.from(document.querySelectorAll('[data-section]'));
  const links = Array.from(document.querySelectorAll('[data-goto]'));

  function markers(id) {
    links.forEach((l) => {
      const on = l.dataset.goto === id;
      l.classList.toggle('on', on);
      if (on) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  }

  let spyRaf = 0;
  let lastId = '';
  function spy() {
    spyRaf = 0;
    if (!sections.length) return;
    const mid = window.scrollY + window.innerHeight * 0.42;
    let current = sections[0];
    for (const s of sections) {
      if (s.offsetTop <= mid) current = s;
    }
    // the very bottom of the page always belongs to the last section
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    if (current && current.id !== lastId) {
      lastId = current.id;
      markers(lastId);
    }
  }
  function queueSpy() { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }

  if (sections.length) {
    window.addEventListener('scroll', queueSpy, { passive: true });
    window.addEventListener('resize', queueSpy);
    queueSpy();
  }

  /* Cross-page links, warming and the transition between
     documents all belong to js/router.js now. */

  /* ---------- Deep links ----------
     Landing on /#about should put you at About without the
     browser's instant jump fighting the intro. */
  function honourHash() {
    const id = location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    // wait for fonts and images so the offset is measured correctly
    setTimeout(() => scrollTo(el), 120);
  }
  window.addEventListener('load', honourHash);
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id) scrollTo(document.getElementById(id));
  });

  window.__nav = {
    goto: goto,
    sections: function () { return sections.map((s) => s.id); },
  };
})();
