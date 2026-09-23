# Setup, build and project layout

Native TypeScript remake of the extended Flash edition, rendered with scalable native vectors. Implementation coverage and historical limits are documented in [verification](verification.md) and [decisions](../reference/decisions.md).

This guide is for building, modifying or publishing the remake. To play an already prepared standalone game, open its index.html with a double click.

## Start on another Windows laptop

To play, copy or clone the repository and open **dist/standalone/index.html** directly. Both prepared game packages are included in Git.

To develop or rebuild the game, double-click **scripts/10_setup.cmd**. It installs a pinned portable Node.js, TypeScript and Playwright under `.local-setup/`, prepares a local test browser if Chrome is absent, and builds both game packages. No global Node/npm installation or administrator access is required. The first setup needs internet; later runs reuse installed tools. It does not change the system PATH or use a personal browser profile for tests.

| Category | Commands |
|---|---|
| **10–19 · Setup** | `scripts/10_setup.cmd` — install/restore local tools and build |
| **20–29 · Play** | `scripts/20_play.cmd` — normal play; `scripts/21_play-nvidia.cmd` — isolated GPU browser |
| **30–39 · Resources** | `scripts/30_open-catalog.cmd` — development catalogue; `scripts/31_open-resources.cmd` — original SWF/JPEXS |
| **40–49 · Build** | `scripts/40_build.cmd` — regenerate both distributable game packages |
| **50–59 · Tests** | `scripts/50_test.cmd` — build and run all automated tests |

Run **10 once on a new laptop**, then **20 whenever you want to play**. The tens identify categories, not execution order. Future commands use free numbers within the same group; existing groups keep their numbers. See [the command guide](../../scripts/README.md).

The build/play/test launchers always use the project's local Node.js. They bootstrap it if it is missing. For unattended use, pass `-NoPause`. Re-running setup is safe and does not delete source, tools, local settings or browser profiles. Implementation helpers live under scripts/internal; there are no launchers in the repository root.

## Directory structure

```text
src/                         Game source in TypeScript
assets/                      Native source resources and original export inventory
development/
  catalog/                   Development resource browser: HTML, TypeScript, CSS
  verification/              Scenario checks, graphics tests and performance studies
tests/                       Automated tests and sanitized reference results
docs/README.md               Documentation index
  development/               Setup, architecture, resources and verification
  reference/                 Source rules, parity decisions and cultural research
  performance/               Current results and historical studies
  planning/                  Current tasks and implementation records
reference/                   Canonical SWFs, source index and decompiled ActionScript
analysis/                    Preserved reference analysis
scripts/                     Numbered user commands and their guide
  internal/                  Build, packaging and server implementation
tools/                       Reusable setup/test scripts and pinned tool versions
.local-setup/                LOCAL ONLY; ignored by Git
  node/                      Portable Node.js and npm
  typescript/                Pinned compiler
  playwright/                Browser automation dependency
  browsers/                  Test browser, only needed when Chrome is absent
  build/                     ALL intermediate compiled modules and offline bundles
  downloads/                 Tool archives and package cache
  logs/                      Temporary diagnostic logs
dist/                        GENERATED GAME PACKAGES ONLY; included in Git
  site/                      Game for Azure/static hosting; four files
  standalone/                Same game in one self-contained index.html
index.html                   Game entry for the source checkout
```

**The catalogue and verification tools never go into dist.** There are no intermediate build modules, source exports, catalogue previews, SWFs or setup tools in the two game packages.

## Play or publish

- **`dist/site/`** contains only `index.html`, `game.js`, `resources.js` and `styles.css`. Upload these four files together, with index.html at the hosting root, including on Azure Static Web Apps.
- **`dist/standalone/index.html`** contains the same game and resources in a single portable HTML file. Copy it alone or publish it as the site's index.html.
- Both packages work by double-click and over HTTP. They contain no development links and need no Node, server process or internet at runtime.
- The source checkout's `index.html` also works by double-click after setup. Its Resources menu opens `development/catalog/index.html`.
- The optional development server is `http://127.0.0.1:5173/`. It serves compiled modules through `/build/` while keeping the rest of `.local-setup/` inaccessible.

Only send the selected game package for publishing. To continue development elsewhere, send the repository instead. Both generated game packages are tracked in Git; local tools and intermediate builds remain ignored. After changing runtime code or assets, rebuild both packages with `scripts/40_build.cmd` and include the updated dist files with the source changes.

### GitHub Pages

The included `.github/workflows/github-page-site.yml` publishes the prepared `dist/site/` package. In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source, then push the workflow to `main`. The **Deploy static content to Pages** workflow also has a manual **Run workflow** button in Actions. Pushes to `main` trigger publication automatically.

The workflow uploads only the four site files. It does not rebuild the game or publish the resource catalogue. Rebuild and commit updated packages before publishing runtime changes. The deployment job reports the live URL once publication succeeds. See [GitHub's workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### Repository archive

For a clean source ZIP from a committed snapshot:

```text
git archive --format=zip --output=../madrasi-dhaba-source.zip HEAD
```

Do not ZIP the entire working directory: local diagnostic logs and profiles may contain personal paths.

## Game and reference details

The original rules, tutorial, vector composition, timing and eleven sounds are implemented in native TypeScript/Canvas. Source animation poses keep their authored cadence. FPS is off by default; More options provides rendering quality and optional performance information. The fullscreen icon and in-window expansion are separate controls. Browser autoplay may require the first gesture to enable sound.

The original score form and request contract are implemented, but the historical online backend is not included. With no endpoint configured, the game reports that online scores are unavailable and sends nothing. Local scores are separate. See [score-service configuration](../../src/services/README.md).

The two canonical SWFs and decompiled scripts are reference material, not runtime dependencies. JPEXS, Java and optional Python/reference-emulator tooling are only needed for research or re-exporting assets; see [resource guide](resource-guide.md) and [reference validation](../reference/reference-validation.md). They are not prerequisites for building or changing the native game. The repository does not claim ownership of the original game assets.

For development, start with [architecture](architecture.md), [game rules](../reference/game-rules.md), [catalogue guide](catalog-guide.md), [implementation plan](../planning/implementation-plan.md) and [current task status](../planning/task-status.md). Tool installers and version manifests remain tracked in `tools/`; installations always stay in `.local-setup/`.
