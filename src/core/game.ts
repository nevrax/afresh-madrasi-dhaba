/** Source-derived domain model. Timing policy and unresolved Flash details: docs/reference/decisions.md. */
import { DeadlineQueue } from './scheduler.js';
export type Screen = 'menu' | 'instructions' | 'playing' | 'day-result' | 'game-over';
export type PointerMode = 'blank' | 'batter' | 'dosa' | 'plate';
export interface Dosa { id: number; slot: number; phase: 'first-side' | 'second-side'; elapsedMs: number; held: boolean; pose: number; smokePose: number | null }
export interface PlatedDosa extends Dosa { x: number; y: number }
export interface Customer {
  id: number; table: number | null; phase: 'absent' | 'waiting-order' | 'ordering' | 'eating' | 'exiting';
  orderRemaining: number; served: number; patience: number; angry: boolean; angrySinceMs: number | null;
  eatActions: number; phaseElapsedMs: number;
  visible: boolean; orderVisible: boolean; characterVisible: boolean; characterPlaying: boolean; characterPose: number;
  exitVisible: boolean; exitPlaying: boolean; exitPose: number;
}
export interface GameState {
  screen: Screen; timeMs: number; day: number; cash: number; lostCustomers: number; clockMinutes: number;
  tutorial: { visible: boolean; elapsedMs: number; childElapsedMs: number };
  pointer: { mode: PointerMode; x: number; y: number; heldSlot: number | null };
  batterTemplate: { available: boolean; playing: boolean; pose: number };
  food: (Dosa | null)[]; plate: PlatedDosa[]; platePosition: { x: number; y: number }; counterPosition: { x: number; y: number }; customers: Customer[]; tables: (number | null)[];
  audio: { enabled: boolean; music: number | null }; scoreSubmitted: boolean;
}
export type Command = { type: 'start' | 'play' | 'show-tutorial' | 'skip-tutorial' | 'next-day' | 'retry' | 'toggle-mute' | 'pick-batter' | 'click-plate' | 'background' }
  | { type: 'click-slot'; slot: number } | { type: 'click-customer'; customer: number }
  | { type: 'move-pointer'; x: number; y: number } | { type: 'submit-score'; name: string };
export type GameEvent = { type: 'sound'; name: string; loop?: number; volume?: number }
  | { type: 'stop-sounds' } | { type: 'stop-music' } | { type: 'screen'; screen: Screen }
  | { type: 'score-request'; name: string; score: number; gameName: string }
  | { type: 'session-refresh' } | { type: 'cash'; amount: number; table: number | null; slot?: number; x?: number; y?: number }
  | { type: 'diagnostic'; code: string; message: string };
export interface GameOptions { random?: () => number; nonPositiveSpawnIntervalMs?: number }
export interface Game { readonly state: Readonly<GameState>; snapshot(): GameState; dispatch(command: Command): GameEvent[]; advance(ms: number): GameEvent[] }

// Integer thirds of a millisecond preserve 12 Hz animation cadence and 100 ms timers exactly.
const CADENCE = 250;
// Ruffle 0.6.0 (cac5c99ce4a17e606f4ee3090389bb878f852055), core/src/timer.rs:194,231.
// Confirmed by the instrumented reference's zero/negative interval burst. Native event batching remains explicit.
const NON_POSITIVE_INTERVAL_MS = 10;
const EAT_CYCLE = [12, 10, 20, 9, 20] as const;
const FOOD = { flipFrom: 70 * CADENCE, flipUntil: 159 * CADENCE, pickupFrom: 36 * CADENCE, pickupUntil: 139 * CADENCE, firstRemoval: 283 * CADENCE, secondRemoval: 204 * CADENCE };
const PLATE_DEFAULT = { x: 25, y: 336.95 };
const COUNTER_INITIAL = { x: -0.65, y: 303.8 };
// The source stores patience in MovieClip._y, not a free Number. AVM1 writes truncate to 1/20 px.
// Ruffle0.6 reference confirms -65.8,-65.6,-65.35... and loss at callback160 (-29.85).
const patiencePosition = (value: number): number => Math.trunc(value * 20) / 20;
type Job = { at: number; id: number; generation: number | null; run: () => void };
const emptyCustomer = (id: number): Customer => ({ id, table: 0, phase: 'absent', orderRemaining: 0, served: 0, patience: -65.9, angry: false, angrySinceMs: null, eatActions: 0, phaseElapsedMs: 0, visible: false, orderVisible: false, characterVisible: false, characterPlaying: false, characterPose: 1, exitVisible: true, exitPlaying: false, exitPose: 1 });

export function createGame(options: GameOptions = {}): Game {
  let seed = 0x4d414452;
  const random = options.random ?? (() => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; });
  const pick = (count: number): number => { const n = random(); if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError('random must return a finite value in [0, 1)'); return Math.floor(n * count); };
  let now = 0, serial = 0, generation = 0, nextFood = 0;
  let tutorialTicks = 0, tutorialChildTicks = 0;
  const jobs = new DeadlineQueue<Job>();
  let events: GameEvent[] = [];
  // Root timeline StartSoundTag 162 at frame 3, outside the exported ActionScript.
  let initialEvents: GameEvent[] = [{ type: 'sound', name: 'bgMusic2', loop: 1, volume: 100 }];
  const beginEvents = (): void => { events = initialEvents; initialEvents = []; };
  const orderTimers = [0, 0, 0, 0, 0];
  const patienceTimers = [0, 0, 0, 0, 0];
  const liveCustomerTimers = new Set<number>();
  let nextCustomerTimer = 1;
  const foodAge = new Map<number, number>();
  const customerAge = [0, 0, 0, 0, 0];
  const exitStarts = [0, 0, 0, 0, 0];
  const pendingBills = new Set<number>();
  const s: GameState = { screen: 'menu', timeMs: 0, day: 1, cash: 0, lostCustomers: 0, clockMinutes: 540, tutorial: { visible: false, elapsedMs: 0, childElapsedMs: 0 }, pointer: { mode: 'blank', x: 0, y: 0, heldSlot: null }, batterTemplate: { available: false, playing: false, pose: 1 }, food: Array.from({ length: 18 }, () => null), plate: [], platePosition: { ...PLATE_DEFAULT }, counterPosition: { ...COUNTER_INITIAL }, customers: Array.from({ length: 5 }, (_, i) => emptyCustomer(i)), tables: Array.from({ length: 5 }, () => null), audio: { enabled: true, music: 2 }, scoreSubmitted: false };
  const emit = (event: GameEvent): void => { events.push(event); };
  const schedule = (delay: number, run: () => void, scoped = true): void => { jobs.push({ at: now + delay, id: serial++, generation: scoped ? generation : null, run }); };
  // AS2 setInterval returns a handle. Overwriting the MovieClip property does not cancel its old interval.
  const interval = (delay: number, run: () => void): number => {
    const handle = nextCustomerTimer++; liveCustomerTimers.add(handle);
    // Function timers survive removed clips. Their lexical MovieClip paths resolve again on the next day.
    const repeat = (): void => { schedule(delay, () => { if (!liveCustomerTimers.has(handle)) return; if (s.screen === 'playing') run(); if (liveCustomerTimers.has(handle)) repeat(); }, false); };
    repeat(); return handle;
  };
  const clearInterval = (handle: number | undefined): void => { if (handle !== undefined) liveCustomerTimers.delete(handle); };
  const clearKnownCustomerTimers = (id: number): void => { clearInterval(orderTimers[id]); clearInterval(patienceTimers[id]); orderTimers[id] = 0; patienceTimers[id] = 0; };
  const screen = (value: Screen): void => { s.screen = value; emit({ type: 'screen', screen: value }); };
  const stopSounds = (): void => { s.audio.music = null; emit({ type: 'stop-sounds' }); };
  const music = (): void => { s.audio.music = pick(2) + 1; emit({ type: 'sound', name: `bgMusic${s.audio.music}`, loop: 10000, volume: s.screen === 'playing' ? 50 : 100 }); };
  const resetPointer = (): void => { s.pointer.mode = 'blank'; s.pointer.heldSlot = null; };
  const returnPlate = (): void => {
    s.platePosition = { ...PLATE_DEFAULT };
    s.plate.forEach((dosa, i) => { dosa.x = PLATE_DEFAULT.x; dosa.y = PLATE_DEFAULT.y - i * 2; });
    s.counterPosition = { x: PLATE_DEFAULT.x + 35, y: PLATE_DEFAULT.y - 25 };
  };
  const clearDay = (): void => {
    // StopGame calls Initialize only through table.customerNumber, clearing the latest stored handles.
    // Overwritten handles remain live, inert while their clip is missing and rebound after retry/Tomorrow.
    for (const id of new Set(s.tables)) if (id !== null) clearKnownCustomerTimers(id);
    generation++; jobs.retain(job => job.generation === null);
    s.food.fill(null); s.plate = []; s.tables.fill(null); foodAge.clear(); pendingBills.clear(); resetPointer();
    s.platePosition = { ...PLATE_DEFAULT }; s.counterPosition = { ...COUNTER_INITIAL };
    s.batterTemplate = { available: false, playing: false, pose: 1 };
    s.customers = s.customers.map((_, id) => emptyCustomer(id));
    for (let id = 0; id < 5; id++) { orderTimers[id] = 0; patienceTimers[id] = 0; customerAge[id] = 0; }
  };
  const finish = (target: 'day-result' | 'game-over'): void => { clearDay(); stopSounds(); screen(target); s.scoreSubmitted = false; };
  const setPhase = (c: Customer, phase: Customer['phase']): void => { c.phase = phase; c.phaseElapsedMs = 0; customerAge[c.id] = 0; };
  const leave = (c: Customer, happy: boolean): void => {
    clearKnownCustomerTimers(c.id); setPhase(c, 'exiting'); c.orderRemaining = 0; c.angry = false; c.angrySinceMs = null;
    c.orderVisible = false; c.characterVisible = false; c.exitVisible = true; c.exitPlaying = true; c.exitPose = 1;
    exitStarts[c.id] = (exitStarts[c.id] ?? 0) + 1;
    // Only GoHappy resets/stops the character; OutOfPatience hides it without stopping its timeline.
    if (happy) { c.characterPose = 1; c.characterPlaying = false; }
    if (happy) { const amount = c.served * 2; s.cash += amount; emit({ type: 'cash', amount, table: c.table }); if (c.table !== null) pendingBills.add(c.table); }
    else { s.lostCustomers++; if (s.lostCustomers > 4) finish('game-over'); }
  };
  const manageTemper = (c: Customer): void => {
    // Source ManageTemper has no visible-order/phase guard: an orphan interval still changes the meter.
    c.patience = patiencePosition(c.patience + 0.2);
    if (c.patience >= -30) leave(c, false); else if (c.patience > -40 && !c.angry) { c.angry = true; c.angrySinceMs = s.timeMs; }
  };
  const order = (c: Customer): void => {
    clearInterval(orderTimers[c.id]);
    c.orderRemaining = pick(4) + 1; c.orderVisible = true; c.patience = -66; setPhase(c, 'ordering');
    patienceTimers[c.id] = interval(300, () => manageTemper(s.customers[c.id]!));
    if (s.audio.enabled) emit({ type: 'sound', name: `order${c.id}` });
  };
  const appear = (id: number, table: number): void => {
    const c = s.customers[id]; if (!c) return;
    // A failed random character search can reuse a visible character; preserve the source table assignment.
    c.table = table; s.tables[table] = id; c.served = 0; c.eatActions = 0; c.angry = false; c.angrySinceMs = null; setPhase(c, 'waiting-order');
    c.visible = true; c.orderVisible = false; c.characterVisible = true; c.characterPlaying = false;
    c.exitVisible = false; c.exitPlaying = false; c.exitPose = 1;
    // Appear neither resets the patience meter nor clears old handles before StartOrderTimer.
    orderTimers[id] = interval(6000, () => order(s.customers[id]!));
  };
  const spawn = (): void => {
    let id = 0;
    for (let attempt = 0; attempt < 100; attempt++) { id = pick(5); if (!s.customers[id]?.visible) break; }
    for (let attempt = 0; attempt < 100; attempt++) { const table = pick(5); if (s.tables[table] === null) { appear(id, table); break; } }
  };
  const spawnLoop = (interval: number): void => { schedule(interval, () => { spawn(); spawnLoop(interval); }); };
  const clock = (): void => { schedule(3000, () => { s.clockMinutes++; if (s.clockMinutes >= 720) finish('day-result'); else clock(); }); };
  const startDay = (): void => {
    clearDay(); s.lostCustomers = 0; s.clockMinutes = 540; s.tutorial.visible = false; screen('playing'); stopSounds();
    // Source mcDosa.Stop() is undefined (capital S). Ruffle reference confirms this hidden clip plays.
    s.batterTemplate = { available: true, playing: true, pose: 1 };
    // Original starts music even if its boolean mute flag is false. Later food callbacks stop it.
    music(); clock();
    let interval = (16 - s.day * 2) * 3000;
    if (interval <= 0) { const ms = options.nonPositiveSpawnIntervalMs ?? NON_POSITIVE_INTERVAL_MS; if (!Number.isFinite(ms) || ms <= 0) throw new RangeError('nonPositiveSpawnIntervalMs must be positive'); interval = ms * 3; emit({ type: 'diagnostic', code: 'non-positive-spawn-interval', message: `Day ${s.day} requests ${(16 - s.day * 2) * 1000} ms. Native interval uses ${ms} ms (Ruffle 0.6.0 minimum: 10 ms); callback batching remains the native deterministic policy.` }); }
    spawnLoop(interval);
  };
  const cadence = (): void => {
    schedule(CADENCE, () => {
      if (s.screen === 'instructions') {
        // Source hides mcInstruction without stopping it. HowToPlay rewinds its parent, not persistent children.
        s.tutorial.elapsedMs = ++tutorialTicks * CADENCE / 3;
        s.tutorial.childElapsedMs = ++tutorialChildTicks * CADENCE / 3;
      }
      if (s.screen === 'playing') {
        const template = s.batterTemplate;
        if (template.available && template.playing) {
          template.pose++;
          if (template.pose === 5 || template.pose === 36) {
            emit(template.pose === 5 ? { type: 'sound', name: 'sound-441' } : { type: 'sound', name: 'sound-446', loop: 20 });
            if (!s.audio.enabled) stopSounds();
          }
          if (template.pose === 284) {
            template.available = false; template.playing = false;
            const before = s.cash; s.cash = Math.max(0, s.cash - 2);
            // RemoveDosa also repositions the one shared loss clip, outside the source stage.
            emit({ type: 'cash', amount: s.cash - before, table: null, x: 1000, y: 1000 });
          }
        }
        for (const _table of pendingBills) { emit({ type: 'sound', name: 'cashregister' }); if (!s.audio.enabled) stopSounds(); }
        pendingBills.clear();
        // Unlike the parent, the unnamed12-frame smoke clip keeps playing during pickup/plating.
        for (const plated of s.plate) if (plated.smokePose !== null) plated.smokePose = plated.smokePose % 12 + 1;
        for (const dosa of s.food) {
          if (!dosa) continue;
          if (dosa.smokePose !== null) dosa.smokePose = dosa.smokePose % 12 + 1;
          if (dosa.held) continue;
          const age = (foodAge.get(dosa.id) ?? 0) + CADENCE; foodAge.set(dosa.id, age); dosa.elapsedMs = age / 3; dosa.pose = (dosa.phase === 'first-side' ? 1 : 291) + age / CADENCE;
          if (dosa.pose === 310) dosa.smokePose = 1;
          else if (dosa.pose === 485) dosa.smokePose = null;
          const sound = dosa.phase === 'first-side' ? (age === 4 * CADENCE ? 'sound-441' : age === 35 * CADENCE ? 'sound-446' : null) : (age === 4 * CADENCE ? 'sound-468' : age === 12 * CADENCE ? 'sound-446' : null);
          if (sound) {
            // StartSoundTag SOUNDINFO: frying446 loops20 at frame36 and15 at frame303.
            emit(sound === 'sound-446' ? { type: 'sound', name: sound, loop: dosa.phase === 'first-side' ? 20 : 15 } : { type: 'sound', name: sound });
            if (!s.audio.enabled) stopSounds();
          }
          if (age >= (dosa.phase === 'first-side' ? FOOD.firstRemoval : FOOD.secondRemoval)) { s.food[dosa.slot] = null; foodAge.delete(dosa.id); const before = s.cash; s.cash = Math.max(0, s.cash - 2); emit({ type: 'cash', amount: s.cash - before, table: null, slot: dosa.slot }); }
        }
        for (const c of s.customers) {
          if (s.screen !== 'playing') break;
          if (c.visible) { const age = (customerAge[c.id] ?? 0) + CADENCE; customerAge[c.id] = age; c.phaseElapsedMs = age / 3; }
          // Capture playback before callbacks; a newly started exit must not also advance in this cadence.
          const exitWasPlaying = c.exitPlaying, exitStart = exitStarts[c.id];
          if (c.characterPlaying) {
            const cycle = EAT_CYCLE[c.id] ?? 12; c.characterPose = c.characterPose % cycle + 1;
            if (c.characterPose === cycle) { c.eatActions++; if (c.eatActions >= c.served * 3) leave(c, true); }
          }
          if (exitWasPlaying && c.exitPlaying && exitStart === exitStarts[c.id]) {
            c.exitPose++;
            if (c.exitPose >= 7) { c.exitPose = 7; c.exitPlaying = false; c.exitVisible = false; c.visible = false; if (c.table !== null) s.tables[c.table] = null; setPhase(c, 'absent'); }
          }
        }
      }
      cadence();
    }, false);
  };
  const sessionRefresh = (): void => { schedule(1800000, () => { emit({ type: 'session-refresh' }); sessionRefresh(); }, false); };
  cadence(); sessionRefresh();
  const snapshot = (): GameState => JSON.parse(JSON.stringify(s)) as GameState;
  const dispatch = (command: Command): GameEvent[] => {
    beginEvents();
    if (command.type === 'move-pointer') {
      if (Number.isFinite(command.x) && Number.isFinite(command.y)) {
        const moved = s.pointer.x !== command.x || s.pointer.y !== command.y;
        s.pointer.x = command.x; s.pointer.y = command.y;
        // PlateClick only changes the mode. Source onMouseMove performs this relocation later.
        if (moved && s.pointer.mode === 'plate') {
          s.platePosition = { x: command.x, y: Math.min(390, command.y + 20) };
          s.plate.forEach((dosa, i) => { dosa.x = command.x; dosa.y = command.y - i * 2 + 20; });
          s.counterPosition = { x: command.x + 35, y: command.y - 25 };
        }
      }
      return events;
    }
    if (command.type === 'toggle-mute' && (s.screen === 'menu' || s.screen === 'playing')) {
      s.audio.enabled = !s.audio.enabled;
      if (s.audio.enabled) { emit({ type: 'stop-music' }); music(); }
      else { if (s.screen === 'menu') stopSounds(); else { s.audio.music = null; emit({ type: 'stop-music' }); } }
      return events;
    }
    if (command.type === 'start' && s.screen === 'menu') {
      tutorialTicks = 0; tutorialChildTicks = 0;
      s.tutorial = { visible: false, elapsedMs: 0, childElapsedMs: 0 }; screen('instructions');
    }
    else if (command.type === 'show-tutorial' && s.screen === 'instructions') { s.tutorial.visible = true; tutorialTicks = 0; s.tutorial.elapsedMs = 0; }
    else if ((command.type === 'play' || command.type === 'skip-tutorial') && s.screen === 'instructions') startDay();
    else if (command.type === 'next-day' && s.screen === 'day-result') { s.day++; emit({ type: 'session-refresh' }); startDay(); }
    else if (command.type === 'retry' && s.screen === 'game-over') { s.day = 1; s.cash = 0; startDay(); }
    else if (command.type === 'submit-score' && s.screen === 'game-over' && !s.scoreSubmitted) { s.scoreSubmitted = true; emit({ type: 'score-request', name: command.name, score: s.cash, gameName: 'madrasidhaba' }); }
    else if (s.screen === 'playing') {
      if (command.type === 'pick-batter' && s.pointer.mode === 'blank') {
        if (s.batterTemplate.available) { s.batterTemplate.pose = 1; s.batterTemplate.playing = false; }
        s.pointer.mode = 'batter';
      }
      else if (command.type === 'click-slot' && Number.isInteger(command.slot) && command.slot >= 0 && command.slot < 18) {
        const dosa = s.food[command.slot];
        if (s.pointer.mode === 'batter' && !dosa) {
          if (s.batterTemplate.available) { const created: Dosa = { id: nextFood++, slot: command.slot, phase: 'first-side', elapsedMs: 0, held: false, pose: 1, smokePose: null }; s.food[command.slot] = created; foodAge.set(created.id, 0); }
          // The source unconditionally resets the mouse even if its removed template cannot duplicate.
          resetPointer();
        }
        else if (s.pointer.mode !== 'batter' && s.pointer.mode !== 'dosa' && dosa) {
          const age = foodAge.get(dosa.id) ?? 0;
          if (dosa.phase === 'first-side' && age >= FOOD.flipFrom && age < FOOD.flipUntil) { dosa.phase = 'second-side'; dosa.elapsedMs = 0; dosa.pose = 291; foodAge.set(dosa.id, 0); }
          else if (dosa.phase === 'second-side' && age >= FOOD.pickupFrom && age < FOOD.pickupUntil) { dosa.held = true; s.pointer.mode = 'dosa'; s.pointer.heldSlot = command.slot; }
        }
      } else if (command.type === 'click-plate') {
        if (s.pointer.mode === 'dosa' && s.pointer.heldSlot !== null) { const dosa = s.food[s.pointer.heldSlot]; if (dosa) { s.plate.push({ ...dosa, held: false, smokePose: 1, x: s.pointer.x, y: s.pointer.y }); s.food[s.pointer.heldSlot] = null; foodAge.delete(dosa.id); } resetPointer(); }
        else if (s.pointer.mode === 'blank') s.pointer.mode = 'plate';
      } else if (command.type === 'click-customer' && s.pointer.mode === 'plate') {
        const c = s.customers[command.customer];
        if (c && c.visible) {
          if (c.orderVisible) { const offered = s.plate.length; c.patience = patiencePosition(c.patience - offered * 6); const used = Math.min(offered, c.orderRemaining); s.plate.splice(s.plate.length - used, used); c.served += used; c.orderRemaining -= used; if (c.orderRemaining === 0) { clearInterval(patienceTimers[c.id]); c.angry = false; c.angrySinceMs = null; c.orderVisible = false; c.characterPlaying = true; setPhase(c, 'eating'); } }
          emit({ type: 'sound', name: 'serve' }); returnPlate(); resetPointer();
        }
      } else if (command.type === 'background') { if (s.pointer.heldSlot !== null) { const dosa = s.food[s.pointer.heldSlot]; if (dosa) dosa.held = false; } if (s.pointer.mode === 'plate') returnPlate(); resetPointer(); }
    }
    return events;
  };
  return { get state() { return snapshot(); }, snapshot, dispatch, advance(ms: number): GameEvent[] {
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError('advance requires nonnegative finite milliseconds');
    beginEvents(); const target = now + ms * 3;
    while (true) {
      const job = jobs.peek(); if (!job || job.at > target + 1e-7) break;
      jobs.pop(); now = job.at; s.timeMs = now / 3;
      if (job.generation === null || job.generation === generation) job.run();
    }
    now = target; s.timeMs = now / 3; return events;
  } };
}
