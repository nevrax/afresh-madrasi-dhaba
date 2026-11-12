import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const tick = 1000 / 12;
const ticks = ms => Math.round(ms * 12 / 1000);
function instructions() { const game = createGame(); game.dispatch({ type: 'start' }); return game; }

test('hidden tutorial runs from instructions entry and HowToPlay only rewinds parent', () => {
  const game = instructions(); game.advance(500);
  assert.equal(game.state.tutorial.visible, false);
  assert.equal(ticks(game.state.tutorial.elapsedMs), 6); assert.equal(ticks(game.state.tutorial.childElapsedMs), 6);
  game.dispatch({ type: 'show-tutorial' });
  assert.equal(game.state.tutorial.visible, true); assert.equal(game.state.tutorial.elapsedMs, 0);
  assert.equal(ticks(game.state.tutorial.childElapsedMs), 6);
});

test('reference335-to1 loop retains continuous radio and nested child ages', () => {
  const game = instructions(); game.advance(tick); game.dispatch({ type: 'show-tutorial' });
  game.advance(334 * tick);
  assert.equal(ticks(game.state.tutorial.elapsedMs) % 335 + 1, 335);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 20 + 1, 16);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 27 + 1, 12);
  game.advance(tick);
  assert.equal(ticks(game.state.tutorial.elapsedMs) % 335 + 1, 1);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 20 + 1, 17);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 27 + 1, 13);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 130 + 1, 77);
  assert.equal(ticks(game.state.tutorial.childElapsedMs) % 170 + 1, 167);
});

test('replaying HowToPlay retains children and Skip stops both removed tutorial clocks', () => {
  const game = instructions(); game.advance(500); game.dispatch({ type: 'show-tutorial' }); game.advance(500);
  game.dispatch({ type: 'show-tutorial' });
  assert.equal(game.state.tutorial.elapsedMs, 0); assert.equal(ticks(game.state.tutorial.childElapsedMs), 12);
  game.advance(500); const before = game.state.tutorial;
  game.dispatch({ type: 'skip-tutorial' }); game.advance(500);
  assert.equal(game.state.screen, 'playing'); assert.equal(game.state.tutorial.visible, false);
  assert.equal(game.state.tutorial.elapsedMs, before.elapsedMs); assert.equal(game.state.tutorial.childElapsedMs, before.childElapsedMs);
});

test('instructions preserve the globally anchored12Hz cadence', () => {
  const game = createGame(); game.advance(50); game.dispatch({ type: 'start' });
  game.advance(33); assert.equal(game.state.tutorial.childElapsedMs, 0);
  game.advance(1); assert.equal(ticks(game.state.tutorial.childElapsedMs), 1);
});
