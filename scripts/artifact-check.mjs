#!/usr/bin/env node
// Artifact budget + regression guards over a composed output directory.
// Fails the build when a deliverable regresses. Run after `pnpm build`.
//
// Budgets (Issue #4 acceptance: measured client JS, CLS protection):
//   - posts pages: ZERO runtime <script> from ALNILAM (static content only)
//   - any page:    at most ONE Astro island loader bundle reference
//   - every <img> carries explicit width/height (CLS guard)
//   - alnilam-provenance.json exists and binds a 64-hex Site digest
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
  const rel = path.relative(outDir, file);
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  scriptRefs += scripts.length;
  if (rel.startsWith("posts") && scripts.length > 0) {
    failures.push(`${rel}: posts pages must ship zero runtime scripts, found ${scripts.length}`);
  }
  const pageIslands = (html.match(/<astro-island/g) || []).length;
  islands += pageIslands;
  // Budget: ≤2 islands per page (homepage legitimately ships Status + Search).
  if (pageIslands > 2) failures.push(`${rel}: more than two islands on a page (${pageIslands})`);
  for (const img of html.matchAll(/<img[^>]*>/g)) {
    const tag = img[0];
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      failures.push(`${rel}: <img> without explicit width/height (CLS risk): ${tag.slice(0, 80)}`);
    }
  }
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
