import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Core-logic coverage gate (NFR-33, engineering-standards.md).
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
      include: ['src/**/*.ts'],
      // index.ts and scripts/* are entrypoints exercised only against a real DB.
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/scripts/**'],
    },
  },
});
