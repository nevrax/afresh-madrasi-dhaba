import type { Assets } from '../../src/render/assets.js';
import type { Renderer } from '../../src/render/renderer.js';
import { fixture } from './component-study.js';

const next=():Promise<number>=>new Promise(resolve=>requestAnimationFrame(resolve));
/** Replays identical authored poses through separate cache histories. One renderer/cache
 * is live at a time; compressed references avoid retaining47 full-resolution canvases. */
export async function runMorphCacheCheck(renderer:Renderer,assets:Assets,progress:(text:string)=>void=()=>{}):Promise<unknown> {
 const art=assets.vector;if(!art)throw new Error('Vector assets unavailable');
 if(typeof CompressionStream==='undefined'||typeof DecompressionStream==='undefined')return{status:'UNAVAILABLE',reason:'Native lossless compression is unavailable'};
 const canvas=renderer.canvas,ctx=canvas.getContext('2d')!,style=canvas.style.cssText;
 const saved={scale:renderer.renderScale,full:art.diagnosticFullMorphCache,profile:art.profiling,cost:renderer.onRenderCost,pressed:renderer.pressedCommand,omissions:[...renderer.diagnosticOmissions],children:[...art.diagnosticOmitChildren]};
 const cases:{scale:number;pose:number;width:number;height:number;maximumByteError:number;differingPixels:number;pixelsOverTwo:number;identicalHits:boolean;passed:boolean}[]=[],histories:unknown[]=[];
 let compressedPeakBytes=0;
 const capture=()=>ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const compress=async(data:Uint8ClampedArray):Promise<ArrayBuffer>=>new Response(new Blob([new Uint8Array(data)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 const decompress=async(data:ArrayBuffer):Promise<Uint8Array>=>new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 try {
  await document.fonts.ready;renderer.onRenderCost=null;renderer.pressedCommand=null;renderer.diagnosticOmissions.clear();art.diagnosticOmitChildren.clear();art.profiling=true;
  canvas.style.position='fixed';canvas.style.left='0';canvas.style.top='0';canvas.style.zIndex='10000';canvas.style.width='990px';canvas.style.height='720px';await next();await next();
  for(const scale of [1,.5]) {
   renderer.setRenderScale(scale);const references:{bytes:ArrayBuffer;hits:string;width:number;height:number}[]=[];let compressedBytes=0;
   for(const full of [true,false]) {
    art.diagnosticFullMorphCache=full;art.clearCache();const state=fixture();renderer.events([{type:'screen',screen:'playing'}],{...state,timeMs:0});
    const draw=(local:number):void=>{
     const pose=Math.floor(local*12/1000);state.timeMs=16000+local;state.clockMinutes=556+Math.floor(local/1000);
     state.pointer.x=275+230*Math.sin(local/700);state.pointer.y=327+20*Math.cos(local/430);
     state.platePosition.x=state.pointer.x;state.platePosition.y=state.pointer.y;state.counterPosition.x=state.pointer.x;state.counterPosition.y=state.pointer.y+35;
     state.plate[0]!.x=state.pointer.x;state.plate[0]!.y=state.pointer.y;state.plate[0]!.smokePose=pose%12+1;
     state.food.forEach((d,i)=>{if(d){d.pose=i===0?71+pose%70:327;d.smokePose=i===0?null:pose%12+1;}});
     state.customers.forEach(c=>{c.characterPose=1;c.phaseElapsedMs=pose*1000/12;c.patience=-50-c.id+(pose%20)*.05;});renderer.draw(state);
    };
    // Same six-second continuous-input history as the accounting/component study.
    for(let step=0;step<300;step++){draw(step*20);if(step%30===0){progress(`Cache pixels: ${scale*100}% ${full?'previous':'recent-pose'} policy, warming ${step}/300`);await next();}}
    const before={...art.stats};
    for(let pose=0;pose<47;pose++) {
     // All47 bubble poses; alternating integer/fractional source clocks exercise traffic too.
     draw((pose+(pose%2?.375:0))*1000/12);const actual=capture(),hits=JSON.stringify(renderer.hits);
     if(full){const bytes=await compress(actual);compressedBytes+=bytes.byteLength;if(compressedBytes>64*1024*1024)throw new Error('Compressed pixel reference exceeded64MiB guard');references.push({bytes,hits,width:canvas.width,height:canvas.height});compressedPeakBytes=Math.max(compressedPeakBytes,compressedBytes);}
     else {
      const reference=references[pose]!,expected=await decompress(reference.bytes);if(reference.width!==canvas.width||reference.height!==canvas.height||expected.length!==actual.length)throw new Error('Canvas dimensions changed during pixel replay');
      let maximumByteError=0,differingPixels=0,pixelsOverTwo=0;
      for(let i=0;i<actual.length;i+=4){let max=0;for(let c=0;c<4;c++)max=Math.max(max,Math.abs(actual[i+c]!-expected[i+c]!));maximumByteError=Math.max(maximumByteError,max);if(max)differingPixels++;if(max>2)pixelsOverTwo++;}
      const identicalHits=hits===reference.hits;cases.push({scale,pose:pose+1,width:canvas.width,height:canvas.height,maximumByteError,differingPixels,pixelsOverTwo,identicalHits,passed:maximumByteError===0&&identicalHits});
     }
     if(pose%4===0){progress(`Cache pixels: ${scale*100}% ${full?'capturing reference':'comparing'} ${pose+1}/47`);await next();}
    }
    histories.push({scale,policy:full?'full morph history':'two recent significant morph poses',newBytes:art.stats.allocatedBytes-before.allocatedBytes,evictions:art.stats.evictions-before.evictions,morphReplacements:art.stats.morphReplacements-before.morphReplacements,filterBuilds:art.stats.filterPlacements-before.filterPlacements,memory:art.memorySummary()});
   }
  }
  const passed=cases.filter(c=>c.passed).length;
  return{status:passed===cases.length?'PASS':'FAIL',passed,total:cases.length,requiredMaximumByteError:0,maximumByteError:Math.max(...cases.map(c=>c.maximumByteError)),differingPixels:cases.reduce((sum,c)=>sum+c.differingPixels,0),compressedPeakBytes,cases,histories,limits:'Exact same-browser RGBA and hit-list comparison of94 full-scene authored poses after separate300-frame warm histories; synthetic fixture, not gameplay or cross-browser parity. Compression/readback work is excluded from performance claims.'};
 } finally {
  renderer.onRenderCost=saved.cost;renderer.pressedCommand=saved.pressed;renderer.diagnosticOmissions.clear();saved.omissions.forEach(v=>renderer.diagnosticOmissions.add(v));art.diagnosticOmitChildren.clear();saved.children.forEach(v=>art.diagnosticOmitChildren.add(v));art.diagnosticFullMorphCache=saved.full;art.profiling=saved.profile;renderer.setRenderScale(saved.scale);art.clearCache();canvas.style.cssText=style;
 }
}
