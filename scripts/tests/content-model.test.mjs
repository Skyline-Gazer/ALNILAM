// #62 content-model acceptance (P4/T01): a dedicated multi-locale Site fixture
// proving pagination, localized taxonomy, series and pinned/draft semantics on
// the native Shirone base.
//
// Fixture: tests/fixtures/content-model-site — 14 zh (incl. 1 draft, 1 pinned,
// a 3-part series) + 6 en + 4 ja posts, a config catalog plus a data/taxonomy.yaml
// extension, and a translationKey group spanning zh/en/ja.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateSiteRoot } from "../site-contract.mjs";

// The candidate supplies product code; the target supplies immutable test fixtures.
const REPO = process.cwd();
const FIXTURE = path.join(process.env.CNB_TRUSTED_TEST_ROOT || REPO, "tests/fixtures/content-model-site");

// Counts come from the target-owned fixture, so adding an article or draft
// cannot silently weaken the pagination assertions. #35 scopes every listing surface to a
// single locale's corpus, so the default-locale count - not the whole-corpus count - is the
// pagination authority for the unlocalized routes.
const FIXTURE_PAGE_SIZE = 5;
const fixturePosts = fs.globSync("content/posts/**/*.md", { cwd: FIXTURE });
const frontmatterOf = (rel) =>
  /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(FIXTURE, rel), "utf8"))?.[1] ?? "";
const DEFAULT_LOCALE =
  /^ {2}locale:\s*"?([\w-]+)"?/m.exec(fs.readFileSync(path.join(FIXTURE, "alnilam.config.yaml"), "utf8"))?.[1] ?? "zh-CN";
const localeOf = (rel) => /^lang:\s*"?([\w-]+)"?/m.exec(frontmatterOf(rel))?.[1] ?? DEFAULT_LOCALE;
const publishedPosts = fixturePosts.filter((rel) => !/^draft:\s*true\s*$/m.test(frontmatterOf(rel)));
const EXPECTED_TOTAL = publishedPosts.filter((rel) => localeOf(rel) === DEFAULT_LOCALE).length;
const EXPECTED_PAGES = Math.ceil(EXPECTED_TOTAL / FIXTURE_PAGE_SIZE);
// Listing slugs of posts that belong to another locale, e.g. "en/hello-content-model".
const FOREIGN_SLUGS = publishedPosts
  .filter((rel) => localeOf(rel) !== DEFAULT_LOCALE)
  .map((rel) => rel.replace(/^content\/posts\//, "").replace(/\.md$/, ""));
// The locale of every listing slug, read from that post's own frontmatter: a nested
// default-locale post such as `content/posts/2026/hello.md` lists as `2026/hello`, whose first
// segment is a directory, not a locale. The path never decides the locale (#35).
const LOCALE_BY_SLUG = new Map(
  publishedPosts.map((rel) => [rel.replace(/^content\/posts\//, "").replace(/\.md$/, ""), localeOf(rel)]),
);

const read = (out, rel) => fs.readFileSync(path.join(out, rel), "utf8");
/** Concatenate the official sitemap chunks referenced by sitemap-index.xml. */
const readSitemap = (out) =>
  [...read(out, "sitemap-index.xml").matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => read(out, new URL(match[1]).pathname.replace(/^\//, "")))
    .join("\n");
/** Unique article links, normalized to the fixture's locale/slug IDs. */
const postLinks = (html) =>
  [...new Set([...html.matchAll(/href="\/(?:([a-z]{2}(?:-[A-Z]{2})?)\/)?posts\/([^"?#]+)\/"/g)]
    .map(([, locale, slug]) => locale ? `${locale}/${slug}` : slug)
    .filter((slug) => !/^\d+$/.test(slug)))];

const ctx = {};

// One composed output shared by all tests; torn down once after the file.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "ALNI-content-model-site-"));
// Compose and Astro may leave read-only dirs (555) in the tree, and the frozen
// harness fixture copies with 555/444 modes; rmSync cannot delete children of
// such dirs, so restore writable modes before teardown.
function restoreWritableModes() {
  fs.chmodSync(root, 0o755);
  for (const entry of fs.readdirSync(root, { recursive: true })) {
    const abs = path.join(root, entry);
    try {
      fs.chmodSync(abs, fs.statSync(abs).isDirectory() ? 0o755 : 0o644);
    } catch {
      // Racy entries (Vite workers cleaning up) are fine to skip.
    }
  }
}
after(() => {
  try {
    restoreWritableModes();
    fs.rmSync(root, { recursive: true, force: true });
  } catch {
    // Leftover tmp is cleaned with the disposable gate tree; never fail tests
    // on teardown.
  }
});

// Compose once up front: a failing compose fails the hook (and therefore the
// whole file) with the real error instead of cascading undefined fixtures.
before(() => {
  const site = path.join(root, "site");
  fs.cpSync(FIXTURE, site, { recursive: true });
  restoreWritableModes();
  const digest = validateSiteRoot(site).digest;
  const out = path.join(root, "out");
  const result = spawnSync(
    process.execPath,
    ["scripts/compose.mjs", "--site", site, "--out", out],
    {
      cwd: REPO,
      env: {
        ...process.env,
        ALNILAM_CACHE_DIR: path.join(root, "cache"),
        ALNILAM_CORE_REV: "content-model-test",
        SOURCE_DATE_EPOCH: "1700000000",
      },
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, "content-model compose failed: " + result.stderr.slice(-2500));
  assert.equal(validateSiteRoot(site).digest, digest, "Site digest must stay unchanged across the run");
  assert.deepEqual(
    fs.readdirSync(site).filter((n) => n.startsWith(".alnilam")),
    [],
    "no compose bookkeeping may leak into the Site",
  );
  Object.assign(ctx, { out, site, digest });
});

test("provenance binds the composed Site digest and the requested Core revision", () => {
  const prov = JSON.parse(read(ctx.out, "alnilam-provenance.json"));
  assert.equal(prov.site.digest, ctx.digest);
  assert.equal(prov.core.revision, "content-model-test");
});

test("posts paginate the default-locale corpus with the pinned post first", () => {
  const { out } = ctx;
  const pages = Array.from({ length: EXPECTED_PAGES }, (_, i) =>
    read(out, i === 0 ? "posts/index.html" : `posts/${i + 1}/index.html`),
  );
  for (let page = 1; page <= EXPECTED_PAGES; page++) {
    const rel = page === 1 ? "posts/index.html" : `posts/${page}/index.html`;
    assert.ok(fs.existsSync(path.join(out, rel)), `pagination page /posts/${page === 1 ? "" : page + "/"} must exist`);
  }
  assert.equal(
    fs.existsSync(path.join(out, `posts/${EXPECTED_PAGES + 1}/index.html`)),
    false,
    "the locale corpus must not produce an extra page",
  );
  const page1 = pages[0];
  assert.match(page1, new RegExp(`共 ${EXPECTED_TOTAL} 篇 · 第 1/${EXPECTED_PAGES} 页`));
  const cards = postLinks(page1);
  assert.equal(cards[0], "pinned-announcement", "the pinned post must lead the first page despite its old pubDate");
  // Locale content policy (#35): translations are listed by their own locale routes, not here.
  for (const slug of FOREIGN_SLUGS) {
    for (const [index, html] of pages.entries()) {
      assert.ok(!postLinks(html).includes(slug), `/posts/${index + 1} must not list ${slug}`);
    }
  }
  assert.match(page1, /href="\/posts\/2\/" rel="next"/, "page 1 must link the next page");
  for (let p = 2; p <= EXPECTED_PAGES; p += 1) {
    assert.match(page1, new RegExp(`href="/posts/${p}/" aria-label="第 ${p} 页"`), `page-number link ${p} must render`);
  }
  const page2 = read(out, "posts/2/index.html");
  assert.match(page2, /href="\/posts\/" rel="prev"/, "page 2 must link back to page 1");
  assert.match(page2, /href="\/posts\/3\/" rel="next"/, "page 2 must link forward to page 3");
  const last = pages[pages.length - 1];
  assert.ok(/rel="prev"/.test(last), "the last page must link back");
  assert.ok(!/rel="next"/.test(last), "the last page must not offer a next link");
});

test("home page 1 exposes continuation to posts pagination when corpus spans pages", () => {
  const { out } = ctx;
  if (EXPECTED_PAGES < 2) {
    assert.fail(`fixture must span >1 page to test #200 continuation (EXPECTED_PAGES=${EXPECTED_PAGES})`);
  }
  const home = read(out, "index.html");
  const cards = postLinks(home);
  assert.equal(cards.length, FIXTURE_PAGE_SIZE, "home lists first page size only");
  for (const slug of FOREIGN_SLUGS) {
    assert.ok(!cards.includes(slug), `home must not list ${slug}`);
  }
  assert.match(home, /href="\/posts\/2\/" rel="next"/, "home must link the next listing page");
});

test("each locale listing carries exactly its own corpus", () => {
  const { out } = ctx;
  const surfaces = [
    ["index.html", DEFAULT_LOCALE],
    ["posts/index.html", DEFAULT_LOCALE],
    ["archives/index.html", DEFAULT_LOCALE],
    ["categories/guide/index.html", DEFAULT_LOCALE],
    ["tags/i18n/index.html", DEFAULT_LOCALE],
    ["en/index.html", "en"],
    ["en/posts/index.html", "en"],
    ["en/archives/index.html", "en"],
    ["ja/index.html", "ja"],
    ["ja/posts/index.html", "ja"],
  ];
  for (const [rel, locale] of surfaces) {
    const links = postLinks(read(out, rel));
    assert.ok(links.length > 0, `${rel} must list its own locale articles`);
    // postLinks() also matches pagination hrefs like /en/posts/2/, whose slug ends in a bare
    // page number. Those are skipped; every remaining href must name a fixture article, so an
    // unexpected slug fails instead of passing silently.
    const listed = links.filter((slug) => !/^\d+$/.test(slug.split("/").at(-1) ?? ""));
    assert.ok(listed.length > 0, `${rel} must link at least one article`);
    for (const slug of listed) {
      const slugLocale = LOCALE_BY_SLUG.get(slug);
      assert.ok(slugLocale !== undefined, `${rel} links the unknown article slug ${slug}`);
      assert.equal(slugLocale, locale, `${rel} (${locale}) must not link the ${slugLocale} article ${slug}`);
    }
  }
});

test("draft posts are excluded from every list, route and feed", (t) => {
  const { out } = ctx;
  assert.equal(fs.existsSync(path.join(out, "posts", "draft-preview")), false, "drafts get no article route");
  assert.equal(fs.existsSync(path.join(out, "en", "pages", "draft-preview")), false, "draft Site pages get no route");
  const surfaces = [
    "index.html",
    ...Array.from({ length: EXPECTED_PAGES }, (_, i) =>
      i === 0 ? "posts/index.html" : `posts/${i + 1}/index.html`,
    ),
    "archives/index.html",
    "categories/index.html",
    "categories/notes/index.html",
    "tags/index.html",
    "tags/alnilam/index.html",
    "rss.xml",
    "en/rss.xml",
    "ja/rss.xml",
    "sitemap-index.xml",
  ];
  for (const rel of surfaces) {
    assert.ok(!read(out, rel).includes("draft-preview"), `draft must not leak into ${rel}`);
  }
});
test("Site pages render Markdown, canonical URLs, real translations, and sitemap alternates", () => {
  const { out } = ctx;
  const expected = {
    "zh-CN": "https://content-model.example.com/pages/about/",
    en: "https://content-model.example.com/en/pages/about/",
    ja: "https://content-model.example.com/ja/pages/about/",
    "zh-TW": "https://content-model.example.com/zh-TW/pages/about/",
  };
  const routes = {
    "zh-CN": "pages/about/index.html",
    en: "en/pages/about/index.html",
    ja: "ja/pages/about/index.html",
    "zh-TW": "zh-TW/pages/about/index.html",
  };
  const bodies = {
    "zh-CN": "This is the default-locale Site page body.",
    en: "This is the English Site page body.",
    ja: "This is the Japanese Site page body.",
    "zh-TW": "This is the Traditional Chinese Site page body.",
  };

  for (const [locale, rel] of Object.entries(routes)) {
    const html = read(out, rel);
    assert.match(html, /<div[^>]*data-pagefind-body/, `${rel} must use the shared Markdown presentation`);
    assert.ok(html.includes(bodies[locale]), `${rel} must render its Site-owned body`);
    assert.ok(html.includes(`<link rel="canonical" href="${expected[locale]}">`), `${rel} must self-canonicalize`);
    for (const [alternateLocale, href] of Object.entries(expected)) {
      assert.ok(html.includes(`<link rel="alternate" hreflang="${alternateLocale}" href="${href}">`), `${rel} must link ${alternateLocale}`);
    }
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${expected["zh-CN"]}">`));

    if (locale === "zh-CN") {
      assert.match(html, /<meta property="og:type" content="article">/);
      assert.match(html, /<meta property="og:image" content="https:\/\/images\.example\.test\/site-page\.jpg\?signature=fixture">/);
      assert.match(html, /<meta property="article:published_time" content="2026-04-05T00:00:00\.000Z">/);
      assert.match(html, /<meta property="article:modified_time" content="2026-04-06T00:00:00\.000Z">/);
      assert.match(html, /<meta property="article:section" content="site-page-only-category">/);
      assert.match(html, /<meta property="article:tag" content="site-page-only-tag">/);
    }
  }

  assert.equal(fs.existsSync(path.join(out, "pages", "en", "about")), false, "translated pages have no legacy locale route");
  assert.equal(fs.existsSync(path.join(out, "en", "pages", "draft-preview")), false);
  for (const rel of ["archives/index.html", "categories/index.html", "tags/index.html", "rss.xml", "en/rss.xml", "ja/rss.xml"]) {
    const html = read(out, rel);
    assert.ok(!html.includes("About Content Model"), `Site pages must stay out of ${rel}`);
    assert.ok(!html.includes("site-page-only-tag"), `Site page tags must stay out of ${rel}`);
  }
  assert.equal(fs.existsSync(path.join(out, "categories", "site-page-only-category")), false);
  assert.equal(fs.existsSync(path.join(out, "tags", "site-page-only-tag")), false);
  const sitemap = readSitemap(out);
  for (const href of Object.values(expected)) assert.ok(sitemap.includes(href), `sitemap must include ${href}`);
  assert.ok(sitemap.includes(`hreflang="x-default" href="${expected["zh-CN"]}"`));
  assert.ok(!sitemap.includes("draft-preview"), "draft pages must stay out of the sitemap");
});

test("Site pages with math link the KaTeX stylesheet", () => {
  const { out } = ctx;
  const html = read(out, "en/pages/math/index.html");
  assert.match(html, /class="katex(?:\s|")/, "page body must render KaTeX markup");

  const mathStylesheets = [...html.matchAll(
    /<link rel="stylesheet" data-swup-optional="math" href="([^"]+)"\s*\/?>/g,
  )].map(([, href]) => href);
  const stylesheetContents = mathStylesheets.map((href) => {
    const relativePath = new URL(href, "https://content-model.example.com").pathname.replace(/^\/+/, "");
    const file = path.join(out, relativePath);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  });
  assert.ok(
    stylesheetContents.some((stylesheet) => stylesheet.includes("KaTeX_Main")),
    "page head must load KaTeX's stylesheet asset",
  );
});


test("category index and detail render catalog labels and locale-filtered members", (t) => {
  const { out } = ctx;
  const catIndex = read(out, "categories/index.html");
  assert.match(catIndex, /href="\/categories\/guide\/"/);
  assert.match(catIndex, /href="\/categories\/notes\/"/, "the data/taxonomy.yaml category must be merged into the catalog");

  // Site-owned IDs resolve frontmatter; the heading uses the localized label.
  const guide = read(out, "categories/guide/index.html");
  assert.match(guide, /<title>指南 - Content Model<\/title>/);
  assert.match(guide, /<link rel="canonical" href="https:\/\/content-model\.example\.com\/categories\/guide\/">/);
  // Detail routes render the Shirone ArchivePanel timeline, not a postcard grid:
  // SSR markup carries archive items and the crumb shows the localized label.
  assert.match(guide, /m3-blog-archive__item/, "category detail must render the archive timeline");
  assert.ok(guide.includes("archive-panel"), "category detail must mount the ArchivePanel island");
  assert.ok(!guide.includes("m3-blog-postcard"), "category detail must not render postcards");
  const guideMembers = [guide, ...[2, 3]
    .map((page) => `categories/guide/${page}/index.html`)
    .filter((rel) => fs.existsSync(path.join(out, rel))).map((rel) => read(out, rel))].flatMap(postLinks);
  assert.ok(guideMembers.includes("pinned-announcement"), "zh members are listed: " + guideMembers.join(","));
  // Locale content policy (#35): the unlocalized category route is the default-locale corpus.
  for (const slug of FOREIGN_SLUGS) {
    assert.ok(!guideMembers.includes(slug), `/categories/guide/ must not list ${slug}`);
  }
  const enGuide = read(out, "en/categories/guide/index.html");
  assert.ok(postLinks(enGuide).includes("en/hello-content-model"), "en members are listed under /en/");
  assert.ok(!postLinks(enGuide).includes("pinned-announcement"), "/en/ must not list the zh article");
  const jaGuide = read(out, "ja/categories/ja-series-only/index.html");
  assert.deepEqual(postLinks(jaGuide), ["ja/series-overview-ja"], "the ja-only category lists only the ja article");

  // The taxonomy.yaml-only category gets its zh-CN label from the merged catalog.
  const notes = read(out, "categories/notes/index.html");
  assert.match(notes, /<title>随笔 - Content Model<\/title>/);
  assert.ok(postLinks(notes).includes("pagination-overview"));
  assert.ok(!notes.includes("draft-preview"), "drafts must not inflate category counts or listings");
});

test("tag index and detail render localized labels across locales", (t) => {
  const { out } = ctx;
  const tagIndex = read(out, "tags/index.html");
  for (const tag of ["alnilam", "i18n", "pagination", "series"]) {
    assert.match(tagIndex, new RegExp(`href="/tags/${tag}/"`), `tag index must link ${tag}`);
  }
  const i18nTag = read(out, "tags/i18n/index.html");
  assert.match(i18nTag, /<title>#国际化 - Content Model<\/title>/, "tag detail uses the localized zh-CN catalog label");
  assert.match(i18nTag, /m3-blog-archive__item/, "tag detail must render the archive timeline");
  assert.ok(i18nTag.includes("archive-panel"), "tag detail must mount the ArchivePanel island");
  assert.ok(!i18nTag.includes("m3-blog-postcard"), "tag detail must not render postcards");
  const members = postLinks(i18nTag);
  assert.ok(members.includes("hello-content-model"), "zh posts match: " + members.join(","));
  // Locale content policy (#35): each locale's tag route carries only its own corpus.
  for (const slug of FOREIGN_SLUGS) {
    assert.ok(!members.includes(slug), `/tags/i18n/ must not list ${slug}`);
  }
  assert.deepEqual(postLinks(read(out, "en/tags/i18n/index.html")).sort(), ["en/hello-content-model", "en/i18n-guide"]);
  assert.deepEqual(postLinks(read(out, "ja/tags/i18n/index.html")).sort(), ["ja/hello-content-model", "ja/i18n-guide"]);
  const paginationTag = read(out, "tags/pagination/index.html");
  assert.match(paginationTag, /<title>#分页 - Content Model<\/title>/, "taxonomy.yaml tag labels are localized too");
  assert.match(paginationTag, /m3-blog-archive__item/, "taxonomy.yaml-only tag renders the timeline too");
  assert.ok(postLinks(paginationTag).includes("pinned-announcement"));
});

test("series catalog drives the series index and orders detail members by seriesOrder", (t) => {
  const { out } = ctx;
  const seriesIndex = read(out, "series/index.html");
  assert.match(seriesIndex, /href="\/series\/getting-started\/"/, "series index links the catalog entry");
  const detail = read(out, "series/getting-started/index.html");
  assert.match(detail, /<title>上手系列 - Content Model<\/title>/);
  assert.match(
    detail,
    /<link rel="canonical" href="https:\/\/content-model\.example\.com\/series\/getting-started\/">/,
  );
  const order = [...detail.matchAll(/href="\/posts\/([^"/]+)\/"/g)].map((m) => m[1]);
  assert.deepEqual(
    order,
    ["getting-started-part-1", "getting-started-part-2", "getting-started-part-3"],
    "members follow seriesOrder, not pubDate",
  );
  const japanese = read(out, "ja/posts/series-overview-ja/index.html");
  assert.match(japanese, /data-series-card[^>]*data-series-slug="without-default-category"/,
    "localized article renders its series card");
});

test("translationKey groups render hreflang alternates plus self-canonical on articles and in the sitemap", (t) => {
  const { out } = ctx;
  const expected = { "zh-CN": "https://content-model.example.com/posts/hello-content-model/" };
  for (const lang of ["en", "ja"]) {
    const legacy = `posts/${lang}/hello-content-model/index.html`;
    const modern = `${lang}/posts/hello-content-model/index.html`;
    const canonical = fs.existsSync(path.join(out, modern)) ? modern : legacy;
    expected[lang] = `https://content-model.example.com/${canonical.replace(/index\.html$/, "")}`;
    if (canonical === modern) {
      assert.ok(fs.existsSync(path.join(out, legacy)), "legacy compatibility route must stay reachable");
      const legacyHtml = read(out, legacy);
      assert.match(legacyHtml, /<meta name="robots" content="noindex(?:,\s*follow)?"/);
      assert.ok(legacyHtml.includes(`href="${expected[lang]}"`), "legacy route points to canonical article");
      const legacySitemap = readSitemap(out);
      assert.ok(!legacySitemap.includes(`https://content-model.example.com/posts/${lang}/hello-content-model/`),
        "legacy alias must stay out of the sitemap");
    }
  }
  for (const [rel, self] of Object.values(expected).map((url) => [new URL(url).pathname.slice(1) + "index.html", url])) {
    const html = read(out, rel);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="${self.replace(/[/.]/g, "\\$&")}">`),
      `${rel} must self-canonicalize`,
    );
    for (const [lang, href] of Object.entries(expected)) {
      assert.match(
        html,
        new RegExp(`<link rel="alternate" hreflang="${lang}" href="${href.replace(/[/.]/g, "\\$&")}">`),
        `${rel} must carry the hreflang alternate for ${lang}`,
      );
    }
  }
  const sitemap = readSitemap(out);
  for (const href of Object.values(expected)) {
    assert.match(
      sitemap,
      new RegExp(`<xhtml:link rel="alternate" hreflang="[^"]+" href="${href.replace(/[/.]/g, "\\$&")}"/>`),
      "the sitemap must carry the hreflang group",
    );
  }
  assert.ok(!sitemap.includes("draft-preview"), "drafts must not enter the sitemap");
});

test("artifact budgets: all composed pages pass", () => {
  const { out } = ctx;
  const result = spawnSync(process.execPath, ["scripts/artifact-check.mjs", out], {
    cwd: REPO,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, "artifact-check must pass all budgets: " + result.stderr);

  // An empty or partial scan must not pass.
  const scanned = Number(/artifact-check: (\d+) pages,/.exec(result.stdout)?.[1]);
  const composedPages = fs
    .globSync("**/index.html", { cwd: out })
    .filter((rel) => !rel.includes("/pagefind/")).length;
  assert.equal(scanned, composedPages, "artifact-check must scan every composed page");

  assert.match(result.stdout, /BUDGETS OK/);
});

test("series detail pages stay within the article-class budget (3 scripts, 6 islands)", () => {
  const detail = read(ctx.out, "series/getting-started/index.html");
  const scripts = [...detail.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2, "series detail renders the Layout and Markdown runtimes: " + scripts.join(","));
  for (const src of scripts) assert.match(src, /Layout\.astro|Markdown\.astro/);
  assert.ok((detail.match(/<astro-island/g) ?? []).length <= 6, "series detail stays within the island budget");
});
