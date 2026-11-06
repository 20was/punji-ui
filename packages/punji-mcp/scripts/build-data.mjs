// Generates data/snapshot.json, the offline, version-pinned data the MCP server serves.
//
// Run from the repository root after `npm run build && npm run site:build`:
//   node packages/punji-mcp/scripts/build-data.mjs
//
// Sources, in order of preference:
//   1. site/dist/components.json, llms.txt and get-started/<slug>/index.md (the docs site's build outputs).
//   2. Fallback when site/dist is absent: the site registry (site/src/registry*.ts, read by Node's type stripping),
//      site/src/generated/api.json if `site:gen` has run (props tables), and the example/guide source files.
//      Without api.json the fallback has no props tables; the script says so.
// Always added from the registry: `uxOnly` (the "UI is not enforcement" flag). Always read from the repo: docs/*.md
// for the topic guides. The output is committed, so the server works offline and matches the @punji/ui version.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
// Options: --fallback ignores site/dist (reads the registry sources); --out <file> writes elsewhere.
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
const out = outArg >= 0 ? resolve(argv[outArg + 1]) : resolve(here, '../data/snapshot.json');
const dist = resolve(root, 'site/dist');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));

const { PAGES, GROUPS } = await import(pathToFileURL(resolve(root, 'site/src/registry.ts')).href);
const { pagePath } = await import(pathToFileURL(resolve(root, 'site/src/seo.ts')).href);
const SITE = 'https://design.punji.app';

const notes = [];
const fromDist = !argv.includes('--fallback') && existsSync(resolve(dist, 'components.json'));
let manifest;
let llms;

if (fromDist) {
  manifest = JSON.parse(read('site/dist/components.json'));
  llms = read('site/dist/llms.txt');
} else {
  notes.push('site/dist not found: built from the registry sources');
  const apiPath = resolve(root, 'site/src/generated/api.json');
  const api = existsSync(apiPath) ? JSON.parse(readFileSync(apiPath, 'utf8')) : {};
  if (!existsSync(apiPath)) notes.push('site/src/generated/api.json not found: no props tables');
  const items = PAGES.filter((p) => p.kind !== 'guide' && p.kind !== 'foundation').map((p) => ({
    slug: p.slug, title: p.title, kind: p.kind, group: p.group, url: `${SITE}${pagePath(p)}`,
    description: p.description, summary: p.summary, use: p.use, avoid: p.avoid,
    exports: [...new Set(p.api.map((a) => a.name))].flatMap((name) => {
      const e = api[name];
      if (!e) return [];
      return [{ name, kind: e.kind, module: e.module, import: `import { ${e.kind === 'type' ? `type ${name}` : name} } from '${e.module}';`, description: e.description, props: e.props, signature: e.signature }];
    }),
    examples: p.examples.map((ex) => ({ id: ex.id, title: ex.title, ...(ex.note ? { note: ex.note } : {}), code: read(`site/src/examples/${p.slug}/${ex.id}.tsx`) })),
    keyboard: p.keyboard, accessibility: p.accessibility, responsive: p.responsive, related: p.related,
    ...(p.notes ? { notes: p.notes } : {}),
  }));
  manifest = {
    conventions: [], groups: GROUPS.map((g) => ({ id: g.id, title: g.title })), items,
  };
  llms = [`# Punji UI`, '', ...GROUPS.flatMap((g) => [`## ${g.title}`, '', ...PAGES.filter((p) => p.group === g.id).map((p) => `- [${p.title}](${SITE}${pagePath(p)}index.md): ${p.description}`), ''])].join('\n');
}

const uxOnly = new Set(PAGES.filter((p) => p.uxOnly).map((p) => p.slug));
const UX_NOTE = 'UI is not enforcement. This component is a UX safeguard. It does not enforce anything. Authorisation, step-up authentication, limits, payee checks, session expiry and validation must be enforced on the server. Hidden or disabled controls are not access control.';
const items = manifest.items.map((i) => ({
  ...i,
  // The registry has no per-component stability field yet: everything is pre-1.0, and showcases/apps are patterns.
  stability: i.kind === 'showcase' || i.kind === 'app' ? 'pattern' : 'pre-1.0',
  ...(uxOnly.has(i.slug) ? { uxOnly: true, enforcementNote: UX_NOTE } : {}),
}));

// Props typed bigint, per exported component: what review_usage checks number-valued JSX props against.
const moneyProps = {};
for (const item of items) {
  for (const e of item.exports) {
    if (e.kind !== 'component' || !e.props) continue;
    const names = e.props.filter((p) => /\bbigint\b/.test(p.type) && !/\bnumber\b/.test(p.type) && !/[\]>]/.test(p.type.replace(/\|\s*(null|undefined)/g, ''))).map((p) => p.name);
    if (names.length) moneyProps[e.name] = names;
  }
}

// Topic guides: markdown from the docs site pages (if built) plus the repository docs.
const page = (slug, section = 'get-started') => {
  const p = resolve(dist, section, slug, 'index.md');
  if (fromDist && existsSync(p)) return readFileSync(p, 'utf8');
  // Fallback: the guide or foundation page rebuilt from the registry (prose and code, no props tables).
  const def = PAGES.find((x) => x.slug === slug && (x.kind === 'guide' || x.kind === 'foundation'));
  if (!def) return null;
  const md = [`# ${def.title}`, '', def.summary ?? def.description, ''];
  for (const sec of def.guide ?? []) {
    md.push(`## ${sec.title}`, '', ...sec.paragraphs.flatMap((t) => [t, '']), ...(sec.points ?? []).map((x) => `- ${x}`), '');
    for (const c of sec.code ?? []) {
      const code = c.file ? readFileSync(resolve(root, 'site/src/guides', def.slug, `${c.file}.tsx`), 'utf8') : c.text;
      md.push(`${c.label}:`, '', '```', code.replace(/\n+$/, ''), '```', '');
    }
  }
  return md.join('\n');
};
const doc = (file) => read(file).replace(/^<!--.*-->\n+/, '');
const join = (...parts) => parts.filter(Boolean).join('\n\n---\n\n');
const conventions = manifest.conventions?.length ? `# Conventions\n\n${manifest.conventions.map((c) => `- ${c}`).join('\n')}` : null;
const pageMd = (slug) => {
  const i = items.find((x) => x.slug === slug);
  if (!i) return null;
  const p = resolve(dist, 'components', slug, 'index.md');
  return fromDist && existsSync(p) ? readFileSync(p, 'utf8') : null;
};
const guides = {
  'money-rules': join(
    conventions,
    '# Money rules\n\nAmounts are `bigint` minor units (paisa, cents) or exact decimal strings. Never pass a JavaScript `number` or a float to a money prop, never round-trip money through `Number`, `parseFloat` or `toFixed`. Anything that divides takes an explicit rounding mode. `JSON.stringify` cannot serialise a `bigint`: send minor units as decimal strings and call `BigInt()` on the client.\n\n```tsx\n<MoneyDisplay value={12550n} />          // 125.50 in a 2-decimal currency\n<MoneyDisplay value="125.50" />          // exact decimal string is fine\n<MoneyDisplay value={125.5} />           // wrong: a float\n```',
    doc('docs/GLOBAL-MONEY.md'),
    pageMd('money-display'),
  ),
  theming: join(page('theming'), doc('docs/THEMING.md')),
  tokens: join(doc('docs/tokens.md'), page('colour-tokens', 'foundations'), page('spacing', 'foundations'), page('typography', 'foundations')),
  router: join(page('router')),
  tables: join(doc('docs/TABLES.md'), pageMd('data-table'), pageMd('stock-table')),
  charts: join(doc('docs/CHARTS.md')),
  security: join(page('security'), doc('SECURITY.md'), doc('docs/TRUST.md')),
  versioning: join(`# Versioning\n\nThis snapshot documents ${pkg.name} ${pkg.version}. The server data is generated from the repository and pinned to that version; reinstall or update punji-mcp to follow a newer release.`, read('RELEASE.md').split('## Versioning policy (pre-1.0)')[1]?.split('## Pre-release checklist')[0]?.replace(/^/, '## Versioning policy (pre-1.0)\n') ?? '', 'Components are listed as `pre-1.0`: the API can change in a minor release until 1.0. Pin an exact @punji/ui version.'),
};
for (const [topic, md] of Object.entries(guides)) if (!md) throw new Error(`build-data: guide "${topic}" is empty (build the site first: npm run build && npm run site:build)`);

const snapshot = {
  package: pkg.name,
  version: pkg.version,
  site: SITE,
  source: fromDist ? 'site/dist (components.json, llms.txt, index.md)' : 'site registry sources',
  notes,
  conventions: manifest.conventions ?? [],
  groups: manifest.groups,
  llms,
  moneyProps,
  guides,
  items,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot)}\n`);
console.log(`punji-mcp data: ${items.length} items, ${Object.keys(moneyProps).length} components with money props, ${Object.keys(guides).length} guides, @punji/ui ${pkg.version} (${snapshot.source})${notes.length ? `; ${notes.join('; ')}` : ''}`);
