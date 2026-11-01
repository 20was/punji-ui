// Starter templates check: copy each templates/<name> into a fresh folder outside this repo, point its @punji/ui
// dependency at the packed tarball (what npm would publish next), install, and run the template's own `npm run build`
// (tsc + Vite for vite-react, `next build` for nextjs-app-router). Same approach as scripts/check-consumer.mjs.
// Also fails when a template's @punji/ui range does not cover the version in package.json, so a release that bumps
// the version also bumps the templates people open from the docs (StackBlitz installs from npm).
// Needs the npm registry or a warm npm cache.
//
//   npm run check:templates                 # every template
//   npm run check:templates -- vite-react   # one
//   KEEP=1 npm run check:templates          # keep the temporary folders
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const templatesDir = join(root, 'templates');
const only = process.argv.slice(2);
const names = readdirSync(templatesDir, { withFileTypes: true }).filter((d) => d.isDirectory() && (only.length === 0 || only.includes(d.name))).map((d) => d.name);
if (names.length === 0) throw new Error(`check-templates: no template matches ${only.join(', ')}`);
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', CI: '1' };
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** Does a caret range ("^0.1.0") or an x.y.z version satisfy `version`? Only the forms the templates use. */
function caretCovers(range, version) {
  const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  const v = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!m || !v) return range === version;
  const [a, b, c] = m.slice(1).map(Number);
  const [x, y, z] = v.slice(1).map(Number);
  if (x !== a) return false;
  if (a === 0 && y !== b) return false;
  return y > b || (y === b && z >= c);
}

const packDir = mkdtempSync(join(tmpdir(), 'punji-ui-templates-pack-'));
let failed = false;
try {
  run('npm', ['pack', '--pack-destination', packDir, '--ignore-scripts'], root);
  const tarball = join(packDir, readdirSync(packDir).find((f) => f.endsWith('.tgz')));
  for (const name of names) {
    const src = join(templatesDir, name);
    const manifest = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'));
    const range = manifest.dependencies?.['@punji/ui'];
    if (!range) { console.error(`template ${name}: package.json has no @punji/ui dependency`); failed = true; continue; }
    if (!caretCovers(range, pkg.version)) { console.error(`template ${name}: @punji/ui ${range} does not cover ${pkg.version}; bump it in templates/${name}/package.json`); failed = true; continue; }
    const dir = mkdtempSync(join(tmpdir(), `punji-ui-template-${name}-`));
    try {
      cpSync(src, dir, { recursive: true, filter: (path) => !/[/\\](node_modules|\.next|dist)([/\\]|$)/.test(path.slice(src.length)) });
      manifest.dependencies['@punji/ui'] = `file:${tarball}`;
      writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, 2));
      run('npm', ['install', '--prefer-offline', '--no-audit', '--no-fund', '--ignore-scripts'], dir);
      run('npm', ['run', 'build'], dir);
      console.log(`template ${name}: installs the packed tarball and \`npm run build\` passes`);
      if (!process.env.KEEP) rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      console.error(`template ${name} failed in ${dir}\n${error.stdout ?? ''}${error.stderr ?? error.message}`);
      failed = true;
    }
  }
} finally {
  rmSync(packDir, { recursive: true, force: true });
}
if (failed) process.exit(1);
