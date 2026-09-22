import test from 'node:test';
import assert from 'node:assert/strict';
import { createPerformanceHud } from '../../.local-setup/build/modules/src/ui/performance-hud.js';

function setup(options = {}) {
  const counts = { writes: 0, clock: 0, memory: 0, renderer: 0, heap: 0 };
  class Element {
    children = []; style = {}; open = false; _text = null; _hidden = false;
    set textContent(value) { counts.writes++; this._text = value; this.children = []; }
    get textContent() { return this._text ?? this.children.map(child => child.textContent).join('\n'); }
    set hidden(value) { counts.writes++; this._hidden = value; }
    get hidden() { return this._hidden; }
    append(...children) { counts.writes++; this.children.push(...children); }
  }
  const clock = { now() { counts.clock++; return counts.clock * (options.resolution ?? .01); } };
  Object.defineProperty(clock, 'memory', { get() { counts.heap++; return options.heap; } });
  const document = { createElement: () => new Element(), body: new Element(), defaultView: { performance: clock } };
  const hud = createPerformanceHud({ ownerDocument: document }, () => {
    counts.memory++; if (options.unavailable) throw new Error('not measured');
    return { tiles: 2 * 1048576, pool: 1048576, filters: 3 * 1048576, audio: 4 * 1048576, scene: 5 * 1048576 };
  }, () => { counts.renderer++; if (options.unavailable) throw new Error('not measured'); return 'Canvas 2D with native GPU filters'; });
  const sample = (now, elapsedMs = 20, extra = {}) => hud.sample({ now, elapsedMs, simulationMs: 2, renderMs: 3, audioMs: 1, snapshotMs: 1, ...extra });
  return { hud, counts, sample, summary: () => hud.element.children[0].textContent, text: () => hud.element.textContent };
}

test('disabled samples perform no clock, argument, DOM or memory work; collapsed display skips expensive details', () => {
  const ui = setup(), before = { ...ui.counts };
  ui.hud.sample(new Proxy({}, { get() { throw new Error('disabled must not inspect sample'); } }));
  assert.equal(ui.hud.enabled, false); assert.deepEqual(ui.counts, before);
  ui.hud.setEnabled(true);
  for (let i = 1; i <= 50; i++) ui.sample(i * 20);
  assert.match(ui.summary(), /50\.0 FPS · 50 measured frames/);
  assert.equal(ui.counts.memory, 0); assert.equal(ui.counts.heap, 0); assert.equal(ui.counts.renderer, 0);
  ui.hud.setEnabled(false); const disabled = { ...ui.counts };
  ui.sample(2000); ui.hud.setEnabled(false); assert.deepEqual(ui.counts, disabled);
});

test('one-second window reports measured rates, p95, one-core work and separate memory/overhead without per-frame DOM updates', () => {
  const ui = setup({ heap: { usedJSHeapSize: 10 * 1048576, totalJSHeapSize: 20 * 1048576 } });
  ui.hud.setEnabled(true); ui.hud.element.open = true; const before = ui.counts.writes;
  for (let i = 1; i < 50; i++) ui.sample(i * 20);
  assert.equal(ui.counts.writes, before); assert.equal(ui.counts.memory, 0);
  ui.sample(1000);
  assert.match(ui.text(), /Window 1\.00 s \/ 50 frames · p95 20\.0 ms/);
  assert.match(ui.text(), /35\.0% of one core \(estimate\)/);
  assert.match(ui.text(), /simulation 2\.00 · render 3\.00 · audio 1\.00 · snapshot 1\.00/);
  assert.match(ui.text(), /HUD self-work: 0\.490 ms \/ 49 completed samples \(0\.010 ms\/sample\)/);
  assert.match(ui.text(), /JS heap: 10\.0 MiB used \/ 20\.0 MiB allocated \(shared, approximate\)/);
  assert.match(ui.text(), /tiles 2\.0 MiB · pool 1\.0 MiB · scene 5\.0 MiB · filter backing 3\.0 MiB · decoded audio 4\.0 MiB/);
  assert.match(ui.text(), /not total CPU/); assert.match(ui.text(), /not process RAM or VRAM/);
  const rendered = ui.counts.writes;
  for (let i = 51; i < 100; i++) ui.sample(i * 20);
  assert.equal(ui.counts.writes, rendered); assert.equal(ui.counts.memory, 1);
  ui.sample(2000); assert.equal(ui.counts.memory, 2); assert.equal(ui.counts.heap, 2); assert.equal(ui.counts.renderer, 2);
});

test('frame percentile uses only the bounded latest256 samples while FPS uses its complete update window', () => {
  const ui = setup(); ui.hud.setEnabled(true); ui.hud.element.open = true;
  let now = 0;
  for (let i = 0; i < 100; i++) ui.sample(now += 100, 100);
  assert.match(ui.text(), /p95 100\.0 ms/);
  for (let i = 0; i < 400; i++) ui.sample(now += 5, 5);
  assert.match(ui.summary(), /200\.0 FPS · 500 measured frames/);
  assert.match(ui.text(), /p95 5\.0 ms \(latest 256, up to 256\)/);
});

test('background gaps and backwards timestamps reset only the metric window with an explicit note', () => {
  const ui = setup(); ui.hud.setEnabled(true); ui.hud.element.open = true;
  for (let i = 1; i <= 50; i++) ui.sample(i * 20);
  ui.sample(6000, 5000, { simulationMs: 4000 });
  assert.match(ui.summary(), /— FPS · 51 measured frames/);
  assert.match(ui.text(), /gap 5\.00 s; window reset, catch-up sample excluded/);
  for (let i = 1; i <= 50; i++) ui.sample(6000 + i * 20);
  assert.match(ui.summary(), /50\.0 FPS · 101 measured frames/); assert.match(ui.text(), /35\.0% of one core/);
  ui.sample(100, 20); assert.match(ui.text(), /clock moved backwards; window reset/);
  for (let i = 1; i <= 50; i++) ui.sample(100 + i * 20);
  assert.match(ui.summary(), /50\.0 FPS · 152 measured frames/);
  ui.hud.setEnabled(false); ui.hud.setEnabled(true);
  assert.match(ui.summary(), /0 measured frames/); assert.doesNotMatch(ui.text(), /clock moved backwards/);
});

test('unavailable measurement APIs stay unavailable and coarse clocks never imply zero-cost HUD work', () => {
  const ui = setup({ unavailable: true, resolution: 0 }); ui.hud.setEnabled(true); ui.hud.element.open = true;
  for (let i = 1; i <= 50; i++) ui.sample(i * 20);
  assert.match(ui.text(), /JS heap: unavailable/); assert.match(ui.text(), /Managed memory: unavailable/);
  assert.match(ui.text(), /Renderer: unavailable/); assert.match(ui.text(), /HUD self-work: below timer resolution/);
});
