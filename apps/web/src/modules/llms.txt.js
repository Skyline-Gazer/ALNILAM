import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { indexText, llmsPosts } from "../lib/llms.mjs";

export async function GET() {
  const { config } = loadSite();
  const posts = llmsPosts(await getCollection("posts"), config);
  return new Response(indexText(posts, config), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
