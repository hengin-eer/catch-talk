import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "/utils/noiseReduction.test.ts", // DOMに依存しているためスキップ
      // TODO: DOM依存のテストをサポートする方法を検討
    ],
    testTimeout: 20000, // API calls might take time
    setupFiles: ["./test/setup.ts"],
  },
});
