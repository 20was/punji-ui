// Live development: rebuild the library into dist/ on every save (TypeScript in
// watch mode, CSS on change) while the docs site's Vite server reloads from the
// built package, exactly as a consumer sees it. Usage: npm run dev
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd, args, name) => {
  const child = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = (chunk) => chunk.toString().split('\n').filter(Boolean).map((line) => `[${name}] ${line}`).join('\n');
  child.stdout.on('data', (chunk) => console.log(prefix(chunk)));
  child.stderr.on('data', (chunk) => console.error(prefix(chunk)));
  return child;
};
const once = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { cwd: root, stdio: 'inherit' });
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`))));
});

// One full build first so the site starts against a complete dist/ and API data.
await once('npm', ['run', 'build']);
await once('node', ['scripts/site-gen.mjs']);

const children = [
  run('npx', ['tsc', '-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], 'tsc'),
  run('npx', ['vite', 'site'], 'site'),
];

let pending;
watch(`${root}src/styles`, () => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    const css = run('node', ['scripts/build-css.mjs'], 'css');
    css.on('exit', (code) => { if (code !== 0) console.error('[css] build failed'); });
  }, 100);
});

const stop = () => { for (const child of children) child.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
