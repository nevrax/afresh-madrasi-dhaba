# Resource catalogue

The local catalogue is the browser entry point for inspecting the extended edition's exported resources. It is a native HTML and TypeScript interface; it does not run the SWF or a Flash emulator.

## Open it

Run scripts/10_setup.cmd once, then use scripts/30_open-catalog.cmd or double-click development/catalog/index.html. Its HTML, TypeScript and CSS live in development/catalog/. The shared exports stay in assets/ and generated modules/bundles stay in .local-setup/build/. The development server URL is /development/catalog/. Direct file URLs use embedded manifest/vector/font/audio data and sibling image previews. The catalogue is strictly a development tool; neither dist/site/ nor dist/standalone/ contains it or its preview exports.

The page loads `assets/catalog.json`. A missing index produces an explicit error instead of an empty gallery. Re-run the reproducible asset exporter if exported files are missing.

## Inspect resources

- Search by name, stable resource ID, numeric SWF symbol ID, export name or instance name. Combine search with a resource type filter.
- Select a card to inspect its preview. The viewer fills the available viewport; the resource list scrolls independently. The URL fragment identifies the selected resource, so the browser Back button and bookmarked resource links work.
- Details is a non-modal right sidebar for source information, related resources, exported files and complete metadata. It stays open and updates as you navigate through items. Gallery and Details toolbar buttons hide or show their respective panels independently.
- Drag the vertical divider between gallery and preview to resize the gallery. Its keyboard controls are Left/Right arrows (20 px), Home/End (minimum/maximum); double-click resets its width. Hiding and reopening the gallery preserves its width, subject to available space. On narrow screens the gallery starts hidden and opens as a left drawer with the same resize handle.
- Small images and thumbnails render at their intrinsic dimensions without enlargement; larger images shrink to fit the available preview.
- Autoplay is a checkbox, enabled by default, that starts each selected animation or sound. Changing the checkbox immediately starts or pauses the current preview. The preference survives reloads when local storage is available; it also remains active across item navigation. Browsers can require a first Play gesture before allowing sound.
- For frame sequences, use Play/Pause, the previous/next arrows or the frame slider. Frame numbers start at 1. Playback pauses when you select another resource or hide the browser tab.
- Changing the selected resource stops its previous sound. Sound starts automatically only when Autoplay is checked; otherwise use its native playback controls.
- Open nested resources to inspect their components. The Used by list gives the inverse of the recorded dependency graph; it is not proof of reachability from ActionScript.
- Font previews show a sample alphabet and digits. Text previews show exported text when present. Browser font fallback can display characters absent from an exported font.
- The exported file links and Complete resource metadata expose original IDs, labels, bounds, origin, dependencies, checksums and any further metadata supplied by the exporter.

## Preview limits

An exported sequence is a visual inspection aid. It loops through its exported frames at the recorded rate. It does not execute ActionScript, frame stop/jump commands, input or sound triggers. A nested animation's behavior in the running game can therefore differ from the sequence shown here.

Source frame count is shown separately from preview frame count. Unsupported or absent previews are explicitly labelled; their resources remain searchable and inspectable. Text specimens are not evidence of original text layout. The full SWF and JPEXS remain the source of reference for unresolved playback, masks, transforms and hit areas.

## Data contract

`assets/catalog.json` schema version 1 contains `source`, `items` and optional additional metadata. Every item has `id`, `kind`, `name`, optional `symbolId`, exported/instance names, bounds/origin, dependencies, frame count and labels. Its optional `preview` uses `image`, `sequence`, `audio`, `font` or `text`, with `url`, `frames`, `fps` and/or `text` as appropriate. Optional `files` record URL, byte size and SHA-256.

Resource URLs resolve against the repository root through the catalogue page's base URL; previews are served locally. History navigation preserves the catalogue's own file path. Every original resource stays in the index even when no browser preview exists.

## Verification checkpoint

Latest catalogue revision: replaced the modal with an independent right sidebar. Browser checks verified sidebar updates during item/dependency navigation; both panel toggles; pointer resizing from 300 to 420 px; keyboard resizing and double-click reset; width retention across gallery hide/show; animation autoplay, uncheck-to-pause and saved preference after reload. Two selected sounds completed playback with Autoplay enabled without an explicit Play action. A 36 × 46 px exported image was visually checked without enlargement. Layout inspected at 1280 × 720, 800 × 600 and 390 × 640; the narrow view retained visible animation controls and a document matching the viewport. Strict build/static release passed; no browser console errors were reported. These are catalogue checks, not original-game parity evidence.

The strict TypeScript check passed. The initial browser review verified search, combined type/search filtering, empty results, resource selection, dependency drilldown and Back navigation. Layout was inspected in the in-app browser.

After the complete export was generated, a filesystem audit found 635 unique catalogue IDs, seven scene items, no unresolved dependency IDs and no missing files across 6,828 references. The manifest contained 11 audio previews, 539 image previews, 73 frame sequences, nine font previews and three explanatory text placeholders. These counts establish index/path integrity, not media decoding or playback correctness.

Final-media browser verification remains pending: the browser surface became unavailable to the validation agent before the complete export was ready. Animation playback, decoded sound, font specimens and original-game equivalence must not be reported as browser-verified at this checkpoint.

## Vector preview update

Graphical previews now use native vector composition at the display pixel density, retaining natural CSS size for small resources. Shapes, text contours, composed sprites, button states and seven scenes use the same painter as the game. Thumbnails and exported file links retain the previous reference images. Morph previews expose 25 inspection positions between their source endpoints.

Play/pause, frame stepping, saved Autoplay and resizing remain available. The frame slider covers the authored parent sequence; this preview does not execute ActionScript stops/jumps, sound triggers or interactive visibility rules and is not a full nested runtime trace. Native vector hit geometry and filters still require canonical-reference comparison.

Browser checked dosa playback advancing, pause/next frame, gallery hiding and canvas resizing at device pixel ratio 1.5. The document remained 1280 × 720 with no page overflow; no console errors were recorded in the inspected catalogue.
