/* ============================================================
   scene.js — home-page life: bulb toggle, rotating book
   quotations, and scroll-reveal animations
   ============================================================ */

/* ---------- Hero: letter entrance + cat-dash easter egg ---------- */
(function () {
  const name = document.getElementById('heroName');
  if (!name) return;

  // split into letters with staggered entrance
  const text = name.textContent;
  name.textContent = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'hl';
    s.textContent = ch;
    s.style.animationDelay = 0.08 * i + 's';
    name.appendChild(s);
  });

  // click the name → a cat sprints across the bottom of the screen
  const CAT_SVG =
    '<svg viewBox="0 0 64 36" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M6 30 C2 28 0 22 3 17" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="26" cy="26" rx="20" ry="9" fill="currentColor"/>' +
    '<circle cx="49" cy="18" r="8" fill="currentColor"/>' +
    '<path d="M44 12 L42 4 L48 8 Z" fill="currentColor"/>' +
    '<path d="M54 12 L57 4 L51 8 Z" fill="currentColor"/>' +
    '<path d="M14 33 l-3 3 M24 34 l-2 2 M34 34 l2 2 M44 31 l3 3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';

  let running = false;
  name.addEventListener('click', () => {
    if (running) return;
    running = true;
    const cat = document.createElement('div');
    cat.className = 'cat-dash';
    cat.setAttribute('aria-hidden', 'true');
    cat.innerHTML = CAT_SVG;
    cat.style.color = 'var(--ink)';
    document.body.appendChild(cat);
    setTimeout(() => { cat.remove(); running = false; }, 2700);
  });
})();

/* ---------- Light bulb ---------- */
(function () {
  const bulb = document.getElementById('bulb');
  if (!bulb) return;

  function toggle() {
    const lit = bulb.classList.toggle('lit');
    bulb.setAttribute('aria-pressed', lit ? 'true' : 'false');
  }

  bulb.addEventListener('click', toggle);
  bulb.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });
})();

/* ---------- Margin notes: rotating quotations ---------- */
(function () {
  const section = document.querySelector('.quotes');
  const textEl = document.getElementById('quoteText');
  const authorEl = document.getElementById('quoteAuthor');
  const dotsEl = document.getElementById('quoteDots');
  if (!section || !textEl) return;

  const QUOTES = [
    { t: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.', a: 'Antoine de Saint-Exupéry — Wind, Sand and Stars' },
    { t: 'Programs must be written for people to read, and only incidentally for machines to execute.', a: 'Abelson & Sussman — Structure and Interpretation of Computer Programs' },
    { t: 'Simplicity is the ultimate sophistication.', a: 'attributed to Leonardo da Vinci' },
    { t: 'Make it work, make it right, make it fast.', a: 'Kent Beck' },
    { t: 'First, solve the problem. Then, write the code.', a: 'John Johnson' },
  ];

  let idx = 0;
  let timer = null;

  QUOTES.forEach((q, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Quote ' + (i + 1));
    b.addEventListener('click', () => { show(i); restart(); });
    dotsEl.appendChild(b);
  });
  const dots = Array.from(dotsEl.children);

  function show(i) {
    idx = i;
    section.classList.add('fading');
    setTimeout(() => {
      textEl.textContent = '“' + QUOTES[i].t + '”';
      authorEl.textContent = QUOTES[i].a;
      dots.forEach((d, j) => d.classList.toggle('active', j === i));
      section.classList.remove('fading');
    }, 450);
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(() => show((idx + 1) % QUOTES.length), 6000);
  }

  // first quote, no fade
  textEl.textContent = '“' + QUOTES[0].t + '”';
  authorEl.textContent = QUOTES[0].a;
  dots[0].classList.add('active');
  restart();
})();

/* ---------- Scroll reveal ---------- */
(function () {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18 });
  els.forEach((el) => io.observe(el));
})();
