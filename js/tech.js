/* ============================================================
   tech.js — the stack, shared by the About grid and the
   home-page constellation

   One list, one logo loader, one colour-readability rule, so the
   two views can never disagree about what Sohin works with.

   Logos come from simple-icons at runtime. Two CDNs and per-icon
   slug alternates are tried in turn — simple-icons has renamed a
   few slugs across major versions — and if every candidate fails
   the caller keeps its typographic monogram instead. Nothing
   ever renders as a hole.
   ============================================================ */

(function () {
  const HOSTS = [
    'https://cdn.jsdelivr.net/npm/simple-icons@13/icons/',
    'https://unpkg.com/simple-icons@13/icons/',
  ];

  /* name, slug candidates, brand hex, monogram */
  const GROUPS = [
    {
      label: 'Languages',
      items: [
        ['Python', ['python'], '#3776AB', 'Py'],
        ['C', ['c'], '#00599C', 'C'],
        ['JavaScript', ['javascript'], '#F7DF1E', 'JS'],
        ['TypeScript', ['typescript'], '#3178C6', 'TS'],
        ['PHP', ['php'], '#777BB4', 'PHP'],
      ],
    },
    {
      label: 'Frontend',
      items: [
        ['HTML5', ['html5', 'html'], '#E34F26', 'HT'],
        ['CSS3', ['css3', 'css'], '#1572B6', 'CSS'],
        ['React', ['react'], '#61DAFB', 'Re'],
        ['Next.js', ['nextdotjs', 'nextjs'], '#000000', 'Nx'],
        ['Tailwind CSS', ['tailwindcss'], '#06B6D4', 'Tw'],
      ],
    },
    {
      label: 'Backend & Data',
      items: [
        ['Express', ['express'], '#000000', 'Ex'],
        ['tRPC', ['trpc'], '#2596BE', 'tR'],
        ['FastAPI', ['fastapi'], '#009688', 'Fa'],
        ['Laravel', ['laravel'], '#FF2D20', 'Lv'],
        ['Drizzle ORM', ['drizzle', 'drizzleorm'], '#C5F74F', 'Dz'],
        ['MySQL', ['mysql'], '#4479A1', 'My'],
        ['PostgreSQL', ['postgresql'], '#4169E1', 'Pg'],
        ['Supabase', ['supabase'], '#3FCF8E', 'Sb'],
      ],
    },
    {
      label: 'ML & Tooling',
      items: [
        ['Scikit-learn', ['scikitlearn'], '#F7931E', 'Sk'],
        ['LangChain', ['langchain'], '#1C3C3C', 'Lc'],
        ['Streamlit', ['streamlit'], '#FF4B4B', 'St'],
        ['Git', ['git'], '#F05032', 'Gi'],
        ['GitHub', ['github'], '#181717', 'Gh'],
      ],
    },
  ];

  /* ---------- Colour ---------- */
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function luma(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function bgRgb() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--bg-rgb').trim();
    const p = (v || '236, 236, 236').split(',').map(Number);
    return [p[0], p[1], p[2]];
  }

  /* Nudge a brand colour until it reads against the current page
     background, without losing the hue that makes it knowable. */
  function readable(hex) {
    const brand = hexToRgb(hex);
    const bgL = luma(bgRgb());
    const gap = Math.abs(luma(brand) - bgL);
    if (gap >= 0.32) return 'rgb(' + brand.join(',') + ')';
    const t = bgL < 0.5 ? 255 : 0;
    const amt = Math.min(0.72, (0.32 - gap) * 1.9);
    return 'rgb(' + brand.map((c) => Math.round(c + (t - c) * amt)).join(',') + ')';
  }

  /* ---------- Logo ----------
     Walks host × slug until an image actually loads, then paints
     it as a mask so the shape takes whatever colour we give it. */
  function mountLogo(host, slugs, onLoaded) {
    const urls = [];
    HOSTS.forEach((h) => slugs.forEach((s) => urls.push(h + s + '.svg')));
    (function next(i) {
      if (i >= urls.length) return;
      const url = urls[i];
      const probe = new Image();
      probe.onload = function () {
        const logo = document.createElement('span');
        logo.className = 'tech-logo';
        logo.style.webkitMaskImage = 'url("' + url + '")';
        logo.style.maskImage = 'url("' + url + '")';
        host.appendChild(logo);
        if (onLoaded) onLoaded(logo);
      };
      probe.onerror = function () { next(i + 1); };
      probe.src = url;
    })(0);
  }

  window.__TECH = {
    GROUPS: GROUPS,
    all: function () {
      const out = [];
      GROUPS.forEach((g) => g.items.forEach((it) => out.push({
        name: it[0], slugs: it[1], hex: it[2], mono: it[3], group: g.label,
      })));
      return out;
    },
    readable: readable,
    mountLogo: mountLogo,
  };
})();
