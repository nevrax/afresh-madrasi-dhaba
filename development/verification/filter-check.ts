import { BoxFilter } from '../../src/render/box-filter.js';
import { VectorArt, boxBlurAxis } from '../../src/render/vector.js';

interface Fixture { name:string;width:number;height:number;x:number;y:number;passes:number;paint:(ctx:CanvasRenderingContext2D)=>void }
interface Comparison {
  name:string;passed:boolean;gpuUsed:boolean;gpuPasses:number;alphaMaximumError:number;premultipliedMaximumError:number;premultipliedMeanError:number;
  readbackMaximumError:number;
  centroidDistance:number;boundsMaximumError:number;cpuBounds:number[]|null;gpuBounds:number[]|null;
}
export interface FilterCheckReport {
  status:'PASS'|'FAIL'|'UNAVAILABLE';passed:number;total:number;gpuPasses:number;gpuFailures:number;
  tolerances:{alpha:number;premultipliedMaximum:number;premultipliedMean:number;centroidPixels:number;boundsPixels:number};cases:Comparison[];
}
const gpu=new BoxFilter();
const rectangles=(ctx:CanvasRenderingContext2D):void=>{
  ctx.fillStyle='#f52b17';ctx.fillRect(9,8,19,11);
  ctx.fillStyle='#1458ef';ctx.fillRect(47,43,14,18);
};
const translucent=(ctx:CanvasRenderingContext2D):void=>{
  ctx.fillStyle='rgba(250,31,17,.35)';ctx.fillRect(11,9,34,29);
  ctx.fillStyle='rgba(12,75,239,.65)';ctx.fillRect(29,21,35,24);
  ctx.fillStyle='rgba(40,235,100,.12)';ctx.fillRect(63,48,11,9);
};
const fixtures:Fixture[]=[
  {name:'opaque off-center',width:97,height:83,x:3,y:7,passes:1,paint:rectangles},
  {name:'translucent overlap',width:109,height:73,x:4.5,y:8.25,passes:1,paint:translucent},
  {name:'fractional three-pass',width:101,height:85,x:5.75,y:3.5,passes:3,paint:translucent},
  {name:'vertical only',width:71,height:111,x:1,y:14.5,passes:2,paint:rectangles},
  {name:'transparent outside active bounds',width:91,height:69,x:17.25,y:12.5,passes:2,paint:ctx=>{ctx.fillStyle='#ff305a';ctx.fillRect(0,0,18,13);ctx.fillStyle='rgba(30,190,240,.5)';ctx.fillRect(77,51,14,18);}},
  {name:'wide source smoke kernel',width:213,height:137,x:126.5,y:126.5,passes:1,paint:ctx=>{ctx.fillStyle='rgba(255,255,255,.65)';ctx.fillRect(71,43,39,34);ctx.fillStyle='rgba(30,220,140,.4)';ctx.fillRect(129,71,31,21);}},
  {name:'near-identity opaque',width:67,height:73,x:1.25,y:1.5,passes:3,paint:ctx=>{ctx.fillStyle='#5795dc';ctx.fillRect(0,0,67,73);}},
];
function reference(source:ImageData,x:number,y:number,passes:number):Uint8ClampedArray {
  const data=new Uint8ClampedArray(source.data),scratch=new Uint8ClampedArray(data.length);
  for(let i=0;i<data.length;i+=4){const alpha=data[i+3]!/255;for(let c=0;c<3;c++)data[i+c]=Math.floor(data[i+c]!*alpha);}
  for(let pass=0;pass<passes;pass++){
    boxBlurAxis(data,scratch,source.width,source.height,x,true);
    boxBlurAxis(scratch,data,source.width,source.height,y,false);
  }
  return data;
}
/** Canvas returns straight RGB8. Reverse its rounded unpremultiplication to compare RGBA8 bytes. */
export function premultipliedByte(channel:number,alpha:number):number {return Math.round(channel*alpha/255);}
function location(data:Uint8ClampedArray,width:number,premultiplied:boolean):{x:number;y:number;bounds:number[]|null} {
  let mass=0,x=0,y=0,left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(let i=0;i<data.length;i+=4){const alpha=data[i+3]!,px=i/4%width,py=Math.floor(i/4/width);mass+=alpha;x+=px*alpha;y+=py*alpha;
    if(alpha>2){left=Math.min(left,px);top=Math.min(top,py);right=Math.max(right,px);bottom=Math.max(bottom,py);}
  }
  // Alpha has the same meaning in both premultiplied and ordinary ImageData.
  void premultiplied;
  return {x:mass?x/mass:0,y:mass?y/mass:0,bounds:left===Infinity?null:[left,top,right,bottom]};
}

/** Real browser check: callers display this report; a missing GPU is never reported as parity. */
export function runFilterCheck():FilterCheckReport {
  const tolerances={alpha:2,premultipliedMaximum:2,premultipliedMean:.25,centroidPixels:.35,boundsPixels:2};
  const cases:Comparison[]=[],initialPasses=gpu.stats.passes,initialFailures=gpu.stats.failures;
  for(const fixture of fixtures){
    const canvas=document.createElement('canvas');canvas.width=fixture.width;canvas.height=fixture.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;fixture.paint(ctx);
    const expected=reference(ctx.getImageData(0,0,canvas.width,canvas.height),fixture.x,fixture.y,fixture.passes);
    const before=gpu.stats.passes,used=gpu.apply(canvas,fixture.x,fixture.y,fixture.passes),actual=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let alphaMaximumError=0,premultipliedMaximumError=0,readbackMaximumError=0,sum=0;
    for(let i=0;i<actual.length;i+=4){
      alphaMaximumError=Math.max(alphaMaximumError,Math.abs(actual[i+3]!-expected[i+3]!));
      for(let channel=0;channel<3;channel++){
        const rawError=Math.abs(actual[i+channel]!*actual[i+3]!/255-expected[i+channel]!);
        const error=Math.abs(premultipliedByte(actual[i+channel]!,actual[i+3]!)-expected[i+channel]!);sum+=error;premultipliedMaximumError=Math.max(premultipliedMaximumError,error);readbackMaximumError=Math.max(readbackMaximumError,rawError);
      }
    }
    const cpuLocation=location(expected,canvas.width,true),gpuLocation=location(actual,canvas.width,false);
    const centroidDistance=Math.hypot(cpuLocation.x-gpuLocation.x,cpuLocation.y-gpuLocation.y);
    const boundsMaximumError=cpuLocation.bounds && gpuLocation.bounds?Math.max(...cpuLocation.bounds.map((n,i)=>Math.abs(n-gpuLocation.bounds![i]!))):cpuLocation.bounds===gpuLocation.bounds?0:Infinity;
    const premultipliedMeanError=sum/(actual.length/4*3);
    const passed=used && alphaMaximumError<=tolerances.alpha && premultipliedMaximumError<=tolerances.premultipliedMaximum && premultipliedMeanError<=tolerances.premultipliedMean && centroidDistance<=tolerances.centroidPixels && boundsMaximumError<=tolerances.boundsPixels;
    cases.push({name:fixture.name,passed,gpuUsed:used,gpuPasses:gpu.stats.passes-before,alphaMaximumError,premultipliedMaximumError,premultipliedMeanError,readbackMaximumError,centroidDistance,boundsMaximumError,cpuBounds:cpuLocation.bounds,gpuBounds:gpuLocation.bounds});
    canvas.width=canvas.height=1;
  }
  const passed=cases.filter(c=>c.passed).length;
  return {status:cases.every(c=>!c.gpuUsed)?'UNAVAILABLE':passed===cases.length?'PASS':'FAIL',passed,total:cases.length,gpuPasses:gpu.stats.passes-initialPasses,gpuFailures:gpu.stats.failures-initialFailures,tolerances,cases};
}


export interface CompositionCheckReport {
  status:'PASS'|'FAIL';passed:number;total:number;
  tolerances:{alpha:number;premultipliedMaximum:number;premultipliedMean:number};
  cases:{name:string;passed:boolean;alphaMaximumError:number;premultipliedMaximumError:number;premultipliedMeanError:number;pixelsOverTwo:number}[];
}
/** Same authored scene, scale and timestamp, with only one optimization toggled. */
export async function runCompositionCheck():Promise<CompositionCheckReport> {
  const response=await fetch('assets/vector/scene.json');
  if(!response.ok)throw new Error('Composition check could not load vector source');
  const pack=await response.json(),art=new VectorArt(pack);
  const tolerances={alpha:2,premultipliedMaximum:2,premultipliedMean:.15},cases:CompositionCheckReport['cases']=[];
  for(const scale of [1,2.75])for(const opaque of [false,true])for(const kind of ['single-alpha'] as const){
    const canvas=document.createElement('canvas');canvas.width=Math.round(550*scale);canvas.height=Math.round(400*scale);
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    const draw=(optimized:boolean):Uint8ClampedArray=>{
      art.clearCache();art.profilingOmitAlphaFactoring=!optimized;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      if(opaque){ctx.fillStyle='#365b23';ctx.fillRect(0,0,canvas.width,canvas.height);}
      ctx.setTransform(scale,0,0,scale,0,0);
      art.drawPlacement(ctx,132,{a:1,b:0,c:0,d:1,tx:270,ty:320},1,{colorTransform:{hasMultTerms:true,alphaMultTerm:131}});
      return ctx.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const expected=draw(false),actual=draw(true);let alphaMaximumError=0,premultipliedMaximumError=0,sum=0,pixelsOverTwo=0;
    for(let i=0;i<actual.length;i+=4){
      let pixelMax=Math.abs(actual[i+3]!-expected[i+3]!);alphaMaximumError=Math.max(alphaMaximumError,pixelMax);
      for(let c=0;c<3;c++){
        const error=Math.abs(premultipliedByte(actual[i+c]!,actual[i+3]!)-premultipliedByte(expected[i+c]!,expected[i+3]!));
        sum+=error;pixelMax=Math.max(pixelMax,error);premultipliedMaximumError=Math.max(premultipliedMaximumError,error);
      }
      if(pixelMax>2)pixelsOverTwo++;
    }
    const premultipliedMeanError=sum/(actual.length/4*3),passed=alphaMaximumError<=tolerances.alpha&&premultipliedMaximumError<=tolerances.premultipliedMaximum&&premultipliedMeanError<=tolerances.premultipliedMean;
    cases.push({name:`${kind}, ${scale}x, ${opaque?'opaque':'transparent'}`,passed,alphaMaximumError,premultipliedMaximumError,premultipliedMeanError,pixelsOverTwo});
    canvas.width=canvas.height=1;
  }
  art.clearCache();const passed=cases.filter(c=>c.passed).length;
  return {status:passed===cases.length?'PASS':'FAIL',passed,total:cases.length,tolerances,cases};
}
