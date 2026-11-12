// Diagnostic only: compare first-use work with bounded, exact-density preparation.
export async function prepareScenes(renderer) {
  const art=renderer.assets.vector,ratio=Math.min(devicePixelRatio||1,3);
  const width=Math.max(1,Math.round(renderer.displayWidth*ratio*renderer.renderScale));
  const height=Math.max(1,Math.round(renderer.displayHeight*ratio*renderer.renderScale));
  art.setViewport(width,height);
  const surface=document.createElement('canvas');surface.width=width;surface.height=height;
  const ctx=surface.getContext('2d'),costs=[];
  try {
    for(const frame of [7,5]){
      const scene=renderer.assets.scenes.find(s=>s.frame===frame);
      for(const p of scene?.instances??[]){
        if(p.name==='mcInstruction'||p.name==='mcHighscorelist'||p.name==='mcSubmitExternal'||/^dosaHolder|^bill|^txt/.test(p.name??''))continue;
        const effects=art.placements(-1000-frame).find(v=>v.depth===p.depth);
        if(effects?.clipDepth)continue;
        await new Promise(requestAnimationFrame);
        const at=performance.now();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
        ctx.setTransform(width/550,0,0,height/400,0,0);
        art.drawPlacement(ctx,p.symbolId,p.matrix,1,effects);
        costs.push({id:p.symbolId,ms:performance.now()-at});
      }
    }
  } finally {surface.width=surface.height=0;}
  return costs;
}

// The cold trace identifies the twelve stretched griddle-smoke shapes. Prepare
// their normal cache entries at exact density, without retaining another layer.
export async function prepareGriddle(renderer) {
  const art=renderer.assets.vector,width=renderer.canvas.width,height=renderer.canvas.height;
  const p=renderer.assets.scenes.find(s=>s.frame===5).instances.find(p=>p.symbolId===224);
  const effects=art.placements(-1005).find(v=>v.depth===p.depth);
  const surface=document.createElement('canvas');surface.width=width;surface.height=height;
  const ctx=surface.getContext('2d');
  try {
    for(let frame=1;frame<=12;frame++){
      await new Promise(requestAnimationFrame);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
      ctx.setTransform(width/550,0,0,height/400,0,0);art.drawPlacement(ctx,p.symbolId,p.matrix,frame,effects);
    }
    ctx.getImageData(0,0,1,1);
  } finally {surface.width=surface.height=0;}
}

// Separate first-use food/filter submission from the griddle-only experiment.
export async function prepareFood(renderer,completeCooking=false) {
  const art=renderer.assets.vector,width=renderer.canvas.width,height=renderer.canvas.height;
  const template=renderer.assets.placement('mcDosa').matrix;
  const surface=document.createElement('canvas');surface.width=width;surface.height=height;
  const ctx=surface.getContext('2d');
  try {
    const frames=completeCooking?[...Array.from({length:71},(_,i)=>i+1),...Array.from({length:37},(_,i)=>i+291)]:Array.from({length:48},(_,i)=>i+1);
    for(const frame of frames){
      await new Promise(requestAnimationFrame);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
      ctx.setTransform(width/550,0,0,height/400,0,0);
      for(let slot=0;slot<3;slot++){
        const holder=renderer.assets.placement(`dosaHolder${slot}`).matrix;
        art.draw(ctx,472,{...template,tx:holder.tx,ty:holder.ty},frame);
      }
      ctx.getImageData(0,0,1,1);
    }
  } finally {surface.width=surface.height=0;}
}
