import { getCollection, type CollectionEntry } from "astro:content";
import type { GetStaticPaths } from "astro";
import { postLang } from "./i18n.mjs";
import { loadSite } from "./site-source.mjs";
import { POSTS_PAGE_SIZE } from "./pagination.mjs";
import { canonicalTagSlug, categoryDisplayLabel, comparePosts, loadSiteTaxonomy, resolvePostCategory, tagDisplayLabel } from "./taxonomy";

type Kind = "categories" | "tags";
type Post = CollectionEntry<"posts">;
type Paginate = Parameters<GetStaticPaths>[0]["paginate"];

export async function taxonomyPaths(paginate: Paginate, kind: Kind, localized: boolean) {
  const { root, config } = loadSite();
  const taxonomy = loadSiteTaxonomy(root, config);
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const series = await getCollection("series");
  const seriesCategories = new Map(series.map((entry) => [entry.id, entry.data.defaultCategory]));
  const groups = new Map<string, { all: Post[]; byLocale: Map<string, Post[]> }>();
  for (const post of posts) {
    const locale = postLang(post, config.site.locale);
    const category = post.data.category?.trim() || seriesCategories.get(post.data.series?.trim())?.trim();
    const keys = kind === "categories"
      ? category && !category.includes("/") ? [resolvePostCategory(category, taxonomy.categories)] : []
      : [...new Set(post.data.tags.map((tag) => canonicalTagSlug(tag, taxonomy.tags)))];
    for (const key of keys) {
      if (!key || key.includes("/")) continue;
      if (!groups.has(key)) groups.set(key, { all: [], byLocale: new Map() });
      const group = groups.get(key)!;
      group.all.push(post);
      if (locale !== config.site.locale && config.locales.includes(locale)) {
        if (!group.byLocale.has(locale)) group.byLocale.set(locale, []);
        group.byLocale.get(locale)!.push(post);
      }
    }
  }
  return [...groups].flatMap(([slug, { all, byLocale }]) => {
    const activeLocales = [
      config.site.locale,
      ...config.locales.filter((loc) => loc !== config.site.locale && byLocale.has(loc)),
    ];
    const targets: Array<[string, Post[]]> = localized
      ? [...byLocale.entries()]
      : [[config.site.locale, all]];
    return targets.flatMap(([locale, list]) => {
      const label = kind === "categories"
        ? categoryDisplayLabel(slug, taxonomy.categories, locale)
        : tagDisplayLabel(slug, taxonomy.tags, locale);
      const labels = Object.fromEntries((kind === "categories" ? taxonomy.categories : taxonomy.tags).map((entry) => [
        entry.slug,
        kind === "categories" ? categoryDisplayLabel(entry.slug, taxonomy.categories, locale) : tagDisplayLabel(entry.slug, taxonomy.tags, locale),
      ]));
      return paginate(list.sort(comparePosts), {
        params: { ...(localized ? { lang: locale } : {}), [kind === "categories" ? "category" : "tag"]: slug },
        pageSize: POSTS_PAGE_SIZE,
        props: { kind, locale, slug, label, labels, activeLocales },
      });
    });
  });
}
