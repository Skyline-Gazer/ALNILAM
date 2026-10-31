import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const SITE_CONFIG_FILENAME = "alnilam.config.yaml";

const isWithin = (child, parent) => child === parent || child.startsWith(parent + path.sep);

export function siteConfigPath(root) {
  const config = path.join(root, SITE_CONFIG_FILENAME);
  const legacy = path.join(root, "alnilam.config.toml");
  if (fs.existsSync(config) && fs.existsSync(legacy)) {
    throw new Error("Site must not contain both alnilam.config.yaml and alnilam.config.toml");
  }
  if (!fs.existsSync(config) && fs.existsSync(legacy)) {
    throw new Error(
      "Site missing required input: " + SITE_CONFIG_FILENAME +
        " (alnilam.config.toml is no longer read; see docs/SITE_ONBOARDING.md)",
    );
  }
  return config;
}

export function validateSiteRoot(site) {
  const root = path.resolve(site);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error("Site directory does not exist: " + root);
  }
  const config = siteConfigPath(root);
  if (!fs.existsSync(config)) throw new Error("Site missing required input: " + SITE_CONFIG_FILENAME);
  if (!fs.existsSync(path.join(root, "content/posts"))) {
    throw new Error("Site missing required input: content/posts");
  }
  if (!fs.statSync(config).isFile()) {
    throw new Error("Site config must be a regular file");
  }
  const sha = crypto.createHash("sha256");
  const paths = [SITE_CONFIG_FILENAME, "content", "assets", "data"];
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
