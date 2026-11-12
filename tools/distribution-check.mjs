import {chromeExecutablePath} from './browser-path.mjs';
// Serve each package as the entire web root so repository files cannot hide
// missing release dependencies. Uses a separate visible Playwright browser.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat, readdir, mkdir, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const output=path.join(root,'.local-setup/logs/distribution');await mkdir(output,{recursive:true});
assert.deepEqual((await readdir(path.join(root,'dist'))).sort(),['site','standalone']);
assert.deepEqual(await readdir(path.join(root,'dist/standalone')),['index.html']);
assert.deepEqual((await readdir(path.join(root,'dist/site'))).sort(),['game.js','index.html','resources.js','styles.css']);
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-distribution'),{
 executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:null,
 args:['--use-angle=d3d11','--force-high-performance-gpu']
});
const page=context.pages()[0],errors=[],checks=[];
page.on('pageerror',e=>errors.push(String(e)));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'};
try{
 for(const name of ['standalone','site']){
  const packageRoot=path.join(root,'dist',name),requests=[],failures=[];
  const server=createServer(async(req,res)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;requests.push(pathname);
   if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
   try{
    const file=path.resolve(packageRoot,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));
    const relative=path.relative(packageRoot,file);
    assert(!relative.startsWith('..')&&!path.isAbsolute(relative));
    const info=await stat(file);assert(info.isFile());
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff'});
    createReadStream(file).pipe(res);
   }catch{failures.push(pathname);res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/`;
  await context.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('data:')?route.continue():route.abort());
  try{
   await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});
   assert(await page.locator('#resource-status').isHidden());
   for(const button of ['Start','Play']){
    const target=page.getByRole('button',{name:button,exact:true});await target.waitFor();const box=await target.boundingBox();
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   }
   await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('Batter'));
   await page.screenshot({path:path.join(output,`${name}-game.png`)});
   assert.equal(await page.getByRole('link',{name:'Resources',exact:true}).count(),0);
   assert.equal(await page.locator('#study-link').count(),0);
   if(name==='standalone')assert(requests.every(url=>['/','/favicon.ico'].includes(url)));
   assert.deepEqual(failures,[]);checks.push({package:name,isolatedHttpRoot:true,gameplay:true,catalogue:false,requests:requests.length,missingFiles:failures});
  }finally{
   await page.goto('about:blank');await context.unrouteAll();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
 }
 assert.deepEqual(errors,[]);
 const result={status:'PASS',checks,errors};await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await context.close();}
