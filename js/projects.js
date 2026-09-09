/* ============================================================
   projects.js — the projects rail

   Replaces the curved timeline that used to live here. That was
   one thread with three checkpoints on it, which was a nice
   drawing and a bad container: it had a fixed idea of how many
   projects there were, and the only way in was a checkpoint that
   did not look like a link.

   This is a row of cards you scroll sideways. It takes as many
   projects as window.__PROJECT_ORDER holds, and every card says
   plainly what it is and where it goes.

   Where the clicks go:
     the shot        project.html?p=<slug>, the full case study on
                     its own URL — a page you can link to, bookmark
                     and send to somebody
     Live / GitHub   leave the site

   All three are plain links. An earlier version made the shot a
   button that opened an in-page overlay, which meant the case
   study had no URL of its own and the card had to keep its
   data-project attribute off the card element to stop the overlay
   swallowing the other two links. A real page is simpler in every
   direction.

   Scrolling is the browser's own: a scroll-snapping overflow
   container, which gets trackpads, shift-wheel, touch, keyboard
   and the scrollbar for free. The arrows are a convenience on
   top of it, not the mechanism.
   ============================================================ */

(function () {
  const host = document.getElementById('projRail');
  if (!host) return;

  const ORDER = window.__PROJECT_ORDER || [];
  const DATA = window.__PROJECTS || {};
  if (!ORDER.length) return;

  const rail = host.querySelector('.pr-rail');
  const prev = host.querySelector('.pr-nav-prev');
  const next = host.querySelector('.pr-nav-next');

  /* ---------- Build ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function linkRow(p) {
    const links = p.links || {};
    const out = [];
    if (links.live) {
      out.push(
        '<a class="pr-link pr-link-live" href="' + esc(links.live) + '"' +
        ' target="_blank" rel="noopener noreferrer">' +
        'Live site<span class="pr-arr" aria-hidden="true">↗</span></a>');
    }
    if (links.repo) {
      out.push(
        '<a class="pr-link" href="' + esc(links.repo) + '"' +
        ' target="_blank" rel="noopener noreferrer">' +
        'GitHub<span class="pr-arr" aria-hidden="true">↗</span></a>');
    }
    /* no links is a real state, not a broken one */
    return out.length ? '<div class="pr-links">' + out.join('') + '</div>' : '';
  }

  const cards = ORDER.map(function (slug, i) {
    const p = DATA[slug];
    if (!p) return '';
    const name = p.short || p.name;
    const chips = (p.chips || []).slice(0, 4)
      .map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');

    return '' +
      '<article class="pr-card" data-slug="' + esc(slug) + '">' +
        '<a class="pr-shot" href="project.html?p=' + esc(slug) + '"' +
          ' aria-label="' + esc(name) + ': read the full case study">' +
          '<img src="assets/projects/web/' + esc(slug) + '-poster.jpg"' +
              ' alt="' + esc(name) + ' dashboard"' +
              ' loading="' + (i < 2 ? 'eager' : 'lazy') + '" decoding="async">' +
          '<span class="pr-open"><span>Case study</span></span>' +
        '</a>' +

        '<div class="pr-body">' +
          '<span class="pr-num micro">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<h3 class="pr-name">' + esc(name) + '</h3>' +
          '<p class="pr-cat">' + esc(p.cat) + '</p>' +
          (p.tagline ? '<p class="pr-line">' + esc(p.tagline) + '</p>' : '') +
          (chips ? '<ul class="pr-chips">' + chips + '</ul>' : '') +
        '</div>' +

        linkRow(p) +
      '</article>';
  }).join('');

  rail.innerHTML = cards;

  /* ============================================================
     The arrows

     One card plus its gap per press, measured off a real card
     rather than assumed, so the step stays right when the card
     width changes with the viewport.
     ============================================================ */
  function step() {
    const card = rail.querySelector('.pr-card');
    if (!card) return rail.clientWidth;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function go(dir) {
    rail.scrollBy({ left: dir * step(), behavior: 'smooth' });
  }

  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });

  /* ---------- Arrow state ----------
     An arrow that cannot do anything should say so. Disabled
     rather than hidden, so the pair does not shuffle sideways
     every time you reach an end. */
  function sync() {
    const max = rail.scrollWidth - rail.clientWidth;
    const x = rail.scrollLeft;
    /* a pixel of slack: sub-pixel layout means scrollLeft rarely
       lands exactly on 0 or on max */
    if (prev) prev.disabled = x <= 1;
    if (next) next.disabled = x >= max - 1;
    host.classList.toggle('is-scrollable', max > 1);
  }

  let ticking = false;
  rail.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; sync(); });
  }, { passive: true });

  window.addEventListener('resize', sync);
  /* images change the scroll width as they land */
  [].slice.call(rail.querySelectorAll('img')).forEach(function (img) {
    img.addEventListener('load', sync, { once: true });
    img.addEventListener('error', function () {
      /* a missing poster should cost the card its image, not its
         content — the card still says what the project is */
      const shot = img.closest('.pr-shot');
      if (shot) shot.classList.add('is-bare');
    }, { once: true });
  });

  sync();
})();
