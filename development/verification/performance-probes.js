// Opt-in diagnostics, never imported by production. Keep raw output private.
export function performanceProbes() {
  const started=performance.now(),raf=[],mainTimer=[],workerTimer=[],tasks=[],animations=[];
  const native=requestAnimationFrame.bind(window);let lastWall=0,lastRaf=0,lastTimer=performance.now();
  window.requestAnimationFrame=callback=>native(t=>{const wall=performance.now();if(lastWall&&wall-lastWall>30)raf.push({at:wall,wallGap:wall-lastWall,rafGap:t-lastRaf,lag:wall-t,hidden:document.hidden,focus:document.hasFocus()});lastWall=wall;lastRaf=t;callback(t);});
  const timer=setInterval(()=>{const now=performance.now();if(now-lastTimer>30)mainTimer.push({at:now,gap:now-lastTimer});lastTimer=now;},8);
  const blob=new Blob([`let last=performance.now();setInterval(()=>{const now=performance.now();if(now-last>30)postMessage({at:performance.timeOrigin+now,gap:now-last});last=now;},8);`],{type:'text/javascript'}),url=URL.createObjectURL(blob),worker=new Worker(url);URL.revokeObjectURL(url);
  worker.onmessage=e=>workerTimer.push({at:e.data.at-performance.timeOrigin,gap:e.data.gap});
  const observers=[];
  for(const type of ['longtask','long-animation-frame'])if(PerformanceObserver.supportedEntryTypes.includes(type)){
    const observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){
      if(type==='longtask')tasks.push({at:e.startTime,duration:e.duration});
      else animations.push({at:e.startTime,duration:e.duration,blocking:e.blockingDuration,renderStart:e.renderStart,styleStart:e.styleAndLayoutStart,scripts:e.scripts?.map(s=>({duration:s.duration,invoker:s.invoker,function:s.sourceFunctionName,forcedStyle:s.forcedStyleAndLayoutDuration}))});
    }});observer.observe({type,buffered:true});observers.push(observer);
  }
  return {finish(){window.requestAnimationFrame=native;clearInterval(timer);worker.terminate();observers.forEach(o=>o.disconnect());return {started,ended:performance.now(),raf,mainTimer,workerTimer,tasks,animations};}};
}
