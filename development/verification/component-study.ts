import { createGame, type GameState } from '../../src/core/game.js';
import { GameAudio } from '../../src/audio/audio.js';
import type { Assets } from '../../src/render/assets.js';
import { Renderer, type RenderGroup } from '../../src/render/renderer.js';
import { createPerformanceHud } from '../../src/ui/performance-hud.js';
const next=():Promise<number>=>new Promise(resolve=>requestAnimationFrame(resolve));
const summarize=(values:number[])=>{values.sort((a,b)=>a-b);return{p50:values[Math.floor(values.length*.5)]??0,p95:values[Math.floor(values.length*.95)]??0,p99:values[Math.floor(values.length*.99)]??0,over50:values.filter(v=>v>50).length,max:values.at(-1)??0};};
/** Deliberately synthetic visual stress fixture, not a gameplay-equivalence oracle.
 * Five source customer identities, three mixed-side dosas and a carried plate.
 * Continuous time and moving pointer match the live renderer's input cadence. */
export function fixture():GameState{
 const game=createGame({random:()=>0});game.advance(0);game.dispatch({type:'start'});game.dispatch({type:'play'});game.advance(16000);const s=game.snapshot();
 s.customers.forEach((c,i)=>Object.assign(c,{table:i,visible:true,characterVisible:true,exitVisible:false,orderVisible:true,phase:'ordering',orderRemaining:i%4+1,patience:-50-i,angry:i===3,angrySinceMs:15000,characterPose:1}));s.tables=[0,1,2,3,4];
 s.food=[...Array(18)].map((_,i)=>i<3?{id:i+1,slot:i,phase:i===0?'first-side':'second-side',elapsedMs:7000,held:false,pose:i===0?90:327,smokePose:i===0?null:1}:null);
 s.plate=[{id:20,slot:0,phase:'second-side',elapsedMs:7000,held:true,pose:327,smokePose:1,x:40,y:330}];s.pointer.mode='plate';return s;
}
type Variant={name:string;omit?:RenderGroup;scale?:number;quantized?:boolean;audio?:boolean;cpu?:boolean;hud?:boolean;hitTests?:boolean;idle?:boolean;fullMorph?:boolean};
export async function runComponentStudy(renderer:Renderer,assets:Assets,progress:(text:string)=>void):Promise<unknown>{
 const canvas=renderer.canvas,art=assets.vector!,style=canvas.style.cssText,originalScale=renderer.renderScale,originalCost=renderer.onRenderCost,originalCpu=art.profilingCpuFilters,originalProfile=art.profiling;
 const audio=new GameAudio(assets);const state=fixture(),baseTime=16000;const hud=createPerformanceHud(canvas,()=>({tiles:art.stats.cachedBytes,pool:art.stats.pooledBytes,filters:art.filterStats.backingBytes,audio:audio.memoryBytes}),()=>JSON.stringify(art.gpuSummary()));
 const contains=assets.contains.bind(assets),results:unknown[]=[];let gpu:unknown=null;
 const variants:Variant[]=[{name:'continuous baseline A'},{name:'quantized12Hz control',quantized:true},{name:'without griddle steam',omit:'griddle-steam'},{name:'without dosa steam',omit:'dosa-steam'},{name:'without traffic',omit:'traffic'},{name:'without customers',omit:'customers'},{name:'without radio',omit:'radio'},{name:'without background',omit:'background'},{name:'without hit tests',hitTests:false},{name:'audio running',audio:true},{name:'HUD enabled',hud:true},{name:'50% render scale',scale:.5},{name:'CPU filters',cpu:true},{name:'continuous baseline B'},{name:'idle scheduling, no drawing',idle:true}];
 // Short paired run uses exactly the same fixture, warmup and measurement windows.
 const mode=new URLSearchParams(location.search).get('study'),originalMorph=art.diagnosticFullMorphCache;
 if(mode==='paired')variants.splice(0,variants.length,{name:'continuous baseline A'},{name:'50% render scale',scale:.5},{name:'continuous baseline B'});
 if(mode==='cache')variants.splice(0,variants.length,{name:'old cache 100% A',fullMorph:true},{name:'new cache 100% A'},{name:'old cache 50%',fullMorph:true,scale:.5},{name:'new cache 50%',scale:.5},{name:'old cache 100% B',fullMorph:true},{name:'new cache 100% B'});
 try{
  canvas.style.position='fixed';canvas.style.left='0';canvas.style.top='0';canvas.style.zIndex='10000';
  canvas.style.width='min(990px,100vw,calc(100vh * 550 / 400))';canvas.style.height='auto';await next();await next();
  audio.activate();audio.handle([{type:'sound',name:'bgMusic1',loop:100},{type:'sound',name:'sound-446',loop:100}]);await audio.diagnosticSuspend(true);
  for(const variant of variants){
   renderer.diagnosticOmissions.clear();art.diagnosticOmitChildren.clear();
   if(variant.omit)renderer.diagnosticOmissions.add(variant.omit);
   if(variant.omit==='griddle-steam')art.diagnosticOmitChildren.add('224:223');
   if(variant.omit==='dosa-steam')art.diagnosticOmitChildren.add('472:223');
   art.diagnosticFullMorphCache=variant.fullMorph??false;
   renderer.setRenderScale(variant.scale??1);art.profilingCpuFilters=variant.cpu??false;art.profiling=true;art.clearCache();art.groupCosts.clear();
   assets.contains=variant.hitTests===false?()=>false:contains;hud.setEnabled(variant.hud??false);hud.element.open=variant.hud??false;hud.element.style.zIndex='10001';
   await audio.diagnosticSuspend(!variant.audio);renderer.events([{type:'screen',screen:'playing'}],{...state,timeMs:0});
   let start=await next(),last=start,began=0,nextProgress=0;const gaps:number[]=[],draws:number[]=[];const groups:Record<string,{calls:number;ms:number}>={};let initial={...art.stats},hidden=false;
   renderer.onRenderCost=(group,ms)=>{if(began){const entry=groups[group]??(groups[group]={calls:0,ms:0});entry.calls++;entry.ms+=ms;}};
   while(last-start<12000){
    const now=await next(),elapsed=now-last;last=now;hidden ||= document.hidden;const local=(now-start)%6000,pose=Math.floor(local*12/1000);
    state.timeMs=baseTime+(variant.quantized?Math.floor(local*12/1000)*1000/12:local);state.clockMinutes=556+Math.floor(local/1000);
    state.pointer.x=275+230*Math.sin(local/700);state.pointer.y=327+20*Math.cos(local/430);state.platePosition.x=state.pointer.x;state.platePosition.y=state.pointer.y;
    state.counterPosition.x=state.pointer.x;state.counterPosition.y=state.pointer.y+35;
    state.plate[0]!.x=state.pointer.x;state.plate[0]!.y=state.pointer.y;state.plate[0]!.smokePose=pose%12+1;
    state.food.forEach((d,i)=>{if(d){d.pose=i===0?71+pose%70:327;d.smokePose=i===0?null:pose%12+1;}});
    state.customers.forEach(c=>{c.characterPose=1;c.phaseElapsedMs=pose*1000/12;c.patience=-50-c.id+(pose%20)*.05;});
    if(!began&&now-start>=6000){began=now-elapsed;initial={...art.stats};}
    const at=performance.now();if(!variant.idle)renderer.draw(state);const draw=performance.now()-at;
    if(began){gaps.push(elapsed);draws.push(draw);}
    if(variant.hud)hud.sample({now,elapsedMs:elapsed,simulationMs:0,renderMs:draw,audioMs:0,snapshotMs:0});
    if(now>=nextProgress){progress(`Component study: ${variant.name} — ${Math.round((now-start)/1000)}/12 s`);nextProgress=now+1000;}
   }
   const box=canvas.getBoundingClientRect();results.push({name:variant.name,frames:draws.length,seconds:(last-began)/1000,fps:draws.length*1000/(last-began),raf:summarize(gaps),draw:summarize(draws),groups:Object.entries(groups).sort((a,b)=>b[1].ms-a[1].ms).map(([name,v])=>({name,...v,msPerFrame:v.ms/draws.length})),cache:{newBytes:art.stats.allocatedBytes-initial.allocatedBytes,liveBytes:art.stats.cachedBytes,evictions:art.stats.evictions-initial.evictions,byteEvictions:art.stats.byteEvictions-initial.byteEvictions,entryEvictions:art.stats.entryEvictions-initial.entryEvictions,morphReplacements:art.stats.morphReplacements-initial.morphReplacements},hidden,canvas:[canvas.width,canvas.height],display:[box.width,box.height],hud:variant.hud?hud.element.textContent:null,gpu:art.gpuSummary(),audio:{state:audio.playbackState,sources:audio.activeSources,bytes:audio.memoryBytes},memory:art.memorySummary()});gpu=art.gpuSummary();
  }
  return{status:'MEASURED',fixture:'Synthetic five customer identities, three mixed-side dosas, carried plate and continuous pointer/time; not a game-equivalence test',warmupMs:6000,windowMs:6000,devicePixelRatio,viewport:[innerWidth,innerHeight],gpu,results,limits:'Group timings are JS submission time, not GPU duration. Griddle group includes black base; omission removes only its steam child. Audio compares actual context suspension, not game mute. Hardware selection and total CPU/RAM are not inferred from these timings.'};
 }finally{art.diagnosticFullMorphCache=originalMorph;renderer.onRenderCost=originalCost;renderer.diagnosticOmissions.clear();art.diagnosticOmitChildren.clear();art.profilingCpuFilters=originalCpu;art.profiling=originalProfile;assets.contains=contains;renderer.setRenderScale(originalScale);art.clearCache();await audio.dispose();hud.element.remove();canvas.style.cssText=style;}
}
