import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
const root = path.resolve(import.meta.dirname, '..');
const {chromium} = createRequire(import.meta.url)(path.join(root, '.local-setup/playwright/node_modules/playwright'));
const output = path.join(root, '.local-setup/logs/retained-submissions-check'); await mkdir(output, {recursive: true});
const context = await chromium.launchPersistentContext(path.join(root, '.local-setup/playwright-submission-check'), {
  executablePath: chromeExecutablePath(), headless: false, chromiumSandbox: true,
  viewport: {width: 1480, height: 1000}, deviceScaleFactor: 3,
  args: ['--use-angle=d3d11', '--force-high-performance-gpu'],
});
try {
  const page = context.pages()[0], errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
  const result = await page.evaluate(async () => {
    const {Assets} = await import('/build/modules/src/render/assets.js');
    const {Renderer} = await import('/build/modules/src/render/renderer.js');
    const {fixture} = await import('/build/modules/development/verification/component-study.js');
    const {retainSubmissions} = await import('/development/verification/retained-submissions-experiment.js');
    const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d', {alpha: false, willReadFrequently: true});
    const assets = new Assets(); await assets.load(); const renderer = new Renderer(canvas, assets); await renderer.load(); await document.fonts.ready;
    const art = assets.vector, baseline = art.draw;
    const stats = retainSubmissions(art, ctx), retained = art.draw, checks = [];
    for (const width of [880, 2200, 2970]) {
      canvas.style.width = width / devicePixelRatio + 'px'; canvas.style.height = width * 400 / 550 / devicePixelRatio + 'px';
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      for (const profile of ['classic', 'extra']) {
        renderer.setPresentation(profile);
        for (const screen of ['menu', 'instructions', 'playing', 'day-result', 'game-over']) {
          const state = fixture(); state.screen = screen;
          renderer.events([{type: 'screen', screen}], {...state, timeMs: 0});
          for (const time of [0, 725, 2250]) {
            state.timeMs = 16000 + time; state.pointer.x = 120 + time / 10;
            state.tutorial.visible = screen === 'instructions'; state.tutorial.elapsedMs = time; state.tutorial.childElapsedMs = time;
            state.customers.forEach((c,i) => {c.characterPose = 1 + Math.floor(time / 100); c.patience = -50 + time / 100; c.orderRemaining = i + 1;});
            art.draw = baseline; renderer.draw(state);
            const expected = ctx.getImageData(0, 0, canvas.width, canvas.height).data, hits = JSON.stringify(renderer.hits);
            art.draw = retained; renderer.draw(state); renderer.draw(state);
            const actual = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let different = 0, maxDelta = 0;
            for (let i = 0; i < actual.length; i++) { const delta = Math.abs(actual[i] - expected[i]); if (delta) different++; maxDelta = Math.max(maxDelta, delta); }
            checks.push({width, profile, screen, time, different, maxDelta, hitsEqual: hits === JSON.stringify(renderer.hits)});
          }
        }
      }
    }
    return {checks, stats};
  });
  await writeFile(path.join(output, 'results.json'), JSON.stringify({...result, errors}, null, 2));
  const failures = result.checks.filter(c => c.different || !c.hitsEqual);
  console.log(JSON.stringify({cases: result.checks.length, failures, stats: result.stats, errors}));
  assert.equal(failures.length, 0); assert.equal(errors.length, 0); assert(result.stats.hits > 0);
} finally { await context.close(); }
