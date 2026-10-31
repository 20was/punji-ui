// Browser verification of the built documentation site (npm run site:build first).
// Every page at 390 and 1440 px, light and dark: screenshot (test-results/site/, ignored),
// in-browser axe, no horizontal overflow, no console errors; EVERY example variant of every page
// (switched through the variant chips), not only the first; and every page tab (Code, API, Usage)
// opened and audited, since only one tab shows at a time. Then behaviour: the copy button puts the
// exact example source on the clipboard, the theme switch forces and persists a theme, the Command-K
// search finds and opens pages, sidebar groups collapse and persist, the mobile drawer opens and
// navigates, tabs deep-link, path routing, the hash redirect, the 404 page and the no-JS render.
import { chromium } from 'playwright';
import { preview } from 'vite';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGES, GROUPS } from '../site/src/registry.ts';
import { normaliseBase, pagePath } from '../site/src/seo.ts';

const out = resolve('test-results/site');
mkdirSync(out, { recursive: true });
const server = process.env.CHECK_URL ? null : await preview({ root: 'site', preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
// BASE_PATH must match the build (default '/'). CHECK_URL tests an already running server instead of vite preview.
const basePath = normaliseBase(process.env.BASE_PATH).replace(/\/$/, '');
const base = `${process.env.CHECK_URL ?? 'http://127.0.0.1:4174'}${basePath}`;
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const failures = [];
const checked = { variants: 0, tabs: 0 };
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
const routes = [{ slug: '', title: 'Overview', path: '/' }, ...PAGES.map((p) => ({ ...p, path: pagePath(p) }))];
const HOME_H1 = 'React components for money, markets and ledgers.';
const flagCounts = { edge: 0, clip: 0, dup: 0, icon: 0, edgeAllowed: 0 };

// Layout defects a plain axe/overflow pass misses, probed inside every example preview (the stage).
//  edge  content within EDGE px of the stage's border box, or past it: missing padding, content flush to the frame.
//  clip  content cut off by an overflow:hidden ancestor (the stage, its frame, or a clipping box inside it).
//  dup   the same caption or note text twice in one example.
//  icon  an inline link whose icon sits alone on its own line.
// `edge` is allowlisted per page slug (and optional example id) with a reason; `clip`, `dup` and `icon` always fail.
const EDGE = 8;
const EDGE_ALLOW = {
  // 'slug' or 'slug/example': 'why the component is intentionally edge to edge',
  'app-shell': 'the skip link is position: fixed and parked above the viewport until it takes focus',
};
/* oxlint-disable unicorn/consistent-function-scoping, no-shadow -- the probe is serialised into the page, so it must be self-contained. */
const layoutProbe = ({ edge }) => {
  const stage = document.querySelector('[data-testid=preview]');
  if (!stage) return [];
  const out = [];
  const box = stage.getBoundingClientRect();
  // Not drawn: display none, a closed <details> body, a visually hidden (1px) box such as a stacked table's head.
  const visible = (el) => {
    const c = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (c.display === 'none' || c.visibility === 'hidden' || r.width <= 1 || r.height <= 1 || el.closest('.kit-sr')) return false;
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) if (!d.open && !el.closest('summary')) return false;
    return true;
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''}`;
  const clipsInside = (el) => { for (let a = el.parentElement; a && a !== stage; a = a.parentElement) { const c = getComputedStyle(a); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') return true; } return false; };
  // (a) edge
  const seen = new Set();
  for (const el of stage.querySelectorAll('*')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    if (!visible(el) || clipsInside(el)) continue;
    const r = el.getBoundingClientRect();
    const sides = [];
    if (r.left < box.left + edge) sides.push('left');
    if (r.right > box.right - edge) sides.push('right');
    if (r.top < box.top + edge) sides.push('top');
    if (r.bottom > box.bottom - edge) sides.push('bottom');
    if (sides.length) { const key = `${describe(el)}:${sides.join('+')}`; if (!seen.has(key)) { seen.add(key); out.push({ kind: 'edge', text: `${describe(el)} is within ${edge}px of the stage edge (${sides.join(', ')})` }); } }
  }
  // (b) clip
  const hides = (v) => v === 'hidden' || v === 'clip';
  const clippers = [...stage.querySelectorAll('*')].filter((el) => { const c = getComputedStyle(el); return (hides(c.overflowX) || hides(c.overflowY)) && c.textOverflow !== 'ellipsis' && visible(el); });
  for (let a = stage.parentElement; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (hides(c.overflowX) || hides(c.overflowY)) clippers.push(a); }
  for (const el of clippers) {
    const c = getComputedStyle(el);
    const w = el.scrollWidth - el.clientWidth; const h = el.scrollHeight - el.clientHeight;
    if ((w > 1 && hides(c.overflowX)) || (h > 1 && hides(c.overflowY))) out.push({ kind: 'clip', text: `${describe(el)} clips content (scroll ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight})` });
  }
  if (stage.scrollHeight - stage.clientHeight > 1 && !['auto', 'scroll', 'visible'].includes(getComputedStyle(stage).overflowY)) out.push({ kind: 'clip', text: 'the preview stage clips content vertically' });
  // (c) duplicated caption or note text
  const texts = new Map();
  for (const el of stage.querySelectorAll('figcaption, caption, small, [class*=note], [class*=caption]')) {
    if (!visible(el) || el.querySelector('p, figcaption, caption')) continue;
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t.length < 16) continue;
    texts.set(t, (texts.get(t) ?? 0) + 1);
  }
  for (const [t, n] of texts) if (n > 1) out.push({ kind: 'dup', text: `caption/note text appears ${n} times: "${t.slice(0, 60)}"` });
  // (d) inline link whose icon wraps alone
  const range = document.createRange();
  for (const a of stage.querySelectorAll('a')) {
    if (!visible(a)) continue;
    const icon = [...a.querySelectorAll('svg, [aria-hidden=true]')].at(-1);
    if (icon && icon.getBoundingClientRect().width > 0) {
      const iconBox = icon.getBoundingClientRect();
      let bottom = -Infinity;
      const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (icon.contains(n) || !n.textContent.trim()) continue; range.selectNodeContents(n); for (const r of range.getClientRects()) bottom = Math.max(bottom, r.bottom); }
      if (bottom > -Infinity && iconBox.top >= bottom - 1) out.push({ kind: 'icon', text: `link "${a.textContent.trim().slice(0, 40)}" has its icon alone on a line` });
    }
    const content = a.textContent ?? '';
    const last = content.trimEnd().at(-1);
    if (last && '↗→↘↖'.includes(last)) {
      const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
      let node = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.textContent.trim()) node = n;
      if (node) {
        const idx = node.textContent.trimEnd().length - 1;
        range.setStart(node, idx); range.setEnd(node, idx + 1);
        const glyph = range.getBoundingClientRect();
        let bottom = -Infinity;
        for (const child of a.childNodes) {
          if (child === node) { range.setStart(node, 0); range.setEnd(node, idx); } else range.selectNodeContents(child);
          for (const r of range.getClientRects()) if (r.width > 0) bottom = Math.max(bottom, r.bottom);
        }
        if (bottom > -Infinity && glyph.top >= bottom - 1) out.push({ kind: 'icon', text: `link "${content.trim().slice(0, 40)}" has its arrow alone on a line` });
      }
    }
  }
  return out;
};


try {
  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript((t) => localStorage.setItem('punji-docs-theme', JSON.stringify(t)), theme);
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(`${base}${route.path}`);
        await page.locator('#page-title').waitFor();
        if ((await page.locator('html').getAttribute('data-theme')) !== theme) fail(`${route.slug || 'home'} ${width} ${theme}: data-theme not applied`);
        const label = `${route.slug || 'home'}-${width}-${theme}`;
        await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
        await page.addScriptTag({ content: axeSource });
        const audit = async (name, scope) => {
          // From the top: an element scrolled under the sticky header or tab bar would read as low contrast to axe.
          await page.evaluate(() => window.scrollTo(0, 0));
          const violations = await page.evaluate(async (selector) => (await globalThis.axe.run(selector ? document.querySelector(selector) : document)).violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`), scope);
          for (const v of violations) fail(`${name}: axe ${v}`);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          if (overflow > 0) fail(`${name}: horizontal overflow by ${overflow}px`);
          // The preview may scroll inside itself, but its content must not be wider than the page it sits on.
          const clipped = await page.evaluate(() => { const box = document.querySelector('[data-testid=preview]'); return box ? box.scrollWidth - box.clientWidth : 0; });
          if (clipped > 1) fail(`${name}: the preview scrolls sideways by ${clipped}px`);
          const exampleId = name.includes('[') ? name.slice(name.indexOf('[') + 1, -1) : route.examples?.[0]?.id;
          for (const flag of await page.evaluate(layoutProbe, { edge: EDGE })) {
            if (flag.kind === 'edge' && (EDGE_ALLOW[route.slug] || EDGE_ALLOW[`${route.slug}/${exampleId}`])) { flagCounts.edgeAllowed += 1; continue; }
            flagCounts[flag.kind] += 1;
            fail(`${name}: layout ${flag.kind}: ${flag.text}`);
          }
          for (const e of errors.splice(0)) fail(`${name}: console/page error ${e}`);
        };
        // The first variant gets the whole page; every other variant is audited in the preview it changes (the page chrome is the same).
        await audit(label, null);
        const variants = 'examples' in route ? route.examples : [];
        for (const variant of variants.slice(1)) {
          await page.getByRole('group', { name: `${route.title} variants` }).getByRole('button', { name: variant.title, exact: true }).click();
          await page.getByLabel(`${variant.title} example code`, { exact: true }).waitFor();
          checked.variants += 1;
          await audit(`${label} [${variant.id}]`, '[data-testid=preview]');
        }
        checked.variants += variants.length ? 1 : 0;
        // The other tabs: each is shown (the tab link switches the view) and audited as a whole page.
        for (const tab of ['code', 'api', 'usage']) {
          const link = page.getByTestId(`tab-${tab}`);
          if (!(await link.count())) continue;
          await link.click();
          await page.locator(`#${tab}[data-tab]`).waitFor({ state: 'visible' });
          checked.tabs += 1;
          await audit(`${label} {${tab}}`, null);
        }
        await page.close();
      }
      await context.close();
    }
  }

  // Behaviour: desktop.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await desktop.newPage();
  await page.goto(`${base}/components/money-display/`);
  await page.locator('#page-title').waitFor();

  // Copy: the clipboard holds the exact file that renders the preview.
  await page.getByTestId('preview').waitFor();
  await page.locator('.doc-demo-codebar').getByTestId('copy-code').click();
  await page.getByText('Copied', { exact: true }).first().waitFor();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const onDisk = readFileSync('site/src/examples/money-display/currencies.tsx', 'utf8').replace(/\n+$/, '');
  if (clipboard !== onDisk) fail('copy: clipboard text differs from site/src/examples/money-display/currencies.tsx');

  // Variant switch changes preview and code together.
  await page.getByRole('group', { name: 'MoneyDisplay variants' }).getByRole('button', { name: 'Nepal', exact: true }).click();
  await page.getByLabel('Nepal example code', { exact: true }).waitFor();
  if (!(await page.getByTestId('preview').textContent())?.includes('12,34,567.89')) fail('variant: Nepal preview did not render lakh grouping');

  // Per-example preview theme: forces a theme on the stage only.
  await page.getByRole('group', { name: 'Preview theme', exact: true }).getByRole('button', { name: 'Dark preview' }).click();
  if ((await page.locator('.doc-stage').getAttribute('data-theme')) !== 'dark') fail('preview theme: Dark preview did not set data-theme on the stage');
  if ((await page.locator('html').getAttribute('data-theme')) === 'dark') fail('preview theme: the page theme changed too');

  // Tabs: the API tab shows the props table and records #api; a deep link opens its tab on load.
  await page.getByTestId('tab-api').click();
  await page.getByRole('region', { name: 'MoneyDisplay props' }).waitFor({ state: 'visible' });
  if (new URL(page.url()).hash !== '#api') fail(`tabs: API tab left the hash at "${new URL(page.url()).hash}"`);
  if (await page.getByTestId('preview').isVisible()) fail('tabs: the Examples panel is still visible on the API tab');
  await page.goto(`${base}/components/money-display/#keyboard`);
  await page.getByRole('heading', { level: 3, name: 'Keyboard' }).waitFor({ state: 'visible' });
  if ((await page.getByTestId('tab-usage').getAttribute('aria-current')) !== 'true') fail('tabs: #keyboard did not open the Usage tab');
  await page.goto(`${base}/components/money-display/`);
  await page.locator('#page-title').waitFor();

  // Theme switch: forces, and persists across reload.
  await page.getByRole('group', { name: 'Theme', exact: true }).getByRole('button', { name: 'Dark' }).click();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') fail('theme: Dark did not set data-theme');
  await page.reload();
  await page.locator('#page-title').waitFor();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') fail('theme: dark did not persist across reload');
  await page.getByRole('group', { name: 'Theme', exact: true }).getByRole('button', { name: 'Light' }).click();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'light') fail('theme: Light did not set data-theme');

  // Search: Command-K opens the package's CommandPalette; it ranks pages, opens one with Enter and says when nothing matches.
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog', { name: 'Search the documentation' });
  await dialog.waitFor();
  await dialog.getByRole('combobox').fill('order book');
  if (!(await dialog.getByRole('option').first().textContent())?.includes('Order book')) fail(`search: "order book" first result is "${await dialog.getByRole('option').first().textContent()}"`);
  await dialog.getByRole('combobox').fill('OrderBookDepth');
  if (!(await dialog.getByRole('option').first().textContent())?.includes('Order book')) fail('search: an export name did not find its page');
  await dialog.getByRole('combobox').fill('zzzz');
  await dialog.getByText('Nothing matches').waitFor();
  await dialog.getByRole('combobox').fill('ledger table');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { level: 1, name: 'LedgerTable' }).waitFor();
  if (await dialog.count()) fail('search: the dialog stayed open after opening a page');
  await page.getByTestId('search').click();
  await dialog.waitFor();
  await page.keyboard.press('Escape');
  if (await dialog.count()) fail('search: Esc did not close the dialog');

  // Sidebar lists exactly the registry's groups, in order, with planned counts; a collapsed group stays collapsed.
  const titles = await page.locator('.doc-aside .doc-nav-title').allTextContents();
  if (JSON.stringify(titles) !== JSON.stringify(GROUPS.map((g) => g.title))) fail(`sidebar: group order ${titles.join(' | ')}`);
  const forms = page.locator('.doc-aside .doc-nav-title', { hasText: 'Forms' });
  await forms.click();
  if ((await forms.getAttribute('aria-expanded')) !== 'false') fail('sidebar: Forms did not collapse');
  await page.reload();
  await page.locator('#page-title').waitFor();
  await page.waitForTimeout(100);
  if ((await forms.getAttribute('aria-expanded')) !== 'false') fail('sidebar: the collapsed Forms group did not persist across reload');
  await forms.click();
  if (!(await page.locator('.doc-aside').getByRole('link', { name: 'Button', exact: true }).isVisible())) fail('sidebar: Forms did not expand again');
  await desktop.close();

  // Behaviour: mobile drawer.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const m = await mobile.newPage();
  await m.goto(`${base}/`);
  await m.getByTestId('menu').click();
  await m.getByRole('dialog', { name: 'Documentation pages' }).waitFor();
  await m.getByRole('dialog').getByRole('link', { name: 'Button', exact: true }).click();
  await m.getByRole('heading', { level: 1, name: 'Button' }).waitFor();
  if (await m.getByRole('dialog').count()) fail('drawer: still open after navigating');
  await m.screenshot({ path: `${out}/mobile-after-drawer.png` });
  if (new URL(m.url()).pathname !== `${basePath}/components/button/`) fail(`drawer: navigating to Button left the URL at ${m.url()}`);
  await mobile.close();

  // Path routing: a link click uses the History API (no reload), updates URL, title, canonical and heading; back and forward work.
  const navCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const n = await navCtx.newPage();
  const navErrors = [];
  n.on('pageerror', (e) => navErrors.push(e.message));
  n.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') navErrors.push(msg.text()); });
  await n.goto(`${base}/`);
  await n.locator('#page-title').waitFor();
  await n.evaluate(() => { window.noReload = true; });
  // Home to a page through a domain card, then the sidebar (hidden on the home page) to another.
  await n.getByRole('link', { name: 'Financial primitives', exact: true }).click();
  await n.getByRole('heading', { level: 1, name: 'MoneyDisplay' }).waitFor();
  await n.locator('.doc-aside').getByRole('list', { name: 'Pages by domain' }).getByRole('link', { name: 'Order book', exact: true }).click();
  await n.getByRole('heading', { level: 1, name: 'Order book' }).waitFor();
  if (new URL(n.url()).pathname !== `${basePath}/components/order-book/`) fail(`routing: link click went to ${n.url()}`);
  if (!(await n.evaluate(() => window.noReload))) fail('routing: a link click reloaded the page');
  if ((await n.title()) !== 'Order book — Punji UI') fail(`routing: title after navigation is "${await n.title()}"`);
  if (!(await n.locator('link[rel=canonical]').getAttribute('href'))?.endsWith('/components/order-book/')) fail('routing: canonical not updated after navigation');
  if (!(await n.locator('meta[name=description]').getAttribute('content'))?.startsWith('OrderBookDepth')) fail('routing: meta description not updated after navigation');
  await n.goBack();
  await n.getByRole('heading', { level: 1, name: 'MoneyDisplay' }).waitFor();
  if ((await n.title()) !== 'MoneyDisplay — Punji UI') fail(`routing: title after back is "${await n.title()}"`);
  await n.goBack();
  await n.getByRole('heading', { level: 1, name: HOME_H1 }).waitFor();
  if ((await n.title()) !== 'Punji UI: finance-first React components') fail(`routing: title after back to home is "${await n.title()}"`);
  await n.goForward();
  await n.goForward();
  await n.getByRole('heading', { level: 1, name: 'Order book' }).waitFor();

  // Old hash links redirect to the new path.
  await n.goto(`${base}/#/money-display`);
  await n.getByRole('heading', { level: 1, name: 'MoneyDisplay' }).waitFor();
  if (new URL(n.url()).pathname !== `${basePath}/components/money-display/` || new URL(n.url()).hash) fail(`routing: #/money-display ended at ${n.url()}`);
  if ((await n.title()) !== 'MoneyDisplay — Punji UI') fail(`routing: title after hash redirect is "${await n.title()}"`);
  await n.goto(`${base}/#/`);
  await n.getByRole('heading', { level: 1, name: HOME_H1 }).waitFor();
  if (new URL(n.url()).pathname !== `${basePath}/`) fail(`routing: #/ ended at ${n.url()}`);
  for (const e of navErrors) fail(`routing: console ${e}`);
  await navCtx.close();

  // The 404 page: unknown paths render it (client side) and it is noindex.
  const nf = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const missing = await nf.newPage();
  const nfErrors = [];
  missing.on('console', (msg) => { if (msg.type() === 'error' || msg.type() === 'warning') nfErrors.push(msg.text()); });
  await missing.goto(`${base}/404.html`);
  await missing.getByRole('heading', { level: 1, name: 'Page not found' }).waitFor();
  if ((await missing.locator('meta[name=robots]').getAttribute('content')) !== 'noindex') fail('404: not noindex');
  for (const e of nfErrors) fail(`404: console ${e}`);
  await nf.close();

  // No JavaScript: the prerendered HTML carries the page (heading, props table, code, links).
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const bare = await plain.newPage();
  await bare.goto(`${base}/components/money-display/`);
  for (const [what, locator] of [
    ['h1', bare.getByRole('heading', { level: 1, name: 'MoneyDisplay' })],
    ['props table', bare.getByRole('region', { name: 'MoneyDisplay props' })],
    ['code', bare.getByLabel('Currencies example code', { exact: true })],
    ['nav link', bare.getByRole('list', { name: 'Pages by domain' }).getByRole('link', { name: 'Button', exact: true })],
    ['full source in the Code panel', bare.getByLabel('Nepal full source', { exact: true })],
    ['usage text', bare.getByRole('heading', { level: 3, name: 'Accessibility' })],
  ]) if (!(await locator.count())) fail(`no-JS: ${what} missing from the prerendered page`);
  // Without JavaScript every tab panel shows (index.html's noscript style), so nothing is hidden behind a tab.
  for (const id of ['examples', 'code', 'api', 'usage']) if (!(await bare.locator(`#${id}[data-tab]`).isVisible())) fail(`no-JS: the ${id} panel is not visible`);
  await bare.screenshot({ path: `${out}/no-js-money-display.png`, fullPage: true });
  await plain.close();
} finally {
  await browser.close();
  await server?.close();
}

if (failures.length) {
  console.error(`\nlayout flags: edge ${flagCounts.edge} (+${flagCounts.edgeAllowed} allowlisted), clip ${flagCounts.clip}, dup ${flagCounts.dup}, icon ${flagCounts.icon}`);
  console.error(`site check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`layout flags: edge ${flagCounts.edge} (+${flagCounts.edgeAllowed} allowlisted), clip ${flagCounts.clip}, dup ${flagCounts.dup}, icon ${flagCounts.icon}`);
console.log(`site check: ${routes.length} routes x 2 widths x 2 themes, ${checked.variants} example variants and ${checked.tabs} page tabs (axe, overflow, console, layout) and the copy, variant, preview theme, tabs, theme, search, sidebar, drawer, path routing, hash redirect, 404 and no-JS behaviours passed`);
