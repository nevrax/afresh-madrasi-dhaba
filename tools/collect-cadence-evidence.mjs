// Explicit public fields only. Raw connection/system logs stay in .local-setup.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=async label=>JSON.parse(await readFile(path.join(root,'.local-setup/logs',label,'results.json'),'utf8'));
const fields=['config','contextAttributes','canvas','geometry','results','work','fps','seconds','frames','playingFrames','raf','draw','warm','warmCpu','renderWork','unchangedFrames','dirtyScene','terminalPresentationGap','hiddenSamples','unfocusedSamples','state','simulationIncludingCommandsAndAudio','snapshot','missingAssets','controlBefore','controlAfter'];
const clean=value=>Object.fromEntries(fields.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
const pi=[];
for(const environment of ['a','b']){
  const runs=[];
  for(const study of ['cadence-normal','cadence-uncapped','native-study','native-desync','native-reuse','native-production','dirty']){
    const data=await read(`pi-${environment}-${study}`);
    runs.push({study,hardware:{browser:data.hardware.browser,renderer:data.hardware.renderer},errors:data.errors,results:data.results.map(clean)});
  }
  pi.push({environment:environment.toUpperCase(),runs});
}
const intel=[];
for(const label of ['cadence-low-power-normal','cadence-low-power-uncapped','cadence-low-power-normal-repeat','native-live-low-power-normal','native-live-reuse-low-power-normal']){
  const data=await read(label);intel.push({study:label,hardware:data.hardware,bounds:data.bounds,errors:data.errors,...clean(data)});
}
const pixels=[];
for(const label of ['dirty-scene-check','unchanged-frame-check','production-frame-check']){
  const data=await read(label);pixels.push({study:label,cases:data.checks.length,failures:data.checks.filter(c=>c.different||!c.hitsEqual),reuse:data.reuse,releasedBytes:data.releasedBytes,errors:data.errors});
}
const desktopProduction=[];
for(const adapter of ['low-power','high-performance']){
  const label=`native-live-${adapter}-normal-calibrated`,data=await read(label);
  desktopProduction.push({study:label,hardware:data.hardware,bounds:data.bounds,errors:data.errors,...clean(data)});
}
const hashes={};for(const file of ['src/render/renderer.ts','tools/cadence-fixture.mjs','tools/live-gameplay-fixture.mjs','development/verification/unchanged-frame-experiment.js'])hashes[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');
await writeFile(path.join(root,'tests/reference/performance-cadence.json'),JSON.stringify({units:'Callback rates are not physical scanout FPS. Process CPU uses one core = 100%.',baselineRevision:'7d90d22',desktopRuntimeRevision:'5801794',sourceHashScope:'Final integrated source; baseline and prototype runs precede integration. Native-production cases use the integrated renderer.',intelDisplayQuery:{width:2560,height:1440,reportedHz:240,observedCallbackRateDifferent:true},pi,intel,desktopProduction,pixels,sourceHashes:hashes},null,2)+'\n');
