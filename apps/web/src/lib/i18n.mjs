/**
 * i18n routing helpers (schema v1 additive fields: `lang`, `translationKey`).
 *
 * Default-locale articles live at /posts/<slug>/; other locales live at
 * /<lang>/posts/<slug>/. A matching locale directory in the content id is
 * removed from the URL slug.
 * hreflang alternates: pages sharing a `translationKey` cross-link each other.
 */

/**
 * Prefix an internal root-relative path with the deploy base (Astro injects
 * BASE_URL from the `base` config; "/" for root-hosted Sites). Paths that
 * already carry the base are returned unchanged so a base-aware component can
 * compose with another without producing "/ALNILAM/ALNILAM/...".
 */
export function withBase(p, baseOverride) {
  // External and protocol-relative URLs pass through untouched.
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(p)) return p;
  const base = (baseOverride ?? import.meta.env?.BASE_URL ?? "/").replace(/\/+$/, "");
  const path = p.startsWith("/") ? p : "/" + p;
  if (base && (path === base || path.startsWith(base + "/"))) return path;
  return base + path;
}

/**
 * Absolute canonical URL for a Site-owned logical path (no base prefix).
 * Query strings and fragments never belong in a canonical URL.
 */
export function canonicalUrl(path, siteUrl, baseOverride) {
  const url = new URL(withBase(path, baseOverride), siteUrl);
  url.search = "";
  url.hash = "";
  return url.toString();
}


export function postLang(post, defaultLocale) {
  return post.data.lang || defaultLocale;
}

/** URL path (callers append "/"). */
export function postPath(post, defaultLocale) {
  const lang = postLang(post, defaultLocale);
  const slug = postLocalSlug(post, defaultLocale);
  return lang === defaultLocale ? `/posts/${slug}` : `/${lang}/posts/${slug}`;
}

/** Layout props shared by every page; reflects optional-module feature flags. */
export function layoutProps(config) {
  return {
    siteTitle: config.site.title,
    appearance: config.theme.appearance,
    locale: config.site.locale,
    showBangumi: config.bangumi.enabled,
  };
}

/**
 * hreflang alternate map for one post: { lang: path } across all translations
 * sharing its translationKey (including itself), plus `x-default` only when the
 * group really contains a default-locale page. Null when untranslatable.
 *
 * `locales` is the Site's enabled locale list; content with an undeclared
 * locale still renders but never claims an hreflang equivalence.
 */
export function translationAlternates(post, allPosts, defaultLocale, locales) {
  if (!post.data.translationKey) return null;
  const enabled = Array.isArray(locales) && locales.length > 0 ? new Set(locales) : null;
  const group = allPosts
    .filter((p) => p.data.translationKey === post.data.translationKey && !p.data.draft)
    .filter((p) => !enabled || enabled.has(postLang(p, defaultLocale)));
  if (group.length < 2) return null;
  const ordered = [...group].sort((a, b) => {
    const la = postLang(a, defaultLocale);
    const lb = postLang(b, defaultLocale);
    if (la === lb) return a.id.localeCompare(b.id);
    if (la === defaultLocale) return -1;
    if (lb === defaultLocale) return 1;
    return la.localeCompare(lb);
  });
  const alternates = new Map();
  for (const p of ordered) {
    alternates.set(postLang(p, defaultLocale), postPath(p, defaultLocale));
  }
  // Google's x-default marks the page served to unmatched languages. Only a
  // group that actually publishes the default locale has such a page.
  const fallback = alternates.get(defaultLocale);
  if (fallback) alternates.set("x-default", fallback);
  return alternates;
}

/**
 * Locale-scoped feed URL path: "/rss.xml" for the default locale,
 * "/<locale>/rss.xml" for every other enabled locale.
 */
export function feedPath(locale, defaultLocale) {
  return locale === defaultLocale ? "/rss.xml" : `/${locale}/rss.xml`;
}

/**
 * Logical route path for a locale (`prefixDefaultLocale: false`):
 * default locale keeps `/...`, non-default locales get `/<locale>/...`.
 */
export function localeRoutePath(locale, defaultLocale, segment = "") {
  const clean = String(segment).replace(/^\/+/, "").replace(/\/+$/, "");
  if (locale === defaultLocale) {
    return clean ? `/${clean}/` : "/";
  }
  return clean ? `/${locale}/${clean}/` : `/${locale}/`;
}

/**
 * Post slug without a leading matching `<lang>/` content directory prefix.
 */
export function postLocalSlug(post, defaultLocale) {
  const lang = postLang(post, defaultLocale);
  return post.id.startsWith(lang + "/") ? post.id.slice(lang.length + 1) : post.id;
}

/**
 * Filter published posts to a single locale.
 */
export function filterPostsByLocale(posts, locale, defaultLocale) {
  return posts.filter((post) => !post.data.draft && postLang(post, defaultLocale) === locale);
}

/**
 * Reciprocal hreflang alternates across locales that actually publish a given
 * logical route segment (e.g. `""`, `"posts"`, `"categories/guide"`).
 * Returns null when fewer than 2 locales publish the route.
 */
export function routeAlternates(activeLocales, defaultLocale, enabledLocales, segment = "") {
  const enabled = Array.isArray(enabledLocales) && enabledLocales.length > 0 ? new Set(enabledLocales) : null;
  const valid = [...new Set(activeLocales)].filter((locale) => !enabled || enabled.has(locale));
  if (valid.length < 2) return null;
  const ordered = [...valid].sort((a, b) => {
    if (a === defaultLocale) return -1;
    if (b === defaultLocale) return 1;
    return a.localeCompare(b);
  });
  const map = new Map();
  for (const locale of ordered) {
    map.set(locale, localeRoutePath(locale, defaultLocale, segment));
  }
  if (map.has(defaultLocale)) {
    map.set("x-default", map.get(defaultLocale));
  }
  return map;
}

const UI_STRINGS = {
  "zh-CN": {
    recentPosts: "最近文章",
    allPosts: "全部文章",
    postsTitle: "文章",
    pageTitle: (p) => `文章 · 第 ${p} 页`,
    postsSubtitle: (total, cur, last) => `共 ${total} 篇 · 第 ${cur}/${last} 页`,
    categories: "分类",
    allCategories: "← 全部分类",
    categoriesSubtitle: (c, p) => `${c} 个分类 · ${p} 篇文章`,
    categoryDesc: (label) => `分类 ${label} 下的全部文章`,
    postsCount: (n) => `${n} 篇文章`,
    tags: "标签",
    allTags: "← 全部标签",
    tagsSubtitle: (t, p) => `${t} 个标签 · ${p} 篇文章`,
    tagDesc: (label) => `标签 ${label} 下的全部文章`,
    archives: "归档",
    home: "首页",
  },
  en: {
    recentPosts: "Recent Posts",
    allPosts: "All Posts",
    postsTitle: "Posts",
    pageTitle: (p) => `Posts · Page ${p}`,
    postsSubtitle: (total, cur, last) => `${total} posts · Page ${cur}/${last}`,
    categories: "Categories",
    allCategories: "← All Categories",
    categoriesSubtitle: (c, p) => `${c} categories · ${p} posts`,
    categoryDesc: (label) => `All posts in category ${label}`,
    postsCount: (n) => `${n} posts`,
    tags: "Tags",
    allTags: "← All Tags",
    tagsSubtitle: (t, p) => `${t} tags · ${p} posts`,
    tagDesc: (label) => `All posts tagged #${label}`,
    archives: "Archives",
    home: "Home",
  },
  ja: {
    recentPosts: "最新の記事",
    allPosts: "すべての記事",
    postsTitle: "記事",
    pageTitle: (p) => `記事 · ${p} ページ目`,
    postsSubtitle: (total, cur, last) => `全 ${total} 件 · ${cur}/${last} ページ`,
    categories: "カテゴリ",
    allCategories: "← カテゴリ一覧",
    categoriesSubtitle: (c, p) => `${c} カテゴリ · ${p} 件の記事`,
    categoryDesc: (label) => `カテゴリ「${label}」の記事一覧`,
    postsCount: (n) => `${n} 件の記事`,
    tags: "タグ",
    allTags: "← タグ一覧",
    tagsSubtitle: (t, p) => `${t} タグ · ${p} 件の記事`,
    tagDesc: (label) => `タグ #${label} の記事一覧`,
    archives: "アーカイブ",
    home: "ホーム",
  },
};

export function uiStrings(locale) {
  return UI_STRINGS[locale] || UI_STRINGS.en;
}
