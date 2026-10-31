import { parse as parseYaml } from "yaml";

export const SITE_CONFIG_FILENAME = "alnilam.config.yaml";

export function parseSiteConfigDocument(raw, options = {}) {
  const filename = options.filename || SITE_CONFIG_FILENAME;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`ALNILAM: ${filename} must contain YAML configuration`);
  }
  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`ALNILAM: ${filename} must contain a YAML mapping`);
  }
  return parsed;
}
