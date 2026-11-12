import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const tick = 1000 / 12;
function flipped() {
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot: 0 });
  game.advance(70 * tick); game.dispatch({ type: 'click-slot', slot: 0 }); return game;
}

test('smoke starts with source placement310 and advances through pickup327', () => {
  const game = flipped(); game.advance(18 * tick);
  assert.equal(game.state.food[0].pose, 309); assert.equal(game.state.food[0].smokePose, null);
  game.advance(tick); assert.equal(game.state.food[0].smokePose, 1);
  game.advance(17 * tick); assert.equal(game.state.food[0].pose, 327); assert.equal(game.state.food[0].smokePose, 6);
});

test('reference smoke advances while held, restarts on duplicate, and plays on frozen plate', () => {
  const game = flipped(); game.advance(36 * tick); game.dispatch({ type: 'click-slot', slot: 0 });
  game.advance(500); assert.equal(game.state.food[0].pose, 327); assert.equal(game.state.food[0].smokePose, 12);
  game.advance(tick); assert.equal(game.state.food[0].smokePose, 1);
  game.advance(5 * tick); assert.equal(game.state.food[0].smokePose, 6);
  game.dispatch({ type: 'click-plate' }); assert.equal(game.state.plate[0].pose, 327); assert.equal(game.state.plate[0].smokePose, 1);
  game.advance(500); assert.equal(game.state.plate[0].pose, 327); assert.equal(game.state.plate[0].smokePose, 7);
});

test('cancelling pickup preserves smoke phase independently of resumed parent progression', () => {
  const game = flipped(); game.advance(36 * tick); game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(500);
  game.dispatch({ type: 'background' }); game.advance(tick);
  assert.equal(game.state.food[0].pose, 328); assert.equal(game.state.food[0].smokePose, 1);
  game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(tick);
  assert.equal(game.state.food[0].pose, 328); assert.equal(game.state.food[0].smokePose, 2);
});

test('source removal485 stops smoke before dosa removal495', () => {
  const game = flipped(); game.advance(193 * tick); assert.equal(game.state.food[0].pose, 484);
  assert.notEqual(game.state.food[0].smokePose, null);
  game.advance(tick); assert.equal(game.state.food[0].pose, 485); assert.equal(game.state.food[0].smokePose, null);
});
