import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testIgnore: "**/p1-baseline.spec.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "browser-results/results.json" }]],
  outputDir: "browser-results/artifacts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4323",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node scripts/preview-server.mjs --journal browser-results/root-server.json --root dist/site --port 4323 --base /",
      url: "http://127.0.0.1:4323/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "node scripts/preview-server.mjs --journal browser-results/nested-server.json --root dist/nested-base --port 4324 --base /ALNILAM/",
      url: "http://127.0.0.1:4324/ALNILAM/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
