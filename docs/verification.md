# Native implementation verification

## Current performance release

131 automated tests, 588 exact Canvas/hit comparisons and 90 independent-cache
preparation comparisons pass. Visible Intel/NVIDIA checks cover source, site
and direct-file standalone, including cooking, cursor fallbacks, profile swaps,
resize, fullscreen and emulated touch. Both distributions are rebuilt. Physical
Pi full-day and actual-loss measurements are in [performance-stalls.md](performance-stalls.md);
that report preserves limitations and supersedes older performance checkpoints.

## Single setup and game-only distribution

DIST-2/SETUP-1 replace the prior game/catalogue package described below. Only the game is distributed: site/index.html + game.js + resources.js + styles.css (7,957,002 bytes), or standalone/index.html (7,956,923 bytes). Development catalogue/verification source is outside dist, and intermediate modules live in .local-setup/build. The player pack retains exact original vectors, eight required composition timelines, symbol metadata, fonts and sounds; catalogue exports and diagnostic code are excluded.

The pinned Node 24.14.0 archive was downloaded and SHA-256 checked. A fresh source copy with no tool installations and no Node/npm in PATH completed setup; TypeScript and Playwright were restored and both packages built. Repeating setup reused local tools without network access, and the standalone bytes matched the main checkout. This is a Windows x64/existing-Chrome test; ARM64 and automatic local-Chromium download branches remain unexercised.

All 123 automated tests pass, including resource-preservation/development-exclusion coverage. Visible isolated Chrome passes both packages as independent HTTP roots, three file-based game entries through cooking and plating, all eleven sound decodes and native fullscreen. Both file/HTTP development catalogue navigation show 636 entries and vector previews; development verification modules load. Server isolation checks deny tools, logs and path escape. Distribution privacy-marker scans pass. Report: tests/reference/distribution.json. Reproduce with scripts/10_setup.cmd, scripts/50_test.cmd, tools/distribution-check.mjs, tools/offline-check.mjs and tools/window-check.mjs. Historical results below do not describe the current folder structure.

## Independent distribution acceptance

The mixed dist layout is replaced by dist/standalone (one portable index.html, 10,314,820 bytes), dist/site (2,849 files, 70,409,240 bytes) and dist/development (working output only). The site has independent runtime, styles and assets directories, without a nested standalone HTML, source tree or verification runner. Publish either distribution directory as the web root.

Strict build and all 122 tests pass (28.68 seconds). Visible isolated Chrome 153 tests serve each distribution as the entire HTTP root, denying access to repository/sibling files: both reach gameplay, the site displays all 636 catalogue entries and sprite-472 vector preview, and no files are missing. The standalone makes only its HTML request. The three file-based game entries also pass tutorial/Skip, batter/pour/flip/pickup/plate, all eleven sounds and native fullscreen; source and release file catalogues both pass, with HTTP(S) blocked and zero network/page errors. Distribution privacy-marker scans pass. This reorganization was rechecked in Chrome; earlier Firefox acceptance below remains historical evidence.

Reproduce with node tools/distribution-check.mjs and node tools/offline-check.mjs. Path-free results are retained in tests/reference/distribution.json; temporary screenshots and browser profiles remain ignored under .local-setup. Older delivery sizes and root-level portable paths below describe previous packaging.

## Direct-file and portable HTML acceptance

The instruction-only file:// fallback described in older checkpoints below has been replaced with working offline playback. Source and static-release index.html load classic bundles and embedded resources. HTTP still loads the ordinary ES modules. The portable dist/standalone/index.html contains the complete native game in 10,314,820 bytes (9.84 MiB); it is tested after copying only that HTML into a separate folder with no assets, modules or server beside it.

Visible isolated Playwright acceptance passes in installed Chrome 153 and the existing patched Firefox 140.0.2. For each browser, all three file-based entry points pass menu, tutorial/Skip, batter selection, pouring, waiting at a stationary pointer for readiness, flipping, pickup and plating. Live audio decodes and starts; a separate decode check passes all eleven preserved sounds. No resource warnings/page errors occur. All HTTP(S) requests are blocked and the recorded request count is zero. Both file catalogues display 636 resources and the sprite-472 vector preview. Chrome checks native fullscreen; Firefox checks the DOM fullscreen request only.

The HTTP source/release regression again passes native fullscreen bounds/restoration, in-window expansion and menu edge pixels. Strict build and 122 tests pass (0 failures/skips, 31.17 seconds). Selected path-free results are retained in tests/reference/offline.json; raw screenshots/profiles remain under .local-setup. Reproduce with node tools/offline-check.mjs. For Firefox, add --firefox and point PLAYWRIGHT_FIREFOX at a compatible existing Playwright Firefox executable. No personal browser profile or security bypass is used.

The offline packaging uses the pinned TypeScript compiler's CommonJS emission and a closed module registry, without eval, a runtime compiler or a Flash emulator. The resource adapter supplies the same vector/composition data and font/audio bytes; it does no per-frame work. Source device-font and external leaderboard limits remain unchanged. The single portable game omits repository-only Resources/Performance study links; the full index/catalogue retain them.

Current correction: earlier Playwright fullscreen checks in this report validated DOM fullscreen and canvas dimensions, not native browser chrome removal. The native-window check below supersedes that interpretation.

## Native fullscreen, menu edge and file launch

The reported fullscreen defect reproduces: document.fullscreenElement is true while native windowState stays normal at 838×892 with an 824×798 inner viewport. Removing the automation flag or focus emulation did not change it. Synchronizing the isolated launcher's own window with Browser.setWindowBounds changes native state to fullscreen; inner/outer/screen are all 1707×960. Source and generated-site checks both pass this assertion and restore the exact previous native bounds on exit. The separate expansion button leaves native window state and DOM fullscreen unchanged.

Menu mask 110 spans source x=-279 to277.15, placed at x=272, leaving the rightmost 0.85 source pixels uncovered. Menu-only edge extrusion copies the final fully covered backing column across this seam, without reading pixels back to CPU or altering source vector files. At 1980×1440 backing pixels, both source/release edge checks find zero white pixels in the sampled column and zero byte mismatches across the extension. The existing scene submission digest excludes this intentional final edge pass; all authored scene submissions remain identical.

Opening the actual index.html file URL now shows launcher instructions, makes zero requests for file-based dist/main.js and produces no page error. Standard HTTP module loading passes on source and release. Strict build and 122/122 tests pass (0 skips/failures, 28.75 seconds). Reproduce the visible native-window, expansion, edge and file checks with node tools/window-check.mjs; raw outputs stay in .local-setup/logs/window-check. No browser security protections are disabled to support file URLs.

This report separates implemented behavior, source-derived tests, actual browser observations and external validation limits. It is not a certificate of bit-for-bit historical Adobe Flash playback.

## Source and automated evidence

The baseline is the preserved extended SWF (SHA-256 `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a`). All 83 script exports are inventoried. The asset verifier resolves 636 catalogue entries, 2,672 media files and 49,477,091 media bytes with zero errors. All 628 original symbols, 3,285 authored sprite frames, 40 button states, 11 sounds and nine embedded fonts are accounted for. Fonts107/423 contain no embedded outlines.

The vector pack contains614 drawable symbols,2,064 paths and106 gradients; SHA-256 `f796b2d15271881dd90e8bca4cddf73e57ce2bfe4e4ce7c0d09f7825a29510d5`. Original geometry is preserved; display caches are generated at current resolution. The pack contains no raster URLs or bytecode.

Strict compilation and successive regression checkpoints passed; the final suite count is recorded in the final validation section. Targeted tests cover GPU orchestration, single-fill alpha caching, pointer cancellation, persistent tutorial clocks and stable deadline scheduling. Core tests cover all five customer eating periods, inclusive cooking thresholds, burns, partial/excess servings, quantized patience, active/rebound orphan timers, days1–9, exact native scheduling ties, hidden batter-template behavior, plate positions and independently running smoke. Adapter tests cover ordered frame batching, audio cancellation/loops/autoplay, storage failures, the original score protocol and form lifecycle. Vector tests cover original dependencies, morph endpoints, gradients at paint time, masks, isolated filters, source-space padding and safe decorative interpolation.

## Actual native browser scenarios

Browser: Windows Codex in-app Chromium, DPR1.5. Tested game canvases include825×600 and1485×1080 pixels. This is the actual tested matrix; other browser engines and physical touch/VR devices have not been exercised.

The development-only visible scenario runner uses the production core and renderer. Its completed run at1485×1080 passed:

- Full335-frame tutorial loop with persistent child clocks and Skip.
- Cooking, flip, pickup freeze, cancellation/resume, plating, serving, delayed payment and departure.
- A complete180-second day with the18-slot bot, ending at cash24 and clock720.
- Tomorrow preserving cash and clearing the new day's food/tables.
- Three consecutive fifth-loss game-over/retry cycles.
- Zero missing assets.

The bot and the earlier nine-arrival source scenario are separate tests. A subsequent matched-day fixture replays the same60 public actions and constant random choice in native TypeScript and a documented ten-byte controlled-RNG derivative of the source SWF. Both complete the original180-second day with12 serves, cash24 and clock720; initialized Tomorrow reaches day2,cash24,clock540,lost0. The actual source run ends MATCHED_PASS. Exact source boundaries also have deterministic tests.

An actual no-input native game reached the original score form with name `noname`, Try again and publisher link. With no configured endpoint, Submit is disabled and the visible status explains that the score was not sent. Local scores remain explicitly separate. No third-party scores were posted.

Earlier UI checks verified viewport fit, fullscreen entry/exit, the in-stage tutorial/Skip, audio gesture recovery, keyboard controls and compact secondary menus. Catalogue checks cover search/dependency navigation, autoplay/pause/stepping, its persistent Details sidebar, gallery resize/hide/show and narrow viewport layout. These observations do not assert touch-device or every-browser compatibility.

## Reference playback

[Reference validation](reference-validation.md) and [recorded observations](../tests/reference/observations.json) identify the canonical hash, pinned Ruffle0.6.0 build, probe hashes and controlled overrides. Canonical menu/instructions/tutorial/Skip, game-over form and retry were observed. Instrumented source runs establish complete cooking/serving/payment/exit, a full180-second day, hidden-template removal, quantized patience, overwritten timers rebinding to recreated customers, and independently running held/plated smoke. Default probes preserve source tags and append a separate action. The matched-day derivative has an explicit, audited exception: ten integer operand bytes force random bounds to1; action opcodes, handler structure and timing remain unchanged.

This comparison corrected real native discrepancies. Historical Adobe event-queue ordering, exact simultaneous-deadline ties, device-font outlines and full waveform/pixel equivalence cannot be inferred from modern Ruffle. Native FIFO scheduling and full elapsed-time catch-up are explicit policies in [decisions.md](decisions.md).

## GPU filter fidelity and performance

Seven real browser pixel fixtures passed: opaque off-center objects, translucent overlap, fractional three-pass blur, one-axis blur, clipped bounds, wide smoke kernel and near-identity blur. The GPU executed24 passes with zero failures. Maximum premultiplied channel and alpha difference was2/255; mean channel error stayed below0.128/255, support bounds matched exactly, and the largest alpha centroid shift was0.057 pixels. This is agreement with the source-derived CPU kernel, not proof of historical Adobe pixels.

The checker reconstructs premultiplied bytes after Canvas readback; otherwise straight-color rounding artificially exaggerates low-alpha differences. Exhaustive valid byte/alpha pairs test this reconstruction. The GPU working textures are reused; CPU fallback remains available.

[Performance evidence](performance-plan.md) records matched workloads, allocation accounting, intermediate regressions and final measurements. In particular, a low JavaScript draw median alone is not accepted as proof of smooth presentation. Counters describe managed pixel surfaces, not independently measured driver memory. Reports are local visible DOM data with no telemetry.

## Release and privacy

`node scripts/internal/release.mjs` creates a standalone static site in `dist/site/`. The release excludes original SWFs, ActionScript, JPEXS, Ruffle, reference probes and the development verification/baseline renderer. Basic gameplay requires only a static HTTP host; TypeScript/Node are build tools.

The source/assets/tools/scripts/docs scan found no local account name, user-directory paths, file URLs or private-key/token patterns. Temporary downloads, reference derivatives, tools and logs stay under ignored `.local-setup/`. Export source from tracked committed files, not the entire working directory.

## External limits

The original online leaderboard backend is not contained in the SWF. Its form, protocol, verification and routing adapters are implemented and fixture-tested; a deployment must provide an actual compatible service endpoint. An unconfigured deployment does not claim that a score was accepted. Nine embedded fonts are retained; the two source device fonts use documented browser fallbacks. These limits are visible rather than concealed as successful parity.

## Final automated validation

The final strict build and all106 automated tests passed(0failures,0skipped;29.95seconds). This includes stable scheduler ordering, all domain/source fixtures, pointer blur/capture cancellation, media-failure handling and the accepted vector/filter implementation. The final asset verifier again reported636entries,2672media files and zero errors.

Rejected background regrouping, Canvas scene layers and the GPU final-stage compositor are absent from the production path. GPU compositor code exists only in the excluded verification directory, so it cannot add runtime modules or memory to the released game.

## Final static-site and browser acceptance

The generated site contains2,843files and59,982,174bytes(57.2MiB), including the catalogue exports. A scan found noSWF,ActionScript,WASM,reference/tool/verification directories or logs, and no account-name,user-directory,file-URL/private-key markers. The source scan found no such private markers either.

The actual generated site was opened from its own relative base path. Menu→instructions→HowToPlay→Skip→gameplay passed; the audio gesture prompt cleared after activation, no resource warning appeared and the browser error log was empty. Fullscreen entered/exited through the available host implementation. Narrow390×844viewport and normal1280×720viewport fit without document scrolling; fullscreen also resized the backing canvas. This is responsive-layout testing in desktop Chromium, not a physical-phone claim. Temporary viewport overrides were reset.

Final production-core browser scenarios again passed the complete tutorial loop, cooking/hold/cancel/plate/serve/payment/exit,180-secondday cash24,Tomorrow and three loss/retry cycles, with zero missing assets. Final GPU filter fixtures passed7/7(24passes,0failures), and retained alpha composition passed4/4(max1/255). The catalogue reload retained checked Autoplay and showed the495-frame vector dosa preview, right Details panel, gallery divider and hide control; search472 returned exactly one resource.

The source and static site are ready for handoff. Remaining limits are those explicitly stated above: compatible online backend required, two unavailable embedded device-font outlines, untested historical/browser/device equivalence, and the high-density60Hz target not achieved in the available browser. These are not hidden successful checks.

## Visible Playwright continuation — current acceptance

This supersedes the historical test count and unavailable-NVIDIA/high-density statements above for the newly tested isolated Chrome environment. Strict build and 121/121 tests pass (0 failures/skips). Asset verifier: 636 entries, 2,672 media files, 49,477,091 bytes, zero errors. Exact cache comparisons pass 94/94 on each actual Intel/NVIDIA adapter, zero differing bytes and identical hit lists. Final filter 7/7, composition 4/4 and full tutorial/cooking/day/Tomorrow/retry scenarios pass, including rejection of overlapping verification runs.

The generated site (2,845 files / 60,006,593 bytes) independently passes the same visible real-mouse/audio/quality/fullscreen/narrow-layout/tab-return checks as source. Its actual game counter advances 7,033 frames during the 30-second UI window; there are no page errors or resource warnings. Source advances 7,005. Timing, memory and cold/warm adapter evidence are in performance-gpu.md and tests/reference/performance-gpu.json. UI Event Timing is thresholded, and LoAF includes setup; neither is a complete physical-latency measurement. Other browser engines and physical touch hardware remain untested.

## Compact display and contextual cues

Strict build and all 122 tests pass (0 failures/skips, 20.47 seconds). New renderer assertions cover first-side poses 70/71/159/160, second-side 326/327/429/430, held food, incompatible pointer modes and leaving gameplay. The pointer remains stationary while readiness changes. Existing source-render submission hashes still pass. Settings checks cover migration of the previously implicit FPS default to hidden, malformed/unavailable storage and explicit opt-in persistence.

Visible isolated Chrome/Playwright source and generated-site checks both pass, with zero page errors. At a 1280×850 viewport the normal canvas is 880×640 CSS pixels; actual fullscreen expands it to 1168.75×850 and restores the compact layout on exit. Five viewport sizes from 390×844 to 1600×1000 retain source proportions, correct DPR backing sizes and zero document scrolling. Real mouse input selects batter, dismisses the label, shows the selected bowl silhouette, pours into a slot, waits for the flip cursor without moving, flips, then picks up the cooked dosa. Reload preserves label dismissal; a fresh unselected hint expires after eight seconds. Explicit FPS opt-in and quality persist across reload.

The play launcher uses viewport:null rather than the fixed viewport/DPR used by benchmarks. A separate native-window test resizes the actual Chrome window: inner viewport 1226×846 to 726×486 yields canvas 880×640 to 635.25×462, confirming real user window resize works. Playwright-delivered Ctrl-minus did not trigger browser zoom, so no automated real-zoom acceptance is claimed; the CSS maximum removes the old viewport-filling behavior that counteracted zoom.

Reproduce the acceptance with node tools/game-display-check.mjs, then add --release for the static site. Temporary screenshots and path-free results remain under .local-setup/logs/game-display. The rebuilt static site is approximately 60 MB and excludes the development checks. These presentation changes do not modify the core or vector assets, and the previous adapter timing table is historical rather than a new timing claim at the compact size.
