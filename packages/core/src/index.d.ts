export interface CommentsConfig {
  enabled: boolean;
  provider: "giscus";
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: "pathname" | "specific" | "number";
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
  /** Validated but not consumed by this Core revision (reserved for routing). */
  locales: readonly string[];
  comments: Readonly<CommentsConfig>;
  bangumi: Readonly<BangumiConfig>;
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;
export declare const SITE_CONFIG_FILENAME: "alnilam.config.yaml";
/** Parses a Site YAML document; throws unless the root document is a YAML mapping. */
export declare function parseSiteConfigDocument(
  raw: string,
  options?: { filename?: string },
): Record<string, unknown>;
