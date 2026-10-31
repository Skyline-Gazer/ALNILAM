#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const REPO = 'KoolingMachine/ALNILAM';
const API = 'https://api.cnb.cool';
const SHA = /^[a-f0-9]{40}$/;
const GHSA = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const CVE = /^CVE-\d{4}-\d{4,}$/;
const BLOCKING = new Set(['high', 'critical']);
const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'];
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export function fail(code, message) {throw Error(`${code}: ${message}`);}

export function parseRegistry(raw) {
  const value = String(raw || DEFAULT_REGISTRY).trim();
  let url;
  try { url = new URL(value); } catch { fail('SCA_GATE_CONFIGURATION', `invalid audit registry ${value}`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    fail('SCA_GATE_CONFIGURATION', `audit registry must be a bare https origin, got ${url.origin}${url.pathname}`);
  }
  return url.origin + '/';
}

export function readJsonDocument(text, label) {
  if (typeof text !== 'string' && !Buffer.isBuffer(text)) fail('SCA_GATE_OUTPUT_INVALID', `${label} output is not text`);
  const raw = Buffer.isBuffer(text) ? text.toString('utf8') : text;
  if (!raw.trim()) fail('SCA_GATE_EVIDENCE_MISSING', `${label} output is empty`);
  let doc;
  try { doc = JSON.parse(raw); }
  catch (error) { fail('SCA_GATE_OUTPUT_INVALID', `${label} output is not valid JSON: ${String(error.message).slice(0, 200)}`); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) fail('SCA_GATE_OUTPUT_INVALID', `${label} output is not a JSON object`);
  if (doc.error) fail('SCA_GATE_TOOL_ERROR', `${label} tool error ${doc.error.code || 'unknown'}: ${String(doc.error.message || '').slice(0, 300)}`);
  return doc;
}

export function validateAuditDocument(doc, label) {
  if (!doc.advisories || typeof doc.advisories !== 'object' || Array.isArray(doc.advisories)) {
    fail('SCA_GATE_OUTPUT_INVALID', `${label} audit lacks the legacy advisories map; coverage shape unverified`);
  }
  const counts = doc.metadata?.vulnerabilities;
  if (!counts || !Number.isSafeInteger(counts.high) || !Number.isSafeInteger(counts.critical)) {
    fail('SCA_GATE_OUTPUT_INVALID', `${label} audit lacks severity count metadata`);
  }
  if (!Number.isSafeInteger(doc.metadata?.totalDependencies) || doc.metadata.totalDependencies < 1) {
    fail('SCA_GATE_OUTPUT_INVALID', `${label} audit lacks a positive dependency total`);
  }
  for (const [id, advisory] of Object.entries(doc.advisories)) {
    if (!advisory || typeof advisory !== 'object') fail('SCA_GATE_OUTPUT_INVALID', `${label} advisory ${id} is malformed`);
    if (!String(advisory.module_name || '').trim()) fail('SCA_GATE_OUTPUT_INVALID', `${label} advisory ${id} lacks module_name`);
    if (!Array.isArray(advisory.findings)) fail('SCA_GATE_OUTPUT_INVALID', `${label} advisory ${id} lacks findings`);
    if (!SEVERITIES.includes(String(advisory.severity || '').toLowerCase())) {
      fail('SCA_GATE_OUTPUT_INVALID', `${label} advisory ${id} has unknown severity ${advisory.severity}`);
    }
  }
  return doc;
}

export function advisoryIdentity(advisory) {
  const ghsa = GHSA.test(String(advisory.github_advisory_id || '')) ? advisory.github_advisory_id : null;
  const cve = (Array.isArray(advisory.cves) ? advisory.cves : []).find(item => CVE.test(String(item))) || null;
  const key = ghsa || cve;
  if (!key) fail('SCA_GATE_OUTPUT_INVALID', `advisory ${advisory.id} (${advisory.module_name}) has no GHSA or CVE identity`);
  return {ghsa, cve, key};
}

export function blockingFindings(doc) {
  const entries = [];
  const byTriple = new Map();
  for (const advisory of Object.values(doc.advisories)) {
    const severity = String(advisory.severity).toLowerCase();
    if (!BLOCKING.has(severity)) continue;
    const {ghsa, cve, key} = advisoryIdentity(advisory);
    for (const finding of advisory.findings) {
      const version = String(finding?.version || '');
      if (!version) fail('SCA_GATE_OUTPUT_INVALID', `advisory ${advisory.id} finding lacks an installed version`);
      const record = {module: advisory.module_name, version, advisory: key, ghsa, cve, severity,
        title: String(advisory.title || '').slice(0, 200), vulnerableVersions: String(advisory.vulnerable_versions || '')};
      const triple = `${record.module}@${record.version}|${key}`;
      entries.push(record);
      if (!byTriple.has(triple)) byTriple.set(triple, record);
    }
  }
  const declared = Number(doc.metadata.vulnerabilities.high) + Number(doc.metadata.vulnerabilities.critical);
  if (declared !== entries.length) {
    fail('SCA_GATE_OUTPUT_INVALID', `metadata high+critical count ${declared} disagrees with advisory findings ${entries.length}`);
  }
  return byTriple;
}

export function parseWorkspaceGlobs(text) {
  const lines = String(text).split('\n');
  const start = lines.findIndex(line => /^packages:\s*$/.test(line));
  if (start === -1) fail('SCA_GATE_COVERAGE_INCOMPLETE', 'pnpm-workspace.yaml lacks a packages: list');
  const globs = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !/^\s/.test(line)) break;
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^\s+-\s+"?([^"]+)"?\s*$/);
    if (!match) fail('SCA_GATE_COVERAGE_INCOMPLETE', `unparsable pnpm-workspace.yaml entry ${JSON.stringify(line)}`);
    globs.push(match[1]);
  }
  if (!globs.length) fail('SCA_GATE_COVERAGE_INCOMPLETE', 'pnpm-workspace.yaml packages list is empty');
  return globs;
}

export function globMatches(pattern, file) {
  const parts = file.split('/');
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2).split('/');
    return parts.length === prefix.length + 2 && parts[parts.length - 1] === 'package.json'
      && prefix.every((segment, index) => segment === parts[index]);
  }
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3).split('/');
    return parts.length > prefix.length + 1 && parts[parts.length - 1] === 'package.json'
      && prefix.every((segment, index) => segment === parts[index]);
  }
  return pattern === file;
}

export function classifyTreeEntries(lsTreeOutput, globs) {
  const manifests = [];
  const gitlinks = [];
  const uncovered = [];
  for (const line of String(lsTreeOutput).split('\n').filter(Boolean)) {
    const tab = line.indexOf('\t');
    if (tab === -1) fail('SCA_GATE_OUTPUT_INVALID', `unparsable git ls-tree row ${JSON.stringify(line)}`);
    const [mode, type] = line.slice(0, tab).split(/ +/);
    const file = line.slice(tab + 1);
    if (mode === '160000' || type === 'commit') { gitlinks.push(file); continue; }
    if (type !== 'blob') continue;
    if (file === 'package.json' || file === 'pnpm-lock.yaml' || file === 'pnpm-workspace.yaml') manifests.push(file);
    else if (file.endsWith('/package.json')) {
      if (globs.some(glob => globMatches(glob, file))) manifests.push(file);
      else uncovered.push(file);
    }
  }
  if (uncovered.length) fail('SCA_GATE_COVERAGE_INCOMPLETE', `package.json outside workspace globs would escape the audit: ${uncovered.join(', ')}`);
  for (const required of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    if (!manifests.includes(required)) fail('SCA_GATE_COVERAGE_INCOMPLETE', `missing root dependency input ${required}`);
  }
  return {manifests: [...new Set(manifests)].sort(), gitlinks: [...new Set(gitlinks)].sort()};
}

export function parseLockfileImporters(lockText) {
  const lines = String(lockText).split('\n');
  const start = lines.findIndex(line => /^importers:\s*$/.test(line));
  if (start === -1) fail('SCA_GATE_COVERAGE_INCOMPLETE', 'pnpm-lock.yaml lacks an importers: section');
  const importers = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !/^\s/.test(line)) break;
    const match = line.match(/^ {2}(?! )"?([^":\n]+)"?:\s*$/);
    if (match) importers.push(match[1]);
  }
  if (!importers.length || !importers.includes('.')) fail('SCA_GATE_COVERAGE_INCOMPLETE', 'pnpm-lock.yaml importers lack the root importer');
  return importers;
}

export function assertImporterCoverage(importers, manifests, gitlinks) {
  const discovered = manifests.filter(file => file.endsWith('package.json'))
    .map(file => file === 'package.json' ? '.' : path.posix.dirname(file)).sort();
  const declared = importers.map(item => item === '.' ? '.' : item).sort();
  if (discovered.join(',') !== declared.join(',')) {
    fail('SCA_GATE_COVERAGE_INCOMPLETE', `workspace manifests ${discovered} do not match lockfile importers ${declared}`);
  }
  for (const gitlink of gitlinks) {
    if (importers.includes(gitlink) || importers.some(item => item.startsWith(`${gitlink}/`))) {
      fail('SCA_GATE_COVERAGE_INCOMPLETE', `gitlink ${gitlink} unexpectedly appears as a lockfile importer`);
    }
  }
  return {proof: 'submodule gitlinks carry no tracked manifests in this object DB; workspace globs never cover them, so Node dependency discovery excludes them explicitly'};
}

export function validateGateIdentity(env, event) {
  const iid = env.CNB_PULL_REQUEST_IID;
  const head = env.CNB_PULL_REQUEST_SHA;
  const base = env.CNB_PULL_REQUEST_TARGET_SHA;
  const commit = env.CNB_COMMIT;
  const sourceBranch = String(env.CNB_PULL_REQUEST_BRANCH || '').replace(/^refs\/heads\//, '');
  const targetBranch = String(env.CNB_BRANCH || '').replace(/^refs\/heads\//, '');
  if (env.CNB_EVENT !== event || env.CNB_REPO_SLUG !== REPO || env.CNB_PULL_REQUEST_SLUG !== REPO ||
      (env.CNB_API_ENDPOINT && env.CNB_API_ENDPOINT !== API) || !/^[1-9]\d*$/.test(iid || '') ||
      !SHA.test(head || '') || !SHA.test(base || '') || !SHA.test(commit || '') ||
      !sourceBranch || !targetBranch) {
    fail('SCA_GATE_IDENTITY_MISMATCH', `untrusted or inconsistent PR identity (event=${env.CNB_EVENT}, iid=${iid})`);
  }
  if (event === 'pull_request.target' && commit !== base) {
    fail('SCA_GATE_IDENTITY_MISMATCH', 'pull_request.target checkout is not the exact target SHA');
  }
  return {iid, head, base, commit, sourceBranch, targetBranch};
}

export function assertPreMergeParents(parents, base, head) {
  if (!Array.isArray(parents) || parents.length !== 2 || new Set(parents).size !== 2 ||
      !parents.includes(base) || !parents.includes(head)) {
    fail('SCA_GATE_IDENTITY_MISMATCH', 'pre-merge checkout does not have exactly the verified base and head parents');
  }
}

export function assertLiveRefs(output, identity) {
  const rows = String(output).trim().split('\n').filter(Boolean).map(row => row.split('\t'));
  const found = new Map(rows.map(([sha, ref]) => [ref, sha]));
  const source = `refs/heads/${identity.sourceBranch}`;
  const target = `refs/heads/${identity.targetBranch}`;
  if (rows.length !== 2 || found.get(source) !== identity.head || found.get(target) !== identity.base) {
    fail('SCA_GATE_IDENTITY_MISMATCH', `live refs moved or do not match PR ${identity.iid}: want ${source}=${identity.head} ${target}=${identity.base}`);
  }
}

export function gateEnvironment(env, home, registry) {
  const child = {
    PATH: env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: home, TMPDIR: home, TMP: home, TEMP: home, CI: 'true',
    LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', TZ: 'UTC',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_TERMINAL_PROMPT: '0',
    NPM_CONFIG_USERCONFIG: '/dev/null', NPM_CONFIG_CACHE: path.join(home, 'npm'),
    npm_config_registry: registry,
  };
  if (env.PNPM_HOME) child.PNPM_HOME = env.PNPM_HOME;
  return child;
}

export function defaultDeps() {
  return {
    git(args) { return execFileSync('git', args, {cwd: process.cwd(), encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 120000}); },
    ensureCommits(shas, iid, targetBranch) {
      for (const sha of shas) {
        try { execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], {cwd: process.cwd(), stdio: 'ignore', timeout: 30000}); }
        catch {
          try {
            execFileSync('git', ['fetch', '--no-tags', 'origin', `refs/pull/${iid}/head`, `refs/heads/${targetBranch}`],
              {cwd: process.cwd(), stdio: 'ignore', timeout: 10 * 60 * 1000});
          } catch (error) { fail('SCA_GATE_IDENTITY_MISMATCH', `base/head objects unavailable after fetch: ${String(error?.message || error).slice(0, 200)}`); }
          try { execFileSync('git', ['cat-file', `-e`, `${sha}^{commit}`], {cwd: process.cwd(), stdio: 'ignore', timeout: 30000}); }
          catch { fail('SCA_GATE_IDENTITY_MISMATCH', `required object ${sha} is still missing in the checkout`); }
        }
      }
    },
    pnpmInstall(cwd, env) {
      return execFileSync('pnpm', ['install', '--frozen-lockfile', '--lockfile-only', '--ignore-scripts', `--registry=${env.npm_config_registry}`],
        {cwd, env, timeout: 15 * 60 * 1000, stdio: 'pipe', maxBuffer: 64 * 1024 * 1024}).toString();
    },
    pnpmAudit(cwd, env) {
      try {
        return execFileSync('pnpm', ['audit', '--json', '--audit-level=high', `--registry=${env.npm_config_registry}`],
          {cwd, env, timeout: 5 * 60 * 1000, maxBuffer: 64 * 1024 * 1024}).toString();
      } catch (error) {
        if (typeof error?.status === 'number' && (error.status === 0 || error.status === 1) && error.stdout) return error.stdout.toString();
        throw Error(`pnpm audit exited ${error?.status ?? 'signal'} ${String(error?.message || error).slice(0, 200)}`);
      }
    },
  };
}

export function materializeSide(sha, manifests, git) {
  const sideRoot = fs.mkdtempSync(path.join(os.tmpdir(), `sca-gate-${sha.slice(0, 12)}-`));
  for (const file of manifests) {
    const content = git(['show', `${sha}:${file}`]);
    const target = path.join(sideRoot, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, content);
  }
  return sideRoot;
}

export async function auditSide(label, sha, deps, registry, parentEnv) {
  const workspaceText = deps.git(['show', `${sha}:pnpm-workspace.yaml`]);
  const globs = parseWorkspaceGlobs(workspaceText);
  const {manifests, gitlinks} = classifyTreeEntries(deps.git(['ls-tree', '-r', sha]), globs);
  assertImporterCoverage(parseLockfileImporters(deps.git(['show', `${sha}:pnpm-lock.yaml`])), manifests, gitlinks);
  const sideRoot = materializeSide(sha, manifests, deps.git);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sca-gate-home-'));
  const env = gateEnvironment(parentEnv, home, registry);
  let stdout;
  try {
    try { deps.pnpmInstall(sideRoot, env); }
    catch (error) { fail('SCA_GATE_LOCKFILE_STALE', `${label} ${sha.slice(0, 12)} manifest/lockfile consistency failed: ${String(error?.message || error).slice(0, 400)}`); }
    stdout = deps.pnpmAudit(sideRoot, env);
  } finally {
    fs.rmSync(sideRoot, {recursive: true, force: true});
    fs.rmSync(home, {recursive: true, force: true});
  }
  const doc = validateAuditDocument(readJsonDocument(stdout, `${label} audit`), `${label} audit`);
  return {sha, manifests, gitlinks, findings: blockingFindings(doc), sideRoot: null,
    totalDependencies: doc.metadata.totalDependencies, counts: doc.metadata.vulnerabilities, doc};
}

export function diffBlockingFindings(base, head) {
  const introducedKeys = [...head.keys()].filter(key => !base.has(key)).sort();
  const inheritedKeys = [...base.keys()].filter(key => head.has(key)).sort();
  return {
    introduced: introducedKeys,
    inherited: inheritedKeys,
    resolved: [...base.keys()].filter(key => !head.has(key)).sort(),
    introducedDetails: introducedKeys.map(key => head.get(key)),
  };
}

export function buildReport(identity, event, registry, baseSide, headSide, diff) {
  const toList = map => [...map.values()].map(item => ({
    module: item.module, version: item.version, advisory: item.advisory, ghsa: item.ghsa, cve: item.cve,
    severity: item.severity, title: item.title, vulnerableVersions: item.vulnerableVersions,
  }));
  return {
    policy: 'ALNILAM-118-B-two-track',
    verdict: diff.introduced.length ? 'FAIL_NEW_HIGH' : 'PASS',
    event, registry,
    identity: {prNumber: Number(identity.iid), baseSha: identity.base, headSha: identity.head,
      sourceBranch: identity.sourceBranch, targetBranch: identity.targetBranch, checkoutSha: identity.commit},
    coverage: {
      base: {manifests: baseSide.manifests, gitlinksExcludedFromNodeDiscovery: baseSide.gitlinks, totalDependencies: baseSide.totalDependencies, counts: baseSide.counts},
      head: {manifests: headSide.manifests, gitlinksExcludedFromNodeDiscovery: headSide.gitlinks, totalDependencies: headSide.totalDependencies, counts: headSide.counts},
    },
    baselineInheritedBlocking: toList(baseSide.findings),
    headBlocking: toList(headSide.findings),
    introduced: diff.introducedDetails,
    resolvedSinceBase: diff.resolved,
  };
}

export function formatVerdict(report) {
  const lines = [
    `sca-new-high-gate policy=B event=${report.event} pr=${report.identity.prNumber} base=${report.identity.baseSha} head=${report.identity.headSha}`,
    `coverage base manifests=${report.coverage.base.manifests.length} dependencies=${report.coverage.base.totalDependencies}; head manifests=${report.coverage.head.manifests.length} dependencies=${report.coverage.head.totalDependencies}`,
    `inherited baseline High/Critical (report-only under policy B): ${report.baselineInheritedBlocking.length}`,
    ...report.baselineInheritedBlocking.map(item => `INHERITED ${item.severity.toUpperCase()} ${item.module}@${item.version} ${item.advisory}`),
    ...report.introduced.map(item => `NEW ${item.severity.toUpperCase()} ${item.module}@${item.version} ${item.advisory}`),
    `head blocking total=${report.headBlocking.length} introduced=${report.introduced.length} resolvedSinceBase=${report.resolvedSinceBase.length}`,
    `verdict=${report.verdict}`,
  ];
  return lines.join('\n');
}

export async function fetchPullRequest(identity, token, request = fetch) {
  if (!token) fail('SCA_GATE_IDENTITY_MISMATCH', 'CNB_TOKEN required to verify the native PR identity');
  const url = new URL(`${REPO}/-/pulls/${identity.iid}`, `${API}/`);
  let response;
  try {
    response = await request(url, {headers: {Authorization: `Bearer ${token}`, Accept: 'application/json'}, signal: AbortSignal.timeout(15000)});
  } catch (error) { fail('SCA_GATE_TOOL_ERROR', `native CNB PR API request failed: ${String(error?.message || error).slice(0, 200)}`); }
  if (!response.ok) fail('SCA_GATE_TOOL_ERROR', `native CNB PR API returned ${response.status}`);
  let payload;
  try { payload = await response.json(); }
  catch (error) { fail('SCA_GATE_OUTPUT_INVALID', `native CNB PR API returned malformed JSON: ${String(error?.message || error).slice(0, 200)}`); }
  const pr = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const head = pr?.head?.sha;
  const base = pr?.base?.sha;
  if (String(pr?.number) !== identity.iid || pr?.state !== 'open' || pr?.is_merged !== false ||
      pr?.base?.repo?.path !== REPO || pr?.head?.repo?.path !== REPO ||
      head !== identity.head || base !== identity.base ||
      String(pr?.head?.ref || '').replace(/^refs\/heads\//, '') !== identity.sourceBranch ||
      String(pr?.base?.ref || '').replace(/^refs\/heads\//, '') !== identity.targetBranch) {
    fail('SCA_GATE_IDENTITY_MISMATCH', 'native CNB PR identity does not match the event SHAs, branches or open state');
  }
  return {head, base};
}

export async function runGate({env, event, deps, registry, outDir, lsRemote}) {
  const identity = validateGateIdentity(env, event);
  const request = deps.request || fetch;
  await fetchPullRequest(identity, env.CNB_TOKEN, request);
  assertLiveRefs(lsRemote('origin', `refs/heads/${identity.sourceBranch}`, `refs/heads/${identity.targetBranch}`), identity);
  if (event === 'pull_request') assertPreMergeParents(deps.git(['rev-list', '--parents', '-n', '1', identity.commit]).trim().split(/\s+/).slice(1), identity.base, identity.head);
  if (identity.base === identity.head) fail('SCA_GATE_IDENTITY_MISMATCH', 'base and head SHAs must differ');
  deps.ensureCommits([identity.base, identity.head], identity.iid, identity.targetBranch);
  const baseSide = await auditSide('base', identity.base, deps, registry, env);
  const headSide = await auditSide('head', identity.head, deps, registry, env);
  await fetchPullRequest(identity, env.CNB_TOKEN, request);
  assertLiveRefs(lsRemote('origin', `refs/heads/${identity.sourceBranch}`, `refs/heads/${identity.targetBranch}`), identity);
  const diff = diffBlockingFindings(baseSide.findings, headSide.findings);
  const report = buildReport(identity, event, registry, baseSide, headSide, diff);
  fs.mkdirSync(outDir, {recursive: true});
  const reportPath = path.join(outDir, 'report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(formatVerdict(report));
  console.log(`report=${path.relative(process.cwd(), reportPath)}`);
  return report.verdict === 'PASS' ? 0 : 1;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  try {
    const registry = parseRegistry(process.env.SCA_AUDIT_REGISTRY);
    const event = process.env.CNB_EVENT === 'pull_request.target' ? 'pull_request.target' : 'pull_request';
    const deps = defaultDeps();
    const lsRemote = (remote, ...refs) => execFileSync('git', ['ls-remote', remote, ...refs], {cwd: process.cwd(), encoding: 'utf8', timeout: 120000});
    process.exitCode = await runGate({env: process.env, event, deps, registry, lsRemote,
      outDir: path.join(process.cwd(), 'artifacts', 'sca-new-high-gate')});
  } catch (error) {
    const message = error?.message || String(error);
    console.error(message.startsWith('SCA_GATE_') ? message : `SCA_GATE_TOOL_ERROR: ${message}`);
    process.exitCode = 2;
  }
}
