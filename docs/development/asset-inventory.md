# Native asset inventory

The extended edition is the sole conversion baseline: `reference/swf/extended.swf`, SHA-256 `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a`, 550 × 400 pixels, 12 timeline frames per second. These are offline exports from JPEXS 26.3.0, not an emulator or ActionScript interpreter in the application.

## Outputs and provenance

- `assets/catalog.json`: complete symbol catalogue, source checksum, conversion settings, dependencies, instance names, bounds, frame labels, scene reachability, preview URLs, and each output's SHA-256 and byte count.
- `assets/scenes.json`: resolved display lists for all seven original main frames; pixel matrices, depths, masks, color transforms and original placement events. It also names derived static scene backdrops.
- `assets/timelines/<symbol-id>.json`: first display list and full placement/removal/action-marker event stream for each of 144 sprites. Action bytes are represented by hashes, not executable Flash code.
- `assets/shape/`, `assets/morphshape/`, `assets/text/`: SVG exports preserving original vector artwork. Morph SVGs retain JPEXS's exported animation representation.
- `assets/frames/`: lossless raster frame images shared by content hash; repeated frames refer to the same file. WebP is used only when smaller than PNG, and each conversion is checked against decoded original RGBA pixels.
- `assets/sound/`: all 11 original MP3 sound resources, with sample counts/rates and original exported names in the catalogue.
- `assets/font/`: nine WOFF files containing the embedded font outlines that actually exist in the SWF.

There are 628 symbol definitions: 393 shapes, 14 morph shapes, 144 sprites, 10 buttons, 45 text definitions, 11 font definitions and 11 sounds. The catalogue additionally exposes seven main-scene previews and a derived native order bubble. All symbol dependency IDs must resolve; the validator checks this.

The 144 sprite timelines contain 3,285 authored frames. Every visual sprite exports its complete ordered frame sequence; sprite 628 is a code-only package with no visual display list. Each button exports four states: up, over, down and hit-test.

## Rendering contract

### Reference raster exports and native vector scale

The extended SWF XML was rechecked for all `DefineBits*` tag types: zero bitmap definitions. Its artwork is authored from vector shapes/morphs and text, composed through sprite timelines. The original 550 × 400 stage is a coordinate system, not a fixed vector image resolution.

The current exporter uses JPEXS zoom 1. Shapes, morph shapes and text remain SVG, but composed sprites, button states and scene snapshots were flattened to PNG and optionally converted to lossless WebP. Lossless WebP preserves those raster pixels, not the source's vector scalability. These files document the earlier raster rendering limitation. The game and graphical catalogue previews now compose the preserved geometry natively; their display caches regenerate at display resolution.

| Export | Intrinsic raster dimensions |
|---|---|
| Menu scene snapshot | 550 × 400 px |
| Customer body 412 | 63 × 129 px |
| Dosa clip 472 | 122 × 160 px |
| Tutorial clip 321 | 1156 × 598 px, including its offstage bounds |

Raster dimensions are per-symbol padded bounds, not one common image size. Vector composition using the preserved shapes, transformations, masks, filters and morph poses remains an explicit P4.1/P4.2 fidelity task. Higher-resolution raster exports would be an intermediate approximation, not resolution-independent rendering. Do not describe the 1× raster implementation as visually lossless relative to the vector original.

Catalogue URLs are relative to the repository/application root (`assets/...`). A resource's `preview.frames[n]` is source frame `n + 1`; held frames can repeat URLs. `preview.fps` is 12. Do not treat a linear catalogue preview as the gameplay state machine: Flash frame actions may stop, jump or separately control nested clips.

All positions, bounds and matrix translations are pixels (20 original SWF twips per pixel). Matrices use Canvas-compatible `{a,b,c,d,tx,ty}`. Raster `bounds` come directly from JPEXS `getRectWithFilters()`, including padding for filters. Draw images at `bounds.x, bounds.y` with their natural integer pixel dimensions; rounding a fractional width down changes alignment. `origin` is the local registration point measured from that raster's upper left.

Scene snapshots preserve the authoring display list before ActionScript has hidden or repositioned objects. They are useful inspection references, not final game screenshots. `scenes.json` preserves their ordering and masks so the application can implement its fixed game composition explicitly.

Derived `scene-<frame>-static` backdrops omit named dynamic objects while retaining the background and named table furniture. Gameplay also has `scene-5-background` (static depths below 111) and `scene-5-foreground` (remaining static furniture). These provide convenient layers; the full placement list remains authoritative for exact overlap ordering.

`sprite-363-clean` is derived from order bubble 363 with text 351 and patience meter 357 hidden during offline rendering. It preserves the bubble/icon animation and source crop; the native UI must render changing count/patience itself at the original child matrices. The original unmodified sprite remains available for comparison.

## Important game symbols

| Game role | SWF symbol | Detail |
|---|---:|---|
| Background | 193 | Original shop/environment composition |
| Tutorial | 321 | All 335 authored frames, plus nested resources |
| Customer 0 | 413 | Body animation 412 |
| Customer 1 | 399 | Body animation 398 |
| Customer 2 | 400 | Body animation 320 |
| Customer 3 | 371 | Body animation 338 |
| Customer 4 | 385 | Body animation 384 |
| Customer order | 363 | Bubble, count and patience components; 47 frames |
| Customer departure | 370 | Seven-frame exit effect and callback marker |
| Customer ear smoke | 345 | Shared nested effect |
| Dosa | 472 | 495 frames; `flip` label at source frame 291 |
| Cooking slot | 324 | Eighteen placed slot instances |
| Plate | 230 | Shared table/hand plate art |
| Batter | 226 | `mcMavu` |
| Radio | 199 | Nested sound-wave animation |
| Clock | 476 | Nested clock-hand composition |
| Money feedback | 431 | Shared bill feedback |
| Burn penalty feedback | 437 | `mcLost` |

Character wrapper previews show their authoring children together. The original game separately hides/repositions order bubbles, ear smoke and departure effects. Native rendering uses the wrapper's `firstFrame` child placement records and explicit game states, rather than showing this preview as a complete character throughout play.

## Known source limitations

- Fonts 107 (`Arial`) and 423 (`CopprplGoth BdCn BT`) contain zero embedded glyphs: these are device-font references. An exact missing typeface cannot be extracted from this SWF. Browser fallback/replacement is a documented presentation decision, not a hidden equivalent export.
- Sprite 628 (`__Packages.Rijndael`) is an exported ActionScript package with an empty visual timeline. Its missing image is intentional.
- `usageClass` distinguishes scene-reachable, exported-only and unreferenced definitions. Export-only symbols can be used from code; lack of a placement is not sufficient evidence to discard them.
- Offline raster export does not execute ActionScript. Nested playback, cooking jumps, audio triggers and visibility still require the TypeScript behavior implementation and reference comparison.
- Visual inspection of static backdrops and automated extraction checks are not proof of complete browser/runtime parity. Record that evidence separately in the behavior coverage matrix.

## Rebuild and validate

Restore JPEXS using `tools/setup-ffdec.ps1`. Python 3 and a Java 21 JDK are required: the small Java source helper reads the exact raster bounds through the pinned JPEXS library. The optimized build additionally uses Pillow 12.3.0; existing bundled workspace dependencies provide it. Any separately installed dependency must go under `.local-setup/`.

```text
python scripts/assets/export-assets.py --lossless-webp
python scripts/assets/compile-vectors.py
python scripts/assets/verify-assets.py
```

Use a Python environment with Pillow 12.3.0 for the optimized rebuild. Omitting `--lossless-webp` produces the same source pixels as PNG, with larger file sizes. The raw JPEXS exports, derived working SWFs/XML and conversion cache remain in `.local-setup/asset-export/`. JPEXS diagnostic profile/logs are redirected to `.local-setup/logs/ffdec-profile/` and are excluded from Git.

Existing cache completion stamps avoid repeating an expensive conversion. Remove only the relevant disposable export-cache entry when changing its conversion settings. The immutable baseline checksum is verified on every run. The output validator verifies all file hashes, sizes, dependency IDs, expected button states and complete sprite frame counts.

Verified extraction checkpoint: 636 catalogue entries, 2,672 unique media files, 49,477,091 media bytes (54,251,639 bytes including all asset metadata). The validator reported zero errors. All 3,285 original visual timeline frames, 40 button-state frames, 11 sound resources and nine embedded fonts are represented. Every raster's pixel dimensions match the JPEXS padded bounds within integer rounding. Static shop backdrops and the clean order bubble were also visually inspected. This checkpoint does not claim browser playback or game parity verification.

## Native vector rendering

`assets/vector/scene.json` adds 5,543,080 bytes: 614 drawable symbols (452 geometry definitions, 144 source sprites, 10 buttons, one derived bubble and seven scenes), 2,064 deduplicated paths and 106 gradients. Total assets now occupy 59,794,719 bytes. `python scripts/assets/compile-vectors.py` runs after the export command above; it checks the canonical SWF and every input SVG checksum. Missing ignored XML is regenerated with pinned JPEXS. No raster input or ActionScript bytecode enters the vector pack.

The game and graphical catalogue previews now prefer native Canvas Path2D composition. Original 1× raster exports remain reference downloads/thumbnails, not the source of enlarged game graphics. The painter retains original coordinates, glyph contours, morph endpoints, placement/color transforms, depth masks and button states. Source surfaceFilterList metadata is recovered for sprites and root scenes. Continuous child clips keep their clock across a parent loop; authored frame changes still require runtime-reference comparison where scripts control playback.

Pixel tiles are generated at the current display resolution, bounded to 96 MiB/128 entries. A tile above 32 MiB draws directly as vectors instead of reducing resolution. Exact Flash filter kernels, isolated group compositing, stroke policy and script-controlled stop/resume are pending comparisons; implementation is not a claim of pixel-exact Flash parity.
