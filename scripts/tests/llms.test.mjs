// Issue #78: exercise the published files produced by real Site compositions.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateSiteRoot } from "../site-contract.mjs";

const repo = process.cwd();
const fixture = path.join(process.env.CNB_TRUSTED_TEST_ROOT || repo, "tests/fixtures/content-model-site");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-llms-test-"));
const builds = {};
const source = `---
title: "Nested source fixture"
description: "A source preservation fixture"
pubDate: 2026-03-15
category: "guide"
tags: ["i18n"]
lang: "en"
translationKey: "llms-english-only"
---

## Source heading

\`\`\`js
const preserved = "source fence";
\`\`\`

Inline math $x + y$ and display math:

$$
a^2 + b^2 = c^2
$$

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

![Fixture diagram](../../../../assets/diagram.svg)
![Colocated diagram](./colocated.svg?view=full#detail)
![Missing diagram](./missing.svg)
[Related article](../hello-content-model.md)
[Extensionless article](../hello-content-model?source=fixture#section)
[Private article](../../private-fixture)
[Unlisted article](../../unlisted-fixture)
[Missing article](../does-not-exist)
[Private source](/content/posts/private-fixture)
[Private route](/posts/private-fixture/)
[Rooted article](/posts/hello-content-model/)
[Localized rooted article](/en/posts/hello-content-model/?from=root#section)
[Legacy post path](/posts/en/hello-content-model/)
[Home](/)
[Not found page](/404.html?from=fixture#help)
[Archive](/archives/)
[Tags](/tags/)
[Tag](/tags/i18n/?from=taxonomy#posts)
[Category](/categories/guide/)
[Localized tag](/en/tags/i18n/)
[Localized category](/en/categories/guide/)
[Localized listing](/en/posts/)
[Second page](/posts/2/)
[Localized second page](/en/posts/2/)
[Missing tag](/tags/missing/)
[Missing localized category](/fr/categories/guide/)
[Missing page](/en/posts/999/)
[Missing rooted page](/nonexistent-page/)
[Missing rooted asset](/assets/missing.svg)
![Rooted asset](/assets/posts/cover.svg?view=full#detail)
[External reference](https://example.org/reference)

<aside>Useful component fallback <a href="https://example.org/component">component link</a></aside>
`;

function files(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join("/"))
    .sort();
}
function read(out, rel) { return fs.readFileSync(path.join(out, rel), "utf8"); }
function localFile(out, href, base) {
  const url = new URL(href);
  assert.equal(url.origin, "https://content-model.example.com", href);
  assert.ok(url.pathname.startsWith(base), `${href} must retain deployment base ${base}`);
  let rel = decodeURIComponent(url.pathname.slice(base.length));
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const target = path.resolve(out, rel);
  assert.ok(target.startsWith(out + path.sep), `unsafe path: ${href}`);
  assert.ok(fs.existsSync(target), `missing generated target: ${href}`);
  return target;
}
function compose(name, base, options) {
  const site = path.join(root, `site-${name}`);
  const out = path.join(root, `out-${name}`);
  fs.cpSync(fixture, site, { recursive: true });
  fs.chmodSync(site, 0o755);
  for (const rel of fs.readdirSync(site, { recursive: true })) {
    const target = path.join(site, rel);
    fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644);
  }
  const config = path.join(site, "alnilam.config.yaml");
  fs.writeFileSync(config, fs.readFileSync(config, "utf8")
    .replace("https://content-model.example.com", `https://content-model.example.com${base === "/" ? "" : base.slice(0, -1)}`) + options);
  const nested = path.join(site, "content/posts/en/guides/deep.mdx");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.writeFileSync(nested, source);
  fs.writeFileSync(path.join(path.dirname(nested), "colocated.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>');
  const index = path.join(site, "content/posts/en/index-fixture/index.md");
  fs.mkdirSync(path.dirname(index), { recursive: true });
  fs.writeFileSync(index, `---
title: "Index source fixture"
pubDate: 2026-03-15
lang: en
---

Keep {these braces} in ordinary Markdown.

\`\`\`js
import { value } from "example";
const view = <Component value={value} />;
const comparison = value < 3;
\`\`\`

![Index diagram](./index-diagram.svg?view=full#detail)
[Index sibling](../hello-content-model.md)

Inline <a href="https://example.org/valid">valid link</a> and <a href="./missing.md">missing link</a>.

<div><a href="https://example.org/block">valid block</a> and <a href="./missing.md">missing block</a></div>
`);
  fs.writeFileSync(path.join(path.dirname(index), "index-diagram.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="3"></svg>');
  for (let n = 1; n <= 5; n++) {
    fs.writeFileSync(path.join(site, `content/posts/en/pagination-fixture-${n}.md`),
      `---\ntitle: "Pagination fixture ${n}"\npubDate: 2026-03-15\nlang: en\n---\n\nPagination fixture\n`);
  }
  for (const visibility of ["private", "unlisted"]) {
    fs.writeFileSync(path.join(site, `content/posts/${visibility}-fixture.md`),
      `---\ntitle: "${visibility} fixture"\npubDate: 2026-03-15\n${visibility}: true\n---\n\n${visibility} fixture secret body\n`);
  }
  fs.mkdirSync(path.join(site, "assets"), { recursive: true });
  fs.mkdirSync(path.join(site, "assets/posts"), { recursive: true });
  fs.writeFileSync(path.join(site, "assets/posts/cover.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  fs.writeFileSync(path.join(site, "assets/diagram.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], {
    cwd: repo,
    env: { ...process.env, ALNILAM_CACHE_DIR: path.join(root, "cache"), ALNILAM_CORE_REV: "llms-fixture", SOURCE_DATE_EPOCH: "1700000000" },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `compose ${name} failed:\n${result.stderr}\n${result.stdout}`);
  assert.equal(validateSiteRoot(site).digest, digest, "composition must not change Site source");
  return { out, base };
}

before(() => {
  builds.disabled = compose("disabled", "/", "\nllms:\n  enabled: false\n");
  builds.root = compose("root", "/", "\nllms:\n  enabled: true\n");
  builds.repeat = compose("repeat", "/", "\nllms:\n  enabled: true\n");
  builds.nested = compose("nested", "/ALNILAM/", "\nllms:\n  enabled: true\n  full: true\n");
  builds.defaults = compose("defaults", "/", "");
});
after(() => {
  for (const rel of fs.readdirSync(root, { recursive: true })) {
    const target = path.join(root, rel);
    try { fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644); } catch {}
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test("disabled leaves no LLM artifacts or discovery links", () => {
  for (const { out } of [builds.disabled, builds.defaults]) {
    const emitted = files(out);
    assert.deepEqual(emitted.filter((f) => /(^|\/)llms(?:-full)?\.txt$|(^|\/)index\.md$/.test(f)), []);
    for (const html of emitted.filter((f) => f.endsWith(".html"))) {
      assert.doesNotMatch(read(out, html), /<link\b[^>]*(?:text\/markdown|rel=["']describedby["'])/i, html);
    }
  }
});

test("indexes cover actual locale articles and exclude drafts and missing translations", () => {
  for (const { out, base } of [builds.root, builds.nested]) {
    const rootIndex = read(out, "llms.txt");
    const enIndex = read(out, "en/llms.txt");
    const jaIndex = read(out, "ja/llms.txt");
    for (const text of [rootIndex, enIndex, jaIndex]) {
      assert.match(text, /^#\s+\S/m);
      assert.match(text, /^##\s+\S/m);
      assert.doesNotMatch(text, /draft-preview|草稿预览/i);
      for (const [, href] of text.matchAll(/\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
        assert.match(href, /^https:\/\//, `index link must be absolute: ${href}`);
        localFile(out, href, base);
      }
    }
    assert.match(enIndex, /\/en\/posts\/guides\/deep\/index\.md/);
    assert.doesNotMatch(jaIndex, /guides\/deep/);
    assert.ok(!fs.existsSync(path.join(out, "ja/posts/guides/deep/index.md")));
    assert.ok(!fs.existsSync(path.join(out, "posts/draft-preview/index.md")));
    for (const visibility of ["private", "unlisted"]) {
      assert.ok(!fs.existsSync(path.join(out, `posts/${visibility}-fixture`)));
      for (const text of [rootIndex, enIndex, jaIndex]) assert.doesNotMatch(text, new RegExp(`${visibility} fixture|${visibility}-fixture`));
    }
    assert.ok(!fs.existsSync(path.join(out, "en/categories/guide/index.md")));
    assert.ok(!fs.existsSync(path.join(out, "en/tags/i18n/index.md")));
    assert.ok(fs.existsSync(path.join(out, "en/categories/guide/index.html")));
    assert.ok(fs.existsSync(path.join(out, "en/tags/i18n/index.html")));
  }
});

test("Markdown preserves source semantics and resolves links against each canonical deployment", () => {
  for (const { out, base } of [builds.root, builds.nested]) {
    const md = read(out, "en/posts/guides/deep/index.md");
    for (const fragment of ["## Source heading", 'const preserved = "source fence";', "$x + y$", "a^2 + b^2 = c^2", "```mermaid", "A --> B", "Useful component fallback", "component link", "https://example.org/component"]) {
      assert.ok(md.includes(fragment), `missing source fragment: ${fragment}`);
    }
    for (const label of ["Fixture diagram", "Colocated diagram", "Related article", "Extensionless article", "Rooted article", "Localized rooted article", "Legacy post path", "Rooted asset", "Home", "Not found page", "Archive", "Tags", "Tag", "Category", "Localized tag", "Localized category", "Localized listing", "Second page", "Localized second page"]) {
      const match = md.match(new RegExp(`\\[${label}\\]\\(([^\\s)]+)`));
      assert.ok(match, `missing ${label} link`);
      assert.match(match[1], /^https:\/\//);
      localFile(out, match[1], base);
    }
    assert.match(md, /!\[Colocated diagram\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?_astro\/colocated\.[a-f0-9]{8}\.svg\?view=full#detail\)/);
    assert.match(md, /\[Extensionless article\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?en\/posts\/hello-content-model\/\?source=fixture#section\)/);
    assert.match(md, /\[Localized rooted article\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?en\/posts\/hello-content-model\/\?from=root#section\)/);
    assert.match(md, /\[Rooted article\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?posts\/hello-content-model\/\)/);
    assert.match(md, /\[Not found page\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?404\.html\?from=fixture#help\)/);
    assert.match(md, /\[Legacy post path\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?posts\/en\/hello-content-model\/\)/);
    assert.match(md, /!\[Rooted asset\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?site-assets\/posts\/cover\.svg\?view=full#detail\)/);
    assert.match(md, /\[Tag\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?tags\/i18n\/\?from=taxonomy#posts\)/);
    for (const label of ["Missing tag", "Missing localized category", "Missing page"]) {
      assert.doesNotMatch(md, new RegExp(`\\[${label}\\]\\(`));
    }
    const indexMd = read(out, "en/posts/index-fixture/index.md");
    for (const fragment of ["Keep {these braces} in ordinary Markdown.", 'import { value } from "example";', "const view = <Component value={value} />;", "const comparison = value < 3;"]) {
      assert.ok(indexMd.includes(fragment), `missing Markdown source fragment: ${fragment}`);
    }
    assert.ok(indexMd.includes('```js\nimport { value } from "example";\nconst view = <Component value={value} />;\nconst comparison = value < 3;\n```'));
    const indexImage = indexMd.match(/!\[Index diagram\]\(([^)]+)\)/);
    assert.ok(indexImage, "missing index post image");
    localFile(out, indexImage[1], base);
    assert.match(indexImage[1], /\/_astro\/index-diagram\.[a-f0-9]{8}\.svg\?view=full#detail$/);
    assert.match(indexMd, /\[Index sibling\]\(https:\/\/content-model\.example\.com\/(?:ALNILAM\/)?en\/posts\/hello-content-model\/\)/);
    const indexHtml = read(out, "en/posts/index-fixture/index.html");
    assert.ok(indexHtml.includes(new URL(indexImage[1]).pathname + "?view=full#detail"), "HTML and Markdown must use the same index post image");
    assert.ok(indexMd.includes('<a href="https://example.org/valid">valid link</a> and missing link.'));
    assert.ok(indexMd.includes('<a href="https://example.org/block">valid block</a> and missing block'));
    assert.doesNotMatch(indexMd, /missing (?:link|block)<\/a>/);
    assert.doesNotMatch(md, /\]\([^)]*(?:nonexistent-page|assets\/missing\.svg)/);
    const html = read(out, "en/posts/guides/deep/index.html");
    assert.match(html, /src="[^"]*\/_astro\/colocated\.[a-f0-9]{8}\.svg\?view=full#detail"/);
    assert.doesNotMatch(md, /\]\([^)]*(?:private-fixture|unlisted-fixture|does-not-exist|missing\.svg|site-assets\/colocated)/);
    assert.match(md, /https:\/\/example\.org\/reference/);
  }
});

test("every article discovery link resolves and taxonomy pages advertise no Markdown view", () => {
  for (const { out, base } of [builds.root, builds.nested]) {
    let alternates = 0;
    for (const file of files(out).filter((f) => f.endsWith(".html"))) {
      const html = read(out, file);
      for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
        const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(([, k, v]) => [k.toLowerCase(), v]));
        if (!(attrs.rel === "describedby" || (attrs.rel === "alternate" && attrs.type === "text/markdown"))) continue;
        assert.ok(attrs.href, `${file}: missing href`);
        localFile(out, attrs.href, base);
        if (attrs.type === "text/markdown") {
          alternates++;
          assert.match(file, /(?:^|\/)posts\//);
        }
      }
    }
    assert.ok(alternates > 0, "crawler must encounter article Markdown discovery");
    const article = read(out, "en/posts/guides/deep/index.html");
    assert.match(article, /rel=["']alternate["'][^>]*type=["']text\/markdown["']|type=["']text\/markdown["'][^>]*rel=["']alternate["']/i);
    assert.match(article, /rel=["']describedby["']/i);
    for (const listing of ["en/categories/guide/index.html", "en/tags/i18n/index.html"]) {
      assert.doesNotMatch(read(out, listing), /<link\b[^>]*type=["']text\/markdown["']/i);
    }
  }
});

test("full aggregation is opt-in and repeated builds have identical LLM artifacts", () => {
  assert.ok(!fs.existsSync(path.join(builds.root.out, "llms-full.txt")));
  const full = read(builds.nested.out, "llms-full.txt");
  assert.match(full, /Source heading/);
  assert.match(full, /```mermaid/);
  assert.match(full, /\[Localized tag\]\(https:\/\/content-model\.example\.com\/ALNILAM\/en\/tags\/i18n\/\)/);
  assert.ok(full.includes(read(builds.nested.out, "en/posts/guides/deep/index.md")), "full text must contain the finalized article Markdown");
  assert.match(full, /\[Not found page\]\(https:\/\/content-model\.example\.com\/ALNILAM\/404\.html\?from=fixture#help\)/);
  assert.match(full, /\[Localized second page\]\(https:\/\/content-model\.example\.com\/ALNILAM\/en\/posts\/2\/\)/);
  assert.doesNotMatch(full, /draft-preview|草稿预览|草稿夹具|private fixture|unlisted fixture/);
  const artifacts = (out) => files(out).filter((f) => /(^|\/)llms(?:-full)?\.txt$|(^|\/)index\.md$/.test(f));
  const expected = artifacts(builds.root.out);
  assert.deepEqual(artifacts(builds.repeat.out), expected);
  for (const file of expected) assert.equal(read(builds.root.out, file), read(builds.repeat.out, file), file);
});
