// Run against `npm run examples`. Uses synthetic data and writes ignored artifacts.
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const server = process.env.EXAMPLES_URL ? null : await createServer({ root: 'examples', server: { host: '127.0.0.1', port: 5182, strictPort: true } });
await server?.listen();
const base = process.env.EXAMPLES_URL ?? 'http://127.0.0.1:5182';
const out = resolve('test-results/showcase');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const results = [], errors = [];
try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const count of [0, 1, 48]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${base}/?theme=${theme}&count=${count}`);
    await page.getByRole('heading', { name: 'Portfolio', exact: true }).waitFor();
    await page.screenshot({ path: `${out}/${width}-${theme}-${count}.png`, fullPage: true });
    await page.addScriptTag({ content: readFileSync('node_modules/axe-core/axe.min.js', 'utf8') });
    const violations = await page.evaluate(async () => (await globalThis.axe.run()).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    results.push({ width, theme, count, violations, overflow });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  await page.goto(base);
  await page.keyboard.press('Tab');
  if (!(await page.getByRole('link', { name: 'Skip to content' }).evaluate(el => el === document.activeElement))) throw new Error('Skip link is not the first tab stop');
  await page.keyboard.press('Enter');
  if (!(await page.getByRole('main').evaluate(el => el === document.activeElement))) throw new Error('Skip link did not focus main');
  await page.getByLabel('Search records').fill('no-such-record');
  await page.getByText('No matching records').waitFor();
  await page.getByRole('button', { name: 'Load sample records' }).click();
  await page.getByRole('table').waitFor();
  await page.getByLabel('Data state').selectOption('error');
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.getByRole('table').waitFor();
  for (const workflow of ['Invoices', 'Watchlist']) {
    await page.getByRole('link', { name: workflow, exact: true }).click();
    await page.getByRole('heading', { name: workflow, exact: true }).waitFor();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/390-${workflow}.png`, fullPage: true });
  }
  await page.close();
} finally { await browser.close(); await server?.close(); }
writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
if (errors.length || results.some(r => r.overflow || r.violations.length)) throw new Error(`Browser checks failed: see ${out}/results.json`);
console.log(`examples: ${results.length} responsive/theme/data cases, no page errors, page overflow or serious axe violations; search/empty/retry/navigation passed`);
