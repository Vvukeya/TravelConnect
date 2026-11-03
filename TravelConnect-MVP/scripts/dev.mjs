import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
const port = Number(process.env.PORT || 5500);
const contentTypes = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server = http.createServer(async (req,res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);res.end('Method not allowed');return;}
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch {res.writeHead(400);res.end('Bad request');return;}
  const filePath = path.resolve(root, '.' + (requested.endsWith('/') ? `${requested}index.html` : requested));
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {res.writeHead(403);res.end('Forbidden');return;}
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not found');
    const contents = await readFile(filePath);
    res.writeHead(200, {'Content-Type':contentTypes[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?'':contents);
  } catch {res.writeHead(404, {'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(port, '127.0.0.1', ()=> console.log(`TravelConnect at http://localhost:${port}`));
