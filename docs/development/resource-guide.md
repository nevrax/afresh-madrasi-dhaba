# Resource inspection

Double-click `31_open-resources.cmd` inside the repository's `scripts/` folder. It opens `reference/swf/extended.swf` in JPEXS. Run `scripts/31_open-resources.cmd -Variant original` to inspect the smaller edition.

| JPEXS section | Contents |
|---|---|
| Sprites | Characters, nested objects and animation timelines |
| Shapes | Vector drawings and character parts |
| Sounds | Music and sound effects, with playback controls |
| Buttons | Button states and related actions |
| Texts / Fonts | Game text and embedded fonts |
| Frames | The main movie timeline |
| Scripts | Original ActionScript |

Select an item to inspect it in the preview panel. Use **Export selection** to save selected resources. Characters may use nested sprites. A timeline preview does not necessarily execute the gameplay code controlling those objects.

## Existing exports

- `reference/decompiled/extended/clean/scripts/`: deobfuscated ActionScript, the primary implementation reference.
- `reference/decompiled/original/clean/scripts/`: smaller-edition code for comparison.
- `reference/decompiled/{edition}/raw/scripts/`: initial decompiler output, retained for provenance.
- `reference/decompiled/{edition}/raw/texts/`: extracted text.
- `analysis/metadata/`: string listings and tag inventories.
- `analysis/reports/main-code.diff`: main script differences.
- `analysis/reports/source-comparison.json`: source URLs, hashes and download outcomes.
- `reference/swf/sources.md`: readable index of mirror URLs, checksums, sizes and matching canonical files; `sources.json` contains the same index as structured data. Mirror binaries are not retained.
- `analysis/dumps/extended.xml`: full local XML dump.

Sprites, vector drawings and audio can be inspected in JPEXS. Native exports are already available in `assets/`; see the [asset inventory](asset-inventory.md) and [catalogue](catalog-guide.md).

## Useful extended-edition references

- Main gameplay: `reference/decompiled/extended/clean/scripts/frame_5/DoAction.as`.
- Score submission: `reference/decompiled/extended/clean/scripts/frame_6/DoAction.as`.
- Animated instructions: sprite 321 (335 timeline frames).
- External score form: sprite 579.
- Customer order sounds: exported names `order0` through `order4`.

The complete local JPEXS installation and upstream license are in `.local-setup/ffdec/`; the archive cache is in `.local-setup/downloads/`. All temporary tool installations belong under `.local-setup/` and are excluded from Git. The version, download URL and archive checksum are recorded in the tracked `tools/ffdec.json`. Restore it with `powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-ffdec.ps1`. The launcher discovers Java rather than hardcoding a path to this computer.
