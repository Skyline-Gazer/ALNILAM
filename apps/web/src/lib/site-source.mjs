import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import { normalizeSiteConfig } from "@alnilam/core";

const defaultSite = fileURLToPath(new URL("../../../../sites/demo/", import.meta.url));

export function loadSite() {
  const root = path.resolve(process.env.ALNILAM_SITE_DIR || defaultSite);
  const raw = readFileSync(path.join(root, "alnilam.config.toml"), "utf8");
  let config = normalizeSiteConfig(parse(raw));
  // Optional deployment override (e.g. GitHub Pages base URL). Only accepts
  // http(s); the Site file remains the source of truth for everything else.
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

