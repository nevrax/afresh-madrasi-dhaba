# Current performance

**The 60 Hz / low-CPU target is not met in every current scenario.** The full-size
ladle is slower than the compact cursor it replaced. Classic and Optimized share
game rules; Optimized owns deliberate visual treatments. The default is undecided.

## What costs time

| Finding | Evidence | Current treatment |
| --- | --- | --- |
| Repainting/composing the large stage is the main recurring cost | [Pipeline](studies/pipeline.md), [cadence controls](studies/cadence.md) | Retain scenery and reuse unchanged frames in Optimized |
| First-use food and filtered surfaces cause cold pauses | [Preparation experiments](studies/stalls.md) | Prepare ordinary cooking and terminal scenes before the clock starts |
| Moving carried artwork adds composition work | [Full-size ladle data](../../tests/reference/batter-scale.json) | Full-size ladle layer; compact native dosa/plate previews |
| Large griddle blur and background work outweigh several small decorations | [Component ranking](studies/components.md) | Cheaper griddle, background and order decoration in Optimized |
| Audio retains decoded memory, but disabling it did not eliminate cold pauses | [Audio controls](studies/stalls.md) | Preserve original tracks and reuse decoded buffers |
| Some desktop pauses overlap graphics host waits | [Traces](studies/stalls.md) | External cause remains unproven; later identical launches were smooth |

Customers, glasses, traffic, radio, text, hit testing, snapshots and filters were
included. There is no evidence-based reason to remove every small animation.
Graphics-process CPU time is not physical GPU utilization.

## Latest full-size ladle

The ladle matches the pouring animation's vector scale and anchor. A separate
retained Canvas replaces the visibly undersized 64-logical-pixel cursor. Its
backing bytes are counted in the HUD. Dosa/plate keep compact native previews;
Classic and touch keep the Canvas path.

These 60-second moving-ladle cases use 2200 × 1600 backing pixels, audio, prepared
assets, normal synchronization and fully visible native browser windows.

| Measurement | Pi A | Pi B |
| --- | ---: | ---: |
| Entire run, callback/s | 52.57 | 59.92 |
| Warm callback/s | 52.21 | 59.87 |
| Warm CPU, percent of one core | 59.52 | 51.65 |
| Warm p95 interval, ms | 33.4 | 17.4 |
| Warm maximum interval, ms | 50.6 | 33.3 |
| Warm gaps above 50 ms | 4 | 0 |

Both environments use Pi 5/V3D; A uses X11 and B Wayland with different software
versions. The comparison does not isolate one driver or desktop as the cause.
No hidden/unfocused samples were recorded. Pixels, scale, resize and package
interactions passed their checks. [Recorded evidence](../../tests/reference/batter-scale.json).

**PERF-26 is open:** A misses cadence and both miss the 40%-of-one-core CPU budget.
Further work must preserve the requested full-size ladle.

## Earlier checkpoints

These predate the full-size ladle and are not its measurements:

- Prepared three-minute cooking days: 59.99 / 59.99 callback/s, warm CPU
  32.86% / 29.55% of one core at 2200 × 1600.
- Corrected game-over phase: 59.92 / 60.00 callback/s after terminal-frame reuse.
- Calibrated Intel/NVIDIA repeat: warm 235.18 / 234.42 callback/s. Similar rates
  do not establish equal GPU throughput.
- Varied-customer Pi B day: two isolated gaps over 50 ms, maximum 83.3 ms.
  Higher-density cases also had cold outliers; averages do not erase them.

[Checkpoint data](../../tests/reference/performance-preparation.json) and
[interpretation](studies/stalls.md). Preparation costs about 8–10 seconds on the
tested Pi environments, before cooking/customer clocks advance. Late/burn poses
remain lazy. No automatic profile or clarity reduction is used.

## Measurement limits

Callbacks are animation-frame opportunities, not physical screen updates. Nominal
60 Hz can report 59.9x callbacks/s. CPU uses **one core = 100%**. Cache accounting
does not include all browser, driver and operating-system allocations.

Rates depend on backing dimensions, workload, browser, graphics stack and host
load. Functional and pixel checks do not prove historical Adobe Flash parity or
performance on every device. Physical touch performance remains unverified.

## Historical study index

| Study | Purpose |
| --- | --- |
| [Components](studies/components.md) | Rank individual effects |
| [Pipeline](studies/pipeline.md) | Attribute CPU/composition and compare alternatives |
| [Cadence](studies/cadence.md) | Refresh limits, native geometry and trivial controls |
| [Preparation and stalls](studies/stalls.md) | Cold work, compact previews and terminal reuse |
| [Full resolution](studies/full-resolution.md) | Original cache-thrashing diagnosis |
| [Pi baseline](studies/raspberry-pi.md) | Earlier device/workload baseline |
| [GPU baseline](studies/gpu.md) | Early Intel/NVIDIA cache validation |
| [Early follow-up](studies/follow-up.md) | Earlier diagnostic sampling limits |

Future work belongs in the [performance plan](../planning/performance-plan.md).
The [verification guide](../development/verification.md) lists reusable checks.
