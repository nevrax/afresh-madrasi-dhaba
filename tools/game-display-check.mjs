import {gameUrl} from '../scripts/internal/deployment-config.mjs';
import {chromeExecutablePath} from './browser-path.mjs';
// Visible isolated acceptance for compact layout and contextual game affordances.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
const output=path.join(root,'.local-setup/logs/game-display');await mkdir(output,{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'.local-setup/playwright-game-display'),{
  executablePath:process.env.PLAYWRIGHT_CHROME||chromeExecutablePath(),
  headless:false,chromiumSandbox:true,viewport:{width:1280,height:850},deviceScaleFactor:1.5,
  args:['--use-angle=d3d11','--force-high-performance-gpu'],
});
const page=context.pages()[0],checks=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const base=process.argv.includes('--release')?gameUrl('dist/site/'):gameUrl('');
const ready=async()=>{await page.goto(base);await page.locator('#loading').waitFor({state:'hidden'});};
const button=async name=>{const target=page.getByRole('button',{name,exact:true});await target.waitFor();const b=await target.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
const point=async(x,y,click=false)=>{const b=await page.locator('#game').boundingBox();await page.mouse[click?'click':'move'](b.x+x*b.width/550,b.y+y*b.height/400);};
const size=()=>page.locator('#game').evaluate(c=>{const b=c.getBoundingClientRect();return{width:b.width,height:b.height,x:b.x,y:b.y,backing:[c.width,c.height],dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};});
try{
  await ready();await page.evaluate(()=>{localStorage.removeItem('madrasi-display');localStorage.removeItem('madrasi-batter-hint-seen');});await ready();
  assert(await page.locator('#performance-hud').isHidden());assert(!await page.locator('#show-stats').isChecked());
  checks.push({name:'FPS hidden by default',passed:true});
  for(const [width,height] of [[1280,850],[900,540],[390,844],[844,390],[1600,1000]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(250);const s=await size();
    assert(s.width<=880.1&&s.x>=11&&s.y>=11&&s.x+s.width<=width-11&&s.y+s.height<=height-11);
    assert(Math.abs(s.width/s.height-550/400)<.005);assert(s.scroll[0]===width&&s.scroll[1]===height);
    assert(Math.abs(s.backing[0]-s.width*s.dpr)<2);checks.push({name:'window resize',...s});
  }
  await page.setViewportSize({width:1280,height:850});
  await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(300);
  const full=await size();assert(full.width>880&&Math.abs(full.width/full.height-550/400)<.005);
  checks.push({name:'real fullscreen expands game',...full});await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
  await button('Start');await button('Play');await page.locator('#batter-cue span').waitFor({state:'visible'});
  await point(529,328);await page.waitForFunction(()=>document.querySelector('#batter-cue').dataset.hover==='true');
  await page.screenshot({path:path.join(output,'bowl-intro.png')});
  await point(529,328,true);await page.locator('#batter-cue span').waitFor({state:'hidden'});
  await point(300,250);await page.waitForFunction(()=>document.querySelector('#batter-cue').dataset.selected==='true');
  assert(await page.locator('#batter-cue').isVisible());
  await page.screenshot({path:path.join(output,'bowl-selected.png')});
  await point(124.5,332.45,true);await page.locator('#batter-cue').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='flip',null,{timeout:12000});
  assert((await page.locator('#game').evaluate(c=>getComputedStyle(c).cursor)).includes('data:image/svg+xml'));
  await page.screenshot({path:path.join(output,'flip-cursor.png')});checks.push({name:'stationary pointer becomes flip cursor when ready',passed:true});
  await point(124.5,332.45,true);
  await page.waitForFunction(()=>document.querySelector('#game').dataset.action==='pickup',null,{timeout:8000});
  await point(124.5,332.45,true);await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('plate'));
  checks.push({name:'real flip then pickup input',passed:true});
  await ready();await button('Start');await button('Play');await point(300,200);
  assert(await page.locator('#batter-cue span').isHidden());
  await point(529,328);await page.locator('#batter-cue').waitFor({state:'visible'});assert(await page.locator('#batter-cue span').isHidden());
  checks.push({name:'label stays dismissed after reload; bowl hover still outlined',passed:true});
  await page.evaluate(()=>localStorage.removeItem('madrasi-batter-hint-seen'));await ready();await button('Start');await button('Play');await point(300,200);
  await page.locator('#batter-cue span').waitFor({state:'visible'});await page.locator('#batter-cue span').waitFor({state:'hidden',timeout:12000});
  assert(await page.locator('#batter-cue').isHidden());checks.push({name:'unselected intro expires after eight seconds',passed:true});
  await page.locator('#app-menu > summary').click();await page.locator('#show-stats').check();await page.locator('#render-scale').selectOption('0.5');
  await ready();assert(await page.locator('#performance-hud').isVisible());assert.equal(await page.locator('#render-scale').inputValue(),'0.5');
  await page.locator('#app-menu > summary').click();await page.locator('#show-stats').uncheck();await page.locator('#render-scale').selectOption('1');await page.locator('#app-menu > summary').click();
  checks.push({name:'explicit FPS opt-in and quality survive reload',passed:true});
  assert.equal(errors.length,0);await page.screenshot({path:path.join(output,'compact-menu.png')});
  await writeFile(path.join(output,process.argv.includes('--release')?'release.json':'source.json'),JSON.stringify({status:'PASS',checks,errors},null,2));
  console.log(JSON.stringify({status:'PASS',checks,errors}));
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});throw error;}
finally{await context.close();}
