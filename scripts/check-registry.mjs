// Check of the copy-in registry and the Markdown pages in site/dist (npm run site:build first; run by check:seo).
//   - every Showcase pattern has site/dist/r/<name>.json, and r/registry.json lists exactly those items;
//   - each item follows the shadcn registry item schema (required fields, name format, known types, file targets,
//     a non-empty content per file) and depends on @punji/ui;
//   - the files only import @punji/ui, react and each other (no path into this repository);
//   - the files typecheck as an app would see them: written to a temporary folder inside this package (so
//     `@punji/ui` resolves to the built dist/ through the export map) and compiled with strict TypeScript;
//   - every page has an index.md beside its index.html with its title and URL, and llms.txt links to them.
// Set the same SITE_URL and BASE_PATH that built the site.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES } from '../site/src/registry.ts';
import { normaliseBase, pagePath } from '../site/src/paths.ts';
import { ITEM_SCHEMA, REGISTRY_SCHEMA, TARGET_DIR } from './site-registry.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = resolve(root, 'site/dist');
const base = normaliseBase(process.env.BASE_PATH);
const siteUrl = (process.env.SITE_URL ?? 'https://design.punji.app').replace(/\/+$/, '');
const origin = `${siteUrl}${base.replace(/\/$/, '')}`;
const failures = [];
const fail = (message) => failures.push(message);
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${file.slice(root.length)}: not valid JSON (${error.message})`);
    return null;
  }
};

// The registry item schema (https://ui.shadcn.com/schema/registry-item.json), the parts the CLI relies on.
const ITEM_TYPES = new Set(['registry:lib', 'registry:block', 'registry:component', 'registry:ui', 'registry:hook', 'registry:page', 'registry:file', 'registry:theme', 'registry:style', 'registry:item', 'registry:example', 'registry:internal']);
const FILE_TYPES = new Set(['registry:lib', 'registry:block', 'registry:component', 'registry:ui', 'registry:hook', 'registry:page', 'registry:file', 'registry:theme', 'registry:style', 'registry:item', 'registry:example', 'registry:internal']);
const ALLOWED_KEYS = new Set(['$schema', 'extends', 'name', 'type', 'title', 'author', 'description', 'dependencies', 'devDependencies', 'registryDependencies', 'files', 'tailwind', 'cssVars', 'css', 'envVars', 'meta', 'docs', 'categories']);
const SHOWCASE = PAGES.filter((p) => (p.kind === 'showcase' && p.examples.length > 0) || p.kind === 'app');

function checkItem(item, where) {
  if (item.$schema !== ITEM_SCHEMA) fail(`${where}: $schema should be ${ITEM_SCHEMA}`);
  for (const key of Object.keys(item)) if (!ALLOWED_KEYS.has(key)) fail(`${where}: unknown key ${key}`);
  if (typeof item.name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(item.name)) fail(`${where}: name must be lower-case kebab-case`);
  if (!ITEM_TYPES.has(item.type)) fail(`${where}: unknown type ${item.type}`);
  for (const key of ['title', 'description']) if (typeof item[key] !== 'string' || !item[key]) fail(`${where}: ${key} must be a non-empty string`);
  if (!Array.isArray(item.dependencies) || !item.dependencies.some((d) => /^@punji\/ui(@.+)?$/.test(d))) fail(`${where}: dependencies must include @punji/ui`);
  if (!Array.isArray(item.files) || item.files.length === 0) { fail(`${where}: files must be a non-empty array`); return []; }
  const targets = new Set();
  for (const file of item.files) {
    if (typeof file.path !== 'string' || !file.path) fail(`${where}: a file has no path`);
    if (!FILE_TYPES.has(file.type)) fail(`${where}: ${file.path} has unknown type ${file.type}`);
    if (file.type === 'registry:file' || file.type === 'registry:page') if (!file.target) fail(`${where}: ${file.path} (${file.type}) needs a target`);
    if (typeof file.target !== 'string' || !file.target.startsWith(`${TARGET_DIR}/${item.name}/`)) fail(`${where}: ${file.path} target must be under ${TARGET_DIR}/${item.name}/`);
    if (/\.\.|^\//.test(file.target ?? '')) fail(`${where}: ${file.target} must be a relative path inside the app`);
    if (targets.has(file.target)) fail(`${where}: two files target ${file.target}`);
    targets.add(file.target);
    if (typeof file.content !== 'string' || !file.content.trim()) fail(`${where}: ${file.path} has no content`);
    for (const m of (file.content ?? '').matchAll(/(?:from\s+|import\s+|import\(\s*)'([^']+)'/g)) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        const resolved = resolve('/', dirname(file.target), spec);
        const ok = [...targets, ...item.files.map((f) => f.target)].some((t) => [`/${t}`, `/${t}`.replace(/\.(tsx?|css)$/, '')].includes(resolved));
        if (!ok) fail(`${where}: ${file.path} imports ${spec}, which is not a file of this item`);
      } else if (!/^(@punji\/ui(\/.*)?|react|react-dom(\/.*)?|react\/jsx-runtime)$/.test(spec)) fail(`${where}: ${file.path} imports ${spec}; items may import only @punji/ui, react and their own files`);
    }
  }
  return item.files;
}

const out = resolve(dist, 'r');
if (!existsSync(out)) fail('site/dist/r: not built (npm run site:build)');
else {
  const index = readJson(resolve(out, 'registry.json'));
  if (index) {
    if (index.$schema !== REGISTRY_SCHEMA) fail(`r/registry.json: $schema should be ${REGISTRY_SCHEMA}`);
    if (!index.name || !index.homepage) fail('r/registry.json: needs name and homepage');
    const listed = (index.items ?? []).map((i) => i.name).toSorted();
    const want = SHOWCASE.map((p) => p.slug).toSorted();
    if (listed.join() !== want.join()) fail(`r/registry.json: items ${listed.join(', ')} differ from the showcase patterns and apps ${want.join(', ')}`);
  }
  const files = readdirSync(out).filter((f) => f.endsWith('.json') && f !== 'registry.json');
  for (const page of SHOWCASE) if (!files.includes(`${page.slug}.json`)) fail(`r/${page.slug}.json: missing`);

  // Write every item into one temporary app inside the package and typecheck it.
  const tmp = resolve(root, 'site/.registry-check');
  rmSync(tmp, { recursive: true, force: true });
  let count = 0;
  for (const file of files) {
    const item = readJson(resolve(out, file));
    if (!item) continue;
    if (`${item.name}.json` !== file) fail(`r/${file}: name ${item.name} does not match the file name`);
    for (const f of checkItem(item, `r/${file}`)) {
      if (typeof f.target !== 'string' || typeof f.content !== 'string') continue;
      mkdirSync(dirname(resolve(tmp, f.target)), { recursive: true });
      writeFileSync(resolve(tmp, f.target), f.content);
    }
    count += 1;
  }
  if (count && !failures.length) {
    writeFileSync(resolve(tmp, 'css.d.ts'), "declare module '*.css';\n");
    writeFileSync(resolve(tmp, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'es2022', lib: ['es2023', 'dom', 'dom.iterable'], module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true, isolatedModules: true, types: [] },
      include: ['**/*.ts', '**/*.tsx'],
    }));
    try {
      execFileSync(resolve(root, 'node_modules/.bin/tsc'), ['-p', tmp], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    } catch (error) {
      fail(`registry items do not typecheck as app code (needs npm run build):\n${error.stdout ?? ''}${error.stderr ?? ''}`);
    }
  }
  if (!failures.length) rmSync(tmp, { recursive: true, force: true });
  else console.error(`(the items are in ${tmp} for inspection)`);
}

// Markdown beside every page, linked from llms.txt.
const llms = existsSync(resolve(dist, 'llms.txt')) ? readFileSync(resolve(dist, 'llms.txt'), 'utf8') : '';
for (const target of [{ path: '/', title: 'Punji UI' }, ...PAGES.map((p) => ({ path: pagePath(p), title: p.title, page: p }))]) {
  const file = resolve(dist, `${target.path.slice(1)}index.md`);
  if (!existsSync(file)) { fail(`${target.path}index.md: not built`); continue; }
  const md = readFileSync(file, 'utf8');
  if (!md.startsWith(`# ${target.title}`)) fail(`${target.path}index.md: should start with "# ${target.title}"`);
  if (target.page && !md.includes(`URL: ${origin}${target.path}`)) fail(`${target.path}index.md: should give the page URL`);
  if (target.page && target.page.examples.length && !md.includes('```tsx')) fail(`${target.path}index.md: has no example code`);
  if (target.page && !llms.includes(`(${origin}${target.path}index.md)`)) fail(`llms.txt: does not link ${target.path}index.md`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`\nregistry check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`registry check: ${SHOWCASE.length} shadcn registry items valid and typecheck against the built package; ${PAGES.length + 1} Markdown pages built and linked from llms.txt`);
