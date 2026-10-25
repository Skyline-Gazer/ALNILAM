export interface SiteConfig {
  schemaVersion: number;
  site: { title: string; description: string; url: string; locale: string };
  theme: { appearance: "dark" | "light" };
}
export declare function normalizeSiteConfig(input: unknown): Readonly<SiteConfig>;

