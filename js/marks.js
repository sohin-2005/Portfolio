/* ============================================================
   marks.js — the small logo beside a resume row

   Any element carrying data-mark gets a logo painted into it.
   The value is either a simple-icons slug (googlecloud, ibm,
   coursera) or a path to a local file for the things
   simple-icons does not carry — a college, an NPTEL course, a
   private company.

   Painted as a CSS mask rather than an <img>, which is how
   js/tech.js already does the stack logos. The mark then takes
   the page ink instead of a brand colour, so it reads as part of
   the typography and survives all nine palettes without a single
   override. Brand colour would be wrong here anyway: these sit
   next to text at 20px.

   A mark that will not load is simply never lit. The column it
   sits in is a fixed width, so the rows stay aligned whether
   their logo arrived or not, and nothing is ever a broken image.
   ============================================================ */

(function () {
  const hosts = [
    'https://cdn.jsdelivr.net/npm/simple-icons@13/icons/',
    'https://unpkg.com/simple-icons@13/icons/',
  ];

  const marks = [].slice.call(document.querySelectorAll('[data-mark]'));
  if (!marks.length) return;

  marks.forEach(function (host) {
    const v = (host.dataset.mark || '').trim();
    if (!v) return;

    /* Anything with a slash or an .svg on the end is a file we
       ship; anything else is a slug to look for on the icon CDNs,
       in order. An earlier version tested only for a leading "."
       or "/", so a perfectly good relative path like
       assets/img/logos/taxor.svg was treated as a brand slug and
       looked up on a CDN that had never heard of it. */
    const isPath = v.indexOf('/') !== -1 || /\.svg$/i.test(v);
    const urls = isPath ? [v] : hosts.map(function (h) { return h + v + '.svg'; });

    (function next(i) {
      if (i >= urls.length) return;          // nothing found: leave it dark
      const probe = new Image();
      probe.onload = function () {
        host.style.webkitMaskImage = 'url("' + urls[i] + '")';
        host.style.maskImage = 'url("' + urls[i] + '")';
        host.classList.add('is-on');
      };
      probe.onerror = function () { next(i + 1); };
      probe.src = urls[i];
    })(0);
  });
})();
