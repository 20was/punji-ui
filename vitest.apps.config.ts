import { defineConfig } from 'vitest/config';

// The docs apps' logic (site/src/apps) imports @punji/ui through its export map, so it needs `npm run build` first;
// run by `npm run test:apps` after the build (CI and verify), not by the main suite.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['site/src/apps/**/*.test.ts'],
  },
});
