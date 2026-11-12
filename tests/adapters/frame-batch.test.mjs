import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameBatch } from '../../.local-setup/build/modules/src/ui/frame-batch.js';

test('optional timing does not add snapshots or run when disabled',()=>{
  let enabled=false,snapshots=0,records=0,consumed=0;
  const game={advance:()=>[],get state(){snapshots++;return{};}};
  const batch=createFrameBatch(game,()=>consumed++,{enabled:()=>enabled,record:(simulation,snapshot)=>{assert.ok(simulation>=0&&snapshot>=0);records++;}});
  batch.flush(16);assert.equal(records,0);enabled=true;batch.flush(16);
  assert.equal(records,1);assert.equal(snapshots,2);assert.equal(consumed,2);
});

test('pointer command bursts publish one snapshot per frame and preserve command/event order', () => {
  const applied = [], consumed = []; let snapshots = 0;
  const game = {
    get state() { snapshots++; return { pointer: { x: applied.at(-1)?.x } }; },
    dispatch(command) { applied.push(command); return [{ type: 'input', x: command.x }]; },
    advance(elapsed) { return [{ type: 'advance', elapsed }]; },
  };
  const batch = createFrameBatch(game, (events, state) => consumed.push({ events, state }));
  for (let x = 0; x < 100; x++) batch.dispatch({ type: 'move-pointer', x, y: 10 });
  assert.equal(applied.length, 100); assert.equal(snapshots, 0); assert.equal(consumed.length, 0);
  batch.flush(16);
  assert.equal(snapshots, 1); assert.equal(consumed.length, 1);
  assert.equal(consumed[0].state.pointer.x, 99);
  assert.deepEqual(consumed[0].events.slice(0, 100).map(e => e.x), Array.from({ length: 100 }, (_, i) => i));
  assert.deepEqual(consumed[0].events.at(-1), { type: 'advance', elapsed: 16 });
  batch.flush(17);
  assert.equal(snapshots, 2); assert.deepEqual(consumed[1].events, [{ type: 'advance', elapsed: 17 }]);
});
