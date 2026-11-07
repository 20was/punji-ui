// Browser verification of the built documentation site (npm run site:build first).
// Every page at 390 and 1440 px, light and dark: screenshot (test-results/site/, ignored),
// in-browser axe, no horizontal overflow, no console errors; EVERY example variant of every page
// (switched through the variant chips), not only the first; and every page tab (Code, API, Usage)
// opened and audited, since only one tab shows at a time. Then behaviour: the copy button puts the
// exact example source on the clipboard, the theme switch forces and persists a theme, the Command-K
// search finds and opens pages, sidebar groups collapse and persist, the mobile drawer opens and
// navigates, tabs deep-link, path routing, the hash redirect, the 404 page and the no-JS render.
// SITE_ONLY=slug,slug (home for the overview) limits the page sweep, and the app screens sweep, to those pages.
// SITE_SHARD="i/n" (1-based) runs every n-th page-sweep cell (width x theme x route) and, on shard 1
// only, the behaviour checks, so CI can split the sweep across jobs. Unset, everything runs.
import { chromium } from 'playwright';
import { preview } from 'vite';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGES, GROUPS, pageBySlug } from '../site/src/registry.ts';
import { HOME_TITLE, headTitleOf, normaliseBase, pagePath } from '../site/src/seo.ts';

const titleOf = (slug) => headTitleOf(pageBySlug(slug));

const out = resolve('test-results/site');
mkdirSync(out, { recursive: true });
const server = process.env.CHECK_URL ? null : await preview({ root: 'site', preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
// BASE_PATH must match the build (default '/'). CHECK_URL tests an already running server instead of vite preview.
const basePath = normaliseBase(process.env.BASE_PATH).replace(/\/$/, '');
const base = `${process.env.CHECK_URL ?? 'http://127.0.0.1:4174'}${basePath}`;
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const [shardIndex, shardCount] = (process.env.SITE_SHARD ?? '1/1').split('/').map(Number);
if (!Number.isInteger(shardIndex) || !Number.isInteger(shardCount) || shardIndex < 1 || shardIndex > shardCount) throw new Error(`SITE_SHARD must look like "1/4", got "${process.env.SITE_SHARD}"`);
let cell = 0;
const failures = [];
const checked = { variants: 0, tabs: 0 };
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
const routes = [{ slug: '', title: 'Overview', path: '/' }, ...PAGES.map((p) => ({ ...p, path: pagePath(p) }))];
const HOME_H1 = 'React components for money, markets and ledgers.';
const flagCounts = { edge: 0, clip: 0, dup: 0, icon: 0, card: 0, edgeAllowed: 0, cardAllowed: 0 };

// Layout defects a plain axe/overflow pass misses, probed inside every example preview (the stage).
//  edge  content within EDGE px of the stage's border box, or past it: missing padding, content flush to the frame.
//  clip  content cut off by an overflow:hidden ancestor (the stage, its frame, or a clipping box inside it).
//  dup   the same caption or note text twice in one example.
//  icon  an inline link whose icon sits alone on its own line.
//  card  text within CARD_EDGE px of the inner border edge of a card (or other bordered box) at phone width: a stacked table
//        or any child that forgot the card's inset. Checked over the whole page, and over the stage for a variant audit.
// `edge` and `card` are allowlisted per page slug (and optional example id) with a reason; `clip`, `dup` and `icon` always fail.
const EDGE = 8;
const CARD_EDGE = 4;
const EDGE_ALLOW = {
  // 'slug' or 'slug/example': 'why the component is intentionally edge to edge',
  'app-shell': 'the skip link is position: fixed and parked above the viewport until it takes focus',
  'skip-link': 'the skip link is position: fixed and parked above the viewport until it takes focus',
};
const CARD_ALLOW = {
  // 'slug' or 'slug/example': 'why text intentionally touches the box edge',
};
/* oxlint-disable unicorn/consistent-function-scoping, no-shadow -- the probe is serialised into the page, so it must be self-contained. */
const layoutProbe = ({ edge, cardEdge, scoped, narrow }) => {
  const stage = document.querySelector('[data-testid=preview]');
  const out = [];
  const cardProbe = () => {
    const root = scoped ? stage : document.body;
    if (!root || !narrow) return;
    const boxes = [...root.querySelectorAll('*')].filter((el) => {
      if (el.closest('svg')) return false;
      const c = getComputedStyle(el); const r = el.getBoundingClientRect();
      const bordered = parseFloat(c.borderLeftWidth) >= 1 && parseFloat(c.borderRightWidth) >= 1 && c.borderLeftStyle !== 'none' && c.borderRightStyle !== 'none';
      return r.width >= 200 && r.height >= 48 && (el.classList.contains('kit-card') || (bordered && parseFloat(c.borderTopLeftRadius) > 0));
    });
    const range = document.createRange();
    const seenCard = new Set();
    for (const box of boxes) {
      const br = box.getBoundingClientRect(); const bc = getComputedStyle(box);
      const innerLeft = br.left + parseFloat(bc.borderLeftWidth); const innerRight = br.right - parseFloat(bc.borderRightWidth);
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        const host = n.parentElement;
        if (!host || host.closest('svg, .kit-sr, [aria-hidden=true]')) continue;
        const hc = getComputedStyle(host); const hr = host.getBoundingClientRect();
        if (hc.display === 'none' || hc.visibility === 'hidden' || hr.width <= 1 || hr.height <= 1) continue;
        // Text scrolled or clipped inside its own scroller (a wide table, a code block) is judged by that scroller, not the box.
        let scrolled = false;
        for (let a = host; a; a = a === box ? null : a.parentElement) { const c = getComputedStyle(a); if (c.overflowX !== 'visible' && a.scrollWidth > a.clientWidth + 1) { scrolled = true; break; } }
        if (scrolled) continue;
        range.selectNodeContents(n);
        const sides = [];
        for (const q of range.getClientRects()) {
          if (q.width < 1) continue;
          if (q.left < innerLeft + cardEdge && q.left > innerLeft - 1000) sides.push('left');
          if (q.right > innerRight - cardEdge && q.right < innerRight + 1000) sides.push('right');
        }
        if (sides.length) { const side = [...new Set(sides)].join('+'); const key = `${describe(box)}>${describe(host)}:${side}`; if (!seenCard.has(key)) { seenCard.add(key); out.push({ kind: 'card', text: `text "${n.textContent.trim().slice(0, 30)}" in ${describe(host)} is within ${cardEdge}px of the ${side} inner edge of ${describe(box)}` }); } }
      }
    }
  };
  const describe = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''}`;
  cardProbe();
  if (!stage) return out;
  const box = stage.getBoundingClientRect();
  // Not drawn: display none, a closed <details> body, a visually hidden (1px) box such as a stacked table's head.
  const visible = (el) => {
    const c = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (c.display === 'none' || c.visibility === 'hidden' || r.width <= 1 || r.height <= 1 || el.closest('.kit-sr')) return false;
    for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) if (!d.open && !el.closest('summary')) return false;
    return true;
  };
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
        if (process.env.SITE_ONLY && !process.env.SITE_ONLY.split(',').includes(route.slug || 'home')) continue;
        if (cell++ % shardCount !== shardIndex - 1) continue;
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
          for (const flag of await page.evaluate(layoutProbe, { edge: EDGE, cardEdge: CARD_EDGE, scoped: Boolean(scope), narrow: width <= 480 })) {
            if (flag.kind === 'edge' && (EDGE_ALLOW[route.slug] || EDGE_ALLOW[`${route.slug}/${exampleId}`])) { flagCounts.edgeAllowed += 1; continue; }
            if (flag.kind === 'card' && (CARD_ALLOW[route.slug] || CARD_ALLOW[`${route.slug}/${exampleId}`])) { flagCounts.cardAllowed += 1; continue; }
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
          // A variant after the first arrives as its own chunk; let charts take their measured width (a ResizeObserver
          // runs a frame after mount) before the layout is judged.
          await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
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

  // Apps (/apps/<slug>/): every screen of every app at phone, tablet and desktop widths, light and dark: axe, no
  // horizontal overflow, no console errors. Screens after the first load on demand, so each is opened through the
  // app's navigation and audited once its heading has focus. Runs on the first shard.
  if (shardIndex === 1) {
    for (const app of PAGES.filter((p) => p.kind === 'app' && (!process.env.SITE_ONLY || process.env.SITE_ONLY.split(',').includes(p.slug)))) {
      for (const width of [390, 768, 1440]) {
        for (const theme of ['light', 'dark']) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
          await context.addInitScript((t) => localStorage.setItem('punji-docs-theme', JSON.stringify(t)), theme);
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
          await page.goto(`${base}${pagePath(app)}`);
          await page.locator('#page-title').waitFor();
          await page.addScriptTag({ content: axeSource });
          for (const screen of app.app.screens) {
            const name = `app ${app.slug} ${width} ${theme} #${screen.id}`;
            await page.getByTestId(`screen-${screen.id}`).click();
            await page.locator(`[data-screen="${screen.id}"] [data-screen-title]`).waitFor();
            if ((await page.getByTestId(`screen-${screen.id}`).getAttribute('aria-current')) !== 'page') fail(`${name}: the nav item is not marked current`);
            await page.evaluate(() => window.scrollTo(0, 0));
            const violations = await page.evaluate(async () => (await globalThis.axe.run(document)).violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
            for (const v of violations) fail(`${name}: axe ${v}`);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
            if (overflow > 0) fail(`${name}: horizontal overflow by ${overflow}px`);
            if (width === 390 || width === 1440) await page.screenshot({ path: `${out}/app-${app.slug}-${screen.id}-${width}-${theme}.png`, fullPage: true });
            for (const e of errors.splice(0)) fail(`${name}: console/page error ${e}`);
          }
          await context.close();
        }
      }
    }

    // A lazy screen with a chart mounts before its container has a layout, so the chart first draws at a fallback width:
    // with the chunk held back, no frame from the click on may be wider than the phone viewport (the market portal's Compare chart).
    {
      const lazyCtx = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      const lz = await lazyCtx.newPage();
      await lz.route(/assets\/(Compare|Performance|ChartA11y)[^/]*\.js$/, async (route) => { await new Promise((done) => setTimeout(done, 400)); await route.continue(); });
      await lz.goto(`${base}/apps/market-portal/`);
      await lz.locator('#page-title').waitFor();
      await lz.evaluate(() => {
        window.widest = 0;
        const frame = () => { window.widest = Math.max(window.widest, document.documentElement.scrollWidth - innerWidth); requestAnimationFrame(frame); };
        requestAnimationFrame(frame);
      });
      await lz.getByTestId('screen-compare').click();
      await lz.locator('[data-screen="compare"] [data-screen-title]').waitFor();
      await lz.getByTestId('mp-cmp-chart').waitFor();
      await lz.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      const wide = await lz.evaluate(() => window.widest);
      if (wide > 0) fail(`app market-portal 390 #compare: a frame while the lazy chart mounted was wider than the viewport by ${wide}px`);
      await lazyCtx.close();
    }

    // App behaviour: the trading terminal places an order that reaches the order list, and opens the command palette
    // from the keyboard; the wealth dashboard applies for an issue and an allotment changes the holdings; the accounting
    // app posts a journal and reconciles; the billing app issues an invoice.
    const appCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const t = await appCtx.newPage();
    const appErrors = [];
    t.on('pageerror', (e) => appErrors.push(e.message));
    t.on('console', (msg) => { if (msg.type() === 'error') appErrors.push(msg.text()); });
    await t.goto(`${base}/apps/trading-terminal/#orders`);
    await t.locator('[data-screen="orders"] [data-screen-title]').waitFor();
    await t.getByTestId('tt-ticket-submit').click();
    await t.getByTestId('tt-ticket-confirm').click();
    await t.locator('[data-testid^="tt-orders-N-0001"]').first().waitFor({ timeout: 5000 }).catch(() => fail('trading terminal: a placed order did not reach the order list'));
    await t.keyboard.press('Escape');
    await t.locator('body').click({ position: { x: 5, y: 600 } });
    await t.keyboard.press('ControlOrMeta+k');
    await t.getByRole('dialog', { name: 'Terminal commands' }).waitFor({ timeout: 5000 }).catch(() => fail('trading terminal: Ctrl/Cmd-K did not open the command palette'));
    await t.keyboard.press('Escape');
    await t.keyboard.press('4');
    await t.locator('[data-screen="positions"] [data-screen-title]').waitFor({ timeout: 5000 }).catch(() => fail('trading terminal: the 4 key did not open Positions'));
    await t.goto(`${base}/apps/wealth-dashboard/#issues`);
    await t.locator('[data-screen="issues"] [data-screen-title]').waitFor();
    await t.getByTestId('wd-allot-check').click();
    await t.getByText('Added to your holdings.').or(t.getByText(/unblocked\./)).first().waitFor({ timeout: 5000 }).catch(() => fail('wealth dashboard: the allotment check did not settle the application'));
    if (!(await t.getByTestId('wd-applications').textContent())?.match(/Allotted|Not allotted/)) fail('wealth dashboard: the application status did not change after the allotment check');
    // Reconciliation desk: payroll paid as three transfers matches the one ledger entry once both sides are ticked, and
    // the report's control totals reconcile. Statements: the header drifting by a rupee disables printing, and in print
    // the app chrome is gone, sections start a page and the text is black.
    await t.goto(`${base}/apps/reconciliation-desk/#queue`);
    await t.locator('[data-screen="queue"] [data-screen-title]').waitFor();
    for (const n of ['1', '2', '3']) await t.getByRole('checkbox', { name: new RegExp(`Select Salary transfer ${n} of 3`) }).check();
    await t.getByRole('checkbox', { name: /Select Staff salary batch/ }).check();
    await t.getByTestId('rc-match').click();
    await t.getByText(/Matched 3 statement lines with 1 ledger entry/).waitFor({ timeout: 5000 }).catch(() => fail('reconciliation desk: the payroll did not match many-to-one'));
    await t.getByTestId('screen-report').click();
    await t.locator('[data-screen="report"] [data-screen-title]').waitFor();
    if ((await t.getByText('Reconciles').count()) < 2) fail('reconciliation desk: the report totals do not reconcile with the closing balances');
    await t.goto(`${base}/apps/account-statements/`);
    await t.getByTestId('st-paper').waitFor();
    await t.getByTestId('st-drift').click();
    if (!(await t.getByTestId('st-print').isDisabled())) fail('account statements: a statement that does not reconcile can be printed');
    await t.getByTestId('st-drift').click();
    await t.emulateMedia({ media: 'print' });
    const printed = await t.evaluate(() => ({ nav: getComputedStyle(document.querySelector('.app-nav')).display, brk: getComputedStyle(document.querySelector('.st-break')).breakBefore, ink: getComputedStyle(document.querySelector('.st-title')).color }));
    if (printed.nav !== 'none' || printed.brk !== 'page' || printed.ink !== 'rgb(0, 0, 0)') fail(`account statements: print styles not applied (${JSON.stringify(printed)})`);
    await t.emulateMedia({ media: 'screen' });
    // Treasury desk: the base case warns (under target, above the minimum); S (stress: customers pay late) breaches the
    // buffer; deferring the Sagarmatha Logistics payment cures it. Personal finance: paying the three utility bills
    // pushes Utilities over its budget, which the budget screen then says.
    await t.goto(`${base}/apps/treasury-desk/`);
    await t.getByTestId('td-alert-warn').waitFor({ timeout: 5000 }).catch(() => fail('treasury desk: the base case does not warn about the target buffer'));
    await t.keyboard.press('s');
    await t.getByTestId('td-alert-danger').waitFor({ timeout: 5000 }).catch(() => fail('treasury desk: the stress case (S) did not breach the buffer'));
    await t.getByTestId('screen-payments').click();
    await t.locator('[data-screen="payments"] [data-screen-title]').waitFor();
    await t.getByTestId('td-defer-P-14').click();
    await t.getByTestId('screen-position').click();
    await t.locator('[data-screen="position"] [data-screen-title]').waitFor();
    if ((await t.getByTestId('td-alert-danger').count()) !== 0) fail('treasury desk: deferring a payment did not cure the breach');
    await t.getByTestId('screen-forecast').click();
    await t.locator('[data-screen="forecast"] [data-screen-title]').waitFor();
    if ((await t.getByText('Reconciles').count()) < 2) fail('treasury desk: the forecast totals do not reconcile with the items');
    await t.goto(`${base}/apps/personal-finance/#bills`);
    await t.locator('[data-screen="bills"] [data-screen-title]').waitFor();
    for (const id of ['power', 'internet', 'mobile']) await t.getByTestId(`pf-pay-${id}`).click();
    await t.getByTestId('screen-budget').click();
    await t.locator('[data-screen="budget"] [data-screen-title]').waitFor();
    await t.getByTestId('pf-over-utilities').waitFor({ timeout: 5000 }).catch(() => fail('personal finance: paying the bills did not put Utilities over budget'));
    if ((await t.getByText('Reconciles').count()) < 2) fail('personal finance: the budget totals do not reconcile');
    // Retail banking: a transfer to a saved payee passes the payee check, the one-time code and lands on a receipt,
    // and Home's total drops by exactly the amount. The wallet pays an electricity bill with the PIN, and the balance
    // on Home is the old balance less the bill plus its cashback.
    await t.goto(`${base}/apps/retail-banking/`);
    await t.getByTestId('rb-total').waitFor();
    const totalBefore = await t.getByTestId('rb-total').textContent();
    await t.getByTestId('screen-transfer').click();
    await t.locator('[data-screen="transfer"] [data-screen-title]').waitFor();
    await t.getByTestId('rb-payee').click();
    await t.getByTestId('rb-payee-option-p-mother').click();
    await t.getByTestId('rb-amount').fill('1500');
    await t.getByTestId('rb-purpose').selectOption('Family support');
    await t.getByTestId('rb-continue').click();
    await t.locator('[data-testid="rb-payee-check"][data-result="match"]').waitFor({ timeout: 5000 }).catch(() => fail('retail banking: the payee check did not answer'));
    await t.getByTestId('rb-confirm').click();
    await t.locator('[data-testid="rb-otp"] input').first().click();
    await t.keyboard.type('246810');
    await t.getByTestId('rb-receipt').waitFor({ timeout: 5000 }).catch(() => fail('retail banking: the transfer did not reach a receipt'));
    await t.getByTestId('screen-home').click();
    const totalAfter = await t.getByTestId('rb-total').textContent();
    const rupees = (text) => Number(((text ?? '').match(/[\d,]+\.\d{2}/)?.[0] ?? '0').replace(/,/g, ''));
    if (Math.round((rupees(totalBefore) - rupees(totalAfter)) * 100) !== 150_000) fail(`retail banking: Home total went from ${totalBefore} to ${totalAfter}, not down by Rs 1,500`);
    await t.goto(`${base}/apps/digital-wallet/#bills`);
    await t.locator('[data-screen="bills"] [data-screen-title]').waitFor();
    // The bills screen loads on demand; fill and fetch again if a busy machine dropped the first attempt.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await t.getByTestId('dw-electricity-id').fill('1234567');
      await t.getByTestId('dw-electricity-fetch').click();
      if (await t.locator('[data-testid="dw-electricity-bill"][data-state="ready"]').waitFor({ timeout: 5000 }).then(() => true, () => false)) break;
      if (attempt === 2) fail('digital wallet: the electricity bill did not load');
    }
    await t.getByTestId('dw-electricity-pay').click({ timeout: 10000 });
    await t.locator('[data-testid="dw-pin"] button').first().focus();
    await t.keyboard.type('2580');
    await t.getByTestId('dw-receipt').waitFor({ timeout: 5000 }).catch(() => fail('digital wallet: the bill payment did not reach a receipt'));
    await t.getByTestId('screen-home').click();
    if (!(await t.getByTestId('dw-balance').textContent())?.includes('10,540.49')) fail(`digital wallet: balance after the bill is ${await t.getByTestId('dw-balance').textContent()}, expected Rs 10,540.49 (12,480.50 - 1,979.60 + 39.59 cashback)`);
    // Invest and insure: open a fund, invest once, follow the order to an allotment of units at NAV, and the
    // portfolio's invested total rises by exactly the amount.
    await t.goto(`${base}/apps/invest-insure/#portfolio`);
    await t.getByTestId('ii-pf-invested').waitFor({ timeout: 10000 });
    const investedBefore = await t.getByTestId('ii-pf-invested').textContent();
    await t.getByTestId('screen-funds').click();
    await t.getByTestId('ii-fund-trishuli-index').click();
    await t.getByTestId('ii-lumpsum').click({ timeout: 10000 });
    await t.locator('[data-screen="sip"] [data-screen-title]').waitFor();
    await t.getByTestId('ii-review').click({ timeout: 10000 });
    await t.getByTestId('ii-confirm').click();
    await t.getByTestId('ii-allotment').waitFor({ timeout: 15000 }).catch(() => fail('invest and insure: the order did not reach an allotment'));
    await t.getByTestId('ii-view-portfolio').click();
    await t.getByTestId('ii-pf-invested').waitFor({ timeout: 10000 });
    const investedAfter = await t.getByTestId('ii-pf-invested').textContent();
    if (Math.round((rupees(investedAfter) - rupees(investedBefore)) * 100) !== 5_000_000) fail(`invest and insure: invested went from ${investedBefore} to ${investedAfter}, not up by Rs 50,000`);
    // Accounting: a balanced journal posts and reaches the posted list; the reconciliation accepts suggestions.
    await t.goto(`${base}/apps/accounting/#journal`);
    await t.locator('[data-screen="journal"] [data-screen-title]').waitFor();
    await t.getByTestId('ac-journal-memo').fill('Tea and snacks for the office');
    await t.getByTestId('ac-journal-debit-0').fill('1234.50');
    await t.getByTestId('ac-journal-fill').click();
    await t.getByTestId('ac-journal-post').click();
    await t.getByTestId('ac-posted').getByText('JV-0001', { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => fail('accounting: a balanced journal did not post'));
    await t.getByTestId('screen-bank').click();
    await t.getByTestId('ac-recon-auto').click();
    if (!(await t.getByTestId('ac-recon-matches').textContent().catch(() => ''))) fail('accounting: accepting the reconciliation suggestions matched nothing');
    // Billing: preview and issue the drafted invoice; it reaches the invoice list.
    await t.goto(`${base}/apps/business/#create`);
    await t.locator('[data-screen="create"] [data-screen-title]').waitFor();
    await t.getByTestId('bz-create-preview').click();
    await t.getByTestId('bz-preview').waitFor({ timeout: 5000 }).catch(() => fail('billing: the invoice preview did not open'));
    await t.getByTestId('bz-create-issue').click();
    await t.getByTestId('bz-inv-INV-2083/84-0013').waitFor({ timeout: 5000 }).catch(() => fail('billing: the issued invoice did not reach the list'));
    // Market portal: a preset screen narrows the screener, a broker filter narrows the floorsheet, a heatmap tile
    // opens the company page, and an alert can be set.
    await t.goto(`${base}/apps/market-portal/#screener`);
    await t.locator('[data-screen="screener"] [data-screen-title]').waitFor();
    const allCount = await t.getByTestId('mp-screen-count').textContent();
    await t.getByTestId('mp-preset-value').click();
    if ((await t.getByTestId('mp-screen-count').textContent()) === allCount) fail('market portal: the Value screen did not narrow the screener');
    await t.getByTestId('screen-floorsheet').click();
    await t.locator('[data-screen="floorsheet"] [data-screen-title]').waitFor();
    await t.getByTestId('mp-floor-buyer').selectOption('7');
    await t.getByTestId('mp-floor-clear').waitFor({ timeout: 5000 }).catch(() => fail('market portal: the buyer broker filter did not apply'));
    await t.getByTestId('screen-overview').click();
    await t.getByTestId('mp-heatmap').locator('button').first().click();
    await t.locator('[data-screen="company"] [data-screen-title]').waitFor({ timeout: 5000 }).catch(() => fail('market portal: a heatmap tile did not open the company page'));
    await t.getByTestId('screen-watchlist').click();
    await t.locator('[data-screen="watchlist"] [data-screen-title]').waitFor();
    await t.getByTestId('mp-alert-price').fill('99999');
    await t.getByTestId('mp-alert-add').click();
    await t.getByTestId('mp-alert-A-3').waitFor({ timeout: 5000 }).catch(() => fail('market portal: setting a price alert did not add it'));
    for (const e of appErrors) fail(`apps behaviour: console ${e}`);
    await appCtx.close();
  }

  // Behaviour checks run once, on the first shard.
  if (shardIndex === 1) {
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

  // Phone width: the example runs in its own 375 px viewport (a same-origin iframe), so the package's viewport media
  // queries and matchMedia apply; the frame follows the preview theme, grows to its content, passes axe, and takes focus.
  await page.getByRole('group', { name: 'Preview width', exact: true }).getByRole('button', { name: 'Phone width, 375 pixels' }).click();
  await page.frameLocator('iframe[data-testid=phone-frame]').getByTestId('preview').getByText('12,34,567.89').first().waitFor();
  const frameState = () => page.getByTestId('phone-frame').evaluate((f) => ({
    width: f.contentWindow.innerWidth,
    phoneQuery: f.contentWindow.matchMedia('(width <= 639px)').matches,
    theme: f.contentDocument.documentElement.getAttribute('data-theme'),
    height: f.getBoundingClientRect().height,
    content: f.contentDocument.getElementById('root').getBoundingClientRect().height,
  }));
  // The frame grows to its content on a ResizeObserver callback, a frame or more after the content renders.
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe[data-testid=phone-frame]');
    const root = f?.contentDocument?.getElementById('root');
    return root && Math.abs(f.getBoundingClientRect().height - Math.max(320, Math.ceil(root.getBoundingClientRect().height))) <= 2;
  }, null, { timeout: 5000 }).catch(() => {});
  const phone = await frameState();
  if (phone.width !== 375) fail(`phone width: the frame's viewport is ${phone.width}px, not 375`);
  if (!phone.phoneQuery) fail('phone width: a (width <= 639px) media query does not match inside the frame');
  if (phone.theme !== 'dark') fail(`phone width: the frame shows the ${phone.theme} theme, not the dark preview`);
  if (Math.abs(phone.height - Math.max(320, Math.ceil(phone.content))) > 2) fail(`phone width: the frame is ${phone.height}px tall for ${phone.content}px of content`);
  await page.getByRole('group', { name: 'Preview theme', exact: true }).getByRole('button', { name: 'Light preview' }).click();
  await page.waitForFunction(() => document.querySelector('iframe[data-testid=phone-frame]')?.contentDocument?.documentElement.getAttribute('data-theme') === 'light');
  const phoneDoc = page.frames().find((f) => f.url().includes('/preview-frame/'));
  if (!phoneDoc) fail('phone width: no preview frame');
  else {
    await phoneDoc.addScriptTag({ content: axeSource });
    // The frame holds one example, not a page: it has no h1 of its own (the docs page around it does).
    const violations = await phoneDoc.evaluate(async () => (await globalThis.axe.run(document, { rules: { 'page-has-heading-one': { enabled: false } } })).violations.map((v) => `${v.id} (${v.impact})`));
    for (const v of violations) fail(`phone width: axe ${v} inside the frame`);
  }
  await page.goto(`${base}/components/data-table/`);
  await page.getByRole('group', { name: 'Preview width', exact: true }).getByRole('button', { name: 'Phone width, 375 pixels' }).click();
  await page.frameLocator('iframe[data-testid=phone-frame]').getByRole('button').first().waitFor();
  let reached = false;
  for (let i = 0; i < 8 && !reached; i += 1) {
    await page.keyboard.press('Tab');
    reached = await page.getByTestId('phone-frame').evaluate((f) => document.activeElement === f && f.contentDocument.activeElement?.tagName === 'BUTTON');
  }
  if (!reached) fail('phone width: Tab does not move focus into the example in the frame');
  await page.getByRole('group', { name: 'Preview width', exact: true }).getByRole('button', { name: 'Full width' }).click();
  if (await page.getByTestId('phone-frame').count()) fail('phone width: Full width did not remove the frame');
  await page.goto(`${base}/components/money-display/`);
  await page.locator('#page-title').waitFor();

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
  if ((await n.title()) !== titleOf('order-book')) fail(`routing: title after navigation is "${await n.title()}"`);
  if (!(await n.locator('link[rel=canonical]').getAttribute('href'))?.endsWith('/components/order-book/')) fail('routing: canonical not updated after navigation');
  if (!(await n.locator('meta[name=description]').getAttribute('content'))?.startsWith('OrderBookDepth')) fail('routing: meta description not updated after navigation');
  await n.goBack();
  await n.getByRole('heading', { level: 1, name: 'MoneyDisplay' }).waitFor();
  if ((await n.title()) !== titleOf('money-display')) fail(`routing: title after back is "${await n.title()}"`);
  await n.goBack();
  await n.getByRole('heading', { level: 1, name: HOME_H1 }).waitFor();
  if ((await n.title()) !== HOME_TITLE) fail(`routing: title after back to home is "${await n.title()}"`);
  await n.goForward();
  await n.goForward();
  await n.getByRole('heading', { level: 1, name: 'Order book' }).waitFor();

  // Old hash links redirect to the new path.
  await n.goto(`${base}/#/money-display`);
  await n.getByRole('heading', { level: 1, name: 'MoneyDisplay' }).waitFor();
  if (new URL(n.url()).pathname !== `${basePath}/components/money-display/` || new URL(n.url()).hash) fail(`routing: #/money-display ended at ${n.url()}`);
  if ((await n.title()) !== titleOf('money-display')) fail(`routing: title after hash redirect is "${await n.title()}"`);
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
  }
} finally {
  await browser.close();
  await server?.close();
}

if (failures.length) {
  console.error(`\nlayout flags: edge ${flagCounts.edge} (+${flagCounts.edgeAllowed} allowlisted), clip ${flagCounts.clip}, dup ${flagCounts.dup}, icon ${flagCounts.icon}, card ${flagCounts.card} (+${flagCounts.cardAllowed} allowlisted)`);
  console.error(`site check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`layout flags: edge ${flagCounts.edge} (+${flagCounts.edgeAllowed} allowlisted), clip ${flagCounts.clip}, dup ${flagCounts.dup}, icon ${flagCounts.icon}, card ${flagCounts.card} (+${flagCounts.cardAllowed} allowlisted)`);
console.log(`apps: every screen of ${PAGES.filter((p) => p.kind === 'app').length} apps at 390, 768 and 1440 px, light and dark, plus order entry, the command palette, the allotment flow, posting a journal, reconciling, issuing an invoice, a bank transfer, a wallet bill payment and the market portal screener, floorsheet and alerts`);
console.log(`site check${shardCount > 1 ? ` (shard ${shardIndex}/${shardCount})` : ''}: ${routes.length} routes x 2 widths x 2 themes, ${checked.variants} example variants and ${checked.tabs} page tabs (axe, overflow, console, layout) and the copy, variant, preview theme, phone-width frame, tabs, theme, search, sidebar, drawer, path routing, hash redirect, 404 and no-JS behaviours passed`);
