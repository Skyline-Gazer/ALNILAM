import { getCollection } from "astro:content";
import { loadSite } from "../lib/site-source.mjs";
import { postPath, translationAlternates } from "../lib/i18n.mjs";

export async function GET() {
  const { config } = loadSite();
  const base = config.site.url.replace(/\/$/, "");
  const posts = (await getCollection("posts", ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const staticPaths = ["", "posts/", "archives/", "tags/", "rss.xml", "sitemap.xml", "robots.txt"];
  const urlRows = [
    ...staticPaths.map((p) => ({ loc: `${base}/${p}`, lastmod: undefined, post: null })),
    ...posts.map((post) => ({
      loc: base + postPath(post, config.site.locale) + "/",
      lastmod: post.data.updatedDate ?? post.data.pubDate,
      post,
    })),
  ];
  // hreflang alternates ride on the same <url> rows (Google sitemap extension).
  const rows = urlRows.map((u) => {
    const alternates = u.post ? translationAlternates(u.post, posts, config.site.locale) : null;
    const lastmod = u.lastmod ? `    <lastmod>${u.lastmod.toISOString()}</lastmod>\n` : "";
    if (!alternates) {
      return `  <url>\n    <loc>${u.loc}</loc>\n${lastmod}  </url>`;
    }
    const links = [...alternates.entries()]
      .map(([lang, p]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${base}${p}/"/>`)
      .join("\n");
    return `  <url>\n    <loc>${u.loc}</loc>\n${lastmod}${links}\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
