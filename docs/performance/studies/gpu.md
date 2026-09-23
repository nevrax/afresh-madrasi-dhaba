# Verified adapter study and optimization

> Historical study for the implementation and workload recorded below. Its
> measurements are not current-release guarantees. Start with the
> [current performance summary](../README.md).


Later UI correction: fullscreen checks in this historical performance run confirmed DOM fullscreen only. Actual native-window fullscreen and browser chrome removal are now verified separately in verification.md under "Native fullscreen, menu edge and file launch". Adapter timings and cache results below are unchanged.

This continuation implements PERF-12/14 and verifies actual Intel/NVIDIA selection for PERF-13. It supersedes broad statements that NVIDIA or browser tracing were unavailable. Earlier in-app-browser results remain historical; their throughput must not be directly divided into the standalone Chrome result and called a GPU speedup.

## Reproduction and isolation

Tests use Playwright1.62.1 with a **visible separate Chrome153.0.8010.48**, a1280×850 viewport and DPR1.5. The full synthetic stage is990×720 CSS,1485×1080 backing pixels;50% changes backing dimensions to743×540. Six seconds warmup precedes each six-second sampling window. Runs are sequential, with the full old/new cache pair repeated. Hardware selection is checked twice: browser CDP SystemInfo confirms ANGLE and Canvas/raster/compositor acceleration; the actual filter context independently identifies the adapter. Neither merely-installed hardware nor a WebGL power hint is treated as selection evidence.

Production-core gameplay uses continuous simulation time, source-tick bot commands and30-second windows. "Cold" clears retained surfaces after resources/context initialization; it is not a network-load benchmark. "Warm" repeats the identical slot scenario with those caches retained. Resize/first-appearance stalls are recorded separately from steady-state acceptance. The live UI check uses actual pointer events and includes its own audio/HUD, at1753×1275 backing pixels after returning from a390px layout.

`--force-low-power-gpu --use-angle=d3d11` selected Intel UHD; `--force-high-performance-gpu --use-angle=d3d11` selected NVIDIA RTX3070Ti Laptop GPU. `--disable-gpu` reported software Canvas/composition/raster and SwiftShader WebGL. These are process-local settings in isolated profiles. Personal browser profiles, Windows GPU preferences and user tabs are untouched. The desktop remains available; unrelated user workload is not controlled, so outliers and drift remain visible.

Temporary profiles, raw traces and diagnostic logs stay under `.local-setup/`. Selected path-free evidence is retained in `tests/reference/performance-gpu.json`. `tools/performance-browser.mjs` reproduces `cache`, `paired`, `pixels`, `gameplay`, `long`, `ui` and `probe` runs; add `--trace` to a paired run. It uses an existing Chrome installation, optionally selected with `PLAYWRIGHT_CHROME`. `tools/setup-playwright.ps1` installs the pinned package only in `.local-setup/playwright`; `PLAYWRIGHT_MODULE` can instead select an existing installation. `tools/summarize-render-trace.py` creates a safe numeric summary. `scripts/21_play-nvidia.cmd` builds, starts/reuses the local server, and opens an isolated visible GPU browser without changing the normal launcher.

## Measured cache/adapter comparison

| Adapter, full scene | Cache | Draws/s A / B | rAF p95 A / B | rAF p99 A / B | New tile bytes /6s | Global evictions /6s |
|---|---|---:|---:|---:|---:|---:|
| Intel100% | previous |101.03 /112.18|16.8 /16.7ms|33.4 /20.8ms|24,212,676|421|
| Intel100% | recent poses |113.51 /113.35|12.5 /12.5ms|12.6 /12.6ms|0|0|
| NVIDIA100% | previous |238.33 /236.83|4.3 /4.3ms|4.4 /8.3ms|24,212,676|421|
| NVIDIA100% | recent poses |237.50 /237.18|4.3 /4.3ms|8.2 /8.2ms|0|0|

Intel's first old-policy run had two gaps above50ms and a79.1ms maximum; the second had none and a21.0ms maximum. Both new runs had none and maxima12.7/12.8ms. Do not quote the entire first-to-new throughput difference as a stable cache speedup: the old baselines drifted. Pacing and allocation improvements reproduce in both comparisons. NVIDIA is already near the observed240Hz callback ceiling; its cache change has **no demonstrated FPS improvement**, while eliminating churn and reducing retained memory.

At50%, Intel old/new gives238.01/238.33s⁻¹ and NVIDIA237.34/238.17s⁻¹. Old policy causes403 entry-limit evictions and3,562,052 new bytes per window even though the80MiB byte budget is not full. New policy causes zero of both. Software rendering at100% gives15.33/15.54s⁻¹, p95 about66.6–66.8ms and repeated half-second stalls;50% gives63.95s⁻¹, p9516.8ms. Software warmup misses some poses and still allocates tiles; it must not be described as fully resident.

The matched new-policy full-resolution ratio is roughly2.1× NVIDIA/Intel in this fixture. On this tested system, GPU/backend selection and resolution affect pacing much more than music or radio. The earlier component omissions still identify customer/food steam interactions; they are not additive percentages and no content is removed in the release.

## Accepted changes

PERF-12 retains two recent **exact** rasters per sufficiently large, unfiltered morph family, rather than allowing dozens of old customer-bubble poses at several densities to displace reusable steam. Ratio, geometry, transforms, tint, crop and raster scale remain in the exact tile key. The retired same-size surface is recycled before allocating. Small/filtered tiles retain their existing policy. Limits remain80MiB/512 entries plus16MiB reusable surfaces. Full-scene retained tiles fall from83,809,964 to69,924,956 bytes at100%, and26,372,880 to21,500,732 at50%.

Separate warm-history browser comparisons pass **94/94 full-scene frames on each adapter, zero differing RGBA pixels and identical hit lists**. Mock accounting reproduces421/403→0 global evictions and70→0 filter rebuilds; browser measurements confirm allocation/pacing effects. The new policy performs additional inexpensive exact morph redraws instead of keeping all historical bubble tiles. It does not convert source vectors to fixed-resolution assets.

PERF-14 indexes immutable frame1 scene/customer metadata per vector asset pack, computes matrices only for visible customer children, creates dynamic HUD values once per scene, and traverses hit targets without copying/reversing the list. Sixty five-customer draws reduce metadata queries3,060→6. A15-state real-source submission digest is unchanged, including effects, text, live poses, pointer queries and hit order. Asset replacement gets a fresh index. This proves removed work; no isolated FPS percentage is claimed.

PERF-15 is resolved as **no further interpolation change justified**. Cooking/holding, customer eating/exit, smoke lifetimes and tutorial stop/jump clocks carry source meaning. Existing eligible menu/traffic interpolation stays. The prior quantized control did not demonstrate these holds as the rendering bottleneck. Adding invented in-between poses would increase raster work and change authored motion without solving the measured problem. Hover memoization is likewise rejected here: omission produced no meaningful pacing gain, and precise live hit behavior is preserved.

## Browser pipeline evidence

Chrome traces include renderer, compositor and GPU-process host events; raw data is excluded from Git. Inclusive spans nest and overlap and must not be added into percentages or called physical GPU execution durations. Driver/presentation wait time may be included. Trace runs mix100%/50% windows and include cold warmup; their maximum spans are not steady-state gameplay maxima.

Across the paired trace, Intel reports DXGI Present11,845ms over5,276 calls (2.245ms/call), compared with NVIDIA6,119ms over8,315 calls (0.736ms/call). EndRaster/Flush is9,940ms over10,208 calls (0.974ms) versus10,130ms over13,243 (0.765ms). Frame callbacks are17,177ms/5,278 (3.254ms) versus20,107ms/8,317 (2.418ms). Different work counts and profiling overhead prevent a clean per-frame hardware execution decomposition, but this directly locates substantial host work in raster submission/flush/presentation, beyond game-rule JavaScript.

The Intel trace predates the metadata-index edit; NVIDIA's trace includes it. These trace averages describe their respective pipelines and are not a pure adapter-only CPU comparison. The untraced cache/adapter table above used matching renderer code on both adapters.

CDP process CPU deltas are retained separately. A GPU-process CPU second is **host CPU time**, not GPU utilization; renderer CPU includes browser/trace overhead and can include multiple threads. The normal HUD continues to label measured JS work and managed/shared memory honestly rather than inventing OSCPU/RAM/VRAM percentages.

## Final gameplay measurements

All rows use1485×1080 backing pixels, source-tick commands and continuous simulation time, with30seconds measured per row. The test exercises the production core/renderer; actual UI/audio are checked separately. All warm rows allocate zero new tile surfaces and have zero global evictions. Cold windows show first-appearance stalls, particularly on Intel; these are not hidden in warm averages.

| Adapter | Slots | Cache | Draws/s | rAF p95/p99 ms | Gaps >50ms | New tile MiB |
|---|---:|---|---:|---:|---:|---:|
|Intel|0|cold|99.89|12.7/16.8|10|55.29|
|Intel|0|warm|102.54|12.6/16.7|0|0.00|
|Intel|1|cold|99.54|16.6/20.9|13|68.33|
|Intel|1|warm|99.35|16.5/16.8|0|0.00|
|Intel|3|cold|98.31|16.6/20.9|12|68.94|
|Intel|3|warm|100.97|12.7/16.7|0|0.00|
|Intel|18|cold|90.71|16.7/24.8|13|68.94|
|Intel|18|warm|93.65|12.9/16.7|0|0.00|
|NVIDIA|0|cold|233.30|4.3/8.4|0|55.29|
|NVIDIA|0|warm|238.40|4.3/4.4|0|0.00|
|NVIDIA|1|cold|237.14|4.3/4.5|1|68.33|
|NVIDIA|1|warm|238.44|4.3/4.4|0|0.00|
|NVIDIA|3|cold|236.80|4.3/8.2|1|68.94|
|NVIDIA|3|warm|238.13|4.3/4.4|0|0.00|
|NVIDIA|18|cold|209.44|8.4/8.5|1|68.94|
|NVIDIA|18|warm|211.07|8.4/8.5|0|0.00|

At825×600 backing pixels, three-slot cold/warm runs measure235.34/236.64s⁻¹ on Intel and238.60/238.57s⁻¹ on NVIDIA, with p954.3ms throughout. Neither warm run has gaps above25ms or new tile allocations. The final runner explicitly requests Chromium sandboxing; the GPU-specific SystemInfo sandbox field remains false on this Windows/D3D11 configuration and is retained without treating it as a whole-browser security report. Initial cache/matrix/trace runs used Playwright's default launch setting; paired comparisons only compare matching settings.

A180-second three-slot session completes the actual day with cash24 and reaches day-result. It measures237.01s⁻¹, p95/p994.3/8.2ms, maximum41.5ms and no interval above50ms. Managed tile/pool/filter peak is97,163,316bytes(92.66MiB). The regular play samples settle at72,251,264tile bytes +38,144pool +12,058,624filter bytes; the result screen loads new art, yielding final retained tiles79.94MiB and117 bounded LRU evictions. Thus the entire day does not claim zero new allocations: total new backing allocations are85.85MiB including initial/result content. One-second heap samples show garbage collection rather than unbounded growth in this three-minute run; this is not an hours-long leak proof or total process/driver RAM measurement.

The saved Long Animation Frame observer includes setup before the rAF sampling window; its first200 entries are retained with that scope. Its count cannot be equated to the rAF >50ms counter. Warm0-slot Intel, for example, has a setup-inclusive LoAF entry despite zero sampled rAF gaps above50ms. Event Timing from the UI also reports only browser-selected entries at/above16ms and includes screen/fullscreen/cold-appearance transitions; it is not a complete physical input-latency distribution.

## Final acceptance

The strict build and all 121 tests pass (0 failures/skips, 28.65 seconds). Asset verification reports 636 entries, 2,672 media files, 49,477,091 media bytes and zero errors. Intel and NVIDIA each pass 94 exact full-scene cache comparisons, with identical hit lists and zero differing RGBA bytes. Final GPU filter fixtures pass 7/7, composition 4/4, and complete tutorial/cook/hold/plate/serve/payment/day/Tomorrow/three-retry scenarios pass. Attempted overlapping verification runs are rejected by the shared busy guard without corrupting the active report.

Both source and generated static site pass actual mouse navigation, bowl selection, audio gesture activation, saved half-resolution/reload/return to 100%, HUD disable/enable, fullscreen, 390-pixel viewport fit and tab-return checks, with no page errors. Their separate 30-second live UI windows at 1753×1275 measure 236.37/236.10 rAF callbacks/s, p95 4.3 ms, p99 8.3 ms and maximum 16.6/20.8 ms. The actual game HUD counters advance by 7,005/7,033 measured frames; loading and resource-error overlays remain hidden. This prevents a passing rAF-only probe over a stopped game.

The static site contains 2,845 files and 60,006,593 bytes. No SWF/WASM, reference/tool/verification directory or logs are included. The privacy scan passes across all 24 changed/new tracked-candidate files and all 2,845 release files, with no local account, user-directory or private-key markers. Sanitized measurements are retained in tests/reference/performance-gpu.json; profiles and raw traces remain ignored in .local-setup. PERF-5 and PERF-12–15 have completed outcomes for this matrix, with no pending native implementation item from the original plan.

Physical scanout latency, actual touchscreen hardware, untested browser engines and historical Flash device-font/waveform identity remain outside these automated checks. Cold first-appearance stalls remain measurable, especially on Intel; the detailed cold rows above are part of the delivered result.
