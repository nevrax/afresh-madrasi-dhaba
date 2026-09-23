// Isolated visible native-window calibration; no emulated viewport or display rate.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
import {measureCadence} from './cadence-fixture.mjs';
import {measureLiveGameplay} from './live-gameplay-fixture.mjs';
const live=process.argv.includes('--live'),reuse=process.argv.includes('--reuse'),calibrated=process.argv.includes('--calibrated');
const legacyScreenshot=process.argv.includes('--legacy-screenshot'),short=process.argv.includes('--short');
const prepared=process.argv.includes('--prepared');
const root=path.resolve(import.meta.dirname,'..'),adapter=process.argv[2]??'low-power',uncapped=process.argv.includes('--uncapped');
if(!['low-power','high-performance'].includes(adapter))throw Error('Invalid adapter');
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const label=`${live?(reuse?"native-live-reuse":"native-live"):"cadence"}-${adapter}-${uncapped?'uncapped':'normal'}${process.argv.includes('--repeat')?'-repeat':''}${calibrated?'-calibrated':''}${legacyScreenshot?'-legacy-screenshot':''}${short?'-short':''}${prepared?'-prepared':''}`,output=path.join(root,'.local-setup/logs',label);await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup',label),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:null,
  ignoreDefaultArgs:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding',...(legacyScreenshot?['--enable-features=CDPScreenshotNewSurface']:[])],
  args:['--use-angle=d3d11',adapter==='low-power'?'--force-low-power-gpu':'--force-high-performance-gpu','--start-maximized',...(uncapped?['--disable-frame-rate-limit']:[])]});
try{
  const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession(),pcdp=await context.newCDPSession(page),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');await page.bringToFront();
  const {windowId}=await cdp.send('Browser.getWindowForTarget',{targetId:(await pcdp.send('Target.getTargetInfo')).targetInfo.targetId});await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'maximized'}});await page.waitForTimeout(1000);
  const info=await cdp.send('SystemInfo.getInfo'),bounds=(await cdp.send('Browser.getWindowBounds',{windowId})).bounds;
  if(!(adapter==='low-power'?/Intel/i:/NVIDIA/i).test(info.gpu.auxAttributes.glRenderer))throw Error('Actual graphics adapter does not match requested adapter');
  const controlConfig={width:2200,measurementMs:5000,modes:['empty-raf','small-surface'],skipReadback:true};
  const controlBefore=calibrated?await measureCadence(page,controlConfig):undefined;
  if(calibrated)await page.reload({waitUntil:'domcontentloaded'});
  let before,start,warmCpu;await page.exposeFunction('__measureWarmCpu',async phase=>{const snapshot=await cdp.send('SystemInfo.getProcessInfo'),now=performance.now();if(phase==='start'){before=snapshot;start=now;return;}const old=new Map(before.processInfo.map(p=>[p.id,p.cpuTime]));warmCpu={singleCorePercent:snapshot.processInfo.reduce((sum,p)=>sum+Math.max(0,p.cpuTime-(old.get(p.id)??p.cpuTime)),0)*100000/(now-start)};});
  const measurement=live?await measureLiveGameplay(page,{name:short?'native-attribution':'native-full-day',width:2200,nativeViewport:true,measurementMs:short?60000:180000,renderWork:true,unchangedFrames:reuse,prepared}):await measureCadence(page,{width:2200,measurementMs:10000,uncapped});
  const controlAfter=calibrated?await measureCadence(page,controlConfig):undefined;
  const result={adapter,uncapped,warmCpu,controlBefore,controlAfter,hardware:{browser:context.browser().version(),renderer:info.gpu.auxAttributes.glRenderer,features:info.gpu.featureStatus},bounds,...measurement,errors};
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(errors.length||(live?(result.hiddenSamples||result.unfocusedSamples||!result.geometry.canvas.fullyInsideViewport):result.results.some(r=>r.hiddenSamples||r.unfocusedSamples||r.outsideViewportSamples)))throw Error('Visibility acceptance failed; result retained only for diagnosis');
  if([controlBefore,controlAfter].some(c=>c?.results.some(r=>r.hiddenSamples||r.unfocusedSamples||r.outsideViewportSamples)))throw Error('Control visibility acceptance failed');
}finally{await context.close();}
