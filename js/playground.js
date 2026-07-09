/* ============================================================
   playground.js — seven fully functional experiments & games
   Each app is { title, mount(stage) -> cleanupFn }.
   Apps are mounted lazily into the modal and torn down on close
   (animation frames cancelled, camera tracks stopped).
   ============================================================ */

(function () {
  const modal = document.getElementById('pgModal');
  const stage = document.getElementById('pgStage');
  const titleEl = document.getElementById('pgTitle');
  const closeBtn = document.getElementById('pgClose');
  if (!modal) return;

  let cleanup = null;
  let currentApp = null;

  /* ---------- helpers ---------- */
  function fitCanvas(canvas) {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height, ctx: ctx };
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function inkRGB() {
    return (getComputedStyle(document.documentElement).getPropertyValue('--ink-rgb') || '17, 17, 17').trim();
  }

  /* ============================================================
     1. WAVE SHADER — layered sine field, mouse-warped
     ============================================================ */
  function mountWaves(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view"><canvas></canvas></div>' +
      '  <div class="pg-rail">' +
      '    <h4>Wave Shader</h4>' +
      '    <div class="pg-ctl"><label>Speed <span id="wvS">1.0</span></label><input id="wSpeed" type="range" min="0" max="3" step="0.05" value="1"></div>' +
      '    <div class="pg-ctl"><label>Amplitude <span id="wvA">48</span></label><input id="wAmp" type="range" min="6" max="130" step="1" value="48"></div>' +
      '    <div class="pg-ctl"><label>Layers <span id="wvL">5</span></label><input id="wLay" type="range" min="2" max="9" step="1" value="5"></div>' +
      '    <div class="pg-ctl"><label>Frequency <span id="wvF">1.4</span></label><input id="wFreq" type="range" min="0.3" max="3" step="0.1" value="1.4"></div>' +
      '    <div class="pg-btn-row"><button class="pg-btn" id="wScatter">Scatter</button></div>' +
      '    <p class="pg-note">Move the cursor over the field — the waves bend toward it. Tune the field with the sliders.</p>' +
      '    <div class="pg-stat" id="wStat">—</div>' +
      '  </div>' +
      '</div>';

    const canvas = stage.querySelector('canvas');
    let { w, h, ctx } = fitCanvas(canvas);
    const P = { speed: 1, amp: 48, layers: 5, freq: 1.4 };
    let phases = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => i * 1.7);
    const mouse = { x: -9999, y: -9999 };
    let t = 0, raf = 0, frames = 0, fps = 0, last = performance.now();

    function bind(id, key, out, fmt) {
      const inp = stage.querySelector('#' + id);
      inp.addEventListener('input', () => {
        P[key] = parseFloat(inp.value);
        stage.querySelector('#' + out).textContent = fmt(P[key]);
      });
    }
    bind('wSpeed', 'speed', 'wvS', (v) => v.toFixed(1));
    bind('wAmp', 'amp', 'wvA', (v) => v.toFixed(0));
    bind('wLay', 'layers', 'wvL', (v) => v.toFixed(0));
    bind('wFreq', 'freq', 'wvF', (v) => v.toFixed(1));
    stage.querySelector('#wScatter').addEventListener('click', () => {
      phases = phases.map(() => Math.random() * Math.PI * 2);
    });

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999; }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    function onResize() { const f = fitCanvas(canvas); w = f.w; h = f.h; ctx = f.ctx; }
    window.addEventListener('resize', onResize);

    function loop(now) {
      t += 0.016 * P.speed;
      frames++;
      if (now - last > 1000) { fps = frames; frames = 0; last = now; }
      ctx.clearRect(0, 0, w, h);
      const ink = inkRGB();
      const L = Math.round(P.layers);
      for (let i = 0; i < L; i++) {
        const base = (h * (i + 1)) / (L + 1);
        const alpha = 0.2 + 0.6 * (i / Math.max(1, L - 1));
        ctx.strokeStyle = 'rgba(' + ink + ',' + alpha.toFixed(2) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 5) {
          const g = Math.exp(-Math.pow((x - mouse.x) / 160, 2));
          const pull = mouse.y > -999 ? (mouse.y - base) * 0.35 * g : 0;
          const y =
            base +
            Math.sin(x * 0.01 * P.freq + t * 2 + phases[i]) * P.amp * (0.5 + 0.5 * (i / L)) +
            Math.sin(x * 0.004 * P.freq - t + phases[i] * 2) * P.amp * 0.3 +
            pull;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      stage.querySelector('#wStat').textContent = fps + ' fps · ' + L + ' layers';
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }

  /* ============================================================
     2. PARTICLE FIELD — physics sandbox
     ============================================================ */
  function mountParticles(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view"><canvas></canvas></div>' +
      '  <div class="pg-rail">' +
      '    <h4>Particle Field</h4>' +
      '    <div class="pg-ctl"><label>Particles <span id="pcN">250</span></label><input id="pCount" type="range" min="50" max="700" step="10" value="250"></div>' +
      '    <div class="pg-ctl"><label>Force <span id="pcF">1.0</span></label><input id="pForce" type="range" min="0.2" max="3" step="0.1" value="1"></div>' +
      '    <div class="pg-btn-row">' +
      '      <button class="pg-btn" id="pMode">Mode: Attract</button>' +
      '      <button class="pg-btn" id="pBurst">Burst</button>' +
      '      <button class="pg-btn" id="pReset">Reset</button>' +
      '    </div>' +
      '    <p class="pg-note">Hold the mouse down to pull the field toward the cursor. Switch mode to push it away instead.</p>' +
      '    <div class="pg-stat" id="pStat">—</div>' +
      '  </div>' +
      '</div>';

    const canvas = stage.querySelector('canvas');
    let { w, h, ctx } = fitCanvas(canvas);
    const P = { count: 250, force: 1, repel: false };
    let parts = [];
    const mouse = { x: 0, y: 0, down: false };
    let raf = 0, frames = 0, fps = 0, last = performance.now();

    function spawn(n, cx, cy, radial) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        parts.push({
          x: cx !== undefined ? cx : Math.random() * w,
          y: cy !== undefined ? cy : Math.random() * h,
          vx: radial ? Math.cos(a) * (2 + Math.random() * 4) : (Math.random() - 0.5) * 0.6,
          vy: radial ? Math.sin(a) * (2 + Math.random() * 4) : (Math.random() - 0.5) * 0.6,
          r: 1 + Math.random() * 1.6,
        });
      }
    }
    function settle() {
      if (parts.length > P.count) parts.length = P.count;
      else if (parts.length < P.count) spawn(P.count - parts.length);
    }
    spawn(P.count);

    stage.querySelector('#pCount').addEventListener('input', function () {
      P.count = parseInt(this.value, 10);
      stage.querySelector('#pcN').textContent = P.count;
      settle();
    });
    stage.querySelector('#pForce').addEventListener('input', function () {
      P.force = parseFloat(this.value);
      stage.querySelector('#pcF').textContent = P.force.toFixed(1);
    });
    stage.querySelector('#pMode').addEventListener('click', function () {
      P.repel = !P.repel;
      this.textContent = 'Mode: ' + (P.repel ? 'Repel' : 'Attract');
    });
    stage.querySelector('#pBurst').addEventListener('click', () => {
      spawn(120, w / 2, h / 2, true);
    });
    stage.querySelector('#pReset').addEventListener('click', () => {
      parts = [];
      spawn(P.count);
    });

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    canvas.addEventListener('mousemove', pos);
    canvas.addEventListener('mousedown', (e) => { pos(e); mouse.down = true; });
    window.addEventListener('mouseup', up);
    function up() { mouse.down = false; }

    function onResize() { const f = fitCanvas(canvas); w = f.w; h = f.h; ctx = f.ctx; }
    window.addEventListener('resize', onResize);

    function loop(now) {
      frames++;
      if (now - last > 1000) { fps = frames; frames = 0; last = now; }
      ctx.clearRect(0, 0, w, h);
      const ink = inkRGB();
      for (const p of parts) {
        if (mouse.down) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          const d = Math.sqrt(d2) || 1;
          const f = Math.min(1200 / d2, 0.5) * P.force * (P.repel ? -1 : 1);
          p.vx += (dx / d) * f * 8;
          p.vy += (dy / d) * f * 8;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx *= -0.85; }
        if (p.x > w) { p.x = w; p.vx *= -0.85; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.85; }
        if (p.y > h) { p.y = h; p.vy *= -0.85; }

        const sp = Math.min(Math.hypot(p.vx, p.vy) / 6, 1);
        ctx.strokeStyle = 'rgba(' + ink + ',' + (0.15 + sp * 0.4).toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
        ctx.fillStyle = 'rgba(' + ink + ',' + (0.35 + sp * 0.5).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      stage.querySelector('#pStat').textContent = fps + ' fps · ' + parts.length + ' particles';
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mouseup', up);
    };
  }

  /* ============================================================
     3. THEME ENGINE — pick a palette, restyle the whole portfolio
     (persists via localStorage, applied on every page by theme.js)
     ============================================================ */
  function mountTheme(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view th-view"><div class="th-grid" id="thGrid"></div></div>' +
      '  <div class="pg-rail">' +
      '    <h4>Theme Engine</h4>' +
      '    <p class="pg-note">Pick a palette and the <strong>entire portfolio</strong> re-inks itself — every page, transition, canvas and illustration. Your choice is remembered on your next visit.</p>' +
      '    <div class="pg-btn-row"><button class="pg-btn" id="thReset">Reset to Paper</button></div>' +
      '    <div class="pg-stat" id="thCur">—</div>' +
      '  </div>' +
      '</div>';

    const grid = stage.querySelector('#thGrid');
    const cur = stage.querySelector('#thCur');
    const T = window.__theme;
    if (!T) {
      grid.innerHTML = '<p class="pg-note">Theme system failed to load.</p>';
      return function () {};
    }

    function render() {
      grid.innerHTML = '';
      Object.keys(T.THEMES).forEach((key) => {
        const t = T.THEMES[key];
        const card = el(
          '<button class="th-card' + (T.current() === key ? ' active' : '') + '">' +
          '  <span class="th-dots"><span class="th-dot"></span><span class="th-dot"></span></span>' +
          '  <span><span class="th-name"></span><span class="th-pair"></span></span>' +
          '</button>'
        );
        card.style.background = t.bg;
        card.style.color = t.ink;
        card.style.borderColor = t.ink;
        const dots = card.querySelectorAll('.th-dot');
        dots[0].style.background = t.ink;
        dots[1].style.background = t.bg;
        dots[1].style.borderColor = t.ink;
        card.querySelector('.th-name').textContent = t.label;
        card.querySelector('.th-pair').textContent = t.bg + ' / ' + t.ink;
        card.addEventListener('click', () => { T.apply(key); render(); });
        grid.appendChild(card);
      });
      cur.textContent = 'current: ' + T.THEMES[T.current()].label.toLowerCase();
    }

    stage.querySelector('#thReset').addEventListener('click', () => { T.apply('paper'); render(); });
    render();
    return function () {};
  }

  /* ============================================================
     4. CMDK — fuzzy command palette that runs the site
     ============================================================ */
  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    let qi = 0, score = 0, streak = 0;
    for (let i = 0; i < s.length && qi < q.length; i++) {
      if (s[i] === q[qi]) {
        qi++;
        streak++;
        score += 2 + streak + (i === 0 || s[i - 1] === ' ' ? 4 : 0);
      } else streak = 0;
    }
    return qi === q.length ? score : -1;
  }

  function mountCmdk(stage) {
    stage.innerHTML =
      '<div class="ck-hero">' +
      '  <div class="ck-big">A command palette for this site.</div>' +
      '  <p class="pg-note">Press <span class="ck-kbd">⌘</span><span class="ck-kbd">K</span> (or Ctrl+K) anywhere on the Playground — or click below.</p>' +
      '  <button class="pg-btn" id="ckOpen">Open Palette</button>' +
      '</div>' +
      '<div class="ck-backdrop" id="ckBack" hidden>' +
      '  <div class="ck-panel">' +
      '    <input class="ck-input" id="ckInput" placeholder="Type a command…" autocomplete="off">' +
      '    <div class="ck-list" id="ckList"></div>' +
      '    <div class="ck-foot">↑↓ navigate · ↵ run · esc close</div>' +
      '  </div>' +
      '</div>';

    const back = stage.querySelector('#ckBack');
    const input = stage.querySelector('#ckInput');
    const list = stage.querySelector('#ckList');
    let sel = 0, results = [];

    const commands = [
      { ic: 'H', label: 'Go to Home', hint: 'nav', run: () => window.__goPage('index.html', 't-shutter', 'Sohin') },
      { ic: 'W', label: 'Go to Works', hint: 'nav', run: () => window.__goPage('works.html', 't-shutter', 'Works') },
      { ic: 'A', label: 'Go to About', hint: 'nav', run: () => window.__goPage('about.html', 't-splitv', 'About') },
      { ic: 'C', label: 'Go to Contact', hint: 'nav', run: () => window.__goPage('contact.html', 't-blinds', 'Contact') },
      { ic: '∿', label: 'Open Wave Shader', hint: 'app', run: () => openApp('waves') },
      { ic: '✦', label: 'Open Particle Field', hint: 'app', run: () => openApp('particles') },
      { ic: '◐', label: 'Open Theme Engine', hint: 'app', run: () => openApp('theme') },
      { ic: '▞', label: 'Open ASCII Cam', hint: 'app', run: () => openApp('ascii') },
      { ic: '◉', label: 'Play Ink Runner', hint: 'game', run: () => openApp('runner') },
      { ic: '⧉', label: 'Play Pairs', hint: 'game', run: () => openApp('pairs') },
      { ic: '◑', label: 'Toggle Ink Mode', hint: 'fun', run: () => { modal.classList.toggle('ink'); close(); } },
      {
        ic: '@', label: 'Copy Email Address', hint: 'copy',
        run: () => {
          if (navigator.clipboard) navigator.clipboard.writeText('sohinsanthosh555@gmail.com');
          close();
        },
      },
    ];

    function open() {
      back.hidden = false;
      input.value = '';
      sel = 0;
      render();
      setTimeout(() => input.focus(), 30);
    }
    function close() { back.hidden = true; }

    function render() {
      const q = input.value.trim();
      results = !q
        ? commands.slice()
        : commands
            .map((c) => ({ c: c, s: fuzzy(q, c.label) }))
            .filter((r) => r.s >= 0)
            .sort((a, b) => b.s - a.s)
            .map((r) => r.c);
      sel = Math.min(sel, Math.max(0, results.length - 1));
      list.innerHTML = '';
      if (!results.length) {
        list.appendChild(el('<div class="ck-empty">No matching commands.</div>'));
        return;
      }
      results.forEach((c, i) => {
        const item = el(
          '<div class="ck-item' + (i === sel ? ' sel' : '') + '"><span class="ck-ic"></span><span></span><span class="ck-hint"></span></div>'
        );
        item.children[0].textContent = c.ic;
        item.children[1].textContent = c.label;
        item.children[2].textContent = c.hint;
        item.addEventListener('click', () => c.run());
        item.addEventListener('mousemove', () => { if (sel !== i) { sel = i; render(); } });
        list.appendChild(item);
      });
    }

    input.addEventListener('input', () => { sel = 0; render(); });
    function onKey(e) {
      if (back.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) results[sel].run(); }
      else if (e.key === 'Escape') { e.stopPropagation(); close(); }
    }
    stage.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
    stage.querySelector('#ckOpen').addEventListener('click', open);

    open();
    stage.__openPalette = open;
    return function () { stage.__openPalette = null; };
  }

  /* ============================================================
     5. ASCII CAM — webcam → text art, plasma fallback
     ============================================================ */
  function mountAscii(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view ascii-view"><pre id="axOut"></pre></div>' +
      '  <div class="pg-rail">' +
      '    <h4>ASCII Cam</h4>' +
      '    <div class="pg-ctl"><label>Camera</label><button class="pg-btn" id="axCam" style="width:100%">Connecting…</button></div>' +
      '    <div class="pg-ctl"><label>Display Mode</label><select class="pg-select" id="axMode">' +
      '      <option value="ink">Ink (theme)</option>' +
      '      <option value="matrix">Matrix</option>' +
      '      <option value="amber">Amber Terminal</option>' +
      '      <option value="ghost">Ghost</option>' +
      '    </select></div>' +
      '    <div class="pg-ctl"><label>Character Set</label><select class="pg-select" id="axSet">' +
      '      <option value="@%#*+=-:. ">Standard</option>' +
      '      <option value="█▓▒░ ">Blocks</option>' +
      '      <option value="#&amp;+~-. ">Minimal</option>' +
      '    </select></div>' +
      '    <div class="pg-ctl"><label>Resolution <span id="axRv">80</span></label><input id="axRes" type="range" min="40" max="140" step="4" value="80"></div>' +
      '    <label class="pg-check"><input type="checkbox" id="axInv"> Invert</label>' +
      '    <p class="pg-note" id="axStatus">Requesting camera…</p>' +
      '  </div>' +
      '</div>';

    const out = stage.querySelector('#axOut');
    const view = stage.querySelector('.ascii-view');
    const src = document.createElement('canvas');
    const sctx = src.getContext('2d', { willReadFrequently: true });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    const P = { chars: '@%#*+=-:. ', cols: 80, invert: false, cam: false, mode: 'ink' };
    let stream = null, raf = 0, t = 0;

    /* Display modes: Ink follows the site theme; the others are
       self-lit terminal looks that work on any theme. */
    const MODES = {
      ink: { bg: '', color: '', op: '1' },
      matrix: { bg: '#0A0F0A', color: '#61FF7E', op: '1' },
      amber: { bg: '#150F02', color: '#FFB000', op: '1' },
      ghost: { bg: '', color: '', op: '0.35' },
    };
    function applyMode() {
      const m = MODES[P.mode];
      view.style.background = m.bg;
      out.style.color = m.color;
      out.style.opacity = m.op;
    }

    stage.querySelector('#axMode').addEventListener('change', function () { P.mode = this.value; applyMode(); });
    stage.querySelector('#axSet').addEventListener('change', function () { P.chars = this.value; });
    stage.querySelector('#axRes').addEventListener('input', function () {
      P.cols = parseInt(this.value, 10);
      stage.querySelector('#axRv').textContent = P.cols;
    });
    stage.querySelector('#axInv').addEventListener('change', function () { P.invert = this.checked; });

    const status = stage.querySelector('#axStatus');
    const camBtn = stage.querySelector('#axCam');

    function enableCam() {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        camBtn.textContent = 'Camera Unavailable';
        status.textContent = window.isSecureContext
          ? 'This browser exposes no camera API. Running the plasma source meanwhile.'
          : 'Browsers only allow camera access over http://localhost or https — double-click "Start Portfolio.command" in the project folder and the camera will work. Plasma source running meanwhile.';
        return;
      }
      camBtn.textContent = 'Connecting…';
      status.textContent = 'Requesting camera…';
      navigator.mediaDevices.getUserMedia({ video: { width: 320, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          video.srcObject = s;
          return video.play();
        })
        .then(() => {
          P.cam = true;
          camBtn.textContent = 'Camera On ✓';
          status.textContent = 'Live — you are text now. Try the display modes.';
        })
        .catch(() => {
          camBtn.textContent = 'Retry Camera';
          status.textContent = 'Camera blocked or denied — allow access and hit retry. Plasma source running meanwhile.';
        });
    }
    camBtn.addEventListener('click', enableCam);
    enableCam(); // ask immediately on open
    applyMode();

    function plasma(cols, rowsN) {
      src.width = cols; src.height = rowsN;
      const img = sctx.createImageData(cols, rowsN);
      for (let y = 0; y < rowsN; y++) {
        for (let x = 0; x < cols; x++) {
          const dx = x - cols / 2, dy = y - rowsN / 2;
          let v =
            Math.sin(x * 0.28 + t) +
            Math.sin(y * 0.24 - t * 1.3) +
            Math.sin((x + y) * 0.16 + t * 0.7) +
            Math.sin(Math.sqrt(dx * dx + dy * dy) * 0.35 - t * 1.6);
          v = (v + 4) / 8;
          const g = Math.round(v * 255);
          const o = (y * cols + x) * 4;
          img.data[o] = img.data[o + 1] = img.data[o + 2] = g;
          img.data[o + 3] = 255;
        }
      }
      sctx.putImageData(img, 0, 0);
    }

    function loop() {
      t += 0.05;
      const cols = P.cols;
      const rowsN = Math.round(cols * 0.42);
      if (P.cam && video.readyState >= 2) {
        src.width = cols; src.height = rowsN;
        sctx.save();
        sctx.scale(-1, 1); // mirror
        sctx.drawImage(video, -cols, 0, cols, rowsN);
        sctx.restore();
      } else {
        plasma(cols, rowsN);
      }
      const data = sctx.getImageData(0, 0, cols, rowsN).data;
      const chars = P.chars;
      let s = '';
      for (let y = 0; y < rowsN; y++) {
        for (let x = 0; x < cols; x++) {
          const o = (y * cols + x) * 4;
          let b = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255;
          if (P.invert) b = 1 - b;
          s += chars[Math.min(chars.length - 1, Math.floor(b * chars.length))];
        }
        s += '\n';
      }
      out.textContent = s;
      const r = view.getBoundingClientRect();
      out.style.fontSize = Math.max(4, Math.min((r.width / cols) * 1.62, r.height / rowsN)) + 'px';
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };
  }

  /* ============================================================
     6. INK RUNNER — endless jump game
     ============================================================ */
  function mountRunner(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view"><canvas></canvas></div>' +
      '  <div class="pg-rail">' +
      '    <h4>Ink Runner</h4>' +
      '    <p class="pg-note"><strong>Space</strong>, <strong>↑</strong> or <strong>tap</strong> to jump the glyphs. It gets faster. That is the whole game.</p>' +
      '    <div class="pg-btn-row"><button class="pg-btn" id="rnStart">Start</button></div>' +
      '    <div class="pg-stat" id="rnStat">—</div>' +
      '  </div>' +
      '</div>';

    const canvas = stage.querySelector('canvas');
    let { w, h, ctx } = fitCanvas(canvas);
    let raf = 0, last = 0;
    let best = 0;
    try { best = parseInt(localStorage.getItem('sohin-runner-best') || '0', 10); } catch (e) { /* private mode */ }

    const G = {
      state: 'ready', // ready | play | over
      y: 0, vy: 0,
      speed: 340,
      obs: [],
      spawnIn: 0.9,
      score: 0,
      squash: 0,
    };
    const R = 11;
    const GLYPHS = ['✦', '¶', '§', '†'];
    function groundY() { return h - 64; }

    function reset() {
      G.y = 0; G.vy = 0; G.speed = 340; G.obs = []; G.spawnIn = 0.9; G.score = 0; G.squash = 0;
    }
    function start() {
      reset();
      G.state = 'play';
      stage.querySelector('#rnStart').textContent = 'Restart';
    }
    function jump() {
      if (G.state === 'ready') { start(); return; }
      if (G.state === 'over') { start(); return; }
      if (G.y === 0) { G.vy = -640; }
    }

    stage.querySelector('#rnStart').addEventListener('click', start);
    canvas.addEventListener('pointerdown', jump);
    function onKey(e) {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
    }
    document.addEventListener('keydown', onKey);

    function onResize() { const f = fitCanvas(canvas); w = f.w; h = f.h; ctx = f.ctx; }
    window.addEventListener('resize', onResize);

    function step(dt) {
      G.speed = Math.min(G.speed + dt * 14, 880);
      G.score += dt * (G.speed / 32);

      // player physics (y is height above ground, negative = up in draw)
      G.vy += 1750 * dt;
      G.y += G.vy * dt;
      if (G.y > 0) { if (G.vy > 260) G.squash = 0.18; G.y = 0; G.vy = 0; }
      G.squash = Math.max(0, G.squash - dt * 0.9);

      // obstacles
      G.spawnIn -= dt;
      if (G.spawnIn <= 0) {
        G.spawnIn = 0.75 + Math.random() * 0.85 * (340 / G.speed) + 0.25;
        G.obs.push({
          x: w + 30,
          w: 15 + Math.random() * 14,
          h: 26 + Math.random() * 30,
          g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        });
      }
      for (const o of G.obs) o.x -= G.speed * dt;
      G.obs = G.obs.filter((o) => o.x > -60);

      // collision (player circle vs obstacle rect)
      const px = 92, py = groundY() + G.y - R;
      for (const o of G.obs) {
        const ox = Math.max(o.x, Math.min(px, o.x + o.w));
        const oy = Math.max(groundY() - o.h, Math.min(py, groundY()));
        if ((px - ox) * (px - ox) + (py - oy) * (py - oy) < (R - 1.5) * (R - 1.5)) {
          G.state = 'over';
          if (G.score > best) {
            best = Math.floor(G.score);
            try { localStorage.setItem('sohin-runner-best', String(best)); } catch (e) { /* private mode */ }
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const ink = inkRGB();
      const gy = groundY();

      // ground
      ctx.strokeStyle = 'rgba(' + ink + ',0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, gy + 1); ctx.lineTo(w, gy + 1); ctx.stroke();

      // obstacles as serif glyphs
      ctx.fillStyle = 'rgba(' + ink + ',0.9)';
      for (const o of G.obs) {
        ctx.font = 'italic ' + Math.round(o.h * 1.15) + 'px "Playfair Display", serif';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(o.g, o.x, gy - 1);
      }

      // player (squash & stretch)
      const sq = 1 - G.squash, st = 1 + G.squash * 0.9;
      ctx.save();
      ctx.translate(92, gy + G.y - R * sq);
      ctx.scale(st, sq);
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + ink + ',1)';
      ctx.fill();
      ctx.restore();

      // score
      ctx.font = '700 12px Manrope, sans-serif';
      ctx.fillStyle = 'rgba(' + ink + ',0.6)';
      ctx.textAlign = 'right';
      ctx.fillText(Math.floor(G.score) + '  ·  best ' + Math.max(best, Math.floor(G.state === 'over' ? G.score : 0)), w - 20, 30);
      ctx.textAlign = 'left';

      // state text
      if (G.state !== 'play') {
        ctx.textAlign = 'center';
        ctx.font = 'italic 500 30px "Playfair Display", serif';
        ctx.fillStyle = 'rgba(' + ink + ',0.95)';
        ctx.fillText(G.state === 'ready' ? 'tap or press space to run' : 'over — ' + Math.floor(G.score), w / 2, h / 2 - 12);
        ctx.font = '700 11px Manrope, sans-serif';
        ctx.fillStyle = 'rgba(' + ink + ',0.55)';
        ctx.fillText(G.state === 'ready' ? 'jump the falling type' : 'tap to run again', w / 2, h / 2 + 16);
        ctx.textAlign = 'left';
      }

      stage.querySelector('#rnStat').textContent =
        'score ' + Math.floor(G.score) + ' · best ' + best + ' · ' + Math.round(G.speed) + ' px/s';
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000 || 0, 0.033);
      last = now;
      if (G.state === 'play') step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return function () {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }

  /* ============================================================
     7. PAIRS — memory match
     ============================================================ */
  function mountPairs(stage) {
    stage.innerHTML =
      '<div class="pg-app">' +
      '  <div class="pg-view"><div class="pr-wrap"><div class="pr-grid" id="prGrid"></div><div class="pr-win" id="prWin" hidden><div class="pr-win-big" id="prWinText"></div><button class="pg-btn" id="prAgain">Play Again</button></div></div></div>' +
      '  <div class="pg-rail">' +
      '    <h4>Pairs</h4>' +
      '    <p class="pg-note">Flip two cards; matching glyphs stay open. Clear the board in as few moves as you can.</p>' +
      '    <div class="pg-btn-row"><button class="pg-btn" id="prReset">Shuffle</button></div>' +
      '    <div class="pg-stat" id="prStat">—</div>' +
      '  </div>' +
      '</div>';

    const grid = stage.querySelector('#prGrid');
    const winEl = stage.querySelector('#prWin');
    const GLYPHS = ['∿', '✦', '◐', '⌘', '▞', '✳', '†', '§'];
    let first = null, lock = false, moves = 0, matched = 0, t0 = 0, timer = 0;
    let bestMoves = 0;
    try { bestMoves = parseInt(localStorage.getItem('sohin-pairs-best') || '0', 10); } catch (e) { /* private mode */ }

    function stat() {
      const secs = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
      stage.querySelector('#prStat').textContent =
        moves + ' moves · ' + secs + 's · best ' + (bestMoves || '—');
    }

    function deal() {
      clearInterval(timer);
      first = null; lock = false; moves = 0; matched = 0; t0 = 0;
      winEl.hidden = true;
      const deck = GLYPHS.concat(GLYPHS)
        .map((g) => ({ g: g, r: Math.random() }))
        .sort((a, b) => a.r - b.r);
      grid.innerHTML = '';
      deck.forEach((card) => {
        const b = el('<button class="pr-card"><span class="pr-in"><span class="pr-back">✕</span><span class="pr-face"></span></span></button>');
        b.querySelector('.pr-face').textContent = card.g;
        b.dataset.g = card.g;
        b.addEventListener('click', () => flip(b));
        grid.appendChild(b);
      });
      timer = setInterval(stat, 1000);
      stat();
    }

    function flip(card) {
      if (lock || card.classList.contains('open') || card.classList.contains('done')) return;
      if (!t0) t0 = Date.now();
      card.classList.add('open');
      if (!first) { first = card; return; }
      moves++;
      if (first.dataset.g === card.dataset.g) {
        first.classList.add('done');
        card.classList.add('done');
        first = null;
        matched++;
        if (matched === GLYPHS.length) win();
      } else {
        lock = true;
        const a = first;
        first = null;
        setTimeout(() => { a.classList.remove('open'); card.classList.remove('open'); lock = false; }, 650);
      }
      stat();
    }

    function win() {
      clearInterval(timer);
      const secs = Math.floor((Date.now() - t0) / 1000);
      if (!bestMoves || moves < bestMoves) {
        bestMoves = moves;
        try { localStorage.setItem('sohin-pairs-best', String(bestMoves)); } catch (e) { /* private mode */ }
      }
      stage.querySelector('#prWinText').textContent = 'Cleared in ' + moves + ' moves · ' + secs + 's';
      winEl.hidden = false;
      stat();
    }

    stage.querySelector('#prReset').addEventListener('click', deal);
    stage.querySelector('#prAgain').addEventListener('click', deal);
    deal();

    return function () { clearInterval(timer); };
  }

  /* ============================================================
     Modal management
     ============================================================ */
  const APPS = {
    waves: { title: '∿ Wave Shader', mount: mountWaves },
    particles: { title: '✦ Particle Field', mount: mountParticles },
    theme: { title: '◐ Theme Engine', mount: mountTheme },
    cmdk: { title: '⌘ CmdK Menu', mount: mountCmdk },
    ascii: { title: '▞ ASCII Cam', mount: mountAscii },
    runner: { title: '◉ Ink Runner', mount: mountRunner },
    pairs: { title: '⧉ Pairs', mount: mountPairs },
  };

  function openApp(name) {
    const app = APPS[name];
    if (!app) return;
    if (cleanup) { cleanup(); cleanup = null; }
    stage.innerHTML = '';
    titleEl.textContent = app.title;
    modal.hidden = false;
    currentApp = name;
    cleanup = app.mount(stage);
  }

  function closeModal() {
    if (cleanup) { cleanup(); cleanup = null; }
    stage.innerHTML = '';
    modal.hidden = true;
    modal.classList.remove('ink');
    currentApp = null;
  }

  document.querySelectorAll('.pg-cell[data-app]').forEach((cell) => {
    cell.addEventListener('click', () => openApp(cell.dataset.app));
  });
  closeBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (currentApp === 'cmdk' && stage.__openPalette) stage.__openPalette();
      else openApp('cmdk');
    }
  });
})();
