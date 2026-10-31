// Browser verification of the built documentation site (npm run site:build first).
// Every page at 390 and 1440 px, light and dark: screenshot (test-results/site/, ignored),
// in-browser axe, no horizontal overflow, no console errors. Then behaviour: the copy
// button puts the exact example source on the clipboard, the theme switch forces and
// persists a theme, search filters the sidebar, the mobile drawer opens and navigates.
import { chromium } from 'playwright';
import { preview } from 'vite';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PAGES, GROUPS } from '../site/src/registry.ts';

const out = resolve('test-results/site');
mkdirSync(out, { recursive: true });
const server = process.env.SITE_URL ? null : await preview({ root: 'site', preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
const base = process.env.SITE_URL ?? 'http://127.0.0.1:4174';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const failures = [];
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
const routes = [{ slug: '', title: 'Overview' }, ...PAGES];

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
        await page.goto(`${base}/#/${route.slug}`);
        await page.locator('#page-title').waitFor();
        if ((await page.locator('html').getAttribute('data-theme')) !== theme) fail(`${route.slug || 'home'} ${width} ${theme}: data-theme not applied`);
        const label = `${route.slug || 'home'}-${width}-${theme}`;
        await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async () => (await globalThis.axe.run()).violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`));
        for (const v of violations) fail(`${label}: axe ${v}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 0) fail(`${label}: horizontal overflow by ${overflow}px`);
        for (const e of errors) fail(`${label}: console/page error ${e}`);
        await page.close();
      }
      await context.close();
    }
  }

  // Behaviour: desktop.
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await desktop.newPage();
  await page.goto(`${base}/#/money-display`);
  await page.locator('#page-title').waitFor();

  // Copy: the clipboard holds the exact file that renders the preview.
  await page.getByTestId('preview').waitFor();
  const code = page.locator('.doc-code').filter({ has: page.getByLabel('Currencies example code', { exact: true }) });
  await code.getByTestId('copy-code').click();
  await page.getByText('Copied', { exact: true }).first().waitFor();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const onDisk = readFileSync('site/src/examples/money-display/currencies.tsx', 'utf8').replace(/\n+$/, '');
  if (clipboard !== onDisk) fail('copy: clipboard text differs from site/src/examples/money-display/currencies.tsx');

  // Variant switch changes preview and code together.
  await page.getByRole('group', { name: 'MoneyDisplay variants' }).getByRole('button', { name: 'Nepal' }).click();
  await page.getByLabel('Nepal example code', { exact: true }).waitFor();
  if (!(await page.getByTestId('preview').textContent())?.includes('12,34,567.89')) fail('variant: Nepal preview did not render lakh grouping');

  // Theme switch: forces, and persists across reload.
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Dark' }).click();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') fail('theme: Dark did not set data-theme');
  await page.reload();
  await page.locator('#page-title').waitFor();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'dark') fail('theme: dark did not persist across reload');
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: 'Light' }).click();
  if ((await page.locator('html').getAttribute('data-theme')) !== 'light') fail('theme: Light did not set data-theme');

  // Search filters the sidebar; groups with nothing disappear.
  await page.getByLabel('Search the documentation').fill('order book');
  const nav = page.getByRole('list', { name: 'Pages by domain' });
  if ((await nav.getByRole('link').count()) !== 2) fail('search: "order book" should leave Overview and Order book');
  await page.getByLabel('Search the documentation').fill('zzzz');
  await nav.getByText('Nothing matches').waitFor();
  await page.getByLabel('Search the documentation').fill('');

  // Sidebar lists exactly the registry's groups, in order, with planned counts.
  const titles = await page.locator('.doc-nav-title').allTextContents();
  if (JSON.stringify(titles) !== JSON.stringify(GROUPS.map((g) => g.title))) fail(`sidebar: group order ${titles.join(' | ')}`);
  await desktop.close();

  // Behaviour: mobile drawer.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const m = await mobile.newPage();
  await m.goto(`${base}/#/`);
  await m.getByTestId('menu').click();
  await m.getByRole('dialog', { name: 'Documentation pages' }).waitFor();
  await m.getByRole('dialog').getByRole('link', { name: 'Button', exact: true }).click();
  await m.getByRole('heading', { level: 1, name: 'Button' }).waitFor();
  if (await m.getByRole('dialog').count()) fail('drawer: still open after navigating');
  await m.screenshot({ path: `${out}/mobile-after-drawer.png` });
  await mobile.close();
} finally {
  await browser.close();
  await server?.close();
}

if (failures.length) {
  console.error(`\nsite check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log(`site check: ${routes.length} routes x 2 widths x 2 themes (axe, overflow, console) and the copy, variant, theme, search and drawer behaviours passed`);
