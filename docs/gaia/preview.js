(() => {
  gsap.registerPlugin(ScrollTrigger);

  let preview = null;
  let lastWidth = 0;

  function updateScale() {
    if (!preview?.isConnected) return;

    const width = preview.getBoundingClientRect().width;
    if (!width || width === lastWidth) return;

    lastWidth = width;
    preview.style.setProperty('--gaia-scale', width / 1400);
    ScrollTrigger.refresh();
  }

  const resizeObserver = new ResizeObserver(updateScale);

  function bindPreview() {
    if (preview?.isConnected) return;

    const nextPreview = document.getElementById('gaia-preview');
    if (nextPreview === preview) return;

    resizeObserver.disconnect();
    preview = nextPreview;
    lastWidth = 0;
    if (!preview) return;

    resizeObserver.observe(preview);
    updateScale();
  }

  bindPreview();
  // React can replace the preview element during its initial render.
  new MutationObserver(bindPreview).observe(document.body, { childList: true, subtree: true });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
