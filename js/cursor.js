/* ============================================================
   cursor.js — viewfinder cursor
   · precision crosshair glued to the pointer (zero lag)
   · two faint full-screen hairlines follow it — drafting-table feel
   · hover anything interactive: four corner brackets fly out and
     frame the element, tracking it even while you scroll
   · mousedown pinches the crosshair; hover rotates + to ×
   Fine pointers only. Native cursor hidden only once JS runs;
   text fields keep the native caret.
   ============================================================ */

(function () {
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function make(cls, parent) {
    const d = document.createElement('div');
    d.className = cls;
    (parent || document.body).appendChild(d);
    return d;
  }

  const lineV = make('xh-line xh-v');
  const lineH = make('xh-line xh-h');
  const frame = make('xh-frame');
  frame.innerHTML = '<span class="c1"></span><span class="c2"></span><span class="c3"></span><span class="c4"></span>';
  const core = make('xh-core');
  core.innerHTML = '<span class="xh-plus"></span>';

  document.body.classList.add('custom-cursor', 'cursor-off');

  let x = -100, y = -100, seen = false;
  let target = null; // currently framed element

  document.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    core.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    lineV.style.transform = 'translateX(' + x + 'px)';
    lineH.style.transform = 'translateY(' + y + 'px)';
    if (!seen) { seen = true; document.body.classList.remove('cursor-off'); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => document.body.classList.add('cursor-off'));
  document.addEventListener('mouseenter', () => { if (seen) document.body.classList.remove('cursor-off'); });
  document.addEventListener('mousedown', () => document.body.classList.add('xh-down'));
  document.addEventListener('mouseup', () => document.body.classList.remove('xh-down'));

  const HOT = 'a, button, [role="button"], input, select, textarea, label, .work-row, .pg-cell, .th-card, .quote-dots button';
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest ? e.target.closest(HOT) : null;
    if (t !== target) {
      target = t;
      document.body.classList.toggle('xh-hov', !!t);
      if (!t) frame.classList.remove('on');
    }
  }, { passive: true });

  const PAD = 7;
  function sync() {
    if (target) {
      if (!document.contains(target)) {
        target = null;
        document.body.classList.remove('xh-hov');
        frame.classList.remove('on');
      } else {
        const r = target.getBoundingClientRect();
        frame.style.left = r.left - PAD + 'px';
        frame.style.top = r.top - PAD + 'px';
        frame.style.width = r.width + PAD * 2 + 'px';
        frame.style.height = r.height + PAD * 2 + 'px';
        frame.classList.add('on');
      }
    } else {
      // park the collapsed frame at the pointer so the next lock-on
      // animates outward from the crosshair
      frame.style.left = x + 'px';
      frame.style.top = y + 'px';
      frame.style.width = '0px';
      frame.style.height = '0px';
    }
    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);
})();
