import { postLang } from "./i18n.mjs";

/**
 * Posts that belong in one locale's feed: published entries of that locale
 * only, newest first. Cross-language items never mix into a single feed.
 */
export function localeFeedPosts(posts, locale, defaultLocale) {
  return posts
    .filter((post) => !post.data.draft && postLang(post, defaultLocale) === locale)
    .sort((a, b) => {
      const diff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
}
