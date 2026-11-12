// Retain selected, path-free measurements; raw traces and profiles remain ignored.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=async(run,file)=>JSON.parse(await readFile(path.join(root,'.local-setup/logs',run,file),'utf8'));
const hardware=h=>({browser:h.version,requestedAdapter:h.requestedAdapter,chromiumSandboxRequested:h.chromiumSandboxRequested??null,activeRenderer:h.gpu.auxAttributes.glRenderer,gpuSandbox:h.gpu.auxAttributes.sandboxed,features:h.gpu.featureStatus,devices:h.gpu.devices.map(d=>({name:d.deviceString,driver:d.driverVersion}))});
const data={method:'Visible isolated Playwright 1.62.1, installed Chrome, 1280x850 viewport, DPR1.5. All GPU runs sequential. Authored animation clocks unchanged. rAF counts are not physical scanout measurements.',longAnimationFrameScope:'Observer includes setup before the rAF measurement window; first 200 entries only. Counts are not interchangeable with sampled rAF gaps above 50ms.',studies:[],pixels:[],traces:[],gameplay:[],ui:[],checks:[]};
for(const run of ['intel-cache','nvidia-cache','software-paired']){
 const {hardware:h,result,errors}=await read(run,'study.json');
 data.studies.push({run,hardware:hardware(h),result,errors});
}
for(const run of ['intel-pixels','nvidia-pixels'])data.pixels.push({run,result:await read(run,'check-morph-cache-pixels.json')});
for(const run of ['intel-trace','nvidia-trace'])data.traces.push({run,result:await read(run,'trace-summary.json')});
for(const run of ['intel-gameplay','nvidia-gameplay','nvidia-long','intel-small','nvidia-small']){
 const {hardware:h,results,errors}=await read(run,'gameplay.json');data.gameplay.push({run,hardware:hardware(h),results,errors});
}
for(const run of ['nvidia-ui','release-ui']){
 const result=await read(run,'ui.json');
 if(result.status!=='PASS'||result.errors?.length)throw Error(`${run} failed UI acceptance`);
 data.ui.push({run,result});
}
for(const file of ['check-gpu-filter-pixels.json','check-retained-composition-pixels.json','run-complete-scenarios.json']){
 const result=await read('final-checks',file);
 if(result.status!=='PASS')throw Error(`${file} failed acceptance`);
 data.checks.push({run:'final-checks',file,result});
}
const serialized=JSON.stringify(data,null,2)+'\n';
if(/(?:[a-z]:\\|\/Users\/|\\Users\\|BEGIN .*PRIVATE KEY)/i.test(serialized))throw Error('A personal path or credential marker would be retained');
await writeFile(path.join(root,'tests/reference/performance-gpu.json'),serialized);
console.log(`Saved ${Buffer.byteLength(serialized)} bytes of selected measurements.`);
