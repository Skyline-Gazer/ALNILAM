import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { normalizeSiteConfig, parseSiteConfigDocument, RETIRED_SITE_FEATURES, SITE_CONFIG_FILENAME } from "@alnilam/core";

// A composed build loads the Site contract in several processes. The first loader records the
// keys it warned about in this variable and child builds inherit it, so one build logs one notice.
const RETIRED_WARN_ENV = "ALNILAM_WARNED_RETIRED";

function warnRetiredKeys(document) {
  const alreadyWarned = new Set((process.env[RETIRED_WARN_ENV] ?? "").split(",").filter(Boolean));
  const keys = RETIRED_SITE_FEATURES.filter(
    (key) => document?.[key] !== undefined && !alreadyWarned.has(key),
  );
  if (keys.length === 0) return;
  process.env[RETIRED_WARN_ENV] = [...alreadyWarned, ...keys].join(",");
  const quoted = keys.map((key) => `"${key}"`).join(", ");
  const plural = keys.length > 1;
  console.warn(
    `ALNILAM: the retired ${SITE_CONFIG_FILENAME} option${plural ? "s" : ""} ${quoted} ${plural ? "are" : "is"} ignored (Issue #203). Remove ${plural ? "them" : "it"}; see docs/SITE_ONBOARDING.md`,
  );
}

const fromModule = fileURLToPath(new URL("../../../../sites/demo/", import.meta.url));
const defaultSite = existsSync(path.join(fromModule, SITE_CONFIG_FILENAME))
  ? fromModule
  : path.resolve(process.cwd(), "../../sites/demo");

export function loadSite() {
  const root = path.resolve(process.env.ALNILAM_SITE_DIR || defaultSite);
  const configPath = path.join(root, SITE_CONFIG_FILENAME);
  if (!existsSync(configPath) && existsSync(path.join(root, "alnilam.config.toml"))) {
    throw new Error(
      "ALNILAM: schema v2 requires alnilam.config.yaml; alnilam.config.toml is no longer read. See docs/SITE_ONBOARDING.md",
    );
  }
  const raw = readFileSync(configPath, "utf8");
  const document = parseSiteConfigDocument(raw, { filename: SITE_CONFIG_FILENAME });
  warnRetiredKeys(document);
  let config = normalizeSiteConfig(document);
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
