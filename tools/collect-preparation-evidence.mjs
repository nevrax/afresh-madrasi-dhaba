// Copy an explicit measurement allowlist; private raw logs and traces stay local.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=async name=>JSON.parse(await readFile(path.join(root,'.local-setup/logs',name,'results.json'),'utf8'));
const game=r=>Object.fromEntries(['canvas','seconds','fps','raf','draw','simulationIncludingCommandsAndAudio','snapshot','warm','warmCpu','state','audio','memory','geometry','hiddenSamples','unfocusedSamples','terminalPresentationGap','unchangedFrames','preparationMs','contextAttributes','phases','maximumCustomers','maximumFood','playingFrames','frames'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
const controls=c=>c?.results.map(r=>({mode:r.mode,seconds:r.seconds,callbacks:r.callbacks,callbackFps:r.callbackFps,gapMs:r.gapMs,geometry:r.geometry,hiddenSamples:r.hiddenSamples,unfocusedSamples:r.unfocusedSamples,outsideViewportSamples:r.outsideViewportSamples}));
const evidence={scope:'Visible browser callback cadence and process CPU, not physical scanout or GPU utilization. One CPU core equals 100 percent. Normal synchronization and exact vector density retained. Compact native cursor is an intentional Extra treatment; Classic and touch keep Canvas artwork.',pi:[],desktop:[],verification:[]};
for(const name of ['pi-a-final-complete','pi-b-final-complete','pi-a-compact-cursor','pi-b-compact-cursor','pi-a-griddle-prepared','pi-b-density-ui','pi-a-cold-audio-carry','pi-b-carried-dosa','pi-a-dosa-cursor','pi-b-dosa-cursor','pi-a-food-preparation','pi-b-carried-plate','pi-a-cooking-and-plate','pi-b-plate-cursor','pi-a-release-acceptance','pi-b-release-acceptance','pi-a-interaction-acceptance','pi-b-interaction-acceptance','pi-a-terminal-acceptance','pi-b-terminal-acceptance']){
  const r=await read(name);assert.equal(r.errors.length,0);
  evidence.pi.push({name,hardware:r.hardware,environment:{kernel:r.before.kernel,platform:r.before.platform,model:r.before.model},cases:r.results.map(c=>({name:c.config.name,diagnostic:!!c.config.coldProbe,expectedScreen:c.config.expectedScreen,status:c.status,checks:c.checks,...game(c),coldProbe:c.coldProbe,processCpu:c.processCpu,system:{temperatureMilliC:c.system.temperatureMilliC,throttled:c.system.throttled,browserPssKiB:c.system.browserPssKiB}}))});
}
for(const name of ['native-chrome-default','native-chrome-default-forced','native-chrome-default-unprepared','firefox-cadence','native-live-low-power-normal-calibrated','native-live-low-power-normal-calibrated-legacy-screenshot-short','native-live-low-power-normal-calibrated-prepared','native-live-high-performance-normal-calibrated-prepared','native-live-low-power-normal-repeat-calibrated-prepared','native-live-high-performance-normal-repeat-calibrated-prepared']){
  const r=await read(name);assert.equal(r.errors.length,0);
  evidence.desktop.push({name,hardware:r.hardware??{browser:r.browser,adapter:r.adapter},controlBefore:controls(r.controlBefore??r.control),controlAfter:controls(r.controlAfter),...game(r.gameplay??r)});
}
for(const adapter of ['low-power','high-performance']){
  const r=await read(`presentation-check-${adapter}`);assert.equal(r.status,'PASS');assert.equal(r.errors.length,0);
  evidence.verification.push({name:`application-${adapter}`,status:r.status,hardware:r.hardware,checks:r.results});
}
for(const name of ['preparation-check','production-frame-check']){
  const r=await read(name);assert.equal(r.errors.length,0);assert(r.checks.every(c=>c.different===0&&c.hitsEqual));
  evidence.verification.push({name,cases:r.checks.length,status:'PASS',maximumPixelDelta:Math.max(...r.checks.map(c=>c.maxDelta)),allHitsEqual:true});
}
const cursor=await read('carry-cursor-check');assert(cursor.nativeActive&&cursor.touchFallback&&cursor.classicFallback&&cursor.unsupportedFallback&&cursor.restored&&cursor.dosa.switchedBack);
assert(cursor.dosa.maxPremultipliedDelta===0&&cursor.plate.active&&cursor.plate.retainedPlateMove&&cursor.plate.touchFallback&&cursor.plate.classicFallback);
evidence.verification.push({name:'native-cursor-image-and-fallbacks',...cursor});
await writeFile(path.join(root,'tests/reference/performance-preparation.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(`Collected ${evidence.pi.length} Pi runs, ${evidence.desktop.length} desktop runs and ${evidence.verification.length} verification groups.`);
