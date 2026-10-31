// Source guard: reviewed dependencies only; declares 'use client' exactly when it
// uses hooks or makes its own event handlers, builds no HTML from strings and
// runs no strings as code; every subpath in package.json has its source.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const sources = walk(join(root, 'src')).filter((f) => /\.tsx?$/.test(f));
const problems = [];
const CLIENT = /\buse[A-Z]\w*\(|\bcreatePortal\b|\bon[A-Z]\w*=\{\s*\(|\bon[A-Z]\w*=\{\s*\w+\s*=>|\brequestAnimationFrame\b/;

for (const f of sources) {
  const rel = f.slice(root.length);
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/from '([^']+)'/g)) if (!m[1].startsWith('.') && !['react', 'react-dom', '@remotemerge/nepali-date-converter'].includes(m[1])) problems.push(`${rel}: imports ${m[1]}`);
  if (/dangerouslySetInnerHTML|innerHTML\s*=|\beval\(|new Function\(|setTimeout\(\s*['"`]/.test(text)) problems.push(`${rel}: builds HTML from strings or runs a string as code`);
  if (!rel.endsWith('index.ts') && !rel.includes('/internal/') && text.startsWith("'use client'") !== CLIENT.test(text)) problems.push(`${rel}: 'use client' ${CLIENT.test(text) ? 'missing' : 'not needed'}`);
}
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  if (name !== '@remotemerge/nepali-date-converter' || version !== '1.2.5') problems.push(`Unreviewed runtime dependency: ${name}@${version}`);
}

for (const [sub, target] of Object.entries(pkg.exports)) {
  if (typeof target === 'string' || sub.endsWith('.css')) continue;
  const src = target.default.replace('./dist/', 'src/').replace(/\.js$/, '');
  if (!existsSync(join(root, `${src}.ts`)) && !existsSync(join(root, `${src}.tsx`))) problems.push(`package.json: ${sub} has no source`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`source: ${sources.length} modules use approved dependencies; 'use client' where needed`);
