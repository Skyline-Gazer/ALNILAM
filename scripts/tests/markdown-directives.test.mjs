import assert from "node:assert/strict";
import { test } from "node:test";
import { siteMarkdownProcessor } from "../../themes/shirone/upstream/src/utils/markdown-processor.mjs";

test("Markdown keeps bare colons in prose and renders directives with content", async () => {
  const renderer = await siteMarkdownProcessor.createRenderer({});
  const { code } = await renderer.render("Use a:b pairs in prose (计划:无法歌唱).\n\nThe answer is :spoiler[**42**].");
  assert.match(code, /Use a:b pairs in prose \(计划:无法歌唱\)/);
  assert.match(code, /spoiler[^>]*><strong>42<\/strong>/);
});
