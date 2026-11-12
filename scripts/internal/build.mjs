import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const compiler = fileURLToPath(new URL('../../.local-setup/typescript/lib/tsc.js', import.meta.url));
if (!existsSync(compiler)) {
  console.error('Run scripts/10_setup.cmd first. Tools stay in .local-setup.');
  process.exit(1);
}
const result = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.json', ...(process.argv.includes('--check') ? ['--noEmit'] : [])], { cwd: root, stdio: 'inherit' });
if(result.status!==0||process.argv.includes('--check'))process.exit(result.status??1);
await (await import('./build-offline.mjs')).buildOffline();
