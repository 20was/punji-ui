import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const root = await import(pkg.name);
let checked = 0;
// Data-only subpaths kept off the root on purpose, so the root import does not carry them (loaded on demand).
const ROOT_EXEMPT = new Set(['./nepal-address-data']);
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
