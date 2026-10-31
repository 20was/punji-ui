import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const base = process.env.PORTAL_URL ?? 'http://design.localhost:5184';
const out = 'test-results/table';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}) });
const errors = [], results = [];
try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript((selected) => localStorage.setItem('punji-theme', selected), theme);
    await page.goto(`${base}/components/data-table`);
    await page.getByRole('heading', { name: 'Data table', exact: true }).waitFor();
    const stacked = page.locator('.kit-tablebox.stack').last();
    await stacked.scrollIntoViewIfNeeded();
    const layout = await stacked.locator('tbody tr').first().evaluate((row) => {
      const head = row.closest('table')?.querySelector('thead');
      return {
        rowDisplay: getComputedStyle(row).display,
        headerHeight: head ? head.getBoundingClientRect().height : -1,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    if (width < 640 && (layout.rowDisplay !== 'grid' || layout.headerHeight > 1)) throw new Error(`Phone table did not stack accessibly (${theme}): ${JSON.stringify(layout)}`);
    if (width >= 640 && layout.rowDisplay !== 'table-row') throw new Error(`Wide table stacked unexpectedly (${theme})`);
    if (layout.pageOverflow) throw new Error(`Data table causes page overflow at ${width}px`);
    const table = page.getByTestId('ds-table');
    await page.screenshot({ path: `${out}/${width}-${theme}.png`, fullPage: true });
    if (width === 390) {
      const cells = await stacked.locator('tbody tr').first().locator('td[data-label]').count();
      if (cells < 2) throw new Error('Stacked figures are missing their visible labels');
      const mobileSeat = await table.locator('td[data-label="Seats"]').first().evaluate((cell) => ({ left: cell.getBoundingClientRect().left, rowLeft: cell.closest('tr').getBoundingClientRect().left, label: getComputedStyle(cell, '::before').content }));
      if (mobileSeat.left < mobileSeat.rowLeft + 26 || mobileSeat.label !== '"Seats"') throw new Error(`Selectable stack hides or clips a secondary field label: ${JSON.stringify(mobileSeat)}`);
    }
    const mainRowDisplay = await table.locator('tbody tr').first().evaluate((row) => getComputedStyle(row).display);
    if (width < 640 && mainRowDisplay !== 'grid') throw new Error(`Selectable table did not stack on phone (${theme})`);
    const search = page.getByTestId('ds-table-search');
    const range = page.locator('.kit-table-range');
    if (await range.textContent() !== '1–3 of 6') throw new Error('DataTable did not report its initial page range');
    await page.getByTestId('ds-table-page-next').click();
    if (await range.textContent() !== '4–6 of 6') throw new Error('DataTable next page did not update its range');
    await search.fill('Member');
    if (await range.textContent() !== '1–3 of 3') throw new Error('DataTable search did not reset the page and report the filtered total');
    if (await table.getByRole('rowheader').count() !== 3) throw new Error('DataTable search did not render the matching rows');
    await search.fill('no-such-record');
    if (await range.textContent() !== '0 results' || !(await table.getByText('No team members match your search.').count())) throw new Error('DataTable did not show its empty search state');
    await page.getByRole('button', { name: 'Clear search' }).click();
    if (await range.textContent() !== '1–3 of 6') throw new Error('DataTable clear search did not restore the first page');
    const name = table.getByRole('button', { name: /^Name/ });
    await name.focus();
    await page.keyboard.press('Enter');
    if (await table.getByRole('columnheader', { name: /Name/ }).getAttribute('aria-sort') !== 'descending') throw new Error('DataTable sort state did not update');
    const selectPage = width < 640
      ? page.getByTestId('ds-table-selection-select-page-mobile')
      : table.getByRole('checkbox', { name: 'Select all rows on this page' });
    if (width < 640 && !(await selectPage.isVisible())) throw new Error('Stacked table does not expose a visible select-page control on phones');
    await table.locator('tbody input[type="checkbox"]').first().click();
    if (!(await selectPage.evaluate((input) => input.indeterminate)) || !(await page.getByText('1 selected').count())) throw new Error('DataTable did not show partial selection state');
    await selectPage.focus();
    await page.keyboard.press('Space');
    if (!(await page.getByText('3 selected').count())) throw new Error('DataTable did not select the current page');
    await page.getByTestId('ds-table-page-next').click();
    if (!(await page.getByText('3 selected').count()) || await selectPage.isChecked()) throw new Error('Selection did not persist across pages or leaked page checkbox state');
    await selectPage.focus();
    await page.keyboard.press('Space');
    if (!(await page.getByText('6 selected').count())) throw new Error('DataTable page selection did not preserve off-page IDs');
    await page.getByRole('button', { name: 'Clear selection' }).click();
    if (await page.getByText(/selected$/).count()) throw new Error('DataTable did not clear all selected IDs');
    await page.addScriptTag({ content: readFileSync('node_modules/axe-core/axe.min.js', 'utf8') });
    const violations = await page.evaluate(async () => globalThis.axe.run(document.querySelector('article'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    const serious = violations.violations.filter((item) => ['serious', 'critical'].includes(item.impact)).map((item) => item.id);
    if (serious.length) throw new Error(`DataTable accessibility issues (${width}/${theme}): ${serious.join(', ')}`);
    results.push({ width, theme, layout, violations: serious });
    await page.close();
  }
} finally {
  await browser.close();
  writeFileSync(`${out}/results.json`, JSON.stringify({ errors, results }, null, 2));
}
if (errors.length || results.length !== 4) throw new Error(`DataTable checks failed: ${out}/results.json`);
console.log(`table: ${results.length} responsive/a11y cases passed; phone stacking, search, pagination, selection, labels, sort state and no page overflow verified`);
