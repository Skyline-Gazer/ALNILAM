import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const isWithin = (child, parent) => child === parent || child.startsWith(parent + path.sep);

export function validateSiteRoot(site) {
  const root = path.resolve(site);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Site directory does not exist: " + root);
  }
  for (const required of ["alnilam.config.toml", "content/posts"]) {
    const file = path.join(root, required);
    if (!fs.existsSync(file)) throw new Error("Site missing required input: " + required);
  }
  if (!fs.statSync(path.join(root, "alnilam.config.toml")).isFile()) {
    throw new Error("Site config must be a regular file");
  }
  const sha = crypto.createHash("sha256");
  const paths = ["alnilam.config.toml", "content", "assets", "data"];
  function visit(abs, relative) {
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) throw new Error("Site cannot contain symlinks: " + relative);
    if (stat.isDirectory()) {
      sha.update("D:" + relative + "\n");
      for (const entry of fs.readdirSync(abs).sort()) visit(path.join(abs, entry), path.posix.join(relative, entry));
    } else if (stat.isFile()) {
      sha.update("F:" + relative + ":" + stat.size + "\n");
      sha.update(fs.readFileSync(abs));
    } else {
      throw new Error("Site contains unsupported file type: " + relative);
    }
  }
  for (const entry of paths) {
    const abs = path.join(root, entry);
    if (fs.existsSync(abs)) visit(abs, entry);
  }
  return { root, digest: sha.digest("hex") };
}

export function assertExternalOutput(site, output) {
  const root = path.resolve(site);
  const dest = path.resolve(output);
  if (isWithin(dest, root) || isWithin(root, dest)) {
    throw new Error("Output must not overlap the Site source");
  }
  if (dest === path.parse(dest).root) throw new Error("Output must not be filesystem root");
  return dest;
}

