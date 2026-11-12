import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { deployment } from './deployment-config.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const {port, path: basePath, url} = deployment.game;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.txt':'text/plain; charset=utf-8' };
const wantsOpen=process.argv.includes('--open')||process.argv.includes('--open-catalog');
const open=()=>{if(wantsOpen)spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${url}${process.argv.includes('--open-catalog')?'development/catalog/':''}'`],{windowsHide:true,stdio:'ignore'}).unref();};
const server=createServer(async (req, res) => {
  try {
    const requestPath = new URL(req.url || '/', 'http://localhost').pathname;
    if (requestPath === basePath.slice(0, -1)) {
      res.writeHead(308, {Location: basePath + new URL(req.url, 'http://localhost').search}).end(); return;
    }
    // Both public and backend requests include the complete project path.
    // Forwarded headers are deliberately not used to prepend or remove it.
    if (!requestPath.startsWith(basePath) || requestPath === deployment.reference.path.slice(0, -1) || requestPath.startsWith(deployment.reference.path)) {
      res.writeHead(404).end('Not found'); return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow: 'GET, HEAD'}).end(); return; }
    const pathname = decodeURIComponent('/' + requestPath.slice(basePath.length));
    // Expose only the generated build through this virtual path. Never expose
    // .local-setup itself, tool installations, profiles, caches or logs.
    const isBuild=pathname.startsWith('/build/');
    const base=isBuild?resolve(root,'.local-setup/build'):root;
    const requested=isBuild?pathname.slice('/build'.length):pathname;
    const path = resolve(base, '.' + (requested.endsWith('/') ? requested + 'index.html' : requested));
    const local = relative(base, path);
    const parts = local.split(sep);
    if (local.startsWith('..') || parts.some(p => p.startsWith('.')) || !(isBuild?['modules','offline']:['index.html','dist','src','assets','development']).includes(parts[0])) {
      res.writeHead(403).end('Not served'); return;
    }
    const info = await stat(path);
    if (info.isDirectory() && !requestPath.endsWith('/')) {
      res.writeHead(308, {Location: requestPath + '/' + new URL(req.url, 'http://localhost').search}).end(); return;
    }
    if (!info.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else createReadStream(path).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error',async error=>{
  if(error.code==='EADDRINUSE'&&wantsOpen){
    try{const response=await fetch(url,{signal:AbortSignal.timeout(2000)});if(response.ok&&/<title>(?:Afresh )?Madrasi Dhaba<\/title>/.test(await response.text())){console.log(`Using the running local game: ${url}`);open();return;}}catch{}
  }
  console.error(`Could not start the local game server: ${error.message}`);process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{console.log(`Madrasi Dhaba: ${url}\nDevelopment catalogue: ${url}development/catalog/`);open();});
