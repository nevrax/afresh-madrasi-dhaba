import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
const production=process.argv.includes('--production-reuse');
const layers=process.argv.includes('--layers'),dirty=process.argv.includes('--dirty'),unchanged=production||process.argv.includes('--unchanged');
const root=path.resolve(import.meta.dirname,'..'), output=path.join(root,`.local-setup/logs/${layers?'scene-layers-check':dirty?'dirty-scene-check':unchanged?(production?'production-frame-check':'unchanged-frame-check'):'scene-retention-check'}`);await mkdir(output,{recursive:true});
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-scene-check'),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:{width:1480,height:1000},deviceScaleFactor:3,args:['--use-angle=d3d11','--force-high-performance-gpu']});
try{
 const page=context.pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
 const result=await page.evaluate(async ({layers,dirty,unchanged,production})=>{
  const {Assets}=await import('/build/modules/src/render/assets.js'),{Renderer}=await import('/build/modules/src/render/renderer.js'),{fixture}=await import('/build/modules/development/verification/component-study.js');
  const canvas=document.querySelector('canvas'),reference=document.createElement('canvas');document.body.append(reference);reference.style.position='fixed';reference.style.visibility='hidden';
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true}),ref=reference.getContext('2d',{alpha:false,willReadFrequently:true});
  const assets=new Assets();await assets.load();const renderer=new Renderer(canvas,assets),baseline=new Renderer(reference,assets);await Promise.all([renderer.load(),baseline.load()]);await document.fonts.ready;baseline.diagnosticFullSceneRedraw=true;
  renderer.diagnosticFullFrameRedraw=unchanged&&!production;
  const reuse=production?renderer.frameCounts:unchanged?(await import('/development/verification/unchanged-frame-experiment.js')).unchangedFrames(renderer):null;
  if(dirty)(await import('/development/verification/dirty-scene-experiment.js')).dirtyScene(renderer);
  const layerExperiment=layers?(await import('/development/verification/scene-layers-experiment.js')).retainSceneLayers(renderer):null;
  const combined=document.createElement('canvas'),combinedCtx=combined.getContext('2d',{alpha:false,willReadFrequently:true});
  const checks=[];
  for(const width of [880,2200,2970,880]){
   for(const c of [canvas,reference]){c.style.width=width/devicePixelRatio+'px';c.style.height=width*400/550/devicePixelRatio+'px';}
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   for(const profile of ['extra','classic','extra']){
    renderer.setPresentation(profile);baseline.setPresentation(profile);
    for(const screen of ['menu','instructions','playing','day-result','game-over']){
     const state=fixture();state.screen=screen;for(const r of [renderer,baseline])r.events([{type:'screen',screen}],{...state,timeMs:0});
     for(let sample=0;sample<6;sample++){
      const time=[0,0,725,725,2250,2250][sample];state.timeMs=16000+time;state.cash=sample;state.pointer.x=sample%2?535:100;state.pointer.y=sample%2?26:330;state.audio.enabled=sample%2===0;
      state.tutorial.visible=screen==='instructions';state.tutorial.elapsedMs=time;state.tutorial.childElapsedMs=time;
      state.customers.forEach((c,i)=>{c.characterPose=1+sample;c.visible=i!==sample;c.orderRemaining=i+sample;c.patience=-50+sample;c.phaseElapsedMs=time+sample*100;});
      baseline.draw(state);renderer.draw(state);renderer.draw(state);
      let output=ctx;
      if(layers){combined.width=canvas.width;combined.height=canvas.height;combinedCtx.drawImage(canvas,0,0);const foreground=canvas.nextElementSibling;if(foreground instanceof HTMLCanvasElement&&!foreground.hidden)combinedCtx.drawImage(foreground,0,0);output=combinedCtx;}
      const expected=ref.getImageData(0,0,reference.width,reference.height).data,actual=output.getImageData(0,0,canvas.width,canvas.height).data;let different=0,maxDelta=0;
      for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);if(d)different++;maxDelta=Math.max(maxDelta,d);}
      checks.push({width,profile,screen,sample,different,maxDelta,hitsEqual:JSON.stringify(renderer.hits)===JSON.stringify(baseline.hits),cacheBytes:renderer.sceneCacheBytes});
     }
    }
   }
  }
  if(unchanged){
    const {createGame}=await import('/build/modules/src/core/game.js');const game=createGame({random:()=>0});
    renderer.setPresentation('extra');baseline.setPresentation('extra');
    const events=value=>{for(const r of [renderer,baseline])r.events(value,game.state);};
    const command=value=>events(game.dispatch(value));events(game.advance(0));command({type:'start'});command({type:'play'});
    for(let tick=0;tick<2160;tick++){
      const before=game.state;
      for(let slot=0;slot<3;slot++){const d=before.food[slot];if(!d){command({type:'pick-batter'});command({type:'click-slot',slot});}else if(d.pose>=71&&d.pose<160)command({type:'click-slot',slot});else if(d.pose>=327&&d.pose<430){command({type:'click-slot',slot});command({type:'click-plate'});}}
      for(const customer of game.state.customers)if(customer.orderVisible&&game.state.plate.length){command({type:'click-plate'});command({type:'click-customer',customer:customer.id});}
      command({type:'move-pointer',x:275+200*Math.sin(tick/9),y:335+15*Math.cos(tick/5)});events(game.advance(1000/12));
      if(tick%18!==0)continue;
      const state=game.state;baseline.draw(state);renderer.draw(state);renderer.draw(state);
      const expected=ref.getImageData(0,0,reference.width,reference.height).data,actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;let different=0,maxDelta=0;
      for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);if(d)different++;maxDelta=Math.max(maxDelta,d);}
      checks.push({width:canvas.width,profile:'extra',screen:state.screen,sample:tick,scenario:'production-day',different,maxDelta,hitsEqual:JSON.stringify(renderer.hits)===JSON.stringify(baseline.hits),cacheBytes:renderer.sceneCacheBytes});
    }
  }
  renderer.setPresentation('classic');layerExperiment?.dispose();return{checks,reuse,releasedBytes:renderer.sceneCacheBytes};
 },{layers,dirty,unchanged,production});
 await writeFile(path.join(output,'results.json'),JSON.stringify({...result,errors},null,2));
 const failures=result.checks.filter(c=>(layers?c.maxDelta>2:c.different)||!c.hitsEqual||c.profile==='classic'&&c.cacheBytes);
 console.log(JSON.stringify({cases:result.checks.length,failures,releasedBytes:result.releasedBytes,errors}));assert.equal(failures.length,0);assert.equal(errors.length,0);assert.equal(result.releasedBytes,0);
}finally{await context.close();}
