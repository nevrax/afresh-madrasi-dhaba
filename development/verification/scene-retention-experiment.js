// Development only. Extra candidate: sample decoration at authored 12 Hz,
// retain the opaque scene between poses, and draw food/pointer feedback each rAF.
export function retainScene(renderer) {
  const drawScene = renderer.drawScene.bind(renderer), stage = renderer.ctx;
  const surface = document.createElement('canvas'), ctx = surface.getContext('2d', {alpha: false});
  renderer.presentation = {...renderer.presentation, interpolateDecorations: false};
  let previous, hits = [];
  const stats = {builds: 0, reuses: 0, bytes: 0};
  renderer.drawScene = (state, placements) => {
    if (state.screen !== 'playing' || state.tutorial.visible) { previous = undefined; return drawScene(state, placements); }
    let hover = '';
    for (const placement of placements) if (placement.name === 'btnMute' || placement.name === 'btnUnMute')
      hover += renderer.assets.contains(placement.symbolId, placement.matrix, state.pointer.x, state.pointer.y, true, 4) ? '1' : '0';
    const customers = state.customers.map(c => [c.id,c.table,c.visible,c.characterVisible,c.characterPose,c.exitVisible,c.exitPose,c.orderVisible,c.orderRemaining,c.patience,c.angry,c.angry?Math.floor((state.timeMs-(c.angrySinceMs??state.timeMs))*12/1000):0]);
    const key = JSON.stringify([Math.floor((state.timeMs-renderer.sceneStartedMs)*12/1000),Math.floor((state.timeMs-renderer.radioStartedMs)*12/1000), state.cash, state.lostCustomers, state.day, state.clockMinutes, customers, state.audio.enabled, hover, renderer.pressedCommand]);
    if (surface.width !== renderer.canvas.width || surface.height !== renderer.canvas.height) {
      surface.width = renderer.canvas.width; surface.height = renderer.canvas.height;
      stats.bytes = surface.width * surface.height * 4; previous = undefined;
    }
    if (key !== previous) {
      stats.builds++; ctx.setTransform(surface.width / 550, 0, 0, surface.height / 400, 0, 0);
      ctx.clearRect(0, 0, 550, 400); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 550, 400);
      renderer.ctx = ctx;
      try { drawScene(state, placements); } finally { renderer.ctx = stage; }
      hits = renderer.hits.slice(); previous = key;
    } else { stats.reuses++; renderer.hits.push(...hits); }
    stage.save(); stage.setTransform(1, 0, 0, 1, 0, 0); stage.drawImage(surface, 0, 0); stage.restore();
  };
  return {stats, dispose() {surface.width = surface.height = 0;}};
}
