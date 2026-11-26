// Issue #204: the category bar and the article tag widget are contextual opt-in decided by the
// layout `page` capability. A composed Demo build is the authority for which route kinds ship
// each control, so the visibility matrix is asserted on emitted HTML rather than on source text.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
const scratch = process.env.HOME && fs.existsSync(process.env.HOME) ? process.env.HOME : os.tmpdir();
const root = fs.mkdtempSync(path.join(scratch, "alnilam-204-context-"));
const out = path.join(root, "out");
const cache = path.join(root, "cache");
const locales = ["en", "ja"];
const CATEGORY_BAR_MARKER = 'id="category-bar-region"';
const TAG_WIDGET_SCOPE = 'data-sidebar-pages="home,post,archive,categories,tags"';
const kinds = new Map();

function pageKind(relative) {
  const parts = relative.split("/");
  if (parts.at(-1) !== "index.html") return "other";
  parts.pop();
  if (parts.length && locales.includes(parts[0])) parts.shift();
  if (parts.length === 0) return "home";
  const [first] = parts;
  if (first === "posts") {
    // `/posts/` forwards to Home. Subsequent pages and old article aliases
    // use the archive capability. The remaining slug routes are articles.
    if (parts.length === 1) return "redirect";
    const second = parts[1];
    if (/^\d+$/.test(second) || locales.includes(second)) return "archive";
    return "post";
  }
  if (first === "archives") return "archive";
  if (first === "categories" || first === "tags") return first;
  if (first === "series") return "series";
  if (first === "albums" || first === "moments" || first === "bangumi") return "module";
  if (first === "search") return "search";
  return "other";
}

before(() => {
  const result = spawnSync(
    process.execPath,
    ["scripts/compose.mjs", "--site", path.join(repo, "sites/demo"), "--out", out],
    { cwd: repo, encoding: "utf8", env: { ...process.env, ALNILAM_CACHE_DIR: cache } },
  );
  assert.equal(result.status, 0, `compose failed:\n${result.stderr}\n${result.stdout}`);
  for (const entry of fs.readdirSync(out, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
    const relative = path
      .relative(out, path.join(entry.parentPath ?? entry.path, entry.name))
      .split(path.sep)
      .join("/");
    kinds.set(relative, pageKind(relative));
  }
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

test("every emitted route kind is exercised by the Demo build", () => {
  const seen = new Set(kinds.values());
  // Gallery (`/albums/`) and Moments (`/moments/`) were retired in #203, and Bangumi is disabled by default in Demo.
  for (const expected of ["home", "post", "archive", "redirect", "categories", "tags", "series", "search", "other"]) {
    assert.ok(seen.has(expected), `Demo build must emit a ${expected} route; saw ${[...seen].join(", ")}`);
  }
});

test("category bar renders only in the opted-in home and article contexts", () => {
  const withBar = [];
  const unexpected = [];
  for (const [relative, kind] of [...kinds].sort()) {
    const rendered = fs.readFileSync(path.join(out, relative), "utf8").includes(CATEGORY_BAR_MARKER);
    if (rendered) withBar.push(relative);
    if (rendered !== (kind === "home" || kind === "post")) unexpected.push(`${relative} (${kind}, rendered=${rendered})`);
  }
  assert.deepEqual(unexpected, [], `category bar visibility must follow the page capability:\n${unexpected.join("\n")}`);
  assert.ok(withBar.some((file) => kinds.get(file) === "home"), "home must render the category bar");
  assert.ok(withBar.some((file) => kinds.get(file) === "post"), "articles must render the category bar");
});

test("article tag widget is scoped to blog contexts and keeps Profile everywhere", () => {
  const blogContexts = new Set(["home", "post", "archive", "categories", "tags"]);
  for (const [relative, kind] of [...kinds].sort()) {
    const text = fs.readFileSync(path.join(out, relative), "utf8");
    const scoped = text.includes(TAG_WIDGET_SCOPE);
    assert.equal(
      scoped,
      blogContexts.has(kind),
      `${relative} (${kind}) tag widget scope ${scoped ? "present" : "absent"} is wrong`,
    );
    assert.ok(text.includes("m3-profile"), `${relative} must keep the site-identity Profile widget`);
  }
});

test("retired-for-navigation contexts emit no taxonomy controls", () => {
  for (const [relative, kind] of [...kinds].sort()) {
    if (kind === "home" || kind === "post" || kind === "archive" || kind === "categories" || kind === "tags") continue;
    const text = fs.readFileSync(path.join(out, relative), "utf8");
    assert.ok(!text.includes(CATEGORY_BAR_MARKER), `${relative} (${kind}) must not render the category bar`);
    assert.ok(!text.includes(TAG_WIDGET_SCOPE), `${relative} (${kind}) must not render the article tag widget`);
  }
});
