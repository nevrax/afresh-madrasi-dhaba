import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const tick = 1000 / 12;
function playing() { const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' }); return game; }

test('undefined source Stop leaves hidden template playing, sounding and removing at frame284', () => {
  const game = playing();
  assert.deepEqual(game.state.batterTemplate, { available: true, playing: true, pose: 1 });
  assert.deepEqual(game.advance(4 * tick), [{ type: 'sound', name: 'sound-441' }]);
  assert.deepEqual(game.advance(31 * tick), [{ type: 'sound', name: 'sound-446', loop: 20 }]);
  game.advance(247 * tick);
  assert.equal(game.state.batterTemplate.pose, 283);
  const events = game.advance(tick);
  assert.deepEqual(game.state.batterTemplate, { available: false, playing: false, pose: 284 });
  assert.ok(events.some(e => e.type === 'cash' && e.amount === 0 && e.x === 1000 && e.y === 1000));
  assert.equal(game.state.cash, 0);
});

test('bowl after hidden template removal changes pointer but empty slot cannot create dosa', () => {
  const game = playing(); game.advance(283 * tick);
  game.dispatch({ type: 'pick-batter' }); assert.equal(game.state.pointer.mode, 'batter');
  game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.pointer.mode, 'blank');
  assert.equal(game.state.food[0], null); assert.equal(game.state.batterTemplate.available, false);
});

test('first timely bowl click resets and stops template even if batter is cancelled', () => {
  const game = playing(); game.advance(100 * tick); game.dispatch({ type: 'pick-batter' });
  assert.deepEqual(game.state.batterTemplate, { available: true, playing: false, pose: 1 });
  game.dispatch({ type: 'background' });
  const events = game.advance(200 * tick);
  assert.deepEqual(game.state.batterTemplate, { available: true, playing: false, pose: 1 });
  assert.ok(!events.some(e => e.type === 'cash' || e.name === 'sound-441' || e.name === 'sound-446'));
  game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot: 0 });
  assert.equal(game.state.food[0].pose, 1);
});

test('hidden template callbacks retain source stopAllSounds after muted startup', () => {
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'toggle-mute' });
  game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  assert.deepEqual(game.advance(4 * tick), [{ type: 'sound', name: 'sound-441' }, { type: 'stop-sounds' }]);
  assert.equal(game.state.audio.music, null);
});

test('retry constructs a fresh playing template after the old one was removed', () => {
  const game = playing(); game.advance(150000); assert.equal(game.state.screen, 'game-over');
  assert.equal(game.state.batterTemplate.available, false);
  game.dispatch({ type: 'retry' });
  assert.deepEqual(game.state.batterTemplate, { available: true, playing: true, pose: 1 });
});
