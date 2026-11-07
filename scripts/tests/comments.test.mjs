import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSiteConfig } from "../../packages/core/src/index.mjs";
import {
  GISCUS_ORIGIN,
  commentLang,
  commentsCsp,
  giscusLang,
  resolveCommentIdentity,
} from "../../apps/web/src/lib/comments.mjs";
import { commentLabels } from "../../apps/web/src/lib/i18n.mjs";

const base = {
  schemaVersion: 2,
  site: { title: "Comments", url: "https://example.com", locale: "zh-CN" },
  locales: ["zh-CN", "en", "ja"],
};
const configWith = (comments) => normalizeSiteConfig({ ...base, comments });
const enabled = {
  enabled: true,
  repo: "alnilam/comments",
  repoId: "R_fixture",
  category: "Announcements",
  categoryId: "DIC_fixture",
  mapping: "specific",
};
const post = (id, data = {}) => ({ id, data: { title: id, ...data } });

test("comments are off by default with stable-identity defaults", () => {
  const config = configWith(undefined);
  assert.equal(config.comments.enabled, false);
  assert.equal(config.comments.provider, "giscus");
  assert.equal(config.comments.mapping, "specific");
  assert.equal(config.comments.sharing, "translation");
  assert.equal(config.comments.load, "click");
  assert.equal(config.comments.lang, "auto");
  assert.equal(config.comments.csp, true);
});

test("provider and secret-boundary fields fail closed even when comments are disabled", () => {
  assert.throws(
    () => configWith({ enabled: false, provider: "twikoo" }),
    /comments\.provider must be "giscus"/,
  );
  for (const key of ["token", "accessToken", "webhookSecret", "privateKey"]) {
    assert.throws(
      () => configWith({ enabled: false, [key]: "must-not-be-stored" }),
      new RegExp(`unknown comments field "${key}"`),
    );
  }
  assert.throws(() => configWith({ ...enabled, repo: "owner" }), /comments\.repo must be a public GitHub "owner\/repo" identifier/);
  assert.throws(() => configWith({ ...enabled, repo: "a/b/c" }), /comments\.repo must be a public GitHub "owner\/repo" identifier/);
});

test("enabled provider identifiers and enum options are validated with actionable messages", () => {
  const legacy = { ...enabled };
  delete legacy.mapping;
  for (const comments of [legacy, { ...legacy, mapping: null }]) {
    assert.throws(
      () => configWith(comments),
      /comments\.mapping is required.*"pathname" to preserve existing threads.*"specific" for new threads/,
    );
  }
  assert.throws(() => configWith({ enabled: true, mapping: "specific" }), /comments\.repo is required/);
  assert.throws(() => configWith({ ...enabled, repoId: "" }), /comments\.repoId is required/);
  assert.throws(() => configWith({ ...enabled, category: "" }), /comments\.category is required/);
  assert.throws(() => configWith({ ...enabled, categoryId: "" }), /comments\.categoryId is required/);
  assert.throws(() => configWith({ ...enabled, enabled: "yes" }), /comments\.enabled must be a boolean/);
  assert.throws(() => configWith({ ...enabled, mapping: "url" }), /comments\.mapping must be specific, pathname or number/);
  assert.throws(() => configWith({ ...enabled, sharing: "site" }), /comments\.sharing must be translation or locale/);
  assert.throws(() => configWith({ ...enabled, load: "always" }), /comments\.load must be click or visible/);
  assert.throws(() => configWith({ ...enabled, lang: "zh_CN" }), /comments\.lang must be "auto" or a BCP-47 tag/);
  assert.throws(() => configWith({ ...enabled, csp: "yes" }), /comments\.csp must be a boolean/);
  const trimmed = configWith({ ...enabled, repo: "  alnilam/comments  ", categoryId: " DIC_fixture " });
  assert.equal(trimmed.comments.repo, "alnilam/comments");
  assert.equal(trimmed.comments.categoryId, "DIC_fixture");
});

test("explicit commentId survives renamed slugs, locales and deployment base changes", () => {
  const config = configWith(enabled);
  const original = resolveCommentIdentity(
    post("posts/old-slug.md", { commentId: "thread-42", lang: "zh-CN" }),
    config,
  );
  const renamed = resolveCommentIdentity(
    post("posts/new/slug.md", { commentId: "thread-42", lang: "zh-CN" }),
    config,
  );
  const translated = resolveCommentIdentity(
    post("en/new/slug.md", { commentId: "thread-42", lang: "en" }),
    config,
  );
  const nestedBase = resolveCommentIdentity(
    post("posts/new/slug.md", { commentId: "thread-42", lang: "zh-CN" }),
    normalizeSiteConfig({ ...base, site: { ...base.site, url: "https://example.com/ALNILAM/" }, comments: enabled }),
  );
  assert.equal(original.term, "thread-42");
  assert.equal(renamed.term, "thread-42");
  assert.equal(translated.term, "thread-42");
  assert.equal(nestedBase.term, "thread-42");
  assert.equal(original.sharedAcrossLocales, true);
});

test("translationKey sharing is shared by default and partitioned by locale on request", () => {
  const shared = configWith(enabled);
  const zh = resolveCommentIdentity(post("posts/hello.md", { translationKey: "hello", lang: "zh-CN" }), shared);
  const en = resolveCommentIdentity(post("en/hello.md", { translationKey: "hello", lang: "en" }), shared);
  assert.equal(zh.term, "alnilam:translation:hello");
  assert.equal(en.term, zh.term);

  const partitioned = configWith({ ...enabled, sharing: "locale" });
  const zhPart = resolveCommentIdentity(post("posts/hello.md", { translationKey: "hello", lang: "zh-CN" }), partitioned);
  const enPart = resolveCommentIdentity(post("en/hello.md", { translationKey: "hello", lang: "en" }), partitioned);
  assert.equal(zhPart.term, "alnilam:translation:hello::zh-CN");
  assert.equal(enPart.term, "alnilam:translation:hello::en");
  assert.notEqual(zhPart.term, enPart.term);
});

test("content id is the fallback stable identity and pathname stays an explicit legacy opt-in", () => {
  const config = configWith(enabled);
  const first = resolveCommentIdentity(post("posts/hello.md"), config);
  const moved = resolveCommentIdentity(post("posts/renamed.md"), config);
  assert.equal(first.term, "alnilam:content:posts/hello");
  assert.notEqual(first.term, moved.term);
  assert.equal(first.source, "contentId");
  assert.equal(first.lang, "zh-CN");

  const legacy = resolveCommentIdentity(post("posts/hello.md"), configWith({ ...enabled, mapping: "pathname" }));
  assert.equal(legacy.mapping, "pathname");
  assert.equal(legacy.term, undefined);
  assert.equal(legacy.source, "pathname");
});

test("number mapping requires an explicit numeric commentId", () => {
  const config = configWith({ ...enabled, mapping: "number" });
  assert.throws(
    () => resolveCommentIdentity(post("posts/hello.md", { commentId: "thread-42" }), config),
    /comments\.mapping "number" requires a numeric frontmatter commentId/,
  );
  assert.equal(resolveCommentIdentity(post("posts/hello.md", { commentId: "42" }), config).term, "42");
  assert.throws(
    () => resolveCommentIdentity(post("posts/hello.md", {}), config),
    /computed term "alnilam:content:posts\/hello"/,
  );
});

test("oversized comment terms fail at build time", () => {
  const config = configWith(enabled);
  assert.throws(
    () => resolveCommentIdentity(post("posts/hello.md", { commentId: "x".repeat(513) }), config),
    /longer than 512 characters/,
  );
});

test("giscus locale resolution follows the page and falls back to English", () => {
  for (const [input, expected] of [
    ["zh-CN", "zh-CN"],
    ["zh", "zh-CN"],
    ["zh-TW", "zh-TW"],
    ["en-US", "en"],
    ["ja", "ja"],
    ["pt-BR", "pt"],
    ["sr-hr", "sr-hr"],
    ["xx-YY", "en"],
  ]) {
    assert.equal(giscusLang(input), expected, input);
  }
  assert.equal(commentLang(configWith({ ...enabled, lang: "auto" }), "ja"), "ja");
  assert.equal(commentLang(configWith({ ...enabled, lang: "zh-TW" }), "en"), "zh-TW");
});

test("CSP is absent when disabled/opted out and otherwise scopes giscus plus page media", () => {
  assert.equal(commentsCsp(configWith(undefined)), null);
  assert.equal(commentsCsp(configWith({ ...enabled, csp: false })), null);
  const csp = commentsCsp(configWith(enabled));
  assert.ok(csp.includes(`script-src 'self' 'unsafe-inline' ${GISCUS_ORIGIN} 'wasm-unsafe-eval'`));
  assert.ok(csp.includes(`frame-src ${GISCUS_ORIGIN} https://www.youtube-nocookie.com https://player.bilibili.com https://www.acfun.cn`));
  assert.ok(csp.includes(`connect-src 'self' ${GISCUS_ORIGIN}`));
  assert.ok(csp.includes("media-src 'self' https:"));
  assert.ok(!/frame-src[^;]*\*/.test(csp));
  assert.ok(!/script-src[^;]*\*/.test(csp));
  assert.ok(!csp.includes("twikoo"));
  assert.ok(!csp.includes("waline"));
  assert.ok(!csp.includes("jsdelivr"));
});

test("comment labels are plain strings in every shipped locale", () => {
  for (const locale of ["zh-CN", "en", "ja", "fr"]) {
    const labels = commentLabels(locale);
    assert.deepEqual(Object.keys(labels).sort(), [
      "commentsDisclosure",
      "commentsDiscussion",
      "commentsLoad",
      "commentsLoadNote",
      "commentsLoading",
      "commentsRegion",
      "commentsRequiresJs",
      "commentsRetry",
      "commentsUnavailable",
      "commentsVisibleNote",
    ]);
    for (const [key, value] of Object.entries(labels)) {
      assert.equal(typeof value, "string", `${locale}.${key}`);
      assert.ok(value.length > 0, `${locale}.${key}`);
    }
  }
});
