import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { normalizeSiteConfig, parseSiteConfigDocument } from "../../packages/core/src/index.mjs";
import { assertExternalOutput, validateSiteRoot } from "../site-contract.mjs";
import {
  categoryDisplayLabel,
  comparePosts,
  loadSiteTaxonomy,
  resolvePostCategory,
  tagDisplayLabel,
} from "../../apps/web/src/lib/taxonomy.ts";

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

test("dangerous and unknown YAML tags fail closed", () => {
  // Tags the core schema resolves into host objects (Set, Date) are caught by
  // the plain-data check; tags it cannot resolve fail as invalid YAML.
  assert.throws(() => parseSiteConfigDocument("schemaVersion: !!set { a }\n"), /plain YAML data/);
  assert.throws(() => parseSiteConfigDocument("schemaVersion: !!timestamp 2026-01-01\n"), /plain YAML data/);
  assert.throws(() => parseSiteConfigDocument("schemaVersion: !!js/regexp /x/\n"), /invalid YAML/);
  assert.throws(() => parseSiteConfigDocument("schemaVersion: !!python/object:os.system\n"), /invalid YAML/);
  assert.throws(() => parseSiteConfigDocument('schemaVersion: !!js/function "function(){}"\n'), /invalid YAML/);
  assert.throws(() => parseSiteConfigDocument('site:\n  title: !!binary "aGk="\n'), /plain YAML data/);
});

test("alias expansion is bounded and literal merge keys fail field validation", () => {
  // Billion-laughs style alias expansion: the parser's alias budget stops it.
  assert.throws(
    () => parseConfig("a: &a [x, x]\nb: &b [*a, *a]\nc: &c [*b, *b]\nd: &d [*c, *c]\ne: &e [*d, *d]\nf: &f [*e, *e]\nschemaVersion: *f\n"),
    /invalid YAML/,
  );
  // A recursive anchor must be rejected with a contract error, not a stack
  // overflow escaping the parser.
  assert.throws(() => parseConfig("a: &x\n  b: *x\nschemaVersion: *x\n"), /circular reference/);
  // YAML 1.2 keeps `<<` as a literal key; it does not merge the mapping.
  // The contract must reject that key through unknown-field validation.
  const literal = parseSiteConfigDocument("schemaVersion: 2\n<<: { a: 1 }\n");
  assert.deepEqual(literal["<<"], { a: 1 });
  assert.equal(Object.hasOwn(literal, "a"), false);
  assert.throws(
    () => parseConfig("schemaVersion: 2\n<<: { a: 1 }\n"),
    /unknown config field/,
  );
});
test("shared aliases are not circular references", () => {
  // Reusing one anchored mapping under two fields maps both to the same JS
  // object instance: a DAG, not a cycle. The plain-data check must let it
  // through (field validation rejects unknown fields separately).
  const shared = parseSiteConfigDocument("site: &s { title: t, url: https://e.com, locale: zh-CN }\nextra: *s\n");
  assert.equal(shared.extra, shared.site);
  assert.equal(shared.site.title, "t");
  // A genuine cycle (a mapping containing itself) is still rejected.
  assert.throws(() => parseSiteConfigDocument("a: &x\n  b: *x\n"), /circular reference/);
});

test("non-string mapping keys and wrong field types fail closed", () => {
  // A numeric key is not one of the known config fields.
  assert.throws(() => parseConfig("1: x\nschemaVersion: 2\n"), /unknown config field/);
  // Core fields with wrong data shapes are rejected by the schema.
  assert.throws(() => parseConfig("schemaVersion: [2]\n"), /schemaVersion/);
  assert.throws(
    () => parseConfig("schemaVersion: 2\nsite:\n  title: t\n  url: 42\n  locale: zh-CN\nlocales:\n  - zh-CN\n"),
    /site\.url/,
  );
  assert.throws(
    () => parseConfig("schemaVersion: 2\nsite:\n  title: t\n  url: https://e.com\n  locale:\n    - zh-CN\nlocales:\n  - zh-CN\n"),
    /site\.locale/,
  );
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
  fs.mkdirSync(path.join(site, "content", "posts", "assets"), { recursive: true });
  fs.copyFileSync(path.join(DEMO, "assets", "orion.svg"), path.join(site, "content", "posts", "assets", "orion.svg"));
  fs.writeFileSync(
    path.join(site, "content", "posts", "relative-image.md"),
    ["---", 'title: "Relative image"', 'description: "Post-relative image under a nested base."', "pubDate: 2026-10-24", 'tags: ["Test"]', "---", "", "![orion](./assets/orion.svg)", ""].join("\n"),
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
  const relativeArticle = fs.readFileSync(path.join(out, "site", "posts", "relative-image", "index.html"), "utf8");
  const relativeSrc = relativeArticle.match(/<img[^>]*src="([^"]+orion[^"]*)"/)?.[1];
  assert.ok(relativeSrc, "relative image must render under a nested base");
  assert.match(relativeSrc, /^\/ALNILAM\/_astro\//, "relative image must be base-prefixed: " + relativeSrc);
  assert.equal(fs.existsSync(path.join(out, "site", decodeURIComponent(relativeSrc).replace(/^\/ALNILAM\//, "").replace(/^\//, ""))), true);
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

test("compose rejects a temporary directory inside the Site without modifying it", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-temp-site-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const entries = fs.readdirSync(site);
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, TMPDIR: site }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Temporary directory must not be inside the Site source/);
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.deepEqual(fs.readdirSync(site), entries);
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
  // Default base is "/", so the build-space copy must be served from /_astro/.
  assert.match(src, /^\/_astro\//, "relative image must be served from the /_astro/ build-space prefix");
  assert.equal(fs.existsSync(path.join(root, "out", decodeURIComponent(src).replace(/^\//, ""))), true, "rendered image must exist in the output: " + src);
  assert.deepEqual(
    fs.readdirSync(root).filter((entry) => entry.startsWith(".alnilam-build-") || entry.includes(".alnilam-backup-")),
    [],
    "no build residue may remain outside the managed cache",
  );
});

test("hostile Core revisions map to a safe hashed cache key", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-revesc-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const cache = path.join(root, "cache");
  fs.mkdirSync(cache);
  fs.writeFileSync(path.join(cache, "keep.txt"), "must survive");
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: cache, ALNILAM_CORE_REV: "../../../..", SOURCE_DATE_EPOCH: "1700000000" }, encoding: "utf8",
  });
  assert.equal(result.status, 0, "hostile revision must hash to a safe key: " + result.stderr);
  const revisions = fs.readdirSync(path.join(cache, "v1"));
  assert.equal(revisions.length, 1);
  assert.match(revisions[0], /^[0-9a-f]{16}$/, "revision key must be a 16-hex digest");
  assert.equal(fs.existsSync(path.join(cache, "keep.txt")), true, "cache siblings must survive");
  assert.equal(fs.existsSync(path.join(root, "out", "alnilam-provenance.json")), true);
});

test("concurrent composes of the same revision are serialized by the cache lock", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-lock-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const cache = path.join(root, "cache");
  const revKey = crypto.createHash("sha256").update("lock-test").digest("hex").slice(0, 16);
  const buildDir = path.join(cache, "v1", revKey, digest);
  // A fresh lock means another compose is mid-build: the second must fail closed.
  fs.mkdirSync(buildDir, { recursive: true });
  const lock = path.join(buildDir, ".compose-lock");
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, token: "fresh", startedAt: new Date().toISOString() }));
  const blocked = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: cache, ALNILAM_CORE_REV: "lock-test" }, encoding: "utf8",
  });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /Another compose is building this Site revision/);
  // A lock whose holder is gone is a crash leftover: stolen immediately. The
  // fixture PID is above Linux pid_max (4194304), so no live process can hold it.
  const unassignablePid = 2 ** 22 + 12345;
  fs.writeFileSync(lock, JSON.stringify({ pid: unassignablePid, token: "crash", startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() }));
  fs.mkdirSync(path.join(buildDir, "site.staging-999999"), { recursive: true });
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: cache, ALNILAM_CORE_REV: "lock-test", SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "crash-leftover lock must be stolen: " + result.stderr);
  assert.equal(fs.existsSync(lock), false, "lock must be released after a successful build");
  assert.equal(fs.existsSync(path.join(buildDir, "site.staging-999999")), false, "orphaned staging dirs must be swept");
  assert.equal(validateSiteRoot(site).digest, digest);
  // A live holder is still displaced once its lock exceeds the six-hour bound.
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, token: "expired", startedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() }));
  const displaced = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: cache, ALNILAM_CORE_REV: "lock-test", SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(displaced.status, 0, "expired live-holder lock must be stolen: " + displaced.stderr);
  assert.equal(fs.existsSync(lock), false, "lock must be released again");
});

test("compose refuses symlink-poisoned cache entries", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-symlink-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const cache = path.join(root, "cache");
  const revKey = crypto.createHash("sha256").update("poison-test").digest("hex").slice(0, 16);
  const buildDir = path.join(cache, "v1", revKey, validateSiteRoot(site).digest);
  fs.mkdirSync(buildDir, { recursive: true });
  const canary = path.join(root, "canary");
  fs.mkdirSync(canary);
  fs.writeFileSync(path.join(canary, "keep.txt"), "must survive");
  fs.symlinkSync(canary, path.join(buildDir, "site"));
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CACHE_DIR: cache, ALNILAM_CORE_REV: "poison-test" }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to remove a symbolic link/);
  assert.equal(fs.existsSync(path.join(canary, "keep.txt")), true, "symlink target must survive");
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
  const keyOf = (rev) => crypto.createHash("sha256").update(rev).digest("hex").slice(0, 16);
  assert.deepEqual(fs.readdirSync(path.join(cache, "v1")).sort(), [keyOf("rev-a"), keyOf("rev-b")].sort());
  const digest = validateSiteRoot(site).digest;
  assert.equal(fs.existsSync(path.join(cache, "v1", keyOf("rev-a"), digest, "site", "alnilam.config.yaml")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", keyOf("rev-a"), digest, "astro", "data-store.json")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", keyOf("rev-b"), digest, "astro", "data-store.json")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", keyOf("rev-a"), digest, "shirone", "generated", "local-icon-collections.ts")), true);
  assert.equal(fs.existsSync(path.join(cache, "v1", keyOf("rev-b"), digest, "shirone", "generated", "local-icon-collections.ts")), true);
  // Legacy cache locations are cleaned regardless of the cache root choice.
  const legacyRoot = path.join(root, "legacy-repo");
  fs.mkdirSync(path.join(legacyRoot, "apps/web/node_modules/.astro"), { recursive: true });
  fs.mkdirSync(path.join(legacyRoot, "apps/web/.astro"), { recursive: true });
  fs.mkdirSync(path.join(legacyRoot, "apps/web/.shirones"), { recursive: true });
  fs.mkdirSync(path.join(legacyRoot, "apps/web/src/generated"), { recursive: true });
  fs.writeFileSync(path.join(legacyRoot, "apps/web/.astro", "stale.txt"), "x");
  fs.writeFileSync(path.join(legacyRoot, "apps/web/node_modules/.astro", "stale.txt"), "x");
  fs.writeFileSync(path.join(legacyRoot, "apps/web/.shirones", "stale.txt"), "x");
  fs.writeFileSync(path.join(legacyRoot, "apps/web/src/generated", "local-icon-collections.ts"), "x");
  const clean = spawnSync(process.execPath, ["scripts/compose.mjs", "--clean-cache"], {
    env: { ...composeEnv, ALNILAM_REPO_ROOT: legacyRoot }, encoding: "utf8",
  });
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(fs.existsSync(path.join(cache, "v1")), false);
  assert.equal(fs.existsSync(path.join(legacyRoot, "apps/web/.astro")), false);
  assert.equal(fs.existsSync(path.join(legacyRoot, "apps/web/node_modules/.astro")), false);
  assert.equal(fs.existsSync(path.join(legacyRoot, "apps/web/.shirones")), false);
  assert.equal(fs.existsSync(path.join(legacyRoot, "apps/web/src/generated")), false);
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
  // The demo fixture is not a Git repository and no ref was supplied.
  assert.equal(prov.site.ref, "unversioned");
  // Provenance schema versions the document format, independent of Site schemaVersion
  // (docs/ARCHITECTURE.md, build algorithm).
  assert.equal(prov.schema, 1);
  assert.match(prov.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("provenance writes the Site ref into the published document", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-site-ref-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const git = (...args) => spawnSync("git", ["-C", site, ...args], { encoding: "utf8" });
  assert.equal(git("init", "-q").status, 0);
  assert.equal(git("add", "-A").status, 0);
  const committed = git("-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "site");
  assert.equal(committed.status, 0, committed.stderr);
  const head = git("rev-parse", "HEAD").stdout.trim();
  // End-to-end: the resolved Site ref reaches the published provenance.
  // Branch coverage for resolution lives in scripts/tests/site-ref.test.mjs.
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, ALNILAM_CORE_REV: "core-rev", SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const prov = JSON.parse(fs.readFileSync(path.join(root, "out", "alnilam-provenance.json"), "utf8"));
  assert.equal(prov.site.ref, head);
});

test("two parallel composes serialize: exactly one publishes, the loser fails closed", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-compose-lock-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const env = { ...process.env, ALNILAM_CORE_REV: "lockrace-core", SOURCE_DATE_EPOCH: "1700000000" };
  // Regression guard: compose must actually call buildLock.acquire() — the
  // shared apps/web/.astro state corrupts concurrent builds otherwise.
  const run = (out) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, out)], { env });
      let text = "";
      child.stdout.on("data", (d) => (text += d));
      child.stderr.on("data", (d) => (text += d));
      child.on("exit", (status) => resolve({ out, status, text }));
    });
  const results = await Promise.all([run("out-a"), run("out-b")]);
  const winners = results.filter((r) => r.status === 0);
  const losers = results.filter((r) => r.status !== 0);
  assert.equal(winners.length, 1, "exactly one compose may hold the build state: " + results.map((r) => r.out + "=" + r.status + "\n" + r.text.slice(-2500)).join("\n"));
  assert.equal(losers.length, 1);
  assert.match(losers[0].text, /Another compose is building this Site revision/);
  assert.equal(fs.existsSync(path.join(root, losers[0].out)), false, "the blocked compose must not publish");
  assert.equal(validateSiteRoot(site).digest, digest);
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

// ---------------------------------------------------------------------------
// #62 content model: taxonomy catalog, category resolution, series and ordering
// ---------------------------------------------------------------------------

const taxonomyConfig = parseConfig(`
schemaVersion: 2
site:
  title: Taxonomy fixture
  url: https://example.com
  locale: zh-CN
locales:
  - zh-CN
  - en
categories:
  - id: guide
    slug: guide
    label:
      zh-CN: 指南
      en: Guide
tags:
  - id: astro
    slug: astro
    label:
      zh-CN: Astro
      en: Astro
`);

test("taxonomy catalog resolves ids, slugs and localized labels to canonical slugs", () => {
  const entries = taxonomyConfig.categories;
  assert.equal(resolvePostCategory("guide", entries), "guide");
  assert.equal(resolvePostCategory("指南", entries), "guide");
  assert.equal(resolvePostCategory("  guide  ", entries), "guide");
  assert.equal(resolvePostCategory("", entries), "");
  assert.equal(resolvePostCategory(undefined, entries), "");
  // Without a declared catalog, frontmatter values pass through untouched.
  assert.equal(resolvePostCategory("anything", []), "anything");
  assert.equal(categoryDisplayLabel("guide", entries, "zh-CN"), "指南");
  assert.equal(categoryDisplayLabel("guide", entries, "en"), "Guide");
  // Unknown locales fall back through zh-CN then en then the slug.
  assert.equal(categoryDisplayLabel("guide", entries, "ja"), "指南");
  assert.equal(categoryDisplayLabel("bare", entries, "en"), "bare");
});

test("unknown post category fails closed against a declared catalog", () => {
  assert.throws(
    () => resolvePostCategory("nope", taxonomyConfig.categories),
    /post references unknown category "nope" \(declared categories: guide\)/,
  );
});

test("display tags and taxonomy.yaml merging stay catalog-consistent", () => {
  assert.equal(tagDisplayLabel("Astro", taxonomyConfig.tags, "zh-CN"), "Astro");
  assert.equal(tagDisplayLabel("guide", [{ id: "guide", slug: "guide", label: { "zh-CN": "指南", en: "Guide" } }], "en"), "Guide");
  assert.equal(tagDisplayLabel("freeform", [], "en"), "freeform");
});

test("data/taxonomy.yaml extends the catalog; duplicates and unknown fields fail closed", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-taxonomy-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // Absent file: config catalog passes through unchanged.
  const bare = loadSiteTaxonomy(root, taxonomyConfig);
  assert.deepEqual(bare.categories, taxonomyConfig.categories);
  fs.mkdirSync(path.join(root, "data"));
  fs.writeFileSync(
    path.join(root, "data/taxonomy.yaml"),
    "categories:\n  - id: lab\n    slug: lab\n    label:\n      zh-CN: 实验室\n      en: Lab\n",
  );
  const merged = loadSiteTaxonomy(root, taxonomyConfig);
  assert.deepEqual(merged.categories.map((e) => e.slug), ["guide", "lab"]);
  // Duplicate id against the config catalog fails closed.
  fs.writeFileSync(
    path.join(root, "data/taxonomy.yaml"),
    "categories:\n  - id: guide\n    slug: other\n    label:\n      en: Other\n",
  );
  assert.throws(() => loadSiteTaxonomy(root, taxonomyConfig), /duplicate categories id "guide"/);
  // Unknown top-level fields are rejected.
  fs.writeFileSync(path.join(root, "data/taxonomy.yaml"), "collections: []\n");
  assert.throws(() => loadSiteTaxonomy(root, taxonomyConfig), /unknown data\/taxonomy\.yaml field/);
});

test("comparePosts pins first, then newest, then id for a deterministic order", () => {
  const mk = (id, pubDate, pinned) => ({ id, data: { pubDate: new Date(pubDate), pinned } });
  const posts = [
    mk("b", "2026-01-02"),
    mk("c", "2026-01-01", true),
    mk("a", "2026-01-01"),
    mk("d", "2026-03-01"),
  ];
  assert.deepEqual([...posts].sort(comparePosts).map((p) => p.id), ["c", "d", "b", "a"]);
});

test("compose fails closed on an unknown post category without touching the Site", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-badcat-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "bad-category.md"),
    ["---", 'title: "Bad category"', 'description: "Unknown taxonomy reference."', "pubDate: 2026-10-28", 'category: "ghost"', 'tags: ["Test"]', "---", "", "Unknown category fixture.", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0, "an unknown category must fail the build");
  assert.match(result.stderr + result.stdout, /post references unknown category "ghost"/);
  assert.equal(validateSiteRoot(site).digest, digest, "Site inputs must stay untouched");
  assert.equal(fs.existsSync(path.join(root, "out")), false, "failed build must not publish");
});

test("compose fails closed on a duplicate translationKey within one locale", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-duptk-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "posts", "en", "hello-duplicate.md"),
    ["---", 'title: "Hello duplicate"', 'description: "Duplicate translationKey fixture."', "pubDate: 2026-10-29", 'category: "release"', 'lang: "en"', 'translationKey: "hello-alnilam"', 'tags: ["Test"]', "---", "", "Duplicate translationKey fixture.", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, "out")], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0, "a duplicate translationKey per locale must fail the build");
  assert.match(result.stderr + result.stdout, /duplicate translationKey "hello-alnilam" for locale "en"/);
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.equal(fs.existsSync(path.join(root, "out")), false);
});

test("taxonomy, series and pinned frontmatter compose category, tag and series routes", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-content-model-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site-source");
  fs.cpSync(DEMO, site, { recursive: true });
  fs.mkdirSync(path.join(site, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(site, "data/taxonomy.yaml"),
    "categories:\n  - id: lab\n    slug: lab\n    label:\n      zh-CN: 实验室\n      en: Lab\ntags:\n  - id: series\n    slug: series\n    label:\n      zh-CN: 系列\n      en: Series\n",
  );
  fs.mkdirSync(path.join(site, "content", "series"), { recursive: true });
  fs.writeFileSync(
    path.join(site, "content", "series", "demo-series.md"),
    ["---", 'title: "Demo Series"', "status: completed", 'defaultCategory: "lab"', "---", "", "Series overview body.", ""].join("\n"),
  );
  fs.writeFileSync(
    path.join(site, "content", "posts", "pinned-post.md"),
    ["---", 'title: "置顶文章"', 'description: "Pinned fixture."', "pubDate: 2020-01-01", 'category: "lab"', 'pinned: true', 'series: "demo-series"', "seriesOrder: 2", 'tags: ["Test"]', "---", "", "Pinned fixture.", ""].join("\n"),
  );
  fs.writeFileSync(
    path.join(site, "content", "posts", "series-part-one.md"),
    ["---", 'title: "Series one"', 'description: "Series order one."', "pubDate: 2026-05-01", 'series: "demo-series"', "seriesOrder: 1", 'category: "guide"', 'tags: ["Test"]', "---", "", "First member.", ""].join("\n"),
  );
  const digest = validateSiteRoot(site).digest;
  const out = path.join(root, "out");
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], {
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" }, encoding: "utf8",
  });
  assert.equal(result.status, 0, "content-model compose failed: " + result.stderr.slice(-2500));
  assert.equal(validateSiteRoot(site).digest, digest, "Site inputs must stay untouched");

  // /categories/ index links both catalog-backed slugs.
  const catIndex = fs.readFileSync(path.join(out, "categories", "index.html"), "utf8");
  for (const slug of ["guide", "release", "lab"]) {
    assert.match(catIndex, new RegExp(`href="/categories/${slug}/"`), `categories index must link ${slug}`);
  }
  // /categories/<slug>/ renders the localized catalog label and its members.
  const labPage = fs.readFileSync(path.join(out, "categories", "lab", "index.html"), "utf8");
  assert.match(labPage, /<title>实验室 - ALNILAM<\/title>/, "category page uses the zh-CN catalog label");
  assert.match(labPage, /\/posts\/pinned-post\//, "category page lists its posts");
  const guidePage = fs.readFileSync(path.join(out, "categories", "guide", "index.html"), "utf8");
  assert.match(guidePage, /<title>指南 - ALNILAM<\/title>/);
  // Tags routes exist for catalog and free-form tags.
  const labTag = fs.readFileSync(path.join(out, "tags", "test", "index.html"), "utf8");
  assert.match(labTag, /\/posts\/pinned-post\//, "tag route lists matching posts");

  // Series collection drives /series/ and /series/<slug>/ ordering.
  const seriesIndex = fs.readFileSync(path.join(out, "series", "index.html"), "utf8");
  assert.match(seriesIndex, /\/series\/demo-series\//, "series index links the series");
  const seriesDetail = fs.readFileSync(path.join(out, "series", "demo-series", "index.html"), "utf8");
  assert.match(seriesDetail, /<title>Demo Series - ALNILAM<\/title>/);
  const memberOrder = [...seriesDetail.matchAll(/href="\/posts\/([^"/]+)\/"/g)].map((m) => m[1]);
  assert.deepEqual(memberOrder, ["series-part-one", "pinned-post"], "members follow seriesOrder, not pubDate");

  // Pinned posts sort first on the paginated list even with an old pubDate:
  // the pinned fixture must precede the newest regular post.
  const postsPage = fs.readFileSync(path.join(out, "posts", "index.html"), "utf8");
  const cardOrder = [...postsPage.matchAll(/href="\/posts\/([^"/]+)\/"/g)].map((m) => m[1]).filter((slug) => slug !== "page");
  assert.ok(cardOrder.length >= 2, "post list must render card links: " + cardOrder.join(","));
  assert.equal(cardOrder[0], "pinned-post", "pinned fixture must lead the list");

  // Article pages expose the resolved category as article:section.
  const article = fs.readFileSync(path.join(out, "posts", "pinned-post", "index.html"), "utf8");
  assert.match(article, /<meta property="article:section" content="lab">/);
  assert.match(article, /\/categories\/lab\//, "article links its category route");
});
