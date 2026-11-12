import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(root,'.local-setup/browsers');
export function chromeExecutablePath(){
 const candidates=[process.env.PLAYWRIGHT_CHROME,...[process.env.ProgramFiles,process.env.LOCALAPPDATA].filter(Boolean).map(base=>path.join(base,'Google/Chrome/Application/chrome.exe'))];
 for(const candidate of candidates)if(candidate&&existsSync(candidate))return candidate;
 const {chromium}=createRequire(import.meta.url)(path.join(root,'.local-setup/playwright/node_modules/playwright'));
 const fallback=chromium.executablePath();if(existsSync(fallback))return fallback;
 throw Error('No test browser found. Run scripts/10_setup.cmd.');
}
