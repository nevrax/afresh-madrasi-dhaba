// Exercise shipped controls through real browser input. No game-state injection.
export async function checkGameUi(context,output,url='http://127.0.0.1:5173/'){
 const page=context.pages()[0];const checks=[],errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  window.__madrasiInputTimings=[];
  if(PerformanceObserver.supportedEntryTypes.includes('event'))new PerformanceObserver(list=>{for(const e of list.getEntries())if(window.__madrasiInputTimings.length<200)window.__madrasiInputTimings.push({name:e.name,duration:e.duration,inputDelay:e.processingStart-e.startTime});}).observe({type:'event',durationThreshold:16});
 });
 await page.goto(url);
 await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#presentation-profile').selectOption('extra');
 // Accessibility buttons describe canvas targets; pointer input deliberately hits Canvas.
 const gameControl=async name=>{const target=page.getByRole('button',{name,exact:true});await target.waitFor();const box=await target.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.locator('#loading').waitFor({state:'hidden'});};
 await gameControl('Start');
 await gameControl('How to play');
 await page.getByRole('button',{name:'Skip tutorial',exact:true}).waitFor();
 checks.push({name:'tutorial remains in stage',scrollHeight:await page.evaluate(()=>document.documentElement.scrollHeight),height:await page.evaluate(()=>innerHeight)});
 await gameControl('Skip tutorial');
 const stage=page.locator('#game');
 const point=async(x,y)=>{const b=await stage.boundingBox();return {x:b.x+x/550*b.width,y:b.y+y/400*b.height};};
 const bowl=await point(529,328);await page.mouse.move(bowl.x,bowl.y);await page.locator('#batter-cue').waitFor({state:'visible'});await page.mouse.click(bowl.x,bowl.y);
 await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('empty spot'));
 await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
 await page.locator('#presentation-profile').selectOption('classic');
 await page.waitForFunction(()=>document.querySelector('#game').style.cursor==='');
 await page.locator('#presentation-profile').selectOption('extra');
 await page.waitForFunction(()=>document.querySelector('#game').style.cursor.includes('image-set'));
 checks.push({name:'compact mouse cursor and live Classic fallback',passed:true});
 checks.push({name:'batter click changes pointer mode',passed:true});
 checks.push({name:'audio gesture accepted',promptHidden:await page.locator('#enable-audio').isHidden()});
 for(let i=0;i<60;i++){const p=await point(15+i*8.5,320+Math.sin(i)*40);await page.mouse.move(p.x,p.y);}
 const slot=await point(74,331);await page.mouse.click(slot.x,slot.y);
 await page.locator('#app-menu > summary').click();
 await page.locator('#render-scale').selectOption('0.5');
 const canvasSize=()=>stage.evaluate(c=>({backing:[c.width,c.height],css:[c.clientWidth,c.clientHeight]}));
 await page.waitForTimeout(200);const half=await canvasSize();
 await page.reload();await page.getByRole('button',{name:'Start',exact:true}).waitFor();
 checks.push({name:'half-resolution saved across reload',value:await page.locator('#render-scale').inputValue(),...half});
 await page.locator('#app-menu > summary').click();
 await page.locator('#render-scale').selectOption('1');await page.locator('#show-stats').uncheck();
 checks.push({name:'HUD disabled',hidden:await page.locator('#performance-hud').isHidden()});
 await page.locator('#show-stats').check();await page.locator('#app-menu > summary').click();
 await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);
 checks.push({name:'fullscreen',passed:true});await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
 await page.setViewportSize({width:390,height:844});await gameControl('Start');await gameControl('Play');
 const narrowBowl=await point(529,328);await page.mouse.move(narrowBowl.x,narrowBowl.y);await page.locator('#batter-cue').waitFor({state:'visible'});
 checks.push({name:'narrow viewport',...(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}))),bowlVisible:await page.locator('#batter-cue').isVisible()});
 await page.setViewportSize({width:1280,height:850});
 const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();await other.waitForTimeout(1500);await page.bringToFront();await other.close();
 const measuredFrames=async()=>Number((await page.locator('#performance-hud').innerText()).match(/(\d+) (?:callbacks|measured frames)/)?.[1]??NaN);
 const gameFramesBefore=await measuredFrames();
 if(!await page.locator('#loading').isHidden())throw Error('Game runtime is not ready after tab return');
 const frames=await page.evaluate(()=>new Promise(resolve=>{const values=[];let first,last;function frame(now){if(first===undefined)first=now;if(last!==undefined)values.push(now-last);last=now;if(now-first<30000)requestAnimationFrame(frame);else{values.sort((a,b)=>a-b);resolve({seconds:(now-first)/1000,frames:values.length,fps:values.length*1000/(now-first),p95:values[Math.floor(values.length*.95)],p99:values[Math.floor(values.length*.99)],max:values.at(-1),hidden:document.hidden});}}requestAnimationFrame(frame);}));
 const gameFramesAfter=await measuredFrames();
 if(!Number.isFinite(gameFramesBefore)||!Number.isFinite(gameFramesAfter)||gameFramesAfter<=gameFramesBefore||!await page.locator('#loading').isHidden()||await page.locator('#resource-status').isVisible())throw Error('Game frames stopped or runtime/resource error became visible');
 checks.push({name:'live game after tab return, 30 seconds',frames,gameFramesBefore,gameFramesAfter,gameFrameDelta:gameFramesAfter-gameFramesBefore,hud:await page.locator('#performance-hud').innerText(),canvas:await canvasSize()});
 await page.screenshot({path:output+'/live-game.png'});
 const inputTimings=await page.evaluate(()=>window.__madrasiInputTimings);
 const failed=errors.length||checks.some(c=>c.name==='narrow viewport'&&(c.scrollWidth>c.width||!c.bowlVisible)||c.name==='HUD disabled'&&!c.hidden||c.name==='half-resolution saved across reload'&&c.value!=='0.5'||c.name==='tutorial remains in stage'&&c.scrollHeight>c.height);
 return {status:failed?'FAIL':'PASS',checks,errors,inputTimings,limit:'Playwright-generated mouse input; no physical touchscreen claim. Callback pacing is not display-scanout measurement. Event Timing records only browser-reported entries at/above16ms, not all input latency.'};
}
