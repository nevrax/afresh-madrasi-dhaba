// Visible isolated checks; probes are injected into test responses, never shipped.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromeExecutablePath} from './browser-path.mjs';
import {measureComponentFixture} from './component-ranking-fixture.mjs';
import {componentRankingCases} from './component-ranking-cases.mjs';
const root=path.resolve(import.meta.dirname,'..');
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const mode=process.argv[2]??'check',adapter=process.argv[3]??'high-performance';
assert(['check','study','scenarios'].includes(mode));assert(['low-power','high-performance'].includes(adapter));
const output=path.join(root,'.local-setup/logs',`presentation-${mode}-${adapter}`);await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,`.local-setup/playwright-presentation-${mode}-${adapter}`),{
  executablePath:chromeExecutablePath(),headless:false,chromiumSandbox:true,
  viewport:{width:1480,height:1000},deviceScaleFactor:2,
  args:['--use-angle=d3d11',adapter==='low-power'?'--force-low-power-gpu':'--force-high-performance-gpu'],
});
const results=[],errors=[];let hardware;
try {
  const page=context.pages()[0];page.on('pageerror',e=>errors.push(e.message));
  const session=await context.browser().newBrowserCDPSession(),info=await session.send('SystemInfo.getInfo');
  hardware={renderer:info.gpu.auxAttributes.glRenderer,features:info.gpu.featureStatus};
  if(mode==='scenarios') {
    for(const choice of ['classic','extra']){
      await page.goto(`http://127.0.0.1:5173/development/verification/index.html?presentation=${choice}&gpu=${adapter}`);
      await page.waitForFunction(()=>!document.querySelector('#run').disabled);
      await page.locator('#run').click();await page.waitForFunction(()=>!document.querySelector('#run').disabled,null,{timeout:120000});
      const report=JSON.parse(await page.locator('#report').innerText());assert.equal(report.status,'PASS');results.push({choice,...report});
      console.log(JSON.stringify(results.at(-1)));
    }
  } else if(mode==='study') {
    const pageSession=await context.newCDPSession(page);
    await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
    for(const config of componentRankingCases('profiles')) {
      await pageSession.send('Emulation.setDeviceMetricsOverride',{width:1480,height:1000,deviceScaleFactor:config.width>2750?3:2,mobile:false});
      const result=await measureComponentFixture(page,{...config,adapter});results.push(result);
      await writeFile(path.join(output,'results.json'),JSON.stringify({hardware,results,errors},null,2));
      console.log(JSON.stringify({name:config.name,fps:result.fps,cold:result.cold.raf,canvas:result.canvas,cache:result.cache,memory:result.memory.accountedBackingBytes}));
      await page.reload();
    }
  } else {
    await page.route('**/build/modules/src/render/renderer.js',async route=>{
      const response=await route.fetch(),body=await response.text();
      await route.fulfill({response,body:body+'\nconst observedDraw=Renderer.prototype.draw;Renderer.prototype.draw=function(state){window.__profileState=structuredClone(state);return observedDraw.call(this,state);};'});
    });
    const control=async name=>{const target=page.getByRole('button',{name,exact:true});await target.waitFor();const b=await target.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await page.locator('#loading').waitFor({state:'hidden'});};
    const point=async(x,y,click=false)=>{const b=await page.locator('#game').boundingBox();await page.mouse[click?'click':'move'](b.x+x*b.width/550,b.y+y*b.height/400);};
    const select=async choice=>{await page.locator('#presentation-profile').selectOption(choice);await page.waitForFunction(c=>document.documentElement.dataset.presentation===c,choice);await page.evaluate(()=>new Promise(requestAnimationFrame));};
    const variants=[['source','http://127.0.0.1:5173/'],['site','http://127.0.0.1:5173/dist/site/'],['standalone',pathToFileURL(path.join(root,'dist/standalone/index.html')).href]];
    for(const [kind,url] of variants){
      await page.goto(url);await page.locator('#loading').waitFor({state:'hidden'});
      await page.evaluate(()=>{for(const key of ['madrasi-presentation','madrasi-display','madrasi-display-extra','madrasi-batter-hint-seen'])localStorage.removeItem(key);});
      await page.reload();await page.locator('#loading').waitFor({state:'hidden'});
      assert.equal(await page.locator('#presentation-profile').inputValue(),'');
      assert.equal(await page.locator('html').getAttribute('data-presentation'),'current');
      await select('classic');assert(await page.locator('#app-menu').isHidden());assert(await page.locator('#fullscreen').isHidden());
      await control('Start');await control('How to play');await page.getByRole('button',{name:'Skip tutorial',exact:true}).waitFor();await control('Skip tutorial');
      await point(529,328);assert(await page.locator('#batter-cue').isHidden());
      await page.screenshot({path:path.join(output,`${kind}-classic.png`)});
      await select('extra');await point(529,328);await page.locator('#batter-cue').waitFor({state:'visible'});
      assert(await page.locator('#performance-hud').isHidden());
      await point(529,328,true);await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('empty spot'));
      await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
      await select('classic');assert.equal(await page.locator('#game').evaluate(c=>c.style.cursor),'');
      await select('extra');await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
      const initialCursor=await page.locator('#game').evaluate(c=>c.style.cursor);
      await page.setViewportSize({width:800,height:640});
      await page.waitForFunction(old=>{const c=document.querySelector('#game');return c.style.cursor.includes('image-set')&&c.style.cursor!==old;},initialCursor);
      const resizedCursor=await page.locator('#game').evaluate(c=>c.style.cursor);
      await page.setViewportSize({width:1480,height:1000});
      await page.waitForFunction(old=>{const c=document.querySelector('#game');return c.style.cursor.includes('image-set')&&c.style.cursor!==old;},resizedCursor);
      await point(124.5,332.45,true);
      if(kind==='source')await page.waitForFunction(()=>window.__profileState.food.some(Boolean));
      else await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const before=kind==='source'?await page.evaluate(()=>window.__profileState):null;
      for(const choice of ['classic','extra','classic','extra'])await select(choice);
      if(before){const after=await page.evaluate(()=>window.__profileState);assert.equal(after.day,before.day);assert.equal(after.cash,before.cash);assert.equal(after.screen,'playing');assert(after.timeMs>=before.timeMs);assert.deepEqual(after.food.filter(Boolean).map(d=>d.id),before.food.filter(Boolean).map(d=>d.id));}
      await point(124.5,332.45);await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='flip',null,{timeout:15000});await point(124.5,332.45,true);
      await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='pickup',null,{timeout:15000});await point(124.5,332.45,true);
      await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
      await point(25,337,true);await page.waitForFunction(()=>!document.querySelector('#game').style.cursor);
      await point(25,337,true);await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
      await point(290,280);await page.locator('#game').press('Escape');await page.waitForFunction(()=>!document.querySelector('#game').style.cursor);
      await point(529,328);assert(await page.locator('#batter-cue span').isHidden());
      await page.screenshot({path:path.join(output,`${kind}-extra.png`)});
      await page.locator('#app-menu > summary').click();await page.locator('#render-scale').selectOption('0.5');await page.locator('#show-stats').check();
      await select('classic');assert(await page.locator('#performance-hud').isHidden());
      const full=await page.locator('#game').evaluate(c=>({width:c.width,css:c.clientWidth,dpr:devicePixelRatio}));assert(Math.abs(full.width-full.css*full.dpr)<2);
      await select('extra');assert.equal(await page.locator('#render-scale').inputValue(),'0.5');assert(await page.locator('#performance-hud').isVisible());
      await page.reload();await page.locator('#loading').waitFor({state:'hidden'});assert.equal(await page.locator('#presentation-profile').inputValue(),'extra');assert.equal(await page.locator('#render-scale').inputValue(),'0.5');
      await page.locator('#app-menu > summary').click();await page.locator('#render-scale').selectOption('1');await page.locator('#show-stats').uncheck();await page.locator('#app-menu > summary').click();
      await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await select('classic');await page.evaluate(()=>document.exitFullscreen());await select('extra');
      await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(requestAnimationFrame));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#presentation-profile').isVisible());
      await control('Start');await control('Play');
      const touchSession=await context.newCDPSession(page);await touchSession.send('Emulation.setTouchEmulationEnabled',{enabled:true});
      for(const choice of ['classic','extra']){
        await select(choice);const b=await page.locator('#game').boundingBox();
        await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+529*b.width/550,y:b.y+328*b.height/400}]});
        await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('empty spot'));
        assert.equal(await page.locator('#game').evaluate(c=>c.style.cursor),'');
      }
      await touchSession.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touchSession.detach();
      await page.setViewportSize({width:1480,height:1000});
      assert(await page.locator('#resource-status').isHidden());
      results.push({kind,status:'PASS',checks:['no implicit default','explicit profiles','tutorial and cooking','live profile swaps','native batter cursor and Classic fallback','active cursor resize and restore','flip, native carried dosa, plating and carried plate cancellation','guidance gating','dismissal preserved','display settings isolated','reload persistence','fullscreen exit after switch','responsive layout','emulated touch and Canvas fallback in both profiles'],sourceStatePreserved:!!before});
      console.log(JSON.stringify(results.at(-1)));
    }
    // Browser storage can be unavailable for direct-file playback.
    const blocked=await context.newPage();blocked.on('pageerror',e=>errors.push(e.message));
    await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
    await blocked.route('http{,s}://**/*',route=>route.abort());
    await blocked.goto(variants[2][1]);await blocked.locator('#loading').waitFor({state:'hidden'});
    for(const choice of ['extra','classic','extra']){await blocked.locator('#presentation-profile').selectOption(choice);await blocked.waitForFunction(c=>document.documentElement.dataset.presentation===c,choice);}
    assert(await blocked.locator('#resource-status').isHidden());results.push({kind:'offline-storage-blocked',status:'PASS'});await blocked.close();
    await page.unroute('**/build/modules/src/render/renderer.js');
    await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
    const pixels=await page.evaluate(async()=>{
      const {Assets}=await import('/build/modules/src/render/assets.js'),{Renderer}=await import('/build/modules/src/render/renderer.js'),{fixture}=await import('/build/modules/development/verification/component-study.js');
      const canvas=document.querySelector('canvas');canvas.getContext('2d',{willReadFrequently:true});
      const assets=new Assets();await assets.load();const renderer=new Renderer(canvas,assets);await renderer.load();await document.fonts.ready;
      const art=assets.vector,checks=[];art.profiling=true;
      const hash=async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data))).join(',');
      for(const width of [880,2200,2970]){
        canvas.style.width=width/devicePixelRatio+'px';canvas.style.height=width*400/550/devicePixelRatio+'px';await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
        for(const screen of ['menu','instructions','playing','day-result','game-over']){
          const state=fixture();state.screen=screen;state.tutorial.visible=screen==='instructions';state.tutorial.elapsedMs=750;state.tutorial.childElapsedMs=1250;
          const original=JSON.stringify(state);renderer.events([{type:'screen',screen}],{...state,timeMs:0});
          renderer.setPresentation(null);art.diagnosticUncroppedStaticGroups=true;art.clearCache();renderer.draw(state);const baseline=await hash(),hits=JSON.stringify(renderer.hits);
          art.diagnosticUncroppedStaticGroups=false;art.clearCache();renderer.setPresentation('classic');renderer.draw(state);const classic=await hash();
          renderer.setPresentation('extra');renderer.draw(state);const extra=await hash(),extraHits=JSON.stringify(renderer.hits);
          renderer.setPresentation('classic');const cleared=art.memorySummary();renderer.draw(state);const restored=await hash();
          checks.push({width,screen,classicMatches:classic===baseline,restoredMatches:restored===baseline,hitsMatch:extraHits===hits,stateUnchanged:JSON.stringify(state)===original,extraDiffers:extra!==baseline,clearedBytes:cleared.accountedBackingBytes});
        }
      }
      art.clearCache();return checks;
    });
    await writeFile(path.join(output,'pixel-checks.json'),JSON.stringify(pixels,null,2));
    for(const check of pixels){assert(check.classicMatches&&check.restoredMatches&&check.hitsMatch&&check.stateUnchanged,JSON.stringify(check));assert(check.clearedBytes<=16);}
    results.push({kind:'pixels-and-state',checks:pixels});
  }
  assert.equal(errors.length,0);await writeFile(path.join(output,'results.json'),JSON.stringify({status:'PASS',hardware,results,errors},null,2));
  console.log(JSON.stringify({status:'PASS',mode,adapter,count:results.length}));
}catch(error){const page=context.pages()[0];await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await writeFile(path.join(output,'failure-state.json'),JSON.stringify(await page?.evaluate(()=>({state:window.__profileState,action:document.querySelector('#game')?.dataset.action})).catch(()=>null),null,2));throw error;}
finally{await context.close();}
