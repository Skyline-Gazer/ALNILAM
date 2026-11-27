import rss from "@astrojs/rss";
import { canonicalUrl, feedPath, filterPostsByLocale, postPath } from "./i18n.mjs";

/**
 * Posts that belong in one locale's feed: published entries of that locale
 * only, newest first. Cross-language items never mix into a single feed.
 */
export function localeFeedPosts(posts, locale, defaultLocale) {
  return filterPostsByLocale(posts, locale, defaultLocale).sort((a, b) => {
    const diff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

/** One locale's RSS document; shared by the default-locale and /<locale>/ routes. */
export function renderLocaleFeed(config, locale, posts) {
  const defaultLocale = config.site.locale;
  const site = canonicalUrl("/", config.site.url);
  const self = new URL(feedPath(locale, defaultLocale).slice(1), site).href;
  return rss({
    title: config.site.title,
    description: config.site.description,
    site,
    items: localeFeedPosts(posts, locale, defaultLocale).map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: new URL(postPath(post, defaultLocale).slice(1) + "/", site).href,
      categories: post.data.tags,
      customData: `<language>${locale}</language>`,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>${locale}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
