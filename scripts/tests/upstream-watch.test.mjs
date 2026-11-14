import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { classifyVersion, enrichDependencies, fetchPackageMetadata, fetchSourceSnapshot, readDependencyInventory, reconcileWatch, summarizeAudit } from "../upstream-watch.mjs";

const registry = {
  sources: [{ id: "alpha", repository: "https://github.com/example/alpha", role: "reference", baselineRevision: "base" }],
};
const snapshot = (headSha = "head-1") => ({
  repository: "https://github.com/example/alpha",
  defaultBranch: "main",
  license: "MIT",
  archived: false,
  head: { sha: headSha, committedAt: "2026-11-14T00:00:00Z", url: "https://github.com/example/alpha/commit/" + headSha, subject: "fix: example" },
  latestRelease: { tag: "v1.1.0", publishedAt: "2026-11-13T00:00:00Z", url: "https://github.com/example/alpha/releases/tag/v1.1.0" },
  tags: [{ name: "v1.1.0", sha: headSha, url: "https://github.com/example/alpha/tree/v1.1.0" }],
  recentIssues: [{ number: 4, title: "Example issue", state: "open", updatedAt: "2026-11-14T00:00:00Z", url: "https://github.com/example/alpha/issues/4" }],
  issueCoverage: { status: "complete", issueCount: 1, pagesFetched: 1, pageLimit: 10, pageSize: 100 },
});
const scan = { lockfileVersion: "9.0", lockfileSha256: "lock-hash" };
const dependency = { importer: ".", package: "sample", kind: "dependencies", specifier: "^1.0.0", lockedSpecifier: "^1.0.0", lockedVersion: "1.0.0", workspace: false, lockDrift: null, latest: "1.1.0", candidateClass: "minor", deprecated: null, staleRelease: false };

const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const audit = { status: "clear", counts: { low: 0, moderate: 0, high: 0, critical: 0 }, entries: [] };

test("version classification separates patch, minor, major, current and unknown", () => {
  assert.equal(classifyVersion("1.2.3", "1.2.4"), "patch");
  assert.equal(classifyVersion("1.2.3", "1.3.0"), "minor");
  assert.equal(classifyVersion("1.2.3", "2.0.0"), "major");
  assert.equal(classifyVersion("1.2.3", "1.2.3"), "current");
  assert.equal(classifyVersion("1.2.3", "latest"), "unknown");
});

test("workspace manifest inventory reports direct locked versions and specifier drift", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "alnilam-upstream-inventory-"));
  try {
    fs.mkdirSync(path.join(root, "packages/core"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
      dependencies: { sample: "^1.0.0", missing: "2.0.0" },
    }));
    fs.writeFileSync(path.join(root, "packages/core/package.json"), JSON.stringify({
      name: "@alnilam/core", dependencies: { yaml: "^2.9.1" },
    }));
    fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), `lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      sample:\n        specifier: ^1.0.1\n        version: 1.0.0\n  packages/core:\n    dependencies:\n      yaml:\n        specifier: ^2.9.1\n        version: 2.9.1\n`);
    const inventory = readDependencyInventory(root);
    const sample = inventory.records.find((item) => item.package === "sample");
    const missing = inventory.records.find((item) => item.package === "missing");
    const yaml = inventory.records.find((item) => item.package === "yaml");
    assert.equal(sample.lockDrift, "specifier-mismatch");
    assert.equal(sample.lockedVersion, "1.0.0");
    assert.equal(missing.lockDrift, "missing-lock-entry");
    assert.equal(yaml.importer, "packages/core");
    assert.equal(yaml.lockDrift, null);
    assert.match(inventory.lockfileSha256, /^[a-f0-9]{64}$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("GitHub issue inventory pages past pull requests and reports when its page cap truncates coverage", async () => {
  const requests = [];
  const source = { id: "alpha", repository: "https://github.com/example/alpha" };
  const fetchFn = async (url) => {
    requests.push(url);
    if (url.endsWith("/repos/example/alpha")) return response({ html_url: source.repository, default_branch: "main", license: { spdx_id: "MIT" }, archived: false });
    if (url.endsWith("/commits/main")) return response({ sha: "head", commit: { committer: { date: "2026-11-14T00:00:00Z" }, message: "fix" }, html_url: "https://example.test/commit/head" });
    if (url.endsWith("/releases/latest")) return response({}, 404);
    if (url.endsWith("/tags?per_page=10")) return response([]);
    if (url.includes("/issues?")) {
      const page = Number(new URL(url).searchParams.get("page"));
      if (page === 1) return response(Array.from({ length: 100 }, (_, index) => ({ number: index + 1, pull_request: {} })));
      return response(Array.from({ length: 10 }, (_, index) => ({ number: 101 + index, title: `Issue ${index + 1}`, state: "open", updated_at: "2026-11-14T00:00:00Z", html_url: `https://example.test/issues/${101 + index}` })));
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const result = await fetchSourceSnapshot(source, { fetchFn });
  assert.equal(result.recentIssues.length, 10);
  assert.equal(result.recentIssues[0].number, 101);
  assert.deepEqual(result.issueCoverage, { status: "complete", issueCount: 10, pagesFetched: 2, pageLimit: 10, pageSize: 100 });
  assert.equal(requests.filter((url) => url.includes("/issues?")).length, 2);

  const capped = await fetchSourceSnapshot(source, { fetchFn: async (url) => {
    if (url.includes("/issues?")) return response(Array.from({ length: 100 }, (_, index) => ({ number: index + 1, pull_request: {} })));
    return fetchFn(url);
  } });
  assert.deepEqual(capped.issueCoverage, { status: "truncated", issueCount: 0, pagesFetched: 10, pageLimit: 10, pageSize: 100 });
});

test("npm package metadata requests publication timestamps and records latest-version time", async () => {
  let accept;
  const result = await fetchPackageMetadata(["sample"], { fetchFn: async (_url, init) => {
    accept = init.headers.accept;
    return response({ "dist-tags": { latest: "1.2.0" }, versions: { "1.2.0": {} }, time: { "1.2.0": "2026-10-01T00:00:00Z", modified: "2026-10-02T00:00:00Z" } });
  } });
  assert.equal(accept, "application/json");
  assert.deepEqual(result, [["sample", { latest: "1.2.0", publishedAt: "2026-10-01T00:00:00Z", metadataUpdatedAt: "2026-10-02T00:00:00Z", deprecated: null }]]);
});

test("dependency enrichment marks releases stale from their publication timestamps", () => {
  const records = [dependency, { ...dependency, package: "recent" }];
  const metadata = new Map([
    ["sample", { latest: "1.1.0", publishedAt: "2025-11-13T00:00:00.000Z", deprecated: null }],
    ["recent", { latest: "1.1.0", publishedAt: "2025-11-15T00:00:00.000Z", deprecated: null }],
  ]);
  const enriched = enrichDependencies(records, metadata, new Date("2026-11-14T00:00:00.000Z"));
  assert.equal(enriched[0].staleRelease, true);
  assert.equal(enriched[1].staleRelease, false);
});

test("watch state deduplicates unchanged source and dependency evidence while preserving analysis and integration", () => {
  const empty = { schemaVersion: 1, sources: {}, dependencies: {} };
  const inputs = {
    registry,
    snapshots: { alpha: snapshot() },
    dependencyScan: scan,
    dependencies: [dependency],
    audit,
  };
  const first = reconcileWatch({ ...inputs, state: empty, now: "2026-11-14T01:00:00.000Z" });
  assert.equal(first.report.sources[0].status, "first-observation");
  assert.equal(first.report.sources[0].differsFromBaseline, true);
  assert.equal(first.report.sources[0].head.sha, "head-1");
  assert.equal(first.report.sources[0].latestRelease.url.endsWith("v1.1.0"), true);
  assert.equal(first.report.dependencies.candidateCounts.minor, 1);
  assert.equal(first.state.sources.alpha.last_analyzed, null);
  assert.equal(first.state.sources.alpha.last_integrated, null);

  first.state.sources.alpha.last_analyzed = { through: "head-1", outcome: "rejected", reason: "not applicable" };
  first.state.sources.alpha.decisions.push({ candidate: "head-1", action: "REJECT", reason: "not applicable" });
  const second = reconcileWatch({ ...inputs, state: first.state, now: "2026-11-14T02:00:00.000Z" });
  assert.equal(second.report.sources[0].status, "unchanged");
  assert.equal(second.report.dependencies.status, "unchanged");
  assert.deepEqual(second.state, first.state);

  const changed = reconcileWatch({ ...inputs, snapshots: { alpha: snapshot("head-2") }, state: second.state,
    now: "2026-11-15T01:00:00.000Z" });
  assert.equal(changed.report.sources[0].status, "changed");
  assert.equal(changed.state.sources.alpha.last_seen.observation.headSha, "head-2");
  assert.deepEqual(changed.state.sources.alpha.last_analyzed, { through: "head-1", outcome: "rejected", reason: "not applicable" });
  assert.equal(changed.state.sources.alpha.last_integrated, null);
  assert.equal(changed.state.sources.alpha.decisions[0].action, "REJECT");
});

test("dependency state fingerprints include manifest and lockfile declarations", () => {
  const inputs = { registry, snapshots: { alpha: snapshot() }, dependencyScan: scan, dependencies: [dependency], audit };
  const first = reconcileWatch({ ...inputs, state: { schemaVersion: 1, sources: {}, dependencies: {} }, now: "2026-11-14T01:00:00.000Z" });
  const changed = reconcileWatch({ ...inputs, dependencies: [{ ...dependency, specifier: "~1.0.0", lockDrift: "specifier-mismatch" }], state: first.state, now: "2026-11-14T02:00:00.000Z" });
  assert.equal(changed.report.dependencies.status, "changed");
  assert.equal(changed.state.dependencies.last_seen.observation.packages[0][3], "~1.0.0");
});

test("pnpm audit summaries handle modern and legacy advisory formats without hiding errors", () => {
  const modern = summarizeAudit({ status: 1, stdout: JSON.stringify({
    vulnerabilities: { sample: { severity: "high", range: "<1.2.0", nodes: ["sample@1.0.0"], via: [{ source: 42, title: "Example advisory", severity: "high", range: "<1.2.0", url: "https://example.test/advisory" }] } },
    metadata: { vulnerabilities: { low: 0, moderate: 0, high: 1, critical: 0 } },
  }) });
  assert.equal(modern.status, "findings");
  assert.equal(modern.entries[0].package, "sample");
  assert.equal(modern.entries[0].severity, "high");
  assert.deepEqual(modern.entries[0].paths, ["sample@1.0.0"]);

  const legacy = summarizeAudit({ status: 1, stdout: JSON.stringify({
    advisories: { "42": { id: 42, github_advisory_id: "GHSA-example", module_name: "sample", title: "Legacy advisory",
      severity: "moderate", vulnerable_versions: "<1.2.0", recommendation: "Upgrade to 1.2.0", url: "https://example.test/legacy",
      findings: [{ paths: ["root>sample"] }] } },
    metadata: { vulnerabilities: { low: 0, moderate: 1, high: 0, critical: 0 } },
  }) });
  assert.equal(legacy.status, "findings");
  assert.equal(legacy.entries[0].id, "GHSA-example");
  assert.deepEqual(legacy.entries[0].paths, ["root>sample"]);
  assert.equal(legacy.entries[0].recommendation, "Upgrade to 1.2.0");

  const unavailable = summarizeAudit({ status: 1, stdout: JSON.stringify({
    error: { code: "ERR_AUDIT_ENDPOINT", message: "registry unavailable" },
  }) });
  assert.equal(unavailable.status, "unavailable");
  assert.match(unavailable.error, /registry unavailable/);
});
