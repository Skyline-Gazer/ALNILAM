import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateNativePullRequest, assertMergeParents, assertLiveRefs, candidateEnvironment, inspectArtifactTree, snapshotArtifactTree, safeFailureEvidence, validateEvidence, trustedTestFiles, trustedAstroCheckArgs} from './cnb-trusted-gate.mjs';

const source = 'a'.repeat(40), target = 'b'.repeat(40), merge = 'c'.repeat(40);
const env = {
  CNB_EVENT: 'pull_request.target', CNB_REPO_SLUG: 'KoolingMachine/ALNILAM', CNB_API_ENDPOINT: 'https://api.cnb.cool',
  CNB_PULL_REQUEST_SLUG: 'KoolingMachine/ALNILAM', CNB_PULL_REQUEST_IID: '7', CNB_PULL_REQUEST_ID: 'native-7',
  CNB_PULL_REQUEST_BRANCH: 'chore/test', CNB_BRANCH: 'dev', CNB_PULL_REQUEST_SHA: source,
  CNB_PULL_REQUEST_TARGET_SHA: target, CNB_PULL_REQUEST_MERGE_SHA: merge, CNB_COMMIT: target,
};
const pr = {
  number: '7', state: 'open', is_merged: false,
  base: {ref: 'refs/heads/dev', sha: target, repo: {path: 'KoolingMachine/ALNILAM'}},
  head: {ref: 'refs/heads/chore/test', sha: source, repo: {path: 'KoolingMachine/ALNILAM'}},
};

test('trusted PR identity binds native event, current API response, and target checkout', () => {
  assert.deepEqual(validateNativePullRequest(pr, env, target), {
    number: '7', id: 'native-7', sourceBranch: 'chore/test', targetBranch: 'dev', source, target, merge,
  });
  for (const [badPR, badEnv, checkout] of [
    [{...pr, state: 'closed'}, env, target],
    [{...pr, head: {...pr.head, sha: 'd'.repeat(40)}}, env, target],
    [{...pr, head: {...pr.head, repo: {path: 'fork/ALNILAM'}}}, env, target],
    [pr, {...env, CNB_EVENT: 'pull_request'}, target],
    [pr, {...env, CNB_COMMIT: source}, target],
    [pr, env, source],
  ]) assert.throws(() => validateNativePullRequest(badPR, badEnv, checkout));
});

test('pre-merge commit must have exactly the API-verified source and target parents', () => {
  assert.doesNotThrow(() => assertMergeParents(merge, source, target, [target, source]));
  assert.throws(() => assertMergeParents(merge, source, target, [source]));
  assert.throws(() => assertMergeParents(merge, source, target, [source, 'd'.repeat(40)]));
});

test('live ref lookup maps each ls-remote SHA to its ref and rejects stale refs', () => {
  const identity = {sourceBranch: 'chore/test', targetBranch: 'dev', source, target};
  const output = `${source}\trefs/heads/chore/test\n${target}\trefs/heads/dev\n`;
  assert.doesNotThrow(() => assertLiveRefs(output, identity));
  assert.throws(() => assertLiveRefs(`${'d'.repeat(40)}\trefs/heads/chore/test\n${target}\trefs/heads/dev`, identity));
  assert.throws(() => assertLiveRefs(`${source}\trefs/heads/chore/test`, identity));
});

test('candidate environment omits the trusted CNB and PyPI credentials', () => {
  const child = candidateEnvironment({...env, PATH: '/usr/bin', CNB_TOKEN: 'secret', TWINE_PASSWORD: 'secret', GITHUB_TOKEN: 'secret'}, '/tmp/home', '/tmp/work');
  for (const key of ['CNB_TOKEN', 'TWINE_PASSWORD', 'GITHUB_TOKEN', 'CNB_API_ENDPOINT']) assert.equal(Object.hasOwn(child, key), false);
  assert.equal(child.HOME, '/tmp/home');
  assert.equal(child.TMPDIR, '/tmp/work');
  assert.equal(child.CNB_PULL_REQUEST_MERGE_SHA, merge);
});

test('trusted checks select target test files and bypass candidate package scripts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-trusted-tests-'));
  const trusted = path.join(root, 'trusted');
  const candidate = path.join(root, 'candidate');
  try {
    fs.mkdirSync(path.join(trusted, 'scripts/tests'), {recursive: true});
    fs.mkdirSync(path.join(trusted, 'scripts/ci'), {recursive: true});
    fs.mkdirSync(path.join(candidate, 'scripts/tests'), {recursive: true});
    fs.writeFileSync(path.join(trusted, 'scripts/tests/baseline.test.mjs'), '');
    fs.writeFileSync(path.join(candidate, 'scripts/tests/noop.test.mjs'), '');
    assert.deepEqual(trustedTestFiles(trusted), [path.join(trusted, 'scripts/tests/baseline.test.mjs')]);
    assert.deepEqual(trustedAstroCheckArgs(trusted, candidate), [
      '--dir', path.join(trusted, 'apps/web'), 'exec', 'astro', 'check', '--root', path.join(candidate, 'apps/web'),
    ]);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('artifact collection rejects links and bounds regular file evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-artifacts-'));
  try {
    fs.writeFileSync(path.join(root, 'report.json'), 'ok');
    assert.deepEqual(inspectArtifactTree(root), {bytes: 2, files: 1});
    assert.throws(() => inspectArtifactTree(root, 1), /bounded/);
    fs.symlinkSync('/etc/passwd', path.join(root, 'leak'));
    assert.throws(() => inspectArtifactTree(root), /symlink/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('verified evidence snapshot cannot be changed through the candidate tree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-evidence-snapshot-'));
  const source = path.join(root, 'candidate', 'artifacts');
  const destination = path.join(root, 'trusted', 'artifacts');
  try {
    fs.mkdirSync(path.join(source, 'cnb-browser'), {recursive: true});
    fs.writeFileSync(path.join(source, 'cnb-browser', 'receipt.json'), 'verified');
    assert.deepEqual(snapshotArtifactTree(source, destination), {bytes: 8, files: 1});
    assert.equal(fs.statSync(path.join(destination, 'cnb-browser', 'receipt.json')).mode & 0o222, 0);
    assert.equal(fs.statSync(path.join(destination, 'cnb-browser')).mode & 0o222, 0);
    fs.writeFileSync(path.join(source, 'cnb-browser', 'receipt.json'), 'changed');
    assert.equal(fs.readFileSync(path.join(destination, 'cnb-browser', 'receipt.json'), 'utf8'), 'verified');
    fs.symlinkSync('/etc/passwd', path.join(source, 'linked'));
    assert.throws(() => snapshotArtifactTree(source, path.join(root, 'linked-snapshot')), /symlink/);
  } finally {
    for (const directory of [destination, path.join(destination, 'cnb-browser')]) {
      try { fs.chmodSync(directory, 0o755); } catch {}
    }
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('failure diagnostics copy only bounded regular logs and known receipts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-failure-logs-'));
  try {
    fs.writeFileSync(path.join(root, 'demo-artifact.log'), 'failure detail');
    fs.writeFileSync(path.join(root, 'large.log'), Buffer.alloc(2 * 1024 * 1024 + 1));
    fs.symlinkSync('/etc/passwd', path.join(root, 'linked.log'));
    fs.mkdirSync(path.join(root, 'nested.log'));
    fs.mkdirSync(path.join(root, 'cnb-browser'));
    fs.writeFileSync(path.join(root, 'cnb-browser', 'negative.log'), 'browser failure');
    fs.writeFileSync(path.join(root, 'cnb-browser', 'negative-receipt.json'), '{"status":"failed"}');
    fs.writeFileSync(path.join(root, 'cnb-browser', 'untrusted.json'), '{"unexpected":true}');
    fs.symlinkSync('/etc/passwd', path.join(root, 'cnb-browser', 'linked.log'));
    assert.deepEqual(safeFailureEvidence(root), ['cnb-browser/negative-receipt.json', 'cnb-browser/negative.log', 'demo-artifact.log']);
    assert.deepEqual(safeFailureEvidence(path.join(root, 'missing')), []);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('failure evidence scanning stops after 5000 entries', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-failure-scan-limit-'));
  try {
    for (let i = 0; i < 5001; i++) fs.writeFileSync(path.join(root, `ignored-${i}`), '');
    assert.deepEqual(safeFailureEvidence(root), []);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('verified evidence requires exact SHA receipts, browser negative evidence, and coverage', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-receipts-'));
  const put = (relative, value) => {
    const file = path.join(root, 'artifacts', relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, JSON.stringify(value));
  };
  try {
    put('build-receipt.json', {coreSha: merge, siteDigestBefore: 'site', siteDigestAfter: 'site', steps: [{status: 0}]});
    const browserReport = {stats: {expected: 2, unexpected: 0, skipped: 1}};
    put('cnb-browser/results.json', browserReport);
    const reportSha256 = createHash('sha256').update(JSON.stringify(browserReport)).digest('hex');
    put('cnb-browser/receipt.json', {sourceSha: source, targetSha: target, mergeSha: merge, testedSha: merge, exitCode: 0,
      lingeringPorts: [], testCount: 2, reportSha256});
    for (const formFactor of ['mobile', 'desktop']) put(`lighthouse/${formFactor}/receipt.json`, {
      coreSha: merge, formFactor, normalStatus: 'BASELINE_RECORDED', regressionStatus: 'EXPECTED_RED_VERIFIED',
    });
    put('cnb-browser/negative-receipt.json', {status: 'EXPECTED_RED_VERIFIED', exitCode: 1, screenshotBytes: 1, traceBytes: 1});
    put('coverage/source-summary.json', {percent: 77, minimum: 77, files: 1, lines: 1});
    assert.equal(validateEvidence(root, {source, target, merge}).coverage.percent, 77);
    fs.writeFileSync(path.join(root, 'artifacts/coverage/source-summary.json'), '{');
    assert.throws(() => validateEvidence(root, {source, target, merge}), /Invalid evidence JSON.*source-summary\.json/);
    put('coverage/source-summary.json', {percent: 77, minimum: 77, files: 1, lines: 1});
    put('coverage/source-summary.json', {percent: 77, minimum: 76, files: 1, lines: 1});
    assert.throws(() => validateEvidence(root, {source, target, merge}), /coverage receipt/);
    put('coverage/source-summary.json', {percent: 77, minimum: 77, files: 1, lines: 1});
    put('cnb-browser/receipt.json', {sourceSha: source, targetSha: target, mergeSha: merge, testedSha: source, exitCode: 0,
      lingeringPorts: [], testCount: 2, reportSha256});
    assert.throws(() => validateEvidence(root, {source, target, merge}), /trusted Playwright report/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
