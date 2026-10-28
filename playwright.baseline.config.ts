import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "p1-baseline.spec.ts",
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "browser-results/p1/results.json" }]],
  outputDir: "browser-results/p1/test-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4323",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/preview-server.mjs --journal browser-results/p1/root-server.json --root dist/site --port 4323 --base /",
      url: "http://127.0.0.1:4323/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/preview-server.mjs --journal browser-results/p1/nested-server.json --root dist/nested-base --port 4324 --base /ALNILAM/",
      url: "http://127.0.0.1:4324/ALNILAM/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/preview-server.mjs --root dist/bangumi-root --port 4325 --base /",
      url: "http://127.0.0.1:4325/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/preview-server.mjs --root dist/bangumi-nested --port 4326 --base /ALNILAM/",
      url: "http://127.0.0.1:4326/ALNILAM/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
