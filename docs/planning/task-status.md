# Current status

The native game and both packages are implemented. Profiles are **Classic** and
**Optimized**. Optimized's ladle matches its pouring scale; this differs from the
compact-cursor checkpoint in older studies.

Latest runtime validation: 131 automated tests and saved Intel/NVIDIA
source/site/standalone interaction checks pass. Ladle pixels, scale, resize and
carry transitions are checked. Physical touch performance and universal original
Flash/audio/pixel equivalence are not established.

| Open item | Next action | Completion condition |
| --- | --- | --- |
| PERF-26 | Reduce full-size ladle composition cost without shrinking it | Meet cadence and CPU budgets on both Pi environments |
| PERF-17 | Investigate residual cold, larger-density and touch/Classic costs | Repeat scoped cold/warm gameplay with explicit limits |
| PERF-25 | Reproduce intermittent desktop graphics waits | Establish a cause with matched controls |
| PROF-7 | Select the shipping default | Explicit decision and verified preference migration |

Current full-size movement fails the combined performance budget. The
[performance summary](../performance/README.md) owns the metrics.

Documentation is grouped by development, game reference, performance and planning.
The cleanup removes repeated status narratives, translates the SWF comparison,
fixes outdated resource-export claims and standardizes profile names. Audit scope
and limits are in [privacy](../development/privacy.md).

[Implementation](implementation-plan.md) records port deliverables;
[performance tasks](performance-plan.md) records optimization work. Old run logs
and status histories are not copied into this file.
