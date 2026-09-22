# Complete frame cost and retained scenery

Follow-up: [refresh and visibility calibration](performance-cadence.md) separates
normal display scheduling from slow drawing. The results below use the earlier
emulated viewport; they do not establish native window containment. Near-60
callback rates are not automatically failures or proof of physical scanout.

**Stable 60 FPS with low CPU use is still an open target.** The new Extra
scene cache improves the controlled five-customer scene to approximately 60 FPS
on both Pi 5 environments. A complete three-minute day still reaches only
55.93 FPS on Pi A and 59.67 FPS on Pi B. The short fixture is not sufficient
acceptance for the whole game.

This report extends the [component ranking](performance-components.md) beyond
individual effects. [Anonymous measurements](../tests/reference/performance-pipeline.json)
contain 66 physical Pi cases, CPU samples, browser trace summaries and submission
counts. Raw profiles, trace files and connection details are excluded from Git.

## What actually costs resources

| Priority | Work | Evidence | Consequence |
| --- | --- | --- | --- |
| 1 | Repainting and presenting the Canvas surface | Freezing all scene state while still redrawing leaves Pi A at 45.62 FPS. Skipping bitmap paints reaches 60.00. Native presentation spans dominate its graphics-process host trace. | Stopping a few animations does not remove the principal recurring cost. Reduce repeated scene composition and presentation work. |
| 2 | Repeated vector traversal and Canvas submission | About 96 image paints, 151 save/restore pairs, 132 transform reads and nine text paints per fixture frame. CPU samples repeatedly enter vector bounds, cache lookup and native Canvas calls. | Retain unchanged scene output; do not recompute and resubmit it for every pointer update. |
| 3 | First appearances and screen transitions | The real day has cold gaps up to 383.5 / 299.3 ms. Its final day-result draw takes 275.4 / 195.3 ms. | Prepare expensive new artwork outside the interaction-critical frame, with a bounded memory budget. |
| 4 | Retained graphics and decoded audio memory | The complete day peaks at 206.4 MiB of accounted graphics plus decoded audio. Decoded audio alone reaches 85.6 MiB. | Investigate PCM lifetime or streaming separately; smaller MP3 files do not directly reduce decoded-buffer memory. |
| Lower | Game simulation, commands, snapshots and audio CPU | Simulation plus bot commands/audio handling has p95 0.3 ms on both Pi boards. Snapshot p95 is 0.3 / 0.2 ms. Pi A audio-service CPU is about 1.6% of one core. | These are not the main frame-rate bottleneck in the measured day. |

The stage-bounded destination rectangles of those image paints total about
9.46 million pixels per frame on a 3.52 million pixel canvas. This is an area
estimate before source masking, not a measurement of physical GPU fragments.
Background contributes 3.52 million, griddle base/steam 1.42 million, table
placements 0.88 million and order decoration 0.49 million. Transparent regions
and overlapping rectangles are included. The ten table placements have distinct
transforms; they are not ten identical duplicate paints.

The JavaScript samples spend approximately 59–62% of elapsed time in the idle
category. That does not mean the graphics pipeline is idle. CPU use must also
include the browser's graphics process and compositor, and presentation can
wait even while the main thread is free.

## Controlled experiments

Both environments are Pi 5 / 8 GB with V3D hardware acceleration. A uses X11,
Chromium 138 and Mesa 24.2.8; B uses Wayland, Chromium 151 and Mesa 26.2.0.
Those combined differences do not establish one particular driver as the cause.
Every case keeps the 2200 × 1600 canvas fully visible at 100% render scale.
Ordinary fixture cases warm for 18 seconds and measure for 12 seconds. Repeated
controls bracket each matrix. No thermal or undervoltage flag was observed.

| Diagnostic | Pi A FPS | Pi B FPS | Interpretation |
| --- | ---: | ---: | --- |
| Previous Extra scene | 45.54 | 59.67 | Reference for the workload sweep |
| Same state frozen, still redrawn | 45.62 | 59.50 | Advancing the animations is not the primary cost |
| No bitmap paints | 60.00 | 60.00 | Removes real image work; not a playable optimization |
| No text | 45.77 | 59.58 | Text is not the main limit |
| No hit tests | 45.62 | 59.67 | Removing selection precision would not solve it |
| Painted once, then untouched | 59.97 | 60.00 | Scheduling alone sustains 60 opportunities per second |
| One opaque Canvas copy per frame | 60.00 | 60.00 | Native source/composition choices matter |
| One ImageBitmap copy per frame | 50.86 | 60.00 | ImageBitmap is not automatically faster here |
| Existing scene with desynchronized context | 59.09 | 60.00 | Better short-run cadence, still high CPU use |
| Retained Canvas commands | 45.77 | 59.75 | Saves CPU work but does not remove Pi A's presentation limit |
| Retained opaque scene, ordinary context | 59.58 | 60.00 | Selected Extra implementation candidate |

Removing the seemingly redundant full-stage clear **made the scene slower**:
37.61 / 50.01 FPS. Replacing only the background tile with an opaque copy gave
no meaningful gain. Neither treatment ships. The command cache passed 90 exact
pixel/hit comparisons and reduced median JavaScript draw time from 6.6 to 5.1 ms
on A and 5.0 to 3.9 ms on B, but remains an experiment. Desynchronized contexts
also remain an experiment; no browser flags or system settings were changed.

A further browser-layer experiment kept the background surface untouched between
scene changes and rendered food/feedback into a transparent foreground canvas.
It avoided about 1,350–1,420 background copies per run but did not improve the
result: 59.33 / 59.91 FPS, with warmed CPU 61.23% / 56.22% of one core versus
58.22–58.80% / 52.90–55.08% for its repeated retained-scene controls. It also
failed 24 of 360 pixel cases at a 2/255 tolerance, with maximum channel error
94; hit targets still matched. This full-size overlay design is rejected and
does not ship. Its additional 13.4 MiB foreground surface is reported separately.

During the five-second traced Pi A control, `RealSwapBuffers` host spans average
15.83 ms across 227 calls. With retained scenery they average 8.27 ms across 298
calls. Animation callback spans fall from about 7.79 to 2.79 ms per callback.
These are elapsed browser/driver host spans, including waits. They overlap other
events and must not be added together as CPU usage or called GPU execution time.
Trace startup itself adds a gap, so traced runs are attribution, not acceptance.

## Implemented in Extra

Extra retains an opaque scenery surface between changes in the authored poses,
clock, customers, orders, patience, money or mute-button state. Food, carried
items, hover cues and cash feedback still render at each animation-frame
opportunity. Traffic now uses its original 12 Hz poses during play; menu
interpolation remains. This is an explicit Extra presentation treatment, not a
claim of 60 distinct original animation poses per second.

The surface is generated from vectors at the selected backing resolution and is
rebuilt after resizing. It costs 13.4 MiB at 2200 × 1600 and has a separate
32 MiB cap; larger surfaces use the ordinary renderer. The HUD includes its
memory. Screen/profile/scale changes release it. A live scene key includes
functional order/patience values, authored hit frames and hover/pressed state.
Classic and the unselected compatibility presentation keep their previous path.
The shipping-default decision remains open.

Verification: 128 automated tests pass. A second real Canvas compares cached
and uncached output across 360 cases with zero differing bytes and equal hit
targets, including same-time state changes, screens, profile round trips and
880/2200/2970 backing widths. The standalone and static site are rebuilt.
Visible isolated Intel/NVIDIA checks pass for both packages and the source,
including cooking, live profile changes, fullscreen, responsive layout, emulated
touch and restricted offline storage. This is not physical touchscreen evidence.

## Complete real-time day

The production core, renderer and audio run for 180 seconds with a deterministic
three-slot command bot and a continuously moving pointer. Both finish at
day-result, cash 24, clock 720. No asset download failed. The unresolved original
`serve` sound name is the already documented source behavior, not a new failure.
Audio is activated and receives the real game events; source stop-all events
are preserved. The CPU window below is the final 150 seconds.

| Measurement | Pi A | Pi B |
| --- | ---: | ---: |
| Whole-day FPS | 55.93 | 59.67 |
| FPS after first 30 seconds | 55.62 | 59.85 |
| Warm rAF p95 / p99, ms | 33.3 / 33.4 | 17.4 / 17.4 |
| Warm median JS draw, ms | 4.5 | 3.6 |
| Warm aggregate browser CPU, one core = 100% | 80.96% | 76.17% |
| Equivalent fraction of four cores | 20.24% | 19.04% |
| Largest measured cold rAF gap, ms | 383.5 | 299.3 |
| Final day-result draw, ms | 275.4 | 195.3 |

Warm rAF samples have no gap above 50 ms, but the final draw's delay occurs
after the last sampled rAF; it remains an explicitly reported transition stall.
The command bot is not a substitute for the separate real pointer/UI checks.
The earlier 54–59% CPU fixture result must not be presented as full-day CPU use.
Pi A fails cadence acceptance and both miss the initial 40%-of-one-core CPU
engineering budget. PERF-17 and PERF-22 remain open.

## Next priorities

1. Reduce the area redrawn/presented when only food/pointer feedback changes.
   The tested full-size browser overlay is rejected, so merely splitting the
   current canvas is not a solution. Investigate bounded region repainting or
   a genuinely smaller dynamic surface, preserving painter order and measuring
   the actual presented result. Any new design needs fresh pixel and Pi checks.
2. Attribute cache hits, misses and stage-copy cost throughout the complete day,
   rather than extrapolating from a fixed customer pose. Repeat warmed process
   CPU measurement and the full day before accepting any new path.
3. Prepare cold gameplay and closing artwork incrementally within a bounded
   frame budget. Include the final transition's presentation in acceptance.
4. Reduce decoded audio retention separately, preserving source sample quality
   and event/loop/cancellation semantics. Do not remove music to chase FPS.

Reproduction: `tools/pi-performance.mjs` accepts the `workload`, `transport`,
`pipeline`, `scene`, `trace`, `layers` and `live` presets. Connection arguments stay local.
The earlier experimental sweeps explicitly select the previous Extra behavior;
`live` uses the production Extra renderer. Pixel checks are in
`tools/scene-retention-check.mjs`; raw outputs stay under ignored `.local-setup`.
Its optional `--layers` mode reproduces the rejected prototype and is expected
to fail pixel acceptance; ordinary checks exercise only the shipped renderer.
