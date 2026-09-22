// Experimental variants affect only this isolated renderer instance.
export async function measureComponentFixture(page, config) {
  if (config.audio) await page.mouse.click(10, 10);
  return page.evaluate(async config => {
    const {Assets} = await import('/build/modules/src/render/assets.js');
    const {Renderer} = await import('/build/modules/src/render/renderer.js');
    const {fixture} = await import('/build/modules/development/verification/component-study.js');
    const canvas = document.getElementById('game');
    if (config.stageOptions) canvas.getContext('2d', {alpha: false, ...config.stageOptions});
    canvas.style.width = `${config.width / devicePixelRatio}px`;
    canvas.style.height = `${config.width * 400 / 550 / devicePixelRatio}px`;
    const assets = new Assets(); await assets.load(config.adapter);
    const renderer = new Renderer(canvas, assets); await renderer.load();
    if (config.presentation) renderer.setPresentation(config.presentation);
    if (config.legacyExtra) renderer.presentation = {...renderer.presentation, retainScene: false};
    if (config.fullSceneRedraw) renderer.diagnosticFullSceneRedraw = true;
    renderer.setRenderScale(config.scale ?? 1);
    const art = assets.vector; art.profiling = config.instrumentation !== false;
    const stageContext = canvas.getContext('2d');
    const layers = config.layers ? (await import('/development/verification/scene-layers-experiment.js')).retainSceneLayers(renderer) : null;
    const submissions = config.retainSubmissions ? (await import('/development/verification/retained-submissions-experiment.js')).retainSubmissions(art, stageContext) : null;
    const sceneRetention = config.retainScene ? (await import('/development/verification/scene-retention-experiment.js')).retainScene(renderer) : null;
    if (config.workload === 'no-bitmap-paint') stageContext.drawImage = () => {};
    if (config.workload === 'no-text') renderer.sourceText = () => {};
    if (config.workload === 'no-hit-tests') assets.contains = () => false;
    if (config.noClear) stageContext.clearRect = () => {};
    const opaqueSources = new Map();
    if (config.opaqueBackground) {
      const draw = art.draw.bind(art), paint = stageContext.drawImage.bind(stageContext);
      let background = false;
      stageContext.drawImage = (source, ...args) => {
        if (background) {
          let opaque = opaqueSources.get(source);
          if (!opaque) {
            opaque = document.createElement('canvas'); opaque.width = source.width; opaque.height = source.height;
            const c = opaque.getContext('2d', {alpha: false}); c.fillStyle = '#fff'; c.fillRect(0, 0, opaque.width, opaque.height); c.drawImage(source, 0, 0);
            opaqueSources.set(source, opaque);
          }
          paint(opaque, ...args);
        } else paint(source, ...args);
      };
      art.draw = (ctx, id, ...args) => { background = ctx === stageContext && id === 193; try { return draw(ctx, id, ...args); } finally { background = false; } };
    }
    let frozenSurface, frozenBitmap;
    if (['idle-stage', 'single-canvas', 'single-bitmap', 'small-region'].includes(config.workload)) {
      const drawScene = renderer.draw.bind(renderer);
      drawScene(fixture());
      frozenSurface = document.createElement('canvas'); frozenSurface.width = canvas.width; frozenSurface.height = canvas.height;
      frozenSurface.getContext('2d', {alpha: false}).drawImage(canvas, 0, 0);
      if (config.workload === 'single-bitmap') frozenBitmap = await createImageBitmap(frozenSurface);
      renderer.draw = state => {
        stageContext.setTransform(1, 0, 0, 1, 0, 0);
        if (config.workload === 'small-region') stageContext.drawImage(frozenSurface, 800, 800, 160, 160, 800, 800, 160, 160);
        else if (config.workload !== 'idle-stage') stageContext.drawImage(frozenBitmap ?? frozenSurface, 0, 0);
      };
    }
    let audio;
    const operations = {omittedPlacements: 0, frozenPlacements: 0, omittedOrders: 0, frozenOrders: 0};
    const omissions = new Set([...(config.omit ? [config.omit] : []), ...(config.omissions || [])]);
    const freezes = new Set([...(config.freeze ? [config.freeze] : []), ...(config.freezes || [])]);
    const trafficIds = new Set([204, 206, 210, 215, 218]);
    for (const group of omissions) renderer.diagnosticOmissions.add(group);
    if (omissions.has('griddle-steam')) art.diagnosticOmitChildren.add('224:223');
    if (omissions.has('dosa-steam')) art.diagnosticOmitChildren.add('472:223');
    if (omissions.has('stars')) art.diagnosticOmitChildren.add('193:185');
    if (freezes.has('background')) {
      // A static sky allows the existing renderer to retain the whole background.
      // This is intentionally a visual/cache-policy experiment, not pixel parity.
      art.pack.symbols[185].frames = [art.pack.symbols[185].frames[0]];
    }
    if (config.griddleNoBlur) {
      for (const frame of art.pack.symbols[224].frames)
        for (const part of frame) if (part.id === 223) part.filters = [];
    }
    const placement = art.drawPlacement.bind(art);
    art.drawPlacement = (ctx, id, matrix, frame, options) => {
      if (id === 235 && omissions.has('glasses')) { operations.omittedPlacements++; return true; }
      if (id === 235 && freezes.has('glasses') || id === 224 && freezes.has('griddle-steam')) {
        operations.frozenPlacements++; frame = 1;
      }
      if (trafficIds.has(id) && freezes.has('traffic')) { operations.frozenPlacements++; frame = 193; }
      return placement(ctx, id, matrix, frame, options);
    };
    if (omissions.has('orders')) renderer.order = () => { operations.omittedOrders++; };
    const drawAsset = assets.draw.bind(assets);
    assets.draw = (ctx, id, matrix, frame, alpha) => {
      if (id === -363 && freezes.has('orders')) { operations.frozenOrders++; frame = 1; }
      return drawAsset(ctx, id, matrix, frame, alpha);
    };
    const state = fixture();
    if (omissions.has('characters')) state.customers.forEach(c => { c.characterVisible = false; c.angry = false; });
    renderer.events([{type: 'screen', screen: 'playing'}], {...state, timeMs: 0});
    const next = () => new Promise(requestAnimationFrame);
    const summarize = values => {
      const v = [...values].sort((a, b) => a - b);
      return {p50: v[Math.floor(v.length * .5)], p95: v[Math.floor(v.length * .95)],
        p99: v[Math.floor(v.length * .99)], max: v.at(-1), over50: v.filter(n => n > 50).length,
        totalOver50Ms: v.filter(n => n > 50).reduce((sum, n) => sum + n, 0)};
    };
    const cacheDelta = start => !art.profiling ? null : ({allocations: art.stats.allocatedBytes - start.allocatedBytes,
      evictions: art.stats.evictions - start.evictions, morphReplacements: art.stats.morphReplacements - start.morphReplacements,
      filterBuilds: art.stats.filterPlacements - start.filterPlacements});
    try {
      if (config.audio) {
        const {GameAudio} = await import('/build/modules/src/audio/audio.js');
        audio = new GameAudio(assets); audio.activate();
        audio.handle([{type: 'sound', name: 'bgMusic1', loop: 100}, {type: 'sound', name: 'sound-446', loop: 100}]);
        await Promise.all([...audio.buffers.values()]);
        await audio.diagnosticSuspend(config.audio === 'suspended');
        if (audio.activeSources !== 2 || config.audio === 'running' && audio.playbackState !== 'running')
          throw Error('Audio control did not reach the requested state');
      }
      await next(); await next();
      const display = canvas.getBoundingClientRect();
      if (display.right > innerWidth + 1 || display.bottom > innerHeight + 1) throw Error('Fixture is not fully visible');
      const warmup = config.warmupMs ?? 18000, duration = config.measurementMs ?? 12000;
      let start = await next(), last = start, began = 0, initial = {...art.stats}, coldCache = {...art.stats};
      const gaps = [], draws = [], coldGaps = [], coldDraws = [], groups = {};
      let hidden = false, cold;
      if (config.instrumentation !== false) renderer.onRenderCost = (group, ms) => { if (began) groups[group] = (groups[group] || 0) + ms; };
      while (last - start < warmup + duration) {
        const now = await next(), gap = now - last; last = now; hidden ||= document.hidden;
        const local = (now - start) % 6000, pose = Math.floor(local * 12 / 1000);
        if (!config.freezeState) {
        state.timeMs = 16000 + local; state.clockMinutes = 556 + Math.floor(local / 1000);
        state.pointer.x = 275 + 230 * Math.sin(local / 700); state.pointer.y = 327 + 20 * Math.cos(local / 430);
        state.platePosition.x = state.pointer.x; state.platePosition.y = state.pointer.y;
        state.counterPosition.x = state.pointer.x; state.counterPosition.y = state.pointer.y + 35;
        Object.assign(state.plate[0], {x: state.pointer.x, y: state.pointer.y, smokePose: freezes.has('dosa-steam') ? 1 : pose % 12 + 1});
        state.food.forEach((d, i) => { if (d) { d.pose = i === 0 ? 71 + pose % 70 : 327; d.smokePose = i === 0 ? null : freezes.has('dosa-steam') ? 1 : pose % 12 + 1; } });
        state.customers.forEach(c => { c.characterPose = 1; c.phaseElapsedMs = pose * 1000 / 12; c.patience = -50 - c.id + (pose % 20) * .05; });
        }
        if (!began && now - start >= warmup) {
          if (window.__measureWarmCpu) await window.__measureWarmCpu('start');
          began = now - gap; initial = {...art.stats};
          cold = {seconds: (now - start) / 1000, frames: coldGaps.length, raf: summarize(coldGaps),
            draw: summarize(coldDraws), cache: cacheDelta(coldCache)};
          art.groupCosts.clear();
        }
        const at = performance.now(); renderer.draw(state); const draw = performance.now() - at;
        if (began) { gaps.push(gap); draws.push(draw); } else { coldGaps.push(gap); coldDraws.push(draw); }
      }
      if (window.__measureWarmCpu) await window.__measureWarmCpu('end');
      return {config, context: stageContext.getContextAttributes(), canvas: [canvas.width, canvas.height], display: [display.width, display.height], dpr: devicePixelRatio, fps: gaps.length * 1000 / (last - began),
        frames: gaps.length, seconds: (last - began) / 1000, raf: summarize(gaps), draw: summarize(draws), cold,
        layers: layers?.stats, submissions, sceneCacheBytes: renderer.sceneCacheBytes ?? 0, sceneRetention: sceneRetention?.stats, groups: Object.entries(groups).map(([name, ms]) => ({name, msPerFrame: ms / gaps.length})).sort((a, b) => b.msPerFrame - a.msPerFrame),
        cache: cacheDelta(initial), memory: art.memorySummary(), operations, opaqueSurfaceBytes: [...opaqueSources.values()].reduce((sum,c)=>sum+c.width*c.height*4,0), frozenSurfaceBytes: frozenSurface ? canvas.width * canvas.height * 4 : 0,
        builds: [...art.groupCosts].map(([id, cost]) => ({id, ...cost})).sort((a, b) => b.milliseconds - a.milliseconds).slice(0, 10),
        gpu: art.gpuSummary(), audio: audio ? {state: audio.playbackState, sources: audio.activeSources, bytes: audio.memoryBytes} : null, hidden};
    } finally { art.clearCache(); renderer.clearSceneCache?.(); layers?.dispose(); sceneRetention?.dispose(); for (const surface of opaqueSources.values()) surface.width = surface.height = 0; frozenBitmap?.close(); if (frozenSurface) frozenSurface.width = frozenSurface.height = 0; if (audio) await audio.dispose(); }
  }, config);
}
