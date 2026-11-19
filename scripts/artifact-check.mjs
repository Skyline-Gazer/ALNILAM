#!/usr/bin/env node
// Artifact budget + regression guards over a composed output directory.
// Fails the build when a deliverable regresses. Run after `pnpm build`.
//
// Budgets (Issue #4/#7/#61 acceptance: measured native Shirone client JS, CLS, a11y floor):
//   - list/index pages: at most 1 runtime <script> (unified Layout shell runtime)
//   - article pages:    at most 3 runtime <script>s (Layout + SidebarTOC + FloatingTOC);
//                       series detail pages render a Markdown body (Layout + Markdown)
//                       and are treated as article-class pages, not list pages
//   - any page:         at most 6 Astro islands (4 shell + ArticleShare + optional Comments/Bangumi)
//   - every <img> carries explicit width/height (CLS guard)
//   - every page: <html lang>, <title>, <main> landmark, exactly one <h1>
//   - every page: skip link target present
//   - alnilam-provenance.json exists and binds a 64-hex Site digest
//   - page weight budget: rendered HTML ≤ 64 KiB/page (excl. lazy pagefind)
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.argv[2] || "dist/site");
function pathHasSymlinkComponent(absolutePath) {
  const root = path.parse(absolutePath).root;
  let current = root;
  for (const part of path.relative(root, absolutePath).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
      throw error;
    }
  }
  return false;
}

let outDirStat;
try {
  if (pathHasSymlinkComponent(outDir)) {
    console.error("artifact-check: output path crosses a symbolic-link component");
    process.exit(2);
  }

  outDirStat = fs.lstatSync(outDir);
} catch {
  console.error(`artifact-check: output directory is missing: ${outDir}`);
  process.exit(2);
}
if (!outDirStat.isDirectory() || outDirStat.isSymbolicLink()) {
  console.error(`artifact-check: output root must be a real directory: ${outDir}`);
  process.exit(2);
}
if (!fs.existsSync(path.join(outDir, "index.html"))) {
  console.error(`artifact-check: no index.html in ${outDir} — run the build first`);
  process.exit(2);
}
const failures = [];
let pagesChecked = 0;
let scriptRefs = 0;
let islands = 0;

const LOCAL_ARTIFACT_DIRS = new Set([
  ".astro", ".cache", ".next", ".nuxt", ".pytest_cache", ".svelte-kit", ".turbo", ".vercel", ".vite",
  "__pycache__", "artifacts", "browser-results", "coverage", "lighthouse", "node_modules", "playwright-report",
  "test-results", "tmp", "temp",
]);
const LOCAL_ARTIFACT_FILE = /\.(?:json|zip|xml)$/;
const CREDENTIAL_DIRS = new Set([".aws", ".docker", ".gnupg", ".kube", ".ssh"]);
const CREDENTIAL_FILES = new Set([".netrc", ".npmrc", ".pypirc"]);
const PRIVATE_KEY_NAMES = new Set(["id_dsa", "id_ecdsa", "id_ed25519", "id_rsa"]);
function isSafePublicEnvExample(relativePath, entry, absolutePath) {
  if (relativePath.toLowerCase() !== "docs/examples/.env.example" || !entry.isFile()) return false;
  try {
    const stat = fs.lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024) return false;
    const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/).map((line) => line.trim());
    const assignments = lines.filter((line) => line && !line.startsWith("#"));
    return assignments.length > 0 && assignments.every((line) =>
      /^[A-Z_][A-Z0-9_]*=<(?:(?:your|replace-with)-[A-Z0-9_-]+)>$/i.test(line),
    );
  } catch {
    return false;
  }
}


function isGeneratedSiteRouteDirectory(segments, absolutePath) {
  const routeRootIndex = /^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(segments[0]) ? 1 : 0;
  if (
    !["pages", "posts"].includes(segments[routeRootIndex]) ||
    segments.length <= routeRootIndex + 1
  ) {
    return false;
  }
  try {
    const indexStat = fs.lstatSync(path.join(absolutePath, "index.html"));
    return indexStat.isFile() && !indexStat.isSymbolicLink();
  } catch {
    return false;
  }
}

function hygieneRule(relativePath, entry, absolutePath) {
  const normalized = relativePath.split(path.sep).join("/");
  const segments = normalized.toLowerCase().split("/");
  const base = segments.at(-1);
  if (entry.isSymbolicLink()) return "symbolic link";
  if (segments.includes(".git") || [".gitattributes", ".gitignore", ".gitmodules"].includes(base)) {
    return "repository metadata";
  }
  const envExample = isSafePublicEnvExample(normalized, entry, absolutePath);
  if (segments.some((part) => part === ".env" || part.startsWith(".env.")) && !envExample) {
    return "environment file";
  }
  if (segments.some((part) => CREDENTIAL_DIRS.has(part)) || /\.config\/gcloud(?:\/|$)/i.test(normalized)) {
    return "credential store";
  }
  if (CREDENTIAL_FILES.has(base) || base === "credentials.json" || /^service-account(?:[-_].*)?\.json$/i.test(base)) {
    return "credential configuration";
  }
  if (
    !entry.isDirectory() &&
    segments.some((part) => LOCAL_ARTIFACT_DIRS.has(part)) &&
    LOCAL_ARTIFACT_FILE.test(base)
  ) {
    return "local build or test artifact file";
  }
  if (
    entry.isDirectory() &&
    LOCAL_ARTIFACT_DIRS.has(base) &&
    !isGeneratedSiteRouteDirectory(segments, absolutePath)
  ) {
    return "local build or test artifact directory";
  }
  if (entry.isDirectory() && base.startsWith(".") && base !== ".well-known") {
    return "unapproved hidden directory";
  }
  if (!entry.isDirectory()) {
    if (PRIVATE_KEY_NAMES.has(base) || /^ssh_host_(?:dsa|ecdsa|ed25519|rsa)_key$/i.test(base)) return "private-key filename";
    if (/\.(?:key|pem|p12|pfx)$/i.test(base)) return "private-key or certificate container";
    if (/\.(?:bak|backup|orig|rej|swp|swo|tmp|temp)$/i.test(base) || /~$/.test(base) || /^\.#[^/]+$/.test(base)) {
      return "backup or temporary file";
    }
    if ([".ds_store", "thumbs.db"].includes(base)) return "local operating-system metadata";
  }
  return null;
}

function walk(dir, parent = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = parent ? path.join(parent, entry.name) : entry.name;
    const rule = hygieneRule(rel, entry, abs);
    if (rule) {
      failures.push(`${rel.split(path.sep).join("/")}: ${rule}`);
      continue;
    }
    if (entry.isDirectory()) walk(abs, rel);
    else if (entry.isFile() && entry.name === "index.html") checkPage(abs);
    else if (!entry.isFile()) failures.push(`${rel.split(path.sep).join("/")}: unsupported filesystem entry`);
  }
}
function checkPage(file) {
  pagesChecked++;
  const rel = path.relative(outDir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  // Strip a leading BCP-47 locale segment (the Core's validated `lang`
  // syntax: 2-3 language letters, optional region/script subtags).
  const localePrefix = /^[a-z]{2,3}(?:-[A-Za-z0-9]+)*/;
  const unlocalizedRel = rel.replace(new RegExp(`^${localePrefix.source}/`), "");
  const isPostList = unlocalizedRel === "posts/index.html" || /^posts\/\d+\/index\.html$/.test(unlocalizedRel);
  // Series details and Site pages render the shared Markdown body runtime,
  // so they use the article-class script and island budgets.
  const isArticle =
    (unlocalizedRel.startsWith("posts/") && !isPostList) ||
    /^series\/[^/]+\/index\.html$/.test(unlocalizedRel) ||
    /^pages\/.+\/index\.html$/.test(unlocalizedRel);
  const maxScripts = isArticle ? 3 : 1;
  // Owner-opted integrations (#92 consent, #91 GA4, later #90/#93 ads)
  // each ship exactly one mount element and one loader script, and only
  // when enabled. They are bounded separately from the core runtime.
  const optionalMounts = (html.match(/id="alnilam-(?:consent-gate|ga4|adsense|dkma)"/g) || []).length;
  if (scripts.length > maxScripts + optionalMounts) {
    failures.push(`${rel}: expected at most ${maxScripts + optionalMounts} runtime script(s) (core ${maxScripts} + ${optionalMounts} optional integration), found ${scripts.length}`);
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
let provStat;
try {
  provStat = fs.lstatSync(provPath);
} catch {
  failures.push("alnilam-provenance.json missing from output");
}
if (provStat && (!provStat.isFile() || provStat.isSymbolicLink())) {
  failures.push("alnilam-provenance.json is not a regular file");
} else if (provStat) {
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
