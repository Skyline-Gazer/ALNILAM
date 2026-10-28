import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateNativePullRequest, assertMergeParents, candidateEnvironment, inspectArtifactTree, validateEvidence} from './cnb-trusted-gate.mjs';

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

test('candidate environment omits the trusted CNB and PyPI credentials', () => {
  const child = candidateEnvironment({...env, PATH: '/usr/bin', CNB_TOKEN: 'secret', TWINE_PASSWORD: 'secret', GITHUB_TOKEN: 'secret'}, '/tmp/home', '/tmp/work');
  for (const key of ['CNB_TOKEN', 'TWINE_PASSWORD', 'GITHUB_TOKEN', 'CNB_API_ENDPOINT']) assert.equal(Object.hasOwn(child, key), false);
  assert.equal(child.HOME, '/tmp/home');
  assert.equal(child.TMPDIR, '/tmp/work');
  assert.equal(child.CNB_PULL_REQUEST_MERGE_SHA, merge);
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

test('verified evidence requires exact SHA receipts, browser negative evidence, and coverage', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cnb-receipts-'));
  const put = (relative, value) => {
    const file = path.join(root, 'artifacts', relative);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, JSON.stringify(value));
  };
  try {
    put('build-receipt.json', {coreSha: merge, siteDigestBefore: 'site', siteDigestAfter: 'site', steps: [{status: 0}]});
    put('cnb-browser/receipt.json', {sourceSha: source, targetSha: target, mergeSha: merge, testedSha: merge, exitCode: 0, lingeringPorts: []});
    for (const formFactor of ['mobile', 'desktop']) put(`lighthouse/${formFactor}/receipt.json`, {
      coreSha: merge, formFactor, normalStatus: 'BASELINE_RECORDED', regressionStatus: 'EXPECTED_RED_VERIFIED',
    });
    put('cnb-browser/negative-receipt.json', {status: 'EXPECTED_RED_VERIFIED', exitCode: 1, screenshotBytes: 1, traceBytes: 1});
    put('coverage/source-summary.json', {percent: 77, files: 1, lines: 1});
    assert.equal(validateEvidence(root, {source, target, merge}).coverage.percent, 77);
    put('cnb-browser/receipt.json', {sourceSha: source, targetSha: target, mergeSha: merge, testedSha: source, exitCode: 0, lingeringPorts: []});
    assert.throws(() => validateEvidence(root, {source, target, merge}), /merge SHA/);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});
