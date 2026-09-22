import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Renderer } from '../../.local-setup/build/modules/src/render/renderer.js';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const read = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const catalog = read('assets/catalog.json'), pack = read('assets/vector/scene.json');

test('food cursor follows actionable source windows without another pointer move', async () => {
  const f=await fixture();
  try {
    const game=createGame({random:()=>0});game.dispatch({type:'start'});game.dispatch({type:'play'});
    const state=game.snapshot();state.pointer.x=300;
    state.food[0]={id:1,slot:0,phase:'first-side',elapsedMs:0,held:false,pose:70,smokePose:null};
    for(const [phase,pose,expected] of [['first-side',70,''],['first-side',71,'flip'],['first-side',159,'flip'],['first-side',160,''],['second-side',326,''],['second-side',327,'pickup'],['second-side',429,'pickup'],['second-side',430,'']]){
      Object.assign(state.food[0],{phase,pose});f.renderer.draw(state);assert.equal(f.renderer.foodCursor,expected,`${phase} ${pose}`);f.trace.length=0;
    }
    Object.assign(state.food[0],{phase:'first-side',pose:80});
    for(const mode of ['batter','dosa']){state.pointer.mode=mode;f.renderer.draw(state);assert.equal(f.renderer.foodCursor,'');}
    state.pointer.mode='blank';state.food[0].held=true;f.renderer.draw(state);assert.equal(f.renderer.foodCursor,'');
    state.food[0].held=false;f.renderer.draw(state);assert.equal(f.renderer.foodCursor,'flip');
    state.screen='menu';f.renderer.draw(state);assert.equal(f.renderer.foodCursor,'');
  }finally{f.restore();}
});

// Compare submitted geometry, effects, text and hit queries using real exported compositions.
// This isolates renderer orchestration; actual Canvas/GPU pixels are checked by browser tests.
async function fixture() {
  const previous = { fetch: globalThis.fetch, ResizeObserver: globalThis.ResizeObserver, devicePixelRatio: globalThis.devicePixelRatio };
  globalThis.fetch = async path => ({ ok: true, json: async () => read(path) });
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.devicePixelRatio = 1.5;
  const trace = [], lookups = new Map();
  const ctx = new Proxy({}, {
    get: (_, name) => (...args) => trace.push(['canvas', name, ...args]),
    set: (_, name, value) => { trace.push(['property', name, value]); return true; },
  });
  const vector = {
    placements(id, frame = 1) {
      lookups.set(id, (lookups.get(id) ?? 0) + 1);
      const frames = pack.symbols[id]?.frames;
      return frames?.[(Math.max(1, Math.floor(frame)) - 1) % frames.length] ?? [];
    },
    drawPlacement: (...args) => trace.push(['vector', ...args.slice(1)]),
    clearCache() {},
    setViewport() {},
    setSimplerEffects() {},
  };
  const assets = {
    vector, scenes: catalog.scenes,
    symbols: new Map(catalog.items.map(item => [item.symbolId, item])),
    names: new Map(catalog.items.flatMap(item => [item.id, item.name, ...item.exportNames].map(name => [name, item]))),
    preload: async () => {},
    placement(name, frame = 5) { return this.scenes.find(s => s.frame === frame)?.instances.find(p => p.name === name); },
    draw: (...args) => trace.push(['asset', ...args.slice(1)]),
    contains(...args) { trace.push(['contains', ...args]); return args[2] > 250; },
  };
  const renderer = new Renderer({ getContext: () => ctx, clientWidth: 550, clientHeight: 400, width: 825, height: 600 }, assets);
  // This fixture checks submitted source geometry. Retained-scene pixels and
  // invalidation are compared against a second real Canvas in the browser check.
  renderer.diagnosticFullSceneRedraw = true;
  try { await renderer.load(); } catch (error) { Object.assign(globalThis, previous); throw error; }
  return { renderer, assets, vector, trace, lookups, restore: () => Object.assign(globalThis, previous) };
}

test('Extra freezes only order decoration and keeps count, patience and customer hit targets live', async () => {
  const f=await fixture();
  try {
    const game=createGame({random:()=>0});game.dispatch({type:'start'});game.dispatch({type:'play'});
    const state=game.snapshot(),customer=state.customers[0];
    Object.assign(customer,{table:0,visible:true,characterVisible:true,orderVisible:true,characterPose:1,orderRemaining:3,patience:-50});
    state.timeMs=1250;
    f.renderer.setPresentation('classic');f.renderer.draw(state);
    const originalHits=JSON.stringify(f.renderer.hits);
    assert(f.trace.some(c=>c[0]==='asset'&&c[1]===-363&&c[3]>1));
    for(const [count,patience] of [[3,-50],[1,-20]]){
      customer.orderRemaining=count;customer.patience=patience;f.trace.length=0;
      const before=JSON.stringify(state);f.renderer.setPresentation('extra');f.renderer.draw(state);
      assert(f.trace.some(c=>c[0]==='asset'&&c[1]===-363&&c[3]===1));
      assert(f.trace.some(c=>c[0]==='asset'&&c[1]===355&&c[2].ty===patience));
      assert(f.trace.some(c=>c[0]==='canvas'&&c[1]==='fillText'&&c[2]===String(count)));
      assert.equal(JSON.stringify(f.renderer.hits),originalHits);assert.equal(JSON.stringify(state),before);
    }
    f.trace.length=0;f.renderer.setPresentation('classic');f.renderer.draw(state);
    assert(f.trace.some(c=>c[0]==='asset'&&c[1]===-363&&c[3]>1));
  } finally {f.restore();}
});

test('real scene submissions preserve authored effects, source holds and dynamic hit ordering', async () => {
  const f = await fixture();
  // The requested subpixel menu-edge extrusion is separately pixel-checked in
  // the browser (menu seam and day-result outer mask gaps); this digest
  // continues to compare the source scene submissions.
  f.renderer.closeMenuEdge=()=>{};
  f.renderer.closeDayEdges=()=>{};
  try {
    const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
    const state = game.snapshot();
    state.customers.forEach((c, i) => Object.assign(c, { table: i, visible: true, characterVisible: true, exitVisible: false, orderVisible: true, phase: 'ordering', orderRemaining: i % 4 + 1, patience: -50 - i, angry: i === 3, angrySinceMs: 0, characterPose: 1 }));
    const hashes = [];
    for (const screen of ['menu', 'instructions', 'playing', 'game-over', 'day-result']) {
      state.screen = screen;
      for (const step of [0, 1, 2]) {
        f.trace.length = 0;
        state.timeMs = step * 125; state.pointer.x = step === 1 ? 300 : 200;
        state.audio.enabled = step !== 2; state.cash = step * 17; state.lostCustomers = step; state.clockMinutes = 540 + step;
        state.tutorial.visible = screen === 'instructions' && step === 1;
        state.tutorial.elapsedMs = 250; state.tutorial.childElapsedMs = 750;
        state.customers[0].characterVisible = step !== 2; state.customers[0].exitVisible = step === 2; state.customers[0].exitPose = 4;
        f.renderer.pressedCommand = step === 1 ? JSON.stringify({ type: 'toggle-mute' }) : null;
        f.renderer.draw(state);
        f.trace.push(['hits', f.renderer.hits], ['hit', f.renderer.hit(state.pointer.x, 100)]);
        hashes.push(createHash('sha256').update(JSON.stringify(f.trace)).digest('hex'));
      }
    }
    // Captured from the pre-index renderer over these 15 real-source scene states.
    assert.equal(createHash('sha256').update(JSON.stringify(hashes)).digest('hex'), '7233162769bbfc12de3df5b30bee462066b8b5fbe1de0ea08994871653eae2fa');
  } finally { f.restore(); }
});

test('fixed scene metadata is indexed once while asset replacement and live poses remain effective', async t => {
  const f = await fixture();
  try {
    const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
    const state = game.snapshot();
    state.customers.forEach((c, i) => Object.assign(c, { table: i, visible: true, characterVisible: true, characterPose: 1, orderVisible: true }));
    const originalComposition = f.renderer.composition;
    // Same queried metadata without retention: isolates lookup counts from drawing/GPU cost.
    f.renderer.composition = id => new Map(f.assets.vector.placements(id).map(p => [p.depth, p]));
    for (let i = 0; i < 60; i++) { state.timeMs = i * 1000 / 60; f.renderer.draw(state); f.trace.length = 0; }
    const before = [...f.lookups.values()].reduce((a, b) => a + b, 0);
    f.lookups.clear(); f.renderer.composition = originalComposition;
    for (let i = 0; i < 60; i++) { state.timeMs = i * 1000 / 60; f.renderer.draw(state); f.trace.length = 0; }
    const after = [...f.lookups.values()].reduce((a, b) => a + b, 0);
    assert.equal(f.lookups.get(-1005), 1);
    for (const id of [413, 399, 400, 371, 385]) assert.equal(f.lookups.get(id), 1);
    assert.equal(after, 6); assert.ok(before > after * 60);
    t.diagnostic(JSON.stringify({ frames: 60, uncachedMetadataQueries: before, indexedMetadataQueries: after }));

    state.customers[0].characterPose = 2;
    state.pointer.x = 300;
    f.renderer.draw(state);
    const target = f.renderer.hits.find(hit => hit.label === 'Serve customer 1');
    assert.equal(target.frame, 2);
    assert.ok(f.trace.some(call => call[0] === 'contains' && call[3] === 300));

    // Reloading an asset pack must never retain old filters/colors from its predecessor.
    const oldSource = f.vector.placements(-1005);
    const sample = oldSource.find(p => p.id === 193);
    const tint = { alphaMultTerm: 128 };
    f.assets.vector = { ...f.vector, placements(id, frame) {
      const values = f.vector.placements(id, frame);
      return id === -1005 ? values.map(p => p.depth === sample.depth ? { ...p, colorTransform: tint } : p) : values;
    } };
    f.trace.length = 0; f.renderer.draw(state);
    assert.ok(f.trace.some(call => call[0] === 'vector' && call[1] === 193 && call[4].colorTransform === tint));
  } finally { f.restore(); }
});
