// SEO check of the built docs site (npm run site:build first). Offline: reads site/dist.
// Fails when any route lacks a unique title, description (40-160 chars) or canonical, lacks Open Graph and
// Twitter tags, has more than one h1 or a skipped heading level, has a link with no name, when any internal
// link or asset does not exist in the build, when sitemap.xml and the routes disagree, when robots.txt or
// llms.txt do not point at real things, or when JSON-LD is not valid JSON with a @type.
// Also the JavaScript budget: the gzipped JS each route loads up front (its entry script and modulepreloads) must stay
// under JS_BUDGET, and every page must preload its own route chunks (so hydration never waits on a second request).
// Search guards (2026-11-01): titles 40 to 62 characters and descriptions 120 to 160; no stale pre-release copy
// ("not published yet", "after the first release") in the build or README.md; the overview's JSON-LD graph names the
// WebSite, the Organization and the SoftwareSourceCode with its npm and GitHub links; every page has a BreadcrumbList
// (home first, the page last, positions in order) and a visible breadcrumb; dateModified and sitemap <lastmod> are
// real dates; every <img> has alt text; every page is linked from another page's content, not only the sidebar;
// the 404 page is noindex with no canonical; and each page's HTML stays under HTML_BUDGET gzipped.
// Set the same SITE_URL and BASE_PATH that built the site (the defaults match the default build).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { PAGES } from '../site/src/registry.ts';
import { NPM_URL, REPO, ROUTES, TITLE_MAX, headExtraFor, headFor, normaliseBase, pagePath, PORTAL_RENAMES, PORTAL_TO_HOME } from '../site/src/seo.ts';

const dist = resolve('site/dist');
const base = normaliseBase(process.env.BASE_PATH);
const siteUrl = (process.env.SITE_URL ?? 'https://design.punji.app').replace(/\/+$/, '');
const failures = [];
const fail = (message) => failures.push(message);
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const read = (rel) => readFileSync(resolve(dist, rel), 'utf8');
const origin = `${siteUrl}${base.replace(/\/$/, '')}`;
const dates = existsSync(resolve('site/src/generated/dates.json')) ? JSON.parse(readFileSync(resolve('site/src/generated/dates.json'), 'utf8')) : {};
const expectedHead = (route) => headFor(route, siteUrl, base, headExtraFor(route, dates));

// Search-result lengths: Google shows about 60 characters of a title and 150 to 160 of a description.
const TITLE_MIN = 40;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;
// Copy from before 0.1.0 was published. @punji/ui is on npm; none of this may come back.
const STALE = /not (yet )?published (to|on) npm|not published yet|not yet published|not on npm|nothing is published (yet|to npm)|goes on npm|follow along on github|(after|until|from) the first release|\bpre-release\b|npm-not%20published/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const today = new Date().toISOString().slice(0, 10);
// Each page's HTML, gzipped. On 2026-11-01 pages were 12 to 22 kB (the overview the largest); the cap catches a page that
// inlines far too much (a huge data set in an example, a duplicated panel).
const HTML_BUDGET = 50_000;
const textOf = (html) => {
  let text = html;
  for (let prev; prev !== text;) { prev = text; text = text.replace(/<[^>]*>/g, ''); }
  return unescape(text).replace(/\s+/g, ' ').trim();
};

/** A URL path under the base, resolved to a file in dist (or null). */
function fileFor(pathname) {
  if (!pathname.startsWith(base)) return null;
  const rel = decodeURIComponent(pathname.slice(base.length));
  for (const candidate of [rel, `${rel.replace(/\/$/, '')}/index.html`, rel === '' ? 'index.html' : null]) {
    if (candidate === null) continue;
    const file = resolve(dist, candidate);
    if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

const attr = (tag, name) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
const metas = (html) => [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => m[0]);
const metaContent = (html, key, name) => {
  const tag = metas(html).find((m) => attr(m, key) === name);
  return tag === undefined ? undefined : unescape(attr(tag, 'content') ?? '');
};

const seen = { title: new Map(), description: new Map(), canonical: new Map() };
const unique = (kind, value, where) => {
  const other = seen[kind].get(value);
  if (other) fail(`${where}: ${kind} duplicates ${other}: ${value.slice(0, 70)}`);
  else seen[kind].set(value, where);
};

const targets = [...ROUTES.map((route) => ({ route, file: `${expectedHead(route).path.replace(/^\//, '')}index.html` })), { route: { kind: 'notfound' }, file: '404.html' }];
let links = 0;

// JavaScript budget (gzip, the entry script plus every modulepreload). The shell (React, header, sidebar, router) is
// about 85 kB; the rest is the route's own view, page data and examples. See site/README.md, "Loading".
const JS_BUDGET = 150_000;
const manifest = existsSync(resolve(dist, '.vite/manifest.json')) ? JSON.parse(read('.vite/manifest.json')) : null;
if (!manifest) fail('.vite/manifest.json: not built (vite build site with build.manifest)');
const gzipped = new Map();
const gzipSize = (file) => {
  if (!gzipped.has(file)) gzipped.set(file, gzipSync(readFileSync(file)).length);
  return gzipped.get(file);
};
const jsSizes = [];
const checkJs = (where, route, html) => {
  const urls = [...html.matchAll(/<script type="module"[^>]*\ssrc="([^"]+)"|<link rel="modulepreload"[^>]*\shref="([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  const files = urls.map((url) => fileFor(url)).filter(Boolean);
  const total = files.reduce((sum, file) => sum + gzipSize(file), 0);
  jsSizes.push([total, where]);
  if (total > JS_BUDGET) fail(`${where}: loads ${(total / 1000).toFixed(1)} kB of gzipped JavaScript up front; the budget is ${JS_BUDGET / 1000} kB (split what the page does not need at first)`);
  const own = route.kind === 'page' ? `src/generated/routes/${route.page.slug}.ts` : route.kind === 'home' ? 'src/app/Home.tsx' : null;
  const chunk = own && manifest?.[own]?.file;
  if (own && manifest && (!chunk || !urls.includes(`${base}${chunk}`))) fail(`${where}: does not preload its route chunk ${own} (hydration would wait for it)`);
};

function checkHomeLd(where, item) {
  const graph = item['@graph'];
  if (!Array.isArray(graph)) { fail(`${where}: overview JSON-LD should be an @graph`); return; }
  const byType = (type) => graph.find((node) => node['@type'] === type);
  for (const type of ['WebSite', 'Organization', 'SoftwareSourceCode']) if (!byType(type)) fail(`${where}: overview JSON-LD graph lacks ${type}`);
  const code = byType('SoftwareSourceCode');
  if (code && code.codeRepository !== REPO) fail(`${where}: SoftwareSourceCode.codeRepository should be ${REPO}`);
  if (code && !(code.sameAs ?? []).includes(NPM_URL)) fail(`${where}: SoftwareSourceCode.sameAs should include ${NPM_URL}`);
  const ids = new Set(graph.map((node) => node['@id']).filter(Boolean));
  for (const node of graph) for (const value of Object.values(node)) if (value && typeof value === 'object' && !Array.isArray(value) && value['@id'] && Object.keys(value).length === 1 && !ids.has(value['@id'])) fail(`${where}: JSON-LD reference ${value['@id']} has no node in the graph`);
}

function checkPageLd(where, item, expected, route) {
  if (item['@type'] !== 'TechArticle') fail(`${where}: page JSON-LD should be a TechArticle`);
  if (typeof item.headline !== 'string' || item.headline.length === 0 || item.headline.length > 110) fail(`${where}: TechArticle.headline must be 1 to 110 characters`);
  if (!ISO_DAY.test(item.dateModified ?? '') || item.dateModified > today) fail(`${where}: TechArticle.dateModified should be a past YYYY-MM-DD date, got ${item.dateModified}`);
  if (item.about?.codeRepository !== REPO) fail(`${where}: TechArticle.about.codeRepository should be ${REPO}`);
  const crumbs = item.breadcrumb;
  if (crumbs?.['@type'] !== 'BreadcrumbList' || !Array.isArray(crumbs.itemListElement) || crumbs.itemListElement.length < 2) { fail(`${where}: page JSON-LD needs a BreadcrumbList with at least two items`); return; }
  const list = crumbs.itemListElement;
  list.forEach((entry, i) => {
    if (entry['@type'] !== 'ListItem' || entry.position !== i + 1 || !entry.name) fail(`${where}: BreadcrumbList item ${i + 1} needs @type ListItem, position ${i + 1} and a name`);
    if (typeof entry.item !== 'string' || !entry.item.startsWith(origin)) fail(`${where}: BreadcrumbList item ${i + 1} needs an absolute URL on ${origin}`);
    else if (!fileFor(new URL(entry.item).pathname)) fail(`${where}: BreadcrumbList item ${entry.item} is not in the build`);
  });
  if (list[0].item !== `${origin}/`) fail(`${where}: the breadcrumb must start at the overview`);
  if (list.at(-1).item !== expected.canonical || list.at(-1).name !== route.page.title) fail(`${where}: the breadcrumb must end at this page (${expected.canonical})`);
}

for (const { route, file } of targets) {
  const where = file;
  if (!existsSync(resolve(dist, file))) { fail(`${where}: not built`); continue; }
  const html = read(file);
  const expected = expectedHead(route);
  const noindex = route.kind === 'notfound';
  checkJs(where, route, html);
  const htmlGzip = gzipSize(resolve(dist, file));
  if (htmlGzip > HTML_BUDGET) fail(`${where}: HTML is ${(htmlGzip / 1000).toFixed(1)} kB gzipped; the budget is ${HTML_BUDGET / 1000} kB`);
  const stale = STALE.exec(html);
  if (stale) fail(`${where}: stale pre-release copy "${stale[0]}" (@punji/ui is published on npm)`);

  if (!/<html lang="[a-z-]+"/.test(html)) fail(`${where}: <html> has no lang`);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  if (!title) fail(`${where}: no <title>`);
  else {
    if (unescape(title) !== expected.title) fail(`${where}: title "${unescape(title)}" is not "${expected.title}"`);
    unique('title', unescape(title), where);
    const length = unescape(title).length;
    if (!noindex && (length < TITLE_MIN || length > TITLE_MAX)) fail(`${where}: title is ${length} chars (want ${TITLE_MIN} to ${TITLE_MAX}; edit site/src/seo-titles.ts): ${unescape(title)}`);
  }
  const description = metaContent(html, 'name', 'description');
  if (!description) fail(`${where}: no meta description`);
  else {
    const [min, max] = noindex ? [40, DESCRIPTION_MAX] : [DESCRIPTION_MIN, DESCRIPTION_MAX];
    if (description.length < min || description.length > max) fail(`${where}: meta description is ${description.length} chars (want ${min} to ${max})`);
    unique('description', description, where);
  }
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  if (noindex) {
    if (canonical) fail(`${where}: the 404 page must not name a canonical URL (${canonical})`);
  } else if (!canonical) fail(`${where}: no canonical`);
  else {
    if (unescape(canonical) !== expected.canonical) fail(`${where}: canonical ${canonical} is not ${expected.canonical}`);
    unique('canonical', canonical, where);
  }
  const robots = metaContent(html, 'name', 'robots');
  if (robots !== expected.robots) fail(`${where}: robots is ${robots}, want ${expected.robots}`);
  for (const [key, name] of [['property', 'og:title'], ['property', 'og:description'], ...(noindex ? [] : [['property', 'og:url']]), ['property', 'og:image'], ['property', 'og:image:alt'], ['property', 'og:type'], ['name', 'twitter:card'], ['name', 'twitter:title'], ['name', 'twitter:description'], ['name', 'twitter:image'], ['name', 'viewport'], ['name', 'theme-color']]) {
    if (!metaContent(html, key, name)) fail(`${where}: missing ${name}`);
  }
  if (metaContent(html, 'property', 'og:title') !== expected.title) fail(`${where}: og:title differs from the title`);
  const ogImage = metaContent(html, 'property', 'og:image');
  if (ogImage?.startsWith(origin) && !fileFor(new URL(ogImage).pathname)) fail(`${where}: og:image ${ogImage} is not in the build`);

  // JSON-LD
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (route.kind !== 'notfound' && ld.length !== 1) fail(`${where}: want exactly one JSON-LD block, found ${ld.length}`);
  for (const [, body] of ld) {
    try {
      const data = JSON.parse(body);
      for (const item of Array.isArray(data) ? data : [data]) {
        if (item['@context'] !== 'https://schema.org' || !(item['@type'] || Array.isArray(item['@graph']))) fail(`${where}: JSON-LD needs @context schema.org and @type or @graph`);
        if (route.kind === 'home') checkHomeLd(where, item);
        if (route.kind === 'page') checkPageLd(where, item, expected, route);
      }
    } catch (error) {
      fail(`${where}: JSON-LD is not valid JSON (${error.message})`);
    }
  }

  // The content must be in the HTML without JavaScript.
  const body = /<div id="root">([\s\S]*)<\/div>\s*<\/body>/.exec(html)?.[1] ?? '';
  // A visible breadcrumb on every page, matching the JSON-LD trail.
  if (route.kind === 'page') {
    const crumbs = /<nav aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/.exec(body)?.[1];
    if (!crumbs) fail(`${where}: no visible breadcrumb (<nav aria-label="Breadcrumb">)`);
    else {
      // Linked crumbs only: a group with no section on the overview is a plain label, not a JSON-LD item.
      const names = [...crumbs.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].filter((m) => m[1].includes('<a ')).map((m) => textOf(m[1]));
      const trail = (expected.jsonLd[0]?.breadcrumb?.itemListElement?.map((i) => i.name) ?? []).slice(0, -1).join(' / ');
      if (names.join(' / ') !== trail) fail(`${where}: visible breadcrumb "${names.join(' / ')}" differs from the JSON-LD trail "${trail}"`);
    }
  }
  // Images need alt text (empty alt for decoration).
  for (const m of body.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fail(`${where}: <img> without alt (${m[0].slice(0, 80)})`);
  if (!body.includes('<h1')) fail(`${where}: no prerendered <h1> in #root`);
  if (route.kind === 'page' && route.page.api.length > 0 && !body.includes('<table') && route.page.kind === 'component') fail(`${where}: no props table in the prerendered HTML`);

  // Headings: exactly one h1, no skipped level.
  const headings = [...body.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  if (headings.filter((h) => h === 1).length !== 1) fail(`${where}: want one <h1>, found ${headings.filter((h) => h === 1).length}`);
  headings.reduce((prev, level) => {
    if (level > prev + 1) fail(`${where}: heading level jumps from h${prev} to h${level}`);
    return level;
  }, 0);

  // Links: a name for every link, and every internal link and asset exists.
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    let text = m[2];
    for (let prev; prev !== text;) { prev = text; text = text.replace(/<[^>]*>/g, ''); }
    text = text.trim();
    if (!text && !/aria-label="[^"]+"/.test(m[1])) fail(`${where}: a link has no text or aria-label (${m[1].slice(0, 60)})`);
    if (/^(here|click here|read more|more|link)$/i.test(text)) fail(`${where}: non-descriptive link text "${text}"`);
    if (/target="_blank"/.test(m[1]) && !/rel="[^"]*noopener/.test(m[1])) fail(`${where}: target=_blank link without rel=noopener`);
  }
  for (const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    const raw = unescape(m[1]);
    if (raw === '' || raw.startsWith('#') || /^(https?:|mailto:|data:)/.test(raw)) {
      if (raw.startsWith(origin)) { links += 1; if (!fileFor(new URL(raw).pathname)) fail(`${where}: absolute internal URL ${raw} is not in the build`); }
      continue;
    }
    links += 1;
    if (!raw.startsWith('/')) { fail(`${where}: relative link ${raw} (links must be absolute paths so every page resolves the same)`); continue; }
    if (!fileFor(raw.split(/[?#]/)[0])) fail(`${where}: internal link ${raw} does not exist in the build (404)`);
  }
}

// sitemap.xml and the routes must agree.
if (!existsSync(resolve(dist, 'sitemap.xml'))) fail('sitemap.xml: not built');
else {
  const sitemap = read('sitemap.xml');
  const listed = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => unescape(m[1]));
  const want = ROUTES.map((route) => expectedHead(route).canonical);
  for (const m of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const lastmod = /<lastmod>([^<]*)<\/lastmod>/.exec(m[1])?.[1];
    if (!lastmod || !ISO_DAY.test(lastmod) || lastmod > today) fail(`sitemap.xml: ${/<loc>([^<]*)/.exec(m[1])?.[1]} needs a past <lastmod> date (YYYY-MM-DD), got ${lastmod}`);
  }
  for (const url of want) if (!listed.includes(url)) fail(`sitemap.xml: missing ${url}`);
  for (const url of listed) if (!want.includes(url)) fail(`sitemap.xml: lists ${url} which is not a route`);
  if (new Set(listed).size !== listed.length) fail('sitemap.xml: duplicate URLs');
}
// robots.txt
if (!existsSync(resolve(dist, 'robots.txt'))) fail('robots.txt: not built');
else {
  const robots = read('robots.txt');
  if (!/^User-agent: \*/m.test(robots) || !/^Allow: \//m.test(robots) || /^Disallow: \S/m.test(robots)) fail('robots.txt: must allow everything');
  if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) fail(`robots.txt: must point at ${origin}/sitemap.xml`);
}
// llms.txt and llms-full.txt
if (!existsSync(resolve(dist, 'llms.txt')) || !existsSync(resolve(dist, 'llms-full.txt'))) fail('llms.txt / llms-full.txt: not built');
else {
  const llms = read('llms.txt');
  if (!llms.includes('npm install @punji/ui')) fail('llms.txt: must give the install command');
  const staleLlms = STALE.exec(llms) ?? STALE.exec(read('llms-full.txt'));
  if (staleLlms) fail(`llms.txt / llms-full.txt: stale pre-release copy "${staleLlms[0]}"`);
  for (const page of PAGES) if (!llms.includes(`${origin}${pagePath(page)}`)) fail(`llms.txt: missing ${page.slug}`);
  for (const m of llms.matchAll(/\]\((https?:[^)]+)\)/g)) if (m[1].startsWith(origin) && !fileFor(new URL(m[1]).pathname) && !existsSync(resolve(dist, new URL(m[1]).pathname.slice(base.length)))) fail(`llms.txt: ${m[1]} is not in the build`);
  const full = read('llms-full.txt');
  for (const page of PAGES) if (!full.includes(`## ${page.title}\n`) || !full.includes(`URL: ${origin}${pagePath(page)}`)) fail(`llms-full.txt: missing ${page.slug}`);
  if (!llms.includes(`${origin}/components.json`)) fail('llms.txt: does not link components.json');
}
// components.json: valid JSON, one entry per component or utility page, each with an import line for every export and its examples.
if (!existsSync(resolve(dist, 'components.json'))) fail('components.json: not built');
else {
  let componentManifest = null;
  try { componentManifest = JSON.parse(read('components.json')); } catch (error) { fail(`components.json: not valid JSON (${error.message})`); }
  if (componentManifest) {
    const bySlug = new Map((componentManifest.items ?? []).map((item) => [item.slug, item]));
    for (const page of PAGES.filter((p) => p.kind !== 'guide' && p.kind !== 'foundation')) {
      const item = bySlug.get(page.slug);
      if (!item) { fail(`components.json: missing ${page.slug}`); continue; }
      if (item.examples.length !== page.examples.length || item.examples.some((ex) => !ex.code)) fail(`components.json: ${page.slug} examples incomplete`);
      for (const e of item.exports) if (!/^import \{ (type )?\w+ \} from '@punji\/ui(\/[\w/-]+)?';$/.test(e.import)) fail(`components.json: ${page.slug} ${e.name} has a bad import line`);
    }
  }
}
for (const file of ['favicon.svg', 'og.png', '404.html']) if (!existsSync(resolve(dist, file))) fail(`${file}: not built`);

// _redirects: every target is a real page.
if (existsSync(resolve(dist, '_redirects'))) {
  for (const line of read('_redirects').split('\n').filter((l) => l && !l.startsWith('#'))) {
    const [from, to] = line.split(/\s+/);
    if (!from || !to || !fileFor(to)) fail(`_redirects: ${line} targets a path that is not in the build`);
  }
}
for (const [from, slug] of Object.entries(PORTAL_RENAMES)) if (!PAGES.some((p) => p.slug === slug)) fail(`PORTAL_RENAMES: ${from} targets unknown page ${slug}`);
if (PORTAL_TO_HOME.length === 0) fail('PORTAL_TO_HOME is empty');

// README.md is the npm and GitHub landing page: no pre-release copy there either.
{
  const readme = readFileSync(resolve('README.md'), 'utf8');
  const stale = STALE.exec(readme);
  if (stale) fail(`README.md: stale pre-release copy "${stale[0]}" (@punji/ui is published on npm)`);
}

// No orphans: every page is linked from another page's content (a related card, a guide link or a showcase's
// "Built from"), or, for showcase patterns and apps, from the overview. The sidebar alone does not count.
{
  const inbound = new Set(PAGES.filter((p) => p.kind === 'showcase' || p.kind === 'app').map((p) => p.slug));
  for (const p of PAGES) {
    for (const slug of p.related) if (slug !== p.slug) inbound.add(slug);
    for (const section of p.guide ?? []) for (const text of [...section.paragraphs, ...(section.points ?? [])]) for (const m of text.matchAll(/\]\(\/[a-z-]+\/([a-z0-9-]+)\/\)/g)) if (m[1] !== p.slug) inbound.add(m[1]);
  }
  inbound.add('using'); // the overview's "Get started" button
  for (const p of PAGES) if (!inbound.has(p.slug)) fail(`${p.slug}: no other page links to it in its content (add it to a related list)`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`\nseo check: ${failures.length} failure(s)`);
  process.exit(1);
}
const [largest, where] = jsSizes.toSorted((a, b) => b[0] - a[0])[0] ?? [0, ''];
console.log(`seo check: ${targets.length} pages (unique title ${TITLE_MIN}-${TITLE_MAX} chars, description ${DESCRIPTION_MIN}-${DESCRIPTION_MAX}, canonical; OG and Twitter; JSON-LD with BreadcrumbList and dateModified; visible breadcrumb; one h1, no skipped levels; img alt; no stale pre-release copy), ${links} internal links and assets resolve, no orphan pages, sitemap (with lastmod)/robots/llms agree with the ${ROUTES.length} routes`);
console.log(`js budget: every page under ${JS_BUDGET / 1000} kB gzip up front and preloads its route chunk; largest ${(largest / 1000).toFixed(1)} kB (${where})`);
