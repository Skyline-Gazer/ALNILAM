import { parseDocument } from "yaml";

export const SITE_CONFIG_FILENAME = "alnilam.config.yaml";

// Values that reach the contract layer must be plain JSON-like data. Host
// objects the YAML schema can produce (for example a `!!binary` Buffer) are
// rejected here. `parseSiteConfigDocument` separately rejects syntax errors,
// duplicate keys and unresolved tags; other YAML warnings pass through.
function assertPlainData(value, filename, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`ALNILAM: ${filename} contains a non-finite number at ${label}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertPlainData(entry, filename, `${label}[${index}]`));
    return;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, entry] of Object.entries(value)) assertPlainData(entry, filename, `${label}.${key}`);
    return;
  }
  throw new Error(`ALNILAM: ${filename} must contain plain YAML data (${label})`);
}

export function parseSiteConfigDocument(raw, options = {}) {
  const filename = options.filename || SITE_CONFIG_FILENAME;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`ALNILAM: ${filename} must contain YAML configuration`);
  }
  // `parseDocument` collects syntax errors instead of throwing; unknown tags
  // surface as warnings and would otherwise become opaque data.
  const document = parseDocument(raw, { uniqueKeys: true, schema: "core", customTags: [] });
  if (document.errors.length) {
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${document.errors[0].message.split("\n")[0]}`);
  }
  const unresolvedTag = document.warnings.find((warning) => /Unresolved tag/.test(warning.message));
  if (unresolvedTag) {
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${unresolvedTag.message.split("\n")[0]}`);
  }
  let parsed;
  try {
    parsed = document.toJS({ maxAliasCount: 100 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ALNILAM: invalid YAML in ${filename}: ${message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`ALNILAM: ${filename} must contain a YAML mapping`);
  }
  assertPlainData(parsed, filename, "root");
  return parsed;
}
