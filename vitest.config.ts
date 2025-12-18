import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "@/": `${__dirname}/`,
      "@": path.dirname(fileURLToPath(import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "lib/audio/noiseReduction.test.ts", // DOMに依存しているためスキップ
      "test/test-utils.ts", // テストユーティリティなので除外
      // TODO: DOM依存のテストをサポートする方法を検討
    ],
    testTimeout: 20000, // API calls might take time
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
