import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECKER = path.join(REPO_ROOT, "scripts/artifact-check.mjs");

function makeOutput(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-artifact-check-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, "dist", "site");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "index.html"),
    '<!doctype html><html lang="en"><head><title>Fixture</title></head><body><a class="skip-link" href="#main">Skip</a><main id="main"><h1>Fixture</h1></main></body></html>',
  );
  fs.writeFileSync(
    path.join(output, "alnilam-provenance.json"),
    JSON.stringify({ core: { revision: "fixture" }, site: { digest: "a".repeat(64) } }),
  );
  return { root, output };
}

function writeOutputFile(output, relativePath, contents = "fixture") {
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return target;
}

function check(output) {
  return spawnSync(process.execPath, [CHECKER, output], { cwd: REPO_ROOT, encoding: "utf8" });
}

test("allows public files, generated route slugs and a safe env example", (t) => {
  const { output } = makeOutput(t);
  for (const file of [
    "robots.txt",
    "sitemap.xml",
    "ads.txt",
    ".nojekyll",
    ".well-known/security.txt",
    "pagefind/pagefind.js",
    "site-assets/.well-known/security.txt",
    "site-assets/gallery/photo.webp",
    "data/search-index.json",
  ]) {
    writeOutputFile(output, file, "PUBLIC_PLACEHOLDER_ONLY=true\n");
  }
  for (const route of [
    "pages/coverage",
    "pages/guide/coverage",
    "posts/lighthouse",
    "en/posts/lighthouse",
  ]) {
    const routeIndex = path.join(output, route, "index.html");
    fs.mkdirSync(path.dirname(routeIndex), { recursive: true });
    fs.copyFileSync(path.join(output, "index.html"), routeIndex);
  }

  writeOutputFile(
    output,
    "docs/examples/.env.example",
    "# Public example only\nAPI_KEY=<your-api-key>\nSITE_URL=<replace-with-your-site-url>\n",
  );

  const result = check(output);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /BUDGETS OK/);
});

test("rejects local artifact directories nested below Site routes", (t) => {
  const { output } = makeOutput(t);
  writeOutputFile(
    output,
    "pages/guide/playwright-report/results.json",
    "ROUTE_ARTIFACT_SENTINEL_DO_NOT_PRINT\n",
  );

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(
    result.stderr,
    /pages\/guide\/playwright-report: local build or test artifact directory/,
  );
  assert.doesNotMatch(result.stdout + result.stderr, /ROUTE_ARTIFACT_SENTINEL_DO_NOT_PRINT/);
});
test("rejects report payloads inside route directories with an HTML index", (t) => {
  const { output } = makeOutput(t);
  const reportDir = path.join(output, "pages/guide/playwright-report");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.copyFileSync(path.join(output, "index.html"), path.join(reportDir, "index.html"));
  writeOutputFile(output, "pages/guide/playwright-report/results.json", "REPORT_SENTINEL_DO_NOT_PRINT\n");
  writeOutputFile(output, "pages/guide/playwright-report/trace.zip", "TRACE_SENTINEL_DO_NOT_PRINT\n");

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(
    result.stderr,
    /pages\/guide\/playwright-report\/results\.json: local build or test artifact file/,
  );
  assert.match(
    result.stderr,
    /pages\/guide\/playwright-report\/trace\.zip: local build or test artifact file/,
  );
  assert.doesNotMatch(result.stdout + result.stderr, /(?:REPORT|TRACE)_SENTINEL_DO_NOT_PRINT/);
});

test("rejects nested environment files without printing their contents", (t) => {
  const { output } = makeOutput(t);
  writeOutputFile(output, "site-assets/config/.env.production", "PRIVATE_SENTINEL_DO_NOT_PRINT=value\n");

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /site-assets\/config\/\.env\.production: environment file/);
  assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_SENTINEL_DO_NOT_PRINT/);
});

test("rejects non-placeholder and empty values in the documented env example", (t) => {
  const { output } = makeOutput(t);
  writeOutputFile(output, "docs/examples/.env.example", "API_KEY=ENV_EXAMPLE_SECRET_SENTINEL\n");

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /docs\/examples\/\.env\.example: environment file/);
  assert.doesNotMatch(result.stdout + result.stderr, /ENV_EXAMPLE_SECRET_SENTINEL/);
  fs.writeFileSync(path.join(output, "docs/examples/.env.example"), "API_KEY=\n");
  const emptyResult = check(output);
  assert.equal(emptyResult.status, 1, emptyResult.stderr);
  assert.match(emptyResult.stderr, /docs\/examples\/\.env\.example: environment file/);
});

test("rejects private-key, backup, credential and local evidence paths", (t) => {
  const { output } = makeOutput(t);
  writeOutputFile(output, "site-assets/keys/id_ed25519", "PRIVATE_KEY_SENTINEL\n");
  writeOutputFile(output, "site-assets/gallery/original.jpg~");
  writeOutputFile(output, "site-assets/.npmrc", "TOKEN_SENTINEL\n");
  writeOutputFile(output, "playwright-report/index.html");

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /site-assets\/keys\/id_ed25519: private-key filename/);
  assert.match(result.stderr, /site-assets\/gallery\/original\.jpg~: backup or temporary file/);
  assert.match(result.stderr, /site-assets\/\.npmrc: credential configuration/);
  assert.match(result.stderr, /playwright-report: local build or test artifact directory/);
  assert.doesNotMatch(result.stdout + result.stderr, /PRIVATE_KEY_SENTINEL|TOKEN_SENTINEL/);
});

test("rejects unapproved dot-directories while allowing .well-known resources", (t) => {
  const { output } = makeOutput(t);
  writeOutputFile(output, "site-assets/.history/session.json", "HIDDEN_SENTINEL_DO_NOT_PRINT\n");
  writeOutputFile(output, "site-assets/.well-known/security.txt", "Contact: security@example.com\n");

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /site-assets\/\.history: unapproved hidden directory/);
  assert.doesNotMatch(result.stderr, /site-assets\/\.well-known/);
  assert.doesNotMatch(result.stdout + result.stderr, /HIDDEN_SENTINEL_DO_NOT_PRINT/);
});

test("rejects symlinked entries and symlinked output roots", (t) => {
  const { root, output } = makeOutput(t);
  const outside = path.join(root, "outside.txt");
  writeOutputFile(root, "outside.txt", "OUTSIDE_SENTINEL\n");
  fs.mkdirSync(path.join(output, "site-assets"), { recursive: true });
  fs.symlinkSync(outside, path.join(output, "site-assets", "outside.txt"));

  const entryResult = check(output);
  assert.equal(entryResult.status, 1, entryResult.stderr);
  assert.match(entryResult.stderr, /site-assets\/outside\.txt: symbolic link/);
  assert.doesNotMatch(entryResult.stdout + entryResult.stderr, /OUTSIDE_SENTINEL/);

  const rootAlias = path.join(root, "site-alias");
  fs.symlinkSync(output, rootAlias, "dir");
  const rootResult = check(rootAlias);
  assert.equal(rootResult.status, 2, rootResult.stderr);
  assert.match(rootResult.stderr, /output path crosses a symbolic-link component/);
  const parentAlias = path.join(root, "root-alias");
  fs.symlinkSync(root, parentAlias, "dir");
  const ancestorResult = check(path.join(parentAlias, path.relative(root, output)));
  assert.equal(ancestorResult.status, 2, ancestorResult.stderr);
  assert.match(ancestorResult.stderr, /output path crosses a symbolic-link component/);
});

test("rejects a Site assets secret after Compose copies it into dist/site", (t) => {
  const { root, output } = makeOutput(t);
  const site = path.join(root, "site");
  fs.cpSync(path.join(REPO_ROOT, "sites/demo"), site, { recursive: true });
  fs.writeFileSync(path.join(site, "assets", ".env"), "SITE_SECRET_SENTINEL=value\n");

  const compose = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, "scripts/compose.mjs"), "--site", site, "--out", output],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, ALNILAM_CORE_REV: "artifact-check-fixture", SOURCE_DATE_EPOCH: "1700000000" },
      encoding: "utf8",
    },
  );
  assert.equal(compose.status, 0, compose.stdout + compose.stderr);
  assert.equal(fs.existsSync(path.join(output, "site-assets", ".env")), true);

  const result = check(output);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /site-assets\/\.env: environment file/);
  assert.doesNotMatch(result.stdout + result.stderr, /SITE_SECRET_SENTINEL/);
});
