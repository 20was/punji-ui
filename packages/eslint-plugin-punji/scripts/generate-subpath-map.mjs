// Generates data/subpath-map.json (export name -> '@punji/ui/<subpath>') from the
// @punji/ui package.json exports and its TypeScript sources (a light text scan: the repo's
// TypeScript 7 has no JS compiler API). Run from the repo root:
//   node packages/eslint-plugin-punji/scripts/generate-subpath-map.mjs
// Commit the JSON; the plugin never reads the repo at lint time.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** Names a source file exports, following relative `export * from`. `own` marks names the file itself declares. */
function exportsOf(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const out = [];
  for (const m of text.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|function\*?|class|abstract class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) out.push({ name: m[1], own: true });
  for (const m of text.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}(?:\s+from\s+'([^']+)')?/gm)) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const name = (bits[1] ?? bits[0]).trim();
      if (name) out.push({ name, own: !m[2] });
    }
  }
  for (const m of text.matchAll(/^export\s+\*\s+from\s+'(\.[^']+)'/gm)) {
    const base = resolve(dirname(file), m[1].replace(/\.[jt]sx?$/, ''));
    const next = [`${base}.ts`, `${base}.tsx`].find((f) => existsSync(f));
    if (next) out.push(...exportsOf(next, seen).map((e) => ({ ...e, own: false })));
  }
  return out;
}

// name -> candidate subpaths. A name declared by exactly one subpath's own file wins; otherwise a single candidate wins.
const found = new Map();
for (const [sub, target] of Object.entries(pkg.exports)) {
  if (sub === '.' || typeof target === 'string' || sub.endsWith('.css')) continue;
  const base = join(root, target.default.replace('./dist/', 'src/').replace(/\.js$/, ''));
  const file = [`${base}.ts`, `${base}.tsx`].find((f) => existsSync(f));
  if (!file) continue;
  for (const { name, own } of exportsOf(file)) {
    const list = found.get(name) ?? [];
    if (!list.some((c) => c.sub === sub)) list.push({ sub: sub.slice(2), own });
    found.set(name, list);
  }
}

const map = {};
for (const name of [...found.keys()].toSorted()) {
  const list = found.get(name);
  const owned = list.filter((c) => c.own);
  const pick = owned.length === 1 ? owned[0] : list.length === 1 ? list[0] : undefined;
  if (pick) map[name] = `@punji/ui/${pick.sub}`;
}
writeFileSync(join(here, '../data/subpath-map.json'), `${JSON.stringify(map, null, 2)}\n`);
console.log(`subpath map: ${Object.keys(map).length} of ${found.size} names mapped`);
