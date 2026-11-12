# Performance follow-up

> Historical study for the implementation and workload recorded below. Its
> measurements are not current-release guarantees. Start with the
> [current performance summary](../README.md).


Historical study checkpoint. Its follow-up implementation and actual Intel/NVIDIA/software validation are now complete; see [performance-gpu.md](gpu.md) and [performance-plan.md](../../planning/performance-plan.md). The original numbers below are retained for their original environment.

The user-reported stutter is real acceptance feedback. Original implementation work and initial optimization experiments exist; the earlier completed PERF-5 checkbox overstated validation. PERF-5 remains open. Monitoring, bowl discoverability and selectable render resolution are new requested UI features; attribution, pacing, actual-browser validation and long-session memory complete existing performance work.

## Method and limits

The development verification page now has **Run component study** and **Graphics and memory details**. The study shows a fully visible 990 × 720 CSS stage, DPR 1.5, backing 1485 × 1080. It independently omits griddle steam, dosa steam, traffic, customers, radio and background; disables hover hit tests; suspends/resumes an actual AudioContext; compares HUD disabled/enabled, half-resolution drawing and GPU/CPU filters. It ends with a repeated full baseline and idle rAF scheduling. Diagnostic omissions are reset after the run and are never a shipping quality setting.

This is a synthetic renderer fixture with all five customer identities, three mixed-side dosas, a carried cooked dosa, moving pointer and continuous simulation timestamps. It is not a matched source/gameplay replay. Normal rule timing is unchanged. JavaScript group timers measure submission work; they do not measure deferred rasterization, composition, GPU execution or physical display latency. Timings include diagnostic group instrumentation in every variant. The first sweep used 2 seconds warmup and 6 seconds sampling; it had baseline drift and two large scheduling interruptions, so individual deltas are exploratory. The confirmation sweep warms a complete 6-second visual cycle before sampling the following 6 seconds. Warmup does not guarantee cache residency: eviction is measured explicitly.

The old 30-second bot rendered timestamps quantized to source ticks. It is corrected to advance continuous time while issuing commands on the same source tick boundaries. This was a coverage flaw; the quantized-vs-continuous control does **not** establish interpolation as the dominant performance cause. Previous results remain historical measurements of that older harness.

## Confirmation measurements

Full scene baseline A/B: **49.61 / 49.18 draws per second**, a 0.9% spread. These are rAF/draw opportunities, not proof of physical display FPS. No baseline gap exceeded 50 ms, but p95 is about 42 ms: this fails the existing stable 60 Hz target.

| Variant | Draws/s | rAF p95 / p99, ms | New tile MiB | Evictions |
|---|---:|---:|---:|---:|
| continuous baseline A | 49.61 | 42.1 / 42.7 | 23.09 | 421 |
| quantized12Hz control | 50.47 | 41.7 / 42.2 | 22.69 | 419 |
| without griddle steam | 50.40 | 42.0 / 42.7 | 11.42 | 365 |
| without dosa steam | 50.17 | 24.2 / 24.6 | 7.76 | 349 |
| without traffic | 49.94 | 41.8 / 45.2 | 19.45 | 418 |
| without customers | 53.25 | 23.9 / 24.4 | 0.18 | 0 |
| without radio | 49.49 | 41.9 / 43.2 | 22.91 | 421 |
| without background | 58.45 | 36.0 / 36.5 | 12.38 | 392 |
| without hit tests | 49.45 | 42.0 / 45.5 | 23.06 | 420 |
| audio running | 49.37 | 41.6 / 46.2 | 23.09 | 421 |
| HUD enabled expanded | 49.05 | 42.0 / 45.9 | 23.09 | 421 |
| 50% render scale | 69.54 | 29.9 / 30.4 | 3.40 | 403 |
| CPU filters | 38.95 | 92.3 / 96.0 | 22.92 | 420 |
| continuous baseline B | 49.18 | 42.0 / 42.9 | 23.09 | 421 |
| idle scheduling no drawing | 167.54 | 6.3 / 6.7 | 0.00 | 0 |

The strongest isolated pacing improvements are **dosa steam** (p95 42.1 to 24.2 ms) and **customers** (23.9 ms). Background removal improves throughput to 58.45/s; it is a cost-isolation experiment, not a proposed removal of artwork. Griddle steam is a large memory consumer, but omitting it alone barely changes pacing. Traffic, radio and audio do not show a dominant effect in this fixture. Omissions change cache pressure and composition together, so these deltas are not additive GPU percentages.

Baseline JavaScript submission averages per root category: customers **1.59–1.73 ms**, other root objects **1.40–1.52**, food including first-side steam **0.50–0.53**, background **0.42–0.49**, traffic **0.33–0.36**, radio **0.17–0.21**, griddle including its black base **0.09–0.10**, second-side steam **0.08–0.09**. The short JS durations compared with 42 ms frame gaps, together with resolution sensitivity, implicate work after submission; an OS/browser graphics trace is still needed to partition that precisely.

Forcing filters onto the CPU makes food submission average **17.53 ms**, p95 draw time **91.3 ms**, with **43 gaps above 50 ms**. Keep the working GPU filter path. The active context reports zero required CPU fallbacks in the GPU variants. Half-resolution drawing gives **69.54/s** and p95 **29.9 ms**, a useful optional tradeoff but still not the stable 60 Hz acceptance target. Idle scheduling without drawing gives **167.54/s** in this environment; no 240 Hz capability has been established.

The expanded HUD records **11.9 ms across 501 completed calls: about 0.024 ms/sample**, excluding subsequent browser paint. HUD-enabled throughput is 49.05/s versus 49.18–49.61/s disabled: a small difference near the baseline variation, not a precise causal percentage. The display uses fixed 256-element buffers and one DOM refresh per second; disabled instrumentation does not take per-frame measurement clocks. Audio actually runs two sources in its variant (49.37/s), while other variants suspend the context; muting game music alone would not be an equivalent control.

The raw summary, byte counts and exploratory first sweep are retained in [performance-follow-up.json](../../../tests/reference/performance-follow-up.json). The clean second sweep supersedes the interrupted first sweep for attribution.

A separate corrected **production-core** 30-second bot replay with three cooking slots at825x600 gives **85.25/s warm**, rAF p50/p95/p99 **12.0/18.1/18.5 ms**, maximum23.9ms, zero gaps above25ms, zero new tile bytes and zero evictions. Its cold run had a1.53-second scheduling interruption and is retained with that qualification. This is a smaller/lighter scenario than the five-character synthetic fixture; it does not reproduce all reported real-input stutter. The historical125-126/s figure is superseded for the corrected clock and current environment.

## Graphics and memory

The active **WebGL2 filter context** identifies `ANGLE Intel UHD Graphics, Direct3D11`; its attributes report default power preference, and actual GPU filter applications succeed without required CPU fallbacks. Registry enumeration also found NVIDIA GeForce RTX 3070 Ti Laptop GPU installed. Installed NVIDIA hardware does not prove the browser uses it. The WebGL identity describes the filter context, not independently the Canvas2D compositor or an operating-system GPU utilization percentage.

In the first full fixture, source steam symbol 223 occupies about 32.2 MiB of retained tiles, including the stretched griddle steam and small food instances. Total tiles approach the 80 MiB budget. The renderer also has a **512-entry** eviction limit: at half resolution, evictions occurred with only about 24.8 MiB of tiles. That is a concrete cache-pressure mechanism even on a small canvas, not proof that every eviction causes a visible stall. Two decoded audio buffers account for about 30.3 MiB separately. Surface accounting excludes path/JS object overhead, browser copies, process RAM and driver VRAM.

## Next implementation and test order

1. **PERF-12 — cache retention.** Diagnose eviction reason and reuse distance per source symbol. Start with the twelve large griddle-steam phases and repeatedly used customer morph shapes. Test admission/retention rules and alpha-independent reuse within the existing byte budget; avoid retaining one-use variants that displace reusable assets. Measure both entry-count and byte-pressure eviction at 100% and 50%. Accept only pixel-preserving changes with lower allocations and p95/p99 frame gaps in matched cold/warm replays.
2. **PERF-13 — raster/composition and adapter comparison.** In the target browser, record a performance trace containing main thread, raster/compositor and GPU work, alongside the same visible fixture. Compare Intel versus NVIDIA with the active adapter verified after browser restart; also compare hardware acceleration enabled/disabled without making a permanent settings change. Keep dimensions, DPR, refresh rate, power mode and all other workloads equal. The current tool surface cannot capture that process-level trace or select the Windows GPU preference. A WebGL power hint alone is not an adapter selection test.
3. **PERF-14 — remaining continuous CPU work.** Use measured group submission costs to inspect customer morph/cache lookups and the miscellaneous root placements first. Memoize hover tests only when pointer, pose and transform are unchanged; retain precise press/release behavior. Compare instrumentation disabled, collapsed HUD and expanded HUD. Do not rewrite audio based on suspicion alone.
4. **PERF-15 — authored animation pacing.** Independently compare source 12 Hz poses with eligible presentation interpolation. Preserve exact source poses at source sample times, clip stops/jumps, replacements, and every cooking/patience/score deadline. Count unique presented poses separately from rAF callbacks. Stable rendering alone cannot create extra authored animation poses.
5. **PERF-5 acceptance rerun.** Repeat actual gameplay with idle/1/3/18 dosas, five customers, carried plate, rapid physical input, menu/tutorial, day transitions, resize/fullscreen and tab return. Record cold/warm 30-second distributions plus a long session and peak retained memory in the actual user browser. Keep the existing 60 Hz p95/p99 targets; 144/240 Hz must have separate measured frame budgets. Do not close acceptance from one average FPS value.

The half-resolution option is a user-selected tradeoff: each backing dimension is approximately halved, so pixel count is approximately one quarter. Source vectors and geometry stay intact; 100% redraws them sharply. It is not a claim that all bottlenecks have been fixed or that the GPU delivers hundreds of frames per second.

## API interpretation

- [MDN: performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory) documents the nonstandard and unreliable/shared nature of that heap estimate. The HUD labels it accordingly rather than calling it game RAM.
- [MDN: WEBGL_debug_renderer_info](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info) describes optional driver identity, which can be restricted for privacy. The implementation queries the existing filter context once and reports unavailable if needed.
- [Chrome: Canvas2D](https://developer.chrome.com/blog/canvas2d) explains that frequent-readback hints can favor a CPU path. Readback-oriented canvases and the main drawing canvas should be profiled separately; setting that hint everywhere is not a general acceleration fix.

Measurements are local only, with no telemetry endpoint. The detailed study remains development-only; the shipped game includes only the small optional HUD and quality controls.


## Delivery checks

117 tests pass, with no skips or failures. The real game UI passed bowl selection/highlight, persistent half-resolution, restored full resolution, HUD disable/enable and fullscreen. The generated static site passed menu-to-gameplay and a390px viewport with no horizontal overflow and a visible bowl cue. CSS coordinates remain990x720 while backing pixels change1485x1080 to743x540. The development study link is omitted from the standalone release because verification code is excluded. No physical touch or NVIDIA adapter test is claimed.
