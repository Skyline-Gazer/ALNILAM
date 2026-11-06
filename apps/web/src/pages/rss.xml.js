import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { loadSite } from "../lib/site-source.mjs";
import { localeFeedPosts } from "../lib/feed.mjs";
import { canonicalUrl, postPath } from "../lib/i18n.mjs";

/** Default-locale feed. Other enabled locales publish under /<locale>/rss.xml. */
export async function GET() {
  const { config } = loadSite();
  const locale = config.site.locale;
  const posts = localeFeedPosts(await getCollection("posts"), locale, locale);
  const self = canonicalUrl(getRelativeLocaleUrl(locale, "rss.xml"), config.site.url).replace(/\/+$/, "");
  return rss({
    title: config.site.title,
    description: config.site.description,
    site: canonicalUrl("/", config.site.url),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: canonicalUrl(postPath(post, locale) + "/", config.site.url),
      categories: post.data.tags,
      customData: `<language>${locale}</language>`,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>${locale}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
