// Keep pure utility modules independently usable outside React and the browser.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
// Pure directories and the one external dependency each may use per file.
const PURE = { nepal: { 'calendar.ts': '@remotemerge/nepali-date-converter' }, calculations: {} };
for (const [dir, allowed] of Object.entries(PURE)) {
  for (const name of readdirSync(resolve(root, 'src', dir))) {
    if (!name.endsWith('.ts')) continue;
    const file = resolve(root, 'src', dir, name);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      const local = specifier.startsWith('.');
      const target = local ? relative(resolve(root, 'src', dir), resolve(dirname(file), specifier)) : specifier;
      if (local ? target.startsWith('..') || target.endsWith('.tsx') : allowed[name] !== specifier) {
        problems.push(`${dir}/${name}: forbidden dependency ${specifier}`);
      }
    }
    if (/\b(?:window|document|localStorage|sessionStorage|navigator)\b/.test(source)) problems.push(`${dir}/${name}: browser global in a pure module`);
  }
}
if (problems.length) throw new Error(problems.join('\n'));
console.log('boundaries: Nepal and calculation utilities have no React, component, or browser dependencies; calendar dependency isolated');
