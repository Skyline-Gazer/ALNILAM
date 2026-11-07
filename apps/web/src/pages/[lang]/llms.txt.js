import { getCollection } from "astro:content";
import { loadSite } from "../../lib/site-source.mjs";
import { indexText, llmsPosts, localeHasPosts } from "../../lib/llms.mjs";

export async function getStaticPaths() {
  const { config } = loadSite();
  if (!config.llms.enabled) return [];
  const posts = llmsPosts(await getCollection("posts"), config);
  return config.locales
    .filter((locale) => locale !== config.site.locale && localeHasPosts(posts, locale, config))
    .map((locale) => ({ params: { lang: locale }, props: { locale } }));
}

export async function GET({ props }) {
  const { config } = loadSite();
  const posts = llmsPosts(await getCollection("posts"), config);
  return new Response(indexText(posts, config, props.locale), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
