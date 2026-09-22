// Rejected development-only browser layer experiment: no measured gain and
// failed pixel acceptance. Never imported by the production game.
export function retainSceneLayers(renderer) {
  const canvas=renderer.canvas,stage=renderer.ctx,draw=renderer.draw.bind(renderer),scene=renderer.drawRetainedScene.bind(renderer);
  let parent=canvas.parentElement;
  if(parent.id!=='stage-wrap'){
    const wrapper=document.createElement('div');wrapper.style.cssText=`position:relative;width:${canvas.style.width};height:${canvas.style.height}`;
    parent.insertBefore(wrapper,canvas);wrapper.append(canvas);parent=wrapper;
  }
  const overlay=document.createElement('canvas');overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';overlay.setAttribute('aria-hidden','true');canvas.after(overlay);
  const foreground=overlay.getContext('2d'),methods=new Map();let active=false,front=false,lastKey,lastSurface;
  const stats={backgroundCopies:0,skippedCopies:0,bytes:0};
  const proxy=new Proxy(stage,{
    get(_,key){
      const target=front?foreground:stage,value=Reflect.get(target,key,target);
      if(typeof value!=='function')return value;
      if(!methods.has(key))methods.set(key,(...args)=>{
        const c=front?foreground:stage;
        if(!front&&(key==='clearRect'||key==='fillRect'))return;
        if(!front&&key==='drawImage'&&args[0]===renderer.sceneSurface){
          if(lastKey===renderer.sceneKey&&lastSurface===args[0]){stats.skippedCopies++;return;}
          lastKey=renderer.sceneKey;lastSurface=args[0];stats.backgroundCopies++;
        }
        return c[key](...args);
      });
      return methods.get(key);
    },
    set(_,key,value){const c=front?foreground:stage;Reflect.set(c,key,value,c);return true;},
  });
  renderer.drawRetainedScene=(s,p)=>{scene(s,p);if(active)front=true;};
  renderer.draw=s=>{
    active=s.screen==='playing'&&!s.tutorial.visible&&renderer.presentation.retainScene;
    overlay.hidden=!active;
    if(!active){lastKey=undefined;lastSurface=undefined;return draw(s);}
    const ratio=Math.min(devicePixelRatio||1,3),w=Math.round(renderer.displayWidth*ratio*renderer.renderScale),h=Math.round(renderer.displayHeight*ratio*renderer.renderScale);
    if(overlay.width!==w||overlay.height!==h){overlay.width=w;overlay.height=h;lastKey=undefined;}
    stats.bytes=w*h*4;foreground.setTransform(1,0,0,1,0,0);foreground.clearRect(0,0,w,h);foreground.setTransform(w/550,0,0,h/400,0,0);
    front=false;renderer.ctx=proxy;
    try{return draw(s);}finally{renderer.ctx=stage;}
  };
  return{stats,dispose(){overlay.remove();overlay.width=overlay.height=0;}};
}
