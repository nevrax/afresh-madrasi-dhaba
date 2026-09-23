import type { Assets } from './assets.js';
import { cursorGeometry } from './carry-cursor.js';

/** Keep the ladle at its authored scale without repainting the restaurant as it moves. */
export class BatterPreview {
  private surface:HTMLCanvasElement|null=null;
  private clip:HTMLDivElement|null=null;
  private key='';
  private geometry:ReturnType<typeof cursorGeometry>|null=null;
  private enabled=false;
  private cssWidth=0;
  private cssHeight=0;
  private width=0;
  private height=0;
  get active():boolean{return this.enabled;}
  get memoryBytes():number{return this.surface?this.surface.width*this.surface.height*4:0;}
  constructor(private canvas:HTMLCanvasElement,private assets:Assets){}
  private createLayer():void{
    if(this.surface)return;
    this.surface=document.createElement('canvas');this.clip=document.createElement('div');
    this.surface.width=this.surface.height=0;
    this.clip.dataset.batterPreview='';this.clip.hidden=true;this.clip.setAttribute('aria-hidden','true');
    Object.assign(this.clip.style,{position:'fixed',overflow:'hidden',pointerEvents:'none',zIndex:'2'});
    Object.assign(this.surface.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none',willChange:'transform'});
    this.clip.append(this.surface);this.canvas.parentElement?.append(this.clip);
  }
  reset():void{this.show(false);this.key='';this.geometry=null;if(this.surface)this.surface.width=this.surface.height=0;}
  async prepare(width:number,height:number,cssWidth:number,cssHeight:number):Promise<void>{
    const key=`${width}:${height}:${cssWidth}:${cssHeight}`;if(this.key===key)return;
    this.reset();const art=this.assets.vector,template=this.assets.placement('mcDosa'),bounds=art?.frameBounds(472,1);
    if(!art||!template||!bounds)return;
    const g=cursorGeometry(bounds,template.matrix,width,height,cssWidth,cssHeight);
    if(!g.supported)return;
    this.createLayer();const surface=this.surface!;
    surface.width=g.pixelsWide;surface.height=g.pixelsHigh;
    const ctx=surface.getContext('2d');if(!ctx)return;
    ctx.setTransform(g.sx,0,0,g.sy,-g.left,-g.top);
    art.draw(ctx,472,{...template.matrix,tx:0,ty:0},1);
    surface.style.width=g.pixelsWide*cssWidth/width+'px';
    surface.style.height=g.pixelsHigh*cssHeight/height+'px';
    this.geometry=g;this.key=key;this.width=width;this.height=height;this.cssWidth=cssWidth;this.cssHeight=cssHeight;
  }
  show(requested:boolean):boolean{
    const enabled=requested&&!!this.geometry;
    if(enabled!==this.enabled){if(this.clip)this.clip.hidden=!enabled;if(enabled)this.canvas.style.cursor='none';else if(this.canvas.style.cursor==='none')this.canvas.style.cursor='';this.enabled=enabled;}
    return enabled;
  }
  move(x:number,y:number):void{
    if(!this.enabled||!this.geometry||!this.clip||!this.surface)return;
    const rect=this.canvas.getBoundingClientRect(),g=this.geometry;
    this.clip.style.left=rect.left+'px';this.clip.style.top=rect.top+'px';
    this.clip.style.width=rect.width+'px';this.clip.style.height=rect.height+'px';
    this.surface.style.transform=`translate3d(${x*this.cssWidth/550+g.left*this.cssWidth/this.width}px,${y*this.cssHeight/400+g.top*this.cssHeight/this.height}px,0)`;
  }
}
