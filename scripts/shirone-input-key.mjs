import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const INPUTS = [
  "package.json",
  "pnpm-lock.yaml",
  "apps/web/astro.config.mjs",
  "apps/web/src",
  "themes/shirone/package.json",
  "themes/shirone/upstream/src",
];

function collect(root, relative, files) {
  const absolute = path.join(root, relative);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error("Refusing a symlink in Shirone build inputs: " + absolute);
  if (stat.isFile()) {
    files.push(relative);
    return;
  }
  if (!stat.isDirectory()) throw new Error("Unexpected Shirone build input type: " + absolute);
  for (const entry of readdirSync(absolute).sort()) {
    collect(root, path.join(relative, entry), files);
  }
}

/** Hash the complete Core-side input set that can affect Shirone's compiled modules. */
export function shironeBuildInputKey(repoRoot, runtime = process) {
  const files = [];
  for (const input of INPUTS) collect(repoRoot, input, files);
  files.sort();

  const hash = createHash("sha256");
  hash.update(JSON.stringify({ schema: 1, node: runtime.version, platform: runtime.platform, arch: runtime.arch, target: "node20-esm" }));
  const algorithm = readFileSync(fileURLToPath(import.meta.url));
  hash.update("\0cache-key-algorithm\0").update(String(algorithm.byteLength)).update("\0").update(algorithm);
  for (const relative of files) {
    const content = readFileSync(path.join(repoRoot, relative));
    hash.update("\0").update(relative.replaceAll(path.sep, "/")).update("\0");
    hash.update(String(content.byteLength)).update("\0").update(content);
  }
  return hash.digest("hex");
}
