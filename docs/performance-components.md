# What costs time in the scene

This study ranks practical changes to the presentation. It does not assume that
every historical effect must remain identical. All changes below are isolated
test variants; the shipped game is unchanged.

Evidence: [56 anonymous measurement records](../tests/reference/performance-components.json).
The tested runtime is commit `6f033eb`, unchanged at repository checkpoint
`3d179ae`. Three matrices run on each of two physical Pi environments.

## Read the ranking in two ways

Cold stalls and sustained frame rate have different causes. The broad blurred
griddle steam is the largest measured source of first appearance pauses and
retained effect memory. Drawing the background is the largest sustained cost
isolated by removing one group. Removing a small animation is not necessarily
the same as removing the expensive work.

Both physical Pi 5 boards use hardware V3D acceleration. The fixture contains
five customers with order panels, five glasses, three cooking dosas and a carried
plate. It draws at 2200 × 1600 backing pixels, 100% render scale. Each case has
18 seconds of cold preparation followed by 12 measured seconds. Three full
baselines bracket the first matrix. The two environments are defined in
[performance-raspberry-pi.md](performance-raspberry-pi.md).

## Individual omissions

The table shows frame opportunities per second with exactly one group omitted.
Pi A full baselines span 36.27–36.28/s; Pi B spans 41.03–42.07/s. Numbers should
not be added or presented as percentages of physical GPU execution time.

| Omitted group | Pi A | Pi B | Managed surfaces saved | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Background | 56.01 | 60.00 | 35.4 MiB | Largest sustained gain; optimize its rendering instead of deleting the setting |
| Large griddle steam | 37.36 | 50.35 | 88.3 MiB | Dominant cold and memory cost; modest warmed gain on Pi A |
| Order panels, including count and patience indicator | 38.73 | 51.53 | 8.5 MiB | Largest isolated customer UI cost; functional information must survive a redesign |
| Customer bodies and anger steam, orders retained | 37.36 | 50.43 | 3.5 MiB | Measurable on Pi B; five bodies are a busy scene |
| Traffic, including embedded lights/shadows | 36.57 | 46.21 | 3.1 MiB | Secondary cost |
| Dosa steam | 36.53 | 46.19 | 12.6 MiB | Secondary warm cost in this three-dosa fixture |
| Food artwork, steam retained where separately drawn | 36.57 | 45.77 | 14.4 MiB | Diagnostic control, not a playable removal |
| Five water glasses | 36.40 | 43.02 | 0.5 MiB | Small benefit relative to other changes |
| Animated radio artwork | 36.32 | 42.19 | 0.2 MiB | Within or close to baseline variation |

The order-panel omission removes the whole popup, not just its decorative
animation. The separate static-panel experiment preserves count and patience
drawing. Glasses are source sprite 235 and are distinct from those order panels.
Traffic here is five source sprite groups, not a separately isolated headlight
shader. Removing characters does not remove their order panels.

## Why the griddle steam still matters

Across the first 18 seconds, the full Pi A baseline spends about 6.2–6.4 seconds
inside frame gaps larger than 50 ms. Removing griddle steam reduces that sum to
0.93 seconds. Pi B drops from about 4.6–4.7 seconds to 0.28 seconds. These sums
include the whole long gap, not only time beyond an ideal 16.7 ms deadline, and
are not additive CPU/GPU attribution.

Managed backing surfaces fall from 171.5 to 83.2 MiB. The large steam therefore
accounts for an approximately 88.3 MiB difference in this fixture, including
affected filter/cache resources. This is not a measurement of physical VRAM.

All first-matrix warm windows have zero new filter builds and zero cache
evictions. Once the steam has been generated, keeping it in cache eliminates the
repeated blur calculation. That explains why its removal helps cold pauses much
more than warmed throughput on Pi A.

Removing that steam does not eliminate every first appearance pause: the largest
cold gap remains 383.5 ms on Pi A and 283.3 ms on Pi B in that case. Other resource
preparation still needs attention.

## The background needs its own treatment

Background group 193 is mostly static scenery but contains blinking stars
(child 185). The renderer clears and redraws the stage at every frame opportunity.
Its retained subimages still have to be composed, including large overlapping
surfaces. The background omission is a diagnostic upper bound, not a proposal
to ship a blank scene or a guarantee that moving it to CSS will save the same time.

Earlier background regrouping/layer experiments on another browser improved
throughput only slightly and changed edge pixels. See the rejected experiments
in [performance-plan.md](performance-plan.md). The present scope allows an
intentional visual tradeoff, but any new approach still needs direct Pi timing
and a visual review. A single retained background with frozen stars is tested
separately from merely omitting the stars.

| Background treatment | Pi A FPS | Pi B FPS | Managed surfaces |
| --- | ---: | ---: | ---: |
| Full scene, starting control | 36.23 | 39.67 | 171.5 MiB |
| Stars removed, original background composition | 37.36 | 50.28 | 167.5 MiB |
| Stars fixed, complete background retained together | 43.11 | 59.66 | 167.0 MiB |
| Same retained background, griddle blur removed | 43.38 | 59.58 | 115.8 MiB |
| Full scene, ending control | 36.28 | 40.94 | 171.5 MiB |

The fixed-star experiment reduces the star timeline to its first pose before
rendering. This enables the existing static-group retention: the measured cache
contains one background-193 tile of 32,383,352 bytes. Merely omitting star drawing
does not enable that same retention policy. The experiment therefore separates
the small animation from the larger composition change it enables.

Removing griddle blur from the retained-background case lowers the cold long-gap
sum from 6.14 to 1.00 seconds on Pi A and from 4.58 to 0.33 on Pi B. It has little
additional warmed benefit in this combination. This reinforces the distinction
between preparation stalls and sustained redraw cost.

The retained background is still larger than the visible stage and copied on
each draw. A cache cropped to the visible static scenery, with stars handled
separately if desired, is a next implementation candidate. Its exact benefit has
not been measured. Freezing stars alone does not establish pixel equivalence;
retained grouping can also alter edge compositing.

## Cheaper effects instead of complete removal

A second matrix tests treatments that preserve the main objects. Its full-scene
controls span 36.23–36.28 FPS on Pi A and 39.92–41.03 on Pi B. Compare these
variants with their own controls, rather than interpreting differences between
separate runs as a precise speedup.

| Treatment | Pi A FPS | Pi B FPS | Managed surfaces | Cold long-gap sum A / B |
| --- | ---: | ---: | ---: | ---: |
| Full scene, starting control | 36.23 | 39.92 | 171.5 / 171.8 MiB | 6.54 / 4.72 s |
| Large griddle steam held at one pose | 36.15 | 37.03 | 111.8 MiB | 1.19 / 0.67 s |
| Large griddle steam animated without its blur | 36.62 | 46.10 | 120.3 MiB | 1.37 / 0.35 s |
| Order bubble decoration held at one pose | 37.78 | 45.43 | 164.5 MiB | 6.15 / 4.43 s |
| Glasses held at one pose | 36.23 | 40.97 | 171.1 MiB | 6.37 / 4.63 s |
| Combined lighter decoration | 39.86 | 52.52 | 58.7 MiB | 0.45 / 0.25 s |
| 75% internal width and height | 50.68 | 59.75 | 98.0 MiB | 2.98 / 2.06 s |
| 50% internal width and height | 59.92 | 59.91 | 46.0 MiB | 1.05 / 0.58 s |

The cold column uses the same full-gap sum defined above. The combined lighter
case removes both steam groups, glasses, traffic and the radio artwork, and
freezes the order bubble decoration. Customers, their order counts, patience
indicators, food, griddle and background remain. Even this substantial cut does
not reach 60 FPS on Pi A at full clarity. Removing all small animations is
therefore a poor first strategy for sustained performance.

A frozen steam pose reduces preparation and storage but does not improve warm
throughput here; it is slower on Pi B. Fixed versus changing poses have different
composition workloads. Removing the wide blur is more promising than merely
stopping the animation. These are alternatives to visually review, not accepted
replacement artwork.

The static order bubble stops decorative morphing, while count and patience
continue updating. Warm morph replacements fall from 858 to zero in this fixture.
This is a more useful candidate than deleting the entire order panel.

Resolution percentages apply to each internal dimension. At 50%, the renderer
processes one quarter of the full-resolution pixel count. Display size and hit
coordinates stay unchanged; outlines become softer at that setting, while vector
source remains available for full-resolution rendering. These cases preserve
all effects and use the same CSS size as the full-resolution scene.

## Music and memory

The audio control loads and decodes the same music and ambient loop in both
cases, then suspends or runs the actual audio context. Both cases verify two
sources and 31,798,328 decoded bytes (30.3 MiB), accounted separately from graphics.

| Audio context | Pi A FPS | Pi B FPS |
| --- | ---: | ---: |
| Suspended | 36.28 | 38.86 |
| Playing | 35.98 | 38.56 |

The observed difference is about 0.3 FPS on either board. This is a single paired
comparison, not evidence of an exactly constant audio overhead. It does rule out
music playback as the dominant cause of this scene's large rendering deficit.
Audio file size, decode time and decoded memory remain separate concerns. Muting
the speaker would not have been an equivalent suspension control.

## Recommended implementation order

These candidates now follow the [profile separation plan](performance-plan.md#profile-separation-plan).
Only verified appearance-preserving cache work is shared. New non-cache
optimizations and added presentation features belong to Extra, while Classic
retains the reference effects. In particular, the measured fixed-star background
is an Extra candidate, not a transparent common cache change. Neither a shipping
default nor final visual treatments have been selected.

1. Replace or simplify the large griddle steam blur. It has the strongest cold
   and memory evidence. Compare a cheaper soft vector effect with removal;
   freezing the existing effect is not a demonstrated warm optimization.
2. Retain static scenery as efficiently as possible at the requested resolution.
   The fixed-star prototype helps both boards, but Pi A still needs more work.
   Preserve the scene and test cropped static layers before cutting customers
   or traffic. Keep any optional star animation separate from large static layers.
3. Stop the decorative order bubble morph or replace it with a simpler motion.
   Keep order counts and the patience indicator live and legible. The existing
   static-decoration experiment already demonstrates a smaller, useful gain.
4. Consider dosa steam density and customer/traffic detail only if a subsequent
   representative gameplay comparison still misses the target. Their effects
   vary with occupancy. Do not remove functional customer or food information.
5. Keep glasses, radio and music for now. Their isolated gain is small or within
   variation. Retain the existing resolution control as a separate clarity
   tradeoff; it is effective but is not a substitute for the first three changes.

Before accepting a production change, compare the same cold and warm fixtures,
actual cooking through a full day, menu/tutorial/day-end screens, pointer/touch
hit regions and resizing. Check memory bounds, functional regressions and visual
quality at 100%. Rebuild and check both distributions only when runtime or assets
change. PERF-19 is complete as an attribution study; PERF-17 remains open for
production implementation and acceptance. No universal hardware guarantee follows
from a 60 FPS result on these two boards.

## Method and limits

The game simulation is not driven during this fixture. This is a busy synthetic
rendering scene with continuous pointer motion and authored poses; production
gameplay results remain in the previous report. Customer bodies use a fixed
character pose plus the fixture's anger effect, so this does not rank every
possible entry/eating/exit animation. Dosa steam cost depends on how much food is
present. Measurements use the same display-density emulation as the Pi report.

Diagnostics count that the targeted draw paths are actually omitted or frozen.
No shipping assets are changed. Baseline and variants carry the same diagnostic
wrappers and profiling. JS submission times are not GPU execution times; the
ranking uses frame pacing, cache accounting and controlled scene changes together.
Small differences close to baseline variation should not drive visible cuts.

All 56 cases stayed visible with no reported thermal/undervoltage throttling,
warm cache evictions or warm filter builds. Fifty-one cases allocate no new tiles
in the warm window; five allocate one 23,760-byte tile each: Pi A without dosa
steam, without glasses and with static glasses; Pi B without radio and without
stars. There are no page errors. The isolated browsers are closed on both
boards after measurement and the temporary display wake is restored.

The source stage is 550 × 400. A 2200 × 1600 backing canvas has sixteen times as
many pixels, even before temporary filter surfaces and overlapping layers are
counted. Scalable vector source preserves outlines; it does not make rasterizing,
blurring and composing those pixels free. That is an explanation of the workload,
not a requirement to accept the current stalls.

Reproduce after building development modules and starting the local server:

```text
node tools/pi-performance.mjs <ssh-target> <ssh-port> <unused-local-port> component-study ranking
node tools/pi-performance.mjs <ssh-target> <ssh-port> <unused-local-port> simplification-study simplifications
node tools/pi-performance.mjs <ssh-target> <ssh-port> <unused-local-port> background-study background
```

The runner uses installed visible browsers with isolated profiles, checks idle
cadence, keeps the test display awake without changing its timeout settings,
and restores its initial power state. Raw records remain in `.local-setup/logs/`.
Only anonymous summaries belong in the repository.
