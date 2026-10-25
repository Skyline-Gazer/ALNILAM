#!/usr/bin/env node
// Two-Core-revision upgrade/rollback acceptance against ONE unchanged external Site.
//
// Usage:
//   node scripts/upgrade-check.mjs --old <git-sha> [--site /path/to/external/site]
//
// Contract verified (docs/ARCHITECTURE.md "Upgrade contract"):
// 1. An external Site (default: a throwaway copy of sites/demo outside the repo)
//    is built by the current Core revision, then by the old Core revision.
// 2. The Site's read-only digest (scripts/site-contract.mjs) must be identical
//    before, after the upgrade build, and after the rollback build.
// 3. Report both output digests; byte-identical output is asserted only when
//    rendering is unchanged (a Core rendering change downgrades this to a note,
//    never a failure — Site non-mutation is the hard contract).
// 4. The old revision is checked out with `git worktree` only; the script never
//    fetches, resets or checks out anything inside the Site directory.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot } from "./site-contract.mjs";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const argv = process.argv.slice(2);
function option(flag) {
  const idx = argv.indexOf(flag);
  return idx < 0 ? undefined : argv[idx + 1];
}
export function parseOldRevision(args = argv) {
  const idx = args.indexOf("--old");
  const value = idx < 0 ? undefined : args[idx + 1];
  if (!value || !/^[0-9a-f]{7,40}$/.test(value)) {
    console.error("Usage: node scripts/upgrade-check.mjs --old <git-sha> [--site /path/to/site]");
    return null;
  }
  return value;
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed with exit ${result.status}`);
}

/** sha256 over sorted (relative path, size, content hash) rows of a file tree. */
export function hashTree(dir) {
  const sha = crypto.createHash("sha256");
  const rows = [];
  (function visit(abs, rel) {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const childAbs = path.join(abs, entry.name);
      const childRel = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) visit(childAbs, childRel);
      else if (entry.isFile()) rows.push(childRel + ":" + fs.statSync(childAbs).size + ":" + crypto.createHash("sha256").update(fs.readFileSync(childAbs)).digest("hex"));
      else throw new Error("Unsupported file type in build output: " + childRel);
    }
  })(dir, "");
  for (const row of rows) sha.update(row + "\n");
  return sha.digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("upgrade-check.mjs")) {
  main();
}

function main() {
  const oldSha = parseOldRevision();
  if (!oldSha) process.exit(2);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-upgrade-"));
  let oldWorktree = null;
  try {
  // 1. Resolve the external Site. Default: external copy of the demo fixture.
  let site;
  const siteArg = option("--site");
  if (siteArg) {
    site = path.resolve(siteArg);
  } else {
    site = path.join(tempRoot, "external-site");
    fs.cpSync(path.join(repoRoot, "sites", "demo"), site, { recursive: true });
  }
  const before = validateSiteRoot(site).digest;
  console.log("external Site: " + site);
  console.log("site digest before: " + before);

  // 2. Upgrade build: current Core revision against the same external Site.
  const outNew = path.join(tempRoot, "out-new");
  run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["compose", "--site", site, "--out", outNew], repoRoot);
  const afterUpgrade = validateSiteRoot(site).digest;
  if (afterUpgrade !== before) throw new Error("Site digest changed during the upgrade build");
  const digestNew = hashTree(outNew);
  console.log("output digest (current Core): " + digestNew);

  // 3. Rollback build: old Core revision in an isolated worktree, same Site.
  oldWorktree = path.join(tempRoot, "core-old");
  run("git", ["worktree", "add", "--detach", oldWorktree, oldSha], repoRoot);
  run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["install", "--frozen-lockfile"], oldWorktree);
  const outOld = path.join(tempRoot, "out-old");
  run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["compose", "--site", site, "--out", outOld], oldWorktree);
  const afterRollback = validateSiteRoot(site).digest;
  if (afterRollback !== before) throw new Error("Site digest changed during the rollback build");

  // 4. Report output digests. Site non-mutation is the hard contract; the two
  // revisions render identical output only while rendering logic is unchanged.
  const digestOld = hashTree(outOld);
  console.log("output digest (old Core):     " + digestOld);
  if (digestNew !== digestOld) {
    console.warn("NOTE: the two Core revisions produced different output for the same Site (expected when a Core upgrade changes rendering).");
  } else {
    console.log("UPGRADE/ROLLBACK OK: Site unchanged, outputs byte-identical.");
  }
  } finally {
    if (oldWorktree) {
      spawnSync("git", ["worktree", "remove", "--force", oldWorktree], { cwd: repoRoot });
      spawnSync("git", ["worktree", "prune"], { cwd: repoRoot });
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}
