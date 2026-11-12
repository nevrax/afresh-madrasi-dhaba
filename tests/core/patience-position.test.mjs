import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

function ordering() {
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'background' });
  game.advance(16000); assert.equal(game.state.customers[0].patience, -66); return game;
}

test('fresh patience uses authored transform until OrderDosa explicitly resets it', () => {
  const timeline = JSON.parse(readFileSync(new URL('../../assets/timelines/357.json', import.meta.url), 'utf8'));
  const authored = timeline.firstFrame.instances.find(instance => instance.name === 'patienceMasker').matrix.ty;
  assert.equal(authored, -65.9);
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  assert.equal(game.state.customers[0].patience, authored);
  game.advance(14000); assert.equal(game.state.customers[0].patience, authored);
  game.advance(2000); assert.equal(game.state.customers[0].patience, -66);
});

test('reference patience sequence comes from truncating each _y write to twips', () => {
  const game = ordering();
  // Actual reference includes the uneven quarter-pixel increments after the second callback.
  for (const expected of [-65.8, -65.6, -65.35, -65.1, -64.85, -64.6, -64.35, -64.1]) {
    game.advance(100); assert.equal(game.state.customers[0].patience, expected);
  }
});

test('reference anger/loss boundaries use callback118/160 after ordering', () => {
  const game = ordering(); game.advance(11700);
  assert.equal(game.state.customers[0].patience, -40.05); assert.equal(game.state.customers[0].angry, false);
  game.advance(100); assert.equal(game.state.customers[0].patience, -39.8); assert.equal(game.state.customers[0].angry, true);
  game.advance(4100); assert.equal(game.state.customers[0].patience, -30.05); assert.equal(game.state.lostCustomers, 0);
  game.advance(100); assert.equal(game.state.customers[0].patience, -29.85); assert.equal(game.state.lostCustomers, 1);
});
