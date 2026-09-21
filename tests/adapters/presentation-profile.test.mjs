import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadPresentationChoice, savePresentationChoice, presentationChoice, resolvePresentation} from '../../.local-setup/build/modules/src/presentation-profile.js';
import {loadRenderSettings, saveRenderSettings} from '../../.local-setup/build/modules/src/ui/render-settings.js';
import {presentationPack, animationPeriod} from '../../.local-setup/build/modules/src/render/vector.js';

test('profile choice requires an explicit valid preference and tolerates unavailable storage', () => {
  const values=new Map(), storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(loadPresentationChoice(storage),null);
  for(const value of ['Classic','auto','current','',null,{},1]) assert.equal(presentationChoice(value),null);
  assert.equal(resolvePresentation(null).simplerEffects,false);
  assert.equal(resolvePresentation(null).enhancements,true);
  for(const choice of ['classic','extra']) {savePresentationChoice(storage,choice);assert.equal(loadPresentationChoice(storage),choice);}
  assert.equal(resolvePresentation('classic').enhancements,false);
  assert.equal(resolvePresentation('extra').simplerEffects,true);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(loadPresentationChoice(blocked),null);
  assert.doesNotThrow(()=>savePresentationChoice(blocked,'extra'));
  assert(Object.isFrozen(resolvePresentation('extra')));
});

test('Extra display settings do not overwrite existing presentation preferences', () => {
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  saveRenderSettings(storage,{scale:.5,stats:true});
  assert.deepEqual(loadRenderSettings(storage,'madrasi-display-extra'),{scale:1,stats:false});
  saveRenderSettings(storage,{scale:.75,stats:false},'madrasi-display-extra');
  assert.deepEqual(loadRenderSettings(storage),{scale:.5,stats:true});
  assert.deepEqual(loadRenderSettings(storage,'madrasi-display-extra'),{scale:.75,stats:false});
});

test('Extra metadata changes only stars and griddle blur without mutating source or food steam', () => {
  const source=JSON.parse(readFileSync(new URL('../../assets/vector/scene.json',import.meta.url)));
  const before=JSON.stringify(source),extra=presentationPack(source,true);
  assert.equal(JSON.stringify(source),before);
  assert.strictEqual(presentationPack(source,false),source);
  const changed=Object.keys(source.symbols).filter(id=>extra.symbols[id]!==source.symbols[id]);
  assert.deepEqual(changed,['185','224']);
  assert.equal(animationPeriod(source.symbols,193),30);
  assert.equal(animationPeriod(extra.symbols,193),1);
  assert.equal(extra.symbols[224].frames.length,source.symbols[224].frames.length);
  for(const frame of extra.symbols[224].frames) for(const part of frame) if(part.id===223) assert.deepEqual(part.filters,[]);
  assert(source.symbols[224].frames.flat().some(part=>part.id===223&&part.filters.length));
  assert.strictEqual(extra.symbols[472],source.symbols[472]);
  assert.strictEqual(extra.symbols[223],source.symbols[223]);
});
