#!/usr/bin/env node
// Artifact budget + regression guards over a composed output directory.
// Fails the build when a deliverable regresses. Run after `pnpm build`.
//
// Budgets (Issue #4/#7/#61 acceptance: measured native Shirone client JS, CLS, a11y floor):
//   - list/index pages: at most 1 runtime <script> (unified Layout shell runtime)
//   - article pages:    at most 3 runtime <script>s (Layout + SidebarTOC + FloatingTOC);
//                       series detail pages render Markdown bodies and share this budget
//   - any page:         at most 6 Astro islands (4 shell + ArticleShare + optional Comments/Bangumi)
//   - every <img> carries explicit width/height (CLS guard)
//   - every page: <html lang>, <title>, <main> landmark, exactly one <h1>
//   - every page: skip link target present
//   - alnilam-provenance.json exists and binds a 64-hex Site digest
//   - page weight budget: rendered HTML ≤ 64 KiB/page (excl. lazy pagefind)
import fs from "node:fs";
import path from "node:path";

const outDir = process.argv[2] || "dist/site";
if (!fs.existsSync(path.join(outDir, "index.html"))) {
  console.error(`artifact-check: no index.html in ${outDir} — run the build first`);
  process.exit(2);
}
const failures = [];
let pagesChecked = 0;
let scriptRefs = 0;
let islands = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (entry.name === "index.html") checkPage(abs);
  }
}
function checkPage(file) {
  pagesChecked++;
  const rel = path.relative(outDir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  scriptRefs += scripts.length;
  const isPostList = rel === "posts/index.html" || /^posts\/\d+\/index\.html$/.test(rel);
  // Series detail pages render a Markdown overview body through the same
  // content runtime as articles, so they share the article budget rather
  // than the pure list-page budget.
  const isArticle =
    (rel.startsWith("posts/") && !isPostList) || /^series\/[^/]+\/index\.html$/.test(rel);
  const maxScripts = isArticle ? 3 : 1;
  if (scripts.length > maxScripts) {
    failures.push(`${rel}: expected at most ${maxScripts} runtime script(s), found ${scripts.length}`);
  }
  const pageIslands = (html.match(/<astro-island/g) || []).length;
  islands += pageIslands;
  // Native Shirone shell ships 4 interactive M3E controls (Snackbar, Search,
  // LightDarkSwitch, SiteNavigationDrawer) plus up to 2 route islands
  // (ArticleShare + optional Comments, or BangumiSection).
  const maxIslands = isArticle ? 6 : 5;
  if (pageIslands > maxIslands) {
    failures.push(`${rel}: more than ${maxIslands} islands on a page (${pageIslands})`);
  }
  for (const img of html.matchAll(/<img[^>]*>/g)) {
    const tag = img[0];
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      failures.push(`${rel}: <img> without explicit width/height (CLS risk): ${tag.slice(0, 80)}`);
    }
  }
  // Accessibility floor (static analysis of rendered HTML).
  if (!/<html[^>]*\blang=/.test(html)) failures.push(`${rel}: <html> missing lang attribute`);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${rel}: missing <title>`);
  if (!/<main[\s>]/.test(html)) failures.push(`${rel}: missing <main> landmark`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) failures.push(`${rel}: expected exactly one <h1>, found ${h1s}`);
  if (!/class="skip-link"/.test(html)) failures.push(`${rel}: missing skip link`);
  // Page weight budget: HTML document ≤ 64 KiB (lazy assets excluded).
  const kib = Buffer.byteLength(html) / 1024;
  if (kib > 64) failures.push(`${rel}: HTML ${kib.toFixed(1)} KiB exceeds 64 KiB budget`);
}
walk(outDir);

const provPath = path.join(outDir, "alnilam-provenance.json");
if (!fs.existsSync(provPath)) {
  failures.push("alnilam-provenance.json missing from output");
} else {
  const prov = JSON.parse(fs.readFileSync(provPath, "utf8"));
  if (!/^[a-f0-9]{64}$/.test(prov.site?.digest || "")) failures.push("provenance.site.digest is not a SHA-256");
  if (!prov.core?.revision) failures.push("provenance.core.revision missing");
}

console.log(`artifact-check: ${pagesChecked} pages, ${scriptRefs} script refs, ${islands} island refs`);
if (failures.length) {
  for (const f of failures) console.error("FAIL: " + f);
  process.exit(1);
}
console.log("BUDGETS OK");
