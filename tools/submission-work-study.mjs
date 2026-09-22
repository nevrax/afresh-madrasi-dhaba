import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromeExecutablePath} from './browser-path.mjs';
const root = path.resolve(import.meta.dirname, '..');
const {chromium} = createRequire(import.meta.url)(path.join(root, '.local-setup/playwright/node_modules/playwright'));
const output = path.join(root, '.local-setup/logs/submission-work'); await mkdir(output, {recursive: true});
const context = await chromium.launchPersistentContext(path.join(root, '.local-setup/playwright-submission-work'), {
  executablePath: chromeExecutablePath(), headless: false, chromiumSandbox: true,
  viewport: {width: 1480, height: 1000}, deviceScaleFactor: 2,
  args: ['--use-angle=d3d11', '--force-high-performance-gpu'],
});
try {
  const page = context.pages()[0];
  await page.goto('http://127.0.0.1:5173/development/verification/render-fixture.html');
  const result = await page.evaluate(async () => {
    const {Assets} = await import('/build/modules/src/render/assets.js');
    const {Renderer} = await import('/build/modules/src/render/renderer.js');
    const {fixture} = await import('/build/modules/development/verification/component-study.js');
    const canvas = document.querySelector('canvas'); canvas.style.width = '1100px'; canvas.style.height = '800px';
    const assets = new Assets(); await assets.load(); const renderer = new Renderer(canvas, assets); await renderer.load(); renderer.setPresentation('extra'); await document.fonts.ready;
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const ctx = canvas.getContext('2d'), art = assets.vector, original = art.draw.bind(art), state = fixture();
    renderer.events([{type:'screen',screen:'playing'}], {...state,timeMs:0});
    let group = 'direct', measuring = false;
    const groups = {}, operations = {}, readTransform = ctx.getTransform.bind(ctx);
    art.draw = (c,id,...args) => { const previous = group; group = String(id); try { return original(c,id,...args); } finally { group = previous; } };
    for (const name of ['drawImage','fillText','fill','stroke','fillRect','clearRect','save','restore','transform','setTransform','clip','getTransform']) {
      const call = ctx[name].bind(ctx);
      ctx[name] = (...args) => {
        if (measuring) {
          operations[name] = (operations[name] ?? 0) + 1;
          const entry = groups[group] ??= {drawImages:0, unboundedArea:0, stageBoundedArea:0, text:0};
          if (name === 'fillText') entry.text++;
          if (name === 'drawImage') {
            entry.drawImages++;
            const [source,...a] = args, rect = a.length === 8 ? a.slice(4) : [a[0],a[1],a[2]??source.width,a[3]??source.height];
            const [x,y,w,h] = rect, m = readTransform();
            const points = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py]) => [m.a*px+m.c*py+m.e,m.b*px+m.d*py+m.f]);
            const left=Math.min(...points.map(p=>p[0])), right=Math.max(...points.map(p=>p[0])), top=Math.min(...points.map(p=>p[1])), bottom=Math.max(...points.map(p=>p[1]));
            entry.unboundedArea += (right-left)*(bottom-top);
            entry.stageBoundedArea += Math.max(0,Math.min(canvas.width,right)-Math.max(0,left))*Math.max(0,Math.min(canvas.height,bottom)-Math.max(0,top));
          }
        }
        return call(...args);
      };
    }
    const frames = 12;
    for (let i=0;i<frames;i++) {
      state.timeMs=16000+i*1000/12; state.plate[0].smokePose=i+1;
      renderer.draw(state); measuring=true; renderer.draw(state); measuring=false;
    }
    return {frames,canvas:[canvas.width,canvas.height],operations:Object.fromEntries(Object.entries(operations).map(([k,n])=>[k,n/frames])),groups:Object.entries(groups).map(([id,cost])=>({id,...Object.fromEntries(Object.entries(cost).map(([k,n])=>[k,n/frames]))})).sort((a,b)=>b.stageBoundedArea-a.stageBoundedArea),limits:'Submission counts and axis-aligned destination-area estimates, not timing, actual GPU fragments or visible nontransparent coverage. Overlapping quads are counted separately; source masks are not subtracted.'};
  });
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
} finally { await context.close(); }
