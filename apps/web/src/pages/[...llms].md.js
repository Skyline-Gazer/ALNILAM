import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { llmsPosts, markdownPath, stageMarkdown } from "../lib/llms.mjs";
import { markdownView } from "../lib/llms-markdown.mjs";

export async function getStaticPaths() {
  const { root, config } = loadSite();
  if (!config.llms.enabled) return [];
  const allPosts = await getCollection("posts");
  const posts = llmsPosts(allPosts, config);
  return posts.map((post) => ({ params: { llms: markdownPath(post, config).slice(1, -3) }, props: { post, posts, root, config } }));
}

export function GET({ props }) {
  return new Response(import.meta.env.PROD ? stageMarkdown({ post: props.post, posts: props.posts, root: props.root, config: props.config }) : markdownView(props.post, props.posts, props.root, props.config), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
