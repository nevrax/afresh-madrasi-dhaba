import type { Game } from '../../src/core/game.js';
import type { Renderer } from '../../src/render/renderer.js';
import type { Assets } from '../../src/render/assets.js';

/** Explicit local diagnostic mode only. Reports stay in visible DOM; no storage/network. */
export function attachDiagnostics(game: Game, renderer: Renderer, assets: Assets): void {
  const art=assets.vector!;art.profiling=true;
  const panel=document.createElement('details');panel.id='performance-diagnostics';panel.open=true;
  Object.assign(panel.style,{position:'fixed',left:'4px',top:'4px',zIndex:'20',maxWidth:'590px',maxHeight:'45vh',overflow:'auto',background:'#101820ef',color:'#fff',font:'11px monospace',padding:'8px'});
  const title=document.createElement('summary');title.textContent='Local performance diagnostics';
  const start=document.createElement('button');start.textContent='Capture 15 seconds';
  const mode=document.createElement('select');mode.setAttribute('aria-label','Diagnostic experiment');
  for(const value of ['baseline','skip-193','skip-224','skip-traffic','skip-321','no-cache','no-filters']){const o=document.createElement('option');o.value=value;o.textContent=value;mode.append(o);}
  const report=document.createElement('pre');report.id='diagnostic-report';report.style.whiteSpace='pre-wrap';
  panel.append(title,start,mode,report);document.body.append(panel);
  type Cost={calls:number;ms:number;max:number;misses:number;allocatedMiB:number;evictions:number;gradients:number;filters:number};
  let active=false,began=0,ends=0,lastRaf=0,origin='',experiment='baseline',hidden=false;
  let durations:number[]=[],gaps:number[]=[],byId:Record<string,Cost>={},snapshots=0,snapshotMs=0,advanceMs=0,dispatches=0,moves=0,loafs=0,loafMs=0,forcedLayoutMs=0;
  let initial={...art.stats};
  const summary=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return {n:a.length,median:a[Math.floor(a.length*.5)]??0,p95:a[Math.floor(a.length*.95)]??0,p99:a[Math.floor(a.length*.99)]??0,max:a.at(-1)??0};};
  const screen=()=>{const s=game.snapshot();return s.screen+(s.tutorial.visible?'-tutorial':'');};
  const finish=():void=>{
    active=false;const elapsed=performance.now()-began;
    report.textContent=JSON.stringify({experiment,screen:origin,endScreen:screen(),elapsedMs:elapsed,hiddenDuringCapture:hidden,canvas:[renderer.canvas.width,renderer.canvas.height],raf:summary(gaps),rafGapsOver25:gaps.filter(n=>n>25).length,rafGapsOver50:gaps.filter(n=>n>50).length,render:summary(durations),rendersPerSecond:durations.length*1000/elapsed,snapshots,snapshotMs,advanceMs,dispatches,pointerMoves:moves,longAnimationFrames:loafs,longAnimationMs:loafMs,forcedLayoutMs,cache:{allocatedMiB:(art.stats.allocatedBytes-initial.allocatedBytes)/1048576,evictions:art.stats.evictions-initial.evictions,hits:art.stats.cacheHits-initial.cacheHits,misses:art.stats.vectorDraws-initial.vectorDraws,liveMiB:art.stats.cachedBytes/1048576,pathBuilds:art.stats.pathBuilds-initial.pathBuilds},topDraws:Object.entries(byId).sort((a,b)=>b[1].ms-a[1].ms).slice(0,12).map(([id,cost])=>({id,name:assets.symbols.get(Number(id))?.name,...cost}))},(_,value)=>typeof value==='number'?Math.round(value*100)/100:value,2);
    art.profilingOmitFilters=false;art.clearCache();start.disabled=false;
  };
  start.onclick=()=>{
    origin=screen();experiment=mode.value;art.profilingOmitFilters=experiment==='no-filters';art.clearCache();initial={...art.stats};durations=[];gaps=[];byId={};snapshots=0;snapshotMs=0;advanceMs=0;dispatches=0;moves=0;loafs=0;loafMs=0;forcedLayoutMs=0;hidden=document.hidden;lastRaf=0;
    began=performance.now();ends=began+15000;active=true;start.disabled=true;report.textContent='Capturing…';
  };
  const raf=(now:number):void=>{if(active){hidden ||= document.hidden;if(lastRaf)gaps.push(now-lastRaf);lastRaf=now;if(performance.now()>=ends)finish();}requestAnimationFrame(raf);};requestAnimationFrame(raf);
  if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')){
    new PerformanceObserver(list=>{if(!active)return;for(const e of list.getEntries()){
      if(e.startTime<began)continue;loafs++;loafMs+=e.duration;
      const scripts=(e as PerformanceEntry & {scripts?:{forcedStyleAndLayoutDuration:number}[]}).scripts??[];
      forcedLayoutMs+=scripts.reduce((n,s)=>n+s.forcedStyleAndLayoutDuration,0);
    }}).observe({type:'long-animation-frame'});
  }
  const descriptor=Object.getOwnPropertyDescriptor(game,'state')!;
  Object.defineProperty(game,'state',{get(){if(!active)return descriptor.get!.call(game);const t=performance.now();const s=descriptor.get!.call(game);snapshotMs+=performance.now()-t;snapshots++;return s;}});
  const advance=game.advance.bind(game);game.advance=ms=>{if(!active)return advance(ms);const t=performance.now(),events=advance(ms);advanceMs+=performance.now()-t;return events;};
  const dispatch=game.dispatch.bind(game);game.dispatch=command=>{if(active){dispatches++;if(command.type==='move-pointer')moves++;}return dispatch(command);};
  const draw=renderer.draw.bind(renderer);renderer.draw=state=>{if(!active)return draw(state);const t=performance.now();draw(state);durations.push(performance.now()-t);};
  const vectorDraw=art.draw.bind(art);art.draw=(ctx,id,matrix,frame,alpha,useCache,ratio,effects)=>{
    if(!active)return vectorDraw(ctx,id,matrix,frame,alpha,useCache,ratio,effects);
    if(experiment===`skip-${id}` || experiment==='skip-traffic' && [204,206,210,215,218].includes(id))return true;
    const before={...art.stats},t=performance.now();const result=vectorDraw(ctx,id,matrix,frame,alpha,experiment==='no-cache'?false:useCache,ratio,effects),ms=performance.now()-t;
    const cost=byId[id]??(byId[id]={calls:0,ms:0,max:0,misses:0,allocatedMiB:0,evictions:0,gradients:0,filters:0});cost.calls++;cost.ms+=ms;cost.max=Math.max(cost.max,ms);cost.misses+=art.stats.vectorDraws-before.vectorDraws;cost.allocatedMiB+=(art.stats.allocatedBytes-before.allocatedBytes)/1048576;cost.evictions+=art.stats.evictions-before.evictions;cost.gradients+=art.stats.gradients-before.gradients;cost.filters+=art.stats.filterPlacements-before.filterPlacements;
    return result;
  };
}
