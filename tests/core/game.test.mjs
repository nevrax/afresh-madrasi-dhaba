import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../.local-setup/build/modules/src/core/game.js';

const tick = 1000 / 12;
function playing(options = {}) { const game = createGame({ random: () => 0, ...options }); game.dispatch({ type: 'start' }); game.dispatch({ type: 'play' }); return game; }
function place(game, slot = 0) { game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot }); }
function cook(game, count = 1) {
  for (let slot = 0; slot < count; slot++) place(game, slot);
  game.advance(70 * tick);
  for (let slot = 0; slot < count; slot++) game.dispatch({ type: 'click-slot', slot });
  game.advance(36 * tick);
  for (let slot = 0; slot < count; slot++) { game.dispatch({ type: 'click-slot', slot }); game.dispatch({ type: 'click-plate' }); }
}
function serve(game, id = 0) { game.dispatch({ type: 'click-plate' }); return game.dispatch({ type: 'click-customer', customer: id }); }
function botStep(game, slotCount = 18) {
  const before = game.state;
  for (let slot = 0; slot < slotCount; slot++) {
    const d = before.food[slot];
    if (!d) place(game, slot);
    else if (d.pose >= 71 && d.pose < 160) game.dispatch({ type: 'click-slot', slot });
    else if (d.pose >= 327 && d.pose < 430) { game.dispatch({ type: 'click-slot', slot }); game.dispatch({ type: 'click-plate' }); }
  }
  const after = game.state;
  for (const c of after.customers) if (c.phase === 'ordering' && after.plate.length) serve(game, c.id);
  return game.advance(tick);
}
function finishWithBot(game) { let steps = 0; while (game.state.screen === 'playing' && steps++ < 2200) botStep(game); assert.equal(game.state.screen, 'day-result'); }

test('screen flow, tutorial Skip starts gameplay, snapshots do not mutate simulation', () => {
  const game = createGame();
  assert.equal(game.state.screen, 'menu'); game.dispatch({ type: 'start' }); game.dispatch({ type: 'show-tutorial' });
  game.advance(1000); assert.equal(game.state.tutorial.visible, true);
  game.dispatch({ type: 'skip-tutorial' }); assert.equal(game.state.screen, 'playing');
  const copy = game.snapshot(); copy.cash = 99; copy.food[0] = {};
  assert.equal(game.state.cash, 0); assert.equal(game.state.food[0], null);
});
test('menu root timeline sound is emitted once, without consuming random choices', () => {
  let randomCalls = 0; const game = createGame({ random: () => { randomCalls++; return 0; } });
  assert.deepEqual(game.advance(0), [{ type: 'sound', name: 'bgMusic2', loop: 1, volume: 100 }]);
  assert.deepEqual(game.advance(0), []); assert.equal(game.state.audio.music, 2); assert.equal(randomCalls, 0);
  const muted = createGame(); const events = muted.dispatch({ type: 'toggle-mute' });
  assert.equal(events[0].type, 'sound'); assert.equal(events.at(-1).type, 'stop-sounds'); assert.deepEqual(muted.advance(0), []);
});
test('flip lower boundary and readiness lower boundary are exact', () => {
  const game = playing(); place(game); game.advance(69 * tick);
  game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.food[0].phase, 'first-side');
  game.advance(tick); game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.food[0].pose, 291);
  game.advance(35 * tick); game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.pointer.mode, 'blank');
  game.advance(tick); game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.pointer.mode, 'dosa');
  assert.equal(game.state.food[0].pose, 327);
});
test('last valid flip and pickup ticks are included, following ticks are excluded', () => {
  for (const [age, valid] of [[158, true], [159, false]]) {
    const game = playing(); place(game); game.advance(age * tick); game.dispatch({ type: 'click-slot', slot: 0 });
    assert.equal(game.state.food[0].phase === 'second-side', valid);
  }
  for (const [age, valid] of [[138, true], [139, false]]) {
    const game = playing(); place(game); game.advance(70 * tick); game.dispatch({ type: 'click-slot', slot: 0 });
    game.advance(age * tick); game.dispatch({ type: 'click-slot', slot: 0 }); assert.equal(game.state.pointer.mode === 'dosa', valid);
  }
});
test('held food freezes, cancellation resumes, plated food stays frozen', () => {
  const game = playing(); place(game); game.advance(70 * tick); game.dispatch({ type: 'click-slot', slot: 0 }); game.advance(36 * tick); game.dispatch({ type: 'click-slot', slot: 0 });
  game.advance(5000); assert.equal(game.state.food[0].pose, 327);
  game.dispatch({ type: 'background' }); game.advance(tick); assert.equal(game.state.food[0].pose, 328);
  game.dispatch({ type: 'click-slot', slot: 0 }); game.dispatch({ type: 'click-plate' }); game.advance(5000);
  assert.equal(game.state.plate[0].pose, 328); assert.equal(game.state.food[0], null);
});
test('both burn paths remove at exact source callback boundaries and cash cannot go below zero', () => {
  const game = playing(); place(game); game.advance(282 * tick); assert.ok(game.state.food[0]); game.advance(tick); assert.equal(game.state.food[0], null); assert.equal(game.state.cash, 0);
  const flipped = playing(); place(flipped); flipped.advance(70 * tick); flipped.dispatch({ type: 'click-slot', slot: 0 }); flipped.advance(203 * tick); assert.ok(flipped.state.food[0]); flipped.advance(tick); assert.equal(flipped.state.food[0], null);
});
test('customer order delay, empty/partial/surplus serving, delayed payment and table release', () => {
  let calls = 0;
  // First choice is music, then character/table, then quantity 4.
  const game = playing({ random: () => ++calls === 4 ? 0.99 : 0 }); cook(game, 2);
  game.advance(14000 - game.state.timeMs); assert.equal(game.state.customers[0].phase, 'waiting-order');
  serve(game); assert.equal(game.state.plate.length, 2);
  game.advance(2000); assert.equal(game.state.customers[0].orderRemaining, 4);
  serve(game); assert.equal(game.state.customers[0].served, 2); assert.equal(game.state.customers[0].orderRemaining, 2); assert.equal(game.state.customers[0].patience, -78);
  serve(game); assert.equal(game.state.customers[0].orderRemaining, 2);
  cook(game, 3); const before = game.state.customers[0].patience; serve(game);
  assert.equal(game.state.plate.length, 1); assert.equal(game.state.customers[0].patience, before - 18); assert.equal(game.state.customers[0].phase, 'eating'); assert.equal(game.state.cash, 0);
  game.advance(13000); assert.equal(game.state.cash, 8); assert.equal(game.state.customers[0].phase, 'absent'); assert.equal(game.state.tables[0], null);
});
test('payment waits for 3 eating cycles per dosa and vacancy waits for exit', () => {
  const game = playing(); cook(game); game.advance(16000 - game.state.timeMs); serve(game);
  game.advance(34 * tick); assert.equal(game.state.cash, 0); game.advance(tick);
  assert.equal(game.state.cash, 2); assert.equal(game.state.customers[0].phase, 'exiting'); assert.equal(game.state.tables[0], 0);
  game.advance(5 * tick); assert.equal(game.state.tables[0], 0); game.advance(tick); assert.equal(game.state.tables[0], null);
});
test('all five character identities retain their distinct eating callback periods', () => {
  for (const [id, cycle] of [12, 10, 20, 9, 20].entries()) {
    let choices = 0;
    const game = playing({ random: () => ++choices === 2 ? (id + 0.01) / 5 : 0 });
    cook(game); game.advance(16000 - game.state.timeMs); serve(game, id);
    game.advance((cycle * 3 - 2) * tick); assert.equal(game.state.cash, 0, `customer ${id}`);
    game.advance(tick); assert.equal(game.state.cash, 2, `customer ${id}`); assert.equal(game.state.customers[id].phase, 'exiting');
  }
});
test('patience truncates every source MovieClip position assignment and fifth loss stops all day activity', () => {
  const game = playing(); game.advance(31999); assert.equal(game.state.lostCustomers, 0); game.advance(1); assert.equal(game.state.lostCustomers, 1);
  game.advance(120000); assert.equal(game.state.screen, 'game-over'); assert.equal(game.state.lostCustomers, 5);
  const cash = game.state.cash; game.advance(60000); assert.equal(game.state.cash, cash); assert.ok(game.state.customers.every(c => c.phase === 'absent'));
  game.dispatch({ type: 'retry' }); assert.equal(game.state.day, 1); assert.equal(game.state.lostCustomers, 0); assert.equal(game.state.clockMinutes, 540);
  game.advance(14000); assert.equal(game.state.customers.filter(c => c.phase !== 'absent').length, 1);
});
test('anger smoke latches through partial-service patience recovery and clears on complete service', () => {
  let calls = 0; const game = playing({ random: () => ++calls === 4 ? 0.99 : 0 });
  cook(game); game.advance(27800 - game.state.timeMs); assert.equal(game.state.customers[0].angry, true);
  const angryStart = game.state.customers[0].angrySinceMs; assert.equal(angryStart, 27800);
  serve(game); assert.ok(game.state.customers[0].patience < -40); assert.equal(game.state.customers[0].angry, true); assert.equal(game.state.customers[0].angrySinceMs, angryStart);
  // Serving the remaining quantity promptly requires a pre-cooked batch; this second scenario checks full completion.
  calls = 0; const full = playing({ random: () => ++calls === 4 ? 0.99 : 0 }); cook(full, 4); full.advance(27800 - full.state.timeMs);
  assert.equal(full.state.customers[0].angry, true); serve(full); assert.equal(full.state.customers[0].phase, 'eating'); assert.equal(full.state.customers[0].angry, false);
});
test('advance chunk size never changes simulation state or event ordering', () => {
  const a = playing(), b = playing(); place(a); place(b);
  const eventsA = a.advance(30000), eventsB = [];
  for (let i = 0; i < 1800; i++) eventsB.push(...b.advance(1000 / 60));
  const aState = a.snapshot(), bState = b.snapshot(); delete aState.timeMs; delete bState.timeMs;
  assert.deepEqual(aState, bState); assert.deepEqual(eventsA, eventsB);
});
test('mute preserves legacy ungated serve and food callback stop-all behavior', () => {
  const game = createGame({ random: () => 0 }); game.dispatch({ type: 'toggle-mute' }); game.dispatch({ type: 'start' });
  const start = game.dispatch({ type: 'play' }); assert.ok(start.some(e => e.type === 'sound' && e.name === 'bgMusic1')); assert.equal(game.state.audio.enabled, false);
  place(game); const cooking = game.advance(4 * tick); assert.ok(cooking.some(e => e.type === 'stop-sounds'));
  game.advance(16000 - game.state.timeMs); assert.ok(serve(game).some(e => e.type === 'sound' && e.name === 'serve'));
});
test('food frying sound preserves authored20-loop and15-loop SOUNDINFO counts', () => {
  const game = playing(); place(game);
  const first = game.advance(35 * tick).filter(e => e.type === 'sound');
  assert.deepEqual(first, [{ type: 'sound', name: 'sound-441' }, { type: 'sound', name: 'sound-446', loop: 20 }]);
  game.advance(35 * tick); game.dispatch({ type: 'click-slot', slot: 0 });
  const second = game.advance(12 * tick).filter(e => e.type === 'sound');
  assert.deepEqual(second, [{ type: 'sound', name: 'sound-468' }, { type: 'sound', name: 'sound-446', loop: 15 }]);
});
test('score submission emits an adapter request only once, never performs networking', () => {
  const game = playing(); game.advance(160000);
  assert.deepEqual(game.dispatch({ type: 'submit-score', name: 'Player' }), [{ type: 'score-request', name: 'Player', score: 0, gameName: 'madrasidhaba' }]);
  assert.deepEqual(game.dispatch({ type: 'submit-score', name: 'Again' }), []);
});
test('invalid inputs and invalid clock increments do not corrupt state', () => {
  const game = playing(); game.dispatch({ type: 'pick-batter' }); game.dispatch({ type: 'click-slot', slot: -1 }); game.dispatch({ type: 'click-slot', slot: 18 });
  assert.equal(game.state.pointer.mode, 'batter'); assert.ok(game.state.food.every(d => d === null));
  assert.throws(() => game.advance(-1), RangeError); assert.throws(() => game.advance(NaN), RangeError);
  game.dispatch({ type: 'move-pointer', x: NaN, y: 2 }); assert.equal(game.state.pointer.x, 0);
});
test('cumulative day progression, day 7/8/9 diagnostic policy, and complete day cleanup', () => {
  const game = playing(); let priorCash = 0;
  for (let day = 1; day <= 8; day++) {
    finishWithBot(game); assert.equal(game.state.clockMinutes, 720); assert.equal(game.state.day, day);
    assert.ok(game.state.cash > priorCash); priorCash = game.state.cash;
    assert.equal(game.state.plate.length, 0); assert.ok(game.state.food.every(d => !d)); assert.ok(game.state.tables.every(t => t === null));
    const events = game.dispatch({ type: 'next-day' }); assert.equal(game.state.cash, priorCash); assert.equal(game.state.lostCustomers, 0);
    assert.equal(events.some(e => e.type === 'diagnostic' && e.code === 'non-positive-spawn-interval'), day >= 7);
    if (day >= 7) {
      assert.ok(events.find(e => e.type === 'diagnostic').message.includes('interval uses 10 ms'));
      game.advance(9); assert.ok(game.state.customers.every(c => !c.visible));
      game.advance(1); assert.equal(game.state.customers.filter(c => c.visible).length, 1);
    }
  }
  assert.equal(game.state.day, 9); game.advance(tick); assert.equal(game.state.customers.filter(c => c.phase !== 'absent').length, 1);
});
test('bounded random search retains its visible-character fallback and old occupied table', () => {
  const choices = [0, 0, 0, 0, ...Array(100).fill(0), 0.21]; let index = 0;
  const game = playing({ random: () => choices[index++] ?? 0 }); game.advance(28000);
  assert.equal(game.state.customers[0].table, 1); assert.equal(game.state.customers[0].phase, 'waiting-order');
  assert.deepEqual(game.state.tables.slice(0, 2), [0, 0]); assert.equal(index, choices.length);
});
test('forced visible-customer reuse retains old patience and allows two live patience intervals', () => {
  const choices = [0, 0, 0, 0, ...Array(100).fill(0), 0.21]; let index = 0;
  const game = playing({ random: () => choices[index++] ?? 0 }); game.advance(28000);
  assert.ok(game.state.customers[0].patience > -43); // Appear did not reset the old meter to -66.
  game.advance(2000); const before = game.state.customers[0].patience;
  assert.equal(before, -65.8); game.advance(100); assert.equal(game.state.customers[0].patience, -65.35);
  game.advance(10000); assert.equal(game.state.screen, 'game-over'); assert.equal(game.state.lostCustomers, 5);
});
test('serving a reused customer cancels only the most recent patience handle', () => {
  const choices = [0, 0, 0, 0, ...Array(100).fill(0), 0.21]; let index = 0;
  const game = playing({ random: () => choices[index++] ?? 0 }); cook(game); game.advance(30000 - game.state.timeMs); serve(game);
  assert.equal(game.state.customers[0].characterPlaying, true); assert.equal(game.state.customers[0].orderVisible, false);
  const before = game.state.customers[0].patience; game.advance(100);
  assert.equal(game.state.customers[0].patience, Math.trunc((before + 0.2) * 20) / 20);
});
test('Appear stops a reused eating character at its current pose instead of rewinding it', () => {
  const choices = [0, 0.41, 0, 0.99, ...Array(100).fill(0.41), 0.21]; let index = 0;
  const game = playing({ random: () => choices[index++] ?? 0 }); cook(game, 5); game.advance(16000 - game.state.timeMs); serve(game, 2);
  game.advance(11999); const pose = game.state.customers[2].characterPose; assert.notEqual(pose, 1);
  game.advance(1); const reused = game.state.customers[2]; assert.equal(reused.phase, 'waiting-order'); assert.equal(reused.characterPlaying, false); assert.equal(reused.characterPose, pose);
  assert.equal(reused.table, 1); assert.deepEqual(game.state.tables.slice(0, 2), [2, 2]);
});
test('repeatedly selecting an occupied table exhausts attempts without spawning', () => {
  const game = playing(); game.advance(14000); const before = game.snapshot();
  game.advance(14000); assert.equal(game.state.customers[0].table, before.customers[0].table);
  assert.equal(game.state.customers[0].phase, 'ordering'); assert.equal(game.state.tables.filter(t => t !== null).length, 1);
});
test('day end wins its exact tie with food removal under documented FIFO timer policy', () => {
  const game = playing();
  for (let step = 0; step < 1877; step++) botStep(game, 17);
  place(game, 17);
  for (let step = 0; step < 282; step++) botStep(game, 17);
  assert.equal(game.state.food[17].pose, 283); const beforeCash = game.state.cash;
  const events = botStep(game, 17);
  assert.equal(game.state.clockMinutes, 720); assert.equal(game.state.screen, 'day-result');
  assert.equal(game.state.cash, beforeCash); assert.ok(!events.some(e => e.type === 'cash' && e.amount < 0));
  const result = game.snapshot(); assert.deepEqual(game.advance(tick), []); assert.equal(game.state.cash, result.cash);
});
test('day end wins simultaneous patience expiry and cleanup prevents later losses', () => {
  const game = playing();
  for (let day = 1; day < 5; day++) { finishWithBot(game); game.dispatch({ type: 'next-day' }); }
  const start = game.state.timeMs;
  // Day5 spawns every6s. The customer appearing at162s orders at164s and expires at180s.
  while (game.state.timeMs - start < 162000 - 0.001) botStep(game);
  assert.equal(game.state.customers[0].phase, 'waiting-order');
  game.advance(18000); assert.equal(game.state.screen, 'day-result'); assert.equal(game.state.lostCustomers, 0);
  game.advance(1000); assert.equal(game.state.lostCustomers, 0);
});
test('session refresh continues independently of day timers every600000ms', () => {
  const game = createGame(); assert.ok(!game.advance(599999).some(e => e.type === 'session-refresh'));
  assert.deepEqual(game.advance(1), [{ type: 'session-refresh' }]);
});
