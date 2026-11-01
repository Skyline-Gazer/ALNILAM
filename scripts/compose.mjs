#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot, assertExternalOutput, isWithin } from "./site-contract.mjs";

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
  console.log("Usage: node scripts/compose.mjs [--site /path/to/site --out /path/to/output] [--clean-cache]");
  process.exit(0);
}
const cleanCacheOnly = argv.includes("--clean-cache");
const siteArg = cleanCacheOnly ? "sites/demo" : option("--site", "sites/demo");
const outputArg = cleanCacheOnly ? "dist/site" : option("--out", "dist/site");
// Derived build state (site snapshot, Astro content/image store, Vite dep
// cache) lives in one managed cache root keyed by Core revision and Site
// digest: different inputs never share cache entries, and `--clean-cache`
// removes everything. The cache is Code-owned build space — never inside the
// Site or the published output.
const cacheRoot = path.resolve(process.env.ALNILAM_CACHE_DIR || path.join(repoRoot, ".cache", "alnilam"));
if (cacheRoot === path.parse(cacheRoot).root) throw new Error("Cache directory must not be the filesystem root");
if (cleanCacheOnly) {
  fs.rmSync(cacheRoot, { recursive: true, force: true });
  if (!process.env.ALNILAM_CACHE_DIR) {
    // Locations used before the managed cache existed; safe to delete, they
    // are regenerated on demand (stale entries here once served broken builds).
    for (const legacy of ["apps/web/.astro", "apps/web/node_modules/.astro"]) {
      fs.rmSync(path.join(repoRoot, legacy), { recursive: true, force: true });
    }
  }
  console.log("ALNILAM cache cleaned: " + cacheRoot);
  process.exit(0);
}
if (!siteArg || !outputArg) throw new Error("--site and --out require a path");
const sitePath = path.resolve(siteArg);
const { root: site, digest: before } = validateSiteRoot(sitePath);
const temporaryRoot = fs.realpathSync(os.tmpdir());
const realSite = fs.realpathSync(site);
if (temporaryRoot === realSite || temporaryRoot.startsWith(realSite + path.sep)) {
  throw new Error("Temporary directory must not be inside the Site source");
}
const destination = assertExternalOutput(site, path.resolve(outputArg));
for (const [inner, outer, message] of [
  [cacheRoot, site, "Cache directory must not be inside the Site source"],
  [site, cacheRoot, "Cache directory must not contain the Site source"],
  [cacheRoot, destination, "Cache directory must not be inside the output"],
  [destination, cacheRoot, "Cache directory must not contain the output"],
]) {
  if (isWithin(inner, outer)) throw new Error(message + ": " + inner);
}
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.mkdirSync(cacheRoot, { recursive: true });
const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".alnilam-build-"));
const backup = destination + ".alnilam-backup-" + process.pid;
let published = false;
let lockFd;
let lockPath;
try {
  let coreRev = process.env.ALNILAM_CORE_REV;
  if (!coreRev) {
    const rev = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
    coreRev = rev.status === 0 ? rev.stdout.trim() : "unknown";
  }
  const revKey = coreRev.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!revKey || revKey === "." || revKey.includes("..")) {
    throw new Error("ALNILAM_CORE_REV is not usable as a cache key: " + coreRev);
  }
  const cacheRootV1 = path.join(cacheRoot, "v1");
  const buildDir = path.join(cacheRootV1, revKey, before);
  if (!isWithin(buildDir, cacheRootV1)) throw new Error("Build cache path escaped the cache root: " + buildDir);
  fs.mkdirSync(buildDir, { recursive: true });
  // One exclusive builder per (Core revision, Site digest): concurrent composes
  // would otherwise delete and rewrite each other's live snapshot. A lock left
  // by a crashed build is stolen after six hours.
  lockPath = path.join(buildDir, ".compose-lock");
  try {
    lockFd = fs.openSync(lockPath, "wx");
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    const stat = fs.statSync(lockPath);
    if (Date.now() - stat.mtimeMs <= 6 * 60 * 60 * 1000) {
      throw new Error(
        "Another compose is building this Site revision in " + buildDir +
        " (lock held since " + stat.mtime.toISOString() + "); wait for it to finish or set ALNILAM_CACHE_DIR to a separate cache root",
      );
    }
    fs.rmSync(lockPath, { force: true });
    lockFd = fs.openSync(lockPath, "wx");
  }
  fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, coreRev, siteDigest: before, startedAt: new Date().toISOString() }) + "\n");
  const snapshot = path.join(buildDir, "site");
  // The snapshot path is deterministic: Astro's content store persists image
  // importer paths resolved against it, so a per-build random directory would
  // poison that cache across builds (intermittent ImageNotFound). Same Site
  // digest → same snapshot path → cache entries stay valid; a changed Site
  // digest gets a fresh store.
  fs.rmSync(snapshot, { recursive: true, force: true });
  fs.mkdirSync(snapshot, { recursive: true });
  for (const entry of ["alnilam.config.yaml", "content", "assets", "data"]) {
    const source = path.join(site, entry);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(snapshot, entry), { recursive: true });
  }
  if (validateSiteRoot(snapshot).digest !== before || validateSiteRoot(site).digest !== before) {
    throw new Error("Site source changed while creating build snapshot");
  }
  // Deterministic provenance: the Core revision comes from the caller (env or
  // git), the Site identity from the validated read-only digest. Both are
  // embedded in the output and must not change between the two reads below.
  const provenance = {
    schema: 1,
    core: { revision: coreRev },
    site: { digest: before },
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
        ALNILAM_ASTRO_CACHE: path.join(buildDir, "astro"),
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
  console.log("ALNILAM compose OK: " + destination);
  console.log("Site digest SHA-256: " + before);
  console.log("Core revision: " + provenance.core.revision);
  console.log("Provenance: alnilam-provenance.json");
} finally {
  if (!published && fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  if (lockFd) {
    fs.closeSync(lockFd);
    fs.rmSync(lockPath, { force: true });
  }
}

