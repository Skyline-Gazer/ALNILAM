// Issue #72: disabled optional modules must emit no route, nav, discovery,
// cover asset, or third-party provider residual in the composed Site.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateSiteRoot } from "../site-contract.mjs";

const repo = process.cwd();
const fixture = path.join(process.env.CNB_TRUSTED_TEST_ROOT || repo, "tests/fixtures/content-model-site");
const scratch = process.env.HOME && fs.existsSync(process.env.HOME) ? process.env.HOME : os.tmpdir();
const root = fs.mkdtempSync(path.join(scratch, "alnilam-72-close-"));
const builds = {};

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aZkAAAAASUVORK5CYII=",
  "base64",
);
const coverName = `${crypto.createHash("md5").update("close-state-cover").digest("hex")}.png`;

function files(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(dir, path.join(entry.parentPath ?? entry.path, entry.name))
        .split(path.sep)
        .join("/"),
    )
    .sort();
}

function read(out, rel) {
  return fs.readFileSync(path.join(out, rel), "utf8");
}

function scopeKey(userId, subjectType, limit) {
  return crypto
    .createHash("sha256")
    .update(`${userId}\n${subjectType}\n${limit}`)
    .digest("hex")
    .slice(0, 32);
}

function seedBangumiSnapshot(cacheRoot, { userId, subjectType, limit }) {
  const bangumiRoot = path.join(cacheRoot, "bangumi");
  const covers = path.join(bangumiRoot, "covers");
  const snapshots = path.join(bangumiRoot, "snapshots");
  fs.mkdirSync(covers, { recursive: true });
  fs.mkdirSync(snapshots, { recursive: true });
  fs.writeFileSync(path.join(covers, coverName), png);
  const key = scopeKey(userId, subjectType, limit);
  const payload = {
    schemaVersion: 1,
    provider: "bangumi",
    scopeKey: key,
    collections: [
      {
        name: "Close-state fixture",
        nameCn: "关闭态夹具",
        cover: `/bangumi-covers/${coverName}`,
        href: "https://bgm.tv/subject/1",
        summary: "Static snapshot used when the provider is unreachable.",
        comment: "",
        updatedAt: "2026-01-02T00:00:00+08:00",
        category: subjectType,
        status: "collected",
      },
    ],
  };
  fs.writeFileSync(path.join(snapshots, `${key}.json`), `${JSON.stringify(payload, null, 2)}\n`);
}

function compose(name, options, { seedBangumi = false } = {}) {
  const site = path.join(root, `site-${name}`);
  const out = path.join(root, `out-${name}`);
  const cache = path.join(root, `cache-${name}`);
  fs.cpSync(fixture, site, { recursive: true });
  fs.chmodSync(site, 0o755);
  for (const rel of fs.readdirSync(site, { recursive: true })) {
    const target = path.join(site, rel);
    fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644);
  }
  const configPath = path.join(site, "alnilam.config.yaml");
  fs.writeFileSync(configPath, `${fs.readFileSync(configPath, "utf8").trimEnd()}\n${options}`);
  if (seedBangumi) {
    seedBangumiSnapshot(cache, { userId: "close-state", subjectType: "anime", limit: 1 });
  }
  const digest = validateSiteRoot(site).digest;
  const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], {
    cwd: repo,
    env: {
      ...process.env,
      ALNILAM_CACHE_DIR: cache,
      ALNILAM_CORE_REV: "72-close-state",
      SOURCE_DATE_EPOCH: "1700000000",
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `compose ${name} failed:\n${result.stderr}\n${result.stdout}`);
  assert.equal(validateSiteRoot(site).digest, digest, "composition must not change Site source");
  return { out, emitted: files(out) };
}

before(() => {
  builds.off = compose(
    "off",
    "\ngallery:\n  enabled: false\nllms:\n  enabled: false\nbangumi:\n  enabled: false\ncomments:\n  enabled: false\n",
  );
  builds.defaults = compose("defaults", "\n");
  builds.bangumiOn = compose(
    "bangumi-on",
    "\nbangumi:\n  enabled: true\n  userId: \"close-state\"\n  subjectType: anime\n  limit: 1\n",
    { seedBangumi: true },
  );
  builds.llmsOn = compose("llms-on", "\nllms:\n  enabled: true\n  full: true\n");
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

test("disabled Gallery emits no routes, navigation, module assets, or image-host URLs", () => {
  for (const { out, emitted } of [builds.off, builds.defaults]) {
    assert.deepEqual(emitted.filter((file) => /(^|\/)albums\//.test(file)), [], out);
    for (const file of emitted.filter((entry) => /\.(?:html|js|css)$/.test(entry))) {
      const text = read(out, file);
      assert.doesNotMatch(text, /href=["'][^"']*\/albums\//i, file);
      assert.doesNotMatch(text, /album-gallery__item|images\.unsplash\.com/i, file);
    }
  }
});

test("disabled Bangumi emits no route, covers, nav link, or bgm host residual", () => {
  for (const { out, emitted } of [builds.off, builds.defaults]) {
    assert.deepEqual(
      emitted.filter((file) => /(^|\/)bangumi(\/|-covers\/)/.test(file)),
      [],
      out,
    );
    for (const html of emitted.filter((file) => file.endsWith(".html"))) {
      const text = read(out, html);
      assert.doesNotMatch(text, /href=["'][^"']*bangumi/i, html);
      assert.doesNotMatch(text, /api\.bgm\.tv|lain\.bgm\.tv/i, html);
    }
  }
});

test("enabled Bangumi emits the static route and local covers without provider image hosts", () => {
  const { out, emitted } = builds.bangumiOn;
  assert.ok(emitted.includes("bangumi/index.html"));
  assert.ok(emitted.some((file) => file.startsWith("bangumi-covers/")));
  const page = read(out, "bangumi/index.html");
  assert.match(page, /href="\/bangumi\/?"/);
  assert.match(page, new RegExp(`/bangumi-covers/${coverName}`));
  assert.doesNotMatch(page, /api\.bgm\.tv|lain\.bgm\.tv/);
  assert.match(read(out, "index.html"), /href="\/bangumi\/?"/);
});

test("disabled LLMs emit no index, full text, markdown views, or discovery links", () => {
  for (const { out, emitted } of [builds.off, builds.defaults]) {
    assert.deepEqual(
      emitted.filter((file) => /(^|\/)llms(?:-full)?\.txt$|(^|\/)index\.md$/.test(file)),
      [],
    );
    for (const html of emitted.filter((file) => file.endsWith(".html"))) {
      assert.doesNotMatch(
        read(out, html),
        /<link\b[^>]*(?:text\/markdown|rel=["']describedby["'])/i,
        html,
      );
    }
  }
});

test("enabled LLMs emit indexes and article discovery links", () => {
  const { out, emitted } = builds.llmsOn;
  assert.ok(emitted.includes("llms.txt"));
  assert.ok(emitted.includes("llms-full.txt"));
  assert.ok(emitted.some((file) => file.endsWith("/index.md") || file === "posts/hello-content-model/index.md"));
  const article = emitted.find((file) => file.endsWith("posts/hello-content-model/index.html"));
  assert.ok(article, "expected a published article page");
  const html = read(out, article);
  assert.match(html, /rel="alternate"[^>]*type="text\/markdown"/);
  assert.match(html, /rel="describedby"[^>]*type="text\/plain"/);
});

test("disabled Sites omit upstream Twikoo/Waline/Giscus provider chunks and comment islands", () => {
  for (const { out, emitted } of [builds.off, builds.defaults]) {
    assert.deepEqual(
      emitted.filter((file) =>
        /(^|\/)(_astro\/)?(Twikoo|Waline|waline-emoji|Giscus)\b/i.test(path.basename(file)),
      ),
      [],
      out,
    );
    for (const html of emitted.filter((file) => /posts\/.*index\.html$/.test(file))) {
      const text = read(out, html);
      assert.doesNotMatch(text, /component-url="[^\"]*Comments\./i, html);
      assert.doesNotMatch(text, /id="comments"/i, html);
      assert.doesNotMatch(text, /giscus\.app/i, html);
      assert.doesNotMatch(text, /Twikoo|Waline|waline-emoji/i, html);
    }
  }
});
