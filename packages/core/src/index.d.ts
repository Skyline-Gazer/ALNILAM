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
  comments: Readonly<CommentsConfig>;
  bangumi: Readonly<BangumiConfig>;
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;
