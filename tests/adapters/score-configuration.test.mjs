import test from 'node:test';
import assert from 'node:assert/strict';
import { readScoreConfiguration } from '../../.local-setup/build/modules/src/services/score-configuration.js';
import { LegacyScoreClient } from '../../.local-setup/build/modules/src/services/legacy-scores.js';

test('standalone configuration has no POST destinations; explicit host configuration resolves relative routes', () => {
  const base = 'https://example.test/game/index.html';
  const defaults = readScoreConfiguration('{}', base);
  assert.deepEqual(defaults, {}); assert.equal(new LegacyScoreClient(defaults).available(), false);
  assert.deepEqual(readScoreConfiguration(JSON.stringify({ endpoints: { external: '/scores', session: './session' }, gameId: 0, credentials: 'omit' }), base), {
    endpoints: { external: 'https://example.test/scores', session: 'https://example.test/game/session' }, gameId: 0, credentials: 'omit',
  });
});

test('malformed deployments cannot introduce executable links, credential URLs or invalid timeout/context', () => {
  for (const data of [null, [], { endpoints: [] }, { endpoints: { external: '' } }, { brandingUrl: 'javascript:alert(1)' }, { leaderboardUrl: 'https://name:password@example.test' }, { timeoutMs: -1 }, { gameId: {} }, { credentials: 'arbitrary' }]) {
    assert.throws(() => readScoreConfiguration(JSON.stringify(data), 'https://example.test/'));
  }
});
