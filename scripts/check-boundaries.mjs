// Keep pure Nepal modules independently usable outside React and the browser.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const problems = [];
for (const name of readdirSync(resolve(root, 'src/nepal'))) {
  if (!name.endsWith('.ts')) continue;
  const file = resolve(root, 'src/nepal', name);
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    const local = specifier.startsWith('.');
    const target = local ? relative(resolve(root, 'src/nepal'), resolve(dirname(file), specifier)) : specifier;
    if (local ? target.startsWith('..') || target.endsWith('.tsx') : !(name === 'calendar.ts' && specifier === '@remotemerge/nepali-date-converter')) {
      problems.push(`nepal/${name}: forbidden dependency ${specifier}`);
    }
  }
  if (/\b(?:window|document|localStorage|sessionStorage|navigator)\b/.test(source)) problems.push(`nepal/${name}: browser global in a pure module`);
}
if (problems.length) throw new Error(problems.join('\n'));
console.log('boundaries: Nepal utilities have no React, component, or browser dependencies; calendar dependency isolated');
