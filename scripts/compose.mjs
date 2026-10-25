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
  const after = validateSiteRoot(site).digest;
  if (after !== before) throw new Error("Site source changed during build; refusing to publish");
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
} finally {
  if (!published && fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
}

