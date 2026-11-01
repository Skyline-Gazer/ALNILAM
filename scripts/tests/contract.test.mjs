import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeSiteConfig, parseSiteConfigDocument } from "../../packages/core/src/index.mjs";
import { assertExternalOutput, validateSiteRoot } from "../site-contract.mjs";

const DEMO = "sites/demo";
const YAML_CONFIG = "alnilam.config.yaml";
const TOML_CONFIG = "alnilam.config.toml";
if (!fs.existsSync(path.join(DEMO, YAML_CONFIG)) || fs.existsSync(path.join(DEMO, TOML_CONFIG))) {
  throw new Error("demo Site must declare only alnilam.config.yaml");
}

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

const parseConfig = (text) =>
  normalizeSiteConfig(parseSiteConfigDocument(text, { filename: YAML_CONFIG }));

test("valid schema v2 YAML is normalized", () => {
  const value = parseConfig(validYaml);
  assert.equal(value.site.title, "ALNILAM");
  assert.equal(value.schemaVersion, 2);
});

test("reject malformed site and URL schemes", () => {
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: ""\n  url: https://example.com\n`), /site\.title/);
  assert.throws(() => parseConfig(`schemaVersion: 2\nsite:\n  title: hi\n  url: file:///x\n`), /site\.url/);
});

test("schema v2 is the only supported version and fails closed on unknown versions", () => {
  // A missing version must not be silently upgraded to the current schema.
  assert.throws(() => parseConfig(`site:\n  title: t\n  url: https://e.com\n`), /schemaVersion/);
  for (const bad of [1, 0, -1, 1.5, '"2"', null, true]) {
    assert.throws(
      () => parseConfig(`schemaVersion: ${bad}\nsite:\n  title: t\n  url: https://e.com\n`),
      /schemaVersion/,
    );
  }
});

test("unknown config fields fail closed", () => {
  assert.throws(() => parseConfig(`${validYaml}\nlegacy: true\n`), /unknown config field "legacy"/);
  assert.throws(
    () => parseConfig(`schemaVersion: 2\nsite:\n  title: t\n  url: https://e.com\n  timezone: UTC\n`),
    /unknown site field "timezone"/,
  );
});

test("locales are validated and must include site.locale", () => {
  assert.throws(
    () => parseConfig(validYaml.replace("  - zh-CN\n  - en", "  - en")),
    /site\.locale must appear in locales/,
  );
  assert.throws(
    () => parseConfig(`schemaVersion: 2\nsite:\n  title: t\n  url: https://e.com\nlocales: []\n`),
    /locales must be a non-empty array/,
  );
  assert.throws(
    () => parseConfig(validYaml.replace("  - zh-CN\n  - en", "  - zh-CN\n  - en\n  - en")),
    /duplicate locale/,
  );
  assert.throws(() => parseConfig(validYaml.replace("  - en", "  - not_a_tag")), /BCP-47/);
});

test("reserved routing and taxonomy catalogs are validated", () => {
  assert.throws(() => parseConfig(`${validYaml}\ncategories:\n  - id: Tech\n    slug: tech\n`), /id must be a stable lowercase ASCII slug/);
  assert.throws(
    () => parseConfig(`${validYaml}\ntags:\n  - id: astro\n    slug: astro\n  - id: astro\n    slug: duplicate\n`),
    /duplicate tags id "astro"/,
  );
  assert.throws(() => parseConfig(`${validYaml}\nrouting:\n  prefixDefaultLocale: maybe\n`), /prefixDefaultLocale must be a boolean/);
});

test("comments module: disabled by default, giscus fields validated when enabled", () => {
  const off = parseConfig(validYaml);
  assert.equal(off.comments.enabled, false);
  assert.equal(off.comments.provider, "giscus");
  assert.throws(() => parseConfig(`${validYaml}\ncomments:\n  enabled: true\n`), /comments\.repo/);
  assert.throws(
    () => parseConfig(`${validYaml}\ncomments:\n  enabled: true\n  repo: o/r\n  repoId: R\n  category: C\n`),
    /comments\.categoryId/,
  );
  assert.throws(
    () => parseConfig(`${validYaml}\ncomments:\n  enabled: true\n  provider: disqus\n  repo: o/r\n  repoId: R\n  category: C\n  categoryId: D\n`),
    /giscus/,
  );
  assert.throws(
    () => parseConfig(`${validYaml}\ncomments:\n  enabled: true\n  repo: o/r\n  repoId: R\n  category: C\n  categoryId: D\n  mapping: bogus\n`),
    /mapping/,
  );
  const on = parseConfig(`${validYaml}\ncomments:\n  enabled: true\n  repo: o/r\n  repoId: R_1\n  category: Announcements\n  categoryId: DIC_1\n`);
  assert.equal(on.comments.enabled, true);
  assert.equal(on.comments.mapping, "pathname");
});

test("YAML root documents must be mappings", () => {
  for (const text of ["42\n", "text\n", "- a\n- b\n", "---\n"]) {
    assert.throws(() => parseSiteConfigDocument(text), /must contain a YAML mapping/);
  }
});

test("unresolved YAML tags, duplicate keys and non-plain values fail closed", () => {
  assert.throws(() => parseSiteConfigDocument('schemaVersion: !!js/function "function(){}"\n'), /invalid YAML/);
  assert.throws(() => parseSiteConfigDocument("site:\n  title: a\n  title: b\n"), /invalid YAML/);
  // `!!binary` resolves to a Buffer without a parser warning; the contract
  // layer must still reject host objects.
  assert.throws(() => parseSiteConfigDocument('site:\n  title: !!binary "aGk="\n'), /plain YAML data/);
});

test("demo Site is valid and the read-only digest is stable", () => {
  const a = validateSiteRoot(DEMO);
  const b = validateSiteRoot(DEMO);
  assert.equal(a.digest, b.digest);
  assert.match(a.digest, /^[a-f0-9]{64}$/);
});

test("nested-base output keeps canonical and internal links inside /ALNILAM/", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-base-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const site = path.join(out, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "pagination-regression.md"),
    ["---", 'title: "Pagination regression"', 'description: "Sixth post exercises page two under a nested base."', "pubDate: 2026-10-24", 'tags: ["Test"]', "---", "", "Pagination regression fixture.", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(out, "site")], {
    env: { ...process.env, ALNILAM_SITE_URL: "https://example.com/ALNILAM/", SOURCE_DATE_EPOCH: "1700000000" },
  });
  assert.equal(result.status, 0, "nested-base compose failed: " + result.stderr);
  assert.equal(validateSiteRoot(site).digest, digest);
  const html = fs.readFileSync(path.join(out, "site", "index.html"), "utf8");
  const posts = fs.readFileSync(path.join(out, "site", "posts", "index.html"), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.com\/ALNILAM\/">/);
  assert.doesNotMatch(html, /href="\/(?!ALNILAM\/)/);
  assert.doesNotMatch(html, /href="\/ALNILAM\/\//);
  assert.doesNotMatch(posts, /href="\/(?!ALNILAM\/)/);
  assert.match(posts, /<a href="\/ALNILAM\/posts\/2\/" rel="next"/);
  assert.doesNotMatch(posts, /\/ALNILAM\/ALNILAM\//);
});

test("compose rejects a post slug that collides with a pagination route without changing the Site", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-post-route-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "2.md"),
    ["---", 'title: "Numeric slug"', 'description: "Pagination collision fixture."', "pubDate: 2026-10-25", 'tags: ["Test"]', "---", "", "Numeric slug fixture.", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const output = path.join(root, "output");
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(output, "previous.txt"), "previous successful build");
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", output], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /Post slug "2" conflicts with pagination route \/posts\/2\//);
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.equal(fs.readFileSync(path.join(output, "previous.txt"), "utf8"), "previous successful build");
  assert.deepEqual(fs.readdirSync(root).filter((entry) => entry.startsWith(".alnilam-build-")), []);
});

test("output paths cannot overlap the Site source", () => {
  assert.throws(() => assertExternalOutput(DEMO, path.join(DEMO, "dist")));
  assert.throws(() => assertExternalOutput(DEMO, "sites"));
});

test("compose rejects a cache directory inside the Site without modifying it", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-cache-site-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const entries = fs.readdirSync(site);
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: path.join(site, "cache") }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Cache directory must not be inside the Site source/);
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.deepEqual(fs.readdirSync(site), entries);
});

test("compose rejects a cache directory inside the output", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-cache-out-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const output = path.join(root, "out");
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", output], {
    env: { ...process.env, ALNILAM_CACHE_DIR: path.join(output, "cache") }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Cache directory must not be inside the output/);
  assert.equal(fs.existsSync(output), false);
});

test("relative post images render from the build space and repeated builds stay clean", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-relimg-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.mkdirSync(path.join(site, "content", "posts", "assets"), { recursive: true });
  fs.copyFileSync(path.join(DEMO, "assets", "orion.svg"), path.join(site, "content", "posts", "assets", "orion.svg"));
  fs.writeFileSync(
    path.join(site, "content", "posts", "rel-image.md"),
    ["---", 'title: "Relative image"', 'description: "Post-relative image fixture."', "pubDate: 2026-10-30", 'tags: ["Test"]', "---", "", "![orion](./assets/orion.svg)", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const postEntries = fs.readdirSync(path.join(site, "content", "posts")).sort();
  for (let run = 1; run <= 2; run++) {
    const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
      env: { ...process.env, ALNILAM_CACHE_DIR: path.join(root, "cache"), ALNILAM_CORE_REV: "cache-test", SOURCE_DATE_EPOCH: "1700000000" },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, "relative-image compose failed on run " + run + ": " + result.stderr);
    assert.equal(validateSiteRoot(site).digest, digest, "Site digest changed during build run " + run);
    assert.deepEqual(fs.readdirSync(path.join(site, "content", "posts")).sort(), postEntries, "Site content dir gained files on run " + run);
  }
  const html = fs.readFileSync(path.join(root, "out", "posts", "rel-image", "index.html"), "utf8");
  const src = html.match(/<img[^>]*src="([^"]+orion[^"]*)"/)?.[1];
  assert.ok(src, "relative image must render as an img element");
  assert.equal(fs.existsSync(path.join(root, "out", decodeURIComponent(src).replace(/^\//, ""))), true, "rendered image must exist in the output: " + src);
  assert.deepEqual(
    fs.readdirSync(root).filter((entry) => entry.startsWith(".alnilam-build-") || entry.includes(".alnilam-backup-")),
    [],
    "no build residue may remain outside the managed cache",
  );
});

test("external image URLs pass through and local site assets are served as-is", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-extimg-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "ext-image.md"),
    ["---", 'title: "External image"', 'description: "Remote image fixture."', "pubDate: 2026-10-30", 'tags: ["Test"]', "---", "", "![ext](https://example.com/cat.png)", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: path.join(root, "cache"), ALNILAM_CORE_REV: "cache-test", SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "external-image compose failed: " + result.stderr);
  assert.equal(validateSiteRoot(site).digest, digest);
  const html = fs.readFileSync(path.join(root, "out", "posts", "ext-image", "index.html"), "utf8");
  assert.match(html, /<img[^>]*src="https:\/\/example\.com\/cat\.png"/);
  assert.equal(fs.existsSync(path.join(root, "out", "site-assets", "orion.svg")), true);
});

test("build cache is version-isolated across Core revisions and cleanable", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-cacheiso-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  const cache = path.join(root, "cache");
  const composeEnv = { ...process.env, ALNILAM_CACHE_DIR: cache, SOURCE_DATE_EPOCH: "1700000000" };
  for (const rev of ["rev-a", "rev-b"]) {
    const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
      env: { ...composeEnv, ALNILAM_CORE_REV: rev }, encoding: "utf8",
    });
    assert.equal(result.status, 0, "compose failed for " + rev + ": " + result.stderr);
  }
  assert.deepEqual(fs.readdirSync(path.join(cache, "v1")).sort(), ["rev-a", "rev-b"]);
  const digest = validateSiteRoot(site).digest;
  assert.equal(fs.existsSync(path.join(cache, "v1", "rev-a", digest, "site", "alnilam.config.yaml")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", "rev-a", digest, "astro", "data-store.json")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", "rev-b", digest, "astro", "data-store.json")), true);
  const clean = spawnSync(process.execPath, ["scripts/compose.mjs", "--clean-cache"], { env: composeEnv, encoding: "utf8" });
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(fs.existsSync(path.join(cache, "v1")), false);
});

test("compose writes deterministic provenance binding Core rev and Site digest", (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-prov-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", DEMO, "--out", path.join(out, "site")], {
    env: { ...process.env, ALNILAM_CORE_REV: "test-core-rev-1234", SOURCE_DATE_EPOCH: "1700000000" },
  });
  assert.equal(result.status, 0, "compose failed: " + result.stderr);
  const prov = JSON.parse(fs.readFileSync(path.join(out, "site", "alnilam-provenance.json"), "utf8"));
  assert.equal(prov.core.revision, "test-core-rev-1234");
  assert.equal(prov.site.digest, validateSiteRoot(DEMO).digest);
  // Provenance schema versions the document format, independent of Site schemaVersion
  // (docs/ARCHITECTURE.md, build algorithm).
  assert.equal(prov.schema, 1);
  assert.match(prov.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("symlinks in Site inputs are rejected", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-contract-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "content/posts"), { recursive: true });
  const config = path.join(root, YAML_CONFIG);
  fs.writeFileSync(config, validYaml);
  try {
    fs.symlinkSync(config, path.join(root, "content/posts/unsafe.md"));
  } catch {
    t.skip("symlinks unavailable");
    return;
  }
  assert.throws(() => validateSiteRoot(root), /symlinks/);
});

test("v1 TOML Site is rejected by the YAML-only contract", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-toml-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.mkdirSync(path.join(site, "content/posts"), { recursive: true });
  fs.writeFileSync(
    path.join(site, "content/posts", "old-post.md"),
    ["---", 'title: "Old post"', 'description: "v1 fixture"', "pubDate: 2026-01-01", "---", "", "Body.", ""].join("\n"),
  );
  fs.writeFileSync(path.join(site, TOML_CONFIG), ['[site]', 'title = "Legacy"', 'url = "https://legacy.example.com"', ""].join("\n"));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "site")], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, "a TOML-only Site must fail the YAML-only contract");
  assert.match(result.stderr + result.stdout, /Site missing required input: alnilam\.config\.yaml/);
  assert.equal(fs.existsSync(path.join(root, "site")), false);
  assert.deepEqual(fs.readdirSync(root).filter((entry) => entry.startsWith(".alnilam-build-")), []);
});

test("upgrade-check classifies rollback outcomes", async () => {
  const { classifyRollback, isExpectedContractRejection } = await import("../upgrade-check.mjs");
  // The released v0.1.3 Core still requires the retired TOML file.
  const toml = "Error: Site missing required input: alnilam.config.toml";
  // A later Core that reads YAML but only supports schema v1. An uncaught
  // `throw new Error(...)` prints with the `Error: ` prefix; accept both forms
  // while the line stays anchored.
  const schema = "Error: ALNILAM: unsupported schemaVersion 2 (supported: 1). Upgrade Core to build this Site.";
  assert.equal(isExpectedContractRejection(toml), true);
  assert.equal(isExpectedContractRejection(schema), true);
  assert.equal(isExpectedContractRejection(schema.replace(/^Error: /, "")), true);
  // Indented stack frames, pnpm wrappers and unrelated failures do not qualify.
  assert.equal(isExpectedContractRejection("  at fail (" + toml + ")"), false);
  assert.equal(isExpectedContractRejection("ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL: " + schema), false);
  assert.equal(isExpectedContractRejection(""), false);
  // Execution-path classification: success, expected rejection, real failure.
  assert.equal(classifyRollback({ status: 0, output: "" }), "ok");
  assert.equal(classifyRollback({ status: 1, output: toml }), "expected-contract-failure");
  assert.equal(classifyRollback({ status: 1, output: schema }), "expected-contract-failure");
  assert.equal(classifyRollback({ status: 1, output: "ELIFECYCLE Command failed with exit code 1." }), "unexpected");
  assert.equal(classifyRollback({ status: 2, output: toml }), "unexpected");
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

test("upgrade-check resolveRevision verifies known local commits", async () => {
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
