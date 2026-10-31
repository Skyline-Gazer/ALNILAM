import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const isWithin = (child, parent) => child === parent || child.startsWith(parent + path.sep);

// Transitional target-owned contract reader: the trusted gate must be able to
// validate both the released v1 TOML fixture and the v2 YAML fixture while a
// contract migration is under review. Exactly one config file must exist.
export const SITE_CONFIG_FILENAMES = ["alnilam.config.yaml", "alnilam.config.toml"];

export function siteConfigPath(site) {
  const root = path.resolve(site);
  const found = SITE_CONFIG_FILENAMES
    .map((name) => path.join(root, name))
    .filter((file) => fs.existsSync(file));
  if (found.length === 0) {
    throw new Error("Site missing required input: " + SITE_CONFIG_FILENAMES.join(" or "));
  }
  if (found.length > 1) {
    throw new Error(
      "Site must declare exactly one config file, found: " +
        found.map((file) => path.basename(file)).join(", "),
    );
  }
  return found[0];
}

export function validateSiteRoot(site) {
  const root = path.resolve(site);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Site directory does not exist: " + root);
  }
  const config = siteConfigPath(root);
  if (!fs.statSync(config).isFile()) {
    throw new Error("Site config must be a regular file");
  }
  if (!fs.existsSync(path.join(root, "content/posts"))) {
    throw new Error("Site missing required input: content/posts");
  }
  const sha = crypto.createHash("sha256");
  const paths = [path.basename(config), "content", "assets", "data"];
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
