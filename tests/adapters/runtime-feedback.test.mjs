import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalAudio, runtimeFeedback } from '../../.local-setup/build/modules/src/ui/runtime-feedback.js';

test('fatal startup and post-loading errors both become visible instead of leaving a silently frozen canvas', () => {
  const loading = { hidden: false, textContent: 'Loading' }, status = { hidden: true, textContent: '' };
  const ui = runtimeFeedback(loading, status);
  ui.failed(); assert.equal(loading.hidden, false); assert.match(loading.textContent, /could not load/);
  const ready = runtimeFeedback(loading, status); ready.ready(); assert.equal(loading.hidden, true);
  ready.failed(); assert.equal(loading.hidden, false); assert.match(loading.textContent, /stopped unexpectedly/);
});

test('actual font/image/sound failures are visible while the source missing serve export is not called a failed download', () => {
  const loading = {}, status = { hidden: true, textContent: '' };
  const ui = runtimeFeedback(loading, status), known = new Map([['bgMusic1', {}]]);
  ui.resources(new Set(), new Set(['serve']), known); assert.equal(status.hidden, true);
  ui.resources(new Set(['font.woff']), new Set(['bgMusic1']), known);
  assert.equal(status.hidden, false); assert.match(status.textContent, /pictures or fonts/); assert.match(status.textContent, /sounds/);
  ui.resources(new Set(), new Set(), known); assert.equal(status.hidden, true);
});

test('unsupported audio cannot abort the caller or repeatedly try broken setup', () => {
  let attempts = 0, unavailable = 0;
  const loading = {}, status = { hidden: true, textContent: '' }, ui = runtimeFeedback(loading, status);
  const audio = optionalAudio(() => { unavailable++; ui.audioUnavailable(); });
  const unsupported = () => { attempts++; throw new Error('AudioContext is disabled'); };
  assert.doesNotThrow(() => audio(unsupported)); audio(unsupported);
  assert.equal(attempts, 1); assert.equal(unavailable, 1); assert.equal(status.hidden, false);
  assert.match(status.textContent, /Sound is unavailable/);
  ui.resources(new Set(), new Set(), new Map()); assert.match(status.textContent, /Sound is unavailable/);
});
