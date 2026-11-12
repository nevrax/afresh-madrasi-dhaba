import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

test('fixed14-second public input schedule serves12orders and retains cash24 after Tomorrow', () => {
  const game = createGame({ random: () => 0 });
  game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  const actions = [];
  for (let cycle = 0; cycle < 12; cycle++) {
    for (const [offset, name] of [[100, 'place'], [6100, 'flip'], [9100, 'pickup'], [10100, 'plate'], [16100, 'serve']]) {
      actions.push({ at: cycle * 14000 + offset, name, cycle });
    }
  }
  actions.sort((a, b) => a.at - b.at);
  let served = 0;
  for (const action of actions) {
    game.advance(action.at - game.state.timeMs);
    switch (action.name) {
      case 'place':
        game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot: 0 });
        assert.equal(game.state.food[0]?.pose, 1); break;
      case 'flip':
        assert.ok(game.state.food[0].pose >= 71 && game.state.food[0].pose <= 159);
        game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.food[0].pose, 291); break;
      case 'pickup':
        assert.ok(game.state.food[0].pose >= 327 && game.state.food[0].pose <= 429);
        game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.pointer.mode, 'dosa'); break;
      case 'plate':
        game.dispatch({ type: 'click-plate' }); assert.equal(game.state.plate.length, 1); break;
      case 'serve':
        assert.equal(game.state.customers[0].orderRemaining, 1);
        game.dispatch({ type: 'click-plate' }); game.dispatch({ type: 'click-customer', customer: 0 });
        assert.equal(game.state.plate.length, 0); assert.equal(game.state.customers[0].served, 1); served++; break;
    }
  }
  game.advance(180000 - game.state.timeMs);
  assert.equal(served, 12); assert.equal(game.state.cash, 24); assert.equal(game.state.lostCustomers, 0);
  assert.equal(game.state.clockMinutes, 720); assert.equal(game.state.screen, 'day-result');
  game.dispatch({ type: 'next-day' });
  assert.equal(game.state.day, 2); assert.equal(game.state.cash, 24); assert.equal(game.state.lostCustomers, 0);
});
