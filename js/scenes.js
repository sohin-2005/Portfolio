/* ============================================================
   scenes.js — the illustrated cast, drawn as line art

   Everything here is stroked, never filled: contour drawings in
   a single ink weight, the way a good editorial line illustration
   is made. Only pupils and a couple of accents are solid, which
   is what stops a pure outline drawing reading as empty.

   One figure rig, five stories. The home page runs a seven-act
   loop — walk in, think, get the idea (the desk bulb lights),
   sit, code, stand, walk off — driven by a state machine that
   swaps a class on the scene root. Timing lives in scenes.css.

   Proportions: the standing build is 213 units from sole to
   crown, the seated build 175 from floor to crown. A seated
   person is roughly four-fifths their standing height, so the
   two now read as the same person rather than two different
   people.

   Scenes mount into any element with data-scene="<name>".
   ============================================================ */

(function () {
  const hosts = document.querySelectorAll('[data-scene]');
  if (!hosts.length) return;

  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* The stylesheet remaps these literals to the active theme. */
  const INK = '#111';

  /* stroke weights: contour, secondary, detail */
  const W1 = 2.6, W2 = 2, W3 = 1.5;

  function S(d, w, cls) {
    return '<path ' + (cls ? 'class="' + cls + '" ' : '') + 'd="' + d + '" fill="none" stroke="' + INK +
           '" stroke-width="' + (w || W1) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function C(cx, cy, r, w, cls) {
    return '<circle ' + (cls ? 'class="' + cls + '" ' : '') + 'cx="' + cx + '" cy="' + cy + '" r="' + r +
           '" fill="none" stroke="' + INK + '" stroke-width="' + (w || W1) + '"/>';
  }
  function Dot(cx, cy, r, cls) {
    return '<circle ' + (cls ? 'class="' + cls + '" ' : '') + 'cx="' + cx + '" cy="' + cy + '" r="' + r +
           '" fill="' + INK + '"/>';
  }
  function R(x, y, w, h, rx, sw, cls) {
    return '<rect ' + (cls ? 'class="' + cls + '" ' : '') + 'x="' + x + '" y="' + y + '" width="' + w +
           '" height="' + h + '" rx="' + (rx || 0) + '" fill="none" stroke="' + INK +
           '" stroke-width="' + (sw || W1) + '" stroke-linejoin="round"/>';
  }

  /* ---------- The figure, standing ----------
     Feet at (0,0), crown at -213, so the rig can be walked around
     by translating its group and still sit on the floor line. */
  function standing() {
    return (
      '<g class="fig fig-stand">' +
        // far limbs first so the near side reads in front
        '<g class="legB">' + S('M-6 -108 L-8 -6', W1) + S('M-15 -4 h17', W1) + '</g>' +
        '<g class="armB">' + S('M-14 -164 L-21 -128', W2) + S('M-21 -128 L-17 -100', W2) + '</g>' +
        // torso — a single closed contour, shoulders to hips
        S('M-15 -168 Q-18 -138 -15 -110 Q0 -103 15 -110 Q18 -138 15 -168 Q0 -175 -15 -168 Z', W1) +
        S('M0 -179 V-172', W2) +                       // neck
        '<g class="legF">' + S('M6 -108 L8 -6', W1) + S('M-1 -4 h17', W1) + '</g>' +
        '<g class="armF">' +
          S('M14 -164 L22 -130', W2, 'armUp') +
          S('M22 -130 L19 -101', W2, 'armLow') +
          C(18, -97, 4.6, W3, 'hand') +
        '</g>' +
        '<g class="headG">' +
          C(0, -196, 17, W1) +
          S('M-14 -207 Q0 -217 14 -207', W2) +          // hair line
          C(-6.5, -197, 5.4, W3) + C(7.5, -197, 5.4, W3) + S('M-1.1 -197 h1.6', W3) +
          Dot(-6.5, -197, 1.5) + Dot(7.5, -197, 1.5) +
        '</g>' +
      '</g>'
    );
  }

  /* ---------- The figure, seated at the desk ----------
     Floor at 284, crown at 109 — 175 tall against the standing
     build's 213, which is the right ratio for a seated pose. */
  const seated =
    '<g class="fig fig-sit">' +
      S('M304 206 L276 212', W1) +                      // thigh
      S('M276 212 L272 276', W1) +                      // shin
      S('M260 278 h20', W1) +                           // foot
      S('M300 152 Q295 180 300 206 L336 206 Q341 180 336 152 Q318 145 300 152 Z', W1) +
      S('M318 143 V150', W2) +                          // neck
      S('M306 160 L288 180', W2) +                      // upper arm
      '<g class="armType">' + S('M288 180 L268 191', W2) + C(264, 192, 4.6, W3) + '</g>' +
      '<g class="headG">' +
        C(316, 126, 17, W1) +
        S('M302 115 Q316 105 330 115', W2) +
        C(309.5, 125, 5.4, W3) + C(323.5, 125, 5.4, W3) + S('M315.4 125 h1.6', W3) +
        Dot(309.5, 125, 1.5) + Dot(323.5, 125, 1.5) +
      '</g>' +
    '</g>';

  /* ---------- Thought bubble ----------
     Three dots while he turns it over; on the idea beat they are
     replaced by a small bulb and the desk lamp comes on. */
  function thought(x, y) {
    return (
      '<g class="think" transform="translate(' + x + ',' + y + ')">' +
        C(0, 14, 3.4, W3, 'tb tb1') +
        C(8, 3, 4.8, W3, 'tb tb2') +
        '<g class="tb tb3">' +
          S('M14 0 Q10 -30 40 -31 Q70 -32 68 -14 Q66 0 40 0 Z', W2) +
          Dot(28, -15, 2.6, 'td td1') + Dot(39, -15, 2.6, 'td td2') + Dot(50, -15, 2.6, 'td td3') +
          '<g class="tbulb">' +
            C(40, -18, 7.5, W3) +
            S('M36 -11 h8 M37.5 -8 h5', W3) +
            S('M40 -29 v-4 M31 -25 l-3 -2.5 M49 -25 l3 -2.5 M28 -18 h-4 M56 -18 h4', W3, 'tbray') +
          '</g>' +
        '</g>' +
      '</g>'
    );
  }

  /* ---------- Props ---------- */
  const plantArt =
    '<g class="plant">' +
      S('M84 248 C68 214 70 178 86 152 C100 180 98 216 84 248 Z', W2, 'leaf l1') +
      S('M84 248 C58 232 44 206 46 178 C70 194 82 220 84 248 Z', W2, 'leaf l2') +
      S('M86 248 C112 230 124 204 120 178 C98 194 88 220 86 248 Z', W2, 'leaf l3') +
      S('M85 248 V196', W3) +
      R(58, 244, 52, 9, 3, W1) +
      S('M63 253 h42 l-5 31 h-32 Z', W1) +
    '</g>';

  const catArt =
    '<g class="cat">' +
      S('M150 282 C136 278 128 266 134 254', W2, 'tail') +
      S('M152 284 C150 262 160 249 172 249 C185 249 195 262 194 284', W1) +
      S('M178 238 L175 227 L184 232', W2) +
      S('M194 238 L198 227 L189 232', W2) +
      C(186, 245, 11, W1) +
      '<g class="eyes">' + Dot(182, 244, 1.7) + Dot(190, 244, 1.7) + '</g>' +
      S('M186 248 l-2 2 M186 248 l2 2', W3) +
      S('M176 247 h-7 M176 250 h-6 M196 247 h7 M196 250 h6', W3, 'whisk') +
      S('M162 284 v-7 M180 284 v-6', W3) +
    '</g>';

  const plant = (dx) => '<g transform="translate(' + (dx || 0) + ',0)">' + plantArt + '</g>';
  const cat = (dx) => '<g class="catWrap" transform="translate(' + (dx || 0) + ',0)">' + catArt + '</g>';

  const bulb =
    '<g id="bulb" tabindex="0" role="button" aria-label="Toggle the light bulb" aria-pressed="false">' +
      '<title>Click to switch the light on</title>' +
      '<circle class="halo" cx="385" cy="64" r="38" fill="url(#gGlow)"/>' +
      '<g class="rays">' +
        '<line x1="385" y1="42" x2="385" y2="33"/><line x1="369" y1="48" x2="363" y2="42"/>' +
        '<line x1="401" y1="48" x2="407" y2="42"/><line x1="362" y1="64" x2="353" y2="64"/>' +
        '<line x1="408" y1="64" x2="417" y2="64"/>' +
      '</g>' +
      C(385, 64, 16, 3, 'glass') +
      S('M378 70 q7 -9 14 0', 2, 'fil') +
      S('M379 82 h12 M381 88 h8 M383.5 93 h5', W2) +
    '</g>';

  const defs =
    '<defs>' +
      '<radialGradient id="gGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#FFDFA3" stop-opacity="0.95"/>' +
        '<stop offset="55%" stop-color="#FFC463" stop-opacity="0.45"/>' +
        '<stop offset="100%" stop-color="#FFC463" stop-opacity="0"/>' +
      '</radialGradient>' +
    '</defs>';

  const floor = (x1, x2, y) =>
    '<line class="floor" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" ' +
    'stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>';

  /* ============================================================
     Scenes
     ============================================================ */
  const SCENES = {

    /* --- Home --- */
    desk: {
      vb: '0 0 460 320',
      label: 'Sohin walking to his desk, thinking, having an idea, then sitting down to code',
      /* Durations are matched to css/scenes.css: each act is at
         least as long as the longest animation in it, so nothing
         is cut off mid-move when the next act begins. */
      acts: [
        { name: 'walk',  ms: 3900 },
        { name: 'think', ms: 3800 },
        { name: 'idea',  ms: 2200 },
        { name: 'sit',   ms: 1600 },
        { name: 'code',  ms: 8200 },
        { name: 'rise',  ms: 1500 },
        { name: 'leave', ms: 4100 },
      ],
      svg:
        defs +
        floor(30, 430, 284) +
        plant(0) + cat(0) +
        // desk
        S('M118 200 h234', W1) +
        S('M138 202 V278 M332 202 V278', W1) +
        S('M128 280 h24 M320 280 h24', W1) +
        // mug
        S('M181 178 q-3 -6 0 -12', W3, 'steam s1') +
        S('M188 178 q3 -6 0 -12', W3, 'steam s2') +
        S('M176 184 h16 v13 q0 4 -4 4 h-8 q-4 0 -4 -4 Z', W2) +
        S('M192 188 q6 0 6 5 t-6 5', W3) +
        // laptop
        S('M212 194 L219 150 h44 l7 44 Z', W2) +
        S('M206 194 h68 q0 6 -6 6 h-56 q-6 0 -6 -6 Z', W2) +
        '<g class="code-lines">' +
          S('M226 160 h22', W3, 'cl cl1') + S('M226 168 h32', W3, 'cl cl2') +
          S('M226 176 h17', W3, 'cl cl3') + S('M226 184 h27', W3, 'cl cl4') +
        '</g>' +
        // chair
        S('M348 154 V212', W1) +
        S('M292 212 h58', W1) +
        S('M320 214 V276', W1) +
        S('M300 278 h42', W1) +
        seated +
        // walking build, parked in front of the chair
        '<g class="walker" transform="translate(268,284)">' + standing() + thought(18, -232) + '</g>' +
        bulb,
    },

    /* --- About --- */
    board: {
      vb: '0 0 430 320',
      label: 'Sohin sketching a diagram on a whiteboard',
      acts: [{ name: 'draw', ms: 9000 }],
      svg:
        floor(16, 414, 284) +
        R(160, 46, 236, 152, 5, W1) +
        S('M276 198 V228 M250 230 h52', W1) +
        '<g class="sketch" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
          '<path class="sk sk1" d="M186 86 h44"/>' +
          '<path class="sk sk2" d="M186 86 v34 h44"/>' +
          '<circle class="sk sk3" cx="272" cy="86" r="17"/>' +
          '<path class="sk sk4" d="M292 90 h40"/>' +
          '<rect class="sk sk5" x="332" y="70" width="44" height="34" rx="5"/>' +
          '<path class="sk sk6" d="M206 150 q40 26 80 0 t80 -6"/>' +
          '<path class="sk sk7" d="M186 174 h60"/>' +
        '</g>' +
        plant(-38) +
        '<g class="walker board-fig" transform="translate(122,284)">' + standing() + '</g>',
    },

    /* --- Works --- */
    wall: {
      vb: '0 0 430 320',
      label: 'Sohin pinning project screens onto a wall',
      acts: [{ name: 'pin', ms: 8400 }],
      svg:
        floor(16, 414, 284) +
        '<g class="pins" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
          '<g class="pn pn1"><rect x="188" y="50" width="68" height="50" rx="4"/><path d="M196 88 l16 -16 12 12 10 -10 14 14" stroke-width="1.8"/></g>' +
          '<g class="pn pn2"><rect x="274" y="66" width="68" height="50" rx="4"/><path d="M282 106 h52 M282 92 h34" stroke-width="1.8"/></g>' +
          '<g class="pn pn3"><rect x="216" y="126" width="68" height="50" rx="4"/><circle cx="250" cy="151" r="13" stroke-width="1.8"/></g>' +
          '<g class="pn pn4"><rect x="302" y="142" width="68" height="50" rx="4"/><path d="M310 184 v-16 m14 16 v-28 m14 28 v-20 m14 20 v-32" stroke-width="1.8"/></g>' +
        '</g>' +
        '<g class="thread" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-dasharray="4 5">' +
          '<path class="th1" d="M222 100 L308 116"/>' +
          '<path class="th2" d="M308 116 L250 126"/>' +
          '<path class="th3" d="M250 176 L336 142"/>' +
        '</g>' +
        '<g class="walker wall-fig" transform="translate(126,284)">' + standing() + '</g>',
    },

    /* --- Playground --- */
    juggle: {
      vb: '0 0 430 320',
      label: 'Sohin juggling geometric shapes',
      acts: [{ name: 'play', ms: 9000 }],
      svg:
        floor(16, 414, 284) +
        '<g class="balls">' +
          C(188, 138, 11, W1, 'jb jb1') +
          R(202, 127, 21, 21, 4, W1, 'jb jb2') +
          S('M242 126 l12 22 h-24 Z', W1, 'jb jb3') +
          C(272, 138, 8.5, W1, 'jb jb4') +
        '</g>' +
        cat(140) +
        '<g class="walker juggle-fig" transform="translate(214,284)">' + standing() + '</g>',
    },

    /* --- Contact --- */
    plane: {
      vb: '0 0 430 320',
      label: 'Sohin launching a paper plane towards a mailbox',
      acts: [{ name: 'send', ms: 7200 }],
      svg:
        floor(16, 414, 284) +
        '<g class="plane-g">' +
          S('M0 0 L34 12 L0 24 L9 12 Z', W2, 'plane') +
          S('M-6 12 q-40 -6 -76 4', 1.4, 'trail') +
        '</g>' +
        '<g class="mailbox">' +
          R(330, 142, 58, 42, 5, W1) +
          S('M330 148 l29 21 29 -21', W2) +
          S('M359 184 V250', W1) +
          S('M340 252 h38', W1) +
        '</g>' +
        plant(-48) +
        '<g class="walker plane-fig" transform="translate(156,284)">' + standing() + '</g>',
    },
  };

  /* ============================================================
     Mount + drive
     ============================================================ */
  hosts.forEach((host) => {
    const key = host.dataset.scene;
    const scene = SCENES[key];
    if (!scene) return;

    host.innerHTML =
      '<svg class="scene sc-' + key + '" viewBox="' + scene.vb + '" fill="none" ' +
      'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + scene.label + '">' +
      scene.svg + '</svg>';

    const svg = host.querySelector('svg');
    if (REDUCED) { svg.classList.add('act-code', 'still'); return; }

    const acts = scene.acts;
    let i = -1;
    let timer = 0;
    let running = false;

    function next() {
      i = (i + 1) % acts.length;
      acts.forEach((a) => svg.classList.remove('act-' + a.name));
      /* Removing a class and adding the same one back in one frame
         is no change at all as far as CSS is concerned, so its
         animations would not restart. Flush the removal first. */
      void svg.getBoundingClientRect();
      svg.classList.add('act-' + acts[i].name);
      timer = setTimeout(next, acts[i].ms);
    }
    /* Always from the top. Resuming at whichever act was next when
       the scene scrolled away used to cut him from mid-walk
       straight to the desk the moment it came back into view; the
       story opening with him walking in is the one start that has
       nothing before it to jump from. */
    function start() { if (!running) { running = true; i = -1; next(); } }
    function stop() { running = false; clearTimeout(timer); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? start() : stop()));
      }, { threshold: 0.15 }).observe(host);
    } else {
      start();
    }

  });

  /* ---------- The bulb stays clickable ---------- */
  const b = document.getElementById('bulb');
  if (b) {
    const toggle = () => {
      const lit = b.classList.toggle('lit');
      b.setAttribute('aria-pressed', lit ? 'true' : 'false');
    };
    b.addEventListener('click', toggle);
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }
})();
