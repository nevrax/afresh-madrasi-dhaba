// Rejected development experiment: exact pixels but worse Pi A pacing. Not shipped.
export function dirtyScene(renderer) {
  const c=renderer.ctx, draw=renderer.draw.bind(renderer), scene=renderer.drawRetainedScene.bind(renderer);
  const image=c.drawImage.bind(c), clear=c.clearRect.bind(c), fill=c.fillRect.bind(c), text=c.fillText.bind(c);
  let active=false, foreground=false, previous=null, bounds=null, key='', surface=null;
  const stats={fullCopies:0,partialCopies:0,restoredPixels:0,sceneBuilds:0,sceneBuildMs:0,foodMs:0};
  const add=(x,y,w,h)=>{
    const m=c.getTransform(),xs=[],ys=[];
    for(const [a,b] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){xs.push(m.a*a+m.c*b+m.e);ys.push(m.b*a+m.d*b+m.f);}
    const r={x:Math.max(0,Math.floor(Math.min(...xs))-2),y:Math.max(0,Math.floor(Math.min(...ys))-2),right:Math.min(renderer.canvas.width,Math.ceil(Math.max(...xs))+2),bottom:Math.min(renderer.canvas.height,Math.ceil(Math.max(...ys))+2)};
    if(r.right<=r.x||r.bottom<=r.y)return;
    bounds=bounds?{x:Math.min(bounds.x,r.x),y:Math.min(bounds.y,r.y),right:Math.max(bounds.right,r.right),bottom:Math.max(bounds.bottom,r.bottom)}:r;
  };
  c.clearRect=(...args)=>{if(!active||foreground)clear(...args);};
  c.fillRect=(...args)=>{if(!active||foreground)fill(...args);};
  c.drawImage=(source,...args)=>{
    if(active&&!foreground&&source===renderer.sceneSurface){
      if(key!==renderer.sceneKey||surface!==source){clear(0,0,source.width,source.height);image(source,...args);stats.fullCopies++;stats.restoredPixels+=source.width*source.height;}
      else if(previous){const {x,y,right,bottom}=previous;image(source,x,y,right-x,bottom-y,x,y,right-x,bottom-y);stats.partialCopies++;stats.restoredPixels+=(right-x)*(bottom-y);}
      key=renderer.sceneKey;surface=source;return;
    }
    if(active&&foreground){const d=args.length===2?[...args,source.width,source.height]:args.length===4?args:args.slice(4);add(...d);}
    image(source,...args);
  };
  c.fillText=(value,x,y,...rest)=>{if(active&&foreground){const b=c.measureText(value);add(x-b.actualBoundingBoxLeft,y-b.actualBoundingBoxAscent,b.actualBoundingBoxLeft+b.actualBoundingBoxRight,b.actualBoundingBoxAscent+b.actualBoundingBoxDescent);}text(value,x,y,...rest);};
  const drawScene=renderer.drawScene.bind(renderer),food=renderer.food.bind(renderer);
  renderer.drawScene=(...args)=>{const at=performance.now();try{return drawScene(...args);}finally{stats.sceneBuilds++;stats.sceneBuildMs+=performance.now()-at;}};
  renderer.food=(...args)=>{const at=performance.now();try{return food(...args);}finally{stats.foodMs+=performance.now()-at;}};
  renderer.drawRetainedScene=(...args)=>{scene(...args);foreground=true;};
  renderer.draw=s=>{
    const ratio=Math.min(devicePixelRatio||1,3),w=Math.max(1,Math.round(renderer.displayWidth*ratio*renderer.renderScale)),h=Math.max(1,Math.round(renderer.displayHeight*ratio*renderer.renderScale));
    active=renderer.presentation.retainScene&&!renderer.diagnosticFullSceneRedraw&&!renderer.diagnosticOmissions.size&&s.screen==='playing'&&!s.tutorial.visible&&w*h*4<=32*1024*1024;
    if(!active){key='';surface=null;previous=null;}
    foreground=false;bounds=null;draw(s);previous=bounds;
  };
  return {stats};
}
