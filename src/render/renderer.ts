import type { Command, Customer, Dosa, GameEvent, GameState } from '../core/game.js';
import { Assets, identity, type Matrix, type Placement } from './assets.js';
import type { VectorArt, VectorPlacement } from './vector.js';
import { resourceJson } from './resources.js';
import { resolvePresentation, type PresentationChoice } from '../presentation-profile.js';

export type RenderGroup = 'background'|'griddle-steam'|'traffic'|'customers'|'radio'|'other'|'food'|'dosa-steam';
export interface HitTarget { label: string; command: Command; id: number; matrix: Matrix; pixel?: boolean; frame?: number }
const screenFrame = { menu: 3, instructions: 4, playing: 5, 'game-over': 6, 'day-result': 7 };
const wrappers = [413, 399, 400, 371, 385];
// Shared with packaging so required player compositions cannot be dropped.
export const runtimeTimelineIds = [...wrappers, 476, 363, 357] as const;
// Only decorative clips sample between authored poses; gameplay holds and callbacks stay12Hz.
const trafficIds = new Set([204,206,210,215,218]);
const continuousDecorations = new Set([146,...trafficIds]);
const buttonCommands: Record<string, [string, Command]> = {
  btnStart: ['Start', { type: 'start' }], btnPlay: ['Play', { type: 'play' }],
  btnHowToPlay: ['How to play', { type: 'show-tutorial' }], btnTomorrow: ['Tomorrow', { type: 'next-day' }],
  btnTryAgain: ['Try again', { type: 'retry' }],
  btnMute: ['Mute music', { type: 'toggle-mute' }], btnUnMute: ['Unmute music', { type: 'toggle-mute' }],
};
const combine = (p: Matrix, q: Matrix): Matrix => ({ a: p.a*q.a+p.c*q.b, b:p.b*q.a+p.d*q.b, c:p.a*q.c+p.c*q.d, d:p.b*q.c+p.d*q.d, tx:p.a*q.tx+p.c*q.ty+p.tx, ty:p.b*q.tx+p.d*q.ty+p.ty });

export class Renderer {
  private presentation = resolvePresentation(null);
  setPresentation(choice: PresentationChoice | null): void {
    this.clearSceneCache();
    this.presentation = resolvePresentation(choice);
    this.assets.vector?.setSimplerEffects(this.presentation.simplerEffects);
    // Root effects are indexed against the active metadata view.
    if (this.assets.vector) this.compositionIndices.delete(this.assets.vector);
  }
  renderScale = 1;
  readonly diagnosticOmissions = new Set<RenderGroup>();
  onRenderCost: ((group:RenderGroup,ms:number)=>void)|null = null;
  setRenderScale(value:number):void {
    const scale=Number.isFinite(value)?Math.min(1,Math.max(.25,value)):1;
    if(scale!==this.renderScale){this.renderScale=scale;this.clearSceneCache();this.assets.vector?.clearCache();}
  }
  readonly hits: HitTarget[] = [];
  private ctx: CanvasRenderingContext2D;
  private sceneSurface: HTMLCanvasElement | null = null;
  private sceneKey = '';
  private sceneHits: HitTarget[] = [];
  private sceneVector: VectorArt | null = null;
  private frameKey = '';
  private frameVector: VectorArt | null = null;
  readonly frameCounts = { painted: 0, reused: 0 };
  lastDrawPainted = true;
  /** Diagnostic comparison only; keep normal scene retention but repaint every callback. */
  diagnosticFullFrameRedraw = false;
  /** Diagnostic comparison only; never selected by the player UI. */
  diagnosticFullSceneRedraw = false;
  get sceneCacheBytes(): number { return this.sceneSurface ? this.sceneSurface.width * this.sceneSurface.height * 4 : 0; }
  clearSceneCache(): void {
    this.frameKey = ''; this.frameVector = null;
    if (this.sceneSurface) this.sceneSurface.width = this.sceneSurface.height = 0;
    this.sceneSurface = null; this.sceneKey = ''; this.sceneHits = []; this.sceneVector = null;
  }
  private readonly children = new Map<number, Placement[]>();
  // These callers deliberately query authored frame 1: root scene effects and
  // one-frame customer wrappers. Animated food/bills keep their live queries.
  // A replacement asset pack gets its own index; surface-cache eviction does not
  // invalidate immutable placement metadata.
  private readonly compositionIndices = new WeakMap<VectorArt, Map<number, Map<number, VectorPlacement>>>();
  private displayWidth = 550;
  private displayHeight = 400;
  pressedCommand: string | null = null;
  scoreFormVisible = true;
  private sceneStartedMs = 0;
  private currentTimeMs = 0;
  private radioStartedMs = 0;
  private radioEnabled = true;
  private hoveredFood: number | null = null;
  private flipHint = false;
  foodCursor:'flip'|'pickup'|''='';
  private feedback: { time: number; amount: number; table: number | null; x: number; y: number }[] = [];
  constructor(readonly canvas: HTMLCanvasElement, readonly assets: Assets) {
    // Every frame covers the stage opaquely, so the browser need not composite an alpha channel.
    const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw new Error('Canvas is unavailable.'); this.ctx = ctx;
    this.displayWidth=canvas.clientWidth; this.displayHeight=canvas.clientHeight;
    new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box){this.displayWidth=box.width;this.displayHeight=box.height;}}).observe(canvas);
  }
  async load(): Promise<void> {
    await Promise.all(runtimeTimelineIds.map(async id => {
      const data = await resourceJson<{ events: (Placement & { frame: number; type: string })[] }>(`assets/timelines/${id}.json`);
      this.children.set(id, data.events.filter(e => e.type === 'place' && e.frame === 1));
    }));
    const sceneIds = this.assets.scenes.flatMap(s => s.frame >= 3 ? s.instances.map(i => i.symbolId) : []);
    await this.assets.preload([...new Set([...sceneIds, 242, 412, 398, 320, 338, 384, 345, 370, 472])]);
  }
  private composition(id: number): ReadonlyMap<number, VectorPlacement> {
    const vector = this.assets.vector!;
    let indices = this.compositionIndices.get(vector);
    if (!indices) { indices = new Map(); this.compositionIndices.set(vector, indices); }
    let index = indices.get(id);
    if (!index) { index = new Map(vector.placements(id).map(p => [p.depth, p])); indices.set(id, index); }
    return index;
  }
  events(events: GameEvent[], state: Readonly<GameState>): void {
    for (const event of events) {
      if (event.type === 'screen') { this.clearSceneCache(); this.feedback = []; this.hoveredFood = null; this.flipHint = false; this.sceneStartedMs = state.timeMs; this.radioStartedMs = state.timeMs; }
      if (event.type === 'cash') {
        this.feedback = this.feedback.filter(f => f.table !== event.table);
        const slot = event.slot === undefined ? undefined : this.assets.placement(`dosaHolder${event.slot}`);
        this.feedback.push({ time: state.timeMs, amount: event.amount, table: event.table, x: event.x ?? slot?.matrix.tx ?? state.pointer.x, y: event.y ?? slot?.matrix.ty ?? state.pointer.y });
      }
    }
  }
  private text(text: string, x: number, y: number, size = 13, color = '#fff', align: CanvasTextAlign = 'left', font = 236): void {
    const c = this.ctx; c.font = `${size}px madrasi-${font}, Arial, sans-serif`; c.textBaseline = 'top'; c.textAlign = align; c.fillStyle = color; c.fillText(text, x, y);
  }
  private sourceText(id: number, matrix: Matrix, value: string): void {
    const asset = this.assets.symbols.get(id), metadata = asset?.metadata, bounds = asset?.bounds;
    if (!metadata || !bounds) return;
    const color = metadata.children?.find(v => v.tag === 'textColor');
    const align = metadata.align === 2 ? 'center' : metadata.align === 1 ? 'right' : 'left';
    const width = Math.max(0, bounds.width - 4);
    const x = bounds.x + 2 + (align === 'center' ? width / 2 : align === 'right' ? width : 0);
    const c = this.ctx; c.save(); c.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
    this.text(value, x, bounds.y + 2, (metadata.fontHeight ?? 260) / 20, `rgba(${color?.red ?? 255},${color?.green ?? 255},${color?.blue ?? 255},${(color?.alpha ?? 255) / 255})`, align, metadata.fontId ?? 236); c.restore();
  }
  private customer(c: Customer, state: Readonly<GameState>, original: Placement): void {
    if (!c.visible || c.table === null) return;
    const table = this.assets.placement(`table${c.table}`); if (!table) return;
    const parent = { ...original.matrix, tx: table.matrix.tx, ty: table.matrix.ty - 40 };
    const children = this.children.get(original.symbolId) || [];
    for (const child of children) {
      if (child.name === 'character' && c.characterVisible) {
        const m = combine(parent, child.matrix);
        const frame = c.characterPose;
        this.assets.vector!.drawPlacement(this.ctx, child.symbolId, m, frame, this.composition(original.symbolId).get(child.depth));
        this.hits.push({ label: `Serve customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame });
      } else if (child.name?.startsWith('earSmoke') && c.angry) {
        const m = combine(parent, child.matrix);
        this.assets.draw(this.ctx, child.symbolId, m, Math.floor((state.timeMs - (c.angrySinceMs ?? state.timeMs)) * 12 / 1000) + 1);
      } else if (child.name === 'mcExit' && c.exitVisible) {
        const m = combine(parent, child.matrix);
        this.assets.vector!.drawPlacement(this.ctx, child.symbolId, m, c.exitPose, this.composition(original.symbolId).get(child.depth));
        this.hits.push({ label: `Customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame: c.exitPose });
      } else if (child.name === 'mcOrder' && c.orderVisible) {
        const m = combine(parent, child.matrix);
        // This clip is a patience indicator, driven explicitly by the domain's timer.
        this.order(c, m);
        this.hits.push({ label: `Serve customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame: Math.floor(c.phaseElapsedMs * 12 / 1000) + 1 });
      }
    }
  }
  private order(customer: Customer, matrix: Matrix): void {
    const frame = this.presentation.simplerEffects ? 1 : Math.floor((this.currentTimeMs-this.sceneStartedMs) * 12 / 1000) + 1;
    const bubble = this.assets.names.get('sprite-363-clean');
    if (bubble) this.assets.draw(this.ctx, bubble.symbolId, matrix, frame);
    else {
      for (const part of this.children.get(363) || []) {
        if (part.symbolId === 351 || part.symbolId === 357) continue;
        this.assets.draw(this.ctx, part.symbolId, combine(matrix, part.matrix), frame);
      }
    }
    const text = (this.children.get(363) || []).find(p => p.symbolId === 351);
    if (text) {
      this.sourceText(351, combine(matrix, text.matrix), String(customer.orderRemaining));
    }
    const meter = (this.children.get(363) || []).find(p => p.name === 'patienceMeter');
    if (!meter) return;
    const m = combine(matrix, meter.matrix), c = this.ctx;
    const clip = this.assets.symbols.get(352)?.bounds;
    if (!clip) return;
    c.save(); c.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    c.save(); c.beginPath(); c.rect(clip.x, clip.y, clip.width, clip.height); c.clip();
    this.assets.draw(c, 355, identity(-3.65, customer.patience)); c.restore();
    this.assets.draw(c, 356, identity()); c.restore();
  }
  private clock(p: Placement, minutes: number): void {
    for (const child of this.children.get(476) || []) {
      let matrix = child.matrix;
      if (child.name?.startsWith('needle')) {
        const angle = ((child.name === 'needleMinute' ? minutes % 60 * 6 : minutes / 60 * 30) - 90) * Math.PI / 180;
        const sx = Math.hypot(matrix.a, matrix.b), sy = Math.hypot(matrix.c, matrix.d);
        matrix = { ...matrix, a: Math.cos(angle) * sx, b: Math.sin(angle) * sx, c: -Math.sin(angle) * sy, d: Math.cos(angle) * sy };
      }
      this.assets.draw(this.ctx, child.symbolId, combine(p.matrix, matrix));
    }
  }
  draw(s: Readonly<GameState>): void {
    const key = this.unchangedFrameKey(s);
    if (key && key === this.frameKey && this.frameVector === this.assets.vector) {
      this.lastDrawPainted = false; this.frameCounts.reused++; return;
    }
    this.lastDrawPainted = true; this.frameCounts.painted++; this.frameKey = '';
    this.foodCursor='';
    this.currentTimeMs=s.timeMs;
    if (this.radioEnabled !== s.audio.enabled) { this.radioEnabled = s.audio.enabled; this.radioStartedMs = s.timeMs; }
    const c = this.ctx; const ratio = Math.min(devicePixelRatio || 1, 3); const width = Math.max(1,Math.round(this.displayWidth * ratio * this.renderScale)), height = Math.max(1,Math.round(this.displayHeight * ratio * this.renderScale));
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.assets.vector?.setViewport(width,height);
    c.setTransform(width / 550, 0, 0, height / 400, 0, 0); c.clearRect(0, 0, 550, 400); c.fillStyle = '#fff'; c.fillRect(0, 0, 550, 400);
    this.hits.length = 0;
    const frame = screenFrame[s.screen]; const scene = this.assets.scenes.find(v => v.frame === frame);
    this.drawRetainedScene(s,scene?.instances??[]);
    if(s.screen==='menu')this.closeMenuEdge(width,height);
    if(s.screen==='day-result')this.closeDayEdges(width,height);
    if (s.screen === 'playing') this.food(s);
    if (s.tutorial.visible) {
      // Native hit target for the original tutorial's Skip control.
      this.hits.length = 0;
      this.hits.push({ label: 'Skip tutorial', command: { type: 'skip-tutorial' }, id: 242, matrix: identity(515.3, 152), pixel: true, frame: 4 });
    }
    this.feedback = this.feedback.filter(v => s.timeMs - v.time < (v.table === null ? 29 : 16) / 12 * 1000);
    for (const f of this.feedback) {
      const pos = f.table === null ? { tx: f.x, ty: f.y } : this.assets.placement(`bill${f.table}`)?.matrix || identity(275, 150);
      const animationFrame = Math.floor((s.timeMs - f.time) * 12 / 1000) + 1;
      if (f.table === null) this.assets.draw(c, 437, identity(pos.tx, pos.ty), animationFrame);
      else {
        const p=this.assets.vector?.placements(431,animationFrame).find(p=>p.id===429);
        if(p){const [a,b,cc,d,tx,ty]=p.matrix;c.save();c.globalAlpha=Number(p.colorTransform?.alphaMultTerm??256)/256;
          this.sourceText(429,combine(identity(pos.tx,pos.ty),{a,b,c:cc,d,tx,ty}),`Rs.${f.amount}/-`);c.restore();}
      }
    }
    this.frameKey = key; this.frameVector = this.assets.vector;
  }

  private unchangedFrameKey(s: Readonly<GameState>): string {
    if (!this.presentation.retainScene || this.diagnosticFullFrameRedraw || this.diagnosticFullSceneRedraw || this.diagnosticOmissions.size || s.screen !== 'playing' || s.tutorial.visible) return '';
    // A blank pointer affects the canvas only when its food or button hover target changes.
    // Held batter, food and plate positions keep their continuous input coordinates.
    let pointer: unknown = s.pointer;
    if (s.pointer.mode === 'blank') {
      const hovered = s.food.find(d => {
        const p = d && this.assets.placement(`dosaHolder${d.slot}`);
        return d && !d.held && p && this.assets.contains(324,p.matrix,s.pointer.x,s.pointer.y);
      });
      const buttons = this.assets.scenes.find(v => v.frame === 5)?.instances.filter(p => p.name === 'btnMute' || p.name === 'btnUnMute') ?? [];
      pointer = { mode: 'blank', hovered: hovered?.slot ?? null, buttons: buttons.map(p => this.assets.contains(p.symbolId,p.matrix,s.pointer.x,s.pointer.y,true,4)) };
    }
    return JSON.stringify([this.displayWidth,this.displayHeight,devicePixelRatio,this.renderScale,this.pressedCommand,
      Math.floor((s.timeMs-this.sceneStartedMs)*12/1000),Math.floor((s.timeMs-this.radioStartedMs)*12/1000),
      {...s,timeMs:undefined,pointer},this.feedback.map(f => ({...f,time:Math.floor((s.timeMs-f.time)*12/1000)}))],
      (name,value:unknown) => name === 'elapsedMs' ? undefined : name === 'phaseElapsedMs' ? Math.floor(Number(value)*12/1000) : value);
  }

  private drawRetainedScene(s:Readonly<GameState>,placements:readonly Placement[]):void {
    const width=this.canvas.width,height=this.canvas.height;
    if (!this.presentation.retainScene || this.diagnosticFullSceneRedraw || this.diagnosticOmissions.size || s.screen!=='playing' || s.tutorial.visible || width*height*4>32*1024*1024) {
      this.clearSceneCache(); this.drawScene(s,placements); return;
    }
    let hover='';
    for(const p of placements)if(p.name==='btnMute'||p.name==='btnUnMute')hover+=this.assets.contains(p.symbolId,p.matrix,s.pointer.x,s.pointer.y,true,4)?'1':'0';
    const customers=s.customers.map(c=>[c.id,c.table,c.visible,c.characterVisible,c.characterPose,c.exitVisible,c.exitPose,c.orderVisible,c.orderRemaining,c.patience,Math.floor(c.phaseElapsedMs*12/1000),c.angry,c.angry?Math.floor((s.timeMs-(c.angrySinceMs??s.timeMs))*12/1000):0]);
    const key=JSON.stringify([Math.floor((s.timeMs-this.sceneStartedMs)*12/1000),Math.floor((s.timeMs-this.radioStartedMs)*12/1000),s.cash,s.lostCustomers,s.day,s.clockMinutes,customers,s.audio.enabled,hover,this.pressedCommand]);
    if(!this.sceneSurface || this.sceneSurface.width!==width || this.sceneSurface.height!==height || this.sceneVector!==this.assets.vector){
      this.clearSceneCache();this.sceneSurface=document.createElement('canvas');this.sceneSurface.width=width;this.sceneSurface.height=height;this.sceneVector=this.assets.vector;
    }
    const surface=this.sceneSurface,stage=this.ctx;
    if(key!==this.sceneKey){
      const c=surface.getContext('2d',{alpha:false})!;c.setTransform(width/550,0,0,height/400,0,0);c.clearRect(0,0,550,400);c.fillStyle='#fff';c.fillRect(0,0,550,400);
      this.ctx=c;
      try{this.drawScene(s,placements);}finally{this.ctx=stage;}
      this.sceneHits=this.hits.slice();this.sceneKey=key;
    }else this.hits.push(...this.sceneHits);
    stage.save();stage.setTransform(1,0,0,1,0,0);stage.drawImage(surface,0,0);stage.restore();
  }

  private drawScene(s:Readonly<GameState>,placements:readonly Placement[]):void {
    const c=this.ctx,frame=screenFrame[s.screen];
    const dynamic: Record<string, number> = { cashCollected: s.cash, txtCustomersLost: s.lostCustomers, txtDayNumber: s.day };
    for (const p of placements) {
      const name = p.name || '';
      const group:RenderGroup=p.symbolId===193?'background':p.symbolId===224?'griddle-steam':trafficIds.has(p.symbolId)?'traffic':/^customer\d$/.test(name)?'customers':name==='mcRadio'?'radio':'other';
      if(group!=='griddle-steam'&&this.diagnosticOmissions.has(group))continue;
      const at=this.onRenderCost?performance.now():0;
      try {
      if (name === 'btnMute' && !s.audio.enabled || name === 'btnUnMute' && s.audio.enabled) continue;
      if (name === 'mcInstruction') {
        if (s.tutorial.visible) this.assets.vector!.drawPlacement(c, p.symbolId, p.matrix,
          Math.round(s.tutorial.elapsedMs * 12 / 1000) + 1,
          { persistentFrame: Math.round(s.tutorial.childElapsedMs * 12 / 1000) + 1 });
        continue;
      }
      if (s.screen === 'game-over' && name === 'mcHighscorelist') continue;
      if (s.screen === 'game-over' && name === 'mcSubmitExternal') {
        if (this.scoreFormVisible) for (const part of this.assets.vector!.placements(579)) {
          if (part.id === 572 || part.id === 38) continue;
          const [a,b,cc,d,tx,ty]=part.matrix;
          const m=combine(p.matrix,{a,b,c:cc,d,tx,ty});
          if (part.id===578) this.sourceText(578,m,String(s.cash));
          else this.assets.vector!.drawPlacement(c,part.id,m,1,part);
        }
        continue;
      }
      if (s.screen === 'playing') {
        if (/^customer\d$/.test(name)) { const customer = s.customers[Number(name.slice(-1))]; if (customer) this.customer(customer, s, p); continue; }
        if (/^dosaHolder\d+$/.test(name)) {
          this.hits.push({ label: `Griddle spot ${Number(name.slice(10)) + 1}`, command: { type: 'click-slot', slot: Number(name.slice(10)) }, id: p.symbolId, matrix: p.matrix }); continue;
        }
        if (/^bill\d$/.test(name) || ['mcDosa', 'mcLost', 'mcText', 'txtDebug', 'txtTime', 'txtDosaCount'].includes(name)) continue;
        if (name === 'mcPlate') continue;
        if (name === 'mcClock') { this.clock(p, s.clockMinutes); continue; }
        if (name in dynamic) { this.sourceText(p.symbolId, p.matrix, String(dynamic[name])); continue; }
      }
      if (s.screen === 'game-over' && name === 'txtTotalCollection' || s.screen === 'day-result' && name === 'txtNetCollection') { this.sourceText(p.symbolId, p.matrix, String(s.cash)+'/-'); continue; }
      const button = buttonCommands[name];
      const isButton = this.assets.symbols.get(p.symbolId)?.kind === 'button';
      const hover = isButton && this.assets.contains(p.symbolId, p.matrix, s.pointer.x, s.pointer.y, true, 4);
      const interpolate=this.presentation.interpolateDecorations&&continuousDecorations.has(p.symbolId)&&!(this.presentation.retainScene&&s.screen==='playing');
      const clock=(s.timeMs-(name==='mcRadio'?this.radioStartedMs:this.sceneStartedMs))*12/1000;
      const visualFrame = isButton ? hover ? this.pressedCommand === JSON.stringify(button?.[1]) ? 3 : 2 : 1 : name === 'mcRadio' && !s.audio.enabled ? 1 : (interpolate?clock:Math.floor(clock)) + 1;
      const sourcePlacement=this.composition(-1000-frame).get(p.depth);
      if (!sourcePlacement?.clipDepth) this.assets.vector!.drawPlacement(c, p.symbolId, p.matrix, visualFrame, {...sourcePlacement,interpolate});
      if (button && (!name.includes('Mute') || s.screen === 'menu' || s.screen === 'playing')) this.hits.push({ label: button[0], command: button[1], id: p.symbolId, matrix: p.matrix, pixel: true, frame: 4 });
      } finally {this.onRenderCost?.(group,performance.now()-at);}
    }
  }
  private closeMenuEdge(width:number,height:number):void {
    // Source mask 110 ends at x=272+277.15=549.15 on a 550-wide stage.
    // Extend the last fully covered column across that subpixel seam only.
    const edge=Math.max(1,Math.floor(width*549/550));
    const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
    c.drawImage(this.canvas,edge-1,0,1,height,edge,0,width-edge,height);c.restore();
  }
  private closeDayEdges(width:number,height:number):void {
    // Source mask580, translated by (142.9,156), covers only
    // x=1.15..548.75 and y=1..399.6 of the 550x400 stage.
    // The sky shape581 also ends at x=548.25 below its top section.
    // Sample inside both boundaries, excluding their antialiased pixels.
    // Leave source geometry, interior pixels and input coordinates untouched.
    const left=Math.min(width-1,Math.ceil(width*2/550));
    const right=Math.max(left,Math.floor(width*547/550)-1);
    const top=Math.min(height-1,Math.ceil(height*2/400));
    const bottom=Math.max(top,Math.floor(height*398/400)-1);
    const c=this.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
    c.drawImage(this.canvas,left,0,1,height,0,0,left,height);
    c.drawImage(this.canvas,right,0,1,height,right+1,0,width-right-1,height);
    c.drawImage(this.canvas,0,top,width,1,0,0,width,top);
    c.drawImage(this.canvas,0,bottom,width,1,0,bottom+1,width,height-bottom-1);
    c.restore();
  }
  private dosa(dosa: Dosa, matrix: Matrix): void {
    if (dosa.smokePose === null) { if(this.diagnosticOmissions.has('food'))return; const at=this.onRenderCost?performance.now():0;this.assets.draw(this.ctx, 472, matrix, dosa.pose);this.onRenderCost?.('food',performance.now()-at);return; }
    // Cooked frames310–484 have no masks. Their only nested animation is smoke223;
    // stopping/duplicating the food timeline does not stop that child.
    for (const part of this.assets.vector!.placements(472,dosa.pose)) {
      const [a,b,c,d,tx,ty]=part.matrix;
      const group:RenderGroup=part.id===223&&part.depth===9?'dosa-steam':'food';
      if(this.diagnosticOmissions.has(group))continue;
      const at=this.onRenderCost?performance.now():0;
      const frame=part.id===223 && part.depth===9 ? dosa.smokePose : Math.max(1,dosa.pose-part.born+1);
      this.assets.vector!.drawPlacement(this.ctx,part.id,combine(matrix,{a,b,c,d,tx,ty}),frame,part,1,true,(part.ratio??0)/65535);
      this.onRenderCost?.(group,performance.now()-at);
    }
  }
  private food(s: Readonly<GameState>): void {
    const c = this.ctx; const template = this.assets.placement('mcDosa'); if (!template) return;
    const hovered = s.food.find(dosa => {
      const holder = dosa && this.assets.placement(`dosaHolder${dosa.slot}`);
      return dosa && !dosa.held && holder && this.assets.contains(324, holder.matrix, s.pointer.x, s.pointer.y);
    }) ?? null;
    // Re-evaluate readiness even when the pointer stays still. Source click windows
    // are discrete and cannot be inferred from a stale hover-entry label.
    if(hovered&&s.pointer.mode!=='batter'&&s.pointer.mode!=='dosa'){
      if(hovered.phase==='first-side'&&hovered.pose>=71&&hovered.pose<160)this.foodCursor='flip';
      else if(hovered.phase==='second-side'&&hovered.pose>=327&&hovered.pose<430)this.foodCursor='pickup';
    }
    if ((hovered?.slot ?? null) !== this.hoveredFood) {
      this.hoveredFood = hovered?.slot ?? null;
      this.flipHint = Boolean(hovered && hovered.pose >= 71 && hovered.pose <= 159);
    }
    for (const dosa of s.food) {
      if (!dosa) continue;
      const holder = this.assets.placement(`dosaHolder${dosa.slot}`); if (!holder) continue;
      const m = { ...template.matrix, tx: dosa.held ? s.pointer.x : holder.matrix.tx, ty: dosa.held ? s.pointer.y : holder.matrix.ty };
      this.dosa(dosa,m);
      if (!dosa.held && this.flipHint && this.hoveredFood === dosa.slot) {
        this.assets.draw(c, 428, identity(holder.matrix.tx + 25, holder.matrix.ty));
      }
    }
    const plate = this.assets.placement('mcPlate'); if (!plate) return;
    const m = { ...plate.matrix, tx: s.platePosition.x, ty: s.platePosition.y };
    this.assets.draw(c, 230, m);
    s.plate.forEach(dosa => this.dosa(dosa,{ ...template.matrix, tx: dosa.x, ty: dosa.y }));
    this.sourceText(424, identity(s.counterPosition.x, s.counterPosition.y), String(s.plate.length));
    this.hits.push({ label: 'Plate', command: { type: 'click-plate' }, id: 230, matrix: m });
    const batter = this.assets.placement('mcMavu');
    if (batter) this.hits.push({ label: 'Batter bowl', command: { type: 'pick-batter' }, id: 226, matrix: batter.matrix });
    if (s.pointer.mode === 'batter' && s.batterTemplate.available) {
      this.assets.draw(c, 472, { ...template.matrix, tx: s.pointer.x, ty: s.pointer.y }, 1);
    }
  }
  hit(x: number, y: number): Command {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const target = this.hits[i]!;
      if (this.assets.contains(target.id, target.matrix, x, y, target.pixel, target.frame)) return target.command;
    }
    return { type: 'background' };
  }
}
