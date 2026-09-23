import test from 'node:test';
import assert from 'node:assert/strict';
import {cursorGeometry} from '../../.local-setup/build/modules/src/render/carry-cursor.js';
const identity={a:1,b:0,c:0,d:1,tx:0,ty:0};
test('native cursor keeps logical size and hotspot separate from raster density',()=>{
  const bounds={x:-10,y:-5,width:20,height:10};
  const g=cursorGeometry(bounds,identity,2200,1600,1100,800);
  assert.equal(g.pixelsWide,84);assert.equal(g.pixelsHigh,44);
  assert.equal(g.cssWide,42);assert.equal(g.cssHigh,22);assert.equal(g.density,2);
  assert.equal(g.hotspotX,21);assert.equal(g.hotspotY,11);assert(g.supported);
});
test('large carry artwork fits the native cursor limit; invalid hotspots fall back',()=>{
  const g=cursorGeometry({x:-50,y:-20,width:100,height:40},identity,2200,1600,1100,800);
  assert.equal(g.cssWide,64);assert(g.cssHigh<64);assert(g.supported);
  assert.equal(cursorGeometry({x:10,y:10,width:20,height:10},identity,2200,1600,1100,800).supported,false);
});
