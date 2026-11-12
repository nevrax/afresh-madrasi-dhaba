import test from 'node:test';
import assert from 'node:assert/strict';
import { DeadlineQueue } from '../../.local-setup/build/modules/src/core/scheduler.js';

const order = (a, b) => a.at - b.at || a.id - b.id;
function drain(queue) { const values = []; while (queue.peek()) values.push(queue.pop()); return values; }

test('empty and single-job queues can be drained, retained and reused', () => {
  const queue = new DeadlineQueue();
  assert.equal(queue.peek(), undefined); assert.equal(queue.pop(), undefined);
  queue.retain(() => true);
  const job = { at: 250, id: 0 }; queue.push(job);
  assert.equal(queue.peek(), job); assert.equal(queue.pop(), job); assert.equal(queue.pop(), undefined);
  queue.push({ at: 500, id: 1 }); queue.retain(() => false); assert.equal(queue.peek(), undefined);
  queue.push(job); assert.equal(queue.pop(), job);
});

test('adversarial insertion and equal deadlines follow registration IDs, not heap shape', () => {
  const queue = new DeadlineQueue();
  const jobs = Array.from({ length: 2000 }, (_, id) => ({ at: id % 7 ? 250 : 250.00000001, id }));
  for (const job of [...jobs].reverse()) queue.push(job);
  assert.deepEqual(drain(queue), [...jobs].sort(order));
});

test('interleaved pushes, pops and generation retention match the previous sorted-array oracle', () => {
  const queue = new DeadlineQueue(); let expected = []; let seed = 8191; let id = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let step = 0; step < 6000; step++) {
    const operation = random() % 10;
    if (operation < 6) {
      const job = { at: random() % 23 * 250 / 3, id: id++, generation: random() % 3 ? step % 4 : null };
      queue.push(job); expected.push(job);
    } else if (operation < 9) {
      expected.sort(order);
      assert.equal(queue.peek(), expected[0]); assert.equal(queue.pop(), expected.shift());
    } else {
      const generation = step % 4;
      const keep = job => job.generation === null || job.generation === generation;
      queue.retain(keep); expected = expected.filter(keep);
    }
    expected.sort(order); assert.equal(queue.peek(), expected[0]);
  }
  assert.deepEqual(drain(queue), expected.sort(order));
});

test('retaining global jobs preserves orphan/cadence/session phase and same-time order', () => {
  const queue = new DeadlineQueue();
  const jobs = [
    { at: 250, id: 0, generation: null, name: 'cadence' },
    { at: 300, id: 1, generation: 7, name: 'day job' },
    { at: 300, id: 2, generation: null, name: 'old orphan' },
    { at: 1800000, id: 3, generation: null, name: 'session' },
    { at: 300, id: 4, generation: null, name: 'new orphan' },
    { at: 250, id: 5, generation: 7, name: 'another day job' },
  ];
  for (const job of jobs) queue.push(job);
  queue.retain(job => job.generation === null);
  assert.deepEqual(drain(queue), jobs.filter(job => job.generation === null).sort(order));
});

test('a running callback may clear a generation and enqueue equal-deadline work without overtaking older jobs', () => {
  const queue = new DeadlineQueue(); const trace = [];
  queue.push({ at: 100, id: 0, generation: 1, run() {
    trace.push('finish');
    queue.retain(job => job.generation === null);
    queue.push({ at: 100, id: 4, generation: 2, run: () => trace.push('new day') });
  } });
  queue.push({ at: 100, id: 1, generation: 1, run: () => trace.push('cancelled') });
  queue.push({ at: 100, id: 2, generation: null, run: () => trace.push('retained cadence') });
  queue.push({ at: 101, id: 3, generation: null, run: () => trace.push('later orphan') });
  while (queue.peek()) queue.pop().run();
  assert.deepEqual(trace, ['finish', 'retained cadence', 'new day', 'later orphan']);
});
