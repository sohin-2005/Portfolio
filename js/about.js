/* ============================================================
   about.js — portrait behaviour + the tech-stack logo grid

   Portrait: reveals with a widening circle when it scrolls into
   view, then tilts toward the pointer while hovered.

   Stack grid: the technology list, the brand-colour readability
   rule and the logo loader all live in js/tech.js, shared with
   the home-page constellation so the two views cannot disagree.
   ============================================================ */

(function () {
  const T = window.__TECH;

  /* ============================================================
     Stack grid — data, colours and the logo loader all come from
     js/tech.js, shared with the home-page constellation.
     ============================================================ */
  const stack = document.getElementById('stack');
  const tiles = [];

  if (stack && T) {
    let n = 0;
    T.GROUPS.forEach((group) => {
      const wrap = document.createElement('div');
      wrap.className = 'stack-group';

      const legend = document.createElement('h3');
      legend.className = 'stack-legend';
      legend.textContent = group.label;
      wrap.appendChild(legend);

      const grid = document.createElement('div');
      grid.className = 'stack-grid';

      group.items.forEach(([name, slugs, hex, mono]) => {
        const tile = document.createElement('div');
        tile.className = 'tech';
        tile.dataset.hex = hex;
        tile.style.setProperty('--brand', T.readable(hex));
        tile.style.setProperty('--d', (n * 0.028).toFixed(3) + 's');
        tile.title = name;
        n++;

        const mark = document.createElement('span');
        mark.className = 'tech-mark';
        const monoEl = document.createElement('span');
        monoEl.className = 'tech-mono';
        monoEl.textContent = mono;
        mark.appendChild(monoEl);

        const label = document.createElement('span');
        label.className = 'tech-name';
        label.textContent = name;

        tile.appendChild(mark);
        tile.appendChild(label);
        grid.appendChild(tile);
        tiles.push(tile);

        T.mountLogo(mark, slugs, () => tile.classList.add('has-logo'));
      });

      wrap.appendChild(grid);
      stack.appendChild(wrap);
    });

    /* stagger the tiles in as the grid arrives */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { stack.classList.add('in'); io.disconnect(); }
        });
      }, { threshold: 0.08 });
      io.observe(stack);
    } else {
      stack.classList.add('in');
    }
  }

  /* Re-derive every brand colour when the palette changes. */
  if (T && window.__theme && typeof window.__theme.apply === 'function') {
    const original = window.__theme.apply;
    window.__theme.apply = function (key) {
      const ok = original.call(window.__theme, key);
      if (ok) tiles.forEach((t) => t.style.setProperty('--brand', T.readable(t.dataset.hex)));
      return ok;
    };
  }

  /* ============================================================
     Portrait
     ============================================================ */
  const portrait = document.querySelector('.portrait');
  if (!portrait) return;

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { portrait.classList.add('in'); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(portrait);
  } else {
    portrait.classList.add('in');
  }

  const disc = portrait.querySelector('.portrait-disc');
  const img = portrait.querySelector('.portrait-img');
  const fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (disc && img && fine && !still) {
    disc.addEventListener('mousemove', (e) => {
      const r = disc.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      img.style.transform =
        'rotateY(' + (dx * 16).toFixed(2) + 'deg) rotateX(' + (-dy * 16).toFixed(2) + 'deg)';
    });
    disc.addEventListener('mouseleave', () => { img.style.transform = ''; });
  }
})();
