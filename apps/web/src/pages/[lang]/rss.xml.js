import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { loadSite } from "../../lib/site-source.mjs";
import { localeFeedPosts } from "../../lib/feed.mjs";
import { canonicalUrl, feedPath, postPath } from "../../lib/i18n.mjs";

/** One feed per enabled locale that actually publishes posts. */
export async function getStaticPaths() {
  const { config } = loadSite();
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const publishing = new Set(posts.map((post) => post.data.lang ?? config.site.locale));
  return config.locales
    .filter((locale) => locale !== config.site.locale && publishing.has(locale))
    .map((locale) => ({ params: { lang: locale }, props: { locale } }));
}

export async function GET({ props }) {
  const { config } = loadSite();
  const { locale } = props;
  const posts = localeFeedPosts(await getCollection("posts"), locale, config.site.locale);
  const site = canonicalUrl("/", config.site.url);
  const self = new URL(feedPath(locale, config.site.locale).slice(1), site).href;
  return rss({
    title: config.site.title,
    description: config.site.description,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: new URL(postPath(post, config.site.locale).slice(1) + "/", site).href,
      categories: post.data.tags,
      customData: `<language>${locale}</language>`,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>${locale}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
