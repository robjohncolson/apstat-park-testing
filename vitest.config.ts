import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'packages/*/src/**/*.test.ts',
      'apps/web/src/**/*.test.tsx'
    ],
    environmentMatchGlobs: [
      ['apps/web/src/**', 'jsdom'],
      ['packages/**', 'node']
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
}); 