// Reproducible-build and failure-recovery acceptance tests (#54 A1/A4):
// rebuilds with pinned inputs must be byte-identical, and a failed rebuild
// must never damage the published output or the Site.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { hashTree } from "../upgrade-check.mjs";
import { validateSiteRoot } from "../site-contract.mjs";

const DEMO = "sites/demo";

test("fixed inputs rebuild byte-identical output without touching the Site", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-repro-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const compose = (out) =>
    spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", path.join(root, out)], {
      env: { ...process.env, ALNILAM_CORE_REV: "repro-core", SOURCE_DATE_EPOCH: "1700000000" },
      encoding: "utf8",
    });
  const first = compose("out-a");
  assert.equal(first.status, 0, first.stderr);
  const second = compose("out-b");
  assert.equal(second.status, 0, second.stderr);
  assert.equal(hashTree(path.join(root, "out-b")), hashTree(path.join(root, "out-a")));
  assert.equal(validateSiteRoot(site).digest, digest);
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.startsWith(".alnilam-")), []);
});

test("a failed rebuild preserves the previous output and the Site", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-failrec-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const site = path.join(root, "site");
  fs.cpSync(DEMO, site, { recursive: true });
  const digest = validateSiteRoot(site).digest;
  const out = path.join(root, "out");
  const env = { ...process.env, ALNILAM_CORE_REV: "failrec-core", SOURCE_DATE_EPOCH: "1700000000" };
  const good = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], { env, encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  const published = hashTree(out);
  // A post missing pubDate passes the Site contract but fails the Astro
  // content schema inside the build.
  fs.writeFileSync(
    path.join(site, "content", "posts", "broken.md"),
    ["---", 'title: "Broken"', 'description: "missing pubDate"', "---", "", "Body.", ""].join("\n"),
  );
  const brokenDigest = validateSiteRoot(site).digest;
  assert.notEqual(brokenDigest, digest, "fixture must actually change the Site inputs");
  const bad = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], { env, encoding: "utf8" });
  assert.notEqual(bad.status, 0, "the broken build must fail");
  assert.match(bad.stderr + bad.stdout, /Astro build failed/);
  assert.equal(hashTree(out), published, "previously published output must survive a failed rebuild");
  assert.equal(fs.existsSync(path.join(out, "content", "posts", "broken.md")), false, "failed build must not leak into the published output");
  assert.equal(validateSiteRoot(site).digest, brokenDigest, "a failing build must not modify the Site");
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.startsWith(".alnilam-backup-")), [], "no backup may be left behind");
});
