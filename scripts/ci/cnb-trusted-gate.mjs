#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {MIN_SOURCE_COVERAGE} from './cnb-coverage.mjs';

const REPO = 'KoolingMachine/ALNILAM';
const API = 'https://api.cnb.cool';
const SHA = /^[a-f0-9]{40}$/;
const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;
const ROOT = process.cwd();
const SCRIPT = fileURLToPath(import.meta.url);
const HARNESS_FILES = [
  'lighthouserc.cjs',
  'scripts/artifact-check.mjs',
  'scripts/compose.mjs',
  'scripts/site-contract.mjs',
  'scripts/ci/cnb-browser-audit.mjs',
  'scripts/ci/cnb-browser-negative.mjs',
  'scripts/ci/cnb-consumer-build.mjs',
  'scripts/ci/cnb-coverage.mjs',
  'scripts/ci/cnb-evidence.mjs',
  'scripts/ci/cnb-lighthouse.mjs',
  'scripts/ci/cnb-release-tag-dry-run.mjs',
];

const refName = value => typeof value === 'string' ? value.replace(/^refs\/heads\//, '') : '';

export function validateNativePullRequest(payload, env, checkoutSha) {
  const pr = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const source = pr?.head?.sha;
  const target = pr?.base?.sha;
  const merge = env.CNB_PULL_REQUEST_MERGE_SHA;
  const iid = env.CNB_PULL_REQUEST_IID;
  const sourceBranch = refName(env.CNB_PULL_REQUEST_BRANCH);
  const targetBranch = refName(env.CNB_BRANCH);
  if (env.CNB_EVENT !== 'pull_request.target' || env.CNB_REPO_SLUG !== REPO ||
      env.CNB_PULL_REQUEST_SLUG !== REPO || env.CNB_API_ENDPOINT !== API ||
      !/^[1-9]\d*$/.test(iid || '') || String(pr?.number) !== iid ||
      pr?.state !== 'open' || pr?.is_merged !== false ||
      pr?.base?.repo?.path !== REPO || pr?.head?.repo?.path !== REPO ||
      refName(pr?.base?.ref) !== targetBranch || refName(pr?.head?.ref) !== sourceBranch ||
      !SHA.test(source || '') || !SHA.test(target || '') || !SHA.test(merge || '') ||
      source !== env.CNB_PULL_REQUEST_SHA || target !== env.CNB_PULL_REQUEST_TARGET_SHA ||
      target !== env.CNB_COMMIT || target !== checkoutSha) {
    throw Error('Native PR API, event, checkout, or source/target/merge SHA mismatch');
  }
  return {number: iid, id: env.CNB_PULL_REQUEST_ID || null, sourceBranch, targetBranch, source, target, merge};
}

export function assertMergeParents(merge, source, target, parents) {
  if (!SHA.test(merge || '') || !SHA.test(source || '') || !SHA.test(target || '') ||
      !Array.isArray(parents) || parents.length !== 2 || new Set(parents).size !== 2 ||
      !parents.includes(source) || !parents.includes(target)) {
    throw Error('Pre-merge commit must have exactly the verified source and target parents');
  }
}

export function assertLiveRefs(output, identity) {
  const refs = [`refs/heads/${identity.sourceBranch}`, `refs/heads/${identity.targetBranch}`];
  const rows = output.trim().split('\n').filter(Boolean);
  const found = new Map(rows.map(row => {
    const [sha, ref] = row.split('\t');
    return [ref, sha];
  }));
  if (rows.length !== 2 || found.get(refs[0]) !== identity.source || found.get(refs[1]) !== identity.target) {
    throw Error('Live source/target refs moved during the trusted gate');
  }
}

export function candidateEnvironment(env, home, temp) {
  const child = {
    PATH: env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: home,
    TMPDIR: temp,
    TMP: temp,
    TEMP: temp,
    CI: 'true',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    TZ: 'UTC',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '/bin/false',
    SSH_ASKPASS: '/bin/false',
    NPM_CONFIG_USERCONFIG: '/dev/null',
    NPM_CONFIG_CACHE: path.join(home, '.npm'),
    COREPACK_HOME: path.join(home, '.cache', 'corepack'),
  };
  if (env.PLAYWRIGHT_BROWSERS_PATH) child.PLAYWRIGHT_BROWSERS_PATH = env.PLAYWRIGHT_BROWSERS_PATH;
  for (const key of ['CNB_BUILD_ID', 'CNB_EVENT', 'CNB_REPO_SLUG', 'CNB_BRANCH', 'CNB_COMMIT',
    'CNB_PULL_REQUEST_ID', 'CNB_PULL_REQUEST_IID', 'CNB_PULL_REQUEST_BRANCH', 'CNB_PULL_REQUEST_SLUG',
    'CNB_PULL_REQUEST_SHA', 'CNB_PULL_REQUEST_TARGET_SHA', 'CNB_PULL_REQUEST_MERGE_SHA']) {
    if (env[key]) child[key] = env[key];
  }
  return child;
}

export function inspectArtifactTree(root, maximum = MAX_ARTIFACT_BYTES) {
  const rootStat = fs.lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw Error('Evidence root must be a real directory');
  const stack = [root];
  let bytes = 0, files = 0;
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const file = path.join(directory, entry.name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw Error(`Evidence contains a symlink: ${path.relative(root, file)}`);
      if (stat.isDirectory()) stack.push(file);
      else if (stat.isFile()) {
        bytes += stat.size;
        files++;
        if (bytes > maximum || files > 5000) throw Error('Evidence exceeds the bounded attachment size');
      } else throw Error(`Evidence contains a special file: ${path.relative(root, file)}`);
    }
  }
  return {bytes, files};
}

export function safeFailureLogs(root) {
  try {
    const stat = fs.lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return [];
    const files = [], directories = [root];
    while (directories.length) {
      const directory = directories.pop();
      for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        const stat = fs.lstatSync(file);
        if (stat.isDirectory() && !stat.isSymbolicLink()) directories.push(file);
        else if (stat.isFile() && !stat.isSymbolicLink() && /^[A-Za-z0-9._-]+\.log$/.test(entry.name) && stat.size <= 2 * 1024 * 1024) {
          files.push(path.relative(root, file));
        }
      }
    }
    return files.sort();
  } catch { return []; }
}

function readJson(file) {
  if (!fs.lstatSync(file).isFile()) throw Error(`Evidence is not a regular file: ${file}`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`Invalid evidence JSON at ${file}: ${error.message}`, {cause: error}); }
}

export function validateEvidence(root, identity) {
  const artifacts = path.join(root, 'artifacts');
  const build = readJson(path.join(artifacts, 'build-receipt.json'));
  if (build.coreSha !== identity.merge || build.siteDigestBefore !== build.siteDigestAfter ||
      !Array.isArray(build.steps) || !build.steps.length || build.steps.some(step => step.status !== 0)) {
    throw Error('Consumer build receipt is missing, stale, or failed');
  }
  const browser = readJson(path.join(artifacts, 'cnb-browser', 'receipt.json'));
  if (browser.sourceSha !== identity.source || browser.targetSha !== identity.target ||
      browser.mergeSha !== identity.merge || browser.testedSha !== identity.merge ||
      browser.exitCode !== 0 || browser.lingeringPorts?.length) throw Error('Browser receipt is not bound to the tested merge SHA');
  for (const formFactor of ['mobile', 'desktop']) {
    const lighthouse = readJson(path.join(artifacts, 'lighthouse', formFactor, 'receipt.json'));
    if (lighthouse.coreSha !== identity.merge || lighthouse.formFactor !== formFactor ||
        lighthouse.normalStatus !== 'BASELINE_RECORDED' || lighthouse.regressionStatus !== 'EXPECTED_RED_VERIFIED') {
      throw Error(`Lighthouse ${formFactor} receipt is missing, stale, or failed`);
    }
  }
  const negative = readJson(path.join(artifacts, 'cnb-browser', 'negative-receipt.json'));
  if (negative.status !== 'EXPECTED_RED_VERIFIED' || negative.exitCode <= 0 ||
      !negative.screenshotBytes || !negative.traceBytes) throw Error('Browser negative evidence is incomplete');
  const coverage = readJson(path.join(artifacts, 'coverage', 'source-summary.json'));
  if (!Number.isFinite(coverage.percent) || coverage.minimum !== MIN_SOURCE_COVERAGE ||
      coverage.percent < coverage.minimum || coverage.files < 1 || coverage.lines < 1) {
    throw Error('Node source coverage receipt is missing, inconsistent, or below its recorded minimum');
  }
  return {build, browser, coverage};
}

async function fetchPullRequest(env, request = fetch) {
  if (env.CNB_API_ENDPOINT !== API || env.CNB_REPO_SLUG !== REPO || !env.CNB_TOKEN ||
      !/^[1-9]\d*$/.test(env.CNB_PULL_REQUEST_IID || '')) throw Error('Missing trusted CNB API context');
  const url = new URL(`${REPO}/-/pulls/${env.CNB_PULL_REQUEST_IID}`, `${API}/`);
  const response = await request(url, {
    headers: {Authorization: `Bearer ${env.CNB_TOKEN}`, Accept: 'application/json'},
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error(`Native CNB PR API returned ${response.status}`);
  return response.json();
}

function git(args) {
  return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function verifyLiveRefs(identity) {
  const refs = [`refs/heads/${identity.sourceBranch}`, `refs/heads/${identity.targetBranch}`];
  for (const ref of refs) execFileSync('git', ['check-ref-format', ref], {stdio: 'ignore'});
  assertLiveRefs(git(['ls-remote', '--refs', 'origin', ...refs]), identity);
}

function copyTrustedHarness(harnessRoot, candidateRoot) {
  for (const relative of HARNESS_FILES) {
    const source = path.join(ROOT, relative);
    const stat = fs.lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Trusted harness source is not a regular file: ${relative}`);
    const destination = path.join(harnessRoot, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true, mode: 0o755});
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(destination, 0o444);
  }
  fs.symlinkSync(path.join(candidateRoot, 'node_modules'), path.join(harnessRoot, 'node_modules'), 'dir');
  const freeze = directory => {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) freeze(file);
      else if (!entry.isSymbolicLink()) fs.chmodSync(file, 0o444);
    }
    fs.chmodSync(directory, 0o555);
  };
  freeze(harnessRoot);
}

function runAsCandidate(tempRoot, candidateRoot, harnessRoot, env) {
  if (process.getuid?.() !== 0) throw Error('Trusted gate requires a root runner to isolate PR code');
  const home = path.join(tempRoot, 'home');
  const temp = path.join(candidateRoot, '.tmp', 'cnb-untrusted');
  fs.mkdirSync(home, {recursive: true});
  fs.mkdirSync(temp, {recursive: true});
  execFileSync('chown', ['-R', '65534:65534', candidateRoot, home]);
  const safeEnv = candidateEnvironment(env, home, temp);
  const result = spawnSync('setpriv', [
    '--reuid=65534', '--regid=65534', '--clear-groups', '--bounding-set=-all',
    '--inh-caps=-all', '--ambient-caps=-all', '--no-new-privs', '--',
    process.execPath, SCRIPT, '--run-candidate', candidateRoot, harnessRoot,
  ], {cwd: candidateRoot, env: safeEnv, stdio: 'inherit'});
  if (result.error) throw result.error;
  return {status: result.status, signal: result.signal};
}

function stopCandidateProcesses() {
  const result = spawnSync('pkill', ['-KILL', '-u', '65534'], {stdio: 'ignore'});
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) throw Error(`Could not stop isolated candidate processes (status ${result.status})`);
}

function runCandidate(candidateRoot, harnessRoot) {
  const run = (name, command, args, extra = {}) => {
    const result = spawnSync(command, args, {cwd: candidateRoot, env: {...process.env, ...extra}, stdio: 'inherit'});
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(`${name} failed (status ${result.status}, signal ${result.signal || 'none'})`);
  };
  const ci = path.join(harnessRoot, 'scripts', 'ci');
  run('frozen dependency install', 'pnpm', ['install', '--frozen-lockfile']);
  run('consumer build and unit coverage', process.execPath, [path.join(ci, 'cnb-consumer-build.mjs')]);
  run('Playwright browser audit', process.execPath, [path.join(ci, 'cnb-browser-audit.mjs')]);
  for (const formFactor of ['mobile', 'desktop']) {
    run(`Lighthouse ${formFactor}`, process.execPath, [path.join(ci, 'cnb-lighthouse.mjs')], {ALNILAM_LHCI_FORM_FACTOR: formFactor});
  }
  run('expected-red browser probe', process.execPath, [path.join(ci, 'cnb-browser-negative.mjs')]);
  run('isolated tag dry run', process.execPath, [path.join(ci, 'cnb-release-tag-dry-run.mjs')]);
}

function copyFailureLogs(candidateRoot, message, status) {
  const destination = path.join(ROOT, 'artifacts');
  fs.rmSync(destination, {recursive: true, force: true});
  fs.mkdirSync(destination, {recursive: true});
  const sourceRoot = path.join(candidateRoot, 'artifacts');
  for (const name of safeFailureLogs(sourceRoot)) {
    const file = path.join(destination, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.copyFileSync(path.join(sourceRoot, name), file);
  }
  fs.writeFileSync(path.join(destination, 'platform.json'), JSON.stringify({status, error: message}, null, 2) + '\n');
}

function archiveEvidence(candidateRoot, identity) {
  const source = path.join(candidateRoot, 'artifacts');
  const tree = inspectArtifactTree(source);
  const destination = path.join(ROOT, 'artifacts');
  fs.rmSync(destination, {recursive: true, force: true});
  fs.mkdirSync(path.join(destination, 'coverage'), {recursive: true});
  const filename = `cnb-evidence-${process.env.CNB_BUILD_ID}.tgz`;
  const archive = path.join(destination, filename);
  execFileSync('tar', ['-czf', archive, '-C', candidateRoot, 'artifacts']);
  const lcov = path.join(source, 'coverage', 'source.lcov.info');
  if (!fs.lstatSync(lcov).isFile()) throw Error('Verified source LCOV is missing');
  fs.copyFileSync(lcov, path.join(destination, 'coverage', 'source.lcov.info'));
  const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const stat = fs.statSync(archive);
  fs.writeFileSync(path.join(destination, 'platform.json'), JSON.stringify({
    status: 'PASS', build: process.env.CNB_BUILD_ID, event: process.env.CNB_EVENT,
    pr: identity.number, prId: identity.id, sourceSha: identity.source,
    targetSha: identity.target, mergeSha: identity.merge, testedSha: identity.merge,
    evidence: {file: filename, bytes: stat.size, sha256: digest, files: tree.files, uncompressedBytes: tree.bytes},
  }, null, 2) + '\n');
}

async function main() {
  const env = process.env;
  const apiPayload = await fetchPullRequest(env);
  const checkoutSha = git(['rev-parse', 'HEAD']);
  const identity = validateNativePullRequest(apiPayload, env, checkoutSha);
  const origin = git(['remote', 'get-url', 'origin']);
  if (![ `https://cnb.cool/${REPO}`, `https://cnb.cool/${REPO}.git` ].includes(origin)) throw Error('Unexpected CNB origin URL');
  verifyLiveRefs(identity);
  execFileSync('git', ['fetch', '--no-tags', '--no-recurse-submodules', 'origin', identity.merge], {stdio: 'inherit'});
  const revision = git(['rev-list', '--parents', '-n', '1', identity.merge]).split(/\s+/);
  assertMergeParents(revision.shift(), identity.source, identity.target, revision);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'alnilam-cnb-trusted-'));
  const candidateRoot = path.join(tempRoot, 'candidate');
  const harnessRoot = path.join(tempRoot, 'harness');
  fs.chmodSync(tempRoot, 0o755);
  fs.mkdirSync(harnessRoot, {mode: 0o755});
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--no-checkout', '--no-recurse-submodules', ROOT, candidateRoot]);
  execFileSync('git', ['-C', candidateRoot, 'fetch', '--quiet', '--no-tags', '--no-recurse-submodules', 'origin', identity.merge]);
  const candidateParents = git(['-C', candidateRoot, 'rev-list', '--parents', '-n', '1', identity.merge]).split(/\s+/);
  assertMergeParents(candidateParents.shift(), identity.source, identity.target, candidateParents);
  execFileSync('git', ['-C', candidateRoot, 'checkout', '--quiet', '--detach', identity.merge]);
  execFileSync('git', ['-C', candidateRoot, 'remote', 'remove', 'origin']);
  execFileSync('git', ['-C', candidateRoot, 'config', '--local', 'core.hooksPath', '/dev/null']);
  copyTrustedHarness(harnessRoot, candidateRoot);

  let failure;
  try {
    const result = runAsCandidate(tempRoot, candidateRoot, harnessRoot, env);
    stopCandidateProcesses();
    if (result.status !== 0) throw Error(`Isolated candidate checks failed (status ${result.status}, signal ${result.signal || 'none'})`);
    validateEvidence(candidateRoot, identity);
    verifyLiveRefs(identity);
    const after = await fetchPullRequest(env);
    validateNativePullRequest(after, env, checkoutSha);
    archiveEvidence(candidateRoot, identity);
  } catch (error) {
    stopCandidateProcesses();
    failure = error;
    copyFailureLogs(candidateRoot, error.message, 'FAIL');
  } finally {
    fs.rmSync(tempRoot, {recursive: true, force: true});
  }
  if (failure) throw failure;
  console.log(JSON.stringify({status: 'CNB_TRUSTED_GATE_PASS', ...identity, tested: identity.merge}));
}

if (process.argv[2] === '--run-candidate') {
  try { runCandidate(path.resolve(process.argv[3]), path.resolve(process.argv[4])); }
  catch (error) { console.error(`CANDIDATE_CHECKS_FAILED: ${error.message}`); process.exitCode = 1; }
} else if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(error => { console.error(`CNB_TRUSTED_GATE_BLOCKED: ${error.message}`); process.exitCode = 1; });
}
