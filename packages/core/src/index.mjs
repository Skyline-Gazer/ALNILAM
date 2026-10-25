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
  // Optional comments module (schema v1 additive). Disabled by default; when
  // enabled, giscus requires repo/category identifiers from the Site config.
  // Site-owned public identifiers only — Core never embeds secrets.
  const comments = input.comments ?? {};
  if (typeof comments !== "object" || Array.isArray(comments)) {
    throw new Error("ALNILAM: [comments] must be a TOML table");
  }
  if (comments.enabled === true) {
    if (comments.provider !== undefined && comments.provider !== "giscus") {
      throw new Error("ALNILAM: comments.provider must be \"giscus\"");
    }
    for (const field of ["repo", "repoId", "category", "categoryId"]) {
      if (typeof comments[field] !== "string" || !comments[field].trim()) {
        throw new Error(`ALNILAM: comments.${field} is required when comments.enabled = true`);
      }
    }
  }
  if (comments.mapping !== undefined && !["pathname", "specific", "number"].includes(comments.mapping)) {
    throw new Error("ALNILAM: comments.mapping must be pathname, specific or number");
  }
  // Optional bangumi module (schema v1 additive). Build-time fetch from
  // api.bgm.tv; output is static — no client-side third-party calls.
  const bangumi = input.bangumi ?? {};
  if (typeof bangumi !== "object" || Array.isArray(bangumi)) {
    throw new Error("ALNILAM: [bangumi] must be a TOML table");
  }
  if (bangumi.enabled === true) {
    if (typeof bangumi.userId !== "string" || !bangumi.userId.trim()) {
      throw new Error("ALNILAM: bangumi.userId is required when bangumi.enabled = true");
    }
    if (bangumi.subjectType !== undefined && !["anime", "book", "music", "game"].includes(bangumi.subjectType)) {
      throw new Error("ALNILAM: bangumi.subjectType must be anime, book, music or game");
    }
    const limit = bangumi.limit ?? 10;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error("ALNILAM: bangumi.limit must be an integer between 1 and 50");
    }
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
    comments: Object.freeze({
      enabled: comments.enabled === true,
      provider: "giscus",
      repo: typeof comments.repo === "string" ? comments.repo : "",
      repoId: typeof comments.repoId === "string" ? comments.repoId : "",
      category: typeof comments.category === "string" ? comments.category : "",
      categoryId: typeof comments.categoryId === "string" ? comments.categoryId : "",
      mapping: comments.mapping === "specific" || comments.mapping === "number" ? comments.mapping : "pathname",
    }),
    bangumi: Object.freeze({
      enabled: bangumi.enabled === true,
      userId: typeof bangumi.userId === "string" ? bangumi.userId : "",
      subjectType: bangumi.subjectType || "anime",
      limit: bangumi.limit ?? 10,
    }),
  });
}

