/// <reference types="vitest" />
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: (() => {
      // Force Vitest/Vite to always resolve React from the monorepo root to avoid duplicate instances
      const baseAliases: Record<string, string> = {
        react: path.resolve(__dirname, "../../node_modules/react"),
        "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
        '@apstatchain/core': path.resolve(__dirname, '../../packages/chain-core/src/index.ts'),
        '@apstatchain/p2p': path.resolve(__dirname, '../../packages/chain-p2p/src/index.ts'),
      };

      // When running under Vitest (process.env.VITEST set), alias blockchain libs to mocks
      if (process.env.VITEST) {
        Object.assign(baseAliases, {
          "@apstatchain/core": path.resolve(__dirname, "./src/__mocks__/apstatchain-core.ts"),
          "@apstatchain/p2p": path.resolve(__dirname, "./src/__mocks__/apstatchain-p2p.ts"),
        });
      }

      return baseAliases;
    })(),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    exclude: ["**/e2e/**", "**/node_modules/**", "**/dist/**"],
    environmentOptions: {
      jsdom: {
        resources: "usable",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/setupTests.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "dist/",
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
  },
});
