# Full resolution rendering

> Historical study for the implementation and workload recorded below. Its
> measurements are not current-release guarantees. Start with the
> [current performance summary](../README.md).


The fixed 80 MiB surface cache caused severe repeated work above the earlier
1485 × 1080 benchmark size. At 2200 × 1600 on Intel UHD, the same synthetic scene
fell from about 118 to 5 render opportunities per second. This is separate from
the original 12 Hz animation poses.

## Diagnosis and correction

The repeating scene needs about 140 MiB of retained tiles at 2200 × 1600.
An 80 MiB limit evicted blurred griddle steam, symbol 223, throughout the replay.
The six second measured window recorded 379 evictions and 94 filter builds.
Removing only griddle steam raised throughput from 5.33 to 60.66/s. Removing
dosa steam or traffic left it near 5/s; removing customers reached 13.08/s.
These omissions are diagnostic controls and do not ship. This fixture has no audio.

A separate 192 MiB capacity experiment reached 57.50 and 58.62/s with zero
evictions. Repeating the fixed 80 MiB control returned to 5.17/s, confirming
cache pressure as a cause.

The renderer now sizes its tile limit from actual backing pixels, including
device pixel ratio and the selected render scale:

`clamp(80 MiB × backing pixels / (1485 × 1080), 80 MiB, 384 MiB)`

Memory is allocated on demand. The 512 entry cap and 16 MiB reusable surface
pool remain. Resizing releases old density surfaces and filter storage; repeated
draws at unchanged dimensions retain them. Geometry, sampling density, filters,
animation clocks and input mappings are unchanged.

## Intel measurements

Visible isolated Chrome uses verified Intel UHD ANGLE/D3D11 with accelerated
Canvas and composition. The fixture has five customers, three varied dosas and
a carried plate. Each run has six seconds of warmup followed by six seconds of
measurement. Dimensions below are backing pixels at 100% render scale, not CSS.

| Scene | Before, draws/s | After, draws/s | After p95 frame gap |
| --- | ---: | ---: | ---: |
| Fixture, 1485 × 1080 | 117.83 | 118.21 | 12.2 ms |
| Fixture, 2200 × 1600 | 5.33; repeat 5.17 | 58.37; repeat 57.84 | 29.6; 29.9 ms |
| Fixture, 2970 × 2160 | Not measured | 26.56 | 65.0 ms |
| Production core, three slots, cold, 2200 × 1600 | Not measured | 58.86 | 29.6 ms |
| Production core, three slots, warm, 2200 × 1600 | Not measured | 63.93 | 18.4 ms |

Production core runs last 30 seconds each with the existing command bot and
renderer. Both remain in play and earn cash 2. They are automated gameplay,
not manual input or audio coverage. Warm gameplay allocates zero new tile bytes,
evicts zero tiles and has zero gaps above 50 ms; its maximum gap is 42.3 ms.
Cold gameplay has 13 gaps above 50 ms, with a 250.6 ms maximum. First appearance
costs remain unresolved.

At 2200 × 1600 the fixed cache spends only about 4.6 ms median in JavaScript
draw submission but has a 205.5 ms median frame gap. Submission timing alone
misses the expensive asynchronous rendering work.

## Memory and remaining limits

A matched NVIDIA RTX 3070 Ti control at 2200 × 1600 reaches 166.89/s with the
fixed limit and 167.75/s with adaptive retention. Evictions fall from 745 to
zero, new tile allocation from 439,850,188 bytes to zero, and filter builds from
216 to zero. NVIDIA largely hides the old repeated work; Intel does not. These
callback rates are specific to the visible browser environment, not GPU ratings.

The improvement uses more retained memory. Accounted tile, pool and filter
backing storage in the 2200 fixture rises from about 116 MiB to 171 MiB. This
is surface accounting, not total process RAM or physical VRAM. At 2970 × 2160
it is about 305 MiB. The 384 MiB cap applies only to retained tiles; pool,
filter resources, browser copies, JS and audio are additional.

The 2970 run still has 31 gaps above 50 ms, a 549.7 ms maximum, and 51 filter
builds after its short warmup, despite zero evictions. This resolution is
**not accepted as smooth**. Longer warmup and filter/compositor attribution
are required before another change. Unbounded memory growth is not a solution.

Raspberry Pi was outside this initial Intel matrix. Subsequent physical results
are in [performance-raspberry-pi.md](raspberry-pi.md); Intel results
alone do not certify it.
Animation callbacks do not measure physical display scanout. Original food,
customer and steam poses still advance at their authored 12 Hz.

## Verification and reproduction

All 124 automated tests pass. A deterministic replay reproduces 727 evictions
and 214 filter builds at the old large canvas limit, versus zero of either with
the new limit after warming. Resize tests verify release, retention and the cap.

Visible browser comparisons pass 94 complete scenes at 1485 × 1080 and
2200 × 1600: exact RGBA hashes and hit lists match across cache policies;
resizing away and back restores the same result. The pixel test uses a
`willReadFrequently` destination canvas to keep repeated readback on a stable
backend; GPU filters remain enabled. Pixel tests are separate from timing runs
and do not claim historical Adobe or cross browser equality.

Both tracked distributions are rebuilt. Isolated HTTP roots pass for site and
standalone packages with no missing files or browser errors. With network
blocked, the source entry, standalone HTML copied alone, and static release
entry pass tutorial, pouring, flipping, pickup, plating, audio decoding and
native fullscreen. All eleven sounds decode; no network request is required.

Build development modules and run the normal local server first. From the
repository root with the installed Node runtime:

```text
node tools/full-resolution-study.mjs full-resolution low-power
node tools/full-resolution-study.mjs full-resolution-nvidia high-performance
node tools/performance-browser.mjs low-power gameplay full-resolution-gameplay --slots=3 --width=2200
node tools/resolution-pixel-check.mjs
```

The study accepts an optional JSON case array as its third argument, for
example `[{"width":2200,"fixedBudget":true},{"width":2200}]`. Fixed budget and
omissions exist only in the test runner. Browsers are visible and isolated.
Raw output remains under ignored `.local-setup/logs/`.

Sanitized data: [performance-full-resolution.json](../../../tests/reference/performance-full-resolution.json).
Earlier acceptance in [performance-gpu.md](gpu.md) covers its
smaller resolution matrix; it does not close the remaining cases here.
