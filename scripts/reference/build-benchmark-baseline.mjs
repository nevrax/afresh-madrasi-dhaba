import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
// Reproduce the diagnosed renderer without retaining another tracked source copy.
const folder='.local-setup/benchmark-baseline';mkdirSync(folder,{recursive:true});
const original=`${folder}/original-vector.ts`;
let source=existsSync(original)?readFileSync(original,'utf8'):execFileSync('git',['show','351e2d6:src/render/vector.ts'],{encoding:'utf8'});
source=source.replace("import type { Bounds, Matrix } from './assets.js';",'interface Bounds {x:number;y:number;width:number;height:number} interface Matrix {a:number;b:number;c:number;d:number;tx:number;ty:number}');
source=source.replace('  private path(draw:',`  placements(id:number,frame=1):readonly VectorPlacement[]{const s=this.pack.symbols[id];return s?.frames?this.frame(s,Math.max(0,frame-1)).placements:[];}
  drawPlacement(ctx:CanvasRenderingContext2D,id:number,matrix:Matrix,frame=1,_placement:unknown={},alpha=1,useCache=true,morphRatio=0):boolean{return this.draw(ctx,id,matrix,frame,alpha,useCache,morphRatio);}
  private path(draw:`);
writeFileSync(`${folder}/vector.ts`,source,'utf8');
execFileSync(process.execPath,['.local-setup/typescript/lib/tsc.js',`${folder}/vector.ts`,'--target','ES2022','--module','ES2022','--lib','DOM,ES2022','--strict','--skipLibCheck','--outDir','.local-setup/build/modules/development/verification/baseline'],{stdio:'inherit'});
console.log('Diagnosed vector baseline351e2d6 ready for the local verification page.');
