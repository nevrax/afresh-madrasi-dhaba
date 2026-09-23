# Implementation record

The extended SWF is reimplemented in TypeScript. The game runs without Flash or
the source SWFs. Completion below means the native deliverable and its recorded
checks exist, not universal equivalence with historical Adobe Flash.

[Behavior coverage](../reference/behavior-coverage.md), [decisions](../reference/decisions.md)
and [reference validation](../reference/reference-validation.md) own the evidence
and unresolved parity. [Verification](../development/verification.md) owns checks.
Active optimization is in [the performance plan](performance-plan.md).

## Original port tasks

### P0: Preserve references

- [x] P0.1 Preserve both canonical SWFs, verify hashes and maintain the source URL/checksum/size index.
- [x] P0.2 Preserve raw and deobfuscated ActionScript and the existing comparison findings.
- [x] P0.3 Provide a working JPEXS launcher and reproducible, pinned tool setup.
- [x] P0.4 Keep temporary tools in `.local-setup/`, remove duplicate mirror binaries and obsolete personal-path logs.
- [x] P0.5 Save this plan and a separate resumable task status file in Git.

### P1: Inventory and specify behavior

- [x] P1.1 Inventory every extended-edition resource by stable SWF ID, export name, type and dependencies. Map human-readable roles such as customer, order bubble, dosa, plate, radio, clock and tutorial.
- [x] P1.2 Build reproducible exports for vector shapes, characters, animation clips, button states, sounds, text and fonts. Keep the immutable SWF separate from generated and optimized application assets.
- [x] P1.3 Build a local resource catalogue with search, previews, animation play/pause/frame stepping and sound playback. Include nested resources and links back to the source IDs.
- [x] P1.4 Map all main timeline screens, sprite scripts, button actions, frame labels, clip events and exported symbol references. Inventory all 83 script exports; classify game logic separately from Flash UI-library code.
- [x] P1.5 Write `docs/reference/game-rules.md`: state transitions, timers, numeric thresholds, initialization/reset, orders, patience, cooking, movement, scoring, days and failure/success conditions. Link each rule to source evidence.
- [x] P1.6 Extract behavior embedded in animation frames: exact frame boundaries, one-based indexing, playback jumps/stops, nested timelines and action ordering. Convert these to explicit timing/state rules with boundary examples; do not assume all timers are the same clock.
- [x] P1.7 Record reference scenarios covering every screen, the tutorial and skip, representative interactions, day completion, game over and retry. Capture meaningful visuals/audio and relevant timing without uploading scores or personal data.
- [x] P1.8 Create `docs/behavior-coverage.md` mapping each feature/rule/resource to its source, implementation target, verification scenario and status.
- [x] P1.9 Create a discrepancy/decision register for uncertain behavior, decompiler artefacts, broken symbol references and unavailable external services. Resolve or explicitly gate each issue before claiming complete parity.

### P2: Native contracts

- [x] P2.1 Set up strict TypeScript, HTML entry, development/build commands and a repeatable local launch. Record any new temporary tooling under `.local-setup/`.
- [x] P2.2 Define typed game state, commands, events, timing units, entity IDs and snapshot format. Document the contract before renderer and simulation agents work independently.
- [x] P2.3 Define controllable simulation time and random-choice inputs. Seeded randomness supports internal repeatability; comparing with Flash requires equivalent recorded choices, not an assumption that equal seeds produce equal randomness.
- [x] P2.4 Define asset IDs, anchors, bounds, animation names and visual event contracts using the inventory. Rendering must not write domain state or decide when food is cooked.
- [x] P2.5 Define adapters for audio, input, persistence and score services, including supported behavior when legacy services are unavailable.

### P3: Simulation

- [x] P3.1 Implement screen/session initialization, start, instructions, gameplay, day result, game over, retry and next day transitions.
- [x] P3.2 Implement customers, table allocation, order generation, patience and departure, including full-table and simultaneous-event behavior.
- [x] P3.3 Implement batter/spoon and dosa lifecycle, cooking slots, flip/readiness/burn thresholds, invalid operations and cleanup.
- [x] P3.4 Implement plate contents, stacking, pickup, movement and serving, including partial/excess quantities and input-state transitions according to the baseline.
- [x] P3.5 Implement cash, penalties, lost-customer limit, day clock, difficulty and cumulative results. Verify what persists and what resets across each screen transition.
- [x] P3.6 Implement exact source timer/event lifecycle, including the original overwritten timer handles and their observed rebinding across retry/next day; do not silently fix the source leaks.
- [x] P3.7 Add meaningful boundary and scenario tests derived from P1, including simultaneous customer loss/day end, repeated input, long sessions and controlled random choices.

### P4: Browser presentation

- [x] P4.1 Render original composition, vector/bitmap assets, layering, transforms, masks, anchors and hit regions faithfully. Preserve the original 550 × 400 coordinate system while scaling the display.
- [x] P4.2 Rebuild customer, food, radio, clock, feedback and decorative animations. Use per-clip representations suitable for this game; retain all meaningful poses and timings without recreating Flash's full runtime.
- [x] P4.3 Recreate the complete tutorial and skip behavior, all menu/result screens, buttons, labels and text layout.
- [x] P4.4 Connect pointer actions to typed commands, accounting for click/release semantics, dragged objects, overlap, leaving the canvas, scaling and input cancellation. Do not silently change the original interaction model to conventional drag-and-drop.
- [x] P4.5 Integrate all 11 sound resources, two music tracks, order sounds and mute/unmute behavior. Verify loops, overlaps and transitions, with browser audio activation handled explicitly.
- [x] P4.6 Integrate the complete score/name form and result flow. Keep legacy remote endpoints isolated; validate requests against local fixtures rather than posting test scores to third parties.
- [x] P4.7 Decide and document actual online score-service behavior. A locally saved score is not automatically equivalent to an online leaderboard; do not mark this feature complete without an explicit resolution.
- [x] P4.8 Handle loading, missing assets, resizing, high-density screens and browser focus/background timing. Identify any compatibility adaptation separately from the original rules.

### P5: Validation and delivery

- [x] P5.1 Replay the P1 reference scenarios with equivalent actions, timing and random choices. Compare state transitions, cash, orders, patience, food states and end-of-day results.
- [x] P5.2 Compare representative frames, complete animation cycles, tutorial and audio events against the reference. Check text, masks, layering and nested animations as well as static appearance.
- [x] P5.3 Exercise supported browsers and normal/high-density/resized displays, audio activation and focus changes. Publish the actual tested matrix.
- [x] P5.4 Complete the behavior/resource coverage table; investigate each mismatch and record its resolution. Audit timers, retry/day resets and unreachable or unsupported features.
- [x] P5.5 Verify the production build has no dependency on `.local-setup/`, decompiled code, original SWFs, emulator code or a legacy Flash server for basic gameplay.
- [x] P5.6 Document launch/build commands, architecture, source-to-TypeScript mapping, decisions, remaining service dependencies and verification results. Scan distributable files for personal information and credentials.
- [x] P5.7 Produce a clean committed deliverable with the native application and source. Report completed behavior and any remaining limitation precisely; do not label incomplete functionality a complete port.

## Additional delivered work

| IDs | Delivered scope | Current reference |
| --- | --- | --- |
| UX-1–UX-7 | Bowl/cooking cues, compact layout, fullscreen, native window sizing and file playback; UX-4 includes closing-screen edge repair | [Profiles](../development/presentation-profiles.md) |
| DIST-1–DIST-3 | Separate site/standalone packages tracked in Git; development tools excluded | [Setup](../development/getting-started.md) |
| SETUP-1–SETUP-3 | Local bootstrap and numbered command categories | [Scripts](../../scripts/README.md) |
| BRAND-1–BRAND-2 | Original title and publisher preserved; separate small afresh credit | [Project README](../../README.md) |
| DOC-1–DOC-8 | Player-oriented README, local cultural/music explanations and full-size JPEG screenshots | [Project README](../../README.md) |
| AUDIO-1–AUDIO-4 | Candidate recordings and local explanations; exact recording and translation claims remain qualified | [Music research](../reference/name-and-setting.md) |
| PAGES-1 | Deploy the prepared site using the single Pages workflow | [Publishing](../development/getting-started.md#github-pages) |

These are completion records, not instructions to repeat old work. Superseded
package layouts, image-size experiments and session narratives remain in Git
history instead of being mixed with current instructions.

## Documentation maintenance

- [x] DOC-9 Group documents by purpose, translate the remaining Romanian report,
  use Classic/Optimized consistently and distinguish current results from history.
- [x] DOC-10 Add link/terminology/privacy checks and document their scope. Do not
  equate a pattern scan with proof that no possible disclosure exists.

Keep plans in English. Record measurements once in the performance section and
link them from tasks. Task IDs remain stable; past completion does not close a
new regression, such as PERF-26's full-size-ladle cost.
