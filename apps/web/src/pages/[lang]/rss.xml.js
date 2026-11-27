import { getCollection } from "astro:content";
import { loadSite } from "../../lib/site-source.mjs";
import { renderLocaleFeed } from "../../lib/feed.mjs";

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
  return renderLocaleFeed(config, props.locale, await getCollection("posts"));
}
