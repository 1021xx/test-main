// Apply the persisted theme before first paint, including on direct page loads.
(() => {
  let theme;
  try { theme = localStorage.getItem('theme'); } catch {}
  const dark = theme === 'dark' || ((!theme || theme === 'system') && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(dark ? 'dark' : 'light');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
