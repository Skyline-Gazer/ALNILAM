import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { localeFeedPosts } from "../lib/feed.mjs";
import { canonicalUrl, feedPath, postPath } from "../lib/i18n.mjs";

/** Default-locale feed. Other enabled locales publish under /<locale>/rss.xml. */
export async function GET() {
  const { config } = loadSite();
  const locale = config.site.locale;
  const posts = localeFeedPosts(await getCollection("posts"), locale, locale);
  const site = canonicalUrl("/", config.site.url);
  const self = new URL(feedPath(locale, locale).slice(1), site).href;
  return rss({
    title: config.site.title,
    description: config.site.description,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: new URL(postPath(post, locale).slice(1) + "/", site).href,
      categories: post.data.tags,
      customData: `<language>${locale}</language>`,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>${locale}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
