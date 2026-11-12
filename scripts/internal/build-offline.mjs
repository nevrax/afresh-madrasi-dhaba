import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url)),dist=path.join(root,'.local-setup/build/modules');
const offline=path.join(root,'.local-setup/build/offline');
const ts=createRequire(import.meta.url)('../../.local-setup/typescript/lib/typescript.js');
const json=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const literal=value=>JSON.stringify(value).replaceAll('<','\\u003c');

/** Use the already pinned TypeScript compiler to emit classic CommonJS modules.
 * A closed registry resolves their relative imports, including the optional
 * diagnostic import. No eval, server, runtime compiler or external loader. */
function bundle(entry,production=false){
 const modules=new Map();
 function visit(id){
  if(modules.has(id))return;modules.set(id,null);
  const filename=path.resolve(dist,id);if(path.relative(dist,filename).startsWith('..'))throw Error('Module outside dist');
  let source=readFileSync(filename,'utf8');
  if(production&&id==='src/main.js')source=source.replace(/if\s*\(new URLSearchParams\(location.search\).has\('diagnose'\)\)\s*\(await import\([^\n]+\n/, '');
  const emitted=ts.transpileModule(source,{fileName:id,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,sourceMap:false}}).outputText;
  const deps={};
  for(const imported of ts.preProcessFile(emitted,true,true).importedFiles){
   if(!imported.fileName.startsWith('.'))throw Error(`Unexpected external module: ${imported.fileName}`);
   const child=path.posix.normalize(path.posix.join(path.posix.dirname(id),imported.fileName));deps[imported.fileName]=child;visit(child);
  }
  modules.set(id,{emitted,deps});
 }
 visit(entry);
 return `(function(){'use strict';const factories={${[...modules].map(([id,{emitted,deps}])=>`${literal(id)}:[function(module,exports,require){\n${emitted}\n},${literal(deps)}]`).join(',\n')}};const cache=Object.create(null);function load(id){if(cache[id])return cache[id].exports;const item=factories[id];if(!item)throw Error('Missing bundled module: '+id);const module={exports:{}};cache[id]=module;item[0](module,module.exports,name=>load(item[1][name]));return module.exports;}load(${literal(entry)});})();\n`;
}

export async function buildOffline(){
 mkdirSync(offline,{recursive:true});
 const catalog=json('assets/catalog.json'),vectors=json('assets/vector/scene.json');
 const resources={json:{'assets/catalog.json':catalog,'assets/vector/scene.json':vectors,'assets/scenes.json':json('assets/scenes.json')},binary:{}};
 // Include all authored compositions so new renderer queries cannot silently
 // depend on a server. Raster catalogue previews remain ordinary sibling files.
 for(const item of catalog.items){
  if(item.timelineUrl)resources.json[item.timelineUrl]=json(item.timelineUrl);
  if(['sound','font'].includes(item.kind)||(!vectors.symbols[item.symbolId]&&item.kind!=='scene'))for(const file of item.files){
   const type={'.mp3':'audio/mpeg','.wav':'audio/wav','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file.url)]??'application/octet-stream';
   resources.binary[file.url]=`data:${type};base64,${readFileSync(path.join(root,file.url)).toString('base64')}`;
  }
 }
 // Keep player data; exclude catalogue thumbnails, provenance and research timelines.
 const runtimeCatalog={source:{sha256:catalog.source.sha256},scenes:catalog.scenes,items:catalog.items.map(item=>{
  const result={};
  for(const key of ['id','symbolId','kind','name','exportNames','bounds','frameCount','metadata'])if(item[key]!==undefined)result[key]=item[key];
  result.preview=vectors.symbols[item.symbolId]&&!['font','sound'].includes(item.kind)?null:item.preview;
  return result;
 })};
 const runtimeResources={json:{'assets/catalog.json':runtimeCatalog,'assets/vector/scene.json':vectors,'assets/scenes.json':resources.json['assets/scenes.json']},binary:resources.binary};
 const {runtimeTimelineIds}=await import('../../.local-setup/build/modules/src/render/renderer.js');
 for(const id of runtimeTimelineIds){const key=`assets/timelines/${id}.json`;runtimeResources.json[key]=resources.json[key]??json(key);}
 const payloadFor=data=>`globalThis.__madrasiResources=JSON.parse(${literal(JSON.stringify(data))});\n`;
 const payload=payloadFor(runtimeResources),game=bundle('src/main.js',true);
 writeFileSync(path.join(offline,'resources.js'),payloadFor(resources));
 writeFileSync(path.join(offline,'game-resources.js'),payload);
 writeFileSync(path.join(offline,'game.js'),game);
 writeFileSync(path.join(offline,'development-game.js'),bundle('src/main.js'));
 writeFileSync(path.join(offline,'catalog.js'),bundle('development/catalog/main.js'));
 let html=readFileSync(path.join(root,'index.html'),'utf8');
 html=html.replace('<link rel="stylesheet" href="src/ui/styles.css">',`<style>${readFileSync(path.join(root,'src/ui/styles.css'),'utf8')}</style>`);
 html=html.replace(/<script>\s*if \(location.protocol[\s\S]*?<\/script>/,()=>`<script>${(payload+game).replaceAll('</script','<\\/script')}</script>`);
 // Resources and the performance study are repository tools, outside the
 // portable game's self-contained runtime. Keep them in the normal index.
 html=html.replace(/<a href="development\/catalog\/index.html">Resources<\/a>/,'').replace(/<a\b[^>]*id="study-link"[^>]*>.*?<\/a>/,'');
 const standalone=path.join(root,'dist/standalone');
 mkdirSync(standalone,{recursive:true});
 writeFileSync(path.join(standalone,'index.html'),html);
 console.log(`Portable game: dist/standalone/index.html (${(Buffer.byteLength(html)/1048576).toFixed(2)} MiB). Intermediate build: .local-setup/build/.`);
}
