import { expect, test, type Page } from '@playwright/test';
import { themes } from '../manifest.ts';
import { openFixture } from './helpers.ts';

// Behaviour that a static screenshot cannot show. Runs once, on the desktop project.
test.beforeEach(({ browserName }, info) => {
  expect(browserName).toBe('chromium');
  test.skip(info.project.name !== 'd1440', 'interaction specs run on the 1440 project');
});

const focusInside = (page: Page, selector: string) => page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector);

test.describe('combobox and select', () => {
  test('CompanySearch opens on typing, moves with arrows, picks with Enter, closes with Escape', async ({ page }) => {
    await openFixture(page, 'company-search', 'light');
    const input = page.getByRole('combobox', { name: 'Search companies' });
    await input.fill('na');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    const options = page.getByRole('option');
    await expect(options.first()).toContainText('NABIL');
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.getByTestId('vr-cs-opened')).toHaveText('NABIL');
    await input.fill('nt');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await input.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('CompanySearch shows the no-match message', async ({ page }) => {
    await openFixture(page, 'company-search', 'dark');
    await page.getByRole('combobox', { name: 'Search companies' }).fill('zzzz');
    await expect(page.getByText('No company matches “zzzz”')).toBeVisible();
  });

  test('Select changes value from the keyboard and the picker closes on Escape', async ({ page }) => {
    await openFixture(page, 'select', 'light');
    const select = page.locator('[data-testid="select-default"]');
    await select.focus();
    await expect(select).toHaveValue('nepse');
    await page.keyboard.press('Space');
        await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(select).toHaveValue('sensitive');
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    await expect(select).toBeFocused();
    await expect(select).toHaveValue('sensitive');
    await select.selectOption('nepse');
    await expect(select).toHaveValue('nepse');
  });
});

test.describe('overlays', () => {
  for (const id of ['drawer', 'sheet'] as const) {
    test(`${id} traps focus, closes on Escape and returns focus`, async ({ page }) => {
      await openFixture(page, id, 'light');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press('Tab');
        expect(await focusInside(page, '[role="dialog"]')).toBe(true);
      }
      await page.keyboard.press('Shift+Tab');
      expect(await focusInside(page, '[role="dialog"]')).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      const opener = page.getByTestId('vr-open');
      await opener.focus();
      await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(opener).toBeFocused();
    });
  }

  test('Popover closes on Escape and on outside click, and reopens from its trigger', async ({ page }) => {
    await openFixture(page, 'popover', 'dark');
    const popover = page.getByTestId('vr-popover');
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await page.getByTestId('vr-open').click();
    await expect(popover).toBeVisible();
    await page.mouse.click(700, 600);
    await expect(popover).toBeHidden();
  });

  test('CommandPalette filters, moves with arrows, runs with Enter and closes with Escape', async ({ page }) => {
    await openFixture(page, 'command-palette', 'light');
    const input = page.getByRole('combobox', { name: 'Command palette' });
    await expect(input).toBeFocused();
    await input.fill('ntc');
    await expect(page.getByRole('option')).toHaveCount(1);
    await input.fill('');
    await input.press('ArrowDown');
    await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
    await input.press('Enter');
    await expect(input).toBeHidden();
    await page.getByTestId('vr-open').click();
    await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeHidden();
  });

  test('Toasts announce (alert for errors) and dismiss through their action', async ({ page }) => {
    await openFixture(page, 'toast', 'light', '&quiet=1');
    await page.getByRole('button', { name: 'Error' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Order rejected' })).toBeVisible();
    await page.getByTestId('toast-action').click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Success' }).click();
    await expect(page.getByText('Order placed')).toBeVisible();
  });
});

test.describe('tabs, toggles and controls', () => {
  test('Tabs move with arrow keys, Home and End', async ({ page }) => {
    await openFixture(page, 'tabs', 'light');
    const tabs = page.getByRole('tablist', { name: 'Portfolio sections' }).getByRole('tab');
    await tabs.first().focus();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.first()).toBeFocused();
    await expect(page.locator('#vr-panel-a')).toContainText('holdings');
  });

  test('Checkbox and Switch toggle by click and keyboard; disabled ones do not', async ({ page }) => {
    await openFixture(page, 'checkbox-switch', 'light');
    const box = page.getByRole('checkbox', { name: 'Include NTC' });
    await expect(box).not.toBeChecked();
    await box.click();
    await expect(box).toBeChecked();
    await box.focus();
    await page.keyboard.press('Space');
    await expect(box).not.toBeChecked();
    const sw = page.getByRole('switch', { name: 'Dividend alerts' });
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('checkbox', { name: 'Disabled', exact: true })).toBeDisabled();
    await expect(page.getByRole('switch', { name: 'Locked on' })).toBeDisabled();
  });

  test('ChoiceGroup selects with arrow keys', async ({ page }) => {
    await openFixture(page, 'controls', 'light');
    const side = page.getByRole('group', { name: 'Order side' }).getByRole('radio');
    await side.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(side.nth(1)).toBeChecked();
  });

  test('Show more expands and collapses', async ({ page }) => {
    await openFixture(page, 'rows', 'light');
    const toggle = page.getByTestId('vr-showmore');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('SEBON fee')).toBeVisible();
  });
});

test.describe('table', () => {
  test('search filters, sort toggles aria-sort, pagination and selection work', async ({ page }) => {
    await openFixture(page, 'table', 'light');
    const table = page.getByRole('table', { name: 'Holdings · NPR' });
    await expect(table.getByRole('row')).toHaveCount(6);

    const symbolHeader = table.getByRole('columnheader', { name: /Symbol/ });
    await expect(symbolHeader).toHaveAttribute('aria-sort', 'ascending');
    await symbolHeader.getByRole('button').click();
    await expect(symbolHeader).toHaveAttribute('aria-sort', 'descending');

    await page.getByTestId('vr-table-page-next').click();
    await expect(table.getByRole('row')).toHaveCount(6);
    await page.getByTestId('vr-table-page-next').click();
    await expect(table.getByRole('row')).toHaveCount(3);
    await expect(page.getByTestId('vr-table-page-next')).toBeDisabled();

    await page.getByRole('searchbox', { name: 'Search holdings' }).fill('bank');
    await expect(table.getByRole('row')).toHaveCount(6);
    await expect(table.getByRole('cell', { name: 'NABIL' }).first()).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search holdings' }).fill('zzzz');
    await expect(page.getByText('No holdings match your search.')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search holdings' }).fill('');

    const upper = page.getByRole('checkbox', { name: 'Select UPPER' });
    await expect(upper).not.toBeChecked();
    await upper.check();
    await expect(upper).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Select SBL' })).toBeDisabled();
  });

  test('loading and empty tables keep their headers and announce state', async ({ page }) => {
    await openFixture(page, 'table-loading', 'dark');
    await expect(page.getByRole('status').filter({ hasText: 'Loading records' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Symbol/ })).toBeVisible();
    await openFixture(page, 'table-empty', 'dark');
    await expect(page.getByText('No holdings match your search.')).toBeVisible();
  });

  test('FinancialTable shows an error with a retry action', async ({ page }) => {
    await openFixture(page, 'financial-table-error', 'light');
    await expect(page.getByText('Unable to load holdings')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});

test.describe('date picking', () => {
  test('DatePicker opens, selects a day with the mouse and keyboard, and closes', async ({ page }) => {
    await openFixture(page, 'date-picker', 'light');
    const trigger = page.getByTestId('vr-dp-trigger');
    await trigger.click();
    const grid = page.getByRole('grid').first();
    await expect(grid).toBeVisible();
    await grid.locator('button[data-date="2025-11-20"]').click();
    await expect(grid).toBeHidden();
    await expect(page.getByTestId('vr-dp-input')).toHaveValue('2025-11-20');
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('grid')).toHaveCount(0);
  });

  test('Calendar day buttons are selectable and unavailable days are disabled', async ({ page }) => {
    await openFixture(page, 'calendar', 'dark');
    const cal = page.getByTestId('vr-cal');
    await expect(cal).toBeVisible();
    await cal.locator('button[data-date="2025-11-25"]').click();
    await expect(cal.locator('td[aria-selected="true"] button')).toHaveAttribute('data-date', '2025-11-25');
    await expect(page.locator('button[data-unavailable]').first()).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('hover and focus-visible', () => {
  for (const theme of themes) {
    test(`buttons: hover and keyboard focus (${theme})`, async ({ page }) => {
      await openFixture(page, 'button', theme);
      const primary = page.getByRole('button', { name: 'Buy NABIL' }).first();
      const secondary = page.getByRole('button', { name: 'Buy NABIL' }).nth(1);
      await primary.hover();
      await expect(primary).toHaveScreenshot(`hover-button-primary-${theme}.png`);
      await secondary.hover();
      await expect(secondary).toHaveScreenshot(`hover-button-secondary-${theme}.png`);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await expect(primary).toBeFocused();
      await expect(primary).toHaveScreenshot(`focus-button-primary-${theme}.png`);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Disabled' }).first()).toBeDisabled();
    });

    test(`fields: hover, focus and error (${theme})`, async ({ page }) => {
      await openFixture(page, 'fields', theme);
      const field = page.getByLabel('Symbol', { exact: true }).first();
      const wrap = field.locator('xpath=ancestor::*[contains(@class,"kit-field") or contains(@class,"pu-field")][1]');
      const target = (await wrap.count()) ? wrap : field;
      await field.hover();
      await expect(target).toHaveScreenshot(`hover-field-${theme}.png`);
      await page.mouse.move(0, 0);
      await field.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(field).toBeFocused();
      await expect(target).toHaveScreenshot(`focus-field-${theme}.png`);
      const bad = page.getByLabel('Symbol (error)');
      await expect(bad).toHaveAttribute('aria-invalid', 'true');
    });
  }
});

test.describe('money input', () => {
  test('CurrencyInput groups in lakh and crore as you type and refuses a third paisa digit', async ({ page }) => {
    await openFixture(page, 'currency-input', 'light');
    const input = page.getByTestId('vr-ci');
    await input.click();
    await input.pressSequentially('1234567.891');
    await expect(input).toHaveValue('12,34,567.89');
    await input.press('Backspace');
    await input.press('Backspace');
    await expect(input).toHaveValue('12,34,567.');
    await input.pressSequentially('5');
    await expect(input).toHaveValue('12,34,567.5');
  });

  test('CurrencyInput refuses a leading minus and letters', async ({ page }) => {
    await openFixture(page, 'currency-input', 'dark');
    const input = page.getByTestId('vr-ci');
    await input.click();
    await input.pressSequentially('-4a2');
    await expect(input).toHaveValue('42');
  });

  test('CurrencyInput for a currency with no fraction digits refuses the decimal point', async ({ page }) => {
    await openFixture(page, 'currency-input', 'light');
    const input = page.getByTestId('vr-ci-jpy');
    await expect(input).toHaveValue('1,250,000');
    await input.click();
    await input.press('End');
    await input.pressSequentially('.5');
    await expect(input).toHaveValue('12,500,005');
  });
});

test.describe('check list tab list', () => {
  test('Arrow keys, Home and End move focus between tabs and wrap', async ({ page }) => {
    await openFixture(page, 'check-list-tabs', 'light');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await tabs.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(tabs.nth(2)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toBeFocused();
  });

  test('Activating a tab selects it and shows its panel', async ({ page }) => {
    await openFixture(page, 'check-list-tabs', 'dark');
    await page.getByRole('tab', { name: /Diversification/ }).click();
    await expect(page.getByRole('tab', { name: /Diversification/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('vr-check-panel')).toHaveText('Detail: b');
  });
});

test.describe('pagination', () => {
  test('page buttons, next and previous move through the range and disable at the ends', async ({ page }) => {
    await openFixture(page, 'pagination', 'light');
    const range = page.getByTestId('vr-pager-range');
    await expect(range).toHaveText('1–5 of 12');
    await expect(page.getByTestId('vr-pager-prev')).toBeDisabled();
    await page.getByTestId('vr-pager-page-2').click();
    await expect(range).toHaveText('6–10 of 12');
    await expect(page.getByTestId('vr-pager-page-2')).toHaveAttribute('aria-current', 'page');
    await page.getByTestId('vr-pager-next').click();
    await expect(range).toHaveText('11–12 of 12');
    await expect(page.getByTestId('vr-pager-next')).toBeDisabled();
    await page.getByTestId('vr-pager-prev').click();
    await expect(range).toHaveText('6–10 of 12');
  });

  test('works from the keyboard', async ({ page }) => {
    await openFixture(page, 'pagination', 'dark');
    const range = page.getByTestId('vr-pager-range');
    await page.getByTestId('vr-pager-page-1').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('vr-pager-page-2')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(range).toHaveText('6–10 of 12');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('vr-pager-next')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(range).toHaveText('11–12 of 12');
  });

  test('an empty list reads 0 of 0 and offers no page button', async ({ page }) => {
    await openFixture(page, 'pagination', 'light');
    const empty = page.getByRole('navigation', { name: 'Pages' }).nth(3);
    await expect(empty).toContainText('0 of 0');
    await expect(empty.getByRole('button', { name: /Page/ })).toHaveCount(0);
  });
});

test.describe('market and accounting components', () => {
  test('Watchlist: Alt+Arrow moves a row and keeps focus on the control; removing moves focus to the neighbour', async ({ page }) => {
    await openFixture(page, 'watchlist', 'light');
    const list = page.getByRole('region', { name: 'My watchlist' });
    const symbols = () => list.locator('.pu-watch-id b').allTextContents();
    expect((await symbols()).slice(0, 3)).toEqual(['NABIL', 'NTC', 'HDL']);
    const down = list.getByRole('button', { name: 'Move NABIL down' });
    await down.focus();
    await page.keyboard.press('Alt+ArrowDown');
    expect((await symbols()).slice(0, 3)).toEqual(['NTC', 'NABIL', 'HDL']);
    await expect(list.getByRole('button', { name: 'Move NABIL down' })).toBeFocused();
    await expect(list.getByRole('status')).toHaveText('NABIL moved to position 2 of 5');
    await page.keyboard.press('Alt+ArrowUp');
    expect((await symbols()).slice(0, 2)).toEqual(['NABIL', 'NTC']);
    await list.getByRole('button', { name: 'Remove NABIL from watchlist' }).click();
    expect((await symbols()).slice(0, 2)).toEqual(['NTC', 'HDL']);
    await expect(list.getByRole('button', { name: 'Remove NTC from watchlist' })).toBeFocused();
  });

  test('StockTable: a sort head toggles aria-sort and the order', async ({ page }) => {
    await openFixture(page, 'stock-table', 'dark');
    const table = page.getByTestId('vr-stock');
    const head = table.getByRole('columnheader', { name: /LTP/ });
    await table.getByTestId('vr-stock-sort-ltp').click();
    await expect(head).toHaveAttribute('aria-sort', 'descending');
    const first = async () => table.locator('tbody tr').first().locator('b').first().textContent();
    expect(await first()).toBe('HDL');
    await table.getByTestId('vr-stock-sort-ltp').click();
    await expect(head).toHaveAttribute('aria-sort', 'ascending');
    expect(await first()).not.toBe('HDL');
  });

  test('MarketMovers: tabs switch the table and move with the arrow keys', async ({ page }) => {
    await openFixture(page, 'market-movers', 'light');
    const tabs = page.getByRole('tablist', { name: 'Market movers' }).first();
    const gainers = tabs.getByRole('tab', { name: 'Gainers' });
    await expect(gainers).toHaveAttribute('aria-selected', 'true');
    await gainers.focus();
    await page.keyboard.press('ArrowRight');
    const losers = tabs.getByRole('tab', { name: 'Losers' });
    await expect(losers).toHaveAttribute('aria-selected', 'true');
    await expect(losers).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.getByRole('tab', { name: 'Most active' })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(gainers).toHaveAttribute('aria-selected', 'true');
  });

  test('FinancialPeriodSelector: switching the kind keeps the time span', async ({ page }) => {
    await openFixture(page, 'period-selector', 'light');
    const period = page.getByRole('combobox', { name: 'Reporting period' });
    await expect(period).toHaveValue('fy-2081');
    await page.getByRole('radio', { name: 'Month' }).check({ force: true });
    await expect(page.getByTestId('vr-period-value')).toHaveText(/^m-2081-/);
    await page.getByRole('radio', { name: 'Year' }).check({ force: true });
    await expect(page.getByTestId('vr-period-value')).toHaveText('fy-2081');
    await period.selectOption('fy-2080');
    await expect(page.getByTestId('vr-period-value')).toHaveText('fy-2080');
  });
});

test.describe('banking and payments', () => {
  test('AccountNumber: the full number is only in the DOM while revealed', async ({ page }) => {
    await openFixture(page, 'account-number', 'light');
    const root = page.getByTestId('vr-an');
    await expect(root).toContainText('•••• •••• •••• 2345');
    expect(await page.locator('[data-fixture]').innerHTML()).not.toContain('0123');
    const toggle = page.getByTestId('vr-an-reveal');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(root.locator('.pu-acct-num')).toHaveText('0123 4567 8901 2345');
    await toggle.click();
    expect(await root.innerHTML()).not.toContain('0123');
  });

  test('BeneficiarySelector: type, Enter chooses; ArrowDown reopens; Escape closes', async ({ page }) => {
    await openFixture(page, 'beneficiary-selector', 'dark');
    const input = page.getByRole('combobox', { name: 'Pay to' });
    await input.focus();
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await input.fill('khalti');
    await expect(page.getByRole('option')).toHaveCount(1);
    await input.press('Enter');
    await expect(input).toHaveValue('Sunita Rai');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await input.press('Escape');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(await page.locator('[data-fixture]').innerHTML()).not.toContain('9867654320');
  });
});

const live = (page: Page) => page.locator('[data-testid="vr-candles"] [role="status"]');

test.describe('financial charts', () => {

  test('CandlestickChart: arrows, Home and End move between candles and the readout follows', async ({ page }) => {
    await openFixture(page, 'candlestick-chart', 'light');
    const plot = page.getByTestId('vr-candles').getByRole('group', { name: 'NABIL daily' });
    await plot.focus();
    await expect(live(page)).toContainText('Close');
    await page.keyboard.press('Home');
    const first = await live(page).textContent();
    await page.keyboard.press('ArrowRight');
    await expect(live(page)).not.toHaveText(first ?? '');
    await expect(page.getByTestId('vr-candles-tip')).toBeVisible();
    await page.keyboard.press('End');
    await expect(live(page)).toContainText('Close');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vr-candles-tip')).toHaveCount(0);
  });

  test('CandlestickChart: the pointer shows a crosshair and readout', async ({ page }) => {
    await openFixture(page, 'candlestick-chart', 'dark');
    const plot = page.getByTestId('vr-candles').getByRole('group', { name: 'NABIL daily' });
    await plot.hover({ position: { x: 300, y: 120 } });
    await expect(page.getByTestId('vr-candles-tip')).toBeVisible();
  });

  test('PerformanceChart: legend toggles hide a series and the last one stays', async ({ page }) => {
    await openFixture(page, 'performance-chart', 'light');
    const chart = page.getByTestId('vr-perf');
    const nepse = chart.getByRole('button', { name: /NEPSE/ });
    await nepse.focus();
    await page.keyboard.press('Enter');
    await expect(nepse).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Space');
    await expect(nepse).toHaveAttribute('aria-pressed', 'true');
    const plot = chart.getByRole('group', { name: 'Portfolio against indices' });
    await plot.focus();
    await page.keyboard.press('Home');
    await expect(chart.locator('[role="status"]')).toContainText('Portfolio 0.00%');
  });

  test('DepthChart: arrows move one price level and announce the running total', async ({ page }) => {
    await openFixture(page, 'depth-chart', 'light');
    const chart = page.getByTestId('vr-depth');
    await chart.getByRole('group', { name: 'NABIL depth' }).focus();
    await page.keyboard.press('Home');
    await expect(chart.locator('[role="status"]')).toContainText('Bid NPR');
    await expect(chart.locator('[role="status"]')).toContainText('cumulative 22,550');
    await page.keyboard.press('ArrowRight');
    await expect(chart.locator('[role="status"]')).toContainText('cumulative 17,350');
  });
});
