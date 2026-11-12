export interface Score { name: string; score: number; gameName: string }
export interface ScoreService { submit(score: Score): Promise<void>; list(): Promise<Score[]> }

/** Explicit local adapter. The legacy online service remains a separate unresolved integration. */
export class LocalScores implements ScoreService {
  private readonly key = 'madrasi-dhaba.scores.v1';
  async list(): Promise<Score[]> {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(this.key) || '[]');
      if (!Array.isArray(data)) return [];
      return data.filter((v): v is Score => typeof v?.name === 'string' && typeof v?.score === 'number' && Number.isFinite(v.score) && v.gameName === 'madrasidhaba').slice(0, 100);
    } catch { return []; }
  }
  async submit(score: Score): Promise<void> {
    if (!score.name.trim() || !Number.isFinite(score.score)) throw new Error('Enter your name.');
    const scores = [...await this.list(), { ...score, name: score.name.trim().slice(0, 50) }].sort((a, b) => b.score - a.score).slice(0, 100);
    localStorage.setItem(this.key, JSON.stringify(scores));
  }
}
