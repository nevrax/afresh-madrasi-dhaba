import test from 'node:test';
import assert from 'node:assert/strict';
import {captureTileFrame,replayCanvasTiles,packTileAtlas} from '../../.local-setup/build/modules/development/verification/tile-compositor.js';

function harness(run){
  const oldDocument=globalThis.document,oldPath=globalThis.Path2D;
  globalThis.Path2D=class{constructor(other){this.rectangles=other?.rectangles?.slice()??[];}rect(...r){this.rectangles.push(r);}};
  let serial=0;
  const canvas=(width=100,height=80)=>{
    const c={width,height,id:serial++},calls=[],states=[];
    const ctx={canvas:c,calls,globalAlpha:1,globalCompositeOperation:'source-over',m:[1,0,0,1,0,0],
      getTransform(){const [a,b,c,d,e,f]=this.m;return {a,b,c,d,e,f};},setTransform(...m){this.m=m;},
      save(){states.push([this.m,this.globalAlpha]);},restore(){[this.m,this.globalAlpha]=states.pop();},
      beginPath(){},rect(){},clip(...args){calls.push(['clip',...args]);},fillText(){},strokeText(){},fill(){},fillRect(){},stroke(){},
      drawImage(...args){calls.push(['image',...args]);}};
    c.getContext=()=>ctx;return c;
  };
  globalThis.document={createElement:()=>canvas()};
  try{run(canvas);}finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldPath===undefined)delete globalThis.Path2D;else globalThis.Path2D=oldPath;}
}

test('tile capture freezes unique inputs and preserves draw order, affine, alpha and clip stack',()=>harness(canvas=>{
  const stage=canvas(),source=canvas(13,17),ctx=stage.getContext(),original=ctx.drawImage;
  const frame=captureTileFrame(stage,()=>{
    ctx.save();ctx.setTransform(2,0,0,3,7,9);ctx.beginPath();ctx.rect(1,2,3,4);ctx.clip();ctx.globalAlpha=.5;
    ctx.drawImage(source,2,3,4,5,6,7,8,9);ctx.restore();ctx.drawImage(source,10,11);ctx.fillText('excluded',0,0);
  });
  assert.equal(ctx.drawImage,original);assert.equal(frame.sources.length,1);assert.equal(frame.quads.length,2);
  assert.notEqual(frame.sources[0],source);assert.equal(frame.quads[0].source,frame.quads[1].source);
  assert.deepEqual(frame.quads[0].sourceRect,[2,3,4,5]);assert.deepEqual(frame.quads[0].destination,[6,7,8,9]);
  assert.deepEqual(frame.quads[0].matrix,[2,0,0,3,7,9]);assert.equal(frame.quads[0].alpha,.5);
  assert.deepEqual(frame.quads[0].clips[0].path.rectangles,[[1,2,3,4]]);assert.equal(frame.quads[1].clips.length,0);
  assert.deepEqual(frame.quads[1].destination,[10,11,13,17]);assert.equal(frame.excluded.text,1);
  const replay=canvas().getContext();replayCanvasTiles(replay,frame);
  assert.equal(replay.calls.filter(c=>c[0]==='image').length,2);assert.equal(replay.calls.filter(c=>c[0]==='clip').length,1);
  frame.dispose();assert.equal(frame.sources[0].width,1);
}));

test('failed capture restores native drawing methods and rejects unsupported blending',()=>harness(canvas=>{
  const stage=canvas(),ctx=stage.getContext(),original=ctx.drawImage;ctx.globalCompositeOperation='copy';
  assert.throws(()=>captureTileFrame(stage,()=>ctx.drawImage(canvas(),0,0)),/source-over/);
  assert.equal(ctx.drawImage,original);
}));


test('atlas packing preserves input identity, separates extruded gutters and enforces texture budget',()=>{
  const rectangles=[{width:1485,height:1080},{width:1485,height:1080},...Array.from({length:56},(_,i)=>({width:80+i*3,height:90+i}))];
  const layout=packTileAtlas(rectangles);
  assert.ok(layout.size<=4096);assert.ok(layout.size*layout.size*4<=80*1048576);
  assert.deepEqual(packTileAtlas(rectangles),layout,'packing is deterministic');
  rectangles.forEach((r,i)=>{
    const [x,y]=layout.positions[i];assert.ok(x>=1&&y>=1&&x+r.width<layout.size&&y+r.height<layout.size);
    rectangles.slice(i+1).forEach((other,j)=>{const [ox,oy]=layout.positions[i+j+1];
      assert.ok(x+r.width+1<=ox-1||ox+other.width+1<=x-1||y+r.height+1<=oy-1||oy+other.height+1<=y-1,'neither content nor bilinear gutters overlap');
    });
  });
  assert.throws(()=>packTileAtlas([{width:4096,height:1}]),/texture budget/);
  assert.throws(()=>packTileAtlas(Array.from({length:5},()=>({width:2046,height:2046}))),/texture budget/);
});
