// Real elapsed-time production core/renderer/audio. Deterministic command bot;
// DOM pointer, fullscreen and direct-file interaction checks are separate.
export async function measureLiveGameplay(page, config) {
  await page.mouse.click(10,10);
  return page.evaluate(async config=>{
    const {createGame}=await import('/build/modules/src/core/game.js');
    const {Assets}=await import('/build/modules/src/render/assets.js');
    const {Renderer}=await import('/build/modules/src/render/renderer.js');
    const {GameAudio}=await import('/build/modules/src/audio/audio.js');
    const canvas=document.querySelector('canvas');canvas.style.width=config.width/devicePixelRatio+'px';canvas.style.height=config.width*400/550/devicePixelRatio+'px';
    const assets=new Assets();await assets.load();const renderer=new Renderer(canvas,assets);await renderer.load();renderer.setPresentation(config.presentation??'extra');
    if(config.fullSceneRedraw)renderer.diagnosticFullSceneRedraw=true;
    const audio=new GameAudio(assets);audio.activate();const game=createGame({random:()=>0});
    const events=value=>{if(value.length){renderer.events(value,game.state);audio.handle(value);}};
    const command=value=>events(game.dispatch(value)),advance=ms=>events(game.advance(ms));
    const bot=()=>{
      const before=game.state;
      for(let slot=0;slot<3;slot++){
        const d=before.food[slot];
        if(!d){command({type:'pick-batter'});command({type:'click-slot',slot});}
        else if(d.pose>=71&&d.pose<160)command({type:'click-slot',slot});
        else if(d.pose>=327&&d.pose<430){command({type:'click-slot',slot});command({type:'click-plate'});}
      }
      const state=game.state;
      for(const customer of state.customers)if(customer.orderVisible&&state.plate.length){command({type:'click-plate'});command({type:'click-customer',customer:customer.id});}
    };
    const summarize=values=>{const v=[...values].sort((a,b)=>a-b);return{p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],max:v.at(-1),over50:v.filter(n=>n>50).length};};
    const next=()=>new Promise(requestAnimationFrame),gaps=[],draws=[],simulation=[],snapshot=[],warmGaps=[],warmDraws=[];
    let peakBytes=0,nextMemory=0,hidden=false,warmStart=0,accumulator=0,playingFrames=0;
    try{
      await next();await next();advance(0);command({type:'start'});command({type:'play'});bot();
      let began=await next(),last=began;
      while(last-began<(config.measurementMs??180000)){
        const now=await next(),gap=now-last;last=now;hidden ||= document.hidden;
        if(!warmStart&&now-began>=30000){warmStart=now-gap;if(window.__measureWarmCpu)await window.__measureWarmCpu('start');}
        const at=performance.now();let remaining=gap;
        while(remaining>0){const step=Math.min(remaining,1000/12-accumulator);advance(step);remaining-=step;accumulator+=step;if(accumulator>=1000/12-1e-8){bot();accumulator=0;}}
        command({type:'move-pointer',x:275+200*Math.sin((now-began)/700),y:335+15*Math.cos((now-began)/430)});
        const simulated=performance.now(),state=game.state,snapshotted=performance.now();renderer.draw(state);const drawn=performance.now();
        gaps.push(gap);draws.push(drawn-snapshotted);simulation.push(simulated-at);snapshot.push(snapshotted-simulated);
        if(state.screen==='playing')playingFrames++;
        if(warmStart){warmGaps.push(gap);warmDraws.push(drawn-snapshotted);}
        if(now>=nextMemory){const memory=assets.vector.memorySummary();peakBytes=Math.max(peakBytes,memory.accountedBackingBytes+renderer.sceneCacheBytes+audio.memoryBytes);nextMemory=now+1000;}
      }
      if(warmStart&&window.__measureWarmCpu)await window.__measureWarmCpu('end');
      return{config,canvas:[canvas.width,canvas.height],seconds:(last-began)/1000,fps:gaps.length*1000/(last-began),raf:summarize(gaps),draw:summarize(draws),simulationIncludingCommandsAndAudio:summarize(simulation),snapshot:summarize(snapshot),warm:{seconds:(last-warmStart)/1000,fps:warmGaps.length*1000/(last-warmStart),raf:summarize(warmGaps),draw:summarize(warmDraws)},playingFrames,frames:gaps.length,state:{screen:game.state.screen,cash:game.state.cash,clockMinutes:game.state.clockMinutes},audio:{state:audio.playbackState,bytes:audio.memoryBytes,activeSources:audio.activeSources,missing:[...audio.missing]},memory:{peakAccountedBytes:peakBytes,sceneBytes:renderer.sceneCacheBytes,...assets.vector.memorySummary()},cache:null,hidden,missingAssets:[...assets.failures]};
    }finally{renderer.clearSceneCache();assets.vector.clearCache();await audio.dispose();}
  },config);
}
