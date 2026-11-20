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

// Play section motion once as each target enters the viewport.
(() => {
  if (!('IntersectionObserver' in window)) return;
  const targets = document.querySelectorAll('[data-principle-people], [data-principle-flow], [data-garpa-reveal]');
  if (!targets.length) return;

  const visibilityThreshold = .55;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.intersectionRatio < visibilityThreshold) continue;
      entry.target.dataset.motion = 'playing';
      observer.unobserve(entry.target);
    }
  }, { threshold: visibilityThreshold });

  for (const target of targets) {
    target.dataset.motion = 'ready';
    observer.observe(target);
  }
})();

(() => {
  const canvas = document.querySelector('.agency-gaia-solution-dots');
  const context = canvas?.getContext('2d');
  if (!context) return;

  const size = 800;
  const spacing = 10;
  const columns = size / spacing;
  const opacity = Float32Array.from({ length: columns * columns }, () => Math.random() * .1);
  const scale = window.devicePixelRatio || 1;
  canvas.width = size * scale;
  canvas.height = size * scale;
  context.scale(scale, scale);
  context.fillStyle = '#000';

  function draw() {
    context.clearRect(0, 0, size, size);
    for (let index = 0; index < opacity.length; index++) {
      context.globalAlpha = opacity[index];
      context.fillRect((index % columns) * spacing, Math.floor(index / columns) * spacing, 4, 4);
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let last = 0;
  function animate(now) {
    const chance = Math.min(.1, (now - last) * .0001);
    last = now;
    for (let index = 0; index < opacity.length; index++) {
      if (Math.random() < chance) opacity[index] = Math.random() * .1;
    }
    draw();
    frame = requestAnimationFrame(animate);
  }

  let visible = false;
  function syncAnimation() {
    if (visible && !reducedMotion.matches) {
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(animate);
      }
    } else {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  }
  draw();
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncAnimation();
  }).observe(canvas);
  reducedMotion.addEventListener('change', syncAnimation);
})();

(() => {
  const section = document.querySelector('.agency-gaia-steps');
  if (!section) return;

  const categoryList = section.querySelector('.agency-gaia-category-tabs');
  const categories = [...categoryList.querySelectorAll('[role="tab"]')];
  const groups = categories.map(tab => {
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    const layout = panel.querySelector('.agency-gaia-steps-layout');
    const list = layout.querySelector('[role="tablist"]');
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const previews = tabs.map(detail => document.getElementById(detail.getAttribute('aria-controls')));
    return { panel, layout, list, tabs, previews, selected: 0 };
  });
  const desktop = matchMedia('(min-width: 1024px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  let activeCategory = 0;
  let timer;
  let visible = false;

  function updateTabs(tabs, panels, selected) {
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-selected', String(index === selected));
      tab.tabIndex = index === selected ? 0 : -1;
      panels[index].hidden = index !== selected;
    });
  }

  function midpoint(element) {
    const { left, width } = element.getBoundingClientRect();
    return left + width / 2;
  }

  function centerDetail(group, smooth) {
    if (desktop.matches || group.panel.hidden) return;
    group.list.scrollTo({
      left: group.list.scrollLeft + midpoint(group.tabs[group.selected]) - midpoint(group.list),
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant'
    });
  }

  function schedule() {
    clearTimeout(timer);
    const group = groups[activeCategory];
    const playing = visible && !group.manualScrolling && !reducedMotion.matches && !document.hidden;
    group.layout.toggleAttribute('data-playing', playing);
    if (playing) timer = setTimeout(() => selectDetail(group, (group.selected + 1) % group.tabs.length), duration);
  }

  function selectDetail(group, index, scroll = true) {
    if (index === group.selected) return;
    group.selected = index;
    updateTabs(group.tabs, group.previews, index);
    if (scroll) centerDetail(group, true);
    schedule();
  }

  function positionCategoryIndicator(animate = false) {
    const { left, width } = categories[activeCategory].getBoundingClientRect();
    const listLeft = categoryList.getBoundingClientRect().left + categoryList.clientLeft;
    categoryList.toggleAttribute('data-indicator-animate', animate && !reducedMotion.matches);
    categoryList.style.setProperty("--gaia-tab-x", left - listLeft + "px");
    categoryList.style.setProperty("--gaia-tab-width", width + "px");
  }

  function selectCategory(index) {
    if (index === activeCategory) return;
    groups[activeCategory].layout.removeAttribute('data-playing');
    activeCategory = index;
    updateTabs(categories, groups.map(group => group.panel), index);
    positionCategoryIndicator(true);
    centerDetail(groups[index], false);
    schedule();
  }

  function bindTabs(list, tabs, select) {
    tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
    list.addEventListener('keydown', event => {
      const vertical = list.getAttribute('aria-orientation') === 'vertical';
      const previous = vertical ? 'ArrowUp' : 'ArrowLeft';
      const next = vertical ? 'ArrowDown' : 'ArrowRight';
      const index = tabs.indexOf(document.activeElement);
      let target;
      if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else if (event.key === previous) target = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === next) target = (index + 1) % tabs.length;
      else return;
      event.preventDefault();
      tabs[target].focus({ preventScroll: true });
      select(target);
    });
  }

  bindTabs(categoryList, categories, selectCategory);
  groups.forEach(group => {
    bindTabs(group.list, group.tabs, index => selectDetail(group, index));
    let touching = false;
    let settleTimer;
    let mouseDrag;
    let suppressMouseClick = false;

    function syncScrolledTab(centerTab = false) {
      if (touching || mouseDrag?.moved) return;
      clearTimeout(settleTimer);
      const wasManualScrolling = group.manualScrolling;
      group.manualScrolling = false;
      if (group.panel.hidden) return;
      if (!desktop.matches) {
        const center = midpoint(group.list);
        const index = group.tabs.reduce((closest, tab, i) =>
          Math.abs(midpoint(tab) - center) < Math.abs(midpoint(group.tabs[closest]) - center) ? i : closest, 0);
        if (index !== group.selected) {
          selectDetail(group, index, false);
          if (centerTab) centerDetail(group, false);
          return;
        }
      }
      if (centerTab) centerDetail(group, false);
      if (wasManualScrolling) schedule();
    }

    // Also settle after a tap or on browsers that do not fire scrollend.
    function queueScrollSettle() {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(syncScrolledTab, 180);
    }

    group.list.addEventListener('touchstart', () => {
      if (desktop.matches || group.panel.hidden) return;
      clearTimeout(settleTimer);
      touching = true;
      group.manualScrolling = true;
      schedule();
    }, { passive: true });
    function releaseTouch(event) {
      if (!touching || event.touches.length) return;
      touching = false;
      queueScrollSettle();
    }
    group.list.addEventListener('touchend', releaseTouch, { passive: true });
    group.list.addEventListener('touchcancel', releaseTouch, { passive: true });
    group.list.addEventListener('scroll', () => {
      if (group.manualScrolling && !touching && !mouseDrag?.moved) queueScrollSettle();
    }, { passive: true });
    group.list.addEventListener('scrollend', () => syncScrolledTab());

    group.list.addEventListener('pointerdown', event => {
      if (desktop.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressMouseClick = false;
      mouseDrag = { id: event.pointerId, x: event.clientX, left: group.list.scrollLeft, moved: false };
      // Keep ordinary clicks on the original button and keep tracking outside the list.
      event.target.setPointerCapture(event.pointerId);
    });
    group.list.addEventListener('pointermove', event => {
      if (mouseDrag?.id !== event.pointerId || desktop.matches) return;
      const distance = event.clientX - mouseDrag.x;
      if (!mouseDrag.moved) {
        if (Math.abs(distance) < 6) return;
        mouseDrag.moved = true;
        clearTimeout(settleTimer);
        group.manualScrolling = true;
        group.list.setAttribute('data-mouse-dragging', '');
        schedule();
      }
      group.list.scrollTo({ left: mouseDrag.left - distance, behavior: 'instant' });
    });
    function endMouseDrag(event) {
      if (mouseDrag?.id !== event.pointerId) return;
      const { moved } = mouseDrag;
      mouseDrag = null;
      if (!moved) return;
      suppressMouseClick = true;
      syncScrolledTab(true);
      group.list.removeAttribute('data-mouse-dragging');
    }
    group.list.addEventListener('pointerup', endMouseDrag);
    group.list.addEventListener('pointercancel', endMouseDrag);
    group.list.addEventListener('lostpointercapture', endMouseDrag);
    group.list.addEventListener('click', event => {
      if (!suppressMouseClick || !event.detail) return;
      suppressMouseClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  });

  function selectFromHash() {
    const index = categories.findIndex(tab => '#' + tab.id === location.hash);
    if (index < 0) return;
    selectCategory(index);
    section.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }

  document.querySelectorAll('.agency-gaia-solution-card').forEach(card => {
    card.addEventListener('click', event => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = categories.findIndex(tab => '#' + tab.id === card.hash);
      if (index < 0) return;
      event.preventDefault();
      if (location.hash !== card.hash) history.pushState(null, '', card.hash);
      categories[index].focus({ preventScroll: true });
      selectFromHash();
    });
  });
  addEventListener('hashchange', selectFromHash);

  function updateOrientation() {
    for (const group of groups) group.list.setAttribute('aria-orientation', desktop.matches ? 'vertical' : 'horizontal');
    centerDetail(groups[activeCategory], false);
  }

  desktop.addEventListener('change', updateOrientation);
  reducedMotion.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { rootMargin: '-12% 0px -20% 0px' }).observe(section);

  updateOrientation();
  selectFromHash();
  positionCategoryIndicator();
  categoryList.setAttribute("data-indicator-ready", "");
  // Resize updates follow the buttons immediately instead of animating toward an old size.
  const categoryResize = new ResizeObserver(() => positionCategoryIndicator());
  categoryResize.observe(categoryList);
  categories.forEach(tab => categoryResize.observe(tab));
})();

// ezPAPER service tabs share the GAIA category tab appearance.
(() => {
  const list = document.querySelector('.paper-navigation[role="tablist"]');
  if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  let selected = 0;

  function positionIndicator(animate = false) {
    const rect = tabs[selected].getBoundingClientRect();
    list.toggleAttribute('data-indicator-animate', animate);
    list.style.setProperty('--gaia-tab-x', `${rect.left - list.getBoundingClientRect().left - list.clientLeft}px`);
    list.style.setProperty('--gaia-tab-width', `${rect.width}px`);
    list.setAttribute('data-indicator-ready', '');
  }

  function select(index) {
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    positionIndicator(true);
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
  list.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const targets = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    select(targets[event.key]);
    tabs[selected].focus();
  });
  const observer = new ResizeObserver(() => positionIndicator());
  observer.observe(list);
  tabs.forEach(tab => observer.observe(tab));
  document.fonts.ready.then(() => positionIndicator());
  positionIndicator();
})();

(() => {
  const form = document.getElementById('agency-inquiry-form');
  if (!form) return;

  const email = form.elements.namedItem('email');
  const phone = form.elements.namedItem('tel');
  const consent = form.elements.namedItem('privacy_policy_agree');
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[role="status"]');
  const personalDomains = new Set(['gmail.com', 'naver.com', 'hanmail.net', 'nate.com', 'daum.net', 'kakao.com']);
  const fields = [...form.querySelectorAll('input[required], textarea[required]')];
  const errors = new Map(fields.map(field => {
    const message = document.createElement('span');
    message.className = 'agency-inquiry-error';
    message.id = `inquiry-error-${field.name}`;
    field.after(message);
    field.addEventListener('input', () => {
      if (field.hasAttribute('aria-invalid')) validateField(field);
    });
    return [field, message];
  }));

  function phoneDigits() {
    return phone.value.replace(/[\s()-]/g, '');
  }

  function validateField(field) {
    const value = field.value.trim();
    let error = '';
    if (!value) {
      error = '필수 필드를 입력하십시오.';
    } else if (field === email) {
      const domain = value.split('@').pop().toLowerCase();
      if (email.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = '이메일 형식이 정확해야 합니다.';
      } else if (personalDomains.has(domain)) {
        error = '회사 이메일 주소를 입력하십시오. 이 양식에서는 gmail.com 등의 주소를 사용할 수 없습니다.';
      }
    } else if (field === phone && !/^\d{2,11}$/.test(phoneDigits())) {
      error = '입력한 연락처가 정확하지 않습니다.';
    }
    const message = errors.get(field);
    message.textContent = error;
    if (error) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', message.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
    return !error;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) return;
    if (!consent.checked) {
      consent.focus();
      return;
    }

    const body = new FormData(form);
    body.set('tel', phoneDigits());
    button.disabled = true;
    status.textContent = '문의를 전송하고 있습니다.';
    try {
      const response = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error('Inquiry submission failed');
      form.reset();
      status.textContent = '문의가 접수되었습니다. 담당팀에서 연락드리겠습니다.';
    } catch {
      status.textContent = '문의가 전송되지 않았습니다. 잠시 후 다시 시도하거나 02-582-1570으로 전화해 주세요.';
    } finally {
      button.disabled = false;
    }
  });
  button.disabled = false;
})();
