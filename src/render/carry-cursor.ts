import type { Assets, Bounds, Matrix } from './assets.js';
const owners=new WeakMap<HTMLCanvasElement,CarryCursor>();

/** Logical cursor dimensions stay independent of the cached pixel density. */
export function cursorGeometry(b:Bounds,m:Matrix,width:number,height:number,cssWidth:number,cssHeight:number) {
  const corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]];
  const xs=corners.map(([x,y])=>m.a*x!+m.c*y!),ys=corners.map(([x,y])=>m.b*x!+m.d*y!);
  const sx=width/550,sy=height/400,left=Math.floor(Math.min(...xs)*sx)-2,top=Math.floor(Math.min(...ys)*sy)-2;
  const pixelsWide=Math.ceil(Math.max(...xs)*sx)-left+2,pixelsHigh=Math.ceil(Math.max(...ys)*sy)-top+2;
  const naturalWidth=pixelsWide*cssWidth/width,naturalHeight=pixelsHigh*cssHeight/height;
  // Optimized uses a compact carry cursor. Large authored hand artwork exceeds the
  // browser's native cursor limit at full-window game sizes.
  const shrink=Math.min(1,64/naturalWidth,64/naturalHeight),cssWide=naturalWidth*shrink,cssHigh=naturalHeight*shrink;
  return {left,top,pixelsWide,pixelsHigh,cssWide,cssHigh,sx,sy,
    hotspotX:Math.round(-left*cssWidth/width*shrink),hotspotY:Math.round(-top*cssHeight/height*shrink),density:width/cssWidth/shrink,
    supported:Number.isFinite(shrink)&&shrink>0&&pixelsWide*pixelsHigh*4<=4*1024*1024&&left<=0&&top<=0&&-left<pixelsWide&&-top<pixelsHigh};
}

/** Optimized's compact carried artwork follows the native mouse cursor instead of repainting
 * the restaurant. Touch and unsupported browsers keep Canvas drawing. */
export class CarryCursor {
  private key='';
  private cursor='';
  private generation=0;
  private pending:Promise<void>=Promise.resolve();
  private enabled=false;
  private encodedBytes=0;
  private blobUrl='';
  get active():boolean{return this.enabled;}
  get memoryBytes():number{return this.encodedBytes;}
  constructor(private canvas:HTMLCanvasElement,private assets:Assets){}
  reset():void {this.show(false);if(this.blobUrl)URL.revokeObjectURL(this.blobUrl);this.blobUrl='';this.generation++;this.key='';this.cursor='';this.encodedBytes=0;}
  show(requested:boolean):boolean {
    const enabled=requested&&Boolean(this.cursor);
    if(enabled!==this.enabled){
      if(enabled){this.canvas.style.cursor=this.cursor;owners.set(this.canvas,this);}
      else if(owners.get(this.canvas)===this){this.canvas.style.cursor='';owners.delete(this.canvas);}
      this.enabled=enabled;
    }
    return enabled;
  }
  prepare(width:number,height:number,cssWidth:number,cssHeight:number,pose=1):Promise<void> {
    const art=this.assets.vector,template=this.assets.placement('mcDosa'),bounds=art?.frameBounds(472,pose);
    if(!art||!template||!bounds)return Promise.resolve();
    return this.prepareDrawing(width,height,cssWidth,cssHeight,String(pose),bounds,template.matrix,
      ctx=>art.draw(ctx,472,{...template.matrix,tx:0,ty:0},pose));
  }
  prepareDrawing(width:number,height:number,cssWidth:number,cssHeight:number,contentKey:string,bounds:Bounds,matrix:Matrix,draw:(ctx:CanvasRenderingContext2D)=>void):Promise<void> {
    const key=`${width}:${height}:${cssWidth}:${cssHeight}:${contentKey}`;
    if(key===this.key)return this.pending;
    this.reset();this.key=key;const generation=this.generation;
    this.pending=(async()=>{
      if(typeof CSS==='undefined')return;
      const g=cursorGeometry(bounds,matrix,width,height,cssWidth,cssHeight);if(!g.supported)return;
      const surface=document.createElement('canvas');surface.width=g.pixelsWide;surface.height=g.pixelsHigh;
      let blob:Blob|null=null;
      try{
        const ctx=surface.getContext('2d')!;ctx.setTransform(g.sx,0,0,g.sy,-g.left,-g.top);
        draw(ctx);
        // PNG encoding can be costly at pickup. Keep the Canvas fallback live
        // while the browser encodes asynchronously, then decode before swapping.
        blob=await new Promise<Blob|null>(resolve=>surface.toBlob(resolve));
      }finally{surface.width=surface.height=0;}
      if(!blob||generation!==this.generation)return;
      const url=URL.createObjectURL(blob);let retained=false;
      try{
        const cursor=`image-set(url("${url}") ${g.density}x) ${g.hotspotX} ${g.hotspotY}, auto`;
        if(!CSS.supports('cursor',cursor))return;
        const image=new Image();image.src=url;await image.decode();
        if(generation===this.generation){this.cursor=cursor;this.blobUrl=url;this.encodedBytes=blob.size+cursor.length*2;retained=true;}
      }finally{if(!retained)URL.revokeObjectURL(url);}
    })().catch(()=>{/* Retain the normal Canvas pointer on encoding/decoding failure. */});
    return this.pending;
  }
}
