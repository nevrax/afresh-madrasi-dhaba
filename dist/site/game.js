(function(){'use strict';const factories={"src/main.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_js_1 = require("./core/game.js");
const assets_js_1 = require("./render/assets.js");
const renderer_js_1 = require("./render/renderer.js");
const audio_js_1 = require("./audio/audio.js");
const pointer_js_1 = require("./input/pointer.js");
const scores_js_1 = require("./services/scores.js");
const fullscreen_js_1 = require("./ui/fullscreen.js");
const performance_hud_js_1 = require("./ui/performance-hud.js");
const render_settings_js_1 = require("./ui/render-settings.js");
const profile_js_1 = require("./render/profile.js");
const legacy_scores_js_1 = require("./services/legacy-scores.js");
const score_configuration_js_1 = require("./services/score-configuration.js");
const legacy_score_form_js_1 = require("./ui/legacy-score-form.js");
const frame_batch_js_1 = require("./ui/frame-batch.js");
const runtime_feedback_js_1 = require("./ui/runtime-feedback.js");
const presentation_profile_js_1 = require("./presentation-profile.js");
const canvas = document.querySelector('#game');
const loading = document.querySelector('#loading');
const controls = document.querySelector('#controls');
const hint = document.querySelector('#hint');
const form = document.querySelector('#score-form');
const scoreStatus = document.querySelector('#score-status');
const name = document.querySelector('#player-name');
const dialog = document.querySelector('#scores-dialog');
const scores = new scores_js_1.LocalScores();
const soundButton = document.querySelector('#enable-audio');
const saveDialog = document.querySelector('#save-score-dialog');
const saveLink = document.querySelector('#save-score-link');
const menu = document.querySelector('#app-menu');
const feedback = (0, runtime_feedback_js_1.runtimeFeedback)(loading, document.querySelector('#resource-status'));
let running = true;
const fail = () => { running = false; controls.replaceChildren(); feedback.failed(); };
(0, fullscreen_js_1.connectFullscreen)(document.querySelector('#fullscreen'), document.querySelector('#display-status'));
const expandButton = document.querySelector('#expand-game');
expandButton.onclick = () => {
    const expanded = document.documentElement.classList.toggle('game-expanded');
    expandButton.setAttribute('aria-pressed', String(expanded));
    const label = expanded ? 'Restore compact game' : 'Expand game to window';
    expandButton.title = label;
    expandButton.setAttribute('aria-label', label);
    expandButton.textContent = expanded ? '↙' : '↗';
};
async function boot() {
    const assets = new assets_js_1.Assets();
    await assets.load();
    const renderer = new renderer_js_1.Renderer(canvas, assets);
    await renderer.load();
    const audio = new audio_js_1.GameAudio(assets, running => { soundButton.hidden = running; });
    const withAudio = (0, runtime_feedback_js_1.optionalAudio)(() => { soundButton.hidden = true; feedback.audioUnavailable(); });
    const activateAudio = () => withAudio(() => audio.activate());
    const game = (0, game_js_1.createGame)({ random: Math.random });
    let displayStorage = null;
    try {
        displayStorage = localStorage;
    }
    catch { }
    let presentation = (0, presentation_profile_js_1.resolvePresentation)((0, presentation_profile_js_1.presentationChoice)(new URLSearchParams(location.search).get('presentation')) ?? (0, presentation_profile_js_1.loadPresentationChoice)(displayStorage));
    const displaySettings = { current: (0, render_settings_js_1.loadRenderSettings)(displayStorage), extra: (0, render_settings_js_1.loadRenderSettings)(displayStorage, 'madrasi-display-extra') };
    let settings = displaySettings[presentation.choice === 'extra' ? 'extra' : 'current'];
    const hud = (0, performance_hud_js_1.createPerformanceHud)(canvas, () => ({ tiles: assets.vector.stats.cachedBytes, pool: assets.vector.stats.pooledBytes, scene: renderer.sceneCacheBytes, cursor: renderer.cursorDataBytes, filters: assets.vector.filterStats.backingBytes, audio: audio.memoryBytes }), () => {
        const gpu = assets.vector.gpuSummary(), d = gpu.filter.details;
        return `Canvas2D; filters: ${gpu.lastFilterBackend}; ${d?.unmaskedRenderer ?? d?.renderer ?? 'GPU identity unavailable'}`;
    });
    const scaleControl = document.querySelector('#render-scale'), statsControl = document.querySelector('#show-stats');
    const presentationControl = document.querySelector('#presentation-profile');
    const applyPresentation = () => {
        document.documentElement.dataset.presentation = presentation.choice ?? 'current';
        presentationControl.value = presentation.choice ?? '';
        renderer.setPresentation(presentation.choice);
        settings = displaySettings[presentation.choice === 'extra' ? 'extra' : 'current'];
        hud.setEnabled(presentation.enhancements && settings.stats);
        renderer.setRenderScale(presentation.enhancements ? settings.scale : 1);
        scaleControl.value = String(settings.scale);
        statsControl.checked = settings.stats;
        if (!presentation.enhancements) {
            menu.open = false;
            if (dialog.open)
                dialog.close();
            if (saveDialog.open)
                saveDialog.close();
            document.documentElement.classList.remove('game-expanded');
            expandButton.setAttribute('aria-pressed', 'false');
            expandButton.title = 'Expand game to window';
            expandButton.setAttribute('aria-label', expandButton.title);
            expandButton.textContent = '↗';
        }
    };
    applyPresentation();
    presentationControl.onchange = () => {
        const choice = (0, presentation_profile_js_1.presentationChoice)(presentationControl.value);
        if (!choice)
            return;
        presentation = (0, presentation_profile_js_1.resolvePresentation)(choice);
        (0, presentation_profile_js_1.savePresentationChoice)(displayStorage, choice);
        applyPresentation();
    };
    const saveDisplay = () => (0, render_settings_js_1.saveRenderSettings)(displayStorage, settings, presentation.choice === 'extra' ? 'madrasi-display-extra' : 'madrasi-display');
    scaleControl.onchange = () => {
        if (!presentation.enhancements)
            return;
        settings.scale = Number(scaleControl.value);
        renderer.setRenderScale(settings.scale);
        saveDisplay();
    };
    statsControl.onchange = () => {
        if (!presentation.enhancements)
            return;
        settings.stats = statsControl.checked;
        hud.setEnabled(settings.stats);
        saveDisplay();
    };
    const cue = document.querySelector('#batter-cue'), bowl = assets.placement('mcMavu');
    const cueLabel = cue.querySelector('span');
    let batterHintDismissed = false, batterHintElapsedMs = 0, batterHintLastMs = null;
    try {
        batterHintDismissed = displayStorage?.getItem('madrasi-batter-hint-seen') === '1';
    }
    catch { }
    const measured = { now: 0, elapsedMs: 0, simulationMs: 0, renderMs: 0, audioMs: 0, snapshotMs: 0, painted: true };
    const profile = (0, profile_js_1.renderProfiler)(canvas, assets.vector);
    const profiling = new URLSearchParams(location.search).get('profile') === '1';
    const scoreConfiguration = (0, score_configuration_js_1.readScoreConfiguration)(document.querySelector('#score-service-config')?.textContent ?? '{}', location.href);
    const scoreClient = new legacy_scores_js_1.LegacyScoreClient(scoreConfiguration);
    const onlineLayer = document.querySelector('#legacy-score-layer');
    const leaderboard = document.querySelector('#legacy-leaderboard');
    const branding = document.querySelector('#publisher-link');
    const remakeCredit = document.querySelector('#remake-credit');
    leaderboard.href = scoreClient.leaderboardUrl;
    branding.href = scoreClient.brandingUrl;
    document.querySelector('#online-scores-link').href = scoreClient.leaderboardUrl;
    const legacyForm = (0, legacy_score_form_js_1.connectLegacyScoreForm)({
        form: document.querySelector('#legacy-score-form'),
        input: document.querySelector('#legacy-player-name'),
        submit: document.querySelector('#legacy-submit'),
        status: document.querySelector('#legacy-score-status'),
    }, scoreClient, phase => {
        renderer.scoreFormVisible = ['ready', 'unavailable', 'failed'].includes(phase);
        leaderboard.hidden = phase === 'hidden' || renderer.scoreFormVisible;
    });
    let last = performance.now();
    let controlsKey = '';
    let previousScreen;
    let failedScore = null;
    const localSubmit = form.querySelector('button');
    let localPending = false;
    const saveScore = (score) => {
        localPending = true;
        localSubmit.disabled = true;
        void scores.submit(score).then(() => { failedScore = null; scoreStatus.textContent = 'Score saved in this browser.'; }).catch(() => { failedScore = score; localSubmit.disabled = false; scoreStatus.textContent = 'The browser could not save your score. You can try again.'; }).finally(() => { localPending = false; });
    };
    const handle = (events, state) => {
        const audioAt = hud.enabled ? performance.now() : 0;
        withAudio(() => audio.handle(events));
        if (hud.enabled)
            measured.audioMs = performance.now() - audioAt;
        renderer.events(events, state);
        for (const event of events) {
            if (event.type === 'score-request')
                saveScore(event);
            // The domain emits both ten-minute and next-day refreshes. Do not start another timer.
            if (event.type === 'session-refresh' && scoreConfiguration.gameId !== undefined && scoreClient.available('session')) {
                void scoreClient.refreshSession(scoreConfiguration.gameId).catch(error => { console.info('session-refresh', error instanceof Error ? error.message : 'Session refresh failed.'); });
            }
            if (event.type === 'diagnostic')
                console.info(event.code, event.message);
        }
    };
    const render = (state) => {
        const started = hud.enabled || profiling ? performance.now() : 0;
        if (previousScreen !== state.screen) {
            previousScreen = state.screen;
            failedScore = null;
            scoreStatus.textContent = '';
            form.hidden = state.screen !== 'game-over';
            saveLink.hidden = form.hidden;
            onlineLayer.hidden = form.hidden;
            if (form.hidden) {
                legacyForm.hide();
                if (saveDialog.open)
                    saveDialog.close();
            }
            else
                legacyForm.show(state.cash);
            if (!localPending)
                localSubmit.disabled = false;
            const frame = { menu: 3, instructions: 4, playing: 5, 'game-over': 6, 'day-result': 7 }[state.screen];
            const logo = assets.scenes.find(scene => scene.frame === frame)?.instances.find(item => item.symbolId === 161);
            const bounds = assets.symbols.get(161)?.bounds;
            branding.hidden = !logo || !bounds;
            remakeCredit.hidden = branding.hidden;
            if (logo && bounds) {
                const m = logo.matrix;
                const corners = [[bounds.x, bounds.y], [bounds.x + bounds.width, bounds.y], [bounds.x, bounds.y + bounds.height], [bounds.x + bounds.width, bounds.y + bounds.height]];
                const xs = corners.map(([x, y]) => m.tx + m.a * x + m.c * y);
                const ys = corners.map(([x, y]) => m.ty + m.b * x + m.d * y);
                branding.style.left = `${Math.min(...xs) / 550 * 100}%`;
                branding.style.top = `${Math.min(...ys) / 400 * 100}%`;
                branding.style.width = `${(Math.max(...xs) - Math.min(...xs)) / 550 * 100}%`;
                branding.style.height = `${(Math.max(...ys) - Math.min(...ys)) / 400 * 100}%`;
                remakeCredit.style.left = branding.style.left;
                remakeCredit.style.width = branding.style.width;
                remakeCredit.style.top = `${Math.max(...ys) / 400 * 100 + .45}%`;
            }
        }
        renderer.draw(state);
        measured.painted = renderer.lastDrawPainted;
        const actionable = presentation.enhancements && state.screen === 'playing' && state.batterTemplate.available;
        const overBowl = Boolean(actionable && bowl && assets.contains(226, bowl.matrix, state.pointer.x, state.pointer.y));
        if (actionable && batterHintLastMs !== null)
            batterHintElapsedMs += Math.max(0, state.timeMs - batterHintLastMs);
        batterHintLastMs = actionable ? state.timeMs : null;
        if (presentation.enhancements && !batterHintDismissed && (state.pointer.mode === 'batter' || batterHintElapsedMs >= 8000)) {
            batterHintDismissed = true;
            try {
                displayStorage?.setItem('madrasi-batter-hint-seen', '1');
            }
            catch { }
        }
        const showLabel = actionable && !batterHintDismissed;
        if (cueLabel.hidden === showLabel)
            cueLabel.hidden = !showLabel;
        const selected = actionable && state.pointer.mode === 'batter';
        const showCue = actionable && (showLabel || overBowl || selected);
        if (cue.hidden === showCue)
            cue.hidden = !showCue;
        const cueHover = String(overBowl);
        if (cue.dataset.hover !== cueHover)
            cue.dataset.hover = cueHover;
        const cueSelected = String(selected);
        if (cue.dataset.selected !== cueSelected)
            cue.dataset.selected = cueSelected;
        const pointerAction = presentation.enhancements ? (overBowl && state.pointer.mode === 'blank' ? 'batter' : renderer.foodCursor) : '';
        if (canvas.dataset.action !== pointerAction)
            canvas.dataset.action = pointerAction;
        const hintText = state.tutorial.visible ? 'Watch the original tutorial. Use Skip to start playing.' : state.screen === 'playing' ? ({ blank: 'Batter → griddle → flip → plate → customer.', batter: 'Choose an empty spot on the griddle.', dosa: 'Click the plate to add your dosa.', plate: 'Click a customer to serve.' }[state.pointer.mode]) : state.screen === 'day-result' ? `Day ${state.day} complete. Total collection: ${state.cash}.` : state.screen === 'game-over' ? `Total collection: ${state.cash}. ${presentation.enhancements ? 'Submit online if available, try again, or use More options to save locally.' : 'Submit online if available or try again.'}` : 'Make dosas, keep your customers happy, and run the dhaba.';
        if (hint.textContent !== hintText)
            hint.textContent = hintText;
        const key = state.screen + String(state.tutorial.visible) + String(state.audio.enabled);
        if (controlsKey !== key) {
            controlsKey = key;
            controls.replaceChildren();
            for (const target of renderer.hits.filter(t => !['click-slot', 'click-customer', 'click-plate', 'pick-batter'].includes(t.command.type))) {
                const button = document.createElement('button');
                button.className = 'game-control';
                button.textContent = target.label;
                button.setAttribute('aria-label', target.label);
                const bounds = assets.symbols.get(target.id)?.bounds || { x: -10, y: -10, width: 90, height: 35 };
                button.style.left = `${(target.matrix.tx + bounds.x * target.matrix.a) / 550 * 100}%`;
                button.style.top = `${(target.matrix.ty + bounds.y * target.matrix.d) / 400 * 100}%`;
                button.style.width = `${Math.abs(bounds.width * target.matrix.a) / 550 * 100}%`;
                button.style.height = `${Math.abs(bounds.height * target.matrix.d) / 400 * 100}%`;
                button.addEventListener('click', () => { activateAudio(); dispatch(target.command); });
                controls.append(button);
            }
        }
        if (profiling)
            profile(performance.now() - started, state.screen + (state.tutorial.visible ? '-tutorial' : ''));
        feedback.resources(assets.failures, audio.missing, assets.names);
        if (hud.enabled)
            measured.renderMs = performance.now() - started;
    };
    const batch = (0, frame_batch_js_1.createFrameBatch)(game, (events, state) => { handle(events, state); render(state); }, { enabled: () => hud.enabled, record: (simulationMs, snapshotMs) => { measured.simulationMs = simulationMs; measured.snapshotMs = snapshotMs; } });
    let preparing = false;
    const dispatch = command => {
        if (!running || preparing)
            return;
        if (command.type !== 'play' && command.type !== 'skip-tutorial') {
            batch.dispatch(command);
            return;
        }
        preparing = true;
        loading.textContent = 'Preparing the kitchen…';
        loading.hidden = false;
        void (async () => {
            // Paint the status before shader/tile creation. No cooking time elapses here.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            await renderer.prepare();
            if (running) {
                batch.dispatch(command);
                loading.hidden = true;
                last = performance.now();
            }
        })().catch(fail).finally(() => { preparing = false; });
    };
    (0, pointer_js_1.connectPointer)(renderer, dispatch, activateAudio);
    soundButton.addEventListener('click', activateAudio);
    document.addEventListener('pointerdown', activateAudio);
    document.addEventListener('keydown', activateAudio);
    saveLink.addEventListener('click', () => { menu.open = false; saveDialog.showModal(); });
    document.querySelector('#close-save-score').addEventListener('click', () => saveDialog.close());
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (failedScore)
            saveScore(failedScore);
        else if (name.value.trim())
            dispatch({ type: 'submit-score', name: name.value });
    });
    document.querySelector('#scores-link').addEventListener('click', () => {
        menu.open = false;
        void scores.list().then(entries => {
            const list = document.querySelector('#score-list');
            list.replaceChildren();
            for (const entry of entries) {
                const row = document.createElement('li');
                const value = document.createElement('span');
                row.textContent = entry.name;
                value.textContent = String(entry.score);
                row.append(value);
                list.append(row);
            }
            if (!entries.length) {
                const row = document.createElement('li');
                row.textContent = 'No scores saved yet.';
                list.append(row);
            }
            dialog.showModal();
        }).catch(() => {
            const list = document.querySelector('#score-list');
            list.replaceChildren();
            const row = document.createElement('li');
            row.textContent = 'Saved scores cannot be read in this browser.';
            list.append(row);
            if (!dialog.open)
                dialog.showModal();
        });
    });
    document.querySelector('#close-scores').addEventListener('click', () => dialog.close());
    batch.flush(0);
    feedback.ready();
    // Give the ready canvas a painted frame before attempting audible playback.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    activateAudio();
    last = performance.now();
    const tick = (now) => {
        if (!running)
            return;
        const elapsed = Math.max(0, now - last);
        last = now;
        if (preparing) {
            requestAnimationFrame(tick);
            return;
        }
        try {
            batch.flush(elapsed);
            if (hud.enabled) {
                measured.now = now;
                measured.elapsedMs = elapsed;
                hud.sample(measured);
            }
            requestAnimationFrame(tick);
        }
        catch {
            withAudio(() => audio.handle([{ type: 'stop-sounds' }]));
            fail();
        }
    };
    requestAnimationFrame(tick);
}
void boot().catch(fail);

},{"./core/game.js":"src/core/game.js","./render/assets.js":"src/render/assets.js","./render/renderer.js":"src/render/renderer.js","./audio/audio.js":"src/audio/audio.js","./input/pointer.js":"src/input/pointer.js","./services/scores.js":"src/services/scores.js","./ui/fullscreen.js":"src/ui/fullscreen.js","./ui/performance-hud.js":"src/ui/performance-hud.js","./ui/render-settings.js":"src/ui/render-settings.js","./render/profile.js":"src/render/profile.js","./services/legacy-scores.js":"src/services/legacy-scores.js","./services/score-configuration.js":"src/services/score-configuration.js","./ui/legacy-score-form.js":"src/ui/legacy-score-form.js","./ui/frame-batch.js":"src/ui/frame-batch.js","./ui/runtime-feedback.js":"src/ui/runtime-feedback.js","./presentation-profile.js":"src/presentation-profile.js"}],
"src/core/game.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
/** Source-derived domain model. Timing policy and unresolved Flash details: docs/decisions.md. */
const scheduler_js_1 = require("./scheduler.js");
// Integer thirds of a millisecond preserve 12 Hz animation cadence and 100 ms timers exactly.
const CADENCE = 250;
// Ruffle 0.6.0 (cac5c99ce4a17e606f4ee3090389bb878f852055), core/src/timer.rs:194,231.
// Confirmed by the instrumented reference's zero/negative interval burst. Native event batching remains explicit.
const NON_POSITIVE_INTERVAL_MS = 10;
const EAT_CYCLE = [12, 10, 20, 9, 20];
const FOOD = { flipFrom: 70 * CADENCE, flipUntil: 159 * CADENCE, pickupFrom: 36 * CADENCE, pickupUntil: 139 * CADENCE, firstRemoval: 283 * CADENCE, secondRemoval: 204 * CADENCE };
const PLATE_DEFAULT = { x: 25, y: 336.95 };
const COUNTER_INITIAL = { x: -0.65, y: 303.8 };
// The source stores patience in MovieClip._y, not a free Number. AVM1 writes truncate to 1/20 px.
// Ruffle0.6 reference confirms -65.8,-65.6,-65.35... and loss at callback160 (-29.85).
const patiencePosition = (value) => Math.trunc(value * 20) / 20;
const emptyCustomer = (id) => ({ id, table: 0, phase: 'absent', orderRemaining: 0, served: 0, patience: -65.9, angry: false, angrySinceMs: null, eatActions: 0, phaseElapsedMs: 0, visible: false, orderVisible: false, characterVisible: false, characterPlaying: false, characterPose: 1, exitVisible: true, exitPlaying: false, exitPose: 1 });
function createGame(options = {}) {
    let seed = 0x4d414452;
    const random = options.random ?? (() => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; });
    const pick = (count) => {
        const n = random();
        if (!Number.isFinite(n) || n < 0 || n >= 1)
            throw new RangeError('random must return a finite value in [0, 1)');
        return Math.floor(n * count);
    };
    let now = 0, serial = 0, generation = 0, nextFood = 0;
    let tutorialTicks = 0, tutorialChildTicks = 0;
    const jobs = new scheduler_js_1.DeadlineQueue();
    let events = [];
    // Root timeline StartSoundTag 162 at frame 3, outside the exported ActionScript.
    let initialEvents = [{ type: 'sound', name: 'bgMusic2', loop: 1, volume: 100 }];
    const beginEvents = () => { events = initialEvents; initialEvents = []; };
    const orderTimers = [0, 0, 0, 0, 0];
    const patienceTimers = [0, 0, 0, 0, 0];
    const liveCustomerTimers = new Set();
    let nextCustomerTimer = 1;
    const foodAge = new Map();
    const customerAge = [0, 0, 0, 0, 0];
    const exitStarts = [0, 0, 0, 0, 0];
    const pendingBills = new Set();
    const s = { screen: 'menu', timeMs: 0, day: 1, cash: 0, lostCustomers: 0, clockMinutes: 540, tutorial: { visible: false, elapsedMs: 0, childElapsedMs: 0 }, pointer: { mode: 'blank', x: 0, y: 0, heldSlot: null }, batterTemplate: { available: false, playing: false, pose: 1 }, food: Array.from({ length: 18 }, () => null), plate: [], platePosition: { ...PLATE_DEFAULT }, counterPosition: { ...COUNTER_INITIAL }, customers: Array.from({ length: 5 }, (_, i) => emptyCustomer(i)), tables: Array.from({ length: 5 }, () => null), audio: { enabled: true, music: 2 }, scoreSubmitted: false };
    const emit = (event) => { events.push(event); };
    const schedule = (delay, run, scoped = true) => { jobs.push({ at: now + delay, id: serial++, generation: scoped ? generation : null, run }); };
    // AS2 setInterval returns a handle. Overwriting the MovieClip property does not cancel its old interval.
    const interval = (delay, run) => {
        const handle = nextCustomerTimer++;
        liveCustomerTimers.add(handle);
        // Function timers survive removed clips. Their lexical MovieClip paths resolve again on the next day.
        const repeat = () => {
            schedule(delay, () => {
                if (!liveCustomerTimers.has(handle))
                    return;
                if (s.screen === 'playing')
                    run();
                if (liveCustomerTimers.has(handle))
                    repeat();
            }, false);
        };
        repeat();
        return handle;
    };
    const clearInterval = (handle) => {
        if (handle !== undefined)
            liveCustomerTimers.delete(handle);
    };
    const clearKnownCustomerTimers = (id) => { clearInterval(orderTimers[id]); clearInterval(patienceTimers[id]); orderTimers[id] = 0; patienceTimers[id] = 0; };
    const screen = (value) => { s.screen = value; emit({ type: 'screen', screen: value }); };
    const stopSounds = () => { s.audio.music = null; emit({ type: 'stop-sounds' }); };
    const music = () => { s.audio.music = pick(2) + 1; emit({ type: 'sound', name: `bgMusic${s.audio.music}`, loop: 10000, volume: s.screen === 'playing' ? 50 : 100 }); };
    const resetPointer = () => { s.pointer.mode = 'blank'; s.pointer.heldSlot = null; };
    const returnPlate = () => {
        s.platePosition = { ...PLATE_DEFAULT };
        s.plate.forEach((dosa, i) => { dosa.x = PLATE_DEFAULT.x; dosa.y = PLATE_DEFAULT.y - i * 2; });
        s.counterPosition = { x: PLATE_DEFAULT.x + 35, y: PLATE_DEFAULT.y - 25 };
    };
    const clearDay = () => {
        // StopGame calls Initialize only through table.customerNumber, clearing the latest stored handles.
        // Overwritten handles remain live, inert while their clip is missing and rebound after retry/Tomorrow.
        for (const id of new Set(s.tables))
            if (id !== null)
                clearKnownCustomerTimers(id);
        generation++;
        jobs.retain(job => job.generation === null);
        s.food.fill(null);
        s.plate = [];
        s.tables.fill(null);
        foodAge.clear();
        pendingBills.clear();
        resetPointer();
        s.platePosition = { ...PLATE_DEFAULT };
        s.counterPosition = { ...COUNTER_INITIAL };
        s.batterTemplate = { available: false, playing: false, pose: 1 };
        s.customers = s.customers.map((_, id) => emptyCustomer(id));
        for (let id = 0; id < 5; id++) {
            orderTimers[id] = 0;
            patienceTimers[id] = 0;
            customerAge[id] = 0;
        }
    };
    const finish = (target) => { clearDay(); stopSounds(); screen(target); s.scoreSubmitted = false; };
    const setPhase = (c, phase) => { c.phase = phase; c.phaseElapsedMs = 0; customerAge[c.id] = 0; };
    const leave = (c, happy) => {
        clearKnownCustomerTimers(c.id);
        setPhase(c, 'exiting');
        c.orderRemaining = 0;
        c.angry = false;
        c.angrySinceMs = null;
        c.orderVisible = false;
        c.characterVisible = false;
        c.exitVisible = true;
        c.exitPlaying = true;
        c.exitPose = 1;
        exitStarts[c.id] = (exitStarts[c.id] ?? 0) + 1;
        // Only GoHappy resets/stops the character; OutOfPatience hides it without stopping its timeline.
        if (happy) {
            c.characterPose = 1;
            c.characterPlaying = false;
        }
        if (happy) {
            const amount = c.served * 2;
            s.cash += amount;
            emit({ type: 'cash', amount, table: c.table });
            if (c.table !== null)
                pendingBills.add(c.table);
        }
        else {
            s.lostCustomers++;
            if (s.lostCustomers > 4)
                finish('game-over');
        }
    };
    const manageTemper = (c) => {
        // Source ManageTemper has no visible-order/phase guard: an orphan interval still changes the meter.
        c.patience = patiencePosition(c.patience + 0.2);
        if (c.patience >= -30)
            leave(c, false);
        else if (c.patience > -40 && !c.angry) {
            c.angry = true;
            c.angrySinceMs = s.timeMs;
        }
    };
    const order = (c) => {
        clearInterval(orderTimers[c.id]);
        c.orderRemaining = pick(4) + 1;
        c.orderVisible = true;
        c.patience = -66;
        setPhase(c, 'ordering');
        patienceTimers[c.id] = interval(300, () => manageTemper(s.customers[c.id]));
        if (s.audio.enabled)
            emit({ type: 'sound', name: `order${c.id}` });
    };
    const appear = (id, table) => {
        const c = s.customers[id];
        if (!c)
            return;
        // A failed random character search can reuse a visible character; preserve the source table assignment.
        c.table = table;
        s.tables[table] = id;
        c.served = 0;
        c.eatActions = 0;
        c.angry = false;
        c.angrySinceMs = null;
        setPhase(c, 'waiting-order');
        c.visible = true;
        c.orderVisible = false;
        c.characterVisible = true;
        c.characterPlaying = false;
        c.exitVisible = false;
        c.exitPlaying = false;
        c.exitPose = 1;
        // Appear neither resets the patience meter nor clears old handles before StartOrderTimer.
        orderTimers[id] = interval(6000, () => order(s.customers[id]));
    };
    const spawn = () => {
        let id = 0;
        for (let attempt = 0; attempt < 100; attempt++) {
            id = pick(5);
            if (!s.customers[id]?.visible)
                break;
        }
        for (let attempt = 0; attempt < 100; attempt++) {
            const table = pick(5);
            if (s.tables[table] === null) {
                appear(id, table);
                break;
            }
        }
    };
    const spawnLoop = (interval) => { schedule(interval, () => { spawn(); spawnLoop(interval); }); };
    const clock = () => {
        schedule(3000, () => {
            s.clockMinutes++;
            if (s.clockMinutes >= 720)
                finish('day-result');
            else
                clock();
        });
    };
    const startDay = () => {
        clearDay();
        s.lostCustomers = 0;
        s.clockMinutes = 540;
        s.tutorial.visible = false;
        screen('playing');
        stopSounds();
        // Source mcDosa.Stop() is undefined (capital S). Ruffle reference confirms this hidden clip plays.
        s.batterTemplate = { available: true, playing: true, pose: 1 };
        // Original starts music even if its boolean mute flag is false. Later food callbacks stop it.
        music();
        clock();
        let interval = (16 - s.day * 2) * 3000;
        if (interval <= 0) {
            const ms = options.nonPositiveSpawnIntervalMs ?? NON_POSITIVE_INTERVAL_MS;
            if (!Number.isFinite(ms) || ms <= 0)
                throw new RangeError('nonPositiveSpawnIntervalMs must be positive');
            interval = ms * 3;
            emit({ type: 'diagnostic', code: 'non-positive-spawn-interval', message: `Day ${s.day} requests ${(16 - s.day * 2) * 1000} ms. Native interval uses ${ms} ms (Ruffle 0.6.0 minimum: 10 ms); callback batching remains the native deterministic policy.` });
        }
        spawnLoop(interval);
    };
    const cadence = () => {
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
                        if (!s.audio.enabled)
                            stopSounds();
                    }
                    if (template.pose === 284) {
                        template.available = false;
                        template.playing = false;
                        const before = s.cash;
                        s.cash = Math.max(0, s.cash - 2);
                        // RemoveDosa also repositions the one shared loss clip, outside the source stage.
                        emit({ type: 'cash', amount: s.cash - before, table: null, x: 1000, y: 1000 });
                    }
                }
                for (const _table of pendingBills) {
                    emit({ type: 'sound', name: 'cashregister' });
                    if (!s.audio.enabled)
                        stopSounds();
                }
                pendingBills.clear();
                // Unlike the parent, the unnamed12-frame smoke clip keeps playing during pickup/plating.
                for (const plated of s.plate)
                    if (plated.smokePose !== null)
                        plated.smokePose = plated.smokePose % 12 + 1;
                for (const dosa of s.food) {
                    if (!dosa)
                        continue;
                    if (dosa.smokePose !== null)
                        dosa.smokePose = dosa.smokePose % 12 + 1;
                    if (dosa.held)
                        continue;
                    const age = (foodAge.get(dosa.id) ?? 0) + CADENCE;
                    foodAge.set(dosa.id, age);
                    dosa.elapsedMs = age / 3;
                    dosa.pose = (dosa.phase === 'first-side' ? 1 : 291) + age / CADENCE;
                    if (dosa.pose === 310)
                        dosa.smokePose = 1;
                    else if (dosa.pose === 485)
                        dosa.smokePose = null;
                    const sound = dosa.phase === 'first-side' ? (age === 4 * CADENCE ? 'sound-441' : age === 35 * CADENCE ? 'sound-446' : null) : (age === 4 * CADENCE ? 'sound-468' : age === 12 * CADENCE ? 'sound-446' : null);
                    if (sound) {
                        // StartSoundTag SOUNDINFO: frying446 loops20 at frame36 and15 at frame303.
                        emit(sound === 'sound-446' ? { type: 'sound', name: sound, loop: dosa.phase === 'first-side' ? 20 : 15 } : { type: 'sound', name: sound });
                        if (!s.audio.enabled)
                            stopSounds();
                    }
                    if (age >= (dosa.phase === 'first-side' ? FOOD.firstRemoval : FOOD.secondRemoval)) {
                        s.food[dosa.slot] = null;
                        foodAge.delete(dosa.id);
                        const before = s.cash;
                        s.cash = Math.max(0, s.cash - 2);
                        emit({ type: 'cash', amount: s.cash - before, table: null, slot: dosa.slot });
                    }
                }
                for (const c of s.customers) {
                    if (s.screen !== 'playing')
                        break;
                    if (c.visible) {
                        const age = (customerAge[c.id] ?? 0) + CADENCE;
                        customerAge[c.id] = age;
                        c.phaseElapsedMs = age / 3;
                    }
                    // Capture playback before callbacks; a newly started exit must not also advance in this cadence.
                    const exitWasPlaying = c.exitPlaying, exitStart = exitStarts[c.id];
                    if (c.characterPlaying) {
                        const cycle = EAT_CYCLE[c.id] ?? 12;
                        c.characterPose = c.characterPose % cycle + 1;
                        if (c.characterPose === cycle) {
                            c.eatActions++;
                            if (c.eatActions >= c.served * 3)
                                leave(c, true);
                        }
                    }
                    if (exitWasPlaying && c.exitPlaying && exitStart === exitStarts[c.id]) {
                        c.exitPose++;
                        if (c.exitPose >= 7) {
                            c.exitPose = 7;
                            c.exitPlaying = false;
                            c.exitVisible = false;
                            c.visible = false;
                            if (c.table !== null)
                                s.tables[c.table] = null;
                            setPhase(c, 'absent');
                        }
                    }
                }
            }
            cadence();
        }, false);
    };
    const sessionRefresh = () => { schedule(1800000, () => { emit({ type: 'session-refresh' }); sessionRefresh(); }, false); };
    cadence();
    sessionRefresh();
    const snapshot = () => JSON.parse(JSON.stringify(s));
    const dispatch = (command) => {
        beginEvents();
        if (command.type === 'move-pointer') {
            if (Number.isFinite(command.x) && Number.isFinite(command.y)) {
                const moved = s.pointer.x !== command.x || s.pointer.y !== command.y;
                s.pointer.x = command.x;
                s.pointer.y = command.y;
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
            if (s.audio.enabled) {
                emit({ type: 'stop-music' });
                music();
            }
            else {
                if (s.screen === 'menu')
                    stopSounds();
                else {
                    s.audio.music = null;
                    emit({ type: 'stop-music' });
                }
            }
            return events;
        }
        if (command.type === 'start' && s.screen === 'menu') {
            tutorialTicks = 0;
            tutorialChildTicks = 0;
            s.tutorial = { visible: false, elapsedMs: 0, childElapsedMs: 0 };
            screen('instructions');
        }
        else if (command.type === 'show-tutorial' && s.screen === 'instructions') {
            s.tutorial.visible = true;
            tutorialTicks = 0;
            s.tutorial.elapsedMs = 0;
        }
        else if ((command.type === 'play' || command.type === 'skip-tutorial') && s.screen === 'instructions')
            startDay();
        else if (command.type === 'next-day' && s.screen === 'day-result') {
            s.day++;
            emit({ type: 'session-refresh' });
            startDay();
        }
        else if (command.type === 'retry' && s.screen === 'game-over') {
            s.day = 1;
            s.cash = 0;
            startDay();
        }
        else if (command.type === 'submit-score' && s.screen === 'game-over' && !s.scoreSubmitted) {
            s.scoreSubmitted = true;
            emit({ type: 'score-request', name: command.name, score: s.cash, gameName: 'madrasidhaba' });
        }
        else if (s.screen === 'playing') {
            if (command.type === 'pick-batter' && s.pointer.mode === 'blank') {
                if (s.batterTemplate.available) {
                    s.batterTemplate.pose = 1;
                    s.batterTemplate.playing = false;
                }
                s.pointer.mode = 'batter';
            }
            else if (command.type === 'click-slot' && Number.isInteger(command.slot) && command.slot >= 0 && command.slot < 18) {
                const dosa = s.food[command.slot];
                if (s.pointer.mode === 'batter' && !dosa) {
                    if (s.batterTemplate.available) {
                        const created = { id: nextFood++, slot: command.slot, phase: 'first-side', elapsedMs: 0, held: false, pose: 1, smokePose: null };
                        s.food[command.slot] = created;
                        foodAge.set(created.id, 0);
                    }
                    // The source unconditionally resets the mouse even if its removed template cannot duplicate.
                    resetPointer();
                }
                else if (s.pointer.mode !== 'batter' && s.pointer.mode !== 'dosa' && dosa) {
                    const age = foodAge.get(dosa.id) ?? 0;
                    if (dosa.phase === 'first-side' && age >= FOOD.flipFrom && age < FOOD.flipUntil) {
                        dosa.phase = 'second-side';
                        dosa.elapsedMs = 0;
                        dosa.pose = 291;
                        foodAge.set(dosa.id, 0);
                    }
                    else if (dosa.phase === 'second-side' && age >= FOOD.pickupFrom && age < FOOD.pickupUntil) {
                        dosa.held = true;
                        s.pointer.mode = 'dosa';
                        s.pointer.heldSlot = command.slot;
                    }
                }
            }
            else if (command.type === 'click-plate') {
                if (s.pointer.mode === 'dosa' && s.pointer.heldSlot !== null) {
                    const dosa = s.food[s.pointer.heldSlot];
                    if (dosa) {
                        s.plate.push({ ...dosa, held: false, smokePose: 1, x: s.pointer.x, y: s.pointer.y });
                        s.food[s.pointer.heldSlot] = null;
                        foodAge.delete(dosa.id);
                    }
                    resetPointer();
                }
                else if (s.pointer.mode === 'blank')
                    s.pointer.mode = 'plate';
            }
            else if (command.type === 'click-customer' && s.pointer.mode === 'plate') {
                const c = s.customers[command.customer];
                if (c && c.visible) {
                    if (c.orderVisible) {
                        const offered = s.plate.length;
                        c.patience = patiencePosition(c.patience - offered * 6);
                        const used = Math.min(offered, c.orderRemaining);
                        s.plate.splice(s.plate.length - used, used);
                        c.served += used;
                        c.orderRemaining -= used;
                        if (c.orderRemaining === 0) {
                            clearInterval(patienceTimers[c.id]);
                            c.angry = false;
                            c.angrySinceMs = null;
                            c.orderVisible = false;
                            c.characterPlaying = true;
                            setPhase(c, 'eating');
                        }
                    }
                    emit({ type: 'sound', name: 'serve' });
                    returnPlate();
                    resetPointer();
                }
            }
            else if (command.type === 'background') {
                if (s.pointer.heldSlot !== null) {
                    const dosa = s.food[s.pointer.heldSlot];
                    if (dosa)
                        dosa.held = false;
                }
                if (s.pointer.mode === 'plate')
                    returnPlate();
                resetPointer();
            }
        }
        return events;
    };
    return { get state() { return snapshot(); }, snapshot, dispatch, advance(ms) {
            if (!Number.isFinite(ms) || ms < 0)
                throw new RangeError('advance requires nonnegative finite milliseconds');
            beginEvents();
            const target = now + ms * 3;
            while (true) {
                const job = jobs.peek();
                if (!job || job.at > target + 1e-7)
                    break;
                jobs.pop();
                now = job.at;
                s.timeMs = now / 3;
                if (job.generation === null || job.generation === generation)
                    job.run();
            }
            now = target;
            s.timeMs = now / 3;
            return events;
        } };
}

},{"./scheduler.js":"src/core/scheduler.js"}],
"src/core/scheduler.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadlineQueue = void 0;
/** Minimum deadline first, then original registration ID for equal deadlines.
 * IDs are unique monotonic registration numbers; queued keys must not be mutated.
 * The queue owns storage only: clock advancement and generation checks stay in the game.
 */
class DeadlineQueue {
    items = [];
    peek() { return this.items[0]; }
    push(item) {
        let index = this.items.length;
        this.items.push(item);
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (!this.before(item, this.items[parent]))
                break;
            this.items[index] = this.items[parent];
            index = parent;
        }
        this.items[index] = item;
    }
    pop() {
        const first = this.items[0];
        const last = this.items.pop();
        if (this.items.length && last !== undefined) {
            this.items[0] = last;
            this.siftDown(0);
        }
        return first;
    }
    /** Retain matching jobs without changing their registration IDs or deadlines.
     * The predicate is independent of traversal order; heap rebuilding is linear.
     */
    retain(keep) {
        this.items = this.items.filter(keep);
        for (let index = Math.floor(this.items.length / 2) - 1; index >= 0; index--)
            this.siftDown(index);
    }
    before(a, b) { return (a.at - b.at || a.id - b.id) < 0; }
    siftDown(start) {
        const item = this.items[start];
        let index = start;
        while (index * 2 + 1 < this.items.length) {
            let child = index * 2 + 1;
            if (child + 1 < this.items.length && this.before(this.items[child + 1], this.items[child]))
                child++;
            if (!this.before(this.items[child], item))
                break;
            this.items[index] = this.items[child];
            index = child;
        }
        this.items[index] = item;
    }
}
exports.DeadlineQueue = DeadlineQueue;

},{}],
"src/render/assets.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Assets = exports.identity = void 0;
const vector_js_1 = require("./vector.js");
const resources_js_1 = require("./resources.js");
const identity = (x = 0, y = 0) => ({ a: 1, b: 0, c: 0, d: 1, tx: x, ty: y });
exports.identity = identity;
/** Loads native exports only. No SWF parser, scripts or timeline actions are loaded. */
class Assets {
    vector = null;
    symbols = new Map();
    names = new Map();
    scenes = [];
    images = new Map();
    pixels = new Map();
    lastFrames = new Map();
    pinnedImages = new Set();
    failures = new Set();
    async load(filterPowerPreference = 'default') {
        const data = await (0, resources_js_1.resourceJson)('assets/catalog.json');
        const vectors = await (0, resources_js_1.resourceJson)('assets/vector/scene.json');
        if (vectors.sourceSha256 !== data.source.sha256)
            throw new Error('Vector source does not match the selected edition.');
        this.vector = new vector_js_1.VectorArt(vectors, filterPowerPreference);
        for (const item of data.items) {
            this.symbols.set(item.symbolId, item);
            for (const name of [item.id, item.name, ...item.exportNames])
                this.names.set(name, item);
            if (item.kind === 'button')
                for (const url of item.preview?.frames || [])
                    this.pinnedImages.add(url);
        }
        await Promise.all(data.items.filter(item => item.preview?.type === 'font' && item.preview.url).map(async (item) => {
            const font = new FontFace(`madrasi-${item.symbolId}`, `url("${(0, resources_js_1.resourceUrl)(item.preview.url)}")`);
            try {
                await font.load();
                document.fonts.add(font);
            }
            catch {
                this.failures.add(item.preview.url);
            }
        }));
        this.scenes = data.scenes || (await (0, resources_js_1.resourceJson)('assets/scenes.json')).scenes;
    }
    placement(name, frame = 5) { return this.scenes.find(s => s.frame === frame)?.instances.find(i => i.name === name); }
    image(url) {
        let img = this.images.get(url);
        if (!img) {
            img = new Image();
            img.decoding = 'async';
            img.src = (0, resources_js_1.resourceUrl)(url);
            img.onerror = () => this.failures.add(url);
            this.images.set(url, img);
        }
        // Keep a bounded working set; the tutorial alone has hundreds of large frames.
        this.images.delete(url);
        this.images.set(url, img);
        let bytes = 0;
        for (const value of this.images.values())
            bytes += value.naturalWidth * value.naturalHeight * 4;
        while (this.images.size > 96 || bytes > 64 * 1024 * 1024 && this.images.size > 1) {
            const oldest = [...this.images.entries()].find(([key]) => key !== url && !this.pinnedImages.has(key));
            if (!oldest)
                break;
            bytes -= oldest[1].naturalWidth * oldest[1].naturalHeight * 4;
            this.images.delete(oldest[0]);
            this.pixels.delete(oldest[0]);
            oldest[1].src = '';
        }
        return img.complete && img.naturalWidth > 0 ? img : undefined;
    }
    async preload(symbols) {
        const urls = new Set(symbols.flatMap(id => {
            if (this.vector?.has(id))
                return [];
            const p = this.symbols.get(id)?.preview;
            return p?.frames?.length ? p.frames.slice(0, this.symbols.get(id)?.kind === 'button' ? 4 : 1) : p?.url && ['image', 'sequence'].includes(p.type) ? [p.url] : [];
        }));
        await Promise.all([...urls].map(url => new Promise(resolve => {
            this.image(url);
            const img = this.images.get(url);
            if (img.complete)
                resolve();
            else {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
            }
        })));
    }
    draw(ctx, id, matrix, frame = 1, alpha = 1) {
        if (this.vector?.has(id))
            return this.vector.draw(ctx, id, matrix, frame, alpha);
        const item = this.symbols.get(id);
        if (!item)
            return false;
        const p = item.preview;
        if (!p)
            return false;
        const url = p.frames?.length ? p.frames[(Math.max(1, Math.floor(frame)) - 1) % p.frames.length] : p.type === 'image' ? p.url : undefined;
        if (!url)
            return false;
        let img = this.image(url);
        if (img)
            this.lastFrames.set(id, img);
        if (p.frames && item.kind !== 'button') {
            for (let ahead = 1; ahead <= 4; ahead++)
                this.image(p.frames[(Math.max(1, Math.floor(frame)) - 1 + ahead) % p.frames.length]);
        }
        img ??= this.lastFrames.get(id);
        if (!img?.complete || !img.naturalWidth)
            return false;
        const b = item.bounds || { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
        ctx.save();
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        ctx.globalAlpha *= alpha;
        ctx.drawImage(img, b.x, b.y);
        ctx.restore();
        return true;
    }
    contains(id, m, x, y, pixel = false, frame = 1) {
        const b = this.symbols.get(id)?.bounds;
        if (!b)
            return false;
        const det = m.a * m.d - m.b * m.c;
        if (!det)
            return false;
        const dx = x - m.tx, dy = y - m.ty;
        const lx = (m.d * dx - m.c * dy) / det, ly = (-m.b * dx + m.a * dy) / det;
        const inside = lx >= b.x && lx <= b.x + b.width && ly >= b.y && ly <= b.y + b.height;
        if (!inside || !pixel)
            return inside;
        if (this.vector?.has(id))
            return this.vector.contains(id, lx, ly, frame);
        const p = this.symbols.get(id)?.preview;
        const url = p?.frames?.[(frame - 1) % p.frames.length] || p?.url;
        if (!url)
            return inside;
        const image = this.image(url);
        if (!image)
            return false;
        let data = this.pixels.get(url);
        if (!data) {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx)
                return inside;
            ctx.drawImage(image, 0, 0);
            data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            this.pixels.set(url, data);
        }
        const px = Math.floor(lx - b.x), py = Math.floor(ly - b.y);
        return px >= 0 && px < data.width && py >= 0 && py < data.height && (data.data[(py * data.width + px) * 4 + 3] ?? 0) > 0;
    }
}
exports.Assets = Assets;

},{"./vector.js":"src/render/vector.js","./resources.js":"src/render/resources.js"}],
"src/render/vector.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorArt = void 0;
exports.presentationPack = presentationPack;
exports.transformedBounds = transformedBounds;
exports.blurKernel = blurKernel;
exports.boxBlurAxis = boxBlurAxis;
exports.filterBounds = filterBounds;
exports.childTimelineClock = childTimelineClock;
exports.presentationFrame = presentationFrame;
exports.animationPeriod = animationPeriod;
exports.multiply = multiply;
exports.combineTint = combineTint;
exports.interpolatePath = interpolatePath;
exports.gradientMatrix = gradientMatrix;
const box_filter_js_1 = require("./box-filter.js");
/** An isolated view of source metadata; returning to Classic restores the original records. */
function presentationPack(source, simplerEffects) {
    if (!simplerEffects)
        return source;
    const stars = source.symbols[185], griddle = source.symbols[224];
    if (!stars?.frames?.length || !griddle?.frames)
        return source;
    return { ...source, symbols: { ...source.symbols,
            185: { ...stars, frames: [stars.frames[0]] },
            224: { ...griddle, frames: griddle.frames.map(frame => frame.map(part => part.id === 223 ? { ...part, filters: [] } : part)) }, } };
}
const ID = [1, 0, 0, 1, 0, 0];
const NO_TINT = [1, 1, 1, 1, 0, 0, 0, 0];
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const clamp = (n, max = 1) => Math.max(0, Math.min(max, n));
const TILE_BUDGET = 80 * 1024 * 1024, POOL_BUDGET = 16 * 1024 * 1024;
const MAX_TILE_BUDGET = 384 * 1024 * 1024;
const REFERENCE_PIXELS = 1485 * 1080;
function transformedBounds(b, m) {
    const points = [b.x, b.x + b.width].flatMap(x => [b.y, b.y + b.height].map(y => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]));
    const x = Math.min(...points.map(p => p[0])), y = Math.min(...points.map(p => p[1]));
    return { x, y, width: Math.max(...points.map(p => p[0])) - x, height: Math.max(...points.map(p => p[1])) - y };
}
function union(a, b) {
    if (!a)
        return b;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}
function intersection(a, b) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
}
/** Fractional box width, not a Gaussian standard deviation. */
function blurKernel(width) {
    const divisor = Math.min(255, Math.max(1, width)), radius = (divisor - 1) / 2;
    const inner = Math.max(0, Math.ceil(radius) - 1);
    return { radius: inner, edge: divisor <= 1 ? 0 : Math.floor((radius - inner) * 255) / 255, divisor };
}
/** One separable pass over premultiplied RGBA; empty pixels outside the surface stay transparent. */
function boxBlurAxis(source, target, width, height, size, horizontal) {
    if (size <= 1) {
        target.set(source);
        return;
    }
    const { radius, edge, divisor } = blurKernel(size), length = horizontal ? width : height, lines = horizontal ? height : width;
    const step = horizontal ? 4 : width * 4, lineStep = horizontal ? width * 4 : 4;
    for (let line = 0; line < lines; line++)
        for (let channel = 0; channel < 4; channel++) {
            const base = line * lineStep + channel;
            let sum = 0;
            for (let p = 0; p <= radius && p < length; p++)
                sum += source[base + p * step];
            for (let p = 0; p < length; p++) {
                const left = p - radius - 1, right = p + radius + 1;
                target[base + p * step] = Math.floor((sum + edge * ((left >= 0 ? source[base + left * step] : 0) + (right < length ? source[base + right * step] : 0))) / divisor);
                if (p - radius >= 0)
                    sum -= source[base + (p - radius) * step];
                if (right < length)
                    sum += source[base + right * step];
            }
        }
}
function filterBounds(b, filters, scale = 1, scaleY = scale) {
    let result = { ...b };
    for (const f of filters) {
        const passes = Math.max(0, Number(f.passes ?? 1));
        const pad = (value, density) => Math.ceil(Math.max(0, Math.min(255, Number(value ?? 0) * density) - 1) / 2) * passes / density;
        const x = pad(f.blurX, scale), y = pad(f.blurY, scaleY);
        if (f.type === 'BLURFILTER')
            result = { x: result.x - x, y: result.y - y, width: result.width + 2 * x, height: result.height + 2 * y };
        else if (f.type === 'DROPSHADOWFILTER') {
            const angle = Number(f.angle ?? 0), distance = Number(f.distance ?? 0);
            result = union(result, { x: result.x - x + Math.cos(angle) * distance, y: result.y - y + Math.sin(angle) * distance, width: result.width + 2 * x, height: result.height + 2 * y });
        }
        else
            throw new Error(`Unsupported source filter ${f.type}`);
    }
    return result;
}
const continuous = new WeakMap();
function continuousDepths(s) {
    let depths = continuous.get(s);
    if (!depths) {
        depths = new Set((s.frames?.[0] ?? []).filter(p => p.born === 1 && s.frames.every(frame => frame.some(q => q.depth === p.depth && q.id === p.id && q.born === 1))).map(p => p.depth));
        continuous.set(s, depths);
    }
    return depths;
}
function childTimelineClock(s, clock, index, p, interpolate = false, persistentClock = clock) {
    return s.kind === 'button' ? 0 : continuousDepths(s).has(p.depth) ? persistentClock : Math.max(0, index + 1 - p.born + (interpolate ? clock - Math.floor(clock) : 0));
}
/** Optional presentation sampling only: replacements, visibility, color changes, filters
 * and loop boundaries remain discrete. Original frame records are never mutated. */
function presentationFrame(s, clock, enabled = false) {
    const frames = s.frames, whole = Math.max(0, Math.floor(clock)), index = whole % frames.length, current = frames[index];
    const fraction = clock - whole;
    if (!enabled || s.kind === 'button' || fraction <= 0 || index === frames.length - 1)
        return { placements: current, index };
    const following = frames[index + 1];
    const placements = current.map(p => {
        const q = following.find(candidate => candidate.depth === p.depth);
        if (!q || p.id !== q.id || p.born !== q.born || p.visible !== q.visible || p.clipDepth !== q.clipDepth || p.filters?.length || q.filters?.length || JSON.stringify(p.colorTransform) !== JSON.stringify(q.colorTransform))
            return p;
        const matrix = p.matrix.map((v, i) => v + (q.matrix[i] - v) * fraction);
        const result = { ...p, matrix };
        if (p.ratio !== undefined || q.ratio !== undefined)
            result.ratio = (p.ratio ?? 0) + ((q.ratio ?? 0) - (p.ratio ?? 0)) * fraction;
        return result;
    });
    return { placements, index };
}
function animationPeriod(symbols, id, cache = new Map(), ancestors = new Set()) {
    const cached = cache.get(id);
    if (cached !== undefined)
        return cached;
    if (ancestors.has(id))
        throw new Error('Cyclic vector display list');
    const s = symbols[id];
    let period = s.frames?.length ?? 1;
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    if (s.frames && s.kind !== 'button')
        for (const p of s.frames[0]) {
            if (!continuousDepths(s).has(p.depth))
                continue;
            const child = animationPeriod(symbols, p.id, cache, new Set(ancestors).add(id));
            if (!Number.isFinite(child)) {
                period = Infinity;
                break;
            }
            period = period * child / gcd(period, child);
            if (period > 1000000) {
                period = Infinity;
                break;
            }
        }
    cache.set(id, period);
    return period;
}
function multiply(p, q) {
    return [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3], p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
}
function combineTint(parent, source) {
    if (!source)
        return parent;
    const channels = ['red', 'green', 'blue', 'alpha'];
    const result = [...parent];
    for (let i = 0; i < 4; i++) {
        result[i] = parent[i] * (source.hasMultTerms ? Number(source[`${channels[i]}MultTerm`] ?? 256) / 256 : 1);
        result[i + 4] = parent[i] * (source.hasAddTerms ? Number(source[`${channels[i]}AddTerm`] ?? 0) : 0) + parent[i + 4];
    }
    return result;
}
function interpolatePath(a, b, ratio) {
    const end = b.match(NUMBER).map(Number);
    let i = 0;
    return a.replace(NUMBER, value => String(Number(value) + (end[i++] - Number(value)) * clamp(ratio)));
}
function interpolate(a, b, ratio) {
    if (a === b)
        return a;
    if (a.startsWith('#') && b.startsWith('#')) {
        const rgb = [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - ratio) + parseInt(b.slice(i, i + 2), 16) * ratio));
        return '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('');
    }
    return String(Number(a) * (1 - ratio) + Number(b) * ratio);
}
function animated(animations, key, original, ratio) {
    const values = animations?.[key];
    return values ? interpolate(values[0], values[1], ratio) : original;
}
function color(value, opacity, tint) {
    const rgb = value.startsWith('#') ? [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)) : [0, 0, 0];
    return `rgba(${rgb.map((n, i) => clamp(n * tint[i] + tint[i + 4], 255)).join(',')},${clamp(opacity * tint[3] + tint[7] / 255)})`;
}
function gradientMatrix(g, ratio) {
    let m = g.matrix;
    for (const t of g.transforms) {
        const v = t.from.map((a, i) => a + (t.to[i] - a) * ratio);
        if (t.replace)
            m = ID;
        let next = ID;
        if (t.type === 'translate')
            next = [1, 0, 0, 1, v[0], v[1] ?? 0];
        else if (t.type === 'scale')
            next = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
        else if (t.type === 'rotate') {
            const a = v[0] * Math.PI / 180;
            next = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        }
        else if (t.type === 'skewX')
            next = [1, 0, Math.tan(v[0] * Math.PI / 180), 1, 0, 0];
        else
            throw new Error(`Unsupported gradient transform ${t.type}`);
        m = multiply(m, next);
    }
    return m;
}
/** Game-specific vector display data, rendered with reusable native Canvas paths.
 * Pixel caches are generated at the current display scale, never from 1× PNGs.
 */
class VectorArt {
    pack;
    sourcePack;
    simplerEffects = false;
    paths = new Map();
    tiles = new Map();
    morphFamilies = new Map();
    tileFamilies = new Map();
    morphKinds = new Map();
    surfaces = [];
    poolBytes = 0;
    boundsCache = new Map();
    blurScratch = new Uint8ClampedArray(0);
    gpuFilter;
    cpuFilterApplications = 0;
    lastFilterBackend = 'not-used';
    periods = new Map();
    tileBytes = 0;
    tileBudget = TILE_BUDGET;
    viewportWidth = 0;
    viewportHeight = 0;
    hitCanvas = document.createElement('canvas');
    profiling = false;
    profilingOmitFilters = false;
    profilingCpuFilters = false;
    profilingOmitAlphaFactoring = false;
    /** Diagnostic baseline: retain every morph pose until the global LRU limit. Clear caches after changes. */
    diagnosticFullMorphCache = false;
    /** Comparison control for the previous static-group crop policy. */
    diagnosticUncroppedStaticGroups = false;
    /** Diagnostic only. Clear caches after changing parent:child omission keys. */
    diagnosticOmitChildren = new Set();
    get filterStats() { return this.gpuFilter.stats; }
    /** Explicit diagnostic snapshot; identifiers describe the filter context, not the Canvas stage. */
    gpuSummary() {
        return { stage: 'canvas2d', filter: this.gpuFilter.gpuSummary(), forcedCpu: this.profilingCpuFilters, cpuApplications: this.cpuFilterApplications, lastFilterBackend: this.lastFilterBackend };
    }
    /** RGBA backing accounting, not measured GPU residency or process heap usage. */
    memorySummary() {
        const symbols = new Map();
        for (const [key, tile] of this.tiles) {
            const id = Number(key.split(':', 1)[0]), entry = symbols.get(id) ?? { id, count: 0, bytes: 0 };
            entry.count++;
            entry.bytes += tile.bytes;
            symbols.set(id, entry);
        }
        const cpuBlurScratchBytes = this.blurScratch.byteLength, filterBackingBytes = this.gpuFilter.stats.backingBytes;
        return { tileBytes: this.tileBytes, tileCount: this.tiles.size, tileBudgetBytes: this.tileBudget, poolBytes: this.poolBytes, poolCount: this.surfaces.length, poolBudgetBytes: POOL_BUDGET, cpuBlurScratchBytes, filterBackingBytes, accountedBackingBytes: this.tileBytes + this.poolBytes + cpuBlurScratchBytes + filterBackingBytes, pathCount: this.paths.size, boundsCount: this.boundsCache.size, bySymbol: [...symbols.values()].sort((a, b) => b.bytes - a.bytes) };
    }
    groupCosts = new Map();
    stats = { vectorDraws: 0, cacheHits: 0, cachedBytes: 0, allocatedBytes: 0, evictions: 0, byteEvictions: 0, entryEvictions: 0, morphReplacements: 0, pathBuilds: 0, gradients: 0, filterPlacements: 0, pooledBytes: 0, reusedSurfaces: 0, culled: 0 };
    constructor(pack, filterPowerPreference = 'default') {
        this.pack = pack;
        this.sourcePack = pack;
        this.gpuFilter = new box_filter_js_1.BoxFilter(filterPowerPreference);
        if (pack.version !== 1)
            throw new Error('Unsupported vector data version');
        this.hitCanvas.width = this.hitCanvas.height = 1;
    }
    has(id) { return Boolean(this.pack.symbols[id]); }
    setSimplerEffects(enabled) {
        if (enabled === this.simplerEffects)
            return;
        this.clearCache();
        this.periods.clear();
        this.morphKinds.clear();
        this.pack = presentationPack(this.sourcePack, enabled);
        this.simplerEffects = enabled;
    }
    /** Retain the same repeating poses at the actual display density. A fixed byte
     * budget repeatedly evicted the expensive griddle blur on large canvases.
     * This is a lazy upper limit, not an allocation; sampling stays unchanged. */
    setViewport(width, height) {
        if (width === this.viewportWidth && height === this.viewportHeight)
            return;
        this.clearCache();
        this.viewportWidth = width;
        this.viewportHeight = height;
        const pixels = Number.isFinite(width * height) && width > 0 && height > 0 ? width * height : REFERENCE_PIXELS;
        this.tileBudget = Math.min(MAX_TILE_BUDGET, Math.max(TILE_BUDGET, Math.ceil(TILE_BUDGET * pixels / REFERENCE_PIXELS)));
    }
    bounds(id) { return this.pack.symbols[id]?.bounds ?? null; }
    frameBounds(id, frame = 1) {
        if (!this.has(id))
            return null;
        const b = this.currentBounds(id, Math.max(0, frame - 1));
        return b ? { ...b } : null;
    }
    placements(id, frame = 1, interpolate = false) {
        const symbol = this.pack.symbols[id];
        return symbol?.frames ? this.frame(symbol, Math.max(0, frame - 1), interpolate).placements : [];
    }
    path(draw, ratio) {
        const key = `${draw.path}:${draw.endPath ?? ''}:${draw.endPath === undefined ? 0 : Math.round(ratio * 65535)}`;
        let path = this.paths.get(key);
        if (!path) {
            if (this.profiling)
                this.stats.pathBuilds++;
            path = new Path2D(draw.endPath === undefined ? this.pack.paths[draw.path] : interpolatePath(this.pack.paths[draw.path], this.pack.paths[draw.endPath], ratio));
            this.paths.set(key, path);
            if (this.paths.size > 6000)
                this.paths.delete(this.paths.keys().next().value);
        }
        return path;
    }
    period(id) { return animationPeriod(this.pack.symbols, id, this.periods); }
    acquire(width, height) {
        const index = this.surfaces.findIndex(c => c.width === width && c.height === height);
        let canvas;
        if (index >= 0) {
            canvas = this.surfaces.splice(index, 1)[0];
            this.poolBytes -= width * height * 4;
            this.stats.reusedSurfaces++;
        }
        else {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            if (this.profiling)
                this.stats.allocatedBytes += width * height * 4;
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, width, height);
        this.stats.pooledBytes = this.poolBytes;
        return canvas;
    }
    release(canvas) {
        const bytes = canvas.width * canvas.height * 4;
        if (bytes <= POOL_BUDGET) {
            this.surfaces.push(canvas);
            this.poolBytes += bytes;
        }
        else
            canvas.width = canvas.height = 0;
        while (this.poolBytes > POOL_BUDGET || this.surfaces.length > 32) {
            const old = this.surfaces.shift();
            this.poolBytes -= old.width * old.height * 4;
            old.width = old.height = 0;
        }
        this.stats.pooledBytes = this.poolBytes;
    }
    /** Recycling a recent morph pose retains the exact raster geometry and sampling.
     * Rare historical poses must not displace costly reusable filtered/background tiles. */
    removeTile(key, reason) {
        const tile = this.tiles.get(key);
        if (!tile)
            return;
        this.tiles.delete(key);
        this.tileBytes -= tile.bytes;
        const family = this.tileFamilies.get(key);
        if (family) {
            const keys = this.morphFamilies.get(family);
            keys.delete(key);
            if (!keys.size)
                this.morphFamilies.delete(family);
            this.tileFamilies.delete(key);
        }
        this.release(tile.canvas);
        if (this.profiling) {
            if (reason === 'morph')
                this.stats.morphReplacements++;
            else {
                this.stats.evictions++;
                if (reason === 'bytes')
                    this.stats.byteEvictions++;
                else
                    this.stats.entryEvictions++;
            }
        }
    }
    isMorph(id, s) {
        let morph = this.morphKinds.get(id);
        if (morph === undefined) {
            morph = Boolean(s.draws?.some(d => d.endPath !== undefined));
            this.morphKinds.set(id, morph);
        }
        return morph;
    }
    omitChild(parent, placement) {
        return this.diagnosticOmitChildren.size > 0 && !(placement.clipDepth && placement.clipDepth > placement.depth) && this.diagnosticOmitChildren.has(`${parent}:${placement.id}`);
    }
    /** Current children determine a moving clip's crop; its complete travel path does not. */
    currentBounds(id, clock, depth = 0, interpolate = false, persistentClock, forMask = false) {
        if (depth > 40)
            throw new Error('Vector bounds nesting exceeded');
        const period = this.period(id), normalized = period === 1 ? 0 : (interpolate ? clock : Math.floor(clock)) % period, key = `${id}:${normalized}:${interpolate}:${persistentClock ?? ''}:${forMask}`;
        if (this.boundsCache.has(key))
            return this.boundsCache.get(key);
        const s = this.pack.symbols[id];
        let bounds = s.draws ? s.bounds : null;
        if (s.frames) {
            const { placements, index } = this.frame(s, normalized, interpolate), masks = [];
            for (const p of placements) {
                if (p.visible === false || !forMask && this.omitChild(id, p))
                    continue;
                const isMask = Boolean(p.clipDepth && p.clipDepth > p.depth);
                let b = this.currentBounds(p.id, this.childClock(s, normalized, index, p, interpolate, persistentClock), depth + 1, interpolate && !p.filters?.length, undefined, forMask || isMask);
                if (!b)
                    continue;
                b = filterBounds(transformedBounds(b, p.matrix), p.filters ?? []);
                if (p.clipDepth && p.clipDepth > p.depth) {
                    masks.push({ end: p.clipDepth, bounds: b });
                    continue;
                }
                for (const mask of masks)
                    if (p.depth <= mask.end)
                        b = intersection(b, mask.bounds);
                if (b.width && b.height)
                    bounds = union(bounds, b);
            }
        }
        this.boundsCache.set(key, bounds);
        if (this.boundsCache.size > 4096)
            this.boundsCache.delete(this.boundsCache.keys().next().value);
        return bounds;
    }
    blur(canvas, filter, scaleX, scaleY) {
        const passes = Math.max(0, Number(filter.passes ?? 1)), x = Number(filter.blurX ?? 0) * scaleX, y = Number(filter.blurY ?? 0) * scaleY;
        if (!passes || x <= 1 && y <= 1)
            return;
        if (!this.profilingCpuFilters && this.gpuFilter.apply(canvas, x, y, passes)) {
            this.lastFilterBackend = 'gpu';
            return;
        }
        this.cpuFilterApplications++;
        this.lastFilterBackend = 'cpu';
        const ctx = canvas.getContext('2d'), pixels = ctx.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
        if (this.blurScratch.length < data.length)
            this.blurScratch = new Uint8ClampedArray(data.length);
        const scratch = this.blurScratch.subarray(0, data.length);
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3] / 255;
            data[i] = Math.floor(data[i] * alpha);
            data[i + 1] = Math.floor(data[i + 1] * alpha);
            data[i + 2] = Math.floor(data[i + 2] * alpha);
        }
        for (let pass = 0; pass < passes; pass++) {
            boxBlurAxis(data, scratch, canvas.width, canvas.height, x, true);
            boxBlurAxis(scratch, data, canvas.width, canvas.height, y, false);
        }
        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha) {
                data[i] = data[i] * 255 / alpha;
                data[i + 1] = data[i + 1] * 255 / alpha;
                data[i + 2] = data[i + 2] * 255 / alpha;
            }
        }
        ctx.putImageData(pixels, 0, 0);
    }
    filters(canvas, filters, scaleX, scaleY) {
        for (const filter of filters) {
            if (this.profiling)
                this.stats.filterPlacements++;
            if (filter.type === 'BLURFILTER')
                this.blur(canvas, filter, scaleX, scaleY);
            else if (filter.type === 'DROPSHADOWFILTER') {
                if (filter.innerShadow === 'true' || filter.knockout === 'true' || filter.compositeSource === 'false')
                    throw new Error('Unimplemented shadow mode outside the preserved game');
                const shadow = this.acquire(canvas.width, canvas.height), ctx = shadow.getContext('2d'), rgba = filter.children?.[0] ?? {};
                const angle = Number(filter.angle ?? 0), distance = Number(filter.distance ?? 0);
                ctx.drawImage(canvas, Math.cos(angle) * distance * scaleX, Math.sin(angle) * distance * scaleY);
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = `rgba(${rgba.red ?? 0},${rgba.green ?? 0},${rgba.blue ?? 0},${clamp(Number(rgba.alpha ?? 255) / 255 * Number(filter.strength ?? 1))})`;
                ctx.fillRect(0, 0, shadow.width, shadow.height);
                ctx.globalCompositeOperation = 'source-over';
                this.blur(shadow, filter, scaleX, scaleY);
                ctx.drawImage(canvas, 0, 0);
                const target = canvas.getContext('2d');
                target.setTransform(1, 0, 0, 1, 0, 0);
                target.clearRect(0, 0, canvas.width, canvas.height);
                target.drawImage(shadow, 0, 0);
                this.release(shadow);
            }
            else
                throw new Error(`Unsupported source filter ${filter.type}`);
        }
    }
    paint(ctx, fill, opacity, tint, ratio, bounds) {
        if (!fill.startsWith('@'))
            return color(fill, opacity, tint);
        if (this.profiling)
            this.stats.gradients++;
        const g = this.pack.gradients[fill.slice(1)];
        const m = gradientMatrix(g, ratio);
        let gradient;
        let low = 0, high = 1;
        if (g.type === 'linearGradient') {
            const x1 = g.x1 ?? 0, y1 = g.y1 ?? 0, x2 = g.x2 ?? 1, y2 = g.y2 ?? 0;
            if (g.spread === 'reflect') {
                const inv = new DOMMatrix(m).inverse(), dx = x2 - x1, dy = y2 - y1;
                const values = [bounds.x, bounds.x + bounds.width].flatMap(x => [bounds.y, bounds.y + bounds.height].map(y => { const p = new DOMPoint(x, y).matrixTransform(inv); return ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy); }));
                low = Math.floor(Math.min(0, ...values)) - 1;
                high = Math.ceil(Math.max(1, ...values)) + 1;
            }
            gradient = ctx.createLinearGradient(x1 + (x2 - x1) * low, y1 + (y2 - y1) * low, x1 + (x2 - x1) * high, y1 + (y2 - y1) * high);
        }
        else {
            const cx = g.cx ?? 0, cy = g.cy ?? 0, fx = g.fx ?? cx, fy = g.fy ?? cy, r = g.r ?? 1;
            if (g.spread === 'reflect') {
                const inv = new DOMMatrix(m).inverse();
                const distances = [bounds.x, bounds.x + bounds.width].flatMap(x => [bounds.y, bounds.y + bounds.height].map(y => { const p = new DOMPoint(x, y).matrixTransform(inv); return Math.hypot(p.x - fx, p.y - fy); }));
                high = Math.ceil(Math.max(...distances) / Math.max(.00001, r - Math.hypot(cx - fx, cy - fy))) + 1;
            }
            gradient = ctx.createRadialGradient(fx, fy, 0, fx + (cx - fx) * high, fy + (cy - fy) * high, r * high);
        }
        const stops = g.stops.map(s => ({ offset: Number(animated(s.animations, 'offset', String(s.offset), ratio)), color: color(animated(s.animations, 'stop-color', s.color, ratio), Number(animated(s.animations, 'stop-opacity', String(s.opacity), ratio)) * opacity, tint) }));
        for (let cycle = low; cycle < high; cycle++) {
            const reverse = Math.abs(cycle % 2) === 1 && g.spread === 'reflect';
            for (const stop of reverse ? [...stops].reverse() : stops)
                gradient.addColorStop(clamp((cycle + (reverse ? 1 - stop.offset : stop.offset) - low) / (high - low)), stop.color);
        }
        return gradient;
    }
    gradientRect(ctx, fill, opacity, tint, ratio, bounds) {
        const matrix = gradientMatrix(this.pack.gradients[fill.slice(1)], ratio), inverse = new DOMMatrix(matrix).inverse();
        const area = transformedBounds(bounds, [inverse.a, inverse.b, inverse.c, inverse.d, inverse.e, inverse.f]);
        ctx.save();
        ctx.transform(...matrix);
        // Canvas applies the matrix when painting a gradient, not when creating it.
        ctx.fillStyle = this.paint(ctx, fill, opacity, tint, ratio, bounds);
        ctx.fillRect(area.x - 1, area.y - 1, area.width + 2, area.height + 2);
        ctx.restore();
    }
    gradientStroke(ctx, path, fill, opacity, tint, ratio, bounds) {
        const m = ctx.getTransform(), sx = Math.max(.25, Math.ceil(Math.hypot(m.a, m.b) * 4) / 4), sy = Math.max(.25, Math.ceil(Math.hypot(m.c, m.d) * 4) / 4);
        const x = Math.floor(bounds.x * sx) - 2, y = Math.floor(bounds.y * sy) - 2;
        const canvas = this.acquire(Math.ceil((bounds.x + bounds.width) * sx) - x + 2, Math.ceil((bounds.y + bounds.height) * sy) - y + 2), target = canvas.getContext('2d');
        target.setTransform(sx, 0, 0, sy, -x, -y);
        target.strokeStyle = '#ffffff';
        target.lineWidth = ctx.lineWidth;
        target.lineCap = ctx.lineCap;
        target.lineJoin = ctx.lineJoin;
        target.stroke(path);
        target.globalCompositeOperation = 'source-in';
        this.gradientRect(target, fill, opacity, tint, ratio, bounds);
        ctx.drawImage(canvas, x / sx, y / sy, canvas.width / sx, canvas.height / sy);
        this.release(canvas);
    }
    frame(s, clock, interpolate = false) {
        return presentationFrame(s, clock, interpolate);
    }
    childClock(s, clock, index, p, interpolate = false, persistentClock) {
        return childTimelineClock(s, clock, index, p, interpolate, persistentClock);
    }
    mask(id, clock, ratio, matrix, depth = 0, interpolate = false) {
        if (depth > 40)
            throw new Error('Vector mask nesting exceeded');
        const result = new Path2D(), s = this.pack.symbols[id];
        if (s.draws)
            for (const d of s.draws) {
                if (d.fill === 'none')
                    continue;
                result.addPath(this.path(d, ratio), new DOMMatrix(multiply(matrix, d.matrix)));
            }
        else {
            const { placements, index } = this.frame(s, clock, interpolate);
            for (const p of placements)
                if (p.visible !== false)
                    result.addPath(this.mask(p.id, this.childClock(s, clock, index, p, interpolate), (p.ratio ?? 0) / 65535, multiply(matrix, p.matrix), depth + 1, interpolate && !p.filters?.length));
        }
        return result;
    }
    render(ctx, id, clock, tint, ratio, depth = 0, useCache = true, interpolate = false, persistentClock) {
        if (depth > 40)
            throw new Error('Vector display nesting exceeded');
        const s = this.pack.symbols[id];
        if (s.draws) {
            for (const d of s.draws) {
                const path = this.path(d, ratio);
                ctx.save();
                ctx.transform(...d.matrix);
                const fill = animated(d.animations, 'fill', d.fill, ratio), stroke = animated(d.animations, 'stroke', d.stroke, ratio);
                if (fill !== 'none') {
                    const opacity = Number(animated(d.animations, 'fill-opacity', String(d.fillOpacity), ratio));
                    if (fill.startsWith('@')) {
                        ctx.save();
                        ctx.clip(path, d.rule);
                        this.gradientRect(ctx, fill, opacity, tint, ratio, s.bounds);
                        ctx.restore();
                    }
                    else {
                        ctx.fillStyle = this.paint(ctx, fill, opacity, tint, ratio, s.bounds);
                        ctx.fill(path, d.rule);
                    }
                }
                const width = Number(animated(d.animations, 'stroke-width', String(d.width), ratio));
                if (stroke !== 'none' && width > 0) {
                    const matrix = ctx.getTransform();
                    ctx.lineWidth = d.hairline ? Math.max(width, 1 / Math.max(Math.hypot(matrix.a, matrix.b), Math.hypot(matrix.c, matrix.d))) : width;
                    ctx.lineCap = d.cap;
                    ctx.lineJoin = d.join;
                    const opacity = Number(animated(d.animations, 'stroke-opacity', String(d.strokeOpacity), ratio));
                    if (stroke.startsWith('@'))
                        this.gradientStroke(ctx, path, stroke, opacity, tint, ratio, s.bounds);
                    else {
                        ctx.strokeStyle = this.paint(ctx, stroke, opacity, tint, ratio, s.bounds);
                        ctx.stroke(path);
                    }
                }
                ctx.restore();
            }
            return;
        }
        const { placements, index } = this.frame(s, clock, interpolate);
        const masks = [];
        for (const p of placements) {
            if (p.visible === false || this.omitChild(id, p))
                continue;
            const childClock = this.childClock(s, clock, index, p, interpolate, persistentClock), childRatio = (p.ratio ?? 0) / 65535;
            if (p.clipDepth && p.clipDepth > p.depth) {
                masks.push({ end: p.clipDepth, path: this.mask(p.id, childClock, childRatio, p.matrix, 0, interpolate) });
                continue;
            }
            ctx.save();
            for (const m of masks)
                if (p.depth <= m.end)
                    ctx.clip(m.path, 'evenodd');
            ctx.transform(...p.matrix);
            this.node(ctx, p.id, childClock, combineTint(tint, p.colorTransform), childRatio, p.filters ?? [], depth + 1, useCache, p.matrix, interpolate);
            ctx.restore();
        }
    }
    node(ctx, id, clock, tint, ratio, sourceFilters, depth, useCache, placement = ID, interpolate = false, persistentClock) {
        if (depth > 40)
            throw new Error('Vector display nesting exceeded');
        const s = this.pack.symbols[id], period = this.period(id);
        const operation = s.draws?.length === 1 ? s.draws[0] : undefined;
        if (!this.profilingOmitAlphaFactoring && operation && !sourceFilters.length && tint[7] === 0 && !operation.animations?.fill && !operation.animations?.stroke &&
            ((operation.fill !== 'none') !== (operation.stroke !== 'none' && operation.width > 0))) {
            // One paint operation has no inter-path overlap. Its multiplicative alpha can
            // be applied after rasterization exactly, sharing the same tile across fades.
            ctx.globalAlpha *= tint[3];
            tint = [...tint];
            tint[3] = 1;
            if (ctx.globalAlpha === 0)
                return;
        }
        // Filter output stays at source cadence; fractional decorative clocks never create60 filtered tiles/second.
        interpolate = interpolate && !sourceFilters.length && s.kind !== 'button';
        clock = period === 1 ? 0 : (interpolate ? clock : Math.floor(clock)) % period;
        const filters = this.profiling && this.profilingOmitFilters ? [] : sourceFilters;
        // Effects operate on the transformed clip in its parent's coordinates. Keep translation out of its tile.
        const contentMatrix = filters.length ? [placement[0], placement[1], placement[2], placement[3], 0, 0] : ID;
        const det = contentMatrix[0] * contentMatrix[3] - contentMatrix[1] * contentMatrix[2];
        if (!det)
            return;
        if (filters.length)
            ctx.transform(contentMatrix[3] / det, -contentMatrix[1] / det, -contentMatrix[2] / det, contentMatrix[0] / det, 0, 0);
        const m = ctx.getTransform();
        const scaleX = Math.max(.25, Math.ceil(Math.hypot(m.a, m.b) * 4) / 4), scaleY = Math.max(.25, Math.ceil(Math.hypot(m.c, m.d) * 4) / 4);
        const rawBounds = this.currentBounds(id, clock, 0, interpolate, persistentClock);
        if (!rawBounds?.width || !rawBounds.height)
            return;
        let b = filterBounds(transformedBounds(rawBounds, contentMatrix), filters, scaleX, scaleY);
        const visible = transformedBounds(b, [m.a, m.b, m.c, m.d, m.e, m.f]);
        if (visible.x + visible.width < -2 || visible.y + visible.height < -2 || visible.x > ctx.canvas.width + 2 || visible.y > ctx.canvas.height + 2) {
            this.stats.culled++;
            return;
        }
        // Large stationary geometry can extend far beyond the stage. Include the crop in
        // its key so moving/repositioned art never reuses a tile missing newly visible pixels.
        if ((s.draws || this.simplerEffects && id === 193 && period === 1 && !this.diagnosticUncroppedStaticGroups) && !filters.length && b.width * scaleX * b.height * scaleY * 4 > 1024 * 1024) {
            const determinant = m.a * m.d - m.b * m.c;
            if (determinant) {
                const inverse = [m.d / determinant, -m.b / determinant, -m.c / determinant, m.a / determinant, (m.c * m.f - m.d * m.e) / determinant, (m.b * m.e - m.a * m.f) / determinant];
                b = intersection(b, transformedBounds({ x: -2, y: -2, width: ctx.canvas.width + 4, height: ctx.canvas.height + 4 }, inverse));
            }
        }
        // Animated parents retain their stationary children rather than allocating their travel bounds each frame.
        const retain = useCache && (Boolean(s.draws) || period === 1 || filters.length > 0);
        const x = Math.floor(b.x * scaleX) - 2, y = Math.floor(b.y * scaleY) - 2;
        const width = Math.ceil((b.x + b.width) * scaleX) - x + 2, height = Math.ceil((b.y + b.height) * scaleY) - y + 2;
        if ((!retain && !filters.length) || !filters.length && width * height * 4 > 32 * 1024 * 1024) {
            this.render(ctx, id, clock, tint, ratio, depth, useCache, interpolate, persistentClock);
            this.stats.vectorDraws++;
            return;
        }
        const key = `${id}:${clock}:${persistentClock ?? ''}:${scaleX}:${scaleY}:${Math.round(ratio * 65535)}:${tint.join(',')}:${contentMatrix.join(',')}:${x},${y},${width},${height}:${JSON.stringify(filters)}`;
        const family = retain && width * height * 4 >= 16 * 1024 && !filters.length && !this.diagnosticFullMorphCache && this.isMorph(id, s)
            ? `${id}:${clock}:${persistentClock ?? ''}:${scaleX}:${scaleY}:${tint.join(',')}:${contentMatrix.join(',')}:${x},${y},${width},${height}` : null;
        let tile = retain ? this.tiles.get(key) : undefined;
        if (!tile) {
            // Release before acquiring: equal-size morph poses can immediately reuse the backing canvas.
            if (family) {
                const keys = this.morphFamilies.get(family);
                while (keys && keys.size >= 2)
                    this.removeTile(keys.values().next().value, 'morph');
            }
            const began = this.profiling ? performance.now() : 0;
            const canvas = this.acquire(width, height);
            const target = canvas.getContext('2d');
            target.setTransform(scaleX, 0, 0, scaleY, -x, -y);
            target.transform(...contentMatrix);
            // Retaining a complete group and its leaf tiles doubles its working set. Inner filters
            // still isolate, but their scratch surfaces return to the pool after this group is built.
            this.render(target, id, clock, tint, ratio, depth, false, interpolate, persistentClock);
            this.stats.vectorDraws++;
            target.setTransform(1, 0, 0, 1, 0, 0);
            this.filters(canvas, filters, scaleX, scaleY);
            tile = { canvas, scaleX, scaleY, x: x / scaleX, y: y / scaleY, bytes: width * height * 4 };
            if (this.profiling) {
                const cost = this.groupCosts.get(id) ?? { builds: 0, milliseconds: 0, bytes: 0, filtered: 0 };
                cost.builds++;
                cost.milliseconds += performance.now() - began;
                cost.bytes += tile.bytes;
                if (filters.length)
                    cost.filtered++;
                this.groupCosts.set(id, cost);
            }
            if (retain && tile.bytes <= this.tileBudget) {
                this.tiles.set(key, tile);
                this.tileBytes += tile.bytes;
                if (family) {
                    const keys = this.morphFamilies.get(family) ?? new Set();
                    keys.add(key);
                    this.morphFamilies.set(family, keys);
                    this.tileFamilies.set(key, family);
                }
            }
        }
        else {
            this.stats.cacheHits++;
            this.tiles.delete(key);
            this.tiles.set(key, tile);
            if (family) {
                const keys = this.morphFamilies.get(family);
                keys.delete(key);
                keys.add(key);
            }
        }
        ctx.drawImage(tile.canvas, tile.x, tile.y, tile.canvas.width / tile.scaleX, tile.canvas.height / tile.scaleY);
        if (!this.tiles.has(key))
            this.release(tile.canvas);
        while (this.tileBytes > this.tileBudget || this.tiles.size > 512) {
            this.removeTile(this.tiles.keys().next().value, this.tileBytes > this.tileBudget ? 'bytes' : 'entries');
        }
        this.stats.cachedBytes = this.tileBytes;
    }
    draw(ctx, id, matrix, frame = 1, alpha = 1, useCache = true, morphRatio = 0, effects = {}) {
        if (!this.pack.symbols[id])
            return false;
        const clock = (Math.max(1, effects.interpolate ? frame : Math.floor(frame)) - 1) % this.period(id);
        ctx.save();
        ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        ctx.globalAlpha *= alpha;
        this.node(ctx, id, clock, combineTint(NO_TINT, effects.colorTransform), morphRatio, effects.filters ?? [], 0, useCache, [matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty], effects.interpolate, effects.persistentFrame === undefined ? undefined : Math.max(0, Math.floor(effects.persistentFrame) - 1));
        ctx.restore();
        return true;
    }
    drawPlacement(ctx, id, matrix, frame = 1, placement = {}, alpha = 1, useCache = true, morphRatio = 0) {
        return this.draw(ctx, id, matrix, frame, alpha, useCache, morphRatio, placement);
    }
    contains(id, x, y, frame) {
        const ctx = this.hitCanvas.getContext('2d', { willReadFrequently: true });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 1, 1);
        ctx.setTransform(1, 0, 0, 1, -x + .5, -y + .5);
        this.render(ctx, id, frame - 1, NO_TINT, 0, 0, false);
        return ctx.getImageData(0, 0, 1, 1).data[3] > 0;
    }
    clearCache() {
        for (const t of this.tiles.values())
            t.canvas.width = t.canvas.height = 0;
        this.tiles.clear();
        this.morphFamilies.clear();
        this.tileFamilies.clear();
        this.tileBytes = 0;
        this.stats.cachedBytes = 0;
        this.boundsCache.clear();
        for (const canvas of this.surfaces)
            canvas.width = canvas.height = 0;
        this.surfaces = [];
        this.poolBytes = 0;
        this.stats.pooledBytes = 0;
        this.blurScratch = new Uint8ClampedArray(0);
        this.gpuFilter.clear();
    }
}
exports.VectorArt = VectorArt;

},{"./box-filter.js":"src/render/box-filter.js"}],
"src/render/box-filter.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoxFilter = void 0;
exports.filterBackingSize = filterBackingSize;
/** Native GPU implementation of the game's separable fractional box filter.
 * Scene geometry and simulation remain in Canvas/TypeScript. No pixel readback is used. */
const VERTEX = `#version 300 es
void main() {
  vec2 p = gl_VertexID == 0 ? vec2(-1.0,-1.0) : gl_VertexID == 1 ? vec2(3.0,-1.0) : vec2(-1.0,3.0);
  gl_Position = vec4(p,0.0,1.0);
}`;
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D sourcePixels;
uniform ivec2 activeSize;
uniform vec2 backingSize;
uniform ivec2 direction;
uniform int innerRadius;
uniform float edgeWeight;
uniform float fullWidth;
out vec4 outputColor;
vec4 pixel(ivec2 p) {
  if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(p,activeSize))) return vec4(0.0);
  return floor(texelFetch(sourcePixels,p,0)*255.0+0.5);
}
vec4 pair(ivec2 p) {
  ivec2 q=p+direction;
  if (any(lessThan(p,ivec2(0))) || any(greaterThanEqual(q,activeSize))) return pixel(p)+pixel(q);
  vec2 uv=(vec2(p)+vec2(0.5)+vec2(direction)*0.5)/backingSize;
  return floor(texture(sourcePixels,uv)*510.0+0.5);
}
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy);
  vec4 center=pixel(p+direction*innerRadius);
  for (int i=0;i<127;i++) {
    if (i>=innerRadius) break;
    center+=pair(p+direction*(-innerRadius+i*2));
  }
  vec4 ends=pixel(p-direction*(innerRadius+1))+pixel(p+direction*(innerRadius+1));
  outputColor=floor((center*255.0+ends*edgeWeight)/(fullWidth*255.0))/255.0;
}`;
/** Size buckets preserve GPU allocations when adjacent authored frames have slightly different bounds. */
function filterBackingSize(width, height) {
    return [Math.ceil(width / 64) * 64, Math.ceil(height / 64) * 64];
}
class BoxFilter {
    powerPreference;
    constructor(powerPreference = 'default') {
        this.powerPreference = powerPreference;
    }
    canvas = null;
    gl = null;
    program = null;
    textures = [];
    framebuffers = [];
    uniforms = {};
    width = 0;
    height = 0;
    attempted = false;
    lost = false;
    details = null;
    gpuApplications = 0;
    cpuRequiredApplications = 0;
    lastResult = 'not-used';
    stats = { passes: 0, allocatedBytes: 0, backingBytes: 0, failures: 0 };
    /** Inspects only the filter's existing context. Never creates a diagnostic GPU context. */
    gpuSummary() {
        const gl = this.gl, status = !this.attempted ? 'not-initialized' : gl?.isContextLost() ? 'context-lost' : gl && !this.lost ? 'ready' : 'unavailable';
        if (gl && status === 'ready' && !this.details) {
            const parameter = (name) => {
                try {
                    return name === undefined ? null : gl.getParameter(name);
                }
                catch {
                    return null;
                }
            };
            const string = (value) => typeof value === 'string' ? value : null;
            let extension = null, attributes = null;
            try {
                extension = gl.getExtension('WEBGL_debug_renderer_info');
            }
            catch { /* Browser privacy policy may hide GPU details. */ }
            try {
                attributes = gl.getContextAttributes();
            }
            catch { /* Context may become unavailable while reading. */ }
            const vendor = string(parameter(gl.VENDOR)), renderer = string(parameter(gl.RENDERER));
            const unmaskedVendor = string(parameter(extension?.UNMASKED_VENDOR_WEBGL)), unmaskedRenderer = string(parameter(extension?.UNMASKED_RENDERER_WEBGL));
            const identity = unmaskedRenderer ?? renderer ?? '';
            const classification = /swiftshader|llvmpipe|softpipe|software rasterizer|\bwarp\b|microsoft basic render/i.test(identity) ? 'software-indicated' : /nvidia|geforce|quadro|radeon|intel|apple (?:m\d|gpu)|adreno|mali|powervr/i.test(identity) ? 'hardware-identified' : 'unknown';
            const maximum = parameter(gl.MAX_TEXTURE_SIZE);
            this.details = { vendor, renderer, unmaskedVendor, unmaskedRenderer, version: string(parameter(gl.VERSION)), shadingLanguageVersion: string(parameter(gl.SHADING_LANGUAGE_VERSION)), maximumTextureSize: typeof maximum === 'number' ? maximum : null, attributes, classification };
        }
        // Return a detached snapshot so diagnostics cannot change renderer bookkeeping.
        return { api: 'webgl2', status, details: status === 'ready' && this.details ? { ...this.details, attributes: this.details.attributes ? { ...this.details.attributes } : null } : null, gpuApplications: this.gpuApplications, cpuRequiredApplications: this.cpuRequiredApplications, lastResult: this.lastResult };
    }
    cpuRequired() { this.cpuRequiredApplications++; this.lastResult = 'cpu-required'; return false; }
    initialize() {
        if (this.attempted)
            return Boolean(this.gl && !this.lost && !this.gl.isContextLost());
        this.attempted = true;
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false, powerPreference: this.powerPreference });
        if (!gl || typeof gl.createShader !== 'function')
            return false;
        try {
            const compile = (type, source) => {
                const shader = gl.createShader(type);
                if (!shader)
                    throw new Error('Filter shader unavailable');
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    gl.deleteShader(shader);
                    throw new Error('Filter shader compilation failed');
                }
                return shader;
            };
            const vertex = compile(gl.VERTEX_SHADER, VERTEX), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT), program = gl.createProgram();
            if (!program)
                throw new Error('Filter program unavailable');
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                gl.deleteProgram(program);
                throw new Error('Filter program linking failed');
            }
            this.canvas = canvas;
            this.gl = gl;
            this.program = program;
            this.details = null;
            canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; });
            canvas.addEventListener('webglcontextrestored', () => { this.attempted = false; this.lost = false; this.gl = null; this.details = null; this.textures = []; this.framebuffers = []; this.width = this.height = 0; });
            for (const name of ['sourcePixels', 'activeSize', 'backingSize', 'direction', 'innerRadius', 'edgeWeight', 'fullWidth'])
                this.uniforms[name] = gl.getUniformLocation(program, name);
            for (let i = 0; i < 3; i++) {
                const texture = gl.createTexture();
                if (!texture)
                    throw new Error('Filter texture unavailable');
                this.textures.push(texture);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                if (i) {
                    const framebuffer = gl.createFramebuffer();
                    if (!framebuffer)
                        throw new Error('Filter framebuffer unavailable');
                    this.framebuffers.push(framebuffer);
                }
            }
            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.STENCIL_TEST);
            gl.disable(gl.DITHER);
            return true;
        }
        catch {
            this.stats.failures++;
            this.gl = null;
            return false;
        }
    }
    apply(target, blurX, blurY, passes) {
        const axes = [];
        for (let pass = 0; pass < passes; pass++) {
            if (blurX > 1)
                axes.push({ size: Math.min(255, blurX), x: 1, y: 0 });
            if (blurY > 1)
                axes.push({ size: Math.min(255, blurY), x: 0, y: 1 });
        }
        if (!axes.length)
            return true;
        if (!this.initialize())
            return this.cpuRequired();
        const gl = this.gl, canvas = this.canvas, w = target.width, h = target.height;
        try {
            const requested = filterBackingSize(w, h), width = Math.max(requested[0], this.width), height = Math.max(requested[1], this.height);
            if (width !== this.width || height !== this.height) {
                const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                if (width > limit || height > limit)
                    return this.cpuRequired();
                this.width = width;
                this.height = height;
                canvas.width = width;
                canvas.height = height;
                for (let i = 0; i < 3; i++) {
                    gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                    if (i) {
                        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i - 1]);
                        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
                        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
                            throw new Error('Filter framebuffer incomplete');
                    }
                }
                this.stats.allocatedBytes += width * height * 4 * 4;
                this.stats.backingBytes = width * height * 4 * 4;
            }
            gl.useProgram(this.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, target);
            gl.viewport(0, 0, w, h);
            gl.uniform1i(this.uniforms.sourcePixels, 0);
            gl.uniform2i(this.uniforms.activeSize, w, h);
            gl.uniform2f(this.uniforms.backingSize, width, height);
            let input = 0;
            for (let index = 0; index < axes.length; index++) {
                const axis = axes[index], last = index === axes.length - 1, output = input === 1 ? 2 : 1;
                gl.bindFramebuffer(gl.FRAMEBUFFER, last ? null : this.framebuffers[output - 1]);
                gl.bindTexture(gl.TEXTURE_2D, this.textures[input]);
                const radius = (axis.size - 1) / 2, inner = Math.max(0, Math.ceil(radius) - 1), edge = Math.floor((radius - inner) * 255);
                gl.uniform2i(this.uniforms.direction, axis.x, axis.y);
                gl.uniform1i(this.uniforms.innerRadius, inner);
                gl.uniform1f(this.uniforms.edgeWeight, edge);
                gl.uniform1f(this.uniforms.fullWidth, axis.size);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                input = output;
                this.stats.passes++;
            }
            gl.flush();
            const ctx = target.getContext('2d');
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'copy';
            ctx.drawImage(canvas, 0, height - h, w, h, 0, 0, w, h);
            ctx.restore();
            this.gpuApplications++;
            this.lastResult = 'gpu';
            return true;
        }
        catch {
            this.stats.failures++;
            this.lost = true;
            return this.cpuRequired();
        }
    }
    clear() {
        // Keep one context/program alive across diagnostic resets; repeatedly creating contexts
        // can exceed the browser's context limit even after all texture handles are deleted.
        if (this.gl && !this.gl.isContextLost()) {
            for (const texture of this.textures) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA8, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            }
            this.canvas.width = this.canvas.height = 1;
            this.width = this.height = 1;
            this.stats.backingBytes = 16;
        }
        else {
            this.attempted = false;
            this.stats.backingBytes = 0;
        }
    }
}
exports.BoxFilter = BoxFilter;

},{}],
"src/render/resources.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceJson = resourceJson;
exports.resourceUrl = resourceUrl;
const embedded = () => globalThis.__madrasiResources;
const key = (url) => url.replace(/^\.\//, '');
/** HTTP and file builds share the same game; only resource transport differs. */
async function resourceJson(url) {
    const resources = embedded();
    if (resources) {
        if (!Object.hasOwn(resources.json, key(url)))
            throw new Error(`Missing embedded resource: ${url}`);
        return resources.json[key(url)];
    }
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Could not load resource: ${url}`);
    return response.json();
}
function resourceUrl(url) { return embedded()?.binary[key(url)] ?? url; }

},{}],
"src/render/renderer.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = exports.runtimeTimelineIds = void 0;
const assets_js_1 = require("./assets.js");
const vector_js_1 = require("./vector.js");
const resources_js_1 = require("./resources.js");
const presentation_profile_js_1 = require("../presentation-profile.js");
const carry_cursor_js_1 = require("./carry-cursor.js");
const screenFrame = { menu: 3, instructions: 4, playing: 5, 'game-over': 6, 'day-result': 7 };
const wrappers = [413, 399, 400, 371, 385];
// Shared with packaging so required player compositions cannot be dropped.
exports.runtimeTimelineIds = [...wrappers, 476, 363, 357];
// Only decorative clips sample between authored poses; gameplay holds and callbacks stay12Hz.
const trafficIds = new Set([204, 206, 210, 215, 218]);
const continuousDecorations = new Set([146, ...trafficIds]);
const buttonCommands = {
    btnStart: ['Start', { type: 'start' }], btnPlay: ['Play', { type: 'play' }],
    btnHowToPlay: ['How to play', { type: 'show-tutorial' }], btnTomorrow: ['Tomorrow', { type: 'next-day' }],
    btnTryAgain: ['Try again', { type: 'retry' }],
    btnMute: ['Mute music', { type: 'toggle-mute' }], btnUnMute: ['Unmute music', { type: 'toggle-mute' }],
};
const combine = (p, q) => ({ a: p.a * q.a + p.c * q.b, b: p.b * q.a + p.d * q.b, c: p.a * q.c + p.c * q.d, d: p.b * q.c + p.d * q.d, tx: p.a * q.tx + p.c * q.ty + p.tx, ty: p.b * q.tx + p.d * q.ty + p.ty });
class Renderer {
    canvas;
    assets;
    presentation = (0, presentation_profile_js_1.resolvePresentation)(null);
    setPresentation(choice) {
        this.batterCursor.reset();
        this.carriedDosaCursor.reset();
        this.carriedPlateCursor.reset();
        this.preparedKey = '';
        this.clearSceneCache();
        this.presentation = (0, presentation_profile_js_1.resolvePresentation)(choice);
        this.assets.vector?.setSimplerEffects(this.presentation.simplerEffects);
        // Root effects are indexed against the active metadata view.
        if (this.assets.vector)
            this.compositionIndices.delete(this.assets.vector);
    }
    renderScale = 1;
    pointerType = 'mouse';
    batterCursor;
    carriedDosaCursor;
    carriedPlateCursor;
    get cursorDataBytes() { return this.batterCursor.memoryBytes + this.carriedDosaCursor.memoryBytes + this.carriedPlateCursor.memoryBytes; }
    diagnosticOmissions = new Set();
    onRenderCost = null;
    setRenderScale(value) {
        const scale = Number.isFinite(value) ? Math.min(1, Math.max(.25, value)) : 1;
        if (scale !== this.renderScale) {
            this.batterCursor.reset();
            this.carriedDosaCursor.reset();
            this.carriedPlateCursor.reset();
            this.preparedKey = '';
            this.renderScale = scale;
            this.clearSceneCache();
            this.assets.vector?.clearCache();
        }
    }
    hits = [];
    ctx;
    sceneSurface = null;
    sceneKey = '';
    sceneHits = [];
    sceneVector = null;
    frameKey = '';
    frameVector = null;
    frameCounts = { painted: 0, reused: 0 };
    lastDrawPainted = true;
    /** Diagnostic comparison only; keep normal scene retention but repaint every callback. */
    diagnosticFullFrameRedraw = false;
    /** Diagnostic comparison only; never selected by the player UI. */
    diagnosticFullSceneRedraw = false;
    /** Development comparison: the final batter drawing is supplied by a small overlay. */
    diagnosticBatterOverlay = false;
    get sceneCacheBytes() { return this.sceneSurface ? this.sceneSurface.width * this.sceneSurface.height * 4 : 0; }
    clearSceneCache() {
        this.frameKey = '';
        this.frameVector = null;
        if (this.sceneSurface)
            this.sceneSurface.width = this.sceneSurface.height = 0;
        this.sceneSurface = null;
        this.sceneKey = '';
        this.sceneHits = [];
        this.sceneVector = null;
    }
    children = new Map();
    // These callers deliberately query authored frame 1: root scene effects and
    // one-frame customer wrappers. Animated food/bills keep their live queries.
    // A replacement asset pack gets its own index; surface-cache eviction does not
    // invalidate immutable placement metadata.
    compositionIndices = new WeakMap();
    displayWidth = 550;
    displayHeight = 400;
    preparedKey = '';
    preparedVector = null;
    pressedCommand = null;
    scoreFormVisible = true;
    sceneStartedMs = 0;
    currentTimeMs = 0;
    radioStartedMs = 0;
    radioEnabled = true;
    hoveredFood = null;
    flipHint = false;
    foodCursor = '';
    feedback = [];
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.assets = assets;
        this.batterCursor = new carry_cursor_js_1.CarryCursor(canvas, assets);
        this.carriedDosaCursor = new carry_cursor_js_1.CarryCursor(canvas, assets);
        this.carriedPlateCursor = new carry_cursor_js_1.CarryCursor(canvas, assets);
        // Every frame covers the stage opaquely, so the browser need not composite an alpha channel.
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx)
            throw new Error('Canvas is unavailable.');
        this.ctx = ctx;
        this.displayWidth = canvas.clientWidth;
        this.displayHeight = canvas.clientHeight;
        new ResizeObserver(entries => {
            const box = entries[0]?.contentRect;
            if (box) {
                this.displayWidth = box.width;
                this.displayHeight = box.height;
            }
        }).observe(canvas);
    }
    async load() {
        await Promise.all(exports.runtimeTimelineIds.map(async (id) => {
            const data = await (0, resources_js_1.resourceJson)(`assets/timelines/${id}.json`);
            this.children.set(id, data.events.filter(e => e.type === 'place' && e.frame === 1));
        }));
        const sceneIds = this.assets.scenes.flatMap(s => s.frame >= 3 ? s.instances.map(i => i.symbolId) : []);
        await this.assets.preload([...new Set([...sceneIds, 242, 412, 398, 320, 338, 384, 345, 370, 472])]);
    }
    /** Prepare first appearances before the cooking clock starts. The normal bounded
     * tile cache owns the results; one temporary stage is released before play. */
    async prepare() {
        const vector = this.assets.vector;
        if (!vector)
            return;
        const dimensions = () => {
            const ratio = Math.min(devicePixelRatio || 1, 3);
            return [Math.max(1, Math.round(this.displayWidth * ratio * this.renderScale)), Math.max(1, Math.round(this.displayHeight * ratio * this.renderScale))];
        };
        const [width, height] = dimensions(), choice = this.presentation.choice, key = `${width}:${height}:${choice}`;
        if (this.preparedKey === key && this.preparedVector === vector || width * height * 4 > 32 * 1024 * 1024)
            return;
        vector.setViewport(width, height);
        // The welcome/tutorial is no longer being animated. Release those large
        // surfaces before reserving the kitchen/end-screen working set.
        vector.clearCache();
        const surface = document.createElement('canvas');
        surface.width = width;
        surface.height = height;
        const c = surface.getContext('2d');
        try {
            // End-of-day scenery must exist before the timed transition. Preparing the
            // menu/tutorial too would crowd out useful kitchen tiles under the same cap.
            for (const frame of [7, 6, 5])
                for (const p of this.assets.scenes.find(s => s.frame === frame)?.instances ?? []) {
                    if (p.name === 'mcInstruction' || /^dosaHolder|^bill|^txt/.test(p.name ?? ''))
                        continue;
                    const effects = this.composition(-1000 - frame).get(p.depth);
                    if (effects?.clipDepth)
                        continue;
                    await new Promise(resolve => requestAnimationFrame(() => resolve()));
                    const [currentWidth, currentHeight] = dimensions();
                    if (currentWidth !== width || currentHeight !== height || this.assets.vector !== vector || this.presentation.choice !== choice)
                        return;
                    c.setTransform(1, 0, 0, 1, 0, 0);
                    c.clearRect(0, 0, width, height);
                    c.setTransform(width / 550, 0, 0, height / 400, 0, 0);
                    vector.drawPlacement(c, p.symbolId, p.matrix, 1, effects);
                }
            if (this.presentation.retainScene) {
                // First-use food/filter submissions caused the remaining early stalls.
                // Warm one normal cooking cycle at exact density, before the game clock.
                // These are ordinary entries in the same bounded cache, not an atlas or
                // another animation loop. The original burn/late-pickup poses stay lazy.
                const template = this.assets.placement('mcDosa');
                const holders = [0, 1, 2].map(slot => this.assets.placement(`dosaHolder${slot}`)).filter(p => p !== undefined);
                if (template)
                    for (const frame of [...Array.from({ length: 71 }, (_, i) => i + 1), ...Array.from({ length: 37 }, (_, i) => i + 291)]) {
                        await new Promise(resolve => requestAnimationFrame(() => resolve()));
                        const [currentWidth, currentHeight] = dimensions();
                        if (currentWidth !== width || currentHeight !== height || this.assets.vector !== vector || this.presentation.choice !== choice)
                            return;
                        c.setTransform(1, 0, 0, 1, 0, 0);
                        c.clearRect(0, 0, width, height);
                        c.setTransform(width / 550, 0, 0, height / 400, 0, 0);
                        for (const holder of holders)
                            vector.draw(c, 472, { ...template.matrix, tx: holder.matrix.tx, ty: holder.matrix.ty }, frame);
                        // Flush while the loading state is visible, not on first placement.
                        c.getImageData(0, 0, 1, 1);
                    }
            }
            // Complete the queued preparation before the cooking clock begins. This
            // one-pixel readback is confined to the loading transition, never a frame loop.
            c.getImageData(0, 0, 1, 1);
            if (this.presentation.retainScene)
                await this.batterCursor.prepare(width, height, this.displayWidth, this.displayHeight);
            this.preparedKey = key;
            this.preparedVector = vector;
        }
        finally {
            surface.width = surface.height = 0;
        }
    }
    composition(id) {
        const vector = this.assets.vector;
        let indices = this.compositionIndices.get(vector);
        if (!indices) {
            indices = new Map();
            this.compositionIndices.set(vector, indices);
        }
        let index = indices.get(id);
        if (!index) {
            index = new Map(vector.placements(id).map(p => [p.depth, p]));
            indices.set(id, index);
        }
        return index;
    }
    events(events, state) {
        for (const event of events) {
            if (event.type === 'screen') {
                this.clearSceneCache();
                this.feedback = [];
                this.hoveredFood = null;
                this.flipHint = false;
                this.sceneStartedMs = state.timeMs;
                this.radioStartedMs = state.timeMs;
            }
            if (event.type === 'cash') {
                this.feedback = this.feedback.filter(f => f.table !== event.table);
                const slot = event.slot === undefined ? undefined : this.assets.placement(`dosaHolder${event.slot}`);
                this.feedback.push({ time: state.timeMs, amount: event.amount, table: event.table, x: event.x ?? slot?.matrix.tx ?? state.pointer.x, y: event.y ?? slot?.matrix.ty ?? state.pointer.y });
            }
        }
    }
    text(text, x, y, size = 13, color = '#fff', align = 'left', font = 236) {
        const c = this.ctx;
        c.font = `${size}px madrasi-${font}, Arial, sans-serif`;
        c.textBaseline = 'top';
        c.textAlign = align;
        c.fillStyle = color;
        c.fillText(text, x, y);
    }
    sourceText(id, matrix, value) {
        const asset = this.assets.symbols.get(id), metadata = asset?.metadata, bounds = asset?.bounds;
        if (!metadata || !bounds)
            return;
        const color = metadata.children?.find(v => v.tag === 'textColor');
        const align = metadata.align === 2 ? 'center' : metadata.align === 1 ? 'right' : 'left';
        const width = Math.max(0, bounds.width - 4);
        const x = bounds.x + 2 + (align === 'center' ? width / 2 : align === 'right' ? width : 0);
        const c = this.ctx;
        c.save();
        c.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        this.text(value, x, bounds.y + 2, (metadata.fontHeight ?? 260) / 20, `rgba(${color?.red ?? 255},${color?.green ?? 255},${color?.blue ?? 255},${(color?.alpha ?? 255) / 255})`, align, metadata.fontId ?? 236);
        c.restore();
    }
    customer(c, state, original) {
        if (!c.visible || c.table === null)
            return;
        const table = this.assets.placement(`table${c.table}`);
        if (!table)
            return;
        const parent = { ...original.matrix, tx: table.matrix.tx, ty: table.matrix.ty - 40 };
        const children = this.children.get(original.symbolId) || [];
        for (const child of children) {
            if (child.name === 'character' && c.characterVisible) {
                const m = combine(parent, child.matrix);
                const frame = c.characterPose;
                this.assets.vector.drawPlacement(this.ctx, child.symbolId, m, frame, this.composition(original.symbolId).get(child.depth));
                this.hits.push({ label: `Serve customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame });
            }
            else if (child.name?.startsWith('earSmoke') && c.angry) {
                const m = combine(parent, child.matrix);
                this.assets.draw(this.ctx, child.symbolId, m, Math.floor((state.timeMs - (c.angrySinceMs ?? state.timeMs)) * 12 / 1000) + 1);
            }
            else if (child.name === 'mcExit' && c.exitVisible) {
                const m = combine(parent, child.matrix);
                this.assets.vector.drawPlacement(this.ctx, child.symbolId, m, c.exitPose, this.composition(original.symbolId).get(child.depth));
                this.hits.push({ label: `Customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame: c.exitPose });
            }
            else if (child.name === 'mcOrder' && c.orderVisible) {
                const m = combine(parent, child.matrix);
                // This clip is a patience indicator, driven explicitly by the domain's timer.
                this.order(c, m);
                this.hits.push({ label: `Serve customer ${c.id + 1}`, command: { type: 'click-customer', customer: c.id }, id: child.symbolId, matrix: m, pixel: true, frame: Math.floor(c.phaseElapsedMs * 12 / 1000) + 1 });
            }
        }
    }
    order(customer, matrix) {
        const frame = this.presentation.simplerEffects ? 1 : Math.floor((this.currentTimeMs - this.sceneStartedMs) * 12 / 1000) + 1;
        const bubble = this.assets.names.get('sprite-363-clean');
        if (bubble)
            this.assets.draw(this.ctx, bubble.symbolId, matrix, frame);
        else {
            for (const part of this.children.get(363) || []) {
                if (part.symbolId === 351 || part.symbolId === 357)
                    continue;
                this.assets.draw(this.ctx, part.symbolId, combine(matrix, part.matrix), frame);
            }
        }
        const text = (this.children.get(363) || []).find(p => p.symbolId === 351);
        if (text) {
            this.sourceText(351, combine(matrix, text.matrix), String(customer.orderRemaining));
        }
        const meter = (this.children.get(363) || []).find(p => p.name === 'patienceMeter');
        if (!meter)
            return;
        const m = combine(matrix, meter.matrix), c = this.ctx;
        const clip = this.assets.symbols.get(352)?.bounds;
        if (!clip)
            return;
        c.save();
        c.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
        c.save();
        c.beginPath();
        c.rect(clip.x, clip.y, clip.width, clip.height);
        c.clip();
        this.assets.draw(c, 355, (0, assets_js_1.identity)(-3.65, customer.patience));
        c.restore();
        this.assets.draw(c, 356, (0, assets_js_1.identity)());
        c.restore();
    }
    clock(p, minutes) {
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
    draw(s) {
        const nativeBatter = this.presentation.retainScene && this.pointerType === 'mouse' && s.screen === 'playing' && !s.tutorial.visible && s.pointer.mode === 'batter' && s.batterTemplate.available;
        if (nativeBatter) {
            const ratio = Math.min(devicePixelRatio || 1, 3);
            void this.batterCursor.prepare(Math.max(1, Math.round(this.displayWidth * ratio * this.renderScale)), Math.max(1, Math.round(this.displayHeight * ratio * this.renderScale)), this.displayWidth, this.displayHeight);
        }
        this.batterCursor.show(nativeBatter);
        const held = s.pointer.heldSlot === null ? null : s.food[s.pointer.heldSlot];
        const nativeDosa = this.presentation.retainScene && this.pointerType === 'mouse' && s.screen === 'playing' && !s.tutorial.visible && s.pointer.mode === 'dosa' && !!held?.held;
        if (nativeDosa) {
            const ratio = Math.min(devicePixelRatio || 1, 3);
            void this.carriedDosaCursor.prepare(Math.max(1, Math.round(this.displayWidth * ratio * this.renderScale)), Math.max(1, Math.round(this.displayHeight * ratio * this.renderScale)), this.displayWidth, this.displayHeight, held.pose);
        }
        this.carriedDosaCursor.show(nativeDosa);
        const nativePlate = this.presentation.retainScene && this.pointerType === 'mouse' && s.screen === 'playing' && !s.tutorial.visible && s.pointer.mode === 'plate';
        if (nativePlate)
            this.preparePlateCursor(s);
        this.carriedPlateCursor.show(nativePlate);
        if (this.carriedPlateCursor.active) {
            // The retained image is independent of the cursor position, but the source
            // plate hit target must follow its live coordinates on every callback.
            const hit = this.hits.find(h => h.command.type === 'click-plate');
            if (hit)
                hit.matrix = { ...hit.matrix, tx: s.platePosition.x, ty: s.platePosition.y };
        }
        const key = this.unchangedFrameKey(s);
        if (key && key === this.frameKey && this.frameVector === this.assets.vector) {
            this.lastDrawPainted = false;
            this.frameCounts.reused++;
            return;
        }
        this.lastDrawPainted = true;
        this.frameCounts.painted++;
        this.frameKey = '';
        this.foodCursor = '';
        this.currentTimeMs = s.timeMs;
        if (this.radioEnabled !== s.audio.enabled) {
            this.radioEnabled = s.audio.enabled;
            this.radioStartedMs = s.timeMs;
        }
        const c = this.ctx;
        const ratio = Math.min(devicePixelRatio || 1, 3);
        const width = Math.max(1, Math.round(this.displayWidth * ratio * this.renderScale)), height = Math.max(1, Math.round(this.displayHeight * ratio * this.renderScale));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.assets.vector?.setViewport(width, height);
        c.setTransform(width / 550, 0, 0, height / 400, 0, 0);
        c.clearRect(0, 0, 550, 400);
        c.fillStyle = '#fff';
        c.fillRect(0, 0, 550, 400);
        this.hits.length = 0;
        const frame = screenFrame[s.screen];
        const scene = this.assets.scenes.find(v => v.frame === frame);
        this.drawRetainedScene(s, scene?.instances ?? []);
        if (s.screen === 'menu')
            this.closeMenuEdge(width, height);
        if (s.screen === 'day-result')
            this.closeDayEdges(width, height);
        if (s.screen === 'playing')
            this.food(s);
        if (s.tutorial.visible) {
            // Native hit target for the original tutorial's Skip control.
            this.hits.length = 0;
            this.hits.push({ label: 'Skip tutorial', command: { type: 'skip-tutorial' }, id: 242, matrix: (0, assets_js_1.identity)(515.3, 152), pixel: true, frame: 4 });
        }
        this.feedback = this.feedback.filter(v => s.timeMs - v.time < (v.table === null ? 29 : 16) / 12 * 1000);
        for (const f of this.feedback) {
            const pos = f.table === null ? { tx: f.x, ty: f.y } : this.assets.placement(`bill${f.table}`)?.matrix || (0, assets_js_1.identity)(275, 150);
            const animationFrame = Math.floor((s.timeMs - f.time) * 12 / 1000) + 1;
            if (f.table === null)
                this.assets.draw(c, 437, (0, assets_js_1.identity)(pos.tx, pos.ty), animationFrame);
            else {
                const p = this.assets.vector?.placements(431, animationFrame).find(p => p.id === 429);
                if (p) {
                    const [a, b, cc, d, tx, ty] = p.matrix;
                    c.save();
                    c.globalAlpha = Number(p.colorTransform?.alphaMultTerm ?? 256) / 256;
                    this.sourceText(429, combine((0, assets_js_1.identity)(pos.tx, pos.ty), { a, b, c: cc, d, tx, ty }), `Rs.${f.amount}/-`);
                    c.restore();
                }
            }
        }
        this.frameKey = key;
        this.frameVector = this.assets.vector;
    }
    unchangedFrameKey(s) {
        if (!this.presentation.retainScene || this.diagnosticFullFrameRedraw || this.diagnosticFullSceneRedraw || this.diagnosticOmissions.size || !['playing', 'day-result', 'game-over'].includes(s.screen) || s.tutorial.visible)
            return '';
        // A blank pointer affects the canvas only when its food or button hover target changes.
        // Held batter, food and plate positions keep their continuous input coordinates.
        let pointer = s.pointer;
        if (s.screen !== 'playing' || s.pointer.mode === 'blank' || this.batterCursor.active || this.carriedDosaCursor.active || this.carriedPlateCursor.active) {
            const hovered = s.screen === 'playing' ? s.food.find(d => {
                const p = d && this.assets.placement(`dosaHolder${d.slot}`);
                return d && !d.held && p && this.assets.contains(324, p.matrix, s.pointer.x, s.pointer.y);
            }) : undefined;
            const buttons = this.assets.scenes.find(v => v.frame === screenFrame[s.screen])?.instances.filter(p => this.assets.symbols.get(p.symbolId)?.kind === 'button') ?? [];
            pointer = { mode: s.pointer.mode, hovered: hovered?.slot ?? null, buttons: buttons.map(p => this.assets.contains(p.symbolId, p.matrix, s.pointer.x, s.pointer.y, true, 4)) };
        }
        return JSON.stringify([this.displayWidth, this.displayHeight, devicePixelRatio, this.renderScale, this.pressedCommand, this.scoreFormVisible,
            Math.floor((s.timeMs - this.sceneStartedMs) * 12 / 1000), Math.floor((s.timeMs - this.radioStartedMs) * 12 / 1000),
            { ...s, timeMs: undefined, pointer, food: this.carriedDosaCursor.active ? s.food.map(d => d?.held ? { ...d, smokePose: undefined } : d) : s.food,
                ...(this.carriedPlateCursor.active ? { platePosition: null, counterPosition: null, plate: s.plate.map(d => ({ ...d, x: Math.round((d.x - s.platePosition.x) * 1000) / 1000, y: Math.round((d.y - s.platePosition.y) * 1000) / 1000, smokePose: undefined })) } : {}) }, this.feedback.map(f => ({ ...f, time: Math.floor((s.timeMs - f.time) * 12 / 1000) }))], (name, value) => name === 'elapsedMs' ? undefined : name === 'phaseElapsedMs' ? Math.floor(Number(value) * 12 / 1000) : value);
    }
    drawRetainedScene(s, placements) {
        const width = this.canvas.width, height = this.canvas.height;
        if (!this.presentation.retainScene || this.diagnosticFullSceneRedraw || this.diagnosticOmissions.size || s.screen !== 'playing' || s.tutorial.visible || width * height * 4 > 32 * 1024 * 1024) {
            this.clearSceneCache();
            this.drawScene(s, placements);
            return;
        }
        let hover = '';
        for (const p of placements)
            if (p.name === 'btnMute' || p.name === 'btnUnMute')
                hover += this.assets.contains(p.symbolId, p.matrix, s.pointer.x, s.pointer.y, true, 4) ? '1' : '0';
        const customers = s.customers.map(c => [c.id, c.table, c.visible, c.characterVisible, c.characterPose, c.exitVisible, c.exitPose, c.orderVisible, c.orderRemaining, c.patience, Math.floor(c.phaseElapsedMs * 12 / 1000), c.angry, c.angry ? Math.floor((s.timeMs - (c.angrySinceMs ?? s.timeMs)) * 12 / 1000) : 0]);
        const key = JSON.stringify([Math.floor((s.timeMs - this.sceneStartedMs) * 12 / 1000), Math.floor((s.timeMs - this.radioStartedMs) * 12 / 1000), s.cash, s.lostCustomers, s.day, s.clockMinutes, customers, s.audio.enabled, hover, this.pressedCommand]);
        if (!this.sceneSurface || this.sceneSurface.width !== width || this.sceneSurface.height !== height || this.sceneVector !== this.assets.vector) {
            this.clearSceneCache();
            this.sceneSurface = document.createElement('canvas');
            this.sceneSurface.width = width;
            this.sceneSurface.height = height;
            this.sceneVector = this.assets.vector;
        }
        const surface = this.sceneSurface, stage = this.ctx;
        if (key !== this.sceneKey) {
            const c = surface.getContext('2d', { alpha: false });
            c.setTransform(width / 550, 0, 0, height / 400, 0, 0);
            c.clearRect(0, 0, 550, 400);
            c.fillStyle = '#fff';
            c.fillRect(0, 0, 550, 400);
            this.ctx = c;
            try {
                this.drawScene(s, placements);
            }
            finally {
                this.ctx = stage;
            }
            this.sceneHits = this.hits.slice();
            this.sceneKey = key;
        }
        else
            this.hits.push(...this.sceneHits);
        stage.save();
        stage.setTransform(1, 0, 0, 1, 0, 0);
        stage.drawImage(surface, 0, 0);
        stage.restore();
    }
    drawScene(s, placements) {
        const c = this.ctx, frame = screenFrame[s.screen];
        const dynamic = { cashCollected: s.cash, txtCustomersLost: s.lostCustomers, txtDayNumber: s.day };
        for (const p of placements) {
            const name = p.name || '';
            const group = p.symbolId === 193 ? 'background' : p.symbolId === 224 ? 'griddle-steam' : trafficIds.has(p.symbolId) ? 'traffic' : /^customer\d$/.test(name) ? 'customers' : name === 'mcRadio' ? 'radio' : 'other';
            if (group !== 'griddle-steam' && this.diagnosticOmissions.has(group))
                continue;
            const at = this.onRenderCost ? performance.now() : 0;
            try {
                if (name === 'btnMute' && !s.audio.enabled || name === 'btnUnMute' && s.audio.enabled)
                    continue;
                if (name === 'mcInstruction') {
                    if (s.tutorial.visible)
                        this.assets.vector.drawPlacement(c, p.symbolId, p.matrix, Math.round(s.tutorial.elapsedMs * 12 / 1000) + 1, { persistentFrame: Math.round(s.tutorial.childElapsedMs * 12 / 1000) + 1 });
                    continue;
                }
                if (s.screen === 'game-over' && name === 'mcHighscorelist')
                    continue;
                if (s.screen === 'game-over' && name === 'mcSubmitExternal') {
                    if (this.scoreFormVisible)
                        for (const part of this.assets.vector.placements(579)) {
                            if (part.id === 572 || part.id === 38)
                                continue;
                            const [a, b, cc, d, tx, ty] = part.matrix;
                            const m = combine(p.matrix, { a, b, c: cc, d, tx, ty });
                            if (part.id === 578)
                                this.sourceText(578, m, String(s.cash));
                            else
                                this.assets.vector.drawPlacement(c, part.id, m, 1, part);
                        }
                    continue;
                }
                if (s.screen === 'playing') {
                    if (/^customer\d$/.test(name)) {
                        const customer = s.customers[Number(name.slice(-1))];
                        if (customer)
                            this.customer(customer, s, p);
                        continue;
                    }
                    if (/^dosaHolder\d+$/.test(name)) {
                        this.hits.push({ label: `Griddle spot ${Number(name.slice(10)) + 1}`, command: { type: 'click-slot', slot: Number(name.slice(10)) }, id: p.symbolId, matrix: p.matrix });
                        continue;
                    }
                    if (/^bill\d$/.test(name) || ['mcDosa', 'mcLost', 'mcText', 'txtDebug', 'txtTime', 'txtDosaCount'].includes(name))
                        continue;
                    if (name === 'mcPlate')
                        continue;
                    if (name === 'mcClock') {
                        this.clock(p, s.clockMinutes);
                        continue;
                    }
                    if (name in dynamic) {
                        this.sourceText(p.symbolId, p.matrix, String(dynamic[name]));
                        continue;
                    }
                }
                if (s.screen === 'game-over' && name === 'txtTotalCollection' || s.screen === 'day-result' && name === 'txtNetCollection') {
                    this.sourceText(p.symbolId, p.matrix, String(s.cash) + '/-');
                    continue;
                }
                const button = buttonCommands[name];
                const isButton = this.assets.symbols.get(p.symbolId)?.kind === 'button';
                const hover = isButton && this.assets.contains(p.symbolId, p.matrix, s.pointer.x, s.pointer.y, true, 4);
                const interpolate = this.presentation.interpolateDecorations && continuousDecorations.has(p.symbolId) && !(this.presentation.retainScene && s.screen === 'playing');
                const clock = (s.timeMs - (name === 'mcRadio' ? this.radioStartedMs : this.sceneStartedMs)) * 12 / 1000;
                const visualFrame = isButton ? hover ? this.pressedCommand === JSON.stringify(button?.[1]) ? 3 : 2 : 1 : name === 'mcRadio' && !s.audio.enabled ? 1 : (interpolate ? clock : Math.floor(clock)) + 1;
                const sourcePlacement = this.composition(-1000 - frame).get(p.depth);
                if (!sourcePlacement?.clipDepth)
                    this.assets.vector.drawPlacement(c, p.symbolId, p.matrix, visualFrame, { ...sourcePlacement, interpolate });
                if (button && (!name.includes('Mute') || s.screen === 'menu' || s.screen === 'playing'))
                    this.hits.push({ label: button[0], command: button[1], id: p.symbolId, matrix: p.matrix, pixel: true, frame: 4 });
            }
            finally {
                this.onRenderCost?.(group, performance.now() - at);
            }
        }
    }
    closeMenuEdge(width, height) {
        // Source mask 110 ends at x=272+277.15=549.15 on a 550-wide stage.
        // Extend the last fully covered column across that subpixel seam only.
        const edge = Math.max(1, Math.floor(width * 549 / 550));
        const c = this.ctx;
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.imageSmoothingEnabled = false;
        c.drawImage(this.canvas, edge - 1, 0, 1, height, edge, 0, width - edge, height);
        c.restore();
    }
    closeDayEdges(width, height) {
        // Source mask580, translated by (142.9,156), covers only
        // x=1.15..548.75 and y=1..399.6 of the 550x400 stage.
        // The sky shape581 also ends at x=548.25 below its top section.
        // Sample inside both boundaries, excluding their antialiased pixels.
        // Leave source geometry, interior pixels and input coordinates untouched.
        const left = Math.min(width - 1, Math.ceil(width * 2 / 550));
        const right = Math.max(left, Math.floor(width * 547 / 550) - 1);
        const top = Math.min(height - 1, Math.ceil(height * 2 / 400));
        const bottom = Math.max(top, Math.floor(height * 398 / 400) - 1);
        const c = this.ctx;
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.imageSmoothingEnabled = false;
        c.drawImage(this.canvas, left, 0, 1, height, 0, 0, left, height);
        c.drawImage(this.canvas, right, 0, 1, height, right + 1, 0, width - right - 1, height);
        c.drawImage(this.canvas, 0, top, width, 1, 0, 0, width, top);
        c.drawImage(this.canvas, 0, bottom, width, 1, 0, bottom + 1, width, height - bottom - 1);
        c.restore();
    }
    dosa(dosa, matrix) {
        if (dosa.smokePose === null) {
            if (this.diagnosticOmissions.has('food'))
                return;
            const at = this.onRenderCost ? performance.now() : 0;
            this.assets.draw(this.ctx, 472, matrix, dosa.pose);
            this.onRenderCost?.('food', performance.now() - at);
            return;
        }
        // Cooked frames310–484 have no masks. Their only nested animation is smoke223;
        // stopping/duplicating the food timeline does not stop that child.
        for (const part of this.assets.vector.placements(472, dosa.pose)) {
            const [a, b, c, d, tx, ty] = part.matrix;
            const group = part.id === 223 && part.depth === 9 ? 'dosa-steam' : 'food';
            if (this.diagnosticOmissions.has(group))
                continue;
            const at = this.onRenderCost ? performance.now() : 0;
            const frame = part.id === 223 && part.depth === 9 ? dosa.smokePose : Math.max(1, dosa.pose - part.born + 1);
            this.assets.vector.drawPlacement(this.ctx, part.id, combine(matrix, { a, b, c, d, tx, ty }), frame, part, 1, true, (part.ratio ?? 0) / 65535);
            this.onRenderCost?.(group, performance.now() - at);
        }
    }
    preparePlateCursor(s) {
        const art = this.assets.vector, plate = this.assets.placement('mcPlate'), template = this.assets.placement('mcDosa');
        const plateBounds = art?.frameBounds(230);
        if (!art || !plate || !template || !plateBounds)
            return;
        const matrix = { ...plate.matrix, tx: 0, ty: 0 };
        let bounds = (0, vector_js_1.transformedBounds)(plateBounds, [matrix.a, matrix.b, matrix.c, matrix.d, 0, 0]);
        const food = s.plate.map(d => ({ pose: d.pose, matrix: { ...template.matrix, tx: Math.round((d.x - s.platePosition.x) * 1000) / 1000, ty: Math.round((d.y - s.platePosition.y) * 1000) / 1000 } }));
        for (const d of food) {
            const b = art.frameBounds(472, d.pose);
            if (!b)
                continue;
            const m = d.matrix, t = (0, vector_js_1.transformedBounds)(b, [m.a, m.b, m.c, m.d, m.tx, m.ty]);
            const x = Math.min(bounds.x, t.x), y = Math.min(bounds.y, t.y);
            bounds = { x, y, width: Math.max(bounds.x + bounds.width, t.x + t.width) - x, height: Math.max(bounds.y + bounds.height, t.y + t.height) - y };
        }
        const ratio = Math.min(devicePixelRatio || 1, 3), width = Math.max(1, Math.round(this.displayWidth * ratio * this.renderScale)), height = Math.max(1, Math.round(this.displayHeight * ratio * this.renderScale));
        void this.carriedPlateCursor.prepareDrawing(width, height, this.displayWidth, this.displayHeight, JSON.stringify(food), bounds, (0, assets_js_1.identity)(), ctx => {
            art.draw(ctx, 230, matrix);
            for (const d of food)
                art.draw(ctx, 472, d.matrix, d.pose);
        });
    }
    food(s) {
        const c = this.ctx;
        const template = this.assets.placement('mcDosa');
        if (!template)
            return;
        const hovered = s.food.find(dosa => {
            const holder = dosa && this.assets.placement(`dosaHolder${dosa.slot}`);
            return dosa && !dosa.held && holder && this.assets.contains(324, holder.matrix, s.pointer.x, s.pointer.y);
        }) ?? null;
        // Re-evaluate readiness even when the pointer stays still. Source click windows
        // are discrete and cannot be inferred from a stale hover-entry label.
        if (hovered && s.pointer.mode !== 'batter' && s.pointer.mode !== 'dosa') {
            if (hovered.phase === 'first-side' && hovered.pose >= 71 && hovered.pose < 160)
                this.foodCursor = 'flip';
            else if (hovered.phase === 'second-side' && hovered.pose >= 327 && hovered.pose < 430)
                this.foodCursor = 'pickup';
        }
        if ((hovered?.slot ?? null) !== this.hoveredFood) {
            this.hoveredFood = hovered?.slot ?? null;
            this.flipHint = Boolean(hovered && hovered.pose >= 71 && hovered.pose <= 159);
        }
        for (const dosa of s.food) {
            if (!dosa)
                continue;
            // Extra's compact native preview holds the picked pose, including steam.
            // The core's independent smoke clock continues for placement/fallback.
            if (dosa.held && this.carriedDosaCursor.active)
                continue;
            const holder = this.assets.placement(`dosaHolder${dosa.slot}`);
            if (!holder)
                continue;
            const m = { ...template.matrix, tx: dosa.held ? s.pointer.x : holder.matrix.tx, ty: dosa.held ? s.pointer.y : holder.matrix.ty };
            this.dosa(dosa, m);
            if (!dosa.held && this.flipHint && this.hoveredFood === dosa.slot) {
                this.assets.draw(c, 428, (0, assets_js_1.identity)(holder.matrix.tx + 25, holder.matrix.ty));
            }
        }
        const plate = this.assets.placement('mcPlate');
        if (!plate)
            return;
        const m = { ...plate.matrix, tx: s.platePosition.x, ty: s.platePosition.y };
        if (!this.carriedPlateCursor.active) {
            this.assets.draw(c, 230, m);
            s.plate.forEach(dosa => this.dosa(dosa, { ...template.matrix, tx: dosa.x, ty: dosa.y }));
        }
        this.sourceText(424, this.carriedPlateCursor.active ? (0, assets_js_1.identity)(-.65, 303.8) : (0, assets_js_1.identity)(s.counterPosition.x, s.counterPosition.y), String(s.plate.length));
        this.hits.push({ label: 'Plate', command: { type: 'click-plate' }, id: 230, matrix: m });
        const batter = this.assets.placement('mcMavu');
        if (batter)
            this.hits.push({ label: 'Batter bowl', command: { type: 'pick-batter' }, id: 226, matrix: batter.matrix });
        if (s.pointer.mode === 'batter' && s.batterTemplate.available && !this.diagnosticBatterOverlay && !this.batterCursor.active) {
            this.assets.draw(c, 472, { ...template.matrix, tx: s.pointer.x, ty: s.pointer.y }, 1);
        }
    }
    hit(x, y) {
        for (let i = this.hits.length - 1; i >= 0; i--) {
            const target = this.hits[i];
            if (this.assets.contains(target.id, target.matrix, x, y, target.pixel, target.frame))
                return target.command;
        }
        return { type: 'background' };
    }
}
exports.Renderer = Renderer;

},{"./assets.js":"src/render/assets.js","./vector.js":"src/render/vector.js","./resources.js":"src/render/resources.js","../presentation-profile.js":"src/presentation-profile.js","./carry-cursor.js":"src/render/carry-cursor.js"}],
"src/presentation-profile.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentationChoice = presentationChoice;
exports.resolvePresentation = resolvePresentation;
exports.loadPresentationChoice = loadPresentationChoice;
exports.savePresentationChoice = savePresentationChoice;
const profiles = Object.freeze({
    current: Object.freeze({ choice: null, enhancements: true, simplerEffects: false, interpolateDecorations: true, retainScene: false }),
    classic: Object.freeze({ choice: 'classic', enhancements: false, simplerEffects: false, interpolateDecorations: false, retainScene: false }),
    extra: Object.freeze({ choice: 'extra', enhancements: true, simplerEffects: true, interpolateDecorations: true, retainScene: true }),
});
function presentationChoice(value) {
    return value === 'classic' || value === 'extra' ? value : null;
}
/** No default has been selected: an absent preference retains the existing release. */
function resolvePresentation(choice) {
    return profiles[choice ?? 'current'];
}
function loadPresentationChoice(storage) {
    try {
        return presentationChoice(storage?.getItem('madrasi-presentation'));
    }
    catch {
        return null;
    }
}
function savePresentationChoice(storage, choice) {
    try {
        storage?.setItem('madrasi-presentation', choice);
    }
    catch { /* Explicit selection still works in memory. */ }
}

},{}],
"src/render/carry-cursor.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarryCursor = void 0;
exports.cursorGeometry = cursorGeometry;
const owners = new WeakMap();
/** Logical cursor dimensions stay independent of the cached pixel density. */
function cursorGeometry(b, m, width, height, cssWidth, cssHeight) {
    const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
    const xs = corners.map(([x, y]) => m.a * x + m.c * y), ys = corners.map(([x, y]) => m.b * x + m.d * y);
    const sx = width / 550, sy = height / 400, left = Math.floor(Math.min(...xs) * sx) - 2, top = Math.floor(Math.min(...ys) * sy) - 2;
    const pixelsWide = Math.ceil(Math.max(...xs) * sx) - left + 2, pixelsHigh = Math.ceil(Math.max(...ys) * sy) - top + 2;
    const naturalWidth = pixelsWide * cssWidth / width, naturalHeight = pixelsHigh * cssHeight / height;
    // Extra uses a compact carry cursor. Large authored hand artwork exceeds the
    // browser's native cursor limit at full-window game sizes.
    const shrink = Math.min(1, 64 / naturalWidth, 64 / naturalHeight), cssWide = naturalWidth * shrink, cssHigh = naturalHeight * shrink;
    return { left, top, pixelsWide, pixelsHigh, cssWide, cssHigh, sx, sy,
        hotspotX: Math.round(-left * cssWidth / width * shrink), hotspotY: Math.round(-top * cssHeight / height * shrink), density: width / cssWidth / shrink,
        supported: Number.isFinite(shrink) && shrink > 0 && pixelsWide * pixelsHigh * 4 <= 4 * 1024 * 1024 && left <= 0 && top <= 0 && -left < pixelsWide && -top < pixelsHigh };
}
/** Extra's compact carried artwork follows the native mouse cursor instead of repainting
 * the restaurant. Touch and unsupported browsers keep Canvas drawing. */
class CarryCursor {
    canvas;
    assets;
    key = '';
    cursor = '';
    generation = 0;
    pending = Promise.resolve();
    enabled = false;
    encodedBytes = 0;
    blobUrl = '';
    get active() { return this.enabled; }
    get memoryBytes() { return this.encodedBytes; }
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.assets = assets;
    }
    reset() {
        this.show(false);
        if (this.blobUrl)
            URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = '';
        this.generation++;
        this.key = '';
        this.cursor = '';
        this.encodedBytes = 0;
    }
    show(requested) {
        const enabled = requested && Boolean(this.cursor);
        if (enabled !== this.enabled) {
            if (enabled) {
                this.canvas.style.cursor = this.cursor;
                owners.set(this.canvas, this);
            }
            else if (owners.get(this.canvas) === this) {
                this.canvas.style.cursor = '';
                owners.delete(this.canvas);
            }
            this.enabled = enabled;
        }
        return enabled;
    }
    prepare(width, height, cssWidth, cssHeight, pose = 1) {
        const art = this.assets.vector, template = this.assets.placement('mcDosa'), bounds = art?.frameBounds(472, pose);
        if (!art || !template || !bounds)
            return Promise.resolve();
        return this.prepareDrawing(width, height, cssWidth, cssHeight, String(pose), bounds, template.matrix, ctx => art.draw(ctx, 472, { ...template.matrix, tx: 0, ty: 0 }, pose));
    }
    prepareDrawing(width, height, cssWidth, cssHeight, contentKey, bounds, matrix, draw) {
        const key = `${width}:${height}:${cssWidth}:${cssHeight}:${contentKey}`;
        if (key === this.key)
            return this.pending;
        this.reset();
        this.key = key;
        const generation = this.generation;
        this.pending = (async () => {
            if (typeof CSS === 'undefined')
                return;
            const g = cursorGeometry(bounds, matrix, width, height, cssWidth, cssHeight);
            if (!g.supported)
                return;
            const surface = document.createElement('canvas');
            surface.width = g.pixelsWide;
            surface.height = g.pixelsHigh;
            let blob = null;
            try {
                const ctx = surface.getContext('2d');
                ctx.setTransform(g.sx, 0, 0, g.sy, -g.left, -g.top);
                draw(ctx);
                // PNG encoding can be costly at pickup. Keep the Canvas fallback live
                // while the browser encodes asynchronously, then decode before swapping.
                blob = await new Promise(resolve => surface.toBlob(resolve));
            }
            finally {
                surface.width = surface.height = 0;
            }
            if (!blob || generation !== this.generation)
                return;
            const url = URL.createObjectURL(blob);
            let retained = false;
            try {
                const cursor = `image-set(url("${url}") ${g.density}x) ${g.hotspotX} ${g.hotspotY}, auto`;
                if (!CSS.supports('cursor', cursor))
                    return;
                const image = new Image();
                image.src = url;
                await image.decode();
                if (generation === this.generation) {
                    this.cursor = cursor;
                    this.blobUrl = url;
                    this.encodedBytes = blob.size + cursor.length * 2;
                    retained = true;
                }
            }
            finally {
                if (!retained)
                    URL.revokeObjectURL(url);
            }
        })().catch(() => { });
        return this.pending;
    }
}
exports.CarryCursor = CarryCursor;

},{}],
"src/audio/audio.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameAudio = void 0;
const resources_js_1 = require("../render/resources.js");
/** Native sample-buffer playback with finite loops and cancellation generations. */
class GameAudio {
    assets;
    onAvailability;
    decodedBytes = 0;
    get memoryBytes() { return this.decodedBytes; }
    get activeSources() { return this.active.size; }
    get playbackState() { return this.context?.state ?? 'not-started'; }
    async diagnosticSuspend(suspended) {
        if (this.context) {
            if (suspended)
                await this.context.suspend();
            else
                await this.context.resume();
        }
    }
    async dispose() {
        this.handle([{ type: 'stop-sounds' }]);
        const context = this.context;
        this.context = null;
        this.buffers.clear();
        this.decodedBytes = 0;
        if (context) {
            context.onstatechange = null;
            await context.close();
        }
    }
    context = null;
    active = new Map();
    buffers = new Map();
    pending = [];
    generation = 0;
    musicGeneration = 0;
    missing = new Set();
    constructor(assets, onAvailability = () => undefined) {
        this.assets = assets;
        this.onAvailability = onAvailability;
    }
    activate() {
        if (!this.context) {
            this.context = new AudioContext();
            this.context.onstatechange = () => this.onAvailability(this.context?.state === 'running');
        }
        this.onAvailability(this.context.state === 'running');
        if (this.context.state !== 'running')
            void this.context.resume().then(() => this.onAvailability(this.context?.state === 'running')).catch(() => this.onAvailability(false));
        const events = this.pending;
        this.pending = [];
        this.handle(events);
    }
    handle(events) {
        for (const event of events) {
            if (event.type === 'stop-sounds' || event.type === 'stop-music') {
                const all = event.type === 'stop-sounds';
                if (all)
                    this.generation++;
                this.musicGeneration++;
                for (const [source, music] of this.active)
                    if (all || music) {
                        source.stop();
                        this.active.delete(source);
                    }
                this.pending = all ? [] : this.pending.filter(e => e.type !== 'sound' || !e.name.startsWith('bgMusic'));
            }
            else if (event.type === 'sound') {
                if (!this.context) {
                    this.pending.push(event);
                    continue;
                }
                const resource = this.assets.names.get(event.name);
                const url = resource?.preview?.type === 'audio' ? resource.preview.url : undefined;
                if (!url) {
                    this.missing.add(event.name);
                    continue;
                }
                const ctx = this.context, generation = this.generation, musicGeneration = this.musicGeneration;
                const music = event.name.startsWith('bgMusic');
                let buffer = this.buffers.get(url);
                if (!buffer) {
                    buffer = fetch((0, resources_js_1.resourceUrl)(url)).then(r => {
                        if (!r.ok)
                            throw new Error('Audio load failed');
                        return r.arrayBuffer();
                    }).then(data => ctx.decodeAudioData(data)).then(decoded => {
                        if (this.context === ctx)
                            this.decodedBytes += decoded.length * decoded.numberOfChannels * 4;
                        return decoded;
                    });
                    this.buffers.set(url, buffer);
                }
                void buffer.then(decoded => {
                    if (generation !== this.generation || music && musicGeneration !== this.musicGeneration)
                        return;
                    const source = ctx.createBufferSource(), gain = ctx.createGain();
                    source.buffer = decoded;
                    gain.gain.value = (event.volume ?? 100) / 100;
                    const loops = Math.max(1, event.loop ?? 1);
                    source.loop = loops > 1;
                    source.connect(gain);
                    gain.connect(ctx.destination);
                    this.active.set(source, music);
                    source.onended = () => { this.active.delete(source); source.disconnect(); gain.disconnect(); };
                    source.start();
                    if (source.loop)
                        source.stop(ctx.currentTime + decoded.duration * loops);
                }).catch(() => { this.buffers.delete(url); this.missing.add(event.name); });
            }
        }
    }
}
exports.GameAudio = GameAudio;

},{"../render/resources.js":"src/render/resources.js"}],
"src/input/pointer.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectPointer = connectPointer;
function connectPointer(renderer, dispatch, activate) {
    const canvas = renderer.canvas;
    const point = (event) => {
        renderer.pointerType = event.pointerType || 'mouse';
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * 550 / rect.width, y: (event.clientY - rect.top) * 400 / rect.height };
    };
    let pressed = null;
    const ownsPointer = (event) => event.isPrimary !== false && (!pressed || pressed.pointerId === event.pointerId);
    const cancel = () => {
        const pointerId = pressed?.pointerId;
        pressed = null;
        renderer.pressedCommand = null;
        if (pointerId !== undefined && canvas.hasPointerCapture(pointerId))
            canvas.releasePointerCapture(pointerId);
        dispatch({ type: 'background' });
    };
    canvas.addEventListener('pointermove', event => {
        if (!ownsPointer(event))
            return;
        const p = point(event);
        dispatch({ type: 'move-pointer', ...p });
    });
    canvas.addEventListener('pointerdown', event => {
        if (event.button !== 0 || pressed || !ownsPointer(event))
            return;
        activate();
        const p = point(event);
        dispatch({ type: 'move-pointer', ...p });
        pressed = { pointerId: event.pointerId, target: JSON.stringify(renderer.hit(p.x, p.y)) };
        renderer.pressedCommand = pressed.target;
        canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerup', event => {
        if (!pressed || event.button !== 0 || pressed.pointerId !== event.pointerId)
            return;
        const original = pressed.target;
        pressed = null;
        renderer.pressedCommand = null;
        const p = point(event);
        dispatch({ type: 'move-pointer', ...p });
        const target = renderer.hit(p.x, p.y);
        if (p.x >= 0 && p.x <= 550 && p.y >= 0 && p.y <= 400 && JSON.stringify(target) === original)
            dispatch(target);
        if (canvas.hasPointerCapture(event.pointerId))
            canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointercancel', event => {
        if (ownsPointer(event))
            cancel();
    });
    canvas.addEventListener('lostpointercapture', event => {
        if (pressed?.pointerId === event.pointerId)
            cancel();
    });
    canvas.ownerDocument?.defaultView?.addEventListener('blur', () => {
        if (pressed)
            cancel();
    });
    canvas.addEventListener('keydown', event => {
        if (event.key === 'Escape')
            cancel();
    });
}

},{}],
"src/services/scores.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalScores = void 0;
/** Explicit local adapter. The legacy online service remains a separate unresolved integration. */
class LocalScores {
    key = 'madrasi-dhaba.scores.v1';
    async list() {
        try {
            const data = JSON.parse(localStorage.getItem(this.key) || '[]');
            if (!Array.isArray(data))
                return [];
            return data.filter((v) => typeof v?.name === 'string' && typeof v?.score === 'number' && Number.isFinite(v.score) && v.gameName === 'madrasidhaba').slice(0, 100);
        }
        catch {
            return [];
        }
    }
    async submit(score) {
        if (!score.name.trim() || !Number.isFinite(score.score))
            throw new Error('Enter your name.');
        const scores = [...await this.list(), { ...score, name: score.name.trim().slice(0, 50) }].sort((a, b) => b.score - a.score).slice(0, 100);
        localStorage.setItem(this.key, JSON.stringify(scores));
    }
}
exports.LocalScores = LocalScores;

},{}],
"src/ui/fullscreen.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectFullscreen = connectFullscreen;
/** Request actual browser fullscreen from a user gesture; retain a usable page if denied. */
function connectFullscreen(button, status) {
    const update = () => {
        const active = Boolean(document.fullscreenElement);
        const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', String(active));
    };
    button.addEventListener('click', () => {
        status.hidden = true;
        const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
        if (!request) {
            status.textContent = 'Fullscreen is unavailable here. Open this page in a browser that supports fullscreen.';
            status.hidden = false;
            return;
        }
        void request.catch(() => {
            status.textContent = 'This browser did not allow fullscreen. You can still resize its window.';
            status.hidden = false;
        });
    });
    document.addEventListener('fullscreenchange', update);
    update();
}

},{}],
"src/ui/performance-hud.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPerformanceHud = createPerformanceHud;
const CAPACITY = 256, UPDATE_MS = 1000, GAP_MS = 2000;
const duration = (value) => Number.isFinite(value) && value >= 0 ? value : 0;
const memoryText = (bytes) => bytes !== undefined && Number.isFinite(bytes) && bytes >= 0 ? `${(bytes / 1048576).toFixed(1)} MiB` : 'unavailable';
/** A local, opt-in display. The caller supplies nonoverlapping timed regions and byte accounting.
 * No frame arrays grow, no timers run, and disabled samples do not read clocks or touch the DOM.
 * Self-time covers completed synchronous sample calls; it excludes subsequent browser paint/GPU work.
 */
function createPerformanceHud(canvas, readMemory, readRenderer) {
    const doc = canvas.ownerDocument;
    const clock = doc.defaultView?.performance ?? performance;
    const element = doc.createElement('details');
    element.id = 'performance-hud';
    element.hidden = true;
    element.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:10;max-width:min(350px,calc(100vw - 16px));box-sizing:border-box;padding:6px 8px;border:1px solid #ffffff35;border-radius:5px;background:#101713ed;color:#eff8ee;font:11px/1.4 ui-monospace,Consolas,monospace;';
    const summary = doc.createElement('summary');
    summary.style.cssText = 'cursor:pointer;white-space:nowrap;';
    summary.textContent = 'rAF/s — · 0 callbacks';
    summary.title = 'Animation callbacks since enabled, not monitor scanout. Expand for Canvas paints, timings and memory.';
    const detail = doc.createElement('div');
    detail.style.cssText = 'padding-top:6px;white-space:normal;overflow-wrap:anywhere;';
    const frame = doc.createElement('div'), cpu = doc.createElement('div'), timings = doc.createElement('div');
    const overhead = doc.createElement('div'), heap = doc.createElement('div'), managed = doc.createElement('div');
    const renderer = doc.createElement('div'), reset = doc.createElement('div'), limits = doc.createElement('div'), paints = doc.createElement('div');
    limits.textContent = 'Timed work ÷ elapsed: estimate for one main-thread core, not total CPU. Excludes browser/GPU/audio-worker work. Memory is accounting, not process RAM or VRAM.';
    limits.style.cssText = 'margin-top:5px;opacity:.75;';
    detail.append(frame, paints, cpu, timings, overhead, heap, managed, renderer, reset, limits);
    element.append(summary, detail);
    doc.body.append(element);
    const intervals = new Float64Array(CAPACITY), sorted = new Float64Array(CAPACITY);
    let active = false, totalFrames = 0, count = 0, cursor = 0, windowFrames = 0;
    let totalPaints = 0, windowPaints = 0;
    let start = Number.NaN, previous = Number.NaN, lastUpdate = Number.NaN;
    let simulation = 0, rendering = 0, audio = 0, snapshots = 0;
    let selfMs = 0, selfCount = 0, note = '';
    const write = (target, text) => {
        if (target.textContent !== text)
            target.textContent = text;
    };
    const resetWindow = (now) => {
        start = now;
        count = cursor = windowFrames = windowPaints = 0;
        simulation = rendering = audio = snapshots = 0;
    };
    const publish = (now) => {
        const elapsed = Math.max(0, now - start);
        const fps = elapsed > 0 && windowFrames > 0 ? (windowFrames * 1000 / elapsed).toFixed(1) : '—';
        write(summary, `${fps} rAF/s · ${totalFrames} callbacks`);
        if (element.open) {
            // Fixed scratch storage, sorted only at the display refresh, never per sample.
            sorted.fill(Infinity);
            for (let index = 0; index < count; index++)
                sorted[index] = intervals[index];
            sorted.sort();
            const p95 = count ? `${sorted[Math.ceil(count * .95) - 1].toFixed(1)} ms` : '—';
            write(frame, `Window ${(elapsed / 1000).toFixed(2)} s / ${windowFrames} frames · p95 ${p95} (latest ${count}, up to 256)`);
            write(paints, `Canvas paints: ${totalPaints} · reused: ${totalFrames - totalPaints} · ${elapsed > 0 ? (windowPaints * 1000 / elapsed).toFixed(1) : '—'} paints/s. Callbacks and paints are not unique animation poses or monitor scanout.`);
            const measured = simulation + rendering + audio + snapshots;
            write(cpu, `Measured main-thread work: ${elapsed > 0 && windowFrames ? (measured / elapsed * 100).toFixed(1) + '%' : '—'} of one core (estimate)`);
            const average = (ms) => windowFrames ? (ms / windowFrames).toFixed(2) : '—';
            write(timings, `ms/frame: simulation ${average(simulation)} · render ${average(rendering)} · audio ${average(audio)} · snapshot ${average(snapshots)}`);
            // The current call ends after this text is painted into the DOM. Its cost appears next refresh.
            const selfTotal = selfMs > 0 ? `${selfMs.toFixed(3)} ms` : 'below timer resolution';
            const selfAverage = selfCount && selfMs > 0 ? `${(selfMs / selfCount).toFixed(3)} ms/sample` : 'mean unavailable';
            write(overhead, `HUD self-work: ${selfTotal} / ${selfCount} completed samples (${selfAverage}). Timer-resolution estimate; excludes paint.`);
            try {
                const value = clock.memory;
                write(heap, value ? `JS heap: ${memoryText(value.usedJSHeapSize)} used / ${memoryText(value.totalJSHeapSize)} allocated (shared, approximate)` : 'JS heap: unavailable in this browser');
            }
            catch {
                write(heap, 'JS heap: unavailable in this browser');
            }
            try {
                const value = readMemory();
                write(managed, `Managed memory: tiles ${memoryText(value.tiles)} · pool ${memoryText(value.pool)} · scene ${memoryText(value.scene ?? 0)} · cursor data ${memoryText(value.cursor ?? 0)} · filter backing ${memoryText(value.filters)} · decoded audio ${memoryText(value.audio)}`);
            }
            catch {
                write(managed, 'Managed memory: unavailable');
            }
            try {
                write(renderer, `Renderer: ${readRenderer()}`);
            }
            catch {
                write(renderer, 'Renderer: unavailable');
            }
            write(reset, note || 'Frame count is since enabled. Expand/collapse changes display only.');
        }
        lastUpdate = now;
    };
    return {
        element,
        get enabled() { return active; },
        setEnabled(value) {
            if (active === value)
                return;
            active = value;
            element.hidden = !value;
            if (value) {
                totalFrames = totalPaints = 0;
                previous = lastUpdate = Number.NaN;
                resetWindow(Number.NaN);
                selfMs = selfCount = 0;
                note = '';
                write(summary, 'rAF/s — · 0 callbacks');
                for (const target of [frame, paints, cpu, timings, overhead, heap, managed, renderer, reset])
                    write(target, '');
            }
        },
        sample(value) {
            if (!active)
                return;
            const began = clock.now();
            try {
                if (!Number.isFinite(value.now) || !Number.isFinite(value.elapsedMs) || value.elapsedMs < 0)
                    return;
                totalFrames++;
                if (value.painted !== false)
                    totalPaints++;
                const backwards = Number.isFinite(previous) && value.now < previous;
                if (value.elapsedMs > GAP_MS || backwards) {
                    resetWindow(value.now);
                    note = backwards ? 'Sampling clock moved backwards; window reset.' : `Last gap ${(value.elapsedMs / 1000).toFixed(2)} s; window reset, catch-up sample excluded.`;
                    previous = value.now;
                    publish(value.now);
                    return;
                }
                if (!Number.isFinite(start)) {
                    start = value.now - value.elapsedMs;
                    lastUpdate = start;
                }
                previous = value.now;
                intervals[cursor] = value.elapsedMs;
                cursor = (cursor + 1) % CAPACITY;
                count = Math.min(CAPACITY, count + 1);
                windowFrames++;
                if (value.painted !== false)
                    windowPaints++;
                simulation += duration(value.simulationMs);
                rendering += duration(value.renderMs);
                audio += duration(value.audioMs);
                snapshots += duration(value.snapshotMs);
                if (value.now - lastUpdate >= UPDATE_MS) {
                    publish(value.now);
                    start = value.now;
                    windowFrames = windowPaints = 0;
                    simulation = rendering = audio = snapshots = 0;
                }
            }
            finally {
                selfMs += Math.max(0, clock.now() - began);
                selfCount++;
            }
        },
    };
}

},{}],
"src/ui/render-settings.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRenderSettings = loadRenderSettings;
exports.saveRenderSettings = saveRenderSettings;
function loadRenderSettings(storage, key = 'madrasi-display') {
    try {
        const saved = JSON.parse(storage?.getItem(key) ?? '{}');
        return { scale: typeof saved.scale === 'number' && Number.isFinite(saved.scale) ? Math.round(Math.min(1, Math.max(.25, saved.scale)) * 4) / 4 : 1, stats: saved.version === 2 && saved.stats === true };
    }
    catch {
        return { scale: 1, stats: false };
    }
}
function saveRenderSettings(storage, settings, key = 'madrasi-display') {
    try {
        storage?.setItem(key, JSON.stringify({ ...settings, version: 2 }));
    }
    catch { /* Display controls still work when storage is unavailable. */ }
}

},{}],
"src/render/profile.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProfiler = renderProfiler;
/** Opt-in visible diagnostics (?profile=1); no telemetry or persistent logging. */
function renderProfiler(canvas, art) {
    if (new URLSearchParams(location.search).get('profile') !== '1')
        return () => undefined;
    const output = document.createElement('output');
    output.id = 'render-profile';
    Object.assign(output.style, { position: 'fixed', bottom: '4px', left: '4px', zIndex: '5', padding: '8px', background: '#000d', color: '#caffcc', font: '12px monospace', pointerEvents: 'none' });
    document.body.append(output);
    let times = [], current = '', calls = 0, peak = 0;
    return (duration, screen) => {
        if (screen !== current) {
            times = [];
            calls = 0;
            peak = 0;
            current = screen;
        }
        peak = Math.max(peak, duration);
        calls++;
        if (calls > 30)
            times.push(duration);
        if (times.length > 600)
            times.shift();
        if (calls % 30 !== 0)
            return;
        const sorted = [...times].sort((a, b) => a - b);
        const q = (n) => (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * n))] ?? 0).toFixed(2);
        output.textContent = `${screen} · ${canvas.width}×${canvas.height} · ${times.length} samples · median ${q(.5)} ms · p95 ${q(.95)} ms · peak ${peak.toFixed(2)} ms · cache ${(art.stats.cachedBytes / 1048576).toFixed(1)} MiB`;
    };
}

},{}],
"src/services/legacy-scores.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacySessionRefresher = exports.LegacyScoreClient = exports.LegacyServiceError = exports.LEGACY_PATHS = exports.LEGACY_LINKS = exports.LEGACY_GAME_NAME = void 0;
exports.externalScoreRequest = externalScoreRequest;
exports.memberScoreRequest = memberScoreRequest;
exports.sessionRefreshRequest = sessionRefreshRequest;
const legacy_verification_js_1 = require("./legacy-verification.js");
exports.LEGACY_GAME_NAME = 'madrasidhaba';
exports.LEGACY_LINKS = Object.freeze({
    branding: 'http://www.gamezindia.com/',
    leaderboard: 'http://www.gamezindia.com/external/external_highscore.php?gamename=madrasidhaba',
});
exports.LEGACY_PATHS = Object.freeze({ external: '/external/submitscore_external.php', member: '/member/setscore.php', tournament: '/member/tournamentscore.php', session: '/member/sess_refresh.php' });
class LegacyServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'LegacyServiceError';
    }
}
exports.LegacyServiceError = LegacyServiceError;
function request(kind, fields) {
    return { kind, path: exports.LEGACY_PATHS[kind], fields, body: new URLSearchParams(fields).toString() };
}
/** Name is deliberately neither trimmed nor limited: source input572 defaults to noname
 * and defines no maxLength; sprite579 submits its text without a validation branch. */
function externalScoreRequest(score) {
    const playerName = score.name;
    const playerScore = String(score.score);
    const gameName = score.gameName ?? exports.LEGACY_GAME_NAME;
    return request('external', { playerName, playerScore, gameName, verify: (0, legacy_verification_js_1.legacyVerification)(`${playerScore}|${playerName}|${gameName}`) });
}
function memberScoreRequest(score) {
    const gameID = String(score.gameId), tourID = String(score.tourId), playerPoint = String(score.points), playerScore = String(score.score);
    return request(Number(score.tourId) !== 0 ? 'tournament' : 'member', { gameID, tourID, playerPoint, playerScore, verify: (0, legacy_verification_js_1.legacyVerification)(`${playerScore}|${playerPoint}|${gameID}`) });
}
function sessionRefreshRequest(gameId) { return request('session', { gameID: String(gameId) }); }
/** Only a deployment's explicit URLs are used for POSTs. Historical navigation URLs
 * are preserved separately; a configured transport is never mistaken for a working backend. */
class LegacyScoreClient {
    configuration;
    transport;
    leaderboardUrl;
    brandingUrl;
    constructor(configuration = {}, transport = fetch) {
        this.configuration = configuration;
        this.transport = transport;
        this.leaderboardUrl = configuration.leaderboardUrl ?? exports.LEGACY_LINKS.leaderboard;
        this.brandingUrl = configuration.brandingUrl ?? exports.LEGACY_LINKS.branding;
    }
    available(kind = 'external') { return Boolean(this.configuration.endpoints?.[kind]); }
    submitExternal(score, signal) { return this.send(externalScoreRequest(score), signal); }
    submitMember(score, signal) { return this.send(memberScoreRequest(score), signal); }
    refreshSession(gameId, signal) { return this.send(sessionRefreshRequest(gameId), signal); }
    async send(payload, signal) {
        const endpoint = this.configuration.endpoints?.[payload.kind];
        if (!endpoint)
            throw new LegacyServiceError('unavailable', 'Online scores are unavailable: no score service is configured.');
        if (signal?.aborted)
            throw new LegacyServiceError('cancelled', 'The score request was cancelled.');
        const controller = new AbortController();
        let timedOut = false;
        const cancel = () => controller.abort();
        signal?.addEventListener('abort', cancel, { once: true });
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.configuration.timeoutMs ?? 15000);
        try {
            const response = await this.transport(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.body, credentials: this.configuration.credentials ?? 'same-origin', signal: controller.signal });
            if (!response.ok)
                throw new LegacyServiceError('http', `The score service returned HTTP ${response.status}.`);
            const contentType = response.headers.get('content-type') ?? '';
            const text = await response.text();
            if (contentType.includes('text/html') || /^\s*</.test(text))
                throw new LegacyServiceError('response', 'The score service returned a page instead of a score response.');
            const fields = Object.fromEntries(new URLSearchParams(text));
            // The original merely traces postResult. No success code or leaderboard schema
            // exists in the SWF, so HTTP receipt must never be described as score acceptance.
            return { status: 'received', postResult: fields.postResult ?? null, fields };
        }
        catch (error) {
            if (error instanceof LegacyServiceError)
                throw error;
            if (timedOut)
                throw new LegacyServiceError('timeout', 'The score service did not respond in time. Submission status is unknown.');
            if (signal?.aborted)
                throw new LegacyServiceError('cancelled', 'The score request was cancelled. Submission status may be unknown.');
            throw new LegacyServiceError('network', 'The score service could not be reached. Submission status is unknown.');
        }
        finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
        }
    }
}
exports.LegacyScoreClient = LegacyScoreClient;
/** Source frame3 schedules 600000ms refreshes; frame7 also refreshes on next day.
 * The caller supplies time and the host's game ID; absence of either endpoint or
 * embedding context performs no network calls. It does not invent membership data. */
class LegacySessionRefresher {
    client;
    gameId;
    observe;
    elapsed = 0;
    constructor(client, gameId, observe = () => undefined) {
        this.client = client;
        this.gameId = gameId;
        this.observe = observe;
    }
    advance(milliseconds) {
        if (!Number.isFinite(milliseconds) || milliseconds < 0)
            throw new RangeError('Session elapsed time must be finite and nonnegative.');
        this.elapsed += milliseconds;
        while (this.elapsed >= 600000) {
            this.elapsed -= 600000;
            this.refresh();
        }
    }
    nextDay() { this.refresh(); }
    refresh() {
        if (this.gameId === undefined || !this.client.available('session'))
            return;
        void this.client.refreshSession(this.gameId).then(this.observe, error => this.observe(error instanceof LegacyServiceError ? error : new LegacyServiceError('network', 'Session refresh failed.')));
    }
}
exports.LegacySessionRefresher = LegacySessionRefresher;

},{"./legacy-verification.js":"src/services/legacy-verification.js"}],
"src/services/legacy-verification.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyVerification = legacyVerification;
/** Compatibility with __Packages/Rijndael.as, encrypt(src, key), as called by frame 6.
 * This public SWF constant is protocol data, not a user credential or a security secret.
 * AES-128 ECB, no IV, zero padding only for incomplete blocks, lowercase hexadecimal.
 * The source consumes UTF-16 code units (not UTF-8) and only the first 16 key characters.
 */
const PUBLIC_SWF_KEY = 'katUnzI$n0wcH@y03ot3c#N0$oluT10n$';
function multiply(x, y) {
    let result = 0;
    for (let bit = 1; bit < 256; bit *= 2) {
        if (x & bit)
            result ^= y;
        y <<= 1;
        if (y & 256)
            y ^= 0x11b;
    }
    return result;
}
// Generate the standard Rijndael S-box instead of retaining a second opaque table.
const sbox = Array.from({ length: 256 }, (_, byte) => {
    let inverse = byte === 0 ? 0 : 1;
    if (byte)
        for (let exponent = 0; exponent < 254; exponent++)
            inverse = multiply(inverse, byte);
    let result = inverse ^ 0x63;
    for (let shift = 1; shift <= 4; shift++)
        result ^= ((inverse << shift) | (inverse >>> (8 - shift))) & 255;
    return result;
});
function expandKey() {
    const result = Array.from({ length: 16 }, (_, index) => PUBLIC_SWF_KEY.charCodeAt(index));
    let rcon = 1;
    for (let offset = 16; offset < 176; offset += 4) {
        let word = result.slice(offset - 4, offset);
        if (offset % 16 === 0) {
            word = [sbox[word[1]], sbox[word[2]], sbox[word[3]], sbox[word[0]]];
            word[0] ^= rcon;
            rcon = multiply(rcon, 2);
        }
        for (let i = 0; i < 4; i++)
            result.push(result[offset - 16 + i] ^ word[i]);
    }
    return result;
}
const roundKeys = expandKey();
function encryptBlock(block) {
    const state = block.slice();
    const addKey = (round) => {
        for (let i = 0; i < 16; i++)
            state[i] ^= roundKeys[round * 16 + i];
    };
    addKey(0);
    for (let round = 1; round <= 10; round++) {
        // AS2 table lookup for a code unit >255 yields undefined; subsequent bitwise
        // operations coerce it to zero. Keep that quirk instead of silently UTF-8 encoding.
        const substituted = state.map(value => sbox[value] ?? 0);
        for (let row = 0; row < 4; row++)
            for (let column = 0; column < 4; column++)
                state[column * 4 + row] = substituted[((column + row) % 4) * 4 + row];
        if (round < 10) {
            for (let column = 0; column < 4; column++) {
                const offset = column * 4;
                const a = state.slice(offset, offset + 4);
                for (let row = 0; row < 4; row++)
                    state[offset + row] = multiply(a[row], 2) ^ multiply(a[(row + 1) % 4], 3) ^ a[(row + 2) % 4] ^ a[(row + 3) % 4];
            }
        }
        addKey(round);
    }
    return state;
}
function legacyVerification(plaintext) {
    const units = Array.from({ length: plaintext.length }, (_, index) => plaintext.charCodeAt(index));
    while (units.length % 16)
        units.push(0);
    let hex = '';
    for (let offset = 0; offset < units.length; offset += 16) {
        for (const byte of encryptBlock(units.slice(offset, offset + 16)))
            hex += byte.toString(16).padStart(2, '0');
    }
    return hex;
}

},{}],
"src/services/score-configuration.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readScoreConfiguration = readScoreConfiguration;
/** Deployment-owned JSON only: query strings and browser storage cannot select POST destinations. */
function readScoreConfiguration(text, baseUrl) {
    const source = JSON.parse(text || '{}');
    if (!source || typeof source !== 'object' || Array.isArray(source))
        throw new Error('Score configuration must be an object.');
    const data = source;
    const result = {};
    const url = (value) => {
        if (typeof value !== 'string' || !value.trim())
            throw new Error('Score service URLs must be nonempty strings.');
        const parsed = new URL(value, baseUrl);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
            throw new Error('Score service URLs must use HTTP or HTTPS without embedded credentials.');
        return parsed.href;
    };
    if (data.endpoints !== undefined) {
        if (!data.endpoints || typeof data.endpoints !== 'object' || Array.isArray(data.endpoints))
            throw new Error('Score endpoints must be an object.');
        result.endpoints = {};
        for (const kind of ['external', 'member', 'tournament', 'session']) {
            const value = data.endpoints[kind];
            if (value !== undefined)
                result.endpoints[kind] = url(value);
        }
    }
    if (data.brandingUrl !== undefined)
        result.brandingUrl = url(data.brandingUrl);
    if (data.leaderboardUrl !== undefined)
        result.leaderboardUrl = url(data.leaderboardUrl);
    if (data.gameId !== undefined) {
        if (typeof data.gameId !== 'string' && (typeof data.gameId !== 'number' || !Number.isFinite(data.gameId)))
            throw new Error('Host game ID must be a string or finite number.');
        result.gameId = data.gameId;
    }
    if (data.timeoutMs !== undefined) {
        if (typeof data.timeoutMs !== 'number' || !Number.isFinite(data.timeoutMs) || data.timeoutMs <= 0)
            throw new Error('Score timeout must be positive.');
        result.timeoutMs = data.timeoutMs;
    }
    if (data.credentials !== undefined) {
        if (!['omit', 'same-origin', 'include'].includes(String(data.credentials)))
            throw new Error('Invalid score credentials mode.');
        result.credentials = data.credentials;
    }
    return result;
}

},{}],
"src/ui/legacy-score-form.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectLegacyScoreForm = connectLegacyScoreForm;
const legacy_scores_js_1 = require("../services/legacy-scores.js");
/** Source-compatible external name/score submission with explicit modern error feedback.
 * The original hides the form immediately after sendAndLoad; it does not confirm success.
 * Failed/unknown submissions allow an explicit manual retry, never an automatic POST.
 */
function connectLegacyScoreForm(elements, client, changed = () => undefined) {
    const { form, input, submit, status } = elements;
    let phase = 'hidden';
    let score = 0;
    let generation = 0;
    let pending;
    const setPhase = (value, message = '') => {
        phase = value;
        form.hidden = value === 'hidden' || value === 'sending' || value === 'received';
        submit.disabled = value === 'sending' || value === 'unavailable' || value === 'received';
        status.textContent = message;
        changed(value);
    };
    const receivedMessage = (result) => result.postResult === null
        ? 'The score service responded without a result. Score acceptance is unconfirmed.'
        : `Score service response: ${result.postResult}`;
    const send = (event) => {
        event.preventDefault();
        if (!['ready', 'failed'].includes(phase))
            return;
        const requestGeneration = generation;
        const payload = { score, name: input.value };
        pending = new AbortController();
        setPhase('sending', 'Sending score…');
        void client.submitExternal(payload, pending.signal).then(result => {
            if (generation === requestGeneration)
                setPhase('received', receivedMessage(result));
        }).catch(error => {
            if (generation !== requestGeneration)
                return;
            const message = error instanceof legacy_scores_js_1.LegacyServiceError ? error.message : 'The score request failed. Submission status is unknown.';
            setPhase('failed', `${message} You can retry manually; an earlier request may already have reached the server.`);
        });
    };
    input.required = false;
    input.removeAttribute('maxlength');
    input.autocomplete = 'off';
    form.noValidate = true;
    submit.textContent = 'Submit';
    status.setAttribute('role', 'status');
    form.addEventListener('submit', send);
    setPhase('hidden');
    const hide = () => { generation++; pending?.abort(); pending = undefined; setPhase('hidden'); };
    return {
        show(value) {
            generation++;
            pending?.abort();
            pending = undefined;
            score = value;
            input.value = 'noname';
            setPhase(client.available() ? 'ready' : 'unavailable', client.available() ? '' : 'Online scores are unavailable: no score service is configured. Your score has not been sent.');
        },
        hide,
        state: () => phase,
        dispose() { hide(); form.removeEventListener('submit', send); },
    };
}

},{"../services/legacy-scores.js":"src/services/legacy-scores.js"}],
"src/ui/frame-batch.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFrameBatch = createFrameBatch;
/** Apply commands immediately in input order; publish one snapshot and draw per animation frame. */
function createFrameBatch(game, consume, timing) {
    let pending = [];
    return {
        dispatch(command) { pending.push(...game.dispatch(command)); },
        flush(elapsed) {
            const events = pending;
            pending = [];
            const measuring = timing?.enabled() ?? false, at = measuring ? performance.now() : 0;
            events.push(...game.advance(elapsed));
            const after = measuring ? performance.now() : 0, state = game.state;
            if (measuring)
                timing.record(after - at, performance.now() - after);
            consume(events, state);
        },
    };
}

},{}],
"src/ui/runtime-feedback.js":[function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeFeedback = runtimeFeedback;
exports.optionalAudio = optionalAudio;
/** Keep optional media failures visible without turning them into a game-rule change. */
function runtimeFeedback(loading, status) {
    let ready = false, fatal = false, unsupportedAudio = false, missingVisual = false, missingAudio = false;
    const update = () => {
        const message = fatal ? '' : [
            missingVisual ? 'Some pictures or fonts could not load. Reload the page to try again.' : '',
            unsupportedAudio ? 'Sound is unavailable in this browser.' : missingAudio ? 'Some sounds could not load. Reload the page to try again.' : '',
        ].filter(Boolean).join(' ');
        if (status.textContent !== message)
            status.textContent = message;
        if (status.hidden !== !message)
            status.hidden = !message;
    };
    return {
        ready() { ready = true; loading.hidden = true; },
        failed() {
            fatal = true;
            loading.textContent = ready ? 'The game stopped unexpectedly. Reload the page to try again.' : 'The game could not load. Reload the page to try again.';
            loading.hidden = false;
            update();
        },
        audioUnavailable() { unsupportedAudio = true; update(); },
        resources(visualFailures, soundFailures, knownSounds) {
            missingVisual = visualFailures.size > 0;
            // Source requests the absent `serve` export; that is not a broken media download.
            missingAudio = [...soundFailures].some(name => knownSounds.has(name));
            update();
        },
    };
}
/** Optional audio setup may throw synchronously on unsupported/disabled platforms. */
function optionalAudio(unavailable) {
    let failed = false;
    return action => {
        if (failed)
            return;
        try {
            action();
        }
        catch {
            failed = true;
            unavailable();
        }
    };
}

},{}]};const cache=Object.create(null);function load(id){if(cache[id])return cache[id].exports;const item=factories[id];if(!item)throw Error('Missing bundled module: '+id);const module={exports:{}};cache[id]=module;item[0](module,module.exports,name=>load(item[1][name]));return module.exports;}load("src/main.js");})();
