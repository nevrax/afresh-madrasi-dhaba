/** Native GPU implementation of the game's separable fractional box filter.
 * Scene geometry and simulation remain in Canvas/TypeScript. No pixel readback is used. */
const VERTEX = `#version 300 es
void main() {
  vec2 p = gl_VertexID == 0 ? vec2(-1.0,-1.0) : gl_VertexID == 1 ? vec2(3.0,-1.0) : vec2(-1.0,3.0);
  gl_Position = vec4(p,0.0,1.0);
}`;
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D sourcePixels;
uniform ivec2 activeSize;
uniform vec2 backingSize;
uniform ivec2 direction;
uniform int innerRadius;
uniform float edgeWeight;
uniform float fullWidth;
out vec4 outputColor;
vec4 pixel(ivec2 p) {
  if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(p,activeSize))) return vec4(0.0);
  return floor(texelFetch(sourcePixels,p,0)*255.0+0.5);
}
vec4 pair(ivec2 p) {
  ivec2 q=p+direction;
  if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(q,activeSize))) return pixel(p)+pixel(q);
  vec2 uv=(vec2(p)+vec2(0.5)+vec2(direction)*0.5)/backingSize;
  return floor(texture(sourcePixels,uv)*510.0+0.5);
}
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy);
  vec4 center=pixel(p+direction*innerRadius);
  for (int i=0;i<127;i++) {
    if (i>=innerRadius) break;
    center+=pair(p+direction*(-innerRadius+i*2));
  }
  vec4 ends=pixel(p-direction*(innerRadius+1))+pixel(p+direction*(innerRadius+1));
  outputColor=floor((center*255.0+ends*edgeWeight)/(fullWidth*255.0))/255.0;
}`;

/** Size buckets preserve GPU allocations when adjacent authored frames have slightly different bounds. */
export function filterBackingSize(width:number,height:number):[number,number] {
  return [Math.ceil(width/64)*64,Math.ceil(height/64)*64];
}

export interface FilterGpuDetails {
  vendor:string|null;renderer:string|null;unmaskedVendor:string|null;unmaskedRenderer:string|null;
  version:string|null;shadingLanguageVersion:string|null;maximumTextureSize:number|null;
  attributes:WebGLContextAttributes|null;
  classification:'software-indicated'|'hardware-identified'|'unknown';
}
export interface FilterGpuSummary {
  api:'webgl2';status:'not-initialized'|'ready'|'unavailable'|'context-lost';details:FilterGpuDetails|null;
  gpuApplications:number;cpuRequiredApplications:number;lastResult:'not-used'|'gpu'|'cpu-required';
}

export class BoxFilter {
  constructor(private readonly powerPreference:WebGLPowerPreference='default'){}
  private canvas:HTMLCanvasElement|null=null;
  private gl:WebGL2RenderingContext|null=null;
  private program:WebGLProgram|null=null;
  private textures:WebGLTexture[]=[];
  private framebuffers:WebGLFramebuffer[]=[];
  private uniforms:Record<string,WebGLUniformLocation|null>={};
  private width=0;
  private height=0;
  private attempted=false;
  private lost=false;
  private details:FilterGpuDetails|null=null;
  private gpuApplications=0;
  private cpuRequiredApplications=0;
  private lastResult:FilterGpuSummary['lastResult']='not-used';
  readonly stats={passes:0,allocatedBytes:0,backingBytes:0,failures:0};
  /** Inspects only the filter's existing context. Never creates a diagnostic GPU context. */
  gpuSummary():FilterGpuSummary {
    const gl=this.gl,status=!this.attempted?'not-initialized':gl?.isContextLost()?'context-lost':gl&&!this.lost?'ready':'unavailable';
    if(gl && status==='ready' && !this.details){
      const parameter=(name:number|undefined):unknown=>{try{return name===undefined?null:gl.getParameter(name);}catch{return null;}};
      const string=(value:unknown):string|null=>typeof value==='string'?value:null;
      let extension:WEBGL_debug_renderer_info|null=null,attributes:WebGLContextAttributes|null=null;
      try{extension=gl.getExtension('WEBGL_debug_renderer_info');}catch{/* Browser privacy policy may hide GPU details. */}
      try{attributes=gl.getContextAttributes();}catch{/* Context may become unavailable while reading. */}
      const vendor=string(parameter(gl.VENDOR)),renderer=string(parameter(gl.RENDERER));
      const unmaskedVendor=string(parameter(extension?.UNMASKED_VENDOR_WEBGL)),unmaskedRenderer=string(parameter(extension?.UNMASKED_RENDERER_WEBGL));
      const identity=unmaskedRenderer??renderer??'';
      const classification=/swiftshader|llvmpipe|softpipe|software rasterizer|\bwarp\b|microsoft basic render/i.test(identity)?'software-indicated':/nvidia|geforce|quadro|radeon|intel|apple (?:m\d|gpu)|adreno|mali|powervr/i.test(identity)?'hardware-identified':'unknown';
      const maximum=parameter(gl.MAX_TEXTURE_SIZE);
      this.details={vendor,renderer,unmaskedVendor,unmaskedRenderer,version:string(parameter(gl.VERSION)),shadingLanguageVersion:string(parameter(gl.SHADING_LANGUAGE_VERSION)),maximumTextureSize:typeof maximum==='number'?maximum:null,attributes,classification};
    }
    // Return a detached snapshot so diagnostics cannot change renderer bookkeeping.
    return {api:'webgl2',status,details:status==='ready'&&this.details?{...this.details,attributes:this.details.attributes?{...this.details.attributes}:null}:null,gpuApplications:this.gpuApplications,cpuRequiredApplications:this.cpuRequiredApplications,lastResult:this.lastResult};
  }
  private cpuRequired():false {this.cpuRequiredApplications++;this.lastResult='cpu-required';return false;}
  private initialize():boolean {
    if(this.attempted)return Boolean(this.gl && !this.lost && !this.gl.isContextLost());
    this.attempted=true;
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false,powerPreference:this.powerPreference});
    if(!gl || typeof gl.createShader!=='function')return false;
    try {
      const compile=(type:number,source:string):WebGLShader=>{
        const shader=gl.createShader(type);if(!shader)throw new Error('Filter shader unavailable');
        gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Filter shader compilation failed');}
        return shader;
      };
      const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
      if(!program)throw new Error('Filter program unavailable');
      gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw new Error('Filter program linking failed');}
      this.canvas=canvas;this.gl=gl;this.program=program;this.details=null;
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.lost=true;});
      canvas.addEventListener('webglcontextrestored',()=>{this.attempted=false;this.lost=false;this.gl=null;this.details=null;this.textures=[];this.framebuffers=[];this.width=this.height=0;});
      for(const name of ['sourcePixels','activeSize','backingSize','direction','innerRadius','edgeWeight','fullWidth'])this.uniforms[name]=gl.getUniformLocation(program,name);
      for(let i=0;i<3;i++){
        const texture=gl.createTexture();if(!texture)throw new Error('Filter texture unavailable');
        this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        if(i){const framebuffer=gl.createFramebuffer();if(!framebuffer)throw new Error('Filter framebuffer unavailable');this.framebuffers.push(framebuffer);}
      }
      gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.DITHER);
      return true;
    }catch{this.stats.failures++;this.gl=null;return false;}
  }
  apply(target:HTMLCanvasElement,blurX:number,blurY:number,passes:number):boolean {
    const axes:Array<{size:number;x:number;y:number}>=[];
    for(let pass=0;pass<passes;pass++){
      if(blurX>1)axes.push({size:Math.min(255,blurX),x:1,y:0});
      if(blurY>1)axes.push({size:Math.min(255,blurY),x:0,y:1});
    }
    if(!axes.length)return true;
    if(!this.initialize())return this.cpuRequired();
    const gl=this.gl!,canvas=this.canvas!,w=target.width,h=target.height;
    try{
      const requested=filterBackingSize(w,h),width=Math.max(requested[0],this.width),height=Math.max(requested[1],this.height);
      if(width!==this.width || height!==this.height){
        const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;if(width>limit || height>limit)return this.cpuRequired();
        this.width=width;this.height=height;canvas.width=width;canvas.height=height;
        for(let i=0;i<3;i++){
          gl.bindTexture(gl.TEXTURE_2D,this.textures[i]!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
          if(i){gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[i-1]!);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.textures[i]!,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Filter framebuffer incomplete');}
        }
        this.stats.allocatedBytes+=width*height*4*4;this.stats.backingBytes=width*height*4*4;
      }
      gl.useProgram(this.program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]!);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,target);
      gl.viewport(0,0,w,h);gl.uniform1i(this.uniforms.sourcePixels!,0);gl.uniform2i(this.uniforms.activeSize!,w,h);gl.uniform2f(this.uniforms.backingSize!,width,height);
      let input=0;
      for(let index=0;index<axes.length;index++){
        const axis=axes[index]!,last=index===axes.length-1,output=input===1?2:1;
        gl.bindFramebuffer(gl.FRAMEBUFFER,last?null:this.framebuffers[output-1]!);gl.bindTexture(gl.TEXTURE_2D,this.textures[input]!);
        const radius=(axis.size-1)/2,inner=Math.max(0,Math.ceil(radius)-1),edge=Math.floor((radius-inner)*255);
        gl.uniform2i(this.uniforms.direction!,axis.x,axis.y);gl.uniform1i(this.uniforms.innerRadius!,inner);gl.uniform1f(this.uniforms.edgeWeight!,edge);gl.uniform1f(this.uniforms.fullWidth!,axis.size);
        gl.drawArrays(gl.TRIANGLES,0,3);input=output;this.stats.passes++;
      }
      gl.flush();
      const ctx=target.getContext('2d')!;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';
      ctx.drawImage(canvas,0,height-h,w,h,0,0,w,h);ctx.restore();this.gpuApplications++;this.lastResult='gpu';return true;
    }catch{this.stats.failures++;this.lost=true;return this.cpuRequired();}
  }
  clear():void {
    // Keep one context/program alive across diagnostic resets; repeatedly creating contexts
    // can exceed the browser's context limit even after all texture handles are deleted.
    if(this.gl && !this.gl.isContextLost()){
      for(const texture of this.textures){this.gl.bindTexture(this.gl.TEXTURE_2D,texture);this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA8,1,1,0,this.gl.RGBA,this.gl.UNSIGNED_BYTE,null);}
      this.canvas!.width=this.canvas!.height=1;this.width=this.height=1;this.stats.backingBytes=16;
    }else{this.attempted=false;this.stats.backingBytes=0;}
  }
}
