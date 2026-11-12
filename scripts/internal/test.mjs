import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const build = spawnSync(process.execPath, ['scripts/internal/build.mjs'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const files = [...globSync('tests/**/*.test.mjs', { cwd: root })];
if (!files.length) { console.error('No tests found.'); process.exit(1); }
const result = spawnSync(process.execPath, ['--test', '--test-isolation=none', ...files], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
