import {gameUrl, deployment} from '../scripts/internal/deployment-config.mjs';
import {chromeExecutablePath} from './browser-path.mjs';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {connectNativeFullscreen} from './native-fullscreen.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const output=path.join(root,'.local-setup/logs/window-check');await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-window-check'),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:null,args:['--use-angle=d3d11','--force-high-performance-gpu']});
const page=context.pages()[0],checks=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
try{
 await connectNativeFullscreen(context,page,{fileUrls:[pathToFileURL(path.join(root,'index.html')).href]});
 const fileRequests=[];page.on('request',r=>{if(r.url().startsWith('file:')&&r.url().endsWith('/build/modules/src/main.js'))fileRequests.push('main.js');});
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.locator('#loading').waitFor({state:'hidden'});assert.equal(fileRequests.length,0);
 checks.push({name:'file URL starts the game without requesting an ES module',passed:true});
 const cdp=await context.newCDPSession(page);
 const windowState=()=>cdp.send('Browser.getWindowForTarget');
 const sizes=()=>page.evaluate(()=>({inner:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],screen:[screen.width,screen.height],canvas:[document.querySelector('#game').clientWidth,document.querySelector('#game').clientHeight]}));
 for(const site of ['source','release']){
  await page.goto(`${deployment.game.url}${site==='release'?'dist/site/':''}`);await page.locator('#loading').waitFor({state:'hidden'});
  const initial=await windowState();
  await page.locator('#expand-game').click();await page.waitForTimeout(250);
  assert.equal((await windowState()).bounds.windowState,initial.bounds.windowState);assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false);
  checks.push({site,name:'expand changes only game size',...await sizes()});
  await page.locator('#expand-game').click();
  await page.locator('#fullscreen').click();
  for(let i=0;i<30&&(await windowState()).bounds.windowState!=='fullscreen';i++)await page.waitForTimeout(100);
  assert.equal((await windowState()).bounds.windowState,'fullscreen');
  const full=await sizes();assert(Math.abs(full.inner[0]-full.screen[0])<=1&&Math.abs(full.inner[1]-full.screen[1])<=1);
  checks.push({site,name:'native fullscreen covers physical screen with browser chrome hidden',...full});
  const edge=await page.locator('#game').evaluate(c=>{const ctx=c.getContext('2d'),start=Math.max(1,Math.floor(c.width*549/550)),data=ctx.getImageData(start-1,0,c.width-start+1,c.height).data;let mismatches=0,white=0;const rowWidth=c.width-start+1;for(let y=0;y<c.height;y++){const at=y*rowWidth*4;if(data[at]>245&&data[at+1]>245&&data[at+2]>245)white++;for(let x=1;x<rowWidth;x++)for(let k=0;k<4;k++)if(data[at+k]!==data[at+x*4+k])mismatches++;}return{mismatches,white,height:c.height,width:c.width};});
  assert.equal(edge.mismatches,0);assert(edge.white<edge.height*.05);checks.push({site,name:'menu right seam has no white column',...edge});
  await page.screenshot({path:path.join(output,`${site}-fullscreen-menu.png`)});
  await page.locator('#fullscreen').click();
  for(let i=0;i<30&&(await windowState()).bounds.windowState==='fullscreen';i++)await page.waitForTimeout(100);
  assert.deepEqual((await windowState()).bounds,initial.bounds);checks.push({site,name:'fullscreen exit restores native window bounds',passed:true});
 }
 await page.goto(gameUrl('development/catalog/'));await page.locator('.resource-card').first().waitFor();
 assert.equal(await page.locator('.resource-card').count(),636);
 await page.locator('[data-resource-id="sprite-472"]').click();await page.locator('canvas[role=img]').waitFor({state:'visible'});
 checks.push({name:'development catalogue over HTTP',resources:636,vectorPreview:true});
 await page.goto(gameUrl('development/verification/'));await page.waitForFunction(()=>document.querySelector('#run')?.disabled===false);
 checks.push({name:'development verification modules load',passed:true});
 for(const path of ['.local-setup/node/node.exe','.local-setup/logs/test.txt','build/../logs/test.txt']){
  const response=await page.request.get(gameUrl('')+path);assert.equal(response.status(),403);
 }
 checks.push({name:'server denies tools, logs and build-path escape',passed:true});
 assert.equal(errors.length,0);await writeFile(path.join(output,'results.json'),JSON.stringify({status:'PASS',checks,errors},null,2));console.log(JSON.stringify({status:'PASS',checks,errors}));
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});throw error;}
finally{await context.close();}
