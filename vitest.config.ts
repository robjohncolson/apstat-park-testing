import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Avoid multiple React copies confusing hooks
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@apstatchain/core': path.resolve(__dirname, 'packages/chain-core/src/index.ts'),
      '@apstatchain/p2p': path.resolve(__dirname, 'packages/chain-p2p/src/index.ts'),
    }
  },
  test: {
    globals: true,
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'apps/*/src/**/*.test.{ts,tsx}'
    ],
    environmentMatchGlobs: [
      ['packages/chain-core/src/**', 'happy-dom'],
      ['apps/**', 'happy-dom'],
      ['packages/**', 'node']
    ],
    // Register global matchers such as toBeInTheDocument
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html']
    }
  }
}); 