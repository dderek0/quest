// Zero-dependency static server for the Quest ✦ landing / voting page.
// Railway (and any host) runs `npm start` → this serves the folder on $PORT.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DIR = __dirname;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}'); }
  if (p === '/' || p === '') p = '/index.html';

  // contain to DIR (no path traversal)
  const file = path.join(DIR, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(DIR)) { res.writeHead(403); return res.end('forbidden'); }

  fs.readFile(file, (err, buf) => {
    if (err) { // fall back to the landing page
      return fs.readFile(path.join(DIR, 'index.html'), (e2, b2) => {
        if (e2) { res.writeHead(404); return res.end('not found'); }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(b2);
      });
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'public, max-age=300',
    });
    res.end(buf);
  });
}).listen(PORT, () => console.log('Quest landing on :' + PORT));
