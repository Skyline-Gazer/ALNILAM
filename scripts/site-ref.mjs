// Resolves the Site ref recorded in build provenance: the Core revision and
// the Site ref are pinned independently (docs/ARCHITECTURE.md "Build algorithm").
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const SHA = /^[0-9a-f]{40}$/;

/**
 * Returns the Site ref for provenance:
 * - an explicit full lowercase commit SHA (ALNILAM_SITE_REF) wins;
 * - otherwise only a Site that is its own Git root contributes its HEAD; the
 *   demo fixture lives inside the Core repository and must not inherit Core's
 *   HEAD, and a Site without a working Git root records `unversioned`;
 * - anything else fails closed.
 */
export function resolveSiteRef(site, override = process.env.ALNILAM_SITE_REF) {
  if (override !== undefined) {
    if (!SHA.test(override)) throw new Error("ALNILAM_SITE_REF must be a full lowercase commit SHA");
    return override;
  }
  const top = spawnSync("git", ["-C", site, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  let root = "";
  if (top.status === 0 && top.stdout) {
    // A toplevel that disappears or becomes inaccessible between the probe
    // and the stat is treated like "no Git root", not a crashed build.
    try {
      root = fs.realpathSync(top.stdout.trim());
    } catch {
      root = "";
    }
  }
  let self = "";
  try {
    self = fs.realpathSync(site);
  } catch {
    return "unversioned";
  }
  if (root !== "" && root === self) {
    const rev = spawnSync("git", ["-C", site, "rev-parse", "HEAD"], { encoding: "utf8" });
    const head = (rev.stdout || "").trim();
    if (rev.status === 0 && SHA.test(head)) return head;
  }
  return "unversioned";
}

/** Resolves the Core revision for provenance: caller override, else Git HEAD. */
export function resolveCoreRevision(repoRoot, override = process.env.ALNILAM_CORE_REV) {
  if (override) return override;
  const rev = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return rev.status === 0 ? rev.stdout.trim() : "unknown";
}

