// Reduce private Chromium traces to anonymous timing evidence. Nested spans are not added.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const names=process.argv.slice(2);if(!names.length||names.some(n=>!/^desktop-stall-[a-z-]+$/.test(n)))throw Error('Pass diagnostic directory names');
const collected=[];
for(const name of names){
  const directory=path.join(root,'.local-setup/logs',name),run=JSON.parse(await readFile(path.join(directory,'results.json'),'utf8'));
  const cases=[];
  for(const c of run.results){
    const warm=c.probes.raf.filter(p=>p.at>30000&&p.wallGap>50);
    const summary={mode:c.mode,measurement:c.measurement,processCpuSingleCorePercent:c.processCpu,
      warmCallbackGapsOver50: warm.length,maximumWarmWallGapMs:Math.max(0,...warm.map(p=>p.wallGap)),
      mainTimerGapsOver30:c.probes.mainTimer.length,workerTimerGapsOver30:c.probes.workerTimer.length,
      longTasks:c.probes.tasks.length,longAnimationFrames:c.probes.animations.length};
    if(run.trace){
      const events=JSON.parse(await readFile(path.join(directory,`${c.mode}.trace.json`),'utf8')).traceEvents;
      const threads=new Map(events.filter(e=>e.name==='thread_name').map(e=>[`${e.pid}:${e.tid}`,e.args.name]));
      const mark=events.find(e=>e.name==='stall-trace-start');
      const gpu=events.filter(e=>e.ph==='X'&&e.name==='ThreadControllerImpl::RunTask'&&threads.get(`${e.pid}:${e.tid}`)==='CrGpuMain'&&e.dur>50000);
      summary.gpuHostTasksOver50={count:gpu.length,wallMs:gpu.reduce((s,e)=>s+e.dur/1000,0),threadCpuMs:gpu.reduce((s,e)=>s+(e.tdur??0)/1000,0),maximumMs:Math.max(0,...gpu.map(e=>e.dur/1000)),threadCpuAvailable:gpu.every(e=>e.tdur!==undefined)};
      const present=events.filter(e=>e.ph==='X'&&e.name==='DXGISwapChainImageBacking::Present'&&e.dur>50000);
      summary.presentCallsOver50={count:present.length,wallMs:present.reduce((s,e)=>s+e.dur/1000,0),maximumMs:Math.max(0,...present.map(e=>e.dur/1000))};
      if(mark){
        const origin=mark.ts-mark.args.data.startTime*1000;
        summary.warmGapsOverlappingLongGpuTask=warm.filter(p=>gpu.some(e=>e.ts<origin+p.at*1000&&e.ts+e.dur>origin+(p.at-p.wallGap)*1000)).length;
      }
    }
    cases.push(summary);
  }
  collected.push({name,adapter:run.adapter,trace:run.trace,backgroundExemption:run.backgroundExemption,noDirectComposition:run.noDcomp??false,hardware:run.hardware,errors:run.errors,cases});
}
await writeFile(path.join(root,'tests/reference/performance-stalls.json'),JSON.stringify({scope:'Browser callback and host-thread timing, not physical GPU execution or scanout. Tracing and timer probes add overhead; these are attribution runs, not final acceptance.',runs:collected},null,2)+'\n');
console.log(JSON.stringify(collected.map(r=>({name:r.name,cases:r.cases.map(c=>({mode:c.mode,gaps:c.warmCallbackGapsOver50,gpu:c.gpuHostTasksOver50,present:c.presentCallsOver50,overlap:c.warmGapsOverlappingLongGpuTask}))})),null,2));
