// Reference-only server. Never copied to the native release.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,basename,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deployment} from '../internal/deployment-config.mjs';
const {port, path: basePath, url} = deployment.reference;
const root=fileURLToPath(new URL('../../',import.meta.url));
const canonical=await readFile(resolve(root,'reference/swf/extended.swf'));
const sha=createHash('sha256').update(canonical).digest('hex');
if(sha!=='9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a')throw Error('Canonical SWF changed');
createServer(async(req,res)=>{try{
  const requestPath=new URL(req.url,'http://localhost').pathname;
  if(requestPath===basePath.slice(0,-1)){res.writeHead(308,{Location:basePath+new URL(req.url,'http://localhost').search}).end();return;}
  if(!requestPath.startsWith(basePath)){res.writeHead(404).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
  const path='/'+requestPath.slice(basePath.length);
  let file;
  if(path==='/')file='tests/reference/player.html';
  else if(path==='/canonical.swf')file='reference/swf/extended.swf';
  else if(path==='/probe.swf')file='.local-setup/reference/probe.swf';
  else if(path==='/matched-day.swf')file='.local-setup/reference/matched-day.swf';
  else if(path.startsWith('/player/') && path==='/player/'+basename(path) && ['.js','.wasm','.map'].includes(extname(path)))file='.local-setup/ruffle/'+basename(path);
  else{res.writeHead(404).end();return;}
  const body=await readFile(resolve(root,file));
  const type={'.html':'text/html; charset=utf-8','.js':'application/javascript','.wasm':'application/wasm','.swf':'application/x-shockwave-flash'}[extname(file)]??'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Content-Length':body.length,'Cache-Control':'no-store','X-Reference-SHA256':sha,'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; worker-src 'self' blob:;"});res.end(req.method==='HEAD'?undefined:body);
}catch{res.writeHead(404).end('Reference file unavailable');}}).listen(port,'127.0.0.1',()=>console.log(`Canonical reference: ${url}`));
