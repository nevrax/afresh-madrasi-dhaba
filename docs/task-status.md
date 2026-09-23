# Task status

## Current checkpoint: profile labels and full-size ladle

The selector now says Classic / Optimized. Saved `extra` preferences remain
compatible. Optimized's batter ladle is rendered in a small separate surface at
the authored pouring scale, instead of being shrunk into a native mouse cursor.
The surface moves without repainting unchanged restaurant frames. Dosa and plate
keep their previous native previews; Classic/touch rendering is unchanged.

The full-size image matches its source pixels and original scale. All 131 tests
pass. Both distributions are rebuilt; Intel and NVIDIA application/package checks
pass for source, web and direct-file standalone, including resize and carrying.
See [batter-scale.md](batter-scale.md).

PERF-26 is reopened: the full-size moving-ladle stress reaches 52.57 / 59.92
callback/s on Pi A / B, warm CPU 59.52% / 51.65% of one core. These do not meet
the earlier combined cadence/CPU budget. The compact-ladle figures below are
historical and must not be applied to this new path. No automatic clarity or
profile reduction is introduced. PROF-7 default choice is still open.

## Previous checkpoint: preparation, carrying and terminal repainting

Final Extra full days at 2200 × 1600 reach 59.99 / 59.99 callback/s on Pi A / B,
with warmed CPU 32.86 / 29.55% of one core. Maximum gaps are 50.00 / 33.30 ms;
gaps above 50 ms number 0 / 0. Both finish at clock 720 and cash 24.
The corrected Game over phase reaches 59.92 / 60.00 callback/s, compared with
37.70 / 58.69 before the fix. No game rules or vector density were changed.

Extra now reuses terminal frames as well as gameplay frames, and uses compact
native mouse previews for batter, picked dosa and plate. The carried preview's
steam pose is fixed, its count remains visible at the counter, and the original
plate hit target stays live. Classic, touch and unsupported browsers keep the
Canvas carry path. Ordinary cooking and both terminal scenes are prepared before
the timer starts; this costs about 8–10 seconds of visible loading on the tested
Pi environments. Cache limits remain bounded; late/burn poses remain lazy.

Verification: 131 automated tests, 588 exact frame/hit comparisons and 90
independent-cache preparation comparisons pass. Intel and NVIDIA application
checks pass for source, site and direct-file standalone, including profile swaps,
resizing, fullscreen, cooking, native cursors and emulated touch. Native cursor
images/fallbacks were also checked separately from Canvas screenshots. Both
distributions are rebuilt. One Intel UI attempt timed out at the cooking step;
the complete repeat passes without a runtime change, so its cause is unproven.

PERF-21/24/26 and the scoped PERF-22 acceptance are complete. See
[performance-stalls.md](performance-stalls.md) and the anonymous evidence index.
The full-day Intel/NVIDIA repeat reaches warm 235.18 / 234.42 callback/s with
no gaps above 50 ms; callbacks are not physical scanout or a GPU-throughput ratio.

Remaining limits are explicit: PERF-17 covers unprepared late/burn poses,
higher-density and Classic/touch performance; the seeded varied Pi B day has
two isolated gaps above 50 ms (maximum 83.3 ms). PERF-25's intermittent external
desktop graphics waits were captured, but later identical launches are smooth.
Their exact cause remains unproven; kernel tracing lacks the required privilege.
No driver or system policy was changed. PROF-7 still requires a default-profile
choice; no automatic profile or clarity reduction was introduced.

Next investigation, if extending acceptance: reproduce the isolated cold/varied
outliers with matched controls, and measure the Canvas touch path independently
at target density. Do not reopen blanket animation removal without new evidence.

## Previous: native cadence calibration and complete-frame reuse

Matched desktop continuation on integrated runtime `5801794`: full three-minute
native-window Extra days at 2200 × 1600, with actual adapter checks and trivial
controls before/after, reach warm 121.08 callback/s / 33.22% of one CPU core on
Intel UHD and 138.56 / 39.22% on NVIDIA RTX 3070 Ti Laptop. Warm gaps above
50 ms number 105 / 69; maxima are 493.3 / 485.4 ms. Both finish correctly with
zero hidden/unfocused samples and full canvas containment. These are not
stall-free results. Empty/tiny controls also vary and can stall, so PERF-25
must distinguish host scheduling/composition and concurrent load from game work.
The earlier 237/s Intel prototype result is not a guaranteed production rate.
Full evidence is in performance-cadence.md/json. Only benchmark tooling and
documentation changed in this continuation; shipped runtime remains `5801794`.

PERF-23 is complete. Native, maximized, non-emulated browser controls distinguish
refresh scheduling from rendering cost on both Pi environments and Intel. A
59.97 callback/s idle control with no missed intervals is nominal 60 Hz, not
a failure. Intel controls vary from about 166 to 240/s across runs; no fixed
60/s limit applies, and the changing host cadence limits causal comparisons.
The earlier emulated-viewport evidence did not establish native containment.
See [performance-cadence.md](performance-cadence.md) and the anonymous
[measurement data](../tests/reference/performance-cadence.json).

PERF-21/24 now include integrated complete-frame reuse in Extra: unchanged
rendered state and hit targets reuse the existing image, without allocating
another surface, changing game clocks or reducing density. Changed pointer
objects and hover targets remain live. Classic and the unselected profile retain
their previous behavior; PROF-7 remains undecided. The opt-in HUD distinguishes
rAF callbacks, actual Canvas paints and reuse instead of equating them to
physical screen FPS. It remains off initially.

Integrated 180-second native-window days at 2200 × 1600 complete on both Pi
environments with cash 24 / clock 720, zero hidden or unfocused samples and the
entire canvas in the viewport. Warm last-150-second rates are 60.00 / 59.99
callback/s at 33.28% / 29.60% of one CPU core, versus 45.70 / 59.77 and
72.31% / 78.05% before complete-frame reuse. Warm p95 is 16.8 ms on both;
maximum gaps are 17.4 / 33.33 ms. These are callback rates, not unique authored
poses or physical scanout. Both contexts confirm normal synchronization.

129 automated tests and 480 integrated exact pixel/hit comparisons pass.
Source/site/standalone profile, tutorial/cooking, input, storage, fullscreen,
responsive and emulated-touch checks pass in isolated Intel and NVIDIA browsers.
Both distributions are rebuilt. Isolated Pi browsers/tunnels are closed, and
the temporarily awakened display is restored. No OS display settings changed.

**PERF-17/21/22/24 remain open for cold and transition stalls and broader
acceptance.** Initial callback gaps still reach 383.5 / 300 ms; the explicitly
sampled terminal gap is 233.6 / 183.4 ms. The warmed CPU/cadence budget is met
for this command workload, not universal stall-free gameplay. Next: bounded
first-use/end-screen preparation, verify pointer-held workloads and remaining
input/profile/resize performance, then decoded-audio memory lifetime. Do not
reintroduce unconditional full-canvas copies or claim 60 new animation poses/s.

Rejected/experimental work remains outside dist: dirty-region restoration
passes pixels but regresses Pi A; disabling the browser frame limiter floods
submission without proving scanout; the desynchronized hint adds little after
reuse and is not enabled in production. The reusable calibration tooling now
records native geometry and visibility and rejects hidden/unfocused runs.

## Previous: full pipeline attribution and first scene retention

PERF-20 is complete: 66 physical Pi cases extend the effect ranking to CPU
samples, process CPU, Canvas submission, surface controls and graphics-process
host traces. The largest recurring cost is scene submission/composition and
presentation, not simulation or music. English report and anonymous evidence:
[performance-pipeline.md](performance-pipeline.md),
[performance-pipeline.json](../tests/reference/performance-pipeline.json).

PERF-21 is partially implemented. Extra retains a sharp opaque scene between
authored visual changes, while food, pointer feedback and hit targets remain
live. Playing traffic uses authored 12 Hz poses; menu interpolation stays.
The extra surface is capped at 32 MiB and counted in the HUD. Classic and the
unselected compatibility path keep previous behavior. Command retention,
opaque-background substitution and desynchronized Canvas remain experiments.
The full-size browser overlay experiment is rejected: no cadence/CPU gain and
24/360 failed pixel comparisons. It is excluded from both distributions.
PROF-7 remains undecided; no default or automatic clarity reduction was added.

Verification: 128 tests pass; 360 real Canvas comparisons have identical pixels
and hit targets, including same-time state mutations, profile round trips and
resizing. Source/site/standalone UI checks pass on isolated Intel and NVIDIA
browsers. Both distributions are rebuilt. Two real-time three-minute Pi days
finish at cash 24, clock 720 with production audio and no asset-load failures.
The original undefined `serve` export remains the known source limitation.

**PERF-17, PERF-21 and PERF-22 remain open.** The controlled fixture improves
from about 45.6 / 59.6 FPS to 59.6 / 60.0. Complete-day warm performance is
55.62 / 59.85 FPS with 80.96% / 76.17% of one CPU core; those CPU numbers are
not GPU utilization. Cold and final screen-transition stalls remain. Next:
measure and remove the repeated full-surface scene copy during real gameplay,
then bounded cold preparation and separate decoded-audio memory work. Do not
use short-fixture FPS to declare the stable-60/low-CPU target complete.

## Profile separation baseline before scene retention

PROF-1–6 are implemented and verified. Classic and Extra share the core, correctness/portability fixes and established adaptive cache. Extra includes bowl guidance/cursors/display conveniences, decorative interpolation, unblurred griddle steam, fixed stars with a cropped retained background and static order decoration. Counts, patience, customer/food artwork and original audio remain live. Selection persists when possible and switches without resetting gameplay. Absent preference retains the earlier release behavior; **PROF-7 default selection remains open**. Inventory and English report: [presentation-profiles.md](presentation-profiles.md); evidence: [presentation-profiles.json](../tests/reference/presentation-profiles.json).

Acceptance: 128 automated tests pass. Visible Intel/NVIDIA checks cover source, site and standalone profile UI, cooking continuity, isolated preferences, offline/blocked storage, fullscreen and resizing; Intel also checks emulated touch. Fifteen screen/density pixel cases on each adapter restore Classic exactly at authored samples, with unchanged snapshots/hits. Both profiles complete the tutorial, cooking/payment, full deterministic day (cash 24, clock 720), next-day carryover and three retry cycles. All 16 timing cases and hardware identities are saved. Both distributions are rebuilt and verified. Pi browsers are closed and temporary display waking restored. No physical touchscreen claim.

At 2200 × 1600, Classic → Extra fixture FPS is approximately 36.3 → 45.6 on Pi A, 40.0–40.5 → 59.8 on Pi B, 57.3–57.8 → 75.7 on Intel, and effectively unchanged near 168 on NVIDIA. Managed graphics backing falls from 171.2 to 91.6 MiB. At 2970 × 2160, Extra reaches only 28.3 / 36.3 / 42.5 FPS on Pi A / Pi B / Intel. PERF-17 remains open for cold preparation and sustained high density performance. Next product decision is PROF-7; do not choose the default automatically. Further renderer work must preserve the profile boundary.

PERF-19: Component attribution is complete: 56 controlled cases across both physical Pi 5 environments, with repeated controls, cold preparation, warm pacing, cache/memory accounting, actual audio suspension and cheaper visual variants. At 2200 × 1600, omitting the background gives the largest sustained gain (56.01 / 60.00 FPS versus 36.27–36.28 / 41.03–42.07 controls). Large griddle steam costs about 88.3 MiB of managed surfaces and dominates cold long-gap time. A static retained background preserves resolution and reaches 43.11 / 59.66 FPS; static order decoration also helps while retaining count/patience. Music suspension changes the measured rate by only about 0.3 FPS. See [performance-components.md](performance-components.md) and [anonymous data](../tests/reference/performance-components.json).

At the earlier attribution checkpoint, the combined decor cut reached only 39.86 FPS on Pi A, so removing all small animations was not sufficient. That study changed only test tooling/documentation; the subsequent profile implementation and rebuilt distributions are recorded above. Further PERF-17 work must address cold preparation and sustained composition while preserving the profile boundary. No system packages or GPU settings changed.

PERF-18: Physical testing on two Raspberry Pi 5 / 8 GB boards is complete for the documented matrix. Both use verified V3D hardware acceleration. Warm 1485 × 1080 production gameplay reaches 60.00 draws/s on both, with zero new tile bytes, evictions or gaps above 50 ms. At 2200 × 1600 it reaches 39.62 / 52.21 draws/s; cold runs still stall up to 500.2 / 788.8 ms. Each board passes 7 GPU filter and 4 composition pixel cases plus the shipped site's mouse/audio-activation/fullscreen/responsive/tab-return checks. Browser processes and SSH tunnels are closed; temporary display wake is restored. See [performance-raspberry-pi.md](performance-raspberry-pi.md) and anonymous reference data. Test tooling and documentation changed; game code and distributions remain at the tested commit.

Next performance work is PERF-17: first appearance stalls, then sustained high density composition. No OS/browser upgrade was performed, and the two different graphics stacks do not establish which individual component causes their performance difference.

PERF-16: Fixed the large canvas cache thrashing regression without reducing rendering density or removing effects. At 2200 × 1600, verified Intel fixture throughput improves from 5.17–5.33 to 57.84–58.37 draws/s; warm production core gameplay reaches 63.93/s with zero new tile bytes, evictions or gaps above 50 ms. The cache limit scales with actual backing dimensions, remains bounded and releases obsolete density surfaces on resize. All 124 automated tests and 94 exact scene pixel/hit comparisons pass. Both tracked distributions are rebuilt. See [performance-full-resolution.md](performance-full-resolution.md) and its sanitized data.

Isolated site/standalone HTTP checks and network blocked file playback pass gameplay, audio and fullscreen with no missing resources or browser errors. This verification covers rebuilt local packages, not a hosted deployment.

Performance acceptance remains open beyond that measured case: PERF-17 covers cold first appearances and 2970 × 2160 rendering (26.56/s in the short Intel fixture). PERF-18 physical measurements are now recorded above. These are additional performance cases, not missing original game rules. Do not describe earlier 1485 × 1080 acceptance as universal GPU or resolution coverage. Next action is to distinguish cold filter builds from sustained large surface composition, preserving full density and memory bounds.

PAGES-1: GitHub Pages workflow prepared for the tracked dist/site package on main, with manual dispatch and automatic publication on site/workflow changes. The artifact path contains only the four prepared game files. Repository Pages must use GitHub Actions as its publishing source; a successful hosted deployment has not yet been verified.

DIST-3: Both ready to play packages in dist/site and dist/standalone are now tracked in Git. README links directly to the included standalone HTML; setup documentation distinguishes playing from rebuilding. A fresh release build and visible browser checks pass gameplay from each isolated package root, with no missing files or page errors. Local tools and intermediate builds remain ignored.

DOC-8: README screenshots use JPEG quality 80 from the full 2160 × 1572 captures. The three files total 635,485 bytes, a 53.5% reduction from the previous lossless WebPs. Replaced WebPs are removed from docs/media. JPEG bytes match the compared variants; desktop and mobile README previews pass image loading, navigation and overflow checks with no page errors. Game assets and distributions are unchanged.

DOC-7 and AUDIO-4: README leads with standalone HTML playback, screenshots, food and music. Development commands and performance tables are in linked guides. Both candidate songs have local English explanations of themes, imagery and possible setting connections. Desktop and mobile previews pass three navigation anchors, image loading and no horizontal overflow; local documentation links and the music section anchor resolve. Documentation only; game behavior is unchanged.


## Second soundtrack recognition lead

AUDIO-3 documents Jhanan Jhanwa More Bichwa by Geeta Dutt, from Mangala, as the candidate for bgMusic1. Public catalogue metadata identifies the song as Hindi, and Hindi Geet Mala associates it with Mangala (1950). The listed 2:45 duration is close to the preserved 2:44.31 recording; an exact match remains unverified.

README and name-and-setting.md now include the lead, sources, cautious thematic interpretation, unofficial translation link and mixed Hindi/Tamil radio interpretation. Documentation only; no game assets or builds changed. Public source text and Markdown edits checked; no gameplay tests rerun. Direct recording comparison, customer dialogue and individual authorship remain open.


## Sharper scenes, day end edges and song meaning

DOC-6, UX-4 and AUDIO-2 are complete. README retains the welcome scene and replaces all small JPEGs with fresh 2160 × 1572 lossless WebP captures from the vector renderer. The cooking scene has three customers, four varied food poses, fourteen empty slots and zero lost customers. It is a reachable production command replay at 42.75 seconds, not fabricated state. The sleeping owner scene comes from a completed day. All three images total 1,366,404 bytes. The media directory contains only the three images.

UX-4 closes the thin white outer gaps on the day result screen. Source mask 580 covers x=1.15..548.75 and y=1..399.6; sky shape 581 ends at x=548.25 below its top section. Renderer edge continuation samples just inside these boundaries, preserving source assets, input positions and interior artwork. Nine visible browser checks at CSS widths 330/550/880 and render scales 25/50/100%, device scale 3, pass all four edge probes with zero interior pixel changes. The existing scene submission digest excludes this separately pixel checked edge continuation, as it already does for the menu seam.

AUDIO-2 adds a short English title gloss and thematic interpretation, links official Saregama lyrics and a third party Isaimozhi translation, and explicitly reports that no English translation was confirmed official. Song identification remains a tentative lead; track 1, exact customer dialogue and individual creators remain open research questions. Cultural connections and translations invite corrections.

Verification: strict build, 123 tests, static site and standalone rebuild pass. Visible desktop/mobile README preview verifies three 2160 pixel images, four navigation anchors, 44 links across README/setup documentation and no horizontal overflow. Browser capture reports no missing resources or page errors. The nine edge comparisons cover 248 × 180 through 2640 × 1920 backing pixels. Raw diagnostics and capture helpers remain ignored.


## Tentative cultural notes, closing image and audio leads

DOC-5 and AUDIO-1 are complete for the requested investigation. README prose no longer uses dash separators or hyphenated compounds. Cultural notes are explicitly reading and guesses without independent fact checking, and invite corrections, cultural knowledge, translations and evidence identifying the original individual creators. Confirmed local resource counts remain distinguished from cultural/song interpretation.

Welcome and cooking images are retained. The similar carried plate image was removed and replaced by day-end-rest.jpg (720 × 524, 44,193 bytes), showing the sleeping owner after a complete production core replay, with collection Rs. 24. The replay used fixed random choices and advanced simulation clocks through ordinary commands; no fabricated terminal state or score. All three README images total 157,179 bytes.

Audio investigation: two mono music MP3s at 11,025 Hz and 16 kbit/s, lasting 4:53.72 and 2:44.31, with no title/performer tags returned. Local faster-whisper small recognition offers a plausible bgMusic2 match to Naan Anaiyittaal, compared against Saregama's indexed lyrics and credits. It is explicitly a candidate, without fingerprint or fluent-listener verification. bgMusic1 remains unidentified; unstable automatic outputs are not published as a translation or language identification. All five customer clips are linked with cautious recognition leads, and four effects are linked separately. Raw recognition output, tools and model caches stay under ignored .local-setup. See docs/name-and-setting.md.

Verification: complete day replay reaches day-result with cash 24, clock 720 and no missing resources/page errors. Visible README preview passes at 1100 and 390 pixels with three images, four navigation anchors, 43 links across README/setup documentation and no horizontal overflow. Cooking/closing layout visually inspected. Binary Git attributes and local-tool ignores verified. Documentation and screenshots only; no gameplay changes or full-suite rerun. Open research questions remain the second song, exact dialogue, recording variants and individual game authorship.

## Dosa context and live gameplay images

DOC-4 is complete. README uses the approved “Games you remember. Rebuilt for today.” line and full Afresh collection description. Its food/culture section explains dosa/dosai, rice and urad dal batter, fermentation, tawa cooking and common accompaniments; dhaba context cites Wikipedia, with DT Next and a visitor's illustrated account providing real evening-stall parallels. Those examples are not presented as the game's verified inspiration.

Two new 720 × 524 JPEGs show actual standalone gameplay: twelve dosas cooking, then a carried plate of eight with four still on the griddle. Capture used normal real-time pointer input without altered state, random choices or clocks. Combined size is 116,942 bytes (about 114 KiB), displayed side by side at desktop width and stacked on mobile, with full-size image links. All three README images total 166,091 bytes.

Verification: the real cook/flip/pickup/plate sequence completed without page errors. All three images load in the visible README preview at 1100 and 390 pixels; four navigation anchors and 41 links across README/setup documentation pass. Desktop/mobile gameplay layout was visually inspected; no mobile horizontal overflow. Documentation and screenshots only; game builds/tests were not rerun. Capture tools and raw previews remain under ignored .local-setup.

## Smaller Afresh wordmark and README culture

BRAND-2 and DOC-3 supersede the credit wording below. The visible credit is only lowercase “afresh,” smaller and aligned just beneath the GamezIndia logo's lower-right corner. README now includes a short original summary of dhaba culture with a Wikipedia citation, followed by the game's South Indian/evening setting and a clear distinction between atmosphere and verified backstory.

Normal release build passes; 16 visible isolated Chrome checks pass across source HTTP/file, static-site file and standalone file, including exact credit text/alignment, desktop/narrow layout and screen transitions. README preview passes at 1100 and 390 pixels, four navigation anchors and 34 links checked across README/setup documentation, with no page errors or mobile horizontal overflow. Updated hero is 49,149 bytes and was visually inspected. The stopped development server was restarted at 127.0.0.1:5173. No gameplay changes; no full-suite rerun needed for these presentation edits.

## Afresh identity and cultural context

BRAND-1 and DOC-2 are complete. The game title is Madrasi Dhaba. Afresh identifies the reimplementation, with no ownership claim over the original game or its assets. A non-interactive, stage-scaled “remade by afresh” line sits beneath the original GamezIndia logo on screens where that logo exists. Its position updates on screen transitions only. Original title artwork, publisher link and gameplay remain intact. The local server recognizes both old/new document titles when reusing a running server.

docs/name-and-setting.md records the name's meaning, GamezIndia/ChaYoWo company history, known attribution limits, the evening street-food parallel and real-world examples with sources. No individual author or particular restaurant is claimed without evidence. README links that note and presents the collection identity.

Verification: normal release build passes. Visible isolated Chrome passes 16 checks across source HTTP, source file, static-site file and standalone file: desktop/narrow menu layout, instructions and gameplay transitions, credit visibility, bounds, pointer pass-through and no game-control overlap or page errors. Hero recaptured from the stage: 720 × 524 JPEG, 49,428 bytes, visually inspected alongside the mobile screen. The JPEG now has an explicit binary Git attribute, overriding the documentation text rule. No simulation/rendering algorithms changed; the full gameplay suite was not rerun for this branding edit. Temporary browser profile and checks remain in .local-setup.

## Current README presentation

DOC-1 is complete. README now leads with the recognizable native menu screenshot and the restaurant gameplay, followed by quick start, current features, TypeScript architecture, measured cache/frame-pacing improvements, game-only publishing and contribution links. Detailed setup/folder/source-handoff instructions are preserved in docs/getting-started.md; reference reconstruction stays in its separate documentation.

The hero is docs/media/madrasi-dhaba.jpg: a real standalone-menu screenshot, 720 × 524 pixels and 48,952 bytes, displayed at 640 pixels wide with responsive scaling. Visible isolated Chrome previews at 1100 px and 390 px pass image loading, all four navigation anchors and no horizontal page overflow; 32 links across README/setup guide resolve or are valid navigation/external targets. Performance figures were checked against docs/performance-gpu.md. No runtime or gameplay code changed, so the automated suite was not rerun for this documentation edit. Preview tools/logs/profiles remain in .local-setup.

## Current command categories

SETUP-3 is complete. Decades identify purpose: 10–19 setup, 20–29 play, 30–39 resources, 40–49 build/distribution and 50–59 automated tests. Current launchers are 10_setup, 20_play, 21_play-nvidia, 30_open-catalog, 31_open-resources, 40_build and 50_test (all .cmd in scripts/). No old aliases or placeholder commands remain. Reserve 60–69 for future browser-check launchers and 80–89 for performance-study launchers; those reserved ranges do not add mandatory steps.

Use 10 once on a new laptop, then 20 for ordinary play. The category policy is recorded in AGENTS.md. Setup, build and test launchers pass under their new names from the scripts directory; all 123 tests pass (29.34 s). Guides and error messages use the updated paths. No gameplay behavior changed.

## Command relocation checkpoint

SETUP-2 is complete. All launchers are in scripts/: 10_setup.cmd, 20_play.cmd, 30_open-catalog.cmd, 40_build.cmd, 50_test.cmd, 21_play-nvidia.cmd and 31_open-resources.cmd. Internal build/bundle/release/server/test implementations are under scripts/internal/. No CMD launcher remains in the repository root. The NN_name convention is recorded in AGENTS.md; do not restore old aliases.

Use 10 once on a new laptop, then 20 for ordinary play. The other numbered commands are optional actions, not mandatory sequential steps. README.md and scripts/README.md explain their purpose. Setup/build/test were invoked from outside the repository and passed; all 123 tests pass (21.20 s). The SWF launcher passes -Check without opening the viewer; the relocated server correctly serves the root, catalogue and compiled modules when started from another working directory. The temporary server on 5184 was stopped; the existing game server on 5173 was left running.

## Current: one setup, game-only releases

DIST-2 and SETUP-1 supersede the mixed site/catalogue layout below. `dist/` now contains only `site/` (four game files: index.html, game.js, resources.js, styles.css; 7,957,002 bytes) and `standalone/` (one index.html; 7,956,923 bytes). The catalogue, scenarios and diagnostic source live in `development/catalog/` and `development/verification/`. Every intermediate module and bundle is under ignored `.local-setup/build/`.

`scripts/10_setup.cmd` restores local pinned Node 24.14.0, TypeScript 5.9.3 and Playwright 1.62.1, uses installed Chrome or downloads a local Playwright browser if absent, then builds the game. Node/TypeScript archives have fixed SHA-256 checks. No global installation or PATH change is required. Build/play/test/catalogue launchers share tools/run.ps1 and use local Node. `scripts/40_build.cmd` replaces the redundant build-offline.cmd. Research-only JPEXS/Java/Python setup stays separate; see README.md.

Verification: actual portable Node download and checksum passed. A separate source copy with no installed tools and no global Node/npm on PATH installed TypeScript/Playwright and generated the game; a cached repeat succeeded without network access, producing an identical standalone file. All 123 tests pass (21.23 s), including exact vector/composition/font/sound preservation and exclusion of development code. Visible isolated Chrome passes independent HTTP web roots, complete file-based cook/flip/pickup/plate, all eleven sounds, native fullscreen and all 636 development catalogue resources via both file and HTTP. The relocated verification page loads; direct access to tool/log paths and a build-path escape returns 403. Privacy-marker scans pass. Selected results: tests/reference/distribution.json.

The fresh-copy setup test used Windows x64 and existing Chrome. The installer includes ARM64 and local Chromium fallback but those branches are not claimed as tested here. No implementation or packaging item is pending; no deployment was performed. Current server uses the new development paths at 127.0.0.1:5173.

## Historical distribution separation — superseded by DIST-2

DIST-1: `dist/standalone/index.html` is the portable game alone (one file, 10,314,820 bytes). `dist/site/` is the independent game/catalogue site (2,849 files, 70,409,240 bytes), with `runtime/`, `styles/`, `assets/` and two HTML entries. `dist/development/` contains working modules and verification tools and is not a deployment package. No loose files remain in dist; the redundant nested portable copy and identical extra HTML copy were removed. Earlier delivery counts/paths below describe historical layouts.

The release script now copies explicit application directories instead of sweeping all of dist. Source/file loaders, TypeScript output, test imports and benchmark paths use dist/development. Normal builds refresh development and standalone; `node scripts/internal/release.mjs` regenerates both distributions. Publish one selected distribution directory, never all of dist.

Validation complete: strict build and 122 tests pass; tools/distribution-check.mjs passes visible Chrome gameplay with each package served as the entire HTTP root, including the site's 636-item vector catalogue. No missing files or page errors; the standalone requires only its HTML request. Direct-file regression passes all three game entries, tutorial/Skip, cook/flip/pickup/plate, all eleven sounds, native fullscreen and both catalogues, with HTTP(S) blocked and zero network requests. Distribution scans found no personal-path/account/private-key markers. Selected path-free results are in tests/reference/distribution.json. DIST-1 is complete; no packaging task remains open.

## Direct HTML playback delivered

UX-7 supersedes the earlier file:// instruction-only fallback: double-clicking index.html now starts the actual game. Every normal build generates classic game/catalogue bundles and embedded native data under ignored dist/. The same TypeScript core/render/audio modules serve both transports; HTTP keeps ES modules/fetch. No browser security settings or game rules change.

dist/standalone/index.html is a 10,314,820-byte (9.84 MiB) portable game containing code, CSS, vectors, authored compositions, nine embedded fonts and eleven sounds. It was copied alone into a separate folder and played successfully. It does not include the separate research catalogue/development study. The repository and static-release catalog.html also work by double-clicking, with sibling image previews and embedded vector/font/audio data.

Visible isolated Playwright checks pass on Chrome 153 and Firefox 140.0.2: source index, portable HTML alone and static-release index via file://, tutorial/Skip, batter/pour/flip/pickup/plate, every sound decoded, no resource/page errors and zero HTTP(S) requests (all blocked). Both catalogues show 636 entries and a vector preview. Chrome native fullscreen and HTTP regression checks pass; Firefox's fullscreen check is DOM-level only. Strict build and all 122 tests pass. See verification.md and tests/reference/offline.json. No new tool installation was needed; the existing pinned TypeScript compiler emits the closed classic-module registry.

## Current window and local-launch fixes

UX-4: separate in-window expansion from native fullscreen. Earlier Playwright checks only confirmed document.fullscreenElement; native Chrome remained in its normal window despite that flag. The isolated game launcher now synchronizes DOM fullscreen to its own native Chrome window through a local-main-frame binding. Actual full-screen bounds and restoration pass on source and release: 1707×960 CSS inner/outer/screen, followed by the exact prior window bounds. The normal page retains the standard Fullscreen API for ordinary browsers.

UX-5: original menu mask 110 ends at source x=549.15 on the 550-wide stage. Extend the final covered backing pixel column across this tiny seam during menu rendering; no vector asset, gameplay state or hit region changes. Actual edge checks pass with zero white pixels/column mismatches on source and release.

UX-6: file:// now displays local-launch instructions and a link to the running local game without requesting the CORS-blocked module. scripts/20_play.cmd opens the browser after server readiness and reuses an existing matching server. Local HTTP uses only 127.0.0.1; internet is not required for gameplay. Strict build and 122 tests pass. Visible native-window/file/edge acceptance passes via tools/window-check.mjs, with raw results/screenshots ignored under .local-setup/logs/window-check. Previous claims of native fullscreen are corrected by this measured checkpoint.

## Current UI refinement

UX-2: normal play is capped at 880×640 CSS pixels with a 12-pixel viewport margin. It shrinks proportionally with narrower/shorter windows; browser zoom can now change its physical size instead of being cancelled by permanent viewport filling. Actual fullscreen still fits the entire available viewport and restores the compact layout on exit.

UX-3: FPS is opt-in. Legacy saved defaults migrate to hidden while preserving render resolution; explicit new opt-in persists. The batter label appears only for the initial eight seconds or until first selection, then stays dismissed across reloads. A lightweight SVG follows original bowl shape 225 on introduction, hover or active batter selection; the old circular overlay is removed. Ready food gets a flip cursor, then a grab cursor during the source pickup window, including when the pointer stays still. Game rules and the original source hover text are unchanged.

Strict build and 122 tests pass, including cursor boundary/carry-state checks and display-setting migration. Source and generated-site visible isolated Playwright checks pass five window sizes, actual fullscreen, fresh default settings, bowl selection/dismissal/reload/timeout, real flip/pickup clicks and saved opt-in/quality. The play launcher now uses the real window viewport (no fixed test emulation), with a separate game profile so benchmark sessions cannot conflict. Actual native-window resizing also passes. Final acceptance is recorded in verification.md. Raw screenshots/results remain in ignored .local-setup/logs/game-display. Current reproducible UI check: tools/game-display-check.mjs (add --release for dist/site).

## Completed continuation — visible Playwright GPU validation

PERF-12 recent morph retention and PERF-14 immutable metadata indexing are implemented. Visible, isolated Chrome153/Playwright1.62.1 verifies actual Intel/NVIDIA adapters. Same-code old/new full-scene runs show Intel p95 about16.7→12.5ms,421→0 global evictions and24.2MB→0 new tile bytes per6s; NVIDIA remains near237–238 callbacks/s. Both adapters pass94/94 full-scene old/new pixel comparisons with zero differing bytes. Software100% is about15.4/s. Raw traces are captured for both adapters and remain ignored. See performance-gpu.md for limits, methods and continuation.

PERF-5 and PERF-12–15 are resolved for the documented Windows/Chrome matrix. The 0/1/3/18-slot cold/warm matrix, normal/high resolution, 180-second day, actual source/release UI, 121-test suite and asset verification all pass. Sanitized results are collected in tests/reference/performance-gpu.json. Warm gameplay at 1485×1080: Intel 93.65–102.54 draws/s; NVIDIA 211.07–238.44. Warm runs allocate zero new tiles and have zero sampled gaps above 50 ms. The 180-second NVIDIA day reaches cash 24 with 237.01 draws/s and bounded managed storage.

PERF-15 is resolved without extra interpolation: eligible menu/traffic interpolation remains; authored 12 Hz food/customer/smoke semantics are preserved. No further native implementation item is waiting in the original plan. External score-service deployment, missing device-font outlines and historical/physical-device equivalence remain explicitly documented limits.

No personal browser profile or OS GPU preference is changed. tools/performance-browser.mjs uses visible isolated profiles under .local-setup. scripts/21_play-nvidia.cmd opens this dedicated NVIDIA game browser. Static release: 2,845 files, 60,006,593 bytes; development verification, tools, SWFs and logs are excluded. Raw traces/profiles remain ignored; only sanitized reports enter Git. See performance-gpu.md for final acceptance and reproduction.

## Historical checkpoint — measured performance follow-up

The requested study and UI are implemented and verified. PERF-7-11 and UX-1 have evidence; **PERF-5 and PERF-12-15 remain open**. Original native game implementation remains delivered; performance acceptance is not being relabelled complete.

- Added compact FPS/measured-frame HUD with expandable simulation/render/audio/snapshot timings, one-core work estimate, separately labelled JS heap/surface/audio memory, and actual filter GPU identity. Fixed buffers; one update/second; no measurement clocks when disabled. Expanded study self-work averaged0.024ms/sample, excluding paint.
- Added a persistent bowl cue when batter can be selected, hover highlight/cursor and25/50/75/100% rendering resolution. Vectors remain intact; CSS input coordinates and100% sharpness remain correct. Settings persist locally.
- Two measured component sweeps isolate steam, traffic, five customer identities, background, radio, real audio suspension, HUD, half-resolution and CPU/GPU filters. The first interrupted sweep is qualified; the confirmation baseline49.18-49.61/s has p95 about42ms. Dosa-steam omission reduces p95 to24.2ms; half-resolution gives69.54/s with p9529.9ms. These are diagnostic controls, not omitted shipping content.
- Active filter context is Intel UHD/ANGLE/D3D11; NVIDIA3070Ti is installed but not selected in that context. No claim about Canvas GPU identity, system CPU/RAM/VRAM or a completed NVIDIA comparison.
- Corrected the old quantized benchmark clock. A warm production-core three-slot825x600 replay gives85.25/s, p9518.1ms,p9918.5ms,max23.9ms, no gaps above25ms,no new tiles,no evictions. It does not cover all actual-user input/stutter.
- 117 tests pass,0failures/0skips. Actual UI checks passed bowl click/highlight, half-resolution743x540 at unchanged990x720CSS, reload persistence, return to1485x1080, HUD disable/enable, fullscreen and390px layout. Static release opens independently and excludes development study links/code. Physical touch hardware remains untested.

Detailed data and next test/optimization order: [performance-follow-up.md](performance-follow-up.md), [performance-follow-up.json](../tests/reference/performance-follow-up.json), [performance-plan.md](performance-plan.md). Next implementation is PERF-12 cache retention/admission with unchanged byte budget and pixel checks; next environment study is PERF-13 actual-user browser raster/GPU trace and verified adapter comparison. Do not promise smooth240FPS from a rendering counter or the original12Hz animation poses.

Server remains available at http://127.0.0.1:5173/. Static release:2,845 files,60,002,964 bytes; changed-source/release scans found no personal-path or private-key markers. Temporary study audio contexts are closed after each run. No additional tool installations or external telemetry were introduced.

## Historical initial delivery

The initial native HTML/TypeScript implementation pass, source comparison, measured optimizations and final delivery checks are complete. This file replaces the intermediate audit checklist; all evidence is in the linked reports. The high-density performance limitation remains explicit rather than being reported as a passed60FPS target.

## Delivered behavior

- All83 source script exports and628original symbols are accounted for. Canonical extended SWF SHA-256: `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a`.
- Native core preserves customer reuse, quantized patience, overwritten/orphan timers, hidden batter-template behavior, independent food smoke, exact plate/pointer positions, days1–9, tutorial parent/persistent children and original score/audio event rules.
- Original online form/protocol/verification and publisher links are implemented. Standalone reports no endpoint; local scores are explicitly separate. A compatible backend is a deployment dependency.
- Vector geometry, gradients, masks, isolated effects and authored timings are retained. Child caches, bounded surface reuse, culling, native GPU filters with CPU fallback, alpha factoring and one paint per animation opportunity reduce repeated work. Only eligible menu/traffic transforms interpolate.
- Media failure feedback, unsupported-audio isolation, input blur/capture cancellation and local-score failure handling are implemented. Catalogue has vector previews, search, autoplay, right Details, resizable/hideable gallery and fullscreen.

## Final evidence

- Strict build and106tests passed,0failures/0skips. Asset verification:636entries,2672media files,49,477,091media bytes,0errors.
- Actual source/native matched60-action replay:12serves,cash24,clock720; initializedTomorrow day2,cash24,clock540,lost0. Controlled-RNG derivative exception and hashes are recorded in reference-validation.md.
- Native complete tutorial/cooking/day/retry browser scenarios passed. GPU filter pixels7/7,alpha composition4/4. Actual generated site passed menu/instructions/tutorial/Skip/gameplay,audio activation,fullscreen and narrow/normal resize; no resource warning or browser error.
- Final30-second18-slot comparison at1485×1080:24.16→35.58draw opportunities/s; tile allocations9820.55→69.01MiB(99.3%lower),5300→0evictions.
- Warm3-slot play:126.60/s at825×600(p9512.1ms,p9912.4ms);37.89/s at1485×1080(p9530.7ms,p9931.7ms). Both warm windows allocate0newtile bytes and have0gaps>50ms. High-density60Hz aspiration is not met.
- Rejected static regrouping and Canvas layers were removed. The slower GPU stage experiment exists only in excluded verification code. No failed graphics experiment ships in production.
- Static site:2,843files,59,982,174bytes(57.2MiB), noSWF/emulator/reference/tool/log files. Source and release privacy scans found no account/user-directory/private-key markers.

## Explicit limits

Historical Adobe pixel/waveform equality, missing outlines for two source device fonts, actual online-server acceptance, physical multitouch and untested browser engines are not claimed. Only Windows in-app Chromium was available. Higher-density pacing remains below60Hz despite measured improvements; see performance-plan.md for full distributions and rejected alternatives.

## Use and reproduce

- `scripts/20_play.cmd`: native game; `scripts/30_open-catalog.cmd`: catalogue; `scripts/31_open-resources.cmd`: original SWF/JPEXS.
- Native server:127.0.0.1:5173. Static build: `dist/site/` via `node scripts/internal/release.mjs`; source tests: `node scripts/internal/test.mjs`.
- Dev-only visible verification: `development/verification/index.html`. Reference setup/probes are documented in reference-validation.md. Reference server was stopped after testing.
- Temporary tools, derivativeSWFs, downloads and logs remain ignored under `.local-setup/`; no obsolete research or binary mirrors.
- Rebuild compiler through pinned tools/setup-typescript.ps1 on a clean checkout. Export tracked committed source; never zip the entire working directory.
- Final application/verification/docs changes are committed together as the completion pass; consult GitHEAD for the exact commit.
