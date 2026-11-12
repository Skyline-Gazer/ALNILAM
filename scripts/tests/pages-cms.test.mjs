import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { validateSiteRoot } from "../site-contract.mjs";

const root = process.cwd();
const testRoot = process.env.CNB_TRUSTED_TEST_ROOT || root;
const fixture = path.join(testRoot, "tests/fixtures/pages-cms-site");
const demoSite = path.join(testRoot, "sites/demo");
const tool = path.join(root, "scripts/pages-cms.mjs");
// The CNB trusted harness copies target-owned scripts/tests into an isolated
// test root but leaves candidate product scripts in the candidate checkout.
// Resolve the adapter from cwd (the candidate under test), not from this file.
const adapter = await import(pathToFileURL(tool).href);
const { applyEdit, declaredFieldNames, loadCmsConfig, postsFields, splitPost, CMS_CONFIG_FILENAME, POSTS_DIR, REQUIRED_FIELDS } = adapter;

const EDITED_MD_TITLE = "编辑后的往返标题";
const EDITED_MDX_TITLE = "编辑后的 MDX 标题";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-pages-cms-"));
const siteWithCms = path.join(tmp, "with-cms");
const siteNoCms = path.join(tmp, "without-cms");
const builds = [];
const edits = {};

function copySite(destination) {
  fs.cpSync(fixture, destination, { recursive: true });
  for (const rel of fs.readdirSync(destination, { recursive: true })) {
    const target = path.join(destination, rel);
    fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644);
  }
}

function postFile(site, relative) {
  return path.join(site, POSTS_DIR, relative);
}

function recordEdit(site, relative, patch) {
  const file = postFile(site, relative);
  const raw = fs.readFileSync(file, "utf8");
  const result = applyEdit(raw, patch, { config: loadCmsConfig(site) });
  fs.writeFileSync(file, result.content);
  edits[relative] = { raw, result };
  return result;
}

function run(name, args, extra = {}) {
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000", ...extra },
  });
}

before(() => {
  copySite(siteWithCms);
  const config = loadCmsConfig(siteWithCms);
  recordEdit(siteWithCms, "cms-basics.md", { title: EDITED_MD_TITLE, tags: ["CMS", "edited"] });
  recordEdit(siteWithCms, "cms-mdx.mdx", { title: EDITED_MDX_TITLE });
  assert.equal(config.settings.content.merge, true);
  fs.cpSync(siteWithCms, siteNoCms, { recursive: true });
  fs.rmSync(path.join(siteNoCms, CMS_CONFIG_FILENAME));

  const cache = path.join(tmp, "cache");
  const cases = [
    { name: "root", site: siteWithCms, base: "/", url: "https://pages-cms.example.com/" },
    { name: "nested", site: siteWithCms, base: "/ALNILAM/", url: "https://pages-cms.example.com/ALNILAM/" },
    { name: "no-cms", site: siteNoCms, base: "/", url: "https://pages-cms.example.com/" },
  ];
  for (const item of cases) {
    const out = path.join(tmp, `${item.name}-out`);
    const env = {
      ALNILAM_CACHE_DIR: cache,
      ALNILAM_CORE_REV: "pages-cms-poc-test",
      ALNILAM_SITE_URL: item.url,
    };
    const compose = run("compose", [path.join(root, "scripts/compose.mjs"), "--site", item.site, "--out", out], env);
    assert.equal(compose.status, 0, `compose ${item.name} failed:\n${compose.stderr}\n${compose.stdout}`);
    const artifact = run("artifact-check", [path.join(root, "scripts/artifact-check.mjs"), out], env);
    const seo = run("seo-check", [path.join(root, "scripts/seo-check.mjs"), out], env);
    builds.push({ ...item, out, siteDigest: validateSiteRoot(item.site).digest, artifact, seo });
  }
});

after(() => {
  for (const rel of fs.readdirSync(tmp, { recursive: true })) {
    const target = path.join(tmp, rel);
    try { fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644); } catch {}
  }
  fs.rmSync(tmp, { recursive: true, force: true });
});

test(".pages.yml maps the frontmatter contract of existing articles", () => {
  const config = loadCmsConfig(fixture);
  const declared = declaredFieldNames(config);
  for (const key of REQUIRED_FIELDS) assert.ok(declared.includes(key), `required field ${key} is not editor-visible`);
  const posts = config.content.find((entry) => entry.type === "collection" && entry.path === POSTS_DIR);
  assert.equal(posts.format, "yaml-frontmatter");
  assert.equal(posts.operations.delete, false, "accidental deletes must be rejected in the editor");
  assert.equal(posts.fields.find((field) => field.name === "body")?.type, "code", "MDX needs a source, not a WYSIWYG editor");
  assert.equal(config.media.input, "assets");
  assert.equal(config.media.output, "/site-assets");
  assert.equal(config.settings.content.merge, true);

  const used = new Set();
  const dir = path.join(demoSite, POSTS_DIR);
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(md|mdx)$/.test(entry.name)) {
        for (const key of Object.keys(splitPost(fs.readFileSync(abs, "utf8"), abs).data)) used.add(key);
      }
    }
  };
  walk(dir);
  assert.ok(used.size > 0, "demo Site posts were not read");
  for (const key of used) {
    assert.ok(declared.includes(key), `existing article field ${key} is missing from .pages.yml`);
  }
});

test("the offline adapter CLI verifies mapping, preserved keys and media paths", () => {
  const verify = run("verify", [tool, "verify", "--site", fixture, "--json"]);
  assert.equal(verify.status, 0, verify.stderr);
  const report = JSON.parse(verify.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.merge, true);
  assert.equal(report.deleteDisabled, true);
  assert.equal(report.posts.length, 2);
  assert.deepEqual(report.posts.find((post) => post.file === "cms-basics.md").unknown,
    ["author", "editorialNote", "cmsMeta"]);
  assert.deepEqual(report.posts.find((post) => post.file === "cms-mdx.mdx").unknown, ["mdxOnly"]);
  for (const post of report.posts) {
    assert.deepEqual(post.missingRequired, []);
    for (const media of post.media) assert.equal(media.exists, true, `${post.file}: ${media.src} is unresolved`);
  }

  const cliSite = path.join(tmp, "cli-site");
  copySite(cliSite);
  const out = path.join(cliSite, POSTS_DIR, "cms-cli.md");
  const edit = run("edit", [tool, "edit", "--site", cliSite, "--post", "cms-basics.md",
    "--set", JSON.stringify({ title: "CLI edit" }), "--out", out]);
  assert.equal(edit.status, 0, edit.stderr);
  const original = fs.readFileSync(path.join(cliSite, POSTS_DIR, "cms-basics.md"), "utf8");
  assert.equal(splitPost(fs.readFileSync(out, "utf8")).body, splitPost(original).body);
  assert.equal(splitPost(fs.readFileSync(out, "utf8")).data.title, "CLI edit");

  const escaped = run("edit", [tool, "edit", "--site", cliSite, "--post", "cms-basics.md",
    "--set", JSON.stringify({ title: "X" }), "--out", path.join(tmp, "outside.md")]);
  assert.notEqual(escaped.status, 0, "--out must not write outside content/posts");
  assert.match(escaped.stderr, /--out must stay inside content\/posts/);

  const lossy = run("edit", [tool, "edit", "--site", cliSite, "--post", "cms-basics.md",
    "--set", JSON.stringify({ title: "X" }), "--merge", "false", "--out", out]);
  assert.notEqual(lossy.status, 0, "the CLI must refuse Pages CMS's lossy merge=false write mode");

  // The documented invocation uses a repo-relative --site; media roots must
  // still resolve absolutely.
  const relative = run("verify", [tool, "verify", "--site", path.relative(root, fixture)]);
  assert.equal(relative.status, 0, relative.stderr);
});

test("the CLI entry guard survives spaces and non-ASCII checkout paths", () => {
  const spaced = path.join(tmp, "pages cms 空格");
  fs.mkdirSync(path.join(spaced, "scripts"), { recursive: true });
  fs.copyFileSync(tool, path.join(spaced, "scripts/pages-cms.mjs"));
  fs.symlinkSync(path.join(root, "packages"), path.join(spaced, "packages"), "dir");
  const result = spawnSync(process.execPath,
    [path.join(spaced, "scripts/pages-cms.mjs"), "verify", "--site", fixture],
    { cwd: tmp, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: field mapping/);
});

test("verify names a missing content/posts directory instead of leaking ENOENT", () => {
  const broken = path.join(tmp, "missing-posts");
  copySite(broken);
  fs.rmSync(path.join(broken, POSTS_DIR), { recursive: true });
  const result = run("verify", [tool, "verify", "--site", broken]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /declares content\/posts, but .*content\/posts is missing/);
});

test("a CMS save preserves unknown frontmatter keys, comments and Markdown/MDX bytes", () => {
  const config = loadCmsConfig(fixture);
  for (const [relative, patch] of [
    ["cms-basics.md", { title: "Roundtrip", tags: ["CMS"] }],
    ["cms-mdx.mdx", { title: "Roundtrip MDX" }],
  ]) {
    const raw = fs.readFileSync(path.join(fixture, POSTS_DIR, relative), "utf8");
    const before = splitPost(raw, relative);
    const result = applyEdit(raw, patch, { config });
    const after = splitPost(result.content, relative);
    assert.equal(result.body, before.body, `${relative}: body changed`);
    assert.equal(Buffer.compare(Buffer.from(result.body), Buffer.from(before.body)), 0, `${relative}: body bytes changed`);
    for (const [key, value] of Object.entries(patch)) assert.deepEqual(after.data[key], value, `${relative}: ${key} not applied`);
    for (const key of Object.keys(before.data)) {
      assert.ok(key in after.data, `${relative}: lost frontmatter key ${key}`);
      if (!(key in patch)) {
        assert.deepEqual(after.data[key], before.data[key], `${relative}: changed frontmatter key ${key}`);
      }
    }
    for (const key of REQUIRED_FIELDS) assert.ok(key in after.data, `${relative}: lost required field ${key}`);
  }
  assert.ok(edits["cms-mdx.mdx"].result.body.includes("{1 + 1}"), "MDX expression was rewritten");

  assert.throws(() => applyEdit(edits["cms-basics.md"].raw, { author: "ghost" }, { config }),
    /off-schema edit rejected/, "the adapter must not invent CMS fields");

  // Negative evidence for the Pages CMS default: merge=false rewrites from the
  // editor schema only and drops the Site's own metadata.
  const lossy = applyEdit(edits["cms-basics.md"].raw, { title: "Lossy" }, { config, merge: false });
  assert.deepEqual(lossy.dropped, ["author", "editorialNote", "cmsMeta"]);
  assert.deepEqual(lossy.preserved, []);
  assert.equal("cmsMeta" in splitPost(lossy.content).data, false);
  assert.equal(lossy.body, edits["cms-basics.md"].result.body, "even a lossy rewrite must not touch the body");

  const badSite = path.join(tmp, "bad-merge-site");
  copySite(badSite);
  const badConfig = path.join(badSite, CMS_CONFIG_FILENAME);
  fs.writeFileSync(badConfig, fs.readFileSync(badConfig, "utf8").replace("merge: true", "merge: false"));
  assert.throws(() => loadCmsConfig(badSite), /settings.content.merge must be true/);
});

test("composed builds at root and /ALNILAM/ render the edited content and media", () => {
  for (const build of builds) {
    assert.equal(build.artifact.status, 0, `${build.name} artifact-check:\n${build.artifact.stderr}`);
    assert.equal(build.seo.status, 0, `${build.name} seo-check:\n${build.seo.stderr}`);
    const provenance = JSON.parse(fs.readFileSync(path.join(build.out, "alnilam-provenance.json"), "utf8"));
    assert.equal(provenance.site.digest, build.siteDigest, `${build.name}: provenance digest`);
    const emitted = fs.readdirSync(build.out, { recursive: true });
    assert.ok(!emitted.includes(CMS_CONFIG_FILENAME), `${build.name}: editor config leaked into the output`);

    const prefix = build.base === "/" ? "" : "/ALNILAM";
    const md = fs.readFileSync(path.join(build.out, "posts/cms-basics/index.html"), "utf8");
    assert.ok(md.includes(EDITED_MD_TITLE), `${build.name}: edited title is missing`);
    assert.ok(md.includes("body text, not frontmatter"), `${build.name}: Markdown body is missing`);
    assert.ok(md.includes(`src="${prefix}/site-assets/cms-mark.svg"`), `${build.name}: Site media path is wrong`);
    assert.ok(md.includes(`${prefix}/_astro/cms-local.`), `${build.name}: post-relative image path is wrong`);
    assert.ok(fs.existsSync(path.join(build.out, "site-assets/cms-mark.svg")), `${build.name}: asset not emitted`);
    if (build.base !== "/") {
      assert.ok(!md.includes('src="/site-assets/'), `${build.name}: unprefixed absolute media path`);
      assert.ok(md.includes('href="https://pages-cms.example.com/ALNILAM/posts/cms-basics/"'),
        `${build.name}: canonical is not base-prefixed`);
    }

    const mdx = fs.readFileSync(path.join(build.out, "posts/cms-mdx/index.html"), "utf8");
    assert.ok(mdx.includes(EDITED_MDX_TITLE), `${build.name}: edited MDX title is missing`);
    assert.ok(mdx.includes('data-pages-cms-mdx="roundtrip"'), `${build.name}: MDX JSX was corrupted`);
    assert.ok(mdx.includes("计算结果：2"), `${build.name}: MDX expression was not evaluated`);
  }
});

test("removing or changing .pages.yml leaves the Site digest, build and provenance intact", () => {
  const withCms = validateSiteRoot(siteWithCms).digest;
  assert.equal(validateSiteRoot(siteNoCms).digest, withCms, "removing the editor config changed the Site digest");
  const changed = path.join(tmp, "changed-cms-config");
  fs.cpSync(siteWithCms, changed, { recursive: true });
  const changedConfig = path.join(changed, CMS_CONFIG_FILENAME);
  fs.writeFileSync(changedConfig, fs.readFileSync(changedConfig, "utf8") + "\n# editor tweak\n");
  assert.equal(validateSiteRoot(changed).digest, withCms, "editing the editor config changed the Site digest");

  const rootBuild = builds.find((build) => build.name === "root");
  const noCmsBuild = builds.find((build) => build.name === "no-cms");
  assert.equal(noCmsBuild.siteDigest, rootBuild.siteDigest);
  assert.equal(fs.existsSync(path.join(siteNoCms, CMS_CONFIG_FILENAME)), false);
  const html = fs.readFileSync(path.join(noCmsBuild.out, "posts/cms-basics/index.html"), "utf8");
  assert.ok(html.includes(EDITED_MD_TITLE), "content no longer builds after CMS removal");
  assert.ok(html.includes('src="/site-assets/cms-mark.svg"'), "media no longer resolves after CMS removal");
  assert.equal(validateSiteRoot(siteWithCms).digest, withCms, "compose mutated the Site");
});

test("init generates a schema from the Site taxonomy and refuses to overwrite", () => {
  const site = path.join(tmp, "init-site");
  fs.cpSync(demoSite, site, { recursive: true });
  for (const rel of fs.readdirSync(site, { recursive: true })) {
    const target = path.join(site, rel);
    fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644);
  }
  const digest = validateSiteRoot(site).digest;
  assert.equal(fs.existsSync(path.join(site, CMS_CONFIG_FILENAME)), false);

  const init = run("init", [tool, "init", "--site", site]);
  assert.equal(init.status, 0, init.stderr);
  const config = loadCmsConfig(site);
  const category = postsFields(config).find((field) => field.name === "category");
  assert.deepEqual(category.options.values, ["guide", "release"]);
  assert.equal(config.settings.content.merge, true);
  assert.equal(config.content.find((entry) => entry.path === POSTS_DIR).operations.delete, false);
  assert.equal(validateSiteRoot(site).digest, digest, "generating .pages.yml changed the Site digest");

  const again = run("init", [tool, "init", "--site", site]);
  assert.notEqual(again.status, 0);
  assert.match(again.stderr, /already exists/);
  const forced = run("init", [tool, "init", "--site", site, "--force"]);
  assert.equal(forced.status, 0, forced.stderr);
  const verify = run("verify", [tool, "verify", "--site", site, "--json"]);
  assert.equal(verify.status, 0, verify.stderr);
  assert.equal(JSON.parse(verify.stdout).ok, true);
});

test("verify reports a stale category select and init --force repairs it", () => {
  const site = path.join(tmp, "drift-site");
  copySite(site);
  const configFile = path.join(site, "alnilam.config.yaml");
  fs.writeFileSync(configFile, fs.readFileSync(configFile, "utf8").replace(
    "\ntags:\n",
    "\n  - id: notes\n    slug: notes\n    label:\n      zh-CN: 随笔\n      en: Notes\n      ja: ノート\ntags:\n",
  ));
  fs.writeFileSync(path.join(site, POSTS_DIR, "cms-drift.md"),
    `---\ntitle: "Drift post"\npubDate: 2026-11-09\ncategory: "notes"\ntags: []\nlang: "zh-CN"\n---\n\nDrift fixture.\n`);

  const drifted = run("verify", [tool, "verify", "--site", site, "--json"]);
  assert.notEqual(drifted.status, 0, "a stale select must fail verification");
  const report = JSON.parse(drifted.stdout);
  assert.deepEqual(report.selectDrift, ["notes"]);
  assert.equal(report.ok, false);

  const init = run("init", [tool, "init", "--site", site, "--force"]);
  assert.equal(init.status, 0, init.stderr);
  const repaired = run("verify", [tool, "verify", "--site", site, "--json"]);
  assert.equal(repaired.status, 0, repaired.stderr);
  const after = JSON.parse(repaired.stdout);
  assert.deepEqual(after.selectDrift, []);
  assert.ok(after.selectValues.includes("notes"));
});

test("init falls back to a free-text category when the Site declares no catalog", () => {
  const site = path.join(tmp, "no-category-site");
  copySite(site);
  fs.writeFileSync(path.join(site, "alnilam.config.yaml"), `schemaVersion: 2
site:
  title: No Category Site
  description: Fixture without a category catalog.
  url: https://no-category.example.com
  locale: zh-CN
locales: [zh-CN]
theme:
  appearance: dark
`);
  const init = run("init", [tool, "init", "--site", site, "--force"]);
  assert.equal(init.status, 0, init.stderr);
  const field = postsFields(loadCmsConfig(site)).find((entry) => entry.name === "category");
  assert.equal(field.type, "string", "a select without values would be unusable");
  const verify = run("verify", [tool, "verify", "--site", site, "--json"]);
  assert.equal(verify.status, 0, verify.stderr);
  assert.deepEqual(JSON.parse(verify.stdout).selectDrift, []);
});

test("verify rejects media references that leave the Site media roots", () => {
  const site = path.join(tmp, "media-escape-site");
  copySite(site);
  fs.writeFileSync(path.join(site, POSTS_DIR, "cms-escape.md"),
    `---\ntitle: "Escape"\npubDate: 2026-11-08\ncover: "./../../alnilam.config.yaml"\ntags: []\nlang: "zh-CN"\n---\n\n![x](../data/taxonomy.yaml)\n`);
  const verify = run("verify", [tool, "verify", "--site", site, "--json"]);
  assert.notEqual(verify.status, 0, "an out-of-root media reference must fail verification");
  const report = JSON.parse(verify.stdout);
  const post = report.posts.find((entry) => entry.file === "cms-escape.md");
  assert.deepEqual(post.media.map((entry) => entry.kind),
    ["outside-media-roots", "outside-media-roots"]);
  assert.ok(post.media.every((entry) => entry.exists === false));
  assert.equal(report.ok, false);
});

test("a body starting with --- or a block scalar keeps its exact bytes", () => {
  const raw = `---\ntitle: "Split"\nnote: |\n  a\n  ---\n  b\n---\n\n---\nbody\n`;
  const split = splitPost(raw);
  assert.equal(split.frontmatter, `title: "Split"\nnote: |\n  a\n  ---\n  b\n`);
  assert.equal(split.body, "\n---\nbody\n");
  assert.equal(split.data.note, "a\n---\nb\n");
  const result = applyEdit(raw, { title: "Edited" }, { config: loadCmsConfig(fixture) });
  assert.equal(result.body, "\n---\nbody\n");
  assert.equal(splitPost(result.content).data.note, "a\n---\nb\n");
});
