#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync, execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateSiteRoot} from '../site-contract.mjs';

const trustedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
fs.mkdirSync('artifacts/coverage', {recursive: true});
fs.mkdirSync('.tmp/cnb', {recursive: true});
const site = fs.mkdtempSync(path.join(os.tmpdir(), 'alnilam-cnb-site-'));
fs.cpSync('sites/demo', site, {recursive: true});
const before = validateSiteRoot(site).digest;
const env = {...process.env, TMPDIR: path.resolve('.tmp/cnb'), SOURCE_DATE_EPOCH: '1700000000'};
const steps = [];
function run(name, command, args, extra = {}, output) {
  const started = Date.now();
  const log = fs.openSync(output || `artifacts/${name}.log`, 'w');
  try {
    const result = spawnSync(command, args, {env: {...env, ...extra}, stdio: ['ignore', log, log]});
    steps.push({name, status: result.status, signal: result.signal, error: result.error?.message, elapsedMs: Date.now() - started});
    if (result.status !== 0) throw Error(`${name} failed; see artifacts/${name}.log`);
  } finally { fs.closeSync(log); }
}
try {
  run('unit-coverage', process.execPath, ['--experimental-test-coverage', '--test-reporter=lcov', '--test', ...fs.globSync('scripts/tests/*.test.mjs'), ...fs.globSync('scripts/ci/*.test.mjs')], {}, 'artifacts/coverage/lcov.info');
  run('coverage-content', process.execPath, [path.join(trustedRoot, 'scripts/ci/cnb-coverage.mjs'), 'artifacts/coverage/lcov.info']);
  run('check', 'pnpm', ['check']);
  run('demo-compose', process.execPath, ['scripts/compose.mjs', '--site', 'sites/demo', '--out', 'dist/demo']);
  run('demo-artifact', process.execPath, [path.join(trustedRoot, 'scripts/artifact-check.mjs'), 'dist/demo']);
  for (const [name, url] of [['site', 'https://example.com/'], ['nested-base', 'https://example.com/ALNILAM/']]) {
    run(`compose-${name}`, process.execPath, ['scripts/compose.mjs', '--site', site, '--out', `dist/${name}`], {ALNILAM_SITE_URL: url});
    run(`artifact-${name}`, process.execPath, [path.join(trustedRoot, 'scripts/artifact-check.mjs'), `dist/${name}`]);
  }
  if (validateSiteRoot(site).digest !== before) throw Error('External Site mutated');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  fs.writeFileSync('artifacts/build-receipt.json', JSON.stringify({coreSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
    siteDigestBefore: before, siteDigestAfter: validateSiteRoot(site).digest, fixtureContract: 'legacy-v1-TOML; no future compatibility promise', node: process.version, steps}, null, 2) + '\n');
  fs.rmSync(site, {recursive: true, force: true});
}
