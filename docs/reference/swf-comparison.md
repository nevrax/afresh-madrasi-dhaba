# Preserved SWF editions

The recorded comparison contains 13 downloads from 12 domains and two binaries.
The [source index](../../reference/swf/sources.md) preserves mirror URLs, sizes and
checksums. Duplicate mirror binaries are not retained. This summarizes recorded
analysis, not a fresh URL-availability check.

| Edition | Compressed bytes | Uncompressed bytes | SHA-256 |
| --- | ---: | ---: | --- |
| Original, smaller | 1,248,849 | 1,413,788 | `1d054a0a4a1c235a01060ad76c2c3ead7f67a24e16c06ca37cba270e9c471a6f` |
| Extended, larger | 1,486,192 | 1,809,134 | `9bf19a5d63ef2375e2b675d9c5126e6b27d0d87f55e1fcc0d24e52b090ed2d2a` |

Both are compressed CWS, SWF version 8, with 12 fps authored timelines. Extended
is 237,343 bytes larger on disk. SWF format version is not the game's revision.
Gatoconbota matches the smaller file; KidzSearch matches the larger one. They are
not identical binaries.

## Supported differences

Static analysis used JPEXS 26.3.0 with AS1/2 deobfuscation. Evidence includes
[download analysis](../../analysis/reports/source-comparison.json),
[main-code diff](../../analysis/reports/main-code.diff) and preserved scripts.

1. **Tutorial:** extended adds `btnHowToPlay` and `mcInstruction`, sprite 321 with
   335 frames and Skip.
2. **Order sounds:** extended adds `order0` through `order4`. The smaller edition
   calls these names but lacks their exports. Its six sound payloads are also
   present in extended, which has eleven sounds.
3. **Audio controls:** smaller uses radio interaction; extended adds Mute/Unmute
   and guards order audio. Extended chooses `bgMusic1` or `bgMusic2`; smaller uses
   `random(3)+1` despite two exported tracks. Exact historical behavior for the
   missing third sound is not established by static analysis.
4. **External scores:** extended adds a name form and external GamezIndia
   score/leaderboard flow. Smaller uses member/tournament endpoints and `callAjax`.
   Code existence does not establish current service availability. No test score
   was submitted to the original service.
5. **Interface resources:** extended adds branding, fonts and Flash UI libraries.
   Script exports increase from 23 to 83, largely through those libraries.
   Decompressed tag sizes are not direct compressed-file size contributions.

The compared cooking, burning, moving, serving, customer, scoring and day code has
the same rules. Customer-script differences include the audio guard. No new levels
or mechanics were identified. Native behavior and runtime evidence are separate:
[coverage](behavior-coverage.md), [reference validation](reference-validation.md).

## Limits

More resources do not prove a later release: the smaller binary could be a reduced
edition. No verified game version, changelog or build date establishes chronology.
Mirror upload dates and HTTP headers are not game release dates. An archive listing
or a URL ending in `-2` is not proof of another binary or a sequel. The remake uses
extended because of verified features, not an invented date.
