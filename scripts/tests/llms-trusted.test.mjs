// Issue #78: target-owned tests for the optional LLM publication feature.
// The target branch predates the feature; exercise it when the candidate supplies it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const moduleUrl = pathToFileURL(path.resolve(process.cwd(), "apps/web/src/lib/llms.mjs"));
const featurePresent = fs.existsSync(moduleUrl);
const config = {
  site: { url: "https://example.org/blog/", title: "Example", description: "A site", locale: "en" },
  locales: ["en", "fr"],
  llms: { full: true },
};
const post = (id, title, extra = {}) => ({
  id, filePath: `content/posts/${id}.md`, body: "Article body", data: { title, ...extra },
});

test("LLM indexes include published configured locales and deployment base", { skip: !featurePresent }, async () => {
  const { llmsPosts, localeHasPosts, markdownPath, llmsIndexPath, deploymentBase, absolute, indexText } = await import(moduleUrl);
  const english = post("en/hello", "Hello [world]", { description: "First\narticle" });
  const french = post("fr/bonjour", "Bonjour", { lang: "fr" });
  const published = llmsPosts([post("en/draft", "Draft", { draft: true }), english, french, post("de/hallo", "Hallo", { lang: "de" })], config);
  assert.deepEqual(published, [french, english]);
  assert.equal(localeHasPosts(published, "fr", config), true);
  assert.equal(localeHasPosts(published, "de", config), false);
  assert.equal(markdownPath(english, config), "/posts/hello/index.md");
  assert.equal(llmsIndexPath("en", config), "/llms.txt");
  assert.equal(llmsIndexPath("fr", config), "/fr/llms.txt");
  assert.equal(deploymentBase(config), "/blog");
  assert.equal(absolute("/posts/hello/", config), "https://example.org/blog/posts/hello/");
  const index = indexText(published, config);
  assert.match(index, /Hello \\\[world\\\]/);
  assert.match(index, /First article/);
  assert.match(index, /https:\/\/example\.org\/blog\/fr\/posts\/bonjour\/index\.md/);
  assert.match(index, /https:\/\/example\.org\/blog\/fr\/llms\.txt/);
  assert.match(index, /https:\/\/example\.org\/blog\/llms-full\.txt/);
  const frenchIndex = indexText(published, config, "fr");
  assert.match(frenchIndex, /Bonjour/);
  assert.doesNotMatch(frenchIndex, /Hello|## Languages|## Optional/);
  assert.doesNotMatch(indexText([english], { ...config, llms: { full: false } }), /## Languages|## Optional/);
});

test("LLM markdown resolves public links and assets and removes unsafe destinations", { skip: !featurePresent }, async (t) => {
  const { fullText, stageMarkdown, finishMarkdown } = await import(moduleUrl);
  const { markdownView } = await import(pathToFileURL(path.resolve(process.cwd(), "apps/web/src/lib/llms-markdown.mjs")));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "llms-trusted-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "content/posts/en"), { recursive: true });
  fs.mkdirSync(path.join(root, "assets"), { recursive: true });
  fs.writeFileSync(path.join(root, "assets/diagram.svg"), "<svg/>");
  fs.writeFileSync(path.join(root, "content/posts/en/local.svg"), "<svg/>");
  const article = post("en/hello", "Hello");
  article.body = `---\ntitle: Hello\n---\n\n[Related](./related.md?from=hello#part)\n[Missing](./missing.md)\n[Home](/)\n[External](https://example.net/)\n![Diagram](/assets/diagram.svg)\n![Local](./local.svg)\n![Missing image](./absent.svg)\n\n<a href="./missing.md">raw missing</a>\n<a href="javascript:alert(1)">raw unsafe</a>\n\nInline $x + y$.\n`;
  const related = post("en/related", "Related");
  const posts = [article, related];
  const routes = new Set(["/", "/posts/hello", "/posts/related"]);
  const markdown = markdownView(article, posts, root, config, routes);
  assert.match(markdown, /^# Hello\n/);
  assert.doesNotMatch(markdown, /title: Hello|\.\/missing\.md|\.\/absent\.svg/);
  assert.match(markdown, /raw missing/);
  assert.match(markdown, /raw unsafe/);
  assert.doesNotMatch(markdown, /<a\b|javascript:/i);
  assert.match(markdown, /\[Related\]\(https:\/\/example\.org\/blog\/posts\/related\/\?from=hello#part\)/);
  assert.match(markdown, /\[Home\]\(https:\/\/example\.org\/blog\/\)/);
  assert.match(markdown, /\[External\]\(https:\/\/example\.net\/\)/);
  assert.match(markdown, /!\[Diagram\]\(https:\/\/example\.org\/blog\/site-assets\/diagram\.svg\)/);
  assert.match(markdown, /!\[Local\]\(https:\/\/example\.org\/blog\/_astro\/local\.[a-f0-9]{8}\.svg\)/);
  assert.match(markdown, /Inline \$x \+ y\$/);
  assert.equal(finishMarkdown("ordinary content", routes), null);
  assert.equal(finishMarkdown(stageMarkdown({ post: article, posts, root, config }), routes), markdown);
  const combined = fullText(posts, root, config, routes);
  assert.match(combined, /\n\n---\n\n# Related/);
  assert.equal(finishMarkdown(stageMarkdown({ posts, root, config }), routes), combined);
  const unpublished = markdownView(article, posts, root, config, new Set(["/"]));
  assert.doesNotMatch(unpublished, /\]\(https:\/\/example\.org\/blog\/posts\/related/);
  const mdx = { ...post("en/component", "Component"), filePath: "content/posts/en/component.mdx", body: '<a href="./missing.md">mdx missing</a>\n\n<a href="javascript:alert(1)">mdx unsafe</a>' };
  const mdxMarkdown = markdownView(mdx, [...posts, mdx], root, config, routes);
  assert.match(mdxMarkdown, /mdx missing/);
  assert.match(mdxMarkdown, /mdx unsafe/);
  assert.doesNotMatch(mdxMarkdown, /<a\b|javascript:|\.\/missing\.md/i);
});

test("LLM build hook finalizes staged markdown against emitted routes", { skip: !featurePresent }, async (t) => {
  const { stageMarkdown } = await import(moduleUrl);
  const { createSeoInventory } = await import(pathToFileURL(path.resolve(process.cwd(), "apps/web/seo-inventory.mjs")));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "llms-hook-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, "dist");
  const page = path.join(output, "posts/hello");
  fs.mkdirSync(page, { recursive: true });
  fs.writeFileSync(path.join(page, "index.html"), "<html></html>");
  const article = { ...post("en/hello", "Title"), body: "Article body with [missing](./missing.md)." };
  const markdownFile = path.join(page, "index.md");
  const fullFile = path.join(output, "llms-full.txt");
  fs.writeFileSync(markdownFile, stageMarkdown({ post: article, posts: [article], root, config }));
  fs.writeFileSync(fullFile, stageMarkdown({ posts: [article], root, config }));
  createSeoInventory({ base: "/blog" }).hooks["astro:build:done"]({ dir: pathToFileURL(output + path.sep) });
  for (const file of [markdownFile, fullFile]) {
    const text = fs.readFileSync(file, "utf8");
    assert.match(text, /^# Title\n/);
    assert.match(text, /Article body with missing\./);
    assert.doesNotMatch(text, /\.\/missing\.md|alnilam:pending-markdown/);
  }
});

test("LLM endpoints generate paths only when publication is enabled", { skip: !featurePresent }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "llms-endpoint-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const posts = [post("en/hello", "Hello"), post("fr/bonjour", "Bonjour", { lang: "fr" })];
  const siteUrl = `data:text/javascript,${encodeURIComponent(`export const site = ${JSON.stringify({ root, config: { ...config, llms: { ...config.llms, enabled: false } } })}; export const loadSite = () => site;`)}`;
  const contentUrl = `data:text/javascript,${encodeURIComponent(`export const getCollection = async () => ${JSON.stringify(posts)};`)}`;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "astro:content") return { url: contentUrl, shortCircuit: true };
      if (specifier.endsWith("/lib/site-source.mjs")) return { url: siteUrl, shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
  t.after(() => hooks.deregister());
  const pageUrl = (file) => pathToFileURL(path.resolve(process.cwd(), "apps/web/src/pages", file));
  const markdownEndpoint = await import(pageUrl("[...llms].md.js"));
  const localeEndpoint = await import(pageUrl("[lang]/llms.txt.js"));
  const { site } = await import(siteUrl);
  assert.deepEqual(await markdownEndpoint.getStaticPaths(), []);
  assert.deepEqual(await localeEndpoint.getStaticPaths(), []);
  site.config.llms.enabled = true;
  assert.deepEqual((await markdownEndpoint.getStaticPaths()).map(({ params }) => params.llms).sort(), ["fr/posts/bonjour/index", "posts/hello/index"]);
  assert.deepEqual((await localeEndpoint.getStaticPaths()).map(({ params }) => params.lang), ["fr"]);
});
