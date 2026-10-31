import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { normalizeSiteConfig, parseSiteConfigDocument, SITE_CONFIG_FILENAME } from "@alnilam/core";

const defaultSite = fileURLToPath(new URL("../../../../sites/demo/", import.meta.url));

export function loadSite() {
  const root = path.resolve(process.env.ALNILAM_SITE_DIR || defaultSite);
  const configPath = path.join(root, SITE_CONFIG_FILENAME);
  if (!existsSync(configPath) && existsSync(path.join(root, "alnilam.config.toml"))) {
    throw new Error(
      "ALNILAM: schema v2 requires alnilam.config.yaml; alnilam.config.toml is no longer read. See docs/SITE_ONBOARDING.md",
    );
  }
  const raw = readFileSync(configPath, "utf8");
  let config = normalizeSiteConfig(parseSiteConfigDocument(raw, { filename: SITE_CONFIG_FILENAME }));
  const urlOverride = process.env.ALNILAM_SITE_URL;
  if (urlOverride) {
    const u = new URL(urlOverride);
    if (!["https:", "http:"].includes(u.protocol) || !u.hostname) {
      throw new Error("ALNILAM_SITE_URL must be an absolute http(s) URL");
    }
    config = { ...config, site: { ...config.site, url: u.toString() } };
  }
  return { root, config };
}
