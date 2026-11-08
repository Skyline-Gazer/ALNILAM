import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repo = process.cwd();
const fixture = path.join(process.env.CNB_TRUSTED_TEST_ROOT || repo, "tests/fixtures/content-model-site");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "taxonomy-pagination-"));
const builds = [];

before(() => {
  for (const base of ["/", "/ALNILAM/"]) {
    const name = base === "/" ? "root" : "nested";
    const site = path.join(root, `${name}-site`);
    const out = path.join(root, `${name}-out`);
    fs.cpSync(fixture, site, { recursive: true });
    for (const rel of fs.readdirSync(site, { recursive: true })) {
      const target = path.join(site, rel);
      fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644);
    }
    const config = path.join(site, "alnilam.config.yaml");
    fs.writeFileSync(config, fs.readFileSync(config, "utf8").replace(
      "https://content-model.example.com",
      `https://content-model.example.com${base === "/" ? "" : base.slice(0, -1)}`,
    ));
    for (const locale of ["zh-CN", "en"]) {
      for (let n = 1; n <= 6; n++) {
        const dir = path.join(site, "content/posts", locale === "en" ? "en" : "");
        fs.writeFileSync(path.join(dir, `taxonomy-page-${n}.md`),
          `---\ntitle: "Taxonomy ${locale} ${n}"\npubDate: 2026-03-${String(n).padStart(2, "0")}\ncategory: "ja-series-only"\ntags: ["taxonomy-page-test"]\nlang: "${locale}"\n---\n\nPagination fixture.\n`);
      }
    }
    const result = spawnSync(process.execPath, ["scripts/compose.mjs", "--site", site, "--out", out], {
      cwd: repo,
      env: { ...process.env, ALNILAM_CACHE_DIR: path.join(root, `${name}-cache`), ALNILAM_CORE_REV: "taxonomy-pagination-test", SOURCE_DATE_EPOCH: "1700000000" },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `compose ${name} failed:\n${result.stderr}\n${result.stdout}`);
    builds.push({ out, base });
  }
});

after(() => {
  for (const rel of fs.readdirSync(root, { recursive: true })) {
    const target = path.join(root, rel);
    try { fs.chmodSync(target, fs.statSync(target).isDirectory() ? 0o755 : 0o644); } catch {}
  }
  fs.rmSync(root, { recursive: true, force: true });
});

function linkTags(html, rel) {
  return [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => new RegExp(`\\brel="${rel}"`).test(tag));
}

for (const [kind, slug] of [["categories", "ja-series-only"], ["tags", "taxonomy-page-test"]]) {
  test(`${kind} paginate default and localized members with canonical navigation`, () => {
    for (const { out, base } of builds) {
      for (const locale of ["", "en/"]) {
        const route = `${locale}${kind}/${slug}/`;
        const total = locale ? 6 : kind === "categories" ? 13 : 12;
        const pages = Math.ceil(total / 5);
        const members = [];
        const url = (page) => `${base}${route}${page === 1 ? "" : `${page}/`}`;
        assert.equal(fs.existsSync(path.join(out, route, "1/index.html")), false, `${base}${route}1/ must not exist`);
        assert.equal(fs.existsSync(path.join(out, route, `${pages + 1}/index.html`)), false);
        for (let page = 1; page <= pages; page++) {
          const html = fs.readFileSync(path.join(out, route, page === 1 ? "index.html" : `${page}/index.html`), "utf8");
          const canonical = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag).filter((tag) => /\brel="canonical"/.test(tag));
          assert.equal(canonical.length, 1);
          assert.ok(canonical[0].includes(`href="https://content-model.example.com${url(page)}"`), canonical[0]);
          for (const [rel, target] of [["prev", page > 1 ? page - 1 : null], ["next", page < pages ? page + 1 : null]]) {
            const links = linkTags(html, rel);
            if (target === null) {
              assert.equal(links.length, 0, `${url(page)} ${rel}`);
            } else {
              assert.ok(links.length > 0, `${url(page)} ${rel}`);
              for (const link of links) assert.ok(link.includes(`href="${url(target)}"`), link);
            }
          }
          const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const postPattern = new RegExp(`href="${escapedBase}((?:en/|ja/)?posts/[^"?#]+/)"`, "g");
          const pageMembers = [...new Set([...html.matchAll(postPattern)].map((match) => match[1]))];
          assert.equal(pageMembers.length, Math.min(5, total - (page - 1) * 5), url(page));
          members.push(...pageMembers);
        }
        const expected = [];
        for (let n = 1; n <= 6; n++) {
          if (!locale) expected.push(`posts/taxonomy-page-${n}/`);
          expected.push(`en/posts/taxonomy-page-${n}/`);
        }
        if (!locale && kind === "categories") expected.push("ja/posts/series-overview-ja/");
        assert.deepEqual(members.sort(), expected.sort(), `${base}${route} members`);
      }
      assert.equal(fs.existsSync(path.join(out, "fr", kind, slug)), false, `empty French ${kind} must not have a detail route`);
    }
  });
}
