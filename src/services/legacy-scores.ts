import { legacyVerification } from './legacy-verification.js';

export const LEGACY_GAME_NAME = 'madrasidhaba';
export const LEGACY_LINKS = Object.freeze({
  branding: 'http://www.gamezindia.com/',
  leaderboard: 'http://www.gamezindia.com/external/external_highscore.php?gamename=madrasidhaba',
});
export const LEGACY_PATHS = Object.freeze({ external: '/external/submitscore_external.php', member: '/member/setscore.php', tournament: '/member/tournamentscore.php', session: '/member/sess_refresh.php' });
export type LegacyRequestKind = keyof typeof LEGACY_PATHS;
export interface LegacyRequest { kind: LegacyRequestKind; path: string; fields: Readonly<Record<string, string>>; body: string }
export interface ExternalScore { name: string; score: number | string; gameName?: string }
export interface MemberScore { gameId: number | string; tourId: number | string; score: number | string; points: number | string }
export interface LegacyResult { status: 'received'; postResult: string | null; fields: Readonly<Record<string, string>> }
export interface LegacyScoreConfiguration {
  /** No endpoints are configured by default. Supplying one is an explicit deployment choice. */
  endpoints?: Partial<Record<LegacyRequestKind, string>>;
  leaderboardUrl?: string;
  brandingUrl?: string;
  timeoutMs?: number;
  credentials?: RequestCredentials;
}
export type LegacyErrorCode = 'unavailable' | 'http' | 'network' | 'timeout' | 'cancelled' | 'response';
export class LegacyServiceError extends Error {
  constructor(readonly code: LegacyErrorCode, message: string) { super(message); this.name = 'LegacyServiceError'; }
}

function request(kind: LegacyRequestKind, fields: Record<string, string>): LegacyRequest {
  return { kind, path: LEGACY_PATHS[kind], fields, body: new URLSearchParams(fields).toString() };
}

/** Name is deliberately neither trimmed nor limited: source input572 defaults to noname
 * and defines no maxLength; sprite579 submits its text without a validation branch. */
export function externalScoreRequest(score: ExternalScore): LegacyRequest {
  const playerName = score.name;
  const playerScore = String(score.score);
  const gameName = score.gameName ?? LEGACY_GAME_NAME;
  return request('external', { playerName, playerScore, gameName, verify: legacyVerification(`${playerScore}|${playerName}|${gameName}`) });
}

export function memberScoreRequest(score: MemberScore): LegacyRequest {
  const gameID = String(score.gameId), tourID = String(score.tourId), playerPoint = String(score.points), playerScore = String(score.score);
  return request(Number(score.tourId) !== 0 ? 'tournament' : 'member', { gameID, tourID, playerPoint, playerScore, verify: legacyVerification(`${playerScore}|${playerPoint}|${gameID}`) });
}

export function sessionRefreshRequest(gameId: string | number): LegacyRequest { return request('session', { gameID: String(gameId) }); }

/** Only a deployment's explicit URLs are used for POSTs. Historical navigation URLs
 * are preserved separately; a configured transport is never mistaken for a working backend. */
export class LegacyScoreClient {
  readonly leaderboardUrl: string;
  readonly brandingUrl: string;
  constructor(readonly configuration: LegacyScoreConfiguration = {}, private readonly transport: typeof fetch = fetch) {
    this.leaderboardUrl = configuration.leaderboardUrl ?? LEGACY_LINKS.leaderboard;
    this.brandingUrl = configuration.brandingUrl ?? LEGACY_LINKS.branding;
  }
  available(kind: LegacyRequestKind = 'external'): boolean { return Boolean(this.configuration.endpoints?.[kind]); }
  submitExternal(score: ExternalScore, signal?: AbortSignal): Promise<LegacyResult> { return this.send(externalScoreRequest(score), signal); }
  submitMember(score: MemberScore, signal?: AbortSignal): Promise<LegacyResult> { return this.send(memberScoreRequest(score), signal); }
  refreshSession(gameId: string | number, signal?: AbortSignal): Promise<LegacyResult> { return this.send(sessionRefreshRequest(gameId), signal); }

  async send(payload: LegacyRequest, signal?: AbortSignal): Promise<LegacyResult> {
    const endpoint = this.configuration.endpoints?.[payload.kind];
    if (!endpoint) throw new LegacyServiceError('unavailable', 'Online scores are unavailable: no score service is configured.');
    if (signal?.aborted) throw new LegacyServiceError('cancelled', 'The score request was cancelled.');
    const controller = new AbortController();
    let timedOut = false;
    const cancel = (): void => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.configuration.timeoutMs ?? 15000);
    try {
      const response = await this.transport(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.body, credentials: this.configuration.credentials ?? 'same-origin', signal: controller.signal });
      if (!response.ok) throw new LegacyServiceError('http', `The score service returned HTTP ${response.status}.`);
      const contentType = response.headers.get('content-type') ?? '';
      const text = await response.text();
      if (contentType.includes('text/html') || /^\s*</.test(text)) throw new LegacyServiceError('response', 'The score service returned a page instead of a score response.');
      const fields = Object.fromEntries(new URLSearchParams(text));
      // The original merely traces postResult. No success code or leaderboard schema
      // exists in the SWF, so HTTP receipt must never be described as score acceptance.
      return { status: 'received', postResult: fields.postResult ?? null, fields };
    } catch (error) {
      if (error instanceof LegacyServiceError) throw error;
      if (timedOut) throw new LegacyServiceError('timeout', 'The score service did not respond in time. Submission status is unknown.');
      if (signal?.aborted) throw new LegacyServiceError('cancelled', 'The score request was cancelled. Submission status may be unknown.');
      throw new LegacyServiceError('network', 'The score service could not be reached. Submission status is unknown.');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
}

/** Source frame3 schedules 600000ms refreshes; frame7 also refreshes on next day.
 * The caller supplies time and the host's game ID; absence of either endpoint or
 * embedding context performs no network calls. It does not invent membership data. */
export class LegacySessionRefresher {
  private elapsed = 0;
  constructor(private readonly client: LegacyScoreClient, private readonly gameId?: string | number, private readonly observe: (result: LegacyResult | LegacyServiceError) => void = () => undefined) {}
  advance(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Session elapsed time must be finite and nonnegative.');
    this.elapsed += milliseconds;
    while (this.elapsed >= 600000) { this.elapsed -= 600000; this.refresh(); }
  }
  nextDay(): void { this.refresh(); }
  private refresh(): void {
    if (this.gameId === undefined || !this.client.available('session')) return;
    void this.client.refreshSession(this.gameId).then(this.observe, error => this.observe(error instanceof LegacyServiceError ? error : new LegacyServiceError('network', 'Session refresh failed.')));
  }
}
