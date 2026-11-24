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
  const groups = new Map<string, Map<string, Post[]>>();
  for (const post of posts) {
    const locale = postLang(post, config.site.locale);
    const category = post.data.category?.trim() || seriesCategories.get(post.data.series?.trim())?.trim();
    const keys = kind === "categories"
      ? category && !category.includes("/") ? [resolvePostCategory(category, taxonomy.categories)] : []
      : [...new Set(post.data.tags.map((tag) => canonicalTagSlug(tag, taxonomy.tags)))];
    for (const key of keys) {
      if (!key || key.includes("/")) continue;
      // Locale content policy (#35): each group is bucketed per locale, the default locale
      // included, so no taxonomy route lists another language's articles inside its chrome.
      // A post whose `lang` is not a configured locale keeps its article URL but appears in
      // no taxonomy listing.
      if (!config.locales.includes(locale)) continue;
      if (!groups.has(key)) groups.set(key, new Map());
      const byLocale = groups.get(key)!;
      if (!byLocale.has(locale)) byLocale.set(locale, []);
      byLocale.get(locale)!.push(post);
    }
  }
  return [...groups].flatMap(([slug, byLocale]) => {
    // Alternates may only name a locale whose route is actually generated: a group with no
    // default-locale member has no unlocalized route, so claiming one would emit a hreflang
    // target and a sitemap alternate that 404.
    const activeLocales = [
      ...(byLocale.has(config.site.locale) ? [config.site.locale] : []),
      ...config.locales.filter((loc) => loc !== config.site.locale && byLocale.has(loc)),
    ];
    // A locale only gets a taxonomy route when that locale has articles in the group; an
    // empty default-locale group means the unlocalized route is not generated at all.
    const targets: Array<[string, Post[]]> = (localized
      ? [...byLocale.entries()].filter(([locale]) => locale !== config.site.locale)
      : [[config.site.locale, byLocale.get(config.site.locale)] as [string, Post[] | undefined]]
    ).filter((entry): entry is [string, Post[]] => (entry[1]?.length ?? 0) > 0);
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
