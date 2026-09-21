# Raspberry Pi rendering measurements

Two physical Raspberry Pi 5 boards with 8 GB RAM were tested with the game
renderer from commit `6f033eb`. Both use hardware accelerated Broadcom V3D
7.1.7.0 through ANGLE/OpenGL ES. Canvas, rasterization and composition are
accelerated. Native screen dimensions are 1920 × 1080; idle callbacks run near 60/s.

| Environment | Pi A | Pi B |
| --- | --- | --- |
| Desktop | X11 | Wayland |
| Chromium | 138.0.7204.92 | 151.0.7922.173 |
| Mesa | 24.2.8 | 26.2.0 |
| Kernel | 6.6.70-v8+ | 6.18.39+rpt-rpi-2712 |

These configurations differ in several variables. Results do not establish
that changing Chromium, Mesa or the compositor alone would cause the difference.

## Production gameplay

Each row is a 30 second run of the production core and renderer, driven by the
existing three slot command bot. Cold runs clear the tile cache; warm runs repeat
the same workload without clearing it. Render scale stays at 100%.

| Backing size and cache | Pi A draws/s | Pi B draws/s | Pi A / B p95 gap | Pi A / B maximum gap |
| --- | ---: | ---: | --- | --- |
| 1485 × 1080, cold | 56.34 | 57.50 | 16.8 / 17.3 ms | 450.6 / 166.6 ms |
| 1485 × 1080, warm | 60.00 | 60.00 | 16.7 / 17.3 ms | 17.4 / 17.5 ms |
| 2200 × 1600, cold | 31.55 | 45.14 | 34.0 / 34.0 ms | 500.2 / 788.8 ms |
| 2200 × 1600, warm | 39.62 | 52.21 | 33.9 / 34.0 ms | 34.1 / 34.1 ms |

Every warm run has zero new tile allocation, zero cache evictions and zero
sampled gaps above 50 ms. Cold runs have 15 / 11 such gaps at 1485 × 1080 and
20 / 16 at 2200 × 1600. A high average therefore does not make the cold stalls
acceptable. At the larger size, warm rendering also misses many 60 Hz deadlines.

Managed backing storage in these gameplay runs is about 80.4 MiB at 1485 × 1080
and 177.3 MiB at 2200 × 1600. Post-run browser proportional set size is roughly
500–536 MiB on Pi A and 628–660 MiB on Pi B. PSS covers readable browser
processes, not isolated game memory, GPU allocation or a sampled peak.

## Cache regression control

The five customer synthetic fixture uses the same shared measurement function
as the desktop study. Six seconds of warmup are followed by six measured seconds.

| Fixture | Pi A draws/s | Pi B draws/s |
| --- | ---: | ---: |
| 880 × 640, current cache | 59.83 | 60.00 |
| 1485 × 1080, current cache | 59.17 | 60.00 |
| 2200 × 1600, former fixed 80 MiB limit | 5.44 | 4.74 |
| 2200 × 1600, current adaptive limit | 29.44 | 56.23 |
| 2200 × 1600, adaptive, griddle steam omitted | 37.40 | 49.39 |

The fixed limit causes 278 / 291 evictions; adaptive retention causes zero.
The last row is diagnostic only. Omission did not improve Pi B throughput in
that short run, so it is not evidence for deleting steam as a general remedy.
Shipping effects are unchanged.

Repeating the full fixture with 18 seconds of warmup and 12 measured seconds
gives 36.18 / 54.67 draws/s. Both runs build zero new filtered tiles and have zero
gaps above 50 ms. Remaining sustained cost cannot be explained by cache eviction
or repeated filter creation in those warm windows.

Temperatures during the gameplay matrix reach about 54.6 / 55.7 °C. Every valid
sample reports `throttled=0x0`. No thermal or undervoltage throttling was observed;
these are sampled readings, not continuous power instrumentation. Browser CPU
time is retained as diagnostic data across loading and measurement, not physical
GPU utilization. The existing background workloads were not stopped.

## Method and limitations

Playwright controls the installed, visible Pi browsers through SSH/CDP. Isolated
profiles contain only test browsing. Game assets are served through a loopback
SSH tunnel; fixture asset loading completes before the timed rendering window.
No software renderer, desktop driver replacement or browser installation is used.

The fixture uses a 1480 × 1000 CSS viewport with emulated DPR 2 to reproduce
exact backing sizes from the desktop study. A 2200 × 1600 canvas is a density
stress test beyond the attached display's physical height. These are callback
and frame submission measurements, not scanout timing or 240 Hz certification.
Original authored poses remain at 12 Hz. Gameplay benchmarks do not include audio;
release UI tests exercise gesture activation separately.

An initial Pi A run was rejected because display power saving held even idle
callbacks near 1/s. The harness now checks idle cadence, temporarily wakes an
X11 display if required and restores its previous power state afterwards. Pi B
navigation initially stalled; the accepted runs use an isolated basic password
store and a real fixture page. No claim is made that a keyring prompt was directly
observed. Those setup failures are excluded from performance comparisons.

Both adapters pass all seven GPU filter pixel cases and all four retained
composition pixel cases. These check the native implementation's existing
reference tolerances, not historical Adobe or full-scene cross-browser equality.

Both shipped-site UI checks pass tutorial containment, mouse interaction, audio
activation, saved quality setting, HUD visibility, fullscreen, narrow layout and
return from another tab. The subsequent 30 second live game check runs near
59.7 callbacks/s at its observed 880 × 640 backing size, and the game's own
measured frame counter advances. No page errors occur. This is generated mouse
input, not physical touch or audible listening verification.

## Next priorities

1. Reduce cold first appearance stalls while preserving exact filter pixels and
   input timing. Measure filter preparation separately from ordinary drawing;
   avoid merely moving a long freeze into the first click.
2. Attribute sustained large surface work on the slower stack. Warm runs already
   have zero evictions and filter builds, so another cache increase is not the
   first action. Compare composition and texture transfer costs with bounded
   memory and equal pixels.
3. Use controlled same-device browser/backend comparisons before recommending a
   system upgrade or compositor change. The current two-stack comparison is an
   observation, not a causal experiment.

PERF-18 physical measurement is complete for this matrix. PERF-17 cold and high
density optimization remains open. No universal smoothness claim is made.
Production code and the two tracked distributions are unchanged in this test pass.

## Reproduce

Build development modules and start the normal local server on port 5173. Use a
known SSH host with batch authentication, installed Chromium, Python and an active
desktop session. The helper requires noninteractive sudo to discover and access
the desktop account, then drops privilege before launching Chromium. The browser
keeps its normal sandbox. No credentials or existing browser profiles are copied.

```text
node tools/pi-performance.mjs <ssh-target> <ssh-port> <unused-local-port> pi-study
```

An optional final JSON argument selects cases, for example:

```json
[
  {"width":2200,"warmupMs":18000,"measurementMs":12000},
  {"width":1485,"mode":"gameplay","cacheStart":"cold"},
  {"width":1485,"mode":"gameplay","cacheStart":"warm"},
  {"width":1485,"mode":"checks"},
  {"width":1485,"mode":"ui"}
]
```

Ports 9337 and 5178 must be free on the target. Helpers, profiles and raw logs
stay under `.local-setup`; the runner closes its browser and SSH tunnel after the
test. Only anonymous results belong in the repository:
[performance-raspberry-pi.json](../tests/reference/performance-raspberry-pi.json).
