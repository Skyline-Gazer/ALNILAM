import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { renderLocaleFeed } from "../lib/feed.mjs";

/** Default-locale feed. Other enabled locales publish under /<locale>/rss.xml. */
export async function GET() {
  const { config } = loadSite();
  return renderLocaleFeed(config, config.site.locale, await getCollection("posts"));
}
