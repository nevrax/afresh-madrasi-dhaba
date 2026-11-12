import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

function leakedGame() {
  // Reuse customer0 on table1 while its original table0 and patience timer still exist.
  const choices = [0, 0, 0, 0, ...Array(100).fill(0), 0.21]; let i = 0;
  const game = createGame({ random: () => choices[i++] ?? 0 });
  game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'background' });
  game.advance(40000); assert.equal(game.state.screen, 'game-over');
  return game;
}

test('orphan source function timer is inert on result but rebinds to hidden customer after retry', () => {
  const game = leakedGame(); const cash = game.state.cash;
  game.advance(5075); assert.equal(game.state.screen, 'game-over'); assert.equal(game.state.cash, cash);
  assert.equal(game.state.lostCustomers, 5);
  game.dispatch({ type: 'retry' });
  assert.equal(game.state.customers[0].visible, false); assert.equal(game.state.customers[0].patience, -65.9);
  game.advance(24); assert.equal(game.state.customers[0].patience, -65.9);
  game.advance(1); assert.equal(game.state.customers[0].patience, -65.7);
  game.advance(200); assert.equal(game.state.customers[0].patience, -65.3);
  assert.equal(game.state.customers[0].visible, false);
});

test('ordinary completed timers leave no hidden customer changes after retry', () => {
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  game.advance(150000); assert.equal(game.state.screen, 'game-over'); game.dispatch({ type: 'retry' });
  game.advance(5000);
  assert.equal(game.state.customers[0].patience, -65.9); assert.equal(game.state.customers[0].visible, false);
});

test('a rebound orphan starts invisible customer anger before the first new arrival', () => {
  const game = leakedGame(); game.dispatch({ type: 'retry' });
  game.advance(11799); assert.equal(game.state.customers[0].angry, false);
  game.advance(1); assert.equal(game.state.customers[0].angry, true);
  // It is still hidden; the independent interval is not guarded by display visibility.
  assert.equal(game.state.customers[0].visible, false); assert.equal(game.state.customers[0].patience, -39.8);
});
