import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { fullText, llmsPosts, stageMarkdown } from "../lib/llms.mjs";

export async function GET() {
  const { root, config } = loadSite();
  const allPosts = await getCollection("posts");
  const posts = llmsPosts(allPosts, config);
  return new Response(import.meta.env.PROD ? stageMarkdown({ posts, root, config }) : fullText(posts, root, config), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
