const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fill = (source, values) => source.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
const sharedFiles = {
  '/shared/site.css': { file: 'shared/site.css', type: 'text/css; charset=utf-8' },
  '/shared/site.js': { file: 'shared/site.js', type: 'application/javascript; charset=utf-8' },
  '/shared/theme.js': { file: 'shared/theme.js', type: 'application/javascript; charset=utf-8' }
};

function getPages() { return JSON.parse(read('pages/pages.json')); }

function common(currentPath = '/') {
  const pages = getPages();
  const navigation = pages.map(page => `<a class="agency-nav-link" href="${escapeHtml(page.path)}"${page.path === currentPath ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a>`).join('');
  const header = fill(read('shared/header.html'), { navigation });
  const footer = fill(read('shared/footer.html'), {
    companyLink: `<a href="/company">회사소개</a>`,
    productLinks: pages.filter(page => page.path !== '/company').map(page => `<li><a href="${escapeHtml(page.path)}"${page.path === currentPath ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a></li>`).join('')
  });
  return { header, footer, cta: read('shared/cta.html') };
}

function renderPage(page) {
  const shared = common(page.path);
  return fill(read('shared/layout.html'), {
    title: escapeHtml(page.title),
    header: shared.header,
    footer: shared.footer,
    cta: shared.cta,
    content: fill(read(`pages/${page.template}`), { title: escapeHtml(page.title) })
  });
}

function renderHome() {
  const shared = common('/');
  // Inline data is escaped as script content, not as HTML attributes.
  const payload = JSON.stringify({ header: shared.header, footer: shared.footer }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return read('index.html')
    .replace('<head>', `<head>\n<script id="agency-common-data">window.__AGENCY_COMMON__=${payload};</script>`)
    .replace('</head>', '<link rel="stylesheet" href="/shared/site.css">\n<script src="/shared/site.js" defer></script>\n</head>')
    .replace(/<header\b[\s\S]*?<\/header>/, `<header class="agency-site-header">${shared.header}</header>`)
    .replace(/<footer\b[\s\S]*?<\/footer>/, `<footer id="footer" class="w-full pb-0 agency-site-footer">${shared.footer}</footer>`);
}

module.exports = { getPages, renderPage, renderHome, sharedFiles };
