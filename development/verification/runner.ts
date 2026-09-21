import { createGame, type Command, type Game, type GameEvent } from '../../src/core/game.js';
import { Assets } from '../../src/render/assets.js';
import { Renderer } from '../../src/render/renderer.js';
import { runFilterCheck, runCompositionCheck } from './filter-check.js';
import { runTileCompositorCheck } from './tile-check.js';
import { presentationChoice } from '../../src/presentation-profile.js';

// Development-only, visible deterministic scenarios. No networking or hidden control API.
const report=document.querySelector<HTMLPreElement>('#report')!;
const run=document.querySelector<HTMLButtonElement>('#run')!;
const stress=document.querySelector<HTMLButtonElement>('#stress')!;
const canvas=document.querySelector<HTMLCanvasElement>('#game')!;
const tick=1000/12;
const nextFrame=():Promise<number>=>new Promise(resolve=>requestAnimationFrame(resolve));
const require=(ok:unknown,message:string):void=>{if(!ok)throw new Error(message);};
function showBenchmarkStage():()=>void {
  const original=canvas.style.cssText;
  canvas.style.position='fixed';canvas.style.left='0';canvas.style.top='0';canvas.style.zIndex='10000';
  return()=>{canvas.style.cssText=original;};
}
async function boot():Promise<void>{
  const requestedGpu=new URLSearchParams(location.search).get('gpu');
  const preference:WebGLPowerPreference=requestedGpu==='high-performance'||requestedGpu==='low-power'?requestedGpu:'default';
  const assets=new Assets();await assets.load(preference);const renderer=new Renderer(canvas,assets);await renderer.load();
  renderer.setPresentation(presentationChoice(new URLSearchParams(location.search).get('presentation')));
  let art=assets.vector!;const optimizedArt=art;art.profiling=true;
  let algorithm='optimized';
  let busy=false;
  const exclusive=async(name:string,work:()=>void|Promise<void>):Promise<void>=>{
    if(busy)return;
    busy=true;
    const controls=[...document.querySelectorAll<HTMLButtonElement|HTMLSelectElement>('button,select')];
    const disabled=controls.map(control=>control.disabled);
    controls.forEach(control=>control.disabled=true);
    report.textContent=JSON.stringify({status:'RUNNING',check:name},null,2);
    try{await work();}
    catch(error){report.textContent=JSON.stringify({status:'FAIL',check:name,error:String(error)},null,2);}
    finally{controls.forEach((control,index)=>control.disabled=disabled[index]!);busy=false;}
  };
  const graphics=document.createElement('button');graphics.textContent='Graphics and memory details';document.querySelector('h1')!.after(graphics);graphics.onclick=()=>{if(busy)return;report.textContent=JSON.stringify({gpu:art.gpuSummary(),memory:art.memorySummary(),canvas:[canvas.width,canvas.height],dpr:devicePixelRatio},null,2);};
  const study=document.createElement('button');study.textContent='Run component study';document.querySelector('h1')!.after(study);study.onclick=()=>{void exclusive('Component study',async()=>{const module=await import('./component-study.js');report.textContent=JSON.stringify(await module.runComponentStudy(renderer,assets,text=>{report.textContent=text;}),null,2);});};
  const tileCheck=document.createElement('button');tileCheck.textContent='Compare native tile compositors';document.querySelector('h1')!.after(tileCheck);
  const tileViews=document.createElement('section');document.body.append(tileViews);
  tileCheck.onclick=()=>{void exclusive('Native tile compositors',async()=>{
    tileViews.replaceChildren();
    start();for(let step=0;step<360;step++)bot(3);paint();
      report.textContent=JSON.stringify(await runTileCompositorCheck(canvas,paint,{durationMs:10000,container:tileViews,onProgress:phase=>{report.textContent=phase;}}),null,2);
  });};
  const cadence=document.createElement('button');cadence.textContent='Measure idle scheduling';document.querySelector('h1')!.after(cadence);
  cadence.onclick=()=>{void exclusive('Idle scheduling',async()=>{const gaps:number[]=[];let last=await nextFrame(),start=last;while(last-start<10000){const now=await nextFrame();gaps.push(now-last);last=now;}gaps.sort((a,b)=>a-b);report.textContent=JSON.stringify({status:'IDLE-SCHEDULING',frames:gaps.length,fps:gaps.length*1000/(last-start),median:gaps[Math.floor(gaps.length*.5)],p95:gaps[Math.floor(gaps.length*.95)],p99:gaps[Math.floor(gaps.length*.99)],hidden:document.hidden},null,2);});};
  const density=document.createElement('select');density.setAttribute('aria-label','Canvas display size');
  for(const width of [990,550]){const option=document.createElement('option');option.value=String(width);option.textContent=`${width} CSS pixels wide`;density.append(option);}
  density.onchange=()=>{canvas.style.width=`min(${density.value}px,95vw)`;};document.querySelector('h1')!.after(density);
  const cacheStart=document.createElement('select');cacheStart.setAttribute('aria-label','Cache start');
  for(const value of ['cold','warm']){const option=document.createElement('option');option.value=value;option.textContent=value==='cold'?'Clear caches before measurement':'Keep warmed caches';cacheStart.append(option);}document.querySelector('h1')!.after(cacheStart);
  const workload=document.createElement('select');workload.setAttribute('aria-label','Cooking workload');
  for(const count of [18,3,1,0]){const option=document.createElement('option');option.value=String(count);option.textContent=`${count} cooking slots`;workload.append(option);}
  document.querySelector('h1')!.after(workload);
  const duration=document.createElement('select');duration.setAttribute('aria-label','Benchmark duration');
  for(const seconds of [30,180]){const option=document.createElement('option');option.value=String(seconds);option.textContent=`${seconds} seconds`;duration.append(option);}document.querySelector('h1')!.after(duration);
  const filterCheck=document.createElement('button');filterCheck.textContent='Check GPU filter pixels';document.querySelector('h1')!.after(filterCheck);
  filterCheck.onclick=()=>{void exclusive('GPU filter pixels',()=>{report.textContent=JSON.stringify(runFilterCheck(),null,2);});};
  const composition=document.createElement('button');composition.textContent='Check retained composition pixels';document.querySelector('h1')!.after(composition);
  composition.onclick=()=>{void exclusive('Retained composition pixels',async()=>{report.textContent=JSON.stringify(await runCompositionCheck(),null,2);});};
  const cachePixels=document.createElement('button');cachePixels.textContent='Check morph cache pixels';document.querySelector('h1')!.after(cachePixels);
  cachePixels.onclick=()=>{void exclusive('Morph cache pixels',async()=>{const module=await import('./morph-cache-check.js');report.textContent=JSON.stringify(await module.runMorphCacheCheck(renderer,assets,text=>{report.textContent=text;}),null,2);});};
  const baseline=document.createElement('button');baseline.textContent='Use diagnosed baseline';document.querySelector('h1')!.after(baseline);
  baseline.onclick=()=>{void exclusive('Switch renderer baseline',async()=>{
    try{
      if(algorithm==='optimized'){
        const path='/build/modules/development/verification/baseline/vector.js';const module=await import(path);
        const pack=await(await fetch('assets/vector/scene.json')).json();assets.vector=new module.VectorArt(pack);algorithm='baseline351e2d6';
      }else{assets.vector=optimizedArt;algorithm='optimized';}
      art.clearCache();art=assets.vector!;art.profiling=true;baseline.textContent=algorithm==='optimized'?'Use diagnosed baseline':'Use optimized renderer';report.textContent=`Selected ${algorithm}`;paint();
    }catch(error){report.textContent=`Baseline unavailable: run scripts/reference/build-benchmark-baseline.mjs. ${String(error)}`;}
  });};
  let game:Game;
  const events=(value:GameEvent[]):void=>renderer.events(value,game.state);
  const command=(value:Command):void=>events(game.dispatch(value));
  const advance=(ms:number):void=>events(game.advance(ms));
  const paint=():void=>renderer.draw(game.state);
  const start=():void=>{game=createGame({random:()=>0});events(game.advance(0));command({type:'start'});command({type:'play'});paint();};
  const put=(slot:number):void=>{command({type:'pick-batter'});command({type:'click-slot',slot});};
  const bot=(slots=18,advanceClock=true):void=>{
    const before=game.state;
    for(let slot=0;slot<slots;slot++){
      const d=before.food[slot];
      if(!d)put(slot);
      else if(d.pose>=71&&d.pose<160)command({type:'click-slot',slot});
      else if(d.pose>=327&&d.pose<430){command({type:'click-slot',slot});command({type:'click-plate'});}
    }
    const s=game.state;
    for(const c of s.customers)if(c.orderVisible&&s.plate.length){command({type:'click-plate'});command({type:'click-customer',customer:c.id});}
    if(advanceClock)advance(tick);
  };
  start();run.disabled=stress.disabled=false;report.textContent='Ready. Scenarios use the production core and renderer; audio and real pointer checks are separate.';
  run.onclick=()=>{void exclusive('Complete scenarios',async()=>{
    const passed:string[]=[];
    try{
      game=createGame({random:()=>0});events(game.advance(0));command({type:'start'});advance(tick);command({type:'show-tutorial'});
      for(let pose=0;pose<347;pose++){advance(tick);paint();await nextFrame();}
      require(game.state.screen==='instructions'&&game.state.tutorial.visible&&game.state.tutorial.childElapsedMs>game.state.tutorial.elapsedMs,'Tutorial persistent clocks');
      command({type:'skip-tutorial'});require(game.state.screen==='playing','Tutorial Skip');passed.push('Full tutorial loop, persistent child clocks and Skip');
      start();put(0);advance(70*tick);require(game.state.food[0]?.pose===71,'Flip boundary');command({type:'click-slot',slot:0});advance(36*tick);
      command({type:'click-slot',slot:0});advance(1000);require(game.state.food[0]?.pose===327,'Held pose');command({type:'background'});advance(tick);require(game.state.food[0]?.pose===328,'Cancel resumes');
      command({type:'click-slot',slot:0});command({type:'click-plate'});advance(16000-game.state.timeMs);command({type:'click-plate'});command({type:'click-customer',customer:0});
      advance(35*tick);require(game.state.cash===2,'Payment');paint();await nextFrame();advance(6*tick);require(game.state.tables[0]===null,'Departure');passed.push('Cooking, flip, pickup freeze/cancel, plating, serving, payment, departure');
      start();for(let step=0;game.state.screen==='playing'&&step<2200;step++){bot();if(step%12===0){paint();await nextFrame();}}
      require(game.state.screen==='day-result'&&game.state.cash>0,'Complete day');const cash=game.state.cash;paint();await nextFrame();passed.push(`Complete day: cash ${cash}, clock ${game.state.clockMinutes}`);
      command({type:'next-day'});require(game.state.day===2&&game.state.cash===cash&&game.state.food.every(d=>!d),'Next-day carryover');paint();passed.push('Next day preserves cash and clears food/tables');
      for(let cycle=0;cycle<3;cycle++){advance(180000);require(game.state.screen==='game-over','Fifth-loss game over');paint();await nextFrame();command({type:'retry'});require(game.state.day===1&&game.state.cash===0&&game.state.lostCustomers===0,'Retry resets');}
      passed.push('Three game-over/retry cycles');paint();
      require(assets.failures.size===0,'Missing asset');
      report.textContent=JSON.stringify({status:'PASS',passed,canvas:[canvas.width,canvas.height],cachedMiB:art.stats.cachedBytes/1048576,missingAssets:[...assets.failures]},null,2);
    }catch(error){report.textContent=JSON.stringify({status:'FAIL',passed,error:String(error)},null,2);}
  });};
  stress.onclick=()=>{void exclusive('Gameplay benchmark',async()=>{
    const restoreDisplay=showBenchmarkStage();let restoreDraw=()=>{};
    const memorySamples:unknown[]=[],longFrames:unknown[]=[];let nextMemory=0,peakBackingBytes=0;
    const observer=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')?new PerformanceObserver(list=>{for(const raw of list.getEntries()){if(longFrames.length<200){const e=raw as PerformanceEntry&{blockingDuration?:number;scripts?:{duration:number;sourceFunctionName:string;invoker:string}[]};longFrames.push({duration:e.duration,blockingDuration:e.blockingDuration,scripts:e.scripts?.map(s=>({duration:s.duration,function:s.sourceFunctionName,invoker:s.invoker}))});}}}):null;
    try{observer?.observe({type:'long-animation-frame'});await nextFrame();const slots=Number(workload.value);start();if(cacheStart.value==='cold')art.clearCache();art.groupCosts?.clear();const initial={...art.stats};const gaps:number[]=[],draws:number[]=[];
    const costs:Record<number,{calls:number;ms:number;filters:number;allocationsMiB:number}>={};
    const originalDraw=art.draw.bind(art);
    restoreDraw=()=>{art.draw=originalDraw;};
    art.draw=(...args)=>{const t=performance.now(),before={...art.stats};const value=originalDraw(...args);const cost=costs[args[1]]??(costs[args[1]]={calls:0,ms:0,filters:0,allocationsMiB:0});cost.calls++;cost.ms+=performance.now()-t;cost.filters+=art.stats.filterPlacements-before.filterPlacements;cost.allocationsMiB+=(art.stats.allocatedBytes-before.allocatedBytes)/1048576;return value;};
    bot(slots,false);
    let last=await nextFrame(),began=last,accumulator=0,hidden=document.hidden;
    const durationMs=Number(duration.value)*1000;
    while(last-began<durationMs){const now=await nextFrame();gaps.push(now-last);let remaining=now-last;last=now;hidden ||= document.hidden;
      // Commands stay on source ticks; renderer time includes the fractional remainder,
      // as in live play. The old quantized clock hid between-pose rendering costs.
      while(remaining>0){const step=Math.min(remaining,tick-accumulator);advance(step);remaining-=step;accumulator+=step;if(accumulator>=tick-1e-8){bot(slots,false);accumulator=0;}}
      const at=performance.now();paint();draws.push(performance.now()-at);
      const backingBytes=art.stats.cachedBytes+art.stats.pooledBytes+art.filterStats.backingBytes;peakBackingBytes=Math.max(peakBackingBytes,backingBytes);
      if(now>=nextMemory){memorySamples.push({seconds:(now-began)/1000,tiles:art.stats.cachedBytes,pool:art.stats.pooledBytes,filters:art.filterStats.backingBytes,heap:(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize});nextMemory=now+1000;report.textContent=`Benchmark running: ${Math.round((last-began)/1000)}/${duration.value} seconds`;}
    }
    const stats=(v:number[])=>{v.sort((a,b)=>a-b);return{median:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],over25:v.filter(x=>x>25).length,over50:v.filter(x=>x>50).length,max:v.at(-1)};};
    art.draw=originalDraw;
    const groups=[...(art.groupCosts??[])].sort((a,b)=>b[1].milliseconds-a[1].milliseconds).slice(0,12).map(([id,cost])=>({id,...cost}));
    report.textContent=JSON.stringify({status:'BENCHMARK',algorithm,cacheStart:cacheStart.value,elapsedMs:last-began,hidden,frames:draws.length,fps:draws.length*1000/(last-began),raf:stats(gaps),draw:stats(draws),cache:{allocatedMiB:(art.stats.allocatedBytes-initial.allocatedBytes)/1048576,liveMiB:art.stats.cachedBytes/1048576,evictions:art.stats.evictions-initial.evictions},topDraws:Object.entries(costs).sort((a,b)=>b[1].ms-a[1].ms).slice(0,10).map(([id,cost])=>({id,...cost})),state:{screen:game.state.screen,cash:game.state.cash,plate:game.state.plate.length}},null,2);
    const box=canvas.getBoundingClientRect();
    report.textContent=JSON.stringify({...JSON.parse(report.textContent),groups,filters:art.filterStats,slots,canvas:[canvas.width,canvas.height],memory:{peakBackingBytes,samples:memorySamples,heapMeaning:'Nonstandard shared renderer heap, not game RAM or process RSS'},longFrames:{supported:!!observer,scope:'Observer includes setup before the measured rAF window; counts are not directly comparable with rAF over50',first200:longFrames},display:{left:box.left,top:box.top,width:box.width,height:box.height,viewport:[innerWidth,innerHeight]}},null,2);
    }catch(error){report.textContent=JSON.stringify({status:'FAIL',error:String(error)},null,2);}
    finally{observer?.disconnect();restoreDraw();restoreDisplay();}
  });};
}
void boot().catch(error=>{report.textContent=String(error);});
