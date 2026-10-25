import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";
import { assertExternalOutput, validateSiteRoot } from "../site-contract.mjs";
import { spawnSync } from "node:child_process";

test("valid configuration is normalized", () => {
  const x = normalizeSiteConfig({
    site: { title: "ALNILAM", url: "https://example.com" },
    theme: { appearance: "dark" },
  });
  assert.equal(x.site.title, "ALNILAM");
  assert.equal(x.schemaVersion, 1);
});
test("reject malformed site and URL schemes", () => {
  assert.throws(() => normalizeSiteConfig({ site: { title: "", url: "https://example.com" } }));
  assert.throws(() => normalizeSiteConfig({ site: { title: "hi", url: "file:///x" } }));
});
test("schema v1 is the only supported version and fails closed on unknown versions", () => {
  // Absent and explicit 1 are accepted and normalized to 1.
  assert.equal(normalizeSiteConfig({ site: { title: "t", url: "https://e.com" } }).schemaVersion, 1);
  assert.equal(normalizeSiteConfig({ schemaVersion: 1, site: { title: "t", url: "https://e.com" } }).schemaVersion, 1);
  // Future/unknown versions must be rejected, not silently mis-rendered.
  for (const bad of [2, 0, -1, 1.5, "1", null, true]) {
    assert.throws(() => normalizeSiteConfig({ schemaVersion: bad, site: { title: "t", url: "https://e.com" } }), /schemaVersion/);
  }
});
test("demo Site is valid and the read-only digest is stable", () => {
  const a = validateSiteRoot("sites/demo");
  const b = validateSiteRoot("sites/demo");
  assert.equal(a.digest, b.digest);
  assert.match(a.digest, /^[a-f0-9]{64}$/);
});
test("output paths cannot overlap the Site source", () => {
  assert.throws(() => assertExternalOutput("sites/demo", "sites/demo/dist"));
  assert.throws(() => assertExternalOutput("sites/demo", "sites"));
});
test("compose writes deterministic provenance binding Core rev and Site digest", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-prov-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", "sites/demo", "--out", path.join(out, "site")], {
    env: { ...process.env, ALNILAM_CORE_REV: "test-core-rev-1234" },
  });
  assert.equal(result.status, 0, "compose failed: " + result.stderr);
  const prov = JSON.parse(fs.readFileSync(path.join(out, "site", "alnilam-provenance.json"), "utf8"));
  assert.equal(prov.core.revision, "test-core-rev-1234");
  assert.equal(prov.site.digest, validateSiteRoot("sites/demo").digest);
  assert.equal(prov.schema, 1);
  assert.match(prov.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
test("symlinks in Site inputs are rejected", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "content/posts"), { recursive: true });
  fs.writeFileSync(path.join(root, "alnilam.config.toml"), "[site]\n");
  try {
    fs.symlinkSync(path.join(root, "alnilam.config.toml"), path.join(root, "content/posts/unsafe.md"));
  } catch {
    t.skip("symlinks unavailable");
    return;
  }
  assert.throws(() => validateSiteRoot(root), /symlinks/);
});
test("legacy Site (no schemaVersion, no i18n fields) builds and gets provenance", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-legacy-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", "sites/legacy-demo", "--out", path.join(out, "site")], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
  assert.equal(result.status, 0, "legacy Site compose failed: " + result.stderr);
  // Light theme config must actually render.
  const html = fs.readFileSync(path.join(out, "site", "index.html"), "utf8");
  assert.match(html, /data-theme="light"/);
  assert.match(html, /Legacy Site/);
  const prov = JSON.parse(fs.readFileSync(path.join(out, "site", "alnilam-provenance.json"), "utf8"));
  assert.equal(prov.schema, 1);
  assert.equal(prov.site.digest, validateSiteRoot("sites/legacy-demo").digest);
});
test("legacy Site digest is stable across reads", () => {
  const a = validateSiteRoot("sites/legacy-demo");
  const b = validateSiteRoot("sites/legacy-demo");
  assert.equal(a.digest, b.digest);
});
test("upgrade-check hashTree is content-addressed and filename-insensitive to order", async (t) => {
  const { hashTree } = await import("../upgrade-check.mjs");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-hash-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "nested"), { recursive: true });
  fs.writeFileSync(path.join(root, "a.txt"), "alpha");
  fs.writeFileSync(path.join(root, "nested/b.txt"), "beta");
  const base = hashTree(root);
  assert.match(base, /^[a-f0-9]{64}$/);
  // Same bytes in a differently-named tree must hash identically; the copy
  // lives in a separate temp dir (fs.cpSync refuses to copy into itself).
  const copyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-hash-copy-"));
  t.after(() => fs.rmSync(copyRoot, { recursive: true, force: true }));
  const copy = path.join(copyRoot, "renamed-tree");
  fs.cpSync(root, copy, { recursive: true });
  assert.equal(hashTree(copy), base);
  // A single byte flip must change the digest.
  fs.writeFileSync(path.join(root, "a.txt"), "alphA");
  assert.notEqual(hashTree(root), base);
});
test("upgrade-check rejects missing or malformed --old revision", () => {
  for (const args of [[], ["--old", "not-a-sha"], ["--old", "zzzz"]]) {
    const result = spawnSync(process.execPath, ["scripts/upgrade-check.mjs", ...args]);
    assert.equal(result.status, 2, "expected exit 2 for args: " + args.join(" "));
  }
});
test("upgrade-check resolveRevision verifies known local commits", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const repoTop = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const { resolveRevision } = await import("../upgrade-check.mjs");
  const short = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const full = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.equal(resolveRevision(short, repoTop), full);
  assert.equal(resolveRevision(full, repoTop), full);
  // Unresolvable revision throws; no worktree side effects.
  assert.throws(() => resolveRevision("zzzzzzz", repoTop), /fetch/);
});

