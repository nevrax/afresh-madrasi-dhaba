import { createGame, type GameEvent, type GameState } from './core/game.js';
import { Assets } from './render/assets.js';
import { Renderer } from './render/renderer.js';
import { GameAudio } from './audio/audio.js';
import { connectPointer } from './input/pointer.js';
import { LocalScores, type Score } from './services/scores.js';
import { connectFullscreen } from './ui/fullscreen.js';
import { createPerformanceHud } from './ui/performance-hud.js';
import { loadRenderSettings, saveRenderSettings } from './ui/render-settings.js';
import { renderProfiler } from './render/profile.js';
import { LegacyScoreClient } from './services/legacy-scores.js';
import { readScoreConfiguration } from './services/score-configuration.js';
import { connectLegacyScoreForm } from './ui/legacy-score-form.js';
import { createFrameBatch } from './ui/frame-batch.js';
import { optionalAudio, runtimeFeedback } from './ui/runtime-feedback.js';
import { loadPresentationChoice, presentationChoice, resolvePresentation, savePresentationChoice } from './presentation-profile.js';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const loading = document.querySelector<HTMLParagraphElement>('#loading')!;
const controls = document.querySelector<HTMLDivElement>('#controls')!;
const hint = document.querySelector<HTMLParagraphElement>('#hint')!;
const form = document.querySelector<HTMLFormElement>('#score-form')!;
const scoreStatus = document.querySelector<HTMLParagraphElement>('#score-status')!;
const name = document.querySelector<HTMLInputElement>('#player-name')!;
const dialog = document.querySelector<HTMLDialogElement>('#scores-dialog')!;
const scores = new LocalScores();
const soundButton = document.querySelector<HTMLButtonElement>('#enable-audio')!;
const saveDialog = document.querySelector<HTMLDialogElement>('#save-score-dialog')!;
const saveLink = document.querySelector<HTMLButtonElement>('#save-score-link')!;
const menu = document.querySelector<HTMLDetailsElement>('#app-menu')!;
const feedback = runtimeFeedback(loading, document.querySelector<HTMLElement>('#resource-status')!);
let running = true;
const fail = (): void => { running = false; controls.replaceChildren(); feedback.failed(); };
connectFullscreen(document.querySelector<HTMLButtonElement>('#fullscreen')!, document.querySelector<HTMLElement>('#display-status')!);
const expandButton=document.querySelector<HTMLButtonElement>('#expand-game')!;
expandButton.onclick=()=>{
  const expanded=document.documentElement.classList.toggle('game-expanded');
  expandButton.setAttribute('aria-pressed',String(expanded));
  const label=expanded?'Restore compact game':'Expand game to window';
  expandButton.title=label;expandButton.setAttribute('aria-label',label);expandButton.textContent=expanded?'↙':'↗';
};

async function boot(): Promise<void> {
  const assets = new Assets(); await assets.load();
  const renderer = new Renderer(canvas, assets); await renderer.load();
  const audio = new GameAudio(assets, running => { soundButton.hidden = running; });
  const withAudio = optionalAudio(() => { soundButton.hidden = true; feedback.audioUnavailable(); });
  const activateAudio = (): void => withAudio(() => audio.activate());
  const game = createGame({ random: Math.random });
  let displayStorage:Storage|null=null;try{displayStorage=localStorage;}catch{}
  let presentation=resolvePresentation(presentationChoice(new URLSearchParams(location.search).get('presentation')) ?? loadPresentationChoice(displayStorage));
  const displaySettings={current:loadRenderSettings(displayStorage),extra:loadRenderSettings(displayStorage,'madrasi-display-extra')};
  let settings=displaySettings[presentation.choice==='extra'?'extra':'current'];
  const hud=createPerformanceHud(canvas,()=>({tiles:assets.vector!.stats.cachedBytes,pool:assets.vector!.stats.pooledBytes,scene:renderer.sceneCacheBytes,filters:assets.vector!.filterStats.backingBytes,audio:audio.memoryBytes}),()=>{
    const gpu=assets.vector!.gpuSummary(),d=gpu.filter.details;
    return `Canvas2D; filters: ${gpu.lastFilterBackend}; ${d?.unmaskedRenderer??d?.renderer??'GPU identity unavailable'}`;
  });
  const scaleControl=document.querySelector<HTMLSelectElement>('#render-scale')!,statsControl=document.querySelector<HTMLInputElement>('#show-stats')!;
  const presentationControl=document.querySelector<HTMLSelectElement>('#presentation-profile')!;
  const applyPresentation=():void=>{
    document.documentElement.dataset.presentation=presentation.choice??'current';
    presentationControl.value=presentation.choice??'';
    renderer.setPresentation(presentation.choice);
    settings=displaySettings[presentation.choice==='extra'?'extra':'current'];
    hud.setEnabled(presentation.enhancements&&settings.stats);
    renderer.setRenderScale(presentation.enhancements?settings.scale:1);
    scaleControl.value=String(settings.scale);statsControl.checked=settings.stats;
    if(!presentation.enhancements){
      menu.open=false;if(dialog.open)dialog.close();if(saveDialog.open)saveDialog.close();
      document.documentElement.classList.remove('game-expanded');
      expandButton.setAttribute('aria-pressed','false');expandButton.title='Expand game to window';
      expandButton.setAttribute('aria-label',expandButton.title);expandButton.textContent='↗';
    }
  };
  applyPresentation();
  presentationControl.onchange=()=>{
    const choice=presentationChoice(presentationControl.value);if(!choice)return;
    presentation=resolvePresentation(choice);savePresentationChoice(displayStorage,choice);applyPresentation();
  };
  const saveDisplay=():void=>saveRenderSettings(displayStorage,settings,presentation.choice==='extra'?'madrasi-display-extra':'madrasi-display');
  scaleControl.onchange=()=>{if(!presentation.enhancements)return;settings.scale=Number(scaleControl.value);renderer.setRenderScale(settings.scale);saveDisplay();};
  statsControl.onchange=()=>{if(!presentation.enhancements)return;settings.stats=statsControl.checked;hud.setEnabled(settings.stats);saveDisplay();};
  const cue=document.querySelector<HTMLElement>('#batter-cue')!,bowl=assets.placement('mcMavu');
  const cueLabel=cue.querySelector('span')!;
  let batterHintDismissed=false,batterHintElapsedMs=0,batterHintLastMs:number|null=null;
  try{batterHintDismissed=displayStorage?.getItem('madrasi-batter-hint-seen')==='1';}catch{}
  const measured={now:0,elapsedMs:0,simulationMs:0,renderMs:0,audioMs:0,snapshotMs:0,painted:true};

  if(new URLSearchParams(location.search).has('diagnose')) (await import('../development/verification/diagnostics.js')).attachDiagnostics(game,renderer,assets);
  const profile=renderProfiler(canvas,assets.vector!);
  const profiling=new URLSearchParams(location.search).get('profile')==='1';
  const scoreConfiguration = readScoreConfiguration(document.querySelector('#score-service-config')?.textContent ?? '{}', location.href);
  const scoreClient = new LegacyScoreClient(scoreConfiguration);
  const onlineLayer = document.querySelector<HTMLElement>('#legacy-score-layer')!;
  const leaderboard = document.querySelector<HTMLAnchorElement>('#legacy-leaderboard')!;
  const branding = document.querySelector<HTMLAnchorElement>('#publisher-link')!;
  const remakeCredit = document.querySelector<HTMLElement>('#remake-credit')!;
  leaderboard.href = scoreClient.leaderboardUrl; branding.href = scoreClient.brandingUrl;
  document.querySelector<HTMLAnchorElement>('#online-scores-link')!.href = scoreClient.leaderboardUrl;
  const legacyForm = connectLegacyScoreForm({
    form: document.querySelector<HTMLFormElement>('#legacy-score-form')!,
    input: document.querySelector<HTMLInputElement>('#legacy-player-name')!,
    submit: document.querySelector<HTMLButtonElement>('#legacy-submit')!,
    status: document.querySelector<HTMLElement>('#legacy-score-status')!,
  }, scoreClient, phase => {
    renderer.scoreFormVisible = ['ready', 'unavailable', 'failed'].includes(phase);
    leaderboard.hidden = phase === 'hidden' || renderer.scoreFormVisible;
  });
  let last = performance.now(); let controlsKey = ''; let previousScreen: GameState['screen'] | undefined;
  let failedScore: Score | null = null;
  const localSubmit = form.querySelector('button')!;
  let localPending = false;
  const saveScore = (score: Score): void => {
    localPending = true; localSubmit.disabled = true;
    void scores.submit(score).then(() => { failedScore = null; scoreStatus.textContent = 'Score saved in this browser.'; }).catch(() => { failedScore = score; localSubmit.disabled = false; scoreStatus.textContent = 'The browser could not save your score. You can try again.'; }).finally(() => { localPending = false; });
  };
  const handle = (events: GameEvent[], state: Readonly<GameState>): void => {
    const audioAt=hud.enabled?performance.now():0;
    withAudio(() => audio.handle(events));if(hud.enabled)measured.audioMs=performance.now()-audioAt;renderer.events(events, state);
    for (const event of events) {
      if (event.type === 'score-request') saveScore(event);
      // The domain emits both ten-minute and next-day refreshes. Do not start another timer.
      if (event.type === 'session-refresh' && scoreConfiguration.gameId !== undefined && scoreClient.available('session')) {
        void scoreClient.refreshSession(scoreConfiguration.gameId).catch(error => { console.info('session-refresh', error instanceof Error ? error.message : 'Session refresh failed.'); });
      }
      if (event.type === 'diagnostic') console.info(event.code, event.message);
    }
  };
  const render = (state: Readonly<GameState>): void => {
    const started=hud.enabled||profiling?performance.now():0;
    if (previousScreen !== state.screen) {
      previousScreen = state.screen; failedScore = null; scoreStatus.textContent = '';
      form.hidden = state.screen !== 'game-over'; saveLink.hidden = form.hidden;
      onlineLayer.hidden = form.hidden;
      if (form.hidden) { legacyForm.hide(); if (saveDialog.open) saveDialog.close(); }
      else legacyForm.show(state.cash);
      if (!localPending) localSubmit.disabled = false;
      const frame = ({ menu: 3, instructions: 4, playing: 5, 'game-over': 6, 'day-result': 7 } as const)[state.screen];
      const logo = assets.scenes.find(scene => scene.frame === frame)?.instances.find(item => item.symbolId === 161);
      const bounds = assets.symbols.get(161)?.bounds;
      branding.hidden = !logo || !bounds;
      remakeCredit.hidden = branding.hidden;
      if (logo && bounds) {
        const m = logo.matrix;
        const corners = [[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],[bounds.x,bounds.y+bounds.height],[bounds.x+bounds.width,bounds.y+bounds.height]];
        const xs = corners.map(([x,y]) => m.tx+m.a*x!+m.c*y!); const ys = corners.map(([x,y]) => m.ty+m.b*x!+m.d*y!);
        branding.style.left = `${Math.min(...xs)/550*100}%`; branding.style.top = `${Math.min(...ys)/400*100}%`;
        branding.style.width = `${(Math.max(...xs)-Math.min(...xs))/550*100}%`; branding.style.height = `${(Math.max(...ys)-Math.min(...ys))/400*100}%`;
        remakeCredit.style.left = branding.style.left;
        remakeCredit.style.width = branding.style.width;
        remakeCredit.style.top = `${Math.max(...ys)/400*100+.45}%`;
      }
    }
    renderer.draw(state);
    measured.painted=renderer.lastDrawPainted;
    const actionable=presentation.enhancements&&state.screen==='playing'&&state.batterTemplate.available;
    const overBowl=Boolean(actionable&&bowl&&assets.contains(226,bowl.matrix,state.pointer.x,state.pointer.y));
    if(actionable&&batterHintLastMs!==null)batterHintElapsedMs+=Math.max(0,state.timeMs-batterHintLastMs);
    batterHintLastMs=actionable?state.timeMs:null;
    if(presentation.enhancements&&!batterHintDismissed&&(state.pointer.mode==='batter'||batterHintElapsedMs>=8000)){
      batterHintDismissed=true;try{displayStorage?.setItem('madrasi-batter-hint-seen','1');}catch{}
    }
    const showLabel=actionable&&!batterHintDismissed;
    if(cueLabel.hidden===showLabel)cueLabel.hidden=!showLabel;
    const selected=actionable&&state.pointer.mode==='batter';
    const showCue=actionable&&(showLabel||overBowl||selected);
    if(cue.hidden===showCue)cue.hidden=!showCue;
    const cueHover=String(overBowl);if(cue.dataset.hover!==cueHover)cue.dataset.hover=cueHover;
    const cueSelected=String(selected);if(cue.dataset.selected!==cueSelected)cue.dataset.selected=cueSelected;
    const pointerAction=presentation.enhancements?(overBowl&&state.pointer.mode==='blank'?'batter':renderer.foodCursor):'';
    if(canvas.dataset.action!==pointerAction)canvas.dataset.action=pointerAction;

    const hintText = state.tutorial.visible ? 'Watch the original tutorial. Use Skip to start playing.' : state.screen === 'playing' ? ({ blank: 'Batter → griddle → flip → plate → customer.', batter: 'Choose an empty spot on the griddle.', dosa: 'Click the plate to add your dosa.', plate: 'Click a customer to serve.' }[state.pointer.mode]) : state.screen === 'day-result' ? `Day ${state.day} complete. Total collection: ${state.cash}.` : state.screen === 'game-over' ? `Total collection: ${state.cash}. ${presentation.enhancements ? 'Submit online if available, try again, or use More options to save locally.' : 'Submit online if available or try again.'}` : 'Make dosas, keep your customers happy, and run the dhaba.';
    if (hint.textContent !== hintText) hint.textContent = hintText;
    const key = state.screen + String(state.tutorial.visible) + String(state.audio.enabled);
    if (controlsKey !== key) {
      controlsKey = key; controls.replaceChildren();
      for (const target of renderer.hits.filter(t => !['click-slot', 'click-customer', 'click-plate', 'pick-batter'].includes(t.command.type))) {
        const button = document.createElement('button'); button.className = 'game-control'; button.textContent = target.label; button.setAttribute('aria-label', target.label);
        const bounds = assets.symbols.get(target.id)?.bounds || { x: -10, y: -10, width: 90, height: 35 };
        button.style.left = `${(target.matrix.tx + bounds.x * target.matrix.a) / 550 * 100}%`;
        button.style.top = `${(target.matrix.ty + bounds.y * target.matrix.d) / 400 * 100}%`;
        button.style.width = `${Math.abs(bounds.width * target.matrix.a) / 550 * 100}%`; button.style.height = `${Math.abs(bounds.height * target.matrix.d) / 400 * 100}%`;
        button.addEventListener('click', () => { activateAudio(); dispatch(target.command); }); controls.append(button);
      }
    }
    if(profiling)profile(performance.now()-started,state.screen+(state.tutorial.visible?'-tutorial':''));
    feedback.resources(assets.failures, audio.missing, assets.names);
    if(hud.enabled)measured.renderMs=performance.now()-started;
  };
  const batch = createFrameBatch(game, (events, state) => { handle(events, state); render(state); },{enabled:()=>hud.enabled,record:(simulationMs,snapshotMs)=>{measured.simulationMs=simulationMs;measured.snapshotMs=snapshotMs;}});
  const dispatch: typeof batch.dispatch = command => { if (running) batch.dispatch(command); };
  connectPointer(renderer, dispatch, activateAudio);
  soundButton.addEventListener('click', activateAudio);
  document.addEventListener('pointerdown', activateAudio);
  document.addEventListener('keydown', activateAudio);
  saveLink.addEventListener('click', () => { menu.open = false; saveDialog.showModal(); });
  document.querySelector('#close-save-score')!.addEventListener('click', () => saveDialog.close());
  form.addEventListener('submit', event => { event.preventDefault(); if (failedScore) saveScore(failedScore); else if (name.value.trim()) dispatch({ type: 'submit-score', name: name.value }); });
  document.querySelector('#scores-link')!.addEventListener('click', () => {
    menu.open = false;
    void scores.list().then(entries => {
      const list = document.querySelector('#score-list')!; list.replaceChildren();
      for (const entry of entries) { const row = document.createElement('li'); const value = document.createElement('span'); row.textContent = entry.name; value.textContent = String(entry.score); row.append(value); list.append(row); }
      if (!entries.length) { const row = document.createElement('li'); row.textContent = 'No scores saved yet.'; list.append(row); }
      dialog.showModal();
    }).catch(() => {
      const list = document.querySelector('#score-list')!; list.replaceChildren();
      const row = document.createElement('li'); row.textContent = 'Saved scores cannot be read in this browser.'; list.append(row);
      if (!dialog.open) dialog.showModal();
    });
  });
  document.querySelector('#close-scores')!.addEventListener('click', () => dialog.close());
  batch.flush(0); feedback.ready();
  // Give the ready canvas a painted frame before attempting audible playback.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  activateAudio(); last = performance.now();
  const tick = (now: number): void => {
    if (!running) return;
    const elapsed = Math.max(0, now - last); last = now;
    try { batch.flush(elapsed); if(hud.enabled){measured.now=now;measured.elapsedMs=elapsed;hud.sample(measured);}requestAnimationFrame(tick); } catch { withAudio(() => audio.handle([{ type: 'stop-sounds' }])); fail(); }
  };
  requestAnimationFrame(tick);
}
void boot().catch(fail);
