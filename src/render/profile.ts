import type { VectorArt } from './vector.js';

/** Opt-in visible diagnostics (?profile=1); no telemetry or persistent logging. */
export function renderProfiler(canvas: HTMLCanvasElement, art: VectorArt): (duration: number, screen: string) => void {
  if (new URLSearchParams(location.search).get('profile')!=='1') return () => undefined;
  const output=document.createElement('output');output.id='render-profile';
  Object.assign(output.style,{position:'fixed',bottom:'4px',left:'4px',zIndex:'5',padding:'8px',background:'#000d',color:'#caffcc',font:'12px monospace',pointerEvents:'none'});
  document.body.append(output);
  let times:number[]=[], current='', calls=0, peak=0;
  return (duration,screen) => {
    if(screen!==current){times=[];calls=0;peak=0;current=screen;}
    peak=Math.max(peak,duration);calls++;
    if(calls>30)times.push(duration);
    if(times.length>600)times.shift();
    if(calls%30!==0)return;
    const sorted=[...times].sort((a,b)=>a-b);
    const q=(n:number):string => (sorted[Math.min(sorted.length-1,Math.floor(sorted.length*n))]??0).toFixed(2);
    output.textContent=`${screen} · ${canvas.width}×${canvas.height} · ${times.length} samples · median ${q(.5)} ms · p95 ${q(.95)} ms · peak ${peak.toFixed(2)} ms · cache ${(art.stats.cachedBytes/1048576).toFixed(1)} MiB`;
  };
}
