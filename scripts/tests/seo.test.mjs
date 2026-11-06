// #64 SEO/URL contract unit tests: base composition, locale feeds, hreflang
// equivalence groups and structured-data facts. Artifact-level behavior is
// covered by `scripts/seo-check.mjs` over a real composed output.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalUrl,
  feedPath,
  postPath,
  translationAlternates,
  withBase,
} from "../../apps/web/src/lib/i18n.mjs";
import { localeFeedPosts } from "../../apps/web/src/lib/feed.mjs";
import {
  blogPostingJsonLd,
  breadcrumbListJsonLd,
  ogLocale,
  websiteJsonLd,
} from "../../apps/web/src/lib/seo.mjs";
import { parseSeoHead } from "../../apps/web/seo-inventory.mjs";

const post = (id, lang, translationKey, extra = {}) => ({
  id,
  data: { lang, translationKey, draft: false, pubDate: new Date("2026-01-01"), ...extra },
});

test("withBase prefixes once and canonicalUrl stays absolute and query-free", () => {
  assert.equal(withBase("/posts/", "/ALNILAM"), "/ALNILAM/posts/");
  assert.equal(withBase("posts/", "/ALNILAM"), "/ALNILAM/posts/");
  assert.equal(withBase("/ALNILAM/posts/", "/ALNILAM"), "/ALNILAM/posts/");
  assert.equal(withBase("/posts/", ""), "/posts/");
  assert.equal(withBase("https://cdn.example/x.png", "/ALNILAM"), "https://cdn.example/x.png");
  assert.equal(
    canonicalUrl("/posts/hello/?utm_source=x#top", "https://example.com/ALNILAM/", "/ALNILAM"),
    "https://example.com/ALNILAM/posts/hello/",
  );
  assert.equal(
    canonicalUrl("/posts/hello/", "https://example.com/", ""),
    "https://example.com/posts/hello/",
  );
});

test("post URLs stay stable and locale feeds are one per enabled locale", () => {
  assert.equal(postPath(post("hello", "zh-CN"), "zh-CN"), "/posts/hello");
  const english = postPath(post("hello", "en"), "zh-CN");
  assert.ok(["/posts/en/hello", "/en/posts/hello"].includes(english), `unexpected English article path: ${english}`);
  assert.equal(postPath(post("en/hello", "en"), "zh-CN"), english);
  assert.equal(feedPath("zh-CN", "zh-CN"), "/rss.xml");
  assert.equal(feedPath("en", "zh-CN"), "/en/rss.xml");
});

test("hreflang groups include only enabled locales and a real x-default", () => {
  const posts = [
    post("hello", "zh-CN", "hello"),
    post("en/hello", "en", "hello"),
    post("de/hello", "de", "hello"),
    post("draft", "ja", "hello", { draft: true }),
  ];
  const map = translationAlternates(posts[0], posts, "zh-CN", ["zh-CN", "en", "ja"]);
  assert.deepEqual([...map.keys()], ["zh-CN", "en", "x-default"]);
  assert.equal(map.get("x-default"), "/posts/hello");
  assert.equal(map.has("de"), false, "an undeclared locale must not claim equivalence");

  const englishOnly = [post("en/a", "en", "a"), post("en/b", "en", "b")];
  assert.equal(translationAlternates(englishOnly[0], englishOnly, "zh-CN", ["zh-CN", "en"]), null);
  const noDefault = [post("en/a", "en", "a"), post("ja/a", "ja", "a")];
  const noDefaultMap = translationAlternates(noDefault[0], noDefault, "zh-CN", ["zh-CN", "en", "ja"]);
  assert.deepEqual([...noDefaultMap.keys()], ["en", "ja"], "no fabricated x-default without a default page");
});

test("locale feeds keep one language, newest first, and drop drafts", () => {
  const posts = [
    post("a", "zh-CN", undefined, { pubDate: new Date("2026-01-01") }),
    post("b", "zh-CN", undefined, { pubDate: new Date("2026-03-01") }),
    post("en/c", "en", undefined),
    post("d", "zh-CN", undefined, { draft: true }),
  ];
  const feed = localeFeedPosts(posts, "zh-CN", "zh-CN");
  assert.deepEqual(feed.map((entry) => entry.id), ["b", "a"]);
  assert.deepEqual(localeFeedPosts(posts, "en", "zh-CN").map((entry) => entry.id), ["en/c"]);
});

test("structured data carries only Site-owned facts", () => {
  const posting = blogPostingJsonLd({
    headline: "Hi",
    description: "d",
    url: "https://example.com/posts/hi/",
    datePublished: "2026-01-01",
    inLanguage: "en",
    keywords: ["x"],
  });
  assert.equal(posting.url, "https://example.com/posts/hi/");
  assert.deepEqual(posting.mainEntityOfPage, { "@type": "WebPage", "@id": "https://example.com/posts/hi/" });
  assert.equal("dateModified" in posting, false, "no update date must not fabricate dateModified");
  assert.equal("author" in posting, false, "no configured author must not fabricate one");
  const updated = blogPostingJsonLd({
    headline: "Hi",
    url: "https://example.com/posts/hi/",
    datePublished: "2026-01-01",
    dateModified: "2026-02-01T00:00:00.000Z",
    inLanguage: "en",
  });
  assert.equal(updated.dateModified, "2026-02-01T00:00:00.000Z");
  assert.equal(websiteJsonLd({ name: "S", url: "https://example.com/" })["@type"], "WebSite");
  assert.equal(ogLocale("zh-CN"), "zh_CN");
  assert.deepEqual(
    breadcrumbListJsonLd([{ name: "Home", url: "https://example.com/" }]).itemListElement[0].position,
    1,
  );
});

test("the sitemap inventory reads the same head facts the pages publish", () => {
  const head = parseSeoHead(
    '<html><head><link rel="canonical" href="https://example.com/posts/a/">' +
      '<link rel="alternate" hreflang="en" href="https://example.com/posts/en/a/">' +
      '<link rel="alternate" type="application/rss+xml" href="https://example.com/en/rss.xml">' +
      '<meta name="robots" content="noindex, follow">' +
      '<meta property="article:modified_time" content="2026-02-01T00:00:00.000Z"></head></html>',
  );
  assert.equal(head.canonical, "https://example.com/posts/a/");
  assert.deepEqual(head.alternates, [{ lang: "en", href: "https://example.com/posts/en/a/" }]);
  assert.equal(head.noindex, true);
  assert.equal(head.lastmod, "2026-02-01T00:00:00.000Z");
});
