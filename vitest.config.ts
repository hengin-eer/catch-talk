import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    alias: {
      "@/": `${__dirname}/`,
    },
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "lib/audio/noiseReduction.test.ts", // DOMに依存しているためスキップ
      // TODO: DOM依存のテストをサポートする方法を検討
    ],
    testTimeout: 20000, // API calls might take time
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
