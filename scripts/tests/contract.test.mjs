import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";
import { assertExternalOutput, validateSiteRoot } from "../site-contract.mjs";

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

