# Development tools

These tools are source code for development, never part of either published game package.

- `catalog/`: resource catalogue, including the HTML entry, TypeScript and CSS. Open with `30_open-catalog.cmd` in the repository's `scripts/` folder, or double-click `catalog/index.html` after setup.
- `verification/`: local gameplay scenarios, graphics checks, performance studies and optional diagnostics. Open `/development/verification/` on the development server.

Both use the shared native resources in `assets/` and game modules in `src/`. Generated modules and offline bundles live in `.local-setup/build/`. Rebuild using `scripts/40_build.cmd`; restore the complete build environment using `scripts/10_setup.cmd`.
