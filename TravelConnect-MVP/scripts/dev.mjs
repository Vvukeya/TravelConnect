import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { api } from '../server/api.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
export function createServer(){return http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://www.gstatic.com https://apis.google.com https://www.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.firebaseapp.com; frame-src 'self' https://*.firebaseapp.com https://*.web.app https://accounts.google.com https://www.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
 if(req.socket.encrypted || (process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https'))res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 let url;try{url=new URL(req.url,'http://localhost')}catch {res.writeHead(400);res.end('Bad request');return}
 if(url.pathname.startsWith('/api/v1/')) {await api(req,res,url);return}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);res.end('Bad request');return}
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)||file===root||path.basename(file).startsWith('.')){res.writeHead(403);res.end('Forbidden');return}
 try{if(!(await stat(file)).isFile())throw Error('Not found');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':data)}catch{res.writeHead(404);res.end('Not found')}
})}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||5500),host=process.env.HOST||'127.0.0.1';
 createServer().listen(port,host,()=>console.log(`TravelConnect API + PWA at http://${host==='0.0.0.0'?'localhost':host}:${port}`));
}
