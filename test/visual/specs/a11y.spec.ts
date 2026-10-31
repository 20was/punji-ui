import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { fixtures, themes } from '../manifest.ts';
import { openFixture } from './helpers.ts';

// axe-core is already a devDependency; its source is injected into the page.
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

declare global {
  interface Window {
    axe: { run: (context?: unknown, options?: unknown) => Promise<{ violations: { id: string; impact: string | null; help: string; nodes: { target: unknown[] }[] }[] }> };
  }
}

// Every fixture, both themes, on the phone and desktop viewports.
for (const fixture of fixtures) {
  for (const theme of themes) {
    test(`axe: ${fixture.id} (${theme})`, async ({ page }, info) => {
      test.skip(!['m390', 'd1440'].includes(info.project.name), 'axe runs on the 390 and 1440 projects');
      await openFixture(page, fixture.id, theme);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, { resultTypes: ['violations'] });
        return result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id} [${v.impact}]: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join(' | ')}`);
      });
      expect(violations).toEqual([]);
    });
  }
}
