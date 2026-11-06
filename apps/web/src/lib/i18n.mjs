/**
 * i18n routing helpers (schema v1 additive fields: `lang`, `translationKey`).
 *
 * URL scheme: posts in the site's default locale keep /posts/<slug>/; posts
 * with an explicit `lang` differing from the site default live under
 * /posts/<lang>/<slug>/. The slug is the content file path under
 * content/posts (Astro glob id) — recommended layout is one directory per
 * non-default locale (content/posts/en/…, content/posts/ja/…), which keeps
 * ids clean; the URL lang prefix comes from frontmatter `lang`, not the path.
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
  if (lang === defaultLocale) return `/posts/${post.id}`;
  // If the file already lives in a content/posts/<lang>/ directory, the glob id
  // starts with "<lang>/" — reuse it instead of double-prefixing.
  return post.id.startsWith(lang + "/") ? `/posts/${post.id}` : `/posts/${lang}/${post.id}`;
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
