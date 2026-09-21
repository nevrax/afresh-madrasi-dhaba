// Shared exact-density renderer fixture. Rendering happens entirely in the target browser.
export async function measureFullResolutionFixture(page,config){
  return page.evaluate(async config=>{
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
   while(last-start<(config.warmupMs??6000)+(config.measurementMs??6000)){const now=await next(),gap=now-last;last=now;const local=(now-start)%6000,pose=Math.floor(local*12/1000);state.timeMs=16000+local;state.clockMinutes=556+Math.floor(local/1000);state.pointer.x=275+230*Math.sin(local/700);state.pointer.y=327+20*Math.cos(local/430);state.platePosition.x=state.pointer.x;state.platePosition.y=state.pointer.y;state.counterPosition.x=state.pointer.x;state.counterPosition.y=state.pointer.y+35;Object.assign(state.plate[0],{x:state.pointer.x,y:state.pointer.y,smokePose:pose%12+1});state.food.forEach((d,i)=>{if(d){d.pose=i===0?71+pose%70:327;d.smokePose=i===0?null:pose%12+1}});state.customers.forEach(c=>{c.characterPose=1;c.phaseElapsedMs=pose*1000/12;c.patience=-50-c.id+(pose%20)*.05});if(!began&&now-start>=(config.warmupMs??6000)){began=now-gap;initial={...art.stats};art.groupCosts.clear()}const at=performance.now();renderer.draw(state);if(began){gaps.push(gap);draws.push(performance.now()-at)}}
   const stats=a=>{a.sort((x,y)=>x-y);return{p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(v=>v>50).length}};
   const result={config,canvas:[canvas.width,canvas.height],fps:gaps.length*1000/(last-began),raf:stats(gaps),draw:stats(draws),groups:Object.entries(groups).map(([name,ms])=>({name,msPerFrame:ms/gaps.length})).sort((a,b)=>b.msPerFrame-a.msPerFrame),cache:{allocations:art.stats.allocatedBytes-initial.allocatedBytes,evictions:art.stats.evictions-initial.evictions,morphReplacements:art.stats.morphReplacements-initial.morphReplacements,filterBuilds:art.stats.filterPlacements-initial.filterPlacements},memory:art.memorySummary(),builds:[...art.groupCosts].map(([id,cost])=>({id,...cost})).sort((a,b)=>b.milliseconds-a.milliseconds).slice(0,10),hidden:document.hidden};art.clearCache();return result;
  },config);
}
