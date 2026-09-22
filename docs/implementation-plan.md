# Native HTML and TypeScript implementation plan

This is the persistent work plan. Update task checkboxes only when the stated evidence exists. Record the current task, evidence, unresolved questions and next action in [task-status.md](task-status.md) before handing work over or ending an implementation session.

PERF-23 calibrates refresh scheduling and native visible-window geometry before
further acceptance. An idle reference at 59.97 callback/s can be nominal 60 Hz
without missed intervals; callback rates are not physical presentation rates.
PERF-24 investigates the large Canvas update path reproduced without game assets.
Extra now reuses complete unchanged frames: 480 exact pixel/hit comparisons and
129 tests pass. Integrated native Pi days meet the warmed cadence/CPU budget at
60.00 / 59.99 callback/s and 33.28% / 29.60% of one core. Cold and terminal
stalls remain open. See [performance-cadence.md](performance-cadence.md).

The integrated Intel/NVIDIA full-day continuation records warm 121.08 / 138.56
callback/s but 105 / 69 gaps above 50 ms. Trivial native controls also vary or
stall. PERF-25 now covers desktop scheduling/compositor attribution; high
average cadence does not close smooth-play acceptance.

Full resolution continuation: PERF-16 fixes repeated griddle filter eviction at large backing dimensions, with unchanged scene pixels and hit targets. PERF-18 now records physical Raspberry Pi measurements and UI/pixel checks. Cold first appearances and higher density Intel/Pi pacing remain open as PERF-17 in [performance-plan.md](performance-plan.md). Earlier performance acceptance applies only to its measured resolution matrix.

PERF-20 extends attribution to the whole pipeline. PERF-21 delivers the first Extra scene retention treatment, verified by 360 exact pixel/hit comparisons and 128 tests. Full-day Pi results still fail the combined stable-60-FPS/low-CPU target; PERF-21/22 remain open. See [performance-pipeline.md](performance-pipeline.md) for the 66-case evidence, current implementation and remaining priorities. A short fixture reaching 60 FPS does not close full-game acceptance.

## Scope and baseline

Presentation follow-up: Classic and Extra profiles now share the game core and verified appearance-preserving cache work. Decorative simplifications and added guidance/display features belong to Extra. Shared correctness and portability fixes remain in both. PROF-1–6 are implemented and verified; PROF-7 shipping-default selection remains open in [performance-plan.md](performance-plan.md#profile-separation-plan). Both distributions retain previous behavior when no profile has been chosen. The [profile report](presentation-profiles.md) records 128 passing tests, full-day functional equivalence and measured performance limits. Game rules and functional order/patience information are unchanged; PERF-17 is not universally resolved.

- Rebuild the extended Madrasi Dhaba edition as a native HTML/Canvas application with the complete game implementation in TypeScript.
- Preserve game rules, timing, interactions, content, tutorial, sound and score flows. Do not silently simplify or fix original behavior.
- Move rules out of Flash timelines into explicit domain states and timing. Preserve meaningful animation timing and appearance without implementing a general Flash interpreter.
- Keep simulation independent of browser APIs, rendering and input devices. Unreal Engine, asset upscaling and VR are later projects, not deliverables of this plan.
- Baseline: `reference/swf/extended.swf`, 1,486,192 bytes, SHA-256 `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a`.
- The smaller edition is comparison material, not a source from which to mix convenient behavior into the baseline.
- Evidence now combines static source analysis, native regression tests, hash-verified canonical playback and instrumented source scenarios in pinned Ruffle0.6.0. Historical Adobe and untested browser/device equivalence remain explicitly limited.

## Completion rules

A task is done only after its deliverable and verification are recorded. A visually playable demo is not a complete port. Every relevant original behavior and asset must map to an implementation, an explicitly justified replacement, or an unresolved item. No unresolved functional omissions may be hidden behind a completed phase.

If original behavior is ambiguous, mark it as uncertain with a reproduction scenario. Distinguish source-code evidence, observed runtime behavior and assumptions. Changes to gameplay or legacy integration require a recorded decision rather than an accidental implementation difference.

## P0 — Preserve references and organize work

- [x] P0.1 Preserve both canonical SWFs, verify hashes and maintain the source URL/checksum/size index.
- [x] P0.2 Preserve raw and deobfuscated ActionScript and the existing comparison findings.
- [x] P0.3 Provide a working JPEXS launcher and reproducible, pinned tool setup.
- [x] P0.4 Keep temporary tools in `.local-setup/`, remove duplicate mirror binaries and obsolete personal-path logs.
- [x] P0.5 Save this plan and a separate resumable task status file in Git.

Evidence: existing source manifests, research findings, resource guide and repository history. P0 does not imply that all reference behavior has been catalogued.

## P1 — Complete inventory and behavior specification

P1 asset work and P1 logic work can run independently; reconcile them before implementing timeline-dependent mechanics.

- [x] P1.1 Inventory every extended-edition resource by stable SWF ID, export name, type and dependencies. Map human-readable roles such as customer, order bubble, dosa, plate, radio, clock and tutorial.
- [x] P1.2 Build reproducible exports for vector shapes, characters, animation clips, button states, sounds, text and fonts. Keep the immutable SWF separate from generated and optimized application assets.
- [x] P1.3 Build a local resource catalogue with search, previews, animation play/pause/frame stepping and sound playback. Include nested resources and links back to the source IDs.
- [x] P1.4 Map all main timeline screens, sprite scripts, button actions, frame labels, clip events and exported symbol references. Inventory all 83 script exports; classify game logic separately from Flash UI-library code.
- [x] P1.5 Write `docs/game-rules.md`: state transitions, timers, numeric thresholds, initialization/reset, orders, patience, cooking, movement, scoring, days and failure/success conditions. Link each rule to source evidence.
- [x] P1.6 Extract behavior embedded in animation frames: exact frame boundaries, one-based indexing, playback jumps/stops, nested timelines and action ordering. Convert these to explicit timing/state rules with boundary examples; do not assume all timers are the same clock.
- [x] P1.7 Record reference scenarios covering every screen, the tutorial and skip, representative interactions, day completion, game over and retry. Capture meaningful visuals/audio and relevant timing without uploading scores or personal data.
- [x] P1.8 Create `docs/behavior-coverage.md` mapping each feature/rule/resource to its source, implementation target, verification scenario and status.
- [x] P1.9 Create a discrepancy/decision register for uncertain behavior, decompiler artefacts, broken symbol references and unavailable external services. Resolve or explicitly gate each issue before claiming complete parity.

Acceptance: no unexplained gaps in inventory; all gameplay event sources and clocks accounted for; source references for every specified rule; reference scenarios and uncertainty list available. Catalogue previews alone are not runtime equivalence evidence.

Inventory detail required by P1.1–P1.3: origin/anchor, dimensions, transforms, depth, masks, color transforms, hit areas, parent/child graph, instance names, frame labels and screen usage. Each export records the source SWF hash, symbol ID, conversion settings, output checksum and timing. Include font specimens and text metrics in the catalogue. Classify unreachable or unused resources explicitly; do not silently discard them.

### Initial source-derived cases to investigate

These observations seed P1.6/P1.9 and the regression matrix; runtime consequences still require reference verification.

| Case | Source evidence | Required investigation |
|---|---|---|
| Independent clocks | SWF 12 fps; customer patience timer 100 ms; main clock timer 1,000 ms | Recover clock origins and event ordering; avoid premature rounding or replacing all timers with one approximate duration |
| Cooking boundaries | `frame_5/DoAction.as`: flip at frames 71–159, pickup at frames 327–429; sprite 472 removal callbacks at frames 284 and 495 | Test immediately before, at and after every boundary; preserve the frozen appearance on pickup/plating and resumed playback on cancellation |
| Nested food visuals | `frame_5/DoAction.as`: independent `thavi` and `mcShadow` playback | Map these to presentation states without allowing decorative animation to determine core rules |
| Eating and delayed departure | Customer `Eataction()` callbacks; sprite 370 frame 7 calls `Disappear()` | Determine eating durations for all five characters, when money is awarded and when a table actually becomes free |
| Serving and patience | Customer `ServeDosa()` subtracts offered plate count ×6 before consuming the required amount | Test empty, partial, exact and surplus serving, including attempts before ordering and during eating/exit; verify floating-point thresholds |
| Later-day spawn interval | `frame_5/DoAction.as`: `(16 - currentLevel * 2) * 1000`; frame 7 increments the level | Test days 7, 8 and 9; investigate zero/negative interval behavior rather than adding an unapproved difficulty cap |
| Random placement under occupancy | `CustomerMaker()` has bounded repeated random searches | Test all tables occupied, all character identities occupied and repeated random choices; preserve the actual fallback behavior |
| Audio state across screens | Extended-edition initialization, mute/unmute and customer sound guards | Verify menu/gameplay transitions, retry, next day, overlapping effects and missing sound references rather than assuming mute affects every sound identically |
| Competing end conditions | Main `TimeStep()`, `LostCustomer()` and food-removal callbacks | Test day end colliding with a served order, burnt dosa or the fifth lost customer; verify cleanup and score snapshots |

Compare simulation results at different renderer frame rates. Tutorial sprite 321 has 335 frames, but its total observed duration must account for actions and nested timelines rather than simply dividing by 12.

## P2 — TypeScript foundation and shared contracts

Requires P1.4–P1.6 sufficiently specified; asset exports may continue in parallel.

- [x] P2.1 Set up strict TypeScript, HTML entry, development/build commands and a repeatable local launch. Record any new temporary tooling under `.local-setup/`.
- [x] P2.2 Define typed game state, commands, events, timing units, entity IDs and snapshot format. Document the contract before renderer and simulation agents work independently.
- [x] P2.3 Define controllable simulation time and random-choice inputs. Seeded randomness supports internal repeatability; comparing with Flash requires equivalent recorded choices, not an assumption that equal seeds produce equal randomness.
- [x] P2.4 Define asset IDs, anchors, bounds, animation names and visual event contracts using the inventory. Rendering must not write domain state or decide when food is cooked.
- [x] P2.5 Define adapters for audio, input, persistence and score services, including supported behavior when legacy services are unavailable.

Proposed application boundaries, to be confirmed through P1: `src/core/`, `src/render/`, `src/input/`, `src/audio/`, `src/ui/`, `src/services/`, `assets/`, `tests/`. These are architecture intentions, not implemented directories.

Acceptance: the core can run without DOM, Canvas or audio; contracts include timing and ownership rules; the minimal browser shell builds and launches. No generic SWF runtime is introduced into the shipped application.

## P3 — Native game simulation

Requires P2 contracts. Preserve boundary behavior and event order before optimizing.

- [x] P3.1 Implement screen/session initialization, start, instructions, gameplay, day result, game over, retry and next day transitions.
- [x] P3.2 Implement customers, table allocation, order generation, patience and departure, including full-table and simultaneous-event behavior.
- [x] P3.3 Implement batter/spoon and dosa lifecycle, cooking slots, flip/readiness/burn thresholds, invalid operations and cleanup.
- [x] P3.4 Implement plate contents, stacking, pickup, movement and serving, including partial/excess quantities and input-state transitions according to the baseline.
- [x] P3.5 Implement cash, penalties, lost-customer limit, day clock, difficulty and cumulative results. Verify what persists and what resets across each screen transition.
- [x] P3.6 Implement exact source timer/event lifecycle, including the original overwritten timer handles and their observed rebinding across retry/next day; do not silently fix the source leaks.
- [x] P3.7 Add meaningful boundary and scenario tests derived from P1, including simultaneous customer loss/day end, repeated input, long sessions and controlled random choices.

Acceptance: all specified core scenarios pass; each implemented rule has coverage evidence; the core has no dependency on display frame numbers or browser timing. Intentional deviations are separate decisions, not hidden fixes.

## P4 — Native browser presentation and interaction

Requires P1 exports and P2 contracts. Can progress alongside P3 using shared fixtures.

- [x] P4.1 Render original composition, vector/bitmap assets, layering, transforms, masks, anchors and hit regions faithfully. Preserve the original 550 × 400 coordinate system while scaling the display.
- [x] P4.2 Rebuild customer, food, radio, clock, feedback and decorative animations. Use per-clip representations suitable for this game; retain all meaningful poses and timings without recreating Flash's full runtime.
- [x] P4.3 Recreate the complete tutorial and skip behavior, all menu/result screens, buttons, labels and text layout.
- [x] P4.4 Connect pointer actions to typed commands, accounting for click/release semantics, dragged objects, overlap, leaving the canvas, scaling and input cancellation. Do not silently change the original interaction model to conventional drag-and-drop.
- [x] P4.5 Integrate all 11 sound resources, two music tracks, order sounds and mute/unmute behavior. Verify loops, overlaps and transitions, with browser audio activation handled explicitly.
- [x] P4.6 Integrate the complete score/name form and result flow. Keep legacy remote endpoints isolated; validate requests against local fixtures rather than posting test scores to third parties.
- [x] P4.7 Decide and document actual online score-service behavior. A locally saved score is not automatically equivalent to an online leaderboard; do not mark this feature complete without an explicit resolution.
- [x] P4.8 Handle loading, missing assets, resizing, high-density screens and browser focus/background timing. Identify any compatibility adaptation separately from the original rules.

Acceptance: all inventoried user-visible screens/resources and interactions are represented; animation observes domain state; sound and score UI flows are verified; no Flash emulator or SWF is needed by the application at runtime.

## P5 — Equivalence, completeness and delivery

Requires P3 and P4 integration. Start collecting evidence earlier rather than deferring all verification to the end.

- [x] P5.1 Replay the P1 reference scenarios with equivalent actions, timing and random choices. Compare state transitions, cash, orders, patience, food states and end-of-day results.
- [x] P5.2 Compare representative frames, complete animation cycles, tutorial and audio events against the reference. Check text, masks, layering and nested animations as well as static appearance.
- [x] P5.3 Exercise supported browsers and normal/high-density/resized displays, audio activation and focus changes. Publish the actual tested matrix.
- [x] P5.4 Complete the behavior/resource coverage table; investigate each mismatch and record its resolution. Audit timers, retry/day resets and unreachable or unsupported features.
- [x] P5.5 Verify the production build has no dependency on `.local-setup/`, decompiled code, original SWFs, emulator code or a legacy Flash server for basic gameplay.
- [x] P5.6 Document launch/build commands, architecture, source-to-TypeScript mapping, decisions, remaining service dependencies and verification results. Scan distributable files for personal information and credentials.
- [x] P5.7 Produce a clean committed deliverable with the native application and source. Report completed behavior and any remaining limitation precisely; do not label incomplete functionality a complete port.

Acceptance: every required behavior and resource is accounted for and verified; all agreed native-app checks pass; no unacknowledged omissions remain. Evidence must distinguish verified parity from assumptions. Legacy integration must preserve the original form/request contract and disclose external service availability. A local score must never masquerade as acceptance by the original server.

## Verification workflow

Keep task IDs, implementation decisions, unresolved questions and verification evidence current. Check integrated behavior before marking work complete.

## Completion pass

The initial implementation audit is integrated: customer reuse and orphan function timers, source twip quantization, hidden template behavior, nested cooked-food smoke, pointer/plate positions, tutorial persistent child clocks, original audio event rules, score form/protocol and branding. P3 lifecycle acceptance means preserving source leaks, not inventing blanket cleanup.

Checked P4 tasks mean their native implementation and bounded verification exist. They do not certify exact historical audio/pixels. Original vector composition includes isolated source-space fractional filters, correct paint-time gradients and authored tinting. All original resource/action roles are accounted for; missing device-font outlines and external server requirements are explicit in the decision register.

P4.7 is resolved at the application boundary: original external/member/tournament/session contracts and verification are implemented; requests only run against explicitly configured endpoints. Default standalone mode reports unavailable and does not claim score acceptance. The historical server is an external dependency absent from the preserved binary, not an omitted native algorithm. Local scores are a separate option.

Reference evidence includes canonical screen flow; complete cook/hold/plate/serve/payment/exit; a full180-second source day with nine scripted servings; template removal; patience quantization; timer rebinding; cooked smoke; and full335→1 tutorial loop/Skip. Native scenarios independently pass a full day and repeated game-over/retry cycles. Their different arrival fixtures are not represented as an identical-input replay. A separate matched-day60-action fixture now also passes in native TypeScript and the audited controlled-RNG source derivative:12 serves,cash24,clock720,then initializedday2cash24clock540.

Final integration has106 passing tests and zero asset errors. Reference and source-derived graphics comparisons are complete within the explicitly documented coverage; exact historical waveform/device-font/pixel equivalence remains a limitation, not a claimed result. Final packaging and browser acceptance are recorded in the verification report. See [verification.md](verification.md), [reference-validation.md](reference-validation.md), [performance-plan.md](performance-plan.md) and [task-status.md](task-status.md). P5.1–P5.3 retain precise coverage limits rather than promising every historical runtime or device.

Catalogue usability work is retained: persistent right Details sidebar; resizable/hideable gallery; saved Autoplay; no automatic enlargement of small assets; fullscreen and viewport fit. Native game controls retain the compact menu, in-stage tutorial and post-paint audio gesture fallback.

### Delivery record

All native implementation tasks and available-environment verification gates have deliverables and recorded evidence. The final suite has106passing tests; final GPU/filter composition checks pass; matched source/native day replay passes; the standalone site is57.2MiB and opens independently. See verification.md and performance-plan.md for the actual matrix and explicit limits. P5.3 records the available matrix; PERF-5 was subsequently reopened because actual-gameplay acceptance was overstated; they do not imply untested engines/devices or a passed high-density60Hz aspiration. No hidden functional omission is being substituted with a local-score claim or a fake original-server response.

## Historical performance follow-up

The user-reported stutter reopens PERF-5 acceptance; the prior checkbox was broader than the actual evidence. Continue the existing performance plan at PERF-7–11 and UX-1. These add requested monitoring, quality and discoverability UI while completing attribution and actual-browser/GPU validation. Original TypeScript rules and source assets remain preserved.

Follow-up deliverable:117tests pass; PERF-7-11/UX-1 UI and local component study are complete with recorded limits. PERF-5 acceptance and newly evidenced optimization tasks PERF-12-15 remain open. See performance-follow-up.md for measured attribution and next actions.

## Performance continuation completed

PERF-5 and PERF-12–15 now have completed outcomes in the available Windows/Chrome matrix; the earlier open status above is historical. Bounded exact morph retention and immutable renderer metadata reduce waste without changing gameplay or source pixels. Additional authored-pose interpolation was evaluated and rejected as unjustified. The original P0–P5 implementation has no pending native feature work; external backend/font/historical equivalence limits remain unchanged.

All 121 tests, asset verification, 188 exact cache pixel comparisons, actual Intel/NVIDIA/software studies, complete gameplay scenarios and source/static-site UI checks pass. Actual game counters advance during the final 30-second UI checks. A full 180-second NVIDIA day completes with cash 24 and 237.01 draws/s. The final site is 2,845 files / 60,006,593 bytes. See performance-gpu.md and tests/reference/performance-gpu.json for evidence, cold/warm distributions, memory accounting and the untested device/physical-presentation boundaries.

## Requested UI refinements

- [x] UX-2 Give normal play a compact maximum size, preserve proportions on window resize, and expand in actual fullscreen. Remove permanent viewport filling that counteracted browser zoom. Validated at 1280×850, 900×540, 390×844, 844×390 and 1600×1000.
- [x] UX-3 Hide FPS by default, including migration of the old implicit default; retain explicit opt-in. Limit the initial batter label to eight seconds or first selection, remember dismissal, and replace the circle with the source bowl silhouette for hover/selection. Show distinct flip/grab cursors only during the correct source action windows, updating under a stationary pointer.

Implementation and verification: 122 tests pass; visible Playwright real-input checks and generated-site results are recorded in verification.md and task-status.md. These are presentation refinements; source rules, vector data and authored timing remain intact.

- [x] UX-4 Separate expanding the game within the browser from true fullscreen. Correct the Playwright launcher's native-window behavior and verify actual screen bounds plus restoration, beyond the DOM fullscreen flag.
- [x] UX-5 Remove the menu's 0.85-source-pixel right-edge seam without rescaling the scene or changing source masks/assets. Browser pixels confirm no white column remains.
- [x] UX-6 Explain file:// restrictions before attempting module loading; retain offline local HTTP launch. Start/reuse the local server before opening the normal browser launcher.

These follow-ups retain 122 passing tests; source and generated-site native-window/file/edge checks pass in tools/window-check.mjs. See task-status.md for the correction to earlier DOM-only fullscreen acceptance.

- [x] UX-7 Replace the file:// instruction-only fallback with actual direct-file gameplay. Generate classic bundles and embedded resource transport from the same TypeScript modules. Generate a single portable HTML containing the entire native game, and preserve HTTP operation. Support the repository catalogue from file URLs as well.

Verified on visible isolated Chrome 153 and Firefox 140.0.2 with all HTTP(S) requests blocked: repository index, static-release index, and portable HTML copied alone; complete cook/flip/pickup/plate interaction, tutorial/Skip, all eleven sounds and catalogue vector preview. 122 automated tests and the HTTP/native-window regression pass. Generated offline outputs remain in ignored dist/ and are rebuilt automatically, with no duplicated mirrors in Git.

- [x] DIST-1 Separate standalone game, full site and development output into independent directories. Remove mixed legacy outputs and nested portable copies; update loaders, build scripts, tests and documentation. Verify each distribution as an isolated HTTP root and retain direct-file gameplay/catalogue support.

Evidence: strict build and 122 tests; visible isolated Chrome HTTP-root acceptance for both packages and file:// gameplay, eleven sounds, fullscreen and both catalogues. Path-free results: tests/reference/distribution.json. Reproduce with tools/distribution-check.mjs and tools/offline-check.mjs. See task-status.md for final paths and counts.

## Single setup and corrected separation

The user clarified that the catalogue is development tooling, not a distributable product. DIST-1's game/catalogue site is superseded by this layout.

- [x] DIST-2 Keep only the game in dist/site and dist/standalone. Move catalogue and verification source to development/, and all intermediate build output to .local-setup/build/. Preserve HTTP/file gameplay, full development catalogue navigation and the required game resources.
- [x] SETUP-1 Provide scripts/10_setup.cmd as the single Windows bootstrap for local pinned Node.js, TypeScript, Playwright and a test browser when needed. Share launcher logic; verify a clean copy without global Node/npm, repeat setup without downloads, build reproduction and documented commands.

Evidence: portable Node download/checksum and Windows x64 clean-copy bootstrap with global Node/npm removed from PATH; fresh TypeScript/Playwright installation; cached repeat; byte-identical standalone build. All 123 tests pass, including player-resource parity and development-code exclusion. Visible Chrome verifies isolated HTTP packages, all file game entries and sounds, native fullscreen, 636-resource catalogue navigation by file/HTTP and development verification loading. Local tools/log paths remain blocked by the server. No gameplay rule change. Installer Chromium fallback and Windows ARM64 paths are implemented but not exercised on this Chrome-equipped x64 host. See tests/reference/distribution.json and task-status.md.

- [x] SETUP-2 Move all seven user launchers out of the root into scripts/, using the requested two-digit-index/underscore convention. Put build/server implementation helpers under scripts/internal/. Update all callers and guides; explain that 10 is first setup, 20 is everyday play and the rest are optional actions.

Verification: relocated setup, build and test launchers execute from outside the project; all 123 tests pass. The relocated reference launcher passes -Check, and the internal server resolves the root/catalogue/compiled modules from another working directory. No root CMD files or duplicate aliases remain. See scripts/README.md.

- [x] SETUP-3 Group launcher indices by decade and purpose, preserving NN_name.cmd. Use 10 setup, 20 play, 30 resources, 40 build and 50 tests; reserve space within each category without adding empty commands. Update guides and executable hints. Verified renamed setup/build/test commands and all 123 tests; no root or duplicate aliases remain.

- [x] DOC-1 Redesign the root README around the playable native remake, with recognizable lightweight menu artwork, quick start, implementation architecture, measured optimizations and publishing instructions. Keep long setup/layout/handoff details and reconstruction research in separate documents. Verified Markdown preview at desktop/mobile sizes, image loading, four navigation anchors and 32 links across the README and setup guide. Image: 720 × 524, 48,952-byte JPEG. No game-code changes.

- [x] BRAND-1 Preserve Madrasi Dhaba as the original game title and identify only this reimplementation as part of Afresh; add a small separate credit beneath the original GamezIndia logo, preserve original artwork/link behavior and update page/README identity. Release build and 16 visible Chrome checks pass across source HTTP/file, site file and standalone file, including narrow layouts and menu/instructions/gameplay transitions. Refresh the lightweight README image and preserve its binary bytes in Git.
- [x] DOC-2 Research the title, original attribution and cultural setting. Save sourced findings in name-and-setting.md, separating confirmed company history and street-food practices from the unverified individual author, location and imagined customer backstory. Link from README.
- [x] BRAND-2 Simplify the visible credit to lowercase afresh and place it just beneath the original logo's lower-right corner. Rebuild both releases and refresh the README hero. Verified exact text, right alignment, bounds and transitions in 16 visible-browser checks.
- [x] DOC-3 Add a concise dhaba culture summary directly to README, citing Wikipedia and distinguishing the game's interpreted atmosphere from documented history. Desktop/mobile README preview, navigation and links pass; see task-status.md.
- [x] DOC-4 Apply the approved Afresh wording, expand README's dosa and roadside-food context with Wikipedia and relevant articles, and add two lightweight screenshots from actual gameplay. Real cook/flip/pickup/plate capture and visible desktop/mobile README checks pass: three images, four anchors, 41 links and no mobile horizontal overflow. Two new JPEGs total 116,942 bytes; see task-status.md.
- [x] DOC-5 Remove prose dash separators, frame cultural notes as tentative reading and guesses, invite contributions and help finding original creators, and replace the similar plate image with the sleeping owner at day end. Preserve welcome/cooking images. Complete production day replay and visible desktop/mobile README checks pass; current image totals are in task-status.md.
- [x] AUDIO-1 Investigate two soundtracks and five voice clips with local recognition and public source comparison. Record the possible Naan Anaiyittaal match, explicitly unreliable language/dialogue guesses, links to all eleven sounds and unresolved questions in name-and-setting.md. No asserted lyrics or individual authorship from unsupported recognition. Tools/caches/logs are confined to .local-setup.

### README and closing screen follow-up

- [x] DOC-6: Replace compressed small images with fresh 2160 × 1572 lossless captures, preserving the welcome scene, adding three customers and varied food with spare griddle space, and retaining the sleeping owner. Keep docs/media limited to the images; capture evidence stays in task-status.md.
- [x] UX-4: Trace closing screen white edges to mask 580 and sky 581. Continue outer pixels only; preserve source geometry and interior pixels. Nine visible size/resolution comparisons pass; 123 tests and both distributions rebuilt.
- [x] AUDIO-2: Add brief English meaning, official lyric source and explicitly unofficial translation link. No official English translation confirmed. Song identification, track 1, dialogue and creator attribution remain research leads.

- [x] AUDIO-3: Document the candidate song for bgMusic1, corroborate title/performer/Hindi catalogue metadata, distinguish original film year from compilation date, and update README and audio findings. Direct local recording comparison remains open; no fingerprint match claimed.

- [x] DOC-7 / AUDIO-4: Restructure README around playing the standalone HTML, screenshots, food and music; keep engineering instructions in developer guides. Expand local explanations for both candidate songs. Desktop/mobile layout, navigation, images and local links verified.

- [x] DOC-8: Use JPEG quality 80 for all three README screenshots at the full 2160 × 1572 resolution. Remove replaced WebPs; total 635,485 bytes, saving 53.5%. Compared JPEG bytes and desktop/mobile README previews verified.

- [x] DIST-3: Track both prepared game packages in Git, link the standalone HTML from README and document rebuilding tracked distributions. Fresh release build and isolated package browser gameplay checks pass without missing files or page errors.

- [x] PAGES-1: Prepare a GitHub Pages workflow publishing only dist/site and document activation. Hosted deployment remains pending repository configuration and push.
