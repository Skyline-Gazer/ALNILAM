import fs from "node:fs";
import path from "node:path";
import type { CollectionEntry } from "astro:content";
import { normalizeSiteConfig, parseSiteConfigDocument, type SiteConfig, type TaxonomyEntry } from "@alnilam/core";
import { filterPostsByLocale, localeRoutePath, postPath, withBase } from "./i18n.mjs";

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

/**
 * Listing corpora for the locale content policy (#35).
 *
 * Every listing surface — home, posts index, archives, category and tag indexes, taxonomy
 * detail pages and series — takes its corpus from exactly one of these helpers, so the
 * default locale and the localized routes cannot drift into two different query rules.
 * A locale's corpus is the published posts whose resolved `lang` equals that locale.
 */
export interface ListingOptions {
  locale: string;
  defaultLocale: string;
  taxonomy: SiteTaxonomy;
}

export interface CategoryListingOptions extends ListingOptions {
  /** series id → declared defaultCategory, used when a post has no own category */
  seriesCategories: ReadonlyMap<string, string>;
}

export interface ListingTile {
  name: string;
  count: number;
  url: string;
}

/** Archive/timeline entries in list order for one locale, in the shape the theme consumes. */
export function archiveListing(
  posts: CollectionEntry<"posts">[],
  { locale, defaultLocale }: Pick<ListingOptions, "locale" | "defaultLocale">,
): { slug: string; url: string; data: CollectionEntry<"posts">["data"] }[] {
  return filterPostsByLocale(posts, locale, defaultLocale)
    .sort(comparePosts)
    .map((post) => ({
      slug: post.id,
      url: withBase(`${postPath(post, defaultLocale)}/`),
      data: post.data,
    }));
}

/** Category tiles counted over one locale's corpus. */
export function categoryListing(
  posts: CollectionEntry<"posts">[],
  { locale, defaultLocale, taxonomy, seriesCategories }: CategoryListingOptions,
): ListingTile[] {
  const countMap = new Map<string, number>();
  for (const post of filterPostsByLocale(posts, locale, defaultLocale)) {
    const category =
      post.data.category?.trim() || seriesCategories.get(post.data.series?.trim())?.trim();
    if (!category || category.includes("/")) continue;
    countMap.set(category, (countMap.get(category) ?? 0) + 1);
  }
  return [...countMap.entries()]
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([slug, count]) => ({
      name: categoryDisplayLabel(slug, taxonomy.categories, locale),
      count,
      url: withBase(localeRoutePath(locale, defaultLocale, `categories/${encodeURIComponent(slug)}`)),
    }));
}

/** Tag tiles counted over one locale's corpus; a post counts once per canonical tag. */
export function tagListing(
  posts: CollectionEntry<"posts">[],
  { locale, defaultLocale, taxonomy }: ListingOptions,
): ListingTile[] {
  const countMap = new Map<string, number>();
  for (const post of filterPostsByLocale(posts, locale, defaultLocale)) {
    const seenInPost = new Set<string>();
    for (const rawTag of post.data.tags) {
      const slug = canonicalTagSlug(rawTag, taxonomy.tags);
      // Same key-admission rule as taxonomyPaths: a slug containing "/" gets no route, so
      // the index must not offer a tile that links to a missing page.
      if (!slug || slug.includes("/")) continue;
      if (seenInPost.has(slug)) continue;
      seenInPost.add(slug);
      countMap.set(slug, (countMap.get(slug) ?? 0) + 1);
    }
  }
  return [...countMap.entries()]
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(([slug, count]) => ({
      name: tagDisplayLabel(slug, taxonomy.tags, locale),
      count,
      url: withBase(localeRoutePath(locale, defaultLocale, `tags/${encodeURIComponent(slug)}`)),
    }));
}
