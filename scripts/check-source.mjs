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
// Bikram Sambat conversion runs on our own audited table. A BS-calendar package would silently bring back unverified data.
const BS_PACKAGE = /nepali-date|nepali-datetime|nepali-calendar|bikram-sambat|bikram|ad-bs|bs-date|nepalidate/i;
const BS_MESSAGE = 'BS conversion uses our own table, see docs/research/bs-calendar';
const CLIENT = /\buse[A-Z]\w*\(|\bcreatePortal\b|\bon[A-Z]\w*=\{\s*\(|\bon[A-Z]\w*=\{\s*\w+\s*=>|\brequestAnimationFrame\b/;

for (const f of sources) {
  const rel = f.slice(root.length);
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/(?:\bfrom |\bimport\()'([^']+)'/g)) {
    if (m[1].startsWith('.') || m[1].startsWith('node:')) continue;
    if (BS_PACKAGE.test(m[1])) problems.push(`${rel}: imports BS-calendar package ${m[1]}; ${BS_MESSAGE}`);
    else if (!['react', 'react-dom'].includes(m[1])) problems.push(`${rel}: imports ${m[1]}`);
  }
  if (/dangerouslySetInnerHTML|innerHTML\s*=|\beval\(|new Function\(|setTimeout\(\s*['"`]/.test(text)) problems.push(`${rel}: builds HTML from strings or runs a string as code`);
  if (!rel.endsWith('index.ts') && !rel.includes('/internal/') && text.startsWith("'use client'") !== CLIENT.test(text)) problems.push(`${rel}: 'use client' ${CLIENT.test(text) ? 'missing' : 'not needed'}`);
}
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const name of Object.keys(pkg[field] ?? {})) if (BS_PACKAGE.test(name)) problems.push(`package.json: BS-calendar package ${name} in ${field}; ${BS_MESSAGE}`);
}
for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
  problems.push(BS_PACKAGE.test(name) ? `package.json: BS-calendar package ${name} added to dependencies; ${BS_MESSAGE}` : `Unreviewed runtime dependency: ${name}@${version}`);
}

// Optional peers (the table adapters' grid libraries) must stay optional, and no module may import them: the adapters
// are structural, so the core bundle and a consumer build never need them installed.
for (const name of Object.keys(pkg.peerDependencies ?? {})) {
  if (['react', 'react-dom'].includes(name)) continue;
  if (!pkg.peerDependenciesMeta?.[name]?.optional) problems.push(`package.json: peer ${name} must be optional (peerDependenciesMeta)`);
}

for (const [sub, target] of Object.entries(pkg.exports)) {
  if (typeof target === 'string' || sub.endsWith('.css')) continue;
  const src = target.default.replace('./dist/', 'src/').replace(/\.js$/, '');
  if (!existsSync(join(root, `${src}.ts`)) && !existsSync(join(root, `${src}.tsx`))) problems.push(`package.json: ${sub} has no source`);
}

// Stability: every documented component, hooks and utility page has a valid `stability` in the page registry, and
// the source of its first documented export carries the same `@stability <level>` JSDoc tag.
const { PAGES, STABILITY_LEVELS } = await import(join(root, 'site/src/registry.ts'));
const stabilityRe = (name) => new RegExp(`/\\*\\*(?:(?!\\*/)[\\s\\S])*?@stability (\\w+)(?:(?!\\*/)[\\s\\S])*?\\*/\\n(?:export (?:declare )?(?:async )?(?:function|const|class) ${name}\\b)`);
let tagged = 0;
for (const page of PAGES) {
  if (!['component', 'hooks', 'utility'].includes(page.kind)) continue;
  if (!STABILITY_LEVELS.includes(page.stability)) { problems.push(`site registry: page "${page.slug}" needs stability: one of ${STABILITY_LEVELS.join(', ')}`); continue; }
  const sourceText = page.api.map((a) => a.name).map((name) => [name, sources.map((f) => readFileSync(f, 'utf8')).find((t) => new RegExp(`^export (?:declare )?(?:async )?(?:function|const|class) ${name}\\b`, 'm').test(t))]).find(([, t]) => t);
  if (!sourceText) continue;
  const m = stabilityRe(sourceText[0]).exec(sourceText[1]);
  if (!m) problems.push(`${page.slug}: the export ${sourceText[0]} needs a "@stability ${page.stability}" JSDoc tag`);
  else if (m[1] !== page.stability) problems.push(`${page.slug}: @stability ${m[1]} on ${sourceText[0]} does not match the registry (${page.stability})`);
  else tagged++;
}
console.log(`stability: ${tagged} documented exports carry a matching @stability tag`);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`source: ${sources.length} modules use approved dependencies; 'use client' where needed`);
