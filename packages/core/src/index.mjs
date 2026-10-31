/**
 * Site-owned configuration is normalized here, not in theme components.
 *
 * Schema v2 contract (Site v2 — YAML-only):
 * - schemaVersion: MUST be 2.
 * - site.title, site.url: required.
 * - Unknown top-level or nested config keys fail closed.
 * - Taxonomy IDs/slugs, locale and routing fields are validated at load time.
 */
const SUPPORTED_SCHEMA_VERSIONS = [2];
const ROOT_KEYS = new Set([
  "schemaVersion",
  "site",
  "theme",
  "locales",
  "comments",
  "bangumi",
]);
const SITE_KEYS = new Set(["title", "description", "url", "locale"]);
const THEME_KEYS = new Set(["appearance"]);

const COMMENT_KEYS = new Set(["enabled", "provider", "repo", "repoId", "category", "categoryId", "mapping"]);
const BANGUMI_KEYS = new Set(["enabled", "userId", "subjectType", "limit"]);
const BCP47 = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/;
const DEFAULT_SITE_LOCALE = "zh-CN";
const isBcp47 = (value) => typeof value === "string" && BCP47.test(value);

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`ALNILAM: ${label} must be an object`);
  }
}

function rejectUnknownKeys(object, allowed, label) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      throw new Error(`ALNILAM: unknown ${label} field ${JSON.stringify(key)}`);
    }
  }
}

function parseAbsoluteUrl(url, label = "site.url") {
  if (typeof url !== "string") {
    throw new Error(`ALNILAM: ${label} must be an absolute http(s) URL`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (!parsed || !["https:", "http:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`ALNILAM: ${label} must be an absolute http(s) URL`);
  }
  return parsed.toString();
}

function normalizeLocale(value) {
  if (value === undefined) return DEFAULT_SITE_LOCALE;
  if (!isBcp47(value)) {
    throw new Error("ALNILAM: site.locale must be a BCP-47 tag");
  }
  return value;
}

export function normalizeSiteConfig(input) {
  assertPlainObject(input, "config");
  const schemaVersion = input.schemaVersion;
  if (!Number.isInteger(schemaVersion) || !SUPPORTED_SCHEMA_VERSIONS.includes(schemaVersion)) {
    throw new Error(
      "ALNILAM: unsupported schemaVersion " + JSON.stringify(schemaVersion) +
      " (supported: " + SUPPORTED_SCHEMA_VERSIONS.join(", ") + "). Upgrade Core to build this Site.",
    );
  }
  // Unknown fields only matter once the Site declares a contract Core supports.
  rejectUnknownKeys(input, ROOT_KEYS, "config");

  assertPlainObject(input.site, "site");
  rejectUnknownKeys(input.site, SITE_KEYS, "site");
  const title = input.site.title;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("ALNILAM: site.title must be a non-empty string");
  }
  const siteLocale = normalizeLocale(input.site.locale);
  const siteUrl = parseAbsoluteUrl(input.site.url);
  if (input.site.description !== undefined && typeof input.site.description !== "string") {
    throw new Error("ALNILAM: site.description must be a string");
  }

  assertPlainObject(input.theme ?? {}, "theme");
  rejectUnknownKeys(input.theme ?? {}, THEME_KEYS, "theme");
  const appearance = input.theme?.appearance || "dark";
  if (!["dark", "light"].includes(appearance)) {
    throw new Error("ALNILAM: theme.appearance must be dark or light");
  }

  let locales = input.locales;
  if (locales === undefined) locales = [siteLocale];
  if (!Array.isArray(locales) || locales.length === 0) {
    throw new Error("ALNILAM: locales must be a non-empty array");
  }
  const localeSet = new Set();
  for (const locale of locales) {
    if (!isBcp47(locale)) {
      throw new Error("ALNILAM: locales must contain BCP-47 tags only");
    }
    if (localeSet.has(locale)) throw new Error(`ALNILAM: duplicate locale ${JSON.stringify(locale)}`);
    localeSet.add(locale);
  }
  if (!localeSet.has(siteLocale)) {
    throw new Error("ALNILAM: site.locale must appear in locales");
  }

  assertPlainObject(input.comments ?? {}, "comments");
  rejectUnknownKeys(input.comments ?? {}, COMMENT_KEYS, "comments");
  const comments = input.comments ?? {};
  if (comments.enabled === true) {
    if (comments.provider !== undefined && comments.provider !== "giscus") {
      throw new Error('ALNILAM: comments.provider must be "giscus"');
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

  assertPlainObject(input.bangumi ?? {}, "bangumi");
  rejectUnknownKeys(input.bangumi ?? {}, BANGUMI_KEYS, "bangumi");
  const bangumi = input.bangumi ?? {};
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
      description: input.site.description || "",
      url: siteUrl,
      locale: siteLocale,
    }),
    theme: Object.freeze({ appearance }),
    locales: Object.freeze([...locales]),
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

export { parseSiteConfigDocument, SITE_CONFIG_FILENAME } from "./parse-site-config.mjs";
