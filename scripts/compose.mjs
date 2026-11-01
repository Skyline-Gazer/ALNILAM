#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot, assertExternalOutput } from "./site-contract.mjs";
import { createBuildLock } from "./build-lock.mjs";
import { resolveSiteRef, resolveCoreRevision } from "./site-ref.mjs";

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
  console.log("Usage: node scripts/compose.mjs --site /path/to/site --out /path/to/output");
  process.exit(0);
}
const siteArg = option("--site", "sites/demo");
const outputArg = option("--out", "dist/site");
if (!siteArg || !outputArg) throw new Error("--site and --out require a path");
const sitePath = path.resolve(siteArg);
const { root: site } = validateSiteRoot(sitePath);
const temporaryRoot = fs.realpathSync(os.tmpdir());
const realSite = fs.realpathSync(site);
if (temporaryRoot === realSite || temporaryRoot.startsWith(realSite + path.sep)) {
  throw new Error("Temporary directory must not be inside the Site source");
}
const destination = assertExternalOutput(site, path.resolve(outputArg));
fs.mkdirSync(path.dirname(destination), { recursive: true });
const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".alnilam-build-"));
const backup = destination + ".alnilam-backup-" + process.pid;
let published = false;
let workspace;
// Concurrent composes share this checkout's Astro build state (apps/web/.astro:
// content store and prerender chunks); serialize on a fail-closed lock.
const buildLock = createBuildLock(path.join(repoRoot, "apps/web", ".astro"));
try {
  buildLock.acquire();
  // The lock serializes only the shared Astro build state (apps/web/.astro);
  // it does not protect the Site. Input consistency comes from the digest
  // checks below: the build binds to the Site digest re-read under the lock
  // and refuses to publish if the snapshot or source deviate from it.
  const { digest: buildDigest } = validateSiteRoot(site);
  workspace = fs.mkdtempSync(path.join(temporaryRoot, "alnilam-site-"));
  const snapshot = path.join(workspace, "site");
  fs.mkdirSync(snapshot);
  for (const entry of ["alnilam.config.yaml", "content", "assets", "data"]) {
    const source = path.join(site, entry);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(snapshot, entry), { recursive: true });
  }
  if (validateSiteRoot(snapshot).digest !== buildDigest || validateSiteRoot(site).digest !== buildDigest) {
    throw new Error("Site source changed while creating build snapshot");
  }
  const provenance = {
    schema: 1,
    core: { revision: resolveCoreRevision(repoRoot) },
    site: { ref: resolveSiteRef(site), digest: buildDigest },
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
  if (after !== buildDigest) throw new Error("Site source changed during build; refusing to publish");
  if (provenance.site.digest !== buildDigest) throw new Error("Provenance digest mismatch; refusing to publish");
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
  console.log("Site digest SHA-256: " + buildDigest);
  console.log("Core revision: " + provenance.core.revision);
  console.log("Provenance: alnilam-provenance.json");
} finally {
  if (!published && fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
  if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
  buildLock.release();
}

