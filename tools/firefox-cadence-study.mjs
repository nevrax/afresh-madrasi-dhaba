import './browser-path.mjs';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {measureLiveGameplay} from './live-gameplay-fixture.mjs';
import {measureCadence} from './cadence-fixture.mjs';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.local-setup/logs/firefox-cadence');await mkdir(output,{recursive:true});
const {firefox}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const context=await firefox.launchPersistentContext(path.join(root,'.local-setup/firefox-cadence-native'),{headless:false,viewport:null,timeout:45000});
try{
  const page=context.pages()[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');await page.bringToFront();
  const control=await measureCadence(page,{width:2200,measurementMs:10000,modes:['empty-raf','small-surface'],skipReadback:true});
  await page.reload();const gameplay=await measureLiveGameplay(page,{width:2200,nativeViewport:true,measurementMs:60000,prepared:true});
  await writeFile(path.join(output,'results.json'),JSON.stringify({browser:context.browser().version(),adapter:'not independently established for Firefox compositor',control,gameplay,errors},null,2));
  console.log(JSON.stringify({control:control.results.map(r=>({mode:r.mode,fps:r.callbackFps,gaps:r.gapMs})),warm:gameplay.warm,errors}));
  if(errors.length||gameplay.hiddenSamples||gameplay.unfocusedSamples||!gameplay.geometry.canvas.fullyInsideViewport)throw Error('Firefox visibility or runtime check failed');
}finally{await context.close();}
