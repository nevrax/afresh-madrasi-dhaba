/** Verification-only rejected final-stage compositor experiment. Never included in releases. */
type Transform = [number,number,number,number,number,number];
interface Clip { path:Path2D; rule:CanvasFillRule; matrix:Transform }
export interface TileQuad { source:HTMLCanvasElement; sourceRect:[number,number,number,number]; destination:[number,number,number,number]; matrix:Transform; alpha:number; clips:Clip[] }
export interface TileFrame { width:number;height:number;quads:TileQuad[];sources:HTMLCanvasElement[];excluded:{text:number;fills:number;strokes:number};dispose():void }
const transform=(m:DOMMatrix):Transform=>[m.a,m.b,m.c,m.d,m.e,m.f];

/** Captures one real draw, keeping tile order and native clip paths. Direct text/path
 * paints are counted and excluded: this experiment is not a complete stage backend. */
export function captureTileFrame(canvas:HTMLCanvasElement,draw:()=>void):TileFrame {
  const ctx=canvas.getContext('2d')!,quads:TileQuad[]=[],sources:HTMLCanvasElement[]=[],copies=new Map<CanvasImageSource,HTMLCanvasElement>();
  const excluded={text:0,fills:0,strokes:0},originals=new Map<string,unknown>();
  let clips:Clip[]=[],path=new Path2D();const stack:Clip[][]=[];
  const hook=(name:string,fn:(...args:any[])=>unknown):void=>{
    const record=ctx as unknown as Record<string,unknown>,old=record[name] as (...args:any[])=>unknown;originals.set(name,old);
    record[name]=(...args:any[])=>{fn(...args);return old.apply(ctx,args);};
  };
  hook('save',()=>stack.push(clips.slice()));hook('restore',()=>{clips=stack.pop()??[];});
  hook('beginPath',()=>{path=new Path2D();});
  hook('rect',(x:number,y:number,w:number,h:number)=>path.rect(x,y,w,h));
  hook('clip',(first?:Path2D|CanvasFillRule,second?:CanvasFillRule)=>{
    clips=[...clips,{path:first instanceof Path2D?new Path2D(first):new Path2D(path),rule:typeof first==='string'?first:second??'nonzero',matrix:transform(ctx.getTransform())}];
  });
  hook('fillText',()=>excluded.text++);hook('strokeText',()=>excluded.text++);
  hook('fill',()=>excluded.fills++);hook('fillRect',()=>excluded.fills++);hook('stroke',()=>excluded.strokes++);
  hook('drawImage',(image:CanvasImageSource,...args:number[])=>{
    if(ctx.globalCompositeOperation!=='source-over')throw new Error(`Tile capture needs source-over, got ${ctx.globalCompositeOperation}`);
    let source=copies.get(image);
    if(!source){
      const sized=image as HTMLCanvasElement;source=document.createElement('canvas');source.width=sized.width;source.height=sized.height;
      source.getContext('2d')!.drawImage(image,0,0);copies.set(image,source);sources.push(source);
    }
    const sourceRect:[number,number,number,number]=args.length===8?args.slice(0,4) as [number,number,number,number]:[0,0,source.width,source.height];
    const destination:[number,number,number,number]=args.length===8?args.slice(4) as [number,number,number,number]:[args[0]!,args[1]!,args[2]??source.width,args[3]??source.height];
    quads.push({source,sourceRect,destination,matrix:transform(ctx.getTransform()),alpha:ctx.globalAlpha,clips:clips.slice()});
  });
  try{draw();}finally{for(const [name,original]of originals)(ctx as unknown as Record<string,unknown>)[name]=original;}
  return {width:canvas.width,height:canvas.height,quads,sources,excluded,dispose(){for(const source of sources)source.width=source.height=1;}};
}

export function replayCanvasTiles(ctx:CanvasRenderingContext2D,frame:TileFrame):void {
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(0,0,frame.width,frame.height);
  for(const q of frame.quads){
    ctx.save();for(const clip of q.clips){ctx.setTransform(...clip.matrix);ctx.clip(clip.path,clip.rule);}
    ctx.setTransform(...q.matrix);ctx.globalAlpha=q.alpha;ctx.drawImage(q.source,...q.sourceRect,...q.destination);ctx.restore();
  }
}


interface AtlasRect { width:number;height:number }
export function packTileAtlas(rectangles:readonly AtlasRect[],maximum=4096):{size:number;positions:[number,number][]} {
  const order=rectangles.map((r,i)=>({w:r.width+2,h:r.height+2,i})).sort((a,b)=>b.h-a.h||b.w-a.w);
  for(let size=256;size<=maximum;size*=2){
    const shelves:{y:number;height:number;used:number}[]=[],positions:[number,number][]=Array(rectangles.length);let fits=true;
    for(const r of order){
      if(r.w>size||r.h>size){fits=false;break;}
      let shelf=shelves.find(s=>s.height>=r.h&&s.used+r.w<=size);
      if(!shelf){const y=shelves.reduce((sum,s)=>sum+s.height,0);if(y+r.h>size){fits=false;break;}shelf={y,height:r.h,used:0};shelves.push(shelf);}
      positions[r.i]=[shelf.used+1,shelf.y+1];shelf.used+=r.w;
    }
    if(fits)return {size,positions};
  }
  throw new Error('Captured tiles do not fit a4096px atlas within the80MiB texture budget');
}
const vertex=`#version 300 es
in vec4 vertex;in float opacity;out vec2 uv;out float alpha;
void main(){gl_Position=vec4(vertex.xy,0.,1.);uv=vertex.zw;alpha=opacity;}`;
const fragment=`#version 300 es
precision highp float;uniform sampler2D atlas;uniform bool masked;uniform vec4 maskRegion;uniform vec2 viewportSize;in vec2 uv;in float alpha;out vec4 color;
void main(){color=texture(atlas,uv)*alpha;if(masked)color*=texture(atlas,maskRegion.xy+gl_FragCoord.xy/viewportSize*maskRegion.zw).a;}`;

/** One immutable atlas; batch only adjacent equal clip groups, preserving all depth order. */
export class TileCompositor {
  private gl:WebGL2RenderingContext;private program:WebGLProgram;private buffer:WebGLBuffer;private texture:WebGLTexture;
  private uniforms:Record<string,WebGLUniformLocation|null>={};private attribute=0;private opacityAttribute=0;
  private commands:{mask:number;offset:number;count:number}[]=[];private maskRegions=new Map<number,[number,number,number,number]>();
  readonly uploadedBytes:number;readonly atlasSize:number;
  get batches():number{return this.commands.length;}
  constructor(readonly canvas:HTMLCanvasElement,private readonly frame:TileFrame){
    canvas.width=frame.width;canvas.height=frame.height;
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
    if(!gl)throw new Error('WebGL2 is unavailable');this.gl=gl;
    const compile=(kind:number,source:string):WebGLShader=>{const shader=gl.createShader(kind)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Shader compile failed');return shader;};
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'Compositor link failed');this.program=program;
    this.attribute=gl.getAttribLocation(program,'vertex');this.opacityAttribute=gl.getAttribLocation(program,'opacity');for(const name of ['atlas','maskRegion','viewportSize','masked'])this.uniforms[name]=gl.getUniformLocation(program,name);
    const sources=frame.sources.slice(),indices=new Map(sources.map((s,i)=>[s,i])),maskIds:number[]=[],masks=new Map<string,number>(),allClips=[...new Set(frame.quads.flatMap(q=>q.clips))];
    for(const q of frame.quads){
      if(!q.clips.length){maskIds.push(-1);continue;}
      const key=q.clips.map(c=>allClips.indexOf(c)).join(',');let id=masks.get(key);
      if(id===undefined){const surface=document.createElement('canvas');surface.width=frame.width;surface.height=frame.height;const c=surface.getContext('2d')!;
        for(const clip of q.clips){c.setTransform(...clip.matrix);c.clip(clip.path,clip.rule);}c.setTransform(1,0,0,1,0,0);c.fillStyle='#fff';c.fillRect(0,0,frame.width,frame.height);
        id=sources.length;sources.push(surface);masks.set(key,id);}
      maskIds.push(id);
    }
    const layout=packTileAtlas(sources,Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE)));this.atlasSize=layout.size;this.uploadedBytes=layout.size*layout.size*4;
    if(this.uploadedBytes>80*1048576)throw new Error('Atlas exceeds the80MiB texture budget');
    const atlas=document.createElement('canvas');atlas.width=atlas.height=layout.size;const target=atlas.getContext('2d')!;target.imageSmoothingEnabled=false;
    sources.forEach((source,i)=>{
      const [x,y]=layout.positions[i]!,w=source.width,h=source.height;target.drawImage(source,x,y);
      // Extrude a single texel: linear sampling must match per-source CLAMP_TO_EDGE.
      target.drawImage(source,0,0,w,1,x,y-1,w,1);target.drawImage(source,0,h-1,w,1,x,y+h,w,1);
      target.drawImage(source,0,0,1,h,x-1,y,1,h);target.drawImage(source,w-1,0,1,h,x+w,y,1,h);
      for(const [sx,sy,dx,dy]of [[0,0,x-1,y-1],[w-1,0,x+w,y-1],[0,h-1,x-1,y+h],[w-1,h-1,x+w,y+h]])target.drawImage(source,sx!,sy!,1,1,dx!,dy!,1,1);
      if(i>=frame.sources.length)this.maskRegions.set(i,[x/layout.size,1-(y+h)/layout.size,w/layout.size,h/layout.size]);
    });
    this.texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
    atlas.width=atlas.height=1;for(const mask of sources.slice(frame.sources.length))mask.width=mask.height=1;
    const vertices:number[]=[];
    frame.quads.forEach((q,i)=>{
      const [sx,sy,sw,sh]=q.sourceRect,[x,y,w,h]=q.destination,[a,b,c,d,tx,ty]=q.matrix,[ax,ay]=layout.positions[indices.get(q.source)!]!,offset=vertices.length/5,mask=maskIds[i]!;
      for(const [dx,dy]of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]){
        const px=x+dx!*w,py=y+dy!*h;vertices.push((a*px+c*py+tx)*2/frame.width-1,1-(b*px+d*py+ty)*2/frame.height,(ax+sx+dx!*sw)/layout.size,1-(ay+sy+dy!*sh)/layout.size,q.alpha);
      }
      const last=this.commands.at(-1);if(last?.mask===mask)last.count+=6;else this.commands.push({mask,offset,count:6});
    });
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  }
  draw():void {
    const gl=this.gl;gl.viewport(0,0,this.frame.width,this.frame.height);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.attribute);gl.vertexAttribPointer(this.attribute,4,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(this.opacityAttribute);gl.vertexAttribPointer(this.opacityAttribute,1,gl.FLOAT,false,20,16);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.DITHER);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.uniforms['atlas']!,0);gl.uniform2f(this.uniforms['viewportSize']!,this.frame.width,this.frame.height);
    for(const q of this.commands){gl.uniform1i(this.uniforms['masked']!,q.mask<0?0:1);if(q.mask>=0)gl.uniform4fv(this.uniforms['maskRegion']!,this.maskRegions.get(q.mask)!);gl.drawArrays(gl.TRIANGLES,q.offset,q.count);}
  }
  synchronize():void {this.gl.finish();}
  pixels():Uint8Array {const data=new Uint8Array(this.frame.width*this.frame.height*4);this.gl.readPixels(0,0,this.frame.width,this.frame.height,this.gl.RGBA,this.gl.UNSIGNED_BYTE,data);return data;}
  dispose():void {this.gl.deleteTexture(this.texture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.canvas.width=this.canvas.height=1;}
}
