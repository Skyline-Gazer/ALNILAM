/**
 * Site-owned configuration is normalized here, not in theme components.
 *
 * Schema v1 contract (FROZEN — changes require a versioned migration):
 * - schemaVersion: optional integer; if present MUST be 1 (the only released
 *   version). Unknown versions fail closed so an old Core never silently
 *   mis-renders a newer Site.
 * - site.title: non-empty string
 * - site.url: absolute http(s) URL
 * - site.description, site.locale: optional strings
 * - theme.appearance: "dark" | "light" (default dark)
 * Post slugs are stable identifiers derived from the content file path under
 * content/posts (Astro collection id); renaming a file changes the slug —
 * document this in docs/SITE_ONBOARDING.md.
 */
const SUPPORTED_SCHEMA_VERSIONS = [1];

export function normalizeSiteConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ALNILAM: config must be a TOML table");
  }
  const schemaVersion = input.schemaVersion === undefined ? 1 : input.schemaVersion;
  if (!Number.isInteger(schemaVersion) || !SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    throw new Error(
      "ALNILAM: unsupported schemaVersion " + JSON.stringify(schemaVersion) +
      " (supported: " + SUPPORTED_SCHEMA_VERSIONS.join(", ") + "). Upgrade Core to build this Site.",
    );
  }
  const site = input.site;
  if (!site || typeof site !== "object" || Array.isArray(site)) {
    throw new Error("ALNILAM: [site] configuration is required");
  }
  const title = site.title;
  const url = site.url;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("ALNILAM: site.title must be a non-empty string");
  }
  if (typeof url !== "string") {
    throw new Error("ALNILAM: site.url must be an absolute http(s) URL");
  }
  let parsed;
  try { parsed = new URL(url); } catch { /* handled below */ }
  if (!parsed || !["https:", "http:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("ALNILAM: site.url must be an absolute http(s) URL");
  }
  if (site.description !== undefined && typeof site.description !== "string") {
    throw new Error("ALNILAM: site.description must be a string");
  }
  const theme = input.theme || {};
  if (typeof theme !== "object" || Array.isArray(theme)) {
    throw new Error("ALNILAM: [theme] must be a TOML table");
  }
  const appearance = theme.appearance || "dark";
  if (!["dark", "light"].includes(appearance)) {
    throw new Error("ALNILAM: theme.appearance must be dark or light");
  }
  return Object.freeze({
    schemaVersion,
    site: Object.freeze({
      title: title.trim(),
      description: site.description || "",
      url: parsed.toString(),
      locale: site.locale || "zh-CN",
    }),
    theme: Object.freeze({ appearance }),
  });
}

