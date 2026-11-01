// Copy-in registry (shadcn-style): one site/dist/r/<name>.json per Showcase pattern, in the shadcn registry item
// schema, plus site/dist/r/registry.json (the index). `npx shadcn@latest add https://design.punji.app/r/<name>.json`
// then writes the pattern's screen, its layout CSS and only the sample data it uses into the app, and installs
// @punji/ui. Run by `npm run site:build` after the prerender; validated by scripts/check-registry.mjs (check:seo).
//
// What goes into an item, for site/src/examples/<slug>/screen.tsx:
//   components/punji/<slug>/<slug>.tsx      the screen, with 'use client' (Next.js) and a named default export
//   components/punji/<slug>/<slug>.css      its layout CSS (tokens only)
//   components/punji/<slug>/sample.ts       re-exports just the names the screen imports from site/src/sample.ts
//   components/punji/<slug>/data/<file>.ts  the fixture files those names live in (type imports point at @punji/ui)
// Relative imports lose their .ts extension so the files work with any bundler's resolution.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PAGES } from '../site/src/registry.ts';
import { PACKAGE_NAME, REPO, SITE_NAME, pagePath } from '../site/src/paths.ts';

export const ITEM_SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json';
export const REGISTRY_SCHEMA = 'https://ui.shadcn.com/schema/registry.json';
/** Where an item's files land in the app (shadcn `target`, relative to the project root). */
export const TARGET_DIR = 'components/punji';

const root = fileURLToPath(new URL('..', import.meta.url));
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const pascal = (slug) => slug.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const stripTs = (text) => text.replace(/(from\s+['"]\.{1,2}\/[^'"]+?)\.tsx?(['"])/g, '$1$2');

// Which fixture file exports each name (fixtures are one flat folder of plain `export const|function|type|interface`).
const fixturesDir = resolve(root, 'fixtures');
const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.ts'));
const exportedBy = new Map();
for (const file of fixtureFiles) {
  for (const m of readFileSync(resolve(fixturesDir, file), 'utf8').matchAll(/^export (?:declare )?(const|let|function|type|interface|class|enum) (\w+)/gm)) {
    exportedBy.set(m[2], { file, type: m[1] === 'type' || m[1] === 'interface' });
  }
}
/** A fixture file and the fixture files it imports, in dependency order. */
function fixtureClosure(file, into = new Set()) {
  if (into.has(file)) return into;
  for (const m of readFileSync(resolve(fixturesDir, file), 'utf8').matchAll(/from\s+'\.\/([\w-]+\.ts)'/g)) fixtureClosure(m[1], into);
  into.add(file);
  return into;
}
/** Fixture source as an app file: types come from the package, not from this repository's src/. */
const fixtureSource = (file) =>
  stripTs(readFileSync(resolve(fixturesDir, file), 'utf8').replace(/from\s+'\.\.\/src\/[^']+'/g, `from '${PACKAGE_NAME}'`));

const SAMPLE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*'\.\.\/\.\.\/sample\.ts';/;

/** The registry items, built from the registry and the example files (pure: reads files, writes nothing). */
export function buildRegistry(siteUrl = 'https://design.punji.app', base = '/') {
  const origin = `${siteUrl.replace(/\/+$/, '')}${base.replace(/\/$/, '')}`;
  const items = [];
  for (const page of PAGES.filter((p) => p.kind === 'showcase')) {
    const dir = resolve(root, 'site/src/examples', page.slug);
    const entry = page.examples[0];
    if (!entry) continue;
    const at = (name) => `${TARGET_DIR}/${page.slug}/${name}`;
    let screen = readFileSync(resolve(dir, `${entry.id}.tsx`), 'utf8');
    const files = [];
    const sample = SAMPLE_IMPORT.exec(screen);
    if (sample) {
      const names = sample[1].split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/^type\s+/, '').split(/\s+as\s+/)[0]);
      const byFile = new Map();
      for (const name of names) {
        const where = exportedBy.get(name);
        if (!where) throw new Error(`registry: ${page.slug} imports ${name} from sample.ts, which no fixtures/*.ts file exports`);
        byFile.set(where.file, [...(byFile.get(where.file) ?? []), where.type ? `type ${name}` : name]);
      }
      const data = new Set();
      for (const file of byFile.keys()) fixtureClosure(file, data);
      const lines = [`// Sample data for the ${page.title} pattern: synthetic, not market or account data. Replace it with yours.`];
      for (const [file, list] of byFile) lines.push(`export { ${list.join(', ')} } from './data/${basename(file, '.ts')}';`);
      files.push({ path: at('sample.ts'), type: 'registry:lib', target: at('sample.ts'), content: `${lines.join('\n')}\n` });
      for (const file of data) files.push({ path: at(`data/${file}`), type: 'registry:lib', target: at(`data/${file}`), content: fixtureSource(file) });
      screen = screen.replace(SAMPLE_IMPORT, (m) => m.replace("'../../sample.ts'", "'./sample'"));
    }
    if (/from\s+'\.\.\//.test(screen)) throw new Error(`registry: ${page.slug}/${entry.id}.tsx imports a parent folder other than sample.ts; the registry cannot carry it`);
    const cssFile = resolve(dir, `${entry.id}.css`);
    const hasCss = existsSync(cssFile);
    screen = stripTs(screen)
      .replace(`import './${entry.id}.css';`, hasCss ? `import './${page.slug}.css';` : '')
      .replace(/export default function Example\(/, `export default function ${pascal(page.slug)}(`);
    // Next.js App Router: the screens use state and handlers. Vite and other bundlers ignore the directive.
    if (!/^['"]use client['"]/.test(screen)) screen = `'use client';\n\n${screen}`;
    files.unshift({ path: at(`${page.slug}.tsx`), type: 'registry:component', target: at(`${page.slug}.tsx`), content: screen });
    if (hasCss) files.splice(1, 0, { path: at(`${page.slug}.css`), type: 'registry:file', target: at(`${page.slug}.css`), content: readFileSync(cssFile, 'utf8') });
    items.push({
      $schema: ITEM_SCHEMA,
      name: page.slug,
      type: 'registry:block',
      title: page.title,
      description: page.description,
      author: `${SITE_NAME} <${origin}/>`,
      dependencies: [`${PACKAGE_NAME}@^${version}`],
      files,
      categories: ['finance', 'showcase'],
      docs: `Import '${PACKAGE_NAME}/styles.css' once at your app root, then render <${pascal(page.slug)} /> from './${TARGET_DIR}/${page.slug}/${page.slug}'. Guide: ${origin}${pagePath(page)}`,
      meta: { source: `${REPO}/tree/main/site/src/examples/${page.slug}`, docs: `${origin}${pagePath(page)}`, markdown: `${origin}${pagePath(page)}index.md` },
    });
  }
  const index = {
    $schema: REGISTRY_SCHEMA,
    name: 'punji-ui',
    homepage: `${origin}/`,
    items: items.map(({ $schema: _schema, files, ...item }) => ({ ...item, files: files.map(({ content: _content, ...file }) => file) })),
  };
  return { items, index };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { normaliseBase } = await import('../site/src/paths.ts');
  const base = normaliseBase(process.env.BASE_PATH);
  const siteUrl = (process.env.SITE_URL ?? 'https://design.punji.app').replace(/\/+$/, '');
  const out = resolve(root, 'site/dist/r');
  if (!existsSync(resolve(root, 'site/dist/index.html'))) throw new Error('registry: site/dist is not built (run vite build site and the prerender first)');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const { items, index } = buildRegistry(siteUrl, base);
  for (const item of items) writeFileSync(resolve(out, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  writeFileSync(resolve(out, 'registry.json'), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`registry: ${items.length} items in site/dist/r (shadcn registry-item schema) and r/registry.json`);
}
