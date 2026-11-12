#!/usr/bin/env node
/**
 * Offline Pages CMS authoring adapter (GitHub Issue #88 PoC).
 *
 * This is a standalone verification tool, not a Core runtime service and not a
 * Site data authority. It models the one write a Git-based editor performs on a
 * post: replace a few declared frontmatter fields while leaving the Markdown /
 * MDX body and every undeclared frontmatter key intact. The Site-owned editor
 * schema is `.pages.yml`; Core's compose pipeline never reads that file.
 *
 * Usage:
 *   node scripts/pages-cms.mjs verify --site <site-dir> [--json]
 *   node scripts/pages-cms.mjs edit --site <site-dir> --post <relative-path> \
 *       --set '{"title":"New title"}' [--out <file>] [--merge false]
 *   node scripts/pages-cms.mjs init --site <site-dir> [--force]
 *
 * `verify` is read-only. `edit` writes to --out when given, otherwise back to
 * the post; `init` writes `.pages.yml` unless one already exists. In a real Site
 * a CMS commit lands before compose; never run a writing command while a compose
 * is running (the builder re-hashes the four Site inputs and fails on mutation).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { normalizeSiteConfig, parseSiteConfigDocument, SITE_CONFIG_FILENAME } from "../packages/core/src/index.mjs";

// Core owns the workspace's YAML dependency. Anchoring require() at the Core
// package keeps this tool runnable from a plain checkout and from the isolated
// CNB trusted-test tree (where packages/ is symlinked from the candidate).
const require = createRequire(new URL("../packages/core/package.json", import.meta.url));
const { parseDocument, Document, isMap } = require("yaml");

export const CMS_CONFIG_FILENAME = ".pages.yml";
export const POSTS_DIR = "content/posts";
/** The two frontmatter fields Core's content schema requires. */
export const REQUIRED_FIELDS = ["title", "pubDate"];
const KNOWN_CONFIG_KEYS = new Set(["media", "content", "components", "settings", "actions"]);
const POST_RE = /\.(md|mdx)$/;
// The closing delimiter may end the file (editors that strip a trailing
// newline) or be followed by a newline and the body.
const FRONTMATTER_RE = /^(---\r?\n)([\s\S]*?)(^---(?:\r?\n|$))/m;

function parseYaml(raw, label) {
  const doc = parseDocument(raw, { uniqueKeys: true, schema: "core", customTags: [] });
  if (doc.errors.length) {
    throw new Error(`${label}: invalid YAML: ${doc.errors[0].message.split("\n")[0]}`);
  }
  const unresolved = doc.warnings.find((warning) => /Unresolved tag/.test(warning.message));
  if (unresolved) throw new Error(`${label}: invalid YAML: ${unresolved.message.split("\n")[0]}`);
  if (!isMap(doc.contents)) throw new Error(`${label}: expected a YAML mapping`);
  const data = doc.toJS({ maxAliasCount: 100 });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${label}: expected a YAML mapping`);
  }
  return { doc, data };
}

/** The single posts collection entry; all callers must agree on this match. */
function postsCollection(config) {
  return (config.content || []).find((entry) => entry?.type === "collection" && entry.path === POSTS_DIR);
}

/** Validate a `.pages.yml` document; shared by load and generated-config checks. */
function parseCmsConfig(text, label = CMS_CONFIG_FILENAME) {
  const { data } = parseYaml(text, label);
  for (const key of Object.keys(data)) {
    if (!KNOWN_CONFIG_KEYS.has(key)) {
      throw new Error(`${label}: unknown top-level key ${JSON.stringify(key)}`);
    }
  }
  // Pages CMS defaults settings.content.merge to false, which rewrites the file
  // from the editor schema only and silently drops undeclared keys. The PoC
  // refuses to operate with that data-loss mode.
  if (data.settings?.content?.merge !== true) {
    throw new Error(`${label}: settings.content.merge must be true to preserve unknown frontmatter fields`);
  }
  if (!postsCollection(data)) throw new Error(`${label}: missing ${POSTS_DIR} collection`);
  return data;
}

export function loadCmsConfig(siteDir) {
  const file = path.join(siteDir, CMS_CONFIG_FILENAME);
  if (!fs.existsSync(file)) {
    throw new Error(`${CMS_CONFIG_FILENAME} is absent; the Site still builds, but no Git editor is configured`);
  }
  return parseCmsConfig(fs.readFileSync(file, "utf8"));
}

/** Field definitions declared for the posts collection, excluding `body`. */
export function postsFields(config) {
  const fields = postsCollection(config)?.fields || [];
  for (const field of fields) {
    // Pages CMS fields use either `type` or a reusable `component`.
    const typed = typeof field?.type === "string" && field.type
      || typeof field?.component === "string" && field.component;
    if (typeof field?.name !== "string" || !typed) {
      throw new Error(`${CMS_CONFIG_FILENAME}: every posts field needs name and a type or component`);
    }
  }
  return fields;
}

export function declaredFieldNames(config) {
  return postsFields(config).map((field) => field.name).filter((name) => name !== "body");
}

/**
 * Category and tag entries the Site actually knows, mirroring
 * `loadSiteTaxonomy` in apps/web/src/lib/taxonomy.ts: config entries first,
 * then optional `data/taxonomy.yaml` entries with the same id/slug rules.
 */
function siteTaxonomy(siteDir, config) {
  const merge = (base, extra, kind) => {
    if (!extra?.length) return base;
    const validated = normalizeSiteConfig({
      schemaVersion: 2,
      site: config.site,
      locales: [...config.locales],
      [kind]: extra,
    })[kind];
    const ids = new Set(base.map((entry) => entry.id));
    const slugs = new Set(base.map((entry) => entry.slug));
    const merged = [...base];
    for (const entry of validated) {
      if (ids.has(entry.id)) throw new Error(`duplicate ${kind} id ${JSON.stringify(entry.id)} in data/taxonomy.yaml`);
      if (slugs.has(entry.slug)) throw new Error(`duplicate ${kind} slug ${JSON.stringify(entry.slug)} in data/taxonomy.yaml`);
      ids.add(entry.id);
      slugs.add(entry.slug);
      merged.push(entry);
    }
    return merged;
  };
  const taxonomyFile = path.join(siteDir, "data/taxonomy.yaml");
  if (!fs.existsSync(taxonomyFile)) return { categories: config.categories, tags: config.tags };
  const parsed = parseSiteConfigDocument(fs.readFileSync(taxonomyFile, "utf8"), { filename: "data/taxonomy.yaml" });
  for (const key of Object.keys(parsed)) {
    if (key !== "categories" && key !== "tags") {
      throw new Error(`unknown data/taxonomy.yaml field ${JSON.stringify(key)}`);
    }
  }
  return {
    categories: merge(config.categories, parsed.categories, "categories"),
    tags: merge(config.tags, parsed.tags, "tags"),
  };
}

/**
 * Render a Site-owned `.pages.yml` from the Site's own taxonomy contract, so
 * the editor's category choices cannot drift from the Site config. Returns the
 * text plus the values it embedded.
 */
function renderCmsConfig(siteDir) {
  const configFile = path.join(siteDir, SITE_CONFIG_FILENAME);
  if (!fs.existsSync(configFile)) {
    throw new Error(`${SITE_CONFIG_FILENAME} is missing; cannot generate ${CMS_CONFIG_FILENAME}`);
  }
  const config = normalizeSiteConfig(parseSiteConfigDocument(
    fs.readFileSync(configFile, "utf8"), { filename: SITE_CONFIG_FILENAME },
  ));
  const taxonomy = siteTaxonomy(siteDir, config);
  const categories = taxonomy.categories.map((entry) => entry.slug);
  const tags = taxonomy.tags.map((entry) => entry.slug);
  // Core accepts any category when the Site declares no catalog; a select
  // with no values would make the field unusable, so fall back to free text.
  const categoryField = categories.length
    ? [
        "      - name: category",
        "        label: Category",
        "        type: select",
        "        options:",
        `          values: [${categories.join(", ")}]`,
      ].join("\n")
    : ["      - name: category", "        label: Category", "        type: string"].join("\n");
  const template = fs.readFileSync(fileURLToPath(new URL("./pages-cms.schema.yml", import.meta.url)), "utf8");
  const text = `# Pages CMS editor schema for this ALNILAM Site (generated by scripts/pages-cms.mjs init).
#
# Site-owned: ALNILAM Core never reads this file. Regenerate after changing
# categories, tags or locales in alnilam.config.yaml.

${template.replace("{{CATEGORY_FIELD}}", () => categoryField)}`;
  return { text, categories, tags };
}

/** Write the generated schema; refuses to replace an existing file unless forced. */
function initCmsConfig(siteDir, { force = false } = {}) {
  const target = path.join(siteDir, CMS_CONFIG_FILENAME);
  if (fs.existsSync(target) && !force) {
    throw new Error(`${target} already exists; pass --force to replace it`);
  }
  const generated = renderCmsConfig(siteDir);
  // Fail closed: the generated document must pass the same validator the
  // editor adapter uses before it is written.
  parseCmsConfig(generated.text, `generated ${CMS_CONFIG_FILENAME}`);
  fs.writeFileSync(target, generated.text);
  return { path: target, categories: generated.categories, tags: generated.tags };
}

/**
 * Split a post into its YAML frontmatter document and its untouched body. The
 * body is returned as the exact byte range after the closing delimiter, so a
 * roundtrip can assert byte-for-byte equality (MDX, code fences, trailing
 * newlines included).
 */
export function splitPost(raw, label = "post") {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) throw new Error(`${label}: missing YAML frontmatter delimited by ---`);
  const [, open, frontmatter, close] = match;
  const { doc, data } = parseYaml(frontmatter, `${label} frontmatter`);
  const body = raw.slice(match[0].length);
  return { open, frontmatter, close, body, doc, data };
}

/**
 * Apply a CMS-style field edit.
 *
 * merge: true  — edit the parsed document in place. Comments, key order,
 *                undeclared keys and values survive; only YAML whitespace /
 *                quoting may be normalized by the serializer.
 * merge: false — reproduce Pages CMS's default rewrite and keep only declared
 *                fields. Exposed solely so tests can demonstrate the data loss;
 *                the CLI refuses it as a write mode.
 */
export function applyEdit(raw, patch, { config, merge = true } = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error("--set must be a JSON object of frontmatter fields");
  }
  const declared = declaredFieldNames(config);
  for (const key of Object.keys(patch)) {
    if (!declared.includes(key)) {
      throw new Error(`off-schema edit rejected: ${JSON.stringify(key)} is not a declared posts field`);
    }
  }
  const { open, close, body, doc, data } = splitPost(raw);
  const before = Object.keys(data);
  let nextDoc = doc;
  if (merge === false) {
    nextDoc = new Document({});
    for (const key of declared) {
      if (key in data) nextDoc.set(key, data[key]);
    }
  }
  for (const [key, value] of Object.entries(patch)) nextDoc.set(key, value);
  const content = open + nextDoc.toString() + close + body;
  // A serializer bug must fail closed instead of silently corrupting content.
  const check = splitPost(content);
  if (check.body !== body) throw new Error("frontmatter edit changed the post body");
  for (const key of Object.keys(patch)) {
    if (!(key in check.data)) throw new Error(`frontmatter edit lost ${JSON.stringify(key)}`);
  }
  return {
    content,
    data: check.data,
    body,
    changed: Object.keys(patch),
    preserved: before.filter((key) => !declared.includes(key) && key in check.data),
    dropped: merge === false ? before.filter((key) => !declared.includes(key)) : [],
  };
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, base));
    else if (entry.isFile()) out.push(path.relative(base, abs));
  }
  return out.sort();
}

function mediaTargets(raw, postFile, siteDir) {
  const { data, body } = splitPost(raw, postFile);
  const sources = [];
  if (typeof data.cover === "string") sources.push({ field: "cover", src: data.cover });
  for (const match of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    sources.push({ field: "body", src: match[1] });
  }
  return sources.map(({ field, src }) => {
    if (/^(?:https?:|data:|\/\/)/i.test(src)) {
      return { field, src, kind: "remote", exists: true };
    }
    const clean = src.split(/[?#]/, 1)[0];
    if (clean.startsWith("/") && !clean.startsWith("/site-assets/")) {
      // Core only maps /site-assets/... and post-relative images; other
      // root-relative paths have no Site-owned backing file.
      return { field, src, kind: "root-relative-unmapped", exists: false };
    }
    const assetsRoot = path.resolve(siteDir, "assets");
    const postsRoot = path.resolve(siteDir, POSTS_DIR);
    const siteAsset = clean.startsWith("/site-assets/");
    const absolute = siteAsset
      ? path.join(assetsRoot, clean.slice("/site-assets/".length))
      : path.resolve(path.dirname(postFile), clean);
    // Each reference form has exactly one allowed root: /site-assets/... must
    // stay in assets/, post-relative images must stay in the posts tree.
    // Anything else (config, data, a sibling Site) is not a media path.
    const root = siteAsset ? assetsRoot : postsRoot;
    const inRoot = absolute === root || absolute.startsWith(root + path.sep);
    if (!inRoot) return { field, src, kind: "outside-media-roots", exists: false };
    return {
      field,
      src,
      kind: siteAsset ? "site-assets" : "post-relative",
      exists: fs.existsSync(absolute),
    };
  });
}

/** Offline compatibility report for a Site with a `.pages.yml`. */
export function verifySite(siteDir) {
  const config = loadCmsConfig(siteDir);
  const declared = declaredFieldNames(config);
  const postsDir = path.join(siteDir, POSTS_DIR);
  if (!fs.existsSync(postsDir) || !fs.statSync(postsDir).isDirectory()) {
    throw new Error(`${CMS_CONFIG_FILENAME} declares ${POSTS_DIR}, but ${postsDir} is missing or not a directory`);
  }
  const posts = walk(postsDir).filter((rel) => POST_RE.test(rel)).map((rel) => {
    const abs = path.join(postsDir, rel);
    const raw = fs.readFileSync(abs, "utf8");
    const { data, body } = splitPost(raw, rel);
    const keys = Object.keys(data);
    return {
      file: rel,
      keys,
      format: path.extname(rel),
      missingRequired: REQUIRED_FIELDS.filter((key) => !(key in data)),
      unknown: keys.filter((key) => !declared.includes(key)),
      bodyBytes: Buffer.byteLength(body),
      category: typeof data.category === "string" ? data.category : "",
      media: mediaTargets(raw, abs, siteDir),
    };
  });
  // A post using a category the editor's select cannot represent is a drift
  // between alnilam.config.yaml / data/taxonomy.yaml and .pages.yml.
  const categoryField = postsFields(config).find((field) => field.name === "category");
  const selectValues = (categoryField?.options?.values || [])
    .map((value) => (typeof value === "string" ? value : value?.name))
    .filter(Boolean);
  const usedCategories = [...new Set(posts.map((post) => post.category).filter(Boolean))];
  const selectDrift = selectValues.length ? usedCategories.filter((category) => !selectValues.includes(category)) : [];
  return {
    config: CMS_CONFIG_FILENAME,
    merge: config.settings.content.merge,
    deleteDisabled: postsCollection(config)?.operations?.delete === false,
    declared,
    selectValues,
    selectDrift,
    posts,
    ok: posts.length > 0
      && selectDrift.length === 0
      && posts.every((post) => post.missingRequired.length === 0)
      && posts.every((post) => post.media.every((media) => media.exists)),
  };
}

function option(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  return index < 0 ? fallback : argv[index + 1];
}

function main(argv) {
  const command = argv[0];
  const siteDir = option(argv, "--site", ".");
  if (command === "verify") {
    const report = verifySite(siteDir);
    console.log(argv.includes("--json") ? JSON.stringify(report, null, 2) : [
      `Pages CMS PoC: ${report.config} (merge=${report.merge}, deleteDisabled=${report.deleteDisabled})`,
      `Declared post fields: ${report.declared.join(", ")}`,
      ...report.posts.map((post) => `${post.file}: ${post.keys.length} keys, ${post.unknown.length} off-schema preserved, ${post.bodyBytes} body bytes, ${post.media.length} media refs${post.missingRequired.length ? `, MISSING ${post.missingRequired.join(",")}` : ""}`),
      report.ok ? "PASS: field mapping, required fields and media paths" : "FAIL: inspect the report",
    ].join("\n"));
    process.exitCode = report.ok ? 0 : 1;
    return;
  }
  if (command === "edit") {
    const config = loadCmsConfig(siteDir);
    const rel = option(argv, "--post", null);
    const rawPatch = option(argv, "--set", null);
    if (!rel || !rawPatch) throw new Error("edit requires --post and --set");
    if (option(argv, "--merge", "true") !== "true") {
      throw new Error("refusing merge=false: Pages CMS would silently drop undeclared frontmatter fields");
    }
    const post = path.resolve(siteDir, POSTS_DIR, rel);
    if (!post.startsWith(path.resolve(siteDir, POSTS_DIR) + path.sep)) {
      throw new Error("--post must stay inside content/posts");
    }
    const result = applyEdit(fs.readFileSync(post, "utf8"), JSON.parse(rawPatch), { config });
    const out = path.resolve(option(argv, "--out", post));
    const postsRoot = path.resolve(siteDir, POSTS_DIR) + path.sep;
    if (!out.startsWith(postsRoot)) {
      throw new Error("--out must stay inside content/posts (copy the Site to preview elsewhere)");
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, result.content);
    console.log(`Edited ${rel}: changed=${result.changed.join(",")} preserved=${result.preserved.join(",") || "none"} bodyBytes=${Buffer.byteLength(result.body)} -> ${out}`);
    return;
  }
  if (command === "init") {
    const result = initCmsConfig(siteDir, { force: argv.includes("--force") });
    console.log(`Generated ${result.path}\nCategories: ${result.categories.join(", ") || "none"}\nTags: ${result.tags.join(", ") || "none"}`);
    return;
  }
  throw new Error("usage: pages-cms.mjs verify|edit|init --site <dir> [--post <rel> --set <json>] [--force]");
}

function isEntryPoint() {
  if (!process.argv[1]) return false;
  // fileURLToPath percent-decodes; comparing the raw URL pathname silently
  // skips main() when the checkout path contains a space or non-ASCII bytes.
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`pages-cms: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
