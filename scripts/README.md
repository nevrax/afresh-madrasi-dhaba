# Commands

On a new laptop, run **10_setup.cmd** once. Then use **20_play.cmd** whenever you want to play.

Before using the HTTP launchers, copy `.env.example` to `.env` and configure the
assigned ports and complete paths. `tools/generate-external-proxy-config.cmd`
is a separate text-only deployment tool; it starts nothing. See
[external proxy configuration](../docs/development/external-proxy.md).

The tens identify categories, not an execution sequence: 10–19 setup, 20–29 play, 30–39 resources, 40–49 build/distribution, and 50–59 automated tests. Leave unused numbers available for later additions.

| Command | When to use it |
|---|---|
| [10_setup.cmd](10_setup.cmd) | First setup, or to restore the local build environment. Also builds the game. |
| [20_play.cmd](20_play.cmd) | Play normally. Builds and starts/reuses the local server. |
| [21_play-nvidia.cmd](21_play-nvidia.cmd) | Optional alternative to 20: isolated browser with high-performance GPU selection. |
| [30_open-catalog.cmd](30_open-catalog.cmd) | Browse development resources, animations and sounds. |
| [31_open-resources.cmd](31_open-resources.cmd) | Optional reference research: open the original SWF in JPEXS. |
| [40_build.cmd](40_build.cmd) | Regenerate the two game packages in dist after source changes. |
| [50_test.cmd](50_test.cmd) | Build and run automated tests after changes. |

You can double-click these files from Explorer; they locate the project themselves. Setup/build/test also accept `-NoPause` for terminal automation. The SWF viewer accepts `-Check` and `-Variant original`.

`internal/`, `assets/`, `analysis/`, `reference/` and `windows/` contain implementation helpers. Use the numbered commands above for ordinary work.

Reserve 60–69 for browser-check launchers and 80–89 for performance-study launchers if needed later. These ranges do not add commands or mandatory steps. Choose unique indices within a category; do not create empty placeholders.
