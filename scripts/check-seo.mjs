// SEO check of the built docs site (npm run site:build first). Offline: reads site/dist.
// Fails when any route lacks a unique title, description (40-160 chars) or canonical, lacks Open Graph and
// Twitter tags, has more than one h1 or a skipped heading level, has a link with no name, when any internal
// link or asset does not exist in the build, when sitemap.xml and the routes disagree, when robots.txt or
// llms.txt do not point at real things, or when JSON-LD is not valid JSON with a @type.
// Set the same SITE_URL and BASE_PATH that built the site (the defaults match the default build).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGES } from '../site/src/registry.ts';
import { ROUTES, headFor, normaliseBase, pagePath, PORTAL_RENAMES, PORTAL_TO_HOME } from '../site/src/seo.ts';

const dist = resolve('site/dist');
const base = normaliseBase(process.env.BASE_PATH);
const siteUrl = (process.env.SITE_URL ?? 'https://design.punji.app').replace(/\/+$/, '');
const failures = [];
const fail = (message) => failures.push(message);
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const read = (rel) => readFileSync(resolve(dist, rel), 'utf8');
const origin = `${siteUrl}${base.replace(/\/$/, '')}`;

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

const targets = [...ROUTES.map((route) => ({ route, file: `${headFor(route, siteUrl, base).path.replace(/^\//, '')}index.html` })), { route: { kind: 'notfound' }, file: '404.html' }];
let links = 0;
for (const { route, file } of targets) {
  const where = file;
  if (!existsSync(resolve(dist, file))) { fail(`${where}: not built`); continue; }
  const html = read(file);
  const expected = headFor(route, siteUrl, base);
  const noindex = route.kind === 'notfound';

  if (!/<html lang="[a-z-]+"/.test(html)) fail(`${where}: <html> has no lang`);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  if (!title) fail(`${where}: no <title>`);
  else {
    if (unescape(title) !== expected.title) fail(`${where}: title "${unescape(title)}" is not "${expected.title}"`);
    unique('title', unescape(title), where);
  }
  const description = metaContent(html, 'name', 'description');
  if (!description) fail(`${where}: no meta description`);
  else {
    if (description.length < 40 || description.length > 160) fail(`${where}: meta description is ${description.length} chars (want 40 to 160)`);
    unique('description', description, where);
  }
  const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  if (!canonical) fail(`${where}: no canonical`);
  else {
    if (!noindex && unescape(canonical) !== expected.canonical) fail(`${where}: canonical ${canonical} is not ${expected.canonical}`);
    if (!noindex) unique('canonical', canonical, where);
  }
  const robots = metaContent(html, 'name', 'robots');
  if (robots !== expected.robots) fail(`${where}: robots is ${robots}, want ${expected.robots}`);
  for (const [key, name] of [['property', 'og:title'], ['property', 'og:description'], ['property', 'og:url'], ['property', 'og:image'], ['property', 'og:type'], ['name', 'twitter:card'], ['name', 'twitter:title'], ['name', 'twitter:description'], ['name', 'twitter:image'], ['name', 'viewport'], ['name', 'theme-color']]) {
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
        if (item['@context'] !== 'https://schema.org' || !item['@type']) fail(`${where}: JSON-LD needs @context schema.org and @type`);
        if (route.kind === 'home' && item['@type'] !== 'SoftwareSourceCode') fail(`${where}: overview JSON-LD should be SoftwareSourceCode`);
        if (route.kind === 'page' && (item['@type'] !== 'TechArticle' || item.breadcrumb?.['@type'] !== 'BreadcrumbList')) fail(`${where}: page JSON-LD should be TechArticle with a BreadcrumbList`);
      }
    } catch (error) {
      fail(`${where}: JSON-LD is not valid JSON (${error.message})`);
    }
  }

  // The content must be in the HTML without JavaScript.
  const body = /<div id="root">([\s\S]*)<\/div>\s*<\/body>/.exec(html)?.[1] ?? '';
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
  const listed = [...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => unescape(m[1]));
  const want = ROUTES.map((route) => headFor(route, siteUrl, base).canonical);
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
  for (const page of PAGES) if (!llms.includes(`${origin}${pagePath(page)}`)) fail(`llms.txt: missing ${page.slug}`);
  for (const m of llms.matchAll(/\]\((https?:[^)]+)\)/g)) if (m[1].startsWith(origin) && !fileFor(new URL(m[1]).pathname) && !existsSync(resolve(dist, new URL(m[1]).pathname.slice(base.length)))) fail(`llms.txt: ${m[1]} is not in the build`);
  const full = read('llms-full.txt');
  for (const page of PAGES) if (!full.includes(`## ${page.title}\n`) || !full.includes(`URL: ${origin}${pagePath(page)}`)) fail(`llms-full.txt: missing ${page.slug}`);
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

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`\nseo check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`seo check: ${targets.length} pages (unique title, description, canonical; OG and Twitter; JSON-LD; one h1, no skipped levels), ${links} internal links and assets resolve, sitemap/robots/llms agree with the ${ROUTES.length} routes`);
