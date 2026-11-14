export interface TaxonomyEntry {
  id: string;
  slug: string;
  label: Readonly<Record<string, string>>;
}
export interface CommentsConfig {
  enabled: boolean;
  provider: "giscus";
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  /** Required in enabled Site config; pathname preserves existing URL-based threads. */
  mapping: "specific" | "pathname" | "number";
  /** `translation` shares one thread per translationKey/commentId group. */
  sharing: "translation" | "locale";
  /** `click` requires the reader's explicit load; `visible` loads near the viewport. */
  load: "click" | "visible";
  /** `auto` follows the page locale; otherwise a BCP-47 giscus locale. */
  lang: "auto" | string;
  /** Emit the provider-scoped CSP meta tag on comment-enabled articles. */
  csp: boolean;
}
export interface BangumiConfig {
  enabled: boolean;
  userId: string;
  subjectType: "anime" | "book" | "music" | "game";
  limit: number;
}
export interface ConsentConfig {
  /** `off` ships no consent module; `basic` gates third-party loaders behind stored choices. */
  mode: "off" | "basic";
}
export interface GoogleAnalyticsConfig {
  enabled: boolean;
  /** Required and validated when `enabled`; matches /^G-[A-Z0-9]+$/ (public ID). */
  measurementId: string;
}
export interface AdSenseRecoveryConfig {
  mode: "off" | "google" | "custom";
  /** Required exactly when `mode` is "google". */
  googleTag: string;
  /** Custom-mode suppression window in days. */
  dismissDays: number;
}
export interface AdSenseConfig {
  enabled: boolean;
  /** Required and validated when `enabled`; matches /^ca-pub-\d+$/ (public ID). */
  clientId: string;
  mode: "auto";
  /** Non-empty content is emitted verbatim as the dist-root `ads.txt`. */
  adsTxt: string;
  recovery: Readonly<AdSenseRecoveryConfig>;
}
export interface SiteConfig {
  schemaVersion: number;
  site: { title: string; description: string; url: string; locale: string };
  theme: { appearance: "dark" | "light" };
  /** Validated and reserved; this Core revision does not consume the value yet. */
  routing: { prefixDefaultLocale: boolean };
  /** Validated but not consumed by this Core revision (reserved for routing). */
  locales: readonly string[];
  /** Validated catalog; tag pages still derive from post frontmatter in this slice. */
  categories: readonly TaxonomyEntry[];
  /** Validated catalog; tag pages still derive from post frontmatter in this slice. */
  tags: readonly TaxonomyEntry[];
  comments: Readonly<CommentsConfig>;
  llms: Readonly<{ enabled: boolean; full: boolean }>;
  bangumi: Readonly<BangumiConfig>;
  consent: Readonly<ConsentConfig>;
  analytics: Readonly<{ googleAnalytics: Readonly<GoogleAnalyticsConfig> }>;
  ads: Readonly<{ adsense: Readonly<AdSenseConfig> }>;
  /** Optional Site-owned Gallery module; absent means disabled. */
  gallery: Readonly<{ enabled: boolean }>;
  /** Optional Site-owned Moments module; absent means disabled. */
  moments: Readonly<{ enabled: boolean }>;
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;
export declare const SITE_CONFIG_FILENAME: "alnilam.config.yaml";
/** Parses a Site YAML document; throws unless the root document is a YAML mapping. */
export declare function parseSiteConfigDocument(
  raw: string,
  options?: { filename?: string },
): Record<string, unknown>;
