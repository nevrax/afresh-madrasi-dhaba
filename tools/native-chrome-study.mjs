// Attach Playwright to a normally launched, isolated visible Chrome instance.
// This control excludes Playwright's default launch flags.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
import {measureLiveGameplay} from './live-gameplay-fixture.mjs';
import {measureCadence} from './cadence-fixture.mjs';
const forced=process.argv.includes('--force-low-power'),prepared=!process.argv.includes('--unprepared');
const label=`native-chrome-default${forced?'-forced':''}${prepared?'':'-unprepared'}`;
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.local-setup/logs',label);await mkdir(output,{recursive:true});
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const endpoint='http://127.0.0.1:9336';
try{await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(500)});throw Error('Diagnostic port already occupied');}catch(e){if(e.message==='Diagnostic port already occupied')throw e;}
const child=spawn(chromeExecutablePath(),['--remote-debugging-port=9336',`--user-data-dir=${path.join(root,'.local-setup',label)}`,'--no-first-run','--no-default-browser-check','--start-maximized',...(forced?['--force-low-power-gpu','--use-angle=d3d11']:[]),'about:blank'],{stdio:'ignore',windowsHide:false});
let browser,cdp;
try{
  for(let n=0;n<60;n++){try{await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(500)});break;}catch{}await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.connectOverCDP(endpoint);const context=browser.contexts()[0],page=context.pages()[0],errors=[];
  cdp=await browser.newBrowserCDPSession();const info=await cdp.send('SystemInfo.getInfo');console.log(JSON.stringify({renderer:info.gpu.auxAttributes.glRenderer,browser:browser.version()}));
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');await page.bringToFront();
  const control=await measureCadence(page,{width:2200,measurementMs:10000,modes:['empty-raf','small-surface'],skipReadback:true});await page.reload();
  const gameplay=await measureLiveGameplay(page,{width:2200,nativeViewport:true,measurementMs:60000,prepared});
  await writeFile(path.join(output,'results.json'),JSON.stringify({hardware:info.gpu.auxAttributes.glRenderer,control,gameplay,errors},null,2));
  console.log(JSON.stringify({control:control.results.map(r=>({mode:r.mode,fps:r.callbackFps,gaps:r.gapMs})),warm:gameplay.warm,errors}));
  if(errors.length||gameplay.hiddenSamples||gameplay.unfocusedSamples||!gameplay.geometry.canvas.fullyInsideViewport)throw Error('Native Chrome visibility or runtime check failed');
}finally{if(cdp)await cdp.send('Browser.close').catch(()=>{});if(browser)await browser.close();if(child.exitCode===null)child.kill();}
