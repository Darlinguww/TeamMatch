import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**'],
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 30_000
  }
});
