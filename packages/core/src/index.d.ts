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
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;
export declare const SITE_CONFIG_FILENAME: "alnilam.config.yaml";
/** Parses a Site YAML document; throws unless the root document is a YAML mapping. */
export declare function parseSiteConfigDocument(
  raw: string,
  options?: { filename?: string },
): Record<string, unknown>;
