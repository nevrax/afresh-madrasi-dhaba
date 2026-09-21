// Use installed Pi Chromium and SSH forwarding. No packages or global settings change.
// Args: SSH target, SSH port, local CDP port, anonymous output label, optional preset or JSON cases.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {measureFullResolutionFixture} from './full-resolution-fixture.mjs';
import {measureComponentFixture} from './component-ranking-fixture.mjs';
import {componentRankingCases} from './component-ranking-cases.mjs';
const root=path.resolve(import.meta.dirname,'..');
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const [target,portText,localText,label,casesText]=process.argv.slice(2);
const port=Number(portText),localPort=Number(localText);
if(!target||!/^\w[\w.@:-]*$/.test(target)||!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(localPort)||localPort<1024||localPort>65535||!label||!/^[a-z0-9-]+$/.test(label))throw Error('Invalid SSH arguments');
const cases=['ranking','simplifications','background'].includes(casesText)?componentRankingCases(casesText):casesText?JSON.parse(casesText):[{width:880},{width:1485},{width:2200,fixedBudget:true},{width:2200},{width:2200,omit:'griddle-steam'}];
if(!Array.isArray(cases)||cases.some(c=>!Number.isInteger(c.width)||c.width<550||c.width>2970))throw Error('Invalid fixture sizes');
const output=path.join(root,'.local-setup/logs',label);await mkdir(output,{recursive:true});
const python=await readFile(path.join(root,'tools/pi-browser.py'),'utf8');
const ssh=process.platform==='win32'?path.join(process.env.SystemRoot,'System32/OpenSSH/ssh.exe'):'ssh';
const base=['-p',String(port),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8'];
const remote=action=>new Promise((resolve,reject)=>{
 const child=spawn(ssh,[...base,target,'sudo','-n','python3','-',action],{windowsHide:true});
 let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 child.on('error',reject);child.on('exit',code=>{if(code)reject(Error(`Remote ${action} failed: ${stderr}`));else try{resolve(JSON.parse(stdout));}catch(e){reject(e);}});
 child.stdin.end(python);
});
const tunnel=spawn(ssh,[...base,'-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3',
 '-L',`127.0.0.1:${localPort}:127.0.0.1:9337`,'-R','127.0.0.1:5178:127.0.0.1:5173','-N',target],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let tunnelError='';tunnel.stderr.on('data',b=>tunnelError+=b);
let browser,cdp,launched=false;
const result={fixture:'same five-customer exact-density scene as the desktop study',transport:'SSH forwarding; assets finish loading before timed rendering',results:[],errors:[]};
try{
 await remote('start');launched=true;
 const endpoint=`http://127.0.0.1:${localPort}`;
 let ready=false;
 for(let i=0;i<45;i++){
  if(tunnel.exitCode!==null)throw Error(`SSH tunnel exited: ${tunnelError}`);
  try{if((await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 if(!ready)throw Error('Remote Chromium did not expose CDP');
 browser=await chromium.connectOverCDP(endpoint);
 console.log(JSON.stringify({label,http:await remote('http')}));
 const context=browser.contexts()[0],page=context.pages()[0]||await context.newPage();
 await page.bringToFront();
 result.nativeDisplay=await page.evaluate(()=>({screen:[screen.width,screen.height],viewport:[innerWidth,innerHeight],dpr:devicePixelRatio}));
 // Match desktop fixture dimensions independently of attached display resolution.
 const pageCdp=await context.newCDPSession(page);
 await pageCdp.send('Emulation.setDeviceMetricsOverride',{width:1480,height:1000,deviceScaleFactor:2,mobile:false});
 cdp=await browser.newBrowserCDPSession();const info=await cdp.send('SystemInfo.getInfo');
 result.hardware={browser:browser.version(),renderer:info.gpu.auxAttributes.glRenderer,features:info.gpu.featureStatus,devices:info.gpu.devices.map(d=>d.deviceString)};
 result.before=await remote('sample');
 console.log(JSON.stringify({label,hardware:result.hardware,system:result.before,nativeDisplay:result.nativeDisplay}));
 page.on('pageerror',e=>result.errors.push(e.message));
 page.on('requestfailed',r=>console.log(JSON.stringify({label,failedPath:new URL(r.url()).pathname,failure:r.failure()})));
 await page.goto('http://127.0.0.1:5178/development/verification/render-fixture.html',{waitUntil:'domcontentloaded',timeout:20000});
 console.log(JSON.stringify({label,ready:await page.evaluate(()=>({state:document.readyState,hidden:document.hidden,canvas:!!document.querySelector('canvas')}))}));
 result.idleCadence=await page.evaluate(async()=>{const times=[];let before=await new Promise(requestAnimationFrame);for(let i=0;i<12;i++){const now=await new Promise(requestAnimationFrame);times.push(now-before);before=now;}return times;});
 if(result.idleCadence.every(ms=>ms>200))throw Error('Idle browser cadence is throttled; no performance acceptance possible');
 for(const config of cases){
  await remote('keep-awake');
  const before=await cdp.send('SystemInfo.getProcessInfo'),start=performance.now();
  let measurement;
  if(config.mode==='ui'){
   const {checkGameUi}=await import('./performance-ui.mjs');
   measurement={...await checkGameUi(context,output,'http://127.0.0.1:5178/dist/site/'),config,memory:{},cache:{}};
   if(measurement.status!=='PASS')throw Error('Pi release UI checks failed');
  }else if(config.mode==='checks'){
   if(!page.url().includes('/verification/index.html'))await page.goto('http://127.0.0.1:5178/development/verification/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#run')&&!document.querySelector('#run').disabled);
   const checks=[];
   for(const name of ['Check GPU filter pixels','Check retained composition pixels']){
    await page.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#run').disabled);
    const check=JSON.parse(await page.locator('#report').innerText());checks.push({name,...check});
    if(check.status!=='PASS')throw Error(`${name} failed on the Pi`);
   }
   measurement={config,status:'PASS',checks,memory:{},cache:{}};
  }else if(config.mode==='gameplay'){
   if(!page.url().includes('/verification/index.html'))await page.goto('http://127.0.0.1:5178/development/verification/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#stress')&&!document.querySelector('#stress').disabled);
   await page.locator('#game').evaluate((canvas,width)=>{canvas.style.width=`${width/devicePixelRatio}px`;},config.width);
   await page.getByLabel('Cooking workload',{exact:true}).selectOption('3');
   await page.getByLabel('Cache start',{exact:true}).selectOption(config.cacheStart||'cold');
   await page.locator('#stress').click();
   await page.waitForFunction(()=>!document.querySelector('#stress').disabled,null,{timeout:90000});
   measurement=JSON.parse(await page.locator('#report').innerText());
   if(measurement.status!=='BENCHMARK')throw Error('Production gameplay benchmark failed');
   measurement.config=config;
  }else{
   if(!page.url().includes('/render-fixture.html'))await page.goto('http://127.0.0.1:5178/development/verification/render-fixture.html',{waitUntil:'domcontentloaded'});
   measurement=await (config.mode==='ranking'?measureComponentFixture:measureFullResolutionFixture)(page,{...config,adapter:'default'});
  }
  const elapsed=(performance.now()-start)/1000,after=await cdp.send('SystemInfo.getProcessInfo');
  const old=new Map(before.processInfo.map(p=>[p.id,p.cpuTime]));
  measurement.processCpu={scope:'browser processes across asset load, warmup and measurement; one core equals 100 percent',singleCorePercent:100*after.processInfo.reduce((sum,p)=>sum+Math.max(0,p.cpuTime-(old.get(p.id)??p.cpuTime)),0)/elapsed};
  measurement.system=await remote('sample');result.results.push(measurement);
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({label,config,canvas:measurement.canvas,fps:measurement.fps,raf:measurement.raf,cache:measurement.cache,memory:measurement.memory.accountedBackingBytes??measurement.memory.peakBackingBytes,cpu:measurement.processCpu.singleCorePercent,system:measurement.system}));
  if(config.mode!=='gameplay')await page.reload({waitUntil:'domcontentloaded'});
 }
 result.after=await remote('sample');
 await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));
 if(result.errors.length)throw Error('Page errors occurred; inspect the saved results');
}finally{
 if(cdp)await cdp.send('Browser.close').catch(()=>{});
 if(browser)await browser.close().catch(()=>{});
 if(launched)await remote('stop').catch(e=>console.error(e.message));
 tunnel.kill();
}
