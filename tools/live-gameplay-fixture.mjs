// Real elapsed-time production core/renderer/audio. Deterministic command bot;
// DOM pointer, fullscreen and direct-file interaction checks are separate.
export async function measureLiveGameplay(page, config) {
  await page.mouse.click(10,10);
  return page.evaluate(async config=>{
    const {createGame}=await import('/build/modules/src/core/game.js');
    const {Assets}=await import('/build/modules/src/render/assets.js');
    const {Renderer}=await import('/build/modules/src/render/renderer.js');
    const {GameAudio}=await import('/build/modules/src/audio/audio.js');
    const canvas=document.querySelector('canvas');
    const cssWidth=config.nativeViewport?Math.min(1100,innerWidth,Math.max(1,innerHeight-40)*550/400):config.width/devicePixelRatio;
    canvas.style.width=cssWidth+'px';canvas.style.height=cssWidth*400/550+'px';
    if(config.stageOptions)canvas.getContext('2d',{alpha:false,...config.stageOptions});
    const assets=new Assets();await assets.load();const renderer=new Renderer(canvas,assets);await renderer.load();renderer.setPresentation(config.presentation??'extra');
    if(config.cpuFilters)assets.vector.profilingCpuFilters=true;
    if(config.coldProbe)assets.vector.profiling=true;
    if(config.canvasBatter)renderer.pointerType='touch'; // Rendering fallback control, not physical touch input.
    if(config.nativeViewport)renderer.renderScale=config.width/(cssWidth*devicePixelRatio);
    const renderWork={sceneBuilds:0,sceneBuildMs:0,sceneCalls:0,sceneMs:0,foodMs:0};
    if(config.renderWork)for(const [method,count,time] of [['drawScene','sceneBuilds','sceneBuildMs'],['drawRetainedScene','sceneCalls','sceneMs'],['food',null,'foodMs']]){const original=renderer[method].bind(renderer);renderer[method]=(...args)=>{const at=performance.now();try{return original(...args);}finally{if(count)renderWork[count]++;renderWork[time]+=performance.now()-at;}};}
    if(config.fullSceneRedraw)renderer.diagnosticFullSceneRedraw=true;
    renderer.diagnosticFullFrameRedraw=Boolean(config.fullFrameRedraw||config.unchangedFrames);
    const dirty=config.dirtyScene?(await import('/development/verification/dirty-scene-experiment.js')).dirtyScene(renderer):null;
    const unchanged=config.unchangedFrames?(await import('/development/verification/unchanged-frame-experiment.js')).unchangedFrames(renderer):null;
    const batterLayer=config.batterLayer?(await import('/development/verification/batter-layer-experiment.js')).batterLayer(renderer,config.nativeCursor):null;
    const audio=new GameAudio(assets);if(!config.silentOutput)audio.activate();const game=createGame(config.variedCustomers?{}:{random:()=>0});
    const events=value=>{if(value.length){renderer.events(value,game.state);if(!config.silentOutput)audio.handle(value);}};
    const command=value=>events(game.dispatch(value)),advance=ms=>events(game.advance(ms));
    const bot=()=>{
      if(config.noBot)return;
      const before=game.state;
      if(config.heldDosa&&before.pointer.mode==='dosa')return;
      if(config.heldPlate&&before.pointer.mode==='plate')return;
      for(let slot=0;slot<3;slot++){
        const d=before.food[slot];
        if(!d){command({type:'pick-batter'});command({type:'click-slot',slot});}
        else if(d.pose>=71&&d.pose<160)command({type:'click-slot',slot});
        else if(d.pose>=327&&d.pose<430){command({type:'click-slot',slot});if(config.heldDosa)return;command({type:'click-plate'});}
      }
      const state=game.state;
      if(config.heldPlate&&state.plate.length){command({type:'click-plate'});return;}
      for(const customer of state.customers)if(customer.orderVisible&&state.plate.length){command({type:'click-plate'});command({type:'click-customer',customer:customer.id});}
    };
    const summarize=values=>{const v=[...values].sort((a,b)=>a-b);return{p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],max:v.at(-1),over50:v.filter(n=>n>50).length};};
    const next=()=>new Promise(requestAnimationFrame),gaps=[],draws=[],simulation=[],snapshot=[],warmGaps=[],warmDraws=[];
    let peakBytes=0,nextMemory=0,hidden=false,warmStart=0,accumulator=0,playingFrames=0,hiddenSamples=0,unfocusedSamples=0;
    let preparationMs=0,previousCold=null;
    const coldEvents=[],previousGroups=new Map();
    const phases=new Map();let maximumCustomers=0,maximumFood=0;
    try{
      await next();await next();
      if(config.prepareScenes)await (await import('/development/verification/prepare-scenes-experiment.js')).prepareScenes(renderer);
      if(config.prepared){
        advance(0);renderer.draw(game.state);command({type:'start'});renderer.draw(game.state);
        const preparingAt=performance.now();await renderer.prepare();preparationMs=performance.now()-preparingAt;
      }
      if(config.prepareGriddle)await (await import('/development/verification/prepare-scenes-experiment.js')).prepareGriddle(renderer);
      if(config.prepareFood){const at=performance.now();await (await import('/development/verification/prepare-scenes-experiment.js')).prepareFood(renderer,config.prepareFood==='cooking-cycle');preparationMs+=performance.now()-at;}
      if(config.coldProbe){assets.vector.groupCosts.clear();for(const key of Object.keys(assets.vector.stats))assets.vector.stats[key]=0;}
      advance(0);command({type:'start'});command({type:'play'});bot();
      let began=await next(),last=began;
      while(last-began<(config.measurementMs??180000)){
        const now=await next(),gap=now-last;last=now;hidden ||= document.hidden;hiddenSamples+=Number(document.hidden);unfocusedSamples+=Number(!document.hasFocus());
        if(!warmStart&&now-began>=30000){warmStart=now-gap;if(window.__measureWarmCpu)await window.__measureWarmCpu('start');}
        const at=performance.now();let remaining=gap;
        while(remaining>0){const step=Math.min(remaining,1000/12-accumulator);advance(step);remaining-=step;accumulator+=step;if(accumulator>=1000/12-1e-8){bot();accumulator=0;}}
        if(config.heldBatter)command({type:'pick-batter'});
        command({type:'move-pointer',x:275+200*Math.sin((now-began)/700),y:335+15*Math.cos((now-began)/430)});
        const simulated=performance.now(),state=game.state,snapshotted=performance.now();renderer.draw(state);const drawn=performance.now();
        if(config.coldProbe&&now-began<20000){
          const groups=[];
          for(const [id,total] of assets.vector.groupCosts){const previous=previousGroups.get(id);if(!previous||total.builds!==previous.builds)groups.push({id,builds:total.builds-(previous?.builds??0),milliseconds:total.milliseconds-(previous?.milliseconds??0),bytes:total.bytes-(previous?.bytes??0),filtered:total.filtered-(previous?.filtered??0)});previousGroups.set(id,{...total});}
          const sample={elapsedMs:now-began,gap,drawMs:drawn-snapshotted,groups};
          if((gap>30||sample.drawMs>6)&&coldEvents.length<120)coldEvents.push({previous:previousCold,current:sample});
          previousCold=sample;
        }
        gaps.push(gap);draws.push(drawn-snapshotted);simulation.push(simulated-at);snapshot.push(snapshotted-simulated);
        const phase=phases.get(state.screen)??{gaps:[],draws:[]};phase.gaps.push(gap);phase.draws.push(drawn-snapshotted);phases.set(state.screen,phase);
        maximumCustomers=Math.max(maximumCustomers,state.customers.filter(c=>c.visible).length);maximumFood=Math.max(maximumFood,state.food.filter(Boolean).length);
        if(state.screen==='playing')playingFrames++;
        if(warmStart){warmGaps.push(gap);warmDraws.push(drawn-snapshotted);}
        if(now>=nextMemory){const memory=assets.vector.memorySummary();peakBytes=Math.max(peakBytes,memory.accountedBackingBytes+renderer.sceneCacheBytes+audio.memoryBytes+(renderer.cursorDataBytes??0));nextMemory=now+1000;}
      }
      const terminalPresentationGap=(await next())-last;
      if(warmStart&&window.__measureWarmCpu)await window.__measureWarmCpu('end');
      const rect=canvas.getBoundingClientRect(),geometry={viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,fullyInsideViewport:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight}};
      return{config,phases:[...phases].map(([screen,p])=>({screen,seconds:p.gaps.reduce((s,v)=>s+v,0)/1000,fps:p.gaps.length*1000/p.gaps.reduce((s,v)=>s+v,0),raf:summarize(p.gaps),draw:summarize(p.draws)})),maximumCustomers,maximumFood,preparationMs,coldProbe:config.coldProbe?{events:coldEvents,stats:assets.vector.stats,groups:[...assets.vector.groupCosts].map(([id,cost])=>({id,...cost}))}:null,contextAttributes:canvas.getContext('2d').getContextAttributes(),unchangedFrames:unchanged??renderer.frameCounts,geometry,hiddenSamples,unfocusedSamples,terminalPresentationGap,renderWork:config.renderWork?renderWork:null,dirtyScene:dirty?.stats,canvas:[canvas.width,canvas.height],seconds:(last-began)/1000,fps:gaps.length*1000/(last-began),raf:summarize(gaps),draw:summarize(draws),simulationIncludingCommandsAndAudio:summarize(simulation),snapshot:summarize(snapshot),warm:{seconds:(last-warmStart)/1000,fps:warmGaps.length*1000/(last-warmStart),raf:summarize(warmGaps),draw:summarize(warmDraws)},playingFrames,frames:gaps.length,state:{screen:game.state.screen,cash:game.state.cash,lostCustomers:game.state.lostCustomers,clockMinutes:game.state.clockMinutes},audio:{state:audio.playbackState,bytes:audio.memoryBytes,activeSources:audio.activeSources,missing:[...audio.missing]},memory:{peakAccountedBytes:peakBytes,sceneBytes:renderer.sceneCacheBytes,...assets.vector.memorySummary()},cache:null,hidden,missingAssets:[...assets.failures]};
    }finally{batterLayer?.dispose();renderer.clearSceneCache();assets.vector.clearCache();await audio.dispose();}
  },config);
}
