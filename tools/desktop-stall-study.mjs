import {createRequire} from 'node:module';
import {mkdir,writeFile,open} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromeExecutablePath} from './browser-path.mjs';
import {measureLiveGameplay} from './live-gameplay-fixture.mjs';
import {measureCadence} from './cadence-fixture.mjs';
const root=path.resolve(import.meta.dirname,'..'),adapter=process.argv[2]??'low-power',trace=process.argv.includes('--trace'),backgroundExemption=process.argv.includes('--exempt');
if(!['low-power','high-performance'].includes(adapter))throw Error('Invalid adapter');
const cpuFilters=process.argv.includes('--cpu-filters'),desynchronized=process.argv.includes('--desynchronized');
const noDcomp=process.argv.includes('--no-dcomp'),alpha=process.argv.includes('--alpha');
const wpr=process.argv.includes('--wpr');let recording=false;
const label=`desktop-stall-${adapter}${trace?'-trace':''}${backgroundExemption?'-exempt':''}${cpuFilters?'-cpu-filters':''}${desynchronized?'-desynchronized':''}${noDcomp?'-no-dcomp':''}${alpha?'-alpha':''}${wpr?'-wpr':''}`,output=path.join(root,'.local-setup/logs',label);await mkdir(output,{recursive:true});
const recorder=args=>execFileSync('wpr.exe',args,{windowsHide:true,encoding:'utf8'});
const stopRecorder=()=>{if(recording){recorder(['-stop',path.join(output,'gpu.etl')]);recording=false;}};
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup',label),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:null,
 ignoreDefaultArgs:backgroundExemption?[]:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],
 args:['--start-maximized','--use-angle=d3d11',adapter==='low-power'?'--force-low-power-gpu':'--force-high-performance-gpu',...(noDcomp?['--disable-direct-composition']:[])]});
try{
 const page=context.pages()[0],cdp=await context.browser().newBrowserCDPSession(),pcdp=await context.newCDPSession(page),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');await page.bringToFront();
 const {windowId}=await cdp.send('Browser.getWindowForTarget',{targetId:(await pcdp.send('Target.getTargetInfo')).targetInfo.targetId});await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'maximized'}});
 const info=await cdp.send('SystemInfo.getInfo');if(!(adapter==='low-power'?/Intel/i:/NVIDIA/i).test(info.gpu.auxAttributes.glRenderer))throw Error('Adapter mismatch');
 const results=[];
 for(const mode of ['idle','game']){
  await page.reload({waitUntil:'domcontentloaded'});await page.evaluate(async()=>{window.__probes=(await import('/development/verification/performance-probes.js')).performanceProbes();performance.mark('stall-study-start');});
  if(trace)await cdp.send('Tracing.start',{categories:'devtools.timeline,blink.user_timing,cc,gpu,viz,renderer.scheduler,sequence_manager,benchmark,toplevel,ui,disabled-by-default-gpu.service,disabled-by-default-gpu.decoder',transferMode:'ReturnAsStream'});
  await page.evaluate(()=>performance.mark('stall-trace-start'));
  if(wpr&&mode==='game'){recorder(['-start','GPU','-start','CPU','-start','DesktopComposition','-filemode']);recording=true;}
  const before=await cdp.send('SystemInfo.getProcessInfo'),start=performance.now();
  const measurement=mode==='idle'?await measureCadence(page,{width:2200,measurementMs:30000,modes:['empty-raf'],skipReadback:true}):await measureLiveGameplay(page,{width:2200,nativeViewport:true,measurementMs:60000,cpuFilters,stageOptions:{desynchronized,alpha}});
  const probes=await page.evaluate(()=>window.__probes.finish()),after=await cdp.send('SystemInfo.getProcessInfo'),seconds=(performance.now()-start)/1000;
  stopRecorder();
  const old=new Map(before.processInfo.map(p=>[p.id,p.cpuTime]));const cpu=100*after.processInfo.reduce((sum,p)=>sum+Math.max(0,p.cpuTime-(old.get(p.id)??p.cpuTime)),0)/seconds;
  if(trace){const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done,file=await open(path.join(output,`${mode}.trace.json`),'w');try{while(true){const data=await cdp.send('IO.read',{handle:stream});await file.write(data.base64Encoded?Buffer.from(data.data,'base64'):data.data);if(data.eof)break;}}finally{await file.close();await cdp.send('IO.close',{handle:stream});}}
  results.push({mode,measurement,probes,processCpu:cpu});await writeFile(path.join(output,'results.json'),JSON.stringify({adapter,trace,backgroundExemption,noDcomp,hardware:info.gpu.auxAttributes.glRenderer,errors,results},null,2));
  console.log(JSON.stringify({mode,cpu,rafGaps:probes.raf.length,mainTimerGaps:probes.mainTimer.length,workerTimerGaps:probes.workerTimer.length,longTasks:probes.tasks.length,longFrames:probes.animations.length}));
 }
 if(errors.length)throw Error('Page errors');
}finally{try{stopRecorder();}finally{await context.close();}}
