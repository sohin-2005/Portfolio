/* ============================================================
   constellation.js — the stack, in orbit

   Replaces the sliding marquee. Every technology becomes a body
   on one of three elliptical orbits around a central hub, each
   ring turning at its own rate so the arrangement never repeats.
   A canvas underneath draws the links: every body is tethered to
   the hub, and neighbours that drift close enough are joined by a
   line that brightens as they approach and fades as they part.

   Depth is faked from the orbit angle — bodies on the far side of
   the ellipse render smaller and fainter — which reads as three
   dimensions without any 3D maths.

   Hovering a body slows its ring almost to a stop, pulls the body
   forward in its brand colour, names it in the readout and dims
   everything else.
   ============================================================ */

(function () {
  const sky = document.getElementById('cnSky');
  if (!sky || !window.__TECH) return;

  const T = window.__TECH;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const canvas = sky.querySelector('.cn-links');
  const ctx = canvas.getContext('2d');
  const readout = document.getElementById('cnReadout');
  const roName = readout.querySelector('.cn-readout-name');
  const roKind = readout.querySelector('.cn-readout-kind');

  /* ---------- Bodies ---------- */
  const items = T.all();
  const RINGS = 3;
  const bodies = items.map((it, i) => {
    const ring = i % RINGS;
    // spread each ring's members evenly, offset per ring
    const perRing = Math.ceil(items.length / RINGS);
    const idxInRing = Math.floor(i / RINGS);
    return {
      data: it,
      ring: ring,
      angle: (idxInRing / perRing) * Math.PI * 2 + ring * 0.7,
      // outer rings turn slower, and alternate direction
      speed: (0.00022 - ring * 0.00005) * (ring === 1 ? -1 : 1),
      wob: Math.random() * Math.PI * 2,
      wobSpeed: 0.0005 + Math.random() * 0.0009,
      el: null, x: 0, y: 0, s: 1, o: 1,
    };
  });

  /* ---------- DOM ---------- */
  bodies.forEach((b) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cn-node';
    el.style.setProperty('--brand', T.readable(b.data.hex));
    el.setAttribute('aria-label', b.data.name + ' — ' + b.data.group);

    const mark = document.createElement('span');
    mark.className = 'cn-mark';
    const mono = document.createElement('span');
    mono.className = 'tech-mono';
    mono.textContent = b.data.mono;
    mark.appendChild(mono);
    T.mountLogo(mark, b.data.slugs, () => el.classList.add('has-logo'));

    el.appendChild(mark);
    sky.appendChild(el);
    b.el = el;

    const enter = () => focus(b);
    const leave = () => focus(null);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
  });

  let focused = null;
  function focus(b) {
    focused = b;
    sky.classList.toggle('cn-focused', !!b);
    bodies.forEach((x) => x.el.classList.toggle('on', x === b));
    if (b) {
      roName.textContent = b.data.name;
      roKind.textContent = b.data.group;
      readout.style.setProperty('--brand', T.readable(b.data.hex));
    }
    readout.classList.toggle('show', !!b);
  }

  /* ---------- Geometry ---------- */
  let W = 0, H = 0, cx = 0, cy = 0, DPR = 1;
  let rx = [], ry = [];

  function measure() {
    const r = sky.getBoundingClientRect();
    W = r.width; H = r.height;
    cx = W / 2; cy = H / 2;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // three nested ellipses. The inner ring stays well clear of the
    // hub so the readout in the middle is never crowded.
    const baseX = Math.min(W * 0.37, 430);
    const baseY = Math.min(H * 0.46, 205);
    rx = [baseX * 0.54, baseX * 0.79, baseX];
    ry = [baseY * 0.52, baseY * 0.78, baseY];
  }

  const LINK_DIST = 150;

  /* Reading a computed style inside the frame loop forces a style
     recalculation 60 times a second. Cache it, and refresh only
     when the palette actually changes. */
  let INK = '17,17,17';
  function readInk() {
    INK = (getComputedStyle(document.documentElement).getPropertyValue('--ink-rgb') || '17,17,17').trim();
  }
  readInk();

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const ink = INK;

    bodies.forEach((b) => {
      const slow = focused ? (b === focused ? 0.05 : 0.22) : 1;
      b.angle += b.speed * 16 * slow;
      b.wob += b.wobSpeed * 16 * slow;

      const wobble = Math.sin(b.wob) * 9;
      b.x = cx + Math.cos(b.angle) * (rx[b.ring] + wobble);
      b.y = cy + Math.sin(b.angle) * (ry[b.ring] + wobble * 0.4);

      // far side of the ellipse sits back: smaller and fainter
      const depth = 0.5 + 0.5 * Math.sin(b.angle);
      b.s = 0.68 + depth * 0.36;
      /* the far side of an orbit sinks back, but not so far it
         disappears: 0.45 at the back read as missing, not distant */
      b.o = 0.62 + depth * 0.38;

      const el = b.el;
      el.style.transform =
        'translate(' + (b.x - 22).toFixed(1) + 'px,' + (b.y - 22).toFixed(1) + 'px) scale(' + b.s.toFixed(3) + ')';
      el.style.opacity = (focused && b !== focused ? b.o * 0.3 : b.o).toFixed(3);
      el.style.zIndex = Math.round(depth * 100);
    });

    /* links */
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;

    // tether to the hub
    bodies.forEach((b) => {
      const a = (focused ? (b === focused ? 0.5 : 0.07) : 0.19) * b.o;
      ctx.strokeStyle = 'rgba(' + ink + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // neighbours brighten as they close on each other
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], c = bodies[j];
        const dx = a.x - c.x, dy = a.y - c.y;
        if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue;
        const d = Math.hypot(dx, dy);
        if (d >= LINK_DIST) continue;
        let al = (1 - d / LINK_DIST) * 0.48 * Math.min(a.o, c.o);
        if (focused) al *= (a === focused || c === focused) ? 1.6 : 0.18;
        ctx.strokeStyle = 'rgba(' + ink + ',' + al.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
    }
    void t;
  }

  /* ---------- Run ---------- */
  let raf = 0;
  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  function staticFrame() {
    // reduced motion: lay the bodies out once and leave them be
    bodies.forEach((b) => {
      b.x = cx + Math.cos(b.angle) * rx[b.ring];
      b.y = cy + Math.sin(b.angle) * ry[b.ring];
      b.el.style.transform = 'translate(' + (b.x - 22).toFixed(1) + 'px,' + (b.y - 22).toFixed(1) + 'px)';
      b.el.style.opacity = '1';
    });
  }

  measure();
  window.addEventListener('resize', () => { measure(); if (REDUCED) staticFrame(); });

  if (REDUCED) {
    staticFrame();
  } else if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? start() : stop()));
    }, { threshold: 0.05 }).observe(sky);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!REDUCED) start();
  });

  // brand colours follow the palette
  if (window.__theme && typeof window.__theme.apply === 'function') {
    const original = window.__theme.apply;
    window.__theme.apply = function (key) {
      const ok = original.call(window.__theme, key);
      if (ok) {
        readInk();
        bodies.forEach((b) => b.el.style.setProperty('--brand', T.readable(b.data.hex)));
      }
      return ok;
    };
  }
})();
