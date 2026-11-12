import type { LegacyScoreConfiguration } from './legacy-scores.js';

export interface ScoreConfiguration extends LegacyScoreConfiguration { gameId?: string | number }

/** Deployment-owned JSON only: query strings and browser storage cannot select POST destinations. */
export function readScoreConfiguration(text: string, baseUrl: string): ScoreConfiguration {
  const source: unknown = JSON.parse(text || '{}');
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Score configuration must be an object.');
  const data = source as Record<string, unknown>;
  const result: ScoreConfiguration = {};
  const url = (value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Score service URLs must be nonempty strings.');
    const parsed = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Score service URLs must use HTTP or HTTPS without embedded credentials.');
    return parsed.href;
  };
  if (data.endpoints !== undefined) {
    if (!data.endpoints || typeof data.endpoints !== 'object' || Array.isArray(data.endpoints)) throw new Error('Score endpoints must be an object.');
    result.endpoints = {};
    for (const kind of ['external', 'member', 'tournament', 'session'] as const) {
      const value = (data.endpoints as Record<string, unknown>)[kind];
      if (value !== undefined) result.endpoints[kind] = url(value);
    }
  }
  if (data.brandingUrl !== undefined) result.brandingUrl = url(data.brandingUrl);
  if (data.leaderboardUrl !== undefined) result.leaderboardUrl = url(data.leaderboardUrl);
  if (data.gameId !== undefined) {
    if (typeof data.gameId !== 'string' && (typeof data.gameId !== 'number' || !Number.isFinite(data.gameId))) throw new Error('Host game ID must be a string or finite number.');
    result.gameId = data.gameId;
  }
  if (data.timeoutMs !== undefined) {
    if (typeof data.timeoutMs !== 'number' || !Number.isFinite(data.timeoutMs) || data.timeoutMs <= 0) throw new Error('Score timeout must be positive.');
    result.timeoutMs = data.timeoutMs;
  }
  if (data.credentials !== undefined) {
    if (!['omit', 'same-origin', 'include'].includes(String(data.credentials))) throw new Error('Invalid score credentials mode.');
    result.credentials = data.credentials as RequestCredentials;
  }
  return result;
}
