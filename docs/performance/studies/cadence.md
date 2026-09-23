# Refresh calibration and visible-window verification

> Historical study for the implementation and workload recorded below. Its
> measurements are not current-release guarantees. Start with the
> [current performance summary](../README.md).


The target is stable delivery at the display/browser's measured cadence with
low CPU, not an average numerically greater than 60. A 59.97 callback/s control
with no missed intervals is a successful nominal 60 Hz baseline. Callback rate
alone does not count distinct frames actually scanned out by the monitor.

`requestAnimationFrame` normally follows display scheduling. Background tabs
can stop receiving it. Chromium also tracks native window occlusion on Windows.
See [MDN's scheduling explanation](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
and [Chromium's native window occlusion documentation](https://chromium.googlesource.com/chromium/src/+/master/docs/windows_native_window_occlusion_tracking.md).

## Protocol

The calibration uses isolated, visible Chromium windows maximized on the real
desktop. Device metrics emulation is cleared. Every test records native window,
screen, viewport, device scale factor and canvas geometry. The 2200 × 1600
backing surface fits inside a 1100 × 800 CSS box; a separate small control has
an actual 16 × 16 backing surface. Hidden and unfocused samples are counted;
canvas containment is checked throughout. Desktop launchers retain normal
background and occlusion throttling behavior.

Each control settles for one second and measures ten seconds. The sequence is
an empty callback, a small surface, a tiny update on a large surface, a full
large-surface fill, and a full clear followed by a fill. These controls contain
no game assets, audio, customers or simulation. Normal controls were repeated.

Earlier game studies recorded document visibility and used a fixed emulated
viewport. They did not prove native window containment. Their relative
attribution remains useful, but they are not sufficient evidence of fully
visible native presentation. This continuation explicitly tests that condition.
Focus and geometry also do not constitute an operating-system capture of every
possible always-on-top overlay. Any loss of focus or visibility invalidates the
controlled acceptance run; arbitrary desktop occlusion must not be assumed safe.

## Normal scheduling

| Control | Pi A callbacks/s | Pi B callbacks/s | Intel callbacks/s |
| --- | ---: | ---: | ---: |
| Empty callback | 59.97 | 60.00 | 166.13 |
| Actual 16 × 16 surface | 60.01 | 60.00 | 160.83 |
| 16 × 16 update on 2200 × 1600 surface | 47.92 | 60.00 | 161.26 |
| Full fill, 2200 × 1600 | 50.52 | 60.00 | 163.91 |
| Full clear then full fill | 60.00 | 60.00 | 161.31 |

All these rows have zero hidden, unfocused or outside-viewport samples. On Pi A,
the slow large-surface rows repeatedly miss a refresh interval: p95 is 33.4 ms.
The empty, actual-small and clear/fill rows have p95 around 16.8 ms. Pi B stays
near 60 with p95 up to 17.4 ms. Intel's median is about 6 ms, but occasional
longer gaps occur even in these trivial controls. They must not be attributed
to game code.

Intel is not limited to 60 in this measured configuration. Windows' graphics
query reports 240 Hz at 2560 × 1440; Chromium's observed callback cadence is
about 166/s in the first controls. A final repeated native control reaches
239.99 empty, 240.01 small-surface, 240.00 tiny-update, 197.62 full-fill and
240.00 clear/fill callbacks/s. All remain visible and focused. The host cadence
changed between runs; its cause is unresolved. Neither callback number
establishes physical presentation rate without compositor/display evidence.

With the Canvas `desynchronized` hint, Pi A's tiny large-surface update and full
fill both reach about 60.00, at unchanged dimensions. Pi B remains near 60.
That is a controlled browser-path result, not proof of a particular driver bug
or a reason to remove game artwork. The hint remains experimental until full
game behavior, pacing, input, browser fallback and CPU are verified.

## Deliberately uncapped diagnostic

A separate temporary browser launch used `--disable-frame-rate-limit`. It did
not change system display settings or production launchers.

| Large-surface control | Pi A callbacks/s | Pi B callbacks/s | Intel callbacks/s |
| --- | ---: | ---: | ---: |
| Tiny update | 753.08 | 802.94 | 848.76 |
| Full fill | 177.79 | 295.81 | 885.69 |

These are **submission callbacks, not displayed FPS**. They prove that a normal
60/s ceiling is not a CPU instruction limit. They are unsuitable performance
acceptance numbers: queues accumulated, long pauses occurred, and the first
Intel readback after the uncapped flood blocked for about 29.8 seconds. An empty
uncapped callback still ran near 60 without continuous drawing. Disabling the
limiter changes scheduling and backpressure, not the monitor's refresh rate.

The reusable runner now skips the unrelated synchronous readback probe in
uncapped runs. This avoids deliberately repeating that queue drain. Normal
tiny fill/readback operation counts are also not screen FPS.

## Optimization implications

The first dirty-region prototype passes all 360 exact pixel/hit comparisons,
but is rejected for performance. Whole-day moving-pointer tests reached only
47.52 / 59.63 callbacks/s, compared with the earlier 55.93 / 59.67 scene-cache
baseline. Warm CPU was 76.32% / 81.60% of one core. Restoring fewer pixels did
not overcome the large-surface presentation behavior on Pi A; it is not shipped.

Native full-day controls use the production core, renderer and audio with the
same deterministic three-slot command bot and continuously moving pointer.
They preserve the 2200 × 1600 backing size with an explicit fixture density
factor, without emulating the browser's viewport or DPR. This is a renderer
workload, not an end-to-end DOM-input test.

| Full day | Overall callback/s | Warm callback/s | Warm CPU, one core | Terminal presentation gap |
| --- | ---: | ---: | ---: | ---: |
| Pi A, normal Canvas | 45.81 | 45.70 | 72.31% | 284.1 ms |
| Pi B, normal Canvas | 59.62 | 59.77 | 78.05% | 182.8 ms |
| Pi A, desynchronized hint | 58.46 | 58.65 | 75.82% | 284.1 ms |
| Pi B, desynchronized hint | 59.84 | 59.99 | 75.43% | 183.3 ms |
| Intel, normal Canvas | 96.64 | 88.29 | 81.07% | 66.4 ms |

All five complete at cash 24, clock 720 with zero hidden/unfocused samples and
the entire canvas inside the viewport. The warm window is the last 150 seconds.
The terminal gap is now explicitly sampled after the final draw; it was missing
from the previous callback-gap arrays. It must not disappear behind a warmed
average. Intel's warm p99 is 41.7 ms, with 96 gaps above 50 ms: its high average
does not establish fluent play, and calibration shows some baseline host jitter.

In the normal Pi runs, cumulative synchronous food drawing takes 28.42 / 29.46
seconds over a three-minute day, versus 8.11 / 6.23 seconds rebuilding scenery.
Scene wrappers including rebuilds take 9.81 / 8.12 seconds; these nested totals
must not be added together. Scene rebuild counts are 2230 / 2163, close to the
authored 12 Hz. Food submissions, rather than excessive scenery invalidation,
are the next substantial main-thread target. These timings do not measure GPU
execution time.

The unchanged-frame prototype separately counts paints and reuse. It keeps
the last image only when rendered state and hit targets are unchanged; it does
not slow game clocks or pointer processing. Initial 480 exact pixel/hit cases
pass, including sampled states from a complete deterministic cooking day.
Callback cadence must not be presented as 60 newly drawn or unique animation
poses when this optimization is used.

### Integrated Optimized result

| Complete day, normal synchronization | Overall callbacks/s | Warm callbacks/s | Warm CPU, one core | Canvas paints / reused callbacks |
| --- | ---: | ---: | ---: | ---: |
| Pi A, integrated renderer | 59.69 | 60.00 | 33.28% | 2482 / 8263 |
| Pi B, integrated renderer | 59.86 | 59.99 | 29.60% | 2322 / 8453 |
| Intel, prototype before integration | 236.47 | 237.22 | 48.66% | 2363 / 40202 |

Pi production results have native viewport containment, zero hidden/unfocused
samples, confirmed `desynchronized: false`, full 2200 × 1600 backing pixels and
the same cash 24 / clock 720 outcome. Warm p95 is 16.8 ms on both boards. Warm
maximum callback intervals are 17.4 / 33.33 ms; zero are above 50 ms. This meets
the warmed cadence and initial under-40%-of-one-core budget for this workload.
It does not certify every workload or absence of all isolated missed refreshes.

Only about 13–14 full paints per second are needed in this command sequence:
authored poses run at 12 Hz, with additional visual/input changes. The game loop
still handles input and simulation every callback. Held objects and changed
hover targets invalidate reuse immediately. Classic and the unselected profile
keep their previous repaint behavior. No new cache surface is allocated.

Intel's later prototype result is consistent with its final 240/s control, but
the host cadence changed since the earlier full-day baseline. Do not claim the
96.64→236.47 ratio is entirely caused by the code change. The directly counted
paints, reused callbacks and lower food submission time provide separate
evidence of reduced work. The production packages pass Intel/NVIDIA functional
checks; the Intel full-day performance row above is explicitly the prototype.

Cold first-use stalls remain (up to 383.5 / 300 ms in the integrated Pi days).
The final transition still takes a 233.6 / 183.4 ms callback gap, sampled after
the terminal draw. End-to-end stall-free acceptance remains open. The optional
HUD now labels callback cadence `rAF/s` and separately reports paints and reuse;
it remains disabled initially. All 129 automated tests and 480 integrated exact
pixel/hit comparisons pass, as do source, site and standalone profile/input/
fullscreen checks on Intel and NVIDIA.

The desynchronized hint adds little after reuse: prototype warmed CPU is
32.99% / 28.99%, with approximately 60/s. It is not enabled in production.
Both ready-to-play distribution packages are rebuilt with complete-frame reuse.

Anonymous evidence is in
[performance-cadence.json](../../../tests/reference/performance-cadence.json).
Next priorities are the large Canvas update path, repeated food submissions,
cold preparation and decoded audio memory. These are separate from refresh
calibration. No default profile, resolution, artwork or production browser flags
were changed by this study.

## Matched desktop follow-up

The integrated renderer is also tested sequentially on verified Intel UHD and
NVIDIA RTX 3070 Ti Laptop adapters at 2200 × 1600, with normal synchronization,
native maximized windows, production audio and the same three-minute command
sequence. Five-second empty and actual-small-surface controls run before and
after each full day. Actual adapter identity is checked, rather than inferred
from a requested launch flag. These are rendering/core/audio benchmarks;
end-to-end input checks are recorded separately.

The new Intel control rates span 153.30–165.18 callbacks/s. Integrated gameplay
reaches 120.55 overall and 121.08 in the last 150 seconds at 33.22% of one CPU
core. Warm p95/p99 are 6.6/11.6 ms, but there are 105 gaps above 50 ms and a
maximum of 493.3 ms. Those pauses make the average alone misleading. The small
control itself pauses for 457.6 ms; an empty control pauses for 400.6 ms. The
host/browser path therefore contributes delays without any game logic or art.
This does not establish which scheduler, driver or concurrent workload causes
them, or prove that all gameplay stalls share that cause. The earlier Intel
237/s result remains a real observation, not a guaranteed rate.

| Integrated full day, 2200 × 1600 | Overall callbacks/s | Warm callbacks/s | Warm CPU, one core | Warm gaps >50 ms | Warm maximum gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Intel UHD | 120.55 | 121.08 | 33.22% | 105 | 493.3 ms |
| NVIDIA RTX 3070 Ti Laptop | 135.25 | 138.56 | 39.22% | 69 | 485.4 ms |

Both runs use runtime revision `5801794` without prototype wrappers. Both end
at cash 24 / clock 720, with normal Canvas synchronization, zero hidden or
unfocused samples, full canvas containment and no page or missing-asset errors.
The warm window is the last 150 seconds; the complete day lasts 180 seconds.
Terminal presentation gaps are separately 45.9 / 84.7 ms. Intel submits 1828
paints and reuses 19872 callbacks; NVIDIA submits 1987 and reuses 22359.

NVIDIA's empty controls run at 165.90 / 167.12 callbacks/s before/after; the
actual-small-surface controls run at 166.58 / 113.88. The latter slowdown occurs
without game assets. Its warm gameplay p95/p99 are 6.6 / 7.0 ms, yet the rare
long pauses remain significant. Reporting only average or p99 would hide them.
CPU percentages are all isolated browser-process CPU in units of one core, not
GPU utilization, total-machine utilization or power consumption.

These sequential observations do not establish a universal GPU speed ratio:
the controls vary over time, and the surrounding desktop workload was not
isolated. They do establish that neither adapter is consistently capped at 60,
and neither new full-day run meets an absence-of-long-stalls criterion. PERF-25
must correlate host/renderer scheduling, compositor waits and concurrent load
before attributing these gaps to game code or choosing another renderer change.
The isolated test browsers are closed after each run; system graphics settings
and normal browser profiles are unchanged.

## Acceptance rules

1. Calibrate an empty and trivial painted control in the same native window.
2. Keep the whole game visible and reject hidden/unfocused measurements.
3. Record callback intervals and missed refresh slots, not only an average.
4. Compare warm gameplay against the calibrated cadence; 59.97 is not a failure
   when the reference is 59.97 with no missed intervals.
5. Include loading/first-use and terminal presentation stalls separately.
6. Measure browser process CPU and memory independently. Near-60 callback rate
   does not establish low CPU, and GPU-process CPU is not GPU utilization.
7. Use compositor/display evidence before claiming actual presented-frame rate.

Reusable tools: `tools/cadence-study.mjs`, `tools/cadence-fixture.mjs`, and the
`cadence`/`nativeViewport` configurations of `tools/pi-performance.mjs`.
