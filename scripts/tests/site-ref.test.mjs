// Unit tests for the pure Site/Core ref resolution used in build provenance
// (#54): branch coverage without running full Astro builds.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveSiteRef } from "../site-ref.mjs";

const git = (dir, ...args) =>
  spawnSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    env: { ...process.env, GIT_AUTHOR_NAME: "fixture", GIT_AUTHOR_EMAIL: "fixture@example.invalid", GIT_COMMITTER_NAME: "fixture", GIT_COMMITTER_EMAIL: "fixture@example.invalid" },
  });

test("a Site that is its own Git root contributes its HEAD", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-siteref-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  assert.equal(git(dir, "init", "-q").status, 0);
  fs.writeFileSync(path.join(dir, "marker"), "x");
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "site").status, 0);
  const head = git(dir, "rev-parse", "HEAD").stdout.trim();
  assert.equal(resolveSiteRef(dir), head);
});

test("a Site nested in another repository is unversioned", (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-siteref-"));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  assert.equal(git(parent, "init", "-q").status, 0);
  const nested = path.join(parent, "nested", "site");
  fs.mkdirSync(nested, { recursive: true });
  assert.equal(resolveSiteRef(nested), "unversioned");
});

test("a Site without a Git root or with a broken .git is unversioned", (t) => {
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-siteref-"));
  t.after(() => fs.rmSync(plain, { recursive: true, force: true }));
  assert.equal(resolveSiteRef(plain), "unversioned");
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-siteref-"));
  t.after(() => fs.rmSync(broken, { recursive: true, force: true }));
  fs.mkdirSync(path.join(broken, ".git"));
  assert.equal(resolveSiteRef(broken), "unversioned");
});

test("an explicit override wins and a malformed one fails closed", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-siteref-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const sha = "b".repeat(40);
  assert.equal(resolveSiteRef(dir, sha), sha);
  assert.throws(() => resolveSiteRef(dir, "not-a-sha"), /ALNILAM_SITE_REF must be a full lowercase commit SHA/);
});
