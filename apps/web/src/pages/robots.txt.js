import { loadSite } from "../lib/site-source.mjs";

export async function GET() {
  const { config } = loadSite();
  const base = config.site.url.replace(/\/$/, "");
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
