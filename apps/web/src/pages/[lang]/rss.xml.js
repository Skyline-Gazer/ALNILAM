import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getRelativeLocaleUrl } from "astro:i18n";
import { loadSite } from "../../lib/site-source.mjs";
import { localeFeedPosts } from "../../lib/feed.mjs";
import { canonicalUrl, postPath } from "../../lib/i18n.mjs";

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
  const self = canonicalUrl(getRelativeLocaleUrl(locale, "rss.xml"), config.site.url).replace(/\/+$/, "");
  return rss({
    title: config.site.title,
    description: config.site.description,
    site: canonicalUrl("/", config.site.url),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: canonicalUrl(postPath(post, config.site.locale) + "/", config.site.url),
      categories: post.data.tags,
      customData: `<language>${locale}</language>`,
    })),
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>${locale}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
  });
}
