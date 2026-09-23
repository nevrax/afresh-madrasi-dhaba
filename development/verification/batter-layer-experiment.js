// Development-only: retain the world while a small exact-density batter image moves.
export function batterLayer(renderer,nativeCursor=false) {
  const canvas=renderer.canvas,layer=document.createElement('canvas'),wrap=document.createElement('div');
  Object.assign(wrap.style,{position:'fixed',overflow:'hidden',pointerEvents:'none'});
  Object.assign(layer.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none',willChange:'transform'});
  wrap.append(layer);document.body.append(wrap);wrap.hidden=true;
  const originalDraw=renderer.draw.bind(renderer),originalKey=renderer.unchangedFrameKey.bind(renderer);
  let key='',left=0,top=0,rect=null,cursorValue='',nativeActive=false;
  const invalidate=()=>{rect=null;};window.addEventListener('resize',invalidate);window.addEventListener('scroll',invalidate,true);
  renderer.unchangedFrameKey=s=>renderer.diagnosticBatterOverlay?'batter-layer:'+originalKey({...s,pointer:{...s.pointer,mode:'blank'}}):originalKey(s);
  renderer.draw=s=>{
    const enabled=renderer.presentation.retainScene&&s.screen==='playing'&&s.pointer.mode==='batter'&&s.batterTemplate.available&&!s.tutorial.visible;
    renderer.diagnosticBatterOverlay=enabled;wrap.hidden=!enabled||nativeCursor;
    if(enabled){
      const width=Math.round(renderer.displayWidth*Math.min(devicePixelRatio||1,3)*renderer.renderScale),height=Math.round(renderer.displayHeight*Math.min(devicePixelRatio||1,3)*renderer.renderScale);
      const nextKey=`${width}:${height}`,template=renderer.assets.placement('mcDosa').matrix;
      if(key!==nextKey){
        rect=null;
        const b=renderer.assets.vector.currentBounds(472,0),corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]];
        const xs=corners.map(([x,y])=>template.a*x+template.c*y),ys=corners.map(([x,y])=>template.b*x+template.d*y),sx=width/550,sy=height/400;
        left=Math.floor(Math.min(...xs)*sx)-2;top=Math.floor(Math.min(...ys)*sy)-2;
        layer.width=Math.ceil(Math.max(...xs)*sx)-left+2;layer.height=Math.ceil(Math.max(...ys)*sy)-top+2;
        const ctx=layer.getContext('2d');ctx.setTransform(sx,0,0,sy,-left,-top);
        renderer.assets.vector.draw(ctx,472,{...template,tx:0,ty:0},1);
        key=nextKey;
      }
      if(!rect){rect=canvas.getBoundingClientRect();
        Object.assign(wrap.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
        layer.style.width=layer.width*rect.width/width+'px';layer.style.height=layer.height*rect.height/height+'px';
        if(nativeCursor){
          const cursor=`image-set(url("${layer.toDataURL()}") ${width/rect.width}x) ${Math.round(-left*rect.width/width)} ${Math.round(-top*rect.height/height)}, auto`;
          if(!CSS.supports('cursor',cursor))throw Error('Native cursor image-set unavailable');
          cursorValue=cursor;nativeActive=false;
        }
      }
      if(nativeCursor){if(!nativeActive){canvas.style.cursor=cursorValue;nativeActive=true;}}
      else layer.style.transform=`translate(${s.pointer.x*rect.width/550+left*rect.width/width}px,${s.pointer.y*rect.height/400+top*rect.height/height}px)`;
    }else if(nativeActive){canvas.style.cursor='';nativeActive=false;}
    originalDraw(s);
  };
  return {dispose(){canvas.style.cursor='';window.removeEventListener('resize',invalidate);window.removeEventListener('scroll',invalidate,true);wrap.remove();renderer.draw=originalDraw;renderer.unchangedFrameKey=originalKey;renderer.diagnosticBatterOverlay=false;}};
}
