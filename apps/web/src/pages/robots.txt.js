import { loadSite } from "../lib/site-source.mjs";

/**
 * robots.txt is served from the Site's deployment path. At a GitHub Pages
 * project subpath (/ALNILAM/robots.txt) crawlers do not treat it as the
 * origin-wide file; per-page policy comes from <meta name="robots"> and the
 * sitemap. Never use this file as access control.
 */
export async function GET() {
  const { config } = loadSite();
  const siteRoot = config.site.url.replace(/\/+$/, "");
  const base = new URL(config.site.url).pathname;
  const subpathNote = base === "/"
    ? ""
    : `\n# This file is served from project subpath ${base} and does not govern\n# the origin root. Per-page policy uses meta robots; the sitemap lists\n# indexable canonicals only.\n`;
  const body = `User-agent: *
Allow: /
${subpathNote}
Sitemap: ${siteRoot}/sitemap-index.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
