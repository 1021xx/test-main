const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fill = (source, values) => source.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');

function getPages() { return JSON.parse(read('pages/pages.json')); }

function common(currentPath = '/') {
  const pages = getPages().filter(page => page.navigation !== false);
  const navigation = pages.map(page => `<a class="agency-nav-link" href="${escapeHtml(page.path)}"${page.path === currentPath ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a>`).join('');
  const header = fill(read('shared/header.html'), { navigation });
  const footer = fill(read('shared/footer.html'), {
    companyLink: `<a href="/company">회사소개</a>`,
    productLinks: pages.filter(page => page.path !== '/company').map(page => `<li><a href="${escapeHtml(page.path)}"${page.path === currentPath ? ' aria-current="page"' : ''}>${escapeHtml(page.title)}</a></li>`).join('')
  });
  return { header, footer, cta: read('shared/cta.html') };
}

function renderPage(page, { inquiryAccessKey = '' } = {}) {
  const shared = common(page.path);
  const layout = read('shared/layout.html');
  const template = page.path === '/inquiry' ? layout.replace(/^[ \t]*\{\{cta\}\}\r?\n/m, '') : layout;
  return fill(template, {
    title: escapeHtml(page.title),
    header: shared.header,
    footer: shared.footer,
    cta: shared.cta,
    content: fill(read(`pages/${page.template}`), {
      title: escapeHtml(page.title),
      inquiryAccessKey: escapeHtml(inquiryAccessKey),
      inquiryTemplateOpen: inquiryAccessKey ? '' : '<template>',
      inquiryTemplateClose: inquiryAccessKey ? '' : '</template>\n\n'
    })
  });
}

function renderHome() {
  const shared = common('/');
  // Inline data is escaped as script content, not as HTML attributes.
  const payload = JSON.stringify({ header: shared.header, footer: shared.footer }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return read('index.html')
    .replace(/href="#">(도입문의|원격지원)<\/a>/g, (_, label) => 'href="' + (label === '도입문의' ? '/inquiry' : 'https://113366.com/agencypro') + '">' + label + '</a>')
    .replace(/(\\"href\\":\\")#(\\"(?:,\\"className\\":\\"[^"]*\\")?,\\"children\\":\\"(도입문의|원격지원)\\")/g, (_, prefix, suffix, label) => prefix + (label === '도입문의' ? '/inquiry' : 'https://113366.com/agencypro') + suffix)
    .replace('href="https://113366.com/agencypro">원격지원</a>', 'href="https://113366.com/agencypro" target="_blank" rel="noopener noreferrer">원격지원</a>')
    .replace(String.raw`\"href\":\"https://113366.com/agencypro\",`, String.raw`\"href\":\"https://113366.com/agencypro\",\"target\":\"_blank\",\"rel\":\"noopener noreferrer\",`)
    .replace('<head>', `<head>\n<script id="agency-common-data">window.__AGENCY_COMMON__=${payload};</script>`)
    .replace('</head>', '<link rel="stylesheet" href="/shared/site.css">\n<script src="/shared/site.js" defer></script>\n</head>')
    .replace(/<header\b[\s\S]*?<\/header>/, `<header class="agency-site-header">${shared.header}</header>`)
    .replace(/<footer\b[\s\S]*?<\/footer>/, `<footer id="footer" class="w-full pb-0 agency-site-footer">${shared.footer}</footer>`);
}

module.exports = { getPages, renderPage, renderHome };
