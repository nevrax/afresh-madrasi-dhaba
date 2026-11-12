import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const build = spawnSync(process.execPath, ['scripts/internal/build.mjs'], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const dist = resolve(root, 'dist');
const output = resolve(dist, 'site');
if (relative(dist, output) !== 'site') throw new Error('Unexpected release path');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve(root, '.local-setup/build/offline/game.js'), resolve(output, 'game.js'));
cpSync(resolve(root, '.local-setup/build/offline/game-resources.js'), resolve(output, 'resources.js'));
cpSync(resolve(root, 'src/ui/styles.css'), resolve(output, 'styles.css'));
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  .replace('src/ui/styles.css', 'styles.css')
  .replace(/<a href="development\/catalog\/index.html">Resources<\/a>/, '')
  .replace(/<a\b[^>]*id="study-link"[^>]*>.*?<\/a>/, '')
  .replace(/<script>\s*if \(location.protocol[\s\S]*?<\/script>/, '<script src="resources.js"></script>\n  <script src="game.js"></script>');
writeFileSync(resolve(output, 'index.html'), html);
console.log('Game only: dist/site/ (static hosting) and dist/standalone/ (one HTML). Development tools are outside dist.');
