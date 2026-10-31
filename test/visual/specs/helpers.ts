import { expect, type Page } from '@playwright/test';
import { fixtureUrl, type Theme } from '../manifest.ts';

/** Opens one fixture in one theme and waits until fonts and layout are settled. */
export async function openFixture(page: Page, id: string, theme: Theme, extra = ''): Promise<void> {
  await page.goto(fixtureUrl(id, theme, extra));
  await expect(page.locator('[data-fixture]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Two frames so layout effects (popover placement, table sizing) have run.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
