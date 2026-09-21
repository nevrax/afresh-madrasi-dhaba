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
  const result=await page.evaluate(async config=>{
   const {Assets}=await import('/build/modules/src/render/assets.js');
   const {Renderer}=await import('/build/modules/src/render/renderer.js');
   const {fixture}=await import('/build/modules/development/verification/component-study.js');
   const canvas=document.getElementById('game');canvas.style.width=(config.width/devicePixelRatio)+'px';canvas.style.height=(config.width*400/550/devicePixelRatio)+'px';
   const assets=new Assets();await assets.load(config.adapter);const renderer=new Renderer(canvas,assets);await renderer.load();const art=assets.vector;art.profiling=true;
   if(config.fixedBudget)art.setViewport=()=>{};
   if(config.omit)renderer.diagnosticOmissions.add(config.omit);
   if(config.omit==='griddle-steam')art.diagnosticOmitChildren.add('224:223');
   if(config.omit==='dosa-steam')art.diagnosticOmitChildren.add('472:223');
   const state=fixture();renderer.events([{type:'screen',screen:'playing'}],{...state,timeMs:0});
   const next=()=>new Promise(r=>requestAnimationFrame(r));await next();await next();
   let start=await next(),last=start,began=0,initial={...art.stats};const gaps=[],draws=[],groups={};
   renderer.onRenderCost=(group,ms)=>{if(began)groups[group]=(groups[group]||0)+ms};
   while(last-start<12000){const now=await next(),gap=now-last;last=now;const local=(now-start)%6000,pose=Math.floor(local*12/1000);state.timeMs=16000+local;state.clockMinutes=556+Math.floor(local/1000);state.pointer.x=275+230*Math.sin(local/700);state.pointer.y=327+20*Math.cos(local/430);state.platePosition.x=state.pointer.x;state.platePosition.y=state.pointer.y;state.counterPosition.x=state.pointer.x;state.counterPosition.y=state.pointer.y+35;Object.assign(state.plate[0],{x:state.pointer.x,y:state.pointer.y,smokePose:pose%12+1});state.food.forEach((d,i)=>{if(d){d.pose=i===0?71+pose%70:327;d.smokePose=i===0?null:pose%12+1}});state.customers.forEach(c=>{c.characterPose=1;c.phaseElapsedMs=pose*1000/12;c.patience=-50-c.id+(pose%20)*.05});if(!began&&now-start>=6000){began=now-gap;initial={...art.stats};art.groupCosts.clear()}const at=performance.now();renderer.draw(state);if(began){gaps.push(gap);draws.push(performance.now()-at)}}
   const stats=a=>{a.sort((x,y)=>x-y);return{p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(v=>v>50).length}};
   const result={config,canvas:[canvas.width,canvas.height],fps:gaps.length*1000/(last-began),raf:stats(gaps),draw:stats(draws),groups:Object.entries(groups).map(([name,ms])=>({name,msPerFrame:ms/gaps.length})).sort((a,b)=>b.msPerFrame-a.msPerFrame),cache:{allocations:art.stats.allocatedBytes-initial.allocatedBytes,evictions:art.stats.evictions-initial.evictions,morphReplacements:art.stats.morphReplacements-initial.morphReplacements,filterBuilds:art.stats.filterPlacements-initial.filterPlacements},memory:art.memorySummary(),builds:[...art.groupCosts].map(([id,cost])=>({id,...cost})).sort((a,b)=>b.milliseconds-a.milliseconds).slice(0,10),hidden:document.hidden};art.clearCache();return result;
  },{...config,adapter});
  results.push(result);await writeFile(path.join(output,'results.json'),JSON.stringify({hardware,results,errors},null,2));console.log(JSON.stringify({config:result.config,canvas:result.canvas,fps:result.fps,raf:result.raf,draw:result.draw,cache:result.cache,memoryBytes:result.memory.accountedBackingBytes,builds:result.builds.slice(0,2)}));
  await page.reload();
 }
 if(errors.length)throw Error('Browser errors occurred; inspect the saved report');
}finally{await context.close()}
