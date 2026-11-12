# Extended-edition game rules

Baseline: `reference/swf/extended.swf`, SHA-256 `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a`. This document distinguishes extracted rules from runtime assumptions. It is not a claim of measured Flash parity. The [decision register](decisions.md) records unresolved cases.

Source links below use the clean exports. All 83 scripts, their hashes, entrypoints and classification are in [script-inventory.json](script-inventory.json); raw exports are retained separately.

## Native contract

`src/core/game.ts` exports `createGame(options?)`, `GameState`, `Command`, `GameEvent`, `Customer`, `Dosa`, `PlatedDosa` and `Screen`. `game.dispatch(command)` applies an action and returns ordered events. `game.advance(ms)` advances controllable simulation time and returns ordered events. Initial advance/dispatch drains the root menu sound once. Both snapshot accessors return independent copies. State includes the hidden batter template, retained plate/counter positions and per-plated-food coordinates. Core code performs no DOM, network, audio or file I/O. The browser batches events and takes one snapshot per animation frame while applying input commands immediately in order.

Options accept a `random(): number` source producing values in `[0,1)`. The default is a reproducible xorshift stream. A recorded Flash choice stream must be injected for cross-runtime comparisons: equal seeds do not imply equal Flash random choices. `nonPositiveSpawnIntervalMs` defaults to the 10 ms minimum supported by the targeted Ruffle zero/negative-interval probe; full callback batching equivalence remains separate.

Commands: start, play, show-tutorial, skip-tutorial, next-day, retry, toggle-mute, pick-batter, click-slot, click-plate, click-customer, move-pointer, background and submit-score. Input adapters perform hit testing; release semantics are preserved. An ordinary drag/drop input implementation is not equivalent.

Events include screen changes, sound/stop requests, cash feedback, score requests, legacy session-refresh requests and runtime-policy diagnostics. The core never posts to the original score host.

## Screens and session

Sources: [frame 3](../../reference/decompiled/extended/clean/scripts/frame_3/DoAction.as), [frame 4](../../reference/decompiled/extended/clean/scripts/frame_4/DoAction.as), [frame 6](../../reference/decompiled/extended/clean/scripts/frame_6/DoAction.as), [frame 7](../../reference/decompiled/extended/clean/scripts/frame_7/DoAction.as), [tutorial Skip](../../reference/decompiled/extended/clean/scripts/DefineSprite_321/frame_1/DoAction.as).

- Menu initializes day 1, total cash 0, audio-enabled true. The root StartSound tag starts sound162 (`bgMusic2`) once on frame3, outside the exported ActionScript. Start opens instructions. Play starts gameplay.
- How to Play shows sprite 321 and starts its 335-frame animation. Skip calls the parent next frame, starting gameplay. No stop action is exported at the final tutorial frame; native display loops pending runtime verification.
- A day starts at displayed 09:00 PM (`clockTime=540`), advancing one displayed minute each real second. At 720 (12:00 PM in the original string formatting) it ends after 180 seconds. Preserve the original PM text even though it is an unusual clock interpretation.
- Day-result retains total cash. Tomorrow increments day, requests session refresh and starts the next day. No day cap appears in the source.
- Fifth lost customer ends the game. Game-over captures cash and exposes the name/score form and highscore link. Retry resets day to 1 and cash to 0 and starts directly in gameplay.
- Menu sets a session-refresh interval of 600,000 ms. That interval is not cleared by StopGame. The native core emits an adapter event at the same interval across screens.
- Day shutdown removes food/plate/customer display objects and stops known day timers. It clears the latest known handles only for table-referenced customers, preserving overwritten orphan intervals whose handles the source no longer owns. Their references are invalid on result screens and rebound to the same recreated customer paths on the next day. Native intervals retain phase, act only during gameplay and resolve the current customer by ID; focused regression tests cover the runtime-confirmed behavior.

## Clocks and action ordering

The SWF declares 12 fps. Cooking and character callbacks originate in timelines; patience uses a 100 ms interval; day time uses a 1,000 ms interval; arrival uses a day-dependent interval; ordering uses a 2,000 ms one-shot implemented with `setInterval` and self-cancellation.

Native simulation uses integer thirds of a millisecond: 250 units per animation cadence, 300 per patience interval, 3,000 per day-clock interval. Core logic is independent of renderer frame rate. Animation cadence is global and does not restart whenever food is placed. Commands at a given simulation time apply after any events already advanced through that time. Simultaneous queued callbacks execute in registration order; this is a documented deterministic native policy, not yet a measurement of Flash ordering.

## Food and pointer state

Sources: [main gameplay](../../reference/decompiled/extended/clean/scripts/frame_5/DoAction.as), [food first removal](../../reference/decompiled/extended/clean/scripts/DefineSprite_472/frame_284/DoAction.as), [food second removal](../../reference/decompiled/extended/clean/scripts/DefineSprite_472/frame_495/DoAction.as); label `flip` at frame 291 from the preserved XML/display-list data.

There are 18 cooking slots and four pointer modes: blank, batter, dosa and plate. Clicking batter works only with a blank pointer. With batter held, clicking an empty slot places food and releases the pointer. Clicking an occupied slot retains batter. Background release cancels batter; it returns held food to its original slot and resumes cooking; it returns the plate to its default position.

Source startup calls `mcDosa.Stop()` with an uppercase S. The method is undefined, so the hidden template at `(1000,1000)` keeps playing. If batter is not picked first, it emits the frame5/frame36 cooking sounds and removes itself at frame284, deducting Rs.2 with a zero floor. Loss feedback is positioned offstage too. A timely bowl click resets and stops the template at frame1, preserving it even if batter is then cancelled. After template removal, bowl clicking still selects batter and an empty-slot click clears the pointer, but duplication creates no dosa. The next day/retry creates a fresh template. This source bug is preserved and confirmed by an instrumented Ruffle probe.

Food begins on source frame 1. Its domain age increases on the independent 12 Hz cadence. Time thresholds are derived once from source frame positions; original pose numbers are exported only as presentation metadata.

| Operation | Inclusive start | Exclusive end | Source pose range |
|---|---:|---:|---|
| Flip first side | 70 cadence ticks since placement | 159 ticks | 71–159 |
| Pick up second side | 36 ticks since flip | 139 ticks | 327–429 |
| Remove unflipped food | 283 ticks since placement | — | callback 284 |
| Remove flipped food | 204 ticks since flip | — | callback 495 |

Flip jumps to second-side age 0, source pose 291. Flip is accepted with blank or plate pointer; original code only excludes batter and held dosa. Pickup is similarly permitted while dragging a plate and replaces the pointer mode. Do not repair this into a stricter drag model without a decision.

Pickup stops the food's parent cooking timeline. Background returns it and resumes from its frozen age. Clicking plate adds a frozen duplicate at the held food's release coordinates and clears the slot; it does not immediately center or stack that duplicate. A blank-pointer plate click changes mode only, even for an empty plate; relocation waits for subsequent movement. Plate quantity has no source-defined limit. Independent child playback while the parent is stopped still requires presentation comparison.

Burn removal deducts Rs.2, clamped to cash 0, and starts loss feedback. Food cannot be picked up in the burned appearance interval, but the penalty occurs only at the later removal callback. The readiness tooltip appears only during the first-side flip window.

Original positions: plate starts at `(25,336.95)`, but the counter initially remains at its separately authored `(-0.65,303.8)`. While carrying, movement sets plate `(pointer.x,pointer.y+20)` with only plate y capped at 390; food follows uncapped `pointer.y+20−2*index`, and counter follows `(pointer.x+35,pointer.y−25)`. Serving or cancelling plate dragging centers remaining food at the default plate position and moves the counter to `(60,311.95)`. Picking cooked food while carrying changes pointer mode without resetting the plate; cancelling that held food still leaves the plate at its last position. New-day/retry restores both authored initial positions.

## Customers, orders and cash

Sources: [customer 0](../../reference/decompiled/extended/clean/scripts/DefineSprite_413/frame_1/DoAction.as), [customer 1](../../reference/decompiled/extended/clean/scripts/DefineSprite_399/frame_1/DoAction.as), [customer 2](../../reference/decompiled/extended/clean/scripts/DefineSprite_400/frame_1/DoAction.as), [customer 3](../../reference/decompiled/extended/clean/scripts/DefineSprite_371/frame_1/DoAction.as), [customer 4](../../reference/decompiled/extended/clean/scripts/DefineSprite_385/frame_1/DoAction.as).

Five identities share five table slots. Arrival begins after `(16−day*2)` seconds, then repeats. Choose a random identity up to 100 times looking for an invisible character, then choose a random table up to 100 times looking for an unoccupied table. If no free identity is found, the last random identity still proceeds to table selection. If no free table is found, nothing spawns. A free slot is not selected by compacting the available list; doing so changes random consumption.

Appear assigns position `(table.x,table.y−40)`, reserves the table, hides order/anger/exit visuals, resets served count and eating count, then starts the 2-second order delay. It does not rescale the character to match the table.

Order quantity is uniformly `floor(random()*4)+1`. Order sets patience to −66 and starts increments of 0.2 every 100 ms. This value is MovieClip `_y`, so **each assignment** converts to twips: `Math.trunc(value * 20) / 20`, including service adjustments. Free-running double addition is not equivalent. The targeted Ruffle trace remains alive at −30.05 and departs at −29.85, after 160 unserved callbacks (16 seconds). Anger starts above −40 on callback118 and remains latched through partial-service recovery; complete service, departure or new appearance clears it. `angrySinceMs` records the actual crossing.

Appear does not clear earlier handles before overwriting the order timer, nor does it reset every hidden meter or character pose. Fresh/initialized meters retain authored `-65.9` from sprite357; only OrderDosa resets to `-66`. A forced visible-character reuse can therefore leave multiple callbacks active. Complete service clears only the latest patience handle. Orphan callbacks target a clip path: after a result screen removes the clip, a new day recreating that path lets them affect its fresh, initially invisible meter. The recreated customer's source `tableNumber` starts at0 even before it reserves a table. Observed orphan values begin `-65.7,-65.5,-65.3`; an ordered meter instead begins `-65.8,-65.6,-65.35`. Native path rebinding and handle cleanup preserve these runtime-confirmed cases and pass focused tests.

Serving only changes an active visible order. It first reduces patience by **offered plate count ×6**, even if the plate offers more than the customer needs. It consumes min(plate count, remaining order), removing from the top of the stack, and updates served and remaining quantities. Empty plate serving is accepted and adds no food/patience. Partial serving leaves the order and timer active. Complete serving hides the order, stops patience and starts eating. Service sound is requested and the plate resets even when clicking an entering/eating/exiting visible customer; an absent character is not clickable.

| Customer ID | Container sprite | Eating sprite | Cycle length | First eating callback |
|---|---:|---:|---:|---:|
| 0 | 413 | 412 | 12 ticks | after 11 ticks from frame 1 |
| 1 | 399 | 398 | 10 ticks | after 9 ticks |
| 2 | 400 | 320 | 20 ticks | after 19 ticks |
| 3 | 371 | 338 | 9 ticks | after 8 ticks |
| 4 | 385 | 384 | 20 ticks | after 19 ticks |

Every completed eating cycle calls CheckComplete. After served quantity×3 callbacks, GoHappy awards served quantity×Rs.2, starts bill feedback and begins exit. Subsequent eating callbacks are separated by full cycle lengths. Exit sprite 370 calls Disappear on frame 7, after 6 cadence ticks from frame 1. Table vacancy therefore follows exit, not serving or payment. An impatient departure also waits for this exit callback unless it triggers game over.

Day cash is cumulative; lost-customer count resets per day. Food left in hand/on stove/on plate and customers still eating at day end produce no extra settlement. Known day callbacks stop; overwritten orphan customer callbacks retain the path-rebinding behavior above.

## Audio and legacy integration

Main gameplay randomly selects music 1 or music 2 and starts 10,000 loops at volume 50 even when the boolean mute flag is false. The menu sound is a root timeline tag: sound162, frame3, no loop field, so play `bgMusic2` once. The frame5 root also contains sound477 with 32,767 loops; its interaction with the same frame's stopAllSounds ActionScript is an ordering question, not a reason to blindly play a second background track. Unmute selects music again. Gameplay mute stops music only; menu mute stops all sounds. Order voices are gated by the boolean. Serve is requested without a mute guard but the symbol is absent from ExportAssets; preserve the request and classify its unresolved audible effect.

Food sprite timeline triggers sound 441 at frame5, sound 446 at36, sound 468 at295, sound 446 at303. At those same frames the source calls stopAllSounds if muted. Cashregister is sprite 431 frame 2, one cadence tick after bill start, followed by the same mute check. Feedback bill hides at frame 17; loss animation hides at frame 30.

The original external form uses game name `madrasidhaba`, defaults the editable name to `noname`, and submits the exact text without trimming, required validation or a maximum length. Its HTML controller hides the form immediately on submission and sends original fields plus the transcribed Rijndael verification value through an explicitly configured adapter. Response receipt does not prove acceptance: the source only traces `postResult`. Native status/error feedback remains outside the form, with manual retries only.

Default deployment configuration has no POST endpoint, so the visible form explains online unavailability and sends nothing. Local saving is an explicitly separate More options feature; the core `submit-score` event serves that local path. Session-refresh events use the same explicit endpoint/host-ID configuration without a duplicate timer. Branding sprite161 and the original leaderboard use user-activated links. Member/tournament request builders preserve dormant source routes without pretending the original host is available. See [protocol and fixtures](../../src/services/README.md). Native HTML replaces the MX input/button infrastructure; the current Submit skin is an approximation.

## Verification limits

Core tests cover cooking, customers, plate coordinates and hidden-template behavior; service tests cover exact request fixtures, configuration and failure handling. Targeted Ruffle probes supplied additional evidence for twip conversion, hidden-template expiry, interval normalization and orphan-reference rebinding. The 40-test core suite passed before the final authored-meter correction, followed by six affected tests passing after it. The resulting 41-test full-core run remains to be recorded at this checkpoint. These observations do not establish historical Adobe Flash parity, complete nested presentation equivalence, background-tab behavior or remote server acceptance. Remaining gates stay in [decisions.md](decisions.md).
