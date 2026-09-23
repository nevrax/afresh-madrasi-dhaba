# Canonical-game reference validation

## Baseline and evidence

The coordinator observed the preserved canonical SWF and controlled derivatives in an isolated local reference player. The machine-readable record is [observations.json](../../tests/reference/observations.json). These observations supersede the earlier, unidentified KidzSearch wrapper session as the project baseline.

| Property | Recorded value |
|---|---|
| Canonical file | `reference/swf/extended.swf` |
| Canonical SHA-256 | `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a` |
| Runtime | Ruffle 0.6.0 |
| Runtime commit | `cac5c99ce4a17e606f4ee3090389bb878f852055` |
| Browser | Codex in-app Chromium on Windows |
| Browser viewport | 1280 × 720 |
| Reference stage | 550 × 400 |
| Evidence | Coordinator-observed browser UI and visible trace output |

The loader displays the SHA-256 of the bytes it actually loads; the coordinator verified the canonical identity. Runtime installation is pinned in [tools/ruffle.json](../../tools/ruffle.json), including its archive checksum. The player and downloaded tools remain under `.local-setup/` and do not enter the native application or production release.

**This is modern Ruffle evidence, not historical Adobe Flash Player equivalence.** Source inspection, emulator observations and native regression tests establish different things. Audio state and detailed foreground/background history were not recorded for every probe, so these runs do not establish audio or suspended-tab parity.

## Unmodified canonical manual flow

The coordinator directly observed these actions on the hash-verified canonical file:

1. Start opens instructions; How to Play opens the animated tutorial.
2. The tutorial's Skip to Game control starts gameplay.
3. An unserved run reaches Game Over on the fifth customer loss. The original form shows the name `noname` and Submit.
4. Play Again returns to gameplay with Day 1, Cash 0 and Lost 0.

This establishes the observed navigation and reset values. It does not establish every tutorial frame, natural tutorial completion, exact control hit boundaries or detailed transition/audio timing. No score was submitted.

## Instrumentation provenance

[build-probe.py](../../scripts/reference/build-probe.py), in its **default mode**, first checks the canonical checksum. It compiles [probe.as](../../tests/reference/probe.as) in a temporary SWF, extracts the instrumentation action, then appends **one new DoAction tag before the canonical third ShowFrame**. Original action, resource and display-list tags are retained. The builder asserts that removing the inserted bytes recovers the entire original uncompressed body and that the canonical file remains unchanged. It writes derivative/probe-source hashes and this provenance to `.local-setup/reference/probe-manifest.json`.

The explicit `--constant-random` option is a separate controlled-fixture exception. It writes `.local-setup/reference/matched-day.swf` and its own manifest, leaving `probe.swf` and the canonical file unchanged. It changes **ten integer-bound bytes** from 2, 4 or 5 to 1 in validated ActionPush operands immediately preceding active ActionRandomNumber operations. RandomNumber(1) always yields 0. Instruction opcodes, lengths, function sizes, branch offsets and tag lengths remain unchanged. The original obfuscator carries these functional instructions inside tag253; the manifest records each script/frame/tag and uncompressed-body offset. The builder rejects an unexpected operand inventory. An unreachable obfuscator RandomNumber without a literal operand in sprite472/frame295 is left unchanged.

This exception does **not** preserve every original tag byte and must never be labelled an unmodified canonical run or an ordinary tag-preserving probe. An ActionScript `Math.random` override would not control the source's ActionRandomNumber opcodes. The loader's `?controlledrng&case=matched-day` route explicitly labels the controlled derivative and displays its actual hash.

The probe invokes original handlers and inspects original object state. It also deliberately changes setup conditions; these overrides are logged and listed below. It is an instrumented derivative, not an untouched playthrough. Rebuilding the current probe can produce a different derivative hash from earlier recorded runs; use each observation's own hash when identifying its evidence.

| Recorded derivative SHA-256 | Observed cases |
|---|---|
| `62e68861de4d003087cbb547eee3054cc2adaa43ecb92fbf7520b3259fc495e9` | Cooking, hidden template |
| `11f0af7f2f86478281741669d7c8854bd67b10ef0802e38c31ca8af8664daf84` | Full successful day, first removed-reference pass |
| `b2626991133b21e1b67d4be3a26f9fa240e9a661298d007d944d651dd8a6c523` | Patience, removed-reference follow-up across Tomorrow |
| `61f2e4f9141045a207a5e365bbaa2c19e3bf8cff35856325624b6f5f452d9ee5` | Held/plated independent smoke |
| `2b7bcafbc9cb6456b2924075942c692441acbb8d6878770bbfc4c70e947d8fe0` | Full tutorial loop, persistent children and original Skip |

The [reference server](../../scripts/reference/serve-reference.mjs) serves the canonical file, derivative and local player on loopback. [player.html](../../tests/reference/player.html) denies game networking and URL opening; probe cases do not test remote score acceptance or sessions. Trace times below are milliseconds from the probe's own `getTimer()` origin, not elapsed time between automation calls. They are observed samples and action times, not independently measured universal scheduling deadlines.

## Recorded controlled traces

### Cooking, holding, serving and exit

Random arrivals were disabled. The probe called original `customer0.Appear(table0)`, forced quantity 1 and used the original batter, slot, plate and customer release handlers.

| Trace time (ms) | Observed state/action |
|---:|---|
| 169 | Place food |
| 6,006 | Flip reaches pose 291 |
| 9,006 | Pickup reaches pose 327 |
| 10,009 | Parent remains at pose 327 after holding |
| 10,015 | Plate count 1 |
| 10,017 | Serve leaves plate count 0 |
| 13,420 | Exit complete; table free |

Cash 2 was awarded. Spoon and shadow references were undefined at pickup and after the one-second hold. This record establishes the parent hold and complete customer0 cycle; undefined named references do not establish that every unnamed child animation stops.

The later `61f2…` smoke run observed child223 at depth9 while the parent stayed at327: child6 at pickup (9,000 ms),12 at9,514 ms,1 at9,627 ms and6 at10,043 ms. Original plate duplication reset the child to1 at10,055 ms; it advanced to7 at10,512 ms and10 at10,791 ms. Native `smokePose` preserves this independent clock and duplicate reset. The named spoon/shadow clips had already been removed by the parent timeline.

### Full day and cumulative score

The successful-day fixture disabled random arrivals and called original customer0/table0 every 20 seconds after the previous exit, forced each order to 1, and cooked/served through source callbacks. **The original 180-second day clock was unchanged.**

Nine complete serving cycles produced total 18. At probe time 180,163 ms, Day 1 reached clock 720 and the day-result screen. Tomorrow was invoked at 181,186 ms; Day 2 with cumulative cash 18 was verified at 181,190 ms.

This is one complete successful day with nine serving cycles, not a run at difficulty Day 9. The native bot uses a different fixture and may produce a different total. Its result is not a matched trace or evidence of a score discrepancy unless choices, arrivals, orders and actions are aligned. The probe's separate `day-boundary` mode explicitly sets clock 718; it must not be confused with this full-duration `day` run.

### Matched constant-choice input schedule

The separate controlled derivative `aab496c0cd2bfea46ab77881aef310f3903db6f7ee4fb61ac5d1b141f519fe04` (1,493,913 bytes) uses the ten byte changes described above. It retains the original day1 CustomerMaker interval of14 seconds, the original180-second day clock and all source handler bodies apart from those RNG-bound operands. It does not force Appear, edit order quantities or disable arrivals.

For cycles0–11, inputs occur at `cycle * 14000` plus100 ms (bowl/slot0),6100 ms (flip),9100 ms (pickup),10100 ms (plate), and16100 ms (plate/customer0). This is60 actions, with the final serve at170100 ms. The native [public-API regression](../../tests/core/matched-day.test.mjs) supplies `random: () => 0` and executes this schedule without modifying state: it passes with12 served orders, cash24, no losses, clock720 and Tomorrow retaining24 in day2.

The reference observer executes each scheduled action on the next original EnterFrame opportunity and logs scheduled/actual times and states. It stops with a mismatch record if an action fails. The coordinator observed all60 actions and12 serves complete: at180,165 ms, the original day ended with total24 and clock720, matching the native fixture's day result.

The first next-day assertion was premature. Tomorrow was invoked at181,275 ms; at181,278 ms the root had moved to frame5/day2, but its queued initialization had not run: cash showed0, totalScore remained24, clock was still720 and customer instances were undefined. Its mismatch at181,279 ms was a probe timing error. The original successful-day record is retained separately from that incomplete next-day check.

The corrected derivative, `0748fa348e82fb619831c40de323ca029dec66c1c31f0cb34b7cbe776f3a7fef` (1,494,037 bytes), keeps the same ten RNG changes and waits at least200 ms plus the initialized clock/customer markers before checking next-day cash. **The coordinator observed a complete matched pass:**

| Trace time (ms) | Observed source state/action |
|---:|---|
| 180,164 | Day result:12 serves, total24, clock720, all60 scheduled actions executed |
| 181,271 | Original Tomorrow invoked |
| 181,497 | Initialized Day2: cash24, clock540 |
| 181,500 | Rootframe5, Day2, cash24, totalScore24, clock540, lost0 |
| 181,501 | `DONE:MATCHED_PASS` |

This closes the matched successful-day and cumulative next-day result fixture against pinned Ruffle. It does not prove arbitrary random sequences or identical subframe scheduling. The reference executes commands at the next EnterFrame opportunity; exact callback timestamps remain subject to the documented native/Ruffle policy distinction.

### Tutorial complete loop and persistent children

The `2b7b…` probe invoked original Start, HowToPlay and Skip handlers without accelerating clocks. HowToPlay ran at167 ms. The main tutorial naturally wrapped335→1 at28,078 ms; original Skip entered rootframe5 at29,001 ms, and the probe completed at29,006 ms.

At parent335, radio199 was at16 and its nested198 clip at12. After the parent wrapped to1 they continued to17/13; traffic depths32/34 continued to77/130 and167/170. The core now tracks separate unbounded parent and persistent-child ages, including hidden instructions playback; HowToPlay rewinds only the parent. Focused tests cover hidden playback, replay, wrap continuity and Skip. These observations close the tutorial control/clock question without claiming complete pixel/audio equivalence.

### Hidden template bug

Random arrivals were disabled, cash was set to 10, and the original hidden `mcDosa` was left running without picking batter. At game entry (165 ms), uppercase `Stop` was undefined while lowercase `stop` was a function. The template reached pose 283 at 23,596 ms, then removed itself and reduced cash to 8 at 23,698 ms. The case finished at 27,170 ms.

This confirms that source `mcDosa.Stop()` does not stop the hidden clip. Its frame 284 callback causes the original penalty/removal. The current probe also attempts a bowl/slot release after removal; the recorded case summary above establishes removal and penalty, while detailed later placement outcomes must be tied to their own trace or native/source tests.

### Patience and twip conversion

The probe disabled random arrivals, called original customer0/table0, and stopped the hidden template using the original bowl callback. Original ordering and patience timers were left unchanged.

The customer was alive at patience −30.05 (18,113 ms), lost at −29.85 (18,199 ms), and gone at 18,595 ms. The probe completed at 21,278 ms. This includes the source ordering delay: the patience interval itself reaches loss after 160 callbacks, or 16 seconds.

The source stores patience in MovieClip `_y`; each assignment truncates toward zero to twentieths of a pixel. Its native transcription is `Math.trunc(value * 20) / 20` on every write. Unquantized double accumulation gave the former native approximately 18-second patience interval and was not equivalent. Source transform data separately distinguishes the fresh meter's authored −65.9 from OrderDosa's explicit −66 reset.

### Orphan interval across removal and recreation

The probe called original Appear twice, leaving an overwritten patience handle, then called original StopGame and moved to root frame 7.

The first pass observed valid state before removal at 5,166 ms, transition at 5,170 ms and an invalid old reference at 5,195 ms. Name, parent, patience and timer properties stayed undefined during the next five seconds. That first pass alone did **not** prove permanent timer cancellation.

The follow-up invoked original Tomorrow after the result screen, disabled new arrivals and stopped the new template. It recorded the result screen at 5,248 ms and Tomorrow at 10,211 ms. The recreated invisible customer0 meter then changed to −65.7 at 10,345 ms and −55.85 at 15,106 ms; the case completed at 15,185 ms. Its stored timer properties were 0.

The old clip-path reference therefore resolves to the newly constructed customer on the next day, and the orphan interval resumes affecting it. Globally clearing every customer timer on screen transition was incorrect. Source-specific known-handle cleanup and recreated-path behavior must be preserved; an inert result-screen reference is not evidence that the underlying interval is gone.

## Remaining validation boundaries

[scenarios.json](../../tests/reference/scenarios.json) remains a broader observation checklist. Its pending entries are not passing tests; the concrete records above supply partial or focused evidence without completing every requested field.

The matched successful-day/Tomorrow fixture is now observed and passing. Source-level regression tests additionally cover cooking boundaries, all five eating periods, quantized patience, known/orphan timer lifecycles and competing native deadlines. These tests are not runtime observations of every boundary or every identity. Universal first-frame/equal-deadline equivalence and later-day Ruffle batching remain explicit policy limits in D-001/D-002; no historical Adobe Flash execution was measured.

Complete visual/audio equivalence, precise hit/text/filter comparisons and device/background/performance checks belong to the coordinator's separate verification records. They must not be inferred from this gameplay fixture. Probe modes present in source, including timer controls, are capabilities rather than recorded outcomes unless an observation record exists.

Native build/tests establish native implementation behavior, not historical runtime equivalence. Keep unresolved policies in the main decision/status records, and never use third-party score submissions as reference tests.
