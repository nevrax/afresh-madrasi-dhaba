import {deployment} from '../scripts/internal/deployment-config.mjs';
// Playwright can acknowledge document fullscreen without changing the native
// Chrome window. Synchronize only this launcher's local main-frame game window.
export async function connectNativeFullscreen(context,page,{fileUrls=[]}={}){
  const cdp=await context.newCDPSession(page);
  let saved=null,queue=Promise.resolve();
  await page.exposeBinding('madrasiNativeFullscreen',({frame},active)=>{
    const url=new URL(frame.url());url.hash='';url.search='';
    const allowed=(url.origin===deployment.game.origin&&url.pathname.startsWith(deployment.game.path))||fileUrls.includes(url.href);
    if(frame!==page.mainFrame()||!allowed||typeof active!=='boolean')throw Error('Unsupported fullscreen request');
    queue=queue.catch(()=>{}).then(async()=>{
      const {windowId,bounds}=await cdp.send('Browser.getWindowForTarget');
      if(active){
        if(bounds.windowState==='fullscreen')return;
        saved=bounds;await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'fullscreen'}});
      }else if(saved){
        const previous=saved;saved=null;
        await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
        await cdp.send('Browser.setWindowBounds',{windowId,bounds:previous.windowState==='normal'?previous:{windowState:previous.windowState}});
      }
    });
    return queue;
  });
  await page.addInitScript(()=>document.addEventListener('fullscreenchange',()=>{
    window.madrasiNativeFullscreen(Boolean(document.fullscreenElement)).catch(()=>{
      const status=document.querySelector('#display-status');if(status){status.hidden=false;status.textContent='The browser window could not enter fullscreen. Press F11 to switch it manually.';}
    });
  }));
}
