import type { Command, Game, GameEvent, GameState } from '../core/game.js';

/** Apply commands immediately in input order; publish one snapshot and draw per animation frame. */
export function createFrameBatch(game: Game, consume: (events: GameEvent[], state: Readonly<GameState>) => void, timing?: {enabled():boolean;record(simulationMs:number,snapshotMs:number):void}): { dispatch(command: Command): void; flush(elapsed: number): void } {
  let pending: GameEvent[] = [];
  return {
    dispatch(command) { pending.push(...game.dispatch(command)); },
    flush(elapsed) {
      const events = pending; pending = [];
      const measuring=timing?.enabled()??false,at=measuring?performance.now():0;
      events.push(...game.advance(elapsed));
      const after=measuring?performance.now():0,state=game.state;
      if(measuring)timing!.record(after-at,performance.now()-after);
      consume(events, state);
    },
  };
}
