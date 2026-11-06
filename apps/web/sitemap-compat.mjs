import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Compatibility mirror for consumers that still request `/sitemap.xml`.
 *
 * `@astrojs/sitemap` publishes an index plus numbered chunks
 * (`sitemap-index.xml` → `sitemap-0.xml`) and that index is what robots.txt
 * advertises. Older ALNILAM docs/tests and third-party checkers look for a
 * single `/sitemap.xml`, so this integration (registered after the sitemap)
 * mirrors the same generated entries into that path. It never invents URLs:
 * it copies the official chunk verbatim when there is one, or merges the
 * official `<url>` entries when the sitemap was chunked.
 */
export function sitemapCompat() {
  return {
    name: "alnilam-sitemap-compat",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const indexPath = path.join(root, "sitemap-index.xml");
        if (!fs.existsSync(indexPath)) return;
        const index = fs.readFileSync(indexPath, "utf8");
        const chunks = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)]
          .map((match) => path.join(root, path.basename(new URL(match[1]).pathname)))
          .filter((file) => fs.existsSync(file));
        if (chunks.length === 0) return;
        const target = path.join(root, "sitemap.xml");
        if (chunks.length === 1) {
          fs.copyFileSync(chunks[0], target);
        } else {
          const rows = chunks.flatMap((file) =>
            [...fs.readFileSync(file, "utf8").matchAll(/<url>[\s\S]*?<\/url>/g)].map((match) => match[0]),
          );
          fs.writeFileSync(
            target,
            '<?xml version="1.0" encoding="UTF-8"?>' +
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
              'xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
              rows.join("") +
              "</urlset>\n",
          );
        }
        logger?.info?.(`sitemap.xml compatibility mirror written from ${chunks.length} chunk(s)`);
      },
    },
  };
}
