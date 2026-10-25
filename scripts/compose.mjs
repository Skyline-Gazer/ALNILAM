#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot, assertExternalOutput } from "./site-contract.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
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
const { root: site, digest: before } = validateSiteRoot(sitePath);
const destination = assertExternalOutput(site, path.resolve(outputArg));
fs.mkdirSync(path.dirname(destination), { recursive: true });
const stage = fs.mkdtempSync(path.join(path.dirname(destination), ".alnilam-build-"));
const backup = destination + ".alnilam-backup-" + process.pid;
let published = false;
try {
  // Deterministic provenance: the Core revision comes from the caller (env or
  // git), the Site identity from the validated read-only digest. Both are
  // embedded in the output and must not change between the two reads below.
  let coreRev = process.env.ALNILAM_CORE_REV;
  if (!coreRev) {
    const rev = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
    coreRev = rev.status === 0 ? rev.stdout.trim() : "unknown";
  }
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
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--filter", "@alnilam/web", "build"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        ALNILAM_SITE_DIR: site,
        ALNILAM_OUTPUT_DIR: stage,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Astro build failed: exit " + result.status);
  const assetSrc = path.join(site, "assets");
  if (fs.existsSync(assetSrc)) {
    fs.cpSync(assetSrc, path.join(stage, "site-assets"), { recursive: true, force: false, errorOnExist: true });
  }
  // Local search index (Pagefind). Runs over the staged static output; failure
  // fails the compose so CI never ships a stale or missing index.
  const pf = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--filter", "@alnilam/web", "exec", "pagefind", "--site", stage],
    { cwd: repoRoot, stdio: "inherit", env: { ...process.env, SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH } },
  );
  if (pf.error) throw pf.error;
  if (pf.status !== 0) throw new Error("Pagefind indexing failed: exit " + pf.status);
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
}

