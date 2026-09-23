# Native application architecture

The current application runs native TypeScript compiled to browser JavaScript. Canvas 2D draws compiled vector paths, morphs and original compositions; exported image sequences remain catalogue/reference fallbacks. Fonts and Web Audio use native browser APIs. The application does not load the canonical SWF, execute ActionScript or run a Flash emulator. The isolated reference player is only a validation tool.

This is a working implementation baseline with source-derived regression coverage. It is not yet a certified complete rewrite with measured parity for every original behavior. [Game rules](../reference/game-rules.md), [behavior coverage](../reference/behavior-coverage.md) and the [decision register](../reference/decisions.md) distinguish implemented rules, original-source evidence and unresolved runtime questions. The [task status](../planning/task-status.md) records the current project checkpoint.

## Module boundaries

| Module | Responsibility | Inputs and outputs |
|---|---|---|
| [core/game.ts](../../src/core/game.ts) | Domain state, cooking, customers, timers, pointer mode, cash, days and screens | Typed commands and elapsed time in; snapshots and ordered events out |
| [render/assets.ts](../../src/render/assets.ts) | Asset index, original transforms, image/font loading and pixel hit tests | `assets/catalog.json`, scene metadata, exported media; symbol/name lookup and drawing |
| [render/renderer.ts](../../src/render/renderer.ts) | Original composition, customer/food poses, orders, clock, buttons and feedback | Read-only snapshots plus events; Canvas output and typed hit targets |
| [render/vector.ts](../../src/render/vector.ts) | Paths, nested art, morphs, masks, transforms, source filters and bounded display caches | Compiled vector pack; native Canvas drawing and hit geometry |
| [input/pointer.ts](../../src/input/pointer.ts) | Browser pointer coordinates and release handling | Pointer/keyboard events; domain commands through the coordinator |
| [audio/audio.ts](../../src/audio/audio.ts) | Web Audio activation, decoding, playback and cancellation | Domain sound events and asset lookup; no domain-state mutation |
| [services/scores.ts](../../src/services/scores.ts) | Separate local-storage scores | Local score objects; asynchronous submit/list operations |
| [services/legacy-scores.ts](../../src/services/legacy-scores.ts) | Original external/member/tournament/session request protocol | Explicit endpoint configuration; encoded requests and qualified response/error results |
| [ui/legacy-score-form.ts](../../src/ui/legacy-score-form.ts) | Original external name form and asynchronous submission state | Source default name/score; hidden, ready, unavailable, sending, received or failed phase |
| [ui/frame-batch.ts](../../src/ui/frame-batch.ts) | Input/event batching | Immediate ordered commands; one snapshot and presentation pass per animation frame |
| [main.ts](../../src/main.ts) | Bootstrap, event routing, animation loop, controls and score form | Connects adapters to one game instance |
| [development/catalog/main.ts](../../development/catalog/main.ts) | Development resource explorer | Exported catalogue/media; search, resource inspection and previews |

The core contains no DOM, Canvas, network or audio calls. Renderer and adapters receive copies of state; they cannot alter the simulation by changing a snapshot. The renderer may retain presentation-only state such as transient cash feedback and the currently pressed button.

## Core contract and flow

```ts
const game = createGame({ random: Math.random });
const batch = createFrameBatch(game, (events, state) => {
  audio.handle(events);
  renderer.events(events, state);
  renderer.draw(state);
});
batch.flush(0); // Initial menu sound from root timeline frame 3.
batch.dispatch({ type: 'start' });
batch.flush(elapsedMilliseconds);
```

`createGame(options?)` returns `dispatch(command)`, `advance(ms)`, `snapshot()` and the read-only `state` accessor. Both snapshot accessors return detached copies. `advance` rejects negative and non-finite durations. `dispatch` validates relevant indices and ignores commands that are not applicable to the current screen or pointer mode.

`GameState` includes screen/day/cash, the displayed day clock, customer loss count, tutorial state, pointer mode/position, 18 cooking slots, five customer identities, five table assignments, audio flags and local submission state. `batterTemplate` tracks the hidden source clip's availability, playback and pose. The plate has independent `platePosition` and `counterPosition`; each `PlatedDosa` preserves its own frozen release coordinates until a source action moves it. Customer state includes separate wrapper/character/order/exit visibility and playback, plus latched anger and its start time. Food carries domain phase/age and the original pose number.

Commands cover screen transitions, tutorial, mute, batter, cooking-slot releases, plate/customer releases, pointer movement, background cancellation and local score submission. Events cover sound playback/stops, screen changes, cash feedback, score requests, session-refresh requests and diagnostic policies. Burn feedback includes its cooking slot or explicit source coordinates; hidden-template removal uses `(1000,1000)` rather than the pointer position.

`main.ts` applies pointer commands immediately in input order and queues their events. Each animation frame advances time, takes one detached snapshot and passes that same snapshot to event handling and drawing. Pointer bursts no longer trigger additional renders or snapshot cloning. Screen/form changes and hints update DOM only when their values change. The renderer builds hit targets when it draws; the pointer adapter tracks the originating pointer and target so release over another target does not activate it. Transparent native buttons provide keyboard activation. Canvas coordinates remain 550 × 400 regardless of display size. Escape and pointer cancellation issue the background command.

The browser uses `Math.random`. The core's default random generator is deterministic for headless use, and tests can inject an exact choice stream. Source comparison must inject corresponding choices; sharing a seed with Flash does not reproduce Flash's random implementation.

## Time and browser visibility policy

The simulation keeps independent source-derived clocks: 12 Hz animation cadence, 100 ms patience increments, 1,000 ms day-clock increments, 2,000 ms ordering delay and the day-dependent arrival interval. Internal thirds of a millisecond represent the 12 Hz cadence exactly. Events with the same deadline execute in registration order. Presentation frame rate does not decide whether food can be flipped, when a customer leaves or when cash is awarded.

Patience is a source MovieClip position: every assignment truncates to twentieths of a pixel, using `Math.trunc(value * 20) / 20`. Fresh/initialized meters retain authored `-65.9`; ordering explicitly resets to `-66`. Targeted Ruffle probes confirmed anger on callback118 and departure after 160 unserved callbacks (16 seconds), with `-30.05` still alive and `-29.85` departed. They also confirmed that overwritten interval handles can survive result screens: their clip references are invalid there and resolve to the same customer path after the next day recreates it, affecting even an invisible fresh meter. Native orphan intervals retain their cadence, do nothing outside gameplay and resolve the current customer identity when gameplay resumes. StopGame clears only the latest known handles of table-referenced customers.

The current browser loop uses the **full elapsed `requestAnimationFrame` timestamp difference**. It does not pause on `visibilitychange`, cap elapsed time or discard hidden-tab time. If the browser suspends animation callbacks, the next callback advances the game through the entire reported gap. Customers may leave and a day/game may finish during this catch-up; presentation renders the resulting state and processes the returned events. Device suspension behavior depends on the browser's timestamp clock.

This is the current explicit browser policy, not a claim that every historical Flash player handled background time identically. Large gaps can batch transient audio/events at return, and still require browser verification. Targeted Ruffle probes support a 10 ms minimum for zero/negative later-day arrival intervals; the core exposes `nonPositiveSpawnIntervalMs` and does not introduce a difficulty cap. Full callback-order and browser-visibility equivalence remain separate gates in the decision register.

## Presentation and asset loading

`Assets` indexes resources by stable symbol ID, catalogue ID, human-readable name and original export name. It loads exported fonts with `FontFace`, keeps image and pixel-mask caches, and exposes original bounds and affine transforms. Image caching is bounded by entry count and approximate decoded image bytes. Initial preloading covers the first preview frame of selected resources; further sequence frames load on demand. Missing media are recorded in `failures`, and a missing preview is skipped rather than interpreted as SWF content.

The renderer consumes main-screen scene snapshots and compiled vector compositions. It explicitly controls customer phases, food state, patience masking, dynamic text, clock hands and interaction states. Source filters, masks, morphs and child artwork run through native drawing code. This is game-specific composition code, not a general SWF interpreter. Original exports and geometry remain reusable by other presentation implementations.

Canvas output scales to the displayed element and device pixel ratio, capped at 3. Hit testing transforms pointer coordinates into local symbol coordinates; selected targets use preview alpha or original button hit-state frames. These mechanisms still require scene-by-scene reference verification, especially nested masks, animation phase, text layout and overlapping interactive regions.

## Audio and services

`GameAudio` attempts activation after the first painted screen and retries on user gestures when browser autoplay policy requires them. Sound events received before activation are queued. The adapter caches decoded buffers, applies event volume and finite loops, and cancels pending playback through global/music generations when stop events arrive. Missing names and failed loads are recorded in `missing`. The source's undefined `serve` export remains an unresolved request rather than an invented sound.

The initial menu track is `bgMusic2` once, derived from a root sound tag outside ActionScript. Pinned Ruffle processes StartSound before queued ActionScript: gameplay's later stop-all cancels the competing root sound and leaves the ActionScript-selected track. Audio regression tests preserve this event policy, source loop counts and mute guards; they are not recordings of historical Flash mixer output.

`ScoreService` exposes asynchronous `submit(score)` and `list()`. The current `LocalScores` adapter stores up to 100 sorted results under `madrasi-dhaba.scores.v1` in browser local storage. Names are trimmed and limited to 50 characters. The UI identifies these as local scores and allows a failed storage write to be retried. There is no cross-device or public online leaderboard.

The original external score form is separate from local saving. It starts with `noname`, preserves the entered name without trimming or a maximum length, and hides immediately on explicit submission. `LegacyScoreClient` sends the source fields and transcribed Rijndael verification value only to deliberately configured endpoints. A valid response is reported as received, not proven accepted; missing results, HTTP/network failures and timeouts remain explicit. Failed submissions can be retried manually, never automatically. Status remains outside the hidden form.

Deployment-owned JSON in `index.html` (`#score-service-config`) defaults to `{}`: no online POST endpoint is available, and the form clearly reports that nothing was sent. `score-configuration.ts` validates optional HTTP/HTTPS endpoints, navigation links, timeout, credential mode and host game ID. `main.ts` consumes core `session-refresh` events only when both a session endpoint and game ID are supplied; it does not start another timer. Original publisher/leaderboard links follow ordinary user activation. An implemented protocol does not establish a functioning historical backend. See [service protocol](../../src/services/README.md) for fixtures and configuration.

## Build, test and release

The repository declares Node.js 22 or newer. TypeScript **5.9.3** is pinned with its archive URL and SHA-256 in [tools/typescript.json](../../tools/typescript.json). On Windows, install it using:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-typescript.ps1
```

The compiler and downloaded archive stay under `.local-setup/`. The setup script verifies the archive checksum. There is no runtime dependency on that directory, and a global TypeScript installation is not used by the build script.

From the repository root:

```text
node scripts/internal/build.mjs
node scripts/internal/build.mjs --check
node scripts/internal/test.mjs
node scripts/internal/serve.mjs
node scripts/internal/release.mjs
```

- Build compiles strict TypeScript from `src/` and `development/` into `.local-setup/build/modules/`, targeting ES2022 with NodeNext module resolution. Source imports use `.js` extensions and emitted modules run in the browser. The development server maps only `/build/` to this generated subtree; the rest of `.local-setup/` is never served.
- Check performs the same TypeScript validation without emitting output.
- Test builds first, discovers `tests/**/*.test.mjs` and runs Node's test runner with `--test-isolation=none`. Tests exercise domain behavior and adapters; they do not replace browser or original-player verification.
- Serve opens a local HTTP server at `http://127.0.0.1:5173`; `MADRASI_PORT` overrides the port. It serves the game, catalogue, compiled modules, CSS and assets, while excluding hidden/tool/reference directories.
- Release generates only the native game: `dist/site/` has index.html, game.js, resources.js and styles.css; `dist/standalone/` has the same content in one index.html. Both use classic compiled bundles and embedded native player data for HTTP/file compatibility. Catalogue UI, export previews/provenance and research timelines are excluded. All original vector geometry, player metadata, bitmap fallbacks, fonts and sounds are preserved. Diagnostics are excluded from the production module graph; opt-in player FPS/quality controls remain. Development tools live under `development/`, outside both packages.
- `scripts/10_setup.cmd` restores pinned portable Node.js, TypeScript and Playwright locally, with checksum verification for Node/TypeScript. It uses existing Chrome or installs a local Playwright browser, then builds the game. Launchers share `tools/run.ps1` and always use local Node, without a global PATH change. Optional JPEXS/Java/Python/reference-emulator setup remains research-only.

Release generation does not itself run tests or establish parity. A successful production build proves compilation/packaging, not that all original game behaviors have been verified.

## Evidence and completion gates

The immutable references, all 83 indexed script exports, SWF metadata and original resources supply source evidence. Core tests establish reproducible native outcomes for source-derived scenarios, including cooking thresholds, partial/surplus serving, character-specific eating, cash, cleanup, later days and timer ties. Adapter tests establish their local contract behavior.

Instrumented Ruffle observations confirm hidden-template removal, patience twip conversion, cross-screen orphan rebinding, independent cooked-food smoke and persistent tutorial children across its335-frame loop. These are emulator observations, not historical Adobe Flash measurements. Full-suite results and complete native browser scenarios are recorded in [verification.md](verification.md); earlier partial test counts are superseded.

Evidence limits include callback ordering beyond the probes, historical device-font/audio/pixel behavior, untested browser engines and actual online service acceptance. Tutorial parent and persistent-child clocks are explicit; browser catch-up and native FIFO scheduling are documented policies. Keep those distinctions in [behavior coverage](../reference/behavior-coverage.md), [decisions](../reference/decisions.md) and the task status.
