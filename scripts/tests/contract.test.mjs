import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizeSiteConfig, parseSiteConfigDocument } from "../../packages/core/src/index.mjs";
import { assertExternalOutput, validateSiteRoot } from "../site-contract.mjs";
import { spawnSync } from "node:child_process";

const validYaml = `
schemaVersion: 2
site:
  title: ALNILAM
  url: https://example.com
  locale: zh-CN
locales:
  - zh-CN
  - en
theme:
  appearance: dark
`;

function parseConfig(yaml) {
  return normalizeSiteConfig(parseSiteConfigDocument(yaml));
}

test("valid schema v2 YAML is normalized", () => {
  const x = parseConfig(validYaml);
  assert.equal(x.site.title, "ALNILAM");
  assert.equal(x.schemaVersion, 2);
  assert.deepEqual(x.locales, ["zh-CN", "en"]);
});

test("reject malformed site and URL schemes", () => {
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: ""\n  url: https://example.com\n`), /site.title/);
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: hi\n  url: file:///x\n`), /site.url/);
});

test("schema v2 is the only supported version and fails closed on unknown versions", () => {
  assert.throws(() => parseConfig(`schemaVersion: 1\nsite:\n  title: t\n  url: https://e.com\n`), /schemaVersion/);
  for (const bad of [0, -1, 1.5, null, true, 3, "1"]) {
    assert.throws(() => parseConfig(`schemaVersion: ${bad}\nsite:\n  title: t\n  url: https://e.com\n`), /schemaVersion/);
  }
});

test("unknown config fields fail closed", () => {
  assert.throws(() => parseConfig(`${validYaml}\nlegacy: true\n`), /unknown config field "legacy"/);
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: t\n  url: https://e.com\n  timezone: UTC\n`), /unknown site field "timezone"/);
});

test("taxonomy and locale fields are validated", () => {
  assert.throws(() => parseConfig(`${validYaml}\ncategories:\n  - id: Tech\n    slug: tech\n`), /id must be a stable lowercase ASCII slug/);
  assert.throws(() => parseConfig(`${validYaml}\ntags:\n  - id: astro\n    slug: astro\n  - id: astro\n    slug: duplicate\n`), /duplicate tags id "astro"/);
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: t\n  url: https://e.com\n  locale: zh-CN\nlocales:\n  - en\n`), /site.locale must appear in locales/);
  assert.throws(() => parseConfig(`${validYaml}\nrouting:\n  prefixDefaultLocale: maybe\n`), /prefixDefaultLocale must be a boolean/);
});

test("comments module: disabled by default, giscus fields validated when enabled", () => {
  const off = parseConfig(validYaml);
  assert.equal(off.comments.enabled, false);
  assert.throws(() => parseConfig(`${validYaml}\ncomments:\n  enabled: true\n`), /comments.repo/);
  const on = parseConfig(`${validYaml}\ncomments:\n  enabled: true\n  repo: o/r\n  repoId: R_1\n  category: Announcements\n  categoryId: DIC_1\n`);
  assert.equal(on.comments.enabled, true);
});

test("demo Site is valid and the read-only digest is stable", () => {
  const a = validateSiteRoot("sites/demo");
  const b = validateSiteRoot("sites/demo");
  assert.equal(a.digest, b.digest);
  assert.match(a.digest, /^[a-f0-9]{64}$/);
});

test("nested-base output keeps canonical and internal links inside /ALNILAM/", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-base-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const site = path.join(out, "site-source");
  fs.cpSync("sites/demo", site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "pagination-regression.md"),
    ["---", 'title: "Pagination regression"', 'description: "Sixth post exercises page two under a nested base."', "pubDate: 2026-10-24", 'tags: ["Test"]', "---", "", "Pagination regression fixture.", ""].join("\n"),
  );
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(out, "site")], {
    env: { ...process.env, ALNILAM_SITE_URL: "https://example.com/ALNILAM/", SOURCE_DATE_EPOCH: "1700000000" },
  });
  assert.equal(result.status, 0, "nested-base compose failed: " + result.stderr);
  const html = fs.readFileSync(path.join(out, "site", "index.html"), "utf8");
  const posts = fs.readFileSync(path.join(out, "site", "posts", "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/ALNILAM\/">/);
  assert.doesNotMatch(html, /href="\/(?!ALNILAM\/)/);
  assert.match(posts, /<a href="\/ALNILAM\/posts\/2\/" rel="next"/);
});

test("compose rejects a post slug that collides with a pagination route without changing the Site", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-post-route-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync("sites/demo", site, { recursive: true });
  fs.writeFileSync(path.join(site, "content", "posts", "2.md"), ["---", 'title: "Numeric slug"', 'description: "Pagination collision fixture."', "pubDate: 2026-10-25", 'tags: ["Test"]', "---", "", "Numeric slug fixture.", ""].join("\n"));
  const digest = validateSiteRoot(site).digest;
  const output = path.join(root, "output");
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", output], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Post slug "2" conflicts with pagination route \/posts\/2\//);
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.equal(fs.existsSync(output), false);
});

test("output paths cannot overlap the Site source", () => {
  assert.throws(() => assertExternalOutput("sites/demo", "sites/demo/dist"));
  assert.throws(() => assertExternalOutput("sites/demo", "sites"));
});

test("compose writes deterministic provenance binding Core rev and Site digest", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-prov-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", "sites/demo", "--out", path.join(out, "site")], {
    env: { ...process.env, ALNILAM_CORE_REV: "test-core-rev-1234", SOURCE_DATE_EPOCH: "1700000000" },
  });
  assert.equal(result.status, 0, "compose failed: " + result.stderr);
  const prov = JSON.parse(fs.readFileSync(path.join(out, "site", "alnilam-provenance.json"), "utf8"));
  assert.equal(prov.core.revision, "test-core-rev-1234");
  assert.equal(prov.site.digest, validateSiteRoot("sites/demo").digest);
  assert.equal(prov.schema, 1);
});

test("symlinks in Site inputs are rejected", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "content/posts"), { recursive: true });
  fs.writeFileSync(path.join(root, "alnilam.config.yaml"), validYaml);
  try {
    fs.symlinkSync(path.join(root, "alnilam.config.yaml"), path.join(root, "content/posts/unsafe.md"));
  } catch {
    t.skip("symlinks unavailable");
    return;
  }
  assert.throws(() => validateSiteRoot(root), /symlinks/);
});

test("legacy Site v1 fixture is rejected by the YAML-only contract", () => {
  assert.throws(() => validateSiteRoot("tests/fixtures/site-v1-legacy"), /Site missing required input: alnilam.config.yaml/);
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
});

test("upgrade-check rejects missing or malformed --old revision", () => {
  for (const args of [[], ["--old", "not-a-sha"], ["--old", "zzzz"]]) {
    const result = spawnSync(process.execPath, ["scripts/upgrade-check.mjs", ...args]);
    assert.equal(result.status, 2, "expected exit 2 for args: " + args.join(" "));
  }
});
