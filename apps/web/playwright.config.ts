import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/phase8",

  timeout: 180_000,

  expect: {
    timeout: 10_000,
  },

  fullyParallel: false,
  workers: 1,
  retries: 0,

  forbidOnly: Boolean(process.env.CI),

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "./playwright-report/phase8",
        open: "never",
      },
    ],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop-light",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
        colorScheme: "light",
      },
    },
    {
      name: "desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
        colorScheme: "dark",
      },
    },
    {
      name: "mobile-light",
      use: {
        ...devices["iPhone 13"],
        colorScheme: "light",
      },
    },
    {
      name: "mobile-dark",
      use: {
        ...devices["iPhone 13"],
        colorScheme: "dark",
      },
    },
  ],
});
