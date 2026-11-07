import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const root = await import(pkg.name);
let checked = 0;
// Data-only subpaths kept off the root on purpose, so the root import does not carry them (loaded on demand).
// The language packs are kept off the root too, so an app ships only the languages it imports.
// The optional table and canvas chart adapters are off the root too: they are opt-in subpaths for apps that run a third-party grid or chart library.
const ROOT_EXEMPT = new Set(['./tanstack-table', './ag-grid', './mui-x-grid', './lightweight-charts', './echarts', './nepal-address-data', './locale/ne', './locale/hi', './locale/bn']);
for (const [name, target] of Object.entries(pkg.exports)) {
  if (name === '.' || typeof target === 'string' || name.endsWith('.css') || ROOT_EXEMPT.has(name)) continue;
  if (!existsSync(resolve(target.types))) throw new Error(`${name}: missing declaration ${target.types}`);
  const module = await import(`${pkg.name}${name.slice(1)}`);
  for (const key of Object.keys(module)) {
    if (!(key in root)) throw new Error(`${name}: ${key} missing from public root`);
    if (root[key] !== module[key]) throw new Error(`${name}: ${key} differs from public root`);
    checked++;
  }
}
console.log(`exports: ${checked} subpath values agree with the public root`);
