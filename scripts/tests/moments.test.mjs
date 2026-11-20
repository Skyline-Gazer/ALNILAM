import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";
import { momentsPath, momentsRouteLocales, normalizeMomentImageUrl } from "../../apps/web/src/lib/moments.mjs";
import { validateSiteRoot } from "../site-contract.mjs";

function baseConfig(extra = {}) {
  return {
    schemaVersion: 2,
    site: { title: "Moments Test", url: "https://moments.example/", locale: "zh-CN" },
    locales: ["zh-CN", "en", "ja"],
    ...extra,
  };
}

test("Moments Site config is opt-in and rejects unknown or malformed values", () => {
  assert.equal(normalizeSiteConfig(baseConfig()).moments.enabled, false);
  assert.equal(normalizeSiteConfig(baseConfig({ moments: { enabled: true } })).moments.enabled, true);
  assert.throws(() => normalizeSiteConfig(baseConfig({ moments: { enabled: "true" } })), /moments\.enabled/);
  assert.throws(() => normalizeSiteConfig(baseConfig({ moments: { source: "remote" } })), /unknown moments field/);
});

test("Moments routes follow the Site default-locale prefix policy", () => {
  const unprefixed = normalizeSiteConfig(baseConfig());
  assert.deepEqual(momentsRouteLocales(unprefixed), ["en", "ja"]);
  assert.equal(momentsPath("zh-CN", unprefixed), "/moments/");
  assert.equal(momentsPath("ja", unprefixed), "/ja/moments/");

  const prefixed = normalizeSiteConfig(baseConfig({ routing: { prefixDefaultLocale: true } }));
  assert.deepEqual(momentsRouteLocales(prefixed), ["zh-CN", "en", "ja"]);
  assert.equal(momentsPath("zh-CN", prefixed), "/zh-CN/moments/");
});

test("Moments image references preserve Site paths and HTTPS query strings", () => {
  assert.equal(normalizeMomentImageUrl("assets/moments/photo.jpg?size=large#frame"), "/site-assets/moments/photo.jpg?size=large#frame");
  assert.equal(normalizeMomentImageUrl("/site-assets/photo.jpg?sig=a%2Fb"), "/site-assets/photo.jpg?sig=a%2Fb");
  assert.equal(normalizeMomentImageUrl("https://cdn.example/photo.jpg?sig=abc"), "https://cdn.example/photo.jpg?sig=abc");
});

test("Moments image references reject unsafe schemes and traversal", () => {
  for (const value of ["http://cdn.example/photo.jpg", "//cdn.example/photo.jpg", "javascript:alert(1)", "../private.jpg", "%2e%2e/private.jpg", "assets\\private.jpg"]) {
    assert.throws(() => normalizeMomentImageUrl(value), /content\/moments image/);
  }
});

test("disabled Moments ignores its content and emits no route or navigation entry", (t) => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-moments-off-"));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const site = path.join(scratch, "site");
  const output = path.join(scratch, "output");
  fs.cpSync("sites/demo", site, { recursive: true });

  const configPath = path.join(site, "alnilam.config.yaml");
  const config = fs.readFileSync(configPath, "utf8");
  fs.writeFileSync(configPath, config.replace("moments:\n  enabled: true", "moments:\n  enabled: false"));
  const momentFile = path.join(site, "content/moments/2026-11-14-site-owned.md");
  fs.writeFileSync(momentFile, "invalid frontmatter that is ignored when the module is off");
  const digest = validateSiteRoot(site).digest;

  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", output], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ALNILAM_CACHE_DIR: path.join(scratch, "cache"),
      ALNILAM_CORE_REV: "moments-disabled-test",
      SOURCE_DATE_EPOCH: "1700000000",
    },
  });
  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  for (const route of ["moments/index.html", "en/moments/index.html", "ja/moments/index.html"]) {
    assert.equal(fs.existsSync(path.join(output, route)), false, `unexpected route ${route}`);
  }
  const home = fs.readFileSync(path.join(output, "index.html"), "utf8");
  assert.doesNotMatch(home, /data-nav-key="moments"|moment-section/);
  assert.equal(validateSiteRoot(site).digest, digest, "the build must not write into its Site input");
});
