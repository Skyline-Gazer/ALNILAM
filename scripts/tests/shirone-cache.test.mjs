import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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

test("different input keys share verified content without sharing module instances", async (t) => {
  const root = fixture(t);
  const artifactStoreDir = path.join(root, "objects");
  const inputA = { outputDir: path.join(root, "input-a", "loaded"), artifactStoreDir, cacheKey: "config:site", inputKey: "a".repeat(64) };
  const inputB = { outputDir: path.join(root, "input-b", "loaded"), artifactStoreDir, cacheKey: "config:site", inputKey: "b".repeat(64) };
  let builds = 0;
  const build = () => {
    builds += 1;
    return "export const value = { count: 1 };";
  };

  const first = await loadBundledArtifact({ ...inputA, build });
  const firstModule = await import(first.url);
  const second = await loadBundledArtifact({ ...inputB, build });
  const secondModule = await import(second.url);
  assert.equal(first.hit, false);
  assert.equal(second.hit, false, "a new input fingerprint still compiles independently");
  assert.equal(first.file, second.file, "identical bytes resolve to one immutable object");
  assert.notEqual(first.url, second.url, "logical module identities remain distinct");
  assert.notStrictEqual(firstModule, secondModule);
  assert.notStrictEqual(firstModule.value, secondModule.value);
  assert.equal(fs.readdirSync(artifactStoreDir).filter((name) => name.endsWith(".mjs")).length, 1);

  const hit = await loadBundledArtifact({ ...inputB, build: () => { throw new Error("matching input must reuse its manifest"); } });
  assert.equal(hit.hit, true);
  assert.equal(hit.url, second.url);
  assert.equal(builds, 2);

  fs.writeFileSync(first.file, "export const value = { count: 99 };");
  const repaired = await loadBundledArtifact({ ...inputA, build });
  assert.equal(repaired.hit, false, "a corrupt shared object must be rebuilt");
  assert.equal(repaired.file, first.file, "repair republishes the expected content address");
  assert.equal(fs.readFileSync(repaired.file, "utf8"), "export const value = { count: 1 };");
  assert.equal((await import(repaired.url)).value.count, 1);
  const otherHit = await loadBundledArtifact({ ...inputB, build: () => { throw new Error("repaired shared object must be reusable"); } });
  assert.equal(otherHit.hit, true);
  assert.equal(builds, 3);
});

test("legacy input-key manifests migrate verified bundles into the object store", async (t) => {
  const root = fixture(t);
  const outputDir = path.join(root, "input", "loaded");
  const artifactStoreDir = path.join(root, "objects");
  const inputKey = "c".repeat(64);
  const cacheKey = "pkg:config/legacy.ts";
  const cacheKeyHash = crypto.createHash("sha256").update(cacheKey).digest("hex").slice(0, 24);
  const code = "export const migrated = true;";
  const artifactHash = crypto.createHash("sha256").update(code).digest("hex");
  const filename = `${cacheKeyHash}.${artifactHash}.mjs`;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, filename), code);
  fs.writeFileSync(path.join(outputDir, `${cacheKeyHash}.manifest.json`), JSON.stringify({ schema: 1, inputKey, file: filename, artifactHash }) + "\n");

  const migrated = await loadBundledArtifact({
    outputDir,
    artifactStoreDir,
    cacheKey,
    inputKey,
    build: () => { throw new Error("a verified legacy object must migrate without rebuilding"); },
  });
  assert.equal(migrated.hit, true);
  assert.equal(migrated.file, path.join(artifactStoreDir, `${artifactHash}.mjs`));
  assert.equal((await import(migrated.url)).migrated, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, `${cacheKeyHash}.manifest.json`), "utf8"));
  assert.deepEqual(manifest, { schema: 2, inputKey, cacheKeyHash, artifactHash });
});

test("concurrent corrupt artifact repairs atomically preserve the deterministic object", async (t) => {
  const root = fixture(t);
  const options = { outputDir: path.join(root, "loaded"), artifactStoreDir: path.join(root, "objects"), cacheKey: "pkg:config/repair.ts", inputKey: "d".repeat(64) };
  const code = "export const repaired = true;";
  const initial = await loadBundledArtifact({ ...options, build: () => code });
  fs.writeFileSync(initial.file, "export const repaired = false;");

  let arrivals = 0;
  let release;
  const bothReady = new Promise((resolve) => { release = resolve; });
  const build = async () => {
    arrivals += 1;
    if (arrivals === 2) release();
    await bothReady;
    return code;
  };
  const repaired = await Promise.all([
    loadBundledArtifact({ ...options, build }),
    loadBundledArtifact({ ...options, build }),
  ]);

  assert.equal(repaired[0].file, repaired[1].file);
  assert.equal(fs.readFileSync(repaired[0].file, "utf8"), code);
  assert.equal((await import(repaired[0].url)).repaired, true);
  const hit = await loadBundledArtifact({ ...options, build: () => { throw new Error("repaired artifact must be reusable"); } });
  assert.equal(hit.hit, true);
});

test("concurrent input keys publish one complete shared object", async (t) => {
  const root = fixture(t);
  const artifactStoreDir = path.join(root, "objects");
  const code = "export const ready = true;";
  let arrivals = 0;
  let release;
  const bothReady = new Promise((resolve) => { release = resolve; });
  const build = async () => {
    arrivals += 1;
    if (arrivals === 2) release();
    await bothReady;
    return code;
  };
  const results = await Promise.all([
    loadBundledArtifact({ outputDir: path.join(root, "input-a", "loaded"), artifactStoreDir, cacheKey: "pkg:config/site.ts", inputKey: "e".repeat(64), build }),
    loadBundledArtifact({ outputDir: path.join(root, "input-b", "loaded"), artifactStoreDir, cacheKey: "pkg:config/site.ts", inputKey: "f".repeat(64), build }),
  ]);
  assert.equal(results[0].file, results[1].file);
  assert.notEqual(results[0].url, results[1].url);
  assert.equal((await import(results[0].url)).ready, true);
  assert.equal((await import(results[1].url)).ready, true);
  assert.equal(fs.readdirSync(artifactStoreDir).filter((name) => name.endsWith(".mjs")).length, 1);
  const next = await loadBundledArtifact({
    outputDir: path.join(root, "input-a", "loaded"),
    artifactStoreDir,
    cacheKey: "pkg:config/site.ts",
    inputKey: "e".repeat(64),
    build: () => { throw new Error("published artifact must be reusable"); },
  });
  assert.equal(next.hit, true);
});
