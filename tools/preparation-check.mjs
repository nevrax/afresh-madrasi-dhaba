import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.local-setup/logs/preparation-check');await mkdir(output,{recursive:true});
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-preparation-check'),{executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,viewport:{width:1480,height:1000},deviceScaleFactor:3,args:['--use-angle=d3d11','--force-high-performance-gpu']});
try{
  const page=context.pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
  const checks=await page.evaluate(async()=>{
    const {Assets}=await import('/build/modules/src/render/assets.js'),{Renderer}=await import('/build/modules/src/render/renderer.js'),{fixture}=await import('/build/modules/development/verification/component-study.js');
    const canvas=document.querySelector('canvas'),reference=document.createElement('canvas');document.body.append(reference);reference.style.position='fixed';reference.style.visibility='hidden';
    const assets=new Assets(),referenceAssets=new Assets();await Promise.all([assets.load(),referenceAssets.load()]);
    const prepared=new Renderer(canvas,assets),baseline=new Renderer(reference,referenceAssets);await Promise.all([prepared.load(),baseline.load()]);
    const results=[];
    for(const width of [880,2200,2970])for(const profile of ['classic','extra']){
      for(const c of [canvas,reference]){c.style.width=width/devicePixelRatio+'px';c.style.height=width*400/550/devicePixelRatio+'px';}
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      prepared.setPresentation(profile);baseline.setPresentation(profile);
      const started=performance.now();await prepared.prepare();const preparationMs=performance.now()-started;
      for(const screen of ['menu','instructions','playing','day-result','game-over'])for(const time of [0,725,2250]){
        const state=fixture();state.screen=screen;state.timeMs=time;state.tutorial.visible=false;
        baseline.draw(state);prepared.draw(state);
        const expected=reference.getContext('2d').getImageData(0,0,reference.width,reference.height).data;
        const actual=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let different=0,maxDelta=0;for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-expected[i]);different+=Number(d!==0);maxDelta=Math.max(maxDelta,d);}
        results.push({width,profile,screen,time,different,maxDelta,hitsEqual:JSON.stringify(prepared.hits)===JSON.stringify(baseline.hits),preparationMs});
      }
      const memory=assets.vector.memorySummary();if(memory.tileBytes>memory.tileBudgetBytes)throw Error('Tile budget exceeded');
      prepared.clearSceneCache();baseline.clearSceneCache();assets.vector.clearCache();referenceAssets.vector.clearCache();
    }
    return results;
  });
  await writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));
  assert.equal(errors.length,0);assert(checks.every(c=>!c.different&&c.hitsEqual));console.log(`${checks.length} prepared/unprepared pixel and hit comparisons passed`);
}finally{await context.close();}
