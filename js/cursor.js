/* ============================================================
   cursor.js — the ink cursor

   The pointer is a bead of ink. Move and it stretches along its
   direction of travel and pulls a thinning tail behind it; stop
   and it settles back to a round drop. Hover something and a
   ripple opens around it. Under Night scenery it becomes a
   spark, so the cursor belongs to whichever mode is running.

   Built to cost nothing when idle:

     · position is written straight from the pointer event, so
       the bead is never a frame behind
     · rotation, stretch, the tail and the settle all run in one
       rAF loop that halts itself the moment everything has
       caught up
     · position, rotation and stretch live on separate nested
       elements, so the direct write and the smoothed writes
       never fight over the same transform
     · hover is a delegated class toggle — no element is ever
       measured, which is what makes this cheap

   Fine pointers only; text fields keep their caret.
   ============================================================ */

(function () {
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SPARK = 'M0 -9 Q1.3 -1.3 9 0 Q1.3 1.3 0 9 Q-1.3 1.3 -9 0 Q-1.3 -1.3 0 -9 Z';

  const root = document.createElement('div');
  root.className = 'ic-cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<span class="ic-tail ic-t1"></span>' +
    '<span class="ic-tail ic-t2"></span>' +
    '<span class="ic-tail ic-t3"></span>' +
    '<span class="ic-pos">' +
      '<span class="ic-ring"></span>' +
      '<span class="ic-spin">' +
        '<span class="ic-stretch">' +
          '<svg class="ic-tip" viewBox="-16 -12 32 24">' +
            '<g class="ic-glyph ic-bead"><circle class="ic-drop" cx="0" cy="0" r="5.4"/></g>' +
            '<g class="ic-glyph ic-spark"><path d="' + SPARK + '"/></g>' +
          '</svg>' +
        '</span>' +
      '</span>' +
    '</span>';
  document.body.appendChild(root);

  const pos = root.querySelector('.ic-pos');
  const spin = root.querySelector('.ic-spin');
  const stretchEl = root.querySelector('.ic-stretch');
  const tails = [
    root.querySelector('.ic-t1'),
    root.querySelector('.ic-t2'),
    root.querySelector('.ic-t3'),
  ];

  document.body.classList.add('ic-on', 'ic-idle');

  let px = -200, py = -200;          // pointer
  let angle = 0, target = 0;         // heading, degrees
  let speed = 0, stretch = 1;        // px/frame, and the smoothed stretch
  let raf = 0;
  let seen = false;

  // each bead of the tail trails further behind than the one before
  const trail = tails.map(() => ({ x: -200, y: -200 }));
  const LAG = [0.34, 0.24, 0.16];

  function loop() {
    let moving = false;

    /* the tail chases the bead ahead of it */
    let ax = px, ay = py;
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const dx = ax - t.x;
      const dy = ay - t.y;
      t.x += dx * LAG[i];
      t.y += dy * LAG[i];
      if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) moving = true;
      tails[i].style.transform =
        'translate3d(' + t.x.toFixed(2) + 'px,' + t.y.toFixed(2) + 'px,0)';
      ax = t.x; ay = t.y;
    }

    /* turn toward the heading by the shortest way round */
    const d = ((target - angle + 540) % 360) - 180;
    if (Math.abs(d) > 0.25) { angle += d * 0.18; moving = true; }
    else { angle = target; }
    spin.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';

    /* a drop in motion is not round: it draws out along its
       travel and thins across it, conserving its area */
    const want = 1 + Math.min(0.85, speed * 0.03);
    if (Math.abs(want - stretch) > 0.004) { stretch += (want - stretch) * 0.2; moving = true; }
    else { stretch = want; }
    stretchEl.style.transform =
      'scale(' + stretch.toFixed(3) + ',' + (1 / stretch).toFixed(3) + ')';

    speed *= 0.86;                 // bleed off between pointer events
    if (speed > 0.05) moving = true;

    if (moving) raf = requestAnimationFrame(loop);
    else raf = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  let stillTimer = 0;
  document.addEventListener('pointermove', (e) => {
    const dx = e.clientX - px;
    const dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;

    // written directly — the bead sits exactly on the pointer
    pos.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';

    const dist2 = dx * dx + dy * dy;
    if (dist2 > 6) {
      target = Math.atan2(dy, dx) * 180 / Math.PI;
      speed = Math.min(30, Math.sqrt(dist2));
      document.body.classList.add('ic-moving');
      clearTimeout(stillTimer);
      stillTimer = setTimeout(() => document.body.classList.remove('ic-moving'), 140);
    }

    if (!seen) {
      seen = true;
      trail.forEach((t) => { t.x = px; t.y = py; });
      document.body.classList.remove('ic-idle');
    }
    kick();
  }, { passive: true });

  document.addEventListener('pointerdown', () => document.body.classList.add('ic-down'));
  document.addEventListener('pointerup', () => document.body.classList.remove('ic-down'));
  document.addEventListener('mouseleave', () => document.body.classList.add('ic-idle'));
  document.addEventListener('mouseenter', () => { if (seen) document.body.classList.remove('ic-idle'); });

  /* ---------- Hover ---------- */
  /* `a` and `button` already cover the project cards' shot and
     their two links; the rest of this list is the things that are
     interactive without being either. The .tl-* entries that used
     to be here went with the project timeline. */
  const HOT = 'a, button, [role="button"], input, select, textarea, label, ' +
              '.pg-cell, .th-card, .cn-node, .tech, .rail-link';

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest(HOT);
    if (t) document.body.classList.add('ic-hot');
    const typing = e.target.matches && e.target.matches('input, textarea, [contenteditable]');
    document.body.classList.toggle('ic-text', !!typing);
  }, { passive: true });

  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest(HOT);
    if (t && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(HOT))) {
      document.body.classList.remove('ic-hot');
    }
  }, { passive: true });
})();
