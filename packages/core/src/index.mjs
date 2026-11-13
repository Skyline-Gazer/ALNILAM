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
  "routing",
  "locales",
  "categories",
  "tags",
  "comments",
  "bangumi",
  "llms",
  "consent",
  "analytics",
  "ads",
]);
const SITE_KEYS = new Set(["title", "description", "url", "locale"]);
const THEME_KEYS = new Set(["appearance"]);
const ROUTING_KEYS = new Set(["prefixDefaultLocale"]);
const COMMENT_KEYS = new Set([
  "enabled",
  "provider",
  "repo",
  "repoId",
  "category",
  "categoryId",
  "mapping",
  "sharing",
  "load",
  "lang",
  "csp",
]);
const COMMENT_PROVIDERS = new Set(["giscus"]);
const COMMENT_MAPPINGS = new Set(["specific", "pathname", "number"]);
const COMMENT_SHARING = new Set(["translation", "locale"]);
const COMMENT_LOADS = new Set(["click", "visible"]);
// Public GitHub owner/name only. Tokens, webhook secrets and private API keys
// are never part of this contract and fail closed as unknown fields.
const COMMENT_REPO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/;
const BANGUMI_KEYS = new Set(["enabled", "userId", "subjectType", "limit"]);
const LLMS_KEYS = new Set(["enabled", "full"]);
const CONSENT_KEYS = new Set(["mode"]);
const CONSENT_MODES = new Set(["off", "basic"]);
const ANALYTICS_KEYS = new Set(["googleAnalytics"]);
const GA_KEYS = new Set(["enabled", "measurementId"]);
// Public measurement IDs only; no API secrets belong in this contract.
const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/;
const ADS_KEYS = new Set(["adsense"]);
const ADSENSE_KEYS = new Set(["enabled", "clientId", "mode", "adsTxt", "recovery"]);
const ADSENSE_MODES = new Set(["auto"]);
const RECOVERY_KEYS = new Set(["mode", "googleTag", "dismissDays"]);
const RECOVERY_MODES = new Set(["off", "google", "custom"]);
// Public client IDs only; ad-manager secrets never belong in Site config.
const ADSENSE_CLIENT_ID = /^ca-pub-\d+$/;
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

function normalizeLabelMap(value, label) {
  if (value === undefined) return Object.freeze({});
  assertPlainObject(value, label);
  const out = {};
  for (const [locale, text] of Object.entries(value)) {
    if (!isBcp47(locale)) throw new Error(`ALNILAM: ${label} contains invalid locale ${JSON.stringify(locale)}`);
    if (typeof text !== "string" || !text.trim()) {
      throw new Error(`ALNILAM: ${label}.${locale} must be a non-empty string`);
    }
    out[locale] = text.trim();
  }
  return Object.freeze(out);
}

function normalizeTaxonomy(entries, kind) {
  if (entries === undefined) return Object.freeze([]);
  if (!Array.isArray(entries)) throw new Error(`ALNILAM: ${kind} must be an array`);
  const seenIds = new Set();
  const seenSlugs = new Set();
  return Object.freeze(entries.map((entry, index) => {
    const label = `${kind}[${index}]`;
    assertPlainObject(entry, label);
    rejectUnknownKeys(entry, new Set(["id", "slug", "label"]), label);
    const id = entry.id;
    const slug = entry.slug;
    if (typeof id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error(`ALNILAM: ${label}.id must be a stable lowercase ASCII slug`);
    }
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(`ALNILAM: ${label}.slug must be a lowercase ASCII slug`);
    }
    if (seenIds.has(id)) throw new Error(`ALNILAM: duplicate ${kind} id ${JSON.stringify(id)}`);
    if (seenSlugs.has(slug)) throw new Error(`ALNILAM: duplicate ${kind} slug ${JSON.stringify(slug)}`);
    seenIds.add(id);
    seenSlugs.add(slug);
    return Object.freeze({
      id,
      slug,
      label: normalizeLabelMap(entry.label, `${label}.label`),
    });
  }));
}

function normalizeComments(value) {
  assertPlainObject(value ?? {}, "comments");
  rejectUnknownKeys(value ?? {}, COMMENT_KEYS, "comments");
  const comments = value ?? {};
  if (comments.enabled !== undefined && typeof comments.enabled !== "boolean") {
    throw new Error("ALNILAM: comments.enabled must be a boolean");
  }
  const enabled = comments.enabled === true;
  const provider = comments.provider ?? "giscus";
  if (!COMMENT_PROVIDERS.has(provider)) {
    throw new Error('ALNILAM: comments.provider must be "giscus" (the only supported provider)');
  }
  const mapping = comments.mapping ?? "specific";
  if (!COMMENT_MAPPINGS.has(mapping)) {
    throw new Error("ALNILAM: comments.mapping must be specific, pathname or number");
  }
  const sharing = comments.sharing ?? "translation";
  if (!COMMENT_SHARING.has(sharing)) {
    throw new Error("ALNILAM: comments.sharing must be translation or locale");
  }
  const load = comments.load ?? "click";
  if (!COMMENT_LOADS.has(load)) {
    throw new Error("ALNILAM: comments.load must be click or visible");
  }
  if (comments.lang !== undefined && comments.lang !== "auto" && !isBcp47(comments.lang)) {
    throw new Error('ALNILAM: comments.lang must be "auto" or a BCP-47 tag');
  }
  if (comments.csp !== undefined && typeof comments.csp !== "boolean") {
    throw new Error("ALNILAM: comments.csp must be a boolean");
  }
  const fields = {};
  for (const field of ["repo", "repoId", "category", "categoryId"]) {
    const raw = comments[field];
    if (raw !== undefined && typeof raw !== "string") {
      throw new Error(`ALNILAM: comments.${field} must be a string`);
    }
    fields[field] = typeof raw === "string" ? raw.trim() : "";
  }
  if (fields.repo && !COMMENT_REPO.test(fields.repo)) {
    throw new Error('ALNILAM: comments.repo must be a public GitHub "owner/repo" identifier');
  }
  if (enabled) {
    if (!fields.repo) {
      throw new Error('ALNILAM: comments.repo is required when comments.enabled = true (format "owner/repo")');
    }
    for (const field of ["repoId", "category", "categoryId"]) {
      if (!fields[field]) {
        throw new Error(`ALNILAM: comments.${field} is required when comments.enabled = true`);
      }
    }
  }
  if (enabled && comments.mapping == null) {
    throw new Error('ALNILAM: comments.mapping is required when comments.enabled = true; set "pathname" to preserve existing threads or "specific" for new threads');
  }
  return Object.freeze({
    enabled,
    provider: "giscus",
    repo: fields.repo,
    repoId: fields.repoId,
    category: fields.category,
    categoryId: fields.categoryId,
    mapping,
    sharing,
    load,
    lang: comments.lang ?? "auto",
    csp: comments.csp !== false,
  });
}

function normalizeConsent(value) {
  assertPlainObject(value ?? {}, "consent");
  rejectUnknownKeys(value ?? {}, CONSENT_KEYS, "consent");
  const mode = value?.mode ?? "off";
  if (!CONSENT_MODES.has(mode)) {
    throw new Error('ALNILAM: consent.mode must be "off" or "basic"');
  }
  return Object.freeze({ mode });
}

function normalizeAnalytics(value) {
  assertPlainObject(value ?? {}, "analytics");
  rejectUnknownKeys(value ?? {}, ANALYTICS_KEYS, "analytics");
  const ga = value?.googleAnalytics ?? {};
  assertPlainObject(ga, "analytics.googleAnalytics");
  rejectUnknownKeys(ga, GA_KEYS, "analytics.googleAnalytics");
  if (ga.enabled !== undefined && typeof ga.enabled !== "boolean") {
    throw new Error("ALNILAM: analytics.googleAnalytics.enabled must be a boolean");
  }
  const measurementId = typeof ga.measurementId === "string" ? ga.measurementId.trim() : "";
  if (measurementId && !GA_MEASUREMENT_ID.test(measurementId)) {
    throw new Error('ALNILAM: analytics.googleAnalytics.measurementId must match /^G-[A-Z0-9]+$/');
  }
  const enabled = ga.enabled === true;
  if (enabled && !measurementId) {
    throw new Error("ALNILAM: analytics.googleAnalytics.measurementId is required when enabled = true");
  }
  return Object.freeze({
    googleAnalytics: Object.freeze({ enabled, measurementId }),
  });
}

function normalizeAds(value) {
  assertPlainObject(value ?? {}, "ads");
  rejectUnknownKeys(value ?? {}, ADS_KEYS, "ads");
  const adsense = value?.adsense ?? {};
  assertPlainObject(adsense, "ads.adsense");
  rejectUnknownKeys(adsense, ADSENSE_KEYS, "ads.adsense");
  if (adsense.enabled !== undefined && typeof adsense.enabled !== "boolean") {
    throw new Error("ALNILAM: ads.adsense.enabled must be a boolean");
  }
  const clientId = typeof adsense.clientId === "string" ? adsense.clientId.trim() : "";
  if (clientId && !ADSENSE_CLIENT_ID.test(clientId)) {
    throw new Error('ALNILAM: ads.adsense.clientId must match /^ca-pub-\\d+$/');
  }
  const mode = adsense.mode ?? "auto";
  if (!ADSENSE_MODES.has(mode)) {
    throw new Error('ALNILAM: ads.adsense.mode must be "auto" (manual slots are not supported in this slice)');
  }
  if (adsense.adsTxt !== undefined && typeof adsense.adsTxt !== "string") {
    throw new Error("ALNILAM: ads.adsense.adsTxt must be a string");
  }
  const enabled = adsense.enabled === true;
  if (enabled && !clientId) {
    throw new Error('ALNILAM: ads.adsense.clientId is required when enabled = true (format "ca-pub-1234567890")');
  }
  const recovery = adsense.recovery ?? {};
  assertPlainObject(recovery, "ads.adsense.recovery");
  rejectUnknownKeys(recovery, RECOVERY_KEYS, "ads.adsense.recovery");
  const recoveryMode = recovery.mode ?? "off";
  if (!RECOVERY_MODES.has(recoveryMode)) {
    throw new Error('ALNILAM: ads.adsense.recovery.mode must be "off", "google" or "custom"');
  }
  const googleTag = typeof recovery.googleTag === "string" ? recovery.googleTag.trim() : "";
  if (recoveryMode === "google" && !googleTag) {
    throw new Error("ALNILAM: ads.adsense.recovery.googleTag is required when recovery.mode = \"google\"");
  }
  if (googleTag && recoveryMode !== "google") {
    throw new Error('ALNILAM: ads.adsense.recovery.googleTag is only valid when recovery.mode = "google"');
  }
  if (googleTag) {
    let parsed;
    try {
      parsed = new URL(googleTag);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:" ||
        !(parsed.hostname === "google.com" || parsed.hostname.endsWith(".google.com") || parsed.hostname.endsWith(".googlesyndication.com"))) {
      throw new Error("ALNILAM: ads.adsense.recovery.googleTag must be the official https script URL from Google (fundingchoicesmessages.google.com or googlesyndication.com)");
    }
  }
  const dismissDays = recovery.dismissDays ?? 7;
  if (!Number.isInteger(dismissDays) || dismissDays < 1 || dismissDays > 365) {
    throw new Error("ALNILAM: ads.adsense.recovery.dismissDays must be an integer between 1 and 365");
  }
  return Object.freeze({
    adsense: Object.freeze({
      enabled,
      clientId,
      mode,
      adsTxt: adsense.adsTxt ?? "",
      recovery: Object.freeze({ mode: recoveryMode, googleTag, dismissDays }),
    }),
  });
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

  if (input.routing !== undefined) {
    assertPlainObject(input.routing, "routing");
    rejectUnknownKeys(input.routing, ROUTING_KEYS, "routing");
    if (input.routing.prefixDefaultLocale !== undefined && typeof input.routing.prefixDefaultLocale !== "boolean") {
      throw new Error("ALNILAM: routing.prefixDefaultLocale must be a boolean");
    }
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

  const categories = normalizeTaxonomy(input.categories, "categories");
  const tags = normalizeTaxonomy(input.tags, "tags");
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

  assertPlainObject(input.llms ?? {}, "llms");
  rejectUnknownKeys(input.llms ?? {}, LLMS_KEYS, "llms");
  for (const field of ["enabled", "full"]) {
    if (input.llms?.[field] !== undefined && typeof input.llms[field] !== "boolean") {
      throw new Error(`ALNILAM: llms.${field} must be a boolean`);
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
    routing: Object.freeze({
      prefixDefaultLocale: input.routing?.prefixDefaultLocale ?? false,
    }),
    locales: Object.freeze([...locales]),
    categories,
    tags,
    comments: normalizeComments(input.comments),
    consent: normalizeConsent(input.consent),
    analytics: normalizeAnalytics(input.analytics),
    ads: normalizeAds(input.ads),
    llms: Object.freeze({ enabled: input.llms?.enabled === true, full: input.llms?.full === true }),
    bangumi: Object.freeze({
      enabled: bangumi.enabled === true,
      userId: typeof bangumi.userId === "string" ? bangumi.userId : "",
      subjectType: bangumi.subjectType || "anime",
      limit: bangumi.limit ?? 10,
    }),
  });
}

export { parseSiteConfigDocument, SITE_CONFIG_FILENAME } from "./parse-site-config.mjs";
