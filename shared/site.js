(() => {
  const root = document.documentElement;
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const desktop = matchMedia('(min-width: 1024px)');
  const header = () => document.querySelector('.agency-site-header');
  let storedTheme;
  try { storedTheme = localStorage.getItem('theme'); } catch {}

  function updateTheme(theme) {
    const dark = theme === 'dark' || ((!theme || theme === 'system') && systemTheme.matches);
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
    });
    window.dispatchEvent(new CustomEvent('agency-theme-change', { detail: theme || 'system' }));
  }

  function closeMenu(restoreFocus = false) {
    const menu = document.getElementById('agency-mobile-nav');
    const toggle = document.querySelector('[data-menu-toggle]');
    if (menu) menu.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', '메뉴 열기');
    if (restoreFocus) toggle?.focus();
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-theme-toggle]')) {
      storedTheme = root.classList.contains('dark') ? 'light' : 'dark';
      try { localStorage.setItem('theme', storedTheme); } catch {}
      updateTheme(storedTheme);
    }
    const toggle = target?.closest('[data-menu-toggle]');
    if (toggle) {
      const menu = document.getElementById('agency-mobile-nav');
      if (!menu) return;
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
      toggle.setAttribute('aria-label', menu.hidden ? '메뉴 열기' : '메뉴 닫기');
    } else if (!target?.closest('#agency-mobile-nav')) closeMenu();

    const link = target?.closest('a');
    if (link?.closest('#agency-mobile-nav')) closeMenu();
    // The saved homepage has legacy inquiry anchors; point them to existing contact details.
    if (link?.getAttribute('href') === '#' && link.textContent.trim() === '도입문의') {
      event.preventDefault();
      document.getElementById('footer')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('agency-mobile-nav')?.hidden === false) closeMenu(true);
  });
  function syncHeader() { header()?.setAttribute('data-scrolled', String(scrollY > 10)); }
  window.addEventListener('scroll', syncHeader, { passive: true });
  systemTheme.addEventListener('change', () => { if (!storedTheme || storedTheme === 'system') updateTheme(storedTheme); });
  window.addEventListener('storage', event => { if (event.key === 'theme') { storedTheme = event.newValue; updateTheme(storedTheme); } });
  desktop.addEventListener('change', () => { if (desktop.matches) closeMenu(); });
  updateTheme(storedTheme);
  syncHeader();
  // Also sync once when the legacy homepage finishes mounting its React tree.
  window.addEventListener('load', () => { updateTheme(storedTheme); syncHeader(); });
  window.addEventListener('agency-header-mounted', () => { updateTheme(storedTheme); syncHeader(); });
})();

// Restore the original shared, spring-driven desktop menu hover pill.
(() => {
  const mounted = new WeakSet();
  function mount() {
    const nav = document.querySelector('.agency-desktop-nav');
    if (!nav || mounted.has(nav)) return;
    mounted.add(nav);
    const pill = document.createElement('span');
    pill.className = 'agency-nav-highlight';
    pill.setAttribute('aria-hidden', 'true');
    nav.append(pill);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let active, frame, previous = 0, x = 0, width = 0, vx = 0, vw = 0, tx = 0, tw = 0;
    function paint() {
      pill.style.transform = `translateX(${x}px)`;
      pill.style.width = `${width}px`;
    }
    function tick(time) {
      const dt = Math.min((time - previous) / 1000 || 1 / 60, 1 / 60);
      previous = time;
      vx += (400 * (tx - x) - 30 * vx) * dt;
      vw += (400 * (tw - width) - 30 * vw) * dt;
      x += vx * dt;
      width += vw * dt;
      if (Math.abs(tx - x) + Math.abs(tw - width) + Math.abs(vx) + Math.abs(vw) < .1) {
        x = tx; width = tw; frame = undefined;
      } else frame = requestAnimationFrame(tick);
      paint();
    }
    function show(link) {
      if (!link) return;
      tx = link.offsetLeft; tw = link.offsetWidth;
      if (!active || reduced.matches) {
        cancelAnimationFrame(frame); frame = undefined;
        x = tx; width = tw; vx = vw = 0; paint();
      }
      active = link;
      pill.style.opacity = '1';
      if (!frame && !reduced.matches) { previous = 0; frame = requestAnimationFrame(tick); }
    }
    function hide() {
      active = null;
      pill.style.opacity = '0';
      cancelAnimationFrame(frame); frame = undefined;
    }
    nav.addEventListener('pointerover', event => show(event.target.closest('.agency-nav-link')));
    nav.addEventListener('pointerleave', hide);
    nav.addEventListener('focusin', event => show(event.target.closest('.agency-nav-link')));
    nav.addEventListener('focusout', event => { if (!nav.contains(event.relatedTarget)) hide(); });
    new ResizeObserver(() => { if (active) show(active); }).observe(nav);
  }
  mount();
  window.addEventListener('load', mount);
  window.addEventListener('agency-header-mounted', mount);
})();

// Read Along adapts DesignBookmark's word highlight and spring settings.
(() => {
  const heading = document.querySelector('[data-read-along]');
  if (!heading) return;

  const words = [...heading.querySelectorAll('[data-read-word]')];
  words.forEach(word => word.classList.add('agency-read-word'));
  const highlight = document.createElement('span');
  highlight.className = 'agency-read-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  heading.prepend(highlight);

  // These are the settings used by read.js, including its separate edge springs.
  const leadingEdge = [520, 40];
  const trailingEdge = [210, 26];
  const spring = ([stiffness, damping]) => ({ value: 0, velocity: 0, target: 0, stiffness, damping });
  const left = spring(leadingEdge);
  const right = spring(leadingEdge);
  const top = spring([600, 48]);
  const opacity = spring([300, 30]);
  const springs = [left, right, top, opacity];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = -1;
  let lineTop;
  const wordInterval = 500;
  let startedAt;
  let frame;
  let lastTime;

  function resetSpring(s, position) {
    s.value = s.target = position;
    s.velocity = 0;
  }

  function paintWords() {
    words.forEach((word, index) => {
      word.toggleAttribute('data-current', index === active);
      word.toggleAttribute('data-past', index < active);
    });
  }

  function positionHighlight() {
    const word = words[active].getBoundingClientRect();
    const bounds = heading.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(heading).fontSize) * .16;
    const start = word.left - bounds.left - padding;
    const end = word.right - bounds.left + padding;
    const row = word.top - bounds.top + (word.height - highlight.offsetHeight) / 2;
    const forward = start >= left.target;

    if (lineTop === undefined || Math.abs(lineTop - row) > 2 || opacity.value < .05) {
      // Open at the next line instead of crossing the gap diagonally.
      resetSpring(left, start);
      resetSpring(right, start);
      resetSpring(top, row);
    }
    lineTop = row;
    [left.stiffness, left.damping] = forward ? trailingEdge : leadingEdge;
    [right.stiffness, right.damping] = forward ? leadingEdge : trailingEdge;
    left.target = start;
    right.target = end;
    top.target = row;
  }

  function showWord(index) {
    active = index;
    opacity.target = 1;
    positionHighlight();
    paintWords();
  }

  function tick(time) {
    const elapsed = Math.min((time - (lastTime ?? time)) / 1000, 1 / 30);
    lastTime = time;
    const dt = elapsed / 4;
    const index = Math.floor(Math.max(0, time - startedAt) / wordInterval);
    const playing = index < words.length;
    if (!playing) opacity.target = 0;
    else if (index !== active) showWord(index);
    for (let substep = 0; substep < 4; substep++) {
      for (const s of springs) {
        const acceleration = s.stiffness * (s.target - s.value) - s.damping * s.velocity;
        s.velocity += acceleration * dt;
        s.value += s.velocity * dt;
      }
    }
    highlight.style.transform = `translate(${left.value}px, ${top.value}px)`;
    highlight.style.width = `${Math.max(0, right.value - left.value)}px`;
    highlight.style.opacity = String(Math.max(0, Math.min(1, opacity.value)));
    if (playing || opacity.value >= .01) {
      frame = requestAnimationFrame(tick);
    } else {
      clearReading();
    }
  }

  function clearReading() {
    cancelAnimationFrame(frame);
    frame = lastTime = undefined;
    active = -1;
    lineTop = undefined;
    resetSpring(opacity, 0);
    highlight.style.opacity = '0';
    heading.removeAttribute('data-reading');
    paintWords();
  }

  reduced.addEventListener('change', clearReading);
  const refreshPosition = () => {
    if (active < 0 || !heading.hasAttribute('data-reading')) return;
    lineTop = undefined;
    positionHighlight();
  };
  new ResizeObserver(refreshPosition).observe(heading);
  document.fonts?.ready.then(refreshPosition);

  if (!reduced.matches) {
    startedAt = performance.now();
    heading.setAttribute('data-reading', '');
    showWord(0);
    frame = requestAnimationFrame(tick);
  }
})();

// Original footer treatment: a flickering dot grid with responsive text.
(() => {
  const active = new WeakMap();
  function mount() {
    const canvas = document.querySelector('[data-footer-grid]');
    if (!canvas || active.has(canvas)) return;
    const container = canvas.parentElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame, visible = false, previousTime = 0, cols = 0, rows = 0;
    let opacity, textCells, ratio, gap;
    const compact = matchMedia('(max-width: 1024px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
        const index = x * rows + y;
        const alpha = textCells[index] ? Math.min(1, 3 * opacity[index] + .4) : opacity[index];
        context.fillStyle = `rgba(107,114,128,${alpha})`;
        context.fillRect(x * (2 + gap) * ratio, y * (2 + gap) * ratio, 2 * ratio, 2 * ratio);
      }
    }

    function resize() {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      ratio = devicePixelRatio || 1;
      gap = compact.matches ? 2 : 3;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      cols = Math.ceil(width / (2 + gap));
      rows = Math.ceil(height / (2 + gap));
      opacity = Float32Array.from({ length: cols * rows }, () => Math.random() * .3);
      textCells = new Uint8Array(cols * rows);
      const mask = document.createElement('canvas');
      mask.width = canvas.width;
      mask.height = canvas.height;
      const painter = mask.getContext('2d', { willReadFrequently: true });
      painter.scale(ratio, ratio);
      painter.fillStyle = 'white';
      let fontSize = compact.matches ? 70 : 90;
      const text = compact.matches ? 'AgencyPRO' : 'Streamline your workflow';
      const font = size => `600 ${size}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      painter.font = font(fontSize);
      const available = width - 2 * Math.min(16, width * .04);
      if (painter.measureText(text).width > available) fontSize *= available / painter.measureText(text).width;
      painter.font = font(fontSize);
      painter.textAlign = 'center';
      painter.textBaseline = 'middle';
      painter.fillText(text, width / 2, height / 2);
      const pixels = painter.getImageData(0, 0, mask.width, mask.height).data;
      for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
        const left = Math.floor(x * (2 + gap) * ratio), top = Math.floor(y * (2 + gap) * ratio);
        for (let px = left; px < Math.min(mask.width, left + 2 * ratio); px++) {
          for (let py = top; py < Math.min(mask.height, top + 2 * ratio); py++) {
            if (pixels[(py * mask.width + px) * 4] > 128) textCells[x * rows + y] = 1;
          }
        }
      }
      draw();
    }

    function tick(time) {
      if (!canvas.isConnected || !visible || reduced.matches) { frame = undefined; return; }
      const delta = previousTime ? (time - previousTime) / 1000 : 0;
      previousTime = time;
      for (let index = 0; index < opacity.length; index++) {
        if (Math.random() < .1 * delta) opacity[index] = Math.random() * .3;
      }
      draw();
      frame = requestAnimationFrame(tick);
    }
    function animate() {
      cancelAnimationFrame(frame);
      frame = undefined;
      previousTime = 0;
      if (visible && !reduced.matches) frame = requestAnimationFrame(tick);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; animate(); });
    intersection.observe(canvas);
    compact.addEventListener('change', resize);
    reduced.addEventListener('change', animate);
    active.set(canvas, true);
    resize();
    document.fonts.ready.then(() => { if (canvas.isConnected) resize(); });
  }
  mount();
  window.addEventListener('load', mount);
  window.addEventListener('agency-footer-mounted', mount);
})();

// Play each company principles graphic once when it enters the viewport.
(() => {
  if (!('IntersectionObserver' in window)) return;
  const graphics = document.querySelectorAll('[data-principle-people], [data-principle-flow]');
  if (!graphics.length) return;

  const visibilityThreshold = .55;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.intersectionRatio < visibilityThreshold) continue;
      entry.target.dataset.motion = 'playing';
      observer.unobserve(entry.target);
    }
  }, { threshold: visibilityThreshold });

  for (const graphic of graphics) {
    graphic.dataset.motion = 'ready';
    observer.observe(graphic);
  }
})();
