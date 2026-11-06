#!/usr/bin/env node
/**
 * SEO / URL contract check over a real composed output directory.
 *
 * Unlike helper unit tests this reads the emitted HTML/XML and verifies the
 * deployment facts: every internal link and asset resolves, canonical and
 * og:url agree, hreflang alternates are reciprocal and real, JSON-LD URLs
 * resolve, each locale feed contains only its own posts, and the sitemap lists
 * exactly the indexable self-canonical pages. Works for a root domain and for a
 * GitHub Pages project subpath because the deployment origin comes from the
 * built homepage canonical, never from a hard-coded base.
 *
 * Usage: node scripts/seo-check.mjs <outDir> [--origin https://example.com/base/]
 */
import fs from "node:fs";
import path from "node:path";

const [outDirArg, ...rest] = process.argv.slice(2);
if (!outDirArg) {
  console.error("Usage: node scripts/seo-check.mjs <outDir> [--origin https://example.com/base/]");
  process.exit(2);
}
const outDir = path.resolve(outDirArg);
const originArgIndex = rest.indexOf("--origin");
const explicitOrigin = originArgIndex >= 0 ? rest[originArgIndex + 1] : null;
if (!fs.existsSync(path.join(outDir, "index.html"))) {
  console.error(`seo-check: no index.html in ${outDir} — build first`);
  process.exit(2);
}

const failures = [];
const fail = (message) => failures.push(message);
const read = (rel) => fs.readFileSync(path.join(outDir, rel), "utf8");

const attr = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return match ? decodeEntities(match[1]) : null;
};
const decodeEntities = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

function parseHead(html) {
  const tags = html.match(/<(?:link|meta)\b[^>]*>/gi) ?? [];
  const canonical = [];
  const alternates = [];
  const ogUrl = [];
  const twitterUrl = [];
  const ogImage = [];
  const robots = [];
  const jsonLd = [];
  for (const tag of tags) {
    const rel = attr(tag, "rel");
    if (rel === "canonical") canonical.push(attr(tag, "href"));
    if (rel === "alternate" && attr(tag, "hreflang")) {
      alternates.push({ lang: attr(tag, "hreflang"), href: attr(tag, "href"), type: attr(tag, "type") });
    }
    if (rel === "alternate" && attr(tag, "type") === "application/rss+xml") {
      alternates.push({ feed: true, href: attr(tag, "href") });
    }
    if (attr(tag, "property") === "og:url") ogUrl.push(attr(tag, "content"));
    if (attr(tag, "property") === "twitter:url") twitterUrl.push(attr(tag, "content"));
    if (attr(tag, "property") === "og:image") ogImage.push(attr(tag, "content"));
    if (attr(tag, "name") === "robots") robots.push(attr(tag, "content"));
  }
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      jsonLd.push(JSON.parse(decodeEntities(match[1])));
    } catch (error) {
      fail(`invalid JSON-LD in ${match[1].slice(0, 80)}: ${error.message}`);
    }
  }
  return { canonical, alternates, ogUrl, twitterUrl, ogImage, robots, jsonLd };
}

function walk(dir, extension, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, extension, visit);
    else if (entry.name.endsWith(extension)) visit(entryPath);
  }
}

const homepage = read("index.html");
const origin = explicitOrigin ? new URL(explicitOrigin) : new URL(parseHead(homepage).canonical[0] ?? "");
if (!/^https?:$/.test(origin.protocol)) {
  console.error("seo-check: could not determine deployment origin");
  process.exit(2);
}
const originHref = origin.href;
const basePath = origin.pathname.endsWith("/") ? origin.pathname : origin.pathname + "/";

const fileForUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url, origin);
  } catch {
    return null;
  }
  if (parsed.origin !== origin.origin) return null;
  const pathname = decodeURIComponent(parsed.pathname);
  if (!pathname.startsWith(basePath)) return null;
  const relative = pathname.slice(basePath.length);
  if (relative === "" || relative.endsWith("/")) return path.join(outDir, relative, "index.html");
  return path.join(outDir, relative);
};
const existsForUrl = (url) => {
  const file = fileForUrl(url);
  return Boolean(file && fs.existsSync(file) && fs.statSync(file).isFile());
};
const norm = (url) => {
  const parsed = new URL(url, origin);
  const last = path.posix.basename(parsed.pathname);
  parsed.hash = "";
  parsed.search = "";
  if (!parsed.pathname.endsWith("/") && !last.includes(".")) parsed.pathname += "/";
  return parsed.href;
};
const isInternal = (url) => {
  if (!url) return false;
  if (url.startsWith("//")) return new URL(url, origin).origin === origin.origin;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url.startsWith(originHref);
  return true;
};

const pages = [];
walk(outDir, ".html", (file) => {
  const relative = path.relative(outDir, file).replace(/\\/g, "/");
  const urlPath = relative === "404.html" ? "404.html" : relative.replace(/index\.html$/, "");
  const url = new URL(urlPath, originHref).href.replace(/\/$/, "/");
  pages.push({ file, relative, url, head: parseHead(fs.readFileSync(file, "utf8")) });
});
const pageByUrl = new Map(pages.map((page) => [norm(page.url), page]));

// 1. Internal links and asset references resolve to real output files.
let linkCount = 0;
for (const page of pages) {
  const html = fs.readFileSync(page.file, "utf8");
  for (const match of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    const raw = decodeEntities(match[2]);
    const target = raw.split("#")[0];
    if (!target || target.startsWith("data:") || target.startsWith("mailto:") || target.startsWith("tel:") || target.startsWith("javascript:")) continue;
    // Relative references resolve against the page URL, not the origin root.
    let resolved;
    try {
      resolved = new URL(target, page.url).href;
    } catch {
      fail(`${page.relative}: malformed URL ${target}`);
      continue;
    }
    if (new URL(resolved).origin !== origin.origin) continue;
    linkCount++;
    if (!existsForUrl(resolved)) fail(`${page.relative}: unresolved internal ${match[1]} ${target}`);
    if (basePath !== "/" && new URL(resolved).pathname.includes(basePath + basePath.slice(1))) {
      fail(`${page.relative}: double base prefix in ${target}`);
    }
  }
}

// 2. Canonical / og:url / twitter:url agree and point at a real page.
const selfCanonical = new Set();
for (const page of pages) {
  const { canonical, ogUrl, twitterUrl, ogImage, robots } = page.head;
  if (canonical.length !== 1) {
    fail(`${page.relative}: expected exactly one canonical, found ${canonical.length}`);
    continue;
  }
  const value = canonical[0];
  if (!value.startsWith(originHref)) fail(`${page.relative}: canonical is not on the deployment origin: ${value}`);
  if (value.includes("?") || value.includes("#")) fail(`${page.relative}: canonical carries a query/fragment: ${value}`);
  if (!existsForUrl(value)) fail(`${page.relative}: canonical target does not exist: ${value}`);
  if (ogUrl.length !== 1) fail(`${page.relative}: expected one og:url, found ${ogUrl.length}`);
  else if (ogUrl[0] !== value) fail(`${page.relative}: og:url ${ogUrl[0]} != canonical ${value}`);
  if (ogImage.length !== 1) fail(`${page.relative}: expected one og:image, found ${ogImage.length}`);
  else if (!/^https?:\/\//i.test(ogImage[0])) {
    fail(`${page.relative}: og:image is not absolute: ${ogImage[0]}`);
  } else if (ogImage[0].startsWith(originHref) && !existsForUrl(ogImage[0])) {
    fail(`${page.relative}: og:image target missing: ${ogImage[0]}`);
  }
  // X/Twitter falls back to og:*; a dedicated twitter:url, if present, must agree.
  if (twitterUrl.length > 0 && twitterUrl[0] !== value) {
    fail(`${page.relative}: twitter:url ${twitterUrl[0]} != canonical ${value}`);
  }
  const ownUrl = norm(page.url);
  const canonicalUrl = norm(value);
  const noindex = robots.some((content) => /noindex/i.test(content));
  if (canonicalUrl === ownUrl && !noindex) selfCanonical.add(ownUrl);
  if (canonicalUrl !== ownUrl && !existsForUrl(value)) fail(`${page.relative}: alias canonical missing`);
}

// 3. hreflang: real targets, self language, reciprocal links, optional x-default.
for (const page of pages) {
  const alternates = page.head.alternates.filter((alternate) => alternate.lang);
  if (alternates.length === 0) continue;
  const ownUrl = norm(page.url);
  const ownLang = /<html[^>]*\blang="([^"]+)"/i.exec(fs.readFileSync(page.file, "utf8"))?.[1];
  const selfEntry = alternates.find((alternate) => alternate.lang === ownLang);
  if (!selfEntry) fail(`${page.relative}: hreflang set omits its own language ${ownLang}`);
  else if (norm(selfEntry.href) !== ownUrl) {
    fail(`${page.relative}: hreflang self ${selfEntry.href} != ${ownUrl}`);
  }
  for (const alternate of alternates) {
    if (!alternate.href.startsWith(originHref)) fail(`${page.relative}: hreflang ${alternate.lang} is not absolute on the deployment origin`);
    if (!existsForUrl(alternate.href)) fail(`${page.relative}: hreflang ${alternate.lang} target missing: ${alternate.href}`);
    const target = pageByUrl.get(norm(alternate.href));
    if (!target) continue;
    const reciprocal = target.head.alternates.find(
      (candidate) => candidate.lang === ownLang && norm(candidate.href) === ownUrl,
    );
    if (!reciprocal) fail(`${page.relative}: hreflang ${alternate.lang} is not reciprocal in ${target.relative}`);
  }
}

// 4. Structured data per page type, and every internal URL resolves.
const jsonLdTypes = (values) => values.map((value) => value?.["@type"]).filter(Boolean);
for (const page of pages) {
  const types = jsonLdTypes(page.head.jsonLd);
  const isPost = page.relative.startsWith("posts/") && !/^posts\/(?:\d+\/)?index\.html$/.test(page.relative);
  if (page.relative === "index.html") {
    if (!types.includes("WebSite")) fail("index.html: WebSite JSON-LD missing");
  }
  if (isPost && !types.includes("BlogPosting")) fail(`${page.relative}: BlogPosting JSON-LD missing`);
  if (/^(?:categories|tags)\/[^/]+\/index\.html$/.test(page.relative)) {
    if (!types.includes("CollectionPage")) fail(`${page.relative}: CollectionPage JSON-LD missing`);
    if (!types.includes("BreadcrumbList")) fail(`${page.relative}: BreadcrumbList JSON-LD missing`);
  }
  const visit = (value, key = "") => {
    if (typeof value === "string") {
      if (/^(?:url|@id|item|image)$/.test(key) && isInternal(value) && value.startsWith(originHref)) {
        if (!existsForUrl(value)) fail(`${page.relative}: JSON-LD ${key} target missing: ${value}`);
      }
      return;
    }
    if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
    if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
    }
  };
  for (const value of page.head.jsonLd) visit(value);
}

// 5. Locale feeds: self link, absolute existing items, one language per feed.
const feeds = [];
walk(outDir, ".xml", (file) => {
  if (path.basename(file) === "rss.xml") feeds.push(file);
});
if (feeds.length === 0) fail("no rss.xml feed found");
for (const file of feeds) {
  const relative = path.relative(outDir, file).replace(/\\/g, "/");
  const xml = fs.readFileSync(file, "utf8");
  const channelLanguage = /<channel>[\s\S]*?<language>([^<]+)<\/language>/.exec(xml)?.[1];
  const self = /<atom:link\b[^>]*\bhref="([^"]+)"[^>]*\brel="self"/.exec(xml)?.[1];
  const expectedSelf = new URL(relative, originHref).href;
  if (!self) fail(`${relative}: missing atom:link rel=self`);
  else if (self !== expectedSelf) fail(`${relative}: feed self ${self} != ${expectedSelf}`);
  if (!channelLanguage) fail(`${relative}: channel language missing`);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
  if (items.length === 0) fail(`${relative}: feed has no items`);
  for (const item of items) {
    const link = /<link>([^<]+)<\/link>/.exec(item)?.[1];
    const guid = /<guid[^>]*>([^<]+)<\/guid>/.exec(item)?.[1];
    const language = /<language>([^<]+)<\/language>/.exec(item)?.[1];
    if (!link || !link.startsWith(originHref)) fail(`${relative}: item link is not absolute: ${link}`);
    else if (!existsForUrl(link)) fail(`${relative}: item link target missing: ${link}`);
    if (guid !== link) fail(`${relative}: guid does not equal the canonical item link`);
    if (language !== channelLanguage) fail(`${relative}: item language ${language} != channel ${channelLanguage}`);
  }
}
const homepageAlternateFeeds = homepage.match(/<link\b[^>]*type="application\/rss\+xml"[^>]*>/gi) ?? [];
if (homepageAlternateFeeds.length !== 1) fail("index.html: expected exactly one RSS discovery link");
for (const tag of homepageAlternateFeeds) {
  const href = attr(tag, "href");
  if (!existsForUrl(href)) fail(`index.html: RSS discovery target missing: ${href}`);
}
for (const page of pages) {
  const feedLink = page.head.alternates.find((alternate) => alternate.feed);
  if (!feedLink) {
    fail(`${page.relative}: missing RSS discovery link`);
    continue;
  }
  if (!existsForUrl(feedLink.href)) {
    fail(`${page.relative}: RSS discovery target missing: ${feedLink.href}`);
    continue;
  }
  const htmlLang = /<html[^>]*\blang="([^"]+)"/i.exec(fs.readFileSync(page.file, "utf8"))?.[1];
  const feedFile = fileForUrl(feedLink.href);
  const feedLang = /<language>([^<]+)<\/language>/.exec(fs.readFileSync(feedFile, "utf8"))?.[1];
  if (!htmlLang) fail(`${page.relative}: <html lang> missing`);
  else if (feedLang !== htmlLang) {
    fail(`${page.relative}: discovered feed language ${feedLang} != page language ${htmlLang}`);
  }
}
if (!fs.existsSync(path.join(outDir, "rss.xml"))) fail("default-locale /rss.xml feed missing");
for (const file of feeds) {
  const relative = path.relative(outDir, file).replace(/\\/g, "/");
  if (relative === "rss.xml") continue;
  const prefix = decodeURIComponent(relative.split("/")[0]);
  const language = /<channel>[\s\S]*?<language>([^<]+)<\/language>/.exec(fs.readFileSync(file, "utf8"))?.[1];
  if (language !== prefix) fail(`${relative}: feed language ${language} != locale prefix ${prefix}`);
}

// 6. Sitemap describes exactly the indexable self-canonical pages.
const indexXml = read("sitemap-index.xml");
if (!indexXml.includes("sitemap-0.xml")) fail("sitemap-index.xml does not reference a chunk");
const sitemapLocs = new Set();
const sitemapFiles = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapFiles.length === 0) fail("sitemap index lists no sitemaps");
for (const loc of sitemapFiles) {
  const file = fileForUrl(loc);
  if (!file || !fs.existsSync(file)) {
    fail(`sitemap index target missing: ${loc}`);
    continue;
  }
  const xml = fs.readFileSync(file, "utf8");
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const row = match[1];
    const loc = decodeEntities(/<loc>([^<]+)<\/loc>/.exec(row)?.[1] ?? "");
    if (!loc) {
      fail("sitemap row without loc");
      continue;
    }
    if (sitemapLocs.has(loc)) fail(`duplicate sitemap loc: ${loc}`);
    sitemapLocs.add(loc);
    if (!existsForUrl(loc)) fail(`sitemap loc target missing: ${loc}`);
    if (!selfCanonical.has(norm(loc))) fail(`sitemap loc is not an indexable self-canonical page: ${loc}`);
    for (const link of row.matchAll(/<xhtml:link\b[^>]*>/g)) {
      const href = attr(link[0], "href");
      const lang = attr(link[0], "hreflang");
      if (!lang || !href) fail(`sitemap alternate malformed in ${loc}`);
      else if (!existsForUrl(href)) fail(`sitemap alternate target missing: ${href}`);
      const target = pageByUrl.get(norm(href));
      if (target && !target.head.alternates.some((alternate) => alternate.lang === lang && norm(alternate.href) === norm(href))) {
        fail(`sitemap alternate ${lang} ${href} is not declared by the page`);
      }
    }
  }
}
for (const url of selfCanonical) {
  if (!sitemapLocs.has(url)) fail(`indexable page missing from sitemap: ${url}`);
}
for (const banned of ["rss.xml", "robots.txt", "404.html"]) {
  if (sitemapLocs.has(new URL(banned, originHref).href)) fail(`sitemap must not list ${banned}`);
}
// The compatibility mirror, when present, must describe the same entries.
const compatPath = path.join(outDir, "sitemap.xml");
if (fs.existsSync(compatPath)) {
  const compatLocs = new Set(
    [...fs.readFileSync(compatPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1])),
  );
  for (const loc of compatLocs) {
    if (!sitemapLocs.has(loc)) fail(`sitemap.xml mirror lists an entry the index does not: ${loc}`);
  }
  for (const loc of sitemapLocs) {
    if (!compatLocs.has(loc)) fail(`sitemap.xml mirror is missing ${loc}`);
  }
}

// 7. robots.txt and the 404 contract.
const robotsTxt = read("robots.txt");
const sitemapDirective = /^Sitemap:\s*(\S+)$/m.exec(robotsTxt)?.[1];
if (!sitemapDirective) fail("robots.txt has no Sitemap directive");
else if (!existsForUrl(sitemapDirective)) fail(`robots.txt Sitemap target missing: ${sitemapDirective}`);
if (basePath !== "/" && !/does not govern/i.test(robotsTxt)) {
  fail("robots.txt must document that a project-subpath file is not origin-wide");
}
if (!fs.existsSync(path.join(outDir, "404.html"))) fail("404.html missing");
else {
  const notFound = read("404.html");
  if (!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(notFound)) fail("404.html must be noindex");
}

console.log(
  `seo-check: origin ${originHref} · ${pages.length} pages · ${linkCount} internal refs · ` +
    `${sitemapLocs.size} sitemap URLs · ${feeds.length} feeds`,
);
if (failures.length) {
  for (const message of failures.slice(0, 80)) console.error("FAIL: " + message);
  if (failures.length > 80) console.error(`... ${failures.length - 80} more`);
  process.exit(1);
}
console.log("SEO CONTRACT OK");
