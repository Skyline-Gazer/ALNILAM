// #62 content-model acceptance (P4/T01): a dedicated multi-locale Site fixture
// proving pagination, localized taxonomy, series and pinned/draft semantics on
// the native Shirone base.
//
// Fixture: tests/fixtures/content-model-site — 14 zh (incl. 1 draft, 1 pinned,
// a 3-part series) + 6 en + 4 ja posts, a config catalog plus a data/taxonomy.yaml
// extension, and a translationKey group spanning zh/en/ja.
//
// Known-recorded failures (see HANDOFF.md: artifact-check is expected to expose
// recorded failures): the 64 KiB page-weight budget cannot hold for unpaginated
// listing routes (archives, category/tag detail pages) once a Site carries a
// realistic post volume — locale-scoped taxonomy pagination is later-phase
// scope (#63/#65). This test asserts those breaches are *exactly* that class
// and route set, and that every other budget class is clean.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSiteRoot } from "../site-contract.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const FIXTURE = path.join(REPO, "tests/fixtures/content-model-site");

// 13 published zh + 6 en + 4 ja = 23 published posts; page size 5 → 5 pages.
const EXPECTED_TOTAL = 23;
const EXPECTED_PAGES = 5;

const read = (out, rel) => fs.readFileSync(path.join(out, rel), "utf8");
/** Unique, non-pagination post links (zh slugs or "<lang>/<slug>"). */
const postLinks = (html) =>
  [...new Set(
    [...html.matchAll(/href="\/posts\/([a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)?)\/"/g)]
      .map((m) => m[1])
      .filter((slug) => !/^\d+$/.test(slug)),
  )];

const ctx = {};

// One composed output shared by all tests; torn down once after the file.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "ALNI-content-model-site-"));
after(() => fs.rmSync(root, { recursive: true, force: true }));

test("content-model fixture composes with localized taxonomy, series, pinned and draft semantics", (t) => {
  const site = path.join(root, "site");
  fs.cpSync(FIXTURE, site, { recursive: true });
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
    fs.readdirSync(site).filter((n) => n.startsWith(".alnilam-")),
    [],
    "no compose bookkeeping may leak into the Site",
  );

  // Provenance binds the same Site digest and the requested Core revision.
  const prov = JSON.parse(read(out, "alnilam-provenance.json"));
  assert.equal(prov.site.digest, digest);
  assert.equal(prov.core.revision, "content-model-test");

  // --- Pagination on /posts/ (page size 5, pinned first) ---
  for (let page = 1; page <= EXPECTED_PAGES; page++) {
    const rel = page === 1 ? "posts/index.html" : `posts/${page}/index.html`;
    assert.ok(fs.existsSync(path.join(out, rel)), `pagination page /posts/${page === 1 ? "" : page + "/"} must exist`);
  }
  const page1 = read(out, "posts/index.html");
  assert.match(page1, new RegExp(`共 ${EXPECTED_TOTAL} 篇 · 第 1/${EXPECTED_PAGES} 页`));
  const cards = postLinks(page1);
  assert.equal(cards[0], "pinned-announcement", "the pinned post must lead the first page despite its old pubDate");
  // Non-default-locale posts are listed with locale-prefixed URLs.
  assert.ok(cards.includes("en/star-notes"), "en posts must be listed: " + cards.join(","));
  assert.ok(cards.includes("ja/star-notes"), "ja posts must be listed: " + cards.join(","));
  assert.match(page1, /href="\/posts\/2\/" rel="next"/, "page 1 must link the next page");
  for (const p of [2, 3, 4, 5]) {
    assert.match(page1, new RegExp(`href="/posts/${p}/" aria-label="第 ${p} 页"`), `page-number link ${p} must render`);
  }
  const page2 = read(out, "posts/2/index.html");
  assert.match(page2, /href="\/posts\/" rel="prev"/, "page 2 must link back to page 1");
  assert.match(page2, /href="\/posts\/3\/" rel="next"/, "page 2 must link forward to page 3");
  const page5 = read(out, "posts/5/index.html");
  assert.match(page5, /href="\/posts\/4\/" rel="prev"/);
  assert.ok(!/rel="next"/.test(page5), "the last page must not offer a next link");
  ctx.out = out;
  ctx.site = site;
  ctx.digest = digest;
});

test("draft posts are excluded from every list, route and feed", (t) => {
  const { out } = ctx;
  assert.equal(fs.existsSync(path.join(out, "posts", "draft-preview")), false, "drafts get no article route");
  const surfaces = [
    "index.html",
    "posts/index.html",
    "posts/2/index.html",
    "posts/3/index.html",
    "posts/4/index.html",
    "posts/5/index.html",
    "archives/index.html",
    "categories/index.html",
    "categories/notes/index.html",
    "tags/index.html",
    "tags/alnilam/index.html",
    "rss.xml",
    "sitemap.xml",
  ];
  for (const rel of surfaces) {
    assert.ok(!read(out, rel).includes("draft-preview"), `draft must not leak into ${rel}`);
  }
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
  const guideMembers = postLinks(guide);
  assert.ok(guideMembers.includes("pinned-announcement"), "zh members are listed: " + guideMembers.join(","));
  assert.ok(guideMembers.includes("en/hello-content-model"), "en members are listed: " + guideMembers.join(","));
  assert.ok(guideMembers.includes("ja/i18n-guide"), "ja members are listed: " + guideMembers.join(","));

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
  const members = postLinks(i18nTag);
  assert.ok(members.includes("hello-content-model"), "zh posts match: " + members.join(","));
  assert.ok(members.includes("en/hello-content-model"), "en posts match: " + members.join(","));
  assert.ok(members.includes("ja/hello-content-model"), "ja posts match: " + members.join(","));
  const paginationTag = read(out, "tags/pagination/index.html");
  assert.match(paginationTag, /<title>#分页 - Content Model<\/title>/, "taxonomy.yaml tag labels are localized too");
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
});

test("translationKey groups render hreflang alternates plus self-canonical on articles and in the sitemap", (t) => {
  const { out } = ctx;
  const expected = {
    "zh-CN": "https://content-model.example.com/posts/hello-content-model/",
    en: "https://content-model.example.com/posts/en/hello-content-model/",
    ja: "https://content-model.example.com/posts/ja/hello-content-model/",
  };
  for (const [rel, self] of [
    ["posts/hello-content-model/index.html", expected["zh-CN"]],
    ["posts/en/hello-content-model/index.html", expected.en],
    ["posts/ja/hello-content-model/index.html", expected.ja],
  ]) {
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
  const sitemap = read(out, "sitemap.xml");
  for (const href of Object.values(expected)) {
    assert.match(
      sitemap,
      new RegExp(`<xhtml:link rel="alternate" hreflang="[^"]+" href="${href.replace(/[/.]/g, "\\$&")}"/>`),
      "the sitemap must carry the hreflang group",
    );
  }
  assert.ok(!sitemap.includes("draft-preview"), "drafts must not enter the sitemap");
});

test("artifact budgets: every class except the recorded page-weight breaches is clean", (t) => {
  const { out } = ctx;
  const result = spawnSync(process.execPath, ["scripts/artifact-check.mjs", out], {
    cwd: REPO,
    encoding: "utf8",
  });
  const failures = result.stdout + result.stderr;
  const recorded = failures
    .split("\n")
    .filter((line) => line.startsWith("FAIL: "))
    .map((line) => line.slice("FAIL: ".length));
  // Every recorded failure must be the page-weight budget on an unpaginated
  // listing route (archives / taxonomy detail). Locale-scoped pagination for
  // these routes is later-phase scope (#63/#65); until then the 64 KiB budget
  // cannot hold for Sites with realistic content volume.
  const unpaginatedListing = /^(archives|categories|tags)\/[^/]*\/?index\.html$/;
  for (const failure of recorded) {
    assert.match(
      failure,
      /^(\S+): HTML [\d.]+ KiB exceeds 64 KiB budget$/,
      `unexpected non-page-weight budget failure: ${failure}`,
    );
    assert.match(
      failure,
      new RegExp(`^${unpaginatedListing.source.replace(/^\^|\$$/g, "")}`),
      `page-weight breach outside unpaginated listing routes: ${failure}`,
    );
  }
  // Any other route class must stay fully within budget: paginated posts
  // pages, articles, the series detail page and the home page.
  const paginated = ["index.html", "posts/index.html"];
  for (let page = 2; page <= EXPECTED_PAGES; page++) paginated.push(`posts/${page}/index.html`);
  for (const rel of paginated) {
    assert.ok(
      !recorded.some((f) => f.startsWith(rel + ":")),
      `paginated route ${rel} must stay within every budget: ${recorded.join(" | ")}`,
    );
  }
  assert.ok(
    !recorded.some((f) => f.startsWith("series/")),
    `series pages must stay within every budget: ${recorded.join(" | ")}`,
  );
  assert.ok(result.stdout.includes("pages,"), "artifact-check must have scanned the composed output");
});
