import type { Bounds, Matrix } from './assets.js';
import { BoxFilter } from './box-filter.js';

export type Affine = [number, number, number, number, number, number];
type Tint = [number, number, number, number, number, number, number, number];
type Animations = Record<string, [string, string]>;
interface Draw {
  path: number; endPath?: number; matrix: Affine; fill: string; stroke: string;
  width: number; rule: CanvasFillRule; cap: CanvasLineCap; join: CanvasLineJoin;
  fillOpacity: number; strokeOpacity: number; animations?: Animations;
  hairline?: boolean;
}
interface Gradient {
  type: string; matrix: Affine; spread: string; x1?: number; x2?: number; y1?: number; y2?: number;
  cx?: number; cy?: number; r?: number; fx?: number; fy?: number;
  stops: { offset: number; color: string; opacity: number; animations: Animations }[];
  transforms: { type: string; from: number[]; to: number[]; replace: boolean }[];
}
export interface Filter { type: string; blurX?: string; blurY?: string; passes?: string; angle?: string; distance?: string; strength?: string; innerShadow?: string; knockout?: string; compositeSource?: string; children?: Record<string, string>[] }
export interface PlacementEffects { colorTransform?: Record<string, unknown>; filters?: Filter[]; interpolate?: boolean; persistentFrame?: number }
export interface VectorPlacement {
  id: number; depth: number; matrix: Affine; born: number; ratio?: number;
  clipDepth?: number; visible?: boolean; colorTransform?: Record<string, unknown>; filters?: Filter[];
}
interface Symbol { kind: 'shape' | 'sprite' | 'button'; bounds: Bounds | null; draws?: Draw[]; frames?: VectorPlacement[][] }
interface Pack { version: number; sourceSha256: string; paths: string[]; gradients: Record<string, Gradient>; symbols: Record<string, Symbol> }
const ID: Affine = [1, 0, 0, 1, 0, 0];
const NO_TINT: Tint = [1, 1, 1, 1, 0, 0, 0, 0];
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const clamp = (n: number, max = 1): number => Math.max(0, Math.min(max, n));
const TILE_BUDGET = 80 * 1024 * 1024, POOL_BUDGET = 16 * 1024 * 1024;
const MAX_TILE_BUDGET = 384 * 1024 * 1024;
const REFERENCE_PIXELS = 1485 * 1080;
interface Tile { canvas: HTMLCanvasElement; scaleX: number; scaleY: number; x: number; y: number; bytes: number }

export function transformedBounds(b: Bounds, m: Affine): Bounds {
  const points=[b.x,b.x+b.width].flatMap(x=>[b.y,b.y+b.height].map(y=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]));
  const x=Math.min(...points.map(p=>p[0]!)),y=Math.min(...points.map(p=>p[1]!));
  return {x,y,width:Math.max(...points.map(p=>p[0]!))-x,height:Math.max(...points.map(p=>p[1]!))-y};
}
function union(a: Bounds | null, b: Bounds): Bounds {
  if(!a)return b;
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};
}
function intersection(a: Bounds,b: Bounds): Bounds {
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  return {x,y,width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-x),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-y)};
}
/** Fractional box width, not a Gaussian standard deviation. */
export function blurKernel(width: number): { radius: number; edge: number; divisor: number } {
  const divisor=Math.min(255,Math.max(1,width)), radius=(divisor-1)/2;
  const inner=Math.max(0,Math.ceil(radius)-1);
  return {radius:inner,edge:divisor<=1?0:Math.floor((radius-inner)*255)/255,divisor};
}
/** One separable pass over premultiplied RGBA; empty pixels outside the surface stay transparent. */
export function boxBlurAxis(source: Uint8ClampedArray, target: Uint8ClampedArray, width: number, height: number, size: number, horizontal: boolean): void {
  if(size<=1){target.set(source);return;}
  const {radius,edge,divisor}=blurKernel(size),length=horizontal?width:height,lines=horizontal?height:width;
  const step=horizontal?4:width*4, lineStep=horizontal?width*4:4;
  for(let line=0;line<lines;line++)for(let channel=0;channel<4;channel++){
    const base=line*lineStep+channel;
    let sum=0;
    for(let p=0;p<=radius && p<length;p++)sum+=source[base+p*step]!;
    for(let p=0;p<length;p++){
      const left=p-radius-1,right=p+radius+1;
      target[base+p*step]=Math.floor((sum+edge*((left>=0?source[base+left*step]!:0)+(right<length?source[base+right*step]!:0)))/divisor);
      if(p-radius>=0)sum-=source[base+(p-radius)*step]!;
      if(right<length)sum+=source[base+right*step]!;
    }
  }
}

export function filterBounds(b: Bounds, filters: readonly Filter[], scale=1, scaleY=scale): Bounds {
  let result={...b};
  for(const f of filters){
    const passes=Math.max(0,Number(f.passes??1));
    const pad=(value:string|undefined,density:number):number=>Math.ceil(Math.max(0,Math.min(255,Number(value??0)*density)-1)/2)*passes/density;
    const x=pad(f.blurX,scale),y=pad(f.blurY,scaleY);
    if(f.type==='BLURFILTER')result={x:result.x-x,y:result.y-y,width:result.width+2*x,height:result.height+2*y};
    else if(f.type==='DROPSHADOWFILTER'){
      const angle=Number(f.angle??0),distance=Number(f.distance??0);
      result=union(result,{x:result.x-x+Math.cos(angle)*distance,y:result.y-y+Math.sin(angle)*distance,width:result.width+2*x,height:result.height+2*y});
    } else throw new Error(`Unsupported source filter ${f.type}`);
  }
  return result;
}

const continuous = new WeakMap<Symbol, Set<number>>();
function continuousDepths(s: Symbol): Set<number> {
  let depths=continuous.get(s);
  if (!depths) {
    depths=new Set((s.frames?.[0]??[]).filter(p=>p.born===1 && s.frames!.every(frame=>frame.some(q=>q.depth===p.depth && q.id===p.id && q.born===1))).map(p=>p.depth));
    continuous.set(s,depths);
  }
  return depths;
}
export function childTimelineClock(s: Symbol, clock: number, index: number, p: VectorPlacement, interpolate=false, persistentClock=clock): number {
  return s.kind==='button' ? 0 : continuousDepths(s).has(p.depth) ? persistentClock : Math.max(0,index+1-p.born+(interpolate?clock-Math.floor(clock):0));
}
/** Optional presentation sampling only: replacements, visibility, color changes, filters
 * and loop boundaries remain discrete. Original frame records are never mutated. */
export function presentationFrame(s: Symbol, clock: number, enabled=false): { placements: VectorPlacement[]; index: number } {
  const frames=s.frames!,whole=Math.max(0,Math.floor(clock)),index=whole%frames.length,current=frames[index]!;
  const fraction=clock-whole;
  if(!enabled || s.kind==='button' || fraction<=0 || index===frames.length-1)return {placements:current,index};
  const following=frames[index+1]!;
  const placements=current.map(p=>{
    const q=following.find(candidate=>candidate.depth===p.depth);
    if(!q || p.id!==q.id || p.born!==q.born || p.visible!==q.visible || p.clipDepth!==q.clipDepth || p.filters?.length || q.filters?.length || JSON.stringify(p.colorTransform)!==JSON.stringify(q.colorTransform))return p;
    const matrix=p.matrix.map((v,i)=>v+(q.matrix[i]!-v)*fraction) as Affine;
    const result={...p,matrix};
    if(p.ratio!==undefined || q.ratio!==undefined)result.ratio=(p.ratio??0)+((q.ratio??0)-(p.ratio??0))*fraction;
    return result;
  });
  return {placements,index};
}
export function animationPeriod(symbols: Record<string, Symbol>, id: number, cache=new Map<number,number>(), ancestors=new Set<number>()): number {
  const cached=cache.get(id);if(cached!==undefined)return cached;
  if(ancestors.has(id))throw new Error('Cyclic vector display list');
  const s=symbols[id]!;let period=s.frames?.length??1;
  const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
  if(s.frames && s.kind!=='button')for(const p of s.frames[0]!){
    if(!continuousDepths(s).has(p.depth))continue;
    const child=animationPeriod(symbols,p.id,cache,new Set(ancestors).add(id));
    if(!Number.isFinite(child)){period=Infinity;break;}
    period=period*child/gcd(period,child);
    if(period>1000000){period=Infinity;break;}
  }
  cache.set(id,period);return period;
}

export function multiply(p: Affine, q: Affine): Affine {
  return [p[0]*q[0]+p[2]*q[1],p[1]*q[0]+p[3]*q[1],p[0]*q[2]+p[2]*q[3],p[1]*q[2]+p[3]*q[3],p[0]*q[4]+p[2]*q[5]+p[4],p[1]*q[4]+p[3]*q[5]+p[5]];
}
export function combineTint(parent: Tint, source?: Record<string, unknown>): Tint {
  if (!source) return parent;
  const channels = ['red','green','blue','alpha'];
  const result = [...parent] as Tint;
  for (let i=0;i<4;i++) {
    result[i] = parent[i]! * (source.hasMultTerms ? Number(source[`${channels[i]}MultTerm`] ?? 256)/256 : 1);
    result[i+4] = parent[i]! * (source.hasAddTerms ? Number(source[`${channels[i]}AddTerm`] ?? 0) : 0) + parent[i+4]!;
  }
  return result;
}
export function interpolatePath(a: string, b: string, ratio: number): string {
  const end = b.match(NUMBER)!.map(Number); let i=0;
  return a.replace(NUMBER, value => String(Number(value) + (end[i++]!-Number(value))*clamp(ratio)));
}
function interpolate(a: string, b: string, ratio: number): string {
  if (a === b) return a;
  if (a.startsWith('#') && b.startsWith('#')) {
    const rgb = [1,3,5].map(i => Math.round(parseInt(a.slice(i,i+2),16)*(1-ratio)+parseInt(b.slice(i,i+2),16)*ratio));
    return '#' + rgb.map(n => n.toString(16).padStart(2,'0')).join('');
  }
  return String(Number(a)*(1-ratio)+Number(b)*ratio);
}
function animated(animations: Animations | undefined, key: string, original: string, ratio: number): string {
  const values = animations?.[key]; return values ? interpolate(values[0],values[1],ratio) : original;
}
function color(value: string, opacity: number, tint: Tint): string {
  const rgb = value.startsWith('#') ? [1,3,5].map(i => parseInt(value.slice(i,i+2),16)) : [0,0,0];
  return `rgba(${rgb.map((n,i) => clamp(n*tint[i]!+tint[i+4]!,255)).join(',')},${clamp(opacity*tint[3]+tint[7]/255)})`;
}
export function gradientMatrix(g: Pick<Gradient, 'matrix' | 'transforms'>, ratio: number): Affine {
  let m = g.matrix;
  for (const t of g.transforms) {
    const v=t.from.map((a,i) => a+(t.to[i]!-a)*ratio);
    if (t.replace) m=ID;
    let next: Affine=ID;
    if (t.type==='translate') next=[1,0,0,1,v[0]!,v[1]??0];
    else if (t.type==='scale') next=[v[0]!,0,0,v[1]??v[0]!,0,0];
    else if (t.type==='rotate') { const a=v[0]!*Math.PI/180; next=[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]; }
    else if (t.type==='skewX') next=[1,0,Math.tan(v[0]!*Math.PI/180),1,0,0];
    else throw new Error(`Unsupported gradient transform ${t.type}`);
    m=multiply(m,next);
  }
  return m;
}

/** Game-specific vector display data, rendered with reusable native Canvas paths.
 * Pixel caches are generated at the current display scale, never from 1× PNGs.
 */
export class VectorArt {
  private paths = new Map<string, Path2D>();
  private tiles = new Map<string, Tile>();
  private morphFamilies = new Map<string,Set<string>>();
  private tileFamilies = new Map<string,string>();
  private morphKinds = new Map<number,boolean>();
  private surfaces: HTMLCanvasElement[] = [];
  private poolBytes = 0;
  private boundsCache = new Map<string, Bounds | null>();
  private blurScratch = new Uint8ClampedArray(0);
  private gpuFilter: BoxFilter;
  private cpuFilterApplications=0;
  private lastFilterBackend:'not-used'|'gpu'|'cpu'='not-used';
  private periods = new Map<number, number>();
  private tileBytes = 0;
  private tileBudget = TILE_BUDGET;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private hitCanvas = document.createElement('canvas');
  profiling = false;
  profilingOmitFilters = false;
  profilingCpuFilters = false;
  profilingOmitAlphaFactoring = false;
  /** Diagnostic baseline: retain every morph pose until the global LRU limit. Clear caches after changes. */
  diagnosticFullMorphCache=false;
  /** Diagnostic only. Clear caches after changing parent:child omission keys. */
  readonly diagnosticOmitChildren=new Set<string>();
  get filterStats():Readonly<BoxFilter['stats']>{return this.gpuFilter.stats;}
  /** Explicit diagnostic snapshot; identifiers describe the filter context, not the Canvas stage. */
  gpuSummary():{stage:'canvas2d';filter:ReturnType<BoxFilter['gpuSummary']>;forcedCpu:boolean;cpuApplications:number;lastFilterBackend:'not-used'|'gpu'|'cpu'} {
    return {stage:'canvas2d',filter:this.gpuFilter.gpuSummary(),forcedCpu:this.profilingCpuFilters,cpuApplications:this.cpuFilterApplications,lastFilterBackend:this.lastFilterBackend};
  }
  /** RGBA backing accounting, not measured GPU residency or process heap usage. */
  memorySummary():{
    tileBytes:number;tileCount:number;tileBudgetBytes:number;poolBytes:number;poolCount:number;poolBudgetBytes:number;
    cpuBlurScratchBytes:number;filterBackingBytes:number;accountedBackingBytes:number;
    pathCount:number;boundsCount:number;bySymbol:{id:number;count:number;bytes:number}[];
  } {
    const symbols=new Map<number,{id:number;count:number;bytes:number}>();
    for(const [key,tile]of this.tiles){const id=Number(key.split(':',1)[0]),entry=symbols.get(id)??{id,count:0,bytes:0};entry.count++;entry.bytes+=tile.bytes;symbols.set(id,entry);}
    const cpuBlurScratchBytes=this.blurScratch.byteLength,filterBackingBytes=this.gpuFilter.stats.backingBytes;
    return {tileBytes:this.tileBytes,tileCount:this.tiles.size,tileBudgetBytes:this.tileBudget,poolBytes:this.poolBytes,poolCount:this.surfaces.length,poolBudgetBytes:POOL_BUDGET,cpuBlurScratchBytes,filterBackingBytes,accountedBackingBytes:this.tileBytes+this.poolBytes+cpuBlurScratchBytes+filterBackingBytes,pathCount:this.paths.size,boundsCount:this.boundsCache.size,bySymbol:[...symbols.values()].sort((a,b)=>b.bytes-a.bytes)};
  }
  readonly groupCosts = new Map<number, { builds:number; milliseconds:number; bytes:number; filtered:number }>();
  readonly stats = { vectorDraws: 0, cacheHits: 0, cachedBytes: 0, allocatedBytes: 0, evictions: 0, byteEvictions: 0, entryEvictions: 0, morphReplacements: 0, pathBuilds: 0, gradients: 0, filterPlacements: 0, pooledBytes: 0, reusedSurfaces: 0, culled: 0 };
  constructor(private readonly pack: Pack,filterPowerPreference:WebGLPowerPreference='default') {
    this.gpuFilter=new BoxFilter(filterPowerPreference);
    if (pack.version!==1) throw new Error('Unsupported vector data version');
    this.hitCanvas.width=this.hitCanvas.height=1;

  }
  has(id: number): boolean { return Boolean(this.pack.symbols[id]); }
  /** Retain the same repeating poses at the actual display density. A fixed byte
   * budget repeatedly evicted the expensive griddle blur on large canvases.
   * This is a lazy upper limit, not an allocation; sampling stays unchanged. */
  setViewport(width:number,height:number):void {
    if(width===this.viewportWidth && height===this.viewportHeight)return;
    this.clearCache();
    this.viewportWidth=width;this.viewportHeight=height;
    const pixels=Number.isFinite(width*height)&&width>0&&height>0?width*height:REFERENCE_PIXELS;
    this.tileBudget=Math.min(MAX_TILE_BUDGET,Math.max(TILE_BUDGET,Math.ceil(TILE_BUDGET*pixels/REFERENCE_PIXELS)));
  }
  bounds(id: number): Bounds | null { return this.pack.symbols[id]?.bounds ?? null; }
  placements(id: number, frame=1, interpolate=false): readonly VectorPlacement[] {
    const symbol=this.pack.symbols[id];
    return symbol?.frames ? this.frame(symbol,Math.max(0,frame-1),interpolate).placements : [];
  }
  private path(draw: Draw, ratio: number): Path2D {
    const key = `${draw.path}:${draw.endPath ?? ''}:${draw.endPath===undefined ? 0 : Math.round(ratio*65535)}`;
    let path=this.paths.get(key);
    if (!path) {
      if(this.profiling)this.stats.pathBuilds++;
      path=new Path2D(draw.endPath===undefined ? this.pack.paths[draw.path] : interpolatePath(this.pack.paths[draw.path]!,this.pack.paths[draw.endPath]!,ratio));
      this.paths.set(key,path);
      if (this.paths.size>6000) this.paths.delete(this.paths.keys().next().value!);
    }
    return path;
  }
  private period(id: number): number { return animationPeriod(this.pack.symbols,id,this.periods); }
  private acquire(width: number,height: number): HTMLCanvasElement {
    const index=this.surfaces.findIndex(c=>c.width===width && c.height===height);
    let canvas:HTMLCanvasElement;
    if(index>=0){canvas=this.surfaces.splice(index,1)[0]!;this.poolBytes-=width*height*4;this.stats.reusedSurfaces++;}
    else{canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;if(this.profiling)this.stats.allocatedBytes+=width*height*4;}
    const ctx=canvas.getContext('2d')!;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowColor='rgba(0,0,0,0)';ctx.clearRect(0,0,width,height);
    this.stats.pooledBytes=this.poolBytes;return canvas;
  }
  private release(canvas:HTMLCanvasElement):void {
    const bytes=canvas.width*canvas.height*4;
    if(bytes<=POOL_BUDGET){this.surfaces.push(canvas);this.poolBytes+=bytes;}
    else canvas.width=canvas.height=0;
    while(this.poolBytes>POOL_BUDGET || this.surfaces.length>32){const old=this.surfaces.shift()!;this.poolBytes-=old.width*old.height*4;old.width=old.height=0;}
    this.stats.pooledBytes=this.poolBytes;
  }
  /** Recycling a recent morph pose retains the exact raster geometry and sampling.
   * Rare historical poses must not displace costly reusable filtered/background tiles. */
  private removeTile(key:string,reason:'bytes'|'entries'|'morph'):void {
    const tile=this.tiles.get(key);if(!tile)return;
    this.tiles.delete(key);this.tileBytes-=tile.bytes;
    const family=this.tileFamilies.get(key);
    if(family){const keys=this.morphFamilies.get(family)!;keys.delete(key);if(!keys.size)this.morphFamilies.delete(family);this.tileFamilies.delete(key);}
    this.release(tile.canvas);
    if(this.profiling){if(reason==='morph')this.stats.morphReplacements++;else{this.stats.evictions++;if(reason==='bytes')this.stats.byteEvictions++;else this.stats.entryEvictions++;}}
  }
  private isMorph(id:number,s:Symbol):boolean {
    let morph=this.morphKinds.get(id);if(morph===undefined){morph=Boolean(s.draws?.some(d=>d.endPath!==undefined));this.morphKinds.set(id,morph);}return morph;
  }
  private omitChild(parent:number,placement:VectorPlacement):boolean {
    return this.diagnosticOmitChildren.size>0 && !(placement.clipDepth && placement.clipDepth>placement.depth) && this.diagnosticOmitChildren.has(`${parent}:${placement.id}`);
  }
  /** Current children determine a moving clip's crop; its complete travel path does not. */
  private currentBounds(id:number,clock:number,depth=0,interpolate=false,persistentClock?:number,forMask=false):Bounds|null {
    if(depth>40)throw new Error('Vector bounds nesting exceeded');
    const period=this.period(id),normalized=period===1?0:(interpolate?clock:Math.floor(clock))%period,key=`${id}:${normalized}:${interpolate}:${persistentClock??''}:${forMask}`;
    if(this.boundsCache.has(key))return this.boundsCache.get(key)!;
    const s=this.pack.symbols[id]!;let bounds=s.draws?s.bounds:null;
    if(s.frames){
      const {placements,index}=this.frame(s,normalized,interpolate),masks:{end:number;bounds:Bounds}[]=[];
      for(const p of placements){
        if(p.visible===false || !forMask && this.omitChild(id,p))continue;
        const isMask=Boolean(p.clipDepth && p.clipDepth>p.depth);
        let b=this.currentBounds(p.id,this.childClock(s,normalized,index,p,interpolate,persistentClock),depth+1,interpolate && !p.filters?.length,undefined,forMask||isMask);
        if(!b)continue;
        b=filterBounds(transformedBounds(b,p.matrix),p.filters??[]);
        if(p.clipDepth && p.clipDepth>p.depth){masks.push({end:p.clipDepth,bounds:b});continue;}
        for(const mask of masks)if(p.depth<=mask.end)b=intersection(b,mask.bounds);
        if(b.width && b.height)bounds=union(bounds,b);
      }
    }
    this.boundsCache.set(key,bounds);
    if(this.boundsCache.size>4096)this.boundsCache.delete(this.boundsCache.keys().next().value!);
    return bounds;
  }
  private blur(canvas:HTMLCanvasElement,filter:Filter,scaleX:number,scaleY:number):void {
    const passes=Math.max(0,Number(filter.passes??1)),x=Number(filter.blurX??0)*scaleX,y=Number(filter.blurY??0)*scaleY;
    if(!passes || x<=1 && y<=1)return;
    if(!this.profilingCpuFilters && this.gpuFilter.apply(canvas,x,y,passes)){this.lastFilterBackend='gpu';return;}
    this.cpuFilterApplications++;this.lastFilterBackend='cpu';
    const ctx=canvas.getContext('2d')!,pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
    if(this.blurScratch.length<data.length)this.blurScratch=new Uint8ClampedArray(data.length);
    const scratch=this.blurScratch.subarray(0,data.length);
    for(let i=0;i<data.length;i+=4){const alpha=data[i+3]!/255;data[i]=Math.floor(data[i]!*alpha);data[i+1]=Math.floor(data[i+1]!*alpha);data[i+2]=Math.floor(data[i+2]!*alpha);}
    for(let pass=0;pass<passes;pass++){
      boxBlurAxis(data,scratch,canvas.width,canvas.height,x,true);
      boxBlurAxis(scratch,data,canvas.width,canvas.height,y,false);
    }
    for(let i=0;i<data.length;i+=4){const alpha=data[i+3]!;if(alpha){data[i]=data[i]!*255/alpha;data[i+1]=data[i+1]!*255/alpha;data[i+2]=data[i+2]!*255/alpha;}}
    ctx.putImageData(pixels,0,0);
  }
  private filters(canvas:HTMLCanvasElement,filters:readonly Filter[],scaleX:number,scaleY:number):void {
    for(const filter of filters){
      if(this.profiling)this.stats.filterPlacements++;
      if(filter.type==='BLURFILTER')this.blur(canvas,filter,scaleX,scaleY);
      else if(filter.type==='DROPSHADOWFILTER'){
        if(filter.innerShadow==='true' || filter.knockout==='true' || filter.compositeSource==='false')throw new Error('Unimplemented shadow mode outside the preserved game');
        const shadow=this.acquire(canvas.width,canvas.height),ctx=shadow.getContext('2d')!,rgba=filter.children?.[0]??{};
        const angle=Number(filter.angle??0),distance=Number(filter.distance??0);
        ctx.drawImage(canvas,Math.cos(angle)*distance*scaleX,Math.sin(angle)*distance*scaleY);
        ctx.globalCompositeOperation='source-in';ctx.fillStyle=`rgba(${rgba.red??0},${rgba.green??0},${rgba.blue??0},${clamp(Number(rgba.alpha??255)/255*Number(filter.strength??1))})`;ctx.fillRect(0,0,shadow.width,shadow.height);ctx.globalCompositeOperation='source-over';
        this.blur(shadow,filter,scaleX,scaleY);ctx.drawImage(canvas,0,0);
        const target=canvas.getContext('2d')!;target.setTransform(1,0,0,1,0,0);target.clearRect(0,0,canvas.width,canvas.height);target.drawImage(shadow,0,0);this.release(shadow);
      }else throw new Error(`Unsupported source filter ${filter.type}`);
    }
  }
  private paint(ctx: CanvasRenderingContext2D, fill: string, opacity: number, tint: Tint, ratio: number, bounds: Bounds): string | CanvasGradient {
    if (!fill.startsWith('@')) return color(fill,opacity,tint);
    if(this.profiling)this.stats.gradients++;
    const g=this.pack.gradients[fill.slice(1)]!;
    const m=gradientMatrix(g,ratio);
    let gradient: CanvasGradient;
    let low=0, high=1;
    if (g.type==='linearGradient') {
      const x1=g.x1??0,y1=g.y1??0,x2=g.x2??1,y2=g.y2??0;
      if (g.spread==='reflect') {
        const inv=new DOMMatrix(m).inverse(), dx=x2-x1, dy=y2-y1;
        const values=[bounds.x,bounds.x+bounds.width].flatMap(x => [bounds.y,bounds.y+bounds.height].map(y => {const p=new DOMPoint(x,y).matrixTransform(inv); return ((p.x-x1)*dx+(p.y-y1)*dy)/(dx*dx+dy*dy);}));
        low=Math.floor(Math.min(0,...values))-1; high=Math.ceil(Math.max(1,...values))+1;
      }
      gradient=ctx.createLinearGradient(x1+(x2-x1)*low,y1+(y2-y1)*low,x1+(x2-x1)*high,y1+(y2-y1)*high);
    } else {
      const cx=g.cx??0,cy=g.cy??0,fx=g.fx??cx,fy=g.fy??cy,r=g.r??1;
      if(g.spread==='reflect'){
        const inv=new DOMMatrix(m).inverse();
        const distances=[bounds.x,bounds.x+bounds.width].flatMap(x=>[bounds.y,bounds.y+bounds.height].map(y=>{const p=new DOMPoint(x,y).matrixTransform(inv);return Math.hypot(p.x-fx,p.y-fy);}));
        high=Math.ceil(Math.max(...distances)/Math.max(.00001,r-Math.hypot(cx-fx,cy-fy)))+1;
      }
      gradient=ctx.createRadialGradient(fx,fy,0,fx+(cx-fx)*high,fy+(cy-fy)*high,r*high);
    }
    const stops=g.stops.map(s => ({offset:Number(animated(s.animations,'offset',String(s.offset),ratio)),color:color(animated(s.animations,'stop-color',s.color,ratio),Number(animated(s.animations,'stop-opacity',String(s.opacity),ratio))*opacity,tint)}));
    for (let cycle=low;cycle<high;cycle++) {
      const reverse=Math.abs(cycle%2)===1 && g.spread==='reflect';
      for (const stop of reverse ? [...stops].reverse() : stops) gradient.addColorStop(clamp((cycle+(reverse?1-stop.offset:stop.offset)-low)/(high-low)),stop.color);
    }
    return gradient;
  }
  private gradientRect(ctx:CanvasRenderingContext2D,fill:string,opacity:number,tint:Tint,ratio:number,bounds:Bounds):void {
    const matrix=gradientMatrix(this.pack.gradients[fill.slice(1)]!,ratio),inverse=new DOMMatrix(matrix).inverse();
    const area=transformedBounds(bounds,[inverse.a,inverse.b,inverse.c,inverse.d,inverse.e,inverse.f]);
    ctx.save();ctx.transform(...matrix);
    // Canvas applies the matrix when painting a gradient, not when creating it.
    ctx.fillStyle=this.paint(ctx,fill,opacity,tint,ratio,bounds);
    ctx.fillRect(area.x-1,area.y-1,area.width+2,area.height+2);ctx.restore();
  }
  private gradientStroke(ctx:CanvasRenderingContext2D,path:Path2D,fill:string,opacity:number,tint:Tint,ratio:number,bounds:Bounds):void {
    const m=ctx.getTransform(),sx=Math.max(.25,Math.ceil(Math.hypot(m.a,m.b)*4)/4),sy=Math.max(.25,Math.ceil(Math.hypot(m.c,m.d)*4)/4);
    const x=Math.floor(bounds.x*sx)-2,y=Math.floor(bounds.y*sy)-2;
    const canvas=this.acquire(Math.ceil((bounds.x+bounds.width)*sx)-x+2,Math.ceil((bounds.y+bounds.height)*sy)-y+2),target=canvas.getContext('2d')!;
    target.setTransform(sx,0,0,sy,-x,-y);target.strokeStyle='#ffffff';target.lineWidth=ctx.lineWidth;target.lineCap=ctx.lineCap;target.lineJoin=ctx.lineJoin;target.stroke(path);
    target.globalCompositeOperation='source-in';this.gradientRect(target,fill,opacity,tint,ratio,bounds);
    ctx.drawImage(canvas,x/sx,y/sy,canvas.width/sx,canvas.height/sy);this.release(canvas);
  }
  private frame(s: Symbol, clock: number, interpolate=false): { placements: VectorPlacement[]; index: number } {
    return presentationFrame(s,clock,interpolate);
  }
  private childClock(s: Symbol, clock: number, index: number, p: VectorPlacement, interpolate=false,persistentClock?:number): number {
    return childTimelineClock(s,clock,index,p,interpolate,persistentClock);
  }
  private mask(id: number, clock: number, ratio: number, matrix: Affine, depth=0,interpolate=false): Path2D {
    if (depth>40) throw new Error('Vector mask nesting exceeded');
    const result=new Path2D(), s=this.pack.symbols[id]!;
    if (s.draws) for (const d of s.draws) {
      if (d.fill==='none') continue;
      result.addPath(this.path(d,ratio),new DOMMatrix(multiply(matrix,d.matrix)));
    } else {
      const {placements,index}=this.frame(s,clock,interpolate);
      for (const p of placements) if (p.visible!==false) result.addPath(this.mask(p.id,this.childClock(s,clock,index,p,interpolate),(p.ratio??0)/65535,multiply(matrix,p.matrix),depth+1,interpolate && !p.filters?.length));
    }
    return result;
  }
  private render(ctx: CanvasRenderingContext2D, id: number, clock: number, tint: Tint, ratio: number, depth=0, useCache=true,interpolate=false,persistentClock?:number): void {
    if (depth>40) throw new Error('Vector display nesting exceeded');
    const s=this.pack.symbols[id]!;
    if (s.draws) {
      for (const d of s.draws) {
        const path=this.path(d,ratio); ctx.save(); ctx.transform(...d.matrix);
        const fill=animated(d.animations,'fill',d.fill,ratio), stroke=animated(d.animations,'stroke',d.stroke,ratio);
        if (fill!=='none') {
          const opacity=Number(animated(d.animations,'fill-opacity',String(d.fillOpacity),ratio));
          if(fill.startsWith('@')){ctx.save();ctx.clip(path,d.rule);this.gradientRect(ctx,fill,opacity,tint,ratio,s.bounds!);ctx.restore();}
          else{ctx.fillStyle=this.paint(ctx,fill,opacity,tint,ratio,s.bounds!);ctx.fill(path,d.rule);}
        }
        const width=Number(animated(d.animations,'stroke-width',String(d.width),ratio));
        if (stroke!=='none' && width>0) {
          const matrix=ctx.getTransform();
          ctx.lineWidth=d.hairline ? Math.max(width,1/Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d))) : width;
          ctx.lineCap=d.cap; ctx.lineJoin=d.join;
          const opacity=Number(animated(d.animations,'stroke-opacity',String(d.strokeOpacity),ratio));
          if(stroke.startsWith('@'))this.gradientStroke(ctx,path,stroke,opacity,tint,ratio,s.bounds!);
          else{ctx.strokeStyle=this.paint(ctx,stroke,opacity,tint,ratio,s.bounds!);ctx.stroke(path);}
        }
        ctx.restore();
      }
      return;
    }
    const {placements,index}=this.frame(s,clock,interpolate);
    const masks:{end:number;path:Path2D}[]=[];
    for (const p of placements) {
      if (p.visible===false || this.omitChild(id,p)) continue;
      const childClock=this.childClock(s,clock,index,p,interpolate,persistentClock), childRatio=(p.ratio??0)/65535;
      if (p.clipDepth && p.clipDepth>p.depth) { masks.push({end:p.clipDepth,path:this.mask(p.id,childClock,childRatio,p.matrix,0,interpolate)}); continue; }
      ctx.save();
      for (const m of masks) if (p.depth<=m.end) ctx.clip(m.path,'evenodd');
      ctx.transform(...p.matrix);
      this.node(ctx,p.id,childClock,combineTint(tint,p.colorTransform),childRatio,p.filters??[],depth+1,useCache,p.matrix,interpolate);
      ctx.restore();
    }
  }
  private node(ctx:CanvasRenderingContext2D,id:number,clock:number,tint:Tint,ratio:number,sourceFilters:readonly Filter[],depth:number,useCache:boolean,placement:Affine=ID,interpolate=false,persistentClock?:number):void {
    if(depth>40)throw new Error('Vector display nesting exceeded');
    const s=this.pack.symbols[id]!,period=this.period(id);
    const operation=s.draws?.length===1?s.draws[0]:undefined;
    if(!this.profilingOmitAlphaFactoring && operation && !sourceFilters.length && tint[7]===0 && !operation.animations?.fill && !operation.animations?.stroke &&
      ((operation.fill!=='none')!==(operation.stroke!=='none' && operation.width>0))){
      // One paint operation has no inter-path overlap. Its multiplicative alpha can
      // be applied after rasterization exactly, sharing the same tile across fades.
      ctx.globalAlpha*=tint[3];tint=[...tint] as Tint;tint[3]=1;
      if(ctx.globalAlpha===0)return;
    }
    // Filter output stays at source cadence; fractional decorative clocks never create60 filtered tiles/second.
    interpolate=interpolate && !sourceFilters.length && s.kind!=='button';
    clock=period===1?0:(interpolate?clock:Math.floor(clock))%period;
    const filters=this.profiling && this.profilingOmitFilters?[]:sourceFilters;
    // Effects operate on the transformed clip in its parent's coordinates. Keep translation out of its tile.
    const contentMatrix:Affine=filters.length?[placement[0],placement[1],placement[2],placement[3],0,0]:ID;
    const det=contentMatrix[0]*contentMatrix[3]-contentMatrix[1]*contentMatrix[2];
    if(!det)return;
    if(filters.length)ctx.transform(contentMatrix[3]/det,-contentMatrix[1]/det,-contentMatrix[2]/det,contentMatrix[0]/det,0,0);
    const m=ctx.getTransform();
    const scaleX=Math.max(.25,Math.ceil(Math.hypot(m.a,m.b)*4)/4),scaleY=Math.max(.25,Math.ceil(Math.hypot(m.c,m.d)*4)/4);
    const rawBounds=this.currentBounds(id,clock,0,interpolate,persistentClock);if(!rawBounds?.width || !rawBounds.height)return;
    let b=filterBounds(transformedBounds(rawBounds,contentMatrix),filters,scaleX,scaleY);
    const visible=transformedBounds(b,[m.a,m.b,m.c,m.d,m.e,m.f]);
    if(visible.x+visible.width < -2 || visible.y+visible.height < -2 || visible.x>ctx.canvas.width+2 || visible.y>ctx.canvas.height+2){this.stats.culled++;return;}
    // Large stationary geometry can extend far beyond the stage. Include the crop in
    // its key so moving/repositioned art never reuses a tile missing newly visible pixels.
    if(s.draws && !filters.length && b.width*scaleX*b.height*scaleY*4>1024*1024){
      const determinant=m.a*m.d-m.b*m.c;
      if(determinant){
        const inverse:Affine=[m.d/determinant,-m.b/determinant,-m.c/determinant,m.a/determinant,(m.c*m.f-m.d*m.e)/determinant,(m.b*m.e-m.a*m.f)/determinant];
        b=intersection(b,transformedBounds({x:-2,y:-2,width:ctx.canvas.width+4,height:ctx.canvas.height+4},inverse));
      }
    }
    // Animated parents retain their stationary children rather than allocating their travel bounds each frame.
    const retain=useCache && (Boolean(s.draws) || period===1 || filters.length>0);
    const x=Math.floor(b.x*scaleX)-2,y=Math.floor(b.y*scaleY)-2;
    const width=Math.ceil((b.x+b.width)*scaleX)-x+2,height=Math.ceil((b.y+b.height)*scaleY)-y+2;
    if((!retain && !filters.length) || !filters.length && width*height*4>32*1024*1024){
      this.render(ctx,id,clock,tint,ratio,depth,useCache,interpolate,persistentClock);this.stats.vectorDraws++;return;
    }
    const key=`${id}:${clock}:${persistentClock??''}:${scaleX}:${scaleY}:${Math.round(ratio*65535)}:${tint.join(',')}:${contentMatrix.join(',')}:${x},${y},${width},${height}:${JSON.stringify(filters)}`;
    const family=retain && width*height*4>=16*1024 && !filters.length && !this.diagnosticFullMorphCache && this.isMorph(id,s)
      ? `${id}:${clock}:${persistentClock??''}:${scaleX}:${scaleY}:${tint.join(',')}:${contentMatrix.join(',')}:${x},${y},${width},${height}` : null;
    let tile=retain?this.tiles.get(key):undefined;
    if (!tile) {
      // Release before acquiring: equal-size morph poses can immediately reuse the backing canvas.
      if(family){const keys=this.morphFamilies.get(family);while(keys && keys.size>=2)this.removeTile(keys.values().next().value!,'morph');}
      const began=this.profiling?performance.now():0;
      const canvas=this.acquire(width,height);
      const target=canvas.getContext('2d')!;target.setTransform(scaleX,0,0,scaleY,-x,-y);target.transform(...contentMatrix);
      // Retaining a complete group and its leaf tiles doubles its working set. Inner filters
      // still isolate, but their scratch surfaces return to the pool after this group is built.
      this.render(target,id,clock,tint,ratio,depth,false,interpolate,persistentClock);this.stats.vectorDraws++;
      target.setTransform(1,0,0,1,0,0);this.filters(canvas,filters,scaleX,scaleY);
      tile={canvas,scaleX,scaleY,x:x/scaleX,y:y/scaleY,bytes:width*height*4};
      if(this.profiling){const cost=this.groupCosts.get(id)??{builds:0,milliseconds:0,bytes:0,filtered:0};cost.builds++;cost.milliseconds+=performance.now()-began;cost.bytes+=tile.bytes;if(filters.length)cost.filtered++;this.groupCosts.set(id,cost);}
      if(retain && tile.bytes<=this.tileBudget){
        this.tiles.set(key,tile);this.tileBytes+=tile.bytes;
        if(family){const keys=this.morphFamilies.get(family)??new Set<string>();keys.add(key);this.morphFamilies.set(family,keys);this.tileFamilies.set(key,family);}
      }
    } else {this.stats.cacheHits++;this.tiles.delete(key);this.tiles.set(key,tile);if(family){const keys=this.morphFamilies.get(family)!;keys.delete(key);keys.add(key);}}
    ctx.drawImage(tile.canvas,tile.x,tile.y,tile.canvas.width/tile.scaleX,tile.canvas.height/tile.scaleY);
    if(!this.tiles.has(key))this.release(tile.canvas);
    while (this.tileBytes>this.tileBudget || this.tiles.size>512) {
      this.removeTile(this.tiles.keys().next().value!,this.tileBytes>this.tileBudget?'bytes':'entries');
    }
    this.stats.cachedBytes=this.tileBytes;
  }
  draw(ctx: CanvasRenderingContext2D, id: number, matrix: Matrix, frame=1, alpha=1, useCache=true, morphRatio=0, effects:PlacementEffects={}): boolean {
    if(!this.pack.symbols[id])return false;
    const clock=(Math.max(1,effects.interpolate?frame:Math.floor(frame))-1)%this.period(id);
    ctx.save();ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.tx,matrix.ty);ctx.globalAlpha*=alpha;
    this.node(ctx,id,clock,combineTint(NO_TINT,effects.colorTransform),morphRatio,effects.filters??[],0,useCache,[matrix.a,matrix.b,matrix.c,matrix.d,matrix.tx,matrix.ty],effects.interpolate,effects.persistentFrame===undefined?undefined:Math.max(0,Math.floor(effects.persistentFrame)-1));
    ctx.restore();return true;
  }
  drawPlacement(ctx:CanvasRenderingContext2D,id:number,matrix:Matrix,frame=1,placement:PlacementEffects={},alpha=1,useCache=true,morphRatio=0):boolean {
    return this.draw(ctx,id,matrix,frame,alpha,useCache,morphRatio,placement);
  }
  contains(id: number, x: number, y: number, frame: number): boolean {
    const ctx=this.hitCanvas.getContext('2d',{willReadFrequently:true})!;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1,1);ctx.setTransform(1,0,0,1,-x+.5,-y+.5);
    this.render(ctx,id,frame-1,NO_TINT,0,0,false);
    return ctx.getImageData(0,0,1,1).data[3]!>0;
  }
  clearCache(): void {
    for (const t of this.tiles.values()) t.canvas.width=t.canvas.height=0;
    this.tiles.clear();this.morphFamilies.clear();this.tileFamilies.clear();this.tileBytes=0;this.stats.cachedBytes=0;this.boundsCache.clear();
    for(const canvas of this.surfaces)canvas.width=canvas.height=0;
    this.surfaces=[];this.poolBytes=0;this.stats.pooledBytes=0;this.blurScratch=new Uint8ClampedArray(0);
    this.gpuFilter.clear();
  }
}
