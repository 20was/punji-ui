// Prerender: write every route of the docs site to its own index.html (plus 404.html), the sitemap,
// robots.txt, llms.txt, llms-full.txt and a Cloudflare Pages _redirects file.
// Run after `vite build site` (the client, which provides the template) and
// `vite build site --ssr src/entry-server.tsx --outDir dist-server` (the renderer): `npm run site:build` does all three.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PAGES, GROUPS, pageBySlug } from '../site/src/registry.ts';
import {
  HOME_DESCRIPTION, NPM_URL, PACKAGE_NAME, PORTAL_RENAMES, PORTAL_TO_HOME, REPO, ROUTES, SITE_NAME,
  headExtraFor, headFor, normaliseBase, pagePath, sectionOf,
} from '../site/src/seo.ts';

const dist = resolve('site/dist');
const base = normaliseBase(process.env.BASE_PATH);
const siteUrl = (process.env.SITE_URL ?? 'https://design.punji.app').replace(/\/+$/, '');
const withBase = (path) => `${base.replace(/\/$/, '')}${path}`;
const absolute = (path) => `${siteUrl}${withBase(path)}`;

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonScript = (data) => JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function headHtml(head) {
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<meta name="robots" content="${head.robots}" />`,
    // The 404 page names no canonical URL and no og:url: it is noindex and has no address of its own.
    ...(head.canonical ? [`<link rel="canonical" href="${escapeHtml(head.canonical)}" />`] : []),
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${head.ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    ...(head.canonical ? [`<meta property="og:url" content="${escapeHtml(head.canonical)}" />`] : []),
    `<meta property="og:image" content="${escapeHtml(head.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Punji UI: finance-first React components" />`,
    `<meta property="og:locale" content="en" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(head.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(head.ogImage)}" />`,
  ];
  if (head.jsonLd.length) tags.push(`<script type="application/ld+json">${jsonScript(head.jsonLd.length === 1 ? head.jsonLd[0] : head.jsonLd)}</script>`);
  return tags.join('\n    ');
}

const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
if (!template.includes('<!--seo-head-->') || !template.includes('<!--app-->')) throw new Error('prerender: site/dist/index.html is not the template (run vite build site first)');
const serverEntry = resolve('site/dist-server/entry-server.js');
if (!existsSync(serverEntry)) throw new Error('prerender: site/dist-server/entry-server.js is missing (run the SSR build first)');
const { preload, render } = await import(pathToFileURL(serverEntry).href);

// Each route's own chunks (its view, page data and examples, plus what they import) are preloaded from its HTML,
// so the browser fetches them alongside the entry and main.tsx can hydrate without a second round trip.
// Vite's manifest maps the modules preload() reports ('src/examples/button/basic.tsx?raw') to built files.
const manifest = JSON.parse(readFileSync(resolve(dist, '.vite/manifest.json'), 'utf8'));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry && key.endsWith('index.html') && !key.includes('preview-frame'));
if (!entryKey) throw new Error('prerender: no index.html entry in site/dist/.vite/manifest.json');
const chunkClosure = (keys, into = new Set()) => {
  for (const key of keys) {
    const chunk = manifest[key];
    if (!chunk) throw new Error(`prerender: ${key} is not in the Vite manifest`);
    if (into.has(chunk.file)) continue;
    into.add(chunk.file);
    chunkClosure(chunk.imports ?? [], into);
  }
  return into;
};
const entryFiles = chunkClosure([entryKey]);
const preloadTags = (modules) =>
  [...chunkClosure(modules)].filter((file) => !entryFiles.has(file)).map((file) => `<link rel="modulepreload" crossorigin href="${withBase(`/${file}`)}" />`).join('\n    ');

const page = async (path, head) => {
  const modules = await preload(withBase(path));
  const tags = preloadTags(modules);
  const html = render(withBase(path));
  return template.replace('<!--seo-head-->', () => `${headHtml(head)}${tags ? `\n    ${tags}` : ''}`).replace('<!--app-->', () => html);
};
const write = (rel, content) => {
  const file = resolve(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// Pages. headExtraFor adds the group title (breadcrumb) and the date the page's sources last changed (dates.json).
const dates = JSON.parse(readFileSync(resolve('site/src/generated/dates.json'), 'utf8'));
const headOf = (route) => headFor(route, siteUrl, base, headExtraFor(route, dates));
for (const route of ROUTES) {
  const head = headOf(route);
  write(`${head.path.replace(/^\//, '')}index.html`, await page(head.path, head));
}
// 404: rendered for a path that matches nothing, so the client renders the same thing on hydration.
{
  const head = headFor({ kind: 'notfound' }, siteUrl, base);
  write('404.html', await page('/page-not-found/', head));
}

// sitemap.xml, with <lastmod> from git (the overview takes the newest page date). No changefreq or priority: Google
// ignores both.
const newest = Object.values(dates).toSorted().at(-1);
const entries = ROUTES.map((route) => [headOf(route).canonical, route.kind === 'page' ? dates[route.page.slug] : newest]);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(([u, d]) => `  <url><loc>${escapeHtml(u)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);

// robots.txt: robots.txt is only honoured at a host root, so under a subpath it is informational.
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}${withBase('/sitemap.xml')}\n`);

// llms.txt (short index) and llms-full.txt (the page text).
const version = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version;
const facts = [
  `- Package: ${PACKAGE_NAME} ${version} on npm (${NPM_URL}), published from CI with provenance. MIT licence.`,
  `- Install: \`npm install ${PACKAGE_NAME}\`. Peer dependencies: react@^19 and react-dom@^19. ESM only, TypeScript declarations included.`,
  `- Styles: import \`${PACKAGE_NAME}/styles.css\` once at the app root. Every module also has its own subpath (\`${PACKAGE_NAME}/stock-table\`) and stylesheet (\`${PACKAGE_NAME}/css/stock-table.css\`).`,
  '- Money is bigint minor units (paisa, cents) or exact decimal strings, never floating point; anything that divides takes an explicit rounding mode.',
  '- Nepal first, any currency: NPR, lakh and crore grouping, Devanagari digits, Bikram Sambat (BS) dates, the Nepal fiscal year and the NEPSE session calendar are built in; other currencies and locales are configuration.',
  `- Source: ${REPO}`,
];
const intro = `${HOME_DESCRIPTION}\n\n${facts.join('\n')}`;
const lines = [`# ${SITE_NAME}`, '', `> ${HOME_DESCRIPTION}`, '', ...facts, '', `- [Overview](${absolute('/')}): every page, by domain`, ''];
for (const group of GROUPS) {
  const pages = PAGES.filter((p) => p.group === group.id);
  if (!pages.length) continue;
  lines.push(`## ${group.title}`, '');
  for (const p of pages) lines.push(`- [${p.title}](${absolute(pagePath(p))}): ${p.description}`);
  lines.push('');
}
lines.push('## Optional', '', `- [Full text of every page](${siteUrl}${withBase('/llms-full.txt')})`, '');
write('llms.txt', lines.join('\n'));

const api = JSON.parse(readFileSync(resolve('site/src/generated/api.json'), 'utf8'));
const bullets = (items) => items.map((i) => `- ${i}`);
const full = [`# ${SITE_NAME}`, '', intro, ''];
for (const p of PAGES) {
  full.push(`## ${p.title}`, '', `URL: ${absolute(pagePath(p))}`, `Section: ${GROUPS.find((g) => g.id === p.group)?.title} (${sectionOf(p)})`, '', p.summary, '');
  if (p.guide) {
    for (const section of p.guide) {
      full.push(`### ${section.title}`, '', ...section.paragraphs.flatMap((t) => [t, '']), ...(section.points ? [...bullets(section.points), ''] : []));
      for (const code of section.code ?? []) full.push(`${code.label}:`, '', '```', (code.file ? readFileSync(resolve('site/src/guides', p.slug, `${code.file}.tsx`), 'utf8') : code.text).replace(/\n+$/, ''), '```', '');
    }
    full.push('');
    continue;
  }
  if (p.kind === 'showcase') full.push('A pattern to copy, not package API: a screen built only from @punji/ui exports plus its layout CSS.', '', '### Adapting it', '', ...bullets(p.use), '', '### What stays yours', '', ...bullets(p.avoid), '');
  else full.push('### When to use', '', ...bullets(p.use), '', '### When not to use', '', ...bullets(p.avoid), '');
  const names = [...new Set(p.api.map((a) => a.name))];
  if (names.length) {
    full.push('### API', '');
    for (const name of names) {
      const e = api[name];
      if (!e) continue;
      full.push(`#### ${name} (${e.kind}, from @punji/ui/${e.module})`, '');
      if (e.description) full.push(e.description, '');
      for (const row of e.props ?? []) full.push(`- ${row.name}${row.required ? ' (required)' : ''}: ${row.type}${row.description ? `. ${row.description}` : ''}${row.default ? ` Default: ${row.default}` : ''}`);
      if (e.props?.length) full.push('');
      if (e.signature) full.push('```ts', `${e.kind === 'constant' ? 'const' : 'function'} ${name}: ${e.signature}`, '```', '');
      if (e.definition) full.push('```ts', `type ${name} = ${e.definition}`, '```', '');
    }
  }
  for (const ex of p.examples) {
    const file = resolve('site/src/examples', p.slug, `${ex.id}.tsx`);
    full.push(`### Example: ${ex.title}`, '', ...(ex.note ? [ex.note, ''] : []), '```tsx', readFileSync(file, 'utf8').replace(/\n+$/, ''), '```', '');
    // Showcase patterns keep their layout CSS beside the screen.
    const css = resolve('site/src/examples', p.slug, `${ex.id}.css`);
    if (existsSync(css)) full.push(`Layout CSS (${ex.id}.css):`, '', '```css', readFileSync(css, 'utf8').replace(/\n+$/, ''), '```', '');
  }
  full.push('### Keyboard behaviour', '', ...bullets(p.keyboard), '', '### Accessibility', '', ...bullets(p.accessibility), '', '### Responsive behaviour', '', ...bullets(p.responsive), '');
  if (p.notes) full.push(`### ${p.notes.title}`, '', ...bullets(p.notes.points), '');
  full.push('');
}
write('llms-full.txt', full.join('\n'));

// _redirects (Cloudflare Pages / Netlify syntax): the old design.punji.app portal paths that moved.
// Hash links (#/slug) never reach a server, so those are redirected in the browser (site/src/main.tsx).
const redirects = ['# Generated by scripts/site-prerender.mjs: old design.punji.app portal paths that moved here.'];
for (const [from, slug] of Object.entries(PORTAL_RENAMES)) {
  const target = pageBySlug(slug);
  if (!target) throw new Error(`prerender: PORTAL_RENAMES points at unknown page ${slug}`);
  // A page that now exists at the old path wins: a redirect there would hide it.
  if (ROUTES.some((route) => route.kind === 'page' && pagePath(route.page) === `${from}/`)) throw new Error(`prerender: PORTAL_RENAMES redirects ${from}, which is now a page here; remove the redirect`);
  redirects.push(`${withBase(from)} ${withBase(pagePath(target))} 301`, `${withBase(from)}/ ${withBase(pagePath(target))} 301`);
}
for (const from of PORTAL_TO_HOME) redirects.push(`${withBase(from)} ${withBase('/')} 301`, `${withBase(from)}/ ${withBase('/')} 301`);
write('_redirects', `${redirects.join('\n')}\n`);

// GitHub Pages: serve files whose names start with an underscore.
write('.nojekyll', '');

console.log(`prerender: ${ROUTES.length} pages + 404.html, sitemap.xml, robots.txt, llms.txt, llms-full.txt, _redirects (base ${base}, ${siteUrl})`);
