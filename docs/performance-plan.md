# Gameplay performance investigation and optimization plan

## Full resolution continuation

### Whole pipeline continuation

The target remains stable 60 Hz play at 2200 × 1600 backing pixels on both
measured Pi 5 environments, with substantially lower CPU use. A 46 FPS average
does not pass. The component omission study is only one part of attribution.

- [x] PERF-20 Attribute the complete frame: warmed browser/renderer/GPU-process
  CPU separately, JavaScript samples, text, hit testing, static redraw, Canvas
  source/compositing choices, allocation and cold preparation. GPU-process CPU
  is host CPU work, not GPU utilization. Compare matched repeated controls and
  keep diagnostic omissions outside the game.
  Evidence: 66 Pi cases, CPU samples, host presentation/raster trace spans and
  submission counts in [performance-pipeline.md](performance-pipeline.md).
- [ ] PERF-21 Reduce repeated scene submission and pixel composition based on
  PERF-20. Evaluate retained draw commands and opaque cached scenery before
  removing further effects. Verify appearance-preserving caches against the
  existing pixels; put any changed rendering treatment in Extra. Preserve
  vector density, bounded memory, live orders, input and simulation timing.
  First implementation delivered: Extra retains scenery at authored poses,
  with a bounded exact-density opaque surface. 360 exact scene/hit comparisons
  and 128 automated tests pass. Removing the remaining per-frame full-surface
  copy and reducing complete-day CPU use are still open.
- [ ] PERF-22 Repeat real-time, three-minute gameplay on both Pi environments
  with audio and inputs, cold and warm starts, profile switching and resizing.
  At 60 Hz require average at least 59.5 FPS, p95 at most 20 ms, p99 at most
  33.4 ms and no sustained stalls. Record warmed CPU across all isolated browser
  processes in units of one core, with an initial engineering budget of 40%
  of one core (10% of a four-core CPU). Report failure explicitly if either
  cadence or CPU budget is missed. This budget is a target, not a result.
  Initial real-time day completed on both Pi boards with audio and command
  replay, cash 24 and clock 720. Warm results are 55.62 / 59.85 FPS and
  80.96% / 76.17% of one core. Pi A fails cadence; both miss the CPU target.
  Cold and final-transition stalls remain. Do not mark acceptance complete.

Do not select a profile or lower clarity automatically to meet these targets.
Static-frame controls diagnose the pipeline and never count as playable results.

### Profile separation plan

Status: PROF-1–6 implemented and verified; PROF-7 default selection remains open.
The [profile inventory and acceptance report](presentation-profiles.md) records
128 passing tests, visible UI/pixel checks and 16 timing cases. Keep this plan and
the component report in English. Classic and Extra remain working labels.

Use one application, one simulation and two presentation profiles:

| Area | Classic | Extra |
| --- | --- | --- |
| Gameplay rules, customer orders, patience, cooking and scoring | Same shared core | Same shared core |
| Appearance-preserving cache improvements | Enabled | Enabled |
| Original decorative effects and authored animation | Reference presentation | Selected cheaper treatments |
| Added batter introduction label and bowl outline/selection cue | Off | Included |
| Added flip/pickup cursors and other remake guidance overlays | Off; retain source-authored cues | Included |
| Added display/diagnostic controls, including resolution, FPS, expansion and fullscreen buttons | No extra control overlay | Included; FPS remains opt-in and hidden initially |
| Original music | Preserved | Preserved unless a separate audio choice is made |
| Future additional music or presentation features | Not enabled here | Belong here if implemented later |

The profile chooser is a small shared control, not another permanent dashboard.
Responsive fitting, direct-file playback, input handling, resource error recovery,
accessibility essentials and fixes for white seams or incorrectly placed screens
are shared correctness/portability work. Required credits and attribution also
remain shared. Classic does not mean restoring defects or claiming historical
Adobe pixel equivalence. Added conveniences beyond these essentials must be
inventoried and assigned to Extra, including features already present in the remake.

Cache eligibility is strict: common cache work must preserve the selected
profile's appearance, animation and interactions. Freezing stars so a whole
background can be retained changes the picture and therefore belongs to Extra,
even though it also enables caching. Retaining unchanged scenery while keeping
animated stars and original composition intact can be common cache work after
verification. New non-cache performance treatments belong to Extra; do not use
this plan to silently rewrite the established Classic rendering baseline.

- [x] PROF-1 Inventory existing additions in the game shell, renderer, pointer
  feedback and audio settings. Map every feature to shared infrastructure,
  Classic source behavior or Extra presentation. Distinguish source-authored flip
  cues from added cursors. The resource catalogue remains a separate development
  tool. Record the mapping before moving existing behavior behind profile gates.
- [x] PROF-2 Introduce a typed presentation-profile configuration with stable
  IDs and one resolver. Pass resolved options to rendering, presentation UI and
  audio without branching the game rules or duplicating the game. Cover existing
  additions and future treatments through the same profile mechanism.
- [x] PROF-3 Retain and verify the shared adaptive cache at unchanged clarity.
  Bound total memory across both profiles; invalidate or distinguish cached
  variants on switching so stale simplified artwork cannot leak into Classic.
  Existing bounded retention is shared; the proposed general static-group crop
  failed pixel equality and is not enabled in Classic. Only Extra's changed
  background uses the crop. Source metadata is immutable; switching releases
  obsolete variant surfaces and derived metadata.
- [x] PROF-4 Gate existing additions behind Extra and implement the measured
  non-cache candidates there: cheaper large griddle steam first, optional fixed
  stars/static scenery treatment next, then simpler order-bubble decoration.
  Keep counts and patience live. Keep glasses, radio, original music, traffic and
  customer detail initially; further cuts need evidence. No automatic resolution
  drop or automatic profile selection based on detected hardware.
- [x] PROF-5 Add a compact profile selector and persist explicit selection when
  storage is available, with an in-memory fallback for restricted file playback.
  Switching must preserve the active day, score, food, customers and timers,
  cancel obsolete presentation work and release unused variant resources. Keep
  Extra hint dismissal and display settings separate from Classic; toggling must
  not replay music, stack listeners or resurrect dismissed hints. Compare profiles
  explicitly while the shipping default remains undecided; do not
  change the existing release default as a side effect of settings migration.
- [x] PROF-6 Validate both profiles with identical input/replay and 100% render
  scale before testing lower scales separately. Check cold and warm rendering on
  both Pi environments plus Intel/NVIDIA, memory bounds, repeated profile swaps,
  menu/tutorial/gameplay/day-end, pointer/touch hit mapping, audio, fullscreen,
  resizing and HTTP/direct-file playback. Classic retains source behavior and
  the established corrections; Extra has explicit visual differences, with the
  same simulation outcomes. Visual captures and timings are recorded; the full
  deterministic day ends at cash 24/clock 720 in both profiles. Both distributions
  are rebuilt and checked with the previous no-selection behavior preserved.
  Touch is emulated; performance remains below target in documented cases.
- [ ] PROF-7 Select the shipping default after reviewing Classic and Extra.
  Until then, absent saved preference keeps the previous release presentation
  and a neutral Choose profile selector. Do not infer a choice from hardware,
  measured speed or existing unrelated display settings. After selection, update
  the fallback/migration explicitly and rebuild/check both distributions.

Implementation order: PROF-1/2, common cache work (PROF-3), Extra treatments
(PROF-4), switching and persistence (PROF-5), then acceptance (PROF-6).
PROF-4 and PROF-6 carry the production work and acceptance required by PERF-17.
The default profile remains **undecided**. The profiles are implemented, with
no new soundtrack and no automatic quality reduction. PERF-17 is still open:
profile delivery does not establish smooth full-clarity play on every device.

- [x] PERF-19 Rank individual visual groups on both physical Pi environments using repeated baselines, separate cold and warm costs, managed memory and actual audio controls. All 56 cases are recorded in [performance-components.md](performance-components.md) and anonymous reference data. Large griddle steam dominates measured cold/memory cost; background composition dominates warmed omission gains. Static background treatment reaches 43.11 / 59.66 FPS versus its 36.23 / 39.67 starting controls. The scope permits deliberate decorative simplification; exact historical appearance is a reference, not a universal requirement. Experimental removals remain outside the shipped game. This study does not complete PERF-17 implementation.

- [x] PERF-16 Reproduce and fix cache thrashing above 1485 × 1080 without reducing clarity. Resolution scaled, bounded tile retention removes repeated griddle blur eviction. Verified Intel 2200 × 1600 fixture: 5.17–5.33 to 57.84–58.37 draws/s. Warm production core gameplay: 63.93/s, no sampled gaps above 50 ms. All 124 tests and 94 exact scene pixel/hit comparisons pass; resize returns identical pixels.
- [ ] PERF-17 Resolve cold filter creation and sustained high density rendering through PROF-1–6 above. At 2970 × 2160 the earlier short fixture remains 26.56/s with 51 filter builds and zero evictions. PERF-19 supplies longer controlled 2200 × 1600 Pi measurements and effect alternatives. Share verified appearance-preserving cache improvements; place cheaper griddle effects, changed scenery animation and simpler order decoration in Extra. Repeat cold/warm actual gameplay and visual checks for both profiles. Preserve bounded memory and sharp primary artwork; exact pixels are required only for changes claimed to preserve appearance. Cold stalls and sustained full-clarity performance are not yet accepted as resolved.
- [x] PERF-18 Measure physical Raspberry Pi at a recorded model, browser/backend and backing resolution. Two Pi 5 / 8 GB environments have verified V3D acceleration. Warm 1485 × 1080 gameplay reaches 60.00/s on both; 2200 × 1600 reaches 39.62 / 52.21/s. Cold stalls remain, so smoothness acceptance is limited. Both pass GPU pixels and shipped UI checks. See [performance-raspberry-pi.md](performance-raspberry-pi.md).

PERF-17 priority after the component study: (1) large griddle blur and other cold preparation; (2) background composition at unchanged primary-art clarity; (3) decorative order morphing. Customer bodies, dosa steam and traffic are secondary, while glasses, radio and music are low priorities. The combined removal of small decorations only takes Pi A from about 36 to 40 FPS, so removing everything is not the proposed solution. Follow the implementation and acceptance order in [performance-components.md](performance-components.md). Same-device graphics-stack comparisons remain necessary before attributing differences to a particular driver or recommending system changes.

Evidence and reproduction: [performance-full-resolution.md](performance-full-resolution.md). These tasks extend the earlier resolution matrix; the original game implementation remains complete.

Baseline application: commit `59190d0` / diagnostic checkpoint `351e2d6`. The original implementation audit and measured renderer optimizations are integrated. The initial diagnostic results below are retained as historical evidence, not current performance.

## Implemented optimizations

The native renderer now retains unchanged child geometry, culls offstage work, uses current filter bounds, reuses surfaces and isolates filters at clip level. Canvas gradient matrices are applied at paint time; source smoke blur is measured in parent coordinates. These correct visual defects as well as reducing allocations. Main integration publishes one snapshot and paints once per animation frame, preserving immediate command order.

A matched 30-second, 18-slot cooking stress scenario at 1485 × 1080 pixels exposed an intermediate regression: retained groups reduced new pixel surfaces from 8,859.62 MiB to 151.26 MiB (98.3%), but CPU box filters reduced rendering opportunities from 18.65/s to 13.57/s. A detailed repeat attributed approximately 23 seconds to filtered smoke groups 223/263. This intermediate version is not an accepted optimization.

That measurement justified a narrowly scoped WebGL2 separable box filter with reusable textures and a CPU fallback. Geometry, gameplay and composition remain native TypeScript/Canvas. GPU output is checked against the CPU filter using actual browser pixel fixtures before final timing is accepted. Filter working storage is reported separately from the 80 MiB retained tile and 16 MiB reusable surface budgets; counters are accounting, not driver memory measurements.

Reproduction: `development/verification/index.html` is a development-only visible scenario runner. `scripts/reference/build-benchmark-baseline.mjs` builds the diagnosed renderer from Git for comparison. Both verification code and historical renderer are excluded from `dist/site`. No test data or diagnostic reports are uploaded.

## What the measurements establish

The earlier `?profile=1` measured JavaScript rendering duration only. A low median there is not evidence of smooth frame presentation. The new `?diagnose=1` captures 15-second windows with requestAnimationFrame intervals, render/simulation/snapshot costs, per-symbol drawing work, cache creation/eviction and Long Animation Frames when supported. Reports remain in visible page DOM; no telemetry, automatic uploads, local storage or diagnostic log files are created.

Measured in the Windows Codex in-app browser, 1280 × 720 CSS viewport, DPR 1.5, 1485 × 1080 canvas pixels. `document.hidden` was false throughout every reported window. These are local rendering-opportunity measurements, not a physical monitor/GPU presentation trace, nor a measurement in other browsers. Instrumentation adds overhead. Live customer state and timeline phase differed across sequential experiments; do not interpret the ratios as controlled speedup guarantees.

| 15-second experiment | Render calls/s | rAF interval median / p95 | Long frames >50 ms | Cumulative new cache surfaces |
|---|---:|---:|---:|---:|
| Baseline gameplay | 15.49 | 50.1 / 154.1 ms | 112 | 3,672.51 MiB |
| Cache bypass, same graphics | 11.53 | 83.3 / 112.8 ms | 166 | 0 MiB |
| Background symbol 193 omitted | 25.17 | 37.2 / 96.0 ms | 89 | 1,898.66 MiB |
| Vector placement filters omitted | 39.13 | 20.9 / 50.0 ms | 40 | 4,756.35 MiB |

Omission experiments intentionally alter appearance only during capture to isolate cost; they are not proposed product changes. Normal rendering and filters resume after capture. The first baseline/cache-bypass windows used a warm existing cache; subsequent omission windows cleared tile caches at capture start. Path caches stayed warm. A subsequent implementation comparison must use identical recorded state/time/input sequences and matched cache warmup.

The byte counter sums `width × height × 4` for each newly created cache surface. It measures allocation churn, not simultaneously resident RAM or an independently measured GPU allocation. Baseline live pixel-cache accounting was 95.13 MiB under the 96 MiB budget, with 1,819 evictions and 1,834 root cache misses. The initial diagnostic implementation cleared the cache before reading live occupancy for the omission experiments; those zero occupancy fields are invalid and excluded here. The probe now records occupancy before cleanup.

## Confirmed waste and likely expensive work

1. **Whole animated composites are cached by frame.** `VectorArt.draw` keys a root tile by symbol, elapsed pose, scale and morph ratio. A changing descendant invalidates its complete parent. Background 193 is a one-frame parent containing animated child 185 (30 frames), plus other art. At the tested scale, each background tile is approximately 14.6 MiB, including large offstage bounds. Baseline created it 141 times: 2,058.93 MiB, around 56% of all new pixel surfaces. Symbol 224 combines static shape 222 and animated smoke 223; its 141 tiles added 555.11 MiB. Allocating, rasterizing, uploading and discarding these surfaces is unnecessary when most of their contents do not change. The allocation/eviction counts are observed; individual GPU upload and garbage-collection times still need a browser trace.
2. **Filters are expensive and are applied at the wrong granularity for efficiency/fidelity.** Blur settings are inherited while recursively drawing individual paths. Symbol 224 has a blurred child and an oversized composite tile. Dosa 472 also contains many filtered placements. Removing filters during the diagnostic probe strongly improved update cadence even while cache allocation volume increased. The appropriate direction is isolated, tightly bounded filtered groups with reusable results, preserving source blur/shadow content. Exact Flash kernels/group compositing remain D-011/D-013 work.
3. **Moving objects carry the bounds of their complete animation.** Traffic clips 204/206/210/215/218 include long offstage trajectories in symbol bounds (roughly 831–1,244 source pixels wide). Their whole large frame tiles are rebuilt as the vehicle moves, although a smaller child could be retained and transformed. Source inspection found repeated direct placement poses too, e.g. sprite 215 has 130 source frames but 61 distinct direct-placement snapshots. Child clocks must remain part of any visual cache key; matching parent placement alone is insufficient.
4. **Redundant full rendering on input.** `pointermove` dispatches immediately; every dispatch calls full `render()`, in addition to the requestAnimationFrame loop. Down/up can issue multiple dispatches too. Thus mouse movement can multiply rendering work and updates outside the presentation cadence. This is confirmed in source, but the no-input timing windows do not quantify its impact for a real high-rate mouse.
5. **12 Hz presentation is separate from dropped updates.** Source frames are selected with `Math.floor(time * 12 / 1000)`, while core food/customer poses also advance at source cadence. Even perfectly stable 60 Hz rendering repeats these discrete poses. Optimize renderer stalls first; then use presentation-only interpolation for suitable authored transforms/morphs if higher visual smoothness is desired. Never multiply cooking, patience, scoring or game-clock rates to make artwork move more smoothly. Do not interpolate discrete substitutions, stop/jump boundaries or visibility changes indiscriminately.
6. **Minor repeated CPU work exists, but is not the primary measured bottleneck.** Each `game.state` access deep-copies JSON. Main integration reads it three times per normal tick, including empty event handling. Baseline: 699 snapshots cost 22.4 ms total, simulation advancement cost 5.7 ms total, across 15 seconds. Median renderer JavaScript time was 3.5 ms while median rAF gaps were 50.1 ms. Forced layout attribution reported zero in these windows, so layout is not established as a dominant cause. Repeated DOM writes/size reads and hover alpha readbacks remain candidates to inspect under active input, not proven primary culprits.

## Ordered implementation tasks

Checked items have implementation or a completed measured investigation. They do not mean every aspirational cadence target was met; the high-density limitation is stated explicitly below. Preserve vector geometry, original content, rule timings, source durations, masks and visual effects. Do not lower resolution, remove content or increase the memory cap as the primary solution.

- [x] PERF-0 Diagnose and retain a repeatable local capture tool. Record actual rAF pacing rather than equating JavaScript draw time with FPS. Initial live experiments and source audit are above; deterministic before/after recordings remain PERF-5 acceptance work.
- [x] PERF-1 Split static artwork from changing descendants, starting with 193 and 224. Build reusable vector-derived static/group surfaces; apply motion as transforms to smaller children. Preserve depth and masks; do not flatten across overlapping foreground actors. Use current visible bounds plus exact filter padding, cull fully offstage work, and retain child clock/color/morph semantics.
- [x] PERF-2 Rework filtered groups and cache lifetime. Render each affected group once into a tight surface, apply the effect once, retain unchanged output, and reuse surface allocations. Keep stable scene assets from being displaced by one-use animation frames; use an explicit byte budget. Do not blindly precache every frame or simply disable caching: that experiment was slower. Validate effect appearance against canonical reference frames.
- [x] PERF-3 Render at most once per animation-frame opportunity. Apply commands in order immediately, but defer visual rendering to the next rAF and coalesce pointer-position updates safely. Preserve release-target identity, hover/pressed feedback and click ordering. Reuse a single immutable snapshot per integration tick, update DOM only when values change, and update canvas dimensions on actual resize. Measure these improvements independently of PERF-1/2.
- [x] PERF-4 Separate presentation sampling from the 12 Hz rule clock. After stable rendering, interpolate eligible continuous transforms/morphs at display cadence, retaining source durations and exact poses at original sample times. Keep frame swaps and explicit holds discrete. Document interpolation as a presentation choice and compare gameplay event traces unchanged; higher rAF frequency alone cannot make 12 authored poses/s look like 60 unique poses/s.
- [x] PERF-5 Complete the available-machine acceptance matrix and publish its coverage limits. Validated scenarios: idle game, five customers, one/three/eighteen dosas, carried plate, rapid pointer movement, tutorial, menu, day end/retry, resize/fullscreen and tab return. Use fixed random choices and identical game-time/input traces, repeat cold/warm runs at normal and high density, test isolated visible Chrome on the tested Intel and NVIDIA adapters. Other browser engines and physical touch devices are explicitly untested. Record rAF p50/p95/p99, gaps >25/>50 ms, input latency, LoAF attribution, allocations/s, peak cache accounting and long-session memory. On a 60 Hz test display, aim for stable approximately 16.7 ms opportunities, p95 <=20 ms, p99 <=33.4 ms and no sustained >50 ms stalls in warmed representative play; these are acceptance targets, not current promises. Reduce allocation churn by at least 90% against a matched baseline while preserving clarity and effects. Inspect browser process/host trace spans alongside memory accounting. Physical GPU timers, driver VRAM and hours-long leak testing remain outside this acceptance matrix. Completion evidence is in performance-gpu.md; the following historical measurements do not represent the latest Chrome results.
- [x] PERF-6 Escalate only if profiling still warrants it: OffscreenCanvas/worker for main-thread contention, or a native WebGL/WebGPU vector/group renderer for persistent graphics bottlenecks. First inspect supported browser tracing for raster/composite/GPU work; a worker by itself cannot remove excessive pixel/filter work. Do not undertake a renderer rewrite before verifying PERF-1–3.

PERF-1 and PERF-2 are the first implementation milestone; PERF-3 follows, then PERF-4 with explicit visual parity review. Each milestone needs before/after evidence and a separate coherent commit. No timing/parity task is closed just because average FPS improves.

## Research supporting the proposed approach

- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) recommends reusing offscreen-rendered work and separating scene layers with different update rates. Here that supports small vector-derived caches and retained static layers, not whole-scene per-frame caches.
- [Chrome: Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames) explains why individual JavaScript task durations miss delayed rendering updates and how to attribute long frames/forced layout. LoAF uses a 50 ms threshold and does not directly measure physical presentation time; it is used alongside rAF interval distributions.
- [MDN: OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) documents worker rendering. It is a conditional later option, not evidence that moving today's renderer unchanged to a worker solves its surface/filter cost.

## Initial implementation and current validation

The original omissions identified in the first audit are implemented: source customer reuse/orphan lifecycle, quantized patience, hidden template, plate positions, independent held/plated smoke, persistent tutorial children, source audio events, original score form/verification/protocol and branding. See the actual source/native evidence in [reference-validation.md](reference-validation.md), [verification.md](verification.md) and [behavior-coverage.md](behavior-coverage.md).

PERF-1–4 are implemented. The conditional final-stage GPU investigation is complete and rejected. The first unbatched GPU experiment preserved pixels but was slower than Canvas when both were fully visible; it is not enabled in production. Offscreen/below-viewport cadence results were excluded after discovering that the browser could skip presentation work. Subsequent experiments use a fixed visible overlay, record dimensions/containment and separate cold setup from warmed cadence.

Single-fill alpha factoring passed actual1×/2.75× pixel comparisons, with maximum1/255 difference. Experimental background193 static regrouping failed edge-pixel comparison(max125at1×,76at2.75×) for only~1fps gain and was removed from production. Do not count that rejected experiment as an optimization.

The timer queue now uses a stable minimum heap keyed by deadline and registration ID. Exact event-order tests pass, including source orphan callbacks. This removes repeated whole-queue sorting, but full-suite duration did not demonstrate a material speed gain; it is not described as the primary measured bottleneck.

Temporary test installations and logs stay under ignored `.local-setup/`. No diagnostics or original runtime are required by the static production site.

## Rejected final-stage alternatives

A fully visible frozen-frame replay compared Canvas, a native WebGL2 compositor and one flattened bitmap at1485×1080 backing pixels. The unbatched GPU result passed a2/255 pixel tolerance but was slower:38.65opportunities/s versus Canvas41.73. A4096×4096 atlas with three adjacent clip batches also ran slower(38.90versus41.14) and missed pixel tolerance by one pixel(max3). One bitmap reached56.49/s. These results point to a substantial presentation/compositing cost in the available browser; they do not prove a particular driver defect. Below-viewport measurements were discarded. The experiment is retained only under development verification, excluded from release.

A separate Canvas scene-layer experiment reserved12.24MiB from the existing16MiB pool and reused the exact back→traffic→front order. It improved the high-density three-slot benchmark only36.78→38.55/s, while14of16 paired scene comparisons failed(max153–156/255,164–545pixels above2). Hit targets and invalidation checks passed. The layer code and reservations were removed; no failed experimental graphics path ships in production.

Only menu/traffic continuous transforms interpolate between eligible authored samples. Radio, smoke, food and customer poses retain their source12Hz clocks; interpolation does not alter rules, frame callbacks or clip lifetimes.

## Historical measured results — quantized bot clock

Windows in-app Chromium,1280×720 CSS viewport,DPR1.5. Each30-second window keeps the complete canvas visible at(0,0); reference players and catalogue animation are paused. Identical constant-random bot/input rules are used for each matching slot count. Cold clears retained surfaces; warm repeats with them retained. Instrumentation is included.

| Renderer / workload | Backing pixels | Cache start | Draws/s | rAF p50 / p95 / p99 (ms) | Gaps >50ms | New tile surfaces (MiB) |
|---|---|---|---:|---|---:|---:|
| Diagnosed baseline,18 slots |1485×1080|cold|24.16|41.9 /59.7 /64.9|305|9820.55|
| Final,18 slots |1485×1080|cold|35.58|28.7 /54.1 /75.9|93|69.01|
| Final,3 slots |1485×1080|cold|36.69|24.4 /53.3 /77.2|85|69.01|
| Final,3 slots |1485×1080|warm|37.89|24.7 /30.7 /31.7|0|0|
| Final,3 slots |825×600|cold|125.18|6.1 /12.2 /17.9|1|23.56|
| Final,3 slots |825×600|warm|126.60|6.1 /12.1 /12.4|0|0|

The matched18-slot test increases draw opportunities by47.2% and reduces new tile-surface bytes by99.3%, with zero final evictions versus5300. Filters now reproduce the source-derived isolated effect, so the old renderer is not an equal-pixel oracle. Warm representative play creates no new tile surfaces and has no gaps above50ms in either size. At normal size the warm maximum gap is24.1ms; at high density it is48ms. Full distributions and cache accounting are in native-observations.json.

The high-density60Hz/p95≤20ms aspiration is **not met** in this environment. The normal-size historical bot result met the cadence targets in that quantized scenario; it does not validate actual user gameplay. No automatic resolution reduction, filter removal or larger cache cap conceals that difference. Native GPU final-stage alternatives were measured and rejected for fidelity or speed; further whole-renderer rewrites have no demonstrated advantage here. Physical presentation/driver-memory tracing and other engines/devices are outside the available test surface. These limits remain explicit in delivery rather than being labelled verified smooth60FPS everywhere.

## Historical follow-up investigation — user-reported stutter

The previous measurements were real, but checking PERF-5 complete overstated its coverage: they did not include the full browser and GPU matrix, real input, simultaneous five-customer scenes or instrumentation-overhead control. PERF-5 was reopened at this checkpoint and is resolved by the visible Chrome continuation below. Previous data remains unchanged; no inference of smooth actual play follows from its825×600 bot result.

New UI requests versus continued unfinished validation:

- [x] PERF-7 Cheap visible FPS/measured-frame counter and honest CPU/memory breakdown; compare disabled/enabled overhead. New UI; strengthens existing PERF-0/5 diagnostics.
- [x] UX-1 Batter bowl hover and persistent touch discoverability cue without changing source click rules. New requested presentation feature.
- [x] PERF-8 User-controlled25/50/75/100% render resolution, vectors retained, stable CSS/input coordinates and scalable return to100%. New quality option explicitly authorized by user.
- [x] PERF-9 Repeatable real-cadence replay and group-by-group omissions: griddle steam,dosa steam,traffic including headlights/shadows,customers,radio,background,music. Record time,draw counts,frame gaps and repeated baselines; omissions are measurement-only. Continuation of PERF-5 attribution gaps.
- [x] PERF-10 Identify active graphics context, hardware/software indication and available browser backend; compare native GPU/CPU filter paths and render scales. Installed adapters alone do not prove active selection. Continuation with newly requested GPU detail.
- [x] PERF-11 Separate12Hz authored animation steps from dropped render opportunities; record a justified follow-up optimization/testing plan with concrete evidence. Keep gameplay timers unchanged.

CPU shown by in-page diagnostics means measured main-thread JS work relative to elapsed time, not operating-system CPU or GPU percentage. Managed surface/sample bytes and optional shared JS heap are reported separately; total processRAM andVRAM are unavailable from standard page APIs. Detailed profiling is opt-in and stopped after capture.


### Follow-up evidence and continuation

See [performance-follow-up.md](performance-follow-up.md) and [performance-follow-up.json](../tests/reference/performance-follow-up.json) for the two component sweeps, active Intel filter context, cache accounting and explicit limits. The confirmation baseline is 49.18-49.61/s with p95 about42ms; the stable60Hz target remains unmet. The prior quantized bot clock has been corrected. At that checkpoint, CPU/GPU OS utilization, NVIDIA comparison and physical presentation tracing were unverified. The later actual-adapter results are recorded below; physical presentation remains unmeasured.

- [x] PERF-12 Retain two recent exact large morph tiles per family; preserve the existing byte budget. Matched Intel/NVIDIA runs eliminate warmed global evictions and new surface bytes. Each adapter passes 94 exact full-scene comparisons, with zero differing bytes.
- [x] PERF-13 Capture browser raster/compositor/GPU-process host traces and matched visible Intel/NVIDIA/software runs on this machine. CDP confirms actual adapter selection. Traces measure host spans and process CPU time, not physical GPU execution or scanout.
- [x] PERF-14 Index immutable scene/customer metadata and avoid copied hit arrays. Sixty five-customer draws reduce metadata queries from 3060 to 6; fifteen real-source scenes retain identical complete submission digests. Hover omission showed no meaningful gain, so precise input remains unchanged. Prior HUD overhead controls are retained.
- [x] PERF-15 Evaluate further presentation interpolation against source semantics and measured cost. Retain existing eligible menu/traffic interpolation; no additional interpolation is justified. Food, customer, tutorial and smoke clocks carry authored 12 Hz meaning. More generated poses do not resolve the measured allocation/compositing cost and risk source parity. This task is resolved by investigation, not a claim of new interpolation.

The historical sequencing is in performance-follow-up.md. The completed implementation, comparisons and final acceptance are in performance-gpu.md and tests/reference/performance-gpu.json.

At the prior checkpoint, PERF-7–11 had 117 passing tests and UI checks, while PERF-12–15 and PERF-5 were still open. The continuation below supersedes that status. Physical touch hardware remains untested.

## Completed visible Chrome continuation

PERF-5 and PERF-12–15 now have recorded implementation or investigation outcomes. At 1485×1080, warmed 0/1/3/18-slot gameplay measures 93.65–102.54 draws/s on Intel and 211.07–238.44 on NVIDIA, with no sampled gaps above 50 ms or new tile allocations. Three-slot 825×600 play reaches 236.64/238.57 draws/s. The NVIDIA full 180-second day completes with cash 24, 237.01 draws/s, p95/p99 4.3/8.2 ms and no sampled gap above 50 ms. Cold first-appearance stalls are retained in the report, not hidden by warmed averages.

All 121 automated tests pass. Source and generated-site mouse/audio/fullscreen/quality persistence/narrow viewport/tab-return checks pass; each checks the real game frame counter advances during its 30-second window. Exact morph pixels pass 188/188 across both adapters. GPU filter, composition, complete gameplay scenarios and verification-runner re-entry protection pass. Detailed evidence and trace limitations: [performance-gpu.md](performance-gpu.md). Historical in-app-browser results above remain valid for that different environment. These results do not certify physical 240 Hz presentation, 240 unique authored poses, other engines or physical touch hardware.
