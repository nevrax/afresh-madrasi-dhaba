# Repository instructions

- Before implementation work, read `docs/planning/implementation-plan.md` and `docs/planning/task-status.md`. Keep task IDs, completion evidence, unresolved decisions and next actions current; use these files for session handoffs. Do not equate agent completion with verified feature completion.

- Put temporary tool installations, downloaded tool archives and installer scratch files under the repository's `.local-setup/` directory. Keep that directory excluded from Git.
- Keep reusable setup scripts and pinned tool metadata in `tools/`, tracked in Git. Those scripts must install into `.local-setup/`.
- Keep any temporary tool or diagnostic logs only in `.local-setup/logs/`; do not recreate `analysis/logs/`. Avoid saving logs unless needed. Redact local usernames, machine names, absolute personal paths and credentials before retaining diagnostic output in tracked reports.
- For distribution, export tracked files with `git archive`; do not ZIP the entire working directory, which may contain private local setup files.
- Do not recreate the obsolete sibling `.research/` directory or binary mirror copies. Preserve the two canonical SWFs and maintain the source URL/checksum/size index instead.
- Use lowercase, hyphen-separated names for new project files and directories, including Windows launchers. Preserve conventional names such as README.md and AGENTS.md, and names inside upstream tools and original reference exports.
- User-facing Windows launchers are the explicit naming exception: keep them in `scripts/`, named `NN_name.cmd` with a two-digit index, underscore and lowercase name. Keep internal build code in `scripts/internal/`; do not recreate root launchers or duplicate aliases.
- Group launcher numbers by purpose: 10–19 setup, 20–29 play, 30–39 resource inspection, 40–49 build/distribution, 50–59 automated tests. Reserve 60–69 for browser checks and 80–89 for performance studies if those gain launchers. Assign the next unused number within its category; do not renumber unrelated groups or add placeholder commands.

- Shared documentation describes the game, implementation, evidence and public sources. Do not include conversation history, personal contributions or devices, private screenshots, account details, local personal paths, or work-session dates. Keep private research context under ignored .local-setup only.

- Madrasi Dhaba is the original game, credited to GamezIndia. Afresh identifies only this reimplementation. Never describe the original game or its assets as belonging to Afresh.

- The root README welcomes players: standalone HTML playback first, screenshots, food, music and brief remake context. Keep commands, build instructions, profiling tables and implementation internals in linked developer guides. Explain song meanings locally; source links supplement the explanations.

- Track both ready to play packages in dist/site and dist/standalone. Rebuild them after runtime or asset changes and commit the generated output with the corresponding source. Keep intermediate output and installed tools under ignored .local-setup.

- Documentation is English-only and organized through `docs/README.md`. Use Classic / Optimized in prose; retain `extra` only as the compatibility identifier. Current metrics belong in `docs/performance/README.md`, tasks in `docs/planning/`, and historical experiments in `docs/performance/studies/`. Do not append chronological run narratives to current status or setup instructions. Run `tools/documentation-check.mjs` after documentation changes.
