import fs from "node:fs";
import path from "node:path";
import { normalizeSiteConfig, parseSiteConfigDocument, type SiteConfig, type TaxonomyEntry } from "@alnilam/core";

export interface SiteTaxonomy {
  categories: readonly TaxonomyEntry[];
  tags: readonly TaxonomyEntry[];
}

function mergeTaxonomyEntries(
  baseEntries: readonly TaxonomyEntry[],
  extraEntries: readonly TaxonomyEntry[],
  kind: "categories" | "tags",
): readonly TaxonomyEntry[] {
  if (extraEntries.length === 0) return baseEntries;
  const seenIds = new Set(baseEntries.map((e) => e.id));
  const seenSlugs = new Set(baseEntries.map((e) => e.slug));
  const merged = [...baseEntries];
  for (const entry of extraEntries) {
    if (seenIds.has(entry.id)) {
      throw new Error(`ALNILAM: duplicate ${kind} id ${JSON.stringify(entry.id)} in data/taxonomy.yaml`);
    }
    if (seenSlugs.has(entry.slug)) {
      throw new Error(`ALNILAM: duplicate ${kind} slug ${JSON.stringify(entry.slug)} in data/taxonomy.yaml`);
    }
    seenIds.add(entry.id);
    seenSlugs.add(entry.slug);
    merged.push(entry);
  }
  return Object.freeze(merged);
}

/**
 * Loads validated Site taxonomy from `alnilam.config.yaml` and optional `data/taxonomy.yaml`.
 */
export function loadSiteTaxonomy(root: string, config: SiteConfig): SiteTaxonomy {
  const taxonomyFile = path.join(root, "data/taxonomy.yaml");
  if (!fs.existsSync(taxonomyFile)) {
    return { categories: config.categories, tags: config.tags };
  }
  const raw = fs.readFileSync(taxonomyFile, "utf8");
  const parsed = parseSiteConfigDocument(raw, { filename: "data/taxonomy.yaml" });
  for (const key of Object.keys(parsed)) {
    if (key !== "categories" && key !== "tags") {
      throw new Error(`ALNILAM: unknown data/taxonomy.yaml field ${JSON.stringify(key)}`);
    }
  }
  const validated = normalizeSiteConfig({
    schemaVersion: 2,
    site: config.site,
    locales: [...config.locales],
    categories: parsed.categories,
    tags: parsed.tags,
  });
  return {
    categories: mergeTaxonomyEntries(config.categories, validated.categories, "categories"),
    tags: mergeTaxonomyEntries(config.tags, validated.tags, "tags"),
  };
}

/**
 * Validates and normalizes a post's category against the Site's category catalog when present.
 */
export function resolvePostCategory(
  rawCategory: string | undefined,
  categories: readonly TaxonomyEntry[],
): string {
  const value = (rawCategory ?? "").trim();
  if (!value) return "";
  if (categories.length === 0) return value;
  const matched = categories.find(
    (entry) =>
      entry.id === value ||
      entry.slug === value ||
      Object.values(entry.label).includes(value),
  );
  if (!matched) {
    const allowed = categories.map((entry) => entry.slug).join(", ");
    throw new Error(
      `ALNILAM: post references unknown category ${JSON.stringify(value)} (declared categories: ${allowed})`,
    );
  }
  return matched.slug;
}

export function categoryDisplayLabel(
  category: string,
  categories: readonly TaxonomyEntry[],
  locale: string,
): string {
  const matched = categories.find(
    (entry) =>
      entry.slug === category ||
      entry.id === category ||
      Object.values(entry.label).includes(category),
  );
  if (!matched) return category;
  return matched.label[locale] || matched.label["zh-CN"] || matched.label["en"] || matched.slug;
}

export function tagDisplayLabel(
  tag: string,
  tags: readonly TaxonomyEntry[],
  locale: string,
): string {
  const lower = tag.toLowerCase();
  const matched = tags.find(
    (entry) =>
      entry.slug === tag ||
      entry.id === tag ||
      entry.slug === lower ||
      entry.id === lower ||
      Object.values(entry.label).includes(tag),
  );
  if (!matched) return tag;
  return matched.label[locale] || tag;
}

/**
 * Stable URL slug for a tag. Catalog entries resolve ids, slugs and localized
 * labels to the one canonical slug; free-form tags keep their own value.
 * Alias routes still render but canonicalize here, so the same term never
 * appears as two competing indexable URLs.
 */
export function canonicalTagSlug(tag: string, tags: readonly TaxonomyEntry[]): string {
  const value = tag.trim();
  const lower = value.toLowerCase();
  const matched = tags.find(
    (entry) =>
      entry.slug === value ||
      entry.id === value ||
      entry.slug === lower ||
      entry.id === lower ||
      Object.values(entry.label).some((label) => label.toLowerCase() === lower),
  );
  return matched ? matched.slug : value;
}

export function comparePosts<
  T extends { id: string; data: { pinned?: boolean; pubDate: Date } },
>(a: T, b: T): number {
  if (Boolean(a.data.pinned) !== Boolean(b.data.pinned)) {
    return a.data.pinned ? -1 : 1;
  }
  const diff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}
