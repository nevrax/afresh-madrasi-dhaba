# Verification

## Current runtime checkpoint

The full-size ladle release passes 131 automated tests. Visible isolated Intel
and NVIDIA checks cover source, `dist/site/` and direct-file standalone: profile
labels/switching, cooking, carrying, resize, fullscreen, storage and emulated touch.
The ladle has source pixels and natural scale.
[Saved results](../../tests/reference/batter-scale.json).

The preceding terminal-frame change passed 588 exact Canvas/hit comparisons and
90 independent-cache preparation comparisons. Those are historical scoped checks;
a Canvas-only oracle does not cover the newer separate ladle layer.
[Checkpoint data](../../tests/reference/performance-preparation.json).

Passing functional tests does not close the current performance failures. See
[performance](../performance/README.md).

## Reproduce checks

Use `scripts/10_setup.cmd` once. Run the following from the repository root with
the installed local Node executable. Browser checks require the local server from
`scripts/20_play.cmd` and use isolated visible profiles under `.local-setup/`.

| Check | Entry point | Scope |
| --- | --- | --- |
| Automated tests | `scripts/50_test.cmd` | Native rules, adapters and packaging |
| Build | `scripts/40_build.cmd` | Generate both packages; not gameplay acceptance |
| Visible application/packages | `tools/presentation-check.mjs check low-power` or `check high-performance` | Mouse input, profiles, dimensions and offline packages |
| Carry previews | `tools/carry-cursor-check.mjs` | Ladle pixels/scale and dosa/plate transitions |
| Frame retention | `tools/scene-retention-check.mjs --production-reuse` | Exact Canvas pixels/hits; touch path is the Canvas oracle |
| Preparation | `tools/preparation-check.mjs` | Independent prepared/unprepared caches |
| Documentation | `tools/documentation-check.mjs` | Local links, terminology, language markers and disclosure patterns |

Pi measurements use `tools/pi-performance.mjs` with locally supplied connection
details. Private host addresses, raw traces and screenshots do not belong in
tracked examples or result files.

## Reference evidence and limits

Preserved SWFs, scripts and resource hashes establish provenance.
[Coverage](../reference/behavior-coverage.md) maps rules to native code/tests.
[Reference validation](../reference/reference-validation.md) records bounded
Ruffle observations, including controlled instrumentation.

These do not certify every historical Adobe timing, font, audio or pixel detail.
Explicit native policies are in [decisions](../reference/decisions.md). The original
online backend is not included or validated. Emulator observations, unit assertions,
synthetic stress fixtures and real-time gameplay are different evidence types.
