// screenshot a test page on the GPU:  node snap.mjs page.html out.png [width height]
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [,, page, out, w = '1600', h = '900'] = process.argv; const root = path.resolve('web');
const types = { '.js': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpeg': 'image/jpeg' };
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: +w, height: +h } });
pg.on('pageerror', e => console.log('ERR', e.message)); pg.on('console', m => { if (!m.text().includes('GL Driver')) console.log('PAGE', m.text()); });
await pg.goto(`http://localhost:${srv.address().port}/${page}`); await pg.waitForFunction(() => window.done || window.err, null, { timeout: 60000 }).catch(() => console.log('timeout'));
await pg.screenshot({ path: out }); await b.close(); srv.close();
