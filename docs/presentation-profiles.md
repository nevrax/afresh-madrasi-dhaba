# Presentation profiles

Current performance continuation: Extra now retains scenery between authored
poses, while food and pointer feedback remain live at render cadence. The
[whole-pipeline report](performance-pipeline.md) supersedes the timing baseline
below for this change; full-day stable 60 FPS with low CPU remains unachieved.

Classic and Extra use the same game rules, assets, cooking timers, customers,
orders and scoring. The small selector above the game changes presentation during
play without starting a new day. An explicit selection is remembered when browser
storage is available; it also works for the current session without storage.

The default remains undecided. With no valid saved choice, the existing release
presentation stays active and the selector says **Choose profile**. This temporary
compatibility state is not a third selectable profile. A development URL can
select `?presentation=classic` or `?presentation=extra` without saving a preference;
an explicit selector change saves it. No hardware detection selects a profile.

## Feature inventory

| Feature | Classic | Extra | Implementation |
| --- | --- | --- | --- |
| Original game rules, content, tutorial, score submission and soundtrack | Preserved | Preserved | Shared core, input and audio |
| Original food hover text, cash feedback and patience/count information | Preserved | Preserved | Renderer source behavior |
| Bowl outline, hover/selection cue and introductory batter label | Off | On; introduction stays dismissed after use | Game shell |
| Additional flip/pickup/batter cursors | Off | On | Game shell and CSS |
| Smooth sampling between eligible menu/traffic poses | Authored samples | Menu interpolates; playing traffic uses authored 12 Hz poses | Renderer; simulation clocks unchanged |
| Retained scenery between visual state changes | Ordinary rendering | Exact-density opaque surface, up to 32 MiB | Renderer; food, feedback and hit mapping stay live |
| Large griddle steam | Original blur | Original moving geometry without the wide blur | Isolated vector metadata view |
| Background stars | Original blinking | Fixed pose; background retained and cropped to the visible stage | Isolated vector metadata view and Extra cache treatment |
| Order bubble decoration | Original morph | Fixed decoration; count and patience still live | Renderer |
| Customer bodies, dosa steam, water glasses, traffic lights/shadows and radio | Preserved | Preserved | Shared assets |
| Resolution control, FPS/memory HUD, expansion and fullscreen buttons | Extra overlay hidden | Available; FPS initially off | Game shell |
| Local score convenience menu | Hidden | Available | Game shell; stored scores are not deleted |
| New songs | None added | None added | Future additional tracks belong to Extra |

Responsive layout, working HTML/file playback, loading/error handling, accessible
source control equivalents and status text, audio gesture recovery, original online
score form, attribution and repairs for misplaced screens/white seams remain
shared. Catalogue and verification links are development tools, excluded from
both distribution packages. Classic is the source-oriented presentation of the
native port, not a claim of historical Adobe pixel equality or a restored Flash
runtime.

## State, preferences and caching

`src/presentation-profile.ts` resolves immutable configurations. The game core has
no profile branches. Switching updates the renderer and UI without creating a new
game, replaying sound events or registering another input/frame loop. It closes
Extra dialogs and restores compact expansion when entering Classic. Native
fullscreen can still be exited with the browser's usual Escape action.

Classic renders at 100% with diagnostics off. Extra starts at 100% with the HUD
off and keeps its own display preferences. Existing compatibility preferences are
not overwritten. Hint dismissal survives switching; time spent in Classic does
not consume the Extra introduction timer.

The established bounded, resolution-scaled vector tile cache and surface reuse are shared.
Extra's separate scene cache is counted in the HUD and released on screen,
profile or scale changes. Above its 32 MiB surface cap, ordinary rendering is used.
Effect changes use an isolated metadata view; canonical source records are never
mutated. Changing effects clears retained surfaces, filter backing and derived
bounds/period metadata before drawing the other profile. It does not keep two
complete graphics caches alive. Repeated selection of the same effects avoids
unnecessary cache invalidation.

A proposed general static-group crop was rejected as shared cache work: four of
fifteen screen/density comparisons changed pixels. Cropping is therefore limited
to Extra's already changed background. It reduces its retained tile to the visible
stage and keeps it below the 32 MiB retention threshold at 2970 × 2160. Classic
retains the established cache policy. This is an intentional visual treatment,
not a transparent cache optimization.

## Verification and measurements

All 128 automated tests pass. Both profiles complete the production-core tutorial,
cooking/serving/payment sequence, a full deterministic day (cash 24, clock 720),
next-day carryover and three game-over/retry cycles. This functional replay
advances simulation time; it is not a realtime full-day FPS measurement.

| Hardware / environment | Classic controls, 2200 × 1600 FPS | Extra, 2200 × 1600 FPS | Extra, 2970 × 2160 FPS |
| --- | ---: | ---: | ---: |
| Pi A | 36.32–36.35 | 45.60 | 28.25 |
| Pi B | 40.03–40.47 | 59.83 | 36.35 |
| Intel UHD | 57.31–57.77 | 75.67 | 42.47 |
| NVIDIA RTX 3070 Ti Laptop | 168.10–168.43 | 167.59 | 168.37 |

At 2200 × 1600, managed graphics backing drops from about 171.2 to 91.6 MiB.
Extra's warm windows have no new tile allocations, filter builds, morph
replacements or evictions. This does not mean all frame deadlines are met.
Classic also has no warm filter builds or evictions; one Pi A control allocates
a 23,760-byte tile and contains a 50.1 ms frame gap.

In the 18-second preparation phase, the sum of full gaps above 50 ms drops from
6.24–6.45 to 0.52 seconds on Pi A, and from 4.70–4.78 to 0.28 on Pi B. These are
summed whole gaps, not one continuous pause or exclusive GPU time. NVIDIA's final
Classic control prepares much faster than its starting control despite a fresh
page and renderer, so first-pass driver/resource preparation must not be treated
as a stable per-profile percentage. Warmed NVIDIA throughput is effectively
unchanged at the observed cadence.

The 2970 × 2160 results still miss a 60 FPS target on both Pis and Intel. No
automatic quality reduction conceals that limitation. PERF-17 remains open;
the profiles are implemented and comparable, not a universal performance fix.

Acceptance and anonymous timings are recorded in
[presentation-profiles.json](../tests/reference/presentation-profiles.json).
The suite covers profile preference validation, source metadata immutability,
independent display settings, live order count/patience and the existing game
regressions. Visible browser checks cover the source, static site and standalone
HTML, switching during cooking, persisted selection, blocked storage, offline
playback, fullscreen and responsive layout. Touch checks use browser emulation;
physical touch hardware is not certified.

At authored sample times, Classic and a round trip through Extra match the prior
scene pixels exactly in fifteen screen/density cases (five screens at 880, 2200
and 2970 backing widths). Hit targets and snapshots are unchanged. Additional
interpolation is deliberately disabled in Classic, so fractional-time images
need not match the previous interpolated presentation. These pixel checks are
separate from timing measurements.

The benchmark remains a controlled five-customer rendering scene, with 18 seconds
of cold preparation followed by 12 measured seconds. Classic controls bracket
Extra at 2200 × 1600; the additional 2970 × 2160 case measures Extra only.
All timing canvases fit completely inside the test viewport. Hardware/backend
identity is recorded. Frame opportunities are not physical scanout or unique
authored poses. No universal smoothness guarantee or default selection follows
from these measurements.

Reproduce with the development server running:

```text
node tools/presentation-check.mjs check high-performance
node tools/presentation-check.mjs check low-power
node tools/presentation-check.mjs scenarios high-performance
node tools/presentation-check.mjs study low-power
node tools/presentation-check.mjs study high-performance
node tools/pi-performance.mjs <ssh-target> <ssh-port> <unused-local-port> profile-study profiles
```

Raw captures and screenshots stay under ignored `.local-setup/logs/`. Both
`dist/site` and `dist/standalone` contain the selector and the same profiles;
the no-selection compatibility behavior is retained pending a default decision.
