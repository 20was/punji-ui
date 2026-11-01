import { expect, test } from '@playwright/test';
import { openFixture } from './helpers.ts';

// Wave 3 table behaviour a screenshot cannot show: virtual scrolling with real layout,
// sticky head and pinned columns, keyboard row movement, multi-sort and resizing.
test.beforeEach(({ browserName }, info) => {
  expect(browserName).toBe('chromium');
  test.skip(info.project.name !== 'd1440', 'interaction specs run on the 1440 project');
});

test.describe('VirtualFinancialTable', () => {
  test('draws a window of rows, keeps the head and pinned columns in view while scrolling', async ({ page }) => {
    // Narrower than the table, so it scrolls sideways too.
    await page.setViewportSize({ width: 640, height: 900 });
    await openFixture(page, 'virtual-table', 'light');
    const table = page.getByTestId('vr-vt');
    await expect(table).toHaveAttribute('aria-rowcount', '2001');
    const region = page.getByRole('region', { name: 'Floorsheet, 2,000 trades, NPR' });
    const drawn = () => page.locator('[data-testid="vr-vt"] tbody tr[data-index]').count();
    expect(await drawn()).toBeLessThan(40);
    const box = (await region.boundingBox())!;
    await region.evaluate((el) => { el.scrollTop = 40_000; el.scrollLeft = 200; });
    await expect(page.locator('tr[aria-rowindex="1002"]')).toBeVisible();
    expect(await region.evaluate((el) => el.scrollLeft)).toBe(200);
    expect(await drawn()).toBeLessThan(40);
    const head = (await page.getByRole('columnheader', { name: /Contract/ }).boundingBox())!;
    expect(Math.abs(head.y - box.y)).toBeLessThan(3);
    const pinnedCell = (await page.locator('tr[aria-rowindex="1002"] th[scope="row"]').boundingBox())!;
    expect(pinnedCell.x).toBeLessThan(box.x + 44 + 3);
    const amount = (await page.locator('tr[aria-rowindex="1002"] td.pin-r').boundingBox())!;
    expect(amount.x + amount.width).toBeGreaterThan(box.x + box.width - 20);
  });

  test('moves focus through 2,000 rows with the keyboard and announces its position', async ({ page }) => {
    await openFixture(page, 'virtual-table', 'light');
    await page.locator('tr[aria-rowindex="2"]').click();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('tr[aria-rowindex="3"]')).toBeFocused();
    await page.keyboard.press('End');
    const last = page.locator('tr[aria-rowindex="2001"]');
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport();
    await page.keyboard.press('PageUp');
    await expect(page.locator('tbody tr:focus')).toHaveAttribute('aria-rowindex', /^19\d\d$/);
    await page.keyboard.press('Home');
    const first = page.locator('tr[aria-rowindex="2"]');
    await expect(first).toBeFocused();
    const before = await first.getAttribute('aria-selected');
    await page.keyboard.press('Space');
    await expect(first).toHaveAttribute('aria-selected', before === 'true' ? 'false' : 'true');
  });

  test('sorts by more than one column with Shift and shows the priority', async ({ page }) => {
    await openFixture(page, 'virtual-table', 'light');
    const units = page.getByRole('button', { name: /^Units/ });
    await units.click({ modifiers: ['Shift'] });
    await expect(units).toContainText('3');
    await expect(page.getByRole('status').filter({ hasText: 'Sorted by' })).toHaveText('Sorted by Symbol ascending, then Rate descending, then Units ascending');
    await page.getByRole('button', { name: /^Rate/ }).click();
    await expect(page.getByRole('columnheader', { name: /Rate/ })).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.locator('.pu-vt-rank')).toHaveCount(0);
  });

  test('resizes a column by dragging and from the keyboard', async ({ page }) => {
    await openFixture(page, 'virtual-table', 'light');
    const handle = page.getByRole('separator', { name: 'Resize Symbol column' });
    const b = (await handle.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuenow', '156');
    await expect(page.getByTestId('vr-vt-widths')).toHaveText('{"symbol":156}');
    await handle.focus();
    await page.keyboard.press('Shift+ArrowLeft');
    await expect(handle).toHaveAttribute('aria-valuenow', '116');
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '64');
  });

  test('exports the selected rows', async ({ page }) => {
    await openFixture(page, 'virtual-table', 'light');
    const download = page.waitForEvent('download');
    await page.getByTestId('vr-vt-export-selected').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('floorsheet.csv');
    await expect(page.getByRole('status').filter({ hasText: 'Exported' })).toHaveText('Exported 2 rows');
  });
});
