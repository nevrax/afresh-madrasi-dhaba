import {measureFullResolutionFixture} from './full-resolution-fixture.mjs';
// Visible GPU study at exact backing resolutions. Build and start the local server first.
// Args: output-label, low-power|high-performance, optional JSON array of cases.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
const root=path.resolve(import.meta.dirname,'..');
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const label=process.argv[2]||'full-resolution';
const adapter=process.argv[3]||'low-power';
const cases=process.argv[4]?JSON.parse(process.argv[4]):[
 {width:1485},
 {width:2200,fixedBudget:true},
 ...['griddle-steam','dosa-steam','customers','traffic'].map(omit=>({width:2200,fixedBudget:true,omit})),
 {width:2200},{width:2200},{width:2970},
];
if(!/^[a-z0-9-]+$/.test(label)||!['low-power','high-performance'].includes(adapter))throw Error('Invalid label or adapter');
if(!Array.isArray(cases)||cases.some(c=>!Number.isInteger(c.width)||c.width<550||c.width>4400))throw Error('Invalid backing dimensions');
const output=path.join(root,'.local-setup/logs',label);await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-full-resolution'),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:{width:1480,height:1000},deviceScaleFactor:2,args:['--use-angle=d3d11',adapter==='low-power'?'--force-low-power-gpu':'--force-high-performance-gpu']});
try{
 const page=context.pages()[0];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/perf-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><base href="/"><style>body{margin:0;background:#111;color:white;font:16px system-ui}canvas{display:block}p{margin:6px}</style><p>Full resolution rendering study</p><canvas id="game"></canvas>'}));
 await page.goto('http://127.0.0.1:5173/perf-fixture');
 const cdp=await context.browser().newBrowserCDPSession();const info=await cdp.send('SystemInfo.getInfo');
 const hardware={renderer:info.gpu.auxAttributes.glRenderer,devices:info.gpu.devices.map(d=>d.deviceString),features:info.gpu.featureStatus};console.log(JSON.stringify(hardware));
 const results=[];
 for(const config of cases){
  const result=await measureFullResolutionFixture(page,{...config,adapter});
  results.push(result);await writeFile(path.join(output,'results.json'),JSON.stringify({hardware,results,errors},null,2));console.log(JSON.stringify({config:result.config,canvas:result.canvas,fps:result.fps,raf:result.raf,draw:result.draw,cache:result.cache,memoryBytes:result.memory.accountedBackingBytes,builds:result.builds.slice(0,2)}));
  await page.reload();
 }
 if(errors.length)throw Error('Browser errors occurred; inspect the saved report');
}finally{await context.close()}
