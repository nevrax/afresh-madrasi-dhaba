import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const timeline = id => JSON.parse(readFileSync(new URL(`../../assets/timelines/${id}.json`, import.meta.url), 'utf8'));
function instancesAt(data, target) {
  const instances = new Map();
  for (const event of data.events) {
    if (event.frame > target) break;
    if (event.type === 'remove') instances.delete(event.depth);
    if (event.type === 'place') instances.set(event.depth, event.move ? { ...instances.get(event.depth), ...event } : event);
  }
  return [...instances.values()];
}
test('source dosa spoon/shadow are present only before frame17, never on cooked held/plated food', () => {
  const dosa = timeline(472);
  assert.equal(timeline(270).frameCount, 60); assert.equal(timeline(263).frameCount, 299);
  for (const pose of [1, 16]) {
    const children = instancesAt(dosa, pose);
    assert.equal(children.find(c => c.name === 'thavi')?.symbolId, 270);
    assert.equal(children.find(c => c.name === 'mcShadow')?.symbolId, 263);
  }
  for (const pose of [17, 71, 159, 291, 327, 429, 495]) {
    assert.ok(instancesAt(dosa, pose).every(c => c.name !== 'thavi' && c.name !== 'mcShadow'), `pose ${pose}`);
  }
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' });
  game.dispatch({ type: 'pick-batter' }); game.advance(500); assert.equal(game.state.food.filter(Boolean).length, 0);
  game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.food[0].pose, 1);
  game.advance(70 * 1000 / 12); game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(36 * 1000 / 12);
  game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(500);
  assert.equal(game.state.food[0].pose, 327); assert.ok(instancesAt(dosa, game.state.food[0].pose).every(c => !['thavi', 'mcShadow'].includes(c.name)));
  game.dispatch({ type: 'click-plate' }); game.advance(500); assert.equal(game.state.plate[0].pose, 327);
});

test('cooked dosa retains one unnamed12-frame smoke child across the pickup range', () => {
  const dosa = timeline(472);
  assert.equal(timeline(223).frameCount, 12);
  assert.equal(instancesAt(dosa, 309).find(c => c.depth === 9), undefined);
  for (const pose of [310, 327, 429, 484]) {
    const smoke = instancesAt(dosa, pose).find(c => c.depth === 9);
    assert.equal(smoke.symbolId, 223); assert.equal(smoke.name, undefined);
  }
  assert.equal(instancesAt(dosa, 485).find(c => c.depth === 9), undefined);
});
