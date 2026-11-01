import { expect, test } from '@playwright/test';
import { fixtures, themes } from '../manifest.ts';
import { openFixture } from './helpers.ts';

// One screenshot per fixture, theme and viewport. Layout-only projects
// (375, 1024, 1920) capture just the fixtures flagged `layout`.
for (const fixture of fixtures) {
  for (const theme of themes) {
    test(`${fixture.id} (${theme})`, async ({ page }, info) => {
      test.skip(Boolean(info.project.metadata.layoutOnly) && !fixture.layout, 'viewport reserved for layout-sensitive fixtures');
      test.skip(Boolean(fixture.pending), 'baseline not recorded yet: npm run test:visual:update');
      await openFixture(page, fixture.id, theme);
      const target = fixture.page ? page : page.locator('[data-fixture]');
      await expect(target).toHaveScreenshot(`${fixture.id}-${theme}.png`, { fullPage: fixture.page && fixture.id === 'shell' ? true : undefined });
    });
  }
}
