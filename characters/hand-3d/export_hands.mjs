import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve('web'), dest = process.argv[2]; fs.mkdirSync(dest, { recursive: true });
const srv = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); fs.createReadStream(p).pipe(s); }).listen(0);
await new Promise(r => srv.on('listening', r));
const b = await chromium.launch(); const pg = await b.newPage(); pg.on('pageerror', e => console.log('ERR', e.message));
await pg.goto(`http://localhost:${srv.address().port}/handexport.html`); await pg.waitForFunction(() => window.done, null, { timeout: 60000 });
const out = await pg.evaluate(() => window.out);
for (const [k, v] of Object.entries(out)) fs.writeFileSync(path.join(dest, k + '.glb'), Buffer.from(v, 'base64'));
console.log(Object.keys(out).length, 'glb files'); await b.close(); srv.close();
