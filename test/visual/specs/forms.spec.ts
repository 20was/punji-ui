import { expect, test } from '@playwright/test';
import { openFixture } from './helpers.ts';

// Playwright runs under Node; this config's types do not include it.
declare const Buffer: { from(text: string): never };

// Wave 2 form behaviour that a static screenshot cannot show. Runs once, on the desktop project.
test.beforeEach(({ browserName }, info) => {
  expect(browserName).toBe('chromium');
  test.skip(info.project.name !== 'd1440', 'interaction specs run on the 1440 project');
});

test.describe('forms', () => {
  test('NumberField steps lots of 10 with the arrows and stops at the maximum', async ({ page }) => {
    await openFixture(page, 'number-stepper', 'light');
    const units = page.getByTestId('vr-ns-units');
    await units.click();
    await units.press('ArrowUp');
    await expect(units).toHaveValue('60');
    await units.press('Shift+ArrowDown');
    await expect(units).toHaveValue('10');
    const price = page.getByTestId('vr-ns-price');
    await price.click();
    await price.press('ArrowUp');
    await expect(price).toHaveValue('487.6');
    const atMax = page.getByTestId('vr-ns-max');
    await atMax.click();
    await atMax.press('ArrowUp');
    await expect(atMax).toHaveValue('5000');
  });

  test('PercentageInput refuses a third fraction place and can show Devanagari numerals', async ({ page }) => {
    await openFixture(page, 'percentage-input', 'light');
    const input = page.getByTestId('vr-pct');
    await input.click();
    await input.pressSequentially('0.125');
    await expect(input).toHaveValue('0.12');
    await expect(page.getByLabel('Interest rate (Devanagari)')).toHaveValue('११.२५');
  });

  test('OtpInput moves forward, backspaces and keeps the boxes left to right', async ({ page }) => {
    await openFixture(page, 'otp-input', 'light');
    const group = page.getByRole('group', { name: 'Verification code (empty)' });
    const boxes = group.getByRole('textbox');
    await boxes.first().click();
    await page.keyboard.type('4829');
    await expect(boxes.nth(3)).toHaveValue('9');
    await expect(boxes.nth(4)).toBeFocused();
    await page.keyboard.press('Backspace');
    await expect(boxes.nth(3)).toHaveValue('');
    await expect(boxes.nth(3)).toBeFocused();
    await expect(group).toHaveAttribute('dir', 'ltr');
  });

  test('StatementUpload takes a CSV, lists it, removes it and refuses a text file', async ({ page }) => {
    await openFixture(page, 'statement-upload', 'light');
    const group = page.getByRole('group', { name: 'Broker statement' }).first();
    await group.locator('input[type="file"]').setInputFiles({ name: 'trade-book.csv', mimeType: 'text/csv', buffer: Buffer.from('symbol,qty\nNABIL,10\n') });
    await expect(group.locator('.pu-upload-name', { hasText: 'trade-book.csv' })).toBeVisible();
    await group.getByRole('button', { name: 'Remove trade-book.csv' }).click();
    await expect(group.locator('.pu-upload-name', { hasText: 'trade-book.csv' })).toHaveCount(0);
    await expect(group.getByRole('button', { name: 'Choose file' })).toBeFocused();
    await group.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await expect(group.getByRole('alert')).toContainText('notes.txt is not a supported file');
  });

  test('DateRangePicker applies a preset in one click', async ({ page }) => {
    await openFixture(page, 'date-range-presets', 'light');
    await page.getByTestId('vr-drpp-trigger').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Last 30 days' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('vr-drpp-input')).toHaveValue('2025-10-16');
    await expect(page.getByTestId('vr-drpp-end-input')).toHaveValue('2025-11-14');
  });
});
