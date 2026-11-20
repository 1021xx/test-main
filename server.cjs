const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('./manifest.json');
const { getPages, renderHome, renderPage } = require('./lib/site.cjs');
const { adaptHomeAsset, adaptedFiles } = require('./lib/legacy-home.cjs');

function createServer() {
  return http.createServer((req, res) => {
    const send = (status, type, body) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return send(405, 'text/plain; charset=utf-8', 'Method not allowed');
      }
      const url = new URL(req.url, 'http://localhost');
      const normalizedPath = url.pathname.replace(/\/$/, '') || '/';
      const page = getPages().find(item => item.path === normalizedPath);
      if (page && normalizedPath !== url.pathname) {
        res.writeHead(308, { Location: normalizedPath + url.search });
        return res.end();
      }
      if (normalizedPath === '/') return send(200, 'text/html; charset=utf-8', renderHome());
      if (page) return send(200, 'text/html; charset=utf-8', renderPage(page, {
        inquiryAccessKey: process.env.WEB3FORMS_ACCESS_KEY?.trim()
      }));

      // Only registered assets are served; source templates and server files stay private.
      const item = manifest[url.pathname + url.search] || manifest[url.pathname];
      if (!item) return send(404, 'text/plain; charset=utf-8', 'Not found');
      let data = fs.readFileSync(path.join(__dirname, item.file));
      if (adaptedFiles.includes(item.file.replaceAll('\\', '/'))) data = adaptHomeAsset(item.file, data.toString('utf8'));
      return send(200, item.type, data);
    } catch (error) {
      console.error(error);
      send(error.code === 'ENOENT' ? 404 : 500, 'text/plain; charset=utf-8', error.code === 'ENOENT' ? 'Not found' : 'Unable to render page');
    }
  });
}

if (require.main === module) {
  createServer().listen(4186, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4186'));
}
module.exports = { createServer };
