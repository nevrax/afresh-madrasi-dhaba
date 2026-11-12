import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalScores } from '../../.local-setup/build/modules/src/services/scores.js';

test('local score adapter recovers malformed storage, ranks valid results and propagates write failure', async () => {
  const previous = globalThis.localStorage; let value = '{broken';
  globalThis.localStorage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  try {
    const scores = new LocalScores(); assert.deepEqual(await scores.list(), []);
    await scores.submit({ name: ' Test ', score: 6, gameName: 'madrasidhaba' });
    await scores.submit({ name: 'Other', score: 10, gameName: 'madrasidhaba' });
    assert.deepEqual((await scores.list()).map(s => [s.name, s.score]), [['Other',10],['Test',6]]);
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    await assert.rejects(() => scores.submit({ name:'Test', score:12, gameName:'madrasidhaba' }), /quota/);
  } finally { globalThis.localStorage = previous; }
});
