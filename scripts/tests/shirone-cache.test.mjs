import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { loadBundledArtifact } from "../../themes/shirone/upstream/src/integration/resolve/bundle-cache.mjs";
import { shironeBuildInputKey } from "../shirone-input-key.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-shirone-cache-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function createInputTree(root) {
  for (const dir of ["apps/web/src", "themes/shirone/upstream/src/config"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const file of [
    "package.json",
    "pnpm-lock.yaml",
    "apps/web/astro.config.mjs",
    "themes/shirone/package.json",
    "themes/shirone/upstream/src/config/site.ts",
  ]) {
    fs.writeFileSync(path.join(root, file), file + "\n");
  }
  fs.mkdirSync(path.join(root, "sites/demo/content/posts"), { recursive: true });
  fs.writeFileSync(path.join(root, "sites/demo/content/posts/entry.md"), "site input\n");
}

test("Shirone input identity ignores Site changes and tracks compiler inputs", (t) => {
  const root = fixture(t);
  createInputTree(root);
  const first = shironeBuildInputKey(root, { version: "v24", platform: "linux", arch: "x64" });
  fs.writeFileSync(path.join(root, "sites/demo/content/posts/entry.md"), "changed Site\n");
  assert.equal(shironeBuildInputKey(root, { version: "v24", platform: "linux", arch: "x64" }), first);
  fs.writeFileSync(path.join(root, "themes/shirone/upstream/src/config/site.ts"), "changed Core config\n");
  assert.notEqual(shironeBuildInputKey(root, { version: "v24", platform: "linux", arch: "x64" }), first);
});

test("Shirone input identity tracks dependency, compiler configuration, and runtime changes", (t) => {
  const root = fixture(t);
  createInputTree(root);
  const runtime = { version: "v24", platform: "linux", arch: "x64" };
  const baseline = shironeBuildInputKey(root, runtime);
  for (const relative of ["pnpm-lock.yaml", "apps/web/astro.config.mjs"]) {
    const file = path.join(root, relative);
    const original = fs.readFileSync(file);
    fs.appendFileSync(file, "changed input\n");
    assert.notEqual(shironeBuildInputKey(root, runtime), baseline, `${relative} must invalidate compiled artifacts`);
    fs.writeFileSync(file, original);
  }
  for (const changedRuntime of [
    { ...runtime, version: "v25" },
    { ...runtime, platform: "darwin" },
    { ...runtime, arch: "arm64" },
  ]) {
    assert.notEqual(shironeBuildInputKey(root, changedRuntime), baseline, "runtime identity must invalidate compiled artifacts");
  }
});

test("Shirone input identity refuses symlinked compiler inputs", (t) => {
  const root = fixture(t);
  createInputTree(root);
  const outside = path.join(root, "outside.ts");
  fs.writeFileSync(outside, "outside\n");
  fs.symlinkSync(outside, path.join(root, "apps/web/src/linked.ts"));
  assert.throws(() => shironeBuildInputKey(root), /symlink in Shirone build inputs/);
});

test("compiled artifacts reuse verified input hits and rebuild corrupt objects", async (t) => {
  const outputDir = path.join(fixture(t), "loaded");
  const inputKey = "a".repeat(64);
  let builds = 0;
  const build = () => {
    builds += 1;
    return `export const value = ${builds};`;
  };
  const first = await loadBundledArtifact({ outputDir, cacheKey: "config:site", inputKey, build });
  assert.equal(first.hit, false);
  const firstModule = await import(pathToFileURL(first.file).href);
  assert.equal(firstModule.value, 1);
  const hit = await loadBundledArtifact({
    outputDir,
    cacheKey: "config:site",
    inputKey,
    build: () => { throw new Error("input hit must not compile again"); },
  });
  assert.equal(hit.hit, true);
  assert.equal(hit.file, first.file);
  assert.equal(builds, 1);
  const changedInput = await loadBundledArtifact({
    outputDir,
    cacheKey: "config:site",
    inputKey: "c".repeat(64),
    build,
  });
  assert.equal(changedInput.hit, false, "a different compiler input fingerprint must rebuild");
  assert.equal((await import(pathToFileURL(changedInput.file).href)).value, 2);
  const changedInputHit = await loadBundledArtifact({
    outputDir,
    cacheKey: "config:site",
    inputKey: "c".repeat(64),
    build: () => { throw new Error("matching compiler input must reuse its artifact"); },
  });
  assert.equal(changedInputHit.hit, true);
  assert.equal(builds, 2);

  fs.writeFileSync(changedInput.file, "export const value = 99;");
  const repaired = await loadBundledArtifact({ outputDir, cacheKey: "config:site", inputKey: "c".repeat(64), build });
  assert.equal(repaired.hit, false);
  assert.equal((await import(pathToFileURL(repaired.file).href)).value, 3);
  assert.notEqual(crypto.createHash("sha256").update(fs.readFileSync(repaired.file)).digest("hex"), "0".repeat(64));
});

test("concurrent compiled artifact publication leaves a complete reusable object", async (t) => {
  const outputDir = path.join(fixture(t), "loaded");
  const options = { outputDir, cacheKey: "pkg:config/site.ts", inputKey: "b".repeat(64), build: async () => "export const ready = true;" };
  const results = await Promise.all([
    loadBundledArtifact(options),
    loadBundledArtifact(options),
  ]);
  assert.equal(results[0].file, results[1].file);
  assert.equal((await import(pathToFileURL(results[0].file).href)).ready, true);
  const next = await loadBundledArtifact({ ...options, build: () => { throw new Error("published artifact must be reusable"); } });
  assert.equal(next.hit, true);
});
