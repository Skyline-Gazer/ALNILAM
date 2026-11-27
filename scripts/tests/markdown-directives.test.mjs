import assert from "node:assert/strict";
import { test } from "node:test";
import { siteMarkdownProcessor } from "../../themes/shirone/upstream/src/utils/markdown-processor.mjs";

test("Markdown preserves bare colons and explicit directive syntax", async () => {
  const renderer = await siteMarkdownProcessor.createRenderer({});
  const { code } = await renderer.render("Use a:b pairs in prose (计划:无法歌唱).\n\nThe answer is :spoiler[**42**].\n\nFirst:br[]second.");
  assert.match(code, /Use a:b pairs in prose \(计划:无法歌唱\)/);
  assert.match(code, /spoiler[^>]*><strong>42<\/strong>/);
  assert.match(code, /First<br\s*\/?>second/);
});
