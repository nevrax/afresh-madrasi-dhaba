import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const initialPlate = { x: 25, y: 336.95 };
const initialCounter = { x: -0.65, y: 303.8 };
function playing() { const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' }); return game; }
function move(game, x, y) { game.dispatch({ type: 'move-pointer', x, y }); }
function ready(game) {
  game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(70 * 1000 / 12);
  game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(36 * 1000 / 12);
}

test('initial counter uses authored placement and picking up the plate waits for movement', () => {
  const game = playing(); move(game, 30, 337);
  assert.deepEqual(game.state.counterPosition, initialCounter);
  game.dispatch({ type: 'click-plate' }); game.advance(100);
  assert.equal(game.state.pointer.mode, 'plate'); assert.deepEqual(game.state.platePosition, initialPlate);
  move(game, 30, 337); assert.deepEqual(game.state.platePosition, initialPlate);
  move(game, 31, 338);
  assert.deepEqual(game.state.platePosition, { x: 31, y: 358 });
  assert.deepEqual(game.state.counterPosition, { x: 66, y: 313 });
});

test('AddDosaToPlate preserves release coordinates until a source move or reset relocates the stack', () => {
  const game = playing(); ready(game);
  game.dispatch({ type: 'click-slot', slot: 0 }); move(game, 35, 332); game.dispatch({ type: 'click-plate' });
  assert.deepEqual({ x: game.state.plate[0].x, y: game.state.plate[0].y }, { x: 35, y: 332 });
  assert.deepEqual(game.state.counterPosition, initialCounter);
  move(game, 40, 334); assert.equal(game.state.plate[0].x, 35);
  game.dispatch({ type: 'click-plate' }); move(game, 100, 399);
  assert.deepEqual(game.state.platePosition, { x: 100, y: 390 });
  assert.equal(game.state.plate[0].y, 419, 'only the plate is clamped, not its dosa children');
  assert.deepEqual(game.state.counterPosition, { x: 135, y: 374 });
  game.dispatch({ type: 'background' });
  assert.deepEqual(game.state.platePosition, initialPlate);
  assert.deepEqual({ x: game.state.plate[0].x, y: game.state.plate[0].y }, initialPlate);
  assert.deepEqual(game.state.counterPosition, { x: 60, y: 311.95 });
});

test('serving returns plate and surplus food to source center even when order is not yet visible', () => {
  const game = playing(); ready(game); game.dispatch({ type: 'click-slot', slot: 0 }); move(game, 35, 332); game.dispatch({ type: 'click-plate' });
  game.advance(14000 - game.state.timeMs); assert.equal(game.state.customers[0].orderVisible, false);
  game.dispatch({ type: 'click-plate' }); move(game, 250, 200); game.dispatch({ type: 'click-customer', customer: 0 });
  assert.equal(game.state.plate.length, 1); assert.deepEqual(game.state.platePosition, initialPlate);
  assert.deepEqual({ x: game.state.plate[0].x, y: game.state.plate[0].y }, initialPlate);
  assert.equal(game.state.pointer.mode, 'blank');
});

test('picking a cooked dosa while carrying leaves plate at its last location; retry restores authored positions', () => {
  const game = playing(); ready(game); game.dispatch({ type: 'click-plate' }); move(game, 180, 230);
  game.dispatch({ type: 'click-slot', slot: 0 }); move(game, 300, 300); game.dispatch({ type: 'background' });
  assert.deepEqual(game.state.platePosition, { x: 180, y: 250 });
  assert.deepEqual(game.state.counterPosition, { x: 215, y: 205 });
  game.advance(150000); assert.equal(game.state.screen, 'game-over'); game.dispatch({ type: 'retry' });
  assert.deepEqual(game.state.platePosition, initialPlate); assert.deepEqual(game.state.counterPosition, initialCounter);
});
