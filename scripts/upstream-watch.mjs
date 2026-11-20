#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../packages/core/package.json", import.meta.url));
const { parse } = require("yaml");
const DEFAULT_REGISTRY = path.join(repoRoot, "docs/upstream-watch/sources.json");
const DEFAULT_STATE = path.join(repoRoot, "docs/upstream-watch/state.json");
const MAX_CONCURRENT_REQUESTS = 6;
const STALE_RELEASE_DAYS = 365;
const ISSUE_PAGE_SIZE = 100;
const MAX_ISSUE_PAGES = 10;
const MAX_RECENT_ISSUES = 10;

export function readDependencyInventory(root = repoRoot) {
  const lockPath = path.join(root, "pnpm-lock.yaml");
  const lockBytes = fs.readFileSync(lockPath);
  const lock = parse(lockBytes.toString("utf8"));
  if (!lock?.importers || typeof lock.importers !== "object") {
    throw new Error("pnpm-lock.yaml has no importer inventory");
  }

  const records = [];
  for (const [importer, lockImporter] of Object.entries(lock.importers).sort(([a], [b]) => a.localeCompare(b))) {
    const manifestPath = path.join(root, importer === "." ? "" : importer, "package.json");
    if (!fs.existsSync(manifestPath)) throw new Error(`Missing package.json for lockfile importer ${importer}`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const kind of ["dependencies", "devDependencies", "optionalDependencies"]) {
      const declarations = manifest[kind] ?? {};
      const locked = lockImporter[kind] ?? {};
      for (const [name, specifier] of Object.entries(declarations).sort(([a], [b]) => a.localeCompare(b))) {
        const entry = locked[name];
        const lockSpecifier = entry && typeof entry === "object" ? entry.specifier : null;
        const resolved = entry && typeof entry === "object" ? entry.version : null;
        records.push({
          importer,
          package: name,
          kind,
          specifier,
          lockedSpecifier: lockSpecifier,
          lockedVersion: resolved ? resolved.split("(", 1)[0] : null,
          workspace: String(specifier).startsWith("workspace:"),
          lockDrift: !entry ? "missing-lock-entry" : lockSpecifier !== specifier ? "specifier-mismatch" : null,
        });
      }
    }
  }
  records.sort((a, b) => `${a.package}\0${a.importer}\0${a.kind}`.localeCompare(`${b.package}\0${b.importer}\0${b.kind}`));
  return {
    lockfileSha256: crypto.createHash("sha256").update(lockBytes).digest("hex"),
    lockfileVersion: lock.lockfileVersion ?? null,
    records,
  };
}

function versionParts(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(String(value ?? ""));
  return match ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? null } : null;
}

export function classifyVersion(current, candidate) {
  const from = versionParts(current);
  const to = versionParts(candidate);
  if (!from || !to) return "unknown";
  if (from.major === to.major && from.minor === to.minor && from.patch === to.patch) return "current";
  if (to.major < from.major || (to.major === from.major && to.minor < from.minor) ||
      (to.major === from.major && to.minor === from.minor && to.patch < from.patch)) return "registry-behind";
  if (to.major > from.major) return "major";
  if (to.minor > from.minor) return "minor";
  if (to.patch > from.patch) return "patch";
  return to.prerelease ? "prerelease" : "unknown";
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

async function fetchJson(url, { fetchFn = fetch, headers = {}, allowNotFound = false } = {}) {
  const response = await fetchFn(url, {
    headers: { "user-agent": "ALNILAM-upstream-watch/1", accept: "application/vnd.github+json", ...headers },
    signal: AbortSignal.timeout(20_000),
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) throw new Error(`GET ${url} returned HTTP ${response.status}`);
  return response.json();
}

async function fetchRecentIssues(repoUrl, fetchFn) {
  const recentIssues = [];
  let pagesFetched = 0;
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const rows = await fetchJson(`${repoUrl}/issues?state=all&sort=updated&direction=desc&per_page=${ISSUE_PAGE_SIZE}&page=${page}`, { fetchFn });
    if (!Array.isArray(rows)) throw new Error("GitHub returned an invalid issue page");
    pagesFetched++;
    recentIssues.push(...rows.filter((issue) => !issue.pull_request).slice(0, MAX_RECENT_ISSUES - recentIssues.length));
    if (recentIssues.length >= MAX_RECENT_ISSUES || rows.length < ISSUE_PAGE_SIZE) {
      return { issues: recentIssues, status: "complete", pagesFetched };
    }
  }
  return {
    issues: recentIssues,
    status: recentIssues.length >= MAX_RECENT_ISSUES ? "complete" : "truncated",
    pagesFetched,
  };
}

export async function fetchSourceSnapshot(source, { fetchFn = fetch, apiBase = "https://api.github.com" } = {}) {
  const repositoryPath = source.repository.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
  const repoUrl = `${apiBase}/repos/${repositoryPath}`;
  const repo = await fetchJson(repoUrl, { fetchFn });
  const branch = repo.default_branch;
  if (!branch) throw new Error(`${source.id}: GitHub returned no default branch`);
  const [commit, release, tags, issueResult] = await Promise.all([
    fetchJson(`${repoUrl}/commits/${encodeURIComponent(branch)}`, { fetchFn }),
    fetchJson(`${repoUrl}/releases/latest`, { fetchFn, allowNotFound: true }),
    fetchJson(`${repoUrl}/tags?per_page=10`, { fetchFn }),
    fetchRecentIssues(repoUrl, fetchFn),
  ]);
  return {
    repository: repo.html_url,
    defaultBranch: branch,
    license: repo.license?.spdx_id ?? null,
    archived: Boolean(repo.archived),
    head: {
      sha: commit.sha,
      committedAt: commit.commit?.committer?.date ?? null,
      url: commit.html_url,
      subject: String(commit.commit?.message ?? "").split(/\r?\n/, 1)[0].slice(0, 240),
    },
    latestRelease: release ? {
      tag: release.tag_name,
      publishedAt: release.published_at,
      url: release.html_url,
    } : null,
    tags: (Array.isArray(tags) ? tags : []).map((tag) => ({ name: tag.name, sha: tag.commit?.sha ?? null,
      url: tag.html_url ?? `${repo.html_url}/tree/${encodeURIComponent(tag.name)}` })),
    recentIssues: issueResult.issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      updatedAt: issue.updated_at,
      url: issue.html_url,
    })),
    issueCoverage: {
      status: issueResult.status,
      issueCount: issueResult.issues.length,
      pagesFetched: issueResult.pagesFetched,
      pageLimit: MAX_ISSUE_PAGES,
      pageSize: ISSUE_PAGE_SIZE,
    },
  };
}

export async function fetchPackageMetadata(packageNames, { fetchFn = fetch, registryBase = "https://registry.npmjs.org" } = {}) {
  return mapLimit(packageNames, MAX_CONCURRENT_REQUESTS, async (name) => {
    const url = `${registryBase}/${encodeURIComponent(name)}`;
    const metadata = await fetchJson(url, { fetchFn, headers: { accept: "application/json" } });
    const latest = metadata["dist-tags"]?.latest ?? null;
    const latestVersion = latest ? metadata.versions?.[latest] : null;
    const publishedAt = latest ? metadata.time?.[latest] ?? null : null;
    return [name, {
      latest,
      publishedAt,
      metadataUpdatedAt: metadata.time?.modified ?? null,
      deprecated: typeof latestVersion?.deprecated === "string" ? latestVersion.deprecated : null,
    }];
  });
}

export function enrichDependencies(records, metadata, now = new Date()) {
  const staleBefore = now.getTime() - STALE_RELEASE_DAYS * 24 * 60 * 60 * 1000;
  return records.map((record) => {
    const published = metadata.get(record.package) ?? {};
    const candidateClass = record.workspace ? "current" : classifyVersion(record.lockedVersion, published.latest);
    const publishedMs = published.publishedAt ? Date.parse(published.publishedAt) : NaN;
    return {
      ...record,
      latest: record.workspace ? null : published.latest ?? null,
      candidateClass,
      publishedAt: published.publishedAt ?? null,
      deprecated: published.deprecated ?? null,
      staleRelease: Number.isFinite(publishedMs) && publishedMs < staleBefore,
    };
  });
}

function parseAuditResult(result) {
  const raw = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) {
    return { status: "unavailable", error: (result.error?.message || raw.trim() || `pnpm audit exited ${result.status}`).slice(0, 500) };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { status: "unavailable", error: "pnpm audit returned non-JSON output" };
  }
  if (parsed.error) {
    const detail = typeof parsed.error === "string" ? parsed.error : parsed.error.message ?? JSON.stringify(parsed.error);
    return { status: "unavailable", error: String(detail).slice(0, 500) };
  }

  const entries = [];
  for (const [packageName, vulnerability] of Object.entries(parsed.vulnerabilities ?? {})) {
    for (const advisory of vulnerability.via ?? []) {
      if (!advisory || typeof advisory !== "object") continue;
      entries.push({
        package: packageName,
        id: String(advisory.source ?? advisory.url ?? advisory.title ?? "unspecified"),
        title: advisory.title ?? null,
        severity: advisory.severity ?? vulnerability.severity ?? "unknown",
        range: advisory.range ?? vulnerability.range ?? null,
        url: advisory.url ?? null,
        paths: vulnerability.nodes ?? [],
        recommendation: advisory.fixAvailable ?? null,
      });
    }
  }
  for (const advisory of Object.values(parsed.advisories ?? {})) {
    entries.push({
      package: advisory.module_name ?? "unknown",
      id: String(advisory.github_advisory_id ?? advisory.id ?? advisory.url ?? "unspecified"),
      title: advisory.title ?? null,
      severity: advisory.severity ?? "unknown",
      range: advisory.vulnerable_versions ?? null,
      url: advisory.url ?? null,
      paths: [...new Set((advisory.findings ?? []).flatMap((finding) => finding.paths ?? []))].sort(),
      recommendation: advisory.recommendation ?? null,
    });
  }
  entries.sort((a, b) => `${a.package}\0${a.id}`.localeCompare(`${b.package}\0${b.id}`));
  const counts = parsed.metadata?.vulnerabilities ?? null;
  const hasFindings = entries.length > 0 || Object.values(counts ?? {}).some((value) => Number(value) > 0);
  return { status: hasFindings ? "findings" : result.status === 0 ? "clear" : "unavailable", counts, entries,
    ...(result.status !== 0 && !hasFindings ? { error: "pnpm audit exited non-zero without advisory records" } : {}) };
}
export function summarizeAudit(result) {
  return parseAuditResult(result);
}

function stateForSource(previous, observation, now) {
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify(observation)).digest("hex");
  const lastSeen = previous?.last_seen ?? null;
  const status = !lastSeen ? "first-observation" : lastSeen.fingerprint === fingerprint ? "unchanged" : "changed";
  return {
    status,
    record: status === "unchanged" ? lastSeen : { fingerprint, observedAt: now, observation },
  };
}

function sourceObservation(snapshot) {
  return {
    headSha: snapshot.head.sha,
    releaseTag: snapshot.latestRelease?.tag ?? null,
    tags: snapshot.tags.map((tag) => [tag.name, tag.sha]),
    issues: snapshot.recentIssues.map((issue) => [issue.number, issue.state, issue.updatedAt]),
    license: snapshot.license,
    archived: snapshot.archived,
  };
}

function dependencyObservation(scan, dependencies, audit) {
  return {
    lockfileSha256: scan.lockfileSha256,
    packages: dependencies.map((item) => [item.importer, item.package, item.kind, item.specifier, item.lockedSpecifier,
      item.lockedVersion, item.workspace, item.lockDrift, item.latest, item.candidateClass, item.deprecated, item.staleRelease]),
  };
}

export function reconcileWatch({ registry, state, snapshots, dependencyScan, dependencies, audit, now = new Date().toISOString() }) {
  const nextState = structuredClone(state);
  nextState.sources ??= {};
  const sourceReports = registry.sources.map((source) => {
    const snapshot = snapshots[source.id];
    if (!snapshot) throw new Error(`Missing upstream snapshot: ${source.id}`);
    const previous = nextState.sources[source.id] ?? {};
    const observation = sourceObservation(snapshot);
    const tracked = stateForSource(previous, observation, now);
    nextState.sources[source.id] = {
      ...previous,
      last_seen: tracked.record,
      last_analyzed: previous.last_analyzed ?? null,
      last_integrated: previous.last_integrated ?? null,
      decisions: previous.decisions ?? [],
    };
    return {
      id: source.id,
      repository: source.repository,
      role: source.role,
      baselineRevision: source.baselineRevision,
      status: tracked.status,
      differsFromBaseline: snapshot.head.sha !== source.baselineRevision,
      lastAnalyzed: nextState.sources[source.id].last_analyzed,
      lastIntegrated: nextState.sources[source.id].last_integrated,
      ...snapshot,
    };
  });

  const depPrevious = nextState.dependencies ?? {};
  const depObservation = dependencyObservation(dependencyScan, dependencies, audit);
  const depTracked = stateForSource(depPrevious, depObservation, now);
  nextState.dependencies = {
    ...depPrevious,
    last_seen: depTracked.record,
    last_analyzed: depPrevious.last_analyzed ?? null,
    last_integrated: depPrevious.last_integrated ?? null,
    decisions: depPrevious.decisions ?? [],
  };
  const counts = Object.fromEntries(["patch", "minor", "major", "current", "unknown", "registry-behind"]
    .map((kind) => [kind, dependencies.filter((item) => item.candidateClass === kind).length]));
  const report = {
    schemaVersion: 1,
    generatedAt: now,
    mode: "manual-read-only",
    stateStatus: { upstream: sourceReports.map(({ id, status }) => ({ id, status })), dependencies: depTracked.status },
    sources: sourceReports,
    dependencies: {
      status: depTracked.status,
      lockfileVersion: dependencyScan.lockfileVersion,
      lockfileSha256: dependencyScan.lockfileSha256,
      directDependencyCount: dependencies.length,
      candidateCounts: counts,
      lockDrift: dependencies.filter((item) => item.lockDrift),
      packages: dependencies,
      audit,
      lastAnalyzed: nextState.dependencies.last_analyzed,
      lastIntegrated: nextState.dependencies.last_integrated,
    },
  };
  return { report, state: nextState };
}

function loadJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJsonAtomically(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(temp, file);
}

function packageCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function usage() {
  return "Usage: node scripts/upstream-watch.mjs [--registry <file>] [--state <file>] [--report <file>]";
}

async function main(args) {
  const options = new Map();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") {
      console.log(usage());
      return;
    }
    if (!["--registry", "--state", "--report"].includes(flag) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error(usage());
    }
    options.set(flag, args[++index]);
  }
  const registryPath = path.resolve(repoRoot, options.get("--registry") ?? DEFAULT_REGISTRY);
  const statePath = path.resolve(repoRoot, options.get("--state") ?? DEFAULT_STATE);
  const reportPath = options.has("--report") ? path.resolve(repoRoot, options.get("--report")) : null;
  const registry = loadJson(registryPath);
  if (!registry?.sources || !Array.isArray(registry.sources)) throw new Error(`Invalid source registry: ${registryPath}`);
  const state = loadJson(statePath, { schemaVersion: 1, sources: {}, dependencies: {} });
  const headers = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    ? { authorization: `Bearer ${process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN}` }
    : {};
  const snapshots = Object.fromEntries(await mapLimit(registry.sources, 4, async (source) => [
    source.id, await fetchSourceSnapshot(source, { fetchFn: (url, init) => fetch(url, { ...init, headers: { ...init.headers, ...headers } }) }),
  ]));
  const dependencyScan = readDependencyInventory(repoRoot);
  const packageNames = [...new Set(dependencyScan.records.filter((record) => !record.workspace).map((record) => record.package))].sort();
  const metadata = new Map(await fetchPackageMetadata(packageNames));
  const now = new Date().toISOString();
  const dependencies = enrichDependencies(dependencyScan.records, metadata);
  const auditResult = spawnSync(packageCommand(), ["audit", "--json", "--registry=https://registry.npmjs.org"], {
    cwd: repoRoot, encoding: "utf8", timeout: 60_000, maxBuffer: 8 * 1024 * 1024,
  });
  const audit = summarizeAudit(auditResult);
  const { report, state: nextState } = reconcileWatch({ registry, state, snapshots, dependencyScan, dependencies, audit, now });
  const stateChanged = JSON.stringify(state) !== JSON.stringify(nextState);
  if (stateChanged) saveJsonAtomically(statePath, nextState);
  report.stateFileUpdated = stateChanged;
  if (reportPath) saveJsonAtomically(reportPath, report);
  else console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`upstream-watch: ${error.message}`);
    process.exitCode = 1;
  });
}
