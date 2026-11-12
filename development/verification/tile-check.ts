import {captureTileFrame,replayCanvasTiles,TileCompositor} from './tile-compositor.js';

interface Timing { frames:number;seconds:number;fps:number;median:number;p95:number;p99:number;maximum:number }
export interface TileCheckReport {
  status:'PASS'|'FAIL'|'UNAVAILABLE';width:number;height:number;quads:number;sources:number;uploadedMiB:number;gpuBatches?:number;atlasSize?:number;
  excluded:{text:number;fills:number;strokes:number};
  pixels?:{maximum:number;mean:number;pixelsOverTwo:number;passed:boolean};
  timing?:{canvas:Timing;gpu:Timing;bitmap:Timing};
  warmup?:{canvas:Timing;gpu:Timing;bitmap:Timing};
  cold?:{captureMs:number;gpuSetupMs:number;firstGpuDrawAndReadbackMs:number};
  presentation?:{sourceCssWidth:number;sourceCssHeight:number;testCssWidth:number;testCssHeight:number;fullyInsideViewport:boolean};error?:string;
}
const percentile=(a:number[],p:number):number=>a[Math.min(a.length-1,Math.floor(a.length*p))]??0;
async function cadence(draw:()=>void,duration:number):Promise<Timing> {
  const gaps:number[]=[];let start=0,last=0,frames=0;
  await new Promise<void>(resolve=>{
    const tick=(now:number):void=>{if(!start)start=now;if(last)gaps.push(now-last);last=now;draw();frames++;
      if(now-start>=duration)resolve();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
  });
  gaps.sort((a,b)=>a-b);const seconds=gaps.reduce((a,b)=>a+b,0)/1000;
  return {frames,seconds,fps:(frames-1)/seconds,median:percentile(gaps,.5),p95:percentile(gaps,.95),p99:percentile(gaps,.99),maximum:gaps.at(-1)??0};
}

/** Three sequential visible10s experiments. The caller must pause other game/catalog
 * render loops first. Text/direct path omissions are explicit in the returned report. */
export async function runTileCompositorCheck(source:HTMLCanvasElement,draw:()=>void,options:{durationMs?:number;container?:HTMLElement;onProgress?:(phase:string)=>void}={}):Promise<TileCheckReport> {
  options.onProgress?.('Capturing ordered native tiles');
  const captureStarted=performance.now(),frame=captureTileFrame(source,draw),captureMs=performance.now()-captureStarted,container=options.container??document.createElement('section');
  if(!options.container)document.body.append(container);
  const previousStyle=container.style.cssText,previousVisibility=source.style.visibility,sourceBox=source.getBoundingClientRect();
  const cssWidth=Math.min(sourceBox.width||frame.width/devicePixelRatio,innerWidth-16,(innerHeight-64)*frame.width/frame.height),cssHeight=cssWidth*frame.height/frame.width;
  container.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#181818;color:white;display:flex;align-items:flex-start;justify-content:center;padding-top:48px;box-sizing:border-box;overflow:hidden;';
  const progress=document.createElement('div');progress.style.cssText='position:absolute;top:8px;left:8px;right:8px;text-align:center;font:16px sans-serif;';container.append(progress);
  const update=(message:string):void=>{progress.textContent=message;options.onProgress?.(message);};
  source.style.visibility='hidden';
  const views=['Canvas tiles','GPU tiles','One bitmap'].map(name=>{
    const figure=document.createElement('figure'),caption=document.createElement('figcaption'),canvas=document.createElement('canvas');caption.textContent=name;
    canvas.width=frame.width;canvas.height=frame.height;canvas.style.width=`${cssWidth}px`;canvas.style.height=`${cssHeight}px`;canvas.style.display='block';figure.style.cssText='margin:0;display:none;';caption.style.display='none';figure.append(caption,canvas);container.append(figure);return {figure,canvas};
  });
  const report:TileCheckReport={status:'UNAVAILABLE',width:frame.width,height:frame.height,quads:frame.quads.length,sources:frame.sources.length,uploadedMiB:0,excluded:frame.excluded};
  let gpu:TileCompositor|undefined;
  try{
    const expected=views[0]!.canvas.getContext('2d',{alpha:false})!,bitmap=views[2]!.canvas.getContext('2d',{alpha:false})!;
    replayCanvasTiles(expected,frame);const setupStarted=performance.now();gpu=new TileCompositor(views[1]!.canvas,frame);const gpuSetupMs=performance.now()-setupStarted,firstDrawStarted=performance.now();gpu.draw();const b=gpu.pixels();report.cold={captureMs,gpuSetupMs,firstGpuDrawAndReadbackMs:performance.now()-firstDrawStarted};report.uploadedMiB=gpu.uploadedBytes/1048576;report.gpuBatches=gpu.batches;report.atlasSize=gpu.atlasSize;
    const a=expected.getImageData(0,0,frame.width,frame.height).data;let maximum=0,sum=0,pixelsOverTwo=0;
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
      const ai=(y*frame.width+x)*4,bi=((frame.height-y-1)*frame.width+x)*4;let pixelMax=0;
      for(let c=0;c<4;c++){const error=Math.abs(a[ai+c]!-b[bi+c]!);sum+=error;pixelMax=Math.max(pixelMax,error);maximum=Math.max(maximum,error);}
      if(pixelMax>2)pixelsOverTwo++;
    }
    report.pixels={maximum,mean:sum/a.length,pixelsOverTwo,passed:maximum<=2&&sum/a.length<=.15};
    const duration=options.durationMs??10000,results:Timing[]=[],warmups:Timing[]=[];
    for(let index=0;index<3;index++){
      views.forEach((v,i)=>{v.figure.hidden=i!==index;v.figure.style.display=i===index?'block':'none';});
      const render=index===0?()=>replayCanvasTiles(expected,frame):index===1?()=>gpu!.draw():()=>bitmap.drawImage(views[0]!.canvas,0,0);
      update(`Warming ${['Canvas tiles','GPU tiles','one bitmap'][index]}`);
      warmups.push(await cadence(render,1500));if(index===1)gpu!.synchronize();
      const box=views[index]!.canvas.getBoundingClientRect();
      report.presentation={sourceCssWidth:sourceBox.width,sourceCssHeight:sourceBox.height,testCssWidth:box.width,testCssHeight:box.height,fullyInsideViewport:box.top>=0&&box.left>=0&&box.bottom<=innerHeight&&box.right<=innerWidth};
      if(!report.presentation.fullyInsideViewport)throw new Error('Benchmark canvas is not completely inside the viewport');
      update(`Measuring ${['Canvas tiles','GPU tiles','one bitmap'][index]} for ${duration/1000}s`);
      results.push(await cadence(render,duration));
    }
    report.warmup={canvas:warmups[0]!,gpu:warmups[1]!,bitmap:warmups[2]!};report.timing={canvas:results[0]!,gpu:results[1]!,bitmap:results[2]!};report.status=report.pixels.passed?'PASS':'FAIL';
  }catch(error){report.error=String(error);}
  finally{
    if(gpu){gpu.draw();const snapshot=document.createElement('canvas');snapshot.width=frame.width;snapshot.height=frame.height;snapshot.style.cssText=views[1]!.canvas.style.cssText;snapshot.getContext('2d')!.drawImage(views[1]!.canvas,0,0);views[1]!.canvas.replaceWith(snapshot);}
    views.forEach(v=>{v.figure.hidden=false;v.figure.style.display='block';});frame.dispose();gpu?.dispose();source.style.visibility=previousVisibility;container.style.cssText=previousStyle;progress.remove();
  }
  options.onProgress?.(`Tile experiment ${report.status}`);return report;
}
