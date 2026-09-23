# Documentation

For playing, start with the [project README](../README.md). Documentation is in
English. **Classic** and **Optimized** are the visible profile names; the stored
`extra` value remains for compatibility with saved preferences.

| Section | Purpose | Start here |
| --- | --- | --- |
| Development | Setup, packaging, architecture, resources and checks | [Developer guide](development/getting-started.md) |
| Game reference | Extracted rules, source mapping, parity limits and cultural research | [Game rules](reference/game-rules.md) |
| Performance | Current results and the experiments supporting them | [Current performance](performance/README.md) |
| Planning | Current work and completion records | [Status](planning/task-status.md) |

## Development

- [Architecture](development/architecture.md): module boundaries and execution model.
- [Presentation profiles](development/presentation-profiles.md): Classic versus Optimized.
- [Verification](development/verification.md): checks, reproduction and limits.
- [Asset inventory](development/asset-inventory.md): formats and export provenance.
- [Resource guide](development/resource-guide.md) and [catalogue guide](development/catalog-guide.md): inspecting original and native resources.
- [Privacy audit](development/privacy.md): scan scope and public technical metadata.

## Game reference

- [Rules](reference/game-rules.md), [behavior coverage](reference/behavior-coverage.md)
  and [decisions](reference/decisions.md): source evidence versus implementation policy.
- [Reference validation](reference/reference-validation.md): bounded emulator observations.
- [SWF comparison](reference/swf-comparison.md) and [script inventory](reference/script-inventory.json).
- [Name, setting and music](reference/name-and-setting.md): sourced reading and tentative interpretations.

## Plans and evidence

[Implementation](planning/implementation-plan.md) records port deliverables.
[Performance tasks](planning/performance-plan.md) own unfinished optimization work.
Only [status](planning/task-status.md) describes the current work.

Detailed experiments live in `performance/studies/` and are explicitly historical.
Numerical evidence stays in [`tests/reference/`](../tests/reference/). Raw traces,
personal browser profiles and setup logs stay outside Git under `.local-setup/`.

Keep three things distinct: behavior supported by source/tests, measurements for
a specified workload, and hypotheses. Past success is not a current-release or
universal hardware guarantee.
