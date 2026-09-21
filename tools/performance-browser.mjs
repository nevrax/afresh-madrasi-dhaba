import {chromeExecutablePath} from './browser-path.mjs';
// Visible, isolated Playwright benchmark. No personal browser/profile is used.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import {createRequire} from 'node:module';
import {mkdir,writeFile,open} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const localModule=path.join(root,'.local-setup/playwright/node_modules/playwright');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||(existsSync(localModule)?localModule:'playwright'));
const adapter=process.argv[2]||'high-performance';
const mode=process.argv[3]||'paired';
const label=process.argv[4]||`${adapter}-${mode}`;
if(!['high-performance','low-power','software'].includes(adapter)||!/^[a-z0-9-]+$/.test(label))throw Error('Invalid adapter or output label');
if(!['probe','play','ui','checks','pixels','gameplay','long','cache','paired','full'].includes(mode))throw Error('Invalid benchmark mode');
if(mode==='play'){
 const ready=async()=>{try{return (await fetch('http://127.0.0.1:5173/',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}};
 if(!await ready()){
  const server=spawn(process.execPath,['scripts/internal/serve.mjs'],{cwd:root,windowsHide:true,detached:true,stdio:'ignore'});server.unref();
  for(let i=0;i<50&&!await ready();i++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!await ready())throw Error('Local game server could not start');
 }
}
const directory=path.join(root,'.local-setup','logs',label);
await mkdir(directory,{recursive:true});
const preference=adapter==='software'?'default':adapter;
const args=adapter==='software'?['--disable-gpu']:['--use-angle=d3d11',adapter==='high-performance'?'--force-high-performance-gpu':'--force-low-power-gpu'];
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup',`playwright-${mode==='play'?'game-':''}${adapter}`),{
 executablePath:chromeExecutablePath(),
 headless:false,chromiumSandbox:true,...(mode==='play'?{viewport:null}:{viewport:{width:1280,height:850},deviceScaleFactor:1.5}),args,
});
try{
 const page=context.pages()[0]||await context.newPage();
 if(mode==='play'){const {connectNativeFullscreen}=await import('./native-fullscreen.mjs');await connectNativeFullscreen(context,page);}
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(mode==='play'?'http://127.0.0.1:5173/':`http://127.0.0.1:5173/development/verification/index.html?gpu=${preference}&study=${mode}`);
 if(mode==='play')await page.locator('#loading').waitFor({state:'hidden'});
 else{await page.locator('#run').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#run').disabled);}
 const browserCdp=await context.browser().newBrowserCDPSession();
 const graphics=await browserCdp.send('SystemInfo.getInfo');
 // Strip command line and machine/process paths from the retained summary.
 const hardware={version:context.browser().version(),requestedAdapter:adapter,chromiumSandboxRequested:true,gpu:graphics.gpu,modelName:graphics.modelName};
 await writeFile(path.join(directory,'hardware.json'),JSON.stringify(hardware,null,2));
 console.log(JSON.stringify({requestedAdapter:adapter,devices:graphics.gpu.devices,featureStatus:graphics.gpu.featureStatus}));
 const check=async name=>{
  await page.getByRole('button',{name,exact:true}).click();
  if(name==='Run complete scenarios'){
   const locked=await page.evaluate(()=>{const before=document.querySelector('#report').textContent;const controls=[...document.querySelectorAll('button,select')];const study=controls.find(c=>c.textContent==='Run component study');study.onclick();return controls.every(c=>c.disabled)&&document.querySelector('#report').textContent===before;});
   if(!locked)throw Error('Scenario control lock failed');
  }
  while(await page.getByRole('button',{name,exact:true}).isDisabled()){
   await page.waitForTimeout(1000);const text=await page.locator('#report').innerText();if(!text.startsWith('{'))console.log(text);
  }
  const result=JSON.parse(await page.locator('#report').innerText());
  await writeFile(path.join(directory,name.toLowerCase().replaceAll(' ','-')+'.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({check:name,status:result.status,passed:result.passed,total:result.total,maximumByteError:result.maximumByteError}));
  if(result.status!=='PASS')throw Error(`${name} did not pass; see saved report`);
 };
 if(mode==='play'){
  console.log('Visible game ready. Close this isolated browser window to end the launcher.');
  await new Promise(resolve=>context.once('close',resolve));
 }else if(mode==='ui'){
  const {checkGameUi}=await import('./performance-ui.mjs');
  const result=await checkGameUi(context,directory,process.argv.includes('--release')?'http://127.0.0.1:5173/dist/site/':undefined);await writeFile(path.join(directory,'ui.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(result.status!=='PASS')throw Error('UI acceptance failed; see saved checks and screenshot');
 }else if(mode==='checks'){
  for(const name of ['Check GPU filter pixels','Check retained composition pixels','Run complete scenarios'])await check(name);
 }else if(mode==='pixels'){
  await check('Check morph cache pixels');
 }else if(mode==='gameplay'||mode==='long'){
  const results=[];
  const requestedSlots=process.argv.find(a=>a.startsWith('--slots='))?.slice(8).split(',');
  if(requestedSlots?.some(s=>!['0','1','3','18'].includes(s)))throw Error('Invalid slot selection');
  if(process.argv.includes('--small'))await page.getByLabel('Canvas display size',{exact:true}).selectOption('550');
  const backingWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.slice(8));
  if(backingWidth){
   if(!Number.isInteger(backingWidth)||backingWidth<550||backingWidth>4400)throw Error('Invalid backing width');
   const cssWidth=backingWidth/1.5;
   await page.setViewportSize({width:Math.ceil(cssWidth+40),height:Math.ceil(cssWidth*400/550+200)});
   await page.locator('#game').evaluate((canvas,width)=>{canvas.style.width=`${width}px`;},cssWidth);
  }
  if(mode==='long')await page.getByLabel('Benchmark duration',{exact:true}).selectOption('180');
  for(const slots of mode==='long'?['3']:requestedSlots??['0','1','3','18'])for(const cache of mode==='long'?['cold']:['cold','warm']){
   await page.getByLabel('Cooking workload',{exact:true}).selectOption(slots);
   await page.getByLabel('Cache start',{exact:true}).selectOption(cache);
   await page.locator('#stress').click();
   while(await page.locator('#stress').isDisabled()){await page.waitForTimeout(1000);const text=await page.locator('#report').innerText();if(!text.startsWith('{'))console.log(`${slots} slots ${cache}: ${text}`);}
   const result=JSON.parse(await page.locator('#report').innerText());results.push(result);
   console.log(JSON.stringify({slots,cache,fps:result.fps,raf:result.raf,tiles:result.cache}));
   await writeFile(path.join(directory,'gameplay.json'),JSON.stringify({hardware,results,errors},null,2));
   if(result.status!=='BENCHMARK')throw Error('Gameplay benchmark failed');
  }
 }else if(mode!=='probe'){
 const trace=process.argv.includes('--trace');
 const cpuBefore=trace?await browserCdp.send('SystemInfo.getProcessInfo'):null;
 if(trace)await browserCdp.send('Tracing.start',{categories:'devtools.timeline,cc,gpu,blink,disabled-by-default-devtools.timeline.frame',transferMode:'ReturnAsStream'});
 await page.getByRole('button',{name:'Run component study',exact:true}).click();
 let previous='';
 while(await page.getByRole('button',{name:'Run component study',exact:true}).isDisabled()){
  await page.waitForTimeout(1000);
  const progress=await page.locator('#report').innerText();
  if(progress.startsWith('Component study:')&&progress!==previous){console.log(progress);previous=progress;}
 }
 const result=JSON.parse(await page.locator('#report').innerText());
 if(trace){
  const cpuAfter=await browserCdp.send('SystemInfo.getProcessInfo');
  const completed=new Promise(resolve=>browserCdp.once('Tracing.tracingComplete',resolve));
  await browserCdp.send('Tracing.end');const {stream}=await completed;
  const file=await open(path.join(directory,'trace.json'),'w');
  try{while(true){const chunk=await browserCdp.send('IO.read',{handle:stream});await file.write(chunk.base64Encoded?Buffer.from(chunk.data,'base64'):chunk.data);if(chunk.eof)break;}}finally{await file.close();await browserCdp.send('IO.close',{handle:stream});}
  await writeFile(path.join(directory,'process-cpu.json'),JSON.stringify({before:cpuBefore,after:cpuAfter},null,2));
 }
 await writeFile(path.join(directory,'study.json'),JSON.stringify({hardware,result,errors},null,2));
 console.log(JSON.stringify(result.results?.map(v=>({name:v.name,fps:v.fps,raf:v.raf,cache:v.cache,gpu:v.gpu}))??result));
 if(process.argv.includes('--checks'))for(const name of ['Check GPU filter pixels','Check retained composition pixels','Run complete scenarios'])await check(name);
 }
}catch(error){
 const page=context.pages()[0];if(page&&!page.isClosed())await page.screenshot({path:path.join(directory,'failure.png')}).catch(()=>{});
 throw error;
}finally{await context.close();}
