/**
 * Site-owned configuration is normalized here, not in theme components.
 * v0.1 is intentionally a small stable surface; schema migrations are future work.
 */
export function normalizeSiteConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("ALNILAM: config must be a TOML table");
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
    schemaVersion: input.schemaVersion ?? 1,
    site: Object.freeze({
      title: title.trim(),
      description: site.description || "",
      url: parsed.toString(),
      locale: site.locale || "zh-CN",
    }),
    theme: Object.freeze({ appearance }),
  });
}

