import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'packages/*/test/**/*.test.{js,mjs}'],
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
    typecheck: { include: ['test/types/**/*.test-d.ts'], tsconfig: './tsconfig.json' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/*.css'],
      reporter: ['text-summary', 'json-summary'],
      // Ratchet: measured 2026-11 at 93.21 / 87.20 / 93.27 / 96.13 (statements / branches / functions / lines).
      // Set a little below so CI fails on regression; raise these when coverage rises, never lower them.
      thresholds: { statements: 92, branches: 86, functions: 92, lines: 95 },
    },
  },
});
