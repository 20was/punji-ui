// Runs the visual gate inside the official Playwright container so baselines
// are rendered by the same OS, fonts and Chromium build that CI uses.
// Usage: node scripts/visual-docker.mjs [playwright test args...]
// The image tag is derived from the pinned @playwright/test version.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = pkg.devDependencies['@playwright/test'];
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`@playwright/test must be pinned to an exact version, found "${version}"`);
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const args = process.argv.slice(2).map((a) => `'${a.replaceAll("'", "'\\''")}'`).join(' ');

// CI baselines are linux/amd64; force that platform so Apple Silicon hosts match.
// node_modules lives in a named volume so host (darwin) binaries are never used.
const inner = [
  '[ node_modules/.package-lock.json -nt package-lock.json ] || npm ci --ignore-scripts --no-audit --no-fund',
  `npx playwright test ${args}`,
].join(' && ');

const docker = ['run', '--rm', '--platform', 'linux/amd64', '--ipc=host', '-v', `${process.cwd()}:/work`, '-v', 'punji-ui-visual-node-modules:/work/node_modules', '-w', '/work', '-e', 'PLAYWRIGHT_HTML_OPEN=never', image, 'bash', '-c', inner];
const result = spawnSync('docker', docker, { stdio: 'inherit' });
if (result.error) {
  console.error(`Could not run docker: ${result.error.message}. Install and start Docker, or rely on the CI job.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
