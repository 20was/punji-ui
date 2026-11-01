// Scaffold a new component with every file the component bar asks for (docs/CONTRIBUTING-COMPONENT.md):
//   src/<name>/<Name>.tsx, src/styles/<name>.css (+ styles.css import), the root export in src/index.ts, the
//   ./<name> subpath in package.json, JS and CSS budgets in .size-limit.json, test/<name>.test.tsx, a docs page in
//   site/src/registry-community.ts with site/src/examples/<name>/basic.tsx, a pending visual fixture in
//   test/visual/fixtures-community.tsx and manifest.ts, and a changeset.
// The result lints, typechecks, tests, builds and fits its budgets as it is. check:seo then asks for one thing only a
// person can decide: link the new page from an existing page's `related` list. Then replace every TODO.
//
//   npm run new:component -- rate-badge
//   npm run new:component -- rate-badge --group=banking
//   npm run new:component -- rate-badge --dry-run       # list the files, write nothing
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GROUPS, PAGES } from '../site/src/registry.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const group = args.find((a) => a.startsWith('--group='))?.slice(8) ?? 'data';
const dryRun = args.includes('--dry-run');
const die = (message) => {
  console.error(`new:component: ${message}`);
  process.exit(1);
};

if (!name) die('give a kebab-case name: npm run new:component -- rate-badge');
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) die(`"${name}" is not kebab-case (lower-case words joined by hyphens)`);
const groups = GROUPS.filter((g) => !['get-started', 'foundations', 'showcase'].includes(g.id)).map((g) => g.id);
if (!groups.includes(group)) die(`--group must be one of ${groups.join(', ')}`);
const Name = name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (existsSync(join(root, 'src', name))) die(`src/${name} already exists`);
if (pkg.exports[`./${name}`]) die(`package.json already exports ./${name}`);
if (PAGES.some((p) => p.slug === name)) die(`a docs page with the slug ${name} already exists`);
if (new RegExp(`\\b${Name}\\b`).test(readFileSync(join(root, 'src/index.ts'), 'utf8'))) die(`${Name} is already exported from src/index.ts`);

const description = `${Name}: a React component for finance apps. TODO replace this with what it shows, when to use it and the words people search with.`;
if (description.length < 120 || description.length > 160) die(`the placeholder description is ${description.length} characters; pick a shorter name or edit the generator`);

const writes = [];
const create = (rel, content) => {
  if (existsSync(join(root, rel))) die(`${rel} already exists`);
  writes.push([rel, content]);
};
/** Insert `text` before the line containing `marker` in an existing file. */
const insertBefore = (rel, marker, text) => {
  const current = writes.find(([r]) => r === rel)?.[1] ?? readFileSync(join(root, rel), 'utf8');
  const at = current.indexOf(marker);
  if (at < 0) die(`${rel}: marker "${marker}" not found (was it removed?)`);
  const lineStart = current.lastIndexOf('\n', at) + 1;
  const next = `${current.slice(0, lineStart)}${text}${current.slice(lineStart)}`;
  const existing = writes.findIndex(([r]) => r === rel);
  if (existing >= 0) writes[existing][1] = next;
  else writes.push([rel, next]);
};

// The component: presentational, no hooks, so no 'use client' (scripts/check-source.mjs checks it both ways).
create(`src/${name}/${Name}.tsx`, `/**
 * ${Name} (design.punji.app/components/${name}): TODO one or two sentences: what it shows, when to reach for it
 * and what to use instead when it does not fit.
 */
import type { ReactNode } from 'react';

export interface ${Name}Props {
  /** The content. TODO describe what goes here in the reader's words. */
  children: ReactNode;
  /** Sets \`data-testid\` on the root. */
  testId?: string;
  /** Extra class names on the root. */
  className?: string;
}

export function ${Name}({ children, testId, className }: ${Name}Props) {
  return (
    <div className={\`pu-${name}\${className ? \` \${className}\` : ''}\`} data-testid={testId}>
      {children}
    </div>
  );
}
`);

create(`src/styles/${name}.css`, `/* Punji UI styles.
   Styles for ${Name}. Needs tokens.css and base.css (styles.css has everything). Colours, type and space from --pu-* tokens only. */
@layer punji.components {
  .pu-${name} { display: flex; align-items: center; gap: var(--pu-space-2); color: var(--pu-color-text); font-size: var(--pu-text-sm) }
}
`);
insertBefore('src/styles/styles.css', "@import './contrast.css';", `@import './${name}.css';\n`);

writes.push(['src/index.ts', `${readFileSync(join(root, 'src/index.ts'), 'utf8').replace(/\n*$/, '\n')}export * from './${name}/${Name}.tsx';\n`]);

// package.json: the subpath export, placed with the other component subpaths (before the CSS entry points).
{
  const exports = {};
  let placed = false;
  for (const [key, value] of Object.entries(pkg.exports)) {
    if (!placed && key.startsWith('./css/')) {
      exports[`./${name}`] = { types: `./dist/${name}/${Name}.d.ts`, default: `./dist/${name}/${Name}.js` };
      placed = true;
    }
    exports[key] = value;
  }
  if (!placed) exports[`./${name}`] = { types: `./dist/${name}/${Name}.d.ts`, default: `./dist/${name}/${Name}.js` };
  writes.push(['package.json', `${JSON.stringify({ ...pkg, exports }, null, 2)}\n`]);
}

// Size budgets: generous starting limits. Run `npx size-limit`, then set each limit a little above what it measures.
{
  const budgets = JSON.parse(readFileSync(join(root, '.size-limit.json'), 'utf8'));
  budgets.push(
    { name: `${name} (import from '@punji/ui/${name}')`, path: `dist/${name}/${Name}.js`, import: '*', limit: '1 kB', gzip: true },
    { name: `${Name} CSS`, path: `dist/css/${name}.css`, limit: '0.5 kB', rolldown: false, gzip: true },
  );
  writes.push(['.size-limit.json', `${JSON.stringify(budgets, null, 2)}\n`]);
}

create(`test/${name}.test.tsx`, `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ${Name} } from '../src/index.ts';
import { seriousViolations } from './axe.ts';

// TODO cover the real behaviour: roles and names, keyboard, pointer, every state, and edge cases (missing values,
// long text, Devanagari digits). See docs/CONTRIBUTING-COMPONENT.md.
describe('${Name}', () => {
  it('renders its content with a test id and an extra class', () => {
    render(<${Name} testId="x" className="extra">NABIL</${Name}>);
    const el = screen.getByTestId('x');
    expect(el.textContent).toBe('NABIL');
    expect(el.className).toBe('pu-${name} extra');
  });

  it('has no serious axe violations', async () => {
    const { container } = render(<${Name}>NABIL</${Name}>);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
`);

create(`site/src/examples/${name}/basic.tsx`, `import { ${Name} } from '@punji/ui/${name}';

/** TODO show the most common use with realistic (invented) finance data. */
export default function Example() {
  return <${Name}>NABIL</${Name}>;
}
`);

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
insertBefore('site/src/registry-community.ts', 'new:component inserts pages above this line', `  {
    slug: ${q(name)},
    title: ${q(Name)},
    // TODO 120 to 160 characters, unique: the search-result text.
    description: ${q(description)},
    lead: ${q(`TODO one plain line (at most 140 characters) for someone evaluating ${Name}.`)},
    group: ${q(group)},
    kind: 'component',
    summary: ${q(`TODO the overview: what ${Name} is, what it guarantees (exact money, accessibility) and what it does not do.`)},
    use: [${q('TODO when to use it.')}],
    avoid: [${q('TODO when not to, and what to use instead.')}],
    api: [{ name: ${q(Name)}, module: ${q(name)} }],
    examples: [{ id: 'basic', title: 'Basic' }],
    keyboard: [${q('TODO the keyboard model, or "Not interactive."')}],
    accessibility: [${q('TODO roles, names and announcements.')}],
    responsive: [${q('TODO what changes on a phone.')}],
    related: ['card'],
  },
`);

insertBefore('test/visual/fixtures-community.tsx', 'new:component inserts imports above this line', `import { ${Name} } from '@punji/ui';\n`);
insertBefore('test/visual/fixtures-community.tsx', 'new:component inserts fixtures above this line', `// TODO show every state side by side: default, long text, missing value, Devanagari digits.
function ${Name}Fixture() {
  return <div style={{ display: 'grid', gap: 12 }}><${Name}>NABIL</${Name}></div>;
}

`);
insertBefore('test/visual/fixtures-community.tsx', 'new:component inserts registry entries above this line', `  ${q(name)}: ${Name}Fixture,\n`);
insertBefore('test/visual/manifest.ts', 'new:component inserts fixtures above this line', `  { id: ${q(name)}, title: ${q(Name)}, pending: true },\n`);

create(`.changeset/${name}.md`, `---
'@punji/ui': minor
---

TODO describe ${Name} for the changelog: \`${Name}\` from \`@punji/ui/${name}\`, what it shows and why a finance app needs it.
`);

for (const [rel, content] of writes) {
  console.log(`${existsSync(join(root, rel)) ? 'update' : 'create'} ${rel}`);
  if (dryRun) continue;
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}
console.log(dryRun ? '\n(dry run: nothing written)' : `
${Name} scaffolded. Next:
  1. npm run build && npm test -- ${name} && npm run site:build
  2. Add '${name}' to the related list of one or two existing pages (check:seo fails on a page nothing links to).
  3. Replace every TODO: grep -rn TODO src/${name} src/styles/${name}.css test/${name}.test.tsx site/src/examples/${name} site/src/registry-community.ts test/visual/fixtures-community.tsx .changeset/${name}.md
See docs/CONTRIBUTING-COMPONENT.md.`);
