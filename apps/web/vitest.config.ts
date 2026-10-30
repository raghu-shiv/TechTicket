import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,

    // Playwright tests are executed separately.
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
