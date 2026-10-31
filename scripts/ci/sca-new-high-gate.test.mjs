import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  advisoryIdentity, assertImporterCoverage, assertLiveRefs, assertPreMergeParents, auditSide, blockingFindings,
  classifyTreeEntries, diffBlockingFindings, fail, formatVerdict, gateEnvironment, globMatches, parseLockfileImporters,
  parseRegistry, parseWorkspaceGlobs, readJsonDocument, runGate, validateAuditDocument, validateGateIdentity,
} from './sca-new-high-gate.mjs';

const BASE_SHA = '2b367d74a99b5bb8c2022b60f8c07cd6c9543d20';
const HEAD_SHA = 'c9cf703fef8d6fa05d7b3ca27349c597851e1642';

const advisory = (id, module, severity, versions, ghsa, cve) => ({
  id, module_name: module, severity, github_advisory_id: ghsa, cves: cve ? [cve] : [],
  title: `${module} test advisory`, vulnerable_versions: '<99', findings: versions.map(version => ({version})),
});

const INHERITED = [
  advisory(1120654, 'tmp', 'high', ['0.0.33', '0.1.0'], 'GHSA-ph9p-34f9-6g65', 'CVE-2026-44705'),
  advisory(1139346, 'extract-zip', 'high', ['2.0.1'], 'GHSA-jmr9-qjv8-65gv', 'CVE-2026-56876'),
  advisory(1193685, 'extract-zip', 'high', ['2.0.1'], 'GHSA-7pqw-9j4j-h8q3', 'CVE-2026-19693'),
  advisory(1240853, 'basic-ftp', 'high', ['5.3.1'], 'GHSA-c475-qrg2-pj4r', 'CVE-2026-102990'),
  advisory(1243066, 'zod', 'high', ['3.25.76'], 'GHSA-mrhx-c7xc-m3w5', 'CVE-2023-54404'),
  advisory(1109537, 'tmp', 'low', ['0.0.33', '0.1.0'], 'GHSA-52f5-9888-hmc6', 'CVE-2025-54798'),
];

const auditDoc = (advisories, total) => ({
  advisories: Object.fromEntries(advisories.map(item => [String(item.id), item])),
  metadata: {totalDependencies: total ?? 629, vulnerabilities: {
    info: 0, low: advisories.filter(a => a.severity === 'low').length, moderate: 0,
    high: advisories.filter(a => a.severity === 'high').flatMap(a => a.findings).length,
    critical: advisories.filter(a => a.severity === 'critical').flatMap(a => a.findings).length,
  }},
});

const TREE = `100644 blob a1\tpackage.json
100644 blob a2\tpnpm-lock.yaml
100644 blob a3\tpnpm-workspace.yaml
100644 blob b1\tapps/web/package.json
100644 blob b2\tapps/web/src/main.js
100644 blob b3\tpackages/core/package.json
100644 blob b4\tthemes/editorial/package.json
160000 commit 375fc71f977c40c2053140c34431cc60a6d42883\t.ads
`;
const GLOBS = ['apps/*', 'packages/*', 'themes/*', 'features/*'];
const MANIFESTS = ['apps/web/package.json', 'package.json', 'packages/core/package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'themes/editorial/package.json'];
const IMPORTERS = ['.', 'apps/web', 'packages/core', 'themes/editorial'];

function fakeGit(overrides = {}) {
  const files = {
    'pnpm-workspace.yaml': `packages:\n  - "apps/*"\n  - "packages/*"\n  - "themes/*"\n  - "features/*"\n`,
    'pnpm-lock.yaml': `lockfileVersion: '9.0'\n\nimporters:\n  .:\n    devDependencies:\n      '@lhci/cli':\n  apps/web:\n  packages/core:\n  themes/editorial:\n\nsnapshots:\n  tmp@0.1.0:\n`,
    'package.json': '{"name":"alnilam"}',
    'apps/web/package.json': '{"name":"@alnilam/web"}',
    'packages/core/package.json': '{"name":"@alnilam/core"}',
    'themes/editorial/package.json': '{"name":"@alnilam/theme-editorial"}',
    ...overrides,
  };
  return args => {
    if (args[0] === 'ls-tree') return TREE;
    if (args[0] === 'show') {
      const file = args[1].slice(args[1].indexOf(':') + 1);
      if (!(file in files)) throw Error(`unknown file ${file}`);
      return files[file];
    }
    if (args[0] === 'rev-list') return `${HEAD_SHA} ${BASE_SHA} ${HEAD_SHA}\n`;
    throw Error(`unexpected git args ${args.join(' ')}`);
  };
}

const prPayload = (identity) => ({data: {number: Number(identity.iid), state: 'open', is_merged: false,
  base: {sha: identity.base, ref: `refs/heads/${identity.targetBranch}`, repo: {path: 'KoolingMachine/ALNILAM'}},
  head: {sha: identity.head, ref: `refs/heads/${identity.sourceBranch}`, repo: {path: 'KoolingMachine/ALNILAM'}}}});
const okRequest = async () => ({ok: true, json: async () => prPayload({iid: '29', base: BASE_SHA, head: HEAD_SHA,
  sourceBranch: 'fix/ci-sca-lhci-dependency', targetBranch: 'dev'})});

const env = extra => ({
  PATH: '/usr/bin', CNB_TOKEN: 'gate-unit-test-token', CNB_EVENT: 'pull_request', CNB_REPO_SLUG: 'KoolingMachine/ALNILAM',
  CNB_PULL_REQUEST_SLUG: 'KoolingMachine/ALNILAM', CNB_API_ENDPOINT: 'https://api.cnb.cool',
  CNB_PULL_REQUEST_IID: '29', CNB_PULL_REQUEST_BRANCH: 'refs/heads/fix/ci-sca-lhci-dependency',
  CNB_BRANCH: 'dev', CNB_PULL_REQUEST_SHA: HEAD_SHA, CNB_PULL_REQUEST_TARGET_SHA: BASE_SHA, CNB_COMMIT: HEAD_SHA,
  ...extra,
});
const lsRefs = () => `${HEAD_SHA}\trefs/heads/fix/ci-sca-lhci-dependency\n${BASE_SHA}\trefs/heads/dev\n`;

const gateError = (code, fn) => assert.throws(fn, error => error.message.startsWith(`${code}: `), `expected ${code}`);

test('parseRegistry only accepts bare https origins', () => {
  assert.equal(parseRegistry('https://registry.npmjs.org'), 'https://registry.npmjs.org/');
  assert.equal(parseRegistry(undefined), 'https://registry.npmjs.org/');
  gateError('SCA_GATE_CONFIGURATION', () => parseRegistry('http://registry.npmjs.org'));
  gateError('SCA_GATE_CONFIGURATION', () => parseRegistry('https://user:token@registry.npmjs.org'));
  gateError('SCA_GATE_CONFIGURATION', () => parseRegistry('not-a-url'));
});

test('gateEnvironment strips registry credentials and CNB tokens', () => {
  const child = gateEnvironment({PATH: '/bin', CNB_TOKEN: 'secret', TWINE_PASSWORD: 'p@ss', HOME: '/home/x'}, '/tmp/home', 'https://r/');
  assert.equal(child.CNB_TOKEN, undefined);
  assert.equal(child.TWINE_PASSWORD, undefined);
  assert.equal(child.NPM_CONFIG_USERCONFIG, '/dev/null');
  assert.equal(child.npm_config_registry, 'https://r/');
});

test('readJsonDocument fails closed on empty, malformed or error JSON', () => {
  gateError('SCA_GATE_EVIDENCE_MISSING', () => readJsonDocument('', 'x'));
  gateError('SCA_GATE_OUTPUT_INVALID', () => readJsonDocument('{oops', 'x'));
  gateError('SCA_GATE_TOOL_ERROR', () => readJsonDocument('{"error":{"code":"ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS","message":"missing"}}', 'x'));
  assert.deepEqual(Object.keys(readJsonDocument('{"advisories":{}}', 'x')), ['advisories']);
});

test('validateAuditDocument rejects coverage shapes that cannot be verified', () => {
  gateError('SCA_GATE_OUTPUT_INVALID', () => validateAuditDocument({vulnerabilities: {}}, 'x'));
  gateError('SCA_GATE_OUTPUT_INVALID', () => validateAuditDocument({advisories: {}, metadata: {vulnerabilities: {}}}, 'x'));
  gateError('SCA_GATE_OUTPUT_INVALID', () => validateAuditDocument({advisories: {'1': {module_name: 'x', severity: 'bogus', findings: [], id: 1}}, metadata: {totalDependencies: 5, vulnerabilities: {high: 0, critical: 0}}}, 'x'));
  validateAuditDocument(auditDoc(INHERITED), 'x');
});

test('blockingFindings maps the six inherited High with GHSA/CVE identities', () => {
  const findings = blockingFindings(validateAuditDocument(auditDoc(INHERITED), 'x'));
  assert.equal(findings.size, 6);
  const keys = [...findings.keys()];
  for (const expected of ['tmp@0.0.33|GHSA-ph9p-34f9-6g65', 'tmp@0.1.0|GHSA-ph9p-34f9-6g65',
    'extract-zip@2.0.1|GHSA-jmr9-qjv8-65gv', 'extract-zip@2.0.1|GHSA-7pqw-9j4j-h8q3',
    'basic-ftp@5.3.1|GHSA-c475-qrg2-pj4r', 'zod@3.25.76|GHSA-mrhx-c7xc-m3w5']) {
    assert.ok(keys.includes(expected), `missing ${expected}`);
  }
});

test('blockingFindings fails when metadata counts disagree with advisory findings', () => {
  const doc = auditDoc(INHERITED);
  doc.metadata.vulnerabilities.high = 3;
  gateError('SCA_GATE_OUTPUT_INVALID', () => blockingFindings(doc));
});

test('advisoryIdentity requires GHSA or CVE and normalizes order', () => {
  assert.equal(advisoryIdentity({id: 1, module_name: 'x', github_advisory_id: 'GHSA-aaaa-bbbb-cccc', cves: ['CVE-2026-1']}).key, 'GHSA-aaaa-bbbb-cccc');
  assert.equal(advisoryIdentity({id: 1, module_name: 'x', cves: ['CVE-2026-1000']}).key, 'CVE-2026-1000');
  gateError('SCA_GATE_OUTPUT_INVALID', () => advisoryIdentity({id: 1, module_name: 'x'}));
});

test('parseWorkspaceGlobs rejects empty or unparsable manifests', () => {
  assert.deepEqual(parseWorkspaceGlobs('packages:\n  - "apps/*"\n'), ['apps/*']);
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => parseWorkspaceGlobs('other: 1\n'));
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => parseWorkspaceGlobs('packages:\n  appsv\n'));
});

test('globMatches honors single and deep workspace patterns', () => {
  assert.ok(globMatches('apps/*', 'apps/web/package.json'));
  assert.ok(!globMatches('apps/*', 'apps/web/nested/package.json'));
  assert.ok(globMatches('features/**', 'features/a/b/package.json'));
  assert.ok(globMatches('apps/web', 'apps/web'));
});

test('classifyTreeEntries excludes gitlinks, requires root inputs, and fails on uncovered manifests', () => {
  const {manifests, gitlinks} = classifyTreeEntries(TREE, GLOBS);
  assert.deepEqual(gitlinks, ['.ads']);
  assert.deepEqual(manifests, MANIFESTS);
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => classifyTreeEntries(`${TREE}100644 blob c1\tvendor/extra/package.json\n`, GLOBS));
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => classifyTreeEntries('100644 blob a1\tpackage.json\n', GLOBS));
});

test('assertImporterCoverage requires exact manifest/importer parity and never imports a gitlink', () => {
  assert.ok(assertImporterCoverage(IMPORTERS, MANIFESTS, ['.ads']).proof);
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => assertImporterCoverage(['.', 'apps/web'], MANIFESTS, []));
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => assertImporterCoverage([...IMPORTERS, '.ads'], MANIFESTS, ['.ads']));
});

test('parseLockfileImporters extracts all importer keys from the lockfile', () => {
  assert.deepEqual(parseLockfileImporters(fakeGit()(['show', `${BASE_SHA}:pnpm-lock.yaml`])), ['.', 'apps/web', 'packages/core', 'themes/editorial']);
  gateError('SCA_GATE_COVERAGE_INCOMPLETE', () => parseLockfileImporters('lockfileVersion: "9.0"\nsnapshots: {}\n'));
});

test('validateGateIdentity binds the verdict to one exact PR', () => {
  assert.equal(validateGateIdentity(env(), 'pull_request').head, HEAD_SHA);
  assert.equal(validateGateIdentity(env({CNB_EVENT: 'pull_request.target', CNB_COMMIT: BASE_SHA}), 'pull_request.target').base, BASE_SHA);
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => validateGateIdentity(env({CNB_REPO_SLUG: 'elsewhere/repo'}), 'pull_request'));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => validateGateIdentity(env({CNB_PULL_REQUEST_IID: ''}), 'pull_request'));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => validateGateIdentity(env({CNB_PULL_REQUEST_SHA: 'deadbeef'}), 'pull_request'));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => validateGateIdentity(env({CNB_COMMIT: 'not-a-sha'}), 'pull_request'));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => validateGateIdentity(env({CNB_COMMIT: HEAD_SHA}), 'pull_request.target'));
});

test('assertPreMergeParents and assertLiveRefs reject moved or wrong identities', () => {
  assertPreMergeParents([BASE_SHA, HEAD_SHA], BASE_SHA, HEAD_SHA);
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => assertPreMergeParents([BASE_SHA], BASE_SHA, HEAD_SHA));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => assertPreMergeParents([BASE_SHA, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'], BASE_SHA, HEAD_SHA));
  assertLiveRefs(lsRefs(), validateGateIdentity(env(), 'pull_request'));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => assertLiveRefs(`9999${HEAD_SHA.slice(4)}\trefs/heads/fix/ci-sca-lhci-dependency\n${BASE_SHA}\trefs/heads/dev\n`, validateGateIdentity(env(), 'pull_request')));
  gateError('SCA_GATE_IDENTITY_MISMATCH', () => assertLiveRefs('', validateGateIdentity(env(), 'pull_request')));
});

function sideDeps(baseDoc, headDoc, extra = {}) {
  const baseMarker = BASE_SHA.slice(0, 12);
  const headMarker = HEAD_SHA.slice(0, 12);
  return {
    ensureCommits() {},
    request: extra.request || okRequest,
    git: args => {
      if (args[0] === 'rev-list' && extra.revListParents) return `${HEAD_SHA} ${extra.revListParents.join(' ')}\n`;
      return fakeGit(extra.gitOverrides)(args);
    },
    pnpmInstall() { if (extra.installThrows) throw extra.installThrows; return 'ok'; },
    pnpmAudit(cwd) {
      if (extra.auditThrows) throw extra.auditThrows;
      return JSON.stringify(cwd.includes(baseMarker) ? baseDoc : headDoc);
    },
  };
}

const auditSideEnv = {PATH: '/bin'};

test('auditSide performs integrity check and audit for one verified side', async () => {
  const side = await auditSide('base', BASE_SHA, sideDeps(auditDoc(INHERITED), auditDoc(INHERITED)), 'https://registry.npmjs.org/', auditSideEnv);
  assert.equal(side.sha, BASE_SHA);
  assert.equal(side.findings.size, 6);
  assert.equal(side.totalDependencies, 629);
  assert.deepEqual(side.gitlinks, ['.ads']);
});

test('auditSide fails closed on stale lockfile, audit crash and malformed output', async () => {
  await assert.rejects(auditSide('base', BASE_SHA, sideDeps(auditDoc(INHERITED), null, {installThrows: Error('ERR_PNPM_OUTDATED_LOCKFILE')}), 'https://r/', auditSideEnv), /SCA_GATE_LOCKFILE_STALE/);
  await assert.rejects(auditSide('base', BASE_SHA, sideDeps(auditDoc(INHERITED), null, {auditThrows: Error('pnpm audit exited 2 socket hang up')}), 'https://r/', auditSideEnv), /pnpm audit exited/);
  await assert.rejects(auditSide('base', BASE_SHA, sideDeps(auditDoc(INHERITED), null, {gitOverrides: {'pnpm-lock.yaml': 'importers:\n  .:\nsnapshots:\n'}}), 'https://r/', auditSideEnv), /SCA_GATE_COVERAGE_INCOMPLETE/);
  await assert.rejects(auditSide('base', BASE_SHA, {git: fakeGit(), ensureCommits: () => {}, pnpmInstall: () => 'ok', pnpmAudit: () => 'not json'}, 'https://r/', auditSideEnv), /SCA_GATE_OUTPUT_INVALID/);
});

test('diffBlockingFindings classifies inherited, introduced and resolved triples', () => {
  const base = blockingFindings(auditDoc(INHERITED));
  const same = blockingFindings(auditDoc(INHERITED));
  const clean = blockingFindings(auditDoc(INHERITED.filter(a => a.severity === 'low')));
  const introduced = blockingFindings(auditDoc([...INHERITED, advisory(1240854, 'basic-ftp', 'high', ['5.3.0'], 'GHSA-c475-qrg2-pj4r', 'CVE-2026-102990')]));
  const newCve = blockingFindings(auditDoc([...INHERITED, advisory(999001, 'zod', 'critical', ['3.25.76'], 'GHSA-zzzz-zzzz-zzzz', 'CVE-2026-999999')]));
  const newModule = blockingFindings(auditDoc([...INHERITED, advisory(999002, 'follow-redirects', 'high', ['1.15.0'], 'GHSA-qqqq-qqqq-qqqq', 'CVE-2026-888888')]));
  assert.deepEqual(diffBlockingFindings(base, same).introduced, []);
  assert.equal(diffBlockingFindings(base, same).inherited.length, 6);
  assert.deepEqual(diffBlockingFindings(base, introduced).introduced, ['basic-ftp@5.3.0|GHSA-c475-qrg2-pj4r']);
  assert.equal(diffBlockingFindings(base, introduced).inherited.length, 6);
  assert.deepEqual(diffBlockingFindings(base, newCve).introduced, ['zod@3.25.76|GHSA-zzzz-zzzz-zzzz']);
  assert.deepEqual(diffBlockingFindings(base, newModule).introduced, ['follow-redirects@1.15.0|GHSA-qqqq-qqqq-qqqq']);
  const resolution = diffBlockingFindings(base, clean);
  assert.deepEqual(resolution.introduced, []);
  assert.equal(resolution.resolved.length, 6);
});

async function withRunGate({baseDoc = auditDoc(INHERITED), headDoc = baseDoc, extra = {}, gateEnv = {}} = {}) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sca-gate-test-'));
  const envFull = {...env({CNB_EVENT: 'pull_request', CNB_COMMIT: HEAD_SHA}), ...gateEnv};
  const result = await runGate({env: envFull, event: 'pull_request',
    deps: sideDeps(baseDoc, headDoc, extra), registry: 'https://registry.npmjs.org/', lsRemote: lsRefs, outDir});
  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'report.json'), 'utf8'));
  fs.rmSync(outDir, {recursive: true, force: true});
  return {result, report};
}

test('runGate PASS: identical dependency trees keep the six High as baseline-only', async () => {
  const {result, report} = await withRunGate();
  assert.equal(result, 0);
  assert.equal(report.verdict, 'PASS');
  assert.equal(report.baselineInheritedBlocking.length, 6);
  assert.equal(report.headBlocking.length, 6);
  assert.deepEqual(report.introduced, []);
  assert.equal(report.identity.baseSha, BASE_SHA);
  assert.equal(report.identity.headSha, HEAD_SHA);
  assert.deepEqual(report.coverage.head.gitlinksExcludedFromNodeDiscovery, ['.ads']);
  const text = formatVerdict(report);
  assert.match(text, /INHERITED HIGH tmp@0.0.33 GHSA-ph9p-34f9-6g65/);
  assert.match(text, /verdict=PASS/);
});

test('runGate FAIL: committed new High negative blocks the exact head', async () => {
  const headDoc = auditDoc([...INHERITED, advisory(1240854, 'basic-ftp', 'high', ['5.3.0'], 'GHSA-c475-qrg2-pj4r', 'CVE-2026-102990')]);
  const {result, report} = await withRunGate({headDoc});
  assert.equal(result, 1);
  assert.equal(report.verdict, 'FAIL_NEW_HIGH');
  assert.equal(report.introduced.length, 1);
  assert.equal(report.introduced[0].module, 'basic-ftp');
  assert.equal(report.introduced[0].version, '5.3.0');
});

test('runGate fails closed on registry outage, moved refs and stale lockfile', async () => {
  await assert.rejects(withRunGate({extra: {auditThrows: Error('pnpm audit exited null network failure')}}), /pnpm audit exited/);
  await assert.rejects(runGate({env: env(), event: 'pull_request', deps: sideDeps(auditDoc(INHERITED), auditDoc(INHERITED)), registry: 'https://r/',
    lsRemote: () => `0000${HEAD_SHA.slice(4)}\trefs/heads/fix/ci-sca-lhci-dependency\n${BASE_SHA}\trefs/heads/dev\n`, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sca-gate-refs-'))}), /SCA_GATE_IDENTITY_MISMATCH/);
  await assert.rejects(withRunGate({extra: {installThrows: Error('ERR_PNPM_OUTDATED_LOCKFILE')}}), /SCA_GATE_LOCKFILE_STALE/);
});

test('runGate rejects a PR checkout whose parents are not the verified base and head', async () => {
  await assert.rejects(runGate({env: env(), event: 'pull_request',
    deps: sideDeps(auditDoc(INHERITED), auditDoc(INHERITED), {revListParents: [BASE_SHA, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']}),
    registry: 'https://r/', lsRemote: lsRefs, outDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sca-gate-parents-'))}), /SCA_GATE_IDENTITY_MISMATCH/);
});

test('runGate fails closed when the native PR API disagrees or is unavailable', async () => {
  const badHead = async () => ({ok: true, json: async () => ({data: {number: 29, state: 'open', is_merged: false,
    base: {sha: BASE_SHA, ref: 'refs/heads/dev', repo: {path: 'KoolingMachine/ALNILAM'}},
    head: {sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ref: 'refs/heads/fix/ci-sca-lhci-dependency', repo: {path: 'KoolingMachine/ALNILAM'}}}})});
  await assert.rejects(withRunGate({extra: {request: badHead}}), /SCA_GATE_IDENTITY_MISMATCH/);
  await assert.rejects(withRunGate({extra: {request: async () => {throw Error('registry timeout');}}}), /SCA_GATE_TOOL_ERROR/);
  const http500 = async () => { return {ok: false, status: 401, json: async () => { return {}; }}; };
  await assert.rejects(withRunGate({extra: {request: http500}}), /SCA_GATE_TOOL_ERROR/);
  await assert.rejects(runGate({env: env({CNB_TOKEN: ''}), event: 'pull_request', deps: sideDeps(auditDoc(INHERITED), auditDoc(INHERITED)),
    registry: 'https://r/', lsRemote: lsRefs, outDir: os.tmpdir()}), /SCA_GATE_IDENTITY_MISMATCH/);
});
