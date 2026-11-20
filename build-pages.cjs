const fs = require('node:fs');
const path = require('node:path');
const manifest = require('./manifest.json');
const { getPages, renderHome, renderPage, sharedFiles } = require('./lib/site.cjs');
const { adaptHomeAsset } = require('./lib/legacy-home.cjs');

const output = path.join(__dirname, 'docs');
const base = '/test-main';
const routes = new Map();
const files = new Map();
const extensions = {
  'image/avif': '.avif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
};

for (const [request, asset] of Object.entries({ ...manifest, ...sharedFiles })) {
  const [pathname, query] = request.split('?');
  const mime = asset.type.split(';')[0];
  let target = pathname === '/' ? '/index.html' : pathname;
  if ((query && mime.startsWith('image/')) || pathname.startsWith('/__external/')) {
    const extension = extensions[mime];
    if (!extension) throw new Error(`Unsupported image type: ${mime}`);
    target = `/saved-images/${path.basename(asset.file)}${extension}`;
    routes.set(request, base + target);
    routes.set(request.replaceAll('&', '&amp;'), base + target);
  }
  if (pathname === '/ezpaper.png') {
    target = '/assets/ezpaper.svg';
    routes.set(pathname, base + target);
  }
  if (files.has(target) && files.get(target).file !== asset.file) {
    throw new Error(`Multiple files map to ${target}`);
  }
  files.set(target, asset);
}

const routePattern = new RegExp(
  [...routes.keys()].sort((a, b) => b.length - a.length)
    .map((route) => route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g',
);

const pages = getPages();
const pageLinks = new Map([['/', '/'], ...pages.map(({ path }) => [path, path + '/'])]);

function rewriteForPages(content) {
  return content
    .replace(routePattern, (route) => routes.get(route))
    .replace(/(?<![\w/])\/(?:_next|assets|gaia|company|shared)\//g, (prefix) => base + prefix)
    .replace(/(?<![\w/])\/(?:favicon\.svg|agent-cta-background\.png)\b/g, (url) => base + url)
    .replace(/(\bhref=\\?")(\/[^\\?"#\s]*)(?=[#?]|\\?")/g, (match, attribute, pathname) => (
      pageLinks.has(pathname) ? attribute + base + pageLinks.get(pathname) : match
    ))
    .replace(/((?:\\?"href\\?"|\bhref):\s*\\?")(\/[^\\?"#\s]*)(?=[#?]|\\?")/g, (match, attribute, pathname) => (
      pageLinks.has(pathname) ? attribute + base + pageLinks.get(pathname) : match
    ))
    .replace(/(\\"src\\":\\"\/test-main\/agent-cta-background\.png\\",)/g, '$1\\"unoptimized\\":true,')
    .replace(/<script src="[^"]*\/polyfills-42372ed130431b0a\.js[^"]*"\s+noModule=""><\/script>/g, '');
}

for (const [target, asset] of files) {
  const source = path.join(__dirname, asset.file);
  const destination = path.join(output, target.slice(1));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (/^(text\/(html|css)|application\/javascript)/.test(asset.type)) {
    const content = target === '/index.html' ? renderHome() : adaptHomeAsset(asset.file, fs.readFileSync(source, 'utf8'));
    fs.writeFileSync(destination, rewriteForPages(content));
  } else {
    fs.copyFileSync(source, destination);
  }
}
for (const page of pages) {
  const destination = path.join(output, page.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, rewriteForPages(renderPage(page)));
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Wrote ${files.size} files to docs/`);
