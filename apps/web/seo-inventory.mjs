import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finishMarkdown } from "./src/lib/llms.mjs";

/**
 * SEO inventory over the real build output.
 *
 * The sitemap must describe exactly the pages that were emitted, using the
 * canonical/hreflang metadata those pages published. Reading the finished HTML
 * (rather than re-deriving routes in config) keeps canonical, hreflang and
 * sitemap generation from drifting apart. Runs before @astrojs/sitemap's own
 * build hook because integrations execute in registration order.
 */

function pageKey(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  let href = parsed.href;
  const last = path.posix.basename(parsed.pathname);
  if (!href.endsWith("/") && !last.includes(".")) href += "/";
  return href;
}

function attr(tag, name) {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return match ? match[1] : null;
}

export function parseSeoHead(html) {
  const canonicalTag = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(html)?.[0] ?? "";
  const robotsTag = /<meta\b[^>]*\bname="robots"[^>]*>/i.exec(html)?.[0] ?? "";
  const modifiedTag = /<meta\b[^>]*\bproperty="article:modified_time"[^>]*>/i.exec(html)?.[0] ?? "";
  const alternates = [];
  for (const match of html.matchAll(/<link\b[^>]*\brel="alternate"[^>]*>/gi)) {
    const tag = match[0];
    // Feed discovery links also use rel="alternate" but are not hreflang.
    const lang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    if (lang && href) alternates.push({ lang, href });
  }
  return {
    canonical: attr(canonicalTag, "href"),
    noindex: /noindex/i.test(robotsTag),
    lastmod: attr(modifiedTag, "content"),
    alternates,
  };
}

function walkOutput(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkOutput(entryPath, visit);
    else if (entry.isFile()) visit(entryPath);
  }
}

export function createSeoInventory({ base = "/" } = {}) {
  const prefix = base === "/" ? "" : base.replace(/\/+$/, "");
  /** @type {Map<string, {canonical: string|null, noindex: boolean, lastmod: string|null, alternates: {lang: string, href: string}[]}>} */
  const byPath = new Map();

  return {
    name: "alnilam-seo-inventory",
    hooks: {
      "astro:build:done": ({ dir }) => {
        byPath.clear();
        const root = fileURLToPath(dir);
        const routes = new Set();
        const markdownFiles = [];
        walkOutput(root, (file) => {
          const relative = path.relative(root, file).replace(/\\/g, "/");
          if (relative.endsWith(".md") || relative === "llms-full.txt") markdownFiles.push(file);
          if (!relative.endsWith(".html")) return;
          const route = `/${relative.replace(/(?:^|\/)index\.html$/, "")}`.replace(/\/$/, "") || "/";
          routes.add(route);
          const toPath = relative === "404.html"
            ? `${prefix}/404.html`
            : `${prefix}/${relative.replace(/index\.html$/, "")}`;
          byPath.set(toPath, parseSeoHead(fs.readFileSync(file, "utf8")));
        });
        for (const file of markdownFiles) {
          const finished = finishMarkdown(fs.readFileSync(file, "utf8"), routes);
          if (finished !== null) fs.writeFileSync(file, finished);
        }
      },
    },

    /** Sitemap inclusion: a real canonical page that does not ask to be skipped. */
    filter(url) {
      const record = byPath.get(decodeURIComponent(new URL(url).pathname));
      if (!record || !record.canonical) return false;
      return !record.noindex && pageKey(record.canonical) === pageKey(url);
    },

    /** lastmod and alternates come from what the page actually declared. */
    serialize(item) {
      const record = byPath.get(decodeURIComponent(new URL(item.url).pathname));
      const serialized = { ...item };
      if (record?.lastmod) serialized.lastmod = record.lastmod;
      if (record?.alternates?.length) {
        serialized.links = record.alternates.map((alternate) => ({
          lang: alternate.lang,
          url: alternate.href,
        }));
      }
      return serialized;
    },
  };
}
