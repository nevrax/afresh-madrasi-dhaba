# Performance work

Current behavior and measurements live in [performance](../performance/README.md).
This file records work and acceptance conditions, not a duplicate run log.

## Open tasks, in priority order

- [ ] PERF-26 Reduce full-size ladle composition cost. Preserve its original
  pouring scale. The moving-ladle case misses the combined cadence/CPU target.
  Compare matched full-size treatments on both Pi environments; do not silently
  restore the tiny cursor or lower resolution.
- [ ] PERF-17 Resolve residual cold first-use, higher-density and Canvas
  touch/Classic costs. Ordinary cooking poses are prepared; late/burn poses stay
  lazy. Repeat cold/warm gameplay with visible-window and input evidence.
- [ ] PERF-25 Attribute intermittent desktop graphics waits. Traces establish
  host waits, but later identical launches are smooth. No driver or launch flag
  is a proven cause. Kernel tracing lacks the necessary profiling privilege.
- [ ] PROF-7 Select the shipping default explicitly. Until then, no saved choice
  keeps the existing neutral-selector behavior. No hardware-based auto-selection.

## Acceptance contract

At 2200 × 1600 backing pixels on both measured Pi 5 environments, target at least
59.5 callbacks/s, p95 at most 20 ms, p99 at most 33.4 ms, no sustained stalls and
warm CPU below 40% of one core. Include audio, real-time input/replay, cold/warm
starts, carrying and terminal screens. Lower-density results are separate cases.

Record individual gaps, memory scope, actual graphics backend, native-window
containment and focus/visibility. Callback delivery is not scanout. Keep vectors,
game clocks and meaningful order/patience information. Deliberate presentation
changes belong to Optimized; shared cache changes require appearance checks.

Rebuild both packages and verify profile switching, resize, fullscreen,
HTTP/direct-file playback and input. Emulated touch is not physical touch evidence.

## Completed work and evidence

Completion here records an implemented treatment or a bounded investigation.
It does not imply universal performance acceptance.

| IDs | Work | Evidence |
| --- | --- | --- |
| PERF-0 | Repeatable capture and frame attribution | [Early follow-up](../performance/studies/follow-up.md) |
| PERF-1, PERF-2 | Retained geometry, tight filtered bounds and bounded surfaces | [GPU study](../performance/studies/gpu.md) |
| PERF-3 | Batch input/publication into one presentation pass | [Architecture](../development/architecture.md) |
| PERF-4, PERF-6 | Separate authored timing; evaluate interpolation/worker escalation | [Decisions](../reference/decisions.md) |
| PERF-5 | Initial available-machine matrix, limited to its workload | [GPU study](../performance/studies/gpu.md) |
| PERF-7, PERF-8, UX-1 | Optional counters, resolution control and bowl cues | [Profiles](../development/presentation-profiles.md) |
| PERF-9, PERF-10, PERF-11 | Group omissions, active adapter and cadence distinction | [Early follow-up](../performance/studies/follow-up.md) |
| PERF-12, PERF-13, PERF-14, PERF-15 | Morph retention, graphics traces, immutable metadata and interpolation review | [GPU study](../performance/studies/gpu.md) |
| PERF-16 | Resolution-dependent cache-thrashing correction | [Full resolution](../performance/studies/full-resolution.md) |
| PERF-18 | Physical Pi baseline with verified backend | [Pi study](../performance/studies/raspberry-pi.md) |
| PERF-19 | Individual effect ranking | [Components](../performance/studies/components.md) |
| PERF-20 | Complete-pipeline attribution | [Pipeline](../performance/studies/pipeline.md) |
| PERF-21 | Retain scenery and unchanged frames | [Pipeline](../performance/studies/pipeline.md), [stalls](../performance/studies/stalls.md) |
| PERF-22 | Scoped three-minute acceptance for the compact-cursor checkpoint | [Recorded checkpoint](../../tests/reference/performance-preparation.json); not full-size-ladle acceptance |
| PERF-23 | Native visibility and refresh calibration | [Cadence](../performance/studies/cadence.md) |
| PERF-24 | Large Canvas path and terminal-frame reuse | [Cadence](../performance/studies/cadence.md), [stalls](../performance/studies/stalls.md) |
| PROF-1, PROF-2 | Feature inventory and typed configuration | [Profiles](../development/presentation-profiles.md) |
| PROF-3, PROF-4 | Common cache policy and Optimized-only treatments | [Profiles](../development/presentation-profiles.md) |
| PROF-5, PROF-6 | Explicit persistence, switching and scoped validation | [Verification](../development/verification.md) |

No new soundtrack has been added. Original score integration, cultural research
and parity questions belong to the reference documents, not this optimization plan.
