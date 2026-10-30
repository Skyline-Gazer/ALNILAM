import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const candidateRoot = process.env.CNB_CANDIDATE_ROOT ?? process.cwd();
const trustedRoot = process.env.CNB_TRUSTED_SOURCE_ROOT ?? process.cwd();
const trustedGateRun = Boolean(process.env.CNB_CANDIDATE_ROOT);
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
const preview = path.join(trustedRoot, "scripts/preview-server.mjs");
const previewCommand = (journal: string, root: string, port: number, base: string) =>
  [process.execPath, preview, "--journal", journal, "--root", root, "--port", String(port), "--base", base].map(quote).join(" ");

export default defineConfig({
  testDir: "./tests/browser",
  testIgnore: "**/p1-baseline.spec.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? path.join(candidateRoot, "browser-results/results.json") }]],
  outputDir: trustedGateRun ? path.join(candidateRoot, "artifacts/cnb-browser/results") : path.join(candidateRoot, "browser-results/artifacts"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4323",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: previewCommand(path.join(candidateRoot, "artifacts/cnb-browser/root-server.json"), path.join(candidateRoot, "dist/site"), 4323, "/"),
      url: "http://127.0.0.1:4323/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: previewCommand(path.join(candidateRoot, "artifacts/cnb-browser/nested-server.json"), path.join(candidateRoot, "dist/nested-base"), 4324, "/ALNILAM/"),
      url: "http://127.0.0.1:4324/ALNILAM/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
