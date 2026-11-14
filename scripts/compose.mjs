#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot, assertExternalOutput, isWithin } from "./site-contract.mjs";
import { createBuildLock } from "./build-lock.mjs";
import { resolveSiteRef, resolveCoreRevision } from "./site-ref.mjs";
import { shironeBuildInputKey } from "./shirone-input-key.mjs";

const repoRoot = process.env.ALNILAM_REPO_ROOT
  ? path.resolve(process.env.ALNILAM_REPO_ROOT)
  : fileURLToPath(new URL("../", import.meta.url));
const toolchainRoot = process.env.ALNILAM_TOOLCHAIN_ROOT
  ? path.resolve(process.env.ALNILAM_TOOLCHAIN_ROOT)
  : repoRoot;
const externalToolchain = toolchainRoot !== repoRoot;
const toolchainCwd = externalToolchain ? path.join(repoRoot, "apps/web") : repoRoot;
// Match pnpm’s trusted virtual-store resolution without consulting candidate executables.
const toolchainEnv = externalToolchain ? { NODE_PATH: path.join(toolchainRoot, "node_modules/.pnpm/node_modules") } : {};
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const argv = process.argv.slice(2);
function option(flag, fallback) {
  const idx = argv.indexOf(flag);
  return idx < 0 ? fallback : argv[idx + 1];
}
if (argv.includes("--help")) {
  console.log("Usage: node scripts/compose.mjs [--site /path/to/site --out /path/to/output] [--clean-cache | --gc-cache [--dry-run] | --clean-legacy [--dry-run]]");
  process.exit(0);
}
const cleanCacheOnly = argv.includes("--clean-cache");
const cleanLegacyOnly = argv.includes("--clean-legacy");
const gcCacheOnly = argv.includes("--gc-cache");
const dryRun = argv.includes("--dry-run");
if ([cleanCacheOnly, cleanLegacyOnly, gcCacheOnly].filter(Boolean).length > 1) throw new Error("Choose one cache or legacy cleanup operation");
if (dryRun && !cleanLegacyOnly && !gcCacheOnly) throw new Error("--dry-run is supported with --gc-cache or --clean-legacy");
const cacheRoot = path.resolve(process.env.ALNILAM_CACHE_DIR || path.join(repoRoot, ".cache", "alnilam"));
const cacheOwnerFile = ".alnilam-cache-owner.json";
const cacheOwner = JSON.stringify({ owner: "ALNILAM", schema: 1 }) + "\n";
const CACHE_UNUSED_TTL_DAYS = Number(process.env.ALNILAM_CACHE_TTL_DAYS ?? 14);
const CACHE_UNUSED_TTL_MS = CACHE_UNUSED_TTL_DAYS * 24 * 60 * 60 * 1000;
const CACHE_MAX_BYTES = Number(process.env.ALNILAM_CACHE_MAX_BYTES ?? 2 * 1024 ** 3);
if (!Number.isSafeInteger(CACHE_UNUSED_TTL_DAYS) || CACHE_UNUSED_TTL_DAYS < 1) throw new Error("ALNILAM_CACHE_TTL_DAYS must be a positive integer");
if (!Number.isSafeInteger(CACHE_MAX_BYTES) || CACHE_MAX_BYTES < 1) throw new Error("ALNILAM_CACHE_MAX_BYTES must be a positive integer");
if (cacheRoot === path.parse(cacheRoot).root) throw new Error("Cache directory must not be the filesystem root");

function assertNoSymlinkPath(target) {
  const resolved = path.resolve(target);
  const { root } = path.parse(resolved);
  const parts = resolved.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) break;
    if (stat.isSymbolicLink()) throw new Error("Refusing a path with a symbolic-link component: " + current);
    if (index < parts.length - 1 && !stat.isDirectory()) throw new Error("Path ancestor is not a directory: " + current);
  }
}

function ensureManagedCacheRoot(create = false) {
  assertNoSymlinkPath(cacheRoot);
  let stat = fs.lstatSync(cacheRoot, { throwIfNoEntry: false });
  if (!stat && create) {
    fs.mkdirSync(cacheRoot, { recursive: true });
    assertNoSymlinkPath(cacheRoot);
    stat = fs.lstatSync(cacheRoot);
  }
  if (!stat) return false;
  if (!stat.isDirectory()) throw new Error("Managed cache root is not a directory: " + cacheRoot);
  const marker = path.join(cacheRoot, cacheOwnerFile);
  const markerStat = fs.lstatSync(marker, { throwIfNoEntry: false });
  if (!markerStat && create) {
    const entries = fs.readdirSync(cacheRoot);
    const managedEntries = entries.filter((entry) => ["v1", "bangumi", "shirone"].includes(entry));
    if (managedEntries.length > 0) throw new Error("Refusing an unmarked cache root containing managed namespace directories: " + cacheRoot);
    fs.writeFileSync(marker, cacheOwner, { flag: "wx" });
  } else if (!markerStat) {
    throw new Error("Cache root has no ALNILAM ownership marker: " + cacheRoot);
  } else if (markerStat.isSymbolicLink() || !markerStat.isFile() || fs.readFileSync(marker, "utf8") !== cacheOwner) {
    throw new Error("Cache root ownership marker is invalid: " + marker);
  }
  return true;
}

function rmTreeSafe(target) {
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isSymbolicLink()) throw new Error("Refusing to remove a symbolic link in the build cache: " + target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) rmTreeSafe(path.join(target, entry));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

function inspectTree(target) {
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat) return { type: "missing", files: 0, logicalBytes: 0, allocatedBytes: 0, empty: true };
  if (!stat.isDirectory() || stat.isSymbolicLink()) return { type: stat.isSymbolicLink() ? "symlink" : stat.isFile() ? "file" : "other", files: stat.isFile() ? 1 : 0, logicalBytes: stat.size, allocatedBytes: (stat.blocks ?? 0) * 512, empty: false };
  const result = { type: "directory", files: 0, logicalBytes: 0, allocatedBytes: 0, empty: true };
  for (const entry of fs.readdirSync(target)) {
    const child = inspectTree(path.join(target, entry));
    result.files += child.files;
    result.logicalBytes += child.logicalBytes;
    result.allocatedBytes += child.allocatedBytes;
    result.empty = false;
  }
  return result;
}

function assertNoSymlinksInTree(target, device) {
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isSymbolicLink()) throw new Error("Refusing a symbolic link in managed cache: " + target);
  if (stat.dev !== device) throw new Error("Refusing to cross a filesystem boundary in managed cache: " + target);
  if (stat.isFile() && stat.nlink > 1) throw new Error("Refusing a hard-linked managed cache file: " + target);
  if (stat.isDirectory()) for (const entry of fs.readdirSync(target)) assertNoSymlinksInTree(path.join(target, entry), device);
}
function cacheCandidates(device) {
  const candidates = [];
  const v1 = path.join(cacheRoot, "v1");
  if (fs.existsSync(v1)) {
    assertNoSymlinksInTree(v1, device);
    for (const key of fs.readdirSync(v1)) {
      if (!/^[a-f0-9]{16}$/.test(key)) throw new Error("Unexpected managed build-cache key: " + path.join(v1, key));
      const target = path.join(v1, key);
      if (!fs.lstatSync(target).isDirectory()) throw new Error("Unexpected managed build-cache entry: " + target);
      candidates.push({ path: target, kind: "build-revision" });
    }
  }

  const bangumi = path.join(cacheRoot, "bangumi");
  if (fs.existsSync(bangumi)) {
    assertNoSymlinksInTree(bangumi, device);
    candidates.push({ path: bangumi, kind: "bangumi-fallback" });
  }

  const shirone = path.join(cacheRoot, "shirone");
  if (fs.existsSync(shirone)) {
    assertNoSymlinksInTree(shirone, device);
    for (const key of fs.readdirSync(shirone)) {
      if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Unexpected Shirone input key: " + path.join(shirone, key));
      const target = path.join(shirone, key);
      if (!fs.lstatSync(target).isDirectory()) throw new Error("Unexpected Shirone cache entry: " + target);
      candidates.push({ path: target, kind: "shirone-bundle" });
    }
  }
  return candidates;
}

function measureManagedTree(target, device) {
  const result = { files: 0, logicalBytes: 0, allocatedBytes: 0 };
  const visit = (current) => {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("Refusing a symbolic link in managed cache: " + current);
    if (stat.dev !== device) throw new Error("Refusing to cross a filesystem boundary in managed cache: " + current);
    if (stat.isFile()) {
      if (stat.nlink > 1) throw new Error("Refusing a hard-linked managed cache file: " + current);
      result.files += 1;
      result.logicalBytes += stat.size;
      result.allocatedBytes += (stat.blocks ?? 0) * 512;
    } else if (stat.isDirectory()) {
      result.allocatedBytes += (stat.blocks ?? 0) * 512;
      for (const entry of fs.readdirSync(current)) visit(path.join(current, entry));
    } else {
      throw new Error("Unexpected managed cache file type: " + current);
    }
  };
  visit(target);
  return result;
}

function cacheLastUsed(target) {
  const marker = path.join(target, ".alnilam-last-used");
  if (fs.existsSync(marker)) {
    const stat = fs.lstatSync(marker);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Invalid cache last-use marker: " + marker);
    return stat.mtimeMs;
  }
  return fs.statSync(target).mtimeMs;
}

function markCacheUse(target) {
  const marker = path.join(target, ".alnilam-last-used");
  assertNoSymlinkPath(marker);
  const now = new Date();
  if (fs.existsSync(marker)) {
    const stat = fs.lstatSync(marker);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error("Invalid cache last-use marker: " + marker);
    fs.utimesSync(marker, now, now);
  } else {
    fs.writeFileSync(marker, "ALNILAM managed cache last use\n", { flag: "wx" });
    fs.utimesSync(marker, now, now);
  }
}


function assertNoActiveBuilds() {
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir)) {
      const target = path.join(dir, entry);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) throw new Error("Refusing a symbolic link in managed cache: " + target);
      if (stat.isDirectory()) visit(target);
      else if (entry === ".compose-lock") {
        let lock;
        try { lock = JSON.parse(fs.readFileSync(target, "utf8")); } catch { throw new Error("Unverifiable build lock: " + target); }
        if (!Number.isInteger(lock.pid) || lock.pid <= 0) throw new Error("Unverifiable build lock: " + target);
        try {
          process.kill(lock.pid, 0);
          throw new Error("Active build uses managed cache: " + target);
        } catch (error) {
          if (error?.code !== "ESRCH") throw error;
        }
      }
    }
  };
  for (const entry of ["v1", "bangumi", "shirone"]) {
    const target = path.join(cacheRoot, entry);
    if (fs.existsSync(target)) visit(target);
  }
}

if (cleanLegacyOnly) {
  const legacyPaths = ["apps/web/.astro", "apps/web/node_modules/.astro", "apps/web/.shirones", "apps/web/src/generated", "apps/web/public/assets/moments/thumbnails"];
  const entries = legacyPaths.map((relative) => {
    const literalPath = path.join(repoRoot, relative);
    try {
      assertNoSymlinkPath(literalPath);
      const target = realpathOfExisting(literalPath);
      const details = inspectTree(target);
      return { path: target, ...details, action: details.type === "directory" && details.empty ? (dryRun ? "would-remove-empty-directory" : "remove-empty-directory") : details.type === "missing" ? "absent" : "preserve-unverified-content" };
    } catch (error) {
      return { path: literalPath, type: "blocked", files: 0, logicalBytes: 0, allocatedBytes: 0, action: "blocked-path", reason: error.message };
    }
  });
  console.log(JSON.stringify({ mode: dryRun ? "dry-run" : "explicit-cleanup", targets: entries }, null, 2));
  if (!dryRun) for (const entry of entries) {
    if (entry.action !== "remove-empty-directory") continue;
    assertNoSymlinkPath(entry.path);
    if (fs.readdirSync(entry.path).length === 0) fs.rmdirSync(entry.path);
  }
  process.exit(0);
}

if (cleanCacheOnly) {
  assertNoSymlinkPath(cacheRoot);
  if (!fs.lstatSync(cacheRoot, { throwIfNoEntry: false })) {
    console.log("No ALNILAM managed cache exists: " + cacheRoot);
    process.exit(0);
  }
  ensureManagedCacheRoot(true);
  const operationLock = createBuildLock(cacheRoot, { lockName: ".cache-operation-lock" });
  operationLock.acquire();
  try {
    assertNoActiveBuilds();
    for (const entry of ["v1", "bangumi", "shirone"]) {
      const target = path.join(cacheRoot, entry);
      if (!fs.existsSync(target)) continue;
      assertNoSymlinksInTree(target, fs.statSync(cacheRoot).dev);
      rmTreeSafe(target);
    }
  } finally {
    operationLock.release();
  }
  console.log("ALNILAM managed cache cleaned: " + cacheRoot);
  process.exit(0);
}
if (gcCacheOnly) {
  assertNoSymlinkPath(cacheRoot);
  if (!fs.lstatSync(cacheRoot, { throwIfNoEntry: false })) {
    console.log("No ALNILAM managed cache exists: " + cacheRoot);
    process.exit(0);
  }
  ensureManagedCacheRoot(false);
  const operationLock = createBuildLock(cacheRoot, { lockName: ".cache-operation-lock" });
  operationLock.acquire();
  try {
    assertNoActiveBuilds();
    const device = fs.statSync(cacheRoot).dev;
    const now = Date.now();
    const candidates = cacheCandidates(device).map((candidate) => ({
      ...candidate,
      ...measureManagedTree(candidate.path, device),
      lastUsed: cacheLastUsed(candidate.path),
    }));
    const totalBytes = candidates.reduce((sum, candidate) => sum + candidate.allocatedBytes, 0);
    const selected = new Map();
    for (const candidate of candidates) {
      if (now - candidate.lastUsed >= CACHE_UNUSED_TTL_MS) selected.set(candidate.path, "unused-ttl");
    }
    let remainingBytes = totalBytes - candidates.reduce((sum, candidate) => selected.has(candidate.path) ? sum + candidate.allocatedBytes : sum, 0);
    for (const candidate of [...candidates].sort((left, right) => left.lastUsed - right.lastUsed)) {
      if (remainingBytes <= CACHE_MAX_BYTES) break;
      if (selected.has(candidate.path)) continue;
      selected.set(candidate.path, "maximum-size");
      remainingBytes -= candidate.allocatedBytes;
    }
    const planned = candidates.map((candidate) => ({
      path: candidate.path,
      type: "directory",
      kind: candidate.kind,
      files: candidate.files,
      logicalBytes: candidate.logicalBytes,
      allocatedBytes: candidate.allocatedBytes,
      lastUsed: new Date(candidate.lastUsed).toISOString(),
      action: selected.has(candidate.path) ? (dryRun ? "would-remove" : "remove") : "keep",
      reason: selected.get(candidate.path) ?? null,
    }));
    const estimatedFreedBytes = candidates.reduce((sum, candidate) => selected.has(candidate.path) ? sum + candidate.allocatedBytes : sum, 0);
    console.log(JSON.stringify({
      mode: dryRun ? "dry-run" : "garbage-collection",
      policy: { unusedTtlDays: CACHE_UNUSED_TTL_MS / (24 * 60 * 60 * 1000), maximumBytes: CACHE_MAX_BYTES },
      currentAllocatedBytes: totalBytes,
      estimatedFreedBytes,
      remainingAllocatedBytes: Math.max(0, totalBytes - estimatedFreedBytes),
      targets: planned,
    }, null, 2));
    if (!dryRun) for (const candidate of candidates) {
      if (!selected.has(candidate.path)) continue;
      assertNoSymlinksInTree(candidate.path, device);
      rmTreeSafe(candidate.path);
    }
  } finally {
    operationLock.release();
  }
  process.exit(0);
}

const siteArg = option("--site", "sites/demo");
const outputArg = option("--out", "dist/site");
if (!siteArg || !outputArg) throw new Error("--site and --out require a path");
const sitePath = path.resolve(siteArg);
const { root: site, digest: before } = validateSiteRoot(sitePath);
const temporaryRoot = fs.realpathSync(os.tmpdir());
const realSite = fs.realpathSync(site);
if (temporaryRoot === realSite || temporaryRoot.startsWith(realSite + path.sep)) {
  throw new Error("Temporary directory must not be inside the Site source");
}
const destination = assertExternalOutput(site, path.resolve(outputArg));
fs.mkdirSync(path.dirname(destination), { recursive: true });
// Compare resolved paths: a cache root that is (or sits under) a symlink into
// the Site or the output must be rejected, not just the literal spelling.
function realpathOfExisting(target) {
  let current = target;
  const missing = [];
  while (!fs.existsSync(current)) {
    missing.unshift(path.basename(current));
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Cache directory has no existing ancestor: " + target);
    current = parent;
  }
  return path.join(fs.realpathSync(current), ...missing);
}
const realCacheRoot = realpathOfExisting(cacheRoot);
for (const [inner, outer, message] of [
  [realCacheRoot, realSite, "Cache directory must not be inside the Site source"],
  [realSite, realCacheRoot, "Cache directory must not contain the Site source"],
  [realCacheRoot, destination, "Cache directory must not be inside the output"],
  [destination, realCacheRoot, "Cache directory must not contain the output"],
]) {
  if (isWithin(inner, outer)) throw new Error(message + ": " + inner);
}
ensureManagedCacheRoot(true);
const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".alnilam-build-"));
const bangumiAssetStage = stage + "-bangumi-assets";
const backup = destination + ".alnilam-backup-" + process.pid;
let published = false;
let cacheLock;
try {
  const coreRev = resolveCoreRevision(repoRoot);
  // A fixed-length digest keeps every caller-supplied revision (branch names,
  // tags, hostile strings, Windows reserved names) a safe single path segment.
  const revKey = crypto.createHash("sha256").update(coreRev).digest("hex").slice(0, 16);
  const shironeInputKey = shironeBuildInputKey(repoRoot);
  const shironeCacheDir = path.join(cacheRoot, "shirone", shironeInputKey);
  if (!isWithin(shironeCacheDir, path.join(cacheRoot, "shirone"))) throw new Error("Shirone cache path escaped the managed cache root");
  const cacheRootV1 = path.join(cacheRoot, "v1");
  const buildDir = path.join(cacheRootV1, revKey, before);
  if (!isWithin(buildDir, cacheRootV1)) throw new Error("Build cache path escaped the cache root: " + buildDir);
  const operationLock = createBuildLock(cacheRoot, { lockName: ".cache-operation-lock" });
  operationLock.acquire();
  try {
    fs.mkdirSync(buildDir, { recursive: true });
    // Acquire the per-build lock while holding admission so cleanup cannot
    // miss a build starting between its lock scan and managed-directory removal.
    cacheLock = createBuildLock(buildDir);
    cacheLock.acquire();
    assertNoSymlinkPath(shironeCacheDir);
    fs.mkdirSync(shironeCacheDir, { recursive: true });
    assertNoSymlinkPath(shironeCacheDir);
  } finally {
    operationLock.release();
  }
  // Crash leftovers (staging dirs, dead snapshots) are swept under the
  // exclusive lock; staging names come from mkdtemp so PID reuse cannot collide.
  for (const entry of fs.readdirSync(buildDir)) {
    if (entry.startsWith("site.staging-")) rmTreeSafe(path.join(buildDir, entry));
  }
  const staging = fs.mkdtempSync(path.join(buildDir, "site.staging-"));
  for (const entry of ["alnilam.config.yaml", "content", "assets", "data"]) {
    const source = path.join(site, entry);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(staging, entry), { recursive: true });
  }
  if (validateSiteRoot(staging).digest !== before || validateSiteRoot(site).digest !== before) {
    rmTreeSafe(staging);
    // The Astro store binds importer paths to the snapshot content; a mismatch
    // means the store must be rebuilt against the next successful snapshot.
    rmTreeSafe(path.join(buildDir, "astro"));
    throw new Error("Site source changed while creating build snapshot");
  }
  const snapshot = path.join(buildDir, "site");
  // The snapshot path is deterministic: Astro's content store persists image
  // importer paths resolved against it, so a per-build random directory would
  // poison that cache across builds (intermittent ImageNotFound). Same Site
  // digest → same snapshot path → cache entries stay valid; a changed Site
  // digest gets a fresh store.
  rmTreeSafe(snapshot);
  fs.renameSync(staging, snapshot);
  // Deterministic provenance: the Core revision and Site ref come from the
  // caller or Git, the Site identity from the validated read-only digest. All
  // are embedded in the output and must not change between the two reads below.
  const provenance = {
    schema: 1,
    core: { revision: coreRev },
    site: { ref: resolveSiteRef(site), digest: before },
    // NOTE: no absolute source path — it leaks local filesystem layout and
    // breaks reproducibility across checkouts. The digest is the identity.
    generatedAt: process.env.SOURCE_DATE_EPOCH
      ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
      : new Date().toISOString(),
  };
  const result = spawnSync(
    externalToolchain ? process.execPath : pnpm,
    externalToolchain
      ? [path.join(toolchainRoot, "apps/web/node_modules/astro/bin/astro.mjs"), "build", "--root", path.join(repoRoot, "apps/web")]
      : ["--dir", path.join(repoRoot, "apps/web"), "exec", "astro", "build", "--root", path.join(repoRoot, "apps/web")],
    {
      cwd: toolchainCwd,
      stdio: "inherit",
      env: {
        ...process.env,
        ...toolchainEnv,
        ALNILAM_SITE_DIR: snapshot,
        ALNILAM_OUTPUT_DIR: stage,
        ALNILAM_VITE_CACHE: path.join(cacheRoot, "v1", revKey, "vite"),
        // Provider snapshots and covers are scoped by Bangumi config, not by
        // the Core revision or Site digest, so a failed fetch keeps its last
        // valid data across unrelated rebuilds.
        ALNILAM_BANGUMI_CACHE: path.join(cacheRoot, "bangumi"),
        ALNILAM_BANGUMI_ASSET_STAGE: bangumiAssetStage,
        ALNILAM_ASTRO_CACHE: path.join(buildDir, "astro"),
        ALNILAM_SHIRONE_CACHE: path.join(buildDir, "shirone"),
        ALNILAM_SHIRONE_BUNDLE_CACHE: path.join(shironeCacheDir, "loaded"),
        ALNILAM_SHIRONE_INPUT_KEY: shironeInputKey,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Astro build failed: exit " + result.status);
  const assetSrc = path.join(snapshot, "assets");
  if (fs.existsSync(assetSrc)) {
    fs.cpSync(assetSrc, path.join(stage, "site-assets"), { recursive: true, force: false, errorOnExist: true });
  }
  // Local search index (Pagefind). Runs over the staged static output; failure
  // fails the compose so CI never ships a stale or missing index.
  const pf = spawnSync(
    externalToolchain ? process.execPath : pnpm,
    externalToolchain
      ? [path.join(toolchainRoot, "apps/web/node_modules/pagefind/lib/runner/bin.cjs"), "--site", stage]
      : ["--dir", path.join(repoRoot, "apps/web"), "exec", "pagefind", "--site", stage],
    { cwd: toolchainCwd, stdio: "inherit", env: { ...process.env, ...toolchainEnv, SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH } },
  );
  if (pf.error) throw pf.error;
  if (pf.status !== 0) throw new Error("Pagefind indexing failed: exit " + pf.status);
  // pagefind-entry.json's language keys come from concurrent worker completion
  // order — nondeterministic between runs. Sort them so output digests are
  // stable (hashes themselves are content-derived and already deterministic).
  const entryPath = path.join(stage, "pagefind", "pagefind-entry.json");
  if (fs.existsSync(entryPath)) {
    const entry = JSON.parse(fs.readFileSync(entryPath, "utf8"));
    const sortedLanguages = Object.fromEntries(
      Object.entries(entry.languages ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(entryPath, JSON.stringify({ ...entry, languages: sortedLanguages }));
  }
  const after = validateSiteRoot(site).digest;
  if (after !== before) throw new Error("Site source changed during build; refusing to publish");
  if (provenance.site.digest !== before) throw new Error("Provenance digest mismatch; refusing to publish");
  fs.writeFileSync(path.join(stage, "alnilam-provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
  if (fs.existsSync(backup)) throw new Error("Refusing to overwrite an existing build backup: " + backup);
  const existed = fs.existsSync(destination);
  if (existed) fs.renameSync(destination, backup);
  try {
    fs.renameSync(stage, destination);
    published = true;
  } catch (err) {
    if (existed && fs.existsSync(backup)) fs.renameSync(backup, destination);
    throw err;
  }
  if (existed) fs.rmSync(backup, { recursive: true });
  for (const target of [path.join(cacheRootV1, revKey), shironeCacheDir]) {
    if (!fs.existsSync(target)) continue;
    try {
      markCacheUse(target);
    } catch (error) {
      console.warn("Could not update cache last-use marker for " + target + ": " + error.message);
    }
  }
  console.log("ALNILAM compose OK: " + destination);
  console.log("Site digest SHA-256: " + before);
  console.log("Core revision: " + provenance.core.revision);
  console.log("Provenance: alnilam-provenance.json");
} finally {
  if (fs.existsSync(bangumiAssetStage)) fs.rmSync(bangumiAssetStage, { recursive: true, force: true });
  if (!published && fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  if (typeof cacheLock !== "undefined") cacheLock.release();
}

