import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { postPath } from "../lib/i18n.mjs";

export async function GET() {
  const { config } = loadSite();
  const base = config.site.url.replace(/\/$/, "");
  const posts = (await getCollection("posts", ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const escape = (s) => s
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const items = posts.map((post) => {
    const url = base + postPath(post, config.site.locale) + "/";
    const lang = post.data.lang || config.site.locale;
    return `    <item>
      <title>${escape(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
      <description>${escape(post.data.description || "")}</description>
      <language>${lang}</language>
      ${post.data.tags.map((t) => `<category>${escape(t)}</category>`).join("\n      ")}
    </item>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(config.site.title)}</title>
    <link>${base}/</link>
    <description>${escape(config.site.description)}</description>
    <language>${config.site.locale}</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
