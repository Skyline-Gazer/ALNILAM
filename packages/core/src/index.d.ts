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
  routing: { prefixDefaultLocale: boolean };
  locales: readonly string[];
  categories: readonly TaxonomyEntry[];
  tags: readonly TaxonomyEntry[];
  comments: Readonly<CommentsConfig>;
  bangumi: Readonly<BangumiConfig>;
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;
export declare const SITE_CONFIG_FILENAME: "alnilam.config.yaml";
export declare function parseSiteConfigDocument(
  raw: string,
  options?: { filename?: string },
): Record<string, unknown>;
