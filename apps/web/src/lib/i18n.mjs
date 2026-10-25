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
 * BASE_URL from the `base` config; "/" for root-hosted Sites).
 */
export function withBase(p) {
  // External URLs pass through untouched.
  if (/^https?:\/\//.test(p)) return p;
  const base = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");
  return base + (p.startsWith("/") ? p : "/" + p);
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
 * sharing its translationKey (including itself). Null when untranslatable.
 */
export function translationAlternates(post, allPosts, defaultLocale) {
  if (!post.data.translationKey) return null;
  const group = allPosts.filter(
    (p) => p.data.translationKey === post.data.translationKey && !p.data.draft,
  );
  if (group.length < 2) return null;
  const alternates = new Map();
  for (const p of group) {
    alternates.set(postLang(p, defaultLocale), postPath(p, defaultLocale));
  }
  return alternates;
}
