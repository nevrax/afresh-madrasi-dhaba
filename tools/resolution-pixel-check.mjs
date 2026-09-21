// Compare full scene RGBA bytes and hit targets with fixed/adaptive cache limits.
// Readback is deliberately separate from timing benchmarks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromeExecutablePath } from './browser-path.mjs';
const root = path.resolve(import.meta.dirname, '..');
const { chromium } = createRequire(import.meta.url)(path.join(root, '.local-setup/playwright/node_modules/playwright'));
const output = path.join(root, '.local-setup/logs/resolution-pixels');
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(path.join(root, '.local-setup/playwright-resolution-pixels'), {
  executablePath: chromeExecutablePath(), headless: false, chromiumSandbox: true,
  viewport: { width: 1500, height: 1150 }, deviceScaleFactor: 2,
  args: ['--use-angle=d3d11', '--force-low-power-gpu'],
});
try {
  const page = context.pages()[0];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/resolution-pixels', route => route.fulfill({ contentType: 'text/html', body:
    '<!doctype html><base href="/"><style>body{margin:0;background:#222;color:white}canvas{display:block}</style><p>Full resolution pixel comparison</p><canvas></canvas>' }));
  await page.goto('http://127.0.0.1:5173/resolution-pixels');
  const checks = [];
  for (const width of [1485, 2200]) {
    const variants = [];
    for (const fixedBudget of [true, false]) {
      variants.push(await page.evaluate(async ({ width, fixedBudget }) => {
        const { Assets } = await import('/build/modules/src/render/assets.js');
        const { Renderer } = await import('/build/modules/src/render/renderer.js');
        const { fixture } = await import('/build/modules/development/verification/component-study.js');
        const canvas = document.querySelector('canvas');
        // Keep readback on one backend throughout; Chrome can otherwise switch
        // the destination from GPU to CPU partway through repeated captures.
        canvas.getContext('2d', { willReadFrequently: true });
        const resize = async w => {
          canvas.style.width = `${w / devicePixelRatio}px`;
          canvas.style.height = `${w * 400 / 550 / devicePixelRatio}px`;
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
        };
        await resize(width);
        const assets = new Assets(); await assets.load('low-power');
        const renderer = new Renderer(canvas, assets); await renderer.load(); await document.fonts.ready;
        if (fixedBudget) assets.vector.setViewport = () => {};
        const state = fixture(); renderer.events([{ type: 'screen', screen: 'playing' }], { ...state, timeMs: 0 });
        const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
        const frames = [];
        for (let pose = 0; pose < 47; pose++) {
          state.timeMs = 16000 + pose * 1000 / 12;
          state.customers.forEach(c => { c.characterPose = 1; c.phaseElapsedMs = pose * 1000 / 12; });
          state.food.forEach((d, i) => { if (d) { d.pose = i === 0 ? 71 + pose : 327; d.smokePose = i === 0 ? null : pose % 12 + 1; } });
          state.plate[0].smokePose = pose % 12 + 1;
          renderer.draw(state);
          frames.push({ pixels: await hash(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data), hits: JSON.stringify(renderer.hits) });
        }
        // Resize away and back: no stale density or hit mapping may survive.
        await resize(550); renderer.draw(state);
        await resize(width); renderer.draw(state);
        const restored = { pixels: await hash(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data), hits: JSON.stringify(renderer.hits) };
        assets.vector.clearCache();
        return { frames, restored, canvas: [canvas.width, canvas.height] };
      }, { width, fixedBudget }));
      await page.reload();
    }
    assert.deepEqual(variants[0].frames.map((frame, i) => ({ pose: i, pixelsEqual: frame.pixels === variants[1].frames[i].pixels, hitsEqual: frame.hits === variants[1].frames[i].hits })),
      variants[0].frames.map((_, i) => ({ pose: i, pixelsEqual: true, hitsEqual: true })), `Cache policy changed pixels or hit targets at ${width}`);
    assert.deepEqual(variants[1].frames.at(-1), variants[1].restored, 'Resize changed restored scene');
    checks.push({ canvas: variants[1].canvas, matchedScenes: 47, resizeRestored: true, pixelsAndHitsEqual: true });
    console.log(JSON.stringify(checks.at(-1)));
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ status: 'PASS', checks, errors }, null, 2));
} finally { await context.close(); }
