import { parseDocument } from "yaml";

export const SITE_CONFIG_FILENAME = "alnilam.config.yaml";

// Fail closed on anything the YAML parser could not resolve exactly: syntax
// errors, duplicate keys, unknown/unsafe tags and other parser warnings. The
// `yaml` package never constructs JavaScript functions, but an unresolved tag
// would otherwise be accepted as opaque data.
export function parseSiteConfigDocument(raw, options = {}) {
  const filename = options.filename || SITE_CONFIG_FILENAME;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`ALNILAM: ${filename} must contain YAML configuration`);
  }
  let document;
  try {
    document = parseDocument(raw, { uniqueKeys: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${message}`);
  }
  if (document.errors.length) {
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${document.errors[0].message.split("\n")[0]}`);
  }
  if (document.warnings.length) {
    throw new Error(
      `ALNILAM: invalid YAML in ${filename}: ${document.warnings[0].message.split("\n")[0]}`,
    );
  }
  const parsed = document.toJS({ maxAliasCount: 100 });
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`ALNILAM: ${filename} must contain a YAML mapping`);
  }
  return parsed;
}
