// Refresh calibration, not game throughput. Native viewport only.
export async function measureCadence(page, config={}) {
  return page.evaluate(async config=>{
    document.body.style.margin='0';document.body.replaceChildren();
    const canvas=document.createElement('canvas');document.body.append(canvas);
    const cssWidth=Math.min(1100,innerWidth,innerHeight*550/400);
    canvas.style.cssText=`display:block;width:${cssWidth}px;height:${cssWidth*400/550}px`;
    canvas.width=config.width??2200;canvas.height=Math.round(canvas.width*400/550);
    const c=canvas.getContext('2d',{alpha:false,...config.stageOptions});c.fillRect(0,0,canvas.width,canvas.height);
    const geometry=()=>{const r=canvas.getBoundingClientRect();return{screen:{width:screen.width,height:screen.height,availLeft:screen.availLeft,availTop:screen.availTop,availWidth:screen.availWidth,availHeight:screen.availHeight},window:{x:screenX,y:screenY,width:outerWidth,height:outerHeight},viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,canvas:{x:r.x,y:r.y,width:r.width,height:r.height,backing:[canvas.width,canvas.height],fullyInsideViewport:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}};};
    const quantile=(v,p)=>[...v].sort((a,b)=>a-b)[Math.min(v.length-1,Math.floor(v.length*p))];
    const results=[];
    for(const mode of ['empty-raf','small-surface','tiny-canvas','full-canvas','full-clear-canvas']){
      canvas.width=mode==='small-surface'?16:config.width??2200;canvas.height=mode==='small-surface'?16:Math.round(canvas.width*400/550);
      canvas.style.width=(mode==='small-surface'?16:cssWidth)+'px';canvas.style.height=(mode==='small-surface'?16:cssWidth*400/550)+'px';
      const next=()=>new Promise(requestAnimationFrame);
      let began=await next(),last=began,hidden=0,unfocused=0,outside=0,count=0;const gaps=[],draws=[];
      while(last-began<1000){last=await next();} // Settle before timing.
      began=last;
      while(last-began<(config.measurementMs??10000)){
        const now=await next(),at=performance.now();gaps.push(now-last);last=now;
        if(mode==='full-clear-canvas')c.clearRect(0,0,canvas.width,canvas.height);
        if(mode!=='empty-raf'){c.fillStyle=count%2?'#204060':'#306080';c.fillRect(0,0,mode==='tiny-canvas'?16:canvas.width,mode==='tiny-canvas'?16:canvas.height);}
        draws.push(performance.now()-at);count++;hidden+=Number(document.hidden);unfocused+=Number(!document.hasFocus());
        if(count%60===0)outside+=Number(!geometry().canvas.fullyInsideViewport);
      }
      const median=quantile(gaps,.5);
      results.push({mode,seconds:(last-began)/1000,callbacks:count,callbackFps:count*1000/(last-began),gapMs:{p50:median,p95:quantile(gaps,.95),p99:quantile(gaps,.99),max:Math.max(...gaps)},gapsOver25ms:gaps.filter(n=>n>25).length,estimatedMissedRefreshes:config.uncapped?null:gaps.reduce((n,g)=>n+Math.max(0,Math.round(g/median)-1),0),submissionMs:{p50:quantile(draws,.5),p95:quantile(draws,.95)},hiddenSamples:hidden,unfocusedSamples:unfocused,outsideViewportSamples:outside,geometry:geometry()});
    }
    // Bypass rAF only to distinguish work submission from displayed frames.
    // Readback forces this trivial Canvas result to be available; this is NOT screen FPS.
    const began=performance.now();let completed=0;
    while(!config.uncapped&&performance.now()-began<1000){c.fillStyle=completed%2?'#123456':'#234567';c.fillRect(0,0,16,16);c.getImageData(0,0,1,1);completed++;}
    const work={name:'tiny-fill-plus-readback-unpaced',completed,seconds:(performance.now()-began)/1000};
    work.operationsPerSecond=work.seconds?work.completed/work.seconds:null;
    return {config,contextAttributes:c.getContextAttributes(),results,work,canvas:[canvas.width,canvas.height],memory:{},cache:null,geometry:geometry()};
  },config);
}
