/* ============================================================
   particles.js — minimal ambient particle field (index only)
   Sparse ink-dark dots drifting on the paper background,
   faintly linked when close, gently pushed by the cursor.
   ============================================================ */

(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function INK() {
    return (getComputedStyle(document.documentElement).getPropertyValue('--ink-rgb') || '17, 17, 17').trim();
  }
  const LINK_DIST = 120;
  const MOUSE_DIST = 140;

  let w = 0, h = 0, dpr = 1;
  let particles = [];
  const mouse = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.min(Math.round((w * h) / 16000), 110);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.2,
    }));
  }

  function step() {
    for (const p of particles) {
      // gentle cursor repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < MOUSE_DIST && d > 0.01) {
        const f = ((MOUSE_DIST - d) / MOUSE_DIST) * 0.035;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      // mild speed limit keeps it calm
      p.vx = Math.max(-0.45, Math.min(0.45, p.vx * 0.995));
      p.vy = Math.max(-0.45, Math.min(0.45, p.vy * 0.995));

      p.x += p.vx;
      p.y += p.vy;

      // wrap around edges
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const INKV = INK(); // theme-aware: re-read each frame

    // faint links
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          ctx.strokeStyle = 'rgba(' + INKV + ',' + ((1 - d / LINK_DIST) * 0.1).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // dots
    ctx.fillStyle = 'rgba(' + INKV + ', 0.32)';
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseout', () => { mouse.x = -9999; mouse.y = -9999; });

  resize();

  if (reduceMotion) {
    draw(); // static, respects reduced-motion preference
  } else {
    loop();
  }
})();
