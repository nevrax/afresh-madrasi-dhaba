import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRenderSettings, saveRenderSettings } from '../../.local-setup/build/modules/src/ui/render-settings.js';
test('display settings survive reload and reject malformed or unavailable storage', () => {
  let value; const storage={getItem:()=>value,setItem:(_,next)=>value=next};
  assert.deepEqual(loadRenderSettings(storage),{scale:1,stats:false});
  saveRenderSettings(storage,{scale:.5,stats:false});
  assert.deepEqual(loadRenderSettings(storage),{scale:.5,stats:false});
  value=JSON.stringify({scale:.75,stats:true}); // Old defaults must not opt users in.
  assert.deepEqual(loadRenderSettings(storage),{scale:.75,stats:false});
  saveRenderSettings(storage,{scale:.75,stats:true});
  assert.deepEqual(loadRenderSettings(storage),{scale:.75,stats:true});
  for(const malformed of ['null','{','{"scale":"0.5","stats":0}']) {value=malformed;assert.deepEqual(loadRenderSettings(storage),{scale:1,stats:false});}
  assert.deepEqual(loadRenderSettings({getItem(){throw Error();}}),{scale:1,stats:false});
  assert.doesNotThrow(()=>saveRenderSettings({setItem(){throw Error();}},{scale:1,stats:false}));
});
test('saved scale is finite, bounded and corresponds to a visible quality option',()=>{
  for(const [scale,expected] of [[0,.25],[9,1],[.6,.5],[.74,.75]]) assert.equal(loadRenderSettings({getItem:()=>JSON.stringify({scale})}).scale,expected);
});
