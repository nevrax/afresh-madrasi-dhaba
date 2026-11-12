import {chromeExecutablePath} from './browser-path.mjs';
// Verify file:// with all HTTP(S) blocked. The portable file is copied alone
// into an otherwise empty local directory before it is opened.
import {createRequire} from 'node:module';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {connectNativeFullscreen} from './native-fullscreen.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium,firefox}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const useFirefox=process.argv.includes('--firefox');
const output=path.join(root,'.local-setup/logs/offline');await mkdir(output,{recursive:true});
const portableDir=path.join(root,`.local-setup/portable-check${useFirefox?'-firefox':''}`);await mkdir(portableDir,{recursive:true});
const portable=path.join(portableDir,'madrasi-dhaba.html');await copyFile(path.join(root,'dist/standalone/index.html'),portable);
const urls=[path.join(root,'index.html'),portable,path.join(root,'dist/site/index.html')].map(p=>pathToFileURL(p).href);
const context=await (useFirefox?firefox:chromium).launchPersistentContext(path.join(root,`.local-setup/playwright-offline${useFirefox?'-firefox':''}`),useFirefox?{executablePath:process.env.PLAYWRIGHT_FIREFOX,headless:false,viewport:null}:{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:null,args:['--use-angle=d3d11','--force-high-performance-gpu']});
const checks=[],errors=[],network=[];await context.route(/^https?:/,r=>{network.push(new URL(r.request().url()).origin);return r.abort();});
const page=context.pages()[0];page.on('pageerror',e=>errors.push(String(e)));
if(!useFirefox)await connectNativeFullscreen(context,page,{fileUrls:urls});
await page.addInitScript(()=>{
 const fillText=CanvasRenderingContext2D.prototype.fillText;
 window.__offlinePlateCount=null;
 CanvasRenderingContext2D.prototype.fillText=function(...args){if(this.canvas.id==='game'&&this.font.includes('madrasi-423'))window.__offlinePlateCount=String(args[0]);return fillText.apply(this,args);};
 const original=AudioContext.prototype.decodeAudioData;
 window.__offlineAudioDecoded=0;
 AudioContext.prototype.decodeAudioData=function(...args){return original.apply(this,args).then(result=>{window.__offlineAudioDecoded++;return result;});};
});
const gameButton=async name=>{const b=page.getByRole('button',{name,exact:true});await b.waitFor();const box=await b.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);};
const point=async(x,y)=>{const b=await page.locator('#game').boundingBox();await page.mouse.click(b.x+x*b.width/550,b.y+y*b.height/400,{delay:30});};
try{
 for(let i=0;i<urls.length;i++){
  const kind=['source file','portable HTML alone','static release file'][i];
  await page.goto(urls[i]);await page.locator('#loading').waitFor({state:'hidden'});
  assert(await page.locator('#performance-hud').isHidden());
  await gameButton('Start');await gameButton('How to play');await gameButton('Skip tutorial');
  await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('Batter'));
  await point(529,328);await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('empty spot'));
  await point(124.5,332.45);await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='flip',null,{timeout:12000});
  await point(124.5,332.45);await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='pickup',null,{timeout:8000});
  await point(124.5,332.45);await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('plate'));
  await point(25,336.95);await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('Batter'));
  await page.waitForFunction(()=>window.__offlinePlateCount==='1');
  assert(await page.locator('#resource-status').isHidden());assert(await page.locator('#enable-audio').isHidden());
  const audio=await page.evaluate(()=>window.__offlineAudioDecoded);assert(audio>=2);
  const decoded=await page.evaluate(async()=>{let count=0;const ctx=new AudioContext();for(const [name,url] of Object.entries(globalThis.__madrasiResources.binary)){if(url.startsWith('data:audio/')){const response=await fetch(url);const data=await ctx.decodeAudioData(await response.arrayBuffer());if(!data.length)throw Error(name);count++;}}await ctx.close();return count;});assert.equal(decoded,11);
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
  if(!useFirefox){const cdp=await context.newCDPSession(page);for(let n=0;n<30&&(await cdp.send('Browser.getWindowForTarget')).bounds.windowState!=='fullscreen';n++)await page.waitForTimeout(100);assert.equal((await cdp.send('Browser.getWindowForTarget')).bounds.windowState,'fullscreen');}
  await page.screenshot({path:path.join(output,`${useFirefox?'firefox-':''}game-${i}.png`)});await page.locator('#fullscreen').click();await page.waitForTimeout(300);
  checks.push({kind,gameplay:'tutorial/skip/batter/pour/flip/pickup/plate',plateCount:1,decodedSounds:decoded,liveDecodedAudio:audio,fullscreen:useFirefox?'DOM request':'native window',resourceErrors:false});
 }
 for(const entry of ['development/catalog/index.html']){
  await page.goto(pathToFileURL(path.join(root,entry)).href);await page.locator('.resource-card').first().waitFor();
  const catalogCards=await page.locator('.resource-card').count();assert.equal(catalogCards,636);
  await page.locator('[data-resource-id="sprite-472"]').click();await page.locator('canvas[role=img]').waitFor({state:'visible',timeout:5000}).catch(async()=>assert(await page.locator('canvas').isVisible()));
  checks.push({kind:'development file catalogue',resources:catalogCards,vectorPreview:true});
 }
 assert.equal(errors.length,0);assert.equal(network.length,0);
 const result={status:'PASS',browser:context.browser().version(),checks,errors,network};
 await writeFile(path.join(output,`results${useFirefox?'-firefox':''}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});throw error;}
finally{await context.close();}
