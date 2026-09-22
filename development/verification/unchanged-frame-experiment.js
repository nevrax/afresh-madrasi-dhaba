// Development-only reuse of a frame whose rendered state and input targets did not change.
// rAF callbacks continue; skipped paints are reported separately from callback cadence.
export function unchangedFrames(renderer) {
  const draw=renderer.draw.bind(renderer),clear=renderer.clearSceneCache.bind(renderer);
  let previous='',vector=null;
  const stats={painted:0,reused:0};
  renderer.clearSceneCache=()=>{previous='';clear();};
  renderer.draw=s=>{
    const eligible=renderer.presentation.retainScene&&!renderer.diagnosticFullSceneRedraw&&!renderer.diagnosticOmissions.size&&s.screen==='playing'&&!s.tutorial.visible;
    let key='';
    if(eligible){
      let pointer=s.pointer;
      if(pointer.mode==='blank'){
        const hovered=s.food.find(d=>{const p=d&&renderer.assets.placement(`dosaHolder${d.slot}`);return d&&!d.held&&p&&renderer.assets.contains(324,p.matrix,pointer.x,pointer.y);});
        const buttons=renderer.assets.scenes.find(v=>v.frame===5).instances.filter(p=>p.name==='btnMute'||p.name==='btnUnMute');
        pointer={mode:'blank',hovered: hovered?.slot??null,buttons:buttons.map(p=>renderer.assets.contains(p.symbolId,p.matrix,s.pointer.x,s.pointer.y,true,4))};
      }
      key=JSON.stringify([renderer.displayWidth,renderer.displayHeight,devicePixelRatio,renderer.renderScale,renderer.pressedCommand,
        Math.floor((s.timeMs-renderer.sceneStartedMs)*12/1000),Math.floor((s.timeMs-renderer.radioStartedMs)*12/1000),
        {...s,timeMs:undefined,pointer},renderer.feedback.map(f=>({...f,time:Math.floor((s.timeMs-f.time)*12/1000)}))],
        (name,value)=>name==='elapsedMs'?undefined:name==='phaseElapsedMs'?Math.floor(value*12/1000):value);
      if(key===previous&&vector===renderer.assets.vector){stats.reused++;return;}
    }
    draw(s);stats.painted++;previous=key;vector=renderer.assets.vector;
  };
  return stats;
}
