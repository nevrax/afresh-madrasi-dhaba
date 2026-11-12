import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {runtimeTimelineIds} from '../../.local-setup/build/modules/src/render/renderer.js';
const root=new URL('../../',import.meta.url);
const json=file=>JSON.parse(readFileSync(new URL(file,root),'utf8'));
test('production pack retains exact player vectors, compositions, metadata and media without development exports',()=>{
 const context={};runInNewContext(readFileSync(new URL('.local-setup/build/offline/game-resources.js',root),'utf8'),context);
 const pack=JSON.parse(JSON.stringify(context.__madrasiResources));
 const source=json('assets/catalog.json'),vectors=json('assets/vector/scene.json');
 assert.deepEqual(pack.json['assets/vector/scene.json'],vectors);
 for(const id of runtimeTimelineIds)assert.deepEqual(pack.json[`assets/timelines/${id}.json`],json(`assets/timelines/${id}.json`));
 const runtime=pack.json['assets/catalog.json'];assert.equal(runtime.items.length,source.items.length);
 for(let i=0;i<source.items.length;i++){
  const original=source.items[i],item=runtime.items[i];
  for(const key of ['id','symbolId','kind','name','exportNames','bounds','frameCount','metadata'])assert.deepEqual(item[key],original[key]);
  assert.equal(item.files,undefined);assert.equal(item.timelineUrl,undefined);
  if(original.kind==='font'||original.kind==='sound'||!vectors.symbols[original.symbolId])assert.deepEqual(item.preview,original.preview);
  if(original.kind==='font'||original.kind==='sound')for(const file of original.files){
   const data=pack.binary[file.url];assert(data,`Missing ${file.url}`);
   assert.deepEqual(Buffer.from(data.slice(data.indexOf(',')+1),'base64'),readFileSync(new URL(file.url,root)));
  }
 }
 const game=readFileSync(new URL('.local-setup/build/offline/game.js',root),'utf8');
 assert(!game.includes('development/'));assert(!game.includes('ResourceCatalogue'));assert(!game.includes('attachDiagnostics'));
});
