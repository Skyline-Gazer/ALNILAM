import { parseDocument } from "yaml";

export const SITE_CONFIG_FILENAME = "alnilam.config.yaml";

// Site configuration is untrusted author input. Fail closed on anything the
// parser could not resolve exactly (syntax errors, duplicate keys, unknown
// tags) and on any non-plain value the YAML schema could produce (for example
// a `!!binary` Buffer), so the contract layer only ever sees plain data.
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
  let document;
  try {
    document = parseDocument(raw, { uniqueKeys: true, schema: "core", customTags: [] });
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
  assertPlainData(parsed, filename, "root");
  return parsed;
}
