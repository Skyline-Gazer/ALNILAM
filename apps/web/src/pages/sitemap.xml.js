import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";

export async function GET() {
  const { config } = loadSite();
  const base = config.site.url.replace(/\/$/, "");
  const posts = (await getCollection("posts", ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const staticPaths = ["", "posts/", "archives/", "tags/", "rss.xml", "sitemap.xml", "robots.txt"];
  const urls = [
    ...staticPaths.map((p) => ({ loc: `${base}/${p}`, lastmod: undefined })),
    ...posts.map((post) => ({ loc: `${base}/posts/${post.id}/`, lastmod: post.data.updatedDate ?? post.data.pubDate })),
  ];
  const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${escape(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
