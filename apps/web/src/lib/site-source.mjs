import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import { normalizeSiteConfig } from "@alnilam/core";

const defaultSite = fileURLToPath(new URL("../../../../sites/demo/", import.meta.url));

export function loadSite() {
  const root = path.resolve(process.env.ALNILAM_SITE_DIR || defaultSite);
  const raw = readFileSync(path.join(root, "alnilam.config.toml"), "utf8");
  return { root, config: normalizeSiteConfig(parse(raw)) };
}

