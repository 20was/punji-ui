import { defineConfig, devices } from '@playwright/test';

// Visual regression and browser accessibility gate. See docs/VISUAL-TESTING.md.
// Baselines are Linux/Chromium and are only valid when rendered inside the
// official Playwright container (npm run test:visual:docker).
const port = 4173;
const base = `http://127.0.0.1:${port}`;

const viewport = (name: string, width: number, height: number, layoutOnly = false) => ({
  name,
  metadata: { layoutOnly },
  use: { ...devices['Desktop Chrome'], viewport: { width, height }, deviceScaleFactor: 1, hasTouch: false, isMobile: false },
});

export default defineConfig({
  testDir: 'test/visual/specs',
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/../__screenshots__/{projectName}/{arg}-{platform}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixelRatio: 0.001, threshold: 0.2 },
  },
  use: { baseURL: base, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'Asia/Kathmandu', trace: 'retain-on-failure' },
  projects: [
    viewport('m390', 390, 844),
    viewport('t768', 768, 1024),
    viewport('d1440', 1440, 900),
    viewport('m375', 375, 812, true),
    viewport('t1024', 1024, 768, true),
    viewport('w1920', 1920, 1080, true),
  ],
  webServer: {
    command: 'npm run visual:serve',
    url: base,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
  },
});
