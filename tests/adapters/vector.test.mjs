import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BoxFilter, filterBackingSize } from '../../.local-setup/build/modules/src/render/box-filter.js';
import { premultipliedByte } from '../../.local-setup/build/modules/development/verification/filter-check.js';
import { fixture } from '../../.local-setup/build/modules/development/verification/component-study.js';
import { Renderer } from '../../.local-setup/build/modules/src/render/renderer.js';
import { Assets } from '../../.local-setup/build/modules/src/render/assets.js';
import { VectorArt, multiply, combineTint, interpolatePath, gradientMatrix, childTimelineClock, animationPeriod, blurKernel, boxBlurAxis, filterBounds, transformedBounds, presentationFrame } from '../../.local-setup/build/modules/src/render/vector.js';

const pack=JSON.parse(readFileSync(new URL('../../assets/vector/scene.json',import.meta.url),'utf8'));
const numbers=s=>s.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g).map(Number);

test('nested placements and additive color transforms preserve application order',()=>{
  assert.deepEqual(multiply([2,0,0,3,10,20],[0,1,-1,0,4,5]),[0,3,-2,0,18,35]);
  const parent=combineTint([1,1,1,1,0,0,0,0],{hasMultTerms:true,redMultTerm:128,alphaMultTerm:128,hasAddTerms:true,redAddTerm:10});
  const tint=combineTint(parent,{hasMultTerms:true,redMultTerm:128,hasAddTerms:true,redAddTerm:20,alphaAddTerm:40});
  assert.equal(tint[0],.25);assert.equal(tint[4],20);assert.equal(tint[7],20);
});

test('all authored morph contours reach both exact vector endpoints',()=>{
  let checked=0;
  for(const symbol of Object.values(pack.symbols))for(const draw of symbol.draws??[]){
    if(draw.endPath===undefined)continue;
    const a=pack.paths[draw.path],b=pack.paths[draw.endPath];
    assert.deepEqual(numbers(interpolatePath(a,b,0)),numbers(a));
    const end=numbers(interpolatePath(a,b,1)),expected=numbers(b);
    end.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-9));checked++;
  }
  assert.equal(checked,28);
});

test('animated gradient transforms replace the static matrix and preserve authored translation',()=>{
  const g=pack.gradients['359-gradient0'];
  assert.ok(g.transforms.length>0);
  assert.equal(gradientMatrix(g,0)[4],49.9);
  assert.equal(gradientMatrix(g,1)[4],48.9);
  assert.equal(gradientMatrix(g,.5)[4],49.4);
});

test('vector pack resolves every display dependency, mask, button label and missing source blur',()=>{
  assert.equal(Object.keys(pack.symbols).length,614);
  assert.equal(pack.sourceSha256,'9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a');
  for(const symbol of Object.values(pack.symbols))for(const [index,frame] of (symbol.frames??[]).entries()){
    let depth=-Infinity;
    for(const p of frame){
      assert.ok(pack.symbols[p.id]);assert.ok(p.depth>depth);depth=p.depth;
      assert.ok(p.born<=index+1);assert.ok(p.ratio===undefined||p.ratio>=0&&p.ratio<=65535);
    }
  }
  for(const frame of pack.symbols['626'].frames)assert.equal(frame.find(p=>p.depth===2).id,623);
  assert.equal(pack.symbols['472'].frames[0].find(p=>p.depth===1).filters[0].blurX,'5.0');
  assert.equal(pack.symbols['-1001'].frames[0].find(p=>p.depth===37).filters[0].type,'DROPSHADOWFILTER');
  assert.equal(pack.symbols['-1005'].frames[0].find(p=>p.depth===261).filters[0].blurX,'4.0');
  assert.equal(pack.symbols['357'].frames[0].find(p=>p.clipDepth).clipDepth,5);
  for(const frame of pack.symbols['-363'].frames)assert.equal(frame.some(p=>p.id===351||p.id===357),false);
  assert.equal(JSON.stringify(pack).includes('.webp'),false);
  assert.equal(JSON.stringify(pack).includes('.png'),false);
});

test('radio sound waves finish all 27 frames across the 20-frame parent loop',()=>{
  const radio=pack.symbols['199'];
  assert.equal(radio.frames.length,20);
  const wave=radio.frames[0].find(p=>p.id===198);
  assert.equal(pack.symbols['198'].frames.length,27);
  assert.equal(childTimelineClock(radio,20,0,wave),20);
  assert.equal(childTimelineClock(radio,26,6,wave),26);
  assert.equal(animationPeriod(pack.symbols,199)%540,0);
  const replaced={kind:'sprite',frames:[[],[{...wave,born:2}]]};
  assert.equal(childTimelineClock(replaced,3,1,{...wave,born:2}),0);
});

test('tutorial resets only its parent timeline while permanent descendants retain creation age',()=>{
  const tutorial=pack.symbols['321'],radio=tutorial.frames[0].find(p=>p.id===199);
  assert.ok(radio);
  assert.equal(childTimelineClock(tutorial,0,0,radio,false,100),100,'How restart retains hidden child age');
  assert.equal(childTimelineClock(tutorial,335,0,radio,false,435),435,'335-frame wrap retains permanent children');
  const temporary={...radio,depth:999,born:2};
  assert.equal(childTimelineClock(tutorial,336,1,temporary,false,436),0,'new placement uses its own parent-frame birth');
  const nested=pack.symbols['199'],wave=nested.frames[0].find(p=>p.id===198);
  assert.equal(childTimelineClock(nested,435,15,wave),435,'nested radio waves keep the passed age normally');
});

test('source blur uses fractional box widths, transparent edges and separate axes',()=>{
  assert.deepEqual(blurKernel(3),{radius:0,edge:1,divisor:3});
  const impulse=new Uint8ClampedArray(7*4);impulse.set([255,0,0,255],3*4);
  const horizontal=new Uint8ClampedArray(impulse.length);
  boxBlurAxis(impulse,horizontal,7,1,3,true);
  assert.deepEqual([...horizontal].filter((_,i)=>i%4===3),[0,0,85,85,85,0,0]);
  const vertical=new Uint8ClampedArray(impulse.length);
  boxBlurAxis(impulse,vertical,1,7,3,false);assert.deepEqual(vertical,horizontal);
  const identity=new Uint8ClampedArray(impulse.length);
  boxBlurAxis(impulse,identity,7,1,1,true);assert.deepEqual(identity,impulse);
  const passes=new Uint8ClampedArray(impulse.length);
  boxBlurAxis(horizontal,passes,7,1,3,true);
  assert.deepEqual([...passes].filter((_,i)=>i%4===3),[0,28,56,85,56,28,0]);
});

test('GPU filter buckets retain resolution and unavailable contexts leave the source untouched',()=>{
  assert.deepEqual(filterBackingSize(65,127),[128,128]);
  const previous=globalThis.document;let contextReads=0;
  globalThis.document={createElement(){return {getContext(){contextReads++;return null;}};}};
  try{
    const filter=new BoxFilter(),source={width:5,height:7,getContext(){throw Error('Source must remain untouched on fallback');}};
    assert.equal(filter.apply(source,1,1,1),true);assert.equal(contextReads,0);
    assert.equal(filter.apply(source,3,3,1),false);assert.equal(contextReads,1);
    assert.equal(filter.apply(source,3,3,1),false);assert.equal(contextReads,1);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('premultiplied byte comparison reverses every valid RGB8 readback round trip',()=>{
  for(let alpha=1;alpha<=255;alpha++)for(let value=0;value<=alpha;value++)assert.equal(premultipliedByte(Math.round(value*255/alpha),alpha),value);
  assert.equal(premultipliedByte(255,0),0);
});

test('GPU filter reuses backing textures and submits premultiplied axes in source order',()=>{
  const previous=globalThis.document,commands=[];let allocations=0;
  const noop=()=>{},object=()=>({});
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,TEXTURE_2D:5,TEXTURE0:6,RGBA8:7,RGBA:8,UNSIGNED_BYTE:9,FRAMEBUFFER:10,FRAMEBUFFER_COMPLETE:11,MAX_TEXTURE_SIZE:12,UNPACK_PREMULTIPLY_ALPHA_WEBGL:13,UNPACK_FLIP_Y_WEBGL:14,UNPACK_COLORSPACE_CONVERSION_WEBGL:15,NONE:0,
    createShader:object,shaderSource:noop,compileShader:noop,getShaderParameter:()=>true,deleteShader:noop,createProgram:object,attachShader:noop,linkProgram:noop,getProgramParameter:()=>true,deleteProgram:noop,
    getUniformLocation:(_,name)=>name,createTexture:object,bindTexture:noop,texParameteri:noop,createFramebuffer:object,disable:noop,isContextLost:()=>false,getParameter:()=>4096,
    texImage2D(){allocations++;},bindFramebuffer:noop,framebufferTexture2D:noop,checkFramebufferStatus:()=>11,useProgram:noop,activeTexture:noop,pixelStorei:(...args)=>commands.push(['pixelStore',...args]),texSubImage2D:noop,viewport:noop,
    uniform1i:noop,uniform2i:(name,x,y)=>{if(name==='direction')commands.push(['axis',x,y]);},uniform2f:noop,uniform1f:noop,drawArrays:noop,flush:noop};
  const context={save:noop,restore:noop,setTransform:noop,drawImage:(...args)=>commands.push(['copy',...args.slice(1)])};
  globalThis.document={createElement(){return {width:0,height:0,getContext:()=>gl,addEventListener:noop};}};
  try{
    const filter=new BoxFilter(),source={width:65,height:97,getContext:()=>context};
    assert.equal(filter.apply(source,3,5,2),true);assert.equal(allocations,3);assert.equal(filter.stats.passes,4);
    assert.deepEqual(commands.filter(c=>c[0]==='axis'),[['axis',1,0],['axis',0,1],['axis',1,0],['axis',0,1]]);
    assert.ok(commands.some(c=>c[0]==='pixelStore'&&c[1]===13&&c[2]===true));
    assert.deepEqual(commands.find(c=>c[0]==='copy').slice(1),[0,31,65,97,0,0,65,97]);
    assert.equal(filter.apply({...source,width:32,height:33},3,1,1),true);assert.equal(allocations,3,'smaller sources keep their backing allocation');
    filter.clear();assert.equal(filter.stats.backingBytes,16);
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('filter padding follows transformed parent coordinates, including shadow direction',()=>{
  const transformed=transformedBounds({x:0,y:0,width:10,height:20},[28,0,0,1,30,40]);
  const bounds=filterBounds(transformed,[{type:'BLURFILTER',blurX:'5',blurY:'9',passes:'2'}]);
  assert.deepEqual(bounds,{x:26,y:32,width:288,height:36});
  assert.deepEqual(filterBounds({x:0,y:0,width:10,height:10},[{type:'DROPSHADOWFILTER',blurX:'1',blurY:'1',passes:'3',angle:'0',distance:'4'}]),{x:0,y:0,width:14,height:10});
});

function canvasHarness(run){
  const originals=Object.fromEntries(['document','Path2D','DOMMatrix','DOMPoint','ResizeObserver','devicePixelRatio'].map(k=>[k,globalThis[k]]));
  const operations=[];
  class Matrix {
    constructor(v=[1,0,0,1,0,0]){[this.a,this.b,this.c,this.d,this.e,this.f]=v;}
    inverse(){const z=this.a*this.d-this.b*this.c;return new Matrix([this.d/z,-this.b/z,-this.c/z,this.a/z,(this.c*this.f-this.d*this.e)/z,(this.b*this.e-this.a*this.f)/z]);}
  }
  class Context {
    constructor(canvas){this.canvas=canvas;this.globalAlpha=1;this.matrix=[1,0,0,1,0,0];this.stack=[];}
    save(){this.stack.push({matrix:[...this.matrix],alpha:this.globalAlpha});}
    restore(){const v=this.stack.pop();this.matrix=v.matrix;this.globalAlpha=v.alpha;}
    transform(...m){this.matrix=multiply(this.matrix,m);}
    setTransform(...m){this.matrix=m;}
    getTransform(){return new Matrix(this.matrix);}
    beginPath(){} rect(){} fillText(){} clearRect(){} fillRect(){operations.push(['rect',this.canvas.id,[...this.matrix]]);} fill(){operations.push(['fill',this.canvas.id]);} stroke(){operations.push(['stroke',this.canvas.id,[...this.matrix],this.lineWidth]);}
    clip(path,rule){operations.push(['clip',rule,this.canvas.id]);}
    drawImage(source,...args){operations.push(['image',this.canvas.id,source.id,...args]);}
    createLinearGradient(){return {addColorStop(){}};} createRadialGradient(){return {addColorStop(){}};}
    getImageData(x,y,w,h){operations.push(['read',this.canvas.id]);return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};}
    putImageData(){operations.push(['write',this.canvas.id]);}
  }
  const canvases=[];
  globalThis.document={createElement(){const canvas={id:canvases.length,width:0,height:0,clientWidth:990,clientHeight:720,getContext(){return this.context??(this.context=new Context(this));}};canvases.push(canvas);return canvas;}};
  globalThis.ResizeObserver=class{observe(){}};globalThis.devicePixelRatio=1.5;
  globalThis.Path2D=class {addPath(){}};globalThis.DOMMatrix=Matrix;
  globalThis.DOMPoint=class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(m){return {x:m.a*this.x+m.c*this.y+m.e,y:m.b*this.x+m.d*this.y+m.f};}};
  try{run({operations,canvases,canvas:(w=550,h=400)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;}});}finally{for(const [k,v] of Object.entries(originals))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
}
const matrix={a:1,b:0,c:0,d:1,tx:0,ty:0};
const shape={kind:'shape',bounds:{x:0,y:0,width:10,height:10},draws:[0,1].map(path=>({path,matrix:[1,0,0,1,0,0],fill:'#ff0000',stroke:'none',width:0,rule:'nonzero',cap:'butt',join:'miter',fillOpacity:1,strokeOpacity:1}))};
const placement=(id,depth,tx=0)=>({id,depth,born:1,matrix:[1,0,0,1,tx,0]});
const smallPack=symbols=>({version:1,paths:['M0 0L10 0L10 10Z','M0 0L0 10L10 10Z'],gradients:{},symbols});

test('optional presentation interpolation preserves integer poses and discrete source boundaries',()=>{
  const first={...placement(1,1),ratio:100},next={...placement(1,1,20),ratio:500};
  const symbol={kind:'sprite',frames:[[first],[next]]};
  assert.equal(presentationFrame(symbol,0,true).placements,symbol.frames[0]);
  assert.equal(presentationFrame(symbol,1,true).placements,symbol.frames[1]);
  assert.equal(presentationFrame(symbol,.5).placements,symbol.frames[0],'disabled by default');
  const midway=presentationFrame(symbol,.5,true).placements[0];assert.equal(midway.matrix[4],10);assert.equal(midway.ratio,300);assert.equal(first.matrix[4],0);
  assert.equal(presentationFrame(symbol,1.5,true).placements,symbol.frames[1],'no last-to-first tween');
  assert.equal(presentationFrame({...symbol,kind:'button'},.5,true).placements,symbol.frames[0]);
  for(const change of [{id:2},{born:2},{visible:false},{clipDepth:3},{colorTransform:{hasMultTerms:true,alphaMultTerm:128}},{filters:[{type:'BLURFILTER',blurX:'5'}]}]){
    const changed={...symbol,frames:[[first],[{...next,...change}]]};assert.equal(presentationFrame(changed,.5,true).placements[0],first);
  }
  for(const source of Object.values(pack.symbols))for(let frame=0;frame<(source.frames?.length??0);frame++)assert.equal(presentationFrame(source,frame,true).placements,source.frames[frame]);
});

test('fractional decorative motion reuses static children and keeps filtered output at source cadence',()=>canvasHarness(({canvas})=>{
  const moving={kind:'sprite',bounds:{x:0,y:0,width:30,height:10},frames:[[placement(1,1)],[placement(1,1,20)]]};
  const art=new VectorArt(smallPack({1:shape,2:moving}));art.profiling=true;const ctx=canvas().getContext('2d');
  for(let i=0;i<20;i++)art.drawPlacement(ctx,2,matrix,1+i/20,{interpolate:true});
  assert.ok(art.stats.allocatedBytes<2000);assert.ok(art.stats.cacheHits>=19);
  const effect={interpolate:true,filters:[{type:'BLURFILTER',blurX:'3',blurY:'3',passes:'1'}]};
  for(let i=0;i<20;i++)art.drawPlacement(ctx,2,matrix,1+i/20,effect);
  assert.equal(art.stats.filterPlacements,1,'fractional callbacks reuse the same authored filtered pose');
}));

test('single white fills reuse one tile across fades without factoring multipath alpha',()=>canvasHarness(({canvas})=>{
  const one={...shape,draws:[shape.draws[0]]},art=new VectorArt(smallPack({1:one,2:shape}));art.profiling=true;const ctx=canvas().getContext('2d');
  for(let alpha=1;alpha<=255;alpha++)art.drawPlacement(ctx,1,matrix,1,{colorTransform:{hasMultTerms:true,alphaMultTerm:alpha}});
  assert.equal(art.groupCosts.get(1).builds,1);assert.equal(art.stats.cacheHits,254);
  art.drawPlacement(ctx,2,matrix,1,{colorTransform:{hasMultTerms:true,alphaMultTerm:64}});
  art.drawPlacement(ctx,2,matrix,1,{colorTransform:{hasMultTerms:true,alphaMultTerm:128}});
  assert.equal(art.groupCosts.get(2).builds,2,'overlapping paint operations retain their original alpha semantics');
}));

test('gradient transform is active at paint time while stroke geometry keeps its original width',()=>canvasHarness(({canvas,operations})=>{
  const source=smallPack({1:{...shape,draws:[{...shape.draws[0],fill:'@g',stroke:'@g',width:2}]}});
  source.gradients.g={type:'linearGradient',matrix:[0,2,-3,0,5,6],spread:'pad',x1:0,x2:10,transforms:[],stops:[{offset:0,color:'#000000',opacity:1,animations:{}},{offset:1,color:'#ffffff',opacity:1,animations:{}}]};
  new VectorArt(source).draw(canvas().getContext('2d'),1,matrix,1,1,false);
  const rectangle=operations.find(v=>v[0]==='rect');assert.deepEqual(rectangle[2],[0,2,-3,0,5,6]);
  assert.ok(operations.findIndex(v=>v[0]==='clip')<operations.findIndex(v=>v[0]==='rect'));
  const stroke=operations.find(v=>v[0]==='stroke');assert.deepEqual(stroke[2].slice(0,4),[1,0,0,1]);assert.equal(stroke[3],2);
}));

test('filtered clips isolate both paths once; translation reuses output and tint changes invalidate it',()=>canvasHarness(({canvas,operations})=>{
  const art=new VectorArt(smallPack({1:shape}));art.profiling=true;
  const ctx=canvas().getContext('2d'),effects={filters:[{type:'BLURFILTER',blurX:'3',blurY:'3',passes:'1'}]};
  art.drawPlacement(ctx,1,matrix,1,effects);
  assert.equal(art.stats.filterPlacements,1);
  assert.equal(operations.filter(v=>v[0]==='read').length,1);
  assert.equal(operations.filter(v=>v[0]==='fill').length,2);
  const allocated=art.stats.allocatedBytes;
  art.drawPlacement(ctx,1,{...matrix,tx:30},1,effects);
  assert.equal(art.stats.allocatedBytes,allocated);assert.equal(art.stats.cacheHits,1);
  art.drawPlacement(ctx,1,matrix,1,{...effects,colorTransform:{hasAddTerms:true,blueAddTerm:255}});
  assert.equal(art.stats.filterPlacements,2);
}));

test('retained children reuse travel poses, preserve mask ordering and stay within the byte budget',()=>canvasHarness(({canvas,operations})=>{
  const moving={kind:'sprite',bounds:{x:0,y:0,width:10000,height:10},frames:Array.from({length:60},(_,i)=>[placement(1,1,i*2)])};
  const art=new VectorArt(smallPack({1:shape,2:moving,3:{kind:'sprite',bounds:shape.bounds,frames:[[{...placement(1,1),clipDepth:2},placement(1,2),placement(1,3)]]}}));
  art.profiling=true;const ctx=canvas().getContext('2d');
  for(let frame=1;frame<=60;frame++)art.draw(ctx,2,matrix,frame);
  assert.ok(art.stats.allocatedBytes<2000,'only the small stationary child allocates');
  assert.ok(art.stats.cacheHits>=59);
  operations.length=0;art.draw(ctx,3,matrix,1,1,false);
  assert.equal(operations.filter(v=>v[0]==='clip').length,1,'mask ends at depth2');
  assert.ok(operations.findIndex(v=>v[0]==='clip')<operations.findIndex(v=>v[0]==='fill'));
  for(let frame=0;frame<650;frame++)art.drawPlacement(ctx,1,matrix,1,{colorTransform:{hasAddTerms:true,redAddTerm:frame}});
  assert.ok(art.stats.cachedBytes<=80*1024*1024);assert.ok(art.stats.pooledBytes<=16*1024*1024);assert.ok(art.stats.evictions>0);
  art.clearCache();assert.equal(art.stats.cachedBytes+art.stats.pooledBytes,0);
}));

test('stretched filtered smoke uses parent-space padding and independent display densities',()=>canvasHarness(({canvas,canvases})=>{
  const art=new VectorArt(smallPack({1:shape}));art.profiling=true;
  art.drawPlacement(canvas(1000,400).getContext('2d'),1,{...matrix,a:28},1,{filters:[{type:'BLURFILTER',blurX:'5',blurY:'5',passes:'1'}]});
  const live=canvases.filter(c=>c.width>0&&c.height>0&&c.width!==1000&&c.width!==1);
  assert.ok(live.every(c=>c.width<300&&c.height<30),'a28x stretch must not scale the blur or vertical backing store28x');
}));

test('authored background and traffic retain a bounded working set across repeated poses',t=>canvasHarness(({canvas})=>{
  const art=new VectorArt(pack);art.profiling=true;
  const ctx=canvas(1485,1080).getContext('2d');ctx.setTransform(2.7,0,0,2.7,0,0);
  const ids=[193,224,204,206,210,215,218];
  const placements=pack.symbols['-1005'].frames[0].filter(p=>ids.includes(p.id));
  const run=()=>{for(let frame=1;frame<=36;frame++)for(const p of placements){const [a,b,c,d,tx,ty]=p.matrix;art.drawPlacement(ctx,p.id,{a,b,c,d,tx,ty},frame,p);}};
  run();const cold=art.stats.allocatedBytes;run();const warm=art.stats.allocatedBytes-cold;
  const former=36*placements.reduce((sum,p)=>{const b=pack.symbols[p.id].bounds;const density=Math.ceil(2.7*Math.max(Math.hypot(p.matrix[0],p.matrix[1]),Math.hypot(p.matrix[2],p.matrix[3]))*4)/4;return sum+(b.width*density+4)*(b.height*density+4)*4;},0);
  assert.ok(cold<former*.1,'retained children reduce theoretical whole-root surface allocation by at least90%');
  assert.equal(warm,0,'replaying these authored poses should need no new backing surfaces');
  assert.ok(art.stats.cachedBytes+art.stats.pooledBytes<=96*1024*1024);
  t.diagnostic(JSON.stringify({frames:72,scale:2.7,coldAllocatedMiB:cold/1048576,repeatedAllocatedMiB:warm/1048576,formerWholeRootMiB:former/1048576,liveMiB:art.stats.cachedBytes/1048576,poolMiB:art.stats.pooledBytes/1048576,filterGroups:art.stats.filterPlacements,evictions:art.stats.evictions}));
}));


test('persistentFrame draw option updates root bounds and direct child clocks without leaking overrides',()=>canvasHarness(({canvas})=>{
  const child={kind:'sprite',bounds:{x:0,y:0,width:30,height:10},frames:[[placement(1,1)],[placement(1,1,20)]]};
  const root={kind:'sprite',bounds:child.bounds,frames:[[placement(2,1)]]};
  const art=new VectorArt(smallPack({1:shape,2:child,3:root})),calls=[],node=art.node.bind(art);
  art.node=(...args)=>{calls.push({id:args[1],clock:args[2],persistent:args[10]});return node(...args);};
  art.drawPlacement(canvas().getContext('2d'),3,matrix,1,{persistentFrame:2});
  assert.equal(calls.find(c=>c.id===2).clock,1);
  assert.equal(calls.find(c=>c.id===2).persistent,undefined,'override is root-only');
  assert.equal(art.currentBounds(3,0,0,false,1).x,20,'culling uses the same independent child pose');
}));


test('GPU summary uses only an existing context, caches requested identifiers and returns detached details',()=>{
  const filter=new BoxFilter();assert.equal(filter.gpuSummary().status,'not-initialized');
  let extensions=0,parameters=0,lost=false;
  const values=new Map([[1,'WebKit'],[2,'WebKit WebGL'],[3,'WebGL2'],[4,'GLSL3'],[5,8192],[6,'Google'],[7,'ANGLE (Google, Vulkan SwiftShader)']]);
  filter.attempted=true;filter.gl={VENDOR:1,RENDERER:2,VERSION:3,SHADING_LANGUAGE_VERSION:4,MAX_TEXTURE_SIZE:5,isContextLost:()=>lost,
    getParameter(key){parameters++;return values.get(key);},getExtension(){extensions++;return {UNMASKED_VENDOR_WEBGL:6,UNMASKED_RENDERER_WEBGL:7};},getContextAttributes:()=>({alpha:true,premultipliedAlpha:true})};
  const first=filter.gpuSummary();assert.equal(first.status,'ready');assert.equal(first.details.classification,'software-indicated');assert.equal(first.details.maximumTextureSize,8192);
  const reads=parameters;first.details.renderer='changed';first.details.attributes.alpha=false;
  const second=filter.gpuSummary();assert.equal(extensions,1);assert.equal(parameters,reads);assert.equal(second.details.renderer,'WebKit WebGL');assert.equal(second.details.attributes.alpha,true);
  lost=true;assert.equal(filter.gpuSummary().status,'context-lost');assert.equal(filter.gpuSummary().details,null);
  lost=false;filter.lost=true;assert.equal(filter.gpuSummary().status,'unavailable','a filter failure is not falsely described as a lost WebGL context');
});

test('memory summary separates retained pixels, reuse pool, CPU scratch and filter storage without mutating caches',()=>canvasHarness(({canvas})=>{
  const art=new VectorArt(smallPack({1:shape}));assert.equal(art.gpuSummary().filter.status,'not-initialized');
  art.draw(canvas().getContext('2d'),1,matrix);art.release(canvas(20,30));
  const first=art.memorySummary();assert.equal(first.tileCount,1);assert.equal(first.poolBytes,20*30*4);assert.equal(first.cpuBlurScratchBytes,0);
  assert.equal(first.bySymbol[0].id,1);assert.equal(first.bySymbol[0].bytes,first.tileBytes);
  assert.equal(first.accountedBackingBytes,first.tileBytes+first.poolBytes);
  first.bySymbol[0].bytes=0;assert.ok(art.memorySummary().bySymbol[0].bytes>0);
  art.profilingCpuFilters=true;art.drawPlacement(canvas().getContext('2d'),1,matrix,1,{filters:[{type:'BLURFILTER',blurX:'3',blurY:'3',passes:'1'}]});
  assert.equal(art.gpuSummary().lastFilterBackend,'cpu');assert.equal(art.gpuSummary().cpuApplications,1);assert.equal(art.gpuSummary().filter.status,'not-initialized');
  assert.ok(art.memorySummary().cpuBlurScratchBytes>0);art.clearCache();assert.equal(art.memorySummary().accountedBackingBytes,0);
}));


test('diagnostic child omission preserves the base and masks, including masked bounds, across cache resets',()=>canvasHarness(({canvas,operations})=>{
  const one={...shape,draws:[shape.draws[0]]},parent={kind:'sprite',bounds:{x:0,y:0,width:40,height:10},frames:[[placement(222,1),placement(223,2,30)]]};
  const mask={kind:'sprite',bounds:one.bounds,frames:[[placement(222,1)]]};
  const masked={kind:'sprite',bounds:one.bounds,frames:[[{...placement(223,1),clipDepth:2},placement(222,2)]]};
  const art=new VectorArt(smallPack({222:one,223:one,224:parent})),ctx=canvas().getContext('2d');
  art.draw(ctx,224,matrix);assert.equal(art.currentBounds(224,0).width,40);assert.equal(operations.filter(v=>v[0]==='fill').length,2);
  art.diagnosticOmitChildren.add('224:223');art.clearCache();operations.length=0;art.draw(ctx,224,matrix);
  assert.equal(operations.filter(v=>v[0]==='fill').length,1,'black/base shape remains');assert.equal(art.currentBounds(224,0).width,10);
  art.diagnosticOmitChildren.clear();art.clearCache();operations.length=0;art.draw(ctx,224,matrix);
  assert.equal(operations.filter(v=>v[0]==='fill').length,2);assert.equal(art.currentBounds(224,0).width,40,'restoration invalidates narrowed bounds');
  const maskArt=new VectorArt(smallPack({222:one,223:mask,224:masked}));maskArt.diagnosticOmitChildren.add('224:223');maskArt.diagnosticOmitChildren.add('223:222');
  operations.length=0;maskArt.draw(ctx,224,matrix);
  assert.equal(operations.filter(v=>v[0]==='clip').length,1,'mask placements are never omitted');
  assert.equal(operations.filter(v=>v[0]==='fill').length,1);assert.equal(maskArt.currentBounds(224,0).width,10,'mask descendants keep their original geometry bounds');
}));

test('significant morphs retain two exact recent raster poses per density and recycle retired surfaces',()=>canvasHarness(({canvas})=>{
  const art=new VectorArt(pack),ctx=canvas(1485,1080).getContext('2d');art.profiling=true;
  const draw=(ratio,scale=3)=>art.draw(ctx,346,{...matrix,a:scale,d:scale,tx:200,ty:200},1,1,true,ratio);
  draw(0);draw(.1);const allocation=art.stats.allocatedBytes;
  draw(.2);draw(.3);assert.equal(art.memorySummary().tileCount,2);assert.equal(art.stats.allocatedBytes,allocation,'same-size backing is recycled before the next pose renders');
  assert.equal(art.stats.morphReplacements,2);assert.equal(art.stats.evictions,0);assert.equal(art.tileFamilies.size,2);
  const hits=art.stats.cacheHits;draw(.2);assert.equal(art.stats.cacheHits,hits+1);draw(.4);
  assert.ok([...art.tiles.keys()].some(k=>k.includes(`:${Math.round(.2*65535)}:`)),'recently reused exact pose survives');
  assert.ok(![...art.tiles.keys()].some(k=>k.includes(`:${Math.round(.3*65535)}:`)),'least recently used pose retires');
  draw(.2,2);assert.equal(art.memorySummary().tileCount,3,'display densities are independent families');
  art.clearCache();assert.equal(art.tileFamilies.size+art.morphFamilies.size,0);
  art.diagnosticFullMorphCache=true;for(const ratio of [0,.1,.2,.3])draw(ratio);assert.equal(art.memorySummary().tileCount,4,'diagnostic baseline retains full morph history');
}));

test('source replay retains expensive steam at normal and large display densities',t=>canvasHarness(({canvas,operations})=>{
  const catalog=JSON.parse(readFileSync(new URL('../../assets/catalog.json',import.meta.url),'utf8')),results=[];
  const cases=[...[1,.5].flatMap(scale=>[true,false].map(full=>({scale,full,width:990,legacy:false}))),{scale:1,full:false,width:2200/1.5,legacy:true},{scale:1,full:false,width:2200/1.5,legacy:false}];
  for(const {scale,full,width,legacy} of cases){
    const assets=new Assets(),art=new VectorArt(pack);assets.vector=art;art.profiling=true;art.diagnosticFullMorphCache=full;
    // Accounting test only. Real GPU/Canvas pixels are checked by morph-cache-check.ts.
    art.gpuFilter.apply=()=>true;
    for(const item of catalog.items){assets.symbols.set(item.symbolId,item);for(const name of [item.id,item.name,...item.exportNames])assets.names.set(name,item);}assets.scenes=catalog.scenes;
    if(legacy)art.setViewport=()=>{};
    const stage=canvas();stage.clientWidth=width;stage.clientHeight=width*400/550;
    const renderer=new Renderer(stage,assets);renderer.setRenderScale(scale);
    for(const id of [413,399,400,371,385,476,363,357])renderer.children.set(id,JSON.parse(readFileSync(new URL(`../../assets/timelines/${id}.json`,import.meta.url),'utf8')).events.filter(e=>e.type==='place'&&e.frame===1));
    const state=fixture();renderer.events([{type:'screen',screen:'playing'}],{...state,timeMs:0});
    const run=()=>{for(let local=0;local<6000;local+=20){const pose=Math.floor(local*12/1000);state.timeMs=16000+local;state.clockMinutes=556+Math.floor(local/1000);
      state.pointer.x=275+230*Math.sin(local/700);state.pointer.y=327+20*Math.cos(local/430);state.platePosition.x=state.pointer.x;state.platePosition.y=state.pointer.y;state.counterPosition.x=state.pointer.x;state.counterPosition.y=state.pointer.y+35;
      state.plate[0].x=state.pointer.x;state.plate[0].y=state.pointer.y;state.plate[0].smokePose=pose%12+1;
      state.food.forEach((d,i)=>{if(d){d.pose=i===0?71+pose%70:327;d.smokePose=i===0?null:pose%12+1;}});state.customers.forEach(c=>{c.characterPose=1;c.phaseElapsedMs=pose*1000/12;c.patience=-50-c.id+(pose%20)*.05;});renderer.draw(state);operations.length=0;
    }};
    run();const initial={...art.stats};run();const memory=art.memorySummary(),result={scale,full,width,legacy,newBytes:art.stats.allocatedBytes-initial.allocatedBytes,evictions:art.stats.evictions-initial.evictions,filterBuilds:art.stats.filterPlacements-initial.filterPlacements,liveBytes:memory.tileBytes,entries:memory.tileCount};results.push(result);
    if(width===990||legacy)assert.equal(memory.tileBudgetBytes,80*1024*1024);
    assert.ok(memory.tileBudgetBytes<=384*1024*1024);assert.ok(memory.tileBytes<=memory.tileBudgetBytes);assert.ok(memory.tileCount<=512);assert.ok(memory.poolBytes<=16*1024*1024);
    if(full||legacy){assert.ok(result.evictions>300,'source fixture reproduces historical cache pressure');assert.ok(result.filterBuilds>=60);}
    else{assert.equal(result.newBytes,0);assert.equal(result.evictions,0);assert.equal(result.filterBuilds,0,'filtered steam survives the repeating morph cycle');}
    assert.equal(art.tileFamilies.size,[...art.morphFamilies.values()].reduce((n,set)=>n+set.size,0),'global eviction keeps family membership consistent');art.clearCache();
  }
  t.diagnostic(JSON.stringify(results));
}));

test('viewport cache keeps current tiles, drops obsolete resolutions and caps memory growth',()=>canvasHarness(({canvas})=>{
  const art=new VectorArt(pack),ctx=canvas(2200,1600).getContext('2d');
  art.setViewport(2200,1600);
  assert.ok(art.memorySummary().tileBudgetBytes>160*1024*1024);
  art.draw(ctx,222,{a:1,b:0,c:0,d:1,tx:300,ty:300});
  const bytes=art.stats.cachedBytes;assert.ok(bytes>0);
  art.setViewport(2200,1600);assert.equal(art.stats.cachedBytes,bytes);
  art.setViewport(550,400);assert.equal(art.memorySummary().accountedBackingBytes,0);
  assert.equal(art.memorySummary().tileBudgetBytes,80*1024*1024);
  art.setViewport(20000,20000);assert.equal(art.memorySummary().tileBudgetBytes,384*1024*1024);
  assert.equal(art.memorySummary().accountedBackingBytes,0,'the limit is not preallocated');
}));
