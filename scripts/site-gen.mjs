// Generates the documentation site's API data from the BUILT declarations
// (dist/**/*.d.ts, resolved through package.json "exports", the same files a
// consumer's compiler reads) using the TypeScript 7 compiler API. Props tables
// therefore cannot drift from the shipped types, and a page that registers an
// API entry the build does not export fails here, before any HTML is built.
//
// Also validates the page registry: unique slugs, every example file exists,
// every group is a known domain, every component/function page lists API.
import { API, SignatureKind, SymbolFlags, NodeBuilderFlags } from 'typescript/unstable/sync';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(root, 'site/src/generated/api.json');
const problems = [];

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const { PAGES, GROUPS, leadOf } = await import(resolve(root, 'site/src/registry.ts'));

// --- registry validation -------------------------------------------------
const slugs = new Set();
const groupIds = new Set(GROUPS.map((g) => g.id));
for (const page of PAGES) {
  if (slugs.has(page.slug)) problems.push(`registry: duplicate slug ${page.slug}`);
  slugs.add(page.slug);
  if (!groupIds.has(page.group)) problems.push(`registry: ${page.slug} has unknown group ${page.group}`);
  for (const ex of page.examples ?? []) {
    if (!existsSync(resolve(root, 'site/src/examples', page.slug, `${ex.id}.tsx`))) {
      problems.push(`registry: ${page.slug} example ${ex.id} has no file site/src/examples/${page.slug}/${ex.id}.tsx`);
    }
  }
  const lead = leadOf(page);
  if (lead.length > 140) problems.push(`registry: ${page.slug} lead is ${lead.length} characters; keep it to 140 (registry-leads.ts or the page's lead)`);
  if (typeof page.description !== 'string' || page.description.length < 40 || page.description.length > 160) problems.push(`registry: ${page.slug} needs a description of 40 to 160 characters (meta description), has ${page.description?.length ?? 0}`);
  for (const section of page.guide ?? []) for (const code of section.code ?? []) {
    if (!code.file === !code.text) problems.push(`registry: ${page.slug} guide ${section.id} code "${code.label}" needs exactly one of file or text`);
    if (code.file && !existsSync(resolve(root, 'site/src/guides', page.slug, `${code.file}.tsx`))) problems.push(`registry: ${page.slug} guide file ${code.file} is missing in site/src/guides/${page.slug}/`);
  }
  if (page.kind === 'guide' && !(page.guide?.length > 0)) problems.push(`registry: guide ${page.slug} has no sections`);
  if (page.kind !== 'foundation' && page.kind !== 'guide' && !(page.api?.length > 0)) problems.push(`registry: ${page.slug} registers no API entries`);
  for (const rel of page.related ?? []) if (!PAGES.some((p) => p.slug === rel)) problems.push(`registry: ${page.slug} relates to unknown page ${rel}`);
}
// Example files that no page registers would silently rot.
const exampleRoot = resolve(root, 'site/src/examples');
for (const slug of readdirSync(exampleRoot)) {
  const page = PAGES.find((p) => p.slug === slug);
  if (!page) { problems.push(`examples: directory ${slug} belongs to no page`); continue; }
  for (const file of readdirSync(resolve(exampleRoot, slug))) {
    if (!file.endsWith('.tsx')) continue;
    if (!(page.examples ?? []).some((e) => `${e.id}.tsx` === file)) problems.push(`examples: ${slug}/${file} is not registered on its page`);
  }
}

// Guide code files (typechecked, shown as text, never executed) must each be used by their guide.
const guideRoot = resolve(root, 'site/src/guides');
for (const slug of existsSync(guideRoot) ? readdirSync(guideRoot) : []) {
  const page = PAGES.find((p) => p.slug === slug);
  if (!page?.guide) { problems.push(`guides: directory ${slug} belongs to no guide page`); continue; }
  for (const file of readdirSync(resolve(guideRoot, slug))) {
    if (!(page.guide ?? []).some((section) => (section.code ?? []).some((c) => `${c.file}.tsx` === file))) problems.push(`guides: ${slug}/${file} is not used by its guide`);
  }
}

// --- API extraction ------------------------------------------------------
const targets = new Map(); // `${module}\0${name}` -> { module, name }
for (const page of PAGES) for (const entry of page.api ?? []) targets.set(`${entry.module}\0${entry.name}`, entry);

const typesFile = (module) => {
  const key = module === '' ? '.' : `./${module}`;
  const entry = pkg.exports[key];
  const types = entry && typeof entry === 'object' ? entry.types : undefined;
  return types ? resolve(root, types) : undefined;
};

const external = (sym) => sym.declarations.length > 0 && sym.declarations.every((d) => d.path.includes('/node_modules/'));
const api = new API({ cwd: root });
const apiData = {};
try {
  const snapshot = api.updateSnapshot({ openProjects: [resolve(root, 'site/tsconfig.api.json')] });
  const project = snapshot.getProjects()[0];
  if (!project) throw new Error('site/tsconfig.api.json did not open');
  const { program, checker } = project;
  const flags = NodeBuilderFlags.NoTruncation;
  const typeText = (type, extra = 0) => checker.typeToString(type, undefined, flags | extra);
  const rows = (type) => {
    // A union (e.g. text button | icon-only button) documents the union of its members' props.
    const members = type.isUnionType() ? type.getTypes() : [type];
    const merged = new Map();
    let inherited = 0;
    for (const member of members) {
      const parts = member.isIntersectionType() ? member.getTypes() : [member];
      const seen = new Set();
      for (const part of parts) {
        for (const sym of checker.getPropertiesOfType(part)) {
          if (seen.has(sym.name)) continue;
          seen.add(sym.name);
          if (external(sym)) { if (!merged.has(sym.name)) inherited += 1; continue; }
          const required = !(sym.flags & SymbolFlags.Optional);
          const prev = merged.get(sym.name);
          const text = sym.getDocumentationComment(checker).trim();
          const tags = sym.getJsDocTags(checker);
          const def = tags.find((t) => t.name === 'default')?.text;
          const shown = typeText(checker.getTypeOfSymbol(sym));
          const row = { name: sym.name, type: required ? shown : shown.replace(/ \| undefined$/, ''), required, description: text, ...(def ? { default: def } : {}) };
          if (!prev) merged.set(sym.name, row);
          else { prev.required = prev.required && required; if (!prev.description && text) prev.description = text; }
        }
      }
    }
    return { rows: [...merged.values()], inherited: inherited > 0 };
  };

  const rootFile = typesFile('');
  const rootSf = rootFile && program.getSourceFile(rootFile);
  const rootMod = rootSf && checker.getSymbolAtLocation(rootSf);
  if (!rootMod) throw new Error('root types (dist/index.d.ts) not in site/tsconfig.api.json');
  const rootNames = new Set(checker.getExportsOfModule(rootMod).map((s) => s.name));
  for (const group of GROUPS) for (const name of group.planned) if (!rootNames.has(name)) problems.push(`registry: planned ${name} (${group.id}) is not exported from @punji/ui`);
  for (const { name } of targets.values()) {
    if (!rootNames.has(name)) problems.push(`api: ${name} is not exported from the @punji/ui root, so the root import line would be wrong`);
  }

  for (const { module, name } of targets.values()) {
    const label = `${module === '' ? '@punji/ui' : `@punji/ui/${module}`}#${name}`;
    const file = typesFile(module);
    if (!file || !existsSync(file)) { problems.push(`api: ${label}: no types file in package.json exports (did you run npm run build?)`); continue; }
    const sf = program.getSourceFile(file);
    const mod = sf && checker.getSymbolAtLocation(sf);
    if (!mod) { problems.push(`api: ${label}: ${file} not in site/tsconfig.api.json`); continue; }
    const sym = checker.getExportsOfModule(mod).find((s) => s.name === name);
    if (!sym) { problems.push(`api: ${label}: not exported`); continue; }
    const target = sym.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
    const description = target.getDocumentationComment(checker).trim();
    const isValue = Boolean(target.flags & (SymbolFlags.Function | SymbolFlags.Variable));
    const entry = { name, module: module === '' ? '@punji/ui' : `@punji/ui/${module}`, description };
    const errors = [];
    if (isValue) {
      const type = checker.getTypeOfSymbol(target);
      const calls = checker.getSignaturesOfType(type, SignatureKind.Call);
      const first = calls[0];
      const paramType = first && first.parameters.length > 0 ? checker.getParameterType(first, 0) : undefined;
      const component = /^[A-Z]/.test(name) && calls.length > 0;
      if (component && paramType) {
        entry.kind = 'component';
        const props = rows(paramType);
        if (props.rows.length === 0) errors.push(`${label}: component has no props to document`);
        entry.props = props.rows;
        entry.inherited = props.inherited;
      } else if (calls.length > 0) {
        entry.kind = 'function';
        entry.signature = typeText(type);
      } else {
        entry.kind = 'constant';
        entry.signature = typeText(type);
      }
    } else {
      entry.kind = 'type';
      const declared = checker.getDeclaredTypeOfSymbol(target);
      const props = rows(declared);
      if (props.rows.length > 0) {
        entry.props = props.rows;
        entry.inherited = props.inherited;
      } else {
        // InTypeAlias stops the printer from naming the alias itself (`type X = X`): show what it resolves to.
        entry.definition = typeText(declared, NodeBuilderFlags.InTypeAlias);
      }
    }
    if (entry.definition === name) errors.push(`${label}: definition is the self-referential alias "type ${name} = ${name}"; the generator must show the resolved type`);
    for (const e of errors) problems.push(`api: ${e}`);
    apiData[name] = entry;
  }
} finally {
  api.close();
}

// Every registered API entry must have produced something.
for (const { name, module } of targets.values()) {
  if (!apiData[name]) problems.push(`api: ${module || '@punji/ui'}#${name} produced no entry`);
}

// --- bundle sizes ----------------------------------------------------------
// The size badges and the homepage numbers come from the repository's own size-limit budget (.size-limit.json),
// measured now against the built dist/, so they are the same gzip figures CI enforces. About two seconds.
const sizes = { modules: {}, everything: null, styles: null, button: null };
try {
  let raw;
  try {
    raw = execFileSync(resolve(root, 'node_modules/.bin/size-limit'), ['--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) {
    raw = error.stdout; // size-limit exits non-zero when a budget is exceeded but still prints the JSON
  }
  for (const entry of JSON.parse(raw)) {
    const sub = /import from '?@punji\/ui\/([^')\s]+)/.exec(entry.name)?.[1];
    if (sub && !(sub in sizes.modules)) sizes.modules[sub] = entry.size;
    if (entry.name.startsWith('Everything')) sizes.everything = entry.size;
    if (entry.name.startsWith('styles.css')) sizes.styles = entry.size;
    if (entry.name.startsWith('Button from root')) sizes.button = entry.size;
  }
} catch (error) {
  console.warn(`site-gen: size-limit did not run (${error.message.split('\n')[0]}); size badges are omitted`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(resolve(dirname(out), 'sizes.json'), `${JSON.stringify(sizes, null, 1)}\n`);

// Written even on failure so the editor has data while you fix the registry; the exit code still fails the build.
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(apiData, null, 1)}\n`);
if (problems.length) {
  console.error(`site-gen failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const undocumented = Object.values(apiData).flatMap((e) => (e.props ?? []).filter((p) => !p.description).map((p) => `${e.name}.${p.name}`));
// Ratchet: props that predate this check may lack a doc comment (listed in the baseline); a new one may not.
const baselinePath = resolve(root, 'site/undocumented-baseline.json');
if (process.env.SITE_UPDATE_BASELINE) writeFileSync(baselinePath, `${JSON.stringify(undocumented.toSorted(), null, 1)}\n`);
const baseline = new Set(existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : []);
const fresh = undocumented.filter((name) => !baseline.has(name));
console.log(`site-gen: ${Object.keys(apiData).length} API entries, ${PAGES.length} pages; ${undocumented.length} props without a doc comment (${baseline.size} baselined)`);
if (fresh.length) {
  console.error(`site-gen failed: registered props with no doc comment (add /** */ in src, or run SITE_UPDATE_BASELINE=1 only for a deliberate exception):\n  ${fresh.join('\n  ')}`);
  process.exit(1);
}
